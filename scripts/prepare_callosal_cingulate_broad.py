"""Stage a reversible, image-reviewed correction of broad ID30 cingulate spillover.

The independent tissue classes locate the callosal/cingulate transition; the
midline callosal roof only regularizes sparse lateral observations. Neither is
treated as a named-structure atlas. Review figures against the original image
must be inspected before the staged indices are adopted.
"""

import gzip
import hashlib
import json
from pathlib import Path

import numpy as np
from scipy import ndimage

from build_orthogonal_review_bundle import ROOT, MAGIC_LABELS, read_browser_volume


SOURCE = ROOT / "public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz"
SOURCE_SHA = "f2c489829d1b0d9515bcced16e42bb2daff25fa15f2d169e75ee5065ea001721"
SAMPLES = ROOT / "work/anatomy-review/callosum-official-tissue-v1/sampled-callosal-classes.npz"
REVIEW = ROOT / "work/anatomy-review/callosum-cingulate-post-release-20260930"
STAGE = ROOT / "work/anatomy-review/callosum-cingulate-broad-stage-20260930"
sha = lambda data: hashlib.sha256(data).hexdigest()


def select(before, points, classes):
    if before.shape != (394, 466, 378) or points.shape != (151380, 3):
        raise ValueError("Unexpected grid or independent tissue sample")
    current = before[tuple(points.T)] == 30
    if int(current.sum()) != 145429 or int((before == 30).sum()) != 145429:
        raise ValueError("Current ID30 no longer matches the reviewed source")

    # At lateral sagittal positions, locate a gray-matter band or a real gap
    # above at least four lower white voxels in each occupied Y column.
    seeds = np.full(before.shape[:2], np.nan)
    groups = {}
    for i, (x, y, _) in enumerate(points):
        if current[i]:
            groups.setdefault((int(x), int(y)), []).append(i)
    for (x, y), ids in groups.items():
        if 189 < x < 201:
            continue
        ids = np.asarray(ids)[np.argsort(points[ids, 2])]
        z = points[ids, 2]
        tissue = classes[ids]
        white = tissue == 3
        cortex = np.isin(tissue, (2, 5))
        if len(ids) < 8 or white[:4].sum() < 3:
            continue
        for start in range(4, len(ids) - 1):
            gray_boundary = cortex[start] and cortex[start + 1]
            gap_boundary = z[start] - z[start - 1] >= 3
            if (gray_boundary or gap_boundary) and white[:start].sum() >= 4 and len(ids) - start >= 2:
                seeds[x, y] = z[start]
                break

    lateral = np.zeros(len(points), dtype=bool)
    seed_counts = {}
    for lo, hi in ((175, 189), (201, 216)):
        roi = seeds[lo:hi + 1, 160:355]
        missing = np.isnan(roi)
        distance, indices = ndimage.distance_transform_edt(missing, return_indices=True)
        roof = ndimage.gaussian_filter(roi[tuple(indices)], sigma=(1.0, 2.5))
        side = current & (points[:, 0] >= lo) & (points[:, 0] <= hi) & (points[:, 1] >= 160) & (points[:, 1] < 355)
        ids = np.flatnonzero(side)
        p = points[ids]
        lowest = np.full((hi - lo + 1, 195), 999, dtype=np.int16)
        np.minimum.at(lowest, (p[:, 0] - lo, p[:, 1] - 160), p[:, 2])
        floor = lowest[p[:, 0] - lo, p[:, 1] - 160]
        lateral[ids] = ((p[:, 2] >= np.maximum(np.rint(roof[p[:, 0] - lo, p[:, 1] - 160]).astype(int), floor + 4))
                        & (distance[p[:, 0] - lo, p[:, 1] - 160] <= 12))
        seed_counts[f"{lo}-{hi}"] = int((~missing).sum())

    # The intact near-midline roof (X190-200) limits lateral interpolation
    # where the gray/classification boundary vanishes in partial volume.
    midline = np.full(before.shape[1], np.nan)
    for y in range(160, 355):
        tops = []
        for x in range(190, 201):
            zz = np.flatnonzero(before[x, y, :] == 30)
            if len(zz):
                tops.append(int(zz.max()))
        if len(tops) >= 5:
            midline[y] = np.median(tops)
    present = np.flatnonzero(~np.isnan(midline))
    if present[0] != 183 or present[-1] != 334:
        raise ValueError(f"Midline roof coverage changed: {present[0]}..{present[-1]}")
    ceiling = np.interp(np.arange(before.shape[1]), present, midline[present])
    sides = current & ((points[:, 0] <= 189) | (points[:, 0] >= 201))
    cap = sides & (points[:, 2] > ceiling[points[:, 1]] + 2)
    selected = lateral | cap
    xyz = points[selected]
    if len(xyz) != 48395 or not np.all(before[tuple(xyz.T)] == 30):
        raise ValueError("Reviewed broad removal changed")
    return xyz, seed_counts, dict(tissueClassCounts={str(k): int(v) for k, v in zip(*np.unique(classes[selected], return_counts=True))},
                                  seeded=int(lateral.sum()), midlineCeiling=int(cap.sum()))


