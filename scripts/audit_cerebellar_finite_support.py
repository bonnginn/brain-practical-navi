"""Read-only finite sampling of fixed, image-reviewed cerebellar components."""
import hashlib
import argparse
import json
import itertools
import numpy as np
from scipy.ndimage import label,map_coordinates
from PIL import Image,ImageDraw
from audit_manual_label_space import SOURCE,load_identity_minc
from audit_nerve_origin_context import LABEL_SHA
from render_registered_manual_fine_review import IMAGE_NAME,IMAGE_SHA,encode_image
from build_orthogonal_review_bundle import ROOT,DEFAULT_LABELS,DEFAULT_IMAGE,MAGIC_LABELS,MAGIC_IMAGE,EXPECTED_IMAGE_SHA256,read_browser_volume,_oriented_crop,_outline
from build_registered_manual_candidate import nearest_labels


def support_corner_minima(raw, lower, upper):
    """Conservative min of every lattice corner covering each closed box."""
    lower=np.asarray(lower,dtype=float);upper=np.asarray(upper,dtype=float)
    if lower.shape!=upper.shape or lower.ndim!=2 or lower.shape[1]!=3 or not np.isfinite(np.r_[lower,upper]).all() or np.any(lower>upper):
        raise ValueError('Invalid support boxes')
    lo=np.floor(lower).astype(int);hi=np.ceil(upper).astype(int)
    if np.any(lo<0) or np.any(hi>=np.array(raw.shape)):raise ValueError('Support exceeds source')
    return np.array([raw[tuple(slice(a,b+1) for a,b in zip(l,h))].min() for l,h in zip(lo,hi)])


def clip_figure_margin(low, high, center, shape):
    """Clip display context only, requiring all three requested centre planes."""
    low=np.maximum(low,0);high=np.minimum(high,np.asarray(shape))
    center=np.asarray(center)
    if np.any(low>=high) or np.any(center-1<low) or np.any(center+1>=high):
        raise ValueError('Figure centre exceeds source')
    return low,high


