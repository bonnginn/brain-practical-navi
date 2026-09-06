"""Read-only orthogonal checks prompted by the full-Z visual review."""
import json, hashlib
import numpy as np
from PIL import Image, ImageDraw
from build_orthogonal_review_bundle import (ROOT,DEFAULT_IMAGE,DEFAULT_LABELS,MAGIC_IMAGE,MAGIC_LABELS,
 EXPECTED_IMAGE_SHA256,EXPECTED_LABELS_SHA256,read_browser_volume,_oriented_crop,_outline,PIXEL_TO_VOXEL_FIXED)

# Explicit voxel-space review windows; these are not segmentation rules.
JOBS=[
 ('caudate-tail',[7,8], [140,170,80],[255,335,205], [('x',[162,168,174]),('x',[218,224,230]),('y',[214,220,226])]),
 ('third-posterior',[25],[170,180,97],[222,284,181],[('x',[191,195,199]),('y',[190,196,202])]),
 ('fourth-aqueduct',[26],[165,150,53],[228,250,135],[('x',[191,195,199]),('y',[217,221,225])]),
 ('brainstem-end',[27],[149,155,0],[245,265,154],[('x',[191,195,199]),('y',[175,183,191])]),
 ('cerebellum-ends',[28,29],[73,75,0],[318,230,154],[('x',[187,195,203]),('y',[169,177,185])]),
 ('capsule-inferior',[31,32],[125,202,117],[267,333,191],[('x',[153,159,165]),('x',[226,232,238]),('y',[303,309,315])]),
 ('mammillary-attachment',[39,40],[180,235,100],[212,270,129],[('x',[188,190,192]),('x',[200,202,204]),('y',[247,251,255])]),
]

def main():
 _,_,im=read_browser_volume(DEFAULT_IMAGE,MAGIC_IMAGE,EXPECTED_IMAGE_SHA256)
 _,_,lab=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,EXPECTED_LABELS_SHA256)
 out=ROOT/'work/anatomy-review/extent-followup-v1';out.mkdir(parents=True,exist_ok=True)
 m={'imageSha256':EXPECTED_IMAGE_SHA256,'labelsSha256':EXPECTED_LABELS_SHA256,'labelMutation':False,'reviewStatus':'unreviewed','pixelToVoxel':PIXEL_TO_VOXEL_FIXED,'sheets':[]}
 for name,ids,lo,hi,views in JOBS:
  crop={'min':lo,'max':hi}
  for view,(axis,indices) in enumerate(views):
   panels=[];frames=[]
   for index in indices:
    raw=_oriented_crop(im,axis,index,crop);seg=_oriented_crop(lab,axis,index,crop);rgb=np.repeat(raw[:,:,None],3,axis=2)
    for i,c in zip(ids,[(255,60,90),(60,220,240)]):rgb[_outline(seg==i)]=c
    h,w=raw.shape;scale=3 if max(h,w)<160 else 2
    p=Image.new('RGB',(2*w*scale+12,h*scale+24),'#151515');ImageDraw.Draw(p).text((4,4),f'{name} {axis}={index} RAW | {ids}',fill='white')
    for col,data in enumerate([raw,rgb]):p.paste(Image.fromarray(data).convert('RGB').resize((w*scale,h*scale),Image.Resampling.NEAREST),(col*(w*scale+12),24))
    panels.append(p);frames.append({'index':index,'rawSha256':hashlib.sha256(raw.tobytes()).hexdigest(),'counts':{str(i):int(np.count_nonzero(seg==i)) for i in ids}})
   sheet=Image.new('RGB',(panels[0].width,panels[0].height*3),'#151515')
   for n,p in enumerate(panels):sheet.paste(p,(0,n*p.height))
   file=f'{name}-{axis}-{view}.png';sheet.save(out/file)
   m['sheets'].append({'path':file,'ids':ids,'axis':axis,'crop':crop,'frames':frames,'sha256':hashlib.sha256((out/file).read_bytes()).hexdigest()})
 (out/'manifest.json').write_text(json.dumps(m,indent=2)+'\n',encoding='utf-8')
 print(json.dumps({'sheets':len(m['sheets']),'output':str(out)}))

if __name__=='__main__':main()
