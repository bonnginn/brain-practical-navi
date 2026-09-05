"""Install the exact sixth-stage exclusion into development assets only."""
import gzip
import hashlib
import json
import struct
import numpy as np
from apply_segmentation_patch import read_volume
from build_bigbrain_practical_seg import ROOT, CALLOSUM_INFERIOR_SOURCE_SHA256, apply_approved_callosal_inferior_patch

NEW_SHA = '098edfbf365016c6c53ccf7b7032258db72a4912378c457d348c01613a4a1694'
NEW_RAW_SHA = 'afc55069f2ecdcad36429f1026276f10c8e17a31fa9c6bf985b3beec3f640130'


def main():
    source = ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-callosal-inferior-8cc6.bin.gz'
    target = ROOT/'public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz'
    metadata_path = ROOT/'public/atlas/bigbrain-practical-segmentation-icbm500-validation.json'
    if hashlib.sha256(source.read_bytes()).hexdigest() != CALLOSUM_INFERIOR_SOURCE_SHA256:
        raise ValueError('Input fixture changed')
    if hashlib.sha256(target.read_bytes()).hexdigest() not in (CALLOSUM_INFERIOR_SOURCE_SHA256, NEW_SHA):
        raise ValueError('Current asset changed')
    dims, payload = read_volume(source)
    volume = np.frombuffer(bytes(payload), dtype=np.uint8).reshape(dims, order='F').copy()
    audit = apply_approved_callosal_inferior_patch(volume, ROOT/'segmentation-patches/review/callosum-inferior-exclusion-project-review-2026-09-06.json')
    raw = volume.tobytes(order='F')
    encoded = gzip.compress(b'BBS1'+struct.pack('<3H', *dims)+raw, compresslevel=9, mtime=0)
    if hashlib.sha256(encoded).hexdigest() != NEW_SHA or hashlib.sha256(raw).hexdigest() != NEW_RAW_SHA:
        raise ValueError('Reviewed staging does not match')
    metadata = json.loads(metadata_path.read_text(encoding='utf-8'))
    if metadata['labelCounts']['30'] not in (148179, 146019):
        raise ValueError('Metadata count changed')
    metadata['labelCounts']['30'] = 146019
    metadata['callosalInferiorPatchAudit'] = audit
    metadata['reviewedPatchAudits'] = [metadata[key] for key in (
        'reviewedPatchAudit', 'ventriclePatchAudit', 'ventricleClassificationPatchAudit',
        'callosalLocalPatchAudit', 'callosalFollowupPatchAudit', 'callosalInferiorPatchAudit')]
    metadata['preCallosalInferiorCompressedSha256'] = CALLOSUM_INFERIOR_SOURCE_SHA256
    metadata['rawVoxelSha256'] = NEW_RAW_SHA
    before = 'after the local 1605-voxel and additional 1596-voxel exclusions; remaining cingulum/fornix contamination is unresolved and no complete callosal boundary is claimed.'
    after = 'after the 1605-voxel, 1596-voxel and inferior 2160-voxel exclusions; remaining cingulum/fornix separation is incomplete and no complete callosal or fornix boundary is claimed.'
    if before not in metadata['teachingPolicy'] and after not in metadata['teachingPolicy']:
        raise ValueError('Teaching policy baseline changed')
    metadata['teachingPolicy'] = metadata['teachingPolicy'].replace(before, after)
    serialized = json.dumps(metadata, ensure_ascii=False, indent=2)+'\n'
    target.write_bytes(encoded)
    metadata_path.write_text(serialized, encoding='utf-8')
    print(json.dumps(dict(compressedSha256=NEW_SHA, rawVoxelSha256=NEW_RAW_SHA,
                          label30=146019, deployment=False)))


if __name__ == '__main__':
    main()
