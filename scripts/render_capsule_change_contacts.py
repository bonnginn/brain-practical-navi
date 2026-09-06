"""Full-resolution raw-voxel contact sheets for every affected capsule Z."""
import json
import hashlib
import numpy as np
from PIL import Image, ImageDraw
from build_orthogonal_review_bundle import (ROOT,DEFAULT_IMAGE,MAGIC_IMAGE,MAGIC_LABELS,
    EXPECTED_IMAGE_SHA256,read_browser_volume,_oriented_crop,_outline)
from prepare_fourth_ventricle_candidate import DEFAULT_LABELS, EXPECTED_LABELS_SHA256


def main():
    out=ROOT/'work/anatomy-review/capsule-morphology-v1'
    report=json.loads((out/'report.json').read_text(encoding='utf-8'))
    if report['labelsSha256'] != EXPECTED_LABELS_SHA256:
        raise ValueError('Capsule report and historical image labels differ')
    _,_,raw=read_browser_volume(DEFAULT_IMAGE,MAGIC_IMAGE,EXPECTED_IMAGE_SHA256)
    _,_,lab=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,EXPECTED_LABELS_SHA256)
    frames=[]
    for item in report['items']:
        pts=np.array(item['proposedRemovalXYZ']);label=item['label']
        changed=np.zeros(lab.shape,dtype=bool)
        changed[tuple(pts.T)]=True
        crop={'min':np.maximum(0,pts.min(0)-10).tolist(),'max':np.minimum(np.array(lab.shape)-1,pts.max(0)+10).tolist()}
        # All affected Z, plus X/Y extrema and quartiles for contextual triage.
        for axis,indices in [('z',np.unique(pts[:,2])),('x',np.unique(np.percentile(pts[:,0],[0,25,50,75,100]).astype(int))),('y',np.unique(np.percentile(pts[:,1],[0,25,50,75,100]).astype(int)))]:
            for index in indices:
                image=_oriented_crop(raw,axis,int(index),crop)
                seg=_oriented_crop(lab,axis,int(index),crop)
                change=_oriented_crop(changed,axis,int(index),crop)
                rgb=np.repeat(image[:,:,None],3,axis=2)
                rgb[_outline(seg==label)]=[255,60,90]
                rgb[change]=[255,220,0]
                h,w=image.shape
                panel=Image.new('RGB',(w*4+8,h*2+22),'#151515')
                ImageDraw.Draw(panel).text((2,2),f'{label} {axis.upper()}{index}: raw | removal yellow',fill='white')
                panel.paste(Image.fromarray(image).convert('RGB').resize((w*2,h*2),Image.Resampling.NEAREST),(0,22))
                panel.paste(Image.fromarray(rgb).resize((w*2,h*2),Image.Resampling.NEAREST),(w*2+8,22))
                frames.append((panel,{'label':label,'axis':axis,'index':int(index),'crop':crop}))
    manifest=[]
    for start in range(0,len(frames),12):
        group=frames[start:start+12];w=max(p.width for p,_ in group);h=max(p.height for p,_ in group)
        sheet=Image.new('RGB',(w*3,h*4),'#151515')
        for n,(p,_) in enumerate(group):sheet.paste(p,((n%3)*w,(n//3)*h))
        file=out/f'contact-{start//12:02}.png';sheet.save(file)
        manifest.append({'path':file.name,'frames':[m for _,m in group],'sha256':hashlib.sha256(file.read_bytes()).hexdigest()})
    (out/'contacts.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
    print(len(frames),len(manifest))


if __name__=='__main__':main()
