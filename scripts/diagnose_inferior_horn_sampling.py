"""Separate source-label fragmentation from 1 mm mesh-grid sampling loss."""
import itertools
import json
import numpy as np
from scipy import ndimage
from build_orthogonal_review_bundle import ROOT, DEFAULT_LABELS, MAGIC_LABELS, read_browser_volume
from stage_third_ventricle_core_repair import digest
import build_specimen_blocks as blocks

SHA='0d31037722a8a31eee3ff6feed49dc076ece3d6c864297240c687cd1526cc229'


def topology(mask):
    result={}
    for connectivity,name in [(1,'six'),(3,'twentySix')]:
        cc,n=ndimage.label(mask,ndimage.generate_binary_structure(3,connectivity))
        sizes=np.bincount(cc.ravel())[1:]
        result[name]=dict(count=int(n),sizes=sorted(map(int,sizes),reverse=True))
    return dict(voxels=int(mask.sum()),components=result)


def main():
    out=ROOT/'work/anatomy-review/inferior-horn-sampling-v1.json'
    if out.exists(): raise ValueError('Preserve evidence')
    _,_,labels=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,SHA)
    # Exactly the existing display-coordinate temporal crop, not a new anatomical boundary.
    bounds=np.array([[3,43],[-31,35],[-54,-19]],float)
    lo=np.ceil((bounds[:,0]-blocks.ORIGIN_XYZ)/.5).astype(int)
    hi=np.floor((bounds[:,1]-blocks.ORIGIN_XYZ)/.5).astype(int)+1
    slices=tuple(slice(int(a),int(b)) for a,b in zip(lo,hi))
    fine=labels[slices]==24
    phases=[]
    for phase in itertools.product(range(2),repeat=3):
        offsets=(np.asarray(phase)-lo)%2
        sampled=fine[tuple(slice(int(v),None,2) for v in offsets)]
        blurred=ndimage.gaussian_filter(sampled.astype(np.float32),.34)
        phases.append(dict(globalParityXYZ=list(phase),sampled=topology(sampled),
                           afterGaussianThreshold=topology(blurred>=.5),
                           removedByGaussian=int(np.count_nonzero(sampled & (blurred<.5)))))
    report=dict(labelSha256=SHA,generatorSha256=digest((ROOT/'scripts/build_specimen_blocks.py').read_bytes()),
                cropAppXYZ=dict(min=lo.tolist(),maxExclusive=hi.tolist()),cropDisplayMm=bounds.tolist(),
                originalSpacingMm=.5,meshSpacingMm=1,source=topology(fine),phases=phases,
                productionParityXYZ=[0,0,0],mutation=False,
                limitation='Connectivity is numerical, not anatomical truth. Crop edges can split a structure. Eight parity samples diagnose sampling sensitivity, not alternative approved labels. Thresholded Gaussian voxels are not the exact marching-cubes surface topology.')
    out.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(dict(source=report['source'],phases=phases)))


if __name__=='__main__': main()
