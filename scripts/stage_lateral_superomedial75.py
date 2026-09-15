"""Reversible image-reviewed superomedial rim repair; no automatic adoption."""
import gzip
import json
import numpy as np
from scipy import ndimage
from review_lateral_superomedial75 import selected_points
from review_lateral_midline_candidates import LABEL_SHA, LOCATOR, LOCATOR_SHA, candidate_points
from build_orthogonal_review_bundle import ROOT, DEFAULT_LABELS, MAGIC_LABELS, read_browser_volume
from stage_lateral_detached547 import digest

PAIRS_SHA='73092e362f93039f1b055589c9fd1ed73ff6855569a592fda28fe59c7f0b4b44'
REVIEWS=[
 ('lateral-midline672-september12-series-x-v1','c14759d7d90f680f50794858e7224097c4a90c9c8410b50c17658da94be25169'),
 ('lateral-midline672-september12-series-y-v1','ddfc602c227e45691aed7fca02ad60004c498676b3c295c2456835a65f785360'),
 ('lateral-midline672-september12-series-z-v1','646be1b3229229de4e36ccf179a8b8c403adc8ba27eb34cc71dd311e558901f6'),
 ('lateral-superomedial75-native100-v1','c0046760ebb3a0a630c8d0a34ea4507d62b6f5689bb57338c8d14677bcfc2255'),
]


def replay(labels,entries,reverse=False):
    if len(entries)!=75 or labels.shape!=(394,466,378):raise ValueError('Wrong batch or grid')
    if any(len(e['xyz'])!=3 or any(type(x)is not int for x in e['xyz']) or
           type(e['before'])is not int or e['before']!=0 or
           type(e['after'])is not int or e['after'] not in (23,24) for e in entries):
        raise ValueError('Invalid point or transition')
    p=np.asarray([e['xyz'] for e in entries]);dest=np.array([e['after'] for e in entries])
    if np.any(p<0) or np.any(p>=labels.shape) or len(np.unique(p,axis=0))!=75:
        raise ValueError('Invalid point set')
    idx=np.ravel_multi_index(p.T,labels.shape,order='F')
    pairs=np.column_stack((idx,dest))[np.argsort(idx)].astype('<u4')
    if digest(pairs.tobytes())!=PAIRS_SHA:raise ValueError('Reviewed coordinates or sides changed')
    if np.any(labels[tuple(p.T)]!=(dest if reverse else 0)):raise ValueError('Label conflict')
    result=labels.copy();result[tuple(p.T)]=0 if reverse else dest
    return result


def main():
    out=ROOT/'work/anatomy-review/lateral-superomedial75-stage-v1'
    if out.exists():raise ValueError('Preserve prior evidence')
    baseline=ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-lateral-superomedial75.bin.gz'
    if not baseline.exists():baseline=DEFAULT_LABELS
    _,_,before=read_browser_volume(baseline,MAGIC_LABELS,LABEL_SHA)
    payload=(ROOT/LOCATOR).read_bytes()
    if digest(payload)!=LOCATOR_SHA:raise ValueError('Locator changed')
    locator=json.loads(payload);p=selected_points(candidate_points(locator,before))
    sides={tuple(e['xyz']):e['after'] for e in locator['points']}
    entries=[dict(xyz=q.tolist(),before=0,after=sides[tuple(q)]) for q in p]
    evidence=[]
    for folder,expected in REVIEWS:
        path=ROOT/'work/anatomy-review'/folder/'report.json';data=path.read_bytes();r=json.loads(data)
        if digest(data)!=expected:raise ValueError('Review report changed')
        for f in r['figures']:
            if digest((path.parent/f['path']).read_bytes())!=f['sha256']:raise ValueError('Reviewed figure changed')
        evidence.append(dict(path=path.relative_to(ROOT).as_posix(),sha256=expected,visuallyInspectedFigures=r['figures']))
    after=replay(before,entries)
    if np.count_nonzero(after!=before)!=75 or not np.array_equal(replay(after,entries,True),before):
        raise ValueError('Replay or locality failed')
    for ident in (23,24):
        reached=ndimage.binary_propagation(before==ident,mask=after==ident)
        if np.any((after==ident)&~reached):raise ValueError('New detached addition')
    base=baseline.read_bytes();data=gzip.compress(gzip.decompress(base)[:10]+after.tobytes(order='F'),mtime=0)
    r=dict(beforeSha256=LABEL_SHA,afterSha256=digest(data),afterRawVoxelSha256=digest(after.tobytes(order='F')),
        points=entries,count=75,transition='mixed-lateral-cavity-fill',pairsSha256=PAIRS_SHA,evidence=evidence,
        countsBefore={str(k):int((before==k).sum()) for k in (0,23,24)},
        countsAfter={str(k):int((after==k).sum()) for k in (0,23,24)},
        status='AI-image-reviewed-work-stage-only',adopted=False,expertReviewed=False,publicMutation=False,
        rationale='After reviewing all 55 registered300 XYZ sheets (165 planes) across the 672-candidate '
        'region, select only two superomedial lateral lumen-rim groups (left31, right44). '
        'All nine native100 sheets at three representative locations were also visually inspected. '
        'They support local cavity-margin additions outside the visible fornical/septal tissue and '
        'above the choroidal tissue margin. Do not include the other central/third-transition candidates. '
        'The groups are locators, not size-based acceptance. Existing tissue labels are preserved; '
        'the new points connect in six-neighbour space to the same existing side, without an X split.',
        limitation='AI-supported educational local repair, not expert ground truth. Native100 checks '
        'are sparse representative views (27 planes), not the full transformed finite cell volumes. '
        'Thin boundaries and registration/partial-volume errors remain possible. This does not segment '
        'the fornix or plexus and does not complete the lateral/third partition. Mesh/adoption pending.')
    out.mkdir();(out/'before.bin.gz').write_bytes(base);(out/'labels.bin.gz').write_bytes(data)
    payload=(json.dumps(r,indent=2)+'\n').encode();(out/'repair.json').write_bytes(payload)
    print(json.dumps(dict(stageSha256=digest(payload),afterSha256=r['afterSha256'],counts=r['countsAfter'])))


if __name__=='__main__':main()
