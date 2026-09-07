"""Stage only the explicitly image-reviewed brainstem-to-cavity conflicts."""
import gzip
import json
import numpy as np
from stage_lateral_crop34 import ROOT, digest, DEFAULT_LABELS, MAGIC_LABELS, read_browser_volume

SOURCE_SHA = 'aa3b649e0d43cc1ccefb095d58d0bba98578657ce812256257694a200caff442'
LOCATOR_SHA = 'ab98de14eb4c72f2a0082d6ad81466c7dcecc7f84db68ac1033cb8db07b9e6ca'
REVIEWS = [
    ('fourth-brainstem-conflicts48-native300-v1', 'f68c111833868251fdb3f241c2a962e0e97b62a74ebddc267a6418df7f8a5ccc', 9),
    ('fourth-brainstem-conflicts48-series-z-v1', '25ca013b63488e7162147aac7b6cd71171875852270a0dacb550486dc99be887', 20),
]


def replay(labels, points, reverse=False):
    xyz = np.asarray(points)
    if (xyz.shape != (48, 3) or xyz.dtype.kind not in 'iu'
            or len(np.unique(xyz, axis=0)) != 48
            or np.any(xyz < 0) or np.any(xyz >= labels.shape)):
        raise ValueError('Expected 48 unique in-bounds integer points')
    old, new = (26, 27) if reverse else (27, 26)
    if np.any(labels[tuple(xyz.T)] != old):
        raise ValueError('Existing label conflict')
    after = labels.copy()
    after[tuple(xyz.T)] = new
    return after


def main():
    out = ROOT/'work/anatomy-review/fourth-brainstem48-stage-v1'
    if out.exists():
        raise ValueError('Preserve prior stage')
    locator = ROOT/'work/anatomy-review/fourth-anterior-depth-aa3b-v2.json'
    payload = locator.read_bytes()
    if digest(payload) != LOCATOR_SHA:
        raise ValueError('Locator changed')
    report = json.loads(payload)
    rows = report['strongSupportNonzeroStops']
    points = [r['xyz'] for r in rows]
    if report['sourceSha256'] != SOURCE_SHA or any(r['label'] != 27 or r['supportMinimum'] < 65000 for r in rows):
        raise ValueError('Source or support changed')
    evidence = [dict(path=locator.relative_to(ROOT).as_posix(), sha256=LOCATOR_SHA,
                     scope='Candidate locator only; brightness is not anatomical identity')]
    for folder, sha, count in REVIEWS:
        path = ROOT/f'work/anatomy-review/{folder}/report.json'
        payload = path.read_bytes(); review = json.loads(payload)
        if (digest(payload) != sha or review['labelsSha256'] != SOURCE_SHA
                or review['points'] != points or len(review['figures']) != count):
            raise ValueError('Image review changed')
        for figure in review['figures']:
            if digest((path.parent/figure['path']).read_bytes()) != figure['sha256']:
                raise ValueError('Image changed')
        evidence.append(dict(path=path.relative_to(ROOT).as_posix(), sha256=sha,
                             visuallyInspectedFigures=review['figures']))
    _, _, before = read_browser_volume(DEFAULT_LABELS, MAGIC_LABELS, SOURCE_SHA)
    after = replay(before, points)
    if np.count_nonzero(before != after) != 48 or not np.array_equal(replay(after, points, True), before):
        raise ValueError('Nonlocal change or failed restoration')
    compressed = DEFAULT_LABELS.read_bytes(); raw = gzip.decompress(compressed)
    staged = gzip.compress(raw[:10] + after.tobytes(order='F'), mtime=0)
    record = dict(beforeSha256=SOURCE_SHA, afterSha256=digest(staged),
        afterRawVoxelSha256=digest(after.tobytes(order='F')),
        points=[dict(xyz=p, before=27, after=26) for p in points], count=48,
        transition='27->26', evidence=evidence,
        countsBefore={str(k): int((before == k).sum()) for k in (26, 27)},
        countsAfter={str(k): int((after == k).sum()) for k in (26, 27)},
        status='AI-image-reviewed-work-stage-only', adopted=False,
        expertReviewed=False, publicMutation=False,
        rationale='All 60 consecutive registered300 axial planes Z106–165 and nine representative orthogonal image triplets were inspected. Red existing-ID27 cells lie on the cavity side of the brainstem-facing boundary, including lateral lower shoulders and the superior taper. Reclassify these explicit cells to ID26; do not erase brainstem wholesale or fill the cerebellar-facing open space.',
        limitation='Local image-supported educational correction, not expert review, native100 validation or complete fourth-ventricle segmentation. Additional unlabelled candidates and partial-volume boundaries remain. Brainstem and ventricular derived assets must both be assessed before adoption.')
    out.mkdir()
    (out/'before.bin.gz').write_bytes(compressed)
    (out/'labels.bin.gz').write_bytes(staged)
    (out/'repair.json').write_text(json.dumps(record, indent=2)+'\n', encoding='utf-8')
    print(json.dumps({k: v for k, v in record.items() if k not in ('points', 'evidence')}))
    print('recordSha256', digest((out/'repair.json').read_bytes()))


if __name__ == '__main__':
    main()
