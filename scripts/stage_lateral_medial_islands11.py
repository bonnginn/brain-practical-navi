"""Reversible removal of two image-reviewed medial, non-luminal lateral labels."""
import gzip
import json
import numpy as np
from build_orthogonal_review_bundle import ROOT, DEFAULT_LABELS, MAGIC_LABELS, read_browser_volume
from stage_lateral_detached547 import digest
from review_lateral_z120_seeds import LABEL_SHA, selected_components

POINTS = {
    23: [(148,231,120), (149,231,120), (150,231,120), (150,232,120)],
    24: [(239,239,120), (239,240,119), (239,240,120), (240,239,120),
         (240,240,119), (240,240,120), (241,240,120)],
}
REVIEW_SHAS = {
    23: ['5c3e2ecfccbc194d83e8f46116fb8c475926c20648e56a0bfd3df4edefda7a8e',
         'd3e9da84c4261759488feabcac1f9df05c9027df35c18ec625806ba196056f2a',
         'b7a44040dbf9e6fee03f18f1c98abd2be6e02147e13ed085ee1166b9637ba589'],
    24: ['f756104b4b25be05e88514f56523abb57bf90e3a962f3d79361a4e94626cb9e0',
         '518df41dd01fb1a43c59630d9d40d777be6237f7e3ee5535b268a34acf321fcf',
         '91db570d1cf6d44c0fa6b0b3e647232baebc8e6e078d81b0e093efe67bf92a72'],
}


def replay(labels, entries, reverse=False):
    if labels.shape != (394,466,378) or len(entries) != 11:
        raise ValueError('Unexpected grid or count')
    expected = {(q, ident, 0) for ident, points in POINTS.items() for q in points}
    actual = []
    for p in entries:
        if (len(p['xyz']) != 3 or any(type(v) is not int for v in p['xyz'])
                or type(p['before']) is not int or type(p['after']) is not int):
            raise ValueError('Expected integer point and labels')
        actual.append((tuple(p['xyz']), p['before'], p['after']))
    if set(actual) != expected:
        raise ValueError('Reviewed point identity changed')
    result = labels.copy()
    for q, ident, _ in actual:
        if labels[q] != (0 if reverse else ident):
            raise ValueError('Conflicting label')
        result[q] = ident if reverse else 0
    return result


def main():
    out = ROOT/'work/anatomy-review/lateral-medial-islands11-stage-v1'
    if out.exists():
        raise ValueError('Preserve prior evidence')
    baseline = ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-lateral-medial-islands11.bin.gz'
    baseline = baseline if baseline.exists() else DEFAULT_LABELS
    _, _, before = read_browser_volume(baseline, MAGIC_LABELS, LABEL_SHA)
    components = selected_components(before)
    if any(set(map(tuple, components[k])) != set(POINTS[k]) for k in POINTS):
        raise ValueError('Component identity changed')
    evidence, planes = [], set()
    for ident in POINTS:
        for axis, sha in zip('xyz', REVIEW_SHAS[ident]):
            path = ROOT/f'work/anatomy-review/lateral-z120-id{ident}-full-september12-series-{axis}-v1/report.json'
            data = path.read_bytes(); r = json.loads(data)
            if (digest(data) != sha or r['labelsSha256'] != LABEL_SHA
                    or set(map(tuple, r['points'])) != set(POINTS[ident])):
                raise ValueError('Review identity changed')
            for f in r['figures']:
                if digest((path.parent/f['path']).read_bytes()) != f['sha256']:
                    raise ValueError('Reviewed figure changed')
                planes.update((axis, z) for z in f['indices'])
            evidence.append(dict(path=path.relative_to(ROOT).as_posix(), sha256=sha,
                                 visuallyInspectedFigures=r['figures']))
    entries = [dict(xyz=list(q), before=k, after=0) for k, points in POINTS.items() for q in points]
    after = replay(before, entries)
    if not np.array_equal(replay(after, entries, True), before):
        raise ValueError('Reverse differs')
    base = baseline.read_bytes()
    data = gzip.compress(gzip.decompress(base)[:10]+after.tobytes(order='F'), mtime=0)
    record = dict(beforeSha256=LABEL_SHA, afterSha256=digest(data),
        afterRawVoxelSha256=digest(after.tobytes(order='F')), points=entries, count=11,
        transition='mixed-ventricular-exclusions', evidence=evidence,
        visuallyInspectedUniquePlanes=len(planes),
        countsBefore={str(k):int((before==k).sum()) for k in (23,24)},
        countsAfter={str(k):int((after==k).sum()) for k in (23,24)},
        status='AI-image-reviewed-work-stage-only', adopted=False, expertReviewed=False, publicMutation=False,
        rationale='All 17 registered300 XYZ continuous-extent sheets (51 panels, 45 unique planes) were '
        'visually inspected. These tiny assignments lie on the medial external-space side of the '
        'hippocampal/choroidal tissue boundary, separated from the lateral ventricular lumen seen laterally. '
        'They seed a large false cavity flood at app Z120. Remove only the fixed four left and seven right '
        'assignments; neither identify a new cisternal subdivision nor add the surrounding void to a ventricle. '
        'The size, disconnection and intensity are locators, not the anatomical justification.',
        limitation='AI image-reviewed local educational correction, not expert review or ground truth. '
        'Registered/resampled 300um source; no new native100 review. The surrounding choroidal fissure '
        'boundary and other remaining islands are not certified. Mesh synchronization and product adoption pending.')
    if len(planes) != 45:
        raise ValueError('Unexpected image coverage')
    out.mkdir()
    (out/'before.bin.gz').write_bytes(base); (out/'labels.bin.gz').write_bytes(data)
    payload = (json.dumps(record, indent=2)+'\n').encode('utf-8')
    (out/'repair.json').write_bytes(payload)
    print(json.dumps(dict(recordSha256=digest(payload), afterSha256=record['afterSha256'],
                         countsAfter=record['countsAfter'])))


if __name__ == '__main__':
    main()
