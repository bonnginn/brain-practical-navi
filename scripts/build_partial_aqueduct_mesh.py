"""Reproduce a partial ID41 selection mesh without modifying legacy group assets."""
import argparse
import gzip
import hashlib
import json
import numpy as np
from build_section_ventricle_meshes import ROOT,ATLAS,SOURCE,reconstruct,DISPLAY_ORIGIN_ZYX

LABEL_SHA='cb0e727292c6d677e26063a506b07dee793a7b5058f6bf8fb820d0dfbc106c74'
ADOPTION='segmentation-patches/review/aqueduct-fourth44-adoption-2026-09-16.json'
ADOPTION_SHA='5387ecdc0ad9a52fca7dbe4c95cce3c5ae25621a95959a846da24ecf186034f4'
NAME='section-current-aqueduct-partial'
sha=lambda data:hashlib.sha256(data).hexdigest()


def build(compressed,adoption):
    if sha(compressed)!=LABEL_SHA or sha(adoption)!=ADOPTION_SHA:raise ValueError('Reviewed inputs changed')
    raw=gzip.decompress(compressed)
    if raw[:10]!=b'BBS1'+np.array([394,466,378],dtype='<u2').tobytes():raise ValueError('Unexpected geometry')
    labels=np.frombuffer(raw,np.uint8,offset=10).reshape((378,466,394))
    mesh,info=reconstruct(labels==41)
    if info['voxels']!=267 or info['components6']!=1:raise ValueError('Partial mask identity changed')
    if sha(mesh)!='13cc011f6507b9f3ad3ff830009c2c9150fbb3b52602c1f561e253c4a9765faa':
        raise ValueError('Unchanged aqueduct geometry differs after lower-midbrain repair')
    return mesh,dict(source=SOURCE.name,sourceSha256=LABEL_SHA,adoption=ADOPTION,adoptionSha256=ADOPTION_SHA,
        labelIds=[41],partialExtent=True,expertReviewed=False,sourceSamplingMm=.5,
        displayOriginZYX=DISPLAY_ORIGIN_ZYX.tolist(),method='marching cubes 0.5; no resampling, smoothing, filling or component removal',
        scope='BigBrain section selection only. Partial image-derived mask, not the separate schematic block aqueduct.',**info)


def main(apply=False):
    mesh,report=build(SOURCE.read_bytes(),(ROOT/ADOPTION).read_bytes())
    if apply:
        # The third-ventricle inferior exclusion preserves the 259-cell aqueduct geometry.
        outputs={ATLAS/(NAME+'.mesh'):mesh,ATLAS/(NAME+'.json'):(json.dumps(report,indent=2)+'\n').encode()}
        prior={'.mesh':'22b992bfa93ec644aaf29d7644aebe12b50513b27c877941c70c65e641a4eeef',
               '.json':'0a41cc5e785ef082c92ad65e359db4b0f4b25983447cf3fb321e0332f7dc9320'}
        retained={}
        for path,data in outputs.items():
            if path.exists() and path.read_bytes()!=data:
                old=path.read_bytes()
                if sha(old)!=prior[path.suffix]:raise ValueError('Existing partial asset differs')
                fixture=ROOT/'tests/fixtures'/(NAME+'-pre-third-inferior-current16'+path.suffix)
                if fixture.exists() and fixture.read_bytes()!=old:raise ValueError('Retained partial evidence differs')
                retained[fixture]=old
        for path,data in retained.items():path.write_bytes(data)
        for path,data in outputs.items():path.write_bytes(data)
    print(json.dumps(dict(applied=apply,**report)))


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--apply',action='store_true');main(parser.parse_args().apply)
