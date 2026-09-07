"""Reconcile the retained posterior queue and render current lower-region evidence."""
import argparse
import gzip
import json
import numpy as np
from stage_lateral_crop34 import ROOT,digest,DEFAULT_LABELS,save_ventricular_region
from review_lateral_detached547 import main as render

SHA='6626f8eb6da43ebd6f41e39e247c32338fb06588ee94b407549cd0a30f61aa08'
PARENT_SHA='d4db863bb6d509ed2b5855c3918e09459cee17089c67bf2e84c0ea40b30ce5b5'


def main(series=None):
    source=DEFAULT_LABELS.read_bytes()
    parent=(ROOT/'work/anatomy-review/fourth-remaining-anterior173-candidate-v1.json').read_bytes()
    if digest(source)!=SHA or digest(parent)!=PARENT_SHA:raise ValueError('Source changed')
    labels=np.frombuffer(gzip.decompress(source),np.uint8,offset=10).reshape((394,466,378),order='F')
    old=json.loads(parent)['otherPoints']
    classified={str(k):[p for p in old if labels[tuple(p)]==k] for k in np.unique([labels[tuple(p)] for p in old])}
    lower=[p for p in classified.get('0',[]) if p[2]<85]
    upper=[p for p in classified.get('0',[]) if p[2]>=85]
    report=dict(sourceSha256=SHA,parentSha256=PARENT_SHA,parentCount=len(old),currentLabels=classified,
        lowerPoints=lower,upperPoints=upper,adopted=False,labelMutation=False,
        limitation='Queue reconciliation, not an anatomical classification. Z85 separates review batches only; it is not a cavity boundary.')
    path=ROOT/'work/anatomy-review/fourth-posterior-remaining-6626-v1.json'
    data=(json.dumps(report,indent=2)+'\n').encode()
    if path.exists():
        if path.read_bytes()!=data:raise ValueError('Preserve prior report')
    else:
        with path.open('xb') as stream:stream.write(data)
    print(json.dumps(dict(parent=len(old),currentCounts={k:len(v) for k,v in classified.items()},lower=len(lower),upper=len(upper),reportSha256=digest(data))))
    pts=np.asarray(lower)
    refs=[pts[np.argmin(pts[:,2])].tolist(),pts[np.argmin(np.abs(pts[:,2]-68))].tolist(),pts[np.argmax(pts[:,2])].tolist()]
    render(series=series,component_count=len(lower),labels_sha=SHA,prefix='fourth-lower-posterior-remaining',
        candidate_points=lower,label_id=26,context_margin=16,reference_points=None if series else refs)


def stage_upper():
    path=ROOT/'work/anatomy-review/fourth-posterior-remaining-6626-v1.json'
    data=path.read_bytes();r=json.loads(data)
    if digest(data)!='7f813820ff243fa17620f38bd29b145f5281679231e6d2104e2979d215d93788':raise ValueError('Queue changed')
    review_path=ROOT/'work/anatomy-review/fourth-upper-residual8-native300-v1/report.json'
    reviewed=review_path.read_bytes();review=json.loads(reviewed)
    if (digest(reviewed)!='726caa2140507fc74e9cf18cadb64ad1297bad630557ac4b89216ba7f564d286'
            or review['labelsSha256']!=SHA or review['points']!=r['upperPoints'] or len(review['figures'])!=9):
        raise ValueError('Review changed')
    for f in review['figures']:
        if digest((review_path.parent/f['path']).read_bytes())!=f['sha256']:raise ValueError('Figure changed')
    evidence=[dict(path=path.relative_to(ROOT).as_posix(),sha256=digest(data),scope='Queue reconciliation'),
        dict(path=review_path.relative_to(ROOT).as_posix(),sha256=digest(reviewed),visuallyInspectedFigures=review['figures'])]
    save_ventricular_region(r['upperPoints'],SHA,evidence,'fourth-upper-residual8',
        'All nine representative XYZ figures reviewed at [188,189,94], [191,176,88], [194,190,92]. These residual cells follow the lateral upper taper and cavity-side roof margin, without crossing the visible roof tissue. They are separate from the caudal external-space candidates. This work stage holds the eight cells for the next combined integration checkpoint.',
        'AI image review, not expert review. Sparse representative orthogonal planes, not all-point orthogonal or native100 review. Lower external-space boundary unresolved. Mesh synchronization and product adoption pending.',label_id=26)


if __name__=='__main__':
    p=argparse.ArgumentParser();g=p.add_mutually_exclusive_group();g.add_argument('--series',choices=['x','y','z']);g.add_argument('--stage-upper',action='store_true');a=p.parse_args()
    stage_upper() if a.stage_upper else main(a.series)