def main(component=2532):
    configs={2532:(LABEL_SHA,559,[273,131,91],[292,158,98],'cerebellar-finite-2532-v2'),
        2274:('294379b727b7263b6d60af7f693ebb27ab9e75a149844ff42535d7399dc0acae',428,[251,138,90],[262,160,106],'cerebellar-finite-2274-v1'),
        997:('2fc863aee8009ad9280dd2dd5fd2a9e8fa91de7f84a3ec5f59764317972c4cd9',1007,[174,135,27],[194,164,71],'cerebellar-finite-997-v1'),
        1393:('190f88dc05345e36b2e556829eb7882b6d01d0a67240b7738c1ab58820cd5548',943,[190,137,23],[206,170,49],'cerebellar-finite-1393-v1'),
        1603:('09088a9cf76b8c0578e96f21b9e35077ef345fd90bebc5294308e1603262bb34',654,[203,133,35],[218,147,66],'cerebellar-finite-1603-v1'),
        843:('c9899d58afb39c1eb4b9873b0a39ecb5e44c7e0de895874a2284cfa8bd627f56',7267,[163,107,99],[222,179,148],'cerebellar-finite-843-v1'),
        1105:('212df1a6130977c23eb4561a5f883a2bd7efecba5f2b870cc1bbc5eae1b80b3b',39991,[179,81,7],[312,208,102],'cerebellar-finite-1105-v1')}
    expected_sha,count,expected_lo,expected_hi,folder=configs[component]
    out=ROOT/'work/anatomy-review'/folder
    if out.exists():raise ValueError('Evidence exists')
    _,_,seg=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,expected_sha)
    _,_,app=read_browser_volume(DEFAULT_IMAGE,MAGIC_IMAGE,EXPECTED_IMAGE_SHA256)
    components,_=label(np.isin(seg,[28,29])&(app==255))
    points=np.argwhere(components==component)
    if len(points)!=count or points.min(0).tolist()!=expected_lo or points.max(0).tolist()!=expected_hi:
        raise ValueError('Reviewed component changed')
    del components,app
    raw,start,step,history=load_identity_minc(SOURCE/IMAGE_NAME,IMAGE_SHA)
    geometry=json.loads((ROOT/'public/atlas/bigbrain-icbm500-validation.json').read_text())
    affine=np.asarray(geometry['affine']);app_start=affine[:3,3];app_step=np.diag(affine)[:3]
    offsets=np.array(list(itertools.product(np.linspace(-.5,.5,5),repeat=3)))
    coords=((points[:,None,:]+offsets)*app_step+app_start-start)/step
    if np.any(coords<0) or np.any(coords>np.array(raw.shape)-1):raise ValueError('Source extent exceeded')
    # Avoid a float64 copy of the entire original image; interpolate just the ROI.
    lo=np.floor(coords.min((0,1))).astype(int)-2;hi=np.ceil(coords.max((0,1))).astype(int)+3
    local=raw[tuple(slice(a,b) for a,b in zip(lo,hi))].astype(np.float32)
    values=map_coordinates(local,(coords-lo).reshape(-1,3).T,order=1,prefilter=False).reshape(len(points),-1)
    minima=values.min(1)
    corner_minima=support_corner_minima(raw,coords.min(1),coords.max(1))
    records=[dict(xyz=p.tolist(),label=int(seg[tuple(p)]),minOriginal300=float(v),all125Saturated=bool(v>=65000),supportCornerMinimum=int(c),allSupportCornersSaturated=bool(c>=65000)) for p,v,c in zip(points,minima,corner_minima)]
    # Three adjacent planes in each direction at the reviewed component centre.
    center=np.rint(((points.min(0)+points.max(0))/2*app_step+app_start-start)/step).astype(int)
    low=np.floor((points.min(0)*app_step+app_start-start-4)/step).astype(int)
    high=np.ceil((points.max(0)*app_step+app_start-start+4)/step).astype(int)+1
    # Clip only the figure's 4 mm context margin, never the sampled voxel boxes.
    # Inferior outer components can reach the source image boundary.
    requested_low=low.copy();requested_high=high.copy()
    low,high=clip_figure_margin(low,high,center,raw.shape)
    shape=high-low;grid=np.indices(shape).reshape(3,-1).T+low
    projected=nearest_labels(seg,grid*step+start,app_start,app_step).reshape(shape)
    gray=encode_image(raw[tuple(slice(a,b) for a,b in zip(low,high))],geometry['intensityWindow'])
    crop=dict(min=[0,0,0],max=(shape-1).tolist());out.mkdir();figures=[]
    for dim,axis in enumerate('xyz'):
        rows=[]
        for delta in [-1,0,1]:
            index=int(center[dim]-low[dim]+delta)
            plane=_oriented_crop(gray,axis,index,crop);lab=_oriented_crop(projected,axis,index,crop)
            rgb=np.repeat(plane[:,:,None],3,axis=2);rgb[_outline(np.isin(lab,[28,29]))]=[255,60,90]
            h,w=plane.shape;scale=5;row=Image.new('RGB',(2*w*scale+12,h*scale+42),'#181818')
            d=ImageDraw.Draw(row);d.text((4,3),f'Cerebellar{component} {axis.upper()}{center[dim]+delta}: original300 / context500',fill='white')
            d.text((4,21),'Red: existing cerebellum; not a proposed or approved boundary',fill='white')
            row.paste(Image.fromarray(plane).convert('RGB').resize((w*scale,h*scale),Image.Resampling.NEAREST),(0,42))
            row.paste(Image.fromarray(rgb).resize((w*scale,h*scale),Image.Resampling.NEAREST),(w*scale+12,42));rows.append(row)
        sheet=Image.new('RGB',(rows[0].width,sum(r.height for r in rows)));y=0
        for row in rows:sheet.paste(row,(0,y));y+=row.height
        path=out/f'{axis}.png';sheet.save(path)
        figures.append(dict(path=path.name,sha256=hashlib.sha256(path.read_bytes()).hexdigest(),axis=axis,nativeIndices=[int(center[dim]+d) for d in [-1,0,1]]))
    report=dict(component=component,source300Sha256=IMAGE_SHA,labelsSha256=expected_sha,image500Sha256=EXPECTED_IMAGE_SHA256,sourceHistory=history,
        sampleOffsetsVoxel=offsets.tolist(),all125SaturatedCount=int((minima>=65000).sum()),allSupportCornersSaturatedCount=int((corner_minima>=65000).sum()),records=records,figures=figures,
        nativeCropExclusive=dict(low=low.tolist(),high=high.tolist()),
        requestedNativeCropExclusive=dict(low=requested_low.tolist(),high=requested_high.tolist()),
        figureMarginClipped=bool(np.any(low!=requested_low) or np.any(high!=requested_high)),
        mutation=False,adopted=False,expertReviewed=False,
        limitation='125 samples alone do not prove continuous support. Corner minima bound the trilinear interpolant over each voxel, not tissue identity; bright tissue/artifacts remain possible.')
    (out/'report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(dict(points=len(points),all125Saturated=report['all125SaturatedCount'],allSupportCornersSaturated=report['allSupportCornersSaturatedCount'],minimum=float(minima.min()),figures=len(figures))))


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--component',type=int,choices=[2532,2274,997,1393,1603,843,1105],default=2532)
    main(parser.parse_args().component)
