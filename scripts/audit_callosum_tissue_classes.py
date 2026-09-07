"""Read-only comparison of ID30 with separately classified BigBrain tissue.

Prescreens possible cortical spillover; no candidate is automatically approved.
All arrays/figures stay in work. Independent original-image review is required.
"""
import hashlib
import json
import numpy as np
import nibabel as nib
from scipy import ndimage
from PIL import Image, ImageDraw
from audit_official_tissue_alignment import SOURCES, CLASS_NAMES
from review_bigbrain_grid_transform import ROOT, XFM_SHA, GRID_SHAS, load_published_grids, inverse_chain
from build_orthogonal_review_bundle import DEFAULT_IMAGE,MAGIC_IMAGE,MAGIC_LABELS,EXPECTED_IMAGE_SHA256,read_browser_volume,_oriented_crop,_outline

LABEL_SHA='930eaaed7eed8782b1b162f3aa5c59c2428f4062d0d2da3a9a1cb563f49b7db7'
DEFAULT_LABELS=ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-callosum-930e.bin.gz'


def main():
    source=ROOT/'work/official-bigbrain-tissue'
    out=ROOT/'work/anatomy-review/callosum-official-tissue-v1'
    out.mkdir(parents=True,exist_ok=True)
    for name,digest in SOURCES.items():
        if hashlib.sha256((source/name).read_bytes()).hexdigest()!=digest:
            raise ValueError('Source identity mismatch')
    _,dims,raw=read_browser_volume(DEFAULT_IMAGE,MAGIC_IMAGE,EXPECTED_IMAGE_SHA256)
    _,_,labels=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,LABEL_SHA)
    points=np.argwhere(labels==30)
    if len(points)!=151380:
        raise ValueError('Unexpected callosal label baseline')
    geometry=json.loads((ROOT/'public/atlas/bigbrain-icbm500-validation.json').read_text(encoding='utf-8'))
    affine=np.array(geometry['affine']);world=nib.affines.apply_affine(affine,points)
    source_image=nib.load(source/'full8_400um_2009b_sym.nii.gz')
    source_classes=nib.load(source/'full_cls_400um_2009b_sym.nii.gz')
    if source_image.shape!=source_classes.shape or not np.array_equal(source_image.affine,source_classes.affine):
        raise ValueError('Source image/classes are not in identical grids')
    classes=np.asarray(source_classes.dataobj,dtype=np.uint8)
    grids=load_published_grids()
    linear=inverse_chain(grids,world)
    print('Linear inverse complete',flush=True)
    for grid in grids:grid.interpolation='catmull-rom'
    cubic=inverse_chain(grids,world)
    print('Cubic inverse complete',flush=True)
    inv_affine=np.linalg.inv(source_image.affine)
    linear_voxel=nib.affines.apply_affine(inv_affine,linear)
    cubic_voxel=nib.affines.apply_affine(inv_affine,cubic)
    linear_cls=ndimage.map_coordinates(classes,linear_voxel.T,order=0,mode='constant',cval=1,prefilter=False)
    cubic_cls=ndimage.map_coordinates(classes,cubic_voxel.T,order=0,mode='constant',cval=1,prefilter=False)
    distance=np.linalg.norm(linear-cubic,axis=1)
    # Distance in the source's own 0.4 mm grid, on a generously padded ROI.
    # This is not a physical target-space distance after nonlinear deformation.
    low=np.maximum(np.floor(cubic_voxel.min(0)).astype(int)-12,0)
    high=np.minimum(np.ceil(cubic_voxel.max(0)).astype(int)+13,classes.shape)
    roi=classes[tuple(slice(a,b) for a,b in zip(low,high))]
    white_distance=ndimage.distance_transform_edt(roi!=3,sampling=source_classes.header.get_zooms()[:3])
    margin=ndimage.map_coordinates(white_distance,(cubic_voxel-low).T,order=1,mode='nearest',prefilter=False)
    intensity=source_image.dataobj.get_unscaled().astype(np.float32)*source_image.dataobj.slope+source_image.dataobj.inter
    sampled=ndimage.map_coordinates(intensity,cubic_voxel.T,order=1,mode='constant',cval=65535,prefilter=False)
    vlow,vhigh=geometry['intensityWindow']
    encoded=np.rint(np.clip((sampled-vlow)/(vhigh-vlow),0,1)*250).astype(np.uint8);encoded[sampled>=65000]=255
    observed=raw[tuple(points.T)]
    intensity_difference=np.abs(encoded.astype(float)-observed)
    # Conservative review prescreen only: stable cortical class, away from the
    # source white boundary, small interpolation sensitivity, similar intensity.
    chosen=np.isin(cubic_cls,[2,5])&(cubic_cls==linear_cls)&(margin>=.8)&(distance<=.15)&(intensity_difference<=20)&(observed!=255)
    mask=np.zeros(dims,dtype=bool);mask[tuple(points[chosen].T)]=True
    cc,count=ndimage.label(mask);sizes=np.bincount(cc.ravel());boxes=ndimage.find_objects(cc)
    components=[dict(component=i,count=int(sizes[i]),min=[s.start for s in box],max=[s.stop-1 for s in box]) for i,box in enumerate(boxes,1)]
    components.sort(key=lambda r:(-r['count'],r['component']))
    report=dict(imageSha256=EXPECTED_IMAGE_SHA256,labelsSha256=LABEL_SHA,sourceDigests=SOURCES,transformSha256=XFM_SHA,gridSha256=GRID_SHAS,
        classNames=CLASS_NAMES,labelCount=len(points),cubicClassCounts={int(k):int(v) for k,v in zip(*np.unique(cubic_cls,return_counts=True))},
        classDisagreementCount=int(np.sum(linear_cls!=cubic_cls)),interpolationPositionDifferenceMmPercentiles=np.percentile(distance,[0,50,95,99,100]).tolist(),
        prescreen=dict(count=int(chosen.sum()),classIds=[2,5],sourceWhiteBoundaryMarginMm=.8,maxInterpolationDifferenceMm=.15,maxEncodedIntensityDifference=20,meaning='review prioritization only; not adopted'),
        componentCount=count,components=components,figures=[],labelMutation=False,expertReview=False)
    np.savez_compressed(out/'sampled-callosal-classes.npz',points=points,linearClass=linear_cls,cubicClass=cubic_cls,sourceWhiteDistanceMm=margin,interpolationDifferenceMm=distance,encodedIntensityDifference=intensity_difference,prescreen=chosen)
    print(json.dumps({k:report[k] for k in ('cubicClassCounts','classDisagreementCount','interpolationPositionDifferenceMmPercentiles','prescreen')}),flush=True)
    mapped_classes=np.zeros(dims,dtype=np.uint8);mapped_classes[tuple(points.T)]=cubic_cls
    crop={'min':np.maximum(points.min(0)-12,0).tolist(),'max':np.minimum(points.max(0)+12,np.array(dims)-1).tolist()}
    palette=np.array([[0,0,0],[255,255,255],[60,135,255],[245,200,50],[145,110,180],[220,90,220],[60,190,100],[220,80,160],[50,190,215],[235,145,65]],dtype=np.uint8)
    frames=[]
    for x in range(int(points[:,0].min()),int(points[:,0].max())+1):
        image=_oriented_crop(raw,'x',x,crop);seg=_oriented_crop(labels,'x',x,crop);cls=_oriented_crop(mapped_classes,'x',x,crop);selected=_oriented_crop(mask,'x',x,crop)
        outline=np.repeat(image[:,:,None],3,axis=2);outline[_outline(seg==30)]=[255,50,70]
        overlay=np.repeat(image[:,:,None],3,axis=2);present=seg==30
        overlay[present]=np.rint(.35*overlay[present]+.65*palette[cls[present]]).astype(np.uint8)
        overlay[_outline(selected)]=[0,220,60]
        h,w=image.shape;frame=Image.new('RGB',(w*6+16,h*2+38),'#151515')
        ImageDraw.Draw(frame).multiline_text((5,3),f'X={x} RAW | CURRENT ID30 red | separate tissue classes (white=yellow, cortex=blue/purple)\nGreen: conservative review prescreen, NOT an adopted boundary; source/cubic-transform limitations apply.',fill='white',spacing=3)
        for col,data in enumerate((image,outline,overlay)):
            frame.paste(Image.fromarray(data).convert('RGB').resize((w*2,h*2),Image.Resampling.NEAREST),(col*(w*2+8),38))
        frames.append((x,frame))
    for start in range(0,len(frames),4):
        group=frames[start:start+4];sheet=Image.new('RGB',(group[0][1].width,sum(f.height for _,f in group)),'#151515')
        for row,(_,frame) in enumerate(group):sheet.paste(frame,(0,row*frame.height))
        name=f'sagittal-{group[0][0]}-{group[-1][0]}.png';sheet.save(out/name)
        report['figures'].append(dict(file=name,axis='x',indices=[x for x,_ in group],sha256=hashlib.sha256((out/name).read_bytes()).hexdigest()))
    (out/'report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')


if __name__=='__main__':main()
