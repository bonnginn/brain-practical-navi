"""Compare official 2015 tissue classes and their image with the app image.

Same template name/affine is not treated as proof of anatomical registration.
Read-only investigation; all derived arrays and figures stay under work.
"""
import hashlib
import json
import numpy as np
import nibabel as nib
from nibabel.processing import resample_from_to
from PIL import Image,ImageDraw
from build_bigbrain_manual_seg import encode_tissue
from build_orthogonal_review_bundle import ROOT,DEFAULT_IMAGE,DEFAULT_LABELS,MAGIC_IMAGE,MAGIC_LABELS,EXPECTED_IMAGE_SHA256,EXPECTED_LABELS_SHA256,read_browser_volume,_oriented_crop,_outline

SOURCES={
 'full_cls_400um_2009b_sym.nii.gz':'5dcc5cb49ad1f73821714aafafbee65ca6d4a69bbc9df0df7841db4e44ae5b0d',
 'full8_400um_2009b_sym.nii.gz':'b67659e085140154763d9887dafac851e9b7022158a79b364d2402fa26290704',
}
CLASS_NAMES={1:'CSF/background (not separable here)',2:'cortical gray',3:'white',4:'cerebellum',5:'cortical layer I',6:'subcortical gray',7:'pineal',8:'cerebellum/brainstem gray',9:'cerebellum/brainstem white'}


def main():
 source=ROOT/'work/official-bigbrain-tissue';out=ROOT/'work/anatomy-review/official-tissue-alignment-v1';out.mkdir(parents=True,exist_ok=True)
 for name,digest in SOURCES.items():
  if hashlib.sha256((source/name).read_bytes()).hexdigest()!=digest:raise ValueError('Official download identity changed: '+name)
 _,dims,raw=read_browser_volume(DEFAULT_IMAGE,MAGIC_IMAGE,EXPECTED_IMAGE_SHA256)
 _,_,labels=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,EXPECTED_LABELS_SHA256)
 geometry=json.loads((ROOT/'public/atlas/bigbrain-icbm500-validation.json').read_text(encoding='utf-8'))
 target=(dims,np.array(geometry['affine']))
 classified=nib.load(source/'full_cls_400um_2009b_sym.nii.gz');original=nib.load(source/'full8_400um_2009b_sym.nii.gz')
 if classified.shape!=original.shape or not np.array_equal(classified.affine,original.affine):raise ValueError('Official image/class grids differ')
 class_values=np.asarray(classified.dataobj)
 if not set(np.unique(class_values)).issubset(CLASS_NAMES):raise ValueError('Unexpected source class values')
 classes=np.asarray(resample_from_to(classified,target,order=0,mode='constant',cval=1).dataobj,dtype=np.uint8)
 # NIfTI full8 has a scale factor (257), so unscaled bytes are not the intensities.
 intensity=original.dataobj.get_unscaled().astype(np.float32)*float(original.dataobj.slope)+float(original.dataobj.inter)
 matched=np.asarray(resample_from_to(nib.Nifti1Image(intensity,original.affine),target,order=1,mode='constant',cval=65535).dataobj,dtype=np.float32)
 encoded,tissue,window=encode_tissue(matched)
 current_tissue=raw!=255;common=current_tissue&tissue
 # Deterministic sparse sample avoids unnecessary full-volume float64 copies.
 sample=np.zeros(dims,dtype=bool);sample[::3,::3,::3]=True;sample &= common
 a=raw[sample].astype(float);b=encoded[sample].astype(float)
 report=dict(sourceDigests=SOURCES,imageSha256=EXPECTED_IMAGE_SHA256,labelsSha256=EXPECTED_LABELS_SHA256,sourceShape=list(classified.shape),sourceAffine=classified.affine.tolist(),targetShape=list(dims),targetAffine=target[1].tolist(),sourceImageScale=float(original.dataobj.slope),encodingWindow=window,classNames=CLASS_NAMES,classCounts={int(i):int(n) for i,n in zip(*np.unique(classes,return_counts=True))},tissueDice=float(2*np.sum(common)/(np.sum(current_tissue)+np.sum(tissue))),intensitySampleCount=len(a),intensityCorrelation=float(np.corrcoef(a,b)[0,1]),meanAbsoluteEncodedDifference=float(np.abs(a-b).mean()),registrationAccepted=False,publicMutation=False,byLabel={},figures=[])
 for label in sorted(int(i) for i in np.unique(labels) if i):
  selected=labels==label
  report['byLabel'][label]={int(i):int(n) for i,n in zip(*np.unique(classes[selected],return_counts=True))}
 palette=np.array([[0,0,0],[255,255,255],[90,145,230],[245,210,80],[145,110,180],[210,130,220],[80,190,130],[220,80,160],[50,190,215],[235,145,65]],dtype=np.uint8)
 crop={'min':[0,0,0],'max':(np.array(dims)-1).tolist()}
 for axis,index in [('x',195),('x',211),('y',262),('z',114),('z',196)]:
  r=_oriented_crop(raw,axis,index,crop);e=_oriented_crop(encoded,axis,index,crop);c=_oriented_crop(classes,axis,index,crop);s=_oriented_crop(labels,axis,index,crop)
  rgb=np.rint(.55*np.repeat(r[:,:,None],3,axis=2)+.45*palette[c]).astype(np.uint8);rgb[_outline(s==30)]=[255,30,30]
  h,w=r.shape;sheet=Image.new('RGB',(w*3,h+44),'#151515');ImageDraw.Draw(sheet).multiline_text((8,4),f'{axis.upper()}={index}: APP ORIGINAL | OFFICIAL IMAGE (affine resample only) | OFFICIAL CLASSES + ID30 red\nClass3 yellow / cortical gray blue / layerI purple / subcortical gray green / brainstem gray cyan, white orange. NOT accepted alignment.',fill='white',spacing=3)
  for col,data in enumerate([r,e,rgb]):sheet.paste(Image.fromarray(data).convert('RGB'),(col*w,44))
  file=f'{axis}-{index}.png';sheet.save(out/file);report['figures'].append(dict(file=file,axis=axis,index=index,sha256=hashlib.sha256((out/file).read_bytes()).hexdigest()))
 np.save(out/'classes-on-app-grid.npy',classes)
 (out/'report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
 print(json.dumps({k:report[k] for k in ['tissueDice','intensityCorrelation','meanAbsoluteEncodedDifference','registrationAccepted']}))


if __name__=='__main__':main()
