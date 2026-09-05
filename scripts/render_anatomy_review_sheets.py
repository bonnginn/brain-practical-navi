"""Local diagnostic figures from pinned volume data, not edited anatomy.

Raw and label-outline panels use identical voxels and nearest-neighbour display.
No smoothing, interpolation, boundary repair, or public-asset write is performed.
"""
import json
import argparse
import hashlib
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from build_orthogonal_review_bundle import (
    DEFAULT_IMAGE, DEFAULT_LABELS, MAGIC_IMAGE, MAGIC_LABELS,
    EXPECTED_IMAGE_SHA256, EXPECTED_LABELS_SHA256, OUTLINE_COLORS,
    read_browser_volume, _oriented_crop, _outline,
)

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'work/anatomy-review/september-raw-sheets'
CROP = {'min': [175, 235, 99], 'max': [218, 274, 132]}
SECTIONS = {'x': list(range(186, 206)), 'y': list(range(245, 260)), 'z': list(range(106, 123))}

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--optic',action='store_true',help='Inspect the mixed ID33 objective anchors and adjacent slices')
    parser.add_argument('--check',action='store_true',help='Independently compare saved raw panels to source voxels')
    args=parser.parse_args()
    output=OUTPUT if not args.optic else OUTPUT.parent/'september-optic-sheets'
    crop=CROP if not args.optic else {'min':[159,242,82],'max':[232,306,126]}
    sections=SECTIONS if not args.optic else {'x':list(range(185,190)),'y':list(range(260,265)),'z':list(range(112,117))}
    _, _, image = read_browser_volume(DEFAULT_IMAGE, MAGIC_IMAGE, EXPECTED_IMAGE_SHA256)
    _, _, labels = read_browser_volume(DEFAULT_LABELS, MAGIC_LABELS, EXPECTED_LABELS_SHA256)
    if args.check:
        manifest=json.loads((output/'manifest.json').read_text(encoding='utf-8'))
        checked=0
        for entry in manifest['sheets']:
            path=output/entry['path']
            assert hashlib.sha256(path.read_bytes()).hexdigest()==entry['sha256']
            pixels=np.array(Image.open(path).convert('RGB'))
            axis=entry['axis']
            # Coordinate equations independent of _oriented_crop.
            w=crop['max'][1 if axis=='x' else 0]-crop['min'][1 if axis=='x' else 0]+1
            h=crop['max'][1 if axis=='z' else 2]-crop['min'][1 if axis=='z' else 2]+1
            for row,index in enumerate(entry['indices']):
                for v in range(h):
                    for u in range(w):
                        point=(index,crop['min'][1]+u,crop['max'][2]-v) if axis=='x' else ((crop['min'][0]+u,index,crop['max'][2]-v) if axis=='y' else (crop['min'][0]+u,crop['max'][1]-v,index))
                        block=pixels[row*(h*6+28)+24+v*6:row*(h*6+28)+24+(v+1)*6,u*6:(u+1)*6]
                        assert np.all(block==image[point]),(entry['path'],point)
                        checked+=1
        print(json.dumps({'rawVoxelBlocksChecked':checked,'passed':True}))
        return
    output.mkdir(parents=True, exist_ok=True)
    manifest = {'imageSha256': EXPECTED_IMAGE_SHA256, 'labelsSha256': EXPECTED_LABELS_SHA256,
                'crop': crop, 'scale': 6, 'interpolation': 'nearest', 'labelMutation': False,
                'note': 'AI inspection aid; not expert review. Each pair: raw left, outlines right.', 'sheets': []}
    for axis, indices in sections.items():
        # Five consecutive slices per sheet, two columns (raw / outline).
        for start in range(0, len(indices), 5):
            group = indices[start:start+5]
            first = _oriented_crop(image, axis, group[0], crop)
            h, w = first.shape
            sheet = Image.new('RGB', (w*12+24, (h*6+28)*len(group)), '#161616')
            draw = ImageDraw.Draw(sheet)
            for row, index in enumerate(group):
                raw = _oriented_crop(image, axis, index, crop)
                seg = _oriented_crop(labels, axis, index, crop)
                outlined = np.repeat(raw[:, :, None], 3, axis=2)
                for label, colour in OUTLINE_COLORS.items():
                    outlined[_outline(seg == label)] = colour
                top = row*(h*6+28)
                draw.text((4, top+4), f'{axis.upper()}={index}: RAW | 27 green, 33 amber, 39 blue, 40 pink', fill='white')
                for col, pixels in enumerate([raw, outlined]):
                    panel=Image.fromarray(pixels).convert('RGB').resize((w*6,h*6),Image.Resampling.NEAREST)
                    sheet.paste(panel,(col*(w*6+12),top+24))
            name=f'{axis}-{group[0]}-{group[-1]}.png'
            sheet.save(output/name)
            manifest['sheets'].append({'path': name, 'axis': axis, 'indices': group,
                                       'sha256': hashlib.sha256((output/name).read_bytes()).hexdigest()})
    (output/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'output':str(output),'sheets':len(manifest['sheets'])}))

if __name__ == '__main__':
    main()
