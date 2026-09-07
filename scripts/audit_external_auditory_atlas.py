"""Read-only, slice-streamed inventory of the Sitek BigBrain atlas.

Numeric values are NOT assigned anatomical names without an author label key.
Its corrected MNI registration is NOT assumed equal to our Xiao registration.
"""
import gzip
import hashlib
import json
import struct
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'work/auditory-atlas-sitek/sub-bigbrain_MNI_conjunction_rois.nii.gz'
SHA = '4327588dc0d2beae92a4f47d48af674235bfcd8742ca71a2592a91aa46994e91'


def main():
    output = SOURCE.parent / 'inventory-v1.json'
    if output.exists():
        raise ValueError('Do not overwrite evidence')
    if hashlib.sha256(SOURCE.read_bytes()).hexdigest() != SHA:
        raise ValueError('Unexpected source bytes')
    inventory = {}
    with gzip.open(SOURCE, 'rb') as stream:
        header = stream.read(348)
        if struct.unpack_from('<i', header)[0] != 348 or header[344:348] != b'n+1\0':
            raise ValueError('Expected little-endian NIfTI-1 single file')
        dims = struct.unpack_from('<8h', header, 40)
        if dims[:4] != (3, 720, 600, 840) or struct.unpack_from('<2h', header, 70) != (16, 32):
            raise ValueError('Expected fixed float32 3D source')
        offset, slope, intercept = struct.unpack_from('<3f', header, 108)
        if offset != int(offset) or offset < 348 or slope not in (0, 1) or intercept != 0:
            raise ValueError('Unsupported offset/scaling')
        if struct.unpack_from('<h', header, 254)[0] <= 0:
            raise ValueError('Missing sform')
        affine = np.eye(4)
        affine[:3] = np.array(struct.unpack_from('<12f', header, 280)).reshape(3, 4)
        stream.read(int(offset) - 348)
        nx, ny, nz = dims[1:4]
        for z in range(nz):
            block = stream.read(nx * ny * 4)
            if len(block) != nx * ny * 4:
                raise ValueError('Truncated volume')
            plane = np.frombuffer(block, dtype='<f4').reshape((nx, ny), order='F')
            if not np.isfinite(plane).all() or np.any(plane != np.rint(plane)):
                raise ValueError('Not an integer-valued label volume')
            for value in np.unique(plane):
                if value == 0:
                    continue
                xy = np.argwhere(plane == value)
                lo, hi = [*xy.min(0), z], [*xy.max(0), z]
                key = int(value)
                if key not in inventory:
                    inventory[key] = dict(count=0, minXYZ=list(lo), maxXYZ=list(hi))
                item = inventory[key]
                item['count'] += len(xy)
                item['minXYZ'] = np.minimum(item['minXYZ'], lo).tolist()
                item['maxXYZ'] = np.maximum(item['maxXYZ'], hi).tolist()
        if stream.read(1):
            raise ValueError('Unexpected trailing payload')
    for item in inventory.values():
        item['minXYZ'] = [int(v) for v in item['minXYZ']]
        item['maxXYZ'] = [int(v) for v in item['maxXYZ']]
        item['worldAtMinXYZ'] = (affine @ [*item['minXYZ'], 1])[:3].tolist()
        item['worldAtMaxXYZ'] = (affine @ [*item['maxXYZ'], 1])[:3].tolist()
    report = dict(sourceSha256=SHA, commit='2b73fb3e1f0afef8c3c487bf86c9bf61f6b04d51',
        url='https://github.com/sitek/subcortical-auditory-atlas',
        shape=list(dims[1:4]), affine=affine.tolist(), values=inventory,
        anatomicalLabelKeyVerified=False, registrationToCurrentAppVerified=False,
        adopted=False, mutation=False,
        limitation='Author-corrected MNI space; not the current Xiao deformation. CNVIII is explicitly not labelled in the histological atlas. Numeric IDs have no verified names yet.')
    output.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
