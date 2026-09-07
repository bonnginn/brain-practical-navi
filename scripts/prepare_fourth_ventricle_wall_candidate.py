"""Work-only main-cavity fringe candidate; no flood fill or label installation."""
import json
import argparse
import hashlib
import numpy as np
from scipy.ndimage import binary_dilation, generate_binary_structure
from audit_cerebellar_finite_support import support_corner_minima
from audit_manual_label_space import SOURCE, load_identity_minc
from render_registered_manual_fine_review import IMAGE_NAME, IMAGE_SHA
from build_orthogonal_review_bundle import ROOT, DEFAULT_LABELS, MAGIC_LABELS, read_browser_volume
from review_fourth_ventricle_tail_native import LABEL_SHA


def main(extended=False, anterior_next=False, remaining_wall=False):
    if sum((extended, anterior_next, remaining_wall)) > 1:raise ValueError('Choose one candidate')
    out=ROOT/'work/anatomy-review/fourth-ventricle-wall-candidate-v1'
    label_sha=LABEL_SHA
    if extended:
        out=ROOT/'work/anatomy-review/fourth-ventricle-wall-extended-candidate-v1'
    if anterior_next:
        out=ROOT/'work/anatomy-review/fourth-ventricle-anterior-next-candidate-v1'
        label_sha='e98cd4060d735c732a5fd75030be2f701f57fe91b6cd5b9a12c65e1cb68b37e3'
    if remaining_wall:
        out=ROOT/'work/anatomy-review/fourth-ventricle-remaining-wall31fa-candidate-v1'
        label_sha='31fae601d232e7d93ee4af5c02bde9d007e3e916d9f5905cfc1a364ac6856ddc'
    if out.exists():
        raise ValueError('Evidence exists')
    _,_,labels=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,label_sha)
    raw,start,step,history=load_identity_minc(SOURCE/IMAGE_NAME,IMAGE_SHA)
    geometry=json.loads((ROOT/'public/atlas/bigbrain-icbm500-validation.json').read_text())
    affine=np.asarray(geometry['affine']);origin=affine[:3,3];spacing=np.diag(affine)[:3]
    # Main cavity sampled in both native Y294-305 and Z125-136. These are
    # exploratory review limits, not the final fourth-ventricle boundary.
    low=np.array([179,177,75]);high=np.array([212,182,81])
    if extended:
        # Include adjacent posterior levels to test whether the five-point seed
        # was truncated by the first inspection box. Newly included planes
        # require visual review; this extension never authorizes installation.
        low=np.array([179,170,70]);high=np.array([212,182,86])
    if anterior_next:
        # Above the old Y182 exploration edge, around the native100 wall
        # references. Bounds limit review only; they do not define anatomy.
        low=np.array([184,183,70]);high=np.array([208,190,80])
    if remaining_wall:
        # Cover the entire current main-cavity extent and one app-cell margin.
        # The disconnected superior two-point component is deliberately outside
        # this review box; it is a separate aqueduct/ventricle classification task.
        low=np.array([178,156,58]);high=np.array([213,195,98])
    points=np.indices(high-low+1).reshape(3,-1).T+low
    adjacent=binary_dilation(labels==26,structure=generate_binary_structure(3,1),iterations=1)
    points=points[(labels[tuple(points.T)]==0)&adjacent[tuple(points.T)]]
    minima=support_corner_minima(raw,((points-.5)*spacing+origin-start)/step,((points+.5)*spacing+origin-start)/step)
    records=[dict(xyz=p.tolist(),before=0,after=26,supportCornerMinimum=int(v),selected=bool(v>=65000)) for p,v in zip(points,minima)]
    selected=[r for r in records if r['selected']]
    report=dict(inputCompressedSha256=label_sha,source300Sha256=IMAGE_SHA,sourceHistory=history,
        candidateBoxInclusive=dict(min=low.tolist(),max=high.tolist()),considered=len(records),selectedCount=len(selected),
        records=records,adopted=False,expertReviewed=False,labelMutation=False,extendedExploration=extended,anteriorNextExploration=anterior_next,remainingWallExploration=remaining_wall,
        selection='One face-neighbour layer outside existing26, existing0 only, registered300 support minimum>=65000.',
        limitation='Adjacency, intensity and crop are candidate constraints, not anatomical proof. Full candidate differences and edges need review. No external-space flood fill; other main-cavity/caudal omissions remain.')
    out.mkdir();path=out/'candidate.json';path.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(dict(considered=len(records),selected=len(selected),sha256=hashlib.sha256(path.read_bytes()).hexdigest(),installed=False)))


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    group=parser.add_mutually_exclusive_group()
    group.add_argument('--extended',action='store_true');group.add_argument('--anterior-next',action='store_true')
    group.add_argument('--remaining-wall',action='store_true')
    args=parser.parse_args();main(args.extended,args.anterior_next,args.remaining_wall)
