"""Install two image-reviewed cerebellar interstitial exterior islands."""

import argparse
import gzip
import hashlib
import json
import struct
from pathlib import Path

import numpy as np

import build_specimen_blocks as blocks
from build_section_ventricle_meshes import reconstruct
from prepare_cerebellar_interstitial16 import ROOT, STAGE


ATLAS = ROOT / "public/atlas"
SOURCE = ATLAS / "bigbrain-practical-segmentation-icbm500.bin.gz"
RECORD = ROOT / "segmentation-patches/review/cerebellar-interstitial16-adoption-2026-09-29.json"
sha = lambda data: hashlib.sha256(data).hexdigest()
encode = lambda data: (json.dumps(data, ensure_ascii=False, indent=2) + "\n").encode()


def read_labels(compressed):
    raw = gzip.decompress(compressed)
    if raw[:4] != b"BBS1":
        raise ValueError("unexpected label format")
    return np.frombuffer(raw, np.uint8, offset=10).reshape(struct.unpack_from("<3H", raw, 4), order="F")


def plan(stage=STAGE, record_path=RECORD, audit_key="cerebellar-interstitial16"):
    record = json.loads((stage / "repair.json").read_text(encoding="utf-8"))
    before_bytes, after_bytes = (stage / "before.bin.gz").read_bytes(), (stage / "labels.bin.gz").read_bytes()
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
        if point in seen or edit["before"] not in (28, 29) or edit["after"] != 0 or before[point] != edit["before"] or after[point] != 0:
            raise ValueError("invalid or repeated voxel edit")
        seen.add(point)
        forward[point] = 0
        reverse[point] = edit["before"]
    if len(seen) != record["count"] or not np.array_equal(forward, after) or not np.array_equal(reverse, before):
        raise ValueError("forward/reverse replay failed")
    for relative, digest in record["evidence"].items():
        if sha((ROOT / relative).read_bytes()) != digest:
            raise ValueError(f"review figure changed: {relative}")
    for label_id in (28, 29):
        if int((before == label_id).sum()) != record["countsBefore"][str(label_id)] or int((after == label_id).sum()) != record["countsAfter"][str(label_id)]:
            raise ValueError("cerebellar count differs")

    writes = []
    stem = "section-current-cerebellum"
    old_mesh, old_info = reconstruct(np.isin(before, (28, 29)).transpose(2, 1, 0))
    new_mesh, new_info = reconstruct(np.isin(after, (28, 29)).transpose(2, 1, 0))
    if gzip.decompress((ATLAS / f"{stem}.mesh").read_bytes()) != old_mesh:
        raise ValueError("installed cerebellar mesh cannot be reproduced")
    stored = blocks.deterministic_gzip(new_mesh)
    meta = json.loads((ATLAS / f"{stem}.json").read_bytes())
    if meta["sourceSha256"] != base or any(meta["labelVoxelCounts"][str(i)] != record["countsBefore"][str(i)] for i in (28, 29)):
        raise ValueError("installed cerebellar metadata differs")
    meta.update(new_info, sourceSha256=after_sha, rawSha256=sha(new_mesh), storedSha256=sha(stored),
                rawBytes=len(new_mesh), storedBytes=len(stored), sha256=sha(stored), bytes=len(stored),
                labelVoxelCounts=record["countsAfter"],
                reviewRecord=record_path.relative_to(ROOT).as_posix())
    writes.extend(((ATLAS / f"{stem}.mesh", stored), (ATLAS / f"{stem}.json", encode(meta))))

    for path in sorted(ATLAS.glob("section-current-*.json")):
        if path.name == f"{stem}.json":
            continue
        item = json.loads(path.read_bytes())
        if item["sourceSha256"] != base:
            raise ValueError(f"section metadata differs: {path}")
        for name, mesh in item.get("meshes", {path.stem: item}).items():
            if any(i in mesh["labelIds"] for i in (28, 29)) or sha((ATLAS / f"{name}.mesh").read_bytes()) != mesh["sha256"]:
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
            if any(i in part.get("sourceLabelIds", []) for i in (28, 29)) or sha((ATLAS / part["file"]).read_bytes()) != part["meshSha256"]:
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
    if validation["rawVoxelSha256"] != record["beforeRawVoxelSha256"] or any(validation["labelCounts"][str(i)] != record["countsBefore"][str(i)] for i in (28, 29)):
        raise ValueError("validation metadata differs")
    validation["rawVoxelSha256"] = record["afterRawVoxelSha256"]
    for label_id in (28, 29):
        validation["labelCounts"][str(label_id)] = record["countsAfter"][str(label_id)]
    measurements = validation["currentImageMeasurements"]
    if measurements["sourceLabelSha256"] != base:
        raise ValueError("image-measurement metadata differs")
    measurements["sourceLabelSha256"] = after_sha
    measurements["rawVoxelSha256"] = record["afterRawVoxelSha256"]
    for label_id in (28, 29):
        measurements["labelCounts"][str(label_id)] = record["countsAfter"][str(label_id)]
    record.update(projectAdopted=True, adopted=True, installed=True, status="AI-image-reviewed-project-adopted-development-only",
                  sectionMeshImpact={"before": old_info, "after": new_info}, blockMaskChanged=False,
                  integrationVerification=record.get("integrationVerification", "docs/CEREBELLAR_INTERSTITIAL16_2026-09-29.md"))
    accepted = encode(record)
    validation["regionalBatchAudits"][audit_key] = {
        "record": record_path.relative_to(ROOT).as_posix(), "recordSha256": sha(accepted),
        "changedVoxelCount": record["count"], "projectAdopted": True, "expertReviewed": False,
    }
    writes.extend(((record_path, accepted), (validation_path, encode(validation)), (SOURCE, after_bytes)))
    if record_path.exists():
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
