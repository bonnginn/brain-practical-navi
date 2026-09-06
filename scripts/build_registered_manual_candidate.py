"""Research-only transfer of all 22 official manual labels to the displayed image.

Writes only a new work/ directory, never browser assets. Published displacement
fields are evaluated independently; this is not claimed native-MINC equivalence.
"""
import argparse
import hashlib
import json
from pathlib import Path
import numpy as np
from scipy.ndimage import map_coordinates, label as components, generate_binary_structure
from audit_manual_label_space import SOURCE, FILES, LABEL_SHA, load_identity_minc
from build_orthogonal_review_bundle import ROOT, DEFAULT_LABELS, DEFAULT_IMAGE, MAGIC_LABELS, MAGIC_IMAGE, EXPECTED_IMAGE_SHA256, read_browser_volume
from review_bigbrain_grid_transform import load_published_grids, forward_chain, inverse_chain, precise_inverse, XFM_SHA, GRID_SHAS


def nearest_labels(source, world, start, step):
    world = np.asarray(world, dtype=float)
    if world.ndim != 2 or world.shape[1] != 3 or not np.isfinite(world).all():
        raise ValueError('Expected finite Nx3 source-world points')
    return map_coordinates(source, ((world-start)/step).T, order=0,
                           mode='constant', cval=0, prefilter=False)


def box_from_extent(low, high, origin, spacing, dims, padding=4):
    low, high, origin, spacing = map(lambda x: np.asarray(x, dtype=float), (low, high, origin, spacing))
    dims = np.asarray(dims, dtype=int)
    if any(x.shape != (3,) for x in (low, high, origin, spacing, dims)) or not np.isfinite(np.r_[low, high, origin, spacing]).all() or np.any(spacing <= 0) or np.any(high < low) or np.any(dims <= 0) or padding < 2:
        raise ValueError('Invalid target extent')
    minimum = np.floor((low-origin)/spacing).astype(int)-padding
    maximum = np.ceil((high-origin)/spacing).astype(int)+padding+1
    # Never silently clip transformed structures at the target FOV.
    if np.any(minimum < 0) or np.any(maximum > dims):
        raise ValueError('Transformed extent or safety margin falls outside target grid')
    return minimum, maximum


