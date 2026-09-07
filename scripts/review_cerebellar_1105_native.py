"""Read-only, fixed-input native-image checks at six vulnerable 1105 locations."""
import hashlib
import json
import numpy as np
from PIL import Image, ImageDraw
from audit_manual_label_space import SOURCE, load_identity_minc
from render_registered_manual_fine_review import IMAGE_NAME, IMAGE_SHA, encode_image
from build_orthogonal_review_bundle import ROOT, MAGIC_LABELS, read_browser_volume, _oriented_crop, _outline
from build_registered_manual_candidate import nearest_labels


def main():
    stage = ROOT / 'work/anatomy-review/cerebellar-support-1105-stage-v1'
    out = ROOT / 'work/anatomy-review/cerebellar-support-1105-native-v1'
    if out.exists():
        raise ValueError('Evidence already exists; do not overwrite')
    base_sha = '212df1a6130977c23eb4561a5f883a2bd7efecba5f2b870cc1bbc5eae1b80b3b'
    candidate_sha = '777b76921f99e22232dfedd58a165c17544a200101d9a403adc9f16d054d89ea'
    _, _, before = read_browser_volume(stage / 'base.bin.gz', MAGIC_LABELS, base_sha)
    _, _, after = read_browser_volume(stage / 'labels.bin.gz', MAGIC_LABELS, candidate_sha)
    points = np.argwhere(before != after)
    if len(points) != 21290 or not np.all(np.isin(before[tuple(points.T)], [28, 29])) or np.any(after[tuple(points.T)]):
        raise ValueError('Unexpected candidate transitions')
    geometry = json.loads((ROOT / 'public/atlas/bigbrain-icbm500-validation.json').read_text())
    affine = np.asarray(geometry['affine']); app_start = affine[:3, 3]; app_step = np.diag(affine)[:3]
    raw, start, step, history = load_identity_minc(SOURCE / IMAGE_NAME, IMAGE_SHA)
    out.mkdir()
    figures = []
    # Positions selected from the completed 500um comparison, not from a tissue threshold.
    for tag, dimension, value in [('z18', 2, 18), ('z63', 2, 63), ('z78', 2, 78), ('z98', 2, 98), ('x310', 0, 310), ('y207', 1, 207)]:
        selected = points[points[:, dimension] == value]
        if not len(selected):
            raise ValueError(f'No changed points at {tag}')
        center500 = selected[np.argmin(np.linalg.norm(selected - np.median(selected, axis=0), axis=1))]
        center = np.rint((center500 * app_step + app_start - start) / step).astype(int)
        low = np.maximum(center - 27, 0); high = np.minimum(center + 28, raw.shape)
        if np.any(center - 1 < low) or np.any(center + 1 >= high):
            raise ValueError('Three native planes unavailable')
        shape = high - low
        grid = np.indices(shape).reshape(3, -1).T + low
        world = grid * step + start
        old = nearest_labels(before, world, app_start, app_step).reshape(shape)
        new = nearest_labels(after, world, app_start, app_step).reshape(shape)
        gray = encode_image(raw[tuple(slice(a, b) for a, b in zip(low, high))], geometry['intensityWindow'])
        crop = dict(min=[0, 0, 0], max=(shape - 1).tolist())
        for dim, axis in enumerate('xyz'):
            rows = []
            for delta in [-1, 0, 1]:
                index = int(center[dim] - low[dim] + delta)
                plane = _oriented_crop(gray, axis, index, crop)
                old_plane = _oriented_crop(old, axis, index, crop)
                new_plane = _oriented_crop(new, axis, index, crop)
                rgb = np.repeat(plane[:, :, None], 3, axis=2)
                old_rgb = rgb.copy(); new_rgb = rgb.copy()
                old_rgb[_outline(np.isin(old_plane, [28, 29]))] = [255, 60, 90]
                old_rgb[old_plane != new_plane] = [255, 220, 0]
                new_rgb[_outline(np.isin(new_plane, [28, 29]))] = [255, 60, 90]
                h, w = plane.shape; scale = 6
                row = Image.new('RGB', (3 * w * scale + 16, h * scale + 40), '#181818')
                ImageDraw.Draw(row).text((4, 3), f'{tag} native {axis.upper()}{center[dim]+delta}: raw / before+removed yellow / candidate (NOT adopted)', fill='white')
                for col, picture in enumerate([rgb, old_rgb, new_rgb]):
                    row.paste(Image.fromarray(picture).resize((w * scale, h * scale), Image.Resampling.NEAREST), (col * (w * scale + 8), 40))
                rows.append(row)
            sheet = Image.new('RGB', (rows[0].width, sum(row.height for row in rows)))
            y = 0
            for row in rows:
                sheet.paste(row, (0, y)); y += row.height
            path = out / f'{tag}-{axis}.png'; sheet.save(path)
            figures.append(dict(path=path.name, sha256=hashlib.sha256(path.read_bytes()).hexdigest(), center500=center500.tolist(), nativeIndices=[int(center[dim]+d) for d in [-1, 0, 1]], axis=axis))
        print(tag, center500.tolist(), flush=True)
    report = dict(baseSha256=base_sha, candidateSha256=candidate_sha, sourceSha256=IMAGE_SHA, sourceHistory=history,
                  figures=figures, generatedPlanes=54, mutation=False, adopted=False, expertReviewed=False,
                  limitation='Native raw image with nearest projected 500um labels. Generated figures are not evidence of completed visual review or anatomical approval.')
    (out / 'report.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
