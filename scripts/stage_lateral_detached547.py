"""Work-only reversible exclusion of a reviewed sulcal ID24 component."""
import gzip
import hashlib
import json
import numpy as np
from scipy import ndimage
from build_orthogonal_review_bundle import ROOT, DEFAULT_LABELS, MAGIC_LABELS, read_browser_volume
from review_lateral_detached547 import SHA, IMAGE_SHA


def digest(data):
    return hashlib.sha256(data).hexdigest()


def validate_review(report, axis, *, expected_sha=SHA, expected_count=547):
    if (report['labelsSha256'] != expected_sha or report['originalSha256'] != IMAGE_SHA
            or report['seriesAxis'] != axis or report['mutation'] or report['adopted']):
        raise ValueError('Review identity changed')
    points = np.asarray(report['points'])
    if points.shape != (expected_count, 3) or points.dtype.kind not in 'iu' or len(np.unique(points, axis=0)) != expected_count:
        raise ValueError('Invalid component points')
    d = 'xyz'.index(axis)
    # Independently use the registered source geometry, not display origin.
    origin = [-98., -134., -72.][d]
    start = [-98.0999984741211, -134.10000610351562, -72.0999984741211][d]
    step = .30000001192092896
    first = int(np.floor(((points[:, d].min()-.5)*.5+origin-start)/step))-1
    last = int(np.ceil(((points[:, d].max()+.5)*.5+origin-start)/step))+1
    actual = [i for f in report['figures'] for i in f['indices']]
    if (any(f['axis'] != axis or len(f['indices']) != 3 for f in report['figures'])
            or not actual or actual != list(range(actual[0], actual[-1]+1))
            or actual[0] != first or actual[-1] < last or actual[-1] > last+2):
        raise ValueError('Incomplete or duplicated finite-cell coverage')
    return points


def replay(labels, points, reverse=False, *, expected_count=547):
    if labels.shape != (394, 466, 378) or labels.dtype != np.uint8:
        raise ValueError('Unexpected label array')
    points = np.asarray(points)
    if points.shape != (expected_count, 3) or points.dtype.kind not in 'iu' or len(np.unique(points, axis=0)) != expected_count:
        raise ValueError('Invalid patch points')
    if np.any(points < 0) or np.any(points >= labels.shape):
        raise ValueError('Point outside volume')
    if np.any(labels[tuple(points.T)] != (0 if reverse else 24)):
        raise ValueError('Label conflict')
    result = labels.copy()
    result[tuple(points.T)] = 24 if reverse else 0
    return result


def main():
    out = ROOT/'work/anatomy-review/lateral-detached547-stage-v1'
    if out.exists():
        raise ValueError('Preserve existing evidence')
    evidence = []
    points = None
    for axis in 'xyz':
        path = ROOT/f'work/anatomy-review/lateral-detached547-series-{axis}-v1/report.json'
        data = path.read_bytes()
        report = json.loads(data)
        measured = validate_review(report, axis)
        if points is not None and not np.array_equal(points, measured):
            raise ValueError('Different component between axes')
        points = measured
        for f in report['figures']:
            if digest((path.parent/f['path']).read_bytes()) != f['sha256']:
                raise ValueError('Figure changed')
        evidence.append(dict(path=path.relative_to(ROOT).as_posix(), sha256=digest(data),
                             figures=len(report['figures']), planes=sum(len(f['indices']) for f in report['figures'])))
    _, _, before = read_browser_volume(DEFAULT_LABELS, MAGIC_LABELS, SHA)
    cc, _ = ndimage.label(before == 24, ndimage.generate_binary_structure(3, 3))
    ident = int(cc[242, 119, 153])
    if not ident or not np.array_equal(np.argwhere(cc == ident), points):
        raise ValueError('Not the exact full-volume component')
    after = replay(before, points)
    if not np.array_equal(replay(after, points, True), before):
        raise ValueError('Not reversible')
    compressed = DEFAULT_LABELS.read_bytes()
    raw = gzip.decompress(compressed)
    staged = gzip.compress(raw[:10]+after.tobytes(order='F'), mtime=0)
    report = dict(beforeSha256=SHA, afterSha256=digest(staged),
                  afterRawVoxelSha256=digest(after.tobytes(order='F')),
                  points=points.tolist(), transition='24->0', count=547,
                  rightLateralBefore=int(np.count_nonzero(before == 24)),
                  rightLateralAfter=int(np.count_nonzero(after == 24)),
                  evidence=evidence, status='AI-image-reviewed-work-stage-only',
                  adopted=False, expertReviewed=False, publicMutation=False,
                  rationale='All 39 series PNGs / 117 registered300 planes reviewed. Cortical-ribbon-lined sulcal gap, not a ventricular fringe to fill or connect. Whole500 XYZ locators support the location. Specific sulcus name unassigned.',
                  limitation='Zero means unlabelled, not absent tissue. Adjacent other ID24 fragments untouched. Mesh impact, adoption and browser verification pending.')
    out.mkdir()
    (out/'before.bin.gz').write_bytes(compressed)
    (out/'labels.bin.gz').write_bytes(staged)
    (out/'repair.json').write_text(json.dumps(report, indent=2)+'\n', encoding='utf-8')
    print(json.dumps({k: v for k, v in report.items() if k != 'points'}))


if __name__ == '__main__':
    main()
