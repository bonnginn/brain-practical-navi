"""Install only the pinned callosal correction into the development tree.

Reconstruct from the archived 930e baseline; no git, merge or deployment.
"""
import gzip
import hashlib
import json
import struct
import numpy as np
from apply_segmentation_patch import read_volume
from build_bigbrain_practical_seg import ROOT,CALLOSUM_SOURCE_COMPRESSED_SHA256,apply_approved_callosal_local_patch

NEW_SHA='5348b7650a3ba28c95a00407d62cf4054fb0c670a62de717f2c572f66a51c9a3'
NEW_RAW_SHA='35b2a2bf42c0f045141ea51c2adf66d9daea99fcf851a6404133a52b8cbde734'


def main():
    fixture=ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-callosum-930e.bin.gz'
    target=ROOT/'public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz'
    metadata_path=ROOT/'public/atlas/bigbrain-practical-segmentation-icbm500-validation.json'
    if hashlib.sha256(fixture.read_bytes()).hexdigest()!=CALLOSUM_SOURCE_COMPRESSED_SHA256:raise ValueError('Original fixture changed')
    if hashlib.sha256(target.read_bytes()).hexdigest() not in (CALLOSUM_SOURCE_COMPRESSED_SHA256,NEW_SHA):raise ValueError('Unexpected current labels')
    dims,payload=read_volume(fixture);volume=np.frombuffer(bytes(payload),dtype=np.uint8).reshape(dims,order='F').copy()
    audit=apply_approved_callosal_local_patch(volume,ROOT/'segmentation-patches/review/callosum-local-exclusion-project-review-2026-09-06.json')
    raw=volume.tobytes(order='F');encoded=gzip.compress(b'BBS1'+struct.pack('<3H',*dims)+raw,compresslevel=9,mtime=0)
    if hashlib.sha256(encoded).hexdigest()!=NEW_SHA or hashlib.sha256(raw).hexdigest()!=NEW_RAW_SHA:raise ValueError('Output identity differs from reviewed staging')
    metadata=json.loads(metadata_path.read_text(encoding='utf-8'))
    if metadata['labelCounts']['30'] not in (151380,149775):raise ValueError('Metadata baseline changed')
    metadata['labelCounts']['30']=149775
    metadata['callosalLocalPatchAudit']=audit
    metadata['reviewedPatchAudits']=[metadata['reviewedPatchAudit'],metadata['ventriclePatchAudit'],metadata['ventricleClassificationPatchAudit'],audit]
    metadata['preCallosalRepairCompressedSha256']=CALLOSUM_SOURCE_COMPRESSED_SHA256
    metadata['rawVoxelSha256']=NEW_RAW_SHA
    if 'ID30 remains a provisional candidate after' not in metadata['teachingPolicy']:
        metadata['teachingPolicy']+=' ID30 remains a provisional candidate after the local 1605-voxel exclusion; remaining cingulum/fornix contamination is unresolved and no complete callosal boundary is claimed.'
    target.write_bytes(encoded)
    metadata_path.write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(dict(compressedSha256=NEW_SHA,rawVoxelSha256=NEW_RAW_SHA,label30=149775,deployment=False)))


if __name__=='__main__':main()
