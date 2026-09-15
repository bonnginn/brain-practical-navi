"""Reconstruct both existing internal-capsule labels for BigBrain section views."""
import argparse
import gzip
import hashlib
import json
import struct
import numpy as np
from build_section_ventricle_meshes import ATLAS, SOURCE, reconstruct, DISPLAY_ORIGIN_ZYX

NAME = 'section-current-internal-capsule'

def build():
    compressed = SOURCE.read_bytes()
    raw = gzip.decompress(compressed)
    if raw[:4] != b'BBS1':
        raise ValueError('Unexpected label format')
    dims = struct.unpack('<3H', raw[4:10])
    labels = np.frombuffer(raw, np.uint8, offset=10).reshape(dims[::-1])
    counts = {str(i): int(np.count_nonzero(labels == i)) for i in (31, 32)}
    if not all(counts.values()):
        raise ValueError('Both internal-capsule labels are required')
    mesh, info = reconstruct(np.isin(labels, (31, 32)))
    return mesh, dict(source=SOURCE.name, sourceSha256=hashlib.sha256(compressed).hexdigest(),
        labelIds=[31, 32], labelVoxelCounts=counts, sourceSamplingMm=.5,
        displayOriginZYX=DISPLAY_ORIGIN_ZYX.tolist(),
        method='marching cubes 0.5; no resampling, smoothing, filling or component removal',
        scope='Existing image-guided candidate labels, bilateral and uncropped; not expert validation', **info)

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    mesh, report = build()
    outputs = {NAME+'.mesh': mesh, NAME+'.json': (json.dumps(report, indent=2)+'\n').encode()}
    for name, data in outputs.items():
        if args.apply:
            (ATLAS/name).write_bytes(data)
        elif (ATLAS/name).read_bytes() != data:
            raise SystemExit('Stale internal-capsule mesh: '+name)
    print(json.dumps(report, indent=2))
