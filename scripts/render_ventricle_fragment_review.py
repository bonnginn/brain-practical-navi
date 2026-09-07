"""Raw/label evidence for the three remaining small ID26 fragments."""
import hashlib
import json
import argparse
import numpy as np
from PIL import Image, ImageDraw
from prepare_fourth_ventricle_candidate import component
from build_orthogonal_review_bundle import (ROOT,DEFAULT_IMAGE,MAGIC_IMAGE,MAGIC_LABELS,
    EXPECTED_IMAGE_SHA256,read_browser_volume,_oriented_crop,_outline,PIXEL_TO_VOXEL_FIXED)
from prepare_fourth_ventricle_candidate import DEFAULT_LABELS, EXPECTED_LABELS_SHA256


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--exclusion-candidate',action='store_true',help='Export only the two reviewed anterior fragments as an unadopted 26->0 patch')
    args=parser.parse_args()
    _,_,raw=read_browser_volume(DEFAULT_IMAGE,MAGIC_IMAGE,EXPECTED_IMAGE_SHA256)
    _,_,labels=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,EXPECTED_LABELS_SHA256)
    out=ROOT/'work/anatomy-review/ventricle-fragments-v1';out.mkdir(parents=True,exist_ok=True)
    report=dict(imageSha256=EXPECTED_IMAGE_SHA256,labelsSha256=EXPECTED_LABELS_SHA256,
        mutation=False,expertReviewed=False,pixelToVoxel=PIXEL_TO_VOXEL_FIXED,groups=[])
    for name,seed,count in [('anterior-left',(172,239,73),16),('anterior-right',(218,239,73),15),('upper-two',(193,195,114),2)]:
        pts=np.array(component(labels==26,seed))
        if len(pts)!=count:raise ValueError('Component identity changed')
        lo,hi=pts.min(0),pts.max(0)
        crop={'min':np.maximum(lo-16,0).tolist(),'max':np.minimum(hi+16,np.array(raw.shape)-1).tolist()}
        selected=np.zeros_like(labels,dtype=bool);selected[tuple(pts.T)]=True
        group=dict(name=name,count=count,xyz=pts.tolist(),crop=crop,sheets=[])
        for a,axis in enumerate('xyz'):
            frames=[]
            for index in range(int(lo[a])-1,int(hi[a])+2):
                r=_oriented_crop(raw,axis,index,crop);s=_oriented_crop(labels,axis,index,crop);c=_oriented_crop(selected,axis,index,crop)
                rgb=np.repeat(r[:,:,None],3,axis=2)
                rgb[_outline(s==27)]=[70,190,240]
                rgb[_outline(s==26)]=[255,70,90]
                rgb[c]=[255,220,0]
                h,w=r.shape;panel=Image.new('RGB',(w*8+10,h*4+26),'#151515')
                ImageDraw.Draw(panel).text((3,4),f'{name} {axis.upper()}{index}: raw | yellow fragment, red26, cyan27',fill='white')
                for col,img in enumerate([r,rgb]):panel.paste(Image.fromarray(img).convert('RGB').resize((w*4,h*4),Image.Resampling.NEAREST),(col*(w*4+10),26))
                frames.append(panel)
            sheet=Image.new('RGB',(max(p.width for p in frames),sum(p.height for p in frames)),'#151515')
            offset=0
            for panel in frames:sheet.paste(panel,(0,offset));offset+=panel.height
            file=f'{name}-{axis}.png';sheet.save(out/file)
            group['sheets'].append(dict(path=file,axis=axis,first=int(lo[a])-1,last=int(hi[a])+1,sha256=hashlib.sha256((out/file).read_bytes()).hexdigest()))
        # Whole sagittal locator at the component's actual x; yellow box maps crop.
        x=int(pts[0,0]);r=raw[x,:,::-1].T
        locator=Image.fromarray(r).convert('RGB').resize((r.shape[1]*2,r.shape[0]*2),Image.Resampling.NEAREST)
        d=ImageDraw.Draw(locator)
        d.rectangle((crop['min'][1]*2,(raw.shape[2]-1-crop['max'][2])*2,crop['max'][1]*2,(raw.shape[2]-1-crop['min'][2])*2),outline='yellow',width=3)
        d.text((8,8),f'{name} sagittal X{x}; LEFT posterior / RIGHT anterior; TOP superior',fill='red')
        locator.save(out/f'{name}-locator.png')
        group['locator']=f'{name}-locator.png';report['groups'].append(group)
    if args.exclusion_candidate:
        from apply_segmentation_patch import _expected_workflow_metadata,validate_patch
        points=[tuple(p) for g in report['groups'] if g['name'].startswith('anterior-') for p in g['xyz']]
        if len(points)!=31:raise ValueError('Expected exactly two anterior fragments')
        edits=sorted((int(np.ravel_multi_index(p,labels.shape,order='F')),0) for p in points)
        flat=labels.tobytes(order='F')
        candidate=dict(format='brain-practical-segmentation-patch',version=1,
            sourceImage='/atlas/bigbrain-icbm500.bin.gz',sourceLabels='/atlas/bigbrain-practical-segmentation-icbm500.bin.gz',
            sourceLabelsSha256=EXPECTED_LABELS_SHA256,dims=list(labels.shape),voxelSizeMm=[.5,.5,.5],primaryPlane='horizontal',
            authorGitHub='',authorNote='AI three-plane review: anterior pontine exterior fragments are not the fourth ventricle. Exclusion candidate only.',
            targetSide='bilateral',confidence='medium',evidence='FOURTH_VENTRICLE_REPAIR.md; ventricle-fragments-v1: whole-brain locators and every occupied X/Y/Z plane plus adjacent margins. Only anterior left 16 and right 15 voxels are excluded; the upper 2 and aqueduct candidate 16 are unchanged. Zero means unlabelled, not anatomical absence.',
            workflowMetadataVersion=1,reviewStatus='unreviewed',
            review=dict(decision='unreviewed',reviewer=None,decidedAt=None,reason='',pullRequest=None),
            editCount=len(edits),runs=[dict(start=i,length=1,label=label) for i,label in edits],
            **_expected_workflow_metadata(edits,flat,labels.shape))
        path=out/'anterior-fragments-exclusion-candidate.json'
        path.write_text(json.dumps(candidate,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        validate_patch(path,labels.shape,labels.size,flat,EXPECTED_LABELS_SHA256)
        report['exclusionCandidate']=dict(path=path.name,count=31,sha256=hashlib.sha256(path.read_bytes()).hexdigest(),adopted=False)
    (out/'report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print('3 fragments, 9 adjacent-plane sheets and 3 whole-brain locators')


if __name__=='__main__':main()
