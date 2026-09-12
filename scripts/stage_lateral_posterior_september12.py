"""Reversible, image-reviewed posterior lateral cavity margin batch; stage only."""
import gzip
import json
import numpy as np
from scipy import ndimage

from build_orthogonal_review_bundle import ROOT, DEFAULT_LABELS, MAGIC_LABELS, read_browser_volume
from stage_lateral_detached547 import digest

LABEL_SHA = '84f91400e7f6b9d059707772b01889f74112d62e853bcebfffddaf589b423ba3'
HELD = [132, 146, 147]
INDEX_SHA = '7dda60df84fc1a30ff5952fbbf51e53a6d34ac5140331a5fbc7f9457e6f5367f'
PAIRS_SHA = '4211fe88228d027131e5a70a56816c8d3a6c46aeea17b7b725c1ef5343b8af1f'
REVIEWS = [
    ('lateral-middle-native300-september12-v1', '60e2845777b438bf11455f156c31078f217825aba7ebbac19354428accd0ea89', 'all'),
    ('lateral-posterior-native300-september12-v1', '5c9fd2f4f378cd3ae1d59dc5b00b41948b9926d8f6e8e1ff467c0b2cf4fe3fae', 'xy'),
]


def replay(labels, entries, reverse=False):
    points = np.asarray([p['xyz'] for p in entries])
    destination = np.asarray([p['after'] for p in entries])
    if (labels.shape != (394, 466, 378) or points.shape != (196, 3)
            or points.dtype.kind not in 'iu' or np.any(points < 0) or np.any(points >= labels.shape)
            or len(np.unique(points, axis=0)) != 196 or any(p['xyz'] == HELD for p in entries)
            or any(type(p['before']) is not int or p['before'] != 0
                   or type(p['after']) is not int or p['after'] not in (23, 24) for p in entries)
            or np.any(points[:, 1] >= 230) or np.any(points[:, 2] < 136) or np.any(points[:, 2] > 173)
            or int((destination == 23).sum()) != 182 or int((destination == 24).sum()) != 14):
        raise ValueError('Unexpected posterior batch')
    indices = np.sort(np.ravel_multi_index(points.T, labels.shape, order='F')).astype('<u4')
    if digest(indices.tobytes()) != INDEX_SHA:
        raise ValueError('Candidate identity changed')
    linear = np.ravel_multi_index(points.T, labels.shape, order='F')
    pairs = np.column_stack((linear, destination))[np.argsort(linear)].astype('<u4')
    if digest(pairs.tobytes()) != PAIRS_SHA:
        raise ValueError('Candidate side identity changed')
    if np.any(labels[tuple(points.T)] != (destination if reverse else 0)):
        raise ValueError('Conflicting label')
    result = labels.copy()
    result[tuple(points.T)] = 0 if reverse else destination
    return result


