"""Consecutive native 100um source sections; no interpolated label outlines."""
import json
import argparse
import hashlib
import h5py
import numpy as np
from PIL import Image, ImageDraw
from inspect_hypothalamus_roi import SOURCE, SHA, decode_identity_roi
from build_orthogonal_review_bundle import ROOT, _oriented_crop


def orthogonal(anterior=False, posterior=False):
    if anterior and posterior:raise ValueError('Conflicting review modes')
    out=ROOT/('work/anatomy-review/native-optic-posterior-orthogonal-v1' if posterior else 'work/anatomy-review/native-optic-anterior-orthogonal-v1' if anterior else 'work/anatomy-review/native-optic-bridge-orthogonal-v1')
    if out.exists():raise ValueError('Evidence exists')
    with SOURCE.open('rb') as f:
        if hashlib.file_digest(f,'sha256').hexdigest()!=SHA:raise ValueError('Source changed')
    with h5py.File(SOURCE) as f:raw,start,step=decode_identity_roi(f['minc-2.0'])
    low,high=json.loads((ROOT/'public/atlas/bigbrain-icbm500-validation.json').read_text())['intensityWindow']
    crop={'min':[0,0,0],'max':[473,175,220]} if anterior or posterior else {'min':[100,0,30],'max':[370,175,190]}
    groups=([('z',center) for center in [145,160,175]]+[('x',center) for center in [150,320]]) if posterior else [('z',center) for center in [50,65,80]] if anterior else [('x',center) for center in [170,200,230,260,290]]+[('z',center) for center in [90,110,130]]
    out.mkdir(parents=True)
    report=dict(sourceSha256=SHA,cropInclusive=crop,sourceStartMm=start.tolist(),sourceStepMm=step.tolist(),
        window=[low,high],polarity='65535-source',labelsShown=False,mutation=False,figures=[])
    for axis,center in groups:
        rows=[]
        for index in range(center-1,center+2):
            r=65535-_oriented_crop(raw,axis,index,crop).astype(float)
            gray=np.rint(np.clip((r-low)/(high-low),0,1)*250).astype('uint8');gray[r>=65000]=255
            h,w=gray.shape;row=Image.new('RGB',(max(700,w*2),h*2+42),'#181818');d=ImageDraw.Draw(row)
            d.text((4,3),f'Native {axis.upper()}={index}; 100um source, RAW ONLY; not app coordinates',fill='white')
            d.text((4,20),'Orthogonal continuity; crop is review area, not a segmentation boundary',fill='white')
            row.paste(Image.fromarray(gray).convert('RGB').resize((w*2,h*2),Image.Resampling.NEAREST),(0,42));rows.append(row)
        sheet=Image.new('RGB',(max(r.width for r in rows),sum(r.height for r in rows)),'#181818');offset=0
        for row in rows:sheet.paste(row,(0,offset));offset+=row.height
        path=out/f'{axis}-{center}.png';sheet.save(path)
        report['figures'].append(dict(path=path.name,axis=axis,nativeIndices=list(range(center-1,center+2)),sha256=hashlib.sha256(path.read_bytes()).hexdigest()))
    (out/'report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(f'{len(groups)*3} native orthogonal planes in {len(groups)} sheets; no labels or mutation')


def main(anterior=False,posterior=False):
    if anterior and posterior:raise ValueError('Conflicting review modes')
    out=ROOT/('work/anatomy-review/native-optic-posterior-continuity-v1' if posterior else 'work/anatomy-review/native-optic-anterior-continuity-v1' if anterior else 'work/anatomy-review/native-optic-bridge-continuity-v1')
    if out.exists():raise ValueError('Evidence exists')
    with SOURCE.open('rb') as f:
        if hashlib.file_digest(f,'sha256').hexdigest()!=SHA:raise ValueError('Source changed')
    with h5py.File(SOURCE) as f:raw,start,step=decode_identity_roi(f['minc-2.0'])
    geometry=json.loads((ROOT/'public/atlas/bigbrain-icbm500-validation.json').read_text())
    low,high=geometry['intensityWindow']
    # These are review-window limits, never inferred anatomical boundaries.
    indices=list(range(0,85)) if posterior else list(range(127,176)) if anterior else list(range(85,127))
    crop={'x':[0,473],'z':[0,220]} if anterior or posterior else {'x':[70,405],'z':[20,170]}
    width=(crop['x'][1]-crop['x'][0]+1)*2
    height=(crop['z'][1]-crop['z'][0]+1)*2
    out.mkdir(parents=True)
    report=dict(sourceSha256=SHA,sourceStartMm=start.tolist(),sourceStepMm=step.tolist(),
        cropInclusive=crop,nativeYIndices=indices,window=[low,high],polarity='65535-source',
        labelsShown=False,mutation=False,scope='Consecutive local review, not the full visual pathway',figures=[])
    for offset in range(0,len(indices),4):
        sheet=Image.new('RGB',((width+6)*2,(height+56)*2),'#181818'); d=ImageDraw.Draw(sheet)
        for i,y in enumerate(indices[offset:offset+4]):
            r=65535-raw[crop['x'][0]:crop['x'][1]+1,y,crop['z'][0]:crop['z'][1]+1].astype(float)
            gray=np.rint(np.clip((r-low)/(high-low),0,1)*250).astype('uint8');gray[r>=65000]=255
            gray=gray.T[::-1]
            x0=(i%2)*(width+6); y0=(i//2)*(height+56)
            d.text((x0+4,y0+4),f'NATIVE Y index {y}, Y={start[1]+y*step[1]:.2f}mm; X{crop["x"]} / Z{crop["z"]}',fill='white')
            d.text((x0+4,y0+21),'RAW100 only; 0.1mm consecutive sections; NOT app Y coordinates',fill='white')
            sheet.paste(Image.fromarray(gray).convert('RGB').resize((width,height),Image.Resampling.NEAREST),(x0,y0+48))
        path=out/f'bridge-{offset//4:02}.png';sheet.save(path)
        report['figures'].append(dict(path=path.name,nativeYIndices=indices[offset:offset+4],sha256=hashlib.sha256(path.read_bytes()).hexdigest()))
    (out/'report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(f'{len(indices)} consecutive source planes, {len(report["figures"])} sheets; no label mutation')


if __name__=='__main__':
    parser=argparse.ArgumentParser();mode=parser.add_mutually_exclusive_group()
    mode.add_argument('--orthogonal',action='store_true')
    mode.add_argument('--anterior',action='store_true',help='Continue to the anterior native ROI edge, full X width; not a segmented endpoint')
    mode.add_argument('--anterior-orthogonal',action='store_true',help='Lower native Z planes through the newly reviewed anterior profiles')
    mode.add_argument('--posterior',action='store_true',help='Consecutive posterior native Y0-84, not a posterior tract endpoint')
    mode.add_argument('--posterior-orthogonal',action='store_true',help='Orthogonal planes through the oblique posterior lateral profiles; not a mask')
    args=parser.parse_args()
    orthogonal(args.anterior_orthogonal,args.posterior_orthogonal) if args.orthogonal or args.anterior_orthogonal or args.posterior_orthogonal else main(args.anterior,args.posterior)
