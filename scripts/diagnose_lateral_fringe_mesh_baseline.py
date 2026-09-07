"""Identify historical lateral-ventricle mesh drift independently of new repair."""
import gzip
import json
import struct
import subprocess
import numpy as np
import build_specimen_blocks as blocks
from prepare_cerebellar_island_meshes import encode
from stage_third_ventricle_core_repair import ROOT, WORK, digest


def main():
    out=WORK/'lateral-fringe-mesh-baseline-v1.json'
    if out.exists():raise ValueError('Preserve evidence')
    commit=subprocess.check_output(['git','rev-parse','a6b2809'],cwd=ROOT,text=True).strip()
    data=subprocess.check_output(['git','show',f'{commit}:public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz'],cwd=ROOT)
    decoded=gzip.decompress(data)
    if decoded[:4]!=b'BBS1':raise ValueError('Wrong historical source')
    dims=struct.unpack('<3H',decoded[4:10])
    historical=np.frombuffer(decoded,dtype=np.uint8,offset=10).reshape(dims[::-1])[::2,::2,::2]
    current,_=blocks.read_volume(WORK/'lateral-fringe-stage-v1/base.bin.gz',b'BBS1')
    raw,_=blocks.read_volume(blocks.BIGBRAIN,b'BBV1');raw=raw[::2,::2,::2]
    previous=blocks.specimen_definitions(raw,historical)
    now=blocks.specimen_definitions(raw,current[::2,::2,::2]);results=[]
    for block,key in [('lateral-ventricle','ventricular-cavity'),('commissural-system','lateral-ventricles'),('choroid-plexus','ventricular-cavity')]:
        old=next(p for p in previous[block] if p.key==key);new=next(p for p in now[block] if p.key==key)
        name=f'block-{block}-{key}.mesh';installed=(ROOT/'public/atlas'/name).read_bytes()
        reproduced=encode(blocks.mesh_from_mask(old.mask,raw,False))
        points=np.argwhere(old.mask!=new.mask)
        results.append(dict(file=name,installedSha256=digest(installed),historicalReproducedSha256=digest(reproduced),historicalReproducesInstalled=reproduced==installed,
            changes=[dict(coarseZYX=p.tolist(),appXYZ=(p[::-1]*2).tolist(),before=bool(old.mask[tuple(p)]),after=bool(new.mask[tuple(p)])) for p in points]))
    record=dict(sourceCommit=commit,historicalVolumeSha256=digest(data),results=results,mutation=False)
    out.write_text(json.dumps(record,indent=2)+'\n',encoding='utf-8');print(json.dumps(record,indent=2))


if __name__=='__main__':main()
