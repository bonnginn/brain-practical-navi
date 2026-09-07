"""Native100 raw context at unchanged schematic V ring points, not observed nerves."""
import hashlib
import argparse
import json
import h5py
import numpy as np
from PIL import Image,ImageDraw
from audit_native_roi_transform import checked,load_linear,load_native_grid,GRID_SHA,LIN_SHA,NL_SHA
from review_bigbrain_grid_transform import load_published_grids,forward_chain,GRID_SHAS,XFM_SHA
from audit_nerve_origin_context import read_rings
from build_orthogonal_review_bundle import ROOT,DEFAULT_LABELS
from render_native_mammillary_review import plane_indices
from read_native100_crop import read_crop

LABEL_SHA='58d8044071bd0b638bfdbbcc309c35ac3301a9c8f449b8ebcc5b77e5435cfae7'
SOURCE_SHA='61e6ebbeb0d6876051b9348a68bfe22b733fead04d112c35ff1a29819b67d351'
PROFILE_SHA='2bc4b27e444b5b2f489380be605e79b303dc628e62abdd0d27e003577e298d29'
MESH_SHA='1244f483c765ef084648a74bbad13cff78ea498d4edb9918e15812709e4fd823'
digest=lambda data:hashlib.sha256(data).hexdigest()


def profile_points(profile,mesh):
    inverse=np.linalg.inv(np.array(profile['displayAffine']))
    result=[]
    for region in [30,31]:
        path=next(p for p in profile['paths'] if p['id']==region)
        centers=read_rings(mesh,region).mean(1)
        coords=centers@inverse[:3,:3].T+inverse[:3,3]
        historic=np.array([p['appXYZ'] for p in path['samples']])
        if coords.shape != historic.shape or not np.array_equal(coords,historic):
            raise ValueError('Current V ring means differ from historic schematic profile')
        for ring in [0,4]:result.append(dict(modelId=region,ring=ring,appXYZ=historic[ring].tolist()))
    return result


def native_points(world,grids,native_grid,linear):
    world=np.asarray(world,dtype=float);result=world.copy()
    for grid in reversed(grids):result=grid.inverse(result,tolerance=1e-6)
    result=native_grid.inverse(result,tolerance=1e-6)
    result=(result-linear[:,3])@np.linalg.inv(linear[:,:3]).T
    forward=forward_chain(grids,native_grid.forward(result@linear[:,:3].T+linear[:,3]))
    error=np.max(np.abs(forward-world),axis=1)
    if not np.isfinite(error).all() or np.any(error > 1e-4):raise ValueError('Full forward roundtrip failed')
    return result,error


