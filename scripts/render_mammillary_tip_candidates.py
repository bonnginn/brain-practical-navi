"""Raw adjacent/orthogonal context for two screened inferior tip voxels."""
import json
import hashlib
import h5py
import numpy as np
from PIL import Image,ImageDraw
from audit_mammillary_native_support import (ROOT,checked,SOURCE,SHA,decode_identity_roi,DEFAULT_LABELS,
    MAGIC_LABELS,LABEL_SHA,read_browser_volume,DEFAULT_IMAGE,MAGIC_IMAGE,EXPECTED_IMAGE_SHA256)
from render_native_mammillary_review import plane_indices
from build_orthogonal_review_bundle import _outline


def main():
    out=ROOT/'work/anatomy-review/mammillary-tip-context-v2'
    if out.exists():raise ValueError('Evidence exists')
    source=ROOT/'work/anatomy-review/mammillary-voxel-extent-v1.json'
    report0=json.loads(source.read_text())
    entries=[e for e in report0['entries'] if e['nativeSamplesBelow500']==125]
    if [e['appXYZ'] for e in entries]!=[[193,252,107],[193,253,107]]:raise ValueError('Candidate set changed')
    _,_,app=read_browser_volume(DEFAULT_IMAGE,MAGIC_IMAGE,EXPECTED_IMAGE_SHA256)
    _,_,labels=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,LABEL_SHA)
    with h5py.File(checked(SOURCE,SHA)) as f:raw,_,_=decode_identity_roi(f['minc-2.0'])
    low,high=json.loads((ROOT/'public/atlas/bigbrain-icbm500-validation.json').read_text())['intensityWindow']
    out.mkdir(parents=True)
    report=dict(inputSha256=hashlib.sha256(source.read_bytes()).hexdigest(),nativeSha256=SHA,
        labelsSha256=LABEL_SHA,appSha256=EXPECTED_IMAGE_SHA256,mutation=False,
        note='Native planes rounded to native centre; not same physical plane as app. Magenta boxes mark rounded centre only, not proposed boundaries.',figures=[])
    for n,e in enumerate(entries):
        p=np.array(e['appXYZ']);q=np.rint(e['nativeXYZ']).astype(int)
        for fixed,axis in enumerate('xyz'):
            sheet=Image.new('RGB',(1050,850),'#181818');d=ImageDraw.Draw(sheet)
            d.text((4,4),f'Target app {p.tolist()} ID39: RAW app500 | app labels | RAW native100; not adopted',fill='white')
            for row,offset in enumerate([-1,0,1]):
                y0=35+row*270
                for col,(vol,c,radius,scale) in enumerate([(app,p,10,11),(app,p,10,11),(raw,q,20,6)]):
                    crop={'min':(c-radius).tolist(),'max':(c+radius).tolist()}
                    if np.any(np.array(crop['min'])<0) or np.any(np.array(crop['max'])>=vol.shape):raise ValueError('Crop exceeds source')
                    indices=plane_indices(axis,int(c[fixed]+offset),crop)
                    values=vol[tuple(indices.reshape(-1,3).T)].reshape(indices.shape[:2])
                    if col==2:
                        inverted=65535-values.astype(float)
                        gray=np.rint(np.clip((inverted-low)/(high-low),0,1)*250).astype('uint8');gray[inverted>=65000]=255
                    else:gray=values
                    rgb=np.repeat(gray[:,:,None],3,axis=2)
                    if col==1:
                        lab=labels[tuple(indices.reshape(-1,3).T)].reshape(indices.shape[:2])
                        rgb[_outline(lab==39)]=[0,180,70];rgb[_outline(lab==40)]=[40,110,255]
                    im=Image.fromarray(rgb).resize((rgb.shape[1]*scale,rgb.shape[0]*scale),Image.Resampling.NEAREST)
                    if offset==0:
                        di=ImageDraw.Draw(im);center=(radius+.5)*scale
                        di.rectangle((center-5,center-5,center+5,center+5),outline='#ff00aa',width=1)
                    x0=col*345
                    d.text((x0+4,y0),f'{"Native" if col==2 else "App"} {axis.upper()}={c[fixed]+offset}',fill='white')
                    sheet.paste(im,(x0,y0+22))
            path=out/f'target-{n}-{axis}.png';sheet.save(path)
            report['figures'].append(dict(path=path.name,appXYZ=p.tolist(),nativeRoundedXYZ=q.tolist(),axis=axis,sha256=hashlib.sha256(path.read_bytes()).hexdigest()))
    (out/'report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print('6 sheets, 18 app and 18 native adjacent planes')


if __name__=='__main__':main()
