"""Sample every adopted mammillary voxel centre in native100; never edit labels."""
import hashlib
import json
import h5py
import numpy as np
from scipy.ndimage import map_coordinates
from audit_native_roi_transform import checked, load_linear, load_native_grid, GRID_SHA, LIN_SHA, NL_SHA
from inspect_hypothalamus_roi import SOURCE, SHA, decode_identity_roi
from review_bigbrain_grid_transform import load_published_grids, forward_chain, precise_inverse, GRID_SHAS
from build_orthogonal_review_bundle import ROOT, DEFAULT_IMAGE, DEFAULT_LABELS, MAGIC_IMAGE, MAGIC_LABELS, EXPECTED_IMAGE_SHA256, read_browser_volume
from render_current_ventral_midbrain import LABEL_SHA


def main():
    path = ROOT/'work/anatomy-review/mammillary-native-support-v1.json'
    if path.exists():
        raise ValueError('Evidence exists')
    with h5py.File(checked(SOURCE, SHA)) as f:
        native, start, step = decode_identity_roi(f['minc-2.0'])
    _, _, labels = read_browser_volume(DEFAULT_LABELS, MAGIC_LABELS, LABEL_SHA)
    _, _, app = read_browser_volume(DEFAULT_IMAGE, MAGIC_IMAGE, EXPECTED_IMAGE_SHA256)
    affine = np.array(json.loads((ROOT/'public/atlas/bigbrain-icbm500-validation.json').read_text())['affine'])
    points = np.argwhere(np.isin(labels, [39, 40]))
    world = points@affine[:3,:3].T+affine[:3,3]
    linear = load_linear(); grid = load_native_grid(); improved = load_published_grids('catmull-rom')
    old, residual_improved = precise_inverse(improved, world)
    before_grid, residual_grid = precise_inverse([grid], old)
    native_world = (before_grid-linear[:,3])@np.linalg.inv(linear[:,:3]).T
    coords = (native_world-start)/step
    roundtrip = forward_chain(improved, grid.forward(native_world@linear[:,:3].T+linear[:,3]))
    residual = float(np.abs(roundtrip-world).max())
    if residual > 1e-5:
        raise ValueError('Roundtrip failed')
    valid = np.all((coords >= 0)&(coords <= np.array(native.shape)-1), axis=1)
    raw = np.full(len(points), np.nan)
    raw[valid] = map_coordinates(native.astype(np.float32), coords[valid].T, order=1, prefilter=False)
    report = dict(nativeSha256=SHA, labelsSha256=LABEL_SHA, appSha256=EXPECTED_IMAGE_SHA256,
        nativeLinearSha256=LIN_SHA, nativeNonlinearSha256=NL_SHA, nativeGridSha256=GRID_SHA,
        improvedGridSha256=GRID_SHAS, mutation=False, expertReviewed=False,
        maximumRoundtripErrorMm=residual, intermediateResidualsMm=[residual_improved,residual_grid],
        interpretation='Image-support screen only. Low native signal is NOT sufficient evidence for deletion; registration residual and partial volume remain.',
        sampling='All app label voxel centres inverse-mapped to native100, trilinear raw uint16 intensity', labels={})
    for label in [39,40]:
        selected = labels[tuple(points.T)] == label
        valid_selected = selected&valid
        candidates = selected&valid&(raw < 500)
        report['labels'][str(label)] = dict(count=int(selected.sum()), outsideNativeRoiCount=int((selected&~valid).sum()),
            nativeIndexMin=coords[selected].min(0).tolist(), nativeIndexMax=coords[selected].max(0).tolist(),
            rawPercentiles=np.percentile(raw[valid_selected],[0,1,5,50,95,100]).tolist() if valid_selected.any() else None,
            lowSignalBelow500=[dict(appXYZ=points[i].tolist(),nativeXYZ=coords[i].tolist(),nativeRaw=float(raw[i]),appGray=int(app[tuple(points[i])])) for i in np.flatnonzero(candidates)])
    path.write_text(json.dumps(report,indent=2,allow_nan=False)+'\n',encoding='utf-8')
    print(json.dumps({k:{'count':v['count'],'outside':v['outsideNativeRoiCount'],'lowSignal':len(v['lowSignalBelow500'])} for k,v in report['labels'].items()}))
    print('roundtrip',residual)


if __name__ == '__main__':
    main()
