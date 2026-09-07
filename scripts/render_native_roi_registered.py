"""Native 100um planes compared with mapped app image and label context."""
import hashlib
import json
import h5py
import numpy as np
from scipy.ndimage import map_coordinates
from PIL import Image, ImageDraw
from audit_native_roi_transform import checked, load_linear, load_native_grid, GRID_SHA, LIN_SHA, NL_SHA
from inspect_hypothalamus_roi import SOURCE, SHA, decode_identity_roi
from review_bigbrain_grid_transform import load_published_grids, forward_chain, GRID_SHAS
from build_orthogonal_review_bundle import ROOT, DEFAULT_IMAGE, DEFAULT_LABELS, MAGIC_IMAGE, MAGIC_LABELS, EXPECTED_IMAGE_SHA256, read_browser_volume
from render_current_ventral_midbrain import LABEL_SHA, outlined_labels


def main():
    out = ROOT/'work/anatomy-review/hypothalamus-native100-registered-v1'
    if out.exists():
        raise ValueError('Evidence exists')
    with h5py.File(checked(SOURCE,SHA)) as f:
        native,start,step = decode_identity_roi(f['minc-2.0'])
    _,_,app = read_browser_volume(DEFAULT_IMAGE,MAGIC_IMAGE,EXPECTED_IMAGE_SHA256)
    _,_,labels = read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,LABEL_SHA)
    geometry=json.loads((ROOT/'public/atlas/bigbrain-icbm500-validation.json').read_text())
    affine=np.array(geometry['affine']); inv=np.linalg.inv(affine)
    linear=load_linear(); grid=load_native_grid(); improved=load_published_grids('catmull-rom')
    low,high=geometry['intensityWindow']
    out.mkdir(parents=True)
    report=dict(nativeSha256=SHA,appSha256=EXPECTED_IMAGE_SHA256,labelsSha256=LABEL_SHA,
        nativeLinearSha256=LIN_SHA,nativeNonlinearSha256=NL_SHA,nativeGridSha256=GRID_SHA,improvedGridSha256=GRID_SHAS,
        mapping='native -> official linear -> official nonlinear grid -> three improved ICBM grids',
        geometry='Panels are native coronal planes; mapped app sampling follows curved coordinates, not a single app Y plane.',
        labelInterpolation='nearest for context only; not a new high-resolution segmentation',
        nativePolarity='65535-value',mutation=False,expertReviewed=False,figures=[])
    for y in [0,35,70,105,140,175]:
        shape=(native.shape[0],native.shape[2])
        x,z=np.indices(shape); indices=np.stack((x.ravel(),np.full(x.size,y),z.ravel()),axis=1)
        world=indices*step+start
        old=grid.forward(world@linear[:,:3].T+linear[:,3])
        mapped=forward_chain(improved,old)
        coords=mapped@inv[:3,:3].T+inv[:3,3]
        if np.any(coords<0) or np.any(coords>np.array(app.shape)-1):
            raise ValueError('Mapped ROI outside app image')
        app_plane=map_coordinates(app.astype(np.float32),coords.T,order=1,mode='constant',cval=255).reshape(shape).T[::-1]
        label_plane=map_coordinates(labels,coords.T,order=0,mode='constant',cval=0,prefilter=False).reshape(shape).T[::-1]
        inverted=65535-native[:,y,:].astype(float)
        gray=np.rint(np.clip((inverted-low)/(high-low),0,1)*250).astype('uint8')
        gray[inverted>=65000]=255
        gray=gray.T[::-1]
        overlay=outlined_labels(gray,label_plane)
        w,h=gray.shape[1],gray.shape[0]
        sheet=Image.new('RGB',(3*w+24,h+76),'#181818'); d=ImageDraw.Draw(sheet)
        d.text((4,4),f'Native Y={y}: RAW100 | mapped APP500 | RAW100 with projected APP labels500',fill='white')
        d.text((4,21),'Correct composition under review: linear + native grid + improved grids. No label adoption.',fill='white')
        d.text((4,38),'Thalamus pale blue / RN cyan / SN orange / STN purple / brainstem red / mixed33 yellow / MB green',fill='white')
        d.text((4,55),'Native plane, not an app coronal plane; same display window; no inferred subvoxel label boundaries.',fill='white')
        for column,array in enumerate([gray,np.rint(app_plane).astype('uint8'),overlay]):
            sheet.paste(Image.fromarray(array).convert('RGB'),(column*(w+12),76))
        path=out/f'mapped-y-{y:03}.png';sheet.save(path)
        report['figures'].append(dict(path=path.name,nativeYIndex=y,sha256=hashlib.sha256(path.read_bytes()).hexdigest(),
            mappedAppMin=coords.min(0).tolist(),mappedAppMax=coords.max(0).tolist()))
        print(path.name,flush=True)
    (out/'report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')


if __name__=='__main__':main()
