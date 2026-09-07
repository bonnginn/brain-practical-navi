"""Compare native ROI transform alternatives against observed old/app images.

Read-only evidence. No estimated registration, segmentation or public writes.
"""
import hashlib
import json
import re
import h5py
import numpy as np
from scipy.ndimage import map_coordinates
from inspect_hypothalamus_roi import SOURCE, SHA, decode_identity_roi
from review_bigbrain_grid_transform import DisplacementGrid, load_published_grids, forward_chain
from build_orthogonal_review_bundle import ROOT, DEFAULT_IMAGE, MAGIC_IMAGE, EXPECTED_IMAGE_SHA256, read_browser_volume

GRID_SHA = '03ba5b1c91d77f66f72ccbbee5044874fc45b1da6cdaffd4b2ac2111dec8f9df'
LIN_SHA = 'd2b9980b1212ed40dbe45693b548854fbf52eacd418926d31cbfb87786a56944'
NL_SHA = '43ed6cff8ad7f0349981a463c97789a0fdb02f8bd5491a0e14ee3a52d0dc6a75'
OLD_SHA = 'b67659e085140154763d9887dafac851e9b7022158a79b364d2402fa26290704'


def checked(path, sha):
    with path.open('rb') as stream:
        observed = hashlib.file_digest(stream, 'sha256').hexdigest()
    if observed != sha:
        raise ValueError('Source changed: '+str(path))
    return path


class BoundedGrid(DisplacementGrid):
    def displacement(self, world):
        coords = (np.asarray(world)-self.start)/self.step
        if np.any(coords < 1) or np.any(coords > np.asarray(self.values.shape[1:])-2):
            raise ValueError('Outside explicitly loaded grid interior')
        return super().displacement(world)


def load_native_grid():
    path = checked(ROOT/'work/bigbrain_to_icbm2009b_nl_grid_0.mnc', GRID_SHA)
    with h5py.File(path) as f:
        g = f['minc-2.0']; image = g['image/0/image']
        if image.attrs['dimorder'] != b'vector_dimension,zspace,yspace,xspace' or image.dtype.kind != 'f' or image.shape[0] != 3:
            raise ValueError('Unexpected vector field')
        start, step = [], []
        for axis, name in enumerate(('xspace','yspace','zspace')):
            a = g['dimensions/'+name].attrs
            if a['units'] != b'mm' or not np.array_equal(a.get('direction_cosines', np.eye(3)[axis]), np.eye(3)[axis]):
                raise ValueError('Unexpected grid orientation')
            start.append(float(a['start'])); step.append(float(a['step']))
        start, step = np.array(start), np.array(step)
        if not np.isfinite(start).all() or not np.array_equal(step, [1,1,1]):
            raise ValueError('Unexpected sampling')
        # Bounds cover native ROI and the linear comparison, plus cubic margin.
        lo = np.floor((np.array([-50,-60,-60])-start)/step).astype(int)
        hi = np.ceil((np.array([50,50,40])-start)/step).astype(int)+1
        if np.any(lo < 0) or np.any(hi > np.array(image.shape[:0:-1])):
            raise ValueError('Invalid grid crop')
        values = image[:,lo[2]:hi[2],lo[1]:hi[1],lo[0]:hi[0]].transpose(0,3,2,1)
    return BoundedGrid(values, start+lo*step, step, 'catmull-rom')


def load_linear():
    lin = checked(ROOT/'work/bigbrain_to_icbm2009b_lin.xfm', LIN_SHA).read_text()
    nl = checked(ROOT/'work/bigbrain_to_icbm2009b_nl.xfm', NL_SHA).read_text()
    if 'Displacement_Volume = bigbrain_to_icbm2009b_nl_grid_0.mnc;' not in nl:
        raise ValueError('Wrong grid reference')
    block = lin.split('Linear_Transform =', 1)[1].split(';', 1)[0]
    numbers = re.findall(r'[-+]?\d+(?:\.\d*)?(?:[eE][-+]?\d+)?', block)
    matrix = np.array([float(n) for n in numbers]).reshape(3,4)
    return matrix


def main():
    import nibabel as nib
    out = ROOT/'work/anatomy-review/native-roi-transform-v1.json'
    if out.exists():
        raise ValueError('Evidence exists')
    with h5py.File(checked(SOURCE, SHA)) as f:
        raw, start, step = decode_identity_roi(f['minc-2.0'])
    indices = np.stack(np.meshgrid(*[np.arange(2,n-2,7) for n in raw.shape], indexing='ij'), axis=-1).reshape(-1,3)
    world = indices*step+start
    inverted = 65535-raw[tuple(indices.T)].astype(float)
    grid = load_native_grid(); matrix = load_linear()
    linear = world@matrix[:,:3].T+matrix[:,3]
    variants = {'grid-only':grid.forward(world), 'linear-then-grid':grid.forward(linear), 'linear-only':linear}
    old = nib.load(checked(ROOT/'work/official-bigbrain-tissue/full8_400um_2009b_sym.nii.gz', OLD_SHA))
    old_values = np.asarray(old.dataobj, dtype=np.float32)
    _,_,app = read_browser_volume(DEFAULT_IMAGE, MAGIC_IMAGE, EXPECTED_IMAGE_SHA256)
    geom = json.loads((ROOT/'public/atlas/bigbrain-icbm500-validation.json').read_text())
    improved = load_published_grids('catmull-rom')
    report = dict(nativeSha256=SHA, nativeGridSha256=GRID_SHA, linearSha256=LIN_SHA,
                  nonlinearXfmSha256=NL_SHA, oldImageSha256=OLD_SHA, appImageSha256=EXPECTED_IMAGE_SHA256,
                  sampleCount=len(world), sampling='Native XYZ index 2 to n-2 exclusive, stride 7; fixed points including background',
                  intensityPolarity='65535-native for comparison only', interpolation='Independent Catmull-Rom fields; trilinear intensity',
                  mutation=False, registrationAccepted=False, variants={})
    for name, old_world in variants.items():
        coords = nib.affines.apply_affine(np.linalg.inv(old.affine), old_world)
        observed = map_coordinates(old_values, coords.T, order=1, mode='constant', cval=65535)
        common = (inverted<65000)&(observed<65000)
        app_world = forward_chain(improved, old_world)
        app_coords = nib.affines.apply_affine(np.linalg.inv(np.array(geom['affine'])), app_world)
        seen = map_coordinates(app.astype(np.float32), app_coords.T, order=1, mode='constant', cval=255)
        app_common = (inverted<65000)&(seen<250)
        report['variants'][name] = dict(oldCommon=int(common.sum()), oldCorrelation=float(np.corrcoef(inverted[common],observed[common])[0,1]),
            appCommon=int(app_common.sum()), appCorrelation=float(np.corrcoef(inverted[app_common],seen[app_common])[0,1]),
            mappedAppMin=app_coords.min(0).tolist(), mappedAppMax=app_coords.max(0).tolist())
    with out.open('x', encoding='utf-8') as f:
        json.dump(report, f, indent=2); f.write('\n')
    print(json.dumps(report['variants']))


if __name__ == '__main__':
    main()
