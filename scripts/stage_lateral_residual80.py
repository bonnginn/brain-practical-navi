"""Reversible work-only exclusion of the reviewed cisternal-side ID24 fragment."""
import gzip
import json
import numpy as np
from scipy import ndimage
from stage_lateral_detached547 import ROOT, DEFAULT_LABELS, MAGIC_LABELS, read_browser_volume, digest, validate_review, replay as replay_component

SHA = '7d2b88c3e966b9633571e1d5cfe4d86a99439e2ea7873c672217abd4c235a1f2'


def replay(labels, points, reverse=False):
    return replay_component(labels, points, reverse, expected_count=80)


def reviewed_points():
    work = ROOT/'work/anatomy-review'
    evidence = []
    points = None
    for axis in 'xyz':
        path = work/f'lateral-residual80-series-{axis}-v1/report.json'
        data = path.read_bytes()
        report = json.loads(data)
        measured = validate_review(report, axis, expected_sha=SHA, expected_count=80)
        if points is not None and not np.array_equal(measured, points):
            raise ValueError('Component differs between axes')
        points = measured
        for f in report['figures']:
            if digest((path.parent/f['path']).read_bytes()) != f['sha256']:
                raise ValueError('Figure changed')
        evidence.append(dict(path=path.relative_to(ROOT).as_posix(), sha256=digest(data),
                             figures=len(report['figures']), planes=sum(len(f['indices']) for f in report['figures'])))
    path = work/'lateral-residual80-116-native100-v1/report.json'
    data = path.read_bytes()
    if digest(data) != 'b1d7607b4624c041d4633c43db890519310f4942133899ff1bde094eb0b2e8bd':
        raise ValueError('Native100 evidence changed')
    native = json.loads(data)
    if native['currentLabelSha256'] != SHA or [p['appXYZ'] for p in native['points']] != [[235,235,117],[248,248,109]]:
        raise ValueError('Native100 identity')
    for f in native['figures']:
        if digest((path.parent/f['path']).read_bytes()) != f['sha256']:
            raise ValueError('Native100 figure changed')
    evidence.append(dict(path=path.relative_to(ROOT).as_posix(), sha256=digest(data),
                         scope='Two representative points, not full-component native100 coverage'))
    return points, evidence


def main():
    out = ROOT/'work/anatomy-review/lateral-residual80-stage-v1'
    if out.exists():
        raise ValueError('Preserve evidence')
    points, evidence = reviewed_points()
    _, _, before = read_browser_volume(DEFAULT_LABELS, MAGIC_LABELS, SHA)
    cc, _ = ndimage.label(before == 24, ndimage.generate_binary_structure(3, 3))
    ident = int(cc[232,233,112])
    if not ident or not np.array_equal(np.argwhere(cc == ident), points):
        raise ValueError('Wrong full-volume component')
    after = replay(before, points)
    if not np.array_equal(replay(after, points, True), before):
        raise ValueError('Not reversible')
    compressed = DEFAULT_LABELS.read_bytes()
    raw = gzip.decompress(compressed)
    staged = gzip.compress(raw[:10]+after.tobytes(order='F'), mtime=0)
    report = dict(beforeSha256=SHA, afterSha256=digest(staged), afterRawVoxelSha256=digest(after.tobytes(order='F')),
                  points=points.tolist(), transition='24->0', count=80, evidence=evidence,
                  rightLateralBefore=int(np.count_nonzero(before == 24)), rightLateralAfter=int(np.count_nonzero(after == 24)),
                  status='AI-image-reviewed-work-stage-only', adopted=False, expertReviewed=False, publicMutation=False,
                  rationale='Registered300 all-axis 22 PNG / 66 planes plus native100 representative context support exclusion of a cisternal-side gap from the lateral ventricle. Specific cistern unassigned.',
                  limitation='Zero means unlabelled. Nearby 116-point component untouched; not complete ventricular segmentation. Mesh impact and adoption pending.',
                  references=['https://pubmed.ncbi.nlm.nih.gov/3394010/'])
    out.mkdir()
    (out/'before.bin.gz').write_bytes(compressed)
    (out/'labels.bin.gz').write_bytes(staged)
    (out/'repair.json').write_text(json.dumps(report, indent=2)+'\n', encoding='utf-8')
    print(json.dumps({k:v for k,v in report.items() if k not in ['points','evidence']}))


if __name__ == '__main__':
    main()
