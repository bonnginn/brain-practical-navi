"""Read-only detailed pallidal image review, not a segmentation proposal.

All occupied sagittal/coronal planes plus adjacent end planes are rendered.
The additional horizontal planes target the previously noted superior edge;
they do not replace the earlier full-Z review. No thresholds remove tissue.
"""
import hashlib
import json
import numpy as np
from PIL import Image, ImageDraw
from build_orthogonal_review_bundle import (
    ROOT, DEFAULT_IMAGE, DEFAULT_LABELS, MAGIC_IMAGE, MAGIC_LABELS,
    EXPECTED_IMAGE_SHA256, read_browser_volume, _oriented_crop, _outline,
    PIXEL_TO_VOXEL_FIXED,
)

LABEL_SHA = '098edfbf365016c6c53ccf7b7032258db72a4912378c457d348c01613a4a1694'
OLD_SHA = 'b75a24903ec08526b3e7f08df9efc8cee15af80d86bb96a821260913a2b176f3'
COUNTS = {11: 14098, 12: 13932, 13: 5906, 14: 6009}


def review_planes(points, dims):
    points = np.asarray(points)
    if points.ndim != 2 or points.shape[1] != 3 or len(points) == 0:
        raise ValueError('Expected nonempty XYZ points')
    if not np.issubdtype(points.dtype, np.integer) or np.any(points < 0) or np.any(points >= np.asarray(dims)):
        raise ValueError('Expected in-bounds integer voxel coordinates')
    result = []
    for a, axis in enumerate('xy'):
        result += [(axis, i) for i in range(max(0, int(points[:, a].min())-1),
                                           min(dims[a], int(points[:, a].max())+2))]
    result += [('z', z) for z in range(147, min(161, dims[2]))]
    return result


def reference_crop(volume, axis, index, crop):
    """Direct voxel addressing, independent of the rendering crop helper."""
    horizontal, vertical = {'x': (1, 2), 'y': (0, 2), 'z': (0, 1)}[axis]
    cols = np.arange(crop['min'][horizontal], crop['max'][horizontal]+1)
    rows = np.arange(crop['max'][vertical], crop['min'][vertical]-1, -1)
    col_grid, row_grid = np.meshgrid(cols, rows)
    coordinate = [None, None, None]
    coordinate['xyz'.index(axis)] = np.full(col_grid.shape, index)
    coordinate[horizontal] = col_grid
    coordinate[vertical] = row_grid
    return volume[tuple(coordinate)]


def check_raw_panels(raw, report, out):
    checked = 0
    for figure in report['figures']:
        path = out/figure['file']
        if hashlib.sha256(path.read_bytes()).hexdigest() != figure['sha256']:
            raise ValueError('Figure digest mismatch')
        sheet = np.asarray(Image.open(path).convert('RGB'))
        offset = 0
        for frame in figure['frames']:
            expected = reference_crop(raw, figure['axis'], frame['index'], figure['crop'])
            if hashlib.sha256(expected.tobytes()).hexdigest() != frame['rawPixelSha256']:
                raise ValueError('Raw coordinate digest mismatch')
            h, w = expected.shape
            scale = figure['scale']
            enlarged = np.repeat(np.repeat(expected, scale, 0), scale, 1)
            observed = sheet[offset+43:offset+43+h*scale, :w*scale]
            if not np.array_equal(observed, np.repeat(enlarged[:, :, None], 3, 2)):
                raise ValueError('Saved raw panel does not match the source voxels')
            checked += h*w
            offset += h*scale+43
    return checked


