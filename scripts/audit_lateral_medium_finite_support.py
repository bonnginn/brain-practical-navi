"""Read-only finite-cell intensity evidence for the pinned 867-point union.

Intensity evidence ranks boundary risk; it never establishes cavity identity.
"""
import json
import numpy as np
from audit_fornix_draft_grid import intersecting_cells
from audit_manual_label_space import SOURCE, load_identity_minc
from render_registered_manual_fine_review import IMAGE_NAME, IMAGE_SHA
from build_orthogonal_review_bundle import ROOT, DEFAULT_LABELS, MAGIC_LABELS, read_browser_volume
from stage_third_ventricle_core_repair import digest

LABEL_SHA = 'b473638881ac75dc3ce27cf9963d612ffa41f768906e895f2281954c44be9567'
INVENTORY_SHA = '1c8884fe812d21d3ec6303e9dff2878e2374bd6767bfee8b0dff3b3ca78c6042'


def finite_stats(raw, lower, upper):
    lower, upper = np.asarray(lower, float), np.asarray(upper, float)
    cells = np.asarray(intersecting_cells(lower, upper), dtype=int)
    if np.any(cells < 0) or np.any(cells >= np.asarray(raw.shape)):
        raise ValueError('Outside source grid')
    weights = np.prod(np.maximum(0, np.minimum(upper, cells + .5) - np.maximum(lower, cells - .5)), axis=1)
    volume = float(np.prod(upper - lower))
    if not np.isclose(weights.sum(), volume, rtol=1e-10, atol=1e-10):
        raise ValueError('Incomplete finite coverage')
    values = raw[tuple(cells.T)]
    return dict(sourceCells=len(cells), sourceMin=int(values.min()), sourceMax=int(values.max()),
                weightedMean=float(np.dot(values, weights) / volume),
                below65000CellCount=int(np.count_nonzero(values < 65000)),
                below65000VolumeFraction=float(weights[values < 65000].sum() / volume),
                minimumCellXYZ=cells[int(np.argmin(values))].tolist())


def main():
    work = ROOT / 'work/anatomy-review'
    out = work / 'lateral-fringe-medium-finite-support-v1.json'
    if out.exists():
        raise ValueError('Preserve evidence')
    inventory_bytes = (work / 'lateral-ventricle-fringe-v1/report.json').read_bytes()
    if digest(inventory_bytes) != INVENTORY_SHA:
        raise ValueError('Inventory changed')
    inventory = json.loads(inventory_bytes)
    _, _, labels = read_browser_volume(DEFAULT_LABELS, MAGIC_LABELS, LABEL_SHA)
    raw, start, step, _ = load_identity_minc(SOURCE / IMAGE_NAME, IMAGE_SHA)
    geometry_bytes = (ROOT / 'public/atlas/bigbrain-icbm500-validation.json').read_bytes()
    affine = np.asarray(json.loads(geometry_bytes)['affine'], float)
    origin, spacing = affine[:3, 3], np.diag(affine)[:3]
    expected = np.diag([*spacing, 1.0]); expected[:3, 3] = origin
    if not np.allclose(affine, expected) or np.any(spacing <= 0):
        raise ValueError('Unsupported app affine')
    records, seen, components = [], set(), []
    for result in inventory['results']:
        target = result['target']
        if target not in (23, 24):
            raise ValueError('Unexpected target')
        for component in result['components']:
            if not 20 <= len(component['points']) <= 49:
                continue
            components.append(dict(target=target, component=component['id'], count=len(component['points'])))
            for xyz in component['points']:
                key = tuple(xyz)
                if key in seen or any(type(v) is not int or v < 0 or v >= n for v, n in zip(xyz, labels.shape)) or labels[key] != 0:
                    raise ValueError('Candidate conflict')
                seen.add(key); p = np.asarray(xyz)
                lower = ((p - .5) * spacing + origin - start) / step
                upper = ((p + .5) * spacing + origin - start) / step
                records.append(dict(xyz=xyz, target=target, component=component['id'],
                                    sourceLower=lower.tolist(), sourceUpper=upper.tolist(),
                                    **finite_stats(raw, lower, upper)))
    if len(records) != 867 or len(components) != 31:
        raise ValueError('Unexpected candidate coverage')
    summary = dict(candidateCount=len(records), componentCount=len(components),
                   minimumSourceValue=min(r['sourceMin'] for r in records),
                   candidatesWithBelow65000Cells=sum(r['below65000CellCount'] > 0 for r in records),
                   maximumBelow65000VolumeFraction=max(r['below65000VolumeFraction'] for r in records))
    report = dict(labelSha256=LABEL_SHA, inventorySha256=INVENTORY_SHA, sourceSha256=IMAGE_SHA,
                  geometrySha256=digest(geometry_bytes), components=components, records=records, summary=summary,
                  mutation=False, adopted=False, expertReviewed=False,
                  method='All positive-volume intersections with nearest-neighbor source cells; exact box-volume weights. No interpolation or filling.',
                  limitation='65000 is the historical candidate-ranking threshold, not a tissue-class boundary. Brightness cannot distinguish ventricle from external empty space, vessels or artifact. This does not approve any voxel.')
    out.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(summary), flush=True)


if __name__ == '__main__':
    main()
