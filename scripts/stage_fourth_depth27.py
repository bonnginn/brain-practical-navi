"""Reversible work-only batch: reviewed anterior omissions and brainstem conflicts."""
import gzip
import json
import numpy as np
from stage_lateral_crop34 import ROOT, digest, DEFAULT_LABELS, MAGIC_LABELS, read_browser_volume

SOURCE_SHA='2bf9dd7dea088310e29ccbf72b7f78dc641346022200619e499e13b1118dbdd1'
LOCATOR='work/anatomy-review/fourth-anterior-depth-through-brainstem-2bf9-v1.json'
LOCATOR_SHA='54a859762f5637d1ac68c359ea0464edde6ebcdc4c75437b3b0aa7d4b19ae903'


def replay(labels, entries, reverse=False):
    if len(entries)!=27 or any(type(p['before']) is not int or p['before'] not in (0,27)
            or type(p['after']) is not int or p['after']!=26 for p in entries):
        raise ValueError('Expected explicit 0/27 to 26 entries')
    if sum(p['before']==0 for p in entries)!=16:raise ValueError('Wrong transition counts')
    xyz=np.asarray([p['xyz'] for p in entries])
    if (xyz.shape!=(27,3) or xyz.dtype.kind not in 'iu' or len(np.unique(xyz,axis=0))!=27
            or np.any(xyz<0) or np.any(xyz>=labels.shape)):
        raise ValueError('Invalid coordinates')
    old=np.asarray([p['before'] for p in entries],dtype=np.uint8)
    if np.any(labels[tuple(xyz.T)]!=(26 if reverse else old)):
        raise ValueError('Conflicting source labels')
    out=labels.copy();out[tuple(xyz.T)]=old if reverse else 26
    return out


def main():
    out=ROOT/'work/anatomy-review/fourth-depth27-stage-v1'
    if out.exists():raise ValueError('Preserve prior stage')
    data=(ROOT/LOCATOR).read_bytes();locator=json.loads(data)
    if digest(data)!=LOCATOR_SHA or locator['sourceSha256']!=SOURCE_SHA:raise ValueError('Locator changed')
    entries=locator['candidateChanges']
    evidence=[dict(path=LOCATOR,sha256=LOCATOR_SHA,scope='Depth locator, not sole anatomical evidence')]
    reviews=[
        ('fourth-depth-brainstem11-native300-v1','5063cc8a7721d064f9bfd9d659947dd9f055912f0bbda1316e924d1a12e9347d',9,27,SOURCE_SHA),
        ('fourth-depth16-lower-native300-v1','a69bd511323ce31e49d84e5047d600abf1da2a617eaccf3f96a61743cf9a7ab7',3,0,SOURCE_SHA),
        ('fourth-anterior-depth16-native300-v1','8aade31dd61784da53136c5dc0b2a26771349a280f119238bc8050f3c67b9916',9,0,'aa3b649e0d43cc1ccefb095d58d0bba98578657ce812256257694a200caff442'),
        ('fourth-brainstem-conflicts48-series-z-v1','25ca013b63488e7162147aac7b6cd71171875852270a0dacb550486dc99be887',20,None,'aa3b649e0d43cc1ccefb095d58d0bba98578657ce812256257694a200caff442'),
    ]
    for folder,sha,count,before_id,label_sha in reviews:
        path=ROOT/f'work/anatomy-review/{folder}/report.json';data=path.read_bytes();review=json.loads(data)
        if digest(data)!=sha or review['labelsSha256']!=label_sha or len(review['figures'])!=count:
            raise ValueError('Review changed')
        if before_id is not None and review['points']!=[p['xyz'] for p in entries if p['before']==before_id]:
            raise ValueError('Candidate set changed')
        for f in review['figures']:
            if digest((path.parent/f['path']).read_bytes())!=f['sha256']:raise ValueError('Figure changed')
        evidence.append(dict(path=path.relative_to(ROOT).as_posix(),sha256=sha,
            visuallyInspectedFigures=review['figures'],scope='Representative candidate overlays' if before_id is not None else 'Previously reviewed contiguous raw-image context; overlay depicts predecessor candidates'))
    _,_,before=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,SOURCE_SHA)
    after=replay(before,entries)
    if np.count_nonzero(after!=before)!=27 or not np.array_equal(replay(after,entries,True),before):raise ValueError('Difference or restoration failed')
    compressed=DEFAULT_LABELS.read_bytes();raw=gzip.decompress(compressed)
    staged=gzip.compress(raw[:10]+after.tobytes(order='F'),mtime=0)
    record=dict(beforeSha256=SOURCE_SHA,afterSha256=digest(staged),afterRawVoxelSha256=digest(after.tobytes(order='F')),
        points=entries,count=27,transition='mixed-to-26',evidence=evidence,
        countsBefore={str(k):int((before==k).sum()) for k in (0,26,27)},
        countsAfter={str(k):int((after==k).sum()) for k in (0,26,27)},
        status='AI-image-reviewed-work-stage-only',adopted=False,expertReviewed=False,publicMutation=False,
        rationale='Sixteen unlabelled omissions and eleven remaining brainstem-labelled cells follow the brainstem-facing cavity boundary. Reviewed source300 representative XYZ overlays, including the previously missing inferior midline view, together with previously inspected consecutive Z106–165 raw-image context. Source support is required continuously along each anterior column; no jumping across low-support tissue.',
        limitation='Not expert review or complete ventricular segmentation. Representative new overlays, not all new-candidate orthogonal planes. No native100 review for this batch. Posterior open space, unseeded columns and partial-volume limits remain unresolved. Mesh synchronization and product adoption pending.')
    out.mkdir();(out/'before.bin.gz').write_bytes(compressed);(out/'labels.bin.gz').write_bytes(staged)
    (out/'repair.json').write_text(json.dumps(record,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:v for k,v in record.items() if k not in ('points','evidence')}))
    print('recordSha256',digest((out/'repair.json').read_bytes()))


if __name__=='__main__':main()
