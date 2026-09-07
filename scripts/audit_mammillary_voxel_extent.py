"""Finite voxel sampling of screened points; no threshold-based label changes."""
import hashlib
import json
import h5py
import numpy as np
from scipy.ndimage import map_coordinates
from audit_mammillary_native_support import (ROOT, checked, SOURCE, SHA, decode_identity_roi,
    load_linear, load_native_grid, load_published_grids, precise_inverse, forward_chain,
    DEFAULT_LABELS, MAGIC_LABELS, LABEL_SHA, read_browser_volume)

INPUT = ROOT/'work/anatomy-review/mammillary-native-support-v1.json'
INPUT_SHA = 'c59cb68dc2141ebc9b4c922dd31d7438d9df7aa7c7ba83cee408ca738a7a536d'


def voxel_samples(points):
    offsets = np.stack(np.meshgrid(*([np.linspace(-.5,.5,5)]*3),indexing='ij'),axis=-1).reshape(-1,3)
    return np.asarray(points)[:,None,:]+offsets[None,:,:]


def main():
    out = ROOT/'work/anatomy-review/mammillary-voxel-extent-v1.json'
    if out.exists(): raise ValueError('Evidence exists')
    source = json.loads(checked(INPUT, INPUT_SHA).read_text())
    entries = [dict(p, label=int(k)) for k,v in source['labels'].items() for p in v['lowSignalBelow500']]
    points = np.array([p['appXYZ'] for p in entries])
    _, _, labels = read_browser_volume(DEFAULT_LABELS, MAGIC_LABELS, LABEL_SHA)
    if not np.array_equal(labels[tuple(points.T)],[p['label'] for p in entries]):
        raise ValueError('Screened label identity changed')
    with h5py.File(checked(SOURCE,SHA)) as f:
        raw,start,step = decode_identity_roi(f['minc-2.0'])
    geometry=json.loads((ROOT/'public/atlas/bigbrain-icbm500-validation.json').read_text())
    affine=np.array(geometry['affine'])
    sample_indices=voxel_samples(points)
    world=sample_indices.reshape(-1,3)@affine[:3,:3].T+affine[:3,3]
    linear=load_linear(); grid=load_native_grid(); improved=load_published_grids('catmull-rom')
    old,_=precise_inverse(improved,world)
    before,_=precise_inverse([grid],old)
    native_world=(before-linear[:,3])@np.linalg.inv(linear[:,:3]).T
    coords=(native_world-start)/step
    if np.any(coords<0) or np.any(coords>np.array(raw.shape)-1):
        raise ValueError('Subvoxel sample outside native ROI')
    residual=float(np.abs(forward_chain(improved,grid.forward(native_world@linear[:,:3].T+linear[:,3]))-world).max())
    if residual>1e-5: raise ValueError('Inverse residual')
    values=map_coordinates(raw.astype(np.float32),coords.T,order=1,prefilter=False).reshape(len(points),125)
    for entry, v in zip(entries,values):
        entry['nativeSampleMin']=float(v.min());entry['nativeSampleMax']=float(v.max())
        entry['nativeSamplesBelow500']=int((v<500).sum())
        entry['nativeSamplesAbove3000']=int((v>3000).sum())
    report=dict(inputSha256=INPUT_SHA,nativeSha256=SHA,labelsSha256=LABEL_SHA,mutation=False,
        method='125 evenly spaced points including voxel faces/corners, offsets -0.5,-0.25,0,0.25,0.5 app index',
        warning='Sample proportions are not tissue-volume fractions. Thresholds are review screens, not anatomical classification.',
        maximumRoundtripErrorMm=residual,entries=entries)
    out.write_text(json.dumps(report,indent=2,allow_nan=False)+'\n',encoding='utf-8')
    print(json.dumps(dict(points=len(entries),all125Below500=sum(p['nativeSamplesBelow500']==125 for p in entries),
        anyAbove3000=sum(p['nativeSamplesAbove3000']>0 for p in entries),maximumRoundtripErrorMm=residual)))


if __name__=='__main__': main()
