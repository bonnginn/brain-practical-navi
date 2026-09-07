"""Read-only image evidence for ID30 overlap with encoded empty/invalid pixels.

255 includes nonfinite/high-valued source pixels, not a tissue absence oracle.
No patch or asset changes.
"""
import hashlib
import json
import argparse
import numpy as np
from scipy import ndimage
from PIL import Image, ImageDraw
from build_orthogonal_review_bundle import (
 ROOT,DEFAULT_IMAGE,MAGIC_IMAGE,MAGIC_LABELS,
 EXPECTED_IMAGE_SHA256,read_browser_volume,_oriented_crop,_outline,
)
EXPECTED_LABELS_SHA256='930eaaed7eed8782b1b162f3aa5c59c2428f4062d0d2da3a9a1cb563f49b7db7'
DEFAULT_LABELS=ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-callosum-930e.bin.gz'


def main():
 parser=argparse.ArgumentParser()
 parser.add_argument('--complete',action='store_true',help='Every occupied plane plus one neighbour, for the three largest components')
 parser.add_argument('--candidate',action='store_true',help='Write an unadopted, exact 291-voxel exclusion proposal under work; requires --complete')
 args=parser.parse_args()
 if args.candidate and not args.complete:parser.error('--candidate requires --complete')
 _,_,raw=read_browser_volume(DEFAULT_IMAGE,MAGIC_IMAGE,EXPECTED_IMAGE_SHA256)
 _,_,labels=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,EXPECTED_LABELS_SHA256)
 overlap=(labels==30)&(raw==255)
 cc,count=ndimage.label(overlap);sizes=np.bincount(cc.ravel());objects=ndimage.find_objects(cc)
 rows=[]
 for i,box in enumerate(objects,1):
  rows.append(dict(component=i,count=int(sizes[i]),min=[s.start for s in box],max=[s.stop-1 for s in box]))
 rows.sort(key=lambda r:(-r['count'],r['component']))
 out=ROOT/('work/anatomy-review/callosum-empty-overlap-complete-v2' if args.complete else 'work/anatomy-review/callosum-empty-overlap-v1');out.mkdir(parents=True,exist_ok=True)
 report=dict(imageSha256=EXPECTED_IMAGE_SHA256,labelsSha256=EXPECTED_LABELS_SHA256,label30Count=int(np.sum(labels==30)),emptyOverlapCount=int(overlap.sum()),componentCount=count,components=rows,figures=[],labelMutation=False,reviewStatus='unreviewed')
 for row in rows[:3]:
  k=row['component'];crop={'min':np.maximum(np.array(row['min'])-16,0).tolist(),'max':np.minimum(np.array(row['max'])+16,np.array(raw.shape)-1).tolist()}
  local=cc[tuple(slice(a,b+1) for a,b in zip(row['min'],row['max']))]==k
  for axis_index,axis in enumerate('xyz'):
   areas=local.sum(axis=tuple(a for a in range(3) if a!=axis_index));center=row['min'][axis_index]+int(np.argmax(areas));frames=[]
   indices=list(range(row['min'][axis_index]-1,row['max'][axis_index]+2)) if args.complete else list(range(center-2,center+3))
   for index in indices:
    image=_oriented_crop(raw,axis,index,crop);seg=_oriented_crop(labels,axis,index,crop);component=_oriented_crop(cc,axis,index,crop)==k
    rgb=np.repeat(image[:,:,None],3,axis=2);rgb[_outline(seg==30)]=[255,60,90];rgb[component]=[255,200,0]
    h,w=image.shape;panel=Image.new('RGB',(w*6+12,h*3+40),'#151515');ImageDraw.Draw(panel).multiline_text((4,4),f'C{k} {axis.upper()}={index}: RAW | ID30 red\nyellow: encoded-empty overlap',fill='white',spacing=2)
    for n,data in enumerate([image,rgb]):panel.paste(Image.fromarray(data).convert('RGB').resize((w*3,h*3),Image.Resampling.NEAREST),(n*(w*3+12),40))
    frames.append(panel)
   for start in range(0,len(frames),5):
    group=frames[start:start+5];sheet=Image.new('RGB',(group[0].width,sum(f.height for f in group)),'#151515')
    for n,f in enumerate(group):sheet.paste(f,(0,n*f.height))
    file=f'component-{k}-{axis}-{start//5}.png';sheet.save(out/file);report['figures'].append(dict(file=file,component=k,axis=axis,indices=indices[start:start+5],crop=crop,sha256=hashlib.sha256((out/file).read_bytes()).hexdigest()))
  # Whole sagittal slice locates the crop relative to the callosal arch.
  index=(row['min'][0]+row['max'][0])//2
  fullcrop={'min':[0,0,0],'max':(np.array(raw.shape)-1).tolist()}
  image=_oriented_crop(raw,'x',index,fullcrop);seg=_oriented_crop(labels,'x',index,fullcrop);component=_oriented_crop(cc,'x',index,fullcrop)==k
  rgb=np.repeat(image[:,:,None],3,axis=2);rgb[_outline(seg==30)]=[255,60,90];rgb[component]=[255,200,0]
  h,w=image.shape;locator=Image.new('RGB',(w*2,h+30),'#151515');ImageDraw.Draw(locator).text((8,7),f'Whole sagittal X={index}: raw | ID30 red, selected empty component {k} yellow',fill='white')
  locator.paste(Image.fromarray(image).convert('RGB'),(0,30));locator.paste(Image.fromarray(rgb),(w,30))
  file=f'component-{k}-locator.png';locator.save(out/file);report['figures'].append(dict(file=file,component=k,axis='x',indices=[index],crop=fullcrop,sha256=hashlib.sha256((out/file).read_bytes()).hexdigest()))
 if args.candidate:
  from apply_segmentation_patch import _expected_workflow_metadata,validate_patch
  expected=[(199,131,[206,301,192],[216,314,198]),(213,81,[207,287,205],[216,292,210]),(227,79,[207,318,183],[216,326,188])]
  if [(r['component'],r['count'],r['min'],r['max']) for r in rows[:3]]!=expected:raise ValueError('Image-reviewed component identities changed')
  chosen=np.isin(cc,[199,213,227]);indices=np.flatnonzero(chosen.ravel(order='F'));edits=[(int(i),0) for i in indices]
  if len(edits)!=291:raise ValueError('Expected exactly 291 reviewed overlap voxels')
  flat=labels.tobytes(order='F')
  candidate=dict(format='brain-practical-segmentation-patch',version=1,sourceImage='/atlas/bigbrain-icbm500.bin.gz',sourceLabels='/atlas/bigbrain-practical-segmentation-icbm500.bin.gz',sourceLabelsSha256=EXPECTED_LABELS_SHA256,dims=list(labels.shape),voxelSizeMm=[.5,.5,.5],primaryPlane='horizontal',authorGitHub='',authorNote='AI original-image and adjacent/orthogonal review of three callosal candidate overlaps with tissue gaps. Unadopted proposal, not expert review.',targetSide='right',confidence='medium',evidence='CALLOSUM_EMPTY_SPACE_REVIEW.md; callosum-empty-overlap-complete-v2: all occupied X/Y/Z planes plus one adjacent plane for three specific components. Only 291 raw255-overlap voxels are proposed for removal; other 917 overlaps, surrounding tissue, and every other label stay unchanged. Zero means unlabelled, not a definitive anatomical absence claim.',workflowMetadataVersion=1,reviewStatus='unreviewed',review=dict(decision='unreviewed',reviewer=None,decidedAt=None,reason='',pullRequest=None),editCount=len(edits),runs=[dict(start=i,length=1,label=v) for i,v in edits],**_expected_workflow_metadata(edits,flat,labels.shape))
  # The existing patch schema uses horizontal slice indexing. Evidence above
  # explicitly includes all three planes; this does not discard X/Y review.
  path=out/'callosum-three-gap-candidate.json';path.write_text(json.dumps(candidate,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');validate_patch(path,labels.shape,labels.size,flat,EXPECTED_LABELS_SHA256)
  report['candidate']=dict(file=path.name,count=291,sha256=hashlib.sha256(path.read_bytes()).hexdigest(),adopted=False)
 (out/'report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8');print(json.dumps(dict(output=str(out),components=count,overlap=int(overlap.sum()),figures=len(report['figures']))))


if __name__=='__main__':main()
