"""Reproduce a partial ID41 selection mesh without modifying legacy group assets."""
import argparse
import gzip
import hashlib
import json
import numpy as np
from build_section_ventricle_meshes import ROOT,ATLAS,SOURCE,reconstruct,DISPLAY_ORIGIN_ZYX

LABEL_SHA='63ac0815f7631e35029b9811485593e1bf0f2121cfe362366af74d1664f2dea8'
ADOPTION='segmentation-patches/review/posterior-ventricles158-adoption-2026-09-08.json'
ADOPTION_SHA='f45703a468358528c46b80dfc83d7c1bfaaa3b29079e842d0c45fab82df7c2ec'
NAME='section-current-aqueduct-partial'
sha=lambda data:hashlib.sha256(data).hexdigest()


def build(compressed,adoption):
    if sha(compressed)!=LABEL_SHA or sha(adoption)!=ADOPTION_SHA:raise ValueError('Reviewed inputs changed')
    raw=gzip.decompress(compressed)
    if raw[:10]!=b'BBS1'+np.array([394,466,378],dtype='<u2').tobytes():raise ValueError('Unexpected geometry')
    labels=np.frombuffer(raw,np.uint8,offset=10).reshape((378,466,394))
    mesh,info=reconstruct(labels==41)
    if info['voxels']!=259 or info['components6']!=1:raise ValueError('Partial mask identity changed')
    return mesh,dict(source=SOURCE.name,sourceSha256=LABEL_SHA,adoption=ADOPTION,adoptionSha256=ADOPTION_SHA,
        labelIds=[41],partialExtent=True,expertReviewed=False,sourceSamplingMm=.5,
        displayOriginZYX=DISPLAY_ORIGIN_ZYX.tolist(),method='marching cubes 0.5; no resampling, smoothing, filling or component removal',
        scope='BigBrain section selection only. Partial image-derived mask, not the separate schematic block aqueduct.',**info)


def main(apply=False):
    mesh,report=build(SOURCE.read_bytes(),(ROOT/ADOPTION).read_bytes())
    if apply:
        # Accept only the pinned previous 195-cell asset or exact new output.
        outputs={ATLAS/(NAME+'.mesh'):mesh,ATLAS/(NAME+'.json'):(json.dumps(report,indent=2)+'\n').encode()}
        prior={'.mesh':'2578d4aa1d8f720fc531c849f6ce6d0e8fa8bf83acea320d1929a753889ac407',
               '.json':'b84905d2c0132502fd1f32cc9cd383d393c31222e148056ea8d4e5638311fa33'}
        retained={}
        for path,data in outputs.items():
            if path.exists() and path.read_bytes()!=data:
                old=path.read_bytes()
                if sha(old)!=prior[path.suffix]:raise ValueError('Existing partial asset differs')
                fixture=ROOT/'tests/fixtures'/(NAME+'-pre-posterior-ventricles158'+path.suffix)
                if fixture.exists() and fixture.read_bytes()!=old:raise ValueError('Retained partial evidence differs')
                retained[fixture]=old
        for path,data in retained.items():path.write_bytes(data)
        for path,data in outputs.items():path.write_bytes(data)
    print(json.dumps(dict(applied=apply,**report)))


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--apply',action='store_true');main(parser.parse_args().apply)
