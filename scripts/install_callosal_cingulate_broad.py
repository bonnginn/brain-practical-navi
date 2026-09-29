"""Preflight and install the image-reviewed broad ID30 cingulate correction."""
import argparse
import gzip
import hashlib
import json
import struct

import numpy as np

import build_specimen_blocks as blocks
from build_section_ventricle_meshes import reconstruct
from prepare_callosal_cingulate_broad import ROOT, SOURCE, SOURCE_SHA, STAGE

ATLAS=ROOT/"public/atlas"
INDEX=ROOT/"segmentation-patches/review/callosal-cingulate-broad-2026-09-30.indices.bin.gz"
RECORD=ROOT/"segmentation-patches/review/callosal-cingulate-broad-adoption-2026-09-30.json"
sha=lambda data:hashlib.sha256(data).hexdigest()
encode=lambda data:(json.dumps(data,ensure_ascii=False,indent=2)+"\n").encode("utf-8")

def labels(data):
    raw=gzip.decompress(data)
    if raw[:4]!=b"BBS1": raise ValueError("Unexpected label volume")
    return np.frombuffer(raw,np.uint8,offset=10).reshape(struct.unpack_from("<3H",raw,4),order="F")

def ranges(mask):
    result={}
    for plane,axes in (("sagittal",(1,2)),("coronal",(0,2)),("horizontal",(0,1))):
        counts=mask.sum(axis=axes)
        present=np.flatnonzero(counts)
        groups=np.split(present,np.flatnonzero(np.diff(present)>1)+1)
        result[plane]=[[int(g[0]),int(g[-1]),int(g[np.argmax(counts[g])])] for g in groups if g.size]
    return result

