"""Review one visually located isolated ID27 island; no label writes."""
import argparse,json,hashlib
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw
from adopt_remaining_registered_labels import ROOT,FINAL_SHA
# Freeze this historical review at the registration stage, before island removal.
TARGET=ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-brainstem-island-7ebe.bin.gz'
from prepare_fourth_ventricle_candidate import component
from apply_segmentation_patch import _expected_workflow_metadata,validate_patch
from build_orthogonal_review_bundle import DEFAULT_IMAGE,MAGIC_IMAGE,MAGIC_LABELS,EXPECTED_IMAGE_SHA256,read_browser_volume,_oriented_crop,_outline,PIXEL_TO_VOXEL_FIXED

def selected_island(labels):
    points=np.array(component(labels==27,(195,205,143)))
    if len(points)!=40 or points.min(0).tolist()!=[191,205,143] or points.max(0).tolist()!=[200,206,144]:raise ValueError('Reviewed island changed')
    return points

def main(out):
    out=out.resolve()
    if out.exists() or not out.is_relative_to(ROOT/'work'):raise ValueError('New work directory required')
    _,_,raw=read_browser_volume(DEFAULT_IMAGE,MAGIC_IMAGE,EXPECTED_IMAGE_SHA256)
    _,_,labels=read_browser_volume(TARGET,MAGIC_LABELS,FINAL_SHA)
    points=selected_island(labels)
    if not np.all(raw[tuple(points.T)]==255):raise ValueError('Reviewed image values changed')
    mask=np.zeros(labels.shape,dtype=bool);mask[tuple(points.T)]=True
    indices=sorted(int(np.ravel_multi_index(p,labels.shape,order='F')) for p in points)
    edits=[(i,0) for i in indices];flat=labels.tobytes(order='F')
    patch=dict(format='brain-practical-segmentation-patch',version=1,sourceImage='/atlas/bigbrain-icbm500.bin.gz',sourceLabels='/atlas/bigbrain-practical-segmentation-icbm500.bin.gz',sourceLabelsSha256=FINAL_SHA,
        dims=list(labels.shape),voxelSizeMm=[.5,.5,.5],primaryPlane='horizontal',authorGitHub='',authorNote='One isolated ID27 bar located by image review, not global intensity filtering.',targetSide='midline',confidence='medium',
        evidence='BRAINSTEM_SOURCE_EXTENT_REVIEW.md; current-midbrain-extent-v1 Z143-144 and X195/Y205 identify an isolated bar within an image void. This candidate needs complete local orthogonal review.',workflowMetadataVersion=1,reviewStatus='unreviewed',review=dict(decision='unreviewed',reviewer=None,decidedAt=None,reason='',pullRequest=None),
        editCount=40,runs=[dict(start=i,length=1,label=0) for i in indices],**_expected_workflow_metadata(edits,flat,labels.shape))
    out.mkdir();patchpath=out/'candidate.json';patchpath.write_text(json.dumps(patch,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    validate_patch(patchpath,labels.shape,labels.size,flat,FINAL_SHA)
    crop={'min':[175,185,125],'max':[215,225,153]};frames=[]
    for axis,indices in [('z',range(142,146)),('x',range(190,202)),('y',range(204,208))]:
        for index in indices:
            r=_oriented_crop(raw,axis,index,crop);s=_oriented_crop(labels,axis,index,crop);m=_oriented_crop(mask,axis,index,crop)
            rgb=np.repeat(r[:,:,None],3,axis=2);rgb[_outline(s==27)]=[255,70,90];rgb[m]=[255,220,0]
            w,h=r.shape[1]*4,r.shape[0]*4
            panel=Image.new('RGB',(w*2+12,h+24),'#151515');ImageDraw.Draw(panel).text((3,3),f'{axis.upper()}{index}: raw | red ID27 / yellow candidate',fill='white')
            panel.paste(Image.fromarray(r).convert('RGB').resize((w,h),Image.Resampling.NEAREST),(0,24));panel.paste(Image.fromarray(rgb).resize((w,h),Image.Resampling.NEAREST),(w+12,24))
            frames.append((panel,dict(axis=axis,index=index,crop=crop)))
    sheets=[]
    for start in range(0,len(frames),4):
        group=frames[start:start+4];w=max(p.width for p,_ in group);h=max(p.height for p,_ in group)
        sheet=Image.new('RGB',(w*2,h*2),'#151515')
        for n,(p,_) in enumerate(group):sheet.paste(p,((n%2)*w,(n//2)*h))
        file=out/f'island-{start//4:02}.png';sheet.save(file);sheets.append(dict(file=file.name,sha256=hashlib.sha256(file.read_bytes()).hexdigest(),frames=[m for _,m in group]))
    (out/'report.json').write_text(json.dumps(dict(labelsSha256=FINAL_SHA,imageSha256=EXPECTED_IMAGE_SHA256,patchSha256=hashlib.sha256(patchpath.read_bytes()).hexdigest(),points=points.tolist(),sourceLabel=27,targetLabel=0,mutation=False,expertReviewed=False,adopted=False,pixelToVoxel=PIXEL_TO_VOXEL_FIXED,sheets=sheets),indent=2)+'\n',encoding='utf-8')
    print('40-point candidate; 20 orthogonal frames; public unchanged')

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--output',type=Path,required=True);main(p.parse_args().output)
