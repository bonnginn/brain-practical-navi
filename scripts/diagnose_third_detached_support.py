"""Measure raw300 finite-cell support for detached137 and its immediate fringe."""
import json
import numpy as np
from scipy import ndimage
from audit_cerebellar_finite_support import support_corner_minima
from audit_manual_label_space import SOURCE, load_identity_minc
from render_registered_manual_fine_review import IMAGE_NAME, IMAGE_SHA
from build_orthogonal_review_bundle import ROOT, DEFAULT_LABELS, MAGIC_LABELS, read_browser_volume

SHA = 'ffb8e56e0939f97b6bc9f8e2585bb3f74e11b525006c6f7d631ae85cd4b033c2'


def main():
    output = ROOT/'work/anatomy-review/third-detached137-support-v1.json'
    if output.exists():raise ValueError('Preserve evidence')
    _, _, labels = read_browser_volume(DEFAULT_LABELS, MAGIC_LABELS, SHA)
    cc, _ = ndimage.label(labels == 25, ndimage.generate_binary_structure(3, 3))
    ident = cc[193,248,168]
    mask = cc == ident
    if not ident or mask.sum() != 137:raise ValueError('Component changed')
    fringe = ndimage.binary_dilation(mask, ndimage.generate_binary_structure(3, 1)) & ~mask & (labels == 0)
    raw, start, step, history = load_identity_minc(SOURCE/IMAGE_NAME, IMAGE_SHA)
    affine = np.array(json.loads((ROOT/'public/atlas/bigbrain-icbm500-validation.json').read_text())['affine'])
    origin, spacing = affine[:3,3], np.diag(affine)[:3]
    groups = {}
    for name, selection in [('existing137', mask), ('zeroFaceFringe', fringe)]:
        points = np.argwhere(selection)
        low = ((points-.5)*spacing+origin-start)/step
        high = ((points+.5)*spacing+origin-start)/step
        minima = support_corner_minima(raw, low, high)
        groups[name] = dict(count=len(points), finiteMinimumAtLeast65000=int((minima >= 65000).sum()),
            records=[dict(xyz=p.tolist(), before=int(labels[tuple(p)]), finiteMinimum=int(v)) for p,v in zip(points,minima)])
    report = dict(labelSha256=SHA, source300Sha256=IMAGE_SHA, sourceHistory=history, groups=groups,
        mutation=False, adopted=False, limitation='A finite raw intensity constraint only: neither an exclusion rule for low values nor an adoption rule for bright values. One face-neighbor fringe, no flood filling.')
    with output.open('x',encoding='utf-8') as stream:json.dump(report,stream,indent=2)
    print(json.dumps({name:{k:v for k,v in group.items() if k!='records'} for name,group in groups.items()}))


if __name__ == '__main__':main()
