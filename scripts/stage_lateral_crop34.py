"""Reversible work-only 0-to-24 repair after contiguous and native image review."""
import gzip
import json
import argparse
import re
import numpy as np
from stage_lateral_detached547 import ROOT, DEFAULT_LABELS, MAGIC_LABELS, read_browser_volume, digest, validate_review, replay as reverse_exclusion
from compare_lateral_cavity_crop_extent import SHA


def replay(labels, points, reverse=False):
    return reverse_exclusion(labels,points,not reverse,expected_count=34)


def load_batch_stage(prefix, record_sha):
    """Resolve a pinned local batch for shared mesh preparation, not adoption."""
    if not isinstance(prefix,str) or not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*',prefix):
        raise ValueError('Invalid stage name')
    if not isinstance(record_sha,str) or not re.fullmatch(r'[a-f0-9]{64}',record_sha):
        raise ValueError('Explicit record SHA required')
    stage=ROOT/f'work/anatomy-review/{prefix}-stage-v1'
    data=(stage/'repair.json').read_bytes()
    if digest(data)!=record_sha:raise ValueError('Stage record changed')
    record=json.loads(data)
    for name,key in [('before.bin.gz','beforeSha256'),('labels.bin.gz','afterSha256')]:
        if digest((stage/name).read_bytes())!=record[key]:raise ValueError('Stage asset changed')
    return stage,record


def reviewed_points():
    work=ROOT/'work/anatomy-review'
    path=work/'lateral-cavity-crop-extent-v1.json'
    data=path.read_bytes()
    if digest(data)!='fe75335f8d18dbcdd5f5331c4a64dcb930d7f0f5b89d062456c86e1560fb838a':
        raise ValueError('Exploration changed')
    exploration=json.loads(data)
    rows=[r for r in exploration['results'] if r['margin']==16 and r['threshold']==65000]
    if len(rows)!=1:raise ValueError('Ambiguous exploration')
    points=np.array(rows[0]['candidateAppXYZ'])
    evidence=[dict(path=path.relative_to(ROOT).as_posix(),sha256=digest(data),scope='Threshold locator and finite support, not anatomical approval')]
    for axis in 'xyz':
        path=work/f'lateral-crop34-series-{axis}-v1/report.json'
        data=path.read_bytes();report=json.loads(data)
        if not np.array_equal(validate_review(report,axis,expected_sha=SHA,expected_count=34),points):
            raise ValueError('Candidate points changed')
        for f in report['figures']:
            if digest((path.parent/f['path']).read_bytes())!=f['sha256']:
                raise ValueError('Figure changed')
        evidence.append(dict(path=path.relative_to(ROOT).as_posix(),sha256=digest(data),figures=len(report['figures']),planes=sum(len(f['indices']) for f in report['figures'])))
    path=work/'lateral-crop34-native100-v1/report.json'
    data=path.read_bytes()
    if digest(data)!='2257ebd7b051cee6089ab02a3b940fa560e9ca0177c360c92ea86d168fa2ec20':
        raise ValueError('Native evidence changed')
    native=json.loads(data)
    if native['currentLabelSha256']!=SHA or [p['appXYZ'] for p in native['points']]!=[[232,249,107],[239,249,106],[254,253,91]]:
        raise ValueError('Native reference changed')
    for f in native['figures']:
        if digest((path.parent/f['path']).read_bytes())!=f['sha256']:
            raise ValueError('Native figure changed')
    evidence.append(dict(path=path.relative_to(ROOT).as_posix(),sha256=digest(data),scope='Three representative native100 points, not all candidate boundaries'))
    return points,evidence


