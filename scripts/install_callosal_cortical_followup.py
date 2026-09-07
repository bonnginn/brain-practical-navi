"""Install the exact fifth stage into development assets, with no deployment."""
import gzip
import hashlib
import json
import struct
import numpy as np
from apply_segmentation_patch import read_volume
from build_bigbrain_practical_seg import ROOT,CALLOSUM_FOLLOWUP_SOURCE_SHA256,apply_approved_callosal_followup_patch

NEW_SHA='8cc65edf36e1e3a420168bfb663d6440418dd67189808263d11c180c4b403d16'
NEW_RAW_SHA='3c9d959acbdb67b7603ed7f2f105d7c333f0f89facc7e637f16b5fb740a16cd5'


def main():
    source=ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-callosal-followup-5348.bin.gz'
    target=ROOT/'public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz'
    metadata_path=ROOT/'public/atlas/bigbrain-practical-segmentation-icbm500-validation.json'
    if hashlib.sha256(source.read_bytes()).hexdigest()!=CALLOSUM_FOLLOWUP_SOURCE_SHA256:raise ValueError('Input fixture changed')
    if hashlib.sha256(target.read_bytes()).hexdigest() not in (CALLOSUM_FOLLOWUP_SOURCE_SHA256,NEW_SHA):raise ValueError('Current asset changed')
    dims,payload=read_volume(source)
    volume=np.frombuffer(bytes(payload),dtype=np.uint8).reshape(dims,order='F').copy()
    audit=apply_approved_callosal_followup_patch(volume,ROOT/'segmentation-patches/review/callosum-cortical-followup-project-review-2026-09-06.json')
    raw=volume.tobytes(order='F');encoded=gzip.compress(b'BBS1'+struct.pack('<3H',*dims)+raw,compresslevel=9,mtime=0)
    if hashlib.sha256(encoded).hexdigest()!=NEW_SHA or hashlib.sha256(raw).hexdigest()!=NEW_RAW_SHA:raise ValueError('Reviewed staging does not match')
    metadata=json.loads(metadata_path.read_text(encoding='utf-8'))
    if metadata['labelCounts']['30'] not in (149775,148179):raise ValueError('Metadata count changed')
    metadata['labelCounts']['30']=148179
    metadata['callosalFollowupPatchAudit']=audit
    metadata['reviewedPatchAudits']=[metadata[key] for key in ('reviewedPatchAudit','ventriclePatchAudit','ventricleClassificationPatchAudit','callosalLocalPatchAudit','callosalFollowupPatchAudit')]
    metadata['preCallosalFollowupCompressedSha256']=CALLOSUM_FOLLOWUP_SOURCE_SHA256
    metadata['rawVoxelSha256']=NEW_RAW_SHA
    metadata['teachingPolicy']=metadata['teachingPolicy'].replace('after the local 1605-voxel exclusion','after the local 1605-voxel and additional 1596-voxel exclusions')
    serialized=json.dumps(metadata,ensure_ascii=False,indent=2)+'\n'
    target.write_bytes(encoded);metadata_path.write_text(serialized,encoding='utf-8')
    print(json.dumps(dict(compressedSha256=NEW_SHA,rawVoxelSha256=NEW_RAW_SHA,label30=148179,deployment=False)))


if __name__=='__main__':main()
