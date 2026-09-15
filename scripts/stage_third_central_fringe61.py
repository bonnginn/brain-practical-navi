"""Stage one image-reviewed central third-ventricle omission repair; no install."""
import json
import numpy as np
from stage_lateral_crop34 import ROOT, digest, save_ventricular_region
from stage_lateral_detached547 import validate_review
from explore_third_ventricle_fringe import SHA

REVIEWS = {
    'x': '7e5ed473af710b6f9df4ba4a8a22355d537645cc47af77b740078f0c04a0122f',
    'y': '250853933f99c835f8bded901a15f4a4d4742ac982b177a6c11e111e7b2c88a6',
    'z': '47427e7927969534ef167fed3731fdfaf4aaad85e98337b9fd72b4be171e79cc',
}


def main():
    source = ROOT/'work/anatomy-review/third-main-fringe-after91-v1/candidate.json'
    data = source.read_bytes()
    if digest(data) != '86a0093dc4ee55b6b23df137e123ea21cea543d91f18fe69dfc171ebafc1e5b6':
        raise ValueError('Candidate changed')
    candidate = json.loads(data)
    if candidate['inputCompressedSha256'] != SHA or candidate['adopted'] or candidate['labelMutation']:
        raise ValueError('Candidate status changed')
    supported = {tuple(r['xyz']) for r in candidate['records'] if r['selected']
                 and r['supportCornerMinimum'] >= 65000 and not r['priorExclusion']}
    points = None
    evidence = [dict(path=source.relative_to(ROOT).as_posix(), sha256=digest(data),
                     scope='Candidate locator and original300 finite support; not anatomical approval')]
    for axis, sha in REVIEWS.items():
        path = ROOT/f'work/anatomy-review/third-central-fringe61-2026-09-08-series-{axis}-v1/report.json'
        data = path.read_bytes(); report = json.loads(data)
        if digest(data) != sha or report.get('labelId') != 25:
            raise ValueError('Review changed')
        xyz = validate_review(report, axis, expected_sha=SHA, expected_count=61)
        if not set(map(tuple, xyz)).issubset(supported):
            raise ValueError('Unsupported or previously excluded point')
        if points is not None and not np.array_equal(points, xyz):
            raise ValueError('Different reviewed sets')
        points = xyz
        for figure in report['figures']:
            if digest((path.parent/figure['path']).read_bytes()) != figure['sha256']:
                raise ValueError('Reviewed figure changed')
        evidence.append(dict(path=path.relative_to(ROOT).as_posix(), sha256=sha,
                             visuallyInspectedFigures=report['figures']))
    save_ventricular_region(points, SHA, evidence, 'third-central-fringe61',
        'All 46 registered300 raw/outline comparison sheets were visually reviewed: X318–335 (18 planes), '
        'Y373–438 (66), Z223–276 (54). The 61 cells fill local central-cavity margins beside retained tissue, '
        'not the broad posterior/superior or inferior open spaces. Original300 finite-cell support corroborates '
        'the image review. Other structure labels and the preceding 91 exclusions remain unchanged.',
        'AI image review, not expert review or complete third-ventricle segmentation. The 152 superior cells '
        'remain held for boundary review; no global filling, missing-wall reconstruction or claim of microscopic '
        'boundary accuracy. No new native100 review. Mesh synchronization and product adoption pending.', label_id=25)


if __name__ == '__main__':
    main()