def main():
    out=ROOT/'work/anatomy-review/lateral-crop34-stage-v1'
    if out.exists():raise ValueError('Preserve evidence')
    points,evidence=reviewed_points()
    _,_,before=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,SHA)
    after=replay(before,points)
    if np.count_nonzero(before!=after)!=34 or not np.array_equal(replay(after,points,True),before):
        raise ValueError('Wrong difference or reverse')
    compressed=DEFAULT_LABELS.read_bytes();raw=gzip.decompress(compressed)
    staged=gzip.compress(raw[:10]+after.tobytes(order='F'),mtime=0)
    report=dict(beforeSha256=SHA,afterSha256=digest(staged),afterRawVoxelSha256=digest(after.tobytes(order='F')),
                points=points.tolist(),count=34,transition='0->24',evidence=evidence,
                rightLateralBefore=int(np.count_nonzero(before==24)),rightLateralAfter=int(np.count_nonzero(after==24)),
                status='AI-image-reviewed-work-stage-only',adopted=False,expertReviewed=False,publicMutation=False,
                rationale='Reviewed all 132 registered300 planes across the 34 candidate-cell extents plus 27 native100 planes at three representative points. Candidates remain in the ventricular lumen above or lateral to the hippocampus, not in choroid-plexus-like tissue. This supports local filling, not adopting the whole threshold region.',
                limitation='Not complete ventricular segmentation or expert review. Crop-edge and partial-support omissions remain unresolved. Mesh impact and adoption pending.')
    out.mkdir()
    (out/'before.bin.gz').write_bytes(compressed)
    (out/'labels.bin.gz').write_bytes(staged)
    (out/'repair.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:v for k,v in report.items() if k not in ['points','evidence']}))


def stage_left_lower():
    """Batch one reviewed region; reuse evidence and store one reversible patch."""
    work = ROOT/'work/anatomy-review'
    source = work/'left-lower-cavity-exploration-v1/report.json'
    data = source.read_bytes()
    if digest(data) != 'a4f2263620c91113d93a4caeaf596bb67588db91e965f3ace2d22781ab4e7715':
        raise ValueError('Exploration changed')
    exploration = json.loads(data)
    points = np.asarray(exploration['candidateAppXYZ'])
    source_sha = exploration['labelSha256']
    if (points.shape != (233,3) or points.dtype.kind not in 'iu'
            or len(np.unique(points,axis=0)) != 233):
        raise ValueError('Invalid batch')
    evidence = [dict(path=source.relative_to(ROOT).as_posix(),sha256=digest(data),scope='Locator; 9 representative images inspected')]
    inspected = {'x':[0,1,8,17,18], 'y':list(range(20)), 'z':[0,1,11,22,23]}
    for axis, numbers in inspected.items():
        path = work/f'left-lower-cavity-series-{axis}-v1/report.json'
        data = path.read_bytes(); report = json.loads(data)
        if (report.get('labelId') != 23 or not np.array_equal(
                validate_review(report,axis,expected_sha=source_sha,expected_count=233),points)):
            raise ValueError('Candidate identity changed')
        seen = [report['figures'][n] for n in numbers]
        for f in seen:
            if digest((path.parent/f['path']).read_bytes()) != f['sha256']:
                raise ValueError('Reviewed figure changed')
        evidence.append(dict(path=path.relative_to(ROOT).as_posix(),sha256=digest(data),
            visuallyInspectedFigures=seen,scope='All Y candidate extent; selected orthogonal endpoints and mid-region, not all generated X/Z images'))
    save_left_region(points,source_sha,evidence,'left-lower-cavity',
        'One regional omission repair: all Y375–434 candidate planes (60) and 30 selected orthogonal planes reviewed against registered300 raw images, supplementing prior full XYZ review of the existing 677-point component. Added cells follow the ventricular cavity around the hippocampus, including its inferior tip; no other labels are overwritten.',
        'Not expert review or complete ventricular segmentation. X/Z are targeted checks, not exhaustive new-candidate review. Crop-edge and partial-volume omissions remain. No native100 review for this batch. Mesh synchronization and product adoption pending.')


def save_left_region(points,source_sha,evidence,prefix,rationale,limitation,*,label_id=23):
    if type(label_id) is not int or label_id not in (23,24):raise ValueError('Invalid lateral label')
    return save_ventricular_region(points,source_sha,evidence,prefix,rationale,limitation,label_id=label_id)


def save_ventricular_region(points,source_sha,evidence,prefix,rationale,limitation,*,label_id):
    if type(label_id) is not int or label_id not in (23,24,26):raise ValueError('Invalid ventricular label')
    if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*',prefix):raise ValueError('Invalid stage name')
    points=np.asarray(points);count=len(points)
    if count==0 or points.shape!=(count,3) or points.dtype.kind not in 'iu' or len(np.unique(points,axis=0))!=count:
        raise ValueError('Invalid points')
    out = ROOT/f'work/anatomy-review/{prefix}-stage-v1'
    if out.exists():raise ValueError('Preserve prior stage')
    _,_,before = read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,source_sha)
    if np.any(points<0) or np.any(points>=before.shape) or np.any(before[tuple(points.T)]!=0):
        raise ValueError('Out of bounds or conflicting labels')
    after = before.copy();after[tuple(points.T)] = label_id
    reverse = after.copy();reverse[tuple(points.T)] = 0
    if np.count_nonzero(before!=after)!=count or not np.array_equal(reverse,before):
        raise ValueError('Nonlocal edit or failed restoration')
    compressed = DEFAULT_LABELS.read_bytes();raw = gzip.decompress(compressed)
    staged = gzip.compress(raw[:10]+after.tobytes(order='F'),mtime=0)
    report = dict(beforeSha256=source_sha,afterSha256=digest(staged),
        afterRawVoxelSha256=digest(after.tobytes(order='F')),points=points.tolist(),count=count,
        transition=f'0->{label_id}',
        evidence=evidence,status='AI-image-reviewed-work-stage-only',adopted=False,expertReviewed=False,publicMutation=False,
        rationale=rationale,limitation=limitation)
    name={23:'leftLateral',24:'rightLateral',26:'fourthVentricle'}[label_id]
    report[f'{name}Before']=int((before==label_id).sum())
    report[f'{name}After']=int((after==label_id).sum())
    out.mkdir()
    (out/'before.bin.gz').write_bytes(compressed)
    (out/'labels.bin.gz').write_bytes(staged)
    (out/'repair.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:v for k,v in report.items() if k not in ('points','evidence')}))


def stage_left_reviewed(source_relative, source_digest, points_key, prefix, reviews, rationale, limitation,*,label_id=23):
    """Reuse the left-region stage writer with explicitly pinned, inspected evidence."""
    source=ROOT/source_relative;data=source.read_bytes()
    if digest(data)!=source_digest:raise ValueError('Exploration changed')
    exploration=json.loads(data);points=np.asarray(exploration[points_key]);source_sha=exploration['labelSha256']
    evidence=[dict(path=source_relative,sha256=source_digest,scope='Candidate locator, not sole anatomical evidence')]
    for relative,expected,numbers in reviews:
        path=ROOT/relative;data=path.read_bytes();report=json.loads(data)
        if (digest(data)!=expected or report.get('labelId',24)!=label_id or report['labelsSha256']!=source_sha
                or not np.array_equal(report['points'],points)):
            raise ValueError('Reviewed batch changed')
        if report['seriesAxis']:
            validate_review(report,report['seriesAxis'],expected_sha=source_sha,expected_count=len(points))
        seen=[report['figures'][n] for n in numbers]
        for f in seen:
            if digest((path.parent/f['path']).read_bytes())!=f['sha256']:raise ValueError('Reviewed image changed')
        evidence.append(dict(path=relative,sha256=expected,visuallyInspectedFigures=seen,
            scope='Only the listed figures were visually inspected; generation alone is not review'))
    save_left_region(points,source_sha,evidence,prefix,rationale,limitation,label_id=label_id)


def stage_reviewed_exclusions(candidate_relative, candidate_sha, prefix):
    """Stage a pinned mixed ventricular exclusion batch without product writes."""
    import re
    if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*',prefix):raise ValueError('Invalid prefix')
    data=(ROOT/candidate_relative).read_bytes()
    if digest(data)!=candidate_sha:raise ValueError('Candidate changed')
    candidate=json.loads(data)
    if candidate['adopted'] or candidate['expertReviewed'] or candidate['published']:raise ValueError('Unexpected review status')
    points=candidate['points'];count=candidate['count'];source_sha=candidate['sourceSha256']
    xyz=np.asarray([p['xyz'] for p in points])
    if xyz.shape!=(count,3) or xyz.dtype.kind not in 'iu' or len(np.unique(xyz,axis=0))!=count:raise ValueError('Invalid points')
    _,_,before=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,source_sha)
    if np.any(xyz<0) or np.any(xyz>=before.shape):raise ValueError('Bounds')
    after=before.copy()
    for p in points:
        if type(p['before']) is not int or p['before'] not in (23,24,25,26,41) or type(p['after']) is not int or p['after']!=0:raise ValueError('Not a ventricular exclusion')
        if int(after[tuple(p['xyz'])])!=p['before']:raise ValueError('Label conflict')
        after[tuple(p['xyz'])]=0
    evidence=[dict(path=candidate_relative,sha256=candidate_sha)]
    for item in candidate['evidence']:
        path=ROOT/item['report'];report_bytes=path.read_bytes();report=json.loads(report_bytes)
        if digest(report_bytes)!=item['sha256'] or report.get('labelsSha256',report.get('labelSha256'))!=source_sha:raise ValueError('Evidence changed')
        for figure in item['reviewedFigures']:
            if digest((path.parent/figure['path']).read_bytes())!=figure['sha256']:raise ValueError('Figure changed')
        evidence.append(dict(path=item['report'],sha256=item['sha256'],visuallyInspectedFigures=item['reviewedFigures']))
    restored=after.copy()
    for p in points:restored[tuple(p['xyz'])]=p['before']
    if int(np.count_nonzero(after!=before))!=count or not np.array_equal(restored,before):raise ValueError('Replay mismatch')
    compressed=DEFAULT_LABELS.read_bytes();raw=gzip.decompress(compressed)
    staged=gzip.compress(raw[:10]+after.tobytes(order='F'),mtime=0)
    report=dict(beforeSha256=source_sha,afterSha256=digest(staged),afterRawVoxelSha256=digest(after.tobytes(order='F')),
        points=points,count=count,transition='mixed-ventricular-exclusions',evidence=evidence,
        status='AI-image-reviewed-work-stage-only',adopted=False,expertReviewed=False,publicMutation=False,
        rationale=candidate['rationale'],limitation=candidate['limitations'])
    out=ROOT/f'work/anatomy-review/{prefix}-stage-v1'
    out.mkdir()
    (out/'before.bin.gz').write_bytes(compressed)
    (out/'labels.bin.gz').write_bytes(staged)
    (out/'repair.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:v for k,v in report.items() if k not in ('points','evidence')}))


def stage_left_majority():
    work=ROOT/'work/anatomy-review'
    source=work/'left-lower-cavity-weighted-extension-v1.json';data=source.read_bytes()
    if digest(data)!='02c4d5d301aa87f593b467fcdabf39edad2aed7c123e599212a6f7f9f9942355':raise ValueError('Exploration changed')
    exploration=json.loads(data);source_sha=exploration['labelSha256']
    selected=[r for r in exploration['results'] if r['margin']==16 and r['threshold']==65000]
    if len(selected)!=1:raise ValueError('Ambiguous extraction')
    points=np.asarray(selected[0]['majorityCandidateAppXYZ'])
    if points.shape!=(1108,3):raise ValueError('Batch changed')
    evidence=[dict(path=source.relative_to(ROOT).as_posix(),sha256=digest(data),scope='Geometric majority overlap locator; not standalone anatomical proof')]
    for folder,expected in [('left-lower-majority-native300-v1','9df01c0cd77cc095e5e2a66b3576eaf83fb1dbff55f343fb5102b8f3dd25e204'),('left-lower-majority-series-y-v1','719b0cb65555fa95376d207d0234fcedd4aa9a6b7f97c86a5be93d7a37ef32a0')]:
        path=work/folder/'report.json';data=path.read_bytes();report=json.loads(data)
        if digest(data)!=expected or report.get('labelId')!=23 or report['labelsSha256']!=source_sha or not np.array_equal(report['points'],points):raise ValueError('Reviewed batch changed')
        if report['seriesAxis']=='y':validate_review(report,'y',expected_sha=source_sha,expected_count=1108)
        for f in report['figures']:
            if digest((path.parent/f['path']).read_bytes())!=f['sha256']:raise ValueError('Reviewed image changed')
        evidence.append(dict(path=path.relative_to(ROOT).as_posix(),sha256=digest(data),visuallyInspectedFigures=report['figures'],scope='All listed images inspected: 78 contiguous Y planes and 27 representative orthogonal planes in total'))
    save_left_region(points,source_sha,evidence,'left-lower-majority',
        'Regional partial-volume omission repair after contiguous Y358–435 and representative XYZ source-image review. Candidate cells track the bright cavity around the hippocampus, avoiding the choroid-plexus tissue itself. Geometric overlap at least 50 percent is a candidate-generation rule, not sole anatomical evidence. Existing nonzero labels are preserved.',
        'Not expert review or complete ventricular segmentation. Representative X/Z checks, not exhaustive X/Z coverage; no additional native100 review. The anterior crop continuation remains unresolved. Mesh synchronization and product adoption pending.')


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--left-lower',action='store_true')
    parser.add_argument('--left-majority',action='store_true')
    args=parser.parse_args()
    if args.left_lower and args.left_majority:raise ValueError('Choose one batch')
    stage_left_majority() if args.left_majority else stage_left_lower() if args.left_lower else main()
