"""Inspect unchanged V model origins and early tissue entry, no proposed geometry."""
import hashlib
import json
import numpy as np
from PIL import Image, ImageDraw
from audit_nerve_origin_context import LABEL_SHA
from build_orthogonal_review_bundle import ROOT, DEFAULT_IMAGE, DEFAULT_LABELS, MAGIC_IMAGE, MAGIC_LABELS, EXPECTED_IMAGE_SHA256, read_browser_volume, _outline
from render_native_mammillary_review import plane_indices


def main(medullary=False):
    source=ROOT/'work/anatomy-review/nerve-path-tissue-v1.json'
    profile=json.loads(source.read_text(encoding='utf-8'))
    if profile['sourceImageSha256']!=EXPECTED_IMAGE_SHA256 or profile['labelsSha256']!=LABEL_SHA:
        raise ValueError('Wrong profile sources')
    out=ROOT/('work/anatomy-review/medullary-proximal-v1' if medullary else 'work/anatomy-review/trigeminal-proximal-v1')
    if out.exists():raise ValueError('Evidence exists')
    _,_,raw=read_browser_volume(DEFAULT_IMAGE,MAGIC_IMAGE,EXPECTED_IMAGE_SHA256)
    _,_,labels=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,LABEL_SHA)
    out.mkdir()
    report=dict(imageSha256=EXPECTED_IMAGE_SHA256, labelsSha256=LABEL_SHA,
        profileSha256=hashlib.sha256(source.read_bytes()).hexdigest(), mutation=False, figures=[])
    for region in ([38,39,40,41,42,43] if medullary else [30,31]):
        path=next(p for p in profile['paths'] if p['id']==region)
        for ring in ([0] if medullary else [0,4]):
            point=path['samples'][ring]['appXYZ'];center=np.rint(point).astype(int)
            radius=24 if medullary else 30
            crop=dict(min=(center-radius).tolist(),max=(center+radius).tolist())
            if np.any(center-radius<0) or np.any(center+radius>=raw.shape):raise ValueError('Crop out of bounds')
            sheet=Image.new('RGB',(900,1000),'#181818');draw=ImageDraw.Draw(sheet)
            draw.text((5,4),f'Existing nerve model ID{region}, ring{ring}, rounded appXYZ {center.tolist()}',fill='white')
            draw.text((5,23),'Magenta = point projected into adjacent planes, NOT observed nerve; yellow brainstem / green cerebellum' if medullary else 'Magenta = point projected into adjacent planes, NOT observed nerve; yellow brainstem / purple hippocampus',fill='white')
            frames=[]
            for fixed,axis in enumerate('xyz'):
                a,b=[i for i in range(3) if i!=fixed]
                for row,delta in enumerate([-1,0,1]):
                    index=int(center[fixed]+delta);idx=plane_indices(axis,index,crop)
                    val=raw[tuple(idx.reshape(-1,3).T)].reshape(idx.shape[:2])
                    lab=labels[tuple(idx.reshape(-1,3).T)].reshape(idx.shape[:2])
                    rgb=np.repeat(val[:,:,None],3,axis=2)
                    rgb[_outline(lab==27)]=[230,205,0]
                    rgb[_outline(np.isin(lab,[17,18]))]=[145,85,225]
                    if medullary:rgb[_outline(np.isin(lab,[28,29]))]=[0,220,100]
                    im=Image.fromarray(rgb).resize((244,244),Image.Resampling.NEAREST);d=ImageDraw.Draw(im)
                    scale=244/(2*radius+1)
                    x=(point[a]-crop['min'][a]+.5)*scale;y=(crop['max'][b]-point[b]+.5)*scale
                    d.rectangle((x-4,y-4,x+4,y+4),outline='#ff0088',width=1)
                    x0=fixed*300;y0=50+row*310
                    draw.text((x0+4,y0),f'{axis.upper()}={index}',fill='white');sheet.paste(im,(x0,y0+24))
                    frames.append(dict(axis=axis,index=index))
            target=out/f'model-{region}-ring-{ring}.png';sheet.save(target)
            report['figures'].append(dict(file=target.name, modelId=region,ring=ring,pointXYZ=point,cropInclusive=crop,frames=frames,sha256=hashlib.sha256(target.read_bytes()).hexdigest()))
    (out/'report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(f'{len(report["figures"])} sheets generated; not yet visually reviewed. No mutation.')


if __name__=='__main__':
    import argparse
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--medullary',action='store_true',help='Inspect all six IX/X/XI origins, not the unchanged V paths')
    main(parser.parse_args().medullary)
