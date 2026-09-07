"""Stage tissue reclassification; leave uncertain non-brainstem boundary unlabelled."""
import argparse,json
from pathlib import Path
import numpy as np
from install_brainstem_three_repair import ROOT,FINAL_SHA,sha
TARGET=ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-cerebellar-islands-8238.bin.gz'
from adopt_registered_red_nuclei import encode
from build_orthogonal_review_bundle import DEFAULT_IMAGE,MAGIC_IMAGE,MAGIC_LABELS,EXPECTED_IMAGE_SHA256,read_browser_volume

EVIDENCE=ROOT/'segmentation-patches/review/cerebellar-island-voxel-review-2026-09-06.json'
EVIDENCE_SHA='73a198e8f970cb0493bec2ed716dbab4c37f003b0dc8142782d41111490943f0'

def reviewed_edits():
    # Explicit selections from the 32 reviewed planes, not an intensity classifier.
    edits=[((155,y,z),28) for y in range(205,209) for z in (81,82)]
    edits += [((163,y,z),28) for y in range(191,195) for z in (51,52)]
    edits += [((x,y,z),29) for x in (235,236) for y in range(205,209) for z in (81,82)]
    edits += [((228,y,z),29) for y in (191,192) for z in (51,52)]
    edits += [(p,0) for p in ((227,192,52),(227,193,51),(227,194,51),(228,194,51))]
    return edits

def repair(labels,raw,evidence):
    if evidence.get('inputSha256')!=FINAL_SHA or evidence.get('imageSha256')!=EXPECTED_IMAGE_SHA256:raise ValueError('Wrong evidence source')
    if labels.shape!=raw.shape:raise ValueError('Image grid differs')
    points=[tuple(p) for c in evidence['components'] for p in c['points']]
    if len(points)!=64 or len(set(points))!=64:raise ValueError('Wrong inventory')
    for c in evidence['components']:
        xyz=np.array(c['points'])
        if not np.all(labels[tuple(xyz.T)]==27) or raw[tuple(xyz.T)].tolist()!=c['rawValues']:raise ValueError('Reviewed voxels changed')
    edits=reviewed_edits()
    if len(edits)!=40 or len({p for p,_ in edits})!=40 or not {p for p,_ in edits}<=set(points):raise ValueError('Wrong selected points')
    unresolved=sorted(set(points)-{p for p,_ in edits})
    # These voxels are outside the reviewed brainstem, but their final
    # cerebellar/space boundary is uncertain. Zero means unassigned, not void.
    edits += [(p,0) for p in unresolved]
    result=labels.copy()
    for p,target in edits:result[p]=target
    if np.count_nonzero(result!=labels)!=64:raise ValueError('Wrong difference')
    reverse=result.copy()
    for p,_ in edits:reverse[p]=27
    if not np.array_equal(reverse,labels):raise ValueError('Reverse differs')
    return result,edits,unresolved

def main(out):
    out=out.resolve()
    if out.exists() or not out.is_relative_to(ROOT/'work'):raise ValueError('New work output required')
    if sha(EVIDENCE.read_bytes())!=EVIDENCE_SHA:raise ValueError('Changed evidence record')
    evidence=json.loads(EVIDENCE.read_text(encoding='utf-8'))
    _,_,labels=read_browser_volume(TARGET,MAGIC_LABELS,FINAL_SHA)
    _,_,raw=read_browser_volume(DEFAULT_IMAGE,MAGIC_IMAGE,EXPECTED_IMAGE_SHA256)
    result,edits,held=repair(labels,raw,evidence)
    import build_specimen_blocks as b
    # Review volumes are XYZ; specimen_definitions requires ZYX.
    tissue_zyx=raw.transpose(2,1,0)[::2,::2,::2]
    before=b.specimen_definitions(tissue_zyx,labels.transpose(2,1,0)[::2,::2,::2])
    after=b.specimen_definitions(tissue_zyx,result.transpose(2,1,0)[::2,::2,::2]);changed=[]
    for block,parts in before.items():
        if len(parts)!=len(after[block]):raise ValueError('Changed part definitions')
        for p,q in zip(parts,after[block]):
            if p.key!=q.key:raise ValueError('Changed part identity')
            if not np.array_equal(p.mask,q.mask):changed.append([block,p.key])
    data=encode(result)
    record=dict(scope='four-cerebellar-side-islands',decision='project-adopted-for-integration',expertReviewed=False,date='2026-09-06',
        inputCompressedSha256=FINAL_SHA,outputCompressedSha256=sha(data),
        inputRawSha256=sha(labels.tobytes(order='F')),outputRawSha256=sha(result.tobytes(order='F')),
        sourceLabel=27,changedVoxelCount=64,transitions={'27->28':16,'27->29':20,'27->0':28},
        edits=[dict(xyz=p,fromLabel=27,toLabel=t) for p,t in edits],unresolvedBoundaryPoints=held,
        imageReviewRecord=EVIDENCE.relative_to(ROOT).as_posix(),imageReviewSha256=EVIDENCE_SHA,
        evidence='CEREBELLAR_ISLAND_REPAIR.md; 64 voxels reviewed in 32 planes with raw intensity unobscured, plus prior full adjacent planes and wider regional context.',
        beforeCounts={str(k):int(np.count_nonzero(labels==k)) for k in (27,28,29)},
        afterCounts={str(k):int(np.count_nonzero(result==k)) for k in (27,28,29)},changedBlockPartMasks=changed,
        limitations='28 unassigned voxels comprise 4 clear void points and 24 uncertain cerebellar/space boundary points, not a claim of tissue absence. All 64 lie outside reviewed brainstem tissue. Not complete cerebellar segmentation or expert approval. Work-stage pending integration.')
    out.mkdir();(out/'labels.bin.gz').write_bytes(data)
    (out/'adoption.json').write_text(json.dumps(record,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:v for k,v in record.items() if k not in ('edits','unresolvedBoundaryPoints')},indent=2))

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--output',type=Path,required=True);main(p.parse_args().output)
