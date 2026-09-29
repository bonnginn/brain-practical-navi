"""Read-only mesh and specimen impact of the staged broad callosal correction."""
import gzip
import hashlib
import json
import struct

import numpy as np

import build_specimen_blocks as blocks
from build_section_ventricle_meshes import reconstruct
from prepare_callosal_cingulate_broad import ROOT, STAGE, SOURCE_SHA

sha=lambda data:hashlib.sha256(data).hexdigest()

def volume(path):
    raw=gzip.decompress(path.read_bytes())
    if raw[:4]!=b"BBS1": raise ValueError("Unexpected volume")
    return np.frombuffer(raw,np.uint8,offset=10).reshape(struct.unpack_from("<3H",raw,4),order="F")

def main():
    record=json.loads((STAGE/"repair.json").read_text(encoding="utf-8"))
    before_bytes=(STAGE/"before.bin.gz").read_bytes()
    after_bytes=(STAGE/"labels.bin.gz").read_bytes()
    if sha(before_bytes)!=SOURCE_SHA or sha(after_bytes)!=record["afterSha256"]:
        raise ValueError("Stage identity mismatch")
    before,after=volume(STAGE/"before.bin.gz"),volume(STAGE/"labels.bin.gz")
    old_mesh,old_info=reconstruct((before==30).transpose(2,1,0))
    new_mesh,new_info=reconstruct((after==30).transpose(2,1,0))
    installed=ROOT/"public/atlas/section-current-corpus-callosum.mesh"
    if gzip.decompress(installed.read_bytes())!=old_mesh:
        raise ValueError("Installed section callosum does not reproduce")
    raw,_=blocks.read_volume(blocks.BIGBRAIN,b"BBV1")
    values=raw[::2,::2,::2]
    old_defs=blocks.specimen_definitions(values,before.transpose(2,1,0)[::2,::2,::2])
    new_defs=blocks.specimen_definitions(values,after.transpose(2,1,0)[::2,::2,::2])
    changes=[]
    for specimen,parts in old_defs.items():
        for old in parts:
            new=next(part for part in new_defs[specimen] if part.key==old.key)
            changed=int(np.count_nonzero(old.mask!=new.mask))
            if changed:
                changes.append(dict(specimen=specimen,part=old.key,changed=changed,
                                    added=int(np.count_nonzero(~old.mask & new.mask)),
                                    removed=int(np.count_nonzero(old.mask & ~new.mask))))
    report=dict(sourceSha256=SOURCE_SHA,candidateSha256=record["afterSha256"],
                sectionMeshBefore=old_info,sectionMeshAfter=new_info,
                newSectionMeshRawSha256=sha(new_mesh),
                newSectionMeshStoredSha256=sha(blocks.deterministic_gzip(new_mesh)),
                blockMaskChanges=changes,mutation=False)
    (STAGE/"impact.json").write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps(dict(before=old_info["voxels"],after=new_info["voxels"],
                          components=[old_info["components6"],new_info["components6"]],
                          blockMaskChanges=changes)))

if __name__=="__main__": main()
