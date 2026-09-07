"""Show exact tissue tracking references in three planes; no segmentation writes."""
import hashlib
import argparse
import json
import numpy as np
from PIL import Image, ImageDraw
from audit_manual_label_space import SOURCE, load_identity_minc
from render_registered_manual_fine_review import IMAGE_NAME, IMAGE_SHA, encode_image
from build_orthogonal_review_bundle import ROOT


def main(connection=False):
    path=ROOT/('segmentation-patches/review/fornix-connection-reference-points-2026-09-07.json' if connection else 'segmentation-patches/review/fornix-bend-reference-points-2026-09-07.json')
    record=json.loads(path.read_text(encoding='utf-8'))
    points=record['referencePoints']
    expected=[[322,422,291],[331,422,291]] if connection else [[321,422,284],[330,422,286],[321,428,282],[330,428,284],[321,434,281],[330,434,281]]
    if record['sourceSha256']!=IMAGE_SHA or points!=expected:
        raise ValueError('Reference contract changed')
    out=ROOT/('work/anatomy-review/fornix-connection-reference-orthogonal-v1' if connection else 'work/anatomy-review/fornix-bend-reference-orthogonal-v1')
    if out.exists():raise ValueError('Preserve evidence')
    raw,_,_,_=load_identity_minc(SOURCE/IMAGE_NAME,IMAGE_SHA)
    geometry=json.loads((ROOT/'public/atlas/bigbrain-icbm500-validation.json').read_text())
    low=np.array([305,393,255]);high=np.array([350,455,325])
    crop=raw[tuple(slice(a,b) for a,b in zip(low,high))]
    out.mkdir();figures=[]
    for number,p in enumerate(points):
        sheets=[]
        for axis in range(3):
            remaining=[a for a in range(3) if a!=axis]
            gray=encode_image(np.take(crop,p[axis]-low[axis],axis=axis),geometry['intensityWindow']).T[::-1,:]
            h,w=gray.shape;scale=5
            sheet=Image.new('RGB',(2*w*scale+12,h*scale+30),'#181818')
            picture=Image.fromarray(gray).convert('RGB').resize((w*scale,h*scale),Image.Resampling.NEAREST)
            sheet.paste(picture,(0,30));sheet.paste(picture,(w*scale+12,30))
            draw=ImageDraw.Draw(sheet);draw.text((3,3),f'XYZ {p}; {"XYZ"[axis]}{p[axis]} raw / reference crosshair (NOT mask)',fill='white')
            x=w*scale+12+(p[remaining[0]]-low[remaining[0]]+.5)*scale
            y=30+(high[remaining[1]]-1-p[remaining[1]]+.5)*scale
            for a,b,c,d in [(x-10,y,x-4,y),(x+4,y,x+10,y),(x,y-10,x,y-4),(x,y+4,x,y+10)]:draw.line((a,b,c,d),fill='#ff9b30',width=1)
            sheets.append(sheet)
        combined=Image.new('RGB',(max(s.width for s in sheets),sum(s.height for s in sheets)),'#181818');dy=0
        for s in sheets:combined.paste(s,(0,dy));dy+=s.height
        target=out/f'point-{number}.png';combined.save(target)
        figures.append(dict(xyz=p,path=target.name,sha256=hashlib.sha256(target.read_bytes()).hexdigest(),rawValue=int(raw[tuple(p)])))
    (out/'report.json').write_text(json.dumps(dict(referenceSha256=hashlib.sha256(path.read_bytes()).hexdigest(),sourceSha256=IMAGE_SHA,figures=figures,mutation=False,adopted=False,visualReviewPending=True),indent=2)+'\n',encoding='utf-8')
    print(json.dumps(figures))


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--connection',action='store_true')
    main(parser.parse_args().connection)
