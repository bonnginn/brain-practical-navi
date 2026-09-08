"""Reversible local lower-midbrain omission repair, not an upper boundary definition."""
import gzip
import json
import argparse
from pathlib import Path
import numpy as np
from build_orthogonal_review_bundle import ROOT, MAGIC_LABELS, read_browser_volume
from refine_midbrain_ventral_tissue import BASELINE, LABEL_SHA, EXPLORATION, EXPLORATION_SHA, connected_candidates
from stage_lateral_detached547 import digest

REVIEW='work/anatomy-review/midbrain-ventral-connected-v1/report.json'
REVIEW_SHA='ab83eea4385e33decaa7eb42cb15476bc2b5d091f51077bde9759bc54baf1bff'
COUNT=14803


def replay(labels, points, reverse=False):
    p=np.asarray(points)
    if (labels.ndim!=3 or p.shape!=(COUNT,3) or p.dtype.kind not in 'iu'
        or len(np.unique(p,axis=0))!=COUNT or np.any(p<0) or np.any(p>=labels.shape)
        or np.any(p<np.array([145,215,104])) or np.any(p>=np.array([248,251,116]))):
        raise ValueError('Unexpected lower-midbrain repair region')
    if np.any(labels[tuple(p.T)]!=(27 if reverse else 0)):raise ValueError('Conflicting labels')
    result=labels.copy();result[tuple(p.T)]=0 if reverse else 27
    return result


def main(output=None):
    out=Path(output) if output is not None else ROOT/'work/anatomy-review/midbrain-ventral14803-stage-v1'
    if out.exists():raise ValueError('Preserve evidence')
    evidence=[];reports=[]
    for name,expected in [(EXPLORATION,EXPLORATION_SHA),(REVIEW,REVIEW_SHA)]:
        path=ROOT/name;data=path.read_bytes();report=json.loads(data)
        if digest(data)!=expected:raise ValueError('Evidence changed')
        for f in report['figures']:
            if digest((path.parent/f['path']).read_bytes())!=f['sha256']:raise ValueError('Reviewed image changed')
        evidence.append(dict(path=name,sha256=expected,visuallyInspectedFigures=report['figures']))
        reports.append(report)
    exploration,review=reports
    _,_,before=read_browser_volume(BASELINE,MAGIC_LABELS,LABEL_SHA)
    original=np.asarray([p['xyz'] for p in exploration['points']]);keep=connected_candidates(before,original)
    points=np.asarray([p['xyz'] for p in review['points']])
    if (review['labelSha256']!=LABEL_SHA or not np.array_equal(points,original[keep])
        or int((~keep).sum())!=315 or review['rejectedCount']!=315):raise ValueError('Pruned candidate changed')
    if any(p['before']!=0 or p['after']!=27 or p['weightedSupportFraction']<.8
           or p['weightedOutsideCropFraction']!=0 for p in review['points']):raise ValueError('Source support differs')
    point_set=set(map(tuple,points))
    for prior in exploration['priorExclusionRecords']:
        blob=(ROOT/prior['path']).read_bytes()
        if digest(blob)!=prior['sha256']:raise ValueError('Prior exclusion changed')
        for p in json.loads(blob)['points']:
            if tuple(p['xyz'] if isinstance(p,dict) else p) in point_set:raise ValueError('Prior excluded cell reintroduced')
    after=replay(before,points)
    if not np.array_equal(replay(after,points,True),before):raise ValueError('Reverse mismatch')
    base=BASELINE.read_bytes();raw=gzip.decompress(base);data=gzip.compress(raw[:10]+after.tobytes(order='F'),mtime=0)
    record=dict(beforeSha256=LABEL_SHA,afterSha256=digest(data),afterRawVoxelSha256=digest(after.tobytes(order='F')),
        points=points.tolist(),count=COUNT,transition='0->27',evidence=evidence,
        rejectedCount=315,rejectedXYZ=original[~keep].tolist(),priorExclusionRecords=exploration['priorExclusionRecords'],
        countsBefore={str(k):int((before==k).sum()) for k in [0,27]},countsAfter={str(k):int((after==k).sum()) for k in [0,27]},
        status='AI-image-reviewed-work-stage-only',adopted=False,expertReviewed=False,publicMutation=False,
        rationale='The existing ID27 abruptly omits visible bilateral ventral lower-midbrain/peduncular tissue. '
        'Original registered300 images were inspected on all 13 exploration sheets (39 planes) and all 13 pruned sheets (38 planes). '
        'The pruned views include all 24 source horizontal planes and 9 sagittal/5 coronal targeted planes. '
        '315 disconnected candidates, including medial-temporal off-target clusters, are rejected. '
        'Retained cells follow visible tissue/space margins and are 6-connected to existing ID27; existing nuclei and nonzero labels are preserved.',
        limitation='AI-supported educational partial repair, not expert-reviewed ground truth. '
        'App ROI [145,215,104] to [248,251,116) is a work extent, not an anatomical superior boundary; higher ventral omissions remain. '
        'Connectivity and >=80 percent finite-cell tissue support are filters, not independent proof of anatomy. '
        'No subnuclear identity is assigned, no VentralDC union or extrusion of the user reference line is performed. '
        'BigBrain ID27 and its derived specimen masks are separate from the MNI surface scaffold, which is not replaced. '
        'Mesh synchronization and product adoption pending.')
    out.mkdir();(out/'before.bin.gz').write_bytes(base);(out/'labels.bin.gz').write_bytes(data)
    (out/'repair.json').write_text(json.dumps(record,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:record[k] for k in ['beforeSha256','afterSha256','afterRawVoxelSha256','count','countsAfter']}))
    print('recordSha256',digest((out/'repair.json').read_bytes()))


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output',type=Path,help='New evidence directory; existing directories are never overwritten')
    main(parser.parse_args().output)
