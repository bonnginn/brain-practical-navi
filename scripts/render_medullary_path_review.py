"""Adjacent orthogonal source checks at existing IX/X/XI cerebellar intersections."""
import json
import hashlib
import argparse
import numpy as np
from scipy.ndimage import distance_transform_edt, map_coordinates
from PIL import Image, ImageDraw
from audit_nerve_origin_context import LABEL_SHA
from build_orthogonal_review_bundle import ROOT,DEFAULT_LABELS,DEFAULT_IMAGE,MAGIC_LABELS,MAGIC_IMAGE,EXPECTED_IMAGE_SHA256,read_browser_volume,_outline
from render_native_mammillary_review import plane_indices


def main(overview=False,temporal=False,remaining=False):
    if sum([overview,temporal,remaining])>1:raise ValueError('Choose one review set')
    out=ROOT/('work/anatomy-review/remaining-nerve-path-sections-v1' if remaining else 'work/anatomy-review/temporal-nerve-path-sections-v1' if temporal else 'work/anatomy-review/medullary-path-overview-v1' if overview else 'work/anatomy-review/medullary-path-sections-v1')
    if out.exists():raise ValueError('Evidence exists')
    source=ROOT/'work/anatomy-review/nerve-path-tissue-v1.json'
    profile=json.loads(source.read_text(encoding='utf-8'))
    if profile['labelsSha256']!=LABEL_SHA or profile['sourceImageSha256']!=EXPECTED_IMAGE_SHA256:
        raise ValueError('Wrong profile revision')
    _,_,labels=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,LABEL_SHA)
    _,_,raw=read_browser_volume(DEFAULT_IMAGE,MAGIC_IMAGE,EXPECTED_IMAGE_SHA256)
    expected_ids=[32,33,34,35,36,37,44,45] if remaining else list(range(28,32)) if temporal else list(range(38,44))
    paths=[p for p in profile['paths'] if p['id'] in expected_ids]
    if [p['id'] for p in paths]!=expected_ids:raise ValueError('Wrong path inventory')
    if overview:
        out.mkdir(parents=True)
        crop={'min':[135,135,20],'max':[257,265,100]}
        report=dict(profileSha256=hashlib.sha256(source.read_bytes()).hexdigest(),labelsSha256=LABEL_SHA,
            imageSha256=EXPECTED_IMAGE_SHA256,mutation=False,expertReviewed=False,figures=[])
        for z in [28,40,56,60,72,88]:
            idx=plane_indices('z',z,crop);values=raw[tuple(idx.reshape(-1,3).T)].reshape(idx.shape[:2]);lab=labels[tuple(idx.reshape(-1,3).T)].reshape(idx.shape[:2])
            rgb=np.repeat(values[:,:,None],3,axis=2);rgb[_outline(lab==27)]=[230,205,0];rgb[_outline(np.isin(lab,[28,29]))]=[0,220,100]
            scale=4;w=rgb.shape[1]*scale;h=rgb.shape[0]*scale
            sheet=Image.new('RGB',(2*w+12,h+65),'#181818');d=ImageDraw.Draw(sheet)
            d.text((5,3),f'RAW500 axial Z{z}; anterior at top; app X increases right. RAW | ID27 yellow / cerebellum green',fill='white')
            d.text((5,23),'Magenta = existing IX/X/XI centres within half a voxel. ModelID:ring; NOT identified nerve tissue.',fill='white')
            sheet.paste(Image.fromarray(values).convert('RGB').resize((w,h),Image.Resampling.NEAREST),(0,65))
            sheet.paste(Image.fromarray(rgb).resize((w,h),Image.Resampling.NEAREST),(w+12,65));shown=[]
            for path in paths:
                for p in path['samples']:
                    x,y,zz=p['appXYZ']
                    if abs(zz-z)>.5:continue
                    px=w+12+(x-crop['min'][0]+.5)*scale;py=65+(crop['max'][1]-y+.5)*scale
                    d.ellipse((px-3,py-3,px+3,py+3),outline='#ff0088',width=2)
                    d.text((px+4,py-5),f'{path["id"]}:{p["ringIndex"]}',fill='#ff0088');shown.append(dict(id=path['id'],**p))
            target=out/f'z-{z}.png';sheet.save(target)
            report['figures'].append(dict(path=target.name,axis='z',index=z,cropInclusive=crop,samples=shown,sha256=hashlib.sha256(target.read_bytes()).hexdigest()))
        (out/'report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
        print('Six wider axial overview figures; no mutation');return
    # One common cerebellar distance field; only within-label centres are eligible.
    review_labels=[17,18,23,24] if temporal else [28,29]
    distance=None if remaining else distance_transform_edt(np.isin(labels,review_labels),sampling=.5)
    out.mkdir(parents=True)
    report=dict(profileSha256=hashlib.sha256(source.read_bytes()).hexdigest(),labelsSha256=LABEL_SHA,
        imageSha256=EXPECTED_IMAGE_SHA256,mutation=False,expertReviewed=False,
        selection='Fixed raw-image checks: VII/VIII ring12, VI/XII ring4; not a whole-path clearance test.' if remaining else 'Deepest sampled centre within current review mask; this is a review target, not anatomical truth.',reviewLabelIds=review_labels,figures=[])
    for path in paths:
        ipsi=([17,23] if path['id']%2==0 else [18,24]) if temporal else ([28] if path['id']%2==0 else [29])
        candidates=[p for p in path['samples'] if p['ringIndex']==(12 if 34<=path['id']<=37 else 4)] if remaining else [p for p in path['samples'] if p['label'] in ipsi]
        if not candidates:raise ValueError('No current cerebellar intersection')
        depths=np.zeros(len(candidates)) if remaining else map_coordinates(distance,np.array([p['appXYZ'] for p in candidates]).T,order=1,prefilter=False)
        sample=candidates[int(np.argmax(depths))];center=np.rint(sample['appXYZ']).astype(int)
        crop={'min':np.maximum(center-27,0).tolist(),'max':np.minimum(center+27,np.array(raw.shape)-1).tolist()}
        sheet=Image.new('RGB',(1020,1010),'#181818');draw=ImageDraw.Draw(sheet)
        draw.text((5,4),f'Model ID{path["id"]}, ring {sample["ringIndex"]}, XYZ {center.tolist()}; RAW500',fill='white')
        draw.text((5,22),'Yellow brainstem / purple hippocampus / blue ventricle; magenta MODEL centres, NOT observed nerves' if temporal else 'Yellow brainstem / green cerebellar border / magenta EXISTING MODEL samples, NOT observed nerve fibres',fill='white')
        frames=[]
        for fixed,axis in enumerate('xyz'):
            for row,delta in enumerate([-1,0,1]):
                index=int(center[fixed]+delta);idx=plane_indices(axis,index,crop)
                values=raw[tuple(idx.reshape(-1,3).T)].reshape(idx.shape[:2])
                lab=labels[tuple(idx.reshape(-1,3).T)].reshape(idx.shape[:2])
                rgb=np.repeat(values[:,:,None],3,axis=2)
                rgb[_outline(lab==27)]=[230,205,0]
                if temporal:
                    rgb[_outline(np.isin(lab,[17,18]))]=[170,110,255]
                    rgb[_outline(np.isin(lab,[23,24]))]=[40,180,255]
                else:rgb[_outline(np.isin(lab,[28,29]))]=[0,220,100]
                scale=5;im=Image.fromarray(rgb).resize((rgb.shape[1]*scale,rgb.shape[0]*scale),Image.Resampling.NEAREST)
                painter=ImageDraw.Draw(im);a,b=[k for k in range(3) if k!=fixed];shown=[]
                for p in path['samples']:
                    xyz=p['appXYZ']
                    if abs(xyz[fixed]-index)>.5:continue
                    if any(xyz[k]<crop['min'][k] or xyz[k]>crop['max'][k] for k in [a,b]):continue
                    px=(xyz[a]-crop['min'][a]+.5)*scale;py=(crop['max'][b]-xyz[b]+.5)*scale
                    painter.ellipse((px-3,py-3,px+3,py+3),outline='#ff0088',width=2)
                    painter.text((px+4,py-5),str(p['ringIndex']),fill='#ff0088');shown.append(p)
                x0=fixed*340;y0=48+row*320
                draw.text((x0+4,y0),f'{axis.upper()}={index}, offset {delta:+d}',fill='white')
                sheet.paste(im,(x0,y0+25));frames.append(dict(axis=axis,index=index,cropInclusive=crop,samples=shown))
        target=out/f'nerve-{path["id"]}.png';sheet.save(target)
        report['figures'].append(dict(path=target.name,id=path['id'],target=sample,maskDepthMm=None if remaining else float(max(depths)),frames=frames,
            sha256=hashlib.sha256(target.read_bytes()).hexdigest()))
    (out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(f'{len(paths)} sheets, nine adjacent orthogonal frames each; no mutation')


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--overview',action='store_true');parser.add_argument('--temporal',action='store_true');parser.add_argument('--remaining',action='store_true')
    args=parser.parse_args();main(args.overview,args.temporal,args.remaining)
