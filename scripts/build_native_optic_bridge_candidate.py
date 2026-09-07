"""Unadopted source-image connected-support experiment, never an ID33 split.

The explicit crop and thresholds are experimental controls, not anatomical
boundaries. Cropped attachments/endpoints remain unresolved in the report.
"""
import hashlib
import json
import h5py
import numpy as np
from scipy import ndimage
from PIL import Image, ImageDraw
from inspect_hypothalamus_roi import SOURCE, SHA, decode_identity_roi
from build_orthogonal_review_bundle import ROOT, _oriented_crop, _outline

BOUNDS={'min':[70,97,20],'max':[405,126,170]}


def seeded_support(plane, seed, threshold):
    if plane.ndim!=2 or not np.isfinite(plane).all() or threshold<=0:
        raise ValueError('Invalid experiment input')
    if not (0<=seed[0]<plane.shape[0] and 0<=seed[1]<plane.shape[1]):
        raise ValueError('Seed outside experiment')
    components,_=ndimage.label(plane>threshold,ndimage.generate_binary_structure(2,1))
    component=components[seed]
    if not component:raise ValueError('Observed seed is not supported at this threshold')
    return components==component


def main():
    out=ROOT/'work/anatomy-review/native-optic-bridge-candidate-v3'
    if out.exists():raise ValueError('Evidence exists')
    with SOURCE.open('rb') as f:
        if hashlib.file_digest(f,'sha256').hexdigest()!=SHA:raise ValueError('Source changed')
    with h5py.File(SOURCE) as f:raw,start,step=decode_identity_roi(f['minc-2.0'])
    lo=np.array(BOUNDS['min']); hi=np.array(BOUNDS['max'])
    local=raw[tuple(slice(int(a),int(b)+1) for a,b in zip(lo,hi))]
    masks=[]
    for threshold in [500,1500,3000]:
        mask=np.zeros(local.shape,dtype=bool)
        for y in range(local.shape[1]):mask[:,y,:]=seeded_support(local[:,y,:],(240-lo[0],105-lo[2]),threshold)
        masks.append(mask)
    candidate=masks[1]; sensitivity=np.any(np.stack(masks)!=candidate,axis=0)
    clipped=np.zeros(local.shape,dtype=bool)
    for axis in range(3):
        sl=[slice(None)]*3
        for edge in [0,-1]:
            sl[axis]=edge; clipped[tuple(sl)]=candidate[tuple(sl)]
    points=np.argwhere(candidate)+lo
    out.mkdir(parents=True)
    artifact=out/'native-candidate.npz'
    np.savez_compressed(artifact,pointsXYZ=points,thresholdSensitiveXYZ=np.argwhere(sensitivity)+lo,cropContactXYZ=np.argwhere(clipped)+lo)
    report=dict(sourceSha256=SHA,artifactSha256=hashlib.sha256(artifact.read_bytes()).hexdigest(),boundsInclusive=BOUNDS,
        nativeStartMm=start.tolist(),nativeStepMm=step.tolist(),proposedStructure='Central optic chiasm region, incomplete experimental support',
        method='Per-native-coronal four-neighbor component through X240/Z105; three intensity supports compared',
        adopted=False,expertReviewed=False,appLabelsRead=False,appLabelsWritten=False,
        thresholds=[500,1500,3000],nativeVoxelCounts=[int(m.sum()) for m in masks],thresholdSensitiveCount=int(sensitivity.sum()),
        cropContactCount=int(clipped.sum()),uncertainties=['Crop boundaries are not anatomical boundaries','Superior attachments and anterior/posterior endpoints unresolved','Intensity support is not anatomical classification','Not a complete visual pathway segmentation'],figures=[])
    geometry=json.loads((ROOT/'public/atlas/bigbrain-icbm500-validation.json').read_text());low,high=geometry['intensityWindow']
    r=65535-local.astype(float);gray=np.rint(np.clip((r-low)/(high-low),0,1)*250).astype('uint8');gray[r>=65000]=255
    crop={'min':[0,0,0],'max':(np.array(local.shape)-1).tolist()}
    planes=[('y',y) for y in range(local.shape[1])]+[('z',int(z-lo[2])) for z in [90,105,120]]+[('x',int(x-lo[0])) for x in [200,230,260]]
    for offset in range(0,len(planes),3):
        rows=[]
        for axis,index in planes[offset:offset+3]:
            a=_oriented_crop(gray,axis,index,crop); m=_oriented_crop(candidate,axis,index,crop);s=_oriented_crop(sensitivity,axis,index,crop)
            rgb=np.repeat(a[:,:,None],3,axis=2);rgb[_outline(m)]=[0,180,80];rgb[s]=[230,140,0]
            h,w=a.shape;row=Image.new('RGB',(max(820,w*4+12),h*2+42),'#181818');d=ImageDraw.Draw(row)
            native=index+lo['xyz'.index(axis)]
            d.text((4,3),f'Native {axis.upper()}={native} RAW | CANDIDATE green / threshold-sensitive orange',fill='white')
            d.text((4,20),'UNADOPTED. Crop edges/endpoints are NOT accepted boundaries; no ID33 used.',fill='white')
            row.paste(Image.fromarray(a).convert('RGB').resize((w*2,h*2),Image.Resampling.NEAREST),(0,42))
            row.paste(Image.fromarray(rgb).resize((w*2,h*2),Image.Resampling.NEAREST),(w*2+12,42));rows.append(row)
        sheet=Image.new('RGB',(max(r.width for r in rows),sum(r.height for r in rows)),'#181818');yoff=0
        for row in rows:sheet.paste(row,(0,yoff));yoff+=row.height
        path=out/f'candidate-{offset//3:02}.png';sheet.save(path)
        report['figures'].append(dict(path=path.name,localPlanes=planes[offset:offset+3],sha256=hashlib.sha256(path.read_bytes()).hexdigest()))
    (out/'report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:report[k] for k in ['nativeVoxelCounts','thresholdSensitiveCount','cropContactCount']}))


if __name__=='__main__':main()
