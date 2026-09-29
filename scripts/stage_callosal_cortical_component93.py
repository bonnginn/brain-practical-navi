"""Stage the image-reviewed C93 callosal overlabel as a reversible work-only patch."""

import gzip
import hashlib
import json
import struct

import numpy as np
from scipy import ndimage

from build_orthogonal_review_bundle import ROOT, MAGIC_LABELS, read_browser_volume


SOURCE = ROOT / "public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz"
SOURCE_SHA = "7d94c6e30aa6182b4cb68d1969772e71eb7fe64199d7ea58b6028f6050932f3e"
OLD_SOURCE = ROOT / "tests/fixtures/bigbrain-practical-segmentation-pre-callosum-930e.bin.gz"
OLD_SHA = "930eaaed7eed8782b1b162f3aa5c59c2428f4062d0d2da3a9a1cb563f49b7db7"
SAMPLES = ROOT / "work/anatomy-review/callosum-official-tissue-v1/sampled-callosal-classes.npz"
REVIEW = ROOT / "work/anatomy-review/callosum-cortical-spillover-component93-v1"
STAGE = ROOT / "work/anatomy-review/callosum-cortical-component93-stage-v1"
INDICES_SHA = "e414ec0cfa1b09476342ef0ce9c24c3a67da4cf9a6a6eaac2f250307013c2748"
sha = lambda data: hashlib.sha256(data).hexdigest()


def main():
    if STAGE.exists():
        raise ValueError("Preserve the existing work-only stage")
    before_bytes = SOURCE.read_bytes()
    if sha(before_bytes) != SOURCE_SHA:
        raise ValueError("Current labels changed")
    _, dims, before = read_browser_volume(SOURCE, MAGIC_LABELS, SOURCE_SHA)
    _, old_dims, old = read_browser_volume(OLD_SOURCE, MAGIC_LABELS, OLD_SHA)
    if old_dims != dims:
        raise ValueError("Prescreen grid changed")
    sampled = np.load(SAMPLES)
    if not np.array_equal(sampled["points"], np.argwhere(old == 30)):
        raise ValueError("Prescreen point order changed")
    mask = np.zeros(dims, dtype=bool)
    mask[tuple(sampled["points"][sampled["prescreen"]].T)] = True
    components, _ = ndimage.label(mask)
    points = np.argwhere(components == 93)
    indices = np.sort(np.ravel_multi_index(points.T, dims, order="F").astype("<u4"))
    if len(points) != 278 or points.min(0).tolist() != [207, 219, 214] or points.max(0).tolist() != [216, 233, 220] or sha(indices.tobytes()) != INDICES_SHA:
        raise ValueError("Fixed component 93 changed")
    if not np.all(before[tuple(points.T)] == 30):
        raise ValueError("Candidate overlaps a later edit")
    report_path = REVIEW / "report.json"
    report = json.loads(report_path.read_text(encoding="utf-8"))
    if report["component"] != 93 or report["count"] != 278 or sum(len(item["indices"]) for item in report["figures"]) != 38 or len(report["figures"]) != 9:
        raise ValueError("Review coverage changed")
    evidence = {report_path.relative_to(ROOT).as_posix(): sha(report_path.read_bytes())}
    for item in report["figures"]:
        path = REVIEW / item["file"]
        if sha(path.read_bytes()) != item["sha256"]:
            raise ValueError(f"Review figure changed: {path}")
        evidence[path.relative_to(ROOT).as_posix()] = item["sha256"]
    after = before.copy()
    after[tuple(points.T)] = 0
    before_raw = gzip.decompress(before_bytes)
    if before_raw[:4] != b"BBS1" or tuple(struct.unpack_from("<3H", before_raw, 4)) != dims:
        raise ValueError("Unexpected volume header")
    after_raw = before_raw[:10] + after.tobytes(order="F")
    after_bytes = gzip.compress(after_raw, compresslevel=9, mtime=0)
    restored = after.copy()
    restored[tuple(points.T)] = 30
    if not np.array_equal(restored, before) or int(np.count_nonzero(before != after)) != 278:
        raise ValueError("Forward/reverse replay failed")
    record = {
        "beforeSha256": SOURCE_SHA, "afterSha256": sha(after_bytes),
        "beforeRawVoxelSha256": sha(before_raw[10:]), "afterRawVoxelSha256": sha(after_raw[10:]),
        "component": 93, "count": 278, "indicesSha256": INDICES_SHA,
        "points": [{"xyz": point.tolist(), "before": 30, "after": 0} for point in points],
        "countsBefore": {"30": int((before == 30).sum())},
        "countsAfter": {"30": int((after == 30).sum())},
        "evidence": evidence, "projectAdopted": False, "expertReviewed": False, "published": False,
        "decision": "Work-only proposal: remove C93 from the corpus-callosum label after reviewing all occupied and neighbouring X/Y/Z planes. The candidate follows folded cortical tissue above the principal callosal white matter. Recheck section and block meshes before project adoption.",
    }
    STAGE.mkdir(parents=True)
    (STAGE / "before.bin.gz").write_bytes(before_bytes)
    (STAGE / "labels.bin.gz").write_bytes(after_bytes)
    (STAGE / "repair.json").write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"before": SOURCE_SHA, "after": record["afterSha256"], "count": 278, "countsAfter": record["countsAfter"]}))


if __name__ == "__main__":
    main()
