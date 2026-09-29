"""Stage reversible removal of the image-reviewed left cerebellar exterior patch."""

import gzip
import hashlib
import json
import struct

import numpy as np

from build_orthogonal_review_bundle import DEFAULT_IMAGE, EXPECTED_IMAGE_SHA256, MAGIC_IMAGE, ROOT, read_browser_volume


SOURCE = ROOT / "public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz"
SOURCE_SHA = "e9c0a83f03cde2a64a53d2912a5502130ec872ea2fbfa9b0d75ea83ff1a9914f"
REVIEW = ROOT / "work/anatomy-review/current-left-cerebellar-face-island-2026-09-29/full"
STAGE = ROOT / "work/cerebellum-left-exterior24-20260929"
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
    if report["labelsSha256"] != SOURCE_SHA or report["imageSha256"] != EXPECTED_IMAGE_SHA256 or report["count"] != 24:
        raise ValueError("Review evidence differs")
    points = sorted({tuple(p) for p in report["pointsXYZ"]})
    if len(points) != 24 or any(before[p] != 28 or image[p] != 255 for p in points):
        raise ValueError("Target is not the reviewed exterior ID28 patch")
    after = before.copy()
    for point in points:
        after[point] = 0
    after_raw = raw_bytes[:10] + after.tobytes(order="F")
    after_bytes = gzip.compress(after_raw, compresslevel=9, mtime=0)
    evidence = {f"{REVIEW.relative_to(ROOT).as_posix()}/{name}": sha((REVIEW / name).read_bytes())
                for name in ["report.json", *(figure["file"] for figure in report["figures"])]}
    record = {
        "beforeSha256": SOURCE_SHA,
        "afterSha256": sha(after_bytes),
        "beforeRawVoxelSha256": sha(raw_bytes[10:]),
        "afterRawVoxelSha256": sha(after_raw[10:]),
        "imageSha256": EXPECTED_IMAGE_SHA256,
        "count": len(points),
        "points": [{"xyz": list(point), "before": 28, "after": 0} for point in points],
        "countsBefore": {"28": int((before == 28).sum())},
        "countsAfter": {"28": int((after == 28).sum())},
        "evidence": evidence,
        "decision": "Remove the left cerebellar exterior patch after reviewing every occupied and adjacent X/Y/Z source section; 26-neighbour contact and raw 255 alone did not decide its anatomy.",
        "projectAdopted": False,
        "expertReviewed": False,
        "published": False,
    }
    STAGE.mkdir(parents=True)
    (STAGE / "before.bin.gz").write_bytes(before_bytes)
    (STAGE / "labels.bin.gz").write_bytes(after_bytes)
    (STAGE / "repair.json").write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"before": SOURCE_SHA, "after": record["afterSha256"], "removed": len(points),
                      "countAfter": record["countsAfter"]["28"]}))


if __name__ == "__main__":
    main()
