"""Stage three image-reviewed exterior brainstem voxels; never mutate assets here."""

import gzip
import hashlib
import json
import struct

import numpy as np

from build_orthogonal_review_bundle import DEFAULT_IMAGE, EXPECTED_IMAGE_SHA256, MAGIC_IMAGE, ROOT, read_browser_volume


SOURCE = ROOT / "public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz"
SOURCE_SHA = "0c8fb1da5099b6a0979caa7cf6de08e136e7538d289848979efdf9a86c79c150"
REVIEW = ROOT / "work/anatomy-review/current-brainstem-islands3-2026-09-29"
STAGE = ROOT / "work/brainstem-exterior3-20260929"
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
    if int((before == 27).sum()) != 264456:
        raise ValueError("The reviewed brainstem label changed")
    _, _, image = read_browser_volume(DEFAULT_IMAGE, MAGIC_IMAGE, EXPECTED_IMAGE_SHA256)
    report_path = REVIEW / "report.json"
    report = json.loads(report_path.read_text(encoding="utf-8"))
    if report["imageSha256"] != EXPECTED_IMAGE_SHA256 or len(report["targets"]) != 2:
        raise ValueError("Review source or target set differs")
    evidence = {report_path.relative_to(ROOT).as_posix(): sha(report_path.read_bytes())}
    edits = set()
    for item in report["targets"]:
        if item["labelId"] != 27 or item["count"] != len(item["pointsXYZ"]) or item["count"] not in (1, 2) or len(item["figures"]) != 3:
            raise ValueError("Unexpected reviewed component")
        for name in item["figures"]:
            figure = REVIEW / name
            evidence[figure.relative_to(ROOT).as_posix()] = sha(figure.read_bytes())
        for coordinates in item["pointsXYZ"]:
            point = tuple(coordinates)
            if point in edits or before[point] != 27 or image[point] != 250:
                raise ValueError("Current label or image differs at reviewed point")
            edits.add(point)
    if edits != {(208, 171, 35), (208, 171, 36), (175, 201, 125)}:
        raise ValueError("Unexpected reviewed points")
    after = before.copy()
    for point in edits:
        after[point] = 0
    after_raw = raw_bytes[:10] + after.tobytes(order="F")
    after_bytes = gzip.compress(after_raw, compresslevel=9, mtime=0)
    record = {
        "beforeSha256": SOURCE_SHA, "afterSha256": sha(after_bytes),
        "beforeRawVoxelSha256": sha(raw_bytes[10:]), "afterRawVoxelSha256": sha(after_raw[10:]),
        "imageSha256": EXPECTED_IMAGE_SHA256, "count": len(edits),
        "points": [{"xyz": list(point), "before": 27, "after": 0} for point in sorted(edits)],
        "countsBefore": {"27": 264456}, "countsAfter": {"27": int((after == 27).sum())},
        "evidence": evidence,
        "decision": "Remove two detached brainstem-label islands from exterior space after reviewing the source image in adjacent orthogonal sections. Retain unresolved boundary islands.",
        "integrationVerification": "docs/BRAINSTEM_ISLANDS3_REVIEW_2026-09-29.md",
        "projectAdopted": False, "expertReviewed": False, "published": False,
    }
    STAGE.mkdir(parents=True)
    (STAGE / "before.bin.gz").write_bytes(before_bytes)
    (STAGE / "labels.bin.gz").write_bytes(after_bytes)
    (STAGE / "repair.json").write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"before": SOURCE_SHA, "after": record["afterSha256"], "removed": len(edits), "countsAfter": record["countsAfter"]}))


if __name__ == "__main__":
    main()
