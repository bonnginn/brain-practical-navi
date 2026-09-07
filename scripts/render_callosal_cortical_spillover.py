"""Render every occupied orthogonal plane of one fixed callosal prescreen.

Component identities are pinned to the preceding read-only classification
report. This creates evidence, not an approved patch or public label change.
"""
import hashlib
import argparse
import json
import numpy as np
from scipy import ndimage
from PIL import Image,ImageDraw
from build_orthogonal_review_bundle import ROOT,DEFAULT_IMAGE,MAGIC_IMAGE,MAGIC_LABELS,EXPECTED_IMAGE_SHA256,read_browser_volume,_oriented_crop,_outline

LABEL_SHA='930eaaed7eed8782b1b162f3aa5c59c2428f4062d0d2da3a9a1cb563f49b7db7'
DEFAULT_LABELS=ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-callosum-930e.bin.gz'
COMPONENTS={
    15:(297,[177,259,196],[184,294,206]),
    76:(682,[205,186,201],[216,207,210]),
    83:(617,[205,275,193],[216,307,212]),
    85:(1314,[205,289,176],[216,334,210]),
}


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--component',type=int,choices=sorted(COMPONENTS),default=85)
    args=parser.parse_args()
    component=args.component
    expected_count,expected_min,expected_max=COMPONENTS[component]
    source=ROOT/'work/anatomy-review/callosum-official-tissue-v1'
    report=json.loads((source/'report.json').read_text(encoding='utf-8'))
    if report['labelsSha256']!=LABEL_SHA or report['prescreen']['count']!=6528:
        raise ValueError('Unexpected prescreen baseline')
    _,dims,raw=read_browser_volume(DEFAULT_IMAGE,MAGIC_IMAGE,EXPECTED_IMAGE_SHA256)
    _,_,labels=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,LABEL_SHA)
    samples=np.load(source/'sampled-callosal-classes.npz')
    points=samples['points'];chosen=samples['prescreen']
    if not np.array_equal(points,np.argwhere(labels==30)):
        raise ValueError('Point order changed')
    mask=np.zeros(dims,dtype=bool);mask[tuple(points[chosen].T)]=True
    cc,_=ndimage.label(mask)
    target=cc==component;selected=np.argwhere(target)
    if len(selected)!=expected_count or selected.min(0).tolist()!=expected_min or selected.max(0).tolist()!=expected_max:
        raise ValueError('Fixed reviewed component changed')
    out=ROOT/f'work/anatomy-review/callosum-cortical-spillover-component{component}-v1';out.mkdir(parents=True,exist_ok=True)
    evidence=dict(imageSha256=EXPECTED_IMAGE_SHA256,labelsSha256=LABEL_SHA,sourceReportSha256=hashlib.sha256((source/'report.json').read_bytes()).hexdigest(),sourceSamplesSha256=hashlib.sha256((source/'sampled-callosal-classes.npz').read_bytes()).hexdigest(),component=component,count=expected_count,min=selected.min(0).tolist(),max=selected.max(0).tolist(),labelMutation=False,adopted=False,figures=[])
    crop={'min':(selected.min(0)-12).tolist(),'max':(selected.max(0)+12).tolist()}
    for a,axis in enumerate('xyz'):
        frames=[]
        for index in range(int(selected[:,a].min())-1,int(selected[:,a].max())+2):
            image=_oriented_crop(raw,axis,index,crop);seg=_oriented_crop(labels,axis,index,crop);part=_oriented_crop(target,axis,index,crop)
            rgb=np.repeat(image[:,:,None],3,axis=2);rgb[_outline(seg==30)]=[255,50,70];rgb[part]=np.rint(.45*rgb[part]+.55*np.array([0,220,70])).astype(np.uint8)
            h,w=image.shape;frame=Image.new('RGB',(w*6+10,h*3+36),'#151515')
            ImageDraw.Draw(frame).multiline_text((4,3),f'{axis.upper()}={index} | Raw / ID30 red\nGreen: C{component} (pre-adoption)',fill='white',spacing=3)
            for col,data in enumerate((image,rgb)):
                frame.paste(Image.fromarray(data).convert('RGB').resize((w*3,h*3),Image.Resampling.NEAREST),(col*(w*3+10),36))
            frames.append((index,frame))
        for start in range(0,len(frames),5):
            group=frames[start:start+5];sheet=Image.new('RGB',(group[0][1].width,sum(f.height for _,f in group)),'#151515')
            for row,(_,frame) in enumerate(group):sheet.paste(frame,(0,row*frame.height))
            name=f'{axis}-{group[0][0]}-{group[-1][0]}.png';sheet.save(out/name)
            evidence['figures'].append(dict(file=name,axis=axis,indices=[i for i,_ in group],sha256=hashlib.sha256((out/name).read_bytes()).hexdigest()))
    (out/'report.json').write_text(json.dumps(evidence,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(dict(count=len(selected),figures=len(evidence['figures']),planes=sum(len(f['indices']) for f in evidence['figures']))))


if __name__=='__main__':main()
