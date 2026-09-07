"""Current midbrain extent versus cached, source-pinned atlas attribution.

No new labels or threshold-based repair is generated. Tissue classification
is deliberately not treated as a regional midbrain label.
"""
import argparse,hashlib,json
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw
from adopt_remaining_registered_labels import ROOT,FINAL_SHA
# Freeze this historical review at the registration stage, before island removal.
TARGET=ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-brainstem-island-7ebe.bin.gz'
from build_orthogonal_review_bundle import DEFAULT_IMAGE,MAGIC_IMAGE,MAGIC_LABELS,EXPECTED_IMAGE_SHA256,read_browser_volume,_oriented_crop,_outline,PIXEL_TO_VOXEL_FIXED

CACHE=ROOT/'work/anatomy-review/brainstem-official-tissue-v1/sampled-brainstem-classes.npz'
CACHE_SHA='1b11eef82d6931ce3db27c79f80cdb74ec97a2bde02ceeb233c736dd668d22d8'

def read_attribution(shape):
    if hashlib.sha256(CACHE.read_bytes()).hexdigest()!=CACHE_SHA:raise ValueError('Attribution cache changed')
    atlas=np.zeros(shape,dtype=np.uint8)
    with np.load(CACHE,allow_pickle=False) as f:
        points=f['points'];values=f['sourceAtlas']
        if points.shape!=(len(values),3) or not np.issubdtype(points.dtype,np.integer):raise ValueError('Wrong source coordinates')
        if np.any(points<0) or np.any(points>=np.array(shape)):raise ValueError('Source coordinates outside grid')
        atlas[tuple(points.T)]=values
    return atlas

def main(out):
    out=out.resolve()
    if out.exists() or not out.is_relative_to(ROOT/'work'):raise ValueError('New work output required')
    _,dims,raw=read_browser_volume(DEFAULT_IMAGE,MAGIC_IMAGE,EXPECTED_IMAGE_SHA256)
    _,_,labels=read_browser_volume(TARGET,MAGIC_LABELS,FINAL_SHA)
    atlas=read_attribution(dims)
    crop={'min':[155,190,94],'max':[235,265,152]}
    planes=[('z',z) for z in range(100,149)]+[('x',x) for x in [171,179,187,195,203,211,219]]+[('y',y) for y in [205,213,221,229,237,245,253]]
    frames=[];out.mkdir()
    for axis,index in planes:
        r=_oriented_crop(raw,axis,index,crop);s=_oriented_crop(labels,axis,index,crop);a=_oriented_crop(atlas,axis,index,crop)
        rgb=np.repeat(r[:,:,None],3,axis=2)
        rgb[_outline(s==27)]=[255,70,90]
        rgb[_outline(np.isin(a,[26,77]))]=[255,220,0]
        rgb[_outline(np.isin(s,[1,2,3,4]))]=[0,220,255]
        rgb[_outline(np.isin(s,[5,6]))]=[230,100,255]
        w,h=r.shape[1]*3,r.shape[0]*3
        panel=Image.new('RGB',(w*2+12,h+24),'#151515')
        ImageDraw.Draw(panel).text((4,3),f'{axis.upper()}{index}: raw | current brainstem red / source DC yellow / RN-SN cyan / STN purple',fill='white')
        panel.paste(Image.fromarray(r).convert('RGB').resize((w,h),Image.Resampling.NEAREST),(0,24))
        panel.paste(Image.fromarray(rgb).resize((w,h),Image.Resampling.NEAREST),(w+12,24))
        frames.append((panel,dict(axis=axis,index=index,crop=crop)))
    sheets=[]
    for start in range(0,len(frames),4):
        group=frames[start:start+4];w=max(p.width for p,_ in group);h=max(p.height for p,_ in group)
        image=Image.new('RGB',(w*2,h*2),'#151515')
        for n,(p,_) in enumerate(group):image.paste(p,((n%2)*w,(n//2)*h))
        file=out/f'extent-{start//4:02}.png';image.save(file)
        sheets.append(dict(file=file.name,sha256=hashlib.sha256(file.read_bytes()).hexdigest(),frames=[f for _,f in group]))
    report=dict(imageSha256=EXPECTED_IMAGE_SHA256,labelsSha256=FINAL_SHA,sourceAttributionCacheSha256=CACHE_SHA,
        sourceAttribution='Cached sourceAtlas/points from audit_brainstem_tissue_classes.py; whole source DC is not midbrain.',
        frameCount=len(frames),mutation=False,adopted=False,expertReviewed=False,pixelToVoxel=PIXEL_TO_VOXEL_FIXED,sheets=sheets)
    (out/'report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(dict(frames=len(frames),sheets=len(sheets))))

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--output',type=Path,required=True);main(p.parse_args().output)
