"""Read-only topology and raw-image evidence for apparent ventricle holes.

A digital hole is not evidence of missing CSF segmentation. In particular,
foreground holes containing image signal may be tissue that must be retained.
This script never generates a patch, a filled volume or new mesh assets.
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

LABEL_SHA = '098edfbf365016c6c53ccf7b7032258db72a4912378c457d348c01613a4a1694'


def enclosed_masks(mask):
    """Classify digital holes using 6/18/26-connected complement, without edits."""
    mask = np.asarray(mask)
    if mask.dtype != np.bool_ or mask.ndim != 3:
        raise ValueError('Expected a three-dimensional boolean mask')
    return {str(connectivity): ndimage.binary_fill_holes(
        mask, structure=ndimage.generate_binary_structure(3, order)) & ~mask
        for order, connectivity in enumerate((6, 18, 26), start=1)}


def main():
    _, dims, image = read_browser_volume(DEFAULT_IMAGE, MAGIC_IMAGE, EXPECTED_IMAGE_SHA256)
    _, _, labels = read_browser_volume(ROOT/'public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz', MAGIC_LABELS, LABEL_SHA)
    out = ROOT/'work/anatomy-review/ventricle-enclosed-holes-v2'
    out.mkdir(parents=True, exist_ok=True)
    report = dict(imageSha256=EXPECTED_IMAGE_SHA256, labelsSha256=LABEL_SHA,
                  labelMutation=False, adopted=False, anatomicalApproval=False, labels={}, figures=[])
    for label in (23, 24, 25, 26):
        points = np.argwhere(labels == label)
        low = np.maximum(points.min(0)-1, 0)
        high = np.minimum(points.max(0)+2, dims)
        slices = tuple(slice(int(a), int(b)) for a, b in zip(low, high))
        local_labels, local_image = labels[slices], image[slices]
        holes = enclosed_masks(local_labels == label)
        row = dict(holeCounts={k:int(v.sum()) for k,v in holes.items()},
                   encoded255Counts={k:int(np.sum(v & (local_image == 255))) for k,v in holes.items()},
                   nonzeroLabelCounts={k:int(np.sum(v & (local_labels != 0))) for k,v in holes.items()},
                   imageValues6={str(int(k)):int(v) for k,v in zip(*np.unique(local_image[holes['6']],return_counts=True))},
                   components=[])
        # Inspect the largest three stable holes; for right ventricle, also
        # show the largest 6-only hole as an example of diagonal escape.
        chosen = '26' if holes['26'].any() else '6'
        components, count = ndimage.label(holes[chosen])
        sizes = np.bincount(components.ravel())
        for component in sorted(range(1, count+1), key=lambda i:-sizes[i])[:3]:
            p = np.argwhere(components == component)+low
            target = np.zeros(dims, dtype=bool)
            target[tuple(p.T)] = True
            entry = dict(id=int(component), complementConnectivity=int(chosen), count=len(p),
                         minimum=p.min(0).tolist(), maximum=p.max(0).tolist(), planes=[])
            crop = dict(min=np.maximum(p.min(0)-12, 0).tolist(),
                        max=np.minimum(p.max(0)+12, np.array(dims)-1).tolist())
            for a, axis in enumerate('xyz'):
                center = int(np.median(p[:,a]))
                frames = []
                for index in range(center-1, center+2):
                    raw = _oriented_crop(image, axis, index, crop)
                    seg = _oriented_crop(labels, axis, index, crop)
                    selected = _oriented_crop(target, axis, index, crop)
                    rgb = np.repeat(raw[:,:,None], 3, axis=2)
                    rgb[_outline(seg == label)] = [255, 60, 60]
                    rgb[_outline(selected)] = [0, 180, 255]
                    h,w = raw.shape
                    scale = 8
                    frame = Image.new('RGB', (max(w*scale*2+12,480),h*scale+40), '#161616')
                    ImageDraw.Draw(frame).multiline_text((4,3),
                        f'ID{label} / C{component} / {chosen}-connected complement / {axis.upper()}={index}\n'
                        'Raw | red: ventricle; blue: digital hole, NOT adopted CSF', fill='white')
                    for col,data in enumerate((raw,rgb)):
                        frame.paste(Image.fromarray(data).convert('RGB').resize((w*scale,h*scale),Image.Resampling.NEAREST),(col*(w*scale+12),40))
                    frames.append(frame)
                sheet = Image.new('RGB',(frames[0].width,sum(f.height for f in frames)), '#161616')
                for n,frame in enumerate(frames):sheet.paste(frame,(0,n*frame.height))
                name=f'label{label}-component{component}-{axis}.png'
                sheet.save(out/name)
                info=dict(file=name,label=label,component=int(component),axis=axis,
                          indices=list(range(center-1,center+2)),
                          sha256=hashlib.sha256((out/name).read_bytes()).hexdigest())
                report['figures'].append(info);entry['planes'].append(info)
            row['components'].append(entry)
        report['labels'][str(label)]=row
    (out/'report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({key:dict(counts=value['holeCounts'],encoded255=value['encoded255Counts'],
                               renderedComponents=len(value['components'])) for key,value in report['labels'].items()}))


if __name__ == '__main__':
    main()
