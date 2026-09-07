"""Create a reversible work-only lateral repair from reviewed fixed candidates."""
import json
import numpy as np
from audit_lateral_medium_finite_support import LABEL_SHA, INVENTORY_SHA
from stage_lateral_fringe_repair import replay, encode
from stage_third_ventricle_core_repair import digest, checked_report
from build_orthogonal_review_bundle import ROOT, DEFAULT_LABELS, MAGIC_LABELS, read_browser_volume


def main():
    work = ROOT / 'work/anatomy-review'
    out = work / 'lateral-fringe-medium-stage-v1'
    if out.exists():
        raise ValueError('Preserve prior stage')
    raw_inventory = (work / 'lateral-ventricle-fringe-v1/report.json').read_bytes()
    if digest(raw_inventory) != INVENTORY_SHA:
        raise ValueError('Inventory changed')
    components, points = [], []
    for r in json.loads(raw_inventory)['results']:
        for c in r['components']:
            if 20 <= len(c['points']) <= 49:
                components.append(dict(target=r['target'], component=c['id'], count=len(c['points'])))
                points.extend(dict(xyz=p, before=0, after=r['target']) for p in c['points'])
    if len(components) != 31 or len(points) != 867:
        raise ValueError('Coverage differs')
    evidence = [checked_report(folder, sha, count) for folder, sha, count in [
        ('lateral-fringe-medium-native-v1', 'dada8056a99c5d291d8c945d6774c411d91d8b17c2ffdff67c238a3578f47d73', 93),
        ('lateral-fringe-medium-difference-v1', '4b6d413cca7ed60e1735e4fab274139b4faf5a682ed4143e0984d92a5ac5bfe3', 285),
        ('lateral-fringe-medium-union-v1', 'b1596dd128c195cc151cd73a733c154e10a89b88f853d53e4f5e986b92002323', 357),
    ]]
    support_path = work / 'lateral-fringe-medium-finite-support-v1.json'
    support_bytes = support_path.read_bytes()
    if digest(support_bytes) != '9934fedcab96d57ef52534ade2f4bc8f67b846f3b6162204af3df6739bb58525':
        raise ValueError('Finite evidence changed')
    support = json.loads(support_bytes)
    if support['labelSha256'] != LABEL_SHA or support['inventorySha256'] != INVENTORY_SHA:
        raise ValueError('Finite baseline differs')
    if {(tuple(p['xyz']), p['after']) for p in points} != {(tuple(p['xyz']), p['target']) for p in support['records']}:
        raise ValueError('Finite evidence coverage differs')
    _, _, before = read_browser_volume(DEFAULT_LABELS, MAGIC_LABELS, LABEL_SHA)
    after = replay(before, points)
    if np.count_nonzero(before != after) != 867 or not np.array_equal(replay(after, points, True), before):
        raise ValueError('Reversibility differs')
    data = encode(after)
    report = dict(inputCompressedSha256=LABEL_SHA, inputRawSha256=digest(before.tobytes(order='F')),
                  outputCompressedSha256=digest(data), outputRawSha256=digest(after.tobytes(order='F')),
                  changedVoxelCount=867, points=points, components=components,
                  transitions={f'0->{t}':sum(p['after'] == t for p in points) for t in (23,24)},
                  reviewEvidence=[{k:e[k] for k in ('path','sha256')} for e in evidence],
                  finiteEvidence=dict(path=support_path.relative_to(ROOT).as_posix(), sha256=digest(support_bytes)),
                  status='AI-image-reviewed-development-repair-staged', adopted=False, installed=False,
                  published=False, expertReviewed=False,
                  rationale='Localized cavity-side omissions reviewed individually and as a union in orthogonal images; finite source-cell intensity is supporting evidence, not anatomical classification.',
                  limitations=['Not a complete ventricular segmentation or expert ground truth.',
                               'Preserve all existing nonzero labels; do not expand beyond reviewed points.',
                               'Dependent meshes, local integration, tests, build and browser verification remain pending.'])
    out.mkdir()
    (out / 'base.bin.gz').write_bytes(DEFAULT_LABELS.read_bytes())
    (out / 'labels.bin.gz').write_bytes(data)
    (out / 'repair.json').write_text(json.dumps(report, indent=2)+'\n', encoding='utf-8')
    print(json.dumps({k:report[k] for k in ('changedVoxelCount','transitions','outputCompressedSha256','outputRawSha256','installed')}))


if __name__ == '__main__':
    main()
