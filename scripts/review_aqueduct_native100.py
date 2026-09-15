"""Read-only native100 context for partial ID41 and its unadopted terminal candidates."""
import hashlib
import argparse
import json
import h5py
import numpy as np
from PIL import Image,ImageDraw
from build_orthogonal_review_bundle import ROOT,DEFAULT_LABELS,MAGIC_LABELS,read_browser_volume,_outline
from render_trigeminal_native100_review import native_points,SOURCE_SHA
from render_fornix_native100_connection import sample_native_labels
from audit_native_roi_transform import checked,load_linear,load_native_grid,GRID_SHA,LIN_SHA,NL_SHA
from review_bigbrain_grid_transform import load_published_grids,GRID_SHAS,XFM_SHA
from read_native100_crop import read_crop

LABEL_SHA='a21cb6ab8aa7080b6e26766c2f82834871d3e72c174b72d0b018733ee5ef278a'
CANDIDATE='work/anatomy-review/aqueduct-enclosed-continuity-2026-09-08-majority-v1/candidate.json'
CANDIDATE_SHA='400c889260474100be776389bcb9819e3e442c5381fce40d406283708cc37f44'
REFERENCES=[[195,202,115],[195,208,130],[195,218,137]]
sha=lambda b:hashlib.sha256(b).hexdigest()


def plane_coordinates(shape,low,axis,index):
    if axis not in (0,1,2) or not low[axis]<=index<low[axis]+shape[axis]:raise ValueError('Invalid native plane')
    axes=[a for a in range(3) if a!=axis]
    shape2=tuple(shape[a] for a in axes)
    uv=np.indices(shape2).reshape(2,-1).T
    coords=np.empty((len(uv),3),int);coords[:,axis]=index
    for k,a in enumerate(axes):coords[:,a]=uv[:,k]+low[a]
    return coords,shape2


def remaining_mask(labels,record):
    points=record['points']
    if len(points)!=273 or len({tuple(p['xyz']) for p in points})!=273:raise ValueError('Candidate inventory changed')
    mask=np.zeros(labels.shape,np.uint8)
    for point in points:
        p=point['xyz'];before=point['before']
        if len(p)!=3 or any(type(v)is not int or not 0<=v<labels.shape[a] for a,v in enumerate(p)):
            raise ValueError('Invalid candidate coordinate')
        adopted=124<=p[2]<=135
        if labels[tuple(p)]!=(41 if adopted else before):raise ValueError('Current candidate state changed')
        if not adopted:mask[tuple(p)]=1
    if int(mask.sum())!=94:raise ValueError('Remaining candidate count changed')
    return mask


