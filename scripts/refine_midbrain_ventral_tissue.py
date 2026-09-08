"""Review-only pruning of disconnected lower-midbrain candidates; no adoption."""
import json
import numpy as np
from scipy import ndimage
from PIL import Image, ImageDraw
from audit_manual_label_space import SOURCE, load_identity_minc
from render_registered_manual_fine_review import IMAGE_NAME, IMAGE_SHA, encode_image
from build_orthogonal_review_bundle import ROOT, DEFAULT_LABELS, MAGIC_LABELS, read_browser_volume, _outline, _oriented_crop
from build_registered_manual_candidate import nearest_labels
from review_aqueduct_native100 import sha

LABEL_SHA='976684fb22e372f3b0942190d2a8985bc41b1535cd56e332e7a055f5b6d88ffb'
EXPLORATION='work/anatomy-review/lower-midbrain-ventral-tissue-2026-09-08-v3-partial-context/report.json'
EXPLORATION_SHA='492e59958130b2569ccddd7d9c3adc8b8d68e4633c2bff1c63c8454252a21ef2'


def connected_candidates(labels, points):
    p=np.asarray(points)
    if (labels.ndim!=3 or p.ndim!=2 or p.shape[1]!=3 or p.dtype.kind not in 'iu'
        or np.any(p<0) or np.any(p>=labels.shape) or len(np.unique(p,axis=0))!=len(p)):
        raise ValueError('Expected unique in-volume integer XYZ')
    if np.any(labels[tuple(p.T)]!=0):raise ValueError('Existing labels must be preserved')
    mask=labels==27;mask[tuple(p.T)]=True
    reached=ndimage.binary_propagation(labels==27,mask=mask,structure=ndimage.generate_binary_structure(3,1))
    return reached[tuple(p.T)]


def main():
    out=ROOT/'work/anatomy-review/midbrain-ventral-connected-v1'
    if out.exists():raise ValueError('Preserve prior evidence')
    blob=(ROOT/EXPLORATION).read_bytes();source=json.loads(blob)
    if sha(blob)!=EXPLORATION_SHA:raise ValueError('Exploration changed')
    _,_,labels=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,LABEL_SHA)
    entries=source['points'];p=np.array([e['xyz'] for e in entries]);keep=connected_candidates(labels,p)
    if len(p)!=15118 or int(keep.sum())!=14803:raise ValueError('Unexpected connectivity result')
    # No label or mesh is generated. 1 = retained candidate; 2 = rejected disconnected candidate.
    mask=np.zeros(labels.shape,np.uint8);mask[tuple(p.T)]=np.where(keep,1,2)
    gb=(ROOT/'public/atlas/bigbrain-icbm500-validation.json').read_bytes();geometry=json.loads(gb)
    affine=np.array(geometry['affine']);origin=affine[:3,3];spacing=np.diag(affine)[:3]
    raw,start,step,_=load_identity_minc(SOURCE/IMAGE_NAME,IMAGE_SHA)
    lo_app=np.array([130,205,95]);hi_app=np.array([265,262,125])
    low=np.floor((lo_app*spacing+origin-start)/step).astype(int)
    high=np.ceil((hi_app*spacing+origin-start)/step).astype(int)+1
    native=raw[tuple(slice(a,b) for a,b in zip(low,high))]
    grid=np.indices(native.shape).reshape(3,-1).T+low
    projected=nearest_labels(labels,grid*step+start,origin,spacing).reshape(native.shape)
    selected=nearest_labels(mask,grid*step+start,origin,spacing).reshape(native.shape)
    gray=encode_image(native,geometry['intensityWindow']);crop=dict(min=[0,0,0],max=(np.array(native.shape)-1).tolist())
    report=dict(labelSha256=LABEL_SHA,source300Sha256=IMAGE_SHA,geometrySha256=sha(gb),
        exploration=dict(path=EXPLORATION,sha256=EXPLORATION_SHA),
        candidateCount=int(keep.sum()),rejectedCount=int((~keep).sum()),
        points=[e for e,k in zip(entries,keep) if k],rejected=[e for e,k in zip(entries,keep) if not k],
        crop=dict(nativeLow=low.tolist(),nativeHighExclusive=high.tolist()),figures=[],
        adopted=False,mutation=False,expertReviewed=False,visualReviewPending=True,
        limitation='6-connectivity removes detached off-target tissue, not all anatomical errors. '
        'Retained points still require image review; this partial work ROI is not a natural superior boundary. '
        'All existing nonzero labels and previously excluded brainstem cells remain unchanged.')
    out.mkdir()
    # Repeat every source horizontal plane; retain the original in-crop orthogonal indices.
    for axis in 'xyz':
        indices=sorted({r['nativeIndex'] for f in source['figures'] for r in f['planes'] if r['axis']==axis
                        and low['xyz'.index(axis)]<=r['nativeIndex']<high['xyz'.index(axis)]})
        rows=[];records=[];number=0
        for index in indices:
            local=index-low['xyz'.index(axis)]
            a=_oriented_crop(gray,axis,local,crop);lab=_oriented_crop(projected,axis,local,crop);cand=_oriented_crop(selected,axis,local,crop)
            rgb=np.repeat(a[:,:,None],3,2)
            rgb[_outline(lab==27)]=[0,190,220];rgb[_outline((lab>=1)&(lab<=22))]=[170,100,255]
            rgb[_outline(cand==1)]=[255,70,100];rgb[_outline(cand==2)]=[255,200,30]
            w=a.shape[1]*3;h=a.shape[0]*3
            row=Image.new('RGB',(2*w+12,h+48),'#181818');draw=ImageDraw.Draw(row)
            draw.text((4,3),f'Native300 {axis.upper()}={index}; raw LEFT / outlines RIGHT; sagittal A=RIGHT',fill='white')
            draw.text((4,18),'Cyan current ID27; purple nuclei; red CANDIDATE; yellow REJECTED disconnected.',fill='white')
            draw.text((4,33),'Review only. Partial lower/anterior repair region, NOT superior boundary.',fill='white')
            row.paste(Image.fromarray(a).convert('RGB').resize((w,h),Image.Resampling.NEAREST),(0,48))
            row.paste(Image.fromarray(rgb).resize((w,h),Image.Resampling.NEAREST),(w+12,48));rows.append(row)
            records.append(dict(axis=axis,nativeIndex=index,rawGraySha256=sha(a.tobytes()),
                candidateProjectionSha256=sha(cand.tobytes()),retainedPixels=int((cand==1).sum()),rejectedPixels=int((cand==2).sum())))
            if len(rows)==3 or index==indices[-1]:
                sheet=Image.new('RGB',(row.width,sum(r.height for r in rows)),'#181818');offset=0
                for r in rows:sheet.paste(r,(0,offset));offset+=r.height
                path=out/f'{axis}-{number:02d}.png';sheet.save(path)
                report['figures'].append(dict(path=path.name,sha256=sha(path.read_bytes()),planes=records))
                rows=[];records=[];number+=1
    (out/'report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(dict(candidateCount=report['candidateCount'],rejectedCount=report['rejectedCount'],
                         figures=len(report['figures']),reportSha256=sha((out/'report.json').read_bytes()))))


if __name__=='__main__':main()