def plan():
    proposal=json.loads((STAGE/"repair.json").read_text(encoding="utf-8"))
    before_bytes=(STAGE/"before.bin.gz").read_bytes()
    after_bytes=(STAGE/"labels.bin.gz").read_bytes()
    if (sha(before_bytes)!=SOURCE_SHA or SOURCE.read_bytes()!=before_bytes or
            sha(after_bytes)!=proposal["afterSha256"] or proposal["count"]!=48395):
        raise ValueError("Source or staged correction changed")
    before,after=labels(before_bytes),labels(after_bytes)
    raw_before=gzip.decompress(before_bytes)
    raw_after=gzip.decompress(after_bytes)
    if sha(raw_after[10:])!=proposal["rawVoxelSha256"]:
        raise ValueError("Staged raw labels changed")
    old_raw_sha=sha(raw_before[10:])
    index_bytes=(STAGE/"indices.bin.gz").read_bytes()
    indices=np.frombuffer(gzip.decompress(index_bytes),dtype="<u4")
    if sha(indices.tobytes())!=proposal["indexSha256"] or len(indices)!=48395 or not np.all(np.diff(indices)>0):
        raise ValueError("Index identity changed")
    old_flat=before.ravel(order="F")
    new_flat=after.ravel(order="F")
    if not np.all(old_flat[indices]==30) or not np.all(new_flat[indices]==0):
        raise ValueError("Wrong source transitions")
    changed=np.flatnonzero(old_flat!=new_flat)
    if not np.array_equal(changed,indices):
        raise ValueError("Difference not exactly the reviewed indices")
    reverse=new_flat.copy()
    reverse[indices]=30
    if not np.array_equal(reverse,old_flat):
        raise ValueError("Reverse replay failed")
    for path,digest in proposal["reviewFigures"].items():
        if sha((ROOT/path).read_bytes())!=digest:
            raise ValueError(f"Review figure changed: {path}")

    writes=[]
    def add(path,data):
        if any(prior==path for prior,_ in writes):
            raise ValueError(f"Duplicate write: {path}")
        writes.append((path,data))
    add(INDEX,index_bytes)

    old_mesh,old_info=reconstruct((before==30).transpose(2,1,0))
    new_mesh,new_info=reconstruct((after==30).transpose(2,1,0))
    section=ATLAS/"section-current-corpus-callosum.mesh"
    if gzip.decompress(section.read_bytes())!=old_mesh:
        raise ValueError("Installed section mesh cannot reproduce")
    new_stored=blocks.deterministic_gzip(new_mesh)
    impact=json.loads((STAGE/"impact.json").read_text(encoding="utf-8"))
    if impact["sectionMeshBefore"]!=old_info or impact["sectionMeshAfter"]!=new_info or sha(new_stored)!=impact["newSectionMeshStoredSha256"]:
        raise ValueError("Section impact changed")
    add(section,new_stored)
    for path in sorted(ATLAS.glob("section-current-*.json")):
        meta=json.loads(path.read_text(encoding="utf-8"))
        if meta["sourceSha256"]!=SOURCE_SHA:
            raise ValueError(f"Section source changed: {path}")
        if "rawVoxelSha256" in meta:
            if meta["rawVoxelSha256"]!=old_raw_sha: raise ValueError(f"Section raw SHA changed: {path}")
            meta["rawVoxelSha256"]=proposal["rawVoxelSha256"]
        for name,entry in meta.get("meshes",{}).items():
            if name==section.stem:
                if entry["labelIds"]!=[30] or entry["voxels"]!=145429 or entry["sha256"]!=sha(section.read_bytes()):
                    raise ValueError("Callosal section metadata changed")
                entry.update(new_info,sha256=sha(new_stored),bytes=len(new_stored),rawSha256=sha(new_mesh),
                             labelVoxelCounts={"30":proposal["callosumAfter"]},reviewRecord=RECORD.relative_to(ROOT).as_posix())
            elif 30 in entry["labelIds"]:
                raise ValueError(f"Unexpected ID30 section mesh: {name}")
        meta["sourceSha256"]=proposal["afterSha256"]
        add(path,encode(meta))

    raw,_=blocks.read_volume(blocks.BIGBRAIN,b"BBV1")
    values=raw[::2,::2,::2]
    old_defs=blocks.specimen_definitions(values,before.transpose(2,1,0)[::2,::2,::2])
    new_defs=blocks.specimen_definitions(values,after.transpose(2,1,0)[::2,::2,::2])
    block_manifest=json.loads((ATLAS/"specimen-blocks.json").read_text(encoding="utf-8"))
    generated=STAGE/"block-reproduction"
    generated.mkdir(exist_ok=True)
    block_changes=[]
    for specimen,parts in old_defs.items():
        for old in parts:
            new=next(part for part in new_defs[specimen] if part.key==old.key)
            count=int(np.count_nonzero(old.mask!=new.mask))
            if not count: continue
            if (specimen,old.key) not in (("commissural-system","corpus-callosum"),("commissural-system","tissue")):
                raise ValueError(f"Unexpected block impact: {specimen}/{old.key}")
            entry=next(part for part in block_manifest["specimens"][specimen] if part["part"]==old.key)
            stem=entry["file"][:-5]
            blocks.write_mesh(stem,blocks.mesh_from_mask(old.mask,values,old.material=="specimen"),generated)
            old_stored=(generated/entry["file"]).read_bytes()
            if old_stored!=(ATLAS/entry["file"]).read_bytes() or sha(old_stored)!=entry["meshSha256"]:
                raise ValueError(f"Installed block cannot reproduce: {entry['file']}")
            new_entry=blocks.write_mesh(stem,blocks.mesh_from_mask(new.mask,values,new.material=="specimen"),generated)
            new_stored=(generated/entry["file"]).read_bytes()
            entry.update(new_entry,segmentationSourceSha256=proposal["afterSha256"],
                         repairReview="AI image-reviewed broad cingulate/cingulum overlabel exclusion; project-adopted, not expert reviewed.")
            add(ATLAS/entry["file"],new_stored)
            block_changes.append(dict(specimen=specimen,part=old.key,changed=count))
    expected=[dict(specimen=e["specimen"],part=e["part"],changed=e["changed"]) for e in impact["blockMaskChanges"]]
    if sorted(block_changes,key=str)!=sorted(expected,key=str):
        raise ValueError("Block impact differs from audit")
    add(ATLAS/"specimen-blocks.json",encode(block_manifest))

    teaching=json.loads((ROOT/"app/teachingSpecimens.json").read_text(encoding="utf-8"))
    if teaching["sourceLabelSha256"]!=SOURCE_SHA:
        raise ValueError("Teaching source changed")
    after_teaching=json.loads((STAGE/"teaching-after/teaching-specimens.json").read_text(encoding="utf-8"))
    before_teaching=json.loads((STAGE/"teaching-before/teaching-specimens.json").read_text(encoding="utf-8"))
    if after_teaching["sourceLabelSha256"]!=proposal["afterSha256"] or before_teaching["sourceLabelSha256"]!=SOURCE_SHA:
        raise ValueError("Staged teaching source changed")
    current_parts=teaching["specimens"]["commissural-system"]["parts"]
    old_parts={p["key"]:p for p in before_teaching["specimens"]["commissural-system"]["parts"]}
    new_parts={p["key"]:p for p in after_teaching["specimens"]["commissural-system"]["parts"]}
    teaching_changes=[]
    for part in current_parts:
        name=part["file"]
        old_data=(STAGE/"teaching-before"/name).read_bytes()
        new_data=(STAGE/"teaching-after"/name).read_bytes()
        if old_data!=(ATLAS/name).read_bytes() or sha(old_data)!=part["meshSha256"] or old_parts[part["key"]]["meshSha256"]!=sha(old_data):
            raise ValueError(f"Installed teaching part changed: {name}")
        if old_data!=new_data:
            if part["key"] not in ("corpus-callosum","tissue"):
                raise ValueError(f"Unexpected teaching impact: {name}")
            for field in ("vertices","faces","shadeMin","shadeMax","meshSha256"):
                part[field]=new_parts[part["key"]][field]
            add(ATLAS/name,new_data)
            teaching_changes.append(part["key"])
    if sorted(teaching_changes)!=["corpus-callosum","tissue"]:
        raise ValueError("Missing teaching changes")
    teaching["sourceLabelSha256"]=proposal["afterSha256"]
    add(ROOT/"app/teachingSpecimens.json",encode(teaching))

    index_path=ROOT/"app/sectionLabelPresence.json"
    index=json.loads(index_path.read_text(encoding="utf-8"))
    if index["revision"]!=SOURCE_SHA or index["labels"]["30"]!=ranges(before==30):
        raise ValueError("Section presence baseline changed")
    index["revision"]=proposal["afterSha256"]
    index["labels"]["30"]=ranges(after==30)
    add(index_path,(json.dumps(index,ensure_ascii=False,separators=(",",":"))+"\n").encode("utf-8"))
    revision_path=ROOT/"app/segmentationLabelRevision.ts"
    revision=revision_path.read_text(encoding="utf-8")
    if revision.count(SOURCE_SHA)!=1: raise ValueError("App revision changed")
    add(revision_path,revision.replace(SOURCE_SHA,proposal["afterSha256"]).encode("utf-8"))

    validation_path=ATLAS/"bigbrain-practical-segmentation-icbm500-validation.json"
    validation=json.loads(validation_path.read_text(encoding="utf-8"))
    measurements=validation["currentImageMeasurements"]
    if (validation["rawVoxelSha256"]!=old_raw_sha or
            measurements["rawVoxelSha256"]!=old_raw_sha or measurements["sourceLabelSha256"]!=SOURCE_SHA or
            validation["labelCounts"]["30"]!=145429):
        raise ValueError("Validation baseline changed")
    validation["rawVoxelSha256"]=proposal["rawVoxelSha256"]
    validation["labelCounts"]["30"]=proposal["callosumAfter"]
    measurements["rawVoxelSha256"]=proposal["rawVoxelSha256"]
    measurements["sourceLabelSha256"]=proposal["afterSha256"]
    measurements["labelCounts"]["30"]=proposal["callosumAfter"]
    proposal.update(projectAdopted=True,published=False,status="AI-image-reviewed-project-adopted-development-only",
                    sectionMeshImpact={"before":old_info,"after":new_info},
                    blockMaskImpact=expected,teachingMeshChanges=teaching_changes)
    record_bytes=encode(proposal)
    validation["regionalBatchAudits"]["callosal-cingulate-broad"]={
        "record":RECORD.relative_to(ROOT).as_posix(),"recordSha256":sha(record_bytes),
        "changedVoxelCount":48395,"projectAdopted":True,"expertReviewed":False}
    add(RECORD,record_bytes)
    add(validation_path,encode(validation))
    add(SOURCE,after_bytes)
    return writes,dict(removed=48395,remaining=proposal["callosumAfter"],blocks=block_changes,teaching=teaching_changes,
                       newLabelSha256=proposal["afterSha256"])

if __name__=="__main__":
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply",action="store_true")
    args=parser.parse_args()
    writes,summary=plan()
    if args.apply:
        for path,data in writes:
            path.parent.mkdir(parents=True,exist_ok=True)
            path.write_bytes(data)
    print(json.dumps(dict(applied=args.apply,files=len(writes),**summary)))
