"""Read-only source comparison for the anterior fornix; no inferred contours."""
import argparse
import hashlib
import json
from pathlib import Path

import h5py
import numpy as np
from PIL import Image, ImageDraw

from audit_native_roi_transform import checked

ROOT = Path(__file__).resolve().parents[1]
SOURCES = [
    ('hypothalamus_full_40um.mnc', '18aec7b69b59ab5e3dc578885accbae2d86f86a7bbc6cba5dd2a07dbd4712f65', [-23.0666, 6.37, -29.3777], .04),
    ('full16_100um_optbal.mnc', '61e6ebbeb0d6876051b9348a68bfe22b733fead04d112c35ff1a29819b67d351', [-70.6666, -72.97, -58.7777], .1),
]


def decode(group, y, z, x):
    stored = group['image'][y, z, x].astype(np.float64)
    lo, hi = group['image-min'][y], group['image-max'][y]
    if np.ndim(lo):
        lo, hi = lo[:, None], hi[:, None]
    return stored / 65535 * (hi - lo) + lo


def display(raw):
    return np.rint(255 * (1 - np.clip(raw / 40000, 0, 1))).astype('uint8')


def main(out):
    if out.exists():
        raise ValueError('Use a new directory; preserve evidence')
    paths = [checked(ROOT / 'work' / name, sha) for name, sha, _, _ in SOURCES]
    out.mkdir(parents=True)
    report = {'purpose': 'Field-of-view and raw tissue comparison only; no anatomical boundary decision',
              'labelsWritten': False, 'sourceHashes': {s[0]: s[1] for s in SOURCES},
              'scaling': 'stored / 65535 * (image-max[Y] - image-min[Y]) + image-min[Y]',
              'displayWindows': {'native40': {'range': [0, 40000], 'inverted': True},
                                 'native100': {'range': [40000, 65535], 'inverted': False}},
              'figures': []}
    with h5py.File(paths[0]) as fine, h5py.File(paths[1]) as coarse:
        groups = []
        for f, (_, _, origin, step) in zip((fine, coarse), SOURCES):
            for k, a in enumerate('xyz'):
                attrs = f['minc-2.0/dimensions/' + a + 'space'].attrs
                assert abs(float(attrs['start']) - origin[k]) < 1e-8
                assert float(attrs['step']) == step
                assert np.array_equal(attrs['direction_cosines'], np.eye(3)[k])
                assert attrs['units'] == b'mm'
            g = f['minc-2.0/image/0']
            assert g['image'].attrs['dimorder'] == b'yspace,zspace,xspace'
            assert np.array_equal(g['image'].attrs['valid_range'], [0, 65535])
            assert g['image-min'].shape == g['image-max'].shape == (g['image'].shape[0],)
            groups.append(g)
        def save(page, name, **meta):
            path = out / name
            page.save(path)
            report['figures'].append(dict(file=name, sha256=hashlib.sha256(path.read_bytes()).hexdigest(), **meta))
        # Equal physical fields: fine X435..659/Z490..949;
        # coarse X650..739/Z490..673. Nearest Y differs by at most 0.02 mm.
        for y100 in (900, 905, 910, 920, 930, 940):
            mm = SOURCES[1][2][1] + .1 * y100
            y40 = int(np.rint((mm - SOURCES[0][2][1]) / .04))
            raw40 = decode(groups[0], y40, slice(490, 950), slice(435, 660))[::-1]
            raw100 = decode(groups[1], y100, slice(490, 674), slice(650, 740))[::-1]
            # Each panel uses its own acquired slice; this is not a voxel match.
            a = Image.fromarray(display(raw40)).resize((450, 920), Image.Resampling.NEAREST)
            coarse_gray = np.rint(np.clip((raw100 - 40000) / 25535, 0, 1) * 255).astype('uint8')
            b = Image.fromarray(coarse_gray).resize((450, 920), Image.Resampling.NEAREST)
            page = Image.new('RGB', (920, 990), 'white')
            page.paste(a, (0, 60)); page.paste(b, (470, 60))
            d = ImageDraw.Draw(page)
            d.text((8, 8), f'Native40 Y{y40} / native100 Y{y100}; superior at top; X increases right', fill='black')
            error = SOURCES[0][2][1] + .04 * y40 - mm
            d.text((8, 28), f'Physical field X -5.6666..3.3334 mm, Z -9.7777..8.6223 mm; Y offset {error:.3f} mm', fill='black')
            save(page, f'coronal-y100-{y100}.png', axis='y', native100Index=y100, native40Index=y40,
                 fineCropXZ=[435, 660, 490, 950], coarseCropXZ=[650, 740, 490, 674], yOffsetMm=error)
        for x in (510, 535, 560, 585):
            raw = decode(groups[0], slice(180, 390), slice(260, 950), x).T[::-1]
            panel = Image.fromarray(display(raw)).resize((420, 1380), Image.Resampling.NEAREST)
            page = Image.new('RGB', (700, 1430), 'white'); page.paste(panel, (0, 50))
            ImageDraw.Draw(page).text((8, 8), f'Native40 X{x}; left posterior Y180, right anterior Y389; top Z949, bottom Z260', fill='black')
            save(page, f'sagittal-x40-{x}.png', axis='x', native40Index=x, cropYZ=[180, 390, 260, 950])
    (out / 'report.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'output': str(out), 'figures': len(report['figures']), 'labelsWritten': False}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out', type=Path, required=True)
    main(parser.parse_args().out.resolve())
