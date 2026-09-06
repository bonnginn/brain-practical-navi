"""Additional tissue-class evidence for missing midbrain context, read-only.

The source Ventral DC parcel is not a midbrain label. Nor do tissue classes
8/9 distinguish cerebellum from brainstem. This script adopts no boundaries.
"""
import hashlib
import json
import nibabel as nib
import numpy as np
from nibabel.processing import resample_from_to
from scipy.ndimage import map_coordinates
from PIL import Image,ImageDraw
from audit_official_tissue_alignment import SOURCES,CLASS_NAMES
from review_bigbrain_grid_transform import ROOT,load_published_grids,inverse_chain,XFM_SHA,GRID_SHAS
from build_orthogonal_review_bundle import DEFAULT_IMAGE,MAGIC_IMAGE,MAGIC_LABELS,EXPECTED_IMAGE_SHA256,read_browser_volume,_oriented_crop,_outline

LABEL_SHA='930eaaed7eed8782b1b162f3aa5c59c2428f4062d0d2da3a9a1cb563f49b7db7'
DEFAULT_LABELS=ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-callosum-930e.bin.gz'


def main():
    source=ROOT/'work/official-bigbrain-tissue'
    out=ROOT/'work/anatomy-review/brainstem-official-tissue-v1';out.mkdir(parents=True,exist_ok=True)
    class_path=source/'full_cls_400um_2009b_sym.nii.gz'
    if hashlib.sha256(class_path.read_bytes()).hexdigest()!=SOURCES[class_path.name]:raise ValueError('Tissue-class source changed')
    atlas_path=ROOT/'work/segmentation-source-review/cerebra.nii.gz'
    if hashlib.sha256(atlas_path.read_bytes()).hexdigest()!='c05df93e85b8f1c1446e56f45f0b6a28fdf6e5c8263ea8f365617254bf79ecbf':raise ValueError('Atlas changed')
    _,dims,raw=read_browser_volume(DEFAULT_IMAGE,MAGIC_IMAGE,EXPECTED_IMAGE_SHA256)
    _,_,labels=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,LABEL_SHA)
    geometry=json.loads((ROOT/'public/atlas/bigbrain-icbm500-validation.json').read_text(encoding='utf-8'));affine=np.array(geometry['affine'])
    atlas=np.rint(np.asarray(resample_from_to(nib.load(atlas_path),(dims,affine),order=0).dataobj)).astype(np.uint8)
    region=np.isin(atlas,[11,62,26,77])|np.isin(labels,[1,2,3,4,5,6,27,39,40])
    points=np.argwhere(region);world=nib.affines.apply_affine(affine,points)
    grids=load_published_grids();linear=inverse_chain(grids,world)
    print(f'Linear inverse complete: {len(points)} points',flush=True)
    for g in grids:g.interpolation='catmull-rom'
    cubic=inverse_chain(grids,world)
    print('Cubic inverse complete',flush=True)
    classes=nib.load(class_path);values=np.asarray(classes.dataobj,dtype=np.uint8);inverse=np.linalg.inv(classes.affine)
    a=map_coordinates(values,nib.affines.apply_affine(inverse,linear).T,order=0,mode='constant',cval=1,prefilter=False)
    b=map_coordinates(values,nib.affines.apply_affine(inverse,cubic).T,order=0,mode='constant',cval=1,prefilter=False)
    deltas=np.linalg.norm(linear-cubic,axis=1)
    mapped=np.zeros(dims,dtype=np.uint8);mapped[tuple(points.T)]=b
    current=labels[tuple(points.T)];dc=np.isin(atlas[tuple(points.T)],[26,77])
    def counts(mask):return {int(k):int(v) for k,v in zip(*np.unique(b[mask],return_counts=True))}
    report=dict(imageSha256=EXPECTED_IMAGE_SHA256,labelsSha256=LABEL_SHA,tissueSourceSha256=SOURCES[class_path.name],transformSha256=XFM_SHA,gridSha256=GRID_SHAS,sampleCount=len(points),
        classNames=CLASS_NAMES,classDisagreementCount=int(np.sum(a!=b)),interpolationDifferenceMmPercentiles=np.percentile(deltas,[0,50,95,99,100]).tolist(),
        byManualLabel={int(i):counts(current==i) for i in [1,2,3,4,5,6,27,39,40]},unlabelledDcClassCounts=counts(dc&(current==0)),byZ=[],figures=[],adopted=False,labelMutation=False)
    for z in np.unique(points[dc&(current==0),2]):report['byZ'].append(dict(z=int(z),counts=counts(dc&(current==0)&(points[:,2]==z))))
    np.savez_compressed(out/'sampled-brainstem-classes.npz',points=points,linearClass=a,cubicClass=b,interpolationDifferenceMm=deltas,sourceAtlas=atlas[tuple(points.T)])
    crop={'min':[145,160,75],'max':[245,270,155]}
    palette=np.array([[0,0,0],[255,255,255],[60,135,255],[245,200,50],[145,110,180],[220,90,220],[60,190,100],[220,80,160],[50,190,215],[235,145,65]],dtype=np.uint8)
    planes=[('z',z) for z in range(100,141,4)]+[('x',x) for x in [183,195,207]]+[('y',y) for y in [205,215,225,235]]
    for axis,index in planes:
        image=_oriented_crop(raw,axis,index,crop);seg=_oriented_crop(labels,axis,index,crop);c=_oriented_crop(mapped,axis,index,crop)
        line=np.repeat(image[:,:,None],3,axis=2);line[_outline(seg==27)]=[255,50,70];line[_outline(np.isin(seg,range(1,7)))]=[0,220,255]
        color=np.repeat(image[:,:,None],3,axis=2);selected=c>0;color[selected]=np.rint(.4*color[selected]+.6*palette[c[selected]]).astype(np.uint8)
        color[_outline(seg==27)]=[255,50,70]
        h,w=image.shape;sheet=Image.new('RGB',(w*9+20,h*3+43),'#151515')
        ImageDraw.Draw(sheet).multiline_text((5,4),f'{axis.upper()}={index} RAW | current brainstem red, manual nuclei cyan | separate tissue classes (NOT a regional atlas)\nClass3 white matter yellow / class6 subcortical gray green / class8 hindbrain gray cyan / class9 hindbrain white orange; NO adoption',fill='white',spacing=3)
        for column,data in enumerate((image,line,color)):sheet.paste(Image.fromarray(data).convert('RGB').resize((w*3,h*3),Image.Resampling.NEAREST),(column*(w*3+10),43))
        name=f'{axis}-{index}.png';sheet.save(out/name);report['figures'].append(dict(file=name,axis=axis,index=index,sha256=hashlib.sha256((out/name).read_bytes()).hexdigest()))
    (out/'report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(report['unlabelledDcClassCounts']),flush=True)


if __name__=='__main__':main()
