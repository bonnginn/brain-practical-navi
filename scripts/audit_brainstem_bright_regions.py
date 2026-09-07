"""Read-only triage of saturated-image regions inside ID27; no threshold repair."""
import argparse,json,hashlib
from pathlib import Path
import numpy as np
from scipy.ndimage import label,find_objects
from PIL import Image,ImageDraw
from build_orthogonal_review_bundle import ROOT,DEFAULT_LABELS,DEFAULT_IMAGE,MAGIC_LABELS,MAGIC_IMAGE,read_browser_volume,EXPECTED_IMAGE_SHA256,_oriented_crop,_outline,PIXEL_TO_VOXEL_FIXED
SOURCE_SHA='732bdf1996109926c516d5114d8861e338f22c414ec80804b7cd096885a25ef2'
SOURCE=ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-inferior-support-732b.bin.gz'
sha=lambda b:hashlib.sha256(b).hexdigest()

def main(out,component=None,cerebellum=False,label_sha=None):
    out=out.resolve()
    if out.exists() or not out.is_relative_to(ROOT/'work'):raise ValueError('New work output required')
    source,source_sha,target_ids=SOURCE,SOURCE_SHA,[27]
    if cerebellum:
        from audit_nerve_origin_context import LABEL_SHA
        source,source_sha,target_ids=DEFAULT_LABELS,LABEL_SHA,[28,29]
    if label_sha is not None:
        if not cerebellum or len(label_sha)!=64 or any(c not in '0123456789abcdef' for c in label_sha):
            raise ValueError('Explicit lowercase SHA256 requires current cerebellum input')
        source_sha=label_sha
    target_name='ID28/29' if cerebellum else 'ID27'
    _,_,seg=read_browser_volume(source,MAGIC_LABELS,source_sha)
    _,_,raw=read_browser_volume(DEFAULT_IMAGE,MAGIC_IMAGE,EXPECTED_IMAGE_SHA256)
    target_mask=np.isin(seg,target_ids)
    regions,n=label(target_mask&(raw==255));counts=np.bincount(regions.ravel());boxes=find_objects(regions)
    inventory=[]
    for i,box in enumerate(boxes,1):
        inventory.append(dict(component=i,count=int(counts[i]),min=[s.start for s in box],max=[s.stop-1 for s in box]))
    inventory.sort(key=lambda c:(-c['count'],c['component']));out.mkdir();rendered=[]
    selected=inventory[:4] if component is None else [c for c in inventory if c['component']==component]
    if not selected:raise ValueError('Unknown component')
    for item in selected:
        mask=regions==item['component'];pts=np.argwhere(mask);lo=pts.min(0);hi=pts.max(0)
        crop={'min':np.maximum(0,lo-20).tolist(),'max':np.minimum(np.array(seg.shape)-1,hi+20).tolist()}
        frames=[]
        planes=[]
        for k,axis in enumerate('xyz'):
            values=np.unique(pts[:,k])
            indices=[int(values[len(values)//2])] if component is None else range(max(0,int(lo[k])-1),min(seg.shape[k],int(hi[k])+2))
            planes.extend((axis,index) for index in indices)
        for axis,index in planes:
            r=_oriented_crop(raw,axis,index,crop);s=_oriented_crop(seg,axis,index,crop);m=_oriented_crop(mask,axis,index,crop)
            rgb=np.repeat(r[:,:,None],3,axis=2);rgb[_outline(np.isin(s,target_ids))]=[255,70,90];rgb[_outline(m)]=[0,210,255]
            w,h=r.shape[1]*4,r.shape[0]*4;p=Image.new('RGB',(w*2+12,h+40),'#161616');d=ImageDraw.Draw(p)
            d.text((4,3),f"{target_name} bright-region {item['component']} ({item['count']} voxels) {axis.upper()}{index}",fill='white')
            d.text((4,20),f'raw | red {target_name}; cyan triage subset; NOT a repair or tissue classification',fill='white')
            p.paste(Image.fromarray(r).convert('RGB').resize((w,h),Image.Resampling.NEAREST),(0,40));p.paste(Image.fromarray(rgb).resize((w,h),Image.Resampling.NEAREST),(w+12,40))
            frames.append((p,dict(axis=axis,index=index,crop=crop)))
        for start in range(0,len(frames),4):
            group=frames[start:start+4];w=max(p.width for p,_ in group);h=max(p.height for p,_ in group);sheet=Image.new('RGB',(w*2,h*2),'#161616')
            for j,(p,_) in enumerate(group):sheet.paste(p,((j%2)*w,(j//2)*h))
            file=out/(f"region-{item['component']}.png" if component is None else f"region-{item['component']}-{start//4:02}.png");sheet.save(file)
            rendered.append(dict(**item,file=file.name,sha256=sha(file.read_bytes()),frames=[f for _,f in group]))
    report=dict(sourceSha256=source_sha,imageSha256=EXPECTED_IMAGE_SHA256,brainstemVoxelCount=int((seg==27).sum()),targetIds=target_ids,targetVoxelCount=int(target_mask.sum()),brightVoxelCount=int(counts[1:].sum()),componentCount=n,inventory=inventory,rendered=rendered,pixelToVoxel=PIXEL_TO_VOXEL_FIXED,mutation=False,expertReviewed=False,warning='Saturation may represent space, missing image support or tissue artifacts. No automatic relabeling; representative planes are not full boundary review.')
    (out/'report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:report[k] for k in ('brightVoxelCount','componentCount','rendered')},indent=2))

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--output',type=Path,required=True);p.add_argument('--component',type=int);p.add_argument('--cerebellum',action='store_true');p.add_argument('--label-sha',help='Explicit current input SHA; historical default remains pinned');args=p.parse_args();main(args.output,args.component,args.cerebellum,args.label_sha)
