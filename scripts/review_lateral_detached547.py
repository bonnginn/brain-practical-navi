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
CONTEXT_PALETTE={23:[0,190,220],24:[40,140,255],25:[255,190,20],26:[175,100,255],41:[80,220,130]}


def main(series=None, *, component_count=547, seed=(242,119,153), labels_sha=SHA,
         prefix='lateral-detached547', representative_y=135, candidate_points=None, label_id=24, context_margin=12,
         existing_points=None, existing_label_id=None, reference_points=None, selection_title=None,
         candidate_before_labels=None, context_label_ids=None):
    if type(label_id) is not int or label_id not in (23,24,25,26,41):raise ValueError('Expected ventricular label')
    if type(context_margin) is not int or not 1<=context_margin<=120:raise ValueError('Invalid context margin')
    if selection_title is not None and (not isinstance(selection_title,str) or not selection_title.strip() or len(selection_title)>80):raise ValueError('Invalid selection title')
    if context_label_ids is not None:
        if (not isinstance(context_label_ids,(tuple,list)) or not context_label_ids
                or len(set(context_label_ids)) != len(context_label_ids)
                or any(type(label) is not int or label not in CONTEXT_PALETTE for label in context_label_ids)):
            raise ValueError('Expected unique ventricular context label IDs')
        context_label_ids=tuple(context_label_ids)
    before=None
    if candidate_before_labels is not None:
        before=np.asarray(candidate_before_labels)
        if (candidate_points is None or existing_points is not None or label_id!=41
                or before.shape!=(component_count,) or before.dtype.kind not in 'iu'
                or not np.isin(before,[0,27]).all()):
            raise ValueError('Explicit 0/27-to-41 review values required')
    out=ROOT/f'work/anatomy-review/{prefix}-native300-v1'
    if series:out=ROOT/f'work/anatomy-review/{prefix}-series-{series}-v1'
    if out.exists() and (out/'report.json').exists():raise ValueError('Preserve evidence')
    _,_,labels=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,labels_sha)
    if existing_points is not None:
        if candidate_points is not None or type(existing_label_id) is not int or existing_label_id not in (23,24,25,26,27,41):
            raise ValueError('Expected an explicit ventricular or brainstem review label')
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
                or np.any(points>=labels.shape) or np.any(labels[tuple(points.T)]!=(0 if before is None else before))):
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
    out.mkdir(exist_ok=True);figures=[]
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
                if context_label_ids is None:
                    rgb[_outline(lab==label_id)]=[0,170,210]
                else:
                    for context_id in context_label_ids:
                        rgb[_outline(lab==context_id)]=CONTEXT_PALETTE[context_id]
                rgb[_outline(chosen!=0)]=[255,70,100]
                h,w=plane.shape;scale=3
                caption_height=42 if context_label_ids is None else 62
                row=Image.new('RGB',(max(780,w*scale*2+12),h*scale+caption_height),'#181818')
                draw=ImageDraw.Draw(row);draw.text((4,3),f'Original300 {axis}{index}; '+('continuous extent review' if series else f'app reference {p.tolist()}'),fill='white')
                label=f'detached{component_count}' if candidate_points is None else f'UNADOPTED {component_count} candidates'
                if selection_title is not None:label=selection_title
                if existing_points is not None:label=f'EXISTING ID{existing_label_id} review {component_count}'
                if context_label_ids is None:
                    draw.text((4,21),f'Raw LEFT / red={label}, cyan=existing ID{label_id} RIGHT.',fill='white')
                else:
                    draw.text((4,21),f'Raw LEFT / red={label} RIGHT; current IDs use the color legend.',fill='white')
                    cursor=4
                    for context_id in context_label_ids:
                        draw.rectangle((cursor,39,cursor+9,48),fill=tuple(CONTEXT_PALETTE[context_id]))
                        draw.text((cursor+13,37),f'ID{context_id}',fill='white')
                        cursor += 54
                for col,picture in enumerate([np.repeat(plane[:,:,None],3,axis=2),rgb]):
                    row.paste(Image.fromarray(picture).resize((w*scale,h*scale),Image.Resampling.NEAREST),(col*(w*scale+12),caption_height))
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
    if before is not None:report['candidateBeforeLabels']=before.tolist()
    if existing_points is not None:report['existingLabelId']=existing_label_id
    if context_label_ids is not None:
        report['contextLabelIds']=list(context_label_ids)
        report['contextPalette']={str(label):{'rgb':CONTEXT_PALETTE[label],'legend':f'ID{label}'} for label in context_label_ids}
        report['figureLegend']='Colored squares in each figure identify current labels; red identifies unadopted candidates.'
    (out/'report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(dict(count=len(points),references=report['referencePoints'],figures=len(figures))))


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--series',choices=['x','y','z'])
    main(parser.parse_args().series)
