"""Show sampled III path points in exact axial slice slabs, never invented fibres."""
import json
import hashlib
import numpy as np
from PIL import Image,ImageDraw
from build_orthogonal_review_bundle import ROOT,DEFAULT_LABELS,DEFAULT_IMAGE,MAGIC_LABELS,MAGIC_IMAGE,EXPECTED_IMAGE_SHA256,read_browser_volume,_oriented_crop,_outline
from audit_nerve_origin_context import LABEL_SHA

def main():
    out=ROOT/'work/anatomy-review/oculomotor-path-sections-v1'
    if out.exists():raise ValueError('Evidence exists')
    source=ROOT/'work/anatomy-review/nerve-path-tissue-v1.json';profile=json.loads(source.read_text(encoding='utf-8'))
    if profile['labelsSha256']!=LABEL_SHA:raise ValueError('Wrong profile label revision')
    _,_,labels=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,LABEL_SHA)
    _,_,raw=read_browser_volume(DEFAULT_IMAGE,MAGIC_IMAGE,EXPECTED_IMAGE_SHA256)
    crop={'min':[155,180,100],'max':[237,270,145]};out.mkdir(parents=True)
    report=dict(profileSha256=hashlib.sha256(source.read_bytes()).hexdigest(),labelSha256=LABEL_SHA,imageSha256=EXPECTED_IMAGE_SHA256,
        mutation=False,expertReviewed=False,cropInclusive=crop,figures=[])
    for z in [118,120]:
        a=_oriented_crop(raw,'z',z,crop);lab=_oriented_crop(labels,'z',z,crop)
        rgb=np.repeat(a[:,:,None],3,axis=2)
        for ids,color in [([1,2],[0,220,220]),([3,4],[255,150,0]),([27],[230,205,0])]:rgb[_outline(np.isin(lab,ids))]=color
        w,h=a.shape[1]*5,a.shape[0]*5
        sheet=Image.new('RGB',(w*2+12,h+74),'#181818');d=ImageDraw.Draw(sheet)
        d.text((4,3),f'App axial Z={z}: RAW | RN cyan / SN orange / ID27 yellow; III model samples magenta',fill='white')
        d.text((4,21),'Only centres within +/-0.5 voxel of this plane. Numbers = existing mesh ring indices.',fill='white')
        d.text((4,39),'No connecting lines; samples are NOT observed nerve fibres. Display frame converted to image indices.',fill='white')
        sheet.paste(Image.fromarray(a).convert('RGB').resize((w,h),Image.Resampling.NEAREST),(0,74))
        sheet.paste(Image.fromarray(rgb).resize((w,h),Image.Resampling.NEAREST),(w+12,74))
        selected=[]
        for path in profile['paths'][:2]:
            for p in path['samples']:
                x,y,zz=p['appXYZ']
                if abs(zz-z)>.5:continue
                px=w+12+(x-crop['min'][0]+.5)*5;py=74+(crop['max'][1]-y+.5)*5
                d.ellipse((px-3,py-3,px+3,py+3),outline='#ff0088',width=2)
                d.text((px+4,py-5),str(p['ringIndex']),fill='#ff0088')
                selected.append(dict(id=path['id'],**p))
        path=out/f'z-{z}.png';sheet.save(path)
        report['figures'].append(dict(path=path.name,z=z,samples=selected,sha256=hashlib.sha256(path.read_bytes()).hexdigest()))
    (out/'report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print('Two axial III path review figures, no mutation')

if __name__=='__main__':main()
