"""Read-only complete local orthogonal review of two remaining ID27 islands."""
import argparse,hashlib,json
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw
from install_brainstem_island_repair import ROOT,FINAL_SHA
TARGET=ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-paired-islands-c58f.bin.gz'
from prepare_fourth_ventricle_candidate import component
from build_orthogonal_review_bundle import DEFAULT_IMAGE,MAGIC_IMAGE,MAGIC_LABELS,EXPECTED_IMAGE_SHA256,read_browser_volume,_oriented_crop,_outline,PIXEL_TO_VOXEL_FIXED

def main(out,remaining=False,context=False):
    out=out.resolve()
    if out.exists() or not out.is_relative_to(ROOT/'work'):raise ValueError('New work directory required')
    _,_,raw=read_browser_volume(DEFAULT_IMAGE,MAGIC_IMAGE,EXPECTED_IMAGE_SHA256)
    source=TARGET;source_sha=FINAL_SHA
    seeds=[('left',(175,201,133),8),('right',(215,201,133),8)]
    if remaining or context:
        from install_brainstem_paired_repair import FINAL_SHA as current_sha
        source=ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-three-islands-189f.bin.gz';source_sha=current_sha
        seeds=[('left-low',(155,205,81),16),('left-inferior',(163,191,51),16),
               ('left-posterior',(163,231,91),8),('left-upper',(173,215,111),6),
               ('mid-low',(195,239,73),16),('mid-upper',(195,253,109),11),
               ('right-inferior',(227,191,51),16),('right-posterior',(227,231,91),8),
               ('right-low',(235,205,81),16)]
        if context:seeds=[s for s in seeds if s[0] not in ('left-posterior','right-posterior','mid-upper')]
    _,_,labels=read_browser_volume(source,MAGIC_LABELS,source_sha)
    out.mkdir();records=[]
    for name,seed,count in seeds:
        points=np.array(component(labels==27,seed))
        if len(points)!=count:raise ValueError('Island changed: '+name)
        lo=points.min(0);hi=points.max(0)
        mask=np.zeros(labels.shape,dtype=bool);mask[tuple(points.T)]=True
        pad=40 if context else 16
        crop={'min':np.maximum(lo-pad,0).tolist(),'max':np.minimum(hi+pad+1,np.array(labels.shape)-1).tolist()}
        frames=[]
        for k,axis in enumerate('xyz'):
            indices=[int((lo[k]+hi[k])//2)] if context else range(int(lo[k])-1,int(hi[k])+2)
            for index in indices:
                r=_oriented_crop(raw,axis,index,crop);s=_oriented_crop(labels,axis,index,crop);m=_oriented_crop(mask,axis,index,crop)
                rgb=np.repeat(r[:,:,None],3,axis=2);rgb[_outline(s==27)]=[255,70,90];rgb[m]=[255,220,0]
                if context:rgb[_outline(np.isin(s,(28,29)))]=[0,200,240];rgb[m]=[255,220,0]
                scale=3 if context else 5
                w,h=r.shape[1]*scale,r.shape[0]*scale
                panel=Image.new('RGB',(w*2+12,h+28),'#151515')
                ImageDraw.Draw(panel).text((3,3),f'{name} {axis.upper()}{index}: raw | red 27, cyan 28/29, yellow island' if context else f'{name} {axis.upper()}{index}: raw | red ID27, yellow island',fill='white')
                panel.paste(Image.fromarray(r).convert('RGB').resize((w,h),Image.Resampling.NEAREST),(0,28))
                panel.paste(Image.fromarray(rgb).resize((w,h),Image.Resampling.NEAREST),(w+12,28))
                frames.append((panel,dict(axis=axis,index=index,crop=crop)))
        sheets=[]
        for start in range(0,len(frames),4):
            group=frames[start:start+4];w=max(p.width for p,_ in group);h=max(p.height for p,_ in group)
            sheet=Image.new('RGB',(w*2,h*2),'#151515')
            for n,(p,_) in enumerate(group):sheet.paste(p,((n%2)*w,(n//2)*h))
            f=out/f'{name}-{start//4:02}.png';sheet.save(f)
            sheets.append(dict(file=f.name,sha256=hashlib.sha256(f.read_bytes()).hexdigest(),frames=[m for _,m in group]))
        records.append(dict(name=name,points=points.tolist(),rawValues=raw[tuple(points.T)].tolist(),sheets=sheets))
    report=dict(inputSha256=source_sha,imageSha256=EXPECTED_IMAGE_SHA256,mutation=False,adopted=False,expertReviewed=False,pixelToVoxel=PIXEL_TO_VOXEL_FIXED,components=records)
    (out/'report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(f'{len(records)} components; '+str(sum(len(s['frames']) for r in records for s in r['sheets']))+' local orthogonal comparisons; no label changes')

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--output',type=Path,required=True);p.add_argument('--remaining',action='store_true');p.add_argument('--context',action='store_true');args=p.parse_args();main(args.output,args.remaining,args.context)
