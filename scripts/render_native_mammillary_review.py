"""Local native mammillary comparisons; projected labels are context, not truth."""
import hashlib
import json
import h5py
import numpy as np
from scipy.ndimage import map_coordinates
from PIL import Image, ImageDraw
from audit_native_roi_transform import checked, load_linear, load_native_grid, GRID_SHA, LIN_SHA, NL_SHA
from inspect_hypothalamus_roi import SOURCE, SHA, decode_identity_roi
from review_bigbrain_grid_transform import load_published_grids, forward_chain, GRID_SHAS
from build_orthogonal_review_bundle import ROOT, DEFAULT_LABELS, MAGIC_LABELS, read_browser_volume, _outline
from render_current_ventral_midbrain import LABEL_SHA

CROP = {'min': [175, 0, 80], 'max': [295, 100, 210]}
GROUPS = [('y', 15), ('y', 35), ('y', 55), ('x', 215), ('x', 260), ('z', 125)]


def plane_indices(axis, index, crop):
    """Return XYZ indices with columns increasing, rows reversed superior/posterior."""
    fixed = 'xyz'.index(axis)
    if not crop['min'][fixed] <= index <= crop['max'][fixed]:
        raise ValueError('Plane outside crop')
    a, b = [k for k in range(3) if k != fixed]
    cols = np.arange(crop['min'][a], crop['max'][a]+1)
    rows = np.arange(crop['min'][b], crop['max'][b]+1)[::-1]
    aa, bb = np.meshgrid(cols, rows)
    indices = np.empty((*aa.shape, 3), dtype=int)
    indices[..., fixed] = index
    indices[..., a] = aa
    indices[..., b] = bb
    return indices


def main():
    out = ROOT/'work/anatomy-review/native-mammillary-local-v1'
    if out.exists():
        raise ValueError('Evidence exists')
    with h5py.File(checked(SOURCE, SHA)) as f:
        native, start, step = decode_identity_roi(f['minc-2.0'])
    _, _, labels = read_browser_volume(DEFAULT_LABELS, MAGIC_LABELS, LABEL_SHA)
    geometry = json.loads((ROOT/'public/atlas/bigbrain-icbm500-validation.json').read_text())
    inv = np.linalg.inv(np.array(geometry['affine']))
    low, high = geometry['intensityWindow']
    linear = load_linear(); grid = load_native_grid(); improved = load_published_grids('catmull-rom')
    out.mkdir(parents=True)
    report = dict(nativeSha256=SHA, labelsSha256=LABEL_SHA, nativeLinearSha256=LIN_SHA,
        nativeNonlinearSha256=NL_SHA, nativeGridSha256=GRID_SHA, improvedGridSha256=GRID_SHAS,
        cropInclusive=CROP, mutation=False, expertReviewed=False,
        mapping='native -> linear -> native nonlinear grid -> improved grids -> app indices',
        labelSampling='nearest app500 on native100 planes, NOT native segmentation',
        scope='18 local planes, not all mammillary boundaries or full-volume validation', figures=[])
    for axis, center in GROUPS:
        rows = []; planes = []
        for index in range(center-1, center+2):
            indices = plane_indices(axis, index, CROP)
            shape = indices.shape[:2]; flat = indices.reshape(-1, 3)
            world = flat*step+start
            mapped = forward_chain(improved, grid.forward(world@linear[:, :3].T+linear[:, 3]))
            coords = mapped@inv[:3, :3].T+inv[:3, 3]
            if np.any(coords < 0) or np.any(coords > np.array(labels.shape)-1):
                raise ValueError('Outside app')
            projected = map_coordinates(labels, coords.T, order=0, prefilter=False).reshape(shape)
            raw = native[tuple(flat.T)].reshape(shape)
            inverted = 65535-raw.astype(float)
            gray = np.rint(np.clip((inverted-low)/(high-low), 0, 1)*250).astype('uint8')
            gray[inverted >= 65000] = 255
            rgb = np.repeat(gray[:, :, None], 3, axis=2)
            for label, color in [(39, [0, 170, 70]), (40, [30, 110, 255]), (33, [220, 170, 0])]:
                rgb[_outline(projected == label)] = color
            h, w = shape
            row = Image.new('RGB', (max(790, w*6+12), h*3+48), '#181818')
            d = ImageDraw.Draw(row)
            d.text((4, 3), f'Native {axis.upper()}={index} | RAW100 | projected APP500: 39 green, 40 blue, mixed33 yellow', fill='white')
            d.text((4, 21), 'Local comparison only. Nearest-label steps are NOT native anatomical boundaries.', fill='white')
            for col, array in enumerate([gray, rgb]):
                row.paste(Image.fromarray(array).convert('RGB').resize((w*3, h*3), Image.Resampling.NEAREST), (col*(w*3+12), 48))
            rows.append(row)
            planes.append(dict(nativeIndex=index, projectedCounts={str(k):int((projected==k).sum()) for k in [39,40]},
                mappedAppMin=coords.min(0).tolist(), mappedAppMax=coords.max(0).tolist()))
        sheet = Image.new('RGB', (max(r.width for r in rows), sum(r.height for r in rows)), '#181818')
        offset = 0
        for row in rows:
            sheet.paste(row, (0, offset)); offset += row.height
        path = out/f'{axis}-{center:03}.png'; sheet.save(path)
        report['figures'].append(dict(path=path.name, axis=axis, planes=planes, sha256=hashlib.sha256(path.read_bytes()).hexdigest()))
        print(path.name, flush=True)
    (out/'report.json').write_text(json.dumps(report, indent=2)+'\n', encoding='utf-8')


if __name__ == '__main__':
    main()
