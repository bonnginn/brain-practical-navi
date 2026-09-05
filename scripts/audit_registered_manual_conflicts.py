"""Enumerate registered-candidate conflicts and render evidence, never repair labels.

Small six-connected components are findings, not deletion recommendations.
Background code 255 is an image encoding, not proof of anatomical absence.
"""
import argparse
import hashlib
import json
from pathlib import Path
import numpy as np
from scipy.ndimage import label, generate_binary_structure
from PIL import Image, ImageDraw
from build_orthogonal_review_bundle import ROOT, DEFAULT_LABELS, DEFAULT_IMAGE, MAGIC_LABELS, MAGIC_IMAGE, EXPECTED_IMAGE_SHA256, read_browser_volume, _oriented_crop, _outline
from audit_manual_label_space import LABEL_SHA

CANDIDATE_SHA = '62c8aaea0e5ebd38ec5f3e81360b90c0aa6e9573d4fd885cbe818c098e7fa66d'
CANDIDATE_RAW_SHA = '89f62ff6a32f84951cd0242bb573e3fc2af717d776799edff44648221e0141d0'


def component_records(mask, origin, kind, candidate_id, current_id=None, exclude_largest=False):
    connected, count = label(mask, generate_binary_structure(3, 1))
    sizes = np.bincount(connected.ravel())[1:]
    largest = int(np.argmax(sizes))+1 if count else 0
    result = []
    for number in range(1, count+1):
        if exclude_largest and number == largest:
            continue
        points = np.argwhere(connected == number)+origin
        center = points[np.argmin(np.sum((points-points.mean(0))**2, axis=1))]
        result.append(dict(kind=kind, candidateId=int(candidate_id), currentId=current_id,
            componentNumber=number, voxelCount=len(points), minimum=points.min(0).tolist(),
            maximum=points.max(0).tolist(), representative=center.tolist(), points=points.tolist(),
            decision='unreviewed; do not infer deletion or replacement'))
    return result


def collect_findings(old, new, raw, origin=(0, 0, 0)):
    if old.shape != new.shape or old.shape != raw.shape or old.ndim != 3 or any(a.dtype != np.uint8 for a in (old, new, raw)) or not np.isin(new, range(23)).all():
        raise ValueError('Expected same-shape uint8 XYZ volumes and candidate IDs0-22')
    origin = np.asarray(origin, dtype=int)
    if origin.shape != (3,) or np.any(origin < 0):
        raise ValueError('Invalid crop origin')
    records = []
    for value in range(1, 23):
        mask = new == value
        records.extend(component_records(mask & (raw == 255), origin, 'image-background-code', value))
        records.extend(component_records(mask, origin, 'small-six-component', value, exclude_largest=True))
        for current in np.unique(old[mask & (old > 22)]):
            records.extend(component_records(mask & (old == current), origin, 'nonmanual-overlap', value, int(current)))
    for number, record in enumerate(records, 1):
        record['key'] = f'{number:03d}-{record["kind"]}-{record["candidateId"]:02d}'
    return records


def issue_planes(points, dims):
    """Every occupied axis index plus adjacent endpoints; no unrecorded sampling."""
    points = np.asarray(points)
    return [(axis, i) for n, axis in enumerate(('x', 'y', 'z'))
            for i in range(max(0, int(points[:, n].min())-1), min(dims[n], int(points[:, n].max())+2))]


def group_overlap_pairs(records):
    """Retain every overlap voxel while combining fragmented label-pair findings.

    Grouping is a presentation operation, not a component merger in the volume.
    Original component keys remain available for exact traceability.
    """
    pairs = {}
    for record in records:
        if record['kind'] == 'nonmanual-overlap':
            pairs.setdefault((record['candidateId'], record['currentId']), []).append(record)
    groups = []
    for (candidate, current), members in sorted(pairs.items()):
        points = np.asarray([p for member in members for p in member['points']], dtype=int)
        if len(np.unique(points, axis=0)) != len(points) or len(points) != sum(m['voxelCount'] for m in members):
            raise ValueError('Overlap group contains duplicate or inconsistent voxel evidence')
        center = points[np.argmin(np.sum((points-points.mean(0))**2, axis=1))]
        groups.append(dict(key=f'pair-{candidate:02d}-over-{current:02d}', kind='nonmanual-overlap',
            candidateId=candidate, currentId=current, componentKeys=[m['key'] for m in members],
            componentCount=len(members), voxelCount=len(points), points=points.tolist(),
            minimum=points.min(0).tolist(), maximum=points.max(0).tolist(), representative=center.tolist(),
            decision='unreviewed; grouping does not approve a priority or label mutation'))
    return groups


