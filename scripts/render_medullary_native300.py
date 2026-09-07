"""Original transformed 300um brainstem landmarks, not upsampled app images."""
import hashlib
import json
import argparse
import numpy as np
from PIL import Image,ImageDraw
from audit_manual_label_space import SOURCE,load_identity_minc
from render_registered_manual_fine_review import IMAGE_NAME,IMAGE_SHA,fine_box,encode_image
from audit_nerve_origin_context import LABEL_SHA
from build_registered_manual_candidate import nearest_labels
from build_orthogonal_review_bundle import ROOT,DEFAULT_LABELS,MAGIC_LABELS,read_browser_volume,_oriented_crop,_outline


def main(capsule=False, midbrain=False):
    if capsule and midbrain:raise ValueError('Choose one review mode')
    out=ROOT/('work/anatomy-review/midbrain-envelope-native300-2026-09-08-v1' if midbrain else 'work/anatomy-review/capsule-native300-v1' if capsule else 'work/anatomy-review/medullary-native300-v1')
    if out.exists():raise ValueError('Evidence exists')
    raw,start,step,history=load_identity_minc(SOURCE/IMAGE_NAME,IMAGE_SHA)
    label_sha='2983ac84a194043b0f974a6ee93fd34e74efce94d7c58c66e69f34f1475a7ef3' if midbrain else LABEL_SHA
    _,_,labels=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,label_sha)
    geometry=json.loads((ROOT/'public/atlas/bigbrain-icbm500-validation.json').read_text(encoding='utf-8'))
    affine=np.array(geometry['affine']);app_start=affine[:3,3];app_step=np.diag(affine)[:3]
    out.mkdir(parents=True)
    report=dict(source300Sha256=IMAGE_SHA,labels500Sha256=label_sha,sourceHistory=history,
        method='Original transformed 300um lattice, scientific affine; projected labels are coarse context only.',
        expertReviewed=False,mutation=False,figures=[])
    selections=[(f'{side}-{axis}',axis,point) for side,point in [('left',[155,299,159]),('right',[235,299,159])] for axis in 'xyz'] if capsule else [('axial-low','z',[196,208,40]),('axial-middle','z',[196,208,48]),('axial-high','z',[196,208,56]),('left-sagittal','x',[180,208,48]),('right-sagittal','x',[212,208,48])]
    if midbrain:
        selections=[(f'sagittal-{x}','x',[x,228,130]) for x in [166,180,196,212,226]]
        selections += [(f'coronal-{y}','y',[196,y,130]) for y in [210,230,250]]
        selections += [(f'axial-{z}','z',[196,228,z]) for z in [110,130,150]]
    for name,axis,point in selections:
        world=np.array(point)*app_step+app_start
        low,high,center=fine_box(world,start,step,raw.shape,radius_mm=9 if capsule else 18)
        shape=tuple(high-low);pts=np.indices(shape).reshape(3,-1).T+low
        projected=nearest_labels(labels,pts*step+start,app_start,app_step).reshape(shape)
        native=raw[tuple(slice(int(a),int(b)) for a,b in zip(low,high))]
        gray=encode_image(native,geometry['intensityWindow']);crop=dict(min=[0,0,0],max=(np.array(shape)-1).tolist())
        rows=[];indices=[];fixed='xyz'.index(axis)
        for delta in [-1,0,1]:
            index=int(center[fixed]-low[fixed]+delta);indices.append(int(center[fixed]+delta))
            a=_oriented_crop(gray,axis,index,crop);lab=_oriented_crop(projected,axis,index,crop)
            rgb=np.repeat(a[:,:,None],3,axis=2);rgb[_outline(lab==27)]=[230,205,0];rgb[_outline(np.isin(lab,[28,29]))]=[0,220,100]
            if capsule:
                rgb=np.repeat(a[:,:,None],3,axis=2)
                rgb[_outline(np.isin(lab,[31,32]))]=[255,60,90]
                rgb[_outline((lab>0)&(lab<=22))]=[70,200,255]
            if midbrain:
                from render_current_ventral_midbrain import outlined_labels
                rgb=outlined_labels(a,lab)
            scale=3;w=a.shape[1]*scale;h=a.shape[0]*scale
            row=Image.new('RGB',(2*w+12,h+43),'#181818');d=ImageDraw.Draw(row)
            d.text((4,3),f'{name} native {indices[-1]} | raw300 / labels500' if capsule else f'{name} {axis.upper()} native index {indices[-1]}, original300 | coarse ID27 yellow / cerebellum green',fill='white')
            d.text((4,21),'Capsule red / nuclei cyan; context, not approval' if capsule else 'No nerve-exit annotation; labels do not identify olive or a precise surface groove.',fill='white')
            if midbrain:
                d.rectangle((0,0,row.width,42),fill='#181818')
                d.text((4,3),f'{name}: original300 {axis.upper()}={indices[-1]} | current500 outlines, NOT boundary approval',fill='white')
                d.text((4,21),'27 red / RN cyan / SN orange / STN purple / thalami pale blue / sagittal A=RIGHT',fill='white')
            row.paste(Image.fromarray(a).convert('RGB').resize((w,h),Image.Resampling.NEAREST),(0,43))
            row.paste(Image.fromarray(rgb).resize((w,h),Image.Resampling.NEAREST),(w+12,43));rows.append(row)
        sheet=Image.new('RGB',(rows[0].width,sum(r.height for r in rows)),'#181818');offset=0
        for row in rows:sheet.paste(row,(0,offset));offset+=row.height
        target=out/f'{name}.png';sheet.save(target)
        report['figures'].append(dict(path=target.name,axis=axis,appCenter=point,nativeIndices=indices,nativeCropExclusive=dict(low=low.tolist(),high=high.tolist()),sha256=hashlib.sha256(target.read_bytes()).hexdigest()))
    (out/'report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(f'{len(selections)} original300 sheets / {len(selections)*3} adjacent planes; no mutation')


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--capsule',action='store_true')
    parser.add_argument('--midbrain',action='store_true')
    args=parser.parse_args();main(args.capsule,args.midbrain)