def analyze_labels(old, candidate, raw):
    if old.shape != candidate.shape or old.shape != raw.shape or not np.isin(candidate, range(23)).all():
        raise ValueError('Incompatible candidate arrays')
    result = {}
    for value in range(1, 23):
        before, after = old == value, candidate == value
        points = np.argwhere(after)
        if not len(points):
            raise ValueError(f'Empty transformed label {value}')
        connected, count = components(after, generate_binary_structure(3, 1))
        sizes = np.bincount(connected.ravel())[1:]
        overlap_ids, overlap_counts = np.unique(old[after], return_counts=True)
        intersection = int(np.count_nonzero(before & after))
        result[str(value)] = dict(oldCount=int(before.sum()), candidateCount=len(points),
            intersection=intersection, oldVsCandidateDice=2*intersection/(int(before.sum())+len(points)),
            centroid=points.mean(0).tolist(), bboxMin=points.min(0).tolist(), bboxMax=points.max(0).tolist(),
            sixConnectedComponents=int(count), componentSizesDescending=sorted(map(int, sizes), reverse=True),
            encodedBackgroundVoxels=int(np.count_nonzero(raw[after] == 255)),
            overlapsCurrentLabels={str(int(k)): int(v) for k,v in zip(overlap_ids, overlap_counts)})
    for left in range(1, 23, 2):
        if result[str(left)]['centroid'][0] >= result[str(left+1)]['centroid'][0]:
            raise ValueError('Transformed left/right centroid order is invalid')
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', required=True, type=Path)
    parser.add_argument('--precision', choices=('historical', 'tight'), default='historical')
    args = parser.parse_args()
    output = args.output.resolve()
    if not output.is_relative_to((ROOT/'work').resolve()) or output.exists():
        raise ValueError('Output must be a new directory inside work/')
    output.mkdir(parents=True)
    _, dims, old = read_browser_volume(DEFAULT_LABELS, MAGIC_LABELS, LABEL_SHA)
    _, _, raw = read_browser_volume(DEFAULT_IMAGE, MAGIC_IMAGE, EXPECTED_IMAGE_SHA256)
    geometry = json.loads((ROOT/'public/atlas/bigbrain-icbm500-validation.json').read_text(encoding='utf-8'))
    affine = np.array(geometry['affine']); origin, spacing = affine[:3, 3], np.diag(affine)[:3]
    source, start, step, history = load_identity_minc(SOURCE/'BigBrain-SubCorSeg-300um.mnc', FILES['BigBrain-SubCorSeg-300um.mnc'])
    if not np.array_equal(np.unique(source), np.arange(23)):
        raise ValueError('Expected exactly source IDs0-22')
    source = source.astype(np.uint8)
    points = np.argwhere(source > 0)
    grids = load_published_grids('catmull-rom')
    low, high = np.full(3, np.inf), np.full(3, -np.inf)
    for offset in range(0, len(points), 40000):
        transformed = forward_chain(grids, points[offset:offset+40000]*step+start)
        low = np.minimum(low, transformed.min(0)); high = np.maximum(high, transformed.max(0))
    minimum, maximum = box_from_extent(low, high, origin, spacing, dims)
    source_positive = len(points); del points
    target_shape = tuple(maximum-minimum)
    target_count = int(np.prod(target_shape)); values = np.zeros(target_count, dtype=np.uint8)
    residual_max = 0.
    print(f'All22 target box {minimum.tolist()}..{maximum.tolist()} = {target_count}', flush=True)
    for offset in range(0, target_count, 40000):
        indices = np.arange(offset, min(offset+40000, target_count))
        points = np.column_stack(np.unravel_index(indices, target_shape))+minimum
        world = points*spacing+origin
        inverse = precise_inverse(grids, world)[0] if args.precision == 'tight' else inverse_chain(grids, world)
        residual_max = max(residual_max, float(np.max(np.abs(forward_chain(grids, inverse)-world))))
        values[indices] = nearest_labels(source, inverse, start, step)
        print(f'Inverse {min(offset+40000,target_count)}/{target_count}; max residual {residual_max:.6f} mm', flush=True)
    cropped = values.reshape(target_shape)
    # Check the complete six boundary faces of the candidate support box.
    if any(np.any(np.take(cropped, index, axis=axis)) for axis in range(3) for index in (0, -1)):
        raise ValueError('Nonzero candidate touches crop boundary')
    candidate = np.zeros(dims, dtype=np.uint8)
    candidate[tuple(slice(int(a), int(b)) for a,b in zip(minimum, maximum))] = cropped
    np.savez_compressed(output/'candidate-all22.npz', labels=cropped, minimum=minimum, maximumExclusive=maximum,
                        dimensions=np.array(dims), affine=affine)
    print('Computing per-label connectivity and current-label conflicts', flush=True)
    stats = analyze_labels(old, candidate, raw)
    replaced = (old > 0)&(old <= 22)
    vacated = replaced & (candidate == 0)
    report = dict(schemaVersion=1, adopted=False, labelMutation=False, expertReview=False,
        scope='All22 research-only registered manual candidate; not a practical volume',
        labelsSha256=LABEL_SHA, imageSha256=EXPECTED_IMAGE_SHA256,
        sourceSha256=FILES['BigBrain-SubCorSeg-300um.mnc'], sourceHistory=history,
        transformSha256=XFM_SHA, gridSha256=GRID_SHAS, sourceNonzeroCount=source_positive,
        sourceSpace='BigBrain2015 ICBM old-symmetric', targetSpace='Xiao2019 refined ICBM2009 symmetric',
        sampling='Ordered published forward extent; checked composed inverse; Catmull-Rom grids; nearest source300 labels; padding4. Independent evaluator, not native MINC.',
        inversePrecision=args.precision, perGridToleranceMm=1e-6 if args.precision == 'tight' else .001,
        targetBox=dict(minimum=minimum.tolist(), maximumExclusive=maximum.tolist(), voxelCount=target_count),
        maximumComposedResidualMm=residual_max, candidateSha256=hashlib.sha256((output/'candidate-all22.npz').read_bytes()).hexdigest(),
        candidateRawFullGridSha256=hashlib.sha256(candidate.tobytes(order='F')).hexdigest(),
        byLabel=stats, oldManualVacatedVoxels=int(vacated.sum()),
        newManualOverOtherLabels=int(np.count_nonzero((candidate>0)&(old>22))),
        oldManualVacatedEncodedBackground=int(np.count_nonzero(vacated & (raw == 255))),
        visualReview='Not performed by this generator; figures and human/AI observations are separate.')
    (output/'report.json').write_text(json.dumps(report, indent=2)+'\n', encoding='utf-8')
    print(json.dumps(dict(candidateCount=int(np.count_nonzero(candidate)), maxResidual=residual_max,
                          newManualOverOtherLabels=report['newManualOverOtherLabels'], oldManualVacatedVoxels=report['oldManualVacatedVoxels'])), flush=True)


if __name__ == '__main__': main()
