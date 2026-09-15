"""Read-only lower-midbrain tissue omission search; no superior boundary inferred."""
import json
import argparse
import numpy as np
from scipy import ndimage
from PIL import Image,ImageDraw
from audit_manual_label_space import SOURCE,load_identity_minc
from render_registered_manual_fine_review import IMAGE_NAME,IMAGE_SHA,encode_image
from build_orthogonal_review_bundle import ROOT,DEFAULT_LABELS,MAGIC_LABELS,read_browser_volume,_outline,_oriented_crop
from build_registered_manual_candidate import nearest_labels
from audit_inferior_horn_cavity_grid import weighted_support_record
from review_aqueduct_native100 import sha

LABEL_SHA='63ac0815f7631e35029b9811485593e1bf0f2121cfe362366af74d1664f2dea8'


def anchored_axial_tissue(tissue,projected,*,allow_open_context=False):
    if tissue.ndim!=3 or tissue.dtype!=bool or tissue.shape!=projected.shape:raise ValueError('Expected matching XYZ arrays')
    result=np.zeros_like(tissue);planes=[]
    for z in range(tissue.shape[2]):
        cc,_=ndimage.label(tissue[:,:,z],np.ones((3,3),bool))
        overlap=np.bincount(cc[(projected[:,:,z]==27)&tissue[:,:,z]].ravel())
        if len(overlap):overlap[0]=0
        component=int(np.argmax(overlap)) if len(overlap)>1 else 0
        chosen=cc==component if component else np.zeros(cc.shape,bool)
        edge=bool(chosen[0].any() or chosen[-1].any() or chosen[:,0].any() or chosen[:,-1].any())
        retained=bool(component and (not edge or allow_open_context))
        if retained:result[:,:,z]=chosen
        planes.append(dict(localZ=z,anchorVoxelCount=int(overlap[component]) if component else 0,
                           candidateTissueCount=int(chosen.sum()),touchesCropEdge=edge,retained=retained))
    return result,planes


