"""Original300 review of fixed lateral-ventricle fringe components, no adoption."""
import hashlib
import json
import argparse
import numpy as np
from PIL import Image, ImageDraw
from audit_manual_label_space import SOURCE, load_identity_minc
from render_registered_manual_fine_review import IMAGE_NAME, IMAGE_SHA, encode_image
from build_orthogonal_review_bundle import ROOT, DEFAULT_LABELS, MAGIC_LABELS, read_browser_volume, _outline
from build_registered_manual_candidate import nearest_labels
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
    if report['labelSha256']!=CURRENT_SHA or report['sourceSha256']!=IMAGE_SHA:raise ValueError('Source mismatch')
    label_sha='83dcbdda59e86f393cc93b9d91ccd8f68c1fa08bc1156df99467fe3aef792567' if args.next_components else CURRENT_SHA
    label_path=ROOT/('tests/fixtures/bigbrain-practical-segmentation-pre-lateral-next-83dc.bin.gz' if args.next_components else 'tests/fixtures/bigbrain-practical-segmentation-pre-lateral-fringe-d429.bin.gz')
    components=[(23,334,119),(24,66,146)] if args.next_components else [(23,339,144),(24,73,164)]
    out=ROOT/('work/anatomy-review/lateral-ventricle-fringe-next-v1' if args.next_components else 'work/anatomy-review/lateral-ventricle-fringe-largest-v1')
    if args.remaining_large:
        label_sha='7c54fdd2e391ca3e1ed70f7e5fdead7be940d1007b891eb4bb4dd22d7407f0ef';label_path=DEFAULT_LABELS
        components=[(23,59,61),(23,278,61),(23,297,51),(24,88,132),(24,103,123),(24,52,84),(24,124,66),(24,21,52)]
        out=ROOT/'work/anatomy-review/lateral-fringe-remaining-large-native-v1'
    if args.medium_components:
        label_sha='b473638881ac75dc3ce27cf9963d612ffa41f768906e895f2281954c44be9567'
        label_path=DEFAULT_LABELS
        components=[(r['target'],c['id'],len(c['points'])) for r in report['results'] for c in r['components'] if 20<=len(c['points'])<50]
        if len(components)!=31 or sum(c for _,_,c in components)!=867:raise ValueError('Medium inventory changed')
        out=ROOT/'work/anatomy-review/lateral-fringe-medium-native-v1'
    if out.exists():raise ValueError('Preserve evidence')
    _,_,labels=read_browser_volume(label_path,MAGIC_LABELS,label_sha)
    raw,start,step,_=load_identity_minc(SOURCE/IMAGE_NAME,IMAGE_SHA)
    geometry=json.loads((ROOT/'public/atlas/bigbrain-icbm500-validation.json').read_text())
    affine=np.asarray(geometry['affine']);origin=affine[:3,3];spacing=np.diag(affine)[:3]
    out.mkdir();figures=[]
    for target,component,count in components:
        entry=next(r for r in report['results'] if r['target']==target)
        c=next(c for c in entry['components'] if c['id']==component)
        points=np.asarray(c['points'],dtype=int)
        if len(points)!=count:raise ValueError('Component changed')
        if np.any(labels[tuple(points.T)]!=0):raise ValueError('Candidate overlaps current label')
        center=np.rint(((points.min(0)+points.max(0))/2*spacing+origin-start)/step).astype(int)
        low=np.floor((points.min(0)*spacing+origin-start-4)/step).astype(int)
        high=np.ceil((points.max(0)*spacing+origin-start+4)/step).astype(int)+1
        if np.any(low<0) or np.any(high>raw.shape):raise ValueError('Crop outside source')
        shape=high-low;grid=np.indices(shape).reshape(3,-1).T+low;world=grid*step+start
        projected=nearest_labels(labels,world,origin,spacing).reshape(shape)
        trial=np.zeros(labels.shape,dtype=np.uint8);trial[tuple(points.T)]=1
        selected=nearest_labels(trial,world,origin,spacing).reshape(shape)>0
        gray=encode_image(raw[tuple(slice(a,b) for a,b in zip(low,high))],geometry['intensityWindow'])
        for axis in range(3):
            sheets=[]
            for delta in [-1,0,1]:
                index=int(center[axis]+delta);local=index-low[axis]
                plane=np.take(gray,local,axis=axis).T[::-1,:]
                lab=np.take(projected,local,axis=axis).T[::-1,:]
                sel=np.take(selected,local,axis=axis).T[::-1,:]
                rgb=np.repeat(plane[:,:,None],3,axis=2);overlay=rgb.copy()
                overlay[_outline(lab==target)]=[255,60,90]
                overlay[sel]=np.rint(.6*overlay[sel]+.4*np.array([255,150,0])).astype(np.uint8)
                h,w=plane.shape;scale=5
                sheet=Image.new('RGB',(max(650,2*w*scale+12),h*scale+36),'#181818')
                ImageDraw.Draw(sheet).text((4,3),f'ID{target} C{component} original300 {"XYZ"[axis]}{index}: raw / overlay\nRed existing ventricle; orange UNADOPTED fringe. Not all component planes.',fill='white')
                for col,p in enumerate((rgb,overlay)):sheet.paste(Image.fromarray(p).resize((w*scale,h*scale),Image.Resampling.NEAREST),(col*(w*scale+12),36))
                sheets.append(sheet)
            combined=Image.new('RGB',(sheets[0].width,sum(s.height for s in sheets)));dy=0
            for s in sheets:combined.paste(s,(0,dy));dy+=s.height
            name=f'id{target}-c{component}-{"xyz"[axis]}.png' if args.remaining_large or args.medium_components else f'id{target}-{"xyz"[axis]}.png'
            file=out/name;combined.save(file)
            figures.append(dict(path=file.name,target=target,component=component,axis='xyz'[axis],indices=[int(center[axis]+d) for d in [-1,0,1]],cropExclusive=dict(low=low.tolist(),high=high.tolist()),sha256=hashlib.sha256(file.read_bytes()).hexdigest()))
    (out/'report.json').write_text(json.dumps(dict(inventorySha256=digest,inventoryLabelSha256=CURRENT_SHA,sourceSha256=IMAGE_SHA,labelSha256=label_sha,figures=figures,mutation=False,adopted=False,visualReviewPending=True),indent=2)+'\n',encoding='utf-8')
    print(json.dumps(figures))


if __name__=='__main__':main()
