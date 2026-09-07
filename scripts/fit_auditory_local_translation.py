"""Bounded image-only translation diagnostic, not an adopted registration."""
import json
import numpy as np
from scipy.ndimage import map_coordinates
from scipy.optimize import minimize
from render_external_auditory_context import BASE,IMAGE_SHA,stream_crops
from audit_manual_label_space import SOURCE,load_identity_minc
from render_registered_manual_fine_review import IMAGE_NAME,IMAGE_SHA as CURRENT_SHA


def correlation(a,b):
    a=np.asarray(a,dtype=float);b=np.asarray(b,dtype=float)
    if a.ndim!=1 or a.shape!=b.shape or len(a)<2 or not np.isfinite(a).all() or not np.isfinite(b).all():
        raise ValueError('Expected equal finite nonempty vectors')
    a=a-a.mean();b=b-b.mean();den=np.linalg.norm(a)*np.linalg.norm(b)
    return float(a@b/den) if den>0 else 0.0


def main():
    out=BASE/'translation-v1.json'
    if out.exists():raise ValueError('Preserve evidence')
    inventory=json.loads((BASE/'inventory-v1.json').read_text());rois=[]
    for key,item in sorted(inventory['values'].items()):
        lo=np.maximum(0,np.array(item['minXYZ'])-45);hi=np.minimum([720,600,840],np.array(item['maxXYZ'])+46)
        rois.append(dict(value=int(key),lo=lo,hi=hi,image=np.zeros(hi-lo,dtype=np.uint16)))
    affine=stream_crops(BASE/'sub-bigbrain_MNI_100um_bstem_corrected.nii.gz',IMAGE_SHA,'<i2',4,32768,rois,'image')
    current,start,step,_=load_identity_minc(SOURCE/IMAGE_NAME,CURRENT_SHA);results=[]
    for r in rois:
        sampled=r['image'][::4,::4,::4]
        grid=np.indices(sampled.shape).reshape(3,-1).T
        values=sampled.ravel();keep=(values>5000)&(values<62000)
        values=values[keep].astype(float);grid=grid[keep]
        xyz=grid*4+r['lo'];world=xyz@affine[:,:3].T+affine[:,3]
        lo=np.floor((world.min(0)-4-start)/step).astype(int)-2
        hi=np.ceil((world.max(0)+4-start)/step).astype(int)+3
        if np.any(lo<0) or np.any(hi>current.shape):raise ValueError('Search exceeds source')
        local=current[tuple(slice(a,b) for a,b in zip(lo,hi))].astype(np.float32)
        coords=(world-start)/step-lo
        train=grid.sum(1)%2==0;test=~train
        if min(train.sum(),test.sum())<100:raise ValueError('Insufficient diagnostic samples')
        def sample(shift,mask):
            return map_coordinates(local,(coords[mask]+np.asarray(shift)/step).T,order=1,prefilter=False)
        objective=lambda shift:-correlation(values[train],sample(shift,train))
        # Two deterministic starts expose an obvious unstable optimum without a
        # large search. No held-out samples participate in selection.
        fits=[minimize(objective,x,method='Powell',bounds=[(-4,4)]*3,
            options=dict(xtol=.01,ftol=1e-5,maxiter=80)) for x in ([0,0,0],[1,-1,1])]
        best=min(fits,key=lambda f:f.fun)
        result=dict(value=r['value'],sourceCropExclusive=dict(min=r['lo'].tolist(),max=r['hi'].tolist()),
            shiftExternalToCurrentMm=best.x.tolist(),trainingBefore=-objective([0,0,0]),trainingAfter=-float(best.fun),
            heldoutBefore=correlation(values[test],sample([0,0,0],test)),heldoutAfter=correlation(values[test],sample(best.x,test)),
            trainingSamples=int(train.sum()),heldoutSamples=int(test.sum()),optimizerSuccess=bool(best.success),
            touchesSearchBound=bool(np.any(np.abs(best.x)>3.95)),
            startDisagreementMm=float(np.linalg.norm(fits[0].x-fits[1].x)),
            starts=[dict(shift=f.x.tolist(),score=-float(f.fun),success=bool(f.success)) for f in fits])
        results.append(result);print(json.dumps(result),flush=True)
    report=dict(externalSha256=IMAGE_SHA,currentSha256=CURRENT_SHA,results=results,searchBoundMm=4,
        imageSamplingMm=.4,mutation=False,adopted=False,registrationVerified=False,
        limitation='Spatial checkerboard holdout is correlated image data, not independent anatomical validation. Separate local translations do not define a continuous warp. Numeric atlas names remain unverified.')
    out.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')


if __name__=='__main__':main()
