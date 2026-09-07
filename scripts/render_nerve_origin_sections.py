"""Raw orthogonal context for all twenty schematic brainstem nerve origins."""
import json
import hashlib
import argparse
import numpy as np
from PIL import Image,ImageDraw
from build_orthogonal_review_bundle import ROOT,DEFAULT_LABELS,DEFAULT_IMAGE,MAGIC_LABELS,MAGIC_IMAGE,EXPECTED_IMAGE_SHA256,read_browser_volume,_outline
from audit_nerve_origin_context import LABEL_SHA
from render_native_mammillary_review import plane_indices


def main(wide=False):
    out=ROOT/('work/anatomy-review/nerve-origin-midbrain-wide-v1' if wide else 'work/anatomy-review/nerve-origin-sections-v1')
    if out.exists():raise ValueError('Evidence exists')
    source=ROOT/'work/anatomy-review/nerve-origin-context-v2.json'
    if hashlib.sha256(source.read_bytes()).hexdigest()!='790e28acc889afe13e9c0ea393a959c35e421c3973807c68c8e3cc929a6c2faf':raise ValueError('Origin evidence changed')
    context=json.loads(source.read_text(encoding='utf-8'))
    _,_,labels=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,LABEL_SHA)
    _,_,raw=read_browser_volume(DEFAULT_IMAGE,MAGIC_IMAGE,EXPECTED_IMAGE_SHA256)
    out.mkdir(parents=True)
    report=dict(input=context,sourceImageSha256=EXPECTED_IMAGE_SHA256,mutation=False,expertReviewed=False,
        scope=('Four III/IV origins in wider context' if wide else 'All twenty origins')+', three central orthogonal planes each; not adjacent-slice or distal-course coverage',
        display='Raw app500; yellow ID27 border; magenta box denotes rounded authored nerve origin, NOT observed nerve tissue',figures=[])
    for offset in range(0,4 if wide else 20,2):
        row_height=340 if wide else 280
        sheet=Image.new('RGB',(1020,row_height*2),'#181818');d=ImageDraw.Draw(sheet);frames=[]
        for row,entry in enumerate(context['origins'][offset:offset+2]):
            center=np.rint(entry['originAppXYZ']).astype(int)
            for fixed,axis in enumerate('xyz'):
                radius=45 if wide else 15;scale=3 if wide else 7
                crop={'min':(center-radius).tolist(),'max':(center+radius).tolist()}
                # Inferior origins can approach the source edge. Never invent padding.
                crop['min']=np.maximum(crop['min'],0).tolist();crop['max']=np.minimum(crop['max'],np.array(raw.shape)-1).tolist()
                idx=plane_indices(axis,int(center[fixed]),crop)
                values=raw[tuple(idx.reshape(-1,3).T)].reshape(idx.shape[:2])
                lab=labels[tuple(idx.reshape(-1,3).T)].reshape(idx.shape[:2])
                rgb=np.repeat(values[:,:,None],3,axis=2);rgb[_outline(lab==27)]=[220,190,0]
                im=Image.fromarray(rgb).resize((rgb.shape[1]*scale,rgb.shape[0]*scale),Image.Resampling.NEAREST)
                a,b=[k for k in range(3) if k!=fixed]
                px=(center[a]-crop['min'][a]+.5)*scale;py=(crop['max'][b]-center[b]+.5)*scale
                di=ImageDraw.Draw(im);di.rectangle((px-5,py-5,px+5,py+5),outline='#ff0088',width=1)
                x0=fixed*340;y0=row*row_height
                d.text((x0+4,y0+3),f'ID{entry["id"]} {"Left" if row==0 else "Right"} {axis.upper()}={center[fixed]} RAW500 + ID27',fill='white')
                d.text((x0+4,y0+20),f'Origin XYZ {center.tolist()}; box is NOT a nerve label',fill='white')
                sheet.paste(im,(x0,y0+44))
                frames.append(dict(id=entry['id'],name=entry['name'],axis=axis,index=int(center[fixed]),cropInclusive=crop,roundedOriginXYZ=center.tolist()))
        path=out/f'pair-{offset//2:02}.png';sheet.save(path)
        report['figures'].append(dict(path=path.name,frames=frames,sha256=hashlib.sha256(path.read_bytes()).hexdigest()))
    (out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(f'{len(report["figures"])*2} origins, {len(report["figures"])*6} orthogonal planes, {len(report["figures"])} sheets')


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--midbrain-wide',action='store_true')
    main(parser.parse_args().midbrain_wide)
