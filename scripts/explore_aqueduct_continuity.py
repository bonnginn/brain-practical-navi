"""Read-only enclosed-lumen candidate search; never equate intensity with anatomy.

Connected to the existing partial ID41 solely as a locator. Every candidate still
requires raw adjacent/orthogonal review; neither crop limits nor closure define
the aqueduct/ventricle transition. Existing nuclei and other cavities are kept.
"""
import hashlib
import json
import argparse
import numpy as np
from scipy import ndimage
from audit_cerebellar_finite_support import support_corner_minima
from audit_manual_label_space import SOURCE, load_identity_minc
from render_registered_manual_fine_review import IMAGE_NAME, IMAGE_SHA
from build_registered_manual_candidate import nearest_labels
from build_orthogonal_review_bundle import ROOT, DEFAULT_LABELS, MAGIC_LABELS, read_browser_volume

SHA='2983ac84a194043b0f974a6ee93fd34e74efce94d7c58c66e69f34f1475a7ef3'
LOW=np.array([185,180,90]);HIGH=np.array([208,226,153])


def enclosed_coronal(mask):
    """Retain 2D high-signal components not touching any X/Z crop edge."""
    if mask.ndim!=3 or mask.dtype!=bool:raise ValueError('Expected XYZ boolean mask')
    result=np.zeros_like(mask)
    for y in range(mask.shape[1]):
        components,_=ndimage.label(mask[:,y,:],np.ones((3,3),dtype=bool))
        forbidden=np.unique(np.r_[components[0,:],components[-1,:],components[:,0],components[:,-1],0])
        result[:,y,:]=~np.isin(components,forbidden)
    return result


def main(majority=False):
    out=ROOT/('work/anatomy-review/aqueduct-enclosed-continuity-2026-09-08-majority-v1' if majority else 'work/anatomy-review/aqueduct-enclosed-continuity-2026-09-08-v1')
    if out.exists():raise ValueError('Preserve prior evidence')
    _,_,labels=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,SHA)
    old=np.argwhere(labels==41)
    if len(old)!=16 or np.any(old<LOW) or np.any(old>=HIGH):raise ValueError('Partial locator changed')
    geo_path=ROOT/'public/atlas/bigbrain-icbm500-validation.json'
    geometry=json.loads(geo_path.read_text(encoding='utf-8'))
    affine=np.asarray(geometry['affine']);origin=affine[:3,3];spacing=np.diag(affine)[:3]
    if not np.array_equal(affine[:3,:3],np.diag([.5]*3)):raise ValueError('Expected scientific app grid')
    raw,start,step,history=load_identity_minc(SOURCE/IMAGE_NAME,IMAGE_SHA)
    low=np.floor(((LOW-.5)*spacing+origin-start)/step).astype(int)
    high=np.ceil(((HIGH-.5)*spacing+origin-start)/step).astype(int)+1
    if np.any(low<0) or np.any(high>raw.shape):raise ValueError('Source crop outside grid')
    original=raw[tuple(slice(int(a),int(b)) for a,b in zip(low,high))]
    grid=np.indices(original.shape).reshape(3,-1).T+low
    projected=nearest_labels(labels,grid*step+start,origin,spacing).reshape(original.shape)
    enclosed=enclosed_coronal(original>=65000)
    cc,_=ndimage.label(enclosed,np.ones((3,3,3),dtype=bool))
    ids=np.unique(cc[(projected==41)&enclosed]);ids=ids[ids!=0]
    if len(ids)!=1:raise ValueError(f'Expected one enclosed locator component, got {ids.tolist()}')
    connected=cc==ids[0]
    all_app=np.indices(tuple(HIGH-LOW)).reshape(3,-1).T+LOW
    corners_low=((all_app-.5)*spacing+origin-start)/step
    corners_high=((all_app+.5)*spacing+origin-start)/step
    minima=support_corner_minima(original,corners_low-low,corners_high-low)
    membership=support_corner_minima(connected.astype(np.uint8),corners_low-low,corners_high-low)
    before=labels[tuple(all_app.T)]
    selected=(minima>=65000)&(membership==1)&np.isin(before,[0,27])
    points=all_app[selected]
    native_points=np.argwhere(connected)+low
    report=dict(format='aqueduct-enclosed-lumen-locator',version=1,inputSha256=SHA,
        sourceSha256=IMAGE_SHA,geometrySha256=hashlib.sha256(geo_path.read_bytes()).hexdigest(),sourceHistory=history,
        appCrop=dict(low=LOW.tolist(),highExclusive=HIGH.tolist()),nativeCrop=dict(low=low.tolist(),highExclusive=high.tolist()),
        nativeCount=len(native_points),nativeLow=native_points.min(0).tolist(),nativeHigh=native_points.max(0).tolist(),
        nativeFaceContacts={f'{axis}{side}':int(np.count_nonzero(native_points[:,i]==value))
          for i,axis in enumerate('xyz') for side,value in [('min',low[i]),('max',high[i]-1)]},
        candidateCount=len(points),points=[dict(xyz=p.tolist(),before=int(v),after=41,supportCornerMinimum=int(m))
          for p,v,m in zip(points,before[selected],minima[selected])],
        beforeCounts={str(v):int(np.count_nonzero(before[selected]==v)) for v in [0,27]},
        existingPartialCount=16,adopted=False,expertReviewed=False,labelMutation=False,
        limitation='Source intensity, 2D closure and connection to partial ID41 locate an enclosed lumen, not its full anatomical identity. '
          'No boundary or transition approval, no global filling, no alteration of any current label. '
          'Cells touching the crop and source transitions require separate review. Finite corner support is conservative and can omit partial-volume lumen.')
    if majority:
        from audit_inferior_horn_cavity_grid import weighted_support_record
        bounds=(np.array([native_points.min(0),native_points.max(0)])*step+start-origin)/spacing
        nearby=all_app[np.all((all_app>=np.floor(bounds[0])-1)&(all_app<=np.ceil(bounds[1])+1),axis=1)]
        records=[]
        for point in nearby:
            support=weighted_support_record((point*spacing+origin-start)/step,spacing/step,connected,low)
            if support['weightedSupportFraction']<=0:continue
            value=int(labels[tuple(point)])
            records.append(dict(xyz=point.tolist(),before=value,after=41,**support,
                selected=value in [0,27] and support['weightedSupportFraction']>=.5 and support['weightedOutsideCropFraction']==0))
        chosen=[r for r in records if r['selected']]
        report['conservativeCornerCandidates']=report.pop('points')
        report['conservativeCornerCount']=report.pop('candidateCount')
        report['records']=records;report['points']=chosen;report['candidateCount']=len(chosen)
        report['beforeCounts']={str(v):sum(r['before']==v for r in chosen) for v in [0,27]}
        report['limitation']+=' Majority mapping is exact finite-cell volume overlap >=0.5, not full-corner support or a proof that partial-volume tissue is absent. It is a separate unadopted candidate for image review.'
    out.mkdir();path=out/'candidate.json';path.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:v for k,v in report.items() if k not in ['points','sourceHistory','records','conservativeCornerCandidates']},indent=2))


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--majority',action='store_true')
    main(parser.parse_args().majority)
