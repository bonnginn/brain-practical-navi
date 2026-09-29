"""Stage five image-reviewed exterior two-voxel cerebellar islands."""

import gzip
import hashlib
import json
import struct

import numpy as np

from build_orthogonal_review_bundle import DEFAULT_IMAGE, EXPECTED_IMAGE_SHA256, MAGIC_IMAGE, ROOT, read_browser_volume


SOURCE = ROOT / "public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz"
SOURCE_SHA = "98868c413e45436756294f06a693e5dc51efd5c34e98335470fbb27bce204f9d"
REVIEW = ROOT / "work/anatomy-review/post-interstitial16-tiny10-2026-09-29"
STAGE = ROOT / "work/cerebellum-exterior10-20260929"
EXPECTED_COUNTS = {"28": 736105, "29": 724989}
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
    if {str(i): int((before == i).sum()) for i in (28, 29)} != EXPECTED_COUNTS:
        raise ValueError("The reviewed cerebellar labels changed")
    _, _, image = read_browser_volume(DEFAULT_IMAGE, MAGIC_IMAGE, EXPECTED_IMAGE_SHA256)
    report_path = REVIEW / "report.json"
    report = json.loads(report_path.read_text(encoding="utf-8"))
    if report["imageSha256"] != EXPECTED_IMAGE_SHA256 or len(report["targets"]) != 5:
        raise ValueError("Review source or target set differs")
    evidence = {report_path.relative_to(ROOT).as_posix(): sha(report_path.read_bytes())}
    edits = {}
    for item in report["targets"]:
        if item["labelId"] not in (28, 29) or item["count"] != 2 or len(item["pointsXYZ"]) != 2 or item["rawMin"] != 255 or item["rawMax"] != 255:
            raise ValueError("Unexpected reviewed component")
        sheet = REVIEW / item["sheet"]
        evidence[sheet.relative_to(ROOT).as_posix()] = sha(sheet.read_bytes())
        for coordinates in item["pointsXYZ"]:
            point = tuple(coordinates)
            if point in edits or before[point] != item["labelId"] or image[point] != 255:
                raise ValueError("Current label or image differs at reviewed point")
            edits[point] = item["labelId"]
    if len(edits) != 10 or sum(v == 28 for v in edits.values()) != 4 or sum(v == 29 for v in edits.values()) != 6:
        raise ValueError("Unexpected voxel count")
    after = before.copy()
    for point in edits:
        after[point] = 0
    after_raw = raw_bytes[:10] + after.tobytes(order="F")
    after_bytes = gzip.compress(after_raw, compresslevel=9, mtime=0)
    record = {
        "beforeSha256": SOURCE_SHA, "afterSha256": sha(after_bytes),
        "beforeRawVoxelSha256": sha(raw_bytes[10:]), "afterRawVoxelSha256": sha(after_raw[10:]),
        "imageSha256": EXPECTED_IMAGE_SHA256, "count": len(edits),
        "points": [{"xyz": list(point), "before": label_id, "after": 0} for point, label_id in sorted(edits.items())],
        "countsBefore": EXPECTED_COUNTS,
        "countsAfter": {str(i): int((after == i).sum()) for i in (28, 29)},
        "evidence": evidence,
        "decision": "Remove five tiny detached label islands in pale exterior space after reviewing adjacent and orthogonal source-image sections. Do not alter unresolved foliar-edge islands.",
        "integrationVerification": "docs/CEREBELLAR_EXTERIOR10_2026-09-29.md",
        "projectAdopted": False, "expertReviewed": False, "published": False,
    }
    STAGE.mkdir(parents=True)
    (STAGE / "before.bin.gz").write_bytes(before_bytes)
    (STAGE / "labels.bin.gz").write_bytes(after_bytes)
    (STAGE / "repair.json").write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"before": SOURCE_SHA, "after": record["afterSha256"], "removed": len(edits), "countsAfter": record["countsAfter"]}))


if __name__ == "__main__":
    main()
