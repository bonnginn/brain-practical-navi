"""Preflight and install the image-reviewed C93 callosal exclusion with its displays."""

import argparse
import gzip
import hashlib
import json
import struct
from pathlib import Path

import numpy as np

import build_specimen_blocks as blocks
from build_section_ventricle_meshes import reconstruct
from stage_callosal_cortical_component93 import ROOT, SOURCE, SOURCE_SHA, STAGE


ATLAS = ROOT / "public/atlas"
AFTER = "98868c413e45436756294f06a693e5dc51efd5c34e98335470fbb27bce204f9d"
RECORD = ROOT / "segmentation-patches/review/callosal-cortical-component93-adoption-2026-09-29.json"
sha = lambda data: hashlib.sha256(data).hexdigest()
encode = lambda data: (json.dumps(data, ensure_ascii=False, indent=2) + "\n").encode("utf-8")


def labels(payload):
    raw = gzip.decompress(payload)
    if raw[:4] != b"BBS1":
        raise ValueError("Unexpected label header")
    return np.frombuffer(raw, np.uint8, offset=10).reshape(struct.unpack_from("<3H", raw, 4), order="F")


def ranges(mask):
    result = {}
    for plane, axes in (("sagittal", (1, 2)), ("coronal", (0, 2)), ("horizontal", (0, 1))):
        counts = mask.sum(axis=axes)
        present = np.flatnonzero(counts)
        groups = np.split(present, np.flatnonzero(np.diff(present) > 1) + 1)
        result[plane] = [[int(group[0]), int(group[-1]), int(group[np.argmax(counts[group])])] for group in groups if group.size]
    return result


