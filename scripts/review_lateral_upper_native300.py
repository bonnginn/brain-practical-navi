"""Original registered300 support and regional XYZ review of upper lateral omissions."""
import json
import argparse
import re
import numpy as np
from PIL import Image,ImageDraw
from explore_lateral_upper_cavity import LABEL_SHA
from build_orthogonal_review_bundle import ROOT,DEFAULT_LABELS,MAGIC_LABELS,read_browser_volume,_outline
from audit_manual_label_space import SOURCE,load_identity_minc
from render_registered_manual_fine_review import IMAGE_NAME,IMAGE_SHA,encode_image
from audit_inferior_horn_cavity_grid import weighted_support_record
from build_registered_manual_candidate import nearest_labels
from stage_lateral_detached547 import digest


def main(locator='lateral-upper-z174-202-v1',prefix='lateral-upper-native300-v1',locator_sha=None,work_max_y=None):
    if not all(re.fullmatch(r'[a-z0-9-]+',p) for p in [locator,prefix]):raise ValueError('Invalid evidence paths')
    out=ROOT/f'work/anatomy-review/{prefix}'
    if out.exists():raise ValueError('Preserve evidence')
    source=ROOT/f'work/anatomy-review/{locator}/report.json';source_bytes=source.read_bytes()
    report=json.loads(source_bytes)
    if locator_sha is not None:
        if digest(source_bytes)!=locator_sha:raise ValueError('Candidate identity changed')
    elif locator!='lateral-upper-z174-202-v1' or report['labelSha256']!=LABEL_SHA or report['count']!=745:
        raise ValueError('Explicit candidate digest required')
    label_sha=report['labelSha256'];_,_,labels=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,label_sha)
    if work_max_y is not None:
        if type(work_max_y)is not int or not 0<=work_max_y<labels.shape[1]:raise ValueError('Invalid work ROI')
        report['points']=[p for p in report['points'] if p['xyz'][1]<=work_max_y]
        if not report['points']:raise ValueError('Empty work ROI')
    zmin,zmax=report.get('zRange',[174,202])
    raw,start,step,history=load_identity_minc(SOURCE/IMAGE_NAME,IMAGE_SHA)
    geo=json.loads((ROOT/'public/atlas/bigbrain-icbm500-validation.json').read_text())
    affine=np.array(geo['affine']);origin=affine[:3,3];spacing=np.diag(affine)[:3]
    if not np.allclose(affine[:3,:3],np.diag(spacing)) or np.any(step<=0):raise ValueError('Unsupported geometry')
    points=np.array([p['xyz'] for p in report['points']]);loapp=points.min(0)-[12,12,15];hiapp=points.max(0)+[12,12,15]
    low=np.floor((loapp*spacing+origin-start)/step).astype(int);high=np.ceil((hiapp*spacing+origin-start)/step).astype(int)+1
    if np.any(low<0) or np.any(high>raw.shape):raise ValueError('Crop out of bounds')
    crop=raw[tuple(slice(a,b) for a,b in zip(low,high))];mask=crop>=65000
    records=[]
    for p in report['points']:
        support=weighted_support_record((np.array(p['xyz'])*spacing+origin-start)/step,spacing/step,mask,low)
        records.append(dict(**p,**support))
    selected=[p for p in records if p['weightedSupportFraction']>=.5 and p['weightedOutsideCropFraction']==0]
    candidate=np.zeros_like(labels)
    for p in selected:candidate[tuple(p['xyz'])]=p['after']
    grid=np.indices(crop.shape).reshape(3,-1).T+low
    old=nearest_labels(labels,grid*step+start,origin,spacing).reshape(crop.shape)
    new=nearest_labels(candidate,grid*step+start,origin,spacing).reshape(crop.shape)
    gray=255-encode_image(crop,geo['intensityWindow'])
    # Every requested app horizontal plane, and 9 candidate-bearing planes per orthogonal axis.
    indices={2:sorted(set(int(round((z*spacing[2]+origin[2]-start[2])/step[2])) for z in range(zmin,zmax+1)))}
    for axis in (0,1):
        values=sorted(set(int(round((p[axis]*spacing[axis]+origin[axis]-start[axis])/step[axis])) for p in points))
        indices[axis]=sorted(set(values[int(round(f*(len(values)-1)))] for f in np.linspace(0,1,9)))
    out.mkdir();figures=[]
    for axis in (2,0,1):
        for first in range(0,len(indices[axis]),3):
            used=indices[axis][first:first+3];rows=[]
            for index in used:
                g=np.take(gray,index-low[axis],axis).T[::-1];a=np.take(old,index-low[axis],axis).T[::-1];b=np.take(new,index-low[axis],axis).T[::-1]
                rgb=np.repeat(g[:,:,None],3,axis=2);overlay=rgb.copy()
                overlay[_outline(np.isin(a,[23,24]))]=[50,190,255]
                overlay[b>0]=np.rint(.25*rgb[b>0]+.75*np.array([255,190,20])).astype(np.uint8)
                scale=min(3,620/g.shape[0],550/g.shape[1]);w,h=round(g.shape[1]*scale),round(g.shape[0]*scale)
                row=Image.new('RGB',(max(900,w*2+12),h+30),'#181818')
                ImageDraw.Draw(row).text((4,4),f'Original300 {"XYZ"[axis]}{index} raw / existing cyan + finite-majority candidate amber',fill='white')
                for col,pic in enumerate([rgb,overlay]):row.paste(Image.fromarray(pic).resize((w,h),Image.Resampling.NEAREST),(col*(w+12),28))
                rows.append(row)
            sheet=Image.new('RGB',(max(r.width for r in rows),sum(r.height for r in rows)),'#181818');offset=0
            for row in rows:sheet.paste(row,(0,offset));offset+=row.height
            path=out/f'{"xyz"[axis]}-{first//3:02d}.png';sheet.save(path)
            figures.append(dict(path=path.name,axis='xyz'[axis],indices=used,sha256=digest(path.read_bytes())))
    result=dict(labelSha256=label_sha,sourceSha256=IMAGE_SHA,sourceHistory=history,locatorSha256=digest(source.read_bytes()),
        records=records,points=selected,count=len(selected),counts={str(k):sum(p['after']==k for p in selected) for k in [23,24]},
        heldCount=len(records)-len(selected),figures=figures,adopted=False,visualReviewPending=True,
        limitation='Exact finite-cell majority is supporting evidence, not anatomical approval. Horizontal 29 planes cover the user interval; X/Y are 9 targeted planes each, not exhaustive native plane inspection.')
    if locator!='lateral-upper-z174-202-v1':
        result.update(zRange=[zmin,zmax],minimumSourceIntensity=65000,minimumWeightedSupport=.5)
        result['limitation']=f'Exact finite-cell majority is supporting evidence, not anatomical approval. Horizontal {zmax-zmin+1} planes cover the user interval; X/Y are 9 targeted planes each, not exhaustive native plane inspection.'
    if work_max_y is not None:
        result['workMaxY']=work_max_y
        result['limitation']+=' Work Y maximum only selects the review region; it is not an anatomical boundary or an adoption criterion.'
    (out/'report.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:v for k,v in result.items() if k not in ['records','points','figures','sourceHistory']}))
    print('reportSha256',digest((out/'report.json').read_bytes()))


if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--locator',default='lateral-upper-z174-202-v1')
    p.add_argument('--prefix',default='lateral-upper-native300-v1');p.add_argument('--locator-sha')
    p.add_argument('--work-max-y',type=int)
    a=p.parse_args();main(a.locator,a.prefix,a.locator_sha,a.work_max_y)
