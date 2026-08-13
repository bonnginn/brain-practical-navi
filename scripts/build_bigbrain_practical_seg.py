#!/usr/bin/env python3
"""Build the practical teaching overlay for the 0.5 mm BigBrain grid.

Labels 1-22 are copied byte-for-byte from the Xiao et al. manual
subcortical segmentation.  Labels 23-29 are resampled from CerebrA after an
overlap audit against those manual labels.  Labels 30-32 are deliberately
marked as provisional: they are white-matter candidates constrained by the
CerebrA white-matter probability map and neighbouring nuclei/ventricles.

The output is an educational overlay, not a new anatomical ground truth.
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
from scipy import ndimage

from build_bigbrain_manual_seg import extract_zip_entry, write_browser_volume


MANUAL_TO_CEREBRA = {
    "caudate": ([7, 8], [100, 49]),
    "putamen": ([9, 10], [72, 21]),
    "pallidum": ([11, 12, 13, 14], [78, 27]),
    "thalamus": ([15, 16], [91, 40]),
    "hippocampus": ([17, 18], [99, 48]),
    "accumbens": ([19, 20], [55, 4]),
    "amygdala": ([21, 22], [70, 19]),
}

PRACTICAL_LABELS = {
    23: "left lateral ventricle",
    24: "right lateral ventricle",
    25: "third ventricle",
    26: "fourth ventricle",
    27: "brainstem",
    28: "left cerebellum",
    29: "right cerebellum",
    30: "corpus callosum candidate",
    31: "left internal capsule candidate",
    32: "right internal capsule candidate",
    33: "optic chiasm atlas candidate",
    34: "left insula atlas candidate",
    35: "right insula atlas candidate",
}


def load_nifti_entry(path: Path) -> nib.Nifti1Image:
    return nib.Nifti1Image.from_bytes(extract_zip_entry(path))


def dice(a: np.ndarray, b: np.ndarray) -> float:
    denominator = int(a.sum()) + int(b.sum())
    return 2.0 * float(np.logical_and(a, b).sum()) / denominator if denominator else 0.0


def resample_mask(mask: np.ndarray, source: nib.Nifti1Image, target: nib.Nifti1Image) -> np.ndarray:
    image = nib.Nifti1Image(mask.astype(np.uint8), source.affine)
    return np.asarray(resample_from_to(image, (target.shape, target.affine), order=0).dataobj) > 0


def atlas_white_matter_candidates(
    cerebra: np.ndarray,
    wm_probability: np.ndarray,
    affine: np.ndarray,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Create conservative CC/internal-capsule candidates in the 1 mm atlas grid."""
    grid = np.indices(cerebra.shape, dtype=np.float32)
    x = affine[0, 0] * grid[0] + affine[0, 3]
    y = affine[1, 1] * grid[1] + affine[1, 3]
    z = affine[2, 2] * grid[2] + affine[2, 3]

    lateral_ventricles = np.isin(cerebra, [92, 41, 56, 5])
    distance_to_ventricle = ndimage.distance_transform_edt(~lateral_ventricles)
    callosum = (
        (wm_probability >= 0.50)
        & (np.abs(x) <= 10)
        & (y >= -56)
        & (y <= 40)
        & (z >= 2)
        & (z <= 42)
        & (distance_to_ventricle <= 12)
    )
    # Remove small nearby tracts while retaining the midline arch.
    callosum = ndimage.binary_closing(callosum, iterations=1)
    components, count = ndimage.label(callosum)
    seed = (np.abs(x) <= 3) & (y >= -42) & (y <= 27) & (z >= 16) & (z <= 34)
    keep = np.unique(components[seed & callosum])
    keep = keep[keep > 0]
    callosum = np.isin(components, keep) if count and keep.size else callosum

    medial = np.isin(cerebra, [100, 49, 91, 40])
    lateral = np.isin(cerebra, [72, 21, 78, 27])
    distance_to_medial = ndimage.distance_transform_edt(~medial)
    distance_to_lateral = ndimage.distance_transform_edt(~lateral)
    capsule = (
        (wm_probability >= 0.42)
        & (distance_to_medial <= 6.5)
        & (distance_to_lateral <= 6.5)
        & ((distance_to_medial + distance_to_lateral) <= 10.5)
        & (np.abs(x) >= 7)
        & (np.abs(x) <= 36)
        & (y >= -35)
        & (y <= 32)
        & (z >= -9)
        & (z <= 34)
        & ~medial
        & ~lateral
    )
    capsule = ndimage.binary_closing(capsule, iterations=1)
    left_capsule = capsule & (x < 0)
    right_capsule = capsule & (x > 0)
    return callosum, left_capsule, right_capsule


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("image_entry", type=Path)
    parser.add_argument("manual_entry", type=Path)
    parser.add_argument("--cerebra", type=Path, required=True)
    parser.add_argument("--wm-prob", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()

    image_nii = load_nifti_entry(args.image_entry)
    manual_nii = load_nifti_entry(args.manual_entry)
    if image_nii.shape != manual_nii.shape or not np.array_equal(image_nii.affine, manual_nii.affine):
        raise ValueError("BigBrain image and manual labels must share an exact grid")
    manual = np.rint(np.asarray(manual_nii.dataobj)).astype(np.uint8)
    image = np.asarray(image_nii.dataobj, dtype=np.float32)
    # In the BigBrain histology volume, the ventricular lumen is absence of
    # tissue (the same high background code used by other empty space).  Never
    # let an atlas ventricle label turn adjacent tissue into a filled organ.
    empty_space = ~np.isfinite(image) | (image >= 65000)
    if sorted(int(value) for value in np.unique(manual) if value) != list(range(1, 23)):
        raise ValueError("expected official manual labels 1-22")

    cerebra_nii = nib.load(str(args.cerebra))
    wm_nii = nib.load(str(args.wm_prob))
    if cerebra_nii.shape != wm_nii.shape or not np.allclose(cerebra_nii.affine, wm_nii.affine):
        raise ValueError("CerebrA and white-matter probability must share a grid")
    cerebra = np.rint(np.asarray(cerebra_nii.dataobj)).astype(np.uint8)
    wm_probability = np.asarray(wm_nii.dataobj, dtype=np.float32)
    if wm_probability.max() > 1.5:
        wm_probability /= 100.0

    resampled_atlas = np.rint(
        np.asarray(resample_from_to(cerebra_nii, (manual_nii.shape, manual_nii.affine), order=0).dataobj)
    ).astype(np.uint8)
    overlap_audit: dict[str, float] = {}
    for name, (manual_ids, atlas_ids) in MANUAL_TO_CEREBRA.items():
        overlap_audit[name] = round(dice(np.isin(manual, manual_ids), np.isin(resampled_atlas, atlas_ids)), 4)
    if min(overlap_audit["caudate"], overlap_audit["putamen"], overlap_audit["thalamus"]) < 0.75:
        raise ValueError(f"atlas alignment audit failed: {overlap_audit}")

    practical = manual.copy()
    empty = practical == 0

    atlas_masks = {
        23: np.isin(resampled_atlas, [92, 56]),
        24: np.isin(resampled_atlas, [41, 5]),
        25: np.isin(resampled_atlas, [80, 29]),
        26: np.isin(resampled_atlas, [88, 37]),
        27: np.isin(resampled_atlas, [62, 11]),
        28: np.isin(resampled_atlas, [97, 90, 101, 53, 71]),
        29: np.isin(resampled_atlas, [46, 39, 50, 2, 20]),
    }
    for label_id, mask in atlas_masks.items():
        if 23 <= label_id <= 26:
            mask = mask & empty_space
        practical[mask & empty] = label_id
        empty = practical == 0

    callosum, left_capsule, right_capsule = atlas_white_matter_candidates(
        cerebra, wm_probability, cerebra_nii.affine
    )
    candidate_masks = {
        30: resample_mask(callosum, cerebra_nii, manual_nii),
        31: resample_mask(left_capsule, cerebra_nii, manual_nii),
        32: resample_mask(right_capsule, cerebra_nii, manual_nii),
    }
    for label_id, mask in candidate_masks.items():
        practical[mask & empty] = label_id
        empty = practical == 0

    # These structures already exist in the learning UI but were previously
    # colourable only on the average atlas. Add conservative CerebrA candidates
    # to otherwise-unlabelled BigBrain tissue; never overwrite manual labels,
    # ventricles, brainstem/cerebellum, or white-matter candidates.
    late_atlas_masks = {
        33: np.isin(resampled_atlas, [68, 17]),
        34: resampled_atlas == 74,
        35: resampled_atlas == 23,
    }
    for label_id, mask in late_atlas_masks.items():
        practical[mask & empty & ~empty_space] = label_id
        empty = practical == 0

    if not np.array_equal(practical[manual > 0], manual[manual > 0]):
        raise ValueError("official manual labels were modified")
    counts = {str(label_id): int((practical == label_id).sum()) for label_id in range(1, 36)}
    if any(counts[str(label_id)] == 0 for label_id in PRACTICAL_LABELS):
        raise ValueError(f"one or more practical labels are empty: {counts}")

    args.output_dir.mkdir(parents=True, exist_ok=True)
    output = args.output_dir / "bigbrain-practical-segmentation-icbm500.bin.gz"
    validation_output = args.output_dir / "bigbrain-practical-segmentation-icbm500-validation.json"
    write_browser_volume(output, b"BBS1", practical)
    validation = {
        "shape": list(practical.shape),
        "voxelSizeMm": list(map(float, manual_nii.header.get_zooms()[:3])),
        "officialManualIds": list(range(1, 23)),
        "officialLabelsPreserved": True,
        "atlasDerivedIds": list(range(23, 30)) + [33, 34, 35],
        "imageGuidedCandidateIds": [30, 31, 32],
        "labelNames": {str(key): value for key, value in PRACTICAL_LABELS.items()},
        "labelCounts": counts,
        "atlasToManualDiceAudit": overlap_audit,
        "ventricleLabelsRestrictedToEmptySpace": True,
        "ventricleTissueOverlap": float((~empty_space[np.isin(practical, [23, 24, 25, 26])]).mean()),
        "coordinatePolicy": "exact BigBrain ICBM2009sym 0.5 mm output grid; CerebrA resampling accepted only after overlap audit",
        "teachingPolicy": "IDs 23-35 are provisional teaching overlays and must not be presented as manual ground truth",
    }
    validation_output.write_text(json.dumps(validation, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"output": str(output), "validation": str(validation_output), **validation}, ensure_ascii=False))


if __name__ == "__main__":
    main()