def main(wide=False,partial_context=False):
    if wide and partial_context:raise ValueError('Choose one exploration')
    name='lower-midbrain-ventral-tissue-2026-09-08-v3-partial-context' if partial_context else 'lower-midbrain-ventral-tissue-2026-09-08-v2-wide' if wide else 'lower-midbrain-ventral-tissue-2026-09-08-v1'
    out=ROOT/'work/anatomy-review'/name
    if out.exists():raise ValueError('Preserve prior evidence')
    baseline=ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-lateral-upper729.bin.gz'
    _,_,labels=read_browser_volume(baseline,MAGIC_LABELS,LABEL_SHA)
    gb=(ROOT/'public/atlas/bigbrain-icbm500-validation.json').read_bytes();geometry=json.loads(gb)
    affine=np.array(geometry['affine']);origin=affine[:3,3];spacing=np.diag(affine)[:3]
    raw,start,step,history=load_identity_minc(SOURCE/IMAGE_NAME,IMAGE_SHA)
    low_app=np.array([100,90,94] if wide else [130,185,94]);high_app=np.array([293,340,122] if wide else [263,286,122])
    if partial_context:low_app=np.array([100,90,85]);high_app=np.array([293,340,145])
    low=np.floor((low_app*spacing+origin-start)/step).astype(int)
    high=np.ceil((high_app*spacing+origin-start)/step).astype(int)+1
    native=raw[tuple(slice(a,b) for a,b in zip(low,high))]
    grid=np.indices(native.shape).reshape(3,-1).T+low
    projected=nearest_labels(labels,grid*step+start,origin,spacing).reshape(native.shape)
    tissue,planes=anchored_axial_tissue(native<62000,projected,allow_open_context=partial_context)
    # An explicitly partial work region below the unresolved upper boundary.
    lo=np.array([145,215,100]);hi=np.array([248,274,116])
    if partial_context:lo=np.array([145,215,104]);hi=np.array([248,251,116])
    app=np.indices(tuple(hi-lo)).reshape(3,-1).T+lo
    app=app[labels[tuple(app.T)]==0]
    prior=[];excluded=set()
    for path in sorted((ROOT/'segmentation-patches/review').glob('brainstem-*-adoption-*.json')):
        data=path.read_bytes();record=json.loads(data);points=record.get('points',[])
        if not points:raise ValueError('Prior brainstem evidence is missing')
        xyz=[p['xyz'] if isinstance(p,dict) else p for p in points];excluded.update(map(tuple,xyz))
        prior.append(dict(path=path.relative_to(ROOT).as_posix(),sha256=sha(data)))
    points=[];prior_excluded=0
    for p in app:
        if tuple(p) in excluded:prior_excluded+=1;continue
        support=weighted_support_record((p*spacing+origin-start)/step,spacing/step,tissue,low)
        if support['weightedSupportFraction']>=.8 and support['weightedOutsideCropFraction']==0:
            points.append(dict(xyz=p.tolist(),before=0,after=27,**support))
    mask=np.zeros(labels.shape,np.uint8)
    if points:mask[tuple(np.array([p['xyz'] for p in points]).T)]=1
    selected=nearest_labels(mask,grid*step+start,origin,spacing).reshape(native.shape)
    gray=encode_image(native,geometry['intensityWindow']);crop=dict(min=[0,0,0],max=(np.array(native.shape)-1).tolist())
    report=dict(labelSha256=LABEL_SHA,source300Sha256=IMAGE_SHA,sourceHistory=history,geometrySha256=sha(gb),
        nativeCrop=dict(low=low.tolist(),highExclusive=high.tolist()),workRegion=dict(low=lo.tolist(),highExclusive=hi.tolist()),
        threshold=62000,minimumFiniteCellTissueFraction=.8,anchorPlanes=planes,priorExclusionRecords=prior,allowOpenContext=partial_context,
        priorExcludedUnlabelledPoints=prior_excluded,points=points,candidateCount=len(points),figures=[],
        adopted=False,mutation=False,expertReviewed=False,visualReviewPending=True,
        limitation='A deliberately partial region, not an anatomical upper boundary. Largest axial tissue component anchored to ID27. '
        'Crop-edge contact is recorded; v3 allows open context because surrounding connected tissue can leave the larger context crop. '
        'The explicitly bounded lower/anterior work ROI still is NOT an anatomical boundary. Threshold and finite-cell support only locate candidates; adjacent/orthogonal image review required. '
        'Existing nonzero nuclei/ventricles/cerebellum and previously removed brainstem cells are preserved. No automatic VentralDC union.')
    out.mkdir()
    # Every source Z plane across the chosen app extent; representative X/Y.
    z0=int(np.floor(((lo[2]-.5)*spacing[2]+origin[2]-start[2])/step[2]))-1
    z1=int(np.ceil(((hi[2]-.5)*spacing[2]+origin[2]-start[2])/step[2]))+1
    selections={'x':[int(round((x*.5+origin[0]-start[0])/step[0])) for x in [155,165,175,185,196,207,217,227,237]],
                'y':[int(round((y*.5+origin[1]-start[1])/step[1])) for y in [220,230,240,250,260,270]],
                'z':list(range(z0,z1+1))}
    for axis,indices in selections.items():
        rows=[];records=[];number=0
        for index in indices:
            local=index-low['xyz'.index(axis)]
            a=_oriented_crop(gray,axis,local,crop);lab=_oriented_crop(projected,axis,local,crop);cand=_oriented_crop(selected,axis,local,crop)
            rgb=np.repeat(a[:,:,None],3,2)
            rgb[_outline(lab==27)]=[0,190,220];rgb[_outline((lab>=1)&(lab<=22))]=[170,100,255]
            rgb[_outline(cand!=0)]=[255,70,100]
            w=a.shape[1]*3;h=a.shape[0]*3
            row=Image.new('RGB',(2*w+12,h+48),'#181818');draw=ImageDraw.Draw(row)
            draw.text((4,3),f'Lower midbrain native300 {axis.upper()}={index}; raw LEFT / outlines RIGHT; sagittal A=RIGHT',fill='white')
            draw.text((4,18),'Cyan current ID27; purple existing nuclei; red UNADOPTED 0-to-27 candidate.',fill='white')
            draw.text((4,33),'Partial lower-level search; NOT a superior midbrain boundary.',fill='white')
            row.paste(Image.fromarray(a).convert('RGB').resize((w,h),Image.Resampling.NEAREST),(0,48))
            row.paste(Image.fromarray(rgb).resize((w,h),Image.Resampling.NEAREST),(w+12,48));rows.append(row)
            records.append(dict(axis=axis,nativeIndex=index,rawGraySha256=sha(a.tobytes()),candidateProjectionSha256=sha(cand.tobytes()),candidatePixels=int(cand.sum())))
            if len(rows)==3 or index==indices[-1]:
                sheet=Image.new('RGB',(row.width,sum(r.height for r in rows)),'#181818');offset=0
                for r in rows:sheet.paste(r,(0,offset));offset+=r.height
                path=out/f'{axis}-{number:02d}.png';sheet.save(path)
                report['figures'].append(dict(path=path.name,sha256=sha(path.read_bytes()),planes=records))
                rows=[];records=[];number+=1
    (out/'report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(dict(candidateCount=len(points),figures=len(report['figures']),reportSha256=sha((out/'report.json').read_bytes()),priorExcluded=prior_excluded)))


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--wide',action='store_true');parser.add_argument('--partial-context',action='store_true')
    args=parser.parse_args();main(args.wide,args.partial_context)
