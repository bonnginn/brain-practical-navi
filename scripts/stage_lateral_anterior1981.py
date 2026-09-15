"""Reversible anterior cavity repair; no existing tissue label is overwritten."""
import gzip
import json
import numpy as np
from scipy import ndimage
from explore_lateral_upper_cavity import candidates
from build_orthogonal_review_bundle import ROOT, DEFAULT_LABELS, MAGIC_LABELS, read_browser_volume
from audit_ventricle_cavity_candidates import DEFAULT_IMAGE, EXPECTED_IMAGE_SHA256
from stage_lateral_detached547 import digest

LABEL_SHA='7693056c443272f472c60d5cce9c051ee20ee851aace4787a47c61ceaa6e1868'
LOCATOR_SHA='f58d8e97c05b3c1a3d563bdff5dedf1466d7c42d5ef66faf95602e9cdc3ff188'
REVIEW_SHA='69f785fa5558e5254cb40360884e084c36b750525cdb93747fe722d536429e2d'
HELD=[[192,270,152],[196,270,149],[196,270,152],[196,270,153],[196,270,154],[196,271,149]]


def replay(labels,entries,reverse=False):
    p=np.asarray([r['xyz'] for r in entries]);dest=np.asarray([r['after'] for r in entries])
    if (p.shape!=(1981,3) or p.dtype.kind not in 'iu' or len(np.unique(p,axis=0))!=1981
        or np.any(p<0) or np.any(p>=labels.shape) or np.any(p[:,2]<136) or np.any(p[:,2]>173)
        or np.any(p[:,1]<270)
        or any(type(r['before'])is not int or r['before']!=0 or type(r['after'])is not int for r in entries)
        or int((dest==23).sum())!=133 or int((dest==24).sum())!=1848):raise ValueError('Unexpected anterior repair')
    if np.any(labels[tuple(p.T)]!=(dest if reverse else 0)):raise ValueError('Conflicting labels')
    after=labels.copy();after[tuple(p.T)]=0 if reverse else dest
    return after


def main():
    out=ROOT/'work/anatomy-review/lateral-anterior1981-stage-v1'
    if out.exists():raise ValueError('Preserve evidence')
    evidence=[];reports=[]
    for folder,expected,viewed in [('lateral-anterior-z136-173-nearblack-v1',LOCATOR_SHA,False),
                                  ('lateral-anterior-native300-v1',REVIEW_SHA,True)]:
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
    locator,_=candidates(image,before,136,173,minimum=240)
    for p in entries:
        if locator[tuple(p['xyz'])]!=p['after']:raise ValueError('Seed-connected locator differs')
    after=replay(before,entries)
    if not np.array_equal(replay(after,entries,True),before) or np.count_nonzero(before!=after)!=1981:raise ValueError('Reverse mismatch')
    continuity={}
    for k in (23,24):
        reached=ndimage.binary_propagation(before==k,mask=after==k,structure=ndimage.generate_binary_structure(3,1))
        if np.any((after==k)&~reached):raise ValueError('New detached fragment')
        continuity[str(k)]=dict(newDetachedVoxels=0,added=int(((before==0)&(after==k)).sum()))
    base=DEFAULT_LABELS.read_bytes();raw=gzip.decompress(base);data=gzip.compress(raw[:10]+after.tobytes(order='F'),mtime=0)
    record=dict(beforeSha256=LABEL_SHA,afterSha256=digest(data),afterRawVoxelSha256=digest(after.tobytes(order='F')),
        points=entries,count=1981,transition='mixed-lateral-cavity-fill',evidence=evidence,continuity=continuity,
        heldCount=198,heldDisconnectedXYZ=HELD,
        countsBefore={str(k):int((before==k).sum()) for k in [0,23,24]},countsAfter={str(k):int((after==k).sum()) for k in [0,23,24]},
        status='AI-image-reviewed-work-stage-only',adopted=False,expertReviewed=False,publicMutation=False,
        rationale='User identified anterior lateral ventricular omissions down to app Z136. '
        'Closed full-plane near-black components (encoded >=240) inherit one existing side; only background cells at Z136–173 and anterior work Y>=270 are considered. '
        'Raw registered300 void intensity >=65000 must occupy at least half of the exact app-cell overlap. '
        'All 19 original-image sheets / 56 planes were visually inspected (38 horizontal and 9 per orthogonal axis). '
        'Selected cells repair cavity margins, mainly the right anterior horn, retaining septal and caudate tissue. '
        '192 weak-support cells and 6 disconnected cells remain unchanged; every new cell is 6-connected to existing same-side labels.',
        limitation='Regional educational repair, not expert-reviewed ground truth or complete ventricular segmentation. '
        'Orthogonal planes are targeted checks, not all native planes. Work-range cutoffs are not anatomical endpoints. '
        'No existing nonzero label is overwritten; near-black locator sheets were not separately visually inspected. '
        'Mesh synchronization and product adoption pending.')
    out.mkdir();(out/'before.bin.gz').write_bytes(base);(out/'labels.bin.gz').write_bytes(data)
    (out/'repair.json').write_text(json.dumps(record,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:v for k,v in record.items() if k not in ['points','evidence','rationale','limitation']}))
    print('recordSha256',digest((out/'repair.json').read_bytes()))


if __name__=='__main__':main()
