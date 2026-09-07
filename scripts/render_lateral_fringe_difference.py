"""Every affected app plane of two pinned fringe components, work-only."""
import hashlib
import json
import argparse
import numpy as np
from PIL import Image, ImageDraw
from build_orthogonal_review_bundle import ROOT, DEFAULT_LABELS, DEFAULT_IMAGE, MAGIC_LABELS, MAGIC_IMAGE, EXPECTED_IMAGE_SHA256, read_browser_volume, _oriented_crop, _outline
from review_fornix_native300 import CURRENT_SHA


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--next-components',action='store_true')
    parser.add_argument('--remaining-large',action='store_true')
    parser.add_argument('--medium-components',action='store_true')
    args=parser.parse_args()
    if sum((args.next_components,args.remaining_large,args.medium_components))>1:raise ValueError('Choose one review batch')
    path=ROOT/'work/anatomy-review/lateral-ventricle-fringe-v1/report.json'
    digest=hashlib.sha256(path.read_bytes()).hexdigest()
    if digest!='1c8884fe812d21d3ec6303e9dff2878e2374bd6767bfee8b0dff3b3ca78c6042':raise ValueError('Inventory changed')
    report=json.loads(path.read_text(encoding='utf-8'))
    label_sha='83dcbdda59e86f393cc93b9d91ccd8f68c1fa08bc1156df99467fe3aef792567' if args.next_components else CURRENT_SHA
    label_path=ROOT/('tests/fixtures/bigbrain-practical-segmentation-pre-lateral-next-83dc.bin.gz' if args.next_components else 'tests/fixtures/bigbrain-practical-segmentation-pre-lateral-fringe-d429.bin.gz')
    components=[(23,334,119),(24,66,146)] if args.next_components else [(23,339,144),(24,73,164)]
    out=ROOT/('work/anatomy-review/lateral-fringe-next-difference-v1' if args.next_components else 'work/anatomy-review/lateral-fringe-difference-v1')
    if args.remaining_large:
        label_sha='7c54fdd2e391ca3e1ed70f7e5fdead7be940d1007b891eb4bb4dd22d7407f0ef';label_path=DEFAULT_LABELS
        components=[(23,59,61),(23,278,61),(23,297,51),(24,88,132),(24,103,123),(24,52,84),(24,124,66),(24,21,52)]
        out=ROOT/'work/anatomy-review/lateral-fringe-remaining-large-difference-v1'
    if args.medium_components:
        label_sha='b473638881ac75dc3ce27cf9963d612ffa41f768906e895f2281954c44be9567'
        label_path=DEFAULT_LABELS
        components=[(r['target'],c['id'],len(c['points'])) for r in report['results'] for c in r['components'] if 20<=len(c['points'])<50]
        if len(components)!=31 or sum(c for _,_,c in components)!=867:raise ValueError('Medium inventory changed')
        out=ROOT/'work/anatomy-review/lateral-fringe-medium-difference-v1'
    if out.exists():raise ValueError('Preserve evidence')
    _,_,before=read_browser_volume(label_path,MAGIC_LABELS,label_sha)
    _,_,gray=read_browser_volume(DEFAULT_IMAGE,MAGIC_IMAGE,EXPECTED_IMAGE_SHA256)
    out.mkdir();figures=[]
    for target,ident,count in components:
        entry=next(r for r in report['results'] if r['target']==target)
        p=np.asarray(next(c for c in entry['components'] if c['id']==ident)['points'],dtype=int)
        if len(p)!=count or np.any(before[tuple(p.T)]!=0):raise ValueError('Unexpected candidate')
        after=before.copy();after[tuple(p.T)]=target
        crop=dict(min=(p.min(0)-8).tolist(),max=(p.max(0)+8).tolist())
        for dim,axis in enumerate('xyz'):
            indices=list(range(int(p[:,dim].min())-1,int(p[:,dim].max())+2))
            for offset in range(0,len(indices),3):
                group=indices[offset:offset+3];rows=[]
                for index in group:
                    plane=_oriented_crop(gray,axis,index,crop)
                    a=_oriented_crop(before,axis,index,crop);b=_oriented_crop(after,axis,index,crop)
                    rgb=np.repeat(plane[:,:,None],3,axis=2);old=rgb.copy();new=rgb.copy()
                    old[_outline(a==target)]=[255,60,90];old[a!=b]=[255,200,0]
                    new[_outline(b==target)]=[255,60,90]
                    h,w=plane.shape;scale=6
                    row=Image.new('RGB',(max(650,w*scale*3+16),h*scale+32),'#181818')
                    ImageDraw.Draw(row).text((3,3),f'ID{target} {axis.upper()}{index}: raw / old + yellow trial / new\nWork-only candidate, NOT adopted',fill='white')
                    for col,picture in enumerate((rgb,old,new)):row.paste(Image.fromarray(picture).resize((w*scale,h*scale),Image.Resampling.NEAREST),(col*(w*scale+8),32))
                    rows.append(row)
                sheet=Image.new('RGB',(rows[0].width,sum(r.height for r in rows)));dy=0
                for row in rows:sheet.paste(row,(0,dy));dy+=row.height
                name=f'id{target}-c{ident}-{axis}-{offset//3}.png' if args.remaining_large or args.medium_components else f'id{target}-{axis}-{offset//3}.png'
                file=out/name;sheet.save(file)
                figures.append(dict(path=file.name,target=target,component=ident,axis=axis,indices=group,cropInclusive=crop,sha256=hashlib.sha256(file.read_bytes()).hexdigest()))
    (out/'report.json').write_text(json.dumps(dict(inventorySha256=digest,inventoryLabelSha256=CURRENT_SHA,labelSha256=label_sha,imageSha256=EXPECTED_IMAGE_SHA256,figures=figures,adopted=False,mutation=False,visualReviewPending=True),indent=2)+'\n',encoding='utf-8')
    print(json.dumps(dict(figures=len(figures),planes=sum(len(f['indices']) for f in figures))))


if __name__=='__main__':main()
