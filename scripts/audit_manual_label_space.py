"""Read-only test of manual-label provenance and non-linear spatial alignment.

The original manual label grid and transformed image grid can share an affine
without sharing anatomy. Compare exact distributed sources, then render a
research candidate obtained with the published transform. No app writes.
"""
import hashlib
import json
import h5py
import numpy as np
from scipy.ndimage import map_coordinates
from PIL import Image, ImageDraw
from build_orthogonal_review_bundle import (
    ROOT, DEFAULT_IMAGE, DEFAULT_LABELS, MAGIC_IMAGE, MAGIC_LABELS,
    EXPECTED_IMAGE_SHA256, read_browser_volume, _oriented_crop, _outline,
)
from review_bigbrain_grid_transform import load_published_grids, forward_chain, inverse_chain, XFM_SHA, GRID_SHAS

LABEL_SHA = '098edfbf365016c6c53ccf7b7032258db72a4912378c457d348c01613a4a1694'
SOURCE = ROOT/'work/official-bigbrain-tissue/mni_PD25_20190708_minc2'
FILES = {
    'BigBrain-SubCorSeg-300um.mnc': '614fac6afa9d9c400d74419f5d6c9b09cd297ba19d3a57aa81b55f73db6e682c',
    'BigBrain-SubCorSeg-500um.mnc': 'cf37a4fba1f3c2b79b75139b00b57aa41d78ebe8bf7775067c68181ed3aa8de7',
    'BigBrain-to-ICBM2009sym-nonlin-500um.mnc': '997cc5f576d8dded6e3f97680a4b2d41926b83e12402100014b9e42485f8d198',
}


def load_identity_minc(path, expected_sha):
    if hashlib.sha256(path.read_bytes()).hexdigest() != expected_sha:
        raise ValueError('Unexpected source digest')
    with h5py.File(path) as f:
        g = f['minc-2.0/image/0']; data = g['image']
        if data.attrs.get('dimorder') != b'zspace,yspace,xspace' or data.dtype.kind not in 'iu':
            raise ValueError('Unsupported image layout')
        limits = data.attrs['valid_range']
        if g['image-min'].shape or g['image-max'].shape or not np.array_equal(limits, [g['image-min'][()], g['image-max'][()]]):
            raise ValueError('Only identity scalar MINC scaling is supported')
        start, step = [], []
        for axis, name in enumerate(('xspace', 'yspace', 'zspace')):
            a = f['minc-2.0/dimensions'][name].attrs
            if a.get('units') != b'mm' or not np.array_equal(a.get('direction_cosines'), np.eye(3)[axis]):
                raise ValueError('Unsupported spatial axes')
            start.append(float(a['start'])); step.append(float(a['step']))
        if not np.isfinite(start+step).all() or np.any(np.array(step) <= 0):
            raise ValueError('Unsupported spatial sampling')
        history = f['minc-2.0'].attrs['history'].decode('utf-8')
        values = data[...].transpose(2, 1, 0)
        if values.min() < limits[0] or values.max() > limits[1]:
            raise ValueError('Values outside declared valid range')
    return values, np.array(start), np.array(step), history


