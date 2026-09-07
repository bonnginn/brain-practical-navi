"""Show every candidate voxel in all three planes without covering its intensity."""
import argparse,json,hashlib
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw
from install_brainstem_three_repair import ROOT,FINAL_SHA
TARGET=ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-cerebellar-islands-8238.bin.gz'
from prepare_brainstem_three_adoption import EVIDENCE,EVIDENCE_SHA,sha
from build_orthogonal_review_bundle import DEFAULT_IMAGE,MAGIC_IMAGE,MAGIC_LABELS,EXPECTED_IMAGE_SHA256,read_browser_volume,_oriented_crop,_outline,PIXEL_TO_VOXEL_FIXED

NAMES=('left-low','right-low','left-inferior','right-inferior')
def main(out):
    out=out.resolve()
    if out.exists() or not out.is_relative_to(ROOT/'work'):raise ValueError('New work output required')
    if sha(EVIDENCE.read_bytes())!=EVIDENCE_SHA:raise ValueError('Wrong point inventory')
    evidence=json.loads(EVIDENCE.read_text(encoding='utf-8'))
    _,_,raw=read_browser_volume(DEFAULT_IMAGE,MAGIC_IMAGE,EXPECTED_IMAGE_SHA256)
    _,_,labels=read_browser_volume(TARGET,MAGIC_LABELS,FINAL_SHA)
    out.mkdir();records=[]
    for item in evidence['components']:
        if item['name'] not in NAMES:continue
        points=np.array(item['points'])
        if len(points)!=16 or not np.all(labels[tuple(points.T)]==27):raise ValueError('Wrong source component')
        lo=points.min(0);hi=points.max(0);crop={'min':(lo-7).tolist(),'max':(hi+7).tolist()}
        selected=np.zeros(labels.shape,dtype=bool);selected[tuple(points.T)]=True;frames=[]
        for k,axis in enumerate('xyz'):
            for index in range(int(lo[k]),int(hi[k])+1):
                r=_oriented_crop(raw,axis,index,crop);s=_oriented_crop(labels,axis,index,crop);m=_oriented_crop(selected,axis,index,crop)
                scale=16;w,h=r.shape[1]*scale,r.shape[0]*scale
                rgb=np.repeat(r[:,:,None],3,axis=2);rgb[_outline(np.isin(s,(28,29)))]=[0,190,230]
                right=Image.fromarray(rgb).resize((w,h),Image.Resampling.NEAREST);draw=ImageDraw.Draw(right)
                for row,col in np.argwhere(m):
                    draw.rectangle((int(col)*scale,int(row)*scale,(int(col)+1)*scale-1,(int(row)+1)*scale-1),outline=(255,180,0),width=2)
                panel=Image.new('RGB',(2*w+12,h+30),'#161616');d=ImageDraw.Draw(panel)
                d.text((3,3),f"{item['name']} {axis.upper()}{index}: raw | cyan cerebellum / outlined candidate voxels",fill='white')
                panel.paste(Image.fromarray(r).convert('RGB').resize((w,h),Image.Resampling.NEAREST),(0,30));panel.paste(right,(w+12,30))
                frames.append((panel,dict(axis=axis,index=index,crop=crop,scale=scale,selectedVoxelCount=int(m.sum()))))
        sheets=[]
        for start in range(0,len(frames),4):
            group=frames[start:start+4];w=max(p.width for p,_ in group);h=max(p.height for p,_ in group);sheet=Image.new('RGB',(2*w,2*h),'#161616')
            for n,(p,_) in enumerate(group):sheet.paste(p,((n%2)*w,(n//2)*h))
            file=out/f"{item['name']}-{start//4:02}.png";sheet.save(file)
            sheets.append(dict(file=file.name,sha256=sha(file.read_bytes()),frames=[m for _,m in group]))
        records.append(dict(name=item['name'],points=points.tolist(),rawValues=raw[tuple(points.T)].tolist(),sheets=sheets))
    report=dict(inputSha256=FINAL_SHA,imageSha256=EXPECTED_IMAGE_SHA256,sourceInventorySha256=EVIDENCE_SHA,mutation=False,adopted=False,expertReviewed=False,pixelToVoxel=PIXEL_TO_VOXEL_FIXED,components=records)
    (out/'report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print('64 voxels; 32 planes; each voxel appears in X/Y/Z, with its raw intensity unobscured.')

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--output',type=Path,required=True);main(p.parse_args().output)