def main():
    work = ROOT / 'work/anatomy-review'
    out = work / 'lateral-posterior196-stage-v1'
    if out.exists():
        raise ValueError('Preserve prior evidence')
    baseline = ROOT / 'tests/fixtures/bigbrain-practical-segmentation-pre-lateral-posterior196.bin.gz'
    baseline = baseline if baseline.exists() else DEFAULT_LABELS
    _, _, before = read_browser_volume(baseline, MAGIC_LABELS, LABEL_SHA)
    evidence = []
    reports = []
    unique_planes = set()
    for folder, sha, scope in REVIEWS:
        path = work / folder / 'report.json'
        payload = path.read_bytes()
        r = json.loads(payload)
        if digest(payload) != sha or r['labelSha256'] != LABEL_SHA:
            raise ValueError('Review identity changed')
        figures = [f for f in r['figures'] if scope == 'all' or f['axis'] in scope]
        for figure in figures:
            if digest((path.parent / figure['path']).read_bytes()) != figure['sha256']:
                raise ValueError('Reviewed image changed')
            unique_planes.update((figure['axis'], index) for index in figure['indices'])
        evidence.append(dict(path=path.relative_to(ROOT).as_posix(), sha256=sha,
                             visuallyInspectedFigures=figures))
        reports.append(r)
    entries = [dict(xyz=p['xyz'], before=0, after=p['after']) for p in reports[1]['points'] if p['xyz'] != HELD]
    broad = {(tuple(p['xyz']), p['after']) for p in reports[0]['points'] if p['xyz'][1] < 230 and p['xyz'] != HELD}
    if {(tuple(p['xyz']), p['after']) for p in entries} != broad:
        raise ValueError('Regional candidate differs')
    after = replay(before, entries)
    continuity = {}
    for ident in (23, 24):
        reached = ndimage.binary_propagation(before == ident, mask=after == ident,
                                            structure=ndimage.generate_binary_structure(3, 1))
        detached = np.argwhere((after == ident) & ~reached)
        if len(detached):
            raise ValueError(f'New detached candidate: ID{ident}, {detached.tolist()}')
        continuity[str(ident)] = dict(newDetachedVoxels=0, added=sum(p['after'] == ident for p in entries))
    if not np.array_equal(replay(after, entries, True), before) or np.count_nonzero(after != before) != 196:
        raise ValueError('Nonlocal change or reverse mismatch')
    base = baseline.read_bytes()
    data = gzip.compress(gzip.decompress(base)[:10] + after.tobytes(order='F'), mtime=0)
    indices = np.sort(np.ravel_multi_index(np.asarray([p['xyz'] for p in entries]).T, before.shape, order='F')).astype('<u4')
    record = dict(beforeSha256=LABEL_SHA, afterSha256=digest(data),
        afterRawVoxelSha256=digest(after.tobytes(order='F')), indicesSha256=digest(indices.tobytes()),
        points=entries, count=len(entries), transition='mixed-lateral-cavity-fill', evidence=evidence,
        visuallyInspectedUniquePlanes=len(unique_planes), continuity=continuity, heldDisconnectedXYZ=[HELD],
        countsBefore={str(k): int((before == k).sum()) for k in (0, 23, 24)},
        countsAfter={str(k): int((after == k).sum()) for k in (0, 23, 24)},
        status='AI-image-reviewed-work-stage-only', adopted=False, expertReviewed=False, publicMutation=False,
        rationale='Regional raw-image review of lateral ventricular posterior cavity margins at app Z136–173. '
        'The complete middle-level series (19 sheets: 38 horizontal and 9 per orthogonal axis) and six '
        'posterior-focused orthogonal sheets were visually inspected. Selected local gaps follow the existing '
        'posterior lumen perimeter without replacing the intervening tissue or the visible plexus-like structures. '
        'Encoded >=240 and registered300 finite-cell void support >=0.5 only locate candidates. '
        'One candidate at [132,146,147] loses connection after finite-support filtering and is held unchanged. '
        'Every adopted point connects to the existing same-side mask; side is inherited from seeds, not split at X. '
        'The separate 672 middle-region points near anterior/third-ventricle transitions and the lower-Z120 '
        'external-space leak are not part of this repair.',
        limitation='AI-supported local educational repair, not expert review or complete ventricular segmentation. '
        'Registered300 image is transformed/resampled; no new native100 review. Targeted orthogonal planes '
        'are not exhaustive native-plane coverage. Work Y<230 separates the posterior review ROI and does not '
        'define an anatomical endpoint. Partial-volume margins remain unresolved. '
        'Mesh synchronization and product adoption pending.')
    out.mkdir()
    (out / 'before.bin.gz').write_bytes(base)
    (out / 'labels.bin.gz').write_bytes(data)
    payload = (json.dumps(record, indent=2) + '\n').encode('utf-8')
    (out / 'repair.json').write_bytes(payload)
    print(json.dumps({k: v for k, v in record.items() if k not in ('points', 'evidence', 'rationale', 'limitation')}))
    print('recordSha256', digest(payload))


if __name__ == '__main__':
    main()
