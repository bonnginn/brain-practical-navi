"""Stage two source-image-reviewed white-matter exclusions; never installs assets."""
import json
from stage_lateral_crop34 import ROOT, digest, stage_reviewed_exclusions

SOURCE = '3c4b795d09819a7dc029ffe33fb80621fa6db81fbb7b0eb3507eaf432c29a887'
PREFIX = 'posterior-ventricular-islands2'
REVIEWS = (
    ('left-posterior-single', 'e3d8cb02f7988aa63082f28300c23cf50191fca0d52e1376bf26b6f295a10eb5', 23, [151, 111, 156]),
    ('right-posterior-single', '473352413913fa027489506556310ce334ab99b72d74acf780ac50dda45d5ad2', 24, [237, 120, 158]),
)


def main():
    evidence, points = [], []
    for prefix, sha, label, xyz in REVIEWS:
        relative = f'work/anatomy-review/{prefix}-after1092-native300-v1/report.json'
        path = ROOT / relative
        data = path.read_bytes()
        report = json.loads(data)
        if digest(data) != sha or report['labelsSha256'] != SOURCE or report['points'] != [xyz]:
            raise ValueError('Reviewed source or point changed')
        figures = report['figures'][:3]
        if [f['path'] for f in figures] != ['point-0-x.png', 'point-0-y.png', 'point-0-z.png']:
            raise ValueError('Reviewed figure selection changed')
        evidence.append(dict(report=relative, sha256=sha, reviewedFigures=figures))
        points.append(dict(xyz=xyz, before=label, after=0))
    candidate = dict(sourceSha256=SOURCE, count=2, points=points, evidence=evidence,
        adopted=False, expertReviewed=False, published=False,
        rationale='Registered300 source-image review of XYZ triplets at both singleton locations places these labels inside bright gyral white-matter cores enclosed by cortical ribbons, rather than ventricular lumen. Remove exactly these two false labels; do not remove all disconnected ventricular components.',
        limitations='AI image review, not expert review or complete ventricular segmentation. No native100 re-review. Nearby cavity-edge and medial-transition fragments are retained pending finer boundary evidence. Mesh synchronization and product adoption pending.')
    out = ROOT / f'work/anatomy-review/{PREFIX}-candidate-v1.json'
    encoded = (json.dumps(candidate, indent=2) + '\n').encode('utf-8')
    with out.open('xb') as stream:
        stream.write(encoded)
    stage_reviewed_exclusions(out.relative_to(ROOT).as_posix(), digest(encoded), PREFIX)


if __name__ == '__main__':
    main()