def main(radius=6):
    if type(radius)is not int or radius not in (6,12):raise ValueError('Choose a bounded 6 or 12 mm context')
    suffix='' if radius==6 else '-wide12mm'
    out=ROOT/f'work/anatomy-review/aqueduct-native100-terminals-2026-09-08-v1{suffix}'
    if out.exists():raise ValueError('Preserve existing evidence')
    _,_,labels=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,LABEL_SHA)
    candidate=checked(ROOT/CANDIDATE,CANDIDATE_SHA)
    remaining=remaining_mask(labels,json.loads(candidate.read_bytes()))
    geometry_path=ROOT/'public/atlas/bigbrain-icbm500-validation.json'
    geometry=geometry_path.read_bytes();affine=np.asarray(json.loads(geometry)['affine'])
    points=np.array(REFERENCES);world=points@affine[:3,:3].T+affine[:3,3]
    linear=load_linear();ngrid=load_native_grid();grids=load_published_grids('catmull-rom')
    native,error=native_points(world,grids,ngrid,linear)
    source=checked(ROOT/'work/full16_100um_optbal.mnc',SOURCE_SHA)
    report=dict(nativeSourceSha256=SOURCE_SHA,currentLabelSha256=LABEL_SHA,candidateSha256=CANDIDATE_SHA,
        geometrySha256=sha(geometry),scientificAffine=affine.tolist(),remainingCandidateCount=94,
        transformHashes=dict(nativeGrid=GRID_SHA,linear=LIN_SHA,nativeNonlinear=NL_SHA,improved=XFM_SHA,grids=GRID_SHAS),
        maxForwardRoundtripErrorMm=float(error.max()),intensityWindow=[40000,65535],radiusMm=radius,
        mutation=False,adopted=False,expertReviewed=False,visualReviewPending=True,
        limitation='Sparse native100 context; transform roundtrip is numerical consistency, not anatomical registration accuracy. Current and candidate labels are nearest-cell projections, not new native segmentation. Sagittal anterior is RIGHT.',
        colors={'pink':'current partial ID41','yellow':'unadopted 94 candidate cells','cyan':'current third/fourth ventricles'},points=[],figures=[])
    out.mkdir()
    with h5py.File(source,'r') as file:
        dims=file['minc-2.0/dimensions'];start=np.array([dims[a+'space'].attrs['start'] for a in 'xyz']);step=np.array([dims[a+'space'].attrs['step'] for a in 'xyz'])
        for number,(app_point,world_point,native_point) in enumerate(zip(points,world,native)):
            q=(native_point-start)/step;center=np.rint(q).astype(int);low=center-radius*10;high=center+radius*10+1
            decoded,_,_,meta=read_crop(file['minc-2.0/image/0'],low,high)
            report['points'].append(dict(appXYZ=app_point.tolist(),worldMm=world_point.tolist(),nativeXYZ=q.tolist(),crop=meta,decodedSha256=sha(decoded.tobytes())))
            for axis in range(3):
                rows=[];plane_records=[]
                for delta in [-1,0,1]:
                    index=int(center[axis]+delta);coords,shape2=plane_coordinates(decoded.shape,low,axis,index)
                    values=decoded[tuple((coords-low).T)].reshape(shape2).T[::-1,:]
                    gray=np.rint(np.clip((values-40000)/25535,0,1)*255).astype(np.uint8)
                    lab=sample_native_labels(labels,coords,start,step,linear,ngrid,grids,affine).reshape(shape2).T[::-1,:]
                    rem=sample_native_labels(remaining,coords,start,step,linear,ngrid,grids,affine).reshape(shape2).T[::-1,:]
                    rgb=np.repeat(gray[:,:,None],3,axis=2)
                    rgb[_outline(np.isin(lab,[25,26]))]=[0,190,220]
                    rgb[_outline(lab==41)]=[255,90,160];rgb[_outline(rem!=0)]=[255,220,40]
                    row=Image.new('RGB',(738,413),'#181818');draw=ImageDraw.Draw(row)
                    draw.text((4,3),f'Reference {app_point.tolist()} | native {"XYZ"[axis]}={index} | raw LEFT / projections RIGHT',fill='white')
                    draw.text((4,18),'Pink: partial ID41; yellow: UNADOPTED candidate; cyan: current third/fourth.',fill='white')
                    draw.text((4,33),'100um native; window 40000..65535; sagittal A=RIGHT. Not boundary approval.',fill='white')
                    row.paste(Image.fromarray(gray).convert('RGB').resize((363,363),Image.Resampling.NEAREST),(0,50))
                    row.paste(Image.fromarray(rgb).resize((363,363),Image.Resampling.NEAREST),(375,50));rows.append(row)
                    plane_records.append(dict(axis='xyz'[axis],nativeIndex=index,valuesSha256=sha(values.tobytes()),graySha256=sha(gray.tobytes()),labelProjectionSha256=sha(lab.tobytes()),remainingProjectionSha256=sha(rem.tobytes()),shape=list(gray.shape)))
                sheet=Image.new('RGB',(738,1239),'#181818')
                for row_index,row in enumerate(rows):sheet.paste(row,(0,row_index*413))
                target=out/f'reference-{number}-{"xyz"[axis]}.png';sheet.save(target)
                report['figures'].append(dict(path=target.name,sha256=sha(target.read_bytes()),planes=plane_records))
                print(target.name,flush=True)
    (out/'report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(dict(figures=len(report['figures']),reportSha256=sha((out/'report.json').read_bytes()),maxRoundtripErrorMm=float(error.max()))))


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--radius',type=int,choices=[6,12],default=6);main(parser.parse_args().radius)
