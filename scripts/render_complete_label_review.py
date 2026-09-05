"""Every Z plane across each label group's extent, plus outside endpoints.

Read-only image evidence; reviewed status is deliberately never inferred.
"""
import json, hashlib
import numpy as np
from PIL import Image,ImageDraw
from build_orthogonal_review_bundle import (ROOT,DEFAULT_IMAGE,DEFAULT_LABELS,MAGIC_IMAGE,MAGIC_LABELS,
 EXPECTED_IMAGE_SHA256,EXPECTED_LABELS_SHA256,read_browser_volume,_oriented_crop,_outline,PIXEL_TO_VOXEL_FIXED)

GROUPS=[[1,2],[3,4],[5,6],[7,8],[9,10],[11,12,13,14],[15,16],[17,18],[19,20],[21,22],
        [23,24],[25],[26],[27],[28,29],[30],[31,32],[33],[34,35],[39,40]]
COLORS=[(255,60,90),(60,220,240),(255,200,70),(150,255,100)]

def main():
 _,_,im=read_browser_volume(DEFAULT_IMAGE,MAGIC_IMAGE,EXPECTED_IMAGE_SHA256)
 _,_,lab=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,EXPECTED_LABELS_SHA256)
 out=ROOT/'work/anatomy-review/complete-z-v1';out.mkdir(parents=True,exist_ok=True)
 m={'imageSha256':EXPECTED_IMAGE_SHA256,'labelsSha256':EXPECTED_LABELS_SHA256,'labelMutation':False,
    'reviewStatus':'unreviewed','pixelToVoxel':PIXEL_TO_VOXEL_FIXED,'groups':[]}
 for ids in GROUPS:
  pts=np.argwhere(np.isin(lab,ids));lo=np.maximum(0,pts.min(axis=0)-6);hi=np.minimum(np.array(lab.shape)-1,pts.max(axis=0)+6)
  crop={'min':lo.tolist(),'max':hi.tolist()};first=max(0,int(pts[:,2].min())-1);last=min(lab.shape[2]-1,int(pts[:,2].max())+1)
  group={'ids':ids,'crop':crop,'first':first,'last':last,'sheets':[]};name='-'.join(map(str,ids))
  for start in range(first,last+1,8):
   panels=[];frames=[]
   for z in range(start,min(last+1,start+8)):
    raw=_oriented_crop(im,'z',z,crop);seg=_oriented_crop(lab,'z',z,crop);rgb=np.repeat(raw[:,:,None],3,axis=2)
    for i,c in zip(ids,COLORS):rgb[_outline(seg==i)]=c
    h,w=raw.shape;scale=2 if w<=190 and h<=190 else 1
    p=Image.new('RGB',(2*w*scale+12,h*scale+24),'#151515');ImageDraw.Draw(p).text((4,4),f'IDs {ids} Z={z} RAW | OUTLINE',fill='white')
    for col,data in enumerate([raw,rgb]):p.paste(Image.fromarray(data).convert('RGB').resize((w*scale,h*scale),Image.Resampling.NEAREST),(col*(w*scale+12),24))
    panels.append(p);frames.append({'z':z,'rawSha256':hashlib.sha256(raw.tobytes()).hexdigest(),'counts':{str(i):int(np.count_nonzero(seg==i)) for i in ids}})
   sheet=Image.new('RGB',(panels[0].width*2,panels[0].height*4),'#151515')
   for n,p in enumerate(panels):sheet.paste(p,((n%2)*p.width,(n//2)*p.height))
   file=f'ids-{name}-z-{start:03}.png';sheet.save(out/file)
   group['sheets'].append({'path':file,'sha256':hashlib.sha256((out/file).read_bytes()).hexdigest(),'scale':scale,'frames':frames})
  m['groups'].append(group)
 (out/'manifest.json').write_text(json.dumps(m,indent=2)+'\n',encoding='utf-8')
 print(json.dumps([{'ids':g['ids'],'first':g['first'],'last':g['last'],'sheets':len(g['sheets'])} for g in m['groups']]))
if __name__=='__main__':main()