def main():
    _, dims, raw = read_browser_volume(DEFAULT_IMAGE, MAGIC_IMAGE, EXPECTED_IMAGE_SHA256)
    _, _, labels = read_browser_volume(DEFAULT_LABELS, MAGIC_LABELS, LABEL_SHA)
    _, _, before = read_browser_volume(
        ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-classification-b75a.bin.gz',
        MAGIC_LABELS, OLD_SHA)
    pallidal = np.isin(labels, list(COUNTS))
    old_pallidal = np.isin(before, list(COUNTS))
    if not np.array_equal(pallidal, old_pallidal) or not np.array_equal(labels[pallidal], before[old_pallidal]):
        raise ValueError('Manual pallidal labels changed since the first full-Z review')
    if {i: int(np.sum(labels == i)) for i in COUNTS} != COUNTS:
        raise ValueError('Unexpected pallidal counts')
    out = ROOT/'work/anatomy-review/pallidal-boundary-v1'
    out.mkdir(parents=True, exist_ok=True)
    report = dict(imageSha256=EXPECTED_IMAGE_SHA256, labelsSha256=LABEL_SHA,
                  earlierFullZLabelSha256=OLD_SHA, pallidalLabelsUnchanged=True,
                  labelMutation=False, adopted=False, reviewStatus='unreviewed',
                  pixelToVoxel=PIXEL_TO_VOXEL_FIXED, counts=COUNTS, sides={}, figures=[], locators=[])
    for side, ids in [('left', (11, 13, 9, 31)), ('right', (12, 14, 10, 32))]:
        points = np.argwhere(np.isin(labels, ids[:2]))
        crop = dict(min=np.maximum(points.min(0)-12, 0).tolist(),
                    max=np.minimum(points.max(0)+12, np.asarray(dims)-1).tolist())
        planes = review_planes(points, dims)
        report['sides'][side] = dict(ids=list(ids), crop=crop,
                                    occupiedMin=points.min(0).tolist(), occupiedMax=points.max(0).tolist(),
                                    planeCount=len(planes))
        for axis in 'xyz':
            frames = []
            for _, index in (p for p in planes if p[0] == axis):
                image = _oriented_crop(raw, axis, index, crop)
                seg = _oriented_crop(labels, axis, index, crop)
                rgb = np.repeat(image[:, :, None], 3, axis=2)
                for label, color in zip(ids, ((255, 60, 85), (40, 215, 255), (255, 195, 40), (60, 210, 100))):
                    rgb[_outline(seg == label)] = color
                h, w = image.shape
                scale = 4
                frame = Image.new('RGB', (max(w*scale*2+12, 680), h*scale+43), '#151515')
                ImageDraw.Draw(frame).multiline_text((4, 3),
                    f'{side} {axis.upper()}={index} RAW | GPe red, GPi cyan, putamen gold, provisional IC green\n'
                    'Existing labels, no correction; manual provenance is not voxel-level certainty', fill='white')
                for col, data in enumerate((image, rgb)):
                    frame.paste(Image.fromarray(data).convert('RGB').resize((w*scale, h*scale), Image.Resampling.NEAREST),
                                (col*(w*scale+12), 43))
                info = dict(index=index, rawPixelSha256=hashlib.sha256(image.tobytes()).hexdigest(),
                            counts={i: int(np.sum(seg == i)) for i in ids})
                frames.append((info, frame))
            for start in range(0, len(frames), 3):
                group = frames[start:start+3]
                sheet = Image.new('RGB', (group[0][1].width, sum(f.height for _, f in group)), '#151515')
                offset = 0
                for _, frame in group:
                    sheet.paste(frame, (0, offset)); offset += frame.height
                name = f'{side}-{axis}-{group[0][0]["index"]}-{group[-1][0]["index"]}.png'
                sheet.save(out/name)
                report['figures'].append(dict(file=name, side=side, axis=axis, crop=crop, scale=4,
                    frames=[info for info, _ in group], sha256=hashlib.sha256((out/name).read_bytes()).hexdigest()))
    # These boxes locate an uncertain boundary, not a deletion mask or a
    # proposed anatomical compartment. The left image keeps whole-brain context.
    review_box = dict(min=[236, 228, 140], max=[253, 253, 161])
    whole_box = dict(min=[0, 0, 0], max=(np.asarray(dims)-1).tolist())
    for axis, index in [('x', 244), ('y', 240), ('z', 151)]:
        whole = Image.fromarray(_oriented_crop(raw, axis, index, whole_box)).convert('RGB')
        draw = ImageDraw.Draw(whole)
        horizontal, vertical = {'x': (1, 2), 'y': (0, 2), 'z': (0, 1)}[axis]
        draw.rectangle((review_box['min'][horizontal], dims[vertical]-1-review_box['max'][vertical],
                        review_box['max'][horizontal], dims[vertical]-1-review_box['min'][vertical]),
                       outline=(255, 210, 30), width=2)
        image = _oriented_crop(raw, axis, index, review_box)
        seg = _oriented_crop(labels, axis, index, review_box)
        color = np.repeat(image[:, :, None], 3, axis=2)
        color[_outline(seg == 12)] = [255, 60, 85]
        h, w = image.shape
        sheet = Image.new('RGB', (max(whole.width+w*16+36, 780), max(whole.height, h*8)+65), '#151515')
        ImageDraw.Draw(sheet).multiline_text((5, 5),
            f'Right posterior/superior pallidal boundary: {axis.upper()}={index}\n'
            'Whole location (yellow box) | local RAW | current GPe red\n'
            'Review area only, NOT a proposed removal. No boundary change adopted.', fill='white')
        sheet.paste(whole, (0, 65))
        for col, data in enumerate((image, color)):
            sheet.paste(Image.fromarray(data).convert('RGB').resize((w*8, h*8), Image.Resampling.NEAREST),
                        (whole.width+12+col*(w*8+12), 65))
        name = f'right-posterior-locator-{axis}.png'
        sheet.save(out/name)
        report['locators'].append(dict(file=name, axis=axis, index=index, reviewBox=review_box,
                                      sha256=hashlib.sha256((out/name).read_bytes()).hexdigest()))
    report['rawPanelVerification'] = dict(
        verified=True, planes=sum(len(f['frames']) for f in report['figures']),
        sourcePixelBlocks=check_raw_panels(raw, report, out),
        scope='Raw panels in all detailed sheets only; not anatomical correctness or locator validation')
    (out/'report.json').write_text(json.dumps(report, indent=2)+'\n', encoding='utf-8')
    print(json.dumps(dict(sides=report['sides'], sheets=len(report['figures']))))


if __name__ == '__main__':
    main()
