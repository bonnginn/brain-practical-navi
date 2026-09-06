"""Research-only 300um image/registered-source comparisons at unresolved edges.

The displayed 500um candidate is not upsampled and called higher-resolution
evidence. Original 300um manual labels are independently transferred onto the
official transformed 300um image lattice with the published displacement chain.
Current app labels are nearest-neighbor projected only for the middle panel.
No public assets, labels, or approval records are changed.
"""
import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

from audit_manual_label_space import SOURCE, FILES, LABEL_SHA, load_identity_minc
from build_registered_manual_candidate import nearest_labels
from build_orthogonal_review_bundle import ROOT, DEFAULT_LABELS, MAGIC_LABELS, read_browser_volume, _oriented_crop, _outline
from review_bigbrain_grid_transform import load_published_grids, inverse_chain, forward_chain, XFM_SHA, GRID_SHAS

IMAGE_NAME = 'BigBrain-to-ICBM2009sym-nonlin-300um.mnc'
IMAGE_SHA = 'ebf0e88def96476d0a32ddaff6f28e37d7afd125dec724e6d8855b12357c7e86'
REGIONS = [
    ('caudate-ventricle-edge', 7, [173, 262, 184]),
    ('left-thalamic-internal-bright-point', 15, [163, 225, 160]),
    ('right-thalamic-intensity-disruption', 16, [233, 228, 165]),
    ('left-hippocampal-laminar-edge', 17, [161, 249, 103]),
    ('right-hippocampal-white-band', 18, [250, 235, 100]),
]
CONFLICT_REGIONS = [
    ('left-GPi-internal-capsule-edge', 13, [163, 254, 137]),
    ('right-GPi-internal-capsule-edge', 14, [227, 254, 137]),
    ('left-accumbens-posterior-edge', 19, [174, 283, 131]),
    ('right-accumbens-posterior-edge', 20, [217, 283, 131]),
]


def region_set(name):
    if name == 'background':
        return REGIONS
    if name == 'conflicts':
        return CONFLICT_REGIONS
    raise ValueError('Unknown fine-review region set')


def fine_box(world, start, step, dimensions, radius_mm=3.):
    """Return a native-image ROI; never silently clamp its physical extent."""
    world, start, step = [np.asarray(v, dtype=float) for v in (world, start, step)]
    dimensions = np.asarray(dimensions, dtype=int)
    if any(v.shape != (3,) for v in (world, start, step, dimensions)) or not np.isfinite(np.r_[world, start, step, radius_mm]).all() or np.any(step <= 0) or radius_mm <= 0:
        raise ValueError('Invalid fine-grid geometry')
    center = np.rint((world-start)/step).astype(int)
    radius = np.ceil(radius_mm/step).astype(int)
    low, high = center-radius, center+radius+1
    if np.any(low < 0) or np.any(high > dimensions):
        raise ValueError('Fine review ROI exceeds original image grid')
    return low, high, center


def encode_image(values, window):
    low, high = map(float, window)
    if not np.isfinite([low, high]).all() or high <= low:
        raise ValueError('Invalid image window')
    encoded = np.rint(np.clip((values.astype(float)-low)/(high-low), 0, 1)*250).astype(np.uint8)
    encoded[(values >= 65000) | ~np.isfinite(values)] = 255
    return encoded


