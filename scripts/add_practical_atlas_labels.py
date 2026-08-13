#!/usr/bin/env python3
"""Add conservative CerebrA labels to the bundled BigBrain teaching grid.

This maintenance path is used when the exact BigBrain source ZIP entries are
not present locally. It preserves every existing non-zero voxel, resamples only
the requested atlas regions to the affine recorded in validation metadata, and
restricts new labels to visible BigBrain tissue.
"""

from __future__ import annotations

import argparse
import gzip
import json
import struct
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "work/pydeps"))

import nibabel as nib
import numpy as np
from nibabel.processing import resample_from_to


LABELS = {
    33: ("optic chiasm atlas candidate", (68, 17)),
    34: ("left insula atlas candidate", (74,)),
    35: ("right insula atlas candidate", (23,)),
}


def read_browser_volume(path: Path, magic: bytes) -> tuple[np.ndarray, tuple[int, int, int]]:
    payload = gzip.decompress(path.read_bytes())
    if payload[:4] != magic:
        raise ValueError(f"unexpected header in {path.name}: {payload[:4]!r}")
    dims = struct.unpack("<3H", payload[4:10])
    values = np.frombuffer(payload, dtype=np.uint8, offset=10).reshape(dims, order="F").copy()
    return values, dims


def write_browser_volume(path: Path, magic: bytes, values: np.ndarray) -> None:
    payload = magic + struct.pack("<3H", *values.shape) + values.tobytes(order="F")
    with gzip.open(path, "wb", compresslevel=9) as stream:
        stream.write(payload)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--segmentation", type=Path, required=True)
    parser.add_argument("--image", type=Path, required=True)
    parser.add_argument("--cerebra", type=Path, required=True)
    parser.add_argument("--validation", type=Path, required=True)
    parser.add_argument("--grid-validation", type=Path, required=True)
    args = parser.parse_args()

    practical, dims = read_browser_volume(args.segmentation, b"BBS1")
    image, image_dims = read_browser_volume(args.image, b"BBV1")
    if dims != image_dims:
        raise ValueError(f"image/segmentation dimensions differ: {image_dims} != {dims}")
    validation = json.loads(args.validation.read_text(encoding="utf-8"))
    grid_validation = json.loads(args.grid_validation.read_text(encoding="utf-8"))
    if tuple(validation["shape"]) != dims:
        raise ValueError("validation shape does not match bundled volume")
    if any((practical == label_id).any() for label_id in LABELS):
        raise ValueError("one or more destination labels already exist; refusing to overwrite")

    atlas_nii = nib.load(str(args.cerebra))
    target = nib.Nifti1Image(np.zeros(dims, dtype=np.uint8), np.asarray(grid_validation["affine"], dtype=float))
    atlas = np.rint(np.asarray(resample_from_to(atlas_nii, (target.shape, target.affine), order=0).dataobj)).astype(np.uint8)
    tissue = image < 252
    empty = practical == 0
    counts: dict[str, int] = {}
    for label_id, (name, atlas_ids) in LABELS.items():
        add = np.isin(atlas, atlas_ids) & tissue & empty
        practical[add] = label_id
        empty = practical == 0
        counts[str(label_id)] = int(add.sum())
        if counts[str(label_id)] < 100:
            raise ValueError(f"{name} produced too few voxels: {counts[str(label_id)]}")

    label_counts = {str(label_id): int((practical == label_id).sum()) for label_id in range(1, 36)}
    validation["atlasDerivedIds"] = list(range(23, 30)) + [33, 34, 35]
    validation["imageGuidedCandidateIds"] = [30, 31, 32]
    validation["labelNames"].update({str(label_id): name for label_id, (name, _) in LABELS.items()})
    validation["labelCounts"] = label_counts
    validation["teachingPolicy"] = "IDs 23-35 are provisional teaching overlays and must not be presented as manual ground truth"

    write_browser_volume(args.segmentation, b"BBS1", practical)
    args.validation.write_text(json.dumps(validation, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"addedLabelCounts": counts, "shape": list(dims)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
