"""Read-only tissue-overlap candidate and XYZ context; intensity is not adoption."""
import json
import h5py
import numpy as np
from PIL import Image, ImageDraw
from build_orthogonal_review_bundle import ROOT,DEFAULT_LABELS,MAGIC_LABELS,read_browser_volume,_outline
from render_trigeminal_native100_review import native_points,SOURCE_SHA
from render_fornix_native100_connection import sample_native_labels
from audit_native_roi_transform import checked,load_linear,load_native_grid,GRID_SHA,LIN_SHA,NL_SHA
from review_bigbrain_grid_transform import load_published_grids,GRID_SHAS,XFM_SHA
from read_native100_crop import read_crop
from review_aqueduct_native100 import LABEL_SHA,sha,plane_coordinates

LOCATOR='work/anatomy-review/third-posterior-native100-overlap-2026-09-08-v1/report.json'
LOCATOR_SHA='8d09fc289b1bbe1c66b9ad4deb57cc317f7ee48fafe5744abf93fdc17714f62a'


def interior_offsets(n=3):
    if type(n)is not int or not 2<=n<=9:raise ValueError('Bounded integer sampling required')
    values=(np.arange(n)+.5)/n-.5
    return np.stack(np.meshgrid(values,values,values,indexing='ij'),-1).reshape(-1,3)


def main():
    out=ROOT/'work/anatomy-review/third-posterior-native100-candidate-2026-09-08-v1'
    if out.exists():raise ValueError('Preserve prior evidence')
    _,_,labels=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,LABEL_SHA)
    locator=json.loads(checked(ROOT/LOCATOR,LOCATOR_SHA).read_bytes())
    geometry=(ROOT/'public/atlas/bigbrain-icbm500-validation.json').read_bytes()
    affine=np.array(json.loads(geometry)['affine'])
    linear=load_linear();ngrid=load_native_grid();grids=load_published_grids('catmull-rom')
    source=checked(ROOT/'work/full16_100um_optbal.mnc',SOURCE_SHA)
    low=np.array([660,625,535]);high=np.array([765,730,635])
    with h5py.File(source,'r') as file:decoded,start,step,meta=read_crop(file['minc-2.0/image/0'],low,high)
    # Coarse cell-interior quadrature is a review prioritization cue, NOT a mask.
    seed=[r for r in locator['records'] if r['decodedCenterValue']<40000]
    app=np.array([r['appXYZ'] for r in seed]);offsets=interior_offsets(3)
    positions=(app[:,None,:]+offsets).reshape(-1,3)
    native,error=native_points(positions@affine[:3,:3].T+affine[:3,3],grids,ngrid,linear)
    indices=np.rint((native-start)/step).astype(int)
    if np.any(indices<low) or np.any(indices>=high):raise ValueError('Sampling outside context')
    values=decoded[tuple((indices-low).T)].reshape(len(app),-1)
    records=[];mask=np.zeros(labels.shape,np.uint8)
    for row,p,v in zip(seed,app,values):
        if labels[tuple(p)]!=25:raise ValueError('Source changed')
        fraction=float(np.mean(v<40000));selected=fraction>=.8
        records.append(dict(xyz=p.tolist(),before=25,after=0,nativeXYZ=row['nativeXYZ'],centerValue=row['decodedCenterValue'],
            samplesBelow40000=int(np.count_nonzero(v<40000)),sampleCount=len(v),approximateTissueFraction=fraction,selected=selected))
        if selected:mask[tuple(p)]=1
    chosen=[r for r in records if r['selected']]
    report=dict(labelSha256=LABEL_SHA,nativeSourceSha256=SOURCE_SHA,locatorSha256=LOCATOR_SHA,
        geometrySha256=sha(geometry),crop=meta,decodedCropSha256=sha(decoded.tobytes()),
        transformHashes=dict(nativeGrid=GRID_SHA,linear=LIN_SHA,nativeNonlinear=NL_SHA,improved=XFM_SHA,grids=GRID_SHAS),
        quadratureOffsets=offsets.tolist(),maxForwardRoundtripErrorMm=float(error.max()),records=records,points=chosen,
        candidateCount=len(chosen),mutation=False,adopted=False,expertReviewed=False,visualReviewPending=True,figures=[],
        limitation='ROI and threshold only prioritize current ID25 cells for image review. 27-point quadrature is approximate, not exact tissue volume. '
        'No anatomical name assigned to dark tissue; no label or mesh changes. Yellow is an unadopted exclusion candidate; cyan is current third ventricle. Sagittal anterior RIGHT.')
    out.mkdir()
    for axis,indices in enumerate([range(680,725,4),range(642,695,4),range(568,617,4)]):
        rows=[];planes=[];sheet_number=0
        for index in indices:
            coords,shape=plane_coordinates(decoded.shape,low,axis,index)
            values2=decoded[tuple((coords-low).T)].reshape(shape).T[::-1]
            gray=np.rint(np.clip((values2-15000)/50535,0,1)*255).astype(np.uint8)
            lab=sample_native_labels(labels,coords,start,step,linear,ngrid,grids,affine).reshape(shape).T[::-1]
            cand=sample_native_labels(mask,coords,start,step,linear,ngrid,grids,affine).reshape(shape).T[::-1]
            rgb=np.repeat(gray[:,:,None],3,2);rgb[_outline(lab==25)]=[0,190,220];rgb[_outline(cand!=0)]=[255,220,40]
            row=Image.new('RGB',(738,413),'#181818');draw=ImageDraw.Draw(row)
            draw.text((4,3),f'Native100 {"XYZ"[axis]}={index}; raw LEFT / current ID25 cyan + candidate yellow RIGHT',fill='white')
            draw.text((4,18),'Window 15000..65535; sagittal A=RIGHT. Tissue overlap search, NOT pineal boundary.',fill='white')
            draw.text((4,33),'Yellow: UNADOPTED removal candidate; no mask or anatomical name assigned.',fill='white')
            row.paste(Image.fromarray(gray).convert('RGB').resize((363,363),Image.Resampling.NEAREST),(0,50))
            row.paste(Image.fromarray(rgb).resize((363,363),Image.Resampling.NEAREST),(375,50));rows.append(row)
            planes.append(dict(axis='xyz'[axis],nativeIndex=index,valuesSha256=sha(values2.tobytes()),labelProjectionSha256=sha(lab.tobytes()),candidateProjectionSha256=sha(cand.tobytes())))
            if len(rows)==3 or index==list(indices)[-1]:
                sheet=Image.new('RGB',(738,413*len(rows)),'#181818')
                for n,row in enumerate(rows):sheet.paste(row,(0,413*n))
                path=out/f'{"xyz"[axis]}-{sheet_number:02d}.png';sheet.save(path)
                report['figures'].append(dict(path=path.name,sha256=sha(path.read_bytes()),planes=planes))
                rows=[];planes=[];sheet_number+=1;print(path.name,flush=True)
    (out/'report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(dict(candidateCount=len(chosen),figures=len(report['figures']),reportSha256=sha((out/'report.json').read_bytes()))))


if __name__=='__main__':main()
