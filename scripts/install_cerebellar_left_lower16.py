"""Install the image-reviewed left lower cerebellar exterior removal after preflight."""

import argparse
import gzip
import hashlib
import json
import struct
from pathlib import Path

import numpy as np

import build_specimen_blocks as blocks
from build_section_ventricle_meshes import reconstruct
from prepare_cerebellar_left_lower16 import ROOT, STAGE


ATLAS = ROOT / "public/atlas"
SOURCE = ATLAS / "bigbrain-practical-segmentation-icbm500.bin.gz"
RECORD = ROOT / "segmentation-patches/review/cerebellar-left-lower16-adoption-2026-09-29.json"
sha = lambda data: hashlib.sha256(data).hexdigest()
encode = lambda data: (json.dumps(data, ensure_ascii=False, indent=2) + "\n").encode()


def read_labels(compressed):
    raw = gzip.decompress(compressed)
    if raw[:4] != b"BBS1":
        raise ValueError("unexpected label format")
    return np.frombuffer(raw, np.uint8, offset=10).reshape(struct.unpack_from("<3H", raw, 4), order="F")


def plan():
    record = json.loads((STAGE / "repair.json").read_text(encoding="utf-8"))
    before_bytes, after_bytes = (STAGE / "before.bin.gz").read_bytes(), (STAGE / "labels.bin.gz").read_bytes()
    base, after_sha = record["beforeSha256"], record["afterSha256"]
    if sha(before_bytes) != base or SOURCE.read_bytes() != before_bytes or sha(after_bytes) != after_sha:
        raise ValueError("current labels or staged output differ")
    before, after = read_labels(before_bytes), read_labels(after_bytes)
    if sha(before.tobytes(order="F")) != record["beforeRawVoxelSha256"] or sha(after.tobytes(order="F")) != record["afterRawVoxelSha256"]:
        raise ValueError("raw label digest differs")
    forward, reverse = before.copy(), after.copy()
    seen = set()
    for edit in record["points"]:
        point = tuple(edit["xyz"])
        if point in seen or edit["before"] != 28 or edit["after"] != 0 or before[point] != 28 or after[point] != 0:
            raise ValueError("invalid or repeated voxel edit")
        seen.add(point)
        forward[point] = 0
        reverse[point] = 28
    if len(seen) != 16 or not np.array_equal(forward, after) or not np.array_equal(reverse, before):
        raise ValueError("forward/reverse replay failed")
    for relative, digest in record["evidence"].items():
        if sha((ROOT / relative).read_bytes()) != digest:
            raise ValueError(f"review figure changed: {relative}")
    if int((before == 28).sum()) != record["countsBefore"]["28"] or int((after == 28).sum()) != record["countsAfter"]["28"]:
        raise ValueError("cerebellar count differs")

    writes = []
    stem = "section-current-cerebellum"
    old_mesh, old_info = reconstruct(np.isin(before, (28, 29)).transpose(2, 1, 0))
    new_mesh, new_info = reconstruct(np.isin(after, (28, 29)).transpose(2, 1, 0))
    if gzip.decompress((ATLAS / f"{stem}.mesh").read_bytes()) != old_mesh:
        raise ValueError("installed cerebellar mesh cannot be reproduced")
    stored = blocks.deterministic_gzip(new_mesh)
    meta = json.loads((ATLAS / f"{stem}.json").read_bytes())
    if meta["sourceSha256"] != base or meta["labelVoxelCounts"]["28"] != record["countsBefore"]["28"]:
        raise ValueError("installed cerebellar metadata differs")
    meta.update(new_info, sourceSha256=after_sha, rawSha256=sha(new_mesh), storedSha256=sha(stored),
                rawBytes=len(new_mesh), storedBytes=len(stored), sha256=sha(stored), bytes=len(stored),
                labelVoxelCounts={"28": record["countsAfter"]["28"], "29": int((after == 29).sum())},
                reviewRecord=RECORD.relative_to(ROOT).as_posix())
    writes.extend(((ATLAS / f"{stem}.mesh", stored), (ATLAS / f"{stem}.json", encode(meta))))

    for path in sorted(ATLAS.glob("section-current-*.json")):
        if path.name == f"{stem}.json":
            continue
        item = json.loads(path.read_bytes())
        if item["sourceSha256"] != base:
            raise ValueError(f"section metadata differs: {path}")
        for name, mesh in item.get("meshes", {path.stem: item}).items():
            if 28 in mesh["labelIds"] or sha((ATLAS / f"{name}.mesh").read_bytes()) != mesh["sha256"]:
                raise ValueError(f"unexpected affected section mesh: {name}")
        item["sourceSha256"] = after_sha
        if "rawVoxelSha256" in item:
            item["rawVoxelSha256"] = record["afterRawVoxelSha256"]
        writes.append((path, encode(item)))

    raw, _ = blocks.read_volume(blocks.BIGBRAIN, b"BBV1")
    values = raw[::2, ::2, ::2]
    old_defs = blocks.specimen_definitions(values, before.transpose(2, 1, 0)[::2, ::2, ::2])
    new_defs = blocks.specimen_definitions(values, after.transpose(2, 1, 0)[::2, ::2, ::2])
    for block, parts in old_defs.items():
        for old in parts:
            new = next(part for part in new_defs[block] if part.key == old.key)
            if not np.array_equal(old.mask, new.mask):
                raise ValueError(f"block mask unexpectedly changed: {block}/{old.key}")

    teaching_path = ROOT / "app/teachingSpecimens.json"
    teaching = json.loads(teaching_path.read_bytes())
    if teaching["sourceLabelSha256"] != base:
        raise ValueError("teaching specimen provenance differs")
    for specimen in teaching["specimens"].values():
        for part in specimen["parts"]:
            if 28 in part.get("sourceLabelIds", []) or sha((ATLAS / part["file"]).read_bytes()) != part["meshSha256"]:
                raise ValueError("affected teaching specimen requires rebuilding")
    teaching["sourceLabelSha256"] = after_sha
    writes.append((teaching_path, encode(teaching)))

    revision_path = ROOT / "app/segmentationLabelRevision.ts"
    revision = revision_path.read_text(encoding="utf-8")
    if base not in revision:
        raise ValueError("application label revision differs")
    writes.append((revision_path, revision.replace(base, after_sha).encode()))

    validation_path = ATLAS / "bigbrain-practical-segmentation-icbm500-validation.json"
    validation = json.loads(validation_path.read_bytes())
    if validation["rawVoxelSha256"] != record["beforeRawVoxelSha256"] or validation["labelCounts"]["28"] != record["countsBefore"]["28"]:
        raise ValueError("validation metadata differs")
    validation["rawVoxelSha256"] = record["afterRawVoxelSha256"]
    validation["labelCounts"]["28"] = record["countsAfter"]["28"]
    measurements = validation["currentImageMeasurements"]
    if measurements["sourceLabelSha256"] != base:
        raise ValueError("image-measurement metadata differs")
    measurements["sourceLabelSha256"] = after_sha
    measurements["rawVoxelSha256"] = record["afterRawVoxelSha256"]
    measurements["labelCounts"]["28"] = record["countsAfter"]["28"]
    record.update(projectAdopted=True, adopted=True, installed=True, status="AI-image-reviewed-project-adopted-development-only",
                  sectionMeshImpact={"before": old_info, "after": new_info}, blockMaskChanged=False,
                  integrationVerification="docs/CEREBELLAR_LEFT_LOWER16_2026-09-29.md")
    accepted = encode(record)
    validation["regionalBatchAudits"]["cerebellar-left-lower16"] = {
        "record": RECORD.relative_to(ROOT).as_posix(), "recordSha256": sha(accepted),
        "changedVoxelCount": 16, "projectAdopted": True, "expertReviewed": False,
    }
    writes.extend(((RECORD, accepted), (validation_path, encode(validation)), (SOURCE, after_bytes)))
    if RECORD.exists():
        raise ValueError("adoption record already exists")
    return writes, old_info, new_info, after_sha


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    writes, old_info, new_info, after_sha = plan()
    if args.apply:
        for path, data in writes:
            path.write_bytes(data)
    print(json.dumps({"applied": args.apply, "files": len(writes), "afterSha256": after_sha,
                      "sectionComponents6": [old_info["components6"], new_info["components6"]]}))
