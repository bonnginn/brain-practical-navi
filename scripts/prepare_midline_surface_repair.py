"""Stage four image-reviewed external-space voxels; retain 12 surface voxels."""
import argparse,json,hashlib
from pathlib import Path
import numpy as np
from adopt_registered_red_nuclei import encode
from build_orthogonal_review_bundle import DEFAULT_IMAGE,MAGIC_IMAGE,MAGIC_LABELS,EXPECTED_IMAGE_SHA256,read_browser_volume,PIXEL_TO_VOXEL_FIXED

ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-midline-surface-2a73.bin.gz'
BASE_SHA='2a73ff567741aa9b7965eef645765bfc0d87b3cad80d789d5512cabf4ffc2ed2'
POINTS=((195,242,73),(195,242,74),(196,242,73),(196,242,74))
INVENTORY=tuple((x,y,z) for x in (195,196) for y in range(239,243) for z in (73,74))
RAW_VALUES=(213,212,236,212,250,248,255,255,215,212,224,216,248,250,255,255)
sha=lambda b:hashlib.sha256(b).hexdigest()

def repair(labels,raw):
    if labels.shape!=raw.shape or labels.ndim!=3:raise ValueError('Grid differs')
    if any(any(v<0 or v>=labels.shape[k] for k,v in enumerate(p)) for p in INVENTORY):raise ValueError('Out of bounds')
    xyz=np.array(INVENTORY)
    if not np.all(labels[tuple(xyz.T)]==27):raise ValueError('Reviewed source labels changed')
    if tuple(raw[tuple(xyz.T)].tolist())!=RAW_VALUES:raise ValueError('Reviewed image changed')
    result=labels.copy()
    for p in POINTS:result[p]=0
    if np.count_nonzero(labels!=result)!=4:raise ValueError('Unexpected edits')
    reverse=result.copy()
    for p in POINTS:reverse[p]=27
    if not np.array_equal(reverse,labels):raise ValueError('Reverse failed')
    return result

def main(out):
    out=out.resolve()
    if out.exists() or not out.is_relative_to(ROOT/'work'):raise ValueError('New work output required')
    _,_,labels=read_browser_volume(BASE,MAGIC_LABELS,BASE_SHA)
    _,_,raw=read_browser_volume(DEFAULT_IMAGE,MAGIC_IMAGE,EXPECTED_IMAGE_SHA256)
    evidence_path=ROOT/'work/anatomy-review/mid-low-pointwise-v1/report.json'
    if sha(evidence_path.read_bytes())!='5129e0387d8a55d01982e251fedba951faa3e03ba211ee83cda808c924108b6a':raise ValueError('Review record changed')
    evidence=json.loads(evidence_path.read_text(encoding='utf-8'))
    if evidence['inputSha256']!=BASE_SHA or evidence['imageSha256']!=EXPECTED_IMAGE_SHA256:raise ValueError('Wrong review version')
    if set(map(tuple,evidence['points']))!=set(INVENTORY):raise ValueError('Wrong review inventory')
    for sheet in evidence['sheets']:
        if sha((evidence_path.parent/sheet['file']).read_bytes())!=sheet['sha256']:raise ValueError('Image changed')
    result=repair(labels,raw)
    import build_specimen_blocks as b
    tissue_zyx=raw.transpose(2,1,0)[::2,::2,::2]
    before=b.specimen_definitions(tissue_zyx,labels.transpose(2,1,0)[::2,::2,::2])
    after=b.specimen_definitions(tissue_zyx,result.transpose(2,1,0)[::2,::2,::2])
    changed=[]
    if before.keys()!=after.keys():raise ValueError('Block definitions changed')
    for block,parts in before.items():
        if len(parts)!=len(after[block]):raise ValueError('Part count differs')
        for p,q in zip(parts,after[block]):
            if p.key!=q.key:raise ValueError('Part order differs')
            count=int(np.count_nonzero(p.mask!=q.mask))
            if count:changed.append({'block':block,'part':p.key,'changedMaskVoxels':count})
    data=encode(result)
    record=dict(scope='mid-low-external-surface-four-voxels',date='2026-09-06',decision='image-reviewed-stage-pending-integration',expertReviewed=False,
        inputCompressedSha256=BASE_SHA,outputCompressedSha256=sha(data),inputRawSha256=sha(labels.tobytes(order='F')),outputRawSha256=sha(result.tobytes(order='F')),
        changedVoxelCount=4,transitions={'27->0':4},points=POINTS,retainedPoints=sorted(set(INVENTORY)-set(POINTS)),
        beforeCount27=int(np.count_nonzero(labels==27)),afterCount27=int(np.count_nonzero(result==27)),changedBlockPartMasks=changed,
        review=evidence,pixelToVoxel=PIXEL_TO_VOXEL_FIXED,reviewedSheets=[s['file'] for s in evidence['sheets']],
        rationale='All 8 pointwise planes and prior wide orthogonal context were visually inspected. Y242 four voxels lie beyond the tissue surface in continuous external space; not a ventricle or aqueduct. Y239-240 eight tissue-side voxels retained; Y241 four partial-volume boundary voxels retained as uncertain. No intensity-threshold expansion or wholesale removal of the disconnected component.',
        limitations='AI-assisted local review, not expert confirmation or approval of the complete brainstem surface. Stage only; no public asset mutation.')
    out.mkdir();(out/'labels.bin.gz').write_bytes(data)
    (out/'adoption.json').write_text(json.dumps(record,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:record[k] for k in ('outputCompressedSha256','outputRawSha256','changedVoxelCount','afterCount27','changedBlockPartMasks')},indent=2))

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--output',type=Path,required=True);main(p.parse_args().output)
