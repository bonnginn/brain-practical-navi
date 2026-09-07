"""Read-only registered 300um context with CURRENT app-label outlines; no transfer."""
import hashlib
import json
import numpy as np
from PIL import Image, ImageDraw
from render_medullary_native300 import (SOURCE, load_identity_minc, IMAGE_NAME, IMAGE_SHA,
    fine_box, encode_image, nearest_labels, ROOT, DEFAULT_LABELS, MAGIC_LABELS,
    read_browser_volume, _oriented_crop, _outline)

LABEL_SHA='58d8044071bd0b638bfdbbcc309c35ac3301a9c8f449b8ebcc5b77e5435cfae7'
CENTER=[244,240,151]
COLORS={12:[255,60,90],14:[70,220,255],10:[240,200,30],32:[40,220,100]}
digest=lambda data: hashlib.sha256(data).hexdigest()


def select_planes(affine,start,step):
    affine=np.asarray(affine,dtype=float);start=np.asarray(start,dtype=float);step=np.asarray(step,dtype=float)
    if affine.shape != (4,4) or start.shape != (3,) or step.shape != (3,) or not np.isfinite(np.r_[affine.ravel(),start,step]).all() or np.any(step <= 0):
        raise ValueError('Invalid geometry')
    if not np.allclose(affine[:3,:3],np.diag(np.diag(affine)[:3])) or np.any(np.diag(affine)[:3] <= 0) or not np.array_equal(affine[3],[0,0,0,1]):
        raise ValueError('Expected positive axis-aligned scientific affine')
    center=np.rint(((affine @ np.r_[CENTER,1])[:3]-start)/step).astype(int)
    yends=[int(np.rint(((affine @ [CENTER[0],y,CENTER[2],1])[1]-start[1])/step[1])) for y in [232,246]]
    planes={(axis,int(center[k]+delta)) for k,axis in enumerate('xyz') for delta in [-1,0,1]}
    planes.update(('y',i) for i in range(yends[0],yends[1]+1))
    return sorted(planes),yends


def render_row(gray,projected,axis,index,low):
    crop=dict(min=[0,0,0],max=(np.array(gray.shape)-1).tolist())
    local=index-int(low['xyz'.index(axis)])
    a=_oriented_crop(gray,axis,local,crop);lab=_oriented_crop(projected,axis,local,crop)
    rgb=np.repeat(a[:,:,None],3,axis=2)
    for value,color in COLORS.items(): rgb[_outline(lab == value)]=color
    scale=4; w=a.shape[1]*scale;h=a.shape[0]*scale
    row=Image.new('RGB',(2*w+12,h+64),'#181818');draw=ImageDraw.Draw(row)
    lines=[f'{axis.upper()} global index {index} | app center {CENTER}',
           'Registered300 raw (left) / current500 outlines (right)',
           'ID12 red / ID14 cyan / ID10 gold / ID32 green',
           'Context only; no boundary decision or new label transfer.']
    for n,line in enumerate(lines):
        if draw.textbbox((0,0),line)[2] > row.width-8: raise ValueError('Caption does not fit')
        draw.text((4,2+15*n),line,fill='white')
    row.paste(Image.fromarray(a).convert('RGB').resize((w,h),Image.Resampling.NEAREST),(0,64))
    row.paste(Image.fromarray(rgb).resize((w,h),Image.Resampling.NEAREST),(w+12,64))
    return row,dict(axis=axis,globalIndex=index,rawEncodedPixelSha256=digest(a.tobytes()),
                    projectedLabelPixelSha256=digest(lab.tobytes()),overlayPixelSha256=digest(rgb.tobytes()),
                    planeShape=list(a.shape),scale=scale,rawPanelXY=[0,64],overlayPanelXY=[w+12,64])


def main():
    out=ROOT/'work/anatomy-review/pallidal-current300-v1'
    if out.exists(): raise ValueError('Evidence exists; preserve immutable report')
    raw,start,step,history=load_identity_minc(SOURCE/IMAGE_NAME,IMAGE_SHA)
    _,_,labels=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,LABEL_SHA)
    geometry_path=ROOT/'public/atlas/bigbrain-icbm500-validation.json'
    geometry_bytes=geometry_path.read_bytes();geometry=json.loads(geometry_bytes)
    affine=np.array(geometry['affine']);app_start=affine[:3,3];app_step=np.diag(affine)[:3]
    selections,yends=select_planes(affine,start,step)
    low,high,center=fine_box((affine @ np.r_[CENTER,1])[:3],start,step,raw.shape,radius_mm=9)
    shape=tuple(high-low);pts=np.indices(shape).reshape(3,-1).T+low
    projected=nearest_labels(labels,pts*step+start,app_start,app_step).reshape(shape)
    native=raw[tuple(slice(int(a),int(b)) for a,b in zip(low,high))]
    gray=encode_image(native,geometry['intensityWindow'])
    report=dict(source300Sha256=IMAGE_SHA,labels500Sha256=LABEL_SHA,sourceHistory=history,
        sourcePath=(SOURCE/IMAGE_NAME).relative_to(ROOT).as_posix(),sourceStart=start.tolist(),sourceStep=step.tolist(),
        appAffine=affine.tolist(),geometrySha256=digest(geometry_bytes),intensityWindow=geometry['intensityWindow'],
        appCenter=CENTER,radiusMm=9,registeredCenter=center.tolist(),registeredCropExclusive=dict(low=low.tolist(),high=high.tolist()),
        coronalAppYInclusive=[232,246],coronalRegisteredYInclusive=yends,outlineColors=COLORS,
        rawCropPixelSha256=digest(native.tobytes()),rawCropDtype=str(native.dtype),
        method='Registered original 300um image; current app labels nearest-neighbor projected via scientific affine for context only.',
        mutation=False,adopted=False,expertReviewed=False,visualReviewPending=True,figures=[])
    out.mkdir(parents=True)
    for first in range(0,len(selections),3):
        rows=[];records=[];offset=0
        for axis,index in selections[first:first+3]:
            row,record=render_row(gray,projected,axis,index,low)
            record['sheetRowY']=offset;records.append(record);rows.append(row);offset+=row.height
        sheet=Image.new('RGB',(max(r.width for r in rows),offset),'#181818');offset=0
        for row in rows: sheet.paste(row,(0,offset));offset+=row.height
        target=out/f'planes-{first//3:02d}.png';sheet.save(target)
        report['figures'].append(dict(path=target.name,sha256=digest(target.read_bytes()),pixelSha256=digest(np.asarray(sheet).tobytes()),planes=records))
    if digest(DEFAULT_LABELS.read_bytes()) != LABEL_SHA: raise ValueError('Labels changed during review generation')
    report['planeCount']=len(selections)
    (out/'report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(f'{len(report["figures"])} sheets / {len(selections)} planes; no mutation; visual review pending')


if __name__ == '__main__': main()
