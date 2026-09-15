"""Read-only screen of existing lateral labels near the reviewed Monro region."""
import argparse
import json
import numpy as np
from build_orthogonal_review_bundle import ROOT, DEFAULT_LABELS, MAGIC_LABELS, read_browser_volume
from audit_manual_label_space import SOURCE, load_identity_minc
from render_registered_manual_fine_review import IMAGE_NAME, IMAGE_SHA
from audit_inferior_horn_cavity_grid import weighted_support_record
from stage_lateral_detached547 import digest

LABEL_SHA='48e1602b871b10bd7b31f99278aef8d0e44bcfb8930051fa9aa20ffd48802db2'
OUT=ROOT/'work/anatomy-review/monro-existing-tissue-screen-v1'


def source_bounds(affine, start, step, source_shape, lo, hi):
    """Reject a rotated, reflected, non-finite or out-of-source locator grid."""
    affine=np.asarray(affine,dtype=float);start=np.asarray(start,dtype=float)
    step=np.asarray(step,dtype=float);lo=np.asarray(lo);hi=np.asarray(hi)
    shape=np.asarray(source_shape)
    if (affine.shape!=(4,4) or start.shape!=(3,) or step.shape!=(3,)
            or lo.shape!=(3,) or hi.shape!=(3,) or shape.shape!=(3,)
            or lo.dtype.kind not in 'iu' or hi.dtype.kind not in 'iu'
            or shape.dtype.kind not in 'iu' or np.any(shape<=0)
            or not all(np.isfinite(a).all() for a in (affine,start,step))
            or not np.array_equal(affine[3],[0,0,0,1])
            or not np.array_equal(affine[:3,:3],np.diag(np.diag(affine)[:3]))
            or np.any(np.diag(affine)[:3]<=0) or np.any(step<=0)
            or np.any(lo<0) or np.any(hi<=lo)):
        raise ValueError('Unsupported review geometry')
    origin=affine[:3,3];spacing=np.diag(affine)[:3]
    low=np.floor(((lo-2)*spacing+origin-start)/step).astype(int)
    high=np.ceil(((hi+2)*spacing+origin-start)/step).astype(int)+1
    if np.any(low<0) or np.any(high>shape):raise ValueError('Review crop outside source')
    return low,high


def tissue_candidates(records):
    # A locator, never an automatic deletion or an anatomical acceptance result.
    return [r for r in records if r['weightedSupportFraction']>=.9
            and r['weightedOutsideCropFraction']==0]


def main(render_id=None):
    if render_id:
        from review_lateral_detached547 import main as render
        r=json.loads((OUT/'report.json').read_bytes())
        points=np.array([p['xyz'] for p in r['candidates'] if p['before']==render_id])
        if not len(points):raise ValueError('No candidates')
        refs=[points[np.argmin(np.sum((points-p)**2,axis=1))] for p in
              [points[np.argmin(points[:,2])],points.mean(0),points[np.argmax(points[:,2])]]]
        render(component_count=len(points),existing_points=points,existing_label_id=render_id,
               labels_sha=LABEL_SHA,label_id=render_id,prefix=f'monro-existing-tissue-id{render_id}',
               context_margin=14,reference_points=refs)
        return
    if OUT.exists():raise ValueError('Preserve evidence')
    _,_,labels=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,LABEL_SHA)
    # A review ROI, not a structure partition or permission to remove tissue.
    lo=np.array([180,250,146]);hi=np.array([215,275,175])
    points=np.argwhere(np.isin(labels[tuple(slice(a,b) for a,b in zip(lo,hi))],[23,24]))+lo
    raw,start,step,_=load_identity_minc(SOURCE/IMAGE_NAME,IMAGE_SHA)
    geo=json.loads((ROOT/'public/atlas/bigbrain-icbm500-validation.json').read_bytes())
    affine=np.array(geo['affine']);origin=affine[:3,3];spacing=np.diag(affine)[:3]
    low,high=source_bounds(affine,start,step,raw.shape,lo,hi)
    crop=raw[tuple(slice(a,b) for a,b in zip(low,high))]
    mask=crop<58000;records=[]
    for p in points:
        s=weighted_support_record((p*spacing+origin-start)/step,spacing/step,mask,low)
        records.append(dict(xyz=p.tolist(),before=int(labels[tuple(p)]),**s))
    candidates=tissue_candidates(records)
    r=dict(labelSha256=LABEL_SHA,sourceSha256=IMAGE_SHA,roiApp=dict(low=lo.tolist(),highExclusive=hi.tolist()),
           sourceThresholdBelow=58000,minimumFiniteTissueFraction=.9,examined=len(points),
           candidates=candidates,records=records,mutation=False,adopted=False,visualReviewPending=True,
           limitation='Intensity-support locator only. Dense plexus, wall, partial volume, registration '
           'and actual wrongly assigned tissue require image review. No automatic removal or new tissue ID.')
    OUT.mkdir();data=(json.dumps(r,indent=2)+'\n').encode();(OUT/'report.json').write_bytes(data)
    print(json.dumps(dict(examined=len(points),candidates=len(candidates),sha256=digest(data),
                         counts={k:sum(p['before']==k for p in candidates) for k in (23,24)})))


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--render-id',type=int,choices=[23,24])
    main(p.parse_args().render_id)
