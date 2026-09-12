"""Read-only connected candidate inventory; component IDs are not anatomy labels."""
import argparse
import json
from pathlib import Path

import numpy as np
from scipy import ndimage


def inventory(points):
    seen = set()
    for point in points:
        if (not isinstance(point, dict) or type(point.get('after')) is not int
                or point['after'] not in (23, 24)
                or not isinstance(point.get('xyz'), (list, tuple)) or len(point['xyz']) != 3
                or any(type(v) is not int or not 0 <= v < limit
                       for v, limit in zip(point['xyz'], (394, 466, 378)))):
            raise ValueError('Expected bounded integer lateral candidate')
        key = tuple(point['xyz'])
        if key in seen:
            raise ValueError('Duplicate candidate')
        seen.add(key)
    rows = []
    for side in (23, 24):
        xyz = np.asarray([p['xyz'] for p in points if p['after'] == side])
        if not len(xyz):
            continue
        if xyz.ndim != 2 or xyz.shape[1] != 3 or xyz.dtype.kind not in 'iu':
            raise ValueError('Expected integer XYZ points')
        if len(np.unique(xyz, axis=0)) != len(xyz):
            raise ValueError('Duplicate candidate')
        low = xyz.min(0)
        mask = np.zeros(xyz.max(0) - low + 1, dtype=bool)
        mask[tuple((xyz - low).T)] = True
        components, _ = ndimage.label(mask, ndimage.generate_binary_structure(3, 1))
        for ident, box in enumerate(ndimage.find_objects(components), 1):
            q = np.argwhere(components[box] == ident)
            q += np.asarray([s.start for s in box]) + low
            rows.append(dict(side=side, component=ident, count=len(q),
                             minXYZ=q.min(0).tolist(), maxXYZ=q.max(0).tolist(),
                             points=q.tolist()))
    return sorted(rows, key=lambda row: (-row['count'], row['side'], row['component']))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('reports', nargs='+', type=Path)
    args = parser.parse_args()
    for path in args.reports:
        report = json.loads(path.read_text(encoding='utf-8'))
        print(path.as_posix())
        print(json.dumps([{k: v for k, v in r.items() if k != 'points'}
                          for r in inventory(report['points'])]))
