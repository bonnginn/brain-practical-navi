"""Read-only sparse native100 context for unlabelled ventricular review candidates."""
import hashlib
import json
import re
import h5py
import numpy as np
from PIL import Image, ImageDraw
from build_orthogonal_review_bundle import ROOT, _outline
from render_trigeminal_native100_review import native_points, SOURCE_SHA
from render_fornix_native100_connection import sample_native_labels
from audit_native_roi_transform import checked, load_linear, load_native_grid, GRID_SHA, LIN_SHA, NL_SHA
from review_bigbrain_grid_transform import load_published_grids, GRID_SHAS, XFM_SHA
from read_native100_crop import read_crop
from review_aqueduct_native100 import plane_coordinates

sha = lambda b: hashlib.sha256(b).hexdigest()


def candidate_mask(labels, points, references):
    if any(isinstance(v, (bool, np.bool_)) for row in [*points, *references] for v in row):
        raise ValueError('Boolean coordinates are not integers')
    p = np.asarray(points); refs = np.asarray(references)
    if (labels.shape != (394,466,378) or p.ndim != 2 or p.shape[1] != 3 or not len(p)
            or p.dtype.kind not in 'iu' or np.any(p < 0) or np.any(p >= labels.shape)
            or len(np.unique(p,axis=0)) != len(p) or np.any(labels[tuple(p.T)] != 0)
            or refs.ndim != 2 or refs.shape[1] != 3 or not 1 <= len(refs) <= 3
            or refs.dtype.kind not in 'iu'
            or any(tuple(r) not in set(map(tuple,p)) for r in refs)
            or len(np.unique(refs,axis=0)) != len(refs)):
        raise ValueError('Expected unlabelled unique cells and one to three member references')
    mask = np.zeros(labels.shape, np.uint8); mask[tuple(p.T)] = 1
    return mask


def render_context(labels, points, references, *, label_sha, locator_path, locator_sha, prefix, radius=6):
    if type(radius) is not int or radius not in (6,12) or not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*',prefix):
        raise ValueError('Invalid bounded context')
    out = ROOT/'work/anatomy-review'/prefix
    if out.exists():
        raise ValueError('Preserve prior evidence')
    selected = candidate_mask(labels,points,references)
    checked(ROOT/locator_path,locator_sha)
    # Tie the passed decoded volume to the stated compressed-source identity.
    from build_orthogonal_review_bundle import DEFAULT_LABELS, MAGIC_LABELS, read_browser_volume
    _, _, installed = read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,label_sha)
    if not np.array_equal(installed,labels):
        raise ValueError('Passed labels differ from pinned source')
    geometry_bytes = (ROOT/'public/atlas/bigbrain-icbm500-validation.json').read_bytes()
    affine = np.asarray(json.loads(geometry_bytes)['affine'])
    refs = np.asarray(references); world = refs@affine[:3,:3].T+affine[:3,3]
    linear = load_linear(); ngrid = load_native_grid(); grids = load_published_grids('catmull-rom')
    native,error = native_points(world,grids,ngrid,linear)
    source = checked(ROOT/'work/full16_100um_optbal.mnc',SOURCE_SHA)
    report = dict(nativeSourceSha256=SOURCE_SHA,currentLabelSha256=label_sha,
        locatorPath=locator_path,locatorSha256=locator_sha,geometrySha256=sha(geometry_bytes),
        scientificAffine=affine.tolist(),candidateCount=len(points),candidatePoints=np.asarray(points).tolist(),
        transformHashes=dict(nativeGrid=GRID_SHA,linear=LIN_SHA,nativeNonlinear=NL_SHA,improved=XFM_SHA,grids=GRID_SHAS),
        maxForwardRoundtripErrorMm=float(error.max()),intensityWindow=[40000,65535],radiusMm=radius,
        mutation=False,adopted=False,expertReviewed=False,visualReviewPending=True,
        limitation='Sparse native100 context, not full boundary review. Roundtrip is numerical consistency, '
        'not anatomical registration accuracy. Current labels and candidates are nearest-cell projections; '
        'not native segmentation. Sagittal anterior is RIGHT.',
        colors={'cyan':'current lateral IDs23/24','amber':'current third ID25','pink':'unadopted candidate; no destination assigned'},
        references=[],figures=[])
    out.mkdir()
    with h5py.File(source,'r') as file:
        dims = file['minc-2.0/dimensions']
        start = np.array([dims[a+'space'].attrs['start'] for a in 'xyz'])
        step = np.array([dims[a+'space'].attrs['step'] for a in 'xyz'])
        for number,(app_point,native_point) in enumerate(zip(refs,native)):
            q = (native_point-start)/step; center = np.rint(q).astype(int)
            low = center-radius*10; high = center+radius*10+1
            decoded,_,_,meta = read_crop(file['minc-2.0/image/0'],low,high)
            report['references'].append(dict(appXYZ=app_point.tolist(),nativeXYZ=q.tolist(),crop=meta,decodedSha256=sha(decoded.tobytes())))
            for axis in range(3):
                rows=[]; planes=[]
                for delta in (-1,0,1):
                    index = int(center[axis]+delta)
                    coords,shape2 = plane_coordinates(decoded.shape,low,axis,index)
                    values = decoded[tuple((coords-low).T)].reshape(shape2).T[::-1,:]
                    gray = np.rint(np.clip((values-40000)/25535,0,1)*255).astype(np.uint8)
                    lab = sample_native_labels(labels,coords,start,step,linear,ngrid,grids,affine).reshape(shape2).T[::-1,:]
                    candidate = sample_native_labels(selected,coords,start,step,linear,ngrid,grids,affine).reshape(shape2).T[::-1,:]
                    rgb = np.repeat(gray[:,:,None],3,axis=2)
                    rgb[_outline(np.isin(lab,[23,24]))]=[0,190,220]
                    rgb[_outline(lab==25)]=[255,190,20]; rgb[_outline(candidate!=0)]=[255,70,130]
                    row=Image.new('RGB',(738,413),'#181818'); draw=ImageDraw.Draw(row)
                    draw.text((4,3),f'App {app_point.tolist()} | native {"XYZ"[axis]}={index} | raw LEFT / projections RIGHT',fill='white')
                    draw.text((4,18),'Cyan: lateral; amber: third; pink: UNADOPTED candidates (no side assigned).',fill='white')
                    draw.text((4,33),'Native100, window 40000..65535. Sagittal A=RIGHT. Not boundary approval.',fill='white')
                    row.paste(Image.fromarray(gray).convert('RGB').resize((363,363),Image.Resampling.NEAREST),(0,50))
                    row.paste(Image.fromarray(rgb).resize((363,363),Image.Resampling.NEAREST),(375,50)); rows.append(row)
                    planes.append(dict(axis='xyz'[axis],nativeIndex=index,valuesSha256=sha(values.tobytes()),
                        labelProjectionSha256=sha(lab.tobytes()),candidateProjectionSha256=sha(candidate.tobytes())))
                sheet=Image.new('RGB',(738,1239),'#181818')
                for k,row in enumerate(rows): sheet.paste(row,(0,k*413))
                target=out/f'reference-{number}-{"xyz"[axis]}.png'; sheet.save(target)
                report['figures'].append(dict(path=target.name,sha256=sha(target.read_bytes()),planes=planes))
                print(target.name,flush=True)
    payload=(json.dumps(report,indent=2)+'\n').encode('utf-8')
    (out/'report.json').write_bytes(payload)
    print(json.dumps(dict(figures=len(report['figures']),reportSha256=sha(payload),roundtripMm=float(error.max()))))
