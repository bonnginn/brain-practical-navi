"""Read-only finite-volume mapping of the reviewed source-space interior draft."""
import hashlib
import argparse
import itertools
import json
import math
import numpy as np
from audit_manual_label_space import SOURCE, load_identity_minc
from render_registered_manual_fine_review import IMAGE_NAME, IMAGE_SHA
from build_orthogonal_review_bundle import ROOT,DEFAULT_LABELS,MAGIC_LABELS,read_browser_volume
from review_fornix_native300 import CURRENT_SHA


def intersecting_cells(lower, upper):
    """Integer centers of unit source cells with positive-volume box overlap."""
    lower=np.asarray(lower,dtype=float);upper=np.asarray(upper,dtype=float)
    if lower.shape!=(3,) or upper.shape!=(3,) or not np.isfinite([lower,upper]).all() or np.any(lower>=upper):
        raise ValueError('Invalid finite box')
    ranges=[range(math.floor(a-.5+1e-9)+1,math.ceil(b+.5-1e-9)) for a,b in zip(lower,upper)]
    return list(itertools.product(*ranges))


def main(body_extension=False):
    folder='fornix-core-draft-body-extension-v2' if body_extension else 'fornix-core-draft-overlay-v2'
    expected_sha='c4dc1bc17eaf9be89ae044803f3e38300eb02833294011450785f1150cb5d1ef' if body_extension else 'bed75030ea37e67ad069fc214d70261a58ccd90e48f3c1362116fb80ba2ac5a6'
    expected_count=1098 if body_extension else 183
    path=ROOT/'work/anatomy-review'/folder/'report.json'
    digest=hashlib.sha256(path.read_bytes()).hexdigest()
    if digest!=expected_sha:raise ValueError('Draft evidence changed')
    draft=json.loads(path.read_text(encoding='utf-8'));points=np.asarray(draft['sourcePoints'])
    if len(points)!=expected_count or len(set(map(tuple,points)))!=expected_count:raise ValueError('Draft point count differs')
    source_set=set(map(tuple,points))
    raw,start,step,_=load_identity_minc(SOURCE/IMAGE_NAME,IMAGE_SHA)
    geometry=json.loads((ROOT/'public/atlas/bigbrain-icbm500-validation.json').read_text())
    affine=np.asarray(geometry['affine']);origin=affine[:3,3];spacing=np.diag(affine)[:3]
    if np.any(step<=0) or np.any(spacing<=0):raise ValueError('Unsupported axis direction')
    _,_,labels=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,CURRENT_SHA)
    mapped=np.unique(np.rint((points*step+start-origin)/spacing).astype(int),axis=0)
    records=[]
    for p in mapped:
        if np.any(p<0) or np.any(p>=np.array(labels.shape)):raise ValueError('Outside app grid')
        center=(p*spacing+origin-start)/step
        lower=((p-.5)*spacing+origin-start)/step;upper=((p+.5)*spacing+origin-start)/step
        cells=intersecting_cells(lower,upper)
        if any(any(v<0 or v>=n for v,n in zip(q,raw.shape)) for q in cells):raise ValueError('Outside source grid')
        missing=[q for q in cells if q not in source_set]
        values=np.array([raw[q] for q in cells])
        records.append(dict(xyz=p.tolist(),currentLabel=int(labels[tuple(p)]),sourceCenter=center.tolist(),
            intersectingSourceCells=len(cells),outsideDraftCells=len(missing),
            fullyInsideDraft=not missing,sourceMin=int(values.min()),sourceMax=int(values.max())))
    out=ROOT/'work/anatomy-review'/('fornix-draft-grid-body-extension-v1' if body_extension else 'fornix-draft-grid-v1')
    if out.exists():raise ValueError('Preserve evidence')
    report=dict(draftReportSha256=digest,currentLabelSha256=CURRENT_SHA,sourceSha256=IMAGE_SHA,
        records=records,mappedAppVoxelCount=len(records),fullyInsideCount=sum(r['fullyInsideDraft'] for r in records),
        conflicts=sum(r['currentLabel']!=0 for r in records),mutation=False,adopted=False,
        limitation='Geometric containment in a small interior draft is not anatomical validation or permission to install. Source-cell union uses nearest-neighbor cells, not an interpolated anatomical boundary.')
    out.mkdir();(out/'report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:report[k] for k in ['mappedAppVoxelCount','fullyInsideCount','conflicts','adopted']}))


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--body-extension',action='store_true')
    main(parser.parse_args().body_extension)
