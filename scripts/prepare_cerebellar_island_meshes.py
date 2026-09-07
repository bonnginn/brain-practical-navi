"""Stage two affected hindbrain parts, requiring exact reproduction of current meshes."""
import argparse,json,struct
from pathlib import Path
import numpy as np
import build_specimen_blocks as b
from install_brainstem_three_repair import ROOT,FINAL_SHA,sha
TARGET=ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-cerebellar-islands-8238.bin.gz'
from build_orthogonal_review_bundle import EXPECTED_IMAGE_SHA256
STAGED_SHA='2a73ff567741aa9b7965eef645765bfc0d87b3cad80d789d5512cabf4ffc2ed2'

def encode(mesh):
    v,n,s,f=mesh
    return b'BNM2'+struct.pack('<II',len(v),len(f))+v.tobytes()+n.tobytes()+s.tobytes()+f.tobytes()

def main(staged,out):
    out=out.resolve()
    if out.exists() or not out.is_relative_to(ROOT/'work'):raise ValueError('New work output only')
    if sha(TARGET.read_bytes())!=FINAL_SHA or sha(staged.read_bytes())!=STAGED_SHA or sha(b.BIGBRAIN.read_bytes())!=EXPECTED_IMAGE_SHA256:raise ValueError('Wrong source')
    raw,_=b.read_volume(b.BIGBRAIN,b'BBV1');raw=raw[::2,::2,::2]
    old,_=b.read_volume(TARGET,b'BBS1');old=old[::2,::2,::2]
    new,_=b.read_volume(staged,b'BBS1');new=new[::2,::2,::2]
    before=b.specimen_definitions(raw,old);after=b.specimen_definitions(raw,new)
    out.mkdir();entries=[]
    for block,parts in after.items():
        for prior,current in zip(before[block],parts):
            if prior.key!=current.key:raise ValueError('Part identity differs')
            if np.array_equal(prior.mask,current.mask):continue
            name=f'block-{block}-{current.key}.mesh'
            baseline=encode(b.mesh_from_mask(prior.mask,raw,prior.material=='specimen'))
            baseline_names={'block-hindbrain-pons-medulla.mesh':'block-hindbrain-pons-medulla-pre-cerebellar-bfa5.mesh','block-hindbrain-cerebellum.mesh':'block-hindbrain-cerebellum-pre-cerebellar-7f45.mesh'}
            installed=(ROOT/'tests/fixtures'/baseline_names[name]).read_bytes()
            if sha(baseline)!=sha(installed):raise ValueError('Cannot reproduce existing mesh: '+name)
            mesh=b.mesh_from_mask(current.mask,raw,current.material=='specimen');data=encode(mesh)
            (out/name).write_bytes(data)
            entries.append(dict(file=name,block=block,part=current.key,vertices=len(mesh[0]),faces=len(mesh[3]),
                beforeSha256=sha(installed),afterSha256=sha(data),beforeMatches=True,
                changedMaskVoxels=int(np.count_nonzero(prior.mask!=current.mask))))
    if {(e['block'],e['part']) for e in entries}!={('hindbrain','cerebellum'),('hindbrain','pons-medulla')}:raise ValueError('Unexpected affected parts')
    (out/'report.json').write_text(json.dumps(dict(inputLabelSha256=FINAL_SHA,outputLabelSha256=STAGED_SHA,meshes=entries),indent=2)+'\n',encoding='utf-8')
    print(json.dumps(entries,indent=2))

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--staged',type=Path,required=True);p.add_argument('--output',type=Path,required=True);args=p.parse_args();main(args.staged,args.output)
