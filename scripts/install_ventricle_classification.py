"""Install the exact project-adopted classification asset into the dev tree.

No git or deployment actions. The original baseline fixture is mandatory.
"""
import gzip
import hashlib
import json
import struct
import numpy as np
from apply_segmentation_patch import read_volume
from build_bigbrain_practical_seg import ROOT,apply_approved_ventricle_classification_patch,AQUEDUCT_SOURCE_COMPRESSED_SHA256,PRACTICAL_LABELS

NEW_SHA='930eaaed7eed8782b1b162f3aa5c59c2428f4062d0d2da3a9a1cb563f49b7db7'
NEW_RAW_SHA='261beb616856653d4d7acd2d411a98f1435eb6beab8b91a2b8ac7b5642909d18'


def main():
    fixture=ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-classification-b75a.bin.gz'
    target=ROOT/'public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz'
    metadata_path=ROOT/'public/atlas/bigbrain-practical-segmentation-icbm500-validation.json'
    if hashlib.sha256(fixture.read_bytes()).hexdigest()!=AQUEDUCT_SOURCE_COMPRESSED_SHA256:
        raise ValueError('Original fixture changed')
    if hashlib.sha256(target.read_bytes()).hexdigest() not in (AQUEDUCT_SOURCE_COMPRESSED_SHA256,NEW_SHA):
        raise ValueError('Refusing to overwrite a different current label volume')
    dims,payload=read_volume(fixture)
    volume=np.frombuffer(bytes(payload),dtype=np.uint8).reshape(dims,order='F').copy()
    audit=apply_approved_ventricle_classification_patch(volume,ROOT/'segmentation-patches/review/ventricle-classification-project-review-2026-09-06.json')
    raw=volume.tobytes(order='F');data=gzip.compress(b'BBS1'+struct.pack('<3H',*dims)+raw,compresslevel=9,mtime=0)
    if hashlib.sha256(raw).hexdigest()!=NEW_RAW_SHA or hashlib.sha256(data).hexdigest()!=NEW_SHA:
        raise ValueError('Reconstructed output differs from reviewed staged artifact')
    metadata=json.loads(metadata_path.read_text(encoding='utf-8'))
    if metadata['labelCounts']['26'] not in (8567,8520):raise ValueError('Unexpected metadata baseline')
    metadata['labelCounts']['26']=8520;metadata['labelCounts']['41']=16
    metadata['labelNames']['41']=PRACTICAL_LABELS[41]
    metadata['imageGuidedCandidateIds']=[30,31,32,41]
    metadata['projectReviewedPartialIds']=[41]
    metadata['ventricleClassificationPatchAudit']=audit
    metadata['reviewedPatchAudits']=[metadata['reviewedPatchAudit'],metadata['ventriclePatchAudit'],audit]
    metadata['preClassificationCompressedSha256']=AQUEDUCT_SOURCE_COMPRESSED_SHA256
    metadata['rawVoxelSha256']=NEW_RAW_SHA
    metadata['teachingPolicy']+=' ID41 is only a partial aqueduct candidate; the 47-voxel classification correction is AI-assisted project adoption under PR #27, not expert review.' if 'ID41 is only' not in metadata['teachingPolicy'] else ''
    # Write only after all identities and generated results have been checked.
    target.write_bytes(data)
    metadata_path.write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(dict(compressedSha256=NEW_SHA,rawVoxelSha256=NEW_RAW_SHA,counts={'26':8520,'41':16},deployment=False)))


if __name__=='__main__':main()
