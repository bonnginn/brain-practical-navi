"""Raw300 local context of the full-volume detached ID24 component; no edit."""
import hashlib
import argparse
import json
import numpy as np
from scipy import ndimage
from PIL import Image, ImageDraw
from audit_manual_label_space import SOURCE, load_identity_minc
from render_registered_manual_fine_review import IMAGE_NAME, IMAGE_SHA, encode_image
from build_orthogonal_review_bundle import ROOT, DEFAULT_LABELS, MAGIC_LABELS, read_browser_volume, _oriented_crop, _outline
from build_registered_manual_candidate import nearest_labels

SHA='b45c0669122b628529f56e73af06fa1cb697b621da99d51c8b921b136ea52463'


def main(series=None, *, component_count=547, seed=(242,119,153), labels_sha=SHA,
         prefix='lateral-detached547', representative_y=135, candidate_points=None, label_id=24, context_margin=12,
         existing_points=None, existing_label_id=None, reference_points=None):
    if type(label_id) is not int or label_id not in (23,24,25,26,41):raise ValueError('Expected ventricular label')
    if type(context_margin) is not int or not 1<=context_margin<=120:raise ValueError('Invalid context margin')
    out=ROOT/f'work/anatomy-review/{prefix}-native300-v1'
    if series:out=ROOT/f'work/anatomy-review/{prefix}-series-{series}-v1'
    if out.exists():raise ValueError('Preserve evidence')
    _,_,labels=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,labels_sha)
    if existing_points is not None:
        if candidate_points is not None or type(existing_label_id) is not int or existing_label_id != 27:
            raise ValueError('Only explicit brainstem conflict review is supported')
        points=np.asarray(existing_points)
        if (points.shape!=(component_count,3) or points.dtype.kind not in 'iu'
                or len(np.unique(points,axis=0))!=component_count or np.any(points<0)
                or np.any(points>=labels.shape) or np.any(labels[tuple(points.T)]!=existing_label_id)):
            raise ValueError('Existing conflict points changed')
        selected=np.zeros(labels.shape,dtype=np.uint8);selected[tuple(points.T)]=1
    elif candidate_points is None:
        cc,_=ndimage.label(labels==label_id,ndimage.generate_binary_structure(3,3))
        ident=cc[seed]
        points=np.argwhere(cc==ident) if ident else np.empty((0,3),int)
        if len(points)!=component_count:raise ValueError('Component identity changed')
        selected=(cc==ident).astype(np.uint8)
    else:
        points=np.asarray(candidate_points)
        if (points.shape!=(component_count,3) or points.dtype.kind not in 'iu'
                or len(np.unique(points,axis=0))!=component_count or np.any(points<0)
                or np.any(points>=labels.shape) or np.any(labels[tuple(points.T)]!=0)):
            raise ValueError('Invalid unlabelled candidates')
        selected=np.zeros(labels.shape,dtype=np.uint8);selected[tuple(points.T)]=1
    raw,start,step,history=load_identity_minc(SOURCE/IMAGE_NAME,IMAGE_SHA)
    geometry=json.loads((ROOT/'public/atlas/bigbrain-icbm500-validation.json').read_text())
    affine=np.array(geometry['affine']);origin=affine[:3,3];spacing=np.diag(affine)[:3]
    low=np.floor(((points.min(0)-context_margin)*spacing+origin-start)/step).astype(int)
    high=np.ceil(((points.max(0)+context_margin)*spacing+origin-start)/step).astype(int)+1
    if np.any(low<0) or np.any(high>raw.shape):raise ValueError('Source bounds')
    shape=high-low;grid=np.indices(shape).reshape(3,-1).T+low
    projected=nearest_labels(labels,grid*step+start,origin,spacing).reshape(shape)
    component=nearest_labels(selected,grid*step+start,origin,spacing).reshape(shape)
    gray=encode_image(raw[tuple(slice(a,b) for a,b in zip(low,high))],geometry['intensityWindow'])
    crop=dict(min=[0,0,0],max=(shape-1).tolist())
    # Three representative centers along the component's Y extent; no claim
    # that these sparse slices cover the full boundary.
    refs=[points[0],points[np.argmin(np.abs(points[:,1]-representative_y))],points[np.argmax(points[:,1])]]
    if reference_points is not None:
        refs_array=np.asarray(reference_points)
        if (series or refs_array.ndim!=2 or refs_array.shape[1]!=3 or len(refs_array)==0
                or refs_array.dtype.kind not in 'iu'
                or any(tuple(p) not in set(map(tuple,points)) for p in refs_array)):
            raise ValueError('Representative points must belong to the reviewed set')
        refs=list(refs_array)
    centers=None
    if series:
        d='xyz'.index(series)
        first=int(np.floor(((points[:,d].min()-.5)*spacing[d]+origin[d]-start[d])/step[d]))-1
        last=int(np.ceil(((points[:,d].max()+.5)*spacing[d]+origin[d]-start[d])/step[d]))+1
        centers=list(range(first+1,last+2,3))
        refs=[points[0]]*len(centers)
    out.mkdir();figures=[]
    for number,p in enumerate(refs):
        center=np.rint((p*spacing+origin-start)/step).astype(int)
        if series:center['xyz'.index(series)]=centers[number]
        for dim,axis in enumerate('xyz'):
            if series and axis!=series:continue
            rows=[]
            for index in range(center[dim]-1,center[dim]+2):
                plane=_oriented_crop(gray,axis,int(index-low[dim]),crop)
                lab=_oriented_crop(projected,axis,int(index-low[dim]),crop)
                chosen=_oriented_crop(component,axis,int(index-low[dim]),crop)
                rgb=np.repeat(plane[:,:,None],3,axis=2)
                rgb[_outline(lab==label_id)]=[0,170,210];rgb[_outline(chosen!=0)]=[255,70,100]
                h,w=plane.shape;scale=3
                row=Image.new('RGB',(max(780,w*scale*2+12),h*scale+42),'#181818')
                draw=ImageDraw.Draw(row);draw.text((4,3),f'Original300 {axis}{index}; '+('continuous extent review' if series else f'app reference {p.tolist()}'),fill='white')
                label=f'detached{component_count}' if candidate_points is None else f'UNADOPTED {component_count} candidates'
                if existing_points is not None:label=f'EXISTING ID{existing_label_id} review {component_count}'
                draw.text((4,21),f'Raw LEFT / red={label}, cyan=existing ID{label_id} RIGHT.',fill='white')
                for col,picture in enumerate([np.repeat(plane[:,:,None],3,axis=2),rgb]):
                    row.paste(Image.fromarray(picture).resize((w*scale,h*scale),Image.Resampling.NEAREST),(col*(w*scale+12),42))
                rows.append(row)
            sheet=Image.new('RGB',(rows[0].width,sum(r.height for r in rows)))
            y=0
            for row in rows:sheet.paste(row,(0,y));y+=row.height
            path=out/f'point-{number}-{axis}.png';sheet.save(path)
            figures.append(dict(path=path.name,axis=axis,indices=list(map(int,range(center[dim]-1,center[dim]+2))),sha256=hashlib.sha256(path.read_bytes()).hexdigest()))
    report=dict(labelsSha256=labels_sha,originalSha256=IMAGE_SHA,sourceHistory=history,points=points.tolist(),referencePoints=[p.tolist() for p in refs],
        nativeCropExclusive=dict(low=low.tolist(),high=high.tolist()),figures=figures,mutation=False,adopted=False,seriesAxis=series,
        limitation=('Continuous registered300 finite-cell extent plus margin on the named axis only; generated, not yet visually reviewed. Not proof of cavity identity. ' if series else 'Sparse local raw context only; not all boundary planes or proof of cavity identity. ')+ ('Red marks existing label, not an approved boundary.' if candidate_points is None else f'Red marks unadopted candidate cells; cyan marks existing ID{label_id}. No labels changed.'))
    if label_id!=24:report['labelId']=label_id
    if existing_points is not None:report['existingLabelId']=existing_label_id
    (out/'report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(dict(count=len(points),references=report['referencePoints'],figures=len(figures))))


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--series',choices=['x','y','z'])
    main(parser.parse_args().series)
