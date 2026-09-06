"""Work-only multi-label raw/current/composite review, never an adoption tool."""
import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

from audit_manual_label_space import LABEL_SHA
from build_orthogonal_review_bundle import (ROOT, DEFAULT_LABELS, DEFAULT_IMAGE,
    MAGIC_LABELS, MAGIC_IMAGE, EXPECTED_IMAGE_SHA256, read_browser_volume,
    _oriented_crop, _outline)

COMPOSITE_SHA = '485cea19a880e2ad4dee380761cfc47cff0022892fc9c1765d6f8ce1c77a73de'
COMPOSITE_RAW_SHA = 'ac1548821c11743367e9364dc1c82d4250ff750521e8a1cc582c6fe3de94d7dc'
# Fixed anatomical groups and representative centers; +/-1 on every axis.
# These are selected cross-sections, NOT complete boundary coverage.
GROUPS = (
    ('left-basal-ganglia', (7,9,11,13,19), (7,9,11,13,19,23,31), (170,276,140)),
    ('right-basal-ganglia', (8,10,12,14,20), (8,10,12,14,20,24,32), (224,276,140)),
    ('left-medial-temporal', (17,21), (17,21,23), (159,242,105)),
    ('right-medial-temporal', (18,22), (18,22,24), (235,242,105)),
    ('midbrain-subthalamus', (1,2,3,4,5,6), (1,2,3,4,5,6,15,16,25,27,31,32,39,40,41), (180,231,129)),
    ('thalamus', (15,16), (15,16,23,24,25,27,31,32), (220,239,158)),
)
COLORS = ((255,70,90),(35,215,255),(255,180,45),(180,100,255),
    (65,240,130),(255,100,220),(240,235,85),(120,165,255),
    (190,240,180),(255,155,120),(180,150,90),(120,255,220),
    (230,230,230),(155,110,200),(145,190,90))
NAMES={1:'L red nucleus',2:'R red nucleus',3:'L substantia nigra',4:'R substantia nigra',
    5:'L subthalamic',6:'R subthalamic',7:'L caudate',8:'R caudate',9:'L putamen',10:'R putamen',
    11:'L GPe',12:'R GPe',13:'L GPi',14:'R GPi',15:'L thalamus',16:'R thalamus',
    17:'L hippocampus',18:'R hippocampus',19:'L accumbens',20:'R accumbens',
    21:'L amygdala',22:'R amygdala',23:'L lateral ventricle',24:'R lateral ventricle',
    25:'Third ventricle',27:'Brainstem (coarse)',31:'L internal capsule',32:'R internal capsule',
    39:'L mammillary',40:'R mammillary',41:'Aqueduct (partial)'}


def legend_layout(width, count):
    if width<180 or count<1: raise ValueError('Invalid legend dimensions')
    columns=max(1,width//180)
    return 28+20*((count+columns-1)//columns),[(4+(n%columns)*180,24+(n//columns)*20) for n in range(count)]


def selected_planes(center, dims):
    if len(center)!=3 or len(dims)!=3 or any(c<1 or c+1>=d for c,d in zip(center,dims)):
        raise ValueError('All representative centers must allow both adjacent planes')
    return [(axis,int(center[n]+delta)) for n,axis in enumerate('xyz') for delta in (-1,0,1)]


def render_row(raw, old, new, axis, index, crop, ids):
    if len(ids)!=len(set(ids)) or not 0<len(ids)<=len(COLORS):
        raise ValueError('Palette requires unique nonempty IDs')
    plane = _oriented_crop(raw,axis,index,crop)
    height,width=plane.shape
    scale=max(1,420//width)
    row=Image.new('RGB',(3*(width*scale+10),height*scale+28),'#151515')
    ImageDraw.Draw(row).text((4,4),f'{axis.upper()}={index} | RAW / CURRENT / COMPOSITE CANDIDATE',fill='white')
    for column,labels in enumerate((None,old,new)):
        rgb=np.repeat(plane[:,:,None],3,axis=2)
        if labels is not None:
            lp=_oriented_crop(labels,axis,index,crop)
            for value,color in zip(ids,COLORS):
                rgb[_outline(lp==value)]=color
        panel=Image.fromarray(rgb).resize((width*scale,height*scale),Image.Resampling.NEAREST)
        row.paste(panel,(column*(width*scale+10),28))
    return row


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--composite',type=Path,required=True)
    parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args(); output=args.output.resolve()
    if not output.is_relative_to((ROOT/'work').resolve()) or output.exists():
        raise ValueError('Output must be a new directory strictly under work')
    _,dims,old=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,LABEL_SHA)
    _,image_dims,raw=read_browser_volume(DEFAULT_IMAGE,MAGIC_IMAGE,EXPECTED_IMAGE_SHA256)
    _,new_dims,new=read_browser_volume(args.composite,MAGIC_LABELS,COMPOSITE_SHA)
    if dims!=image_dims or dims!=new_dims or hashlib.sha256(new.tobytes(order='F')).hexdigest()!=COMPOSITE_RAW_SHA:
        raise ValueError('Composite geometry/raw identity mismatch')
    output.mkdir(parents=True)
    manifest=dict(schemaVersion=1,adopted=False,labelMutation=False,expertReview=False,
        imageSha256=EXPECTED_IMAGE_SHA256,currentSha256=LABEL_SHA,compositeSha256=COMPOSITE_SHA,
        scope='Six fixed multi-label groups, one representative center +/-1 per axis. Not full-boundary review.',
        visualReview='Generation only; actual visual inspection is recorded separately.',groups=[])
    for name,crop_ids,ids,center in GROUPS:
        points=np.argwhere(np.isin(old,crop_ids)|np.isin(new,crop_ids))
        if not len(points): raise ValueError('Empty anatomical group')
        crop=dict(min=np.maximum(points.min(0)-6,0).tolist(),max=np.minimum(points.max(0)+6,np.array(dims)-1).tolist())
        planes=selected_planes(center,dims)
        group=dict(name=name,center=center,crop=crop,palette={str(v):c for v,c in zip(ids,COLORS)},sheets=[])
        for axis in 'xyz':
            selected=[(a,i) for a,i in planes if a==axis]
            rows=[render_row(raw,old,new,a,i,crop,ids) for a,i in selected]
            width=max(r.width for r in rows)
            header,legend_positions=legend_layout(width,len(ids))
            sheet=Image.new('RGB',(width,sum(r.height for r in rows)+header),'#151515')
            draw=ImageDraw.Draw(sheet)
            draw.text((4,4),f'{name} | RESEARCH COMPOSITE, NOT ADOPTED | 0 = UNLABELED, not tissue absence',fill='white')
            for position,value,color in zip(legend_positions,ids,COLORS):
                draw.text(position,f'{value}: {NAMES[value]}',fill=color)
            top=header
            for row in rows: sheet.paste(row,(0,top)); top+=row.height
            filename=f'{name}-{axis}.png';sheet.save(output/filename)
            group['sheets'].append(dict(file=filename,planes=selected,sha256=hashlib.sha256((output/filename).read_bytes()).hexdigest()))
        manifest['groups'].append(group)
        print(name,flush=True)
    (output/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')


if __name__=='__main__': main()
