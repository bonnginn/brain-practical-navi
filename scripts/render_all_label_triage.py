"""Read-only representative-plane triage; not exhaustive boundary validation."""
import sys, json, hashlib
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from build_orthogonal_review_bundle import (read_browser_volume, DEFAULT_IMAGE, DEFAULT_LABELS,
    MAGIC_IMAGE, MAGIC_LABELS, EXPECTED_IMAGE_SHA256, EXPECTED_LABELS_SHA256, _oriented_crop, _outline)
_, _, image = read_browser_volume(DEFAULT_IMAGE, MAGIC_IMAGE, EXPECTED_IMAGE_SHA256)
_, _, labels = read_browser_volume(DEFAULT_LABELS, MAGIC_LABELS, EXPECTED_LABELS_SHA256)
out = ROOT / 'work/anatomy-review/all-label-triage'
out.mkdir(parents=True, exist_ok=True)
manifest = {'imageSha256': EXPECTED_IMAGE_SHA256, 'labelsSha256': EXPECTED_LABELS_SHA256,
    'policy': 'One maximum-labelled-area plane per axis per occupied label. Not complete extent or adjacent-slice review.',
    'labelMutation': False, 'items': []}
for label in range(1, 41):
    points = np.argwhere(labels == label)
    if not len(points):
        manifest['items'].append({'id': label, 'count': 0})
        continue
    lo = np.maximum(0, points.min(axis=0)-8)
    hi = np.minimum(np.array(labels.shape)-1, points.max(axis=0)+8)
    crop = {'min': lo.tolist(), 'max': hi.tolist()}
    anchors = [int(np.argmax(np.bincount(points[:,a]))) for a in range(3)]
    panels = []
    raw_hashes = []
    for a, axis in enumerate('xyz'):
        raw = _oriented_crop(image, axis, anchors[a], crop)
        seg = _oriented_crop(labels, axis, anchors[a], crop)
        rgb = np.repeat(raw[:,:,None], 3, axis=2)
        rgb[_outline(seg == label)] = (255,70,100)
        scale = min(4, 440/raw.shape[1], 360/raw.shape[0])
        size = (round(raw.shape[1]*scale),round(raw.shape[0]*scale))
        panel = Image.new('RGB',(900,size[1]+26),'#161616')
        ImageDraw.Draw(panel).text((6,6),f'ID {label} {axis.upper()}={anchors[a]} RAW | LABEL OUTLINE',fill='white')
        panel.paste(Image.fromarray(raw).convert('RGB').resize(size,Image.Resampling.NEAREST),(0,26))
        panel.paste(Image.fromarray(rgb).resize(size,Image.Resampling.NEAREST),(450,26))
        panels.append(panel)
        raw_hashes.append(hashlib.sha256(raw.tobytes()).hexdigest())
    sheet = Image.new('RGB',(900,sum(p.height for p in panels)), '#161616')
    top=0
    for p in panels:
        sheet.paste(p,(0,top)); top+=p.height
    name=f'label-{label:02}.png'
    sheet.save(out/name)
    manifest['items'].append({'id':label,'count':int(len(points)),'crop':crop,'anchorsXYZ':anchors,
        'rawPlaneSha256':raw_hashes,'path':name,'pngSha256':hashlib.sha256((out/name).read_bytes()).hexdigest()})
(out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'output':str(out),'occupied':sum(i['count']>0 for i in manifest['items'])}))