def make_row(decoded,axis,index,point,low,region,ring,window=(15000,60000)):
    if len(window)!=2 or not np.isfinite(window).all() or not 0<=window[0]<window[1]<=65535:
        raise ValueError('Invalid intensity window')
    crop=dict(min=[0,0,0],max=(np.array(decoded.shape)-1).tolist())
    local=index-int(low['xyz'.index(axis)])
    coords=plane_indices(axis,local,crop)
    values=decoded[tuple(coords.reshape(-1,3).T)].reshape(coords.shape[:2])
    gray=np.rint(np.clip((values-window[0])/(window[1]-window[0]),0,1)*255).astype(np.uint8)
    raw=Image.fromarray(gray).convert('RGB').resize((gray.shape[1]*3,gray.shape[0]*3),Image.Resampling.NEAREST)
    marked=raw.copy();draw=ImageDraw.Draw(marked)
    a,b=[k for k in range(3) if k != 'xyz'.index(axis)]
    x=(point[a]-low[a]+.5)*3;y=(decoded.shape[b]-1-(point[b]-low[b])+.5)*3
    draw.rectangle((x-5,y-5,x+5,y+5),outline='#ff0088',width=1)
    row=Image.new('RGB',(raw.width*2+12,raw.height+64),'#181818');draw=ImageDraw.Draw(row)
    lines=[f'Model ID{region} ring{ring} | native {axis.upper()}={index}',
           'Native100 decoded raw LEFT / schematic point RIGHT',
           'Magenta: projected historic unchanged model point, NOT observed nerve.',
           f'Window {window[0]}..{window[1]}; no inversion; no proposed root.']
    for n,line in enumerate(lines):
        if draw.textbbox((0,0),line)[2]>row.width-8:raise ValueError('Caption overflow')
        draw.text((4,2+n*15),line,fill='white')
    row.paste(raw,(0,64));row.paste(marked,(raw.width+12,64))
    return row,dict(axis=axis,globalIndex=index,decodedPixelSha256=digest(values.tobytes()),
        grayPixelSha256=digest(gray.tobytes()),rawPanelXY=[0,64],markedPanelXY=[raw.width+12,64],
        planeShape=list(gray.shape),scale=3,markerPixelXY=[x,y],intensityWindow=list(window))


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output',default='work/anatomy-review/trigeminal-native100-v1')
    parser.add_argument('--window',type=int,nargs=2,default=[15000,60000])
    args=parser.parse_args()
    out=(ROOT/args.output).resolve()
    if not out.is_relative_to((ROOT/'work/anatomy-review').resolve()):
        raise ValueError('Output must stay within work/anatomy-review')
    if not 0<=args.window[0]<args.window[1]<=65535:raise ValueError('Invalid intensity window')
    if out.exists():raise ValueError('Preserve existing evidence')
    profile_path=checked(ROOT/'work/anatomy-review/nerve-path-tissue-v1.json',PROFILE_SHA)
    profile=json.loads(profile_path.read_text(encoding='utf-8'))
    mesh=checked(ROOT/'public/atlas/overlay-nerves-pontine.mesh',MESH_SHA).read_bytes()
    checked(DEFAULT_LABELS,LABEL_SHA)
    records=profile_points(profile,mesh)
    geometry_path=ROOT/'public/atlas/bigbrain-icbm500-validation.json'
    geometry_bytes=geometry_path.read_bytes();affine=np.array(json.loads(geometry_bytes)['affine'])
    world=np.array([r['appXYZ'] for r in records])@affine[:3,:3].T+affine[:3,3]
    linear=load_linear();native_grid=load_native_grid();grids=load_published_grids('catmull-rom')
    native,errors=native_points(world,grids,native_grid,linear)
    source=checked(ROOT/'work/full16_100um_optbal.mnc',SOURCE_SHA)
    report=dict(sourceSha256=SOURCE_SHA,sourcePath=source.relative_to(ROOT).as_posix(),
        profileSha256=PROFILE_SHA,currentMeshSha256=MESH_SHA,currentLabelSha256=LABEL_SHA,
        historicalProfileLabelSha256=profile['labelsSha256'],profileVAllRingMeansExactlyReproduced=True,
        geometrySha256=digest(geometry_bytes),scientificAffine=affine.tolist(),linearAffine=linear.tolist(),
        mappingHashes=dict(linear=LIN_SHA,nativeNonlinear=NL_SHA,nativeGrid=GRID_SHA,improvedTransform=XFM_SHA,improvedGrids=GRID_SHAS),
        mappingMethod='Reverse improved grids (Catmull-Rom), reverse native grid, inverse linear; every inverse tolerance 1e-6mm.',
        maxForwardRoundtripErrorMm=float(errors.max()),radiusMm=6,intensityWindow=args.window,inverted=False,
        markerMeaning='Historic unchanged schematic V ring points projected onto adjacent planes; NOT observed nerve or proposed root.',
        mutation=False,adopted=False,expertReviewed=False,visualReviewPending=True,points=[],figures=[])
    with h5py.File(source,'r') as file:
        dimensions=file['minc-2.0/dimensions']
        start=np.array([dimensions[a+'space'].attrs['start'] for a in 'xyz'])
        step=np.array([dimensions[a+'space'].attrs['step'] for a in 'xyz'])
        crops=[]
        for r,w,n,error in zip(records,world,native,errors):
            point=(n-start)/step;center=np.rint(point).astype(int);radius=np.ceil(6/step).astype(int)
            low=center-radius;high=center+radius+1
            decoded,_,_,metadata=read_crop(file['minc-2.0/image/0'],low,high)
            record=dict(**r,improvedWorldMm=w.tolist(),nativeWorldMm=n.tolist(),nativeXYZ=point.tolist(),
                forwardRoundtripErrorMm=float(error),crop=metadata,decodedCropSha256=digest(decoded.tobytes()))
            report['points'].append(record);crops.append((r,decoded,point,center,low))
    out.mkdir()
    for r,decoded,point,center,low in crops:
        for k,axis in enumerate('xyz'):
            rows=[];planes=[];offset=0
            for delta in [-1,0,1]:
                row,plane=make_row(decoded,axis,int(center[k]+delta),point,low,r['modelId'],r['ring'],args.window)
                plane['sheetRowY']=offset;offset+=row.height;rows.append(row);planes.append(plane)
            sheet=Image.new('RGB',(rows[0].width,offset),'#181818');offset=0
            for row in rows:sheet.paste(row,(0,offset));offset+=row.height
            target=out/f'model-{r["modelId"]}-ring-{r["ring"]}-{axis}.png';sheet.save(target)
            report['figures'].append(dict(path=target.name,modelId=r['modelId'],ring=r['ring'],planes=planes,
                sha256=digest(target.read_bytes()),pixelSha256=digest(np.asarray(sheet).tobytes())))
    (out/'report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(dict(sheets=len(report['figures']),planes=36,maxErrorMm=float(errors.max()),visualReviewPending=True)))


if __name__=='__main__':main()
