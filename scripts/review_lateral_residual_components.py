"""Locate two residual ID24 components in original500 context; no mutation."""
import hashlib
import json
import numpy as np
from scipy import ndimage
from PIL import Image, ImageDraw
from build_orthogonal_review_bundle import ROOT, DEFAULT_LABELS, DEFAULT_IMAGE, MAGIC_LABELS, MAGIC_IMAGE, EXPECTED_IMAGE_SHA256, read_browser_volume, _oriented_crop, _outline

SHA = '7d2b88c3e966b9633571e1d5cfe4d86a99439e2ea7873c672217abd4c235a1f2'
TARGETS = [(116, (241, 247, 105)), (80, (232, 233, 112))]


def main():
    out = ROOT/'work/anatomy-review/lateral-residual116-80-context-v1'
    if out.exists():
        raise ValueError('Preserve evidence')
    _, _, labels = read_browser_volume(DEFAULT_LABELS, MAGIC_LABELS, SHA)
    _, _, raw = read_browser_volume(DEFAULT_IMAGE, MAGIC_IMAGE, EXPECTED_IMAGE_SHA256)
    if labels.shape != raw.shape:
        raise ValueError('Grid mismatch')
    cc, _ = ndimage.label(labels == 24, ndimage.generate_binary_structure(3, 3))
    out.mkdir()
    results = []
    for count, seed in TARGETS:
        ident = int(cc[seed])
        if not ident:
            raise ValueError('Missing component')
        points = np.argwhere(cc == ident)
        if len(points) != count:
            raise ValueError('Changed component')
        chosen = cc == ident
        center = points[np.argmin(np.linalg.norm(points-points.mean(0), axis=1))]
        lo = np.maximum(points.min(0)-24, 0)
        hi = np.minimum(points.max(0)+24, np.array(raw.shape)-1)
        crop = dict(min=lo.tolist(), max=hi.tolist())
        whole = dict(min=[0, 0, 0], max=(np.array(raw.shape)-1).tolist())
        figures = []
        for d, axis in enumerate('xyz'):
            rows = []
            for index in range(int(center[d])-1, int(center[d])+2):
                plane = _oriented_crop(raw, axis, index, crop)
                lab = _oriented_crop(labels, axis, index, crop)
                mask = _oriented_crop(chosen, axis, index, crop)
                plain = np.repeat(plane[:, :, None], 3, axis=2)
                overlay = plain.copy()
                overlay[_outline(lab == 24)] = [0, 170, 210]
                overlay[_outline(mask)] = [255, 70, 100]
                h, w = plane.shape
                row = Image.new('RGB', (max(760, w*6+12), h*3+40), '#181818')
                draw = ImageDraw.Draw(row)
                draw.text((4, 3), f'Raw500 {axis}{index}; ID24 component {count}; LEFT raw / RIGHT label', fill='white')
                draw.text((4, 20), 'Red=selected existing label; cyan=other ID24. No proposed repair.', fill='white')
                for col, picture in enumerate((plain, overlay)):
                    row.paste(Image.fromarray(picture).resize((w*3, h*3), Image.Resampling.NEAREST), (col*(w*3+12), 40))
                rows.append(row)
            sheet = Image.new('RGB', (rows[0].width, sum(r.height for r in rows)))
            y = 0
            for row in rows:
                sheet.paste(row, (0, y)); y += row.height
            path = out/f'component-{count}-{axis}.png'
            sheet.save(path)
            figures.append(dict(path=path.name, axis=axis, indices=list(range(int(center[d])-1, int(center[d])+2)), sha256=hashlib.sha256(path.read_bytes()).hexdigest()))
            plane = _oriented_crop(raw, axis, int(center[d]), whole)
            mask = _oriented_crop(chosen, axis, int(center[d]), whole)
            picture = np.repeat(plane[:, :, None], 3, axis=2)
            picture[mask] = [255, 70, 100]
            image = Image.fromarray(picture).resize((plane.shape[1]*2, plane.shape[0]*2), Image.Resampling.NEAREST)
            draw = ImageDraw.Draw(image)
            draw.text((8, 8), f'Whole raw500 {axis}{center[d]}; red=existing ID24 component {count}', fill='#ff3255')
            yy, xx = np.where(mask)
            draw.rectangle((int(xx.min()*2)-8, int(yy.min()*2)-8, int(xx.max()*2)+8, int(yy.max()*2)+8), outline='#ffcc00', width=2)
            path = out/f'locator-{count}-{axis}.png'
            image.save(path)
            figures.append(dict(path=path.name, axis=axis, locator=True, index=int(center[d]), sha256=hashlib.sha256(path.read_bytes()).hexdigest()))
        results.append(dict(count=count, seed=list(seed), points=points.tolist(), center=center.tolist(), crop=crop, figures=figures))
    report = dict(labelsSha256=SHA, imageSha256=EXPECTED_IMAGE_SHA256, components=results, mutation=False, adopted=False,
                  limitation='Sparse same-grid500 context only. Not all boundary planes; not anatomical approval, exclusion or expansion.')
    (out/'report.json').write_text(json.dumps(report, indent=2)+'\n', encoding='utf-8')
    print(json.dumps([dict(count=r['count'], center=r['center'], figures=len(r['figures'])) for r in results]))


if __name__ == '__main__':
    main()
