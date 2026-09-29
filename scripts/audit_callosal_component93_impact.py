"""Read-only section mesh and specimen-mask impact of staged callosal C93."""

import gzip
import hashlib
import json
import struct

import numpy as np

import build_specimen_blocks as blocks
from build_section_ventricle_meshes import reconstruct
from stage_callosal_cortical_component93 import ROOT, STAGE


sha = lambda data: hashlib.sha256(data).hexdigest()


def labels(path):
    raw = gzip.decompress(path.read_bytes())
    if raw[:4] != b"BBS1":
        raise ValueError("Unexpected label format")
    return np.frombuffer(raw, np.uint8, offset=10).reshape(struct.unpack_from("<3H", raw, 4), order="F")


def main():
    record = json.loads((STAGE / "repair.json").read_text(encoding="utf-8"))
    before, after = labels(STAGE / "before.bin.gz"), labels(STAGE / "labels.bin.gz")
    if sha((STAGE / "before.bin.gz").read_bytes()) != record["beforeSha256"] or sha((STAGE / "labels.bin.gz").read_bytes()) != record["afterSha256"]:
        raise ValueError("Stage changed")
    old_mesh, old_info = reconstruct((before == 30).transpose(2, 1, 0))
    new_mesh, new_info = reconstruct((after == 30).transpose(2, 1, 0))
    installed = ROOT / "public/atlas/section-current-corpus-callosum.mesh"
    if gzip.decompress(installed.read_bytes()) != old_mesh:
        raise ValueError("Installed callosal mesh does not reproduce")
    raw, _ = blocks.read_volume(blocks.BIGBRAIN, b"BBV1")
    values = raw[::2, ::2, ::2]
    old_defs = blocks.specimen_definitions(values, before.transpose(2, 1, 0)[::2, ::2, ::2])
    new_defs = blocks.specimen_definitions(values, after.transpose(2, 1, 0)[::2, ::2, ::2])
    mask_changes = []
    for specimen, parts in old_defs.items():
        for old in parts:
            new = next(part for part in new_defs[specimen] if part.key == old.key)
            changed = int(np.count_nonzero(old.mask != new.mask))
            if changed:
                mask_changes.append({"specimen": specimen, "part": old.key, "changed": changed,
                                     "added": int(np.count_nonzero(~old.mask & new.mask)),
                                     "removed": int(np.count_nonzero(old.mask & ~new.mask))})
    outcome = {"sourceSha256": record["beforeSha256"], "candidateSha256": record["afterSha256"],
               "sectionMeshBefore": old_info, "sectionMeshAfter": new_info,
               "newSectionMeshRawSha256": sha(new_mesh), "newSectionMeshStoredSha256": sha(blocks.deterministic_gzip(new_mesh)),
               "blockMaskChanges": mask_changes, "changedBlockParts": len(mask_changes),
               "mutation": False}
    (STAGE / "impact.json").write_text(json.dumps(outcome, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"sectionVoxels": [old_info["voxels"], new_info["voxels"]],
                      "sectionComponents6": [old_info["components6"], new_info["components6"]],
                      "blockMaskChanges": mask_changes}))


if __name__ == "__main__":
    main()