def render_issue(raw, old, new, issue, axis, index, crop):
    gray = _oriented_crop(raw, axis, index, crop)
    before = _oriented_crop(old, axis, index, crop)
    after = _oriented_crop(new, axis, index, crop)
    # Display only the candidate's own outline and the existing conflicting ID.
    # This is not a composed/adopted practical-label priority policy.
    value = issue['candidateId']; current = issue['currentId']
    scale = max(2, min(8, 340//gray.shape[1]))
    width, height = gray.shape[1]*scale, gray.shape[0]*scale
    row = Image.new('RGB', (max(1100, 3*(width+10)), height+30), '#151515')
    draw = ImageDraw.Draw(row)
    draw.text((4, 3), f'{axis.upper()}={index} RAW / CURRENT / CANDIDATE {value} red; conflict {current} cyan; issue yellow', fill='white')
    point_set = set(map(tuple, issue['points']))
    for column, labels in enumerate((None, before, after)):
        rgb = np.repeat(gray[:, :, None], 3, axis=2)
        if labels is not None:
            rgb[_outline(labels == value)] = [255, 55, 85]
            if column == 1 and current is not None:
                rgb[_outline(labels == current)] = [35, 220, 255]
        if column == 2:
            # Explicit XYZ projection matching the raw crop; highlighted voxels
            # remain visible in the unmodified first panel for comparison.
            lo, hi = crop['min'], crop['max']
            for r in range(gray.shape[0]):
                for c in range(gray.shape[1]):
                    xyz = (index, lo[1]+c, hi[2]-r) if axis == 'x' else ((lo[0]+c, index, hi[2]-r) if axis == 'y' else (lo[0]+c, hi[1]-r, index))
                    if xyz in point_set:
                        rgb[r, c] = [255, 220, 30]
        row.paste(Image.fromarray(rgb).resize((width, height), Image.Resampling.NEAREST), (column*(width+10), 30))
    return row


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--candidate-dir', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--render-kind', choices=['none', 'image-background-code', 'small-six-component', 'nonmanual-overlap'], default='none')
    parser.add_argument('--keys', nargs='*', help='Render exact finding keys only, after enumeration')
    parser.add_argument('--group-by-pair', action='store_true', help='Render overlap pairs as whole groups, retaining all component records and all occupied-axis ranges')
    args = parser.parse_args(); output = args.output.resolve()
    if args.group_by_pair and args.render_kind != 'nonmanual-overlap':
        raise ValueError('Pair grouping requires nonmanual-overlap rendering')
    if not output.is_relative_to((ROOT/'work').resolve()) or output.exists():
        raise ValueError('Output must be a new directory within work')
    path = args.candidate_dir/'candidate-all22.npz'
    if hashlib.sha256(path.read_bytes()).hexdigest() != CANDIDATE_SHA:
        raise ValueError('Unexpected registered candidate')
    _, dims, old = read_browser_volume(DEFAULT_LABELS, MAGIC_LABELS, LABEL_SHA)
    _, _, raw = read_browser_volume(DEFAULT_IMAGE, MAGIC_IMAGE, EXPECTED_IMAGE_SHA256)
    new = np.zeros(dims, dtype=np.uint8)
    with np.load(path, allow_pickle=False) as source:
        low, high = source['minimum'], source['maximumExclusive']
        if not np.array_equal(source['dimensions'], dims) or low.shape != (3,) or high.shape != (3,) or np.any(low < 0) or np.any(high > dims) or np.any(low >= high):
            raise ValueError('Unexpected candidate geometry')
        slices = tuple(slice(int(a), int(b)) for a, b in zip(low, high))
        new[slices] = source['labels']
    if hashlib.sha256(new.tobytes(order='F')).hexdigest() != CANDIDATE_RAW_SHA:
        raise ValueError('Candidate raw mismatch')
    records = collect_findings(old[slices], new[slices], raw[slices], low)
    groups = group_overlap_pairs(records) if args.group_by_pair else []
    render_records = groups if args.group_by_pair else records
    if args.keys and not set(args.keys).issubset({r['key'] for r in render_records}):
        raise ValueError('Unknown finding key')
    output.mkdir(parents=True)
    for issue in render_records:
        issue['sheets'] = []
        if issue['kind'] != args.render_kind or (args.keys and issue['key'] not in args.keys):
            continue
        points = np.asarray(issue['points'])
        crop = dict(min=np.maximum(points.min(0)-10, 0).tolist(), max=np.minimum(points.max(0)+10, np.array(dims)-1).tolist())
        planes = issue_planes(points, dims)
        issue['crop'] = crop
        for offset in range(0, len(planes), 3):
            batch = planes[offset:offset+3]
            rows = [render_issue(raw, old, new, issue, a, i, crop) for a, i in batch]
            sheet = Image.new('RGB', (max(r.width for r in rows), sum(r.height for r in rows)+30), '#151515')
            ImageDraw.Draw(sheet).text((4, 4), issue['key']+' | RESEARCH ONLY; not adopted | '+str(issue['voxelCount'])+' voxels', fill='white')
            top = 30
            for row in rows:
                sheet.paste(row, (0, top)); top += row.height
            filename = f'{issue["key"]}-{offset//3+1:02d}.png'
            sheet.save(output/filename)
            issue['sheets'].append(dict(file=filename, planes=batch, sha256=hashlib.sha256((output/filename).read_bytes()).hexdigest()))
        print(f'{issue["key"]}: {len(planes)} planes / {len(issue["sheets"])} sheets', flush=True)
    totals = {kind: dict(components=sum(r['kind'] == kind for r in records), voxels=sum(r['voxelCount'] for r in records if r['kind'] == kind)) for kind in ('image-background-code', 'small-six-component', 'nonmanual-overlap')}
    report = dict(schemaVersion=1, adopted=False, labelMutation=False, expertReview=False,
        labelsSha256=LABEL_SHA, imageSha256=EXPECTED_IMAGE_SHA256, candidateSha256=CANDIDATE_SHA,
        totals=totals, findings=records, overlapGroups=groups,
        renderGrouping='label-pair' if args.group_by_pair else 'component',
        visualReview='Generator only; no anatomical decision. Categories may overlap; do not sum them as unique voxels.')
    (output/'report.json').write_text(json.dumps(report, indent=2)+'\n', encoding='utf-8')
    print(json.dumps(totals), flush=True)


if __name__ == '__main__': main()
