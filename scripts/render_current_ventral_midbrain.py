"""Read-only continuous midbrain review; never generates a segmentation patch."""
import hashlib
import json
import argparse
from PIL import Image, ImageDraw
import numpy as np
from build_orthogonal_review_bundle import (
    ROOT, DEFAULT_LABELS, DEFAULT_IMAGE, MAGIC_LABELS, MAGIC_IMAGE,
    EXPECTED_IMAGE_SHA256, read_browser_volume, _oriented_crop, _outline,
)

LABEL_SHA = 'e7e61a7060c7f1ddfa8106ba659c0488e077495acdd6564862db44663d233ea3'
CROP = {'min':[150,190,98], 'max':[241,261,148]}
OPTIC_CROP = {'min':[155,240,80], 'max':[235,310,130]}

def require_labels_in_crop(labels, crop, ids):
    for label_id in ids:
        points = np.argwhere(labels == label_id)
        if not len(points) or np.any(points < crop['min']) or np.any(points > crop['max']):
            raise ValueError(f'Label {label_id} is absent or outside the review crop')

LAYERS = [([27],[255,75,75]),([1,2],[80,255,255]),
          ([3,4],[250,150,45]),([5,6],[220,100,255]),
          ([25,26],[75,150,255]),([33],[255,230,50]),
          ([39,40],[100,255,130]),([41],[255,120,200]),([15,16],[160,180,255])]

def outlined_labels(raw,labels):
    rgb=np.repeat(raw[:,:,None],3,axis=2)
    for ids,color in LAYERS:
        rgb[_outline(np.isin(labels,ids))]=color
    return rgb

def main(landmark_review=False, lateral_review=False, optic_review=False, optic_detail=False):
    out = ROOT/('work/anatomy-review/optic-orthogonal-continuity-v1' if optic_detail else 'work/anatomy-review/optic-current-continuity-v1' if optic_review else 'work/anatomy-review/midbrain-lateral-anchors-v1' if lateral_review else 'work/anatomy-review/midbrain-landmark-protocol-v1' if landmark_review else 'work/anatomy-review/current-ventral-midbrain-v4')
    out.mkdir(parents=True, exist_ok=False)
    _, _, labels = read_browser_volume(DEFAULT_LABELS, MAGIC_LABELS, LABEL_SHA)
    _, _, raw = read_browser_volume(DEFAULT_IMAGE, MAGIC_IMAGE, EXPECTED_IMAGE_SHA256)
    crop = {'min':[150,170,95], 'max':[241,275,180]} if landmark_review or lateral_review else CROP
    if optic_review or optic_detail:
        crop=OPTIC_CROP
        require_labels_in_crop(labels,crop,[33,39,40])
    aqueduct=np.argwhere(labels==41)
    if not (optic_review or optic_detail) and (not len(aqueduct) or np.any(aqueduct<crop['min']) or np.any(aqueduct>crop['max'])):
        raise ValueError('Partial aqueduct is not fully covered by review crop')
    planes = [('z', z) for z in range(99,148)]
    planes += [('x', x) for x in [175,185,195,205,215]]
    planes += [('y', y) for y in [199,200,201,202,210,220,230,240,250]]
    if landmark_review:
        planes=[('x',x) for x in [170,180,190,196,202,212,222]]
        planes += [('y',y) for y in [210,225,240,255]]
        planes += [('z',z) for z in [130,140,150,160]]
    if lateral_review:
        planes=[('x',x) for x in [158,162,166,169,170,171,221,222,223,226,230,234]]
    if optic_review:
        planes=[('z',z) for z in range(85,124)]
        planes += [('x',x) for x in [175,185,195,205,215,225]]
        planes += [('y',y) for y in [250,260,270,280,290,300]]
    if optic_detail:
        planes=[('x',x) for x in range(183,208)]
        planes += [('y',y) for y in range(268,285)]
    report = dict(labelsSha256=LABEL_SHA,imageSha256=EXPECTED_IMAGE_SHA256,
                  crop=crop,mutation=False,expertReviewed=False,layers=LAYERS,images=[])
    for start in range(0,len(planes),3):
        panels=[]
        for axis,index in planes[start:start+3]:
            r=_oriented_crop(raw,axis,index,crop)
            s=_oriented_crop(labels,axis,index,crop)
            rgb=outlined_labels(r,s)
            w,h=r.shape[1]*3,r.shape[0]*3
            panel=Image.new('RGB',(max(w*2+10,640),h+70),'#171717')
            d=ImageDraw.Draw(panel)
            d.text((4,2),f'{axis.upper()}={index} RAW | current labels; NOT a proposed boundary',fill='white')
            d.text((4,18),'27 red / RN cyan / SN orange / STN purple / 25,26 blue',fill='white')
            d.text((4,34),'33 yellow (mixed) / 39,40 green / 41 pink (partial aqueduct)',fill='white')
            d.text((4,50),'15,16 pale blue: thalami; no inferred midbrain/diencephalon divider',fill='white')
            panel.paste(Image.fromarray(r).convert('RGB').resize((w,h),Image.Resampling.NEAREST),(0,70))
            panel.paste(Image.fromarray(rgb).resize((w,h),Image.Resampling.NEAREST),(w+10,70))
            panels.append(panel)
        sheet=Image.new('RGB',(max(p.width for p in panels),sum(p.height for p in panels)),'#171717')
        y=0
        for panel in panels:
            sheet.paste(panel,(0,y));y+=panel.height
        path=out/f'current-{start//3:02}.png';sheet.save(path)
        report['images'].append(dict(path=path.name,planes=planes[start:start+3],sha256=hashlib.sha256(path.read_bytes()).hexdigest()))
    (out/'report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(dict(planes=len(planes),sheets=len(report['images']),output=str(out))))

if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--landmark-review',action='store_true')
    parser.add_argument('--lateral-review',action='store_true')
    parser.add_argument('--optic-review',action='store_true')
    parser.add_argument('--optic-detail',action='store_true')
    args=parser.parse_args()
    if sum([args.landmark_review,args.lateral_review,args.optic_review,args.optic_detail])>1:parser.error('Choose one review mode')
    main(args.landmark_review,args.lateral_review,args.optic_review,args.optic_detail)
