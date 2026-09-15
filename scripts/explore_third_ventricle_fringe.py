"""Read-only one-layer inventory around the current third-ventricle main cavity.

The source image limits candidates; it never supplies cavity identity by itself.
No label, mesh or published asset is written. Prior exclusion cells remain vetoed.
"""
import hashlib
import json
import argparse
import numpy as np
from scipy import ndimage
from audit_cerebellar_finite_support import support_corner_minima
from audit_manual_label_space import SOURCE, load_identity_minc
from render_registered_manual_fine_review import IMAGE_NAME, IMAGE_SHA
from build_orthogonal_review_bundle import ROOT, DEFAULT_LABELS, MAGIC_LABELS, read_browser_volume

SHA = 'bd0c1c048262876fd5f84d7fd5622c9ddb341b6a18716b14a03e5ad57ff360fb'


def main():
    out = ROOT/'work/anatomy-review/third-main-fringe-after91-v1'
    if out.exists():
        raise ValueError('Preserve existing evidence')
    _, _, labels = read_browser_volume(DEFAULT_LABELS, MAGIC_LABELS, SHA)
    components, _ = ndimage.label(labels == 25, np.ones((3, 3, 3)))
    counts = np.bincount(components.ravel()); counts[0] = 0
    ident = int(np.argmax(counts))
    if counts[ident] != 11732:
        raise ValueError('Main-component identity changed')
    main_mask = components == ident
    fringe = ndimage.binary_dilation(main_mask, ndimage.generate_binary_structure(3, 1)) & (labels == 0)
    points = np.argwhere(fringe)
    raw, start, step, history = load_identity_minc(SOURCE/IMAGE_NAME, IMAGE_SHA)
    geometry = json.loads((ROOT/'public/atlas/bigbrain-icbm500-validation.json').read_text())
    affine = np.asarray(geometry['affine']); origin = affine[:3, 3]; spacing = np.diag(affine)[:3]
    minima = support_corner_minima(raw, ((points-.5)*spacing+origin-start)/step,
                                  ((points+.5)*spacing+origin-start)/step)
    prior = ROOT/'segmentation-patches/review/third-remnants91-adoption-2026-09-08.json'
    # Read the independently pinned pre/post fixture rather than infer exclusions
    # from geometric component size or a region box.
    pre_path = ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-third-remnants91.bin.gz'
    _, _, before = read_browser_volume(pre_path, MAGIC_LABELS,
        '3aa4127843d1ca59ee4fa2d542632748ec542958c76329b627b3968b6d53f45e')
    veto = (before == 25) & (labels == 0)
    if np.count_nonzero(veto) != 91:
        raise ValueError('Prior exclusions changed')
    records = [dict(xyz=p.tolist(), before=0, after=25, supportCornerMinimum=int(v),
                    priorExclusion=bool(veto[tuple(p)]),
                    selected=bool(v >= 65000 and not veto[tuple(p)])) for p, v in zip(points, minima)]
    chosen = [r['xyz'] for r in records if r['selected']]
    candidate = np.zeros(labels.shape, dtype=bool)
    if chosen:
        candidate[tuple(np.asarray(chosen).T)] = True
    cc, total = ndimage.label(candidate, ndimage.generate_binary_structure(3, 1))
    groups = []
    for index, bounds in enumerate(ndimage.find_objects(cc), start=1):
        if bounds is None:
            continue
        group = np.argwhere(cc[bounds] == index) + np.array([s.start for s in bounds])
        groups.append(dict(id=index, count=len(group), seed=group[0].tolist(),
                           low=group.min(0).tolist(), high=group.max(0).tolist()))
    report = dict(inputCompressedSha256=SHA, originalSha256=IMAGE_SHA, sourceHistory=history,
        priorExclusionEvidenceSha256=hashlib.sha256(prior.read_bytes()).hexdigest(),
        mainComponentCount=11732, considered=len(records), selectedCount=len(chosen),
        records=records, components=sorted(groups, key=lambda r: -r['count']),
        adopted=False, expertReviewed=False, labelMutation=False,
        limitation='One face-neighbour layer only. A component or saturated image support does not establish ventricular identity. '
                   'No flood fill, no overwrite of other labels, no automatic adoption. Existing cavity omissions farther from the mask '
                   'and thin or partly occupied boundaries are not covered. Prior 91 exclusions are vetoed, not reintroduced.')
    out.mkdir()
    path = out/'candidate.json'
    path.write_text(json.dumps(report, indent=2)+'\n', encoding='utf-8')
    print(json.dumps(dict(considered=len(records), selected=len(chosen),
                          largest=report['components'][:12], sha256=hashlib.sha256(path.read_bytes()).hexdigest())))


def review_core(axis):
    from review_lateral_detached547 import main as render
    source = ROOT/'work/anatomy-review/third-main-fringe-after91-v1/candidate.json'
    if hashlib.sha256(source.read_bytes()).hexdigest() != '86a0093dc4ee55b6b23df137e123ea21cea543d91f18fe69dfc171ebafc1e5b6':
        raise ValueError('Candidate evidence changed')
    report = json.loads(source.read_text(encoding='utf-8'))
    points = np.asarray([r['xyz'] for r in report['records'] if r['selected']])
    # Previously reviewed central-cavity neighbourhood, used only to select
    # figures. The crop is not an anatomical boundary or an adoption criterion.
    points = points[(points[:, 1] >= 223) & (points[:, 1] <= 260)
                    & (points[:, 2] >= 135) & (points[:, 2] <= 164)]
    if len(points) != 61:
        raise ValueError('Central fringe inventory changed')
    render(axis, component_count=61, labels_sha=SHA, prefix='third-central-fringe61-2026-09-08',
           label_id=25, context_margin=16, candidate_points=points)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--review-core-axis', choices=['x', 'y', 'z'])
    args = parser.parse_args()
    if args.review_core_axis:
        review_core(args.review_core_axis)
    else:
        main()
