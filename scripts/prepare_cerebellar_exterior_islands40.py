"""Stage a reversible, image-reviewed removal of two exterior cerebellar islands."""

import gzip
import hashlib
import json
import struct
from pathlib import Path

import numpy as np

from build_orthogonal_review_bundle import DEFAULT_IMAGE, EXPECTED_IMAGE_SHA256, MAGIC_IMAGE, read_browser_volume
from review_current_cerebellar_islands import EXPECTED_LABELS_SHA256, LABELS, OUTPUT, ROOT


STAGE = ROOT / "work/cerebellum-exterior-islands40-20260929"
sha = lambda data: hashlib.sha256(data).hexdigest()


def main():
    if STAGE.exists():
        raise ValueError("Preserve existing stage")
    before_bytes = LABELS.read_bytes()
    if sha(before_bytes) != EXPECTED_LABELS_SHA256:
        raise ValueError("Source label revision changed")
    raw_bytes = gzip.decompress(before_bytes)
    dims = struct.unpack_from("<3H", raw_bytes, 4)
    before = np.frombuffer(raw_bytes, np.uint8, offset=10).reshape(dims, order="F")
    _, _, image = read_browser_volume(DEFAULT_IMAGE, MAGIC_IMAGE, EXPECTED_IMAGE_SHA256)
    report = json.loads((OUTPUT / "report.json").read_text(encoding="utf-8"))
    if report["labelSha256"] != EXPECTED_LABELS_SHA256 or report["imageSha256"] != EXPECTED_IMAGE_SHA256:
        raise ValueError("Review evidence revision mismatch")
    points = sorted({tuple(p) for item in report["targets"] for p in item["pointsXYZ"]})
    if len(points) != 40 or any(before[p] != 29 or image[p] != 255 for p in points):
        raise ValueError("Review target is not the confirmed exterior ID29 set")
    after = before.copy()
    for p in points:
        after[p] = 0
    after_raw = raw_bytes[:10] + after.tobytes(order="F")
    after_bytes = gzip.compress(after_raw, compresslevel=9, mtime=0)
    evidence = {
        f"work/anatomy-review/current-cerebellar-islands-2026-09-29/{name}": sha((OUTPUT / name).read_bytes())
        for item in report["targets"] for name in item["figures"]
    }
    evidence["work/anatomy-review/current-cerebellar-islands-2026-09-29/report.json"] = sha((OUTPUT / "report.json").read_bytes())
    record = {
        "beforeSha256": EXPECTED_LABELS_SHA256,
        "afterSha256": sha(after_bytes),
        "beforeRawVoxelSha256": sha(raw_bytes[10:]),
        "afterRawVoxelSha256": sha(after_raw[10:]),
        "imageSha256": EXPECTED_IMAGE_SHA256,
        "count": len(points),
        "points": [{"xyz": list(p), "before": 29, "after": 0} for p in points],
        "countsBefore": {"29": int((before == 29).sum())},
        "countsAfter": {"29": int((after == 29).sum())},
        "evidence": evidence,
        "decision": "Remove two exterior white-background islands after original and adjacent orthogonal review; connectivity and raw value alone were not the decision.",
        "projectAdopted": False,
        "expertReviewed": False,
        "published": False,
    }
    STAGE.mkdir(parents=True)
    (STAGE / "before.bin.gz").write_bytes(before_bytes)
    (STAGE / "labels.bin.gz").write_bytes(after_bytes)
    (STAGE / "repair.json").write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"before": EXPECTED_LABELS_SHA256, "after": record["afterSha256"], "removed": len(points), "countAfter": record["countsAfter"]["29"]}))


if __name__ == "__main__":
    main()
