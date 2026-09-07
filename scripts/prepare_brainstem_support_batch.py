"""Stage two separately image-reviewed unsupported brainstem regions together."""
import argparse,json
from pathlib import Path
import numpy as np
from scipy.ndimage import label
from prepare_brainstem_inferior_support import ROOT,BASE,SOURCE_SHA,sha
from build_orthogonal_review_bundle import DEFAULT_IMAGE,MAGIC_IMAGE,MAGIC_LABELS,EXPECTED_IMAGE_SHA256,read_browser_volume
from adopt_registered_red_nuclei import encode
INFERIOR=ROOT/'segmentation-patches/review/brainstem-inferior-support-adoption-2026-09-06.json'
INFERIOR_SHA='97a661402005bd8874aeb8ffa2062b20516fb892595a226b49d17c0f629179aa'
GAP=ROOT/'segmentation-patches/review/brainstem-surface-gap-image-review-2026-09-06.json'
GAP_SHA='59884655220520e74b6a3327e6906e5265962cce276c6395b7eb238f6bde2459'

def main(out):
    out=out.resolve()
    if out.exists() or not out.is_relative_to(ROOT/'work'):raise ValueError('New work output required')
    if sha(INFERIOR.read_bytes())!=INFERIOR_SHA or sha(GAP.read_bytes())!=GAP_SHA:raise ValueError('Changed review')
    inferior=json.loads(INFERIOR.read_text(encoding='utf-8'));gap=json.loads(GAP.read_text(encoding='utf-8'))
    if len(gap['rendered'])!=18 or sum(len(s['frames']) for s in gap['rendered'])!=72:raise ValueError('Incomplete gap review')
    for s in gap['rendered']:
        if sha((ROOT/'work/anatomy-review/brainstem-bright-87-full-v1'/s['file']).read_bytes())!=s['sha256']:raise ValueError('Changed image')
    _,_,seg=read_browser_volume(BASE,MAGIC_LABELS,SOURCE_SHA)
    _,_,raw=read_browser_volume(DEFAULT_IMAGE,MAGIC_IMAGE,EXPECTED_IMAGE_SHA256)
    if sha(seg.tobytes(order='F'))!=inferior['inputRawSha256']:raise ValueError('Wrong inferior input')
    regions,_=label((seg==27)&(raw==255));gap_points=np.argwhere(regions==87)
    if len(gap_points)!=620 or gap_points.min(0).tolist()!=[177,201,39] or gap_points.max(0).tolist()!=[216,214,50]:raise ValueError('Wrong reviewed gap')
    points=np.array(sorted(map(tuple,inferior['points']+gap_points.tolist())))
    if len(points)!=4005 or len(set(map(tuple,points)))!=4005:raise ValueError('Overlap or wrong count')
    if not np.all(seg[tuple(points.T)]==27) or not np.all(raw[tuple(points.T)]==255):raise ValueError('Source changed')
    result=seg.copy();result[tuple(points.T)]=0
    reverse=result.copy();reverse[tuple(points.T)]=27
    if not np.array_equal(reverse,seg) or np.count_nonzero(result!=seg)!=4005:raise ValueError('Replay differs')
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
    record=dict(scope='two-image-reviewed-brainstem-support-regions',date='2026-09-06',decision='project-adopted-for-integration',expertReviewed=False,
        inputCompressedSha256=SOURCE_SHA,inputRawSha256=sha(seg.tobytes(order='F')),outputCompressedSha256=sha(data),outputRawSha256=sha(result.tobytes(order='F')),
        points=points.tolist(),changedVoxelCount=4005,transitions={'27->0':4005},beforeCount27=254513,afterCount27=int((result==27).sum()),changedBlockPartMasks=changed,
        regions=[dict(name='inferior-image-support',count=3385,record=INFERIOR.relative_to(ROOT).as_posix(),sha256=INFERIOR_SHA),dict(name='external-surface-gap',count=620,points=gap_points.tolist(),record=GAP.relative_to(ROOT).as_posix(),sha256=GAP_SHA,reviewedSheets=[s['file'] for s in gap['rendered']])],
        rationale='Inferior region reviewed in 78 planes; external transverse surface gap reviewed in 72 planes, all 38 sheets inspected. Unsupported labels removed only in these fixed regions. Gap voxels lie outside visible tissue, not assigned a ventricular identity.',
        limitations='AI-assisted project adoption, not expert review. Zero means unassigned; does not establish donor tissue absence, cause of a gap, or the anatomical brainstem/spinal-cord boundary. Other bright regions and ventral midbrain extent remain unresolved.')
    out.mkdir();(out/'labels.bin.gz').write_bytes(data);(out/'adoption.json').write_text(json.dumps(record,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:record[k] for k in ('outputCompressedSha256','outputRawSha256','afterCount27','changedBlockPartMasks')},indent=2))

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--output',type=Path,required=True);main(p.parse_args().output)
