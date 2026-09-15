"""Reversible near-black upper cavity repair; no existing tissue label is overwritten."""
import gzip
import json
import numpy as np
from scipy import ndimage
from explore_lateral_upper_cavity import candidates
from build_orthogonal_review_bundle import ROOT, DEFAULT_LABELS, MAGIC_LABELS, read_browser_volume
from audit_ventricle_cavity_candidates import DEFAULT_IMAGE, EXPECTED_IMAGE_SHA256
from stage_lateral_detached547 import digest

LABEL_SHA='46de00546e8e9b99dab2f9cd7d0f34546acfe0f0f209faea9e1e2a0d48ad5cb7'
LOCATOR_SHA='1d161038beed9ef3fd4f2b5e867708b3664c9a7c6d4c4a943b2dc439358d1ced'
REVIEW_SHA='8f48c4b4bce0efa1de425a16ccb4554832aa92b7c4e56417b7507100f408931e'
HELD=[[197,266,178],[197,267,178],[230,188,174],[231,185,179],[232,183,181]]


def replay(labels,entries,reverse=False):
    p=np.asarray([r['xyz'] for r in entries]);dest=np.asarray([r['after'] for r in entries])
    if (p.shape!=(1487,3) or p.dtype.kind not in 'iu' or len(np.unique(p,axis=0))!=1487
        or np.any(p<0) or np.any(p>=labels.shape) or np.any(p[:,2]<174) or np.any(p[:,2]>202)
        or any(type(r['before'])is not int or r['before']!=0 or type(r['after'])is not int for r in entries)
        or int((dest==23).sum())!=740 or int((dest==24).sum())!=747):raise ValueError('Unexpected upper near-black repair')
    if np.any(labels[tuple(p.T)]!=(dest if reverse else 0)):raise ValueError('Conflicting labels')
    after=labels.copy();after[tuple(p.T)]=0 if reverse else dest
    return after


def main():
    out=ROOT/'work/anatomy-review/lateral-upper-nearblack1487-stage-v1'
    if out.exists():raise ValueError('Preserve evidence')
    evidence=[];reports=[]
    for folder,expected,viewed in [('lateral-upper-nearblack-current-v1',LOCATOR_SHA,False),
                                  ('lateral-upper-nearblack-native300-v1',REVIEW_SHA,True)]:
        path=ROOT/f'work/anatomy-review/{folder}/report.json';data=path.read_bytes();report=json.loads(data)
        if digest(data)!=expected or report['labelSha256']!=LABEL_SHA:raise ValueError('Evidence changed')
        figures=report['figures'] if viewed else []
        for f in figures:
            if digest((path.parent/f['path']).read_bytes())!=f['sha256']:raise ValueError('Figure changed')
        evidence.append(dict(path=path.relative_to(ROOT).as_posix(),sha256=expected,visuallyInspectedFigures=figures))
        reports.append(report)
    entries=[dict(xyz=p['xyz'],before=0,after=p['after']) for p in reports[1]['points'] if p['xyz'] not in HELD]
    _,_,before=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,LABEL_SHA)
    _,_,image=read_browser_volume(DEFAULT_IMAGE,b'BBV1',EXPECTED_IMAGE_SHA256)
    locator,_=candidates(image,before,174,202,minimum=240)
    for p in entries:
        if locator[tuple(p['xyz'])]!=p['after']:raise ValueError('Seed-connected locator differs')
    after=replay(before,entries)
    if not np.array_equal(replay(after,entries,True),before) or np.count_nonzero(before!=after)!=1487:raise ValueError('Reverse mismatch')
    continuity={}
    for k in (23,24):
        reached=ndimage.binary_propagation(before==k,mask=after==k,structure=ndimage.generate_binary_structure(3,1))
        if np.any((after==k)&~reached):raise ValueError('New detached fragment')
        continuity[str(k)]=dict(newDetachedVoxels=0,added=int(((before==0)&(after==k)).sum()))
    base=DEFAULT_LABELS.read_bytes();raw=gzip.decompress(base);data=gzip.compress(raw[:10]+after.tobytes(order='F'),mtime=0)
    record=dict(beforeSha256=LABEL_SHA,afterSha256=digest(data),afterRawVoxelSha256=digest(after.tobytes(order='F')),
        points=entries,count=1487,transition='mixed-lateral-cavity-fill',evidence=evidence,continuity=continuity,
        heldCount=1294,heldDisconnectedXYZ=HELD,
        countsBefore={str(k):int((before==k).sum()) for k in [0,23,24]},countsAfter={str(k):int((after==k).sum()) for k in [0,23,24]},
        status='AI-image-reviewed-work-stage-only',adopted=False,expertReviewed=False,publicMutation=False,
        rationale='Follow-up to the user-requested cavity repair at app Z174–202. '
        'Closed near-black components (encoded >=240) inherit one existing lateral ventricular side and must have raw registered300 void support >=50 percent. '
        'All 16 original-image sheets / 47 planes were visually inspected (29 horizontal and 9 per orthogonal axis). '
        'The additions follow the cavity margins and small dark gaps without filling the preserved tissue-like intraventricular structures. '
        '1289 weak-support cells and 5 disconnected cells remain unchanged; every new cell is 6-connected to existing same-side labels.',
        limitation='Regional educational repair, not expert-reviewed ground truth or complete ventricular segmentation. '
        'Orthogonal planes are targeted checks, not all native planes. Work-range cutoffs are not anatomical endpoints. '
        'No existing nonzero label is overwritten; near-black locator sheets were not separately visually inspected. '
        'Mesh synchronization and product adoption pending.')
    out.mkdir();(out/'before.bin.gz').write_bytes(base);(out/'labels.bin.gz').write_bytes(data)
    (out/'repair.json').write_text(json.dumps(record,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:v for k,v in record.items() if k not in ['points','evidence','rationale','limitation']}))
    print('recordSha256',digest((out/'repair.json').read_bytes()))


if __name__=='__main__':main()