def plan():
    before_bytes = (STAGE / "before.bin.gz").read_bytes()
    after_bytes = (STAGE / "labels.bin.gz").read_bytes()
    record = json.loads((STAGE / "repair.json").read_text(encoding="utf-8"))
    impact = json.loads((STAGE / "impact.json").read_text(encoding="utf-8"))
    if sha(before_bytes) != SOURCE_SHA or sha(after_bytes) != AFTER or SOURCE.read_bytes() != before_bytes:
        raise ValueError("Source or staged label bytes changed")
    if record["beforeSha256"] != SOURCE_SHA or record["afterSha256"] != AFTER or record["count"] != 278:
        raise ValueError("Staged repair changed")
    before, after = labels(before_bytes), labels(after_bytes)
    replay = before.copy()
    reverse = after.copy()
    for point in record["points"]:
        xyz = tuple(point["xyz"])
        if point["before"] != 30 or point["after"] != 0 or before[xyz] != 30 or after[xyz] != 0:
            raise ValueError("Point delta mismatch")
        replay[xyz] = 0
        reverse[xyz] = 30
    if not np.array_equal(replay, after) or not np.array_equal(reverse, before):
        raise ValueError("Forward/reverse patch validation failed")
    if sha(after.tobytes(order="F")) != record["afterRawVoxelSha256"]:
        raise ValueError("Raw voxel digest changed")
    for path, digest in record["evidence"].items():
        if sha((ROOT / path).read_bytes()) != digest:
            raise ValueError(f"Review evidence changed: {path}")
    if impact["sourceSha256"] != SOURCE_SHA or impact["candidateSha256"] != AFTER or impact["changedBlockParts"] != 2:
        raise ValueError("Impact report changed")

    writes = []
    def add(path, content):
        if any(existing == path for existing, _ in writes):
            raise ValueError(f"Duplicate write: {path}")
        writes.append((path, content))

    # The exact 0.5 mm section mesh, not a smoothed or guessed tissue edge.
    old_mesh, old_info = reconstruct((before == 30).transpose(2, 1, 0))
    new_mesh, new_info = reconstruct((after == 30).transpose(2, 1, 0))
    section_path = ATLAS / "section-current-corpus-callosum.mesh"
    if gzip.decompress(section_path.read_bytes()) != old_mesh or old_info != impact["sectionMeshBefore"] or new_info != impact["sectionMeshAfter"]:
        raise ValueError("Section mesh cannot be reproduced")
    stored_mesh = blocks.deterministic_gzip(new_mesh)
    if sha(stored_mesh) != impact["newSectionMeshStoredSha256"]:
        raise ValueError("New section mesh changed")
    add(section_path, stored_mesh)
    for path in sorted(ATLAS.glob("section-current-*.json")):
        metadata = json.loads(path.read_text(encoding="utf-8"))
        if metadata["sourceSha256"] != SOURCE_SHA:
            raise ValueError(f"Section source differs: {path}")
        for name, entry in metadata.get("meshes", {path.stem: metadata}).items():
            mesh_path = ATLAS / (name + ".mesh")
            if sha(mesh_path.read_bytes()) != entry["sha256"]:
                raise ValueError(f"Installed section mesh differs: {name}")
            if name == "section-current-corpus-callosum":
                if entry["labelIds"] != [30] or entry["voxels"] != old_info["voxels"]:
                    raise ValueError("Callosal metadata differs")
                entry.update(new_info, sha256=sha(stored_mesh), bytes=len(stored_mesh),
                             rawSha256=sha(new_mesh), labelVoxelCounts={"30": record["countsAfter"]["30"]},
                             reviewRecord=RECORD.relative_to(ROOT).as_posix())
            elif 30 in entry["labelIds"]:
                raise ValueError(f"Unexpected other ID30 mesh: {name}")
        metadata["sourceSha256"] = AFTER
        if "rawVoxelSha256" in metadata:
            metadata["rawVoxelSha256"] = record["afterRawVoxelSha256"]
        add(path, encode(metadata))

    # The 1 mm specimen has only two changed masks. Reproduce old bytes first.
    raw, _ = blocks.read_volume(blocks.BIGBRAIN, b"BBV1")
    values = raw[::2, ::2, ::2]
    old_defs = blocks.specimen_definitions(values, before.transpose(2, 1, 0)[::2, ::2, ::2])
    new_defs = blocks.specimen_definitions(values, after.transpose(2, 1, 0)[::2, ::2, ::2])
    block_manifest = json.loads((ATLAS / "specimen-blocks.json").read_text(encoding="utf-8"))
    generated = STAGE / "block-reproduction"
    generated.mkdir(exist_ok=True)
    changed = []
    mesh_impact = []
    for block, parts in old_defs.items():
        for old in parts:
            new = next(part for part in new_defs[block] if part.key == old.key)
            changed_count = int(np.count_nonzero(old.mask != new.mask))
            if not changed_count:
                continue
            if (block, old.key) not in (("commissural-system", "corpus-callosum"), ("commissural-system", "tissue")):
                raise ValueError(f"Unexpected changed block: {block}/{old.key}")
            prior = next(part for part in block_manifest["specimens"][block] if part["part"] == old.key)
            stem = prior["file"][:-5]
            blocks.write_mesh(stem, blocks.mesh_from_mask(old.mask, values, old.material == "specimen"), generated)
            old_bytes = (generated / prior["file"]).read_bytes()
            if old_bytes != (ATLAS / prior["file"]).read_bytes():
                raise ValueError(f"Installed block cannot be reproduced: {stem}")
            new_info = blocks.write_mesh(stem, blocks.mesh_from_mask(new.mask, values, new.material == "specimen"), generated)
            new_bytes = (generated / prior["file"]).read_bytes()
            fixture = ROOT / f"tests/fixtures/{stem}-pre-callosal-cortical-component93.mesh"
            if fixture.exists() and fixture.read_bytes() != old_bytes:
                raise ValueError(f"Prior block fixture changed: {fixture}")
            add(fixture, old_bytes)
            prior.update(new_info, segmentationSourceSha256=AFTER,
                         repairReview="AI-image-reviewed cortical overlabel exclusion; development only, not expert review.")
            add(ATLAS / prior["file"], new_bytes)
            changed.append((block, old.key, changed_count))
            mesh_impact.append({"block": block, "part": old.key, "file": prior["file"],
                                "changedMaskVoxels": changed_count,
                                "added": int(np.count_nonzero(new.mask & ~old.mask)),
                                "removed": int(np.count_nonzero(old.mask & ~new.mask)),
                                "beforeSha256": sha(old_bytes), "afterSha256": sha(new_bytes),
                                "reproducedBeforeSha256": sha(old_bytes), "beforeMatches": True})
    if sorted(changed) != sorted((row["specimen"], row["part"], row["changed"]) for row in impact["blockMaskChanges"]):
        raise ValueError("Block impact differs from read-only audit")
    add(ATLAS / "specimen-blocks.json", encode(block_manifest))

    # Reconstructed exposed tissue and callosal colours; all other teaching meshes remain byte-identical.
    teaching = json.loads((ROOT / "app/teachingSpecimens.json").read_text(encoding="utf-8"))
    if teaching["sourceLabelSha256"] != SOURCE_SHA:
        raise ValueError("Teaching source differs")
    before_dir = STAGE / "teaching-before-reproduction"
    after_dir = STAGE / "teaching-after-reproduction"
    before_report = json.loads((before_dir / "teaching-specimens.json").read_text(encoding="utf-8"))
    after_report = json.loads((after_dir / "teaching-specimens.json").read_text(encoding="utf-8"))
    if before_report["sourceLabelSha256"] != SOURCE_SHA or after_report["sourceLabelSha256"] != AFTER:
        raise ValueError("Teaching reproduction source differs")
    teaching_changed = []
    for block, specimen in teaching["specimens"].items():
        if block != "commissural-system":
            for part in specimen["parts"]:
                if 30 in part.get("sourceLabelIds", []) or sha((ATLAS / part["file"]).read_bytes()) != part["meshSha256"]:
                    raise ValueError(f"Other teaching block needs review: {block}/{part['key']}")
            continue
        original = {part["key"]: part for part in before_report["specimens"][block]["parts"]}
        candidate = {part["key"]: part for part in after_report["specimens"][block]["parts"]}
        for part in specimen["parts"]:
            name = part["file"]
            old_bytes = (before_dir / name).read_bytes()
            new_bytes = (after_dir / name).read_bytes()
            if old_bytes != (ATLAS / name).read_bytes() or sha(old_bytes) != part["meshSha256"] or original[part["key"]]["meshSha256"] != sha(old_bytes):
                raise ValueError(f"Teaching mesh cannot be reproduced: {name}")
            if sha(new_bytes) != candidate[part["key"]]["meshSha256"]:
                raise ValueError(f"Teaching candidate metadata differs: {name}")
            if old_bytes != new_bytes:
                if (block, part["key"]) not in (("commissural-system", "corpus-callosum"), ("commissural-system", "tissue")):
                    raise ValueError(f"Unexpected teaching change: {name}")
                for field in ("vertices", "faces", "shadeMin", "shadeMax", "meshSha256"):
                    part[field] = candidate[part["key"]][field]
                add(ATLAS / name, new_bytes)
                teaching_changed.append((block, part["key"]))
    if sorted(teaching_changed) != [("commissural-system", "corpus-callosum"), ("commissural-system", "tissue")]:
        raise ValueError("Expected teaching surface changes missing")
    teaching["sourceLabelSha256"] = AFTER
    add(ROOT / "app/teachingSpecimens.json", encode(teaching))

    index_path = ROOT / "app/sectionLabelPresence.json"
    index = json.loads(index_path.read_text(encoding="utf-8"))
    if index["revision"] != SOURCE_SHA or index["dims"] != list(before.shape) or index["labels"]["30"] != ranges(before == 30):
        raise ValueError("Section presence baseline differs")
    index["revision"] = AFTER
    index["labels"]["30"] = ranges(after == 30)
    add(index_path, (json.dumps(index, ensure_ascii=False, separators=(",", ":")) + "\n").encode("utf-8"))

    revision_path = ROOT / "app/segmentationLabelRevision.ts"
    revision = revision_path.read_text(encoding="utf-8")
    if revision.count(SOURCE_SHA) != 1:
        raise ValueError("Application revision differs")
    add(revision_path, revision.replace(SOURCE_SHA, AFTER).encode("utf-8"))

    ventricular_before = json.loads((ATLAS / "section-current-ventricles.json").read_text(encoding="utf-8"))
    if ventricular_before["sourceSha256"] != SOURCE_SHA:
        raise ValueError("Historical section lineage differs")
    ventricular_after = {**ventricular_before, "sourceSha256": AFTER,
                         "rawVoxelSha256": record["afterRawVoxelSha256"]}
    record.update(projectAdopted=True, expertReviewed=False, published=False,
                  status="AI-image-reviewed-project-adopted-development-only",
                  decision="Exclude 278 C93 points from the corpus-callosum label: all 38 occupied and adjacent orthogonal planes show the candidate following folded cortical tissue above the main callosal white band. Tissue remains visible in the raw image; this is not a tissue deletion or expert-confirmed border.",
                  sectionMeshImpact={"before": ventricular_before, "after": ventricular_after},
                  callosalSectionMeshImpact={"before": old_info, "after": impact["sectionMeshAfter"]},
                  meshImpact={"blockMaskImpact": mesh_impact}, teachingMeshChanges=teaching_changed)
    record_bytes = encode(record)
    if RECORD.exists() and RECORD.read_bytes() != record_bytes:
        raise ValueError("Existing adoption record differs")
    add(RECORD, record_bytes)

    validation_path = ATLAS / "bigbrain-practical-segmentation-icbm500-validation.json"
    validation = json.loads(validation_path.read_text(encoding="utf-8"))
    if validation["rawVoxelSha256"] != record["beforeRawVoxelSha256"] or validation["currentImageMeasurements"]["sourceLabelSha256"] != SOURCE_SHA:
        raise ValueError("Validation baseline differs")
    validation["rawVoxelSha256"] = record["afterRawVoxelSha256"]
    validation["labelCounts"].update(record["countsAfter"])
    measurements = validation["currentImageMeasurements"]
    measurements.update(sourceLabelSha256=AFTER, rawVoxelSha256=record["afterRawVoxelSha256"])
    measurements["labelCounts"].update(record["countsAfter"])
    validation["regionalBatchAudits"]["callosal-cortical-component93"] = {
        "record": RECORD.relative_to(ROOT).as_posix(), "recordSha256": sha(record_bytes),
        "changedVoxelCount": 278, "projectAdopted": True, "expertReviewed": False,
    }
    add(validation_path, encode(validation))
    add(SOURCE, after_bytes)
    return writes, {"changedVoxels": 278, "changedBlocks": changed, "changedTeachingParts": teaching_changed}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    writes, summary = plan()
    if args.apply:
        for path, data in writes:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data)
    print(json.dumps({"applied": args.apply, "files": len(writes), **summary}))
