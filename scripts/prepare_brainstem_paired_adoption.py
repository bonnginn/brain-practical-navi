"""Stage only the two image-reviewed ID27 islands; never writes public assets."""
import argparse,hashlib,json
from pathlib import Path
import numpy as np
from install_brainstem_island_repair import ROOT,FINAL_SHA
TARGET=ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-paired-islands-c58f.bin.gz'
from adopt_registered_red_nuclei import encode
from prepare_fourth_ventricle_candidate import component
from build_orthogonal_review_bundle import DEFAULT_IMAGE,MAGIC_IMAGE,MAGIC_LABELS,EXPECTED_IMAGE_SHA256,read_browser_volume

EVIDENCE=ROOT/'segmentation-patches/review/brainstem-paired-islands-image-review-2026-09-06.json'
EVIDENCE_SHA='4b948e5da0c47d1e9ed32d5ad34ae64ddb871f0c40133c87dae37972dde9d266'
sha=lambda data:hashlib.sha256(data).hexdigest()

def repair(labels,evidence):
    if evidence.get('inputSha256')!=FINAL_SHA or evidence.get('imageSha256')!=EXPECTED_IMAGE_SHA256:raise ValueError('Wrong evidence source')
    expected=[(x,y,z) for start in (175,215) for x in range(start,start+2) for y in range(201,203) for z in range(133,135)]
    recorded=[tuple(p) for c in evidence['components'] for p in c['points']]
    if len(recorded)!=16 or set(recorded)!=set(expected):raise ValueError('Wrong evidence points')
    for seed in ((175,201,133),(215,201,133)):
        points=set(map(tuple,component(labels==27,seed)))
        wanted={p for p in expected if seed[0]<=p[0]<=seed[0]+1}
        if points!=wanted:raise ValueError('Changed component connectivity')
    xyz=np.array(expected);result=labels.copy();result[tuple(xyz.T)]=0
    if np.count_nonzero(result!=labels)!=16:raise ValueError('Wrong difference')
    reverse=result.copy();reverse[tuple(xyz.T)]=27
    if not np.array_equal(reverse,labels):raise ValueError('Reverse differs')
    return result,xyz

def main(out):
    out=out.resolve()
    if out.exists() or not out.is_relative_to(ROOT/'work'):raise ValueError('New work output required')
    if sha(EVIDENCE.read_bytes())!=EVIDENCE_SHA:raise ValueError('Evidence changed')
    evidence=json.loads(EVIDENCE.read_text(encoding='utf-8'))
    _,_,labels=read_browser_volume(TARGET,MAGIC_LABELS,FINAL_SHA)
    _,_,raw=read_browser_volume(DEFAULT_IMAGE,MAGIC_IMAGE,EXPECTED_IMAGE_SHA256)
    result,points=repair(labels,evidence)
    if not np.all(raw[tuple(points.T)]==255):raise ValueError('Reviewed image changed')
    # Compare the actual existing derived part masks, not a guessed mesh impact.
    import build_specimen_blocks as b
    # Review volumes are XYZ; specimen_definitions requires ZYX.
    tissue_zyx=raw.transpose(2,1,0)[::2,::2,::2]
    before=b.specimen_definitions(tissue_zyx,labels.transpose(2,1,0)[::2,::2,::2])
    after=b.specimen_definitions(tissue_zyx,result.transpose(2,1,0)[::2,::2,::2])
    changed=[]
    for block,parts in before.items():
        if len(parts)!=len(after[block]):raise ValueError('Part definitions differ')
        for p,q in zip(parts,after[block]):
            if p.key!=q.key:raise ValueError('Part identity differs')
            if not np.array_equal(p.mask,q.mask):changed.append([block,p.key])
    data=encode(result)
    record=dict(scope='paired-isolated-id27-components-16',decision='project-adopted-for-integration',expertReviewed=False,
        date='2026-09-06',inputCompressedSha256=FINAL_SHA,outputCompressedSha256=sha(data),
        inputRawSha256=sha(labels.tobytes(order='F')),outputRawSha256=sha(result.tobytes(order='F')),
        changedVoxelCount=16,sourceLabel=27,targetLabel=0,points=points.tolist(),
        imageReviewRecord=EVIDENCE.relative_to(ROOT).as_posix(),imageReviewSha256=EVIDENCE_SHA,
        evidence='BRAINSTEM_ISLAND_REPAIR.md: all 24 orthogonal comparisons on 6 sheets viewed. Both islands lie in an image void separated from tissue. Not a global intensity or component-size deletion rule.',
        beforeCount=int(np.count_nonzero(labels==27)),afterCount=int(np.count_nonzero(result==27)),
        changedBlockPartMasks=changed,
        limitations='Work-stage only pending integration; not expert review, not aqueduct/ventricle reclassification. Other components and missing ventral midbrain untouched.')
    out.mkdir();(out/'labels.bin.gz').write_bytes(data)
    (out/'adoption.json').write_text(json.dumps(record,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:v for k,v in record.items() if k!='points'},indent=2))

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--output',type=Path,required=True);main(p.parse_args().output)
