"""Stage reversible removal of six orthogonally reviewed exterior islands."""

import gzip
import hashlib
import json
import struct

import numpy as np

from build_orthogonal_review_bundle import DEFAULT_IMAGE, EXPECTED_IMAGE_SHA256, MAGIC_IMAGE, ROOT, read_browser_volume


SOURCE = ROOT / "public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz"
SOURCE_SHA = "2e6cd6b4afac0c064dcaa2a59aacd086c17a5207ba4188edcf0560a5f805220e"
REVIEW = ROOT / "work/anatomy-review/current-posterior-white-islands-2026-09-29"
STAGE = ROOT / "work/cerebellum-white-islands46-20260929"
sha = lambda data: hashlib.sha256(data).hexdigest()


def main():
    if STAGE.exists():
        raise ValueError("Preserve existing staged evidence")
    before_bytes = SOURCE.read_bytes()
    if sha(before_bytes) != SOURCE_SHA:
        raise ValueError("Current label revision differs")
    raw_bytes = gzip.decompress(before_bytes)
    if raw_bytes[:4] != b"BBS1":
        raise ValueError("Unexpected label format")
    dims = struct.unpack_from("<3H", raw_bytes, 4)
    before = np.frombuffer(raw_bytes, np.uint8, offset=10).reshape(dims, order="F")
    _, _, image = read_browser_volume(DEFAULT_IMAGE, MAGIC_IMAGE, EXPECTED_IMAGE_SHA256)
    report = json.loads((REVIEW / "report.json").read_text(encoding="utf-8"))
    if report["labelSha256"] != SOURCE_SHA or report["imageSha256"] != EXPECTED_IMAGE_SHA256:
        raise ValueError("Review evidence differs")
    if len(report["targets"]) != 6 or sum(item["count"] for item in report["targets"]) != 46:
        raise ValueError("Unexpected reviewed targets")
    edits = {}
    evidence = {f"{REVIEW.relative_to(ROOT).as_posix()}/report.json": sha((REVIEW / "report.json").read_bytes())}
    for item in report["targets"]:
        label_id = item["labelId"]
        if label_id not in (28, 29) or item["count"] != len(item["pointsXYZ"]) or item["rawMin"] != 255 or item["rawMax"] != 255:
            raise ValueError("Unexpected component")
        sheet = REVIEW / item["sheet"]
        evidence[sheet.relative_to(ROOT).as_posix()] = sha(sheet.read_bytes())
        for coordinates in item["pointsXYZ"]:
            point = tuple(coordinates)
            if point in edits or before[point] != label_id or image[point] != 255:
                raise ValueError("Unexpected or repeated voxel")
            edits[point] = label_id
    if len(edits) != 46 or sum(v == 28 for v in edits.values()) != 22 or sum(v == 29 for v in edits.values()) != 24:
        raise ValueError("Wrong target count")
    after = before.copy()
    for point in edits:
        after[point] = 0
    after_raw = raw_bytes[:10] + after.tobytes(order="F")
    after_bytes = gzip.compress(after_raw, compresslevel=9, mtime=0)
    record = {
        "beforeSha256": SOURCE_SHA, "afterSha256": sha(after_bytes),
        "beforeRawVoxelSha256": sha(raw_bytes[10:]), "afterRawVoxelSha256": sha(after_raw[10:]),
        "imageSha256": EXPECTED_IMAGE_SHA256, "count": len(edits),
        "points": [{"xyz": list(p), "before": label_id, "after": 0} for p, label_id in sorted(edits.items())],
        "countsBefore": {str(i): int((before == i).sum()) for i in (28, 29)},
        "countsAfter": {str(i): int((after == i).sum()) for i in (28, 29)},
        "evidence": evidence,
        "decision": "Remove six small cerebellar labels visible in white exterior space on original and adjacent X/Y/Z sections; connectivity and intensity alone were insufficient.",
        "projectAdopted": False, "expertReviewed": False, "published": False,
    }
    STAGE.mkdir(parents=True)
    (STAGE / "before.bin.gz").write_bytes(before_bytes)
    (STAGE / "labels.bin.gz").write_bytes(after_bytes)
    (STAGE / "repair.json").write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"before": SOURCE_SHA, "after": record["afterSha256"], "removed": len(edits), "countsAfter": record["countsAfter"]}))


if __name__ == "__main__":
    main()