def main():
    out = ROOT/'work/anatomy-review/manual-label-space-pallidum-v1'; out.mkdir(parents=True, exist_ok=True)
    _, dims, raw = read_browser_volume(DEFAULT_IMAGE, MAGIC_IMAGE, EXPECTED_IMAGE_SHA256)
    _, _, labels = read_browser_volume(DEFAULT_LABELS, MAGIC_LABELS, LABEL_SHA)
    geometry = json.loads((ROOT/'public/atlas/bigbrain-icbm500-validation.json').read_text(encoding='utf-8'))
    affine = np.array(geometry['affine']); origin, spacing = affine[:3, 3], np.diag(affine)[:3]
    current_manual = np.where(np.isin(labels, range(1, 23)), labels, 0)
    manual500, mstart, mstep, manual_history = load_identity_minc(SOURCE/'BigBrain-SubCorSeg-500um.mnc', FILES['BigBrain-SubCorSeg-500um.mnc'])
    image500, istart, istep, image_history = load_identity_minc(SOURCE/'BigBrain-to-ICBM2009sym-nonlin-500um.mnc', FILES['BigBrain-to-ICBM2009sym-nonlin-500um.mnc'])
    if manual500.shape != dims or image500.shape != dims or not np.array_equal(mstart, origin) or not np.array_equal(istart, origin) or not np.array_equal(mstep, spacing) or not np.array_equal(istep, spacing):
        raise ValueError('Distributed 500um grids differ from the app grid')
    low, high = geometry['intensityWindow']
    encoded = np.rint(np.clip((image500.astype(float)-low)/(high-low), 0, 1)*250).astype(np.uint8)
    encoded[image500 >= 65000] = 255
    report = dict(labelsSha256=LABEL_SHA, imageSha256=EXPECTED_IMAGE_SHA256, sourceDigests=FILES,
                  manual500History=manual_history, transformedImage500History=image_history,
                  allManualVoxels=int(np.count_nonzero(current_manual)),
                  directManualMismatch=int(np.count_nonzero(current_manual != manual500)),
                  encodedImageMismatch=int(np.count_nonzero(encoded != raw)),
                  labelMutation=False, adopted=False, expertReview=False,
                  transformSha256=XFM_SHA, gridSha256=GRID_SHAS, candidateScope='IDs11-14 only, research comparison', figures=[])
    if report['directManualMismatch'] or report['encodedImageMismatch']:
        raise ValueError('Distributed sources do not reproduce the actual app data')
    del manual500, image500, encoded
    source, start, step, source_history = load_identity_minc(SOURCE/'BigBrain-SubCorSeg-300um.mnc', FILES['BigBrain-SubCorSeg-300um.mnc'])
    source = source.astype(np.uint8)
    source_points = np.argwhere(np.isin(source, (11, 12, 13, 14)))
    grids = load_published_grids('catmull-rom')
    transformed = forward_chain(grids, source_points*step+start)
    pmin = np.maximum(np.floor((transformed.min(0)-origin)/spacing).astype(int)-3, 0)
    pmax = np.minimum(np.ceil((transformed.max(0)-origin)/spacing).astype(int)+4, dims)
    points = np.indices(tuple(pmax-pmin)).reshape(3, -1).T+pmin
    print(f'Pallidal target ROI: {len(points)} voxels', flush=True)
    mapped = []
    for offset in range(0, len(points), 40000):
        current = points[offset:offset+40000]
        inverse = inverse_chain(grids, current*spacing+origin)
        values = map_coordinates(source, ((inverse-start)/step).T, order=0, mode='constant', cval=0, prefilter=False)
        mapped.append(np.where(np.isin(values, (11, 12, 13, 14)), values, 0).astype(np.uint8))
        print(f'Inverse sample {min(offset+40000,len(points))}/{len(points)}', flush=True)
    candidate = np.zeros(dims, dtype=np.uint8); candidate[tuple(points.T)] = np.concatenate(mapped)
    identity_values = map_coordinates(source, ((points*spacing+origin-start)/step).T,
                                     order=0, mode='constant', cval=0, prefilter=False)
    identity_candidate = np.zeros(dims, dtype=np.uint8)
    identity_candidate[tuple(points.T)] = np.where(np.isin(identity_values, (11, 12, 13, 14)), identity_values, 0)
    report['source300History'] = source_history
    report['candidateTargetBox'] = dict(min=pmin.tolist(), maxExclusive=pmax.tolist(), voxelCount=len(points))
    report['sampling'] = 'Published forward extent plus 3 voxels; checked composed inverse; Catmull-Rom displacement; nearest source300 labels. Independent evaluator, not native MINC.'
    report['byLabel'] = {}
    for label in (11, 12, 13, 14):
        old = labels == label; new = candidate == label
        direct = identity_candidate == label
        report['byLabel'][label] = dict(oldCount=int(old.sum()), candidateCount=int(new.sum()),
            intersection=int(np.sum(old & new)), dice=float(2*np.sum(old & new)/(old.sum()+new.sum())),
            identity300CountInCandidateRoi=int(direct.sum()),
            identity300DiceInCandidateRoi=float(2*np.sum(old & direct)/(old.sum()+direct.sum())),
            oldCentroidVoxels=np.argwhere(old).mean(0).tolist(), candidateCentroidVoxels=np.argwhere(new).mean(0).tolist())
    np.savez_compressed(out/'candidate-pallidal-labels.npz', points=points, values=np.concatenate(mapped))
    report['candidateSha256'] = hashlib.sha256((out/'candidate-pallidal-labels.npz').read_bytes()).hexdigest()
    planes = [('x', x) for x in (145, 150, 155, 160, 165, 170, 220, 225, 230, 235, 240, 245, 250)]
    planes += [('y', y) for y in (232, 238, 244, 250, 256, 262, 268, 274, 280)]
    planes += [('z', z) for z in (130, 135, 140, 145, 150, 155, 160)]
    crop = dict(min=[127, 218, 115], max=[265, 301, 171])
    for axis, index in planes:
        image = _oriented_crop(raw, axis, index, crop)
        old = _oriented_crop(labels, axis, index, crop); new = _oriented_crop(candidate, axis, index, crop)
        panels = [image]
        for seg in (old, new):
            rgb = np.repeat(image[:, :, None], 3, axis=2)
            rgb[_outline(np.isin(seg, (11, 12)))] = [255, 60, 85]
            rgb[_outline(np.isin(seg, (13, 14)))] = [40, 215, 255]
            panels.append(rgb)
        h, w = image.shape; scale = 3
        sheet = Image.new('RGB', (max(w*scale*3+24, 880), h*scale+48), '#151515')
        ImageDraw.Draw(sheet).multiline_text((4, 3),
            f'{axis.upper()}={index} RAW | current labels | published-transform research candidate\n'
            'GPe red / GPi cyan. Candidate NOT adopted; interpolation and source provenance require review.', fill='white')
        for col, data in enumerate(panels):
            sheet.paste(Image.fromarray(data).convert('RGB').resize((w*scale, h*scale), Image.Resampling.NEAREST), (col*(w*scale+12), 48))
        name=f'{axis}-{index}.png'; sheet.save(out/name)
        report['figures'].append(dict(file=name, axis=axis, index=index, sha256=hashlib.sha256((out/name).read_bytes()).hexdigest()))
    (out/'report.json').write_text(json.dumps(report, indent=2)+'\n', encoding='utf-8')
    print(json.dumps(report['byLabel']), flush=True)


if __name__ == '__main__':
    main()
