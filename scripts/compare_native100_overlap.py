"""Compare a bounded known native ROI with the new full native100 source."""
import hashlib
import json
import h5py
import numpy as np
from scipy.ndimage import map_coordinates
from PIL import Image, ImageDraw
from read_native100_crop import read_crop
from build_orthogonal_review_bundle import ROOT

FULL_SHA='61e6ebbeb0d6876051b9348a68bfe22b733fead04d112c35ff1a29819b67d351'
ROI_SHA='3a18798134c26515f0ad3543885fdbe22f25243060965611d6c9253c034c77b0'

def main():
    out=ROOT/'work/anatomy-review/native100-overlap-v1'
    if out.exists(): raise ValueError('Preserve existing evidence')
    paths=[ROOT/'work/full16_100um_optbal.mnc',ROOT/'work/hypothalamus_full_100um.mnc']
    for p,expected in zip(paths,[FULL_SHA,ROI_SHA]):
        with p.open('rb') as stream:
            if hashlib.file_digest(stream,'sha256').hexdigest()!=expected: raise ValueError('Source changed')
    low=np.array([175,0,80]);high=np.array([296,101,211])
    with h5py.File(paths[1],'r') as f:
        roi,rs,rt,rm=read_crop(f['minc-2.0/image/0'],low,high)
    with h5py.File(paths[0],'r') as f:
        dims=f['minc-2.0/dimensions']
        fs=np.array([dims[n].attrs['start'] for n in ['xspace','yspace','zspace']])
        ft=np.array([dims[n].attrs['step'] for n in ['xspace','yspace','zspace']])
        full_low=np.floor((rs+low*rt-fs)/ft).astype(int)-1
        full_high=np.ceil((rs+(high-1)*rt-fs)/ft).astype(int)+2
        full,fs,ft,fm=read_crop(f['minc-2.0/image/0'],full_low,full_high)
    coords=np.indices(roi.shape).reshape(3,-1).T+low
    sample=((rs+coords*rt-fs)/ft-full_low).T
    if np.any(sample<0) or np.any(sample>np.array(full.shape)[:,None]-1): raise ValueError('Out of crop')
    aligned=map_coordinates(full,sample,order=1,mode='nearest',prefilter=False).reshape(roi.shape)
    inverse_roi=65535-roi
    tissue=(roi>1000)&(roi<64000)&(aligned>1000)&(aligned<64000)
    report=dict(fullSha256=FULL_SHA,roiSha256=ROI_SHA,roiCrop=rm,fullCrop=fm,
        sourceOffsetXYZ=((rs-fs)/ft).tolist(),resampling='Trilinear full100 at physical ROI100 coordinates; no fitted transform.',
        intensityComparison='65535 - decoded ROI versus decoded full; display only, neither source mutated.',
        tissueSampleCount=int(tissue.sum()),
        samePolarityCorrelation=float(np.corrcoef(roi[tissue],aligned[tissue])[0,1]),
        inversePolarityCorrelation=float(np.corrcoef(inverse_roi[tissue],aligned[tissue])[0,1]),
        meanAbsoluteDifference=float(np.mean(np.abs(inverse_roi[tissue]-aligned[tissue]))),
        displayWindow=[15000,60000],appRegistrationVerified=False,adopted=False,figures=[])
    out.mkdir(parents=True)
    for y in [35,55,70]:
        k=y-int(low[1]);sheet=Image.new('RGB',(752,442),'#181818')
        d=ImageDraw.Draw(sheet)
        d.text((4,4),f'Native Y ROI index {y}: inverted ROI100 / decoded full100 at same world coordinates',fill='white')
        d.text((4,20),'Identical display window 15000..60000; NO fitted shift, label, or anatomical approval.',fill='white')
        for col,volume in enumerate([inverse_roi,aligned]):
            a=volume[:,k,:].T[::-1];gray=np.rint(np.clip((a-15000)/45000,0,1)*255).astype('uint8')
            im=Image.fromarray(gray).convert('RGB').resize((363,393),Image.Resampling.NEAREST)
            sheet.paste(im,(col*376,44))
        name=f'overlap-y-{y}.png';sheet.save(out/name)
        report['figures'].append(dict(path=name,roiYIndex=y,sha256=hashlib.sha256((out/name).read_bytes()).hexdigest()))
    (out/'report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:report[k] for k in ['sourceOffsetXYZ','tissueSampleCount','samePolarityCorrelation','inversePolarityCorrelation','meanAbsoluteDifference']}))

if __name__=='__main__': main()