def main():
    if STAGE.exists():
        raise ValueError("Keep the previous staged evidence")
    source_bytes = SOURCE.read_bytes()
    if sha(source_bytes) != SOURCE_SHA:
        raise ValueError("Source label identity changed")
    _, dims, before = read_browser_volume(SOURCE, MAGIC_LABELS, SOURCE_SHA)
    with np.load(SAMPLES) as sampled:
        points = sampled["points"]
        classes = sampled["cubicClass"]
        xyz, seed_counts, selection = select(before, points, classes)
    indices = np.sort(np.ravel_multi_index(xyz.T, dims, order="F").astype("<u4"))
    after = before.copy()
    after[tuple(xyz.T)] = 0
    restored = after.copy()
    restored[tuple(xyz.T)] = 30
    if not np.array_equal(restored, before) or np.count_nonzero(before != after) != len(xyz):
        raise ValueError("Patch does not reverse exactly")
    image_paths = [REVIEW / f"candidate-{i}.png" for i in range(6)] + [REVIEW / f"candidate-coronal-{i}.png" for i in range(3)]
    if any(not path.is_file() for path in image_paths):
        raise ValueError("Missing original/proposed image review")
    compressed = gzip.compress(gzip.decompress(source_bytes)[:10] + after.tobytes(order="F"), compresslevel=9, mtime=0)
    record = dict(beforeSha256=SOURCE_SHA, afterSha256=sha(compressed), rawVoxelSha256=sha(after.tobytes(order="F")),
                  sourceImageSha256="c4b69975f0dece2512adf3bcae690226492cfa66ded38380b3b94aa8dba52746",
                  independentTissueSampleSha256=sha(SAMPLES.read_bytes()), indexSha256=sha(indices.tobytes()),
                  count=len(xyz), transition="30→0", callosumBefore=145429, callosumAfter=int((after == 30).sum()),
                  seedCounts=seed_counts, selection=selection,
                  reviewFigures={path.relative_to(ROOT).as_posix(): sha(path.read_bytes()) for path in image_paths},
                  decision="Work-only proposal. Original sagittal and coronal images show broad cingulate/cingulum tissue above the callosal white band on both sides. Remove upper mislabeled tissue while preserving the near-midline arch. Tissue is unlabelled, not erased.",
                  limitation="AI image review at 0.5 mm; approximate educational boundary, not expert or native-resolution validation. Do not assign removed voxels to another named structure.",
                  projectAdopted=False, expertReviewed=False, published=False)
    STAGE.mkdir(parents=True)
    (STAGE / "indices.bin.gz").write_bytes(gzip.compress(indices.tobytes(), compresslevel=9, mtime=0))
    (STAGE / "before.bin.gz").write_bytes(source_bytes)
    (STAGE / "labels.bin.gz").write_bytes(compressed)
    (STAGE / "repair.json").write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"before": SOURCE_SHA, "after": record["afterSha256"], "removed": len(xyz),
                      "remaining": record["callosumAfter"], "indicesSha256": record["indexSha256"]}))


if __name__ == "__main__":
    main()
