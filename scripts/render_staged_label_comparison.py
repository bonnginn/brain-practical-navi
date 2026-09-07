"""Render identical raw-image crops before/after a pinned repair, without mutation."""
import argparse
import json
import numpy as np
from PIL import Image, ImageDraw
from stage_lateral_crop34 import load_batch_stage, digest
from build_orthogonal_review_bundle import ROOT, DEFAULT_IMAGE, MAGIC_IMAGE, MAGIC_LABELS, EXPECTED_IMAGE_SHA256, read_browser_volume


def main(prefix, record_sha, z):
    stage, record = load_batch_stage(prefix, record_sha)
    _, dims, raw = read_browser_volume(DEFAULT_IMAGE, MAGIC_IMAGE, EXPECTED_IMAGE_SHA256)
    _, _, before = read_browser_volume(stage/'before.bin.gz', MAGIC_LABELS, record['beforeSha256'])
    _, _, after = read_browser_volume(stage/'labels.bin.gz', MAGIC_LABELS, record['afterSha256'])
    if type(z) is not int or not 0 <= z < dims[2]:
        raise ValueError('Invalid horizontal index')
    changed = before[:, :, z] != after[:, :, z]
    points = np.argwhere(changed)
    if not len(points):
        raise ValueError('No changes in requested plane')
    low = np.maximum(points.min(0)-28, 0)
    high = np.minimum(points.max(0)+29, dims[:2])
    crop = tuple(slice(int(a), int(b)) for a, b in zip(low, high))
    gray = raw[:, :, z][crop].T[::-1]
    delta = changed[crop].T[::-1]
    panels = []
    for labels, title in [(None, 'SOURCE IMAGE'), (before, 'BEFORE'), (after, 'AFTER')]:
        rgb = np.repeat(gray[:, :, None], 3, axis=2)
        if labels is not None:
            mask = np.isin(labels[:, :, z][crop].T[::-1], [23, 24, 25, 26, 41])
            rgb[mask] = np.rint(.45*rgb[mask]+.55*np.array([0, 170, 210])).astype(np.uint8)
        panel = Image.new('RGB', (gray.shape[1]*5, gray.shape[0]*5+36), '#181818')
        ImageDraw.Draw(panel).text((8, 8), title, fill='white')
        panel.paste(Image.fromarray(rgb).resize((gray.shape[1]*5, gray.shape[0]*5), Image.Resampling.NEAREST), (0, 36))
        panels.append(panel)
    out = ROOT/f'work/anatomy-review/{prefix}-comparison-z{z}'
    out.mkdir()  # Never overwrite prior evidence.
    sheet = Image.new('RGB', (sum(p.width for p in panels)+24, panels[0].height+42), '#181818')
    ImageDraw.Draw(sheet).text((8, 6), f'Horizontal app Z{z}; same crop/window. Cyan = ventricular labels. {int(delta.sum())} changed cells on this plane.\nAI-reviewed development repair; not expert ground truth.', fill='white')
    x = 0
    for panel in panels:
        sheet.paste(panel, (x, 42)); x += panel.width+12
    path = out/'comparison.png'; sheet.save(path)
    evidence = dict(stageRecordSha256=record_sha, beforeSha256=record['beforeSha256'], afterSha256=record['afterSha256'], imageSha256=EXPECTED_IMAGE_SHA256,
        z=z, cropXY=dict(low=low.tolist(), highExclusive=high.tolist()), changedCells=int(delta.sum()), figureSha256=digest(path.read_bytes()), mutation=False)
    (out/'report.json').write_text(json.dumps(evidence, indent=2)+'\n', encoding='utf-8')
    print(path)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--stage-prefix', required=True)
    parser.add_argument('--record-sha', required=True)
    parser.add_argument('--z', required=True, type=int)
    args = parser.parse_args()
    main(args.stage_prefix, args.record_sha, args.z)
