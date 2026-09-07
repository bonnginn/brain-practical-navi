"""Combine two pinned, independently reviewed changes on their common source."""
import gzip
import json
import numpy as np
from stage_lateral_crop34 import ROOT,digest,load_batch_stage

PARTS=(('fourth-upper-residual8','a69a55e7fc4964d83d6cff241d8dc1810af64a6cab8dbd170cfc046690647ef3'),
       ('third-inferior4','f955eb3f0ba4619b8282067ec230ee808eddfb3a7ad7f5f165faebe42db06ba1'))


def replay(labels,entries,reverse=False):
    if len(entries)!=12:raise ValueError('Expected twelve edits')
    for p in entries:
        if type(p['before']) is not int or type(p['after']) is not int or (p['before'],p['after']) not in ((0,26),(25,0)):
            raise ValueError('Unsupported transition')
    if sum(p['before']==0 for p in entries)!=8:raise ValueError('Wrong transition counts')
    xyz=np.asarray([p['xyz'] for p in entries])
    if xyz.shape!=(12,3) or xyz.dtype.kind not in 'iu' or len(np.unique(xyz,axis=0))!=12 or np.any(xyz<0) or np.any(xyz>=labels.shape):
        raise ValueError('Invalid coordinates')
    old=np.asarray([p['after' if reverse else 'before'] for p in entries])
    new=np.asarray([p['before' if reverse else 'after'] for p in entries])
    if np.any(labels[tuple(xyz.T)]!=old):raise ValueError('Source conflict')
    out=labels.copy();out[tuple(xyz.T)]=new
    return out


def main():
    out=ROOT/'work/anatomy-review/ventricular-mixed12-stage-v1'
    if out.exists():raise ValueError('Preserve prior stage')
    base=None;entries=[];evidence=[]
    for name,sha in PARTS:
        folder,r=load_batch_stage(name,sha)
        data=(folder/'before.bin.gz').read_bytes()
        if base is not None and base!=data:raise ValueError('Common source required')
        base=data
        before=gzip.decompress(base);after=gzip.decompress((folder/'labels.bin.gz').read_bytes())
        xyzs=r['points'] if r['transition']=='0->26' else [p['xyz'] for p in r['points']]
        local=[dict(xyz=p,before=0,after=26) for p in xyzs] if r['transition']=='0->26' else r['points']
        expected=bytearray(before)
        for p in local:
            x,y,z=p['xyz'];i=10+x+394*(y+466*z)
            if expected[i]!=p['before']:raise ValueError('Substage source conflict')
            expected[i]=p['after']
        if bytes(expected)!=after:raise ValueError('Substage full difference changed')
        entries.extend(local)
        evidence.append(dict(path=(folder/'repair.json').relative_to(ROOT).as_posix(),sha256=sha,scope='Independently reviewed source stage, not a new review'))
        evidence.extend(r['evidence'])
    raw=gzip.decompress(base);before=np.frombuffer(raw,np.uint8,offset=10).reshape((394,466,378),order='F')
    after=replay(before,entries)
    if not np.array_equal(replay(after,entries,True),before):raise ValueError('Restoration failed')
    data=gzip.compress(raw[:10]+after.tobytes(order='F'),mtime=0)
    r=dict(beforeSha256=digest(base),afterSha256=digest(data),afterRawVoxelSha256=digest(after.tobytes(order='F')),
        points=entries,count=12,transition='mixed-ventricular-repair',evidence=evidence,
        status='AI-image-reviewed-work-stage-only',adopted=False,expertReviewed=False,publicMutation=False,
        rationale='Union of reviewed upper fourth-ventricle omissions (0->26:8) and inferior third-ventricle external fragment exclusion (25->0:4). Shared baseline, disjoint coordinates and exact independent differences verified; neither stage overwrites the other.',
        limitation='Inherits source-stage anatomical limitations and image-review scope. Not expert review or whole-ventricle completion. Mesh synchronization and product adoption pending.')
    out.mkdir();(out/'before.bin.gz').write_bytes(base);(out/'labels.bin.gz').write_bytes(data)
    (out/'repair.json').write_text(json.dumps(r,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(dict(recordSha256=digest((out/'repair.json').read_bytes()),afterSha256=r['afterSha256'],afterRawVoxelSha256=r['afterRawVoxelSha256'])))


if __name__=='__main__':main()
