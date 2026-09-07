"""Render every affected plane of the fixed 22-voxel candidate; no installation."""
import hashlib
import argparse
import json
import numpy as np
from PIL import Image, ImageDraw
from build_orthogonal_review_bundle import ROOT, DEFAULT_LABELS, DEFAULT_IMAGE, MAGIC_LABELS, MAGIC_IMAGE, EXPECTED_IMAGE_SHA256, read_browser_volume, _oriented_crop, _outline
from review_third_ventricle_native300 import LABEL_SHA


def main(expanded=False, support=False, central_core=False, fourth_wall=False, fourth_extended=False, fourth_next=False, detached8=False):
    if sum([expanded,support,central_core,fourth_wall,fourth_extended,fourth_next,detached8]) > 1:raise ValueError('Choose one candidate')
    candidate=ROOT/('work/anatomy-review/third-ventricle-expanded-candidate-v1/candidate.json' if expanded else 'work/anatomy-review/third-ventricle-central-candidate-v1/candidate.json')
    if support:candidate=ROOT/'work/anatomy-review/third-ventricle-support-candidate-v1/candidate.json'
    if central_core:candidate=ROOT/'work/anatomy-review/third-ventricle-central-core-candidate-v1/candidate.json'
    if fourth_wall:candidate=ROOT/'work/anatomy-review/fourth-ventricle-wall-candidate-v1/candidate.json'
    if fourth_extended:candidate=ROOT/'work/anatomy-review/fourth-ventricle-wall-extended-candidate-v1/candidate.json'
    if fourth_next:candidate=ROOT/'work/anatomy-review/fourth-ventricle-anterior-next-candidate-v1/candidate.json'
    if detached8:candidate=ROOT/'work/anatomy-review/third-detached137-support-v1.json'
    candidate_sha=hashlib.sha256(candidate.read_bytes()).hexdigest()
    expected_sha='80a54c322225cf60592a1419073264e35d3d346d1c58c47d28084f036eeab84a' if expanded else '54499864775c71dd9242deb0c7c2f11947c6b8129bf2998adafe4f3a85d7e07c'
    count=1224 if expanded else 22
    if support:
        expected_sha='60b8910bdb0d0cf94e704192fee98b9437d0f8e5003677b55f0aa4ce7121cde9'
        count=2072
    if central_core:
        expected_sha='cf3ccf9f1415bf798fe659f353c0b646f42ce022db73a413606ff49f17a6f1fd'
        count=1587
    label_sha=LABEL_SHA; target=25
    if fourth_wall or fourth_extended:
        expected_sha='3e94ebf6534e83ca1231169d1ac2880f1f46e5db226a13176f2364bf9046ebda'
        count=5; target=26
        label_sha='9bc51ab0b0f6932871a93a0d225491ed0649ef827012a7db41d3f3e049b166a8'
    if fourth_extended:
        expected_sha='7151723811e2d39e7b6b2ccb2c053c5edbfa814aa5956574a2bdcdb4b4a71e9f'
        count=108
    if fourth_next:
        expected_sha='adcbfe9bc10bf811af0eb5ec005f43cfb803370f1f12ee1070ffc58561ff85b1'
        label_sha='e98cd4060d735c732a5fd75030be2f701f57fe91b6cd5b9a12c65e1cb68b37e3'
        count=105;target=26
    if detached8:
        expected_sha='627c4b06bf36a9b30b804c9c1a28f2bbe064beafa1e877b10b1aee7e1885f2cc'
        label_sha='ffb8e56e0939f97b6bc9f8e2585bb3f74e11b525006c6f7d631ae85cd4b033c2'
        count=8
    if candidate_sha!=expected_sha:raise ValueError('Candidate changed')
    report=json.loads(candidate.read_text())
    records=([dict(**p,after=25) for p in report['groups']['zeroFaceFringe']['records'] if p['finiteMinimum']>=65000] if detached8 else [p for p in report['records'] if p['selected']])
    if len(records)!=count:raise ValueError('Count changed')
    _,_,before=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,label_sha)
    _,_,gray=read_browser_volume(DEFAULT_IMAGE,MAGIC_IMAGE,EXPECTED_IMAGE_SHA256)
    after=before.copy();points=np.array([p['xyz'] for p in records])
    for p in records:
        xyz=tuple(p['xyz'])
        if p['before']!=0 or p['after']!=target or before[xyz]!=0:raise ValueError('Invalid transition')
        after[xyz]=target
    if np.count_nonzero(before!=after)!=count:raise ValueError('Unexpected mutation')
    out=ROOT/('work/anatomy-review/third-ventricle-expanded-difference-v1' if expanded else 'work/anatomy-review/third-ventricle-central-difference-v1')
    if support:out=ROOT/'work/anatomy-review/third-ventricle-support-difference-v1'
    if central_core:out=ROOT/'work/anatomy-review/third-ventricle-central-core-difference-v1'
    if fourth_wall:out=ROOT/'work/anatomy-review/fourth-ventricle-wall-difference-v1'
    if fourth_extended:out=ROOT/'work/anatomy-review/fourth-ventricle-wall-extended-difference-v1'
    if fourth_next:out=ROOT/'work/anatomy-review/fourth-ventricle-anterior-next-difference-v1'
    if detached8:out=ROOT/'work/anatomy-review/third-detached8-difference-v1'
    if out.exists():raise ValueError('Evidence exists')
    out.mkdir();figures=[]
    crop=dict(min=[184,212,130],max=[207,246,156])
    if expanded or support or central_core:crop=dict(min=[180,195,125],max=[212,285,180])
    if detached8:crop=dict(min=[184,230,152],max=[206,270,181])
    if fourth_wall or fourth_extended or fourth_next:crop=dict(min=[178,155,55],max=[214,200,100])
    for dim,axis in enumerate('xyz'):
        indices=list(range(int(points[:,dim].min())-1,int(points[:,dim].max())+2))
        for offset in range(0,len(indices),3):
            rows=[];group=indices[offset:offset+3]
            for index in group:
                plane=_oriented_crop(gray,axis,index,crop)
                a=_oriented_crop(before,axis,index,crop);b=_oriented_crop(after,axis,index,crop)
                rgb=np.repeat(plane[:,:,None],3,axis=2);old=rgb.copy();new=rgb.copy()
                old[_outline(a==target)]=[255,60,90];old[a!=b]=[255,210,0]
                new[_outline(b==target)]=[255,60,90]
                h,w=plane.shape;scale=7
                row=Image.new('RGB',(max(780,w*scale*3+16),h*scale+40),'#181818')
                ImageDraw.Draw(row).text((4,4),f'{axis.upper()}{index}: RAW500 / before + proposed addition yellow / candidate; NOT adopted',fill='white')
                for col,picture in enumerate([rgb,old,new]):row.paste(Image.fromarray(picture).resize((w*scale,h*scale),Image.Resampling.NEAREST),(col*(w*scale+8),40))
                rows.append(row)
            sheet=Image.new('RGB',(rows[0].width,sum(r.height for r in rows)));y=0
            for row in rows:sheet.paste(row,(0,y));y+=row.height
            path=out/f'{axis}-{offset//3:02}.png';sheet.save(path)
            figures.append(dict(path=path.name,sha256=hashlib.sha256(path.read_bytes()).hexdigest(),axis=axis,indices=group))
    (out/'report.json').write_text(json.dumps(dict(inputSha256=label_sha,candidateSha256=candidate_sha,points=points.tolist(),crop=crop,figures=figures,adopted=False,mutation=False),indent=2)+'\n',encoding='utf-8')
    print(json.dumps(dict(planes=sum(len(f['indices']) for f in figures),figures=len(figures),bbox=[points.min(0).tolist(),points.max(0).tolist()])))


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    group=parser.add_mutually_exclusive_group()
    group.add_argument('--expanded',action='store_true')
    group.add_argument('--support',action='store_true')
    group.add_argument('--central-core',action='store_true')
    group.add_argument('--fourth-wall',action='store_true')
    group.add_argument('--fourth-extended',action='store_true')
    group.add_argument('--fourth-next',action='store_true')
    group.add_argument('--detached8',action='store_true')
    args=parser.parse_args()
    main(args.expanded,args.support,args.central_core,args.fourth_wall,args.fourth_extended,args.fourth_next,args.detached8)
