"""Inspect the historical inferior callosal island on registered300, not a fornix mask."""
import json
import argparse
import hashlib
import numpy as np
from scipy import ndimage
from PIL import Image, ImageDraw
from audit_manual_label_space import SOURCE, load_identity_minc
from render_registered_manual_fine_review import IMAGE_NAME, IMAGE_SHA, encode_image
from build_orthogonal_review_bundle import ROOT, DEFAULT_LABELS, MAGIC_LABELS, read_browser_volume, _oriented_crop, _outline
from build_registered_manual_candidate import nearest_labels
from render_callosal_inferior_component import LABEL_PATH, LABEL_SHA

CURRENT_SHA='d4295e7cc00edd3639b631473445d5db1bb25f9fbe18c5c7f21ff8b8471d7152'


def main(body_series=False, coordinate_details=False, seed_orthogonal=False):
    out=ROOT/'work/anatomy-review/fornix-native300-initial-v1'
    if body_series:out=ROOT/'work/anatomy-review/fornix-native300-body-series-v1'
    if coordinate_details:out=ROOT/'work/anatomy-review/fornix-native300-coordinate-details-v1'
    if seed_orthogonal:out=ROOT/'work/anatomy-review/fornix-native300-seed-orthogonal-v1'
    if out.exists():raise ValueError('Preserve evidence')
    _,dims,old=read_browser_volume(LABEL_PATH,MAGIC_LABELS,LABEL_SHA)
    cc,_=ndimage.label(old==30);target=cc==4;points=np.argwhere(target)
    indices=np.sort(np.ravel_multi_index(points.T,dims,order='F')).astype('<u4')
    if len(points)!=2160 or hashlib.sha256(indices.tobytes()).hexdigest()!='6a4b7677801edf90d45a3b43a409bbe379c13035fe5d99a1e412e8e49b677675':raise ValueError('Historical island differs')
    _,_,labels=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,CURRENT_SHA)
    raw,start,step,history=load_identity_minc(SOURCE/IMAGE_NAME,IMAGE_SHA)
    geometry=json.loads((ROOT/'public/atlas/bigbrain-icbm500-validation.json').read_text())
    affine=np.asarray(geometry['affine']);origin=affine[:3,3];spacing=np.diag(affine)[:3]
    low=np.floor((np.array([177,210,135])*spacing+origin-start)/step).astype(int)
    high=np.ceil((np.array([215,282,200])*spacing+origin-start)/step).astype(int)+1
    if coordinate_details:
        low=np.array([310,400,280]);high=np.array([345,427,321])
    if np.any(low<0) or np.any(high>raw.shape):raise ValueError('Outside source')
    shape=high-low;grid=np.indices(shape).reshape(3,-1).T+low;world=grid*step+start
    projected=nearest_labels(labels,world,origin,spacing).reshape(shape)
    historical=nearest_labels(target.astype(np.uint8),world,origin,spacing).reshape(shape).astype(bool)
    gray=encode_image(raw[tuple(slice(a,b) for a,b in zip(low,high))],geometry['intensityWindow'])
    crop=dict(min=[0,0,0],max=(shape-1).tolist());figures=[];out.mkdir()
    groups=[('x',196),('y',247),('z',174)]
    if body_series:groups=[('y',i) for i in range(405,423,3)]
    if coordinate_details:groups=[('y',i) for i in [405,412,420]]
    if seed_orthogonal:groups=[('x',321),('x',333),('z',296),('z',301)]
    for axis,app_index in groups:
        dim='xyz'.index(axis);center=app_index if body_series or coordinate_details or seed_orthogonal else int(np.rint((app_index*spacing[dim]+origin[dim]-start[dim])/step[dim]));rows=[]
        for index in range(center-1,center+2):
            plane=_oriented_crop(gray,axis,index-int(low[dim]),crop)
            lab=_oriented_crop(projected,axis,index-int(low[dim]),crop)
            mark=_oriented_crop(historical,axis,index-int(low[dim]),crop)
            rgb=np.repeat(plane[:,:,None],3,axis=2);overlay=rgb.copy()
            overlay[_outline(lab==30)]=[255,60,90]
            overlay[mark]=np.rint(.6*overlay[mark]+.4*np.array([0,230,100])).astype(np.uint8)
            h,w=plane.shape;scale=7 if coordinate_details else 3
            margin=38 if coordinate_details else 0
            row=Image.new('RGB',(max(780,2*w*scale+10+margin),h*scale+(64 if coordinate_details else 42)),'#181818')
            ImageDraw.Draw(row).text((4,3),f'Registered300 {axis.upper()}{index}: raw / red current CC, green historical removed island\nGreen is NOT an adopted fornix segmentation. Read-only initial context.',fill='white')
            for col,picture in enumerate([rgb,overlay]):row.paste(Image.fromarray(picture).resize((w*scale,h*scale),Image.Resampling.NEAREST),(margin+col*(w*scale+10),42))
            if coordinate_details:
                draw=ImageDraw.Draw(row)
                for z in range(int(low[2]),int(high[2]),5):draw.text((2,42+(int(high[2])-1-z)*scale),str(z),fill='white')
                for x in range(int(low[0]),int(high[0]),5):draw.text((margin+(x-int(low[0]))*scale,44+h*scale),str(x),fill='white')
                draw.text((margin+w*scale+12,44+h*scale),'Axes: native index X / Z',fill='white')
            rows.append(row)
        sheet=Image.new('RGB',(rows[0].width,sum(r.height for r in rows)));offset=0
        for row in rows:sheet.paste(row,(0,offset));offset+=row.height
        path=out/(f'{axis}-{center}.png' if body_series or coordinate_details or seed_orthogonal else f'{axis}.png');sheet.save(path)
        figures.append(dict(path=path.name,sha256=hashlib.sha256(path.read_bytes()).hexdigest(),axis=axis,nativeIndices=list(range(center-1,center+2))))
    (out/'report.json').write_text(json.dumps(dict(source300Sha256=IMAGE_SHA,currentSha256=CURRENT_SHA,historicalSha256=LABEL_SHA,
        cropExclusive=dict(low=low.tolist(),high=high.tolist()),history=history,figures=figures,mutation=False,visualReviewPending=True,
        bodySeries=body_series,coordinateDetails=coordinate_details,seedOrthogonal=seed_orthogonal,limitation='Local sampling only. Historical exclusion is a locator, not evidence that all its voxels are fornix.'),indent=2)+'\n',encoding='utf-8')
    print(f'Generated {len(groups)} sheets / {3*len(groups)} planes; no labels changed.')


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    group=parser.add_mutually_exclusive_group()
    group.add_argument('--body-series',action='store_true')
    group.add_argument('--coordinate-details',action='store_true')
    group.add_argument('--seed-orthogonal',action='store_true')
    args=parser.parse_args()
    main(args.body_series,args.coordinate_details,args.seed_orthogonal)
