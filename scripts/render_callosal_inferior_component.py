"""Read-only complete orthogonal evidence for the fixed inferior ID30 island.

Component number 4 belongs only to the pinned 8cc65e volume. Neither its
connectivity nor its shape identifies it as fornix or authorizes relabelling.
"""
import hashlib
import json

import numpy as np
from scipy import ndimage
from PIL import Image, ImageDraw

from build_orthogonal_review_bundle import (
    ROOT, DEFAULT_IMAGE, MAGIC_IMAGE, MAGIC_LABELS, EXPECTED_IMAGE_SHA256,
    read_browser_volume, _oriented_crop, _outline,
)

LABEL_SHA = '8cc65edf36e1e3a420168bfb663d6440418dd67189808263d11c180c4b403d16'
LABEL_PATH = ROOT/'public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz'


def frame(raw, labels, target, axis, index, crop, scale):
    image = _oriented_crop(raw, axis, index, crop)
    seg = _oriented_crop(labels, axis, index, crop)
    selected = _oriented_crop(target, axis, index, crop)
    rgb = np.repeat(image[:, :, None], 3, axis=2)
    rgb[_outline(seg == 30)] = [255, 50, 70]
    rgb[selected] = np.rint(.45*rgb[selected]+.55*np.array([0, 220, 70])).astype(np.uint8)
    height, width = image.shape
    result = Image.new('RGB', (width*scale*2+10, height*scale+40), '#151515')
    ImageDraw.Draw(result).multiline_text(
        (4, 3), f'{axis.upper()}={index} | Raw / ID30 red; fixed inferior island green\n'
        'Read-only evidence; not an anatomical identification or adopted repair',
        fill='white', spacing=3,
    )
    for col, data in enumerate((image, rgb)):
        result.paste(Image.fromarray(data).convert('RGB').resize(
            (width*scale, height*scale), Image.Resampling.NEAREST),
            (col*(width*scale+10), 40))
    return result


def main():
    _, dims, raw = read_browser_volume(DEFAULT_IMAGE, MAGIC_IMAGE, EXPECTED_IMAGE_SHA256)
    _, _, labels = read_browser_volume(LABEL_PATH, MAGIC_LABELS, LABEL_SHA)
    cc, _ = ndimage.label(labels == 30)
    target = cc == 4
    points = np.argwhere(target)
    if (len(points) != 2160 or points.min(0).tolist() != [187, 219, 147]
            or points.max(0).tolist() != [204, 274, 180]):
        raise ValueError('Fixed inferior component identity changed')
    indices = np.sort(np.ravel_multi_index(points.T, dims, order='F')).astype('<u4')
    out = ROOT/'work/anatomy-review/callosal-inferior-component-v1'
    out.mkdir(parents=True, exist_ok=True)
    report = dict(imageSha256=EXPECTED_IMAGE_SHA256, labelsSha256=LABEL_SHA,
                  component=4, count=len(points), minimum=points.min(0).tolist(),
                  maximum=points.max(0).tolist(),
                  indicesSha256=hashlib.sha256(indices.tobytes()).hexdigest(),
                  adopted=False, labelMutation=False, figures=[], locators=[])
    crop = dict(min=(points.min(0)-16).tolist(), max=(points.max(0)+16).tolist())
    for a, axis in enumerate('xyz'):
        frames = [(index, frame(raw, labels, target, axis, index, crop, 3))
                  for index in range(int(points[:, a].min())-1, int(points[:, a].max())+2)]
        for start in range(0, len(frames), 5):
            group = frames[start:start+5]
            sheet = Image.new('RGB', (group[0][1].width, sum(f.height for _, f in group)), '#151515')
            for row, (_, view) in enumerate(group):
                sheet.paste(view, (0, row*view.height))
            name = f'{axis}-{group[0][0]}-{group[-1][0]}.png'
            sheet.save(out/name)
            report['figures'].append(dict(file=name, axis=axis, indices=[i for i, _ in group],
                                         sha256=hashlib.sha256((out/name).read_bytes()).hexdigest()))
        # Choose an actually occupied plane with maximal component cross-section.
        plane_counts = np.bincount(points[:, a], minlength=dims[a])
        index = int(plane_counts.argmax())
        full = dict(min=[0, 0, 0], max=(np.array(dims)-1).tolist())
        name = f'locator-{axis}-{index}.png'
        frame(raw, labels, target, axis, index, full, 1).save(out/name)
        report['locators'].append(dict(file=name, axis=axis, index=index,
                                      sha256=hashlib.sha256((out/name).read_bytes()).hexdigest()))
    (out/'report.json').write_text(json.dumps(report, indent=2)+'\n', encoding='utf-8')
    print(json.dumps(dict(count=len(points), sheets=len(report['figures']),
                          planes=sum(len(f['indices']) for f in report['figures']),
                          locators=report['locators'])))


if __name__ == '__main__':
    main()
