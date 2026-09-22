"""Project current landmarks into native40 descent views; never edits labels."""
import argparse
import gzip
import hashlib
import json
import struct
from pathlib import Path

import h5py
import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import binary_erosion

from audit_native_roi_transform import checked, load_linear, load_native_grid, GRID_SHA, LIN_SHA, NL_SHA
from review_bigbrain_grid_transform import load_published_grids, GRID_SHAS, XFM_SHA
from render_fornix_native100_connection import sample_native_labels
from review_fornix_descent_native40 import ROOT, SOURCES, decode, display

LABEL_SHA = 'a009c09fbcf2d13eb28de9a27830c6bcd0572d3b825cf9554b5879ca11efb707'
AFFINE_SHA = '14f3c7946def4f475170a49e9bf23ba17cdb9f05c030b367277a8c77a3d72429'
COLORS = {46: (40, 210, 170), 42: (235, 125, 30), 43: (240, 50, 180),
          25: (80, 160, 255), 39: (240, 210, 30), 40: (240, 210, 30)}


def main(out, bridge=False, context=False, candidate=None, label_sha=LABEL_SHA, label_path=None, views=None):
    if out.exists():
        raise ValueError('Preserve existing evidence; choose a new directory')
    source = checked(ROOT / 'work' / SOURCES[0][0], SOURCES[0][1])
    label_path = checked(ROOT / (label_path or 'public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz'), label_sha)
    raw = gzip.decompress(label_path.read_bytes())
    assert raw[:4] == b'BBS1' and struct.unpack_from('<3H', raw, 4) == (394, 466, 378)
    labels = np.frombuffer(raw, np.uint8, offset=10).reshape((394, 466, 378), order='F')
    colors = dict(COLORS)
    candidate_sha = None
    if candidate:
        payload = candidate.read_bytes(); draft = json.loads(payload)
        if draft['labelSha256'] != label_sha:
            raise ValueError('Candidate baseline differs')
        labels = labels.copy(); seen = set()
        for row in draft['rows']:
            xyz = row['xyz']
            if len(xyz) != 3 or any(type(v) is not int or not 0 <= v < labels.shape[k] for k, v in enumerate(xyz)):
                raise ValueError('Invalid candidate coordinate')
            key = tuple(xyz)
            if key in seen or row['before'] != 0 or labels[key] != 0:
                raise ValueError('Candidate collision')
            seen.add(key); labels[key] = 250
        colors[250] = (245, 35, 35)
        candidate_sha = hashlib.sha256(payload).hexdigest()
    affine_path = checked(ROOT / 'public/atlas/bigbrain-icbm500-validation.json', AFFINE_SHA)
    affine = np.array(json.loads(affine_path.read_text())['affine'])
    linear, native_grid = load_linear(), load_native_grid()
    grids = load_published_grids('catmull-rom')
    out.mkdir(parents=True)
    report = dict(labelSha256=label_sha, labelPath=str(label_path.relative_to(ROOT).as_posix()), sourceSha256=SOURCES[0][1], affineSha256=AFFINE_SHA,
                  transformHashes=dict(linear=LIN_SHA, nativeGrid=GRID_SHA, nativeNonlinear=NL_SHA,
                                       improved=XFM_SHA, grids=GRID_SHAS),
                  meaning='Raw / current label outlines. Not inferred boundaries or new candidates.',
                  labelsWritten=False, figures=[])
    if candidate:
        report.update(candidatePath=candidate.relative_to(ROOT).as_posix(), candidateSha256=candidate_sha,
                      candidateCount=len(seen), meaning='Raw / current landmarks plus RED unapplied candidate voxel footprints. No adoption.')
    with h5py.File(source) as f:
        g = f['minc-2.0/image/0']; dims = f['minc-2.0/dimensions']
        start = np.array([dims[a+'space'].attrs['start'] for a in 'xyz'])
        step = np.array([dims[a+'space'].attrs['step'] for a in 'xyz'])
        assert np.allclose(start, SOURCES[0][2], atol=1e-9, rtol=0)
        assert np.array_equal(step, [.04]*3)
        assert g['image'].shape == (439, 976, 1185)
        assert g['image'].attrs['dimorder'] == b'yspace,zspace,xspace'
        for k, a in enumerate('xyz'):
            assert np.array_equal(dims[a+'space'].attrs['direction_cosines'], np.eye(3)[k])
        requested_views = views
        if requested_views is None:
            views = [('y', y) for y in [246, 266, *range(279, 292), 301, 316, 341]]
            views += [('z', z) for z in [550, 600, 650, 700, 750, 800, 850]]
            views += [('x', x) for x in [510, 535, 560, 585]]
            if bridge:
                views = [('y', y) for y in range(267, 279)]
            if context:
                views = [('x', x) for x in [535, 560, 585, 620]]
        else:
            if any(type(axis) is not str or axis not in ('x', 'y', 'z') or type(index) is not int for axis, index in requested_views):
                raise ValueError('views must contain (axis, integer index) pairs')
            views = [(axis, index) for axis, index in requested_views]
            limits = {'x': 1185, 'y': 439, 'z': 976}
            if len(set(views)) != len(views) or any(index < 0 or index >= limits[axis] for axis, index in views):
                raise ValueError('views contain duplicates or lie outside the Native40 source')
        for axis, index in views:
            if axis == 'y':
                values = decode(g, index, slice(490, 950), slice(435, 660))[::-1]
                xx, zz = np.meshgrid(np.arange(435, 660), np.arange(949, 489, -1))
                coords = np.c_[xx.ravel(), np.full(xx.size, index), zz.ravel()]
                crop = {'x': [435, 660], 'z': [490, 950]}
                direction = 'top superior; X increases right'
            elif axis == 'x':
                yl, yh, zl = (0, 439, 100) if context else (180, 390, 260)
                values = decode(g, slice(yl, yh), slice(zl, 950), index).T[::-1]
                yy, zz = np.meshgrid(np.arange(yl, yh), np.arange(949, zl-1, -1))
                coords = np.c_[np.full(yy.size, index), yy.ravel(), zz.ravel()]
                crop = {'y': [yl, yh], 'z': [zl, 950]}
                direction = 'top superior; right anterior'
            else:
                values = decode(g, slice(180, 390), index, slice(435, 660))[::-1]
                xx, yy = np.meshgrid(np.arange(435, 660), np.arange(389, 179, -1))
                coords = np.c_[xx.ravel(), yy.ravel(), np.full(xx.size, index)]
                crop = {'x': [435, 660], 'y': [180, 390]}
                direction = 'top anterior; X increases right'
            projection = sample_native_labels(labels, coords, start, step, linear, native_grid, grids, affine).reshape(values.shape)
            gray = display(values); rgb = np.repeat(gray[..., None], 3, axis=2); marked = rgb.copy()
            for lid, color in colors.items():
                mask = projection == lid
                marked[mask & ~binary_erosion(mask)] = color
            h, w = gray.shape
            page = Image.new('RGB', (max(w*4+20, 940), h*2+72), 'white')
            page.paste(Image.fromarray(rgb).resize((w*2, h*2), Image.Resampling.NEAREST), (0, 72))
            page.paste(Image.fromarray(marked).resize((w*2, h*2), Image.Resampling.NEAREST), (w*2+20, 72))
            d = ImageDraw.Draw(page)
            d.text((8, 8), f'Native40 {axis.upper()}{index}; RAW / CURRENT' + (' + RED DRAFT' if candidate else '') + f'; {direction}', fill='black')
            d.text((8, 26), 'Green ID46 partial fornix; orange ID42 partial AC; pink ID43 partial septum; blue ID25 third ventricle', fill='black')
            d.text((8, 44), 'Yellow ID39/40 mammillary bodies. Current masks are landmarks, not confirmed boundaries.', fill='black')
            name = f'{axis}{index}.png'; path = out / name; page.save(path)
            np.savez_compressed(out / f'{axis}{index}-projection.npz', labels=projection)
            report['figures'].append(dict(file=name, sha256=hashlib.sha256(path.read_bytes()).hexdigest(),
                axis=axis, index=index, cropExclusive=crop, projectedPixels={str(k): int((projection==k).sum()) for k in colors}))
            print(f'{axis}{index}: {report["figures"][-1]["projectedPixels"]}', flush=True)
    (out / 'report.json').write_text(json.dumps(report, indent=2)+'\n', encoding='utf-8')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out', type=Path, required=True)
    parser.add_argument('--candidate', type=Path, help='Optional unapplied candidate JSON on the pinned current baseline')
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument('--bridge', action='store_true', help='Only the consecutive slices between the current end and Y279')
    mode.add_argument('--context', action='store_true', help='Wider sagittal views including mammillary landmarks')
    args = parser.parse_args()
    main(args.out.resolve(), args.bridge, args.context, args.candidate.resolve() if args.candidate else None)
