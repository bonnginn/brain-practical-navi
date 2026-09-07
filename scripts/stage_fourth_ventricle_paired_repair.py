"""Stage image-reviewed paired omissions; no installation or external flood fill."""
import json
import numpy as np
from itertools import product
from build_orthogonal_review_bundle import ROOT, DEFAULT_LABELS, MAGIC_LABELS, read_browser_volume
from adopt_registered_red_nuclei import encode
from stage_third_ventricle_core_repair import digest, checked_report
from review_fourth_ventricle_tail_native import LABEL_SHA

WORK = ROOT/'work/anatomy-review'
CANDIDATE_SHA = '7151723811e2d39e7b6b2ccb2c053c5edbfa814aa5956574a2bdcdb4b4a71e9f'
# Image-localized two omissions, not a coordinate-based partition of mixed ID33.
POINTS = sorted(product([187,188,203,204],[181,182],[71,72]))


def replay(volume, points, reverse=False):
    if len(points) != 16 or any(len(p) != 3 or any(type(v) is not int for v in p) for p in points):
        raise ValueError('Invalid finite repair')
    if sorted(tuple(p) for p in points) != POINTS:
        raise ValueError('Repair coordinates changed')
    result = volume.copy()
    for point in points:
        key = tuple(point)
        if any(v < 0 or v >= n for v,n in zip(key,result.shape)):
            raise ValueError('Coordinate out of range')
        before, after = (26,0) if reverse else (0,26)
        if result[key] != before:
            raise ValueError('Source voxel differs')
        result[key] = after
    return result


def main():
    out = WORK/'fourth-ventricle-paired-stage-v1'
    if out.exists():
        raise ValueError('Preserve existing evidence')
    path = WORK/'fourth-ventricle-wall-extended-candidate-v1/candidate.json'
    if digest(path.read_bytes()) != CANDIDATE_SHA:
        raise ValueError('Candidate changed')
    candidate = json.loads(path.read_text(encoding='utf-8'))
    selected = {tuple(r['xyz']):r for r in candidate['records'] if r['selected']}
    if candidate['inputCompressedSha256'] != LABEL_SHA or len(selected) != 108:
        raise ValueError('Candidate baseline differs')
    if any(p not in selected or selected[p]['supportCornerMinimum'] != 65535 for p in POINTS):
        raise ValueError('Finite support evidence changed')
    evidence = [
        checked_report('fourth-ventricle-wall-extended-difference-v1','ef94702a7434ae50d8061264af5103120d3eef8d94632055143614b4b5febb78',19),
        checked_report('fourth-ventricle-wall-extended-native-v1','673a5ec1d6c75987e0f2654c9e7503afcc1237500ad56988dfd6955ecacea836',8),
        checked_report('fourth-ventricle-paired-holes-native-v1','e313275c32c92f1e52f79167063b5904c0ad408a4a680305dc2a4780c2352a5f',6),
    ]
    _,_,before = read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,LABEL_SHA)
    after = replay(before,POINTS)
    if np.count_nonzero(after != before) != 16 or not np.array_equal(replay(after,POINTS,True),before):
        raise ValueError('Reversibility differs')
    encoded = encode(after)
    report = dict(inputCompressedSha256=LABEL_SHA,inputRawSha256=digest(before.tobytes(order='F')),
        outputCompressedSha256=digest(encoded),outputRawSha256=digest(after.tobytes(order='F')),
        points=[dict(xyz=list(p),before=0,after=26) for p in POINTS],changedVoxelCount=16,
        transitions={'0->26':16},excludedExploratoryPoints=92,candidateSha256=CANDIDATE_SHA,
        reviewEvidence=evidence,status='AI-image-reviewed-development-repair-staged',
        imageReviewed=True,expertReviewed=False,installed=False,published=False,
        rationale='Two localized anterior cavity omissions correspond to bright cavity in registered300 orthogonal and adjacent images; preserve other labels and cerebellar-facing margins.',
        limitations=['Not a complete cavity repair. Adjacent anterior contour deficits extend beyond these 16 points.',
            'A hole in one plane is not evidence of a sealed 3D cavity.',
            'Mesh integration, downstream audits and browser verification are pending.'])
    out.mkdir()
    (out/'base.bin.gz').write_bytes(DEFAULT_LABELS.read_bytes())
    (out/'labels.bin.gz').write_bytes(encoded)
    (out/'repair.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:report[k] for k in ('changedVoxelCount','outputCompressedSha256','outputRawSha256','installed')}))


if __name__ == '__main__':
    main()
