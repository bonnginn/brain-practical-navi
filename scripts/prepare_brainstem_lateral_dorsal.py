"""Stage only the two edge regions reviewed in 109 orthogonal planes."""
import argparse,json
from pathlib import Path
import numpy as np
from scipy.ndimage import label
from audit_brainstem_bright_regions import ROOT,SOURCE,SOURCE_SHA,sha
from build_orthogonal_review_bundle import DEFAULT_IMAGE,MAGIC_LABELS,MAGIC_IMAGE,EXPECTED_IMAGE_SHA256,read_browser_volume
from adopt_registered_red_nuclei import encode
BASE=ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-lateral-dorsal-50de.bin.gz'
BASE_SHA='50ded72a4a9b43e7c2c93b4bc5933b76680ab89e3e9eb7bb4f2cb5cfccc68d6c'
REVIEWS=[('lateral',52,242,57,15,'c3423fa86671e6205a2b2f9e22accb61368498d3265a09293cb8ab89fe72394c'),('dorsal',149,224,52,13,'8d0bfb77994c77914b9df32b67db658b55bbd4ec693e453fb260309a3f4c317f')]

def main(out):
    out=out.resolve()
    if out.exists() or not out.is_relative_to(ROOT/'work'):raise ValueError('New work output required')
    _,_,old=read_browser_volume(SOURCE,MAGIC_LABELS,SOURCE_SHA)
    _,_,seg=read_browser_volume(BASE,MAGIC_LABELS,BASE_SHA)
    _,_,raw=read_browser_volume(DEFAULT_IMAGE,MAGIC_IMAGE,EXPECTED_IMAGE_SHA256)
    components,_=label((old==27)&(raw==255));groups=[];all_points=[]
    for name,cid,count,planes,sheets,digest in REVIEWS:
        suffix='-current' if name=='dorsal' else ''
        path=ROOT/f'segmentation-patches/review/brainstem-{name}-edge{suffix}-image-review-2026-09-06.json'
        if sha(path.read_bytes())!=digest:raise ValueError('Changed review')
        r=json.loads(path.read_text(encoding='utf-8'));points=np.argwhere(components==cid)
        if len(points)!=count or len(r['rendered'])!=sheets or sum(len(s['frames']) for s in r['rendered'])!=planes:raise ValueError('Wrong scope')
        expected_review_source=BASE_SHA if name=='dorsal' else SOURCE_SHA
        if r['sourceSha256']!=expected_review_source or r['imageSha256']!=EXPECTED_IMAGE_SHA256:raise ValueError('Wrong source')
        reference=seg if expected_review_source==BASE_SHA else old
        image_dir=ROOT/('work/anatomy-review/brainstem-dorsal-current-v1' if name=='dorsal' else f'work/anatomy-review/brainstem-bright-{cid}-full-v1')
        for sheet in r['rendered']:
            if sha((image_dir/sheet['file']).read_bytes())!=sheet['sha256']:raise ValueError('Changed image')
            for frame in sheet['frames']:
                crop=frame['crop'];sl=tuple(slice(a,b+1) for a,b in zip(crop['min'],crop['max']))
                if not np.array_equal(reference[sl],seg[sl]):raise ValueError('Review context changed; rerender before adoption')
        if not np.all(seg[tuple(points.T)]==27):raise ValueError('Source labels changed')
        all_points.extend(points.tolist());groups.append(dict(name=name,count=count,points=points.tolist(),review=path.relative_to(ROOT).as_posix(),reviewSha256=digest,reviewedSheets=[s['file'] for s in r['rendered']]))
    points=np.array(sorted(map(tuple,all_points)))
    if len(points)!=466 or len(set(map(tuple,points)))!=466:raise ValueError('Wrong union')
    result=seg.copy();result[tuple(points.T)]=0;reverse=result.copy();reverse[tuple(points.T)]=27
    if not np.array_equal(reverse,seg) or np.count_nonzero(seg!=result)!=466:raise ValueError('Wrong replay')
    import build_specimen_blocks as b
    tissue=raw.transpose(2,1,0)[::2,::2,::2]
    before=b.specimen_definitions(tissue,seg.transpose(2,1,0)[::2,::2,::2]);after=b.specimen_definitions(tissue,result.transpose(2,1,0)[::2,::2,::2]);changed=[]
    for block,parts in before.items():
        if len(parts)!=len(after[block]):raise ValueError('Part count differs')
        for p,q in zip(parts,after[block]):
            if p.key!=q.key:raise ValueError('Part identity differs')
            n=int(np.count_nonzero(p.mask!=q.mask))
            if n:changed.append(dict(block=block,part=p.key,changedMaskVoxels=n))
    data=encode(result)
    record=dict(scope='brainstem-lateral-dorsal-edges',date='2026-09-06',decision='reviewed-stage-pending-integration',expertReviewed=False,inputCompressedSha256=BASE_SHA,inputRawSha256=sha(seg.tobytes(order='F')),outputCompressedSha256=sha(data),outputRawSha256=sha(result.tobytes(order='F')),points=points.tolist(),changedVoxelCount=466,transitions={'27->0':466},beforeCount27=int((seg==27).sum()),afterCount27=int((result==27).sum()),regions=groups,changedBlockPartMasks=changed,reviewContextUnchanged=True,
        rationale='All 57 lateral and 52 dorsal planes inspected. Fixed regions lie on the space side of the visible tissue edge. Remove unsupported tissue labels; do not infer ventricular/cisternal identity or extend the intensity query to other regions.',limitations='AI-assisted local image review, not expert approval, complete brainstem boundary validation, or ventral-midbrain repair. Stage only; no public mutation.')
    out.mkdir();(out/'labels.bin.gz').write_bytes(data);(out/'adoption.json').write_text(json.dumps(record,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:record[k] for k in ('outputCompressedSha256','outputRawSha256','afterCount27','changedBlockPartMasks')},indent=2))

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--output',type=Path,required=True);main(p.parse_args().output)
