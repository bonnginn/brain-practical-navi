"""Locate current third-ventricle cells in a native100 posterior tissue search box.

The box is image-review navigation, not a pineal segmentation or an adoption rule.
"""
import json
import h5py
import numpy as np
from scipy import ndimage
from build_orthogonal_review_bundle import ROOT,DEFAULT_LABELS,MAGIC_LABELS,read_browser_volume
from render_trigeminal_native100_review import native_points,SOURCE_SHA
from audit_native_roi_transform import checked,load_linear,load_native_grid
from review_bigbrain_grid_transform import load_published_grids
from read_native100_crop import read_crop
from review_aqueduct_native100 import LABEL_SHA,sha


def main():
    out=ROOT/'work/anatomy-review/third-posterior-native100-overlap-2026-09-08-v1'
    if out.exists():raise ValueError('Preserve existing evidence')
    _,_,labels=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,LABEL_SHA)
    affine=np.array(json.loads((ROOT/'public/atlas/bigbrain-icbm500-validation.json').read_bytes())['affine'])
    app_points=np.argwhere(labels==25)
    grids=load_published_grids('catmull-rom');ngrid=load_native_grid();linear=load_linear()
    world=app_points@affine[:3,:3].T+affine[:3,3]
    native,errors=native_points(world,grids,ngrid,linear)
    low=np.array([670,640,550]);high=np.array([755,710,620])
    source=checked(ROOT/'work/full16_100um_optbal.mnc',SOURCE_SHA)
    with h5py.File(source,'r') as file:
        decoded,start,step,meta=read_crop(file['minc-2.0/image/0'],low,high)
    native_xyz=(native-start)/step
    rounded=np.rint(native_xyz).astype(int)
    selected=np.all((rounded>=low)&(rounded<high),axis=1)
    cc,_=ndimage.label(labels==25,np.ones((3,3,3)))
    sizes=np.bincount(cc.ravel());records=[]
    for app,p,n,error in zip(app_points[selected],rounded[selected],native_xyz[selected],errors[selected]):
        value=float(decoded[tuple(p-low)]);component=int(cc[tuple(app)])
        records.append(dict(appXYZ=app.tolist(),nativeXYZ=n.tolist(),sampledNativeXYZ=p.tolist(),decodedCenterValue=value,
            currentLabel=25,component=component,componentCount=int(sizes[component]),forwardRoundtripErrorMm=float(error)))
    report=dict(sourceSha256=SOURCE_SHA,labelSha256=LABEL_SHA,searchBox=meta,decodedCropSha256=sha(decoded.tobytes()),
        sourceThirdCount=len(app_points),records=records,maxForwardRoundtripErrorMm=float(errors.max()),
        lowerThan40000Count=sum(r['decodedCenterValue']<40000 for r in records),
        purpose='Locate current label overlap with the dark posterior tissue seen in native100 aqueduct context. Search box and intensity are NOT an anatomical boundary or an automatic exclusion rule.',
        mutation=False,adopted=False,expertReviewed=False)
    out.mkdir();(out/'report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(dict(count=len(records),lowerThan40000Count=report['lowerThan40000Count'],
        appBounds=[app_points[selected].min(0).tolist(),app_points[selected].max(0).tolist()] if records else [],
        components=sorted({(r['component'],r['componentCount']) for r in records}),reportSha256=sha((out/'report.json').read_bytes()))))


if __name__=='__main__':main()
