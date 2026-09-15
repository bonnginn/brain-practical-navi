"""Reversible bilateral cavity fill in the user-reviewed horizontal interval."""
import gzip
import json
import numpy as np
from scipy import ndimage
from explore_lateral_upper_cavity import LABEL_SHA,candidates
from build_orthogonal_review_bundle import ROOT,DEFAULT_LABELS,MAGIC_LABELS,read_browser_volume
from audit_ventricle_cavity_candidates import DEFAULT_IMAGE,EXPECTED_IMAGE_SHA256
from stage_lateral_detached547 import digest

LOCATOR_SHA='59175fbe709905176f7fd29ec87b78a810340e20eceef0139408de4aebe35658'
REVIEW_SHA='d468891d90171b522a3998ef3306102f49a7d33f1b497a2b0d5591136a282097'


def replay(labels,entries,reverse=False):
    p=np.asarray([r['xyz'] for r in entries]);dest=np.asarray([r['after'] for r in entries])
    if (p.shape!=(729,3) or p.dtype.kind not in 'iu' or len(np.unique(p,axis=0))!=729
        or np.any(p<0) or np.any(p>=labels.shape) or np.any(p[:,2]<174) or np.any(p[:,2]>202)
        or any(type(r['before'])is not int or r['before']!=0 or type(r['after'])is not int for r in entries)
        or int((dest==23).sum())!=209 or int((dest==24).sum())!=520):raise ValueError('Unexpected bilateral repair')
    if np.any(labels[tuple(p.T)]!=(dest if reverse else 0)):raise ValueError('Conflicting labels')
    after=labels.copy();after[tuple(p.T)]=0 if reverse else dest
    return after


def main():
    out=ROOT/'work/anatomy-review/lateral-upper729-stage-v1'
    if out.exists():raise ValueError('Preserve evidence')
    evidence=[];reports=[]
    for folder,expected in [('lateral-upper-z174-202-v1',LOCATOR_SHA),('lateral-upper-native300-v1',REVIEW_SHA)]:
        path=ROOT/f'work/anatomy-review/{folder}/report.json';data=path.read_bytes();report=json.loads(data)
        if digest(data)!=expected or report['labelSha256']!=LABEL_SHA:raise ValueError('Evidence changed')
        for f in report['figures']:
            if digest((path.parent/f['path']).read_bytes())!=f['sha256']:raise ValueError('Figure changed')
        evidence.append(dict(path=path.relative_to(ROOT).as_posix(),sha256=expected,visuallyInspectedFigures=report['figures']))
        reports.append(report)
    # Removing weak-support neighbours disconnects this one cell: do not add a new island.
    entries=[dict(xyz=p['xyz'],before=0,after=p['after']) for p in reports[1]['points'] if p['xyz']!=[197,267,178]]
    _,_,before=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,LABEL_SHA)
    _,_,image=read_browser_volume(DEFAULT_IMAGE,b'BBV1',EXPECTED_IMAGE_SHA256)
    locator,_=candidates(image,before)
    for p in entries:
        if locator[tuple(p['xyz'])]!=p['after']:raise ValueError('Seed-connected locator differs')
    after=replay(before,entries)
    if not np.array_equal(replay(after,entries,True),before) or np.count_nonzero(before!=after)!=729:raise ValueError('Reverse mismatch')
    continuity={}
    for k in (23,24):
        reached=ndimage.binary_propagation(before==k,mask=after==k,structure=ndimage.generate_binary_structure(3,1))
        if np.any((after==k)&~reached):raise ValueError('New detached fragment')
        continuity[str(k)]=dict(newDetachedVoxels=0,added=int(((before==0)&(after==k)).sum()))
    base=DEFAULT_LABELS.read_bytes();raw=gzip.decompress(base);data=gzip.compress(raw[:10]+after.tobytes(order='F'),mtime=0)
    record=dict(beforeSha256=LABEL_SHA,afterSha256=digest(data),afterRawVoxelSha256=digest(after.tobytes(order='F')),
        points=entries,count=729,transition='mixed-lateral-cavity-fill',evidence=evidence,continuity=continuity,
        heldCount=16,heldDisconnectedXYZ=[[197,267,178]],
        countsBefore={str(k):int((before==k).sum()) for k in [0,23,24]},countsAfter={str(k):int((after==k).sum()) for k in [0,23,24]},
        status='AI-image-reviewed-work-stage-only',adopted=False,expertReviewed=False,publicMutation=False,
        rationale='User requested filling the black cavity adjoining existing lateral ventricular labels at app Z174–202. '
        'Closed full-plane intensity components inherit a single existing side, never coordinate-only splitting. '
        'All 29 app horizontal images and 47 original registered300 planes (29 horizontal and 9 per orthogonal axis) were visually inspected. '
        'The selected 729 cells extend existing cavity margins without crossing the septum, caudate or preserved intraventricular tissue. '
        'Fifteen low-support partial-volume cells and one cell disconnected after their removal remain unmodified; all new cells remain 6-connected to existing same-side labels.',
        limitation='Regional educational repair, not expert-reviewed ground truth or complete ventricular segmentation. '
        'Orthogonal images are targeted regional checks, not every native plane. Tissue-like intraventricular islands are retained, '
        'not automatically filled as holes. The user interval is a work boundary, not an anatomical endpoint. '
        'Mesh synchronization and product adoption pending.')
    out.mkdir();(out/'before.bin.gz').write_bytes(base);(out/'labels.bin.gz').write_bytes(data)
    (out/'repair.json').write_text(json.dumps(record,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:v for k,v in record.items() if k not in ['points','evidence','rationale','limitation']}))
    print('recordSha256',digest((out/'repair.json').read_bytes()))


if __name__=='__main__':main()
