"""Read-only native 300um optic-region image; labels are only projected context."""
import hashlib
import json
import argparse
import numpy as np
from PIL import Image, ImageDraw
from audit_manual_label_space import SOURCE, load_identity_minc
from render_registered_manual_fine_review import IMAGE_NAME, IMAGE_SHA, fine_box, encode_image
from build_registered_manual_candidate import nearest_labels
from render_current_ventral_midbrain import LABEL_SHA, outlined_labels
from build_orthogonal_review_bundle import ROOT, DEFAULT_LABELS, MAGIC_LABELS, read_browser_volume, _oriented_crop, _outline

def main(insula=False):
    out=ROOT/('work/anatomy-review/insula-native300-v1' if insula else 'work/anatomy-review/optic-native300-v1')
    if out.exists():raise ValueError('Refusing to overwrite evidence')
    _,_,labels=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,LABEL_SHA)
    geometry=json.loads((ROOT/'public/atlas/bigbrain-icbm500-validation.json').read_text(encoding='utf-8'))
    affine=np.array(geometry['affine']); app_start=affine[:3,3]; app_step=np.diag(affine)[:3]
    raw,start,step,history=load_identity_minc(SOURCE/IMAGE_NAME,IMAGE_SHA)
    out.mkdir(parents=True)
    report=dict(image300Sha256=IMAGE_SHA,labels500Sha256=LABEL_SHA,history=history,
                mutation=False,expertReviewed=False,method='Native transformed 300um image; nearest-neighbor projected 500um labels are context only, not finer segmentation.',regions=[])
    regions=[('insula-low-x',[120,299,147]),('insula-high-x',[271,299,147])] if insula else [('transverse',[196,280,100]),('lateral-low-x',[180,260,115]),('lateral-high-x',[213,260,115])]
    for name,point in regions:
        world=np.array(point)*app_step+app_start
        low,high,center=fine_box(world,start,step,raw.shape,radius_mm=6)
        shape=tuple(high-low); pts=np.indices(shape).reshape(3,-1).T+low
        projected=nearest_labels(labels,pts*step+start,app_start,app_step).reshape(shape)
        native=raw[tuple(slice(int(a),int(b)) for a,b in zip(low,high))]
        gray=encode_image(native,geometry['intensityWindow'])
        crop=dict(min=[0,0,0],max=(np.array(shape)-1).tolist())
        record=dict(name=name,app500Point=point,worldMm=world.tolist(),nativeCenter=center.tolist(),nativeStart=start.tolist(),nativeStep=step.tolist(),images=[])
        for an,axis in enumerate('xyz'):
            rows=[]
            for delta in [-1,0,1]:
                index=int(center[an]-low[an]+delta)
                r=_oriented_crop(gray,axis,index,crop); lab=_oriented_crop(projected,axis,index,crop)
                w,h=r.shape[1]*5,r.shape[0]*5
                row=Image.new('RGB',(max(640,2*w+10),h+52),'#171717')
                d=ImageDraw.Draw(row)
                d.text((4,2),f'{name} {axis.upper()} native={int(center[an]+delta)} | raw300 / projected labels500',fill='white')
                d.text((4,18),'34 magenta / 35 cyan: atlas-derived insula outlines' if insula else '33 yellow MIXED; 39/40 green; 25 blue; 27 red; SN orange',fill='white')
                d.text((4,34),'No proposed boundary; no new labels; native slice spacing 0.3mm',fill='white')
                row.paste(Image.fromarray(r).convert('RGB').resize((w,h),Image.Resampling.NEAREST),(0,52))
                rgb=outlined_labels(r,lab)
                if insula:
                    rgb=np.repeat(r[:,:,None],3,axis=2)
                    for label_id,color in [(34,[255,60,150]),(35,[60,220,240])]:rgb[_outline(lab==label_id)]=color
                row.paste(Image.fromarray(rgb).resize((w,h),Image.Resampling.NEAREST),(w+10,52))
                rows.append(row)
            sheet=Image.new('RGB',(rows[0].width,sum(r.height for r in rows)),'#171717')
            offset=0
            for row in rows:sheet.paste(row,(0,offset));offset+=row.height
            path=out/f'{name}-{axis}.png';sheet.save(path)
            record['images'].append(dict(path=path.name,sha256=hashlib.sha256(path.read_bytes()).hexdigest(),nativeIndices=[int(center[an]+d) for d in [-1,0,1]]))
        report['regions'].append(record)
    (out/'report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(f'Rendered {len(regions)*9} native-image comparisons in {len(regions)*3} sheets; no mutation')

if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--insula',action='store_true')
    main(parser.parse_args().insula)
