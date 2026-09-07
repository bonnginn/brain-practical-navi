"""Reversible work-only 0-to-24 repair after contiguous and native image review."""
import gzip
import json
import numpy as np
from stage_lateral_detached547 import ROOT, DEFAULT_LABELS, MAGIC_LABELS, read_browser_volume, digest, validate_review, replay as reverse_exclusion
from explore_lateral_residual116_cavity import SHA


def replay(labels, points, reverse=False):
    return reverse_exclusion(labels,points,not reverse,expected_count=21)


def reviewed_points():
    work=ROOT/'work/anatomy-review'
    path=work/'lateral-residual116-cavity-exploration-v1/report.json'
    data=path.read_bytes()
    if digest(data)!='ac225411191fd9f912741ae5e5f10c7647746f63e061883bc2e12a60e3a351b7':
        raise ValueError('Exploration changed')
    exploration=json.loads(data)
    points=np.array(exploration['candidateAppXYZ'])
    evidence=[dict(path=path.relative_to(ROOT).as_posix(),sha256=digest(data),scope='Threshold locator and finite support, not anatomical approval')]
    for axis in 'xyz':
        path=work/f'lateral-cavity21-series-{axis}-v1/report.json'
        data=path.read_bytes();report=json.loads(data)
        if not np.array_equal(validate_review(report,axis,expected_sha=SHA,expected_count=21),points):
            raise ValueError('Candidate points changed')
        for f in report['figures']:
            if digest((path.parent/f['path']).read_bytes())!=f['sha256']:
                raise ValueError('Figure changed')
        evidence.append(dict(path=path.relative_to(ROOT).as_posix(),sha256=digest(data),figures=len(report['figures']),planes=sum(len(f['indices']) for f in report['figures'])))
    path=work/'lateral-cavity21-native100-v1/report.json'
    data=path.read_bytes()
    if digest(data)!='0d81641710159981597fc001b1e9ce86779b9861ff073697d159f0238250a897':
        raise ValueError('Native evidence changed')
    native=json.loads(data)
    if native['currentLabelSha256']!=SHA or [p['appXYZ'] for p in native['points']]!=[[240,249,105],[253,242,113]]:
        raise ValueError('Native reference changed')
    for f in native['figures']:
        if digest((path.parent/f['path']).read_bytes())!=f['sha256']:
            raise ValueError('Native figure changed')
    evidence.append(dict(path=path.relative_to(ROOT).as_posix(),sha256=digest(data),scope='Two representative native100 points, not all candidate boundaries'))
    return points,evidence


def main():
    out=ROOT/'work/anatomy-review/lateral-cavity21-stage-v1'
    if out.exists():raise ValueError('Preserve evidence')
    points,evidence=reviewed_points()
    _,_,before=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,SHA)
    after=replay(before,points)
    if np.count_nonzero(before!=after)!=21 or not np.array_equal(replay(after,points,True),before):
        raise ValueError('Wrong difference or reverse')
    compressed=DEFAULT_LABELS.read_bytes();raw=gzip.decompress(compressed)
    staged=gzip.compress(raw[:10]+after.tobytes(order='F'),mtime=0)
    report=dict(beforeSha256=SHA,afterSha256=digest(staged),afterRawVoxelSha256=digest(after.tobytes(order='F')),
                points=points.tolist(),count=21,transition='0->24',evidence=evidence,
                rightLateralBefore=int(np.count_nonzero(before==24)),rightLateralAfter=int(np.count_nonzero(after==24)),
                status='AI-image-reviewed-work-stage-only',adopted=False,expertReviewed=False,publicMutation=False,
                rationale='Reviewed 78 registered300 planes of the 21 candidate cells and 18 native100 planes at two representative points support filling local ventricular omissions adjacent to the retained 116-point component.',
                limitation='Not complete ventricular segmentation or expert review. Crop-edge and partial-support omissions remain unresolved. Mesh impact and adoption pending.')
    out.mkdir()
    (out/'before.bin.gz').write_bytes(compressed)
    (out/'labels.bin.gz').write_bytes(staged)
    (out/'repair.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:v for k,v in report.items() if k not in ['points','evidence']}))


if __name__=='__main__':main()
