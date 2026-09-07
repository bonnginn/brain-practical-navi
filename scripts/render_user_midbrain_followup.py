"""Adjacent/orthogonal context for one user stroke; never extrude it into 3D."""
import json,hashlib
import numpy as np
from PIL import Image,ImageDraw
from render_current_ventral_midbrain import LABEL_SHA,outlined_labels
from build_orthogonal_review_bundle import ROOT,DEFAULT_LABELS,DEFAULT_IMAGE,MAGIC_LABELS,MAGIC_IMAGE,EXPECTED_IMAGE_SHA256,read_browser_volume,_oriented_crop

def main():
 out=ROOT/'work/anatomy-review/user-midbrain-followup-v1'
 if out.exists():raise ValueError('Evidence already exists')
 ref=ROOT/'segmentation-patches/review/user-midbrain-upper-reference-2026-09-06.json'
 record=json.loads(ref.read_text());pts=np.array(record['pointsXYZ'])
 if record['sourceLabelSha256']!=LABEL_SHA or not np.all(pts[:,0]==180):raise ValueError('Reference mismatch')
 _,_,labels=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,LABEL_SHA)
 _,_,raw=read_browser_volume(DEFAULT_IMAGE,MAGIC_IMAGE,EXPECTED_IMAGE_SHA256)
 crop={'min':[160,185,105],'max':[215,275,165]};planes=[('x',v) for v in range(178,183)]+[('y',v) for v in [225,235,245,255]]+[('z',v) for v in range(136,141)]
 out.mkdir(parents=True);report=dict(referenceSha256=hashlib.sha256(ref.read_bytes()).hexdigest(),labelsSha256=LABEL_SHA,rawSha256=EXPECTED_IMAGE_SHA256,mutation=False,strokeIsOnlyOnX180=True,images=[])
 for start in range(0,len(planes),3):
  rows=[];frames=[]
  for axis,index in planes[start:start+3]:
   r=_oriented_crop(raw,axis,index,crop);s=_oriented_crop(labels,axis,index,crop);w,h=r.shape[1]*4,r.shape[0]*4
   row=Image.new('RGB',(max(740,w*2+12),h+54),'#181818');d=ImageDraw.Draw(row)
   d.text((4,3),f'{axis.upper()}={index} RAW | current outlines. User line shown ONLY at X180.',fill='white')
   d.text((4,19),'Thalamus pale blue; RN cyan; SN orange; STN purple; brainstem red.',fill='white')
   d.text((4,35),'Green = user reference, not a segmented boundary or expert approval.',fill='white')
   row.paste(Image.fromarray(r).convert('RGB').resize((w,h),Image.Resampling.NEAREST),(0,54));row.paste(Image.fromarray(outlined_labels(r,s)).resize((w,h),Image.Resampling.NEAREST),(w+12,54))
   if axis=='x' and index==180:
    for offset in [0,w+12]:d.line([(offset+(y-crop['min'][1]+.5)*4,54+(crop['max'][2]-z+.5)*4) for _,y,z in pts],fill='#00a344',width=3)
   rows.append(row);frames.append(dict(axis=axis,index=index,crop=crop,lineShown=axis=='x' and index==180))
  sheet=Image.new('RGB',(max(r.width for r in rows),sum(r.height for r in rows)),'#181818');y=0
  for row in rows:sheet.paste(row,(0,y));y+=row.height
  p=out/f'followup-{start//3:02}.png';sheet.save(p);report['images'].append(dict(path=p.name,sha256=hashlib.sha256(p.read_bytes()).hexdigest(),frames=frames))
 (out/'report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8');print(f'{len(planes)} comparisons, {len(report["images"])} sheets, no mutation')

if __name__=='__main__':main()
