"""Uncropped counterparts of current section labels; never alter segmentation."""
import argparse
import gzip
import hashlib
import json
import struct
import numpy as np
from build_section_ventricle_meshes import ATLAS, SOURCE, reconstruct

GROUPS = {
    'caudate': [7, 8], 'putamen': [9, 10],
    'pallidum-external': [11, 12], 'pallidum-internal': [13, 14],
    'thalamus': [15, 16], 'hippocampus': [17, 18],
    'accumbens': [19, 20], 'amygdala': [21, 22],
    'red-nucleus': [1, 2], 'substantia-nigra': [3, 4],
    'subthalamic': [5, 6], 'corpus-callosum': [30],
    'mammillary-bodies': [39, 40], 'insula': [34, 35],
}

def build(apply=False):
    source = SOURCE.read_bytes()
    raw = gzip.decompress(source)
    if raw[:4] != b'BBS1':
        raise ValueError('Unexpected source')
    dims = struct.unpack('<3H', raw[4:10])
    labels = np.frombuffer(raw, np.uint8, offset=10).reshape(dims[::-1])
    report = dict(source=SOURCE.name, sourceSha256=hashlib.sha256(source).hexdigest(),
                  method='0.5 mm marching cubes; no resampling, filling, smoothing or component removal',
                  scope='Display synchronization only; not anatomical validation', meshes={})
    for key, ids in GROUPS.items():
        name = 'section-current-' + key
        mesh, info = reconstruct(np.isin(labels, ids))
        payload = gzip.compress(mesh, mtime=0)
        info.update(labelIds=ids, labelVoxelCounts={str(i): int(np.count_nonzero(labels == i)) for i in ids},
                    rawSha256=hashlib.sha256(mesh).hexdigest(), sha256=hashlib.sha256(payload).hexdigest(),
                    bytes=len(payload), compression='gzip')
        report['meshes'][name] = info
        path = ATLAS / (name + '.mesh')
        if apply:
            path.write_bytes(payload)
        elif not path.exists() or path.read_bytes() != payload:
            raise ValueError('Stale mesh: ' + name)
        print(name, info['voxels'], flush=True)
    data = (json.dumps(report, indent=2) + '\n').encode()
    path = ATLAS / 'section-current-nuclei.json'
    if apply:
        path.write_bytes(data)
    elif path.read_bytes() != data:
        raise ValueError('Stale provenance')

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true')
    build(parser.parse_args().apply)
