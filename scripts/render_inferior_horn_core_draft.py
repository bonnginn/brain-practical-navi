"""Image-guided native-space interior trial, never a product label or auto-bridge."""
import json
import argparse
import numpy as np
from PIL import Image, ImageDraw
from audit_manual_label_space import SOURCE, load_identity_minc
from render_registered_manual_fine_review import IMAGE_NAME, IMAGE_SHA, encode_image
from build_orthogonal_review_bundle import ROOT, DEFAULT_LABELS, MAGIC_LABELS, read_browser_volume, _outline
from build_registered_manual_candidate import nearest_labels
from diagnose_inferior_horn_sampling import SHA
from stage_third_ventricle_core_repair import digest


def draft_points():
    # Drawn from the inspected Y314..325 raw series. This small triangle
    # deliberately does not bridge either existing component endpoint.
    plane=Image.new('1',(32,32))
    ImageDraw.Draw(plane).polygon([(3,12),(7,12),(5,14)],fill=1)
    z,x=np.nonzero(np.asarray(plane))
    return np.asarray([(int(px+440),y,int(pz+220)) for y in range(315,320) for px,pz in zip(x,z)])


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--lower-core',action='store_true',help='Move the trial 2 native Z cells inward after v1 wall overlap; preserve v1')
    args=parser.parse_args()
    out=ROOT/'work/anatomy-review'/('inferior-horn-core-draft-v2' if args.lower_core else 'inferior-horn-core-draft-v1')
    if out.exists():raise ValueError('Preserve evidence')
    _,_,labels=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,SHA)
    raw,start,step,_=load_identity_minc(SOURCE/IMAGE_NAME,IMAGE_SHA)
    geo=json.loads((ROOT/'public/atlas/bigbrain-icbm500-validation.json').read_text(encoding='utf-8'))
    affine=np.asarray(geo['affine']);origin=affine[:3,3];spacing=np.diag(affine)[:3]
    low=np.array([416,288,195]);high=np.array([468,355,257]);shape=high-low
    grid=np.indices(shape).reshape(3,-1).T+low
    projected=nearest_labels(labels,grid*step+start,origin,spacing).reshape(shape)
    points=draft_points()
    if args.lower_core:points[:,2]-=2
    mask=np.zeros(tuple(shape),dtype=bool);mask[tuple((points-low).T)]=True
    gray=encode_image(raw[tuple(slice(a,b) for a,b in zip(low,high))],geo['intensityWindow'])
    figures=[];out.mkdir()
    for axis in range(3):
        for index in range(int(points[:,axis].min())-1,int(points[:,axis].max())+2):
            plane=np.take(gray,index-low[axis],axis=axis).T[::-1]
            lab=np.take(projected,index-low[axis],axis=axis).T[::-1]
            proposed=np.take(mask,index-low[axis],axis=axis).T[::-1]
            rgb=np.repeat(plane[:,:,None],3,axis=2);overlay=rgb.copy()
            overlay[_outline(lab==24)]=[255,60,90]
            overlay[proposed]=np.rint(.5*rgb[proposed]+.5*np.array([0,170,255])).astype(np.uint8)
            h,w=plane.shape;scale=5;remaining=[d for d in range(3) if d!=axis]
            image=Image.new('RGB',(max(620,2*w*scale+12),h*scale+55),'#181818')
            ImageDraw.Draw(image).text((4,3),f'Registered300 {"XYZ"[axis]}{index}: raw / RED current ID24, BLUE interior draft\nHorizontal {"XYZ"[remaining[0]]}{low[remaining[0]]}..{high[remaining[0]]-1}; top-bottom {"XYZ"[remaining[1]]}{high[remaining[1]]-1}..{low[remaining[1]]}\nNOT ADOPTED. No product changes; not the full cavity boundary.',fill='white')
            for col,p in enumerate((rgb,overlay)):
                image.paste(Image.fromarray(p).resize((w*scale,h*scale),Image.Resampling.NEAREST),(col*(w*scale+12),55))
            path=out/f'{"xyz"[axis]}-{index}.png';image.save(path)
            figures.append(dict(path=path.name,axis='xyz'[axis],index=index,sha256=digest(path.read_bytes())))
    ids,counts=np.unique(nearest_labels(labels,points*step+start,origin,spacing),return_counts=True)
    report=dict(labelSha256=SHA,sourceSha256=IMAGE_SHA,sourcePoints=points.tolist(),sourcePointCount=len(points),
                nativePolygonXZ=[[x,z-(2 if args.lower_core else 0)] for x,z in [[443,232],[447,232],[445,234]]],nativeY=list(range(315,320)),
                currentLabelsAtCenters={str(i):int(n) for i,n in zip(ids,counts)},
                sourceIntensityRange=[int(raw[tuple(points.T)].min()),int(raw[tuple(points.T)].max())],
                figures=figures,adopted=False,mutation=False,visualReviewPending=True,
                limitation='Native-space interior trial only; finite application voxel support and complete anatomical cavity boundary are not established.')
    (out/'report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:report[k] for k in ['sourcePointCount','currentLabelsAtCenters','sourceIntensityRange']}))


if __name__=='__main__':main()
