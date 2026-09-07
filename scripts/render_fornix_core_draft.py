"""Rasterize a fixed source-space draft for review only, never install labels."""
import hashlib
import json
import argparse
import numpy as np
from PIL import Image, ImageDraw
from audit_manual_label_space import SOURCE, load_identity_minc
from render_registered_manual_fine_review import IMAGE_NAME, IMAGE_SHA, encode_image
from build_orthogonal_review_bundle import ROOT, DEFAULT_LABELS, MAGIC_LABELS, read_browser_volume
from build_registered_manual_candidate import nearest_labels
from review_fornix_native300 import CURRENT_SHA

DRAFT=ROOT/'segmentation-patches/review/fornix-body-core-draft-2026-09-07.json'
DRAFT_SHA='9a82db81f99a2ebbf261c6610cd4b972fbb78c2148040c760f1259f297a9285d'


def main(trim_inner_edge=False, extend_body=False, refine_extension=False):
    if refine_extension:extend_body=True
    out=ROOT/'work/anatomy-review/fornix-core-draft-overlay-v1'
    if trim_inner_edge:out=ROOT/'work/anatomy-review/fornix-core-draft-overlay-v2'
    if extend_body:
        trim_inner_edge=True
        out=ROOT/'work/anatomy-review/fornix-core-draft-body-extension-v1'
    if refine_extension:out=ROOT/'work/anatomy-review/fornix-core-draft-body-extension-v2'
    if out.exists():raise ValueError('Preserve existing evidence')
    if hashlib.sha256(DRAFT.read_bytes()).hexdigest()!=DRAFT_SHA:raise ValueError('Draft changed')
    draft=json.loads(DRAFT.read_text(encoding='utf-8'))
    if draft['sourceSha256']!=IMAGE_SHA or draft['axis']!='y' or draft['polygonCoordinates']!='XZ':raise ValueError('Wrong coordinate system')
    if trim_inner_edge:
        # Image-guided revision of the left polygon, not global intensity masking.
        # The first overlay exposed a tip in the bright midline cleft.
        for s in draft['slices']:
            s['polygons'][0]=[[318,296],[320,299],[322,299],[323,296],[321,294],[319,294]]
    if extend_body:
        # Interior trial across already inspected Y404-421. Each rasterized
        # plane still needs overlay review; this is not automatic adoption.
        base=draft['slices'][1]['polygons']
        draft['slices']=[dict(index=y,polygons=[[[x,z-(0 if y<419 else 1 if y==419 else 2)] for x,z in poly] for poly in base]) for y in range(404,422)]
        if refine_extension:
            for s in draft['slices']:
                shift=2 if s['index']<=407 else 1 if s['index']==408 else 0
                s['polygons'][0]=[[x-shift,z] for x,z in s['polygons'][0]]
    raw,start,step,history=load_identity_minc(SOURCE/IMAGE_NAME,IMAGE_SHA)
    geometry=json.loads((ROOT/'public/atlas/bigbrain-icbm500-validation.json').read_text())
    points=[]
    for s in draft['slices']:
        canvas=Image.new('1',(raw.shape[0],raw.shape[2]));draw=ImageDraw.Draw(canvas)
        for poly in s['polygons']:draw.polygon([tuple(p) for p in poly],fill=1)
        z,x=np.nonzero(np.asarray(canvas))
        points.extend(zip(x.tolist(),[s['index']]*len(x),z.tolist()))
    points=np.asarray(points,dtype=int)
    if len({tuple(p) for p in points})!=len(points):raise ValueError('Duplicate points')
    if np.any(points<0) or np.any(points>=np.array(raw.shape)):raise ValueError('Outside source')
    if np.any((points[:,0]>=325)&(points[:,0]<=329)):raise ValueError('Draft bridges cleft')
    _,_,labels=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,CURRENT_SHA)
    affine=np.asarray(geometry['affine']);origin=affine[:3,3];spacing=np.diag(affine)[:3]
    current=nearest_labels(labels,points*step+start,origin,spacing)
    ids,counts=np.unique(current,return_counts=True)
    out.mkdir();figures=[]
    sheets=[]
    for y in (range(403,423) if extend_body else range(410,415)):
        plane=encode_image(raw[310:345,y,280:321],geometry['intensityWindow']).T[::-1,:]
        rgb=np.repeat(plane[:,:,None],3,axis=2);overlay=rgb.copy()
        for x,py,z in points:
            if py==y:overlay[320-z,x-310]=np.rint(.65*overlay[320-z,x-310]+.35*np.array([255,120,0])).astype(np.uint8)
        h,w=plane.shape;scale=8
        sheet=Image.new('RGB',(max(650,2*w*scale+12),h*scale+42),'#181818')
        ImageDraw.Draw(sheet).text((4,3),f'Registered300 Y{y}: raw / orange INTERIOR DRAFT, not adopted\nNative X310-344, Z320(top)-280(bottom). No current label changes.',fill='white')
        for col,picture in enumerate([rgb,overlay]):sheet.paste(Image.fromarray(picture).resize((w*scale,h*scale),Image.Resampling.NEAREST),(col*(w*scale+12),42))
        path=out/f'y-{y}.png';sheet.save(path)
        figures.append(dict(path=path.name,sha256=hashlib.sha256(path.read_bytes()).hexdigest(),nativeY=y))
        sheets.append(sheet)
    contacts=[]
    if extend_body:
        for offset in range(0,len(sheets),3):
            group=sheets[offset:offset+3];combined=Image.new('RGB',(group[0].width,sum(s.height for s in group)))
            dy=0
            for s in group:combined.paste(s,(0,dy));dy+=s.height
            path=out/f'contact-{offset//3}.png';combined.save(path)
            contacts.append(dict(path=path.name,sha256=hashlib.sha256(path.read_bytes()).hexdigest(),nativeY=list(range(403+offset,403+offset+len(group)))))
    report=dict(draftSha256=DRAFT_SHA,trimInnerEdge=trim_inner_edge,extendBody=extend_body,refineExtension=refine_extension,rasterizedDraft=draft,sourceSha256=IMAGE_SHA,currentSha256=CURRENT_SHA,
        sourcePoints=points.tolist(),sourcePointCount=len(points),currentLabelAtSourceCenters={str(i):int(n) for i,n in zip(ids,counts)},
        sourceIntensityRange=[int(raw[tuple(points.T)].min()),int(raw[tuple(points.T)].max())],
        figures=figures,contacts=contacts,mutation=False,adopted=False,visualReviewPending=True,
        limitation='Native300 draft only. Center-sampled application labels are not an application voxel patch or proof of tissue identity.')
    (out/'report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:report[k] for k in ['sourcePointCount','currentLabelAtSourceCenters','sourceIntensityRange','adopted']}))


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    group=parser.add_mutually_exclusive_group()
    group.add_argument('--trim-inner-edge',action='store_true')
    group.add_argument('--extend-body',action='store_true')
    group.add_argument('--refine-extension',action='store_true')
    args=parser.parse_args()
    main(args.trim_inner_edge,args.extend_body,args.refine_extension)
