"""Reproduce a partial ID41 selection mesh without modifying legacy group assets."""
import argparse
import gzip
import hashlib
import json
import numpy as np
from build_section_ventricle_meshes import ROOT,ATLAS,SOURCE,reconstruct,DISPLAY_ORIGIN_ZYX

LABEL_SHA='a21cb6ab8aa7080b6e26766c2f82834871d3e72c174b72d0b018733ee5ef278a'
ADOPTION='segmentation-patches/review/aqueduct-core179-adoption-2026-09-08.json'
ADOPTION_SHA='4ba89544a86ec75b180e1901444c5c3bb34043a738b64b7a2cfc30c2830f9a78'
NAME='section-current-aqueduct-partial'
sha=lambda data:hashlib.sha256(data).hexdigest()


def build(compressed,adoption):
    if sha(compressed)!=LABEL_SHA or sha(adoption)!=ADOPTION_SHA:raise ValueError('Reviewed inputs changed')
    raw=gzip.decompress(compressed)
    if raw[:10]!=b'BBS1'+np.array([394,466,378],dtype='<u2').tobytes():raise ValueError('Unexpected geometry')
    labels=np.frombuffer(raw,np.uint8,offset=10).reshape((378,466,394))
    mesh,info=reconstruct(labels==41)
    if info['voxels']!=195 or info['components6']!=1:raise ValueError('Partial mask identity changed')
    return mesh,dict(source=SOURCE.name,sourceSha256=LABEL_SHA,adoption=ADOPTION,adoptionSha256=ADOPTION_SHA,
        labelIds=[41],partialExtent=True,expertReviewed=False,sourceSamplingMm=.5,
        displayOriginZYX=DISPLAY_ORIGIN_ZYX.tolist(),method='marching cubes 0.5; no resampling, smoothing, filling or component removal',
        scope='BigBrain section selection only. Partial image-derived mask, not the separate schematic block aqueduct.',**info)


def main(apply=False):
    mesh,report=build(SOURCE.read_bytes(),(ROOT/ADOPTION).read_bytes())
    if apply:
        # This is a named new asset; never replace an unrelated existing mesh.
        outputs={ATLAS/(NAME+'.mesh'):mesh,ATLAS/(NAME+'.json'):(json.dumps(report,indent=2)+'\n').encode()}
        for path,data in outputs.items():
            if path.exists() and path.read_bytes()!=data:raise ValueError('Existing partial asset differs')
        for path,data in outputs.items():path.write_bytes(data)
    print(json.dumps(dict(applied=apply,**report)))


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--apply',action='store_true');main(parser.parse_args().apply)
