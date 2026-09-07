"""Work-only central third-ventricle candidate, constrained by reviewed context."""
import hashlib
import argparse
import json
import numpy as np
from audit_cerebellar_finite_support import support_corner_minima
from audit_manual_label_space import SOURCE, load_identity_minc
from render_registered_manual_fine_review import IMAGE_NAME, IMAGE_SHA
from build_orthogonal_review_bundle import ROOT, DEFAULT_LABELS, MAGIC_LABELS, read_browser_volume
from review_third_ventricle_native300 import LABEL_SHA


def main(expanded=False):
    out=ROOT/('work/anatomy-review/third-ventricle-expanded-candidate-v1' if expanded else 'work/anatomy-review/third-ventricle-central-candidate-v1')
    if out.exists():raise ValueError('Evidence exists')
    _,_,labels=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,LABEL_SHA)
    raw,start,step,history=load_identity_minc(SOURCE/IMAGE_NAME,IMAGE_SHA)
    geometry=json.loads((ROOT/'public/atlas/bigbrain-icbm500-validation.json').read_text())
    affine=np.asarray(geometry['affine']);origin=affine[:3,3];spacing=np.diag(affine)[:3]
    # Deliberately inside the central three-axis review, not the superior roof or external spaces.
    low=np.array([194,224,140]);high=np.array([198,235,146])
    if expanded:
        # Exploratory extension beyond completed continuous coverage. NOT adoption authority.
        low=np.array([190,215,135]);high=np.array([202,270,165])
    points=np.indices(high-low+1).reshape(3,-1).T+low
    points=points[labels[tuple(points.T)]==0]
    lower=((points-.5)*spacing+origin-start)/step
    upper=((points+.5)*spacing+origin-start)/step
    minima=support_corner_minima(raw,lower,upper)
    records=[]
    for p,minimum in zip(points,minima):
        x,y,z=map(int,p)
        # Existing labels bracket this central space in the reviewed sagittal context.
        anterior=np.flatnonzero(labels[x,y+1:286,z]==25)+y+1
        posterior=np.flatnonzero(labels[x,195:y,z]==25)+195
        bracketed=bool(len(anterior) and len(posterior))
        clear=False
        if bracketed:
            clear=bool(np.isin(labels[x,posterior[-1]:anterior[0]+1,z],[0,25]).all())
        records.append(dict(xyz=p.tolist(),before=0,after=25,supportCornerMinimum=int(minimum),
            bracketedBy25=bracketed,noOtherLabelBetween=clear,selected=bool(minimum>=65000 and bracketed and clear)))
    chosen=[r for r in records if r['selected']]
    report=dict(inputCompressedSha256=LABEL_SHA,source300Sha256=IMAGE_SHA,sourceHistory=history,
        reviewedContext=('Exploratory extension: prior local figures suggest missing central cavity, but full expanded region NOT visually reviewed' if expanded else 'third-ventricle-central-series-v1: 45 original planes visually reviewed; candidate differences NOT yet reviewed'),
        candidateBoxInclusive=dict(min=low.tolist(),max=high.tolist()),considered=len(records),selectedCount=len(chosen),records=records,
        adopted=False,expertReviewed=False,labelMutation=False,expandedExploration=expanded,
        selectedOnBoxBoundary=sum(any(p['xyz'][d] in (int(low[d]),int(high[d])) for d in range(3)) for p in chosen),
        limitation='Intensity and bracketing only constrain a candidate within image-reviewed anatomy. They do not prove cavity identity. No global fill, no overwrite of existing structures; full difference and boundary review required.')
    out.mkdir();(out/'candidate.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(dict(considered=len(records),selected=len(chosen),bounds=report['candidateBoxInclusive'],mutation=False)))


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--expanded',action='store_true')
    main(parser.parse_args().expanded)
