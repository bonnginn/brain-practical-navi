"""Fixed-input, read-only third-ventricle context on original 300um planes."""
import hashlib
import argparse
import json
import numpy as np
from PIL import Image, ImageDraw
from audit_manual_label_space import SOURCE, load_identity_minc
from render_registered_manual_fine_review import IMAGE_NAME, IMAGE_SHA, encode_image
from build_orthogonal_review_bundle import ROOT, DEFAULT_LABELS, MAGIC_LABELS, read_browser_volume, _oriented_crop, _outline
from build_registered_manual_candidate import nearest_labels

LABEL_SHA = '777b76921f99e22232dfedd58a165c17544a200101d9a403adc9f16d054d89ea'


def main(central_series=False, expanded_checks=False, core_edges=False, core_overlay=False, detached137=False):
    if sum(map(bool, [central_series, expanded_checks, core_edges, core_overlay, detached137])) > 1:
        raise ValueError('Choose one review series')
    out = ROOT / ('work/anatomy-review/third-ventricle-expanded-native-checks-v1' if expanded_checks else 'work/anatomy-review/third-ventricle-central-series-v1' if central_series else 'work/anatomy-review/third-ventricle-native300-v1')
    if core_edges:
        out = ROOT / 'work/anatomy-review/third-ventricle-core-edge-native-v1'
    if core_overlay:
        out = ROOT / 'work/anatomy-review/third-ventricle-core-edge-overlay-v1'
    label_sha = LABEL_SHA
    if detached137:
        out = ROOT / 'work/anatomy-review/third-ventricle-detached137-native-v2'
        label_sha = 'ffb8e56e0939f97b6bc9f8e2585bb3f74e11b525006c6f7d631ae85cd4b033c2'
    if out.exists():
        raise ValueError('Evidence exists')
    _, _, labels = read_browser_volume(DEFAULT_LABELS, MAGIC_LABELS, label_sha)
    raw, start, step, history = load_identity_minc(SOURCE / IMAGE_NAME, IMAGE_SHA)
    geometry = json.loads((ROOT / 'public/atlas/bigbrain-icbm500-validation.json').read_text())
    affine = np.asarray(geometry['affine']); origin = affine[:3, 3]; spacing = np.diag(affine)[:3]
    # Bounded context for the central constriction and superior margin noted in September review.
    low = np.floor((np.array([180, 195, 125])*spacing+origin-start)/step).astype(int)
    high = np.ceil((np.array([212, 285, 180])*spacing+origin-start)/step).astype(int)+1
    if np.any(low < 0) or np.any(high > raw.shape):
        raise ValueError('Crop outside source')
    shape = high-low; grid = np.indices(shape).reshape(3, -1).T+low
    projected = nearest_labels(labels, grid*step+start, origin, spacing).reshape(shape)
    detached_bounds = None
    if detached137:
        from scipy import ndimage
        components, _ = ndimage.label(labels == 25, ndimage.generate_binary_structure(3, 3))
        ident = components[193, 248, 168]
        points = np.argwhere(components == ident) if ident else np.empty((0, 3), int)
        if len(points) != 137:
            raise ValueError('Detached component identity changed')
        detached_bounds = [points.min(0).tolist(), points.max(0).tolist()]
    candidate_sha = None
    projected_addition = np.zeros(shape, dtype=bool)
    if core_overlay:
        candidate = ROOT / 'work/anatomy-review/third-ventricle-central-core-candidate-v1/candidate.json'
        candidate_sha = hashlib.sha256(candidate.read_bytes()).hexdigest()
        if candidate_sha != 'cf3ccf9f1415bf798fe659f353c0b646f42ce022db73a413606ff49f17a6f1fd':
            raise ValueError('Candidate changed')
        records = [r for r in json.loads(candidate.read_text(encoding='utf-8'))['records'] if r['selected']]
        xyz = np.asarray([r['xyz'] for r in records], dtype=int)
        if len(records) != 1587 or len(np.unique(xyz, axis=0)) != 1587 or np.any(labels[tuple(xyz.T)] != 0):
            raise ValueError('Invalid addition')
        if any(r['before'] != 0 or r['after'] != 25 for r in records):
            raise ValueError('Invalid transition')
        addition = np.zeros_like(labels)
        addition[tuple(xyz.T)] = 1
        projected_addition = nearest_labels(addition, grid*step+start, origin, spacing).reshape(shape) != 0
    gray = encode_image(raw[tuple(slice(a, b) for a, b in zip(low, high))], geometry['intensityWindow'])
    crop = dict(min=[0, 0, 0], max=(shape-1).tolist()); figures = []
    out.mkdir()
    groups = [('x', 195), ('x', 197), ('y', 230), ('y', 264), ('z', 142), ('z', 155)]
    if expanded_checks:
        # Check the central omission, Z152/153 selection discontinuity and upper tissue.
        # These are inspection locations, never acceptance masks or anatomical boundaries.
        groups = [('x', 194), ('x', 196), ('x', 198), ('y', 240), ('y', 250), ('y', 260),
                  ('z', 152), ('z', 153), ('z', 159), ('z', 165)]
    if central_series:
        # Complete non-overlapping native runs: X323-331, Y373-393, Z232-246.
        groups = [(axis, center) for axis, centers in [('x', range(324,332,3)), ('y', range(374,394,3)), ('z', range(233,247,3))] for center in centers]
    if core_edges or core_overlay:
        # Inspect both thin lateral tips, the lower ROI contact, and the upper taper.
        # The box and these plane centers do not define an anatomical boundary.
        groups = [('x', 192), ('x', 200), ('z', 135), ('z', 164)]
    if detached137:
        first = np.floor((np.array(detached_bounds[0])*spacing+origin-start)/step).astype(int)-1
        last = np.ceil((np.array(detached_bounds[1])*spacing+origin-start)/step).astype(int)+1
        groups = [(axis, center) for dim, axis in enumerate('xyz') for center in range(int(first[dim])+1, int(last[dim])+2, 3)]
    for axis, app_index in groups:
        dim = 'xyz'.index(axis)
        center = app_index if central_series or detached137 else int(np.rint((app_index*spacing[dim]+origin[dim]-start[dim])/step[dim]))
        if center-1 < low[dim] or center+1 >= high[dim]:
            raise ValueError('Plane outside crop')
        rows = []
        for index in range(center-1, center+2):
            plane = _oriented_crop(gray, axis, index-int(low[dim]), crop)
            lab = _oriented_crop(projected, axis, index-int(low[dim]), crop)
            rgb = np.repeat(plane[:, :, None], 3, axis=2)
            for key, color in [(25, [255, 60, 90]), (23, [0, 170, 210]), (24, [0, 170, 210]), (41, [200, 90, 230])]:
                rgb[_outline(lab == key)] = color
            if core_overlay:
                added = _oriented_crop(projected_addition, axis, index-int(low[dim]), crop)
                rgb[added] = [255, 210, 0]
            h, w = plane.shape; scale = 3
            row = Image.new('RGB', (max(780, 2*w*scale+12), h*scale+44), '#181818')
            draw = ImageDraw.Draw(row)
            coordinate_note = 'native continuous run' if central_series or detached137 else f'app vicinity {app_index}'
            draw.text((4, 3), f'Original300 {axis.upper()}{index} ({coordinate_note}): raw / current projected label', fill='white')
            legend = 'Yellow=candidate addition, red=current third. NOT adopted; nearest projection.' if core_overlay else 'Red=third, cyan=lateral, purple=partial aqueduct. No proposed edit; NOT approved boundaries.'
            draw.text((4, 22), legend, fill='white')
            for col, picture in enumerate([np.repeat(plane[:, :, None], 3, axis=2), rgb]):
                row.paste(Image.fromarray(picture).resize((w*scale, h*scale), Image.Resampling.NEAREST), (col*(w*scale+12), 44))
            rows.append(row)
        sheet = Image.new('RGB', (rows[0].width, sum(r.height for r in rows))); offset = 0
        for row in rows:
            sheet.paste(row, (0, offset)); offset += row.height
        path = out / f'{axis}-{app_index}.png'; sheet.save(path)
        figures.append(dict(path=path.name, sha256=hashlib.sha256(path.read_bytes()).hexdigest(), axis=axis, nativeIndices=list(range(center-1, center+2))))
    (out/'report.json').write_text(json.dumps(dict(labelsSha256=label_sha, originalSha256=IMAGE_SHA, history=history,
        nativeCropExclusive=dict(low=low.tolist(), high=high.tolist()), figures=figures, mutation=False, adopted=False,
        generatedPlanes=3*len(groups), centralSeries=central_series, expandedChecks=expanded_checks, coreEdges=core_edges,
        coreOverlay=core_overlay, candidateSha256=candidate_sha, detached137=detached137, detachedBoundsXYZ=detached_bounds,
        limitation='Local original planes with nearest projected labels. Not full ventricular coverage or tissue classification.'), indent=2)+'\n', encoding='utf-8')
    print(f'Generated {len(groups)} sheets / {3*len(groups)} original planes; visual review pending.')


if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    series = parser.add_mutually_exclusive_group()
    series.add_argument('--central-series', action='store_true')
    series.add_argument('--expanded-checks', action='store_true')
    series.add_argument('--core-edges', action='store_true')
    series.add_argument('--core-overlay', action='store_true')
    series.add_argument('--detached137', action='store_true')
    args = parser.parse_args()
    main(args.central_series, args.expanded_checks, args.core_edges, args.core_overlay, args.detached137)
