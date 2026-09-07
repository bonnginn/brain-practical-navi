"""Native100 context at two registered300 reference points; no adopted segmentation."""
import json
import argparse
import hashlib
import h5py
import numpy as np
from PIL import Image, ImageDraw
from build_orthogonal_review_bundle import ROOT
from audit_manual_label_space import SOURCE
from render_registered_manual_fine_review import IMAGE_NAME, IMAGE_SHA
from render_trigeminal_native100_review import native_points, SOURCE_SHA
from audit_native_roi_transform import checked, load_linear, load_native_grid, GRID_SHA, LIN_SHA, NL_SHA
from review_bigbrain_grid_transform import load_published_grids, forward_chain, GRID_SHAS, XFM_SHA
from build_registered_manual_candidate import nearest_labels
from read_native100_crop import read_crop

def sha(data):return hashlib.sha256(data).hexdigest()

def sample_native_labels(labels, native_xyz, native_start, native_step, linear, native_grid, grids, affine):
    world=np.asarray(native_xyz)*native_step+native_start
    registered=forward_chain(grids,native_grid.forward(world@linear[:,:3].T+linear[:,3]))
    return nearest_labels(labels,registered,affine[:3,3],np.diag(affine)[:3])


def main(capsule=False, fourth=False, third_detached=False, lateral_residual=False, cavity21=False, crop34=False, third_mask=False, labels_sha=None):
    if third_mask:
        if any([capsule,fourth,third_detached,lateral_residual,cavity21,crop34]):raise ValueError('Choose one structure')
        third_detached=True
    if sum(map(bool, [capsule, fourth, third_detached, lateral_residual, cavity21, crop34])) > 1:raise ValueError('Choose one structure')
    app_reference=capsule or fourth or third_detached or lateral_residual or cavity21 or crop34
    structure='third-ventricle' if third_detached else ('fourth-ventricle' if fourth else ('capsule' if capsule else 'fornix'))
    out=ROOT/('work/anatomy-review/fourth-native100-wall-v1' if fourth else ('work/anatomy-review/capsule-native100-anterior-v1' if capsule else 'work/anatomy-review/fornix-native100-connection-v1'))
    if third_detached:out=ROOT/'work/anatomy-review/third-detached137-native100-v1'
    if third_mask:out=ROOT/'work/anatomy-review/third-superior145-native100-mask-v1'
    if lateral_residual:
        out=ROOT/'work/anatomy-review/lateral-residual80-116-native100-v1'
        structure='lateral-ventricle residual component'
    if cavity21:
        out=ROOT/'work/anatomy-review/lateral-cavity21-native100-v1'
        structure='lateral-ventricle candidate'
    if crop34:
        out=ROOT/'work/anatomy-review/lateral-crop34-native100-v1'
        structure='lateral-ventricle crop-expansion candidate'
    if out.exists():raise ValueError('Preserve existing evidence')
    reference_path=ROOT/'segmentation-patches/review/fornix-connection-reference-points-2026-09-07.json'
    reference=json.loads(reference_path.read_text(encoding='utf-8'))
    points=np.array(reference['referencePoints'])
    if reference['sourceSha256']!=IMAGE_SHA or points.tolist()!=[[322,422,291],[331,422,291]]:
        raise ValueError('Reference changed')
    registered=checked(SOURCE/IMAGE_NAME,IMAGE_SHA)
    with h5py.File(registered,'r') as file:
        dims=file['minc-2.0/dimensions']
        start=np.array([dims[a+'space'].attrs['start'] for a in 'xyz'])
        step=np.array([dims[a+'space'].attrs['step'] for a in 'xyz'])
        for k,a in enumerate('xyz'):
            if not np.array_equal(dims[a+'space'].attrs['direction_cosines'],np.eye(3)[k]):raise ValueError('Direction changed')
    point_space='Registered300'
    if app_reference:
        reference_path=ROOT/'public/atlas/bigbrain-icbm500-validation.json'
        affine=np.array(json.loads(reference_path.read_text(encoding='utf-8'))['affine'])
        points=np.array([[188,184,73],[204,184,73]] if fourth else [[155,299,159],[235,299,159]])
        if third_detached:points=np.array([[193,248,168],[193,241,172]])
        if lateral_residual:points=np.array([[235,235,117],[248,248,109]])
        if cavity21:points=np.array([[240,249,105],[253,242,113]])
        if crop34:points=np.array([[232,249,107],[239,249,106],[254,253,91]])
        start=affine[:3,3];step=np.diag(affine)[:3];point_space='App500'
        from build_orthogonal_review_bundle import DEFAULT_LABELS, MAGIC_LABELS, read_browser_volume
        label_sha='e98cd4060d735c732a5fd75030be2f701f57fe91b6cd5b9a12c65e1cb68b37e3'
        if third_detached:label_sha='ffb8e56e0939f97b6bc9f8e2585bb3f74e11b525006c6f7d631ae85cd4b033c2'
        if third_mask:
            import re
            if not isinstance(labels_sha,str) or not re.fullmatch('[a-f0-9]{64}',labels_sha):raise ValueError('Explicit current SHA required')
            label_sha=labels_sha
        if lateral_residual:label_sha='7d2b88c3e966b9633571e1d5cfe4d86a99439e2ea7873c672217abd4c235a1f2'
        if cavity21:label_sha='a512880c4dcd1b1291664f8ee4aaa3bd8d609b62dd2e037634953cd7ebd12efd'
        if crop34:label_sha='3849b1bd3c9ccf6d68b8864644c7ac784cba00dceaa006ec4be329f3d217fa29'
        _,_,labels=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,label_sha)
        expected=[0,0] if fourth else [31,32]
        if third_detached:expected=[25,25]
        if lateral_residual:expected=[24,24]
        if cavity21:expected=[0,0]
        if crop34:expected=[0,0,0]
        if [int(labels[tuple(p)]) for p in points]!=expected:raise ValueError('Reference labels changed')
        if third_mask:
            from scipy import ndimage
            cc,_=ndimage.label(labels==25,np.ones((3,3,3)))
            selected=(cc==cc[193,248,168]).astype(np.uint8)
            if not cc[193,248,168] or int(selected.sum())!=145:raise ValueError('Component changed')
            component_points=np.argwhere(selected).tolist()
    world=points*step+start
    grids=load_published_grids('catmull-rom');native_grid=load_native_grid();linear=load_linear()
    native,errors=native_points(world,grids,native_grid,linear)
    source=checked(ROOT/'work/full16_100um_optbal.mnc',SOURCE_SHA)
    report=dict(referenceSha256=sha(reference_path.read_bytes()),registeredSourceSha256=IMAGE_SHA,
        nativeSourceSha256=SOURCE_SHA,registeredStartXYZ=start.tolist(),registeredStepXYZ=step.tolist(),
        transformHashes=dict(nativeGrid=GRID_SHA,linear=LIN_SHA,nativeNonlinear=NL_SHA,improved=XFM_SHA,grids=GRID_SHAS),
        maxForwardRoundtripErrorMm=float(errors.max()),intensityWindow=[40000,65535],
        adopted=False,mutation=False,expertReviewed=False,visualReviewPending=True,points=[],figures=[])
    if app_reference:
        report.pop('registeredSourceSha256');report.pop('registeredStartXYZ');report.pop('registeredStepXYZ')
        report.update(referenceSpace=point_space,scientificAffine=affine.tolist(),currentLabelSha256=label_sha)
    if third_mask:
        report.update(componentPoints=component_points,componentCount=145,
            maskMeaning='Red: current 145-voxel component, cyan: other current ID25. Forward native-to-app nearest-cell projection, not a new segmentation.',
            limitation='Sparse native planes; transform implementation is not claimed byte-equivalent to MINC. Projection is evidence for review, not anatomical validation.')
    out.mkdir()
    with h5py.File(source,'r') as file:
        dims=file['minc-2.0/dimensions']
        start=np.array([dims[a+'space'].attrs['start'] for a in 'xyz']);step=np.array([dims[a+'space'].attrs['step'] for a in 'xyz'])
        for number,(p,w,n) in enumerate(zip(points,world,native)):
            q=(n-start)/step;center=np.rint(q).astype(int);low=center-60;high=center+61
            decoded,_,_,metadata=read_crop(file['minc-2.0/image/0'],low,high)
            record=dict(worldMm=w.tolist(),nativeXYZ=q.tolist(),crop=metadata,decodedSha256=sha(decoded.tobytes()))
            record['appXYZ' if app_reference else 'registeredXYZ']=p.tolist()
            report['points'].append(record)
            for axis in range(3):
                rows=[];planes=[]
                for delta in [-1,0,1]:
                    index=center[axis]+delta
                    values=np.take(decoded,index-low[axis],axis=axis).T[::-1,:]
                    gray=np.rint(np.clip((values-40000)/25535,0,1)*255).astype('uint8')
                    raw=Image.fromarray(gray).convert('RGB').resize((363,363),Image.Resampling.NEAREST)
                    marked=raw
                    projection={}
                    if third_mask:
                        axes=[a for a in range(3) if a!=axis]
                        uv=np.indices(tuple(decoded.shape[a] for a in axes)).reshape(2,-1).T
                        coords=np.empty((len(uv),3),float);coords[:,axis]=index
                        for k,a in enumerate(axes):coords[:,a]=uv[:,k]+low[a]
                        lab=sample_native_labels(labels,coords,start,step,linear,native_grid,grids,affine).reshape(tuple(decoded.shape[a] for a in axes)).T[::-1,:]
                        chosen=sample_native_labels(selected,coords,start,step,linear,native_grid,grids,affine).reshape(tuple(decoded.shape[a] for a in axes)).T[::-1,:]
                        from build_orthogonal_review_bundle import _outline
                        rgb=np.repeat(gray[:,:,None],3,axis=2)
                        rgb[_outline(lab==25)]=[0,170,210];rgb[_outline(chosen!=0)]=[255,70,100]
                        marked=Image.fromarray(rgb).resize((363,363),Image.Resampling.NEAREST)
                        projection=dict(projectedLabelSha256=sha(lab.tobytes()),projectedComponentSha256=sha(chosen.tobytes()),componentPixels=int((chosen!=0).sum()))
                    row=Image.new('RGB',(738,413),'#181818');row.paste(raw,(0,50));row.paste(marked,(375,50));draw=ImageDraw.Draw(row)
                    draw.text((4,3),f'{point_space} reference {p.tolist()} / native {"XYZ"[axis]}={index}',fill='white')
                    draw.text((4,18),'Native100 raw LEFT / current145 RED; other ID25 CYAN RIGHT.' if third_mask else f'Native100 raw LEFT / reference RIGHT; NOT a {structure} mask.',fill='white')
                    draw.text((4,33),'Window 40000..65535; no inversion. Reference is not an adopted seed.',fill='white')
                    a,b=[k for k in range(3) if k!=axis]
                    x=375+(q[a]-low[a]+.5)*3;y=50+(120-q[b]+low[b]+.5)*3
                    if not third_mask:draw.rectangle((x-5,y-5,x+5,y+5),outline='#ff0088',width=1)
                    rows.append(row);planes.append(dict(axis='xyz'[axis],index=int(index),decodedSha256=sha(values.tobytes()),**projection))
                sheet=Image.new('RGB',(738,1239))
                for k,row in enumerate(rows):sheet.paste(row,(0,k*413))
                path=out/f'point-{number}-{"xyz"[axis]}.png';sheet.save(path)
                report['figures'].append(dict(path=path.name,sha256=sha(path.read_bytes()),planes=planes))
    (out/'report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(dict(figures=len(report['figures']),planes=sum(len(f['planes']) for f in report['figures']),maxErrorMm=float(errors.max()),adopted=False)))

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    selection=parser.add_mutually_exclusive_group()
    selection.add_argument('--capsule',action='store_true');selection.add_argument('--fourth',action='store_true')
    selection.add_argument('--third-detached',action='store_true')
    selection.add_argument('--lateral-residual',action='store_true')
    selection.add_argument('--cavity21',action='store_true')
    selection.add_argument('--crop34',action='store_true')
    selection.add_argument('--third-mask',action='store_true');parser.add_argument('--labels-sha')
    args=parser.parse_args();main(args.capsule,args.fourth,args.third_detached,args.lateral_residual,args.cavity21,args.crop34,args.third_mask,args.labels_sha)
