"""Exact right VIII candidate surface contact, adjacent orthogonal raw planes."""
import json,hashlib
import numpy as np
from PIL import Image,ImageDraw
from audit_nerve_origin_context import LABEL_SHA
from build_orthogonal_review_bundle import ROOT,DEFAULT_IMAGE,DEFAULT_LABELS,MAGIC_IMAGE,MAGIC_LABELS,EXPECTED_IMAGE_SHA256,read_browser_volume,_outline
from render_native_mammillary_review import plane_indices


def main():
    folder=ROOT/'work/anatomy-review/proximal-pontine-crop-v1'
    output=folder/'right-viii-surface-contact.png'
    if output.exists():raise ValueError('Evidence exists')
    source=folder/'surface-sampling.json';report=json.loads(source.read_text())
    if report['candidateSha256']!='1244f483c765ef084648a74bbad13cff78ea498d4edb9918e15812709e4fd823':raise ValueError('Wrong candidate')
    target=next(r for r in report['regions'] if r['id']==37)['strips'][2]['worstAppXYZ']
    center=np.rint(target).astype(int);crop=dict(min=(center-20).tolist(),max=(center+20).tolist())
    _,_,raw=read_browser_volume(DEFAULT_IMAGE,MAGIC_IMAGE,EXPECTED_IMAGE_SHA256)
    _,_,labels=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,LABEL_SHA)
    sheet=Image.new('RGB',(900,960),'#181818');d=ImageDraw.Draw(sheet)
    d.text((5,4),'Right VIII surface contact, not centreline: XYZ232.11,222.97,68.33; yellow brainstem / green cerebellum',fill='white')
    d.text((5,23),'Magenta = review-point projection at each adjacent plane, NOT observed nerve or proposed boundary',fill='white')
    frames=[]
    for fixed,axis in enumerate('xyz'):
        a,b=[k for k in range(3) if k!=fixed]
        for row,delta in enumerate([-1,0,1]):
            index=int(center[fixed]+delta);idx=plane_indices(axis,index,crop)
            val=raw[tuple(idx.reshape(-1,3).T)].reshape(idx.shape[:2]);lab=labels[tuple(idx.reshape(-1,3).T)].reshape(idx.shape[:2])
            rgb=np.repeat(val[:,:,None],3,axis=2);rgb[_outline(lab==27)]=[230,205,0];rgb[_outline(np.isin(lab,[28,29]))]=[0,220,100]
            scale=6;im=Image.fromarray(rgb).resize((246,246),Image.Resampling.NEAREST);di=ImageDraw.Draw(im)
            x=(target[a]-crop['min'][a]+.5)*scale;y=(crop['max'][b]-target[b]+.5)*scale
            di.rectangle((x-4,y-4,x+4,y+4),outline='#ff0088',width=1)
            x0=fixed*300;y0=50+row*300;d.text((x0+4,y0),f'{axis.upper()}={index}; delta {delta:+d}',fill='white');sheet.paste(im,(x0,y0+24))
            frames.append(dict(axis=axis,index=index))
    sheet.save(output)
    (folder/'right-viii-surface-contact.json').write_text(json.dumps(dict(sourceReportSha256=hashlib.sha256(source.read_bytes()).hexdigest(),imageSha256=EXPECTED_IMAGE_SHA256,labelsSha256=LABEL_SHA,pointXYZ=target,cropInclusive=crop,frames=frames,pngSha256=hashlib.sha256(output.read_bytes()).hexdigest(),adopted=False,expertReviewed=False),indent=2)+'\n')


if __name__=='__main__':main()
