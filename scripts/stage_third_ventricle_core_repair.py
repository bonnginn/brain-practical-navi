"""Stage the image-reviewed central cavity repair; never install or publish it."""
import hashlib
import json
import numpy as np
from build_orthogonal_review_bundle import ROOT, DEFAULT_LABELS, MAGIC_LABELS, read_browser_volume
from adopt_registered_red_nuclei import encode

BASE_SHA = '777b76921f99e22232dfedd58a165c17544a200101d9a403adc9f16d054d89ea'
BASE_RAW = 'd5c4f53642998009b73841a13568045f1f52c449547c71d6ffbed015a7313fa4'
CANDIDATE_SHA = 'cf3ccf9f1415bf798fe659f353c0b646f42ce022db73a413606ff49f17a6f1fd'
WORK = ROOT / 'work/anatomy-review'
digest = lambda data: hashlib.sha256(data).hexdigest()


def replay(volume, points, reverse=False):
    result = volume.copy()
    seen = set()
    for point in points:
        xyz = point['xyz']
        if len(xyz) != 3 or any(type(v) is not int for v in xyz):
            raise ValueError('Invalid coordinate')
        key = tuple(xyz)
        if key in seen or any(v < 0 or v >= n for v, n in zip(key, result.shape)):
            raise ValueError('Duplicate or out-of-range point')
        seen.add(key)
        if point['before'] != 0 or point['after'] != 25:
            raise ValueError('Only background to third ventricle is allowed')
        before, after = (25, 0) if reverse else (0, 25)
        if result[key] != before:
            raise ValueError('Source voxel differs')
        result[key] = after
    return result


def checked_report(folder, expected_sha, count):
    path = WORK / folder / 'report.json'
    if digest(path.read_bytes()) != expected_sha:
        raise ValueError('Evidence report changed')
    report = json.loads(path.read_text(encoding='utf-8'))
    if len(report['figures']) != count:
        raise ValueError('Evidence cardinality differs')
    for figure in report['figures']:
        if digest((path.parent / figure['path']).read_bytes()) != figure['sha256']:
            raise ValueError('Evidence figure changed')
    return dict(path=path.relative_to(ROOT).as_posix(), sha256=expected_sha, report=report)


def main():
    out = WORK / 'third-ventricle-core-stage-v1'
    if out.exists():
        raise ValueError('Stage exists; preserve evidence')
    source = WORK / 'third-ventricle-central-core-candidate-v1/candidate.json'
    if digest(source.read_bytes()) != CANDIDATE_SHA:
        raise ValueError('Candidate changed')
    candidate = json.loads(source.read_text(encoding='utf-8'))
    if candidate['inputCompressedSha256'] != BASE_SHA:
        raise ValueError('Candidate baseline differs')
    _, _, old = read_browser_volume(DEFAULT_LABELS, MAGIC_LABELS, BASE_SHA)
    if digest(old.tobytes(order='F')) != BASE_RAW:
        raise ValueError('Raw baseline differs')
    points = [{k: r[k] for k in ('xyz', 'before', 'after')} for r in candidate['records'] if r['selected']]
    if len(points) != 1587:
        raise ValueError('Unexpected count')
    evidence = [
        checked_report('third-ventricle-central-core-difference-v1', '28674c8783f73df1b9ede7f596d3377c494f6c240bcdb9a51d1c5a0a99aa27aa', 29),
        checked_report('third-ventricle-core-edge-overlay-v1', '9f80e7eedc28bac4e5c93bc85a43eadd1dd2321d538a5b84681919aabb495ef3', 4),
    ]
    new = replay(old, points)
    if not np.array_equal(replay(new, points, reverse=True), old) or np.count_nonzero(new != old) != 1587:
        raise ValueError('Reversibility differs')
    data = encode(new)
    record = dict(inputCompressedSha256=BASE_SHA, inputRawSha256=BASE_RAW,
        outputCompressedSha256=digest(data), outputRawSha256=digest(new.tobytes(order='F')),
        points=points, changedVoxelCount=1587, transitions={'0->25': 1587},
        candidateSha256=CANDIDATE_SHA, reviewEvidence=evidence,
        imageReviewed=True, expertReviewed=False, installed=False, published=False,
        status='AI-image-reviewed-development-repair-staged',
        rationale='Central third-ventricle omission reviewed across all 83 candidate planes and 12 registered 300um edge-overlay planes. Preserve surrounding tissue and existing nonzero labels.',
        limitations=['Not full ventricular segmentation or expert ground truth.',
            'ROI edges are not cavity endpoints; no extension beyond individually reviewed candidate.',
            'Other 485 exploratory points are excluded; fornix and optic radiation are not segmented by this patch.',
            'Mesh impact, product integration and browser verification remain pending.'])
    out.mkdir()
    (out / 'base.bin.gz').write_bytes(DEFAULT_LABELS.read_bytes())
    (out / 'labels.bin.gz').write_bytes(data)
    (out / 'repair.json').write_text(json.dumps(record, indent=2)+'\n', encoding='utf-8')
    print(json.dumps({k: record[k] for k in ('outputCompressedSha256', 'outputRawSha256', 'changedVoxelCount', 'installed')}))


if __name__ == '__main__':
    main()
