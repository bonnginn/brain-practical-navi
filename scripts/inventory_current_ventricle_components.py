"""Read-only full-extent component locations; topology is not anatomy approval."""
import argparse
import gzip
import hashlib
import json
import struct
from pathlib import Path

import numpy as np
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz'


def inventory(mask):
    if mask.ndim != 3 or mask.dtype != np.bool_:
        raise ValueError('Expected boolean XYZ mask')
    cc26, n26 = ndimage.label(mask, ndimage.generate_binary_structure(3, 3))
    cc6, n6 = ndimage.label(mask, ndimage.generate_binary_structure(3, 1))
    sizes26 = np.bincount(cc26.ravel())
    records = []
    for ident, box in enumerate(ndimage.find_objects(cc6), 1):
        points = np.argwhere(cc6[box] == ident)
        points += np.array([s.start for s in box])
        parents = np.unique(cc26[tuple(points.T)])
        if len(parents) != 1 or parents[0] == 0:
            raise ValueError('Invalid connectivity mapping')
        parent = int(parents[0])
        records.append(dict(component6=ident, voxels=len(points), seedXYZ=points[0].tolist(),
                            minXYZ=points.min(0).tolist(), maxXYZ=points.max(0).tolist(),
                            component26=parent, parent26Voxels=int(sizes26[parent])))
    records.sort(key=lambda r: (-r['voxels'], r['seedXYZ']))
    return dict(voxels=int(mask.sum()), components6=n6, components26=n26, records=records)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    if args.output.exists():
        raise ValueError('Preserve existing evidence')
    compressed = SOURCE.read_bytes()
    raw = gzip.decompress(compressed)
    if raw[:4] != b'BBS1':
        raise ValueError('Invalid volume')
    dims = struct.unpack('<3H', raw[4:10])
    labels = np.frombuffer(raw, np.uint8, offset=10).reshape(dims, order='F')
    groups = {str(ident): inventory(labels == ident) for ident in (23, 24, 25, 26, 41)}
    report = dict(sourceSha256=hashlib.sha256(compressed).hexdigest(), dimensionsXYZ=dims,
                  mutation=False, groups=groups,
                  limitation='Full-volume per-label 6/26-neighbor inventory only. Diagonal connectivity does not prove anatomical continuity. No automatic deletion or bridging.')
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open('x', encoding='utf-8') as stream:
        json.dump(report, stream, indent=2)
        stream.write('\n')
    print(json.dumps({key: {**{k:v for k,v in group.items() if k != 'records'}, 'largest':group['records'][:8]} for key,group in groups.items()}, indent=2))


if __name__ == '__main__':
    main()
