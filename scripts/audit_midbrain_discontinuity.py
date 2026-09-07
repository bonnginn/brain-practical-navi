"""Attribute adjacent-plane loss to the source atlas; do not fill or copy labels."""
import hashlib
import json
import numpy as np
import nibabel as nib
from nibabel.processing import resample_from_to
from build_orthogonal_review_bundle import ROOT, DEFAULT_LABELS, MAGIC_LABELS, read_browser_volume
from render_current_ventral_midbrain import LABEL_SHA

def main():
    source=ROOT/'work/segmentation-source-review/cerebra.nii.gz'
    if hashlib.sha256(source.read_bytes()).hexdigest()!='c05df93e85b8f1c1446e56f45f0b6a28fdf6e5c8263ea8f365617254bf79ecbf':
        raise ValueError('Source atlas changed')
    _,_,labels=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,LABEL_SHA)
    grid=json.loads((ROOT/'public/atlas/bigbrain-icbm500-validation.json').read_text())
    atlas=np.rint(np.asarray(resample_from_to(nib.load(source),(labels.shape,np.array(grid['affine'])),order=0).dataobj)).astype(np.uint8)
    rows=[]
    # All points in this fixed local window, not a proposed anatomical region.
    for z in range(99,111):
        old=labels[150:242,200:262,z-1];new=labels[150:242,200:262,z]
        lost=(old==27)&(new!=27)
        a=atlas[150:242,200:262,z]
        vals,counts=np.unique(a[lost],return_counts=True)
        lv,lc=np.unique(new[lost],return_counts=True)
        rows.append(dict(z=z,brainstemCount=int(np.count_nonzero(new==27)),
                         lostFromPreviousPlane=int(lost.sum()),
                         sourceAtlasAtLost={str(v):int(c) for v,c in zip(vals,counts)},
                         currentLabelsAtLost={str(v):int(c) for v,c in zip(lv,lc)}))
    result=dict(labelsSha256=LABEL_SHA,sourceAtlasSha256=hashlib.sha256(source.read_bytes()).hexdigest(),
                mutation=False,adjacentPlaneComparisonIsNotAnatomicalGroundTruth=True,rows=rows)
    out=ROOT/'work/anatomy-review/midbrain-discontinuity-v1.json'
    with out.open('x',encoding='utf-8') as f: json.dump(result,f,indent=2)
    print(json.dumps(rows))

if __name__=='__main__':main()
