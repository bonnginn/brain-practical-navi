"""Stage removal of one fully reviewed out-of-image-support component, not all bright voxels."""
import argparse,json
from pathlib import Path
import numpy as np
from scipy.ndimage import label
from audit_brainstem_bright_regions import ROOT,SOURCE_SHA,sha
from build_orthogonal_review_bundle import DEFAULT_LABELS,DEFAULT_IMAGE,MAGIC_LABELS,MAGIC_IMAGE,EXPECTED_IMAGE_SHA256,read_browser_volume
from adopt_registered_red_nuclei import encode
REVIEW=ROOT/'work/anatomy-review/brainstem-bright-112-full-v1/report.json'
REVIEW_SHA='da07660070e9e5e4cbb66dbd9322fde27b2205b9be8f4b1def66193e1a263d12'
BASE=ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-inferior-support-732b.bin.gz'

def main(out):
    out=out.resolve()
    if out.exists() or not out.is_relative_to(ROOT/'work'):raise ValueError('New work output required')
    if sha(REVIEW.read_bytes())!=REVIEW_SHA:raise ValueError('Changed review')
    review=json.loads(REVIEW.read_text(encoding='utf-8'))
    if len(review['rendered'])!=20 or sum(len(s['frames']) for s in review['rendered'])!=78:raise ValueError('Review coverage differs')
    for s in review['rendered']:
        if sha((REVIEW.parent/s['file']).read_bytes())!=s['sha256']:raise ValueError('Changed evidence image')
    _,_,seg=read_browser_volume(BASE,MAGIC_LABELS,SOURCE_SHA)
    _,_,raw=read_browser_volume(DEFAULT_IMAGE,MAGIC_IMAGE,EXPECTED_IMAGE_SHA256)
    regions,_=label((seg==27)&(raw==255));item=review['rendered'][0]
    points=np.argwhere(regions==item['component'])
    if len(points)!=3385 or points.min(0).tolist()!=[181,165,0] or points.max(0).tolist()!=[210,192,14]:raise ValueError('Reviewed component differs')
    # The raw==255 region was a triage query, not an anatomical classifier.
    # Only this fixed component has all adjacent and orthogonal planes reviewed.
    result=seg.copy();result[tuple(points.T)]=0
    if np.count_nonzero(seg!=result)!=3385:raise ValueError('Wrong difference')
    reverse=result.copy();reverse[tuple(points.T)]=27
    if not np.array_equal(reverse,seg):raise ValueError('Reverse differs')
    import build_specimen_blocks as b
    tissue_zyx=raw.transpose(2,1,0)[::2,::2,::2]
    before=b.specimen_definitions(tissue_zyx,seg.transpose(2,1,0)[::2,::2,::2]);after=b.specimen_definitions(tissue_zyx,result.transpose(2,1,0)[::2,::2,::2]);changed=[]
    for block,parts in before.items():
        if len(parts)!=len(after[block]):raise ValueError('Part count differs')
        for p,q in zip(parts,after[block]):
            if p.key!=q.key:raise ValueError('Part order differs')
            n=int(np.count_nonzero(p.mask!=q.mask))
            if n:changed.append(dict(block=block,part=p.key,changedMaskVoxels=n))
    data=encode(result)
    record=dict(scope='brainstem-inferior-image-support',date='2026-09-06',decision='image-reviewed-stage-pending-integration',expertReviewed=False,
        inputCompressedSha256=SOURCE_SHA,inputRawSha256=sha(seg.tobytes(order='F')),outputCompressedSha256=sha(data),outputRawSha256=sha(result.tobytes(order='F')),
        points=points.tolist(),changedVoxelCount=3385,transitions={'27->0':3385},beforeCount27=int((seg==27).sum()),afterCount27=int((result==27).sum()),
        reviewRecordSha256=REVIEW_SHA,reviewedSheets=[s['file'] for s in review['rendered']],review=review,changedBlockPartMasks=changed,
        rationale='All 78 planes on 20 sheets inspected. One inferior external component extends below and around the imaged tissue ending, including planes Z0-2 with no tissue visible in the local region. Remove unsupported atlas labels, not biological tissue. No inferred anatomical brainstem/spinal-cord boundary; imaged support ends here.',
        limitations='Zero means unassigned where tissue is not supported by this image, not proof of absence in the donor. No global intensity threshold, no removal of other bright components, no upper/ventral brainstem repair. Stage only; public assets unchanged.')
    out.mkdir();(out/'labels.bin.gz').write_bytes(data);(out/'adoption.json').write_text(json.dumps(record,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:record[k] for k in ('outputCompressedSha256','outputRawSha256','afterCount27','changedBlockPartMasks')},indent=2))

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--output',type=Path,required=True);main(p.parse_args().output)