def render_fine_row(raw, old, candidate, axis, index, value):
    crop = dict(min=[0,0,0], max=(np.asarray(raw.shape)-1).tolist())
    gray = _oriented_crop(raw,axis,index,crop)
    scale = max(1, 300//gray.shape[1])
    width, height = gray.shape[1]*scale, gray.shape[0]*scale
    row = Image.new('RGB',(3*(width+10),height+28),'#151515')
    ImageDraw.Draw(row).text((4,4),f'{axis.upper()} local={index}: original image / projected current / transferred source300; ID{value} red',fill='white')
    for column, labels in enumerate((None,old,candidate)):
        rgb=np.repeat(gray[:,:,None],3,axis=2)
        if labels is not None:
            plane=_oriented_crop(labels,axis,index,crop)
            rgb[_outline(plane==value)]=[255,55,85]
        row.paste(Image.fromarray(rgb).resize((width,height),Image.Resampling.NEAREST),(column*(width+10),28))
    return row


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--region-set', choices=('background', 'conflicts'), default='background')
    args = parser.parse_args()
    output = args.output.resolve()
    if not output.is_relative_to((ROOT/'work').resolve()) or output.exists():
        raise ValueError('Output must be a new directory within work')
    _, _, old = read_browser_volume(DEFAULT_LABELS, MAGIC_LABELS, LABEL_SHA)
    geometry = json.loads((ROOT/'public/atlas/bigbrain-icbm500-validation.json').read_text(encoding='utf-8'))
    affine = np.asarray(geometry['affine'])
    app_start, app_step = affine[:3, 3], np.diag(affine)[:3]
    original, image_start, image_step, image_history = load_identity_minc(SOURCE/IMAGE_NAME, IMAGE_SHA)
    source, source_start, source_step, source_history = load_identity_minc(SOURCE/'BigBrain-SubCorSeg-300um.mnc', FILES['BigBrain-SubCorSeg-300um.mnc'])
    if not np.array_equal(np.unique(source), np.arange(23)):
        raise ValueError('Expected source IDs0-22')
    source = source.astype(np.uint8)
    grids = load_published_grids('catmull-rom')
    output.mkdir(parents=True)
    report = dict(schemaVersion=1, adopted=False, labelMutation=False, expertReview=False,
        image300Sha256=IMAGE_SHA, imageHistory=image_history, source300Sha256=FILES['BigBrain-SubCorSeg-300um.mnc'],
        sourceHistory=source_history, currentLabelsSha256=LABEL_SHA, transformSha256=XFM_SHA, gridSha256=GRID_SHAS,
        imageStart=image_start.tolist(), imageStep=image_step.tolist(), intensityWindow=geometry['intensityWindow'],
        method='Original 300um transformed image, nearest 500um current label projection, independently inverse-transferred original 300um manual labels. Not an upsampled 500um candidate and not native MINC equivalence.',
        visualReview='Generator only; no anatomical decision', regionSet=args.region_set, regions=[])
    for name, value, app_point in region_set(args.region_set):
        world = np.asarray(app_point)*app_step+app_start
        low, high, center = fine_box(world, image_start, image_step, original.shape)
        shape = tuple(high-low)
        points = np.indices(shape).reshape(3, -1).T+low
        target_world = points*image_step+image_start
        inverse = inverse_chain(grids, target_world)
        residual = float(np.max(np.abs(forward_chain(grids, inverse)-target_world)))
        registered = nearest_labels(source, inverse, source_start, source_step).reshape(shape)
        projected_old = nearest_labels(old, target_world, app_start, app_step).reshape(shape)
        raw16 = original[tuple(slice(int(a), int(b)) for a,b in zip(low,high))]
        raw = encode_image(raw16, geometry['intensityWindow'])
        np.savez_compressed(output/(name+'.npz'), originalImage=raw16, registeredLabels=registered,
            projectedCurrentLabels=projected_old, minimum=low, maximumExclusive=high,
            imageStart=image_start, imageStep=image_step)
        record = dict(name=name, candidateId=value, app500Point=app_point, worldMm=world.tolist(),
            original300Center=center.tolist(), sampledWorldMm=(center*image_step+image_start).tolist(),
            minimum=low.tolist(), maximumExclusive=high.tolist(), maximumComposedResidualMm=residual,
            npzSha256=hashlib.sha256((output/(name+'.npz')).read_bytes()).hexdigest(), sheets=[])
        # Three adjacent original 300um slices in each orthogonal direction.
        for axis_number, axis in enumerate(('x','y','z')):
            local_center = int(center[axis_number]-low[axis_number])
            planes = list(range(local_center-1, local_center+2))
            rows = [render_fine_row(raw, projected_old, registered, axis, i, value) for i in planes]
            sheet = Image.new('RGB', (max(r.width for r in rows), sum(r.height for r in rows)+50), '#151515')
            ImageDraw.Draw(sheet).multiline_text((4,4), f'{name} | original 300um image | NOT ADOPTED\n'+
                f'{axis.upper()} native indices {[int(low[axis_number])+i for i in planes]}; row indices local; target ID{value} red', fill='white')
            top = 50
            for row in rows:
                sheet.paste(row, (0,top)); top += row.height
            filename = f'{name}-{axis}.png'; sheet.save(output/filename)
            record['sheets'].append(dict(file=filename, nativeIndices=[int(low[axis_number])+i for i in planes],
                sha256=hashlib.sha256((output/filename).read_bytes()).hexdigest()))
        report['regions'].append(record)
        print(f'{name}: {len(points)} original-grid samples; inverse residual {residual:.6f} mm', flush=True)
    (output/'report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')


if __name__ == '__main__': main()
