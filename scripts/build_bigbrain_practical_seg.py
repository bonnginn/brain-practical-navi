#!/usr/bin/env python3
"""Reproduce the historical practical overlay for the 0.5 mm BigBrain grid.

The original image/manual pair has a known nonlinear-registration-history
mismatch (MANUAL_LABEL_SPACE_REVIEW.md). This CLI requires explicit legacy
research mode and a new work/ directory. It cannot regenerate public assets.

Labels 1-22 are copied byte-for-byte from the Xiao et al. manual
subcortical segmentation.  Labels 23-29 are resampled from CerebrA after an
overlap audit against those manual labels.  Labels 30-32 are deliberately
marked as provisional: they are white-matter candidates constrained by the
CerebrA white-matter probability map and neighbouring nuclei/ventricles.
Reviewed image-guided corrections are then applied from pinned patch files.

The output is an educational overlay, not a new anatomical ground truth.
"""

from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import struct
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "work/pydeps"))
sys.path.insert(0, str(ROOT / "scripts"))
MAMMILLARY_PATCH = ROOT / "segmentation-patches/review/mammillary-bodies-horizontal-core-plus-clear-rim-candidate-2026-08-16.json"
MAMMILLARY_SOURCE_SHA256 = "de30b5c77f4ed4f2902564a5d238b0e733413c247643ef828fb66aa03d8cc8be"
MAMMILLARY_SOURCE_LABELS_SHA256 = "1ef06fcb799ce2c81bd2d7352d8bde310ff694dcfb8ac1a34695f7fc99baf862"
VENTRICLE_PATCH = ROOT / "segmentation-patches/review/ventricles-orthogonally-bracketed-candidate-2026-08-23.json"
VENTRICLE_SOURCE_COMPRESSED_SHA256 = "6744e7c0184436789f42c7107d05ead93cf36703bb36372df5f63b82a38f7b56"
VENTRICLE_SOURCE_LABELS_SHA256 = "088fafcdf6afcea74a7a60075bf3b8a481e1a7aa6379a7c58fb9b9c17f5e731d"
AQUEDUCT_SOURCE_COMPRESSED_SHA256 = "b75a24903ec08526b3e7f08df9efc8cee15af80d86bb96a821260913a2b176f3"
AQUEDUCT_SOURCE_LABELS_SHA256 = "b1105fd3a11fab27d3b1bac60d4d989386e4ef49a41151f5b684d984f72aaaa9"
AQUEDUCT_PARTIAL_INDICES = (
    21377059, 21377060, 21560663, 21560664, 21744267, 21744268,
    21927477, 21927478, 21927871, 21927872, 22111475, 22295079,
    22295473, 22479077, 22479471, 22663075,
)

import numpy as np
from apply_segmentation_patch import validate_patch


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
    39: "left mammillary body (reviewed image-guided)",
    40: "right mammillary body (reviewed image-guided)",
    41: "cerebral aqueduct candidate (partial; project-adopted reclassification)",
}


def apply_approved_patch(volume: np.ndarray, path: Path) -> dict[str, object]:
    baseline = bytearray(np.asarray(volume, dtype=np.uint8).tobytes(order="F"))
    baseline_sha256 = hashlib.sha256(baseline).hexdigest()
    if baseline_sha256 != MAMMILLARY_SOURCE_LABELS_SHA256:
        raise ValueError(
            "reviewed patch baseline labels changed: "
            f"expected {MAMMILLARY_SOURCE_LABELS_SHA256}, got {baseline_sha256}"
        )
    dims = tuple(int(value) for value in volume.shape)
    patch, edits, metadata = validate_patch(path, dims, len(baseline), baseline, MAMMILLARY_SOURCE_SHA256)
    if metadata["status"] != "strict" or patch.get("reviewStatus") != "approved":
        raise ValueError(f"reviewed patch is not strict approved metadata: {path}")
    transitions: dict[str, int] = {}
    for index, label in edits:
        if label not in (39, 40):
            raise ValueError(f"invalid mammillary-body run in {path}")
        old = int(baseline[index])
        key = f"{old}->{label}"
        transitions[key] = transitions.get(key, 0) + 1
        baseline[index] = label
    edit_count = len(edits)
    expected = {"0->39": 316, "0->40": 426, "27->39": 17, "33->39": 228, "33->40": 303}
    if transitions != expected:
        raise ValueError(f"reviewed patch source transitions changed: {transitions}")
    # Construct provenance before mutation too: an invalid report path must
    # not cause a late exception after the caller-owned volume has changed.
    audit = {
        "path": str(path.relative_to(ROOT)),
        "workflowMetadataVersion": patch.get("workflowMetadataVersion"),
        "workflowMetadataStatus": metadata["status"],
        "targetSide": patch.get("targetSide"),
        "evidence": patch.get("evidence"),
        "confidence": patch.get("confidence"),
        "targetStructures": patch.get("targetStructures"),
        "sliceRanges": patch.get("sliceRanges"),
        "changeSummary": patch.get("changeSummary"),
        "review": patch.get("review"),
        "pullRequest": patch.get("review", {}).get("pullRequest"),
        "editCount": edit_count,
        "transitions": transitions,
    }
    volume[...] = np.frombuffer(baseline, dtype=np.uint8).reshape(dims, order="F")
    return audit


def apply_approved_ventricle_patch(volume: np.ndarray, path: Path) -> dict[str, object]:
    """Apply the narrowly approved 33-voxel ventricle repair after mammillary labels."""

    baseline = bytearray(np.asarray(volume, dtype=np.uint8).tobytes(order="F"))
    baseline_sha256 = hashlib.sha256(baseline).hexdigest()
    if baseline_sha256 != VENTRICLE_SOURCE_LABELS_SHA256:
        raise ValueError(
            "ventricle repair baseline labels changed: "
            f"expected {VENTRICLE_SOURCE_LABELS_SHA256}, got {baseline_sha256}"
        )
    dims = tuple(int(value) for value in volume.shape)
    patch, edits, metadata = validate_patch(
        path, dims, len(baseline), baseline, VENTRICLE_SOURCE_COMPRESSED_SHA256
    )
    if metadata["status"] != "strict" or patch.get("reviewStatus") != "approved":
        raise ValueError(f"ventricle repair patch is not strict approved metadata: {path}")

    transitions: dict[str, int] = {}
    for index, label in edits:
        if label not in (23, 24, 25):
            raise ValueError(f"invalid ventricle label in {path}: {label}")
        old = int(baseline[index])
        if old != 0:
            raise ValueError(f"ventricle repair must be exactly 0->{label}, got {old}->{label}")
        key = f"{old}->{label}"
        transitions[key] = transitions.get(key, 0) + 1
        baseline[index] = label

    expected = {"0->23": 14, "0->24": 15, "0->25": 4}
    if transitions != expected:
        raise ValueError(f"ventricle repair source transitions changed: {transitions}")
    audit = {
        "path": str(path.relative_to(ROOT)),
        "workflowMetadataVersion": patch.get("workflowMetadataVersion"),
        "workflowMetadataStatus": metadata["status"],
        "targetSide": patch.get("targetSide"),
        "evidence": patch.get("evidence"),
        "confidence": patch.get("confidence"),
        "targetStructures": patch.get("targetStructures"),
        "sliceRanges": patch.get("sliceRanges"),
        "changeSummary": patch.get("changeSummary"),
        "review": patch.get("review"),
        "pullRequest": patch.get("review", {}).get("pullRequest"),
        "editCount": len(edits),
        "transitions": transitions,
        "sourceCompressedSha256": VENTRICLE_SOURCE_COMPRESSED_SHA256,
        "sourceRawVoxelSha256": VENTRICLE_SOURCE_LABELS_SHA256,
    }
    volume[...] = np.frombuffer(baseline, dtype=np.uint8).reshape(dims, order="F")
    return audit


def apply_approved_partial_aqueduct_patch(volume: np.ndarray, path: Path) -> dict[str, object]:
    """Prepared adoption stage; deliberately not called by main until integration.

    Only the exact previously reviewed 16-voxel fragment may change. Approval,
    source identity, source values, and exact coordinates are all mandatory.
    """
    if volume.dtype != np.uint8 or volume.shape != (394, 466, 378):
        raise ValueError("partial aqueduct patch requires the exact uint8 BigBrain grid")
    baseline = bytearray(volume.tobytes(order="F"))
    if hashlib.sha256(baseline).hexdigest() != AQUEDUCT_SOURCE_LABELS_SHA256:
        raise ValueError("partial aqueduct baseline labels changed")
    patch, edits, metadata = validate_patch(path, volume.shape, volume.size, baseline, AQUEDUCT_SOURCE_COMPRESSED_SHA256)
    if metadata["status"] != "strict" or patch.get("reviewStatus") != "approved":
        raise ValueError("partial aqueduct patch requires strict approved review")
    expected = [(index, 41) for index in AQUEDUCT_PARTIAL_INDICES]
    if sorted(edits) != expected or any(baseline[index] != 26 for index, _ in edits):
        raise ValueError("partial aqueduct patch must be the exact 16-voxel 26->41 reclassification")
    for index, value in edits:
        baseline[index] = value
    audit = dict(path=str(path), sourceCompressedSha256=AQUEDUCT_SOURCE_COMPRESSED_SHA256,
        sourceRawVoxelSha256=AQUEDUCT_SOURCE_LABELS_SHA256, editCount=16,
        transitions={"26->41": 16}, completeAqueduct=False, expertReviewed=False,
        review=patch["review"], workflowMetadataStatus=metadata["status"])
    volume[...] = np.frombuffer(baseline, dtype=np.uint8).reshape(volume.shape, order="F")
    return audit


def apply_approved_ventricle_classification_patch(volume: np.ndarray, path: Path) -> dict[str, object]:
    """Apply exactly the project-adopted 47-voxel classification correction."""
    if volume.dtype != np.uint8 or volume.shape != (394, 466, 378):
        raise ValueError("ventricle classification requires the exact uint8 BigBrain grid")
    baseline = bytearray(volume.tobytes(order="F"))
    if hashlib.sha256(baseline).hexdigest() != AQUEDUCT_SOURCE_LABELS_SHA256:
        raise ValueError("ventricle classification baseline labels changed")
    patch, edits, metadata = validate_patch(path, volume.shape, volume.size, baseline, AQUEDUCT_SOURCE_COMPRESSED_SHA256)
    if metadata["status"] != "strict" or patch.get("reviewStatus") != "approved":
        raise ValueError("ventricle classification requires strict approved review")
    anterior_indices = (13497429, 13497430, 13497431, 13497432, 13497475, 13497476, 13497477, 13497478, 13497823, 13497824, 13497825, 13497826, 13497869, 13497870, 13497871, 13497872, 13681033, 13681034, 13681035, 13681036, 13681080, 13681081, 13681082, 13681427, 13681428, 13681429, 13681430, 13681473, 13681474, 13681475, 13681476,)
    expected = sorted([(i, 0) for i in anterior_indices] + [(i, 41) for i in AQUEDUCT_PARTIAL_INDICES])
    if sorted(edits) != expected or any(baseline[i] != 26 for i, _ in edits):
        raise ValueError("ventricle classification must be the exact 47-voxel correction")
    for index, value in edits:
        baseline[index] = value
    audit = dict(path=str(path.relative_to(ROOT)), sourceCompressedSha256=AQUEDUCT_SOURCE_COMPRESSED_SHA256,
        sourceRawVoxelSha256=AQUEDUCT_SOURCE_LABELS_SHA256, editCount=47,
        transitions={"26->0":31,"26->41":16}, completeAqueduct=False, expertReviewed=False,
        review=patch["review"], workflowMetadataStatus=metadata["status"])
    volume[...] = np.frombuffer(baseline, dtype=np.uint8).reshape(volume.shape, order="F")
    return audit


CALLOSUM_SOURCE_COMPRESSED_SHA256 = "930eaaed7eed8782b1b162f3aa5c59c2428f4062d0d2da3a9a1cb563f49b7db7"
CALLOSUM_SOURCE_LABELS_SHA256 = "261beb616856653d4d7acd2d411a98f1435eb6beab8b91a2b8ac7b5642909d18"
CALLOSUM_REPAIR_INDICES_SHA256 = "3374e25c75c68b4a1b0b305655f962efc043a07cc7e9c3d1580fb8c0d4997eed"


def apply_approved_callosal_local_patch(volume: np.ndarray, path: Path) -> dict[str, object]:
    """Remove only 1,605 specifically image-reviewed non-callosal voxels."""
    if volume.dtype != np.uint8 or volume.shape != (394, 466, 378):
        raise ValueError("callosal repair requires the exact uint8 BigBrain grid")
    baseline = bytearray(volume.tobytes(order="F"))
    if hashlib.sha256(baseline).hexdigest() != CALLOSUM_SOURCE_LABELS_SHA256:
        raise ValueError("callosal repair baseline labels changed")
    patch, edits, metadata = validate_patch(path, volume.shape, volume.size, baseline, CALLOSUM_SOURCE_COMPRESSED_SHA256)
    if metadata["status"] != "strict" or patch.get("reviewStatus") != "approved":
        raise ValueError("callosal repair requires strict approved review")
    indices = np.asarray(sorted(i for i, _ in edits), dtype='<u4')
    if (len(edits) != 1605 or hashlib.sha256(indices.tobytes()).hexdigest() != CALLOSUM_REPAIR_INDICES_SHA256
            or any(value != 0 or baseline[index] != 30 for index, value in edits)):
        raise ValueError("callosal repair must be the exact 1605-voxel 30->0 exclusion")
    for index, value in edits:
        baseline[index] = value
    # Construct the complete audit before committing edits, including path
    # conversion which may fail independently of otherwise valid voxels.
    audit = dict(path=str(path.relative_to(ROOT)), sourceCompressedSha256=CALLOSUM_SOURCE_COMPRESSED_SHA256,
        sourceRawVoxelSha256=CALLOSUM_SOURCE_LABELS_SHA256, editCount=1605,
        indicesSha256=CALLOSUM_REPAIR_INDICES_SHA256, transitions={"30->0":1605},
        completeCallosum=False, expertReviewed=False, labelStatus="image-guided candidate",
        review=patch["review"], workflowMetadataStatus=metadata["status"])
    volume[...] = np.frombuffer(baseline, dtype=np.uint8).reshape(volume.shape, order="F")
    return audit


CALLOSUM_FOLLOWUP_SOURCE_SHA256 = "5348b7650a3ba28c95a00407d62cf4054fb0c670a62de717f2c572f66a51c9a3"
CALLOSUM_FOLLOWUP_RAW_SHA256 = "35b2a2bf42c0f045141ea51c2adf66d9daea99fcf851a6404133a52b8cbde734"
CALLOSUM_FOLLOWUP_INDICES_SHA256 = "88da382e9f7ea296be43c4c31530ac392510d20cb851c74e172316d26f7d5f80"


def apply_approved_callosal_followup_patch(volume: np.ndarray, path: Path) -> dict[str, object]:
    """Apply only the additional 1,596 reviewed exclusions, after the first repair."""
    if volume.dtype != np.uint8 or volume.shape != (394, 466, 378):
        raise ValueError("callosal follow-up requires the exact uint8 BigBrain grid")
    baseline = bytearray(volume.tobytes(order="F"))
    if hashlib.sha256(baseline).hexdigest() != CALLOSUM_FOLLOWUP_RAW_SHA256:
        raise ValueError("callosal follow-up baseline changed")
    patch, edits, metadata = validate_patch(path, volume.shape, volume.size, baseline, CALLOSUM_FOLLOWUP_SOURCE_SHA256)
    if metadata["status"] != "strict" or patch.get("reviewStatus") != "approved":
        raise ValueError("callosal follow-up requires strict approved review")
    indices = np.asarray(sorted(i for i, _ in edits), dtype='<u4')
    if (len(edits) != 1596 or hashlib.sha256(indices.tobytes()).hexdigest() != CALLOSUM_FOLLOWUP_INDICES_SHA256
            or any(value != 0 or baseline[index] != 30 for index, value in edits)):
        raise ValueError("callosal follow-up must be the exact 1596-voxel 30->0 exclusion")
    for index, value in edits:
        baseline[index] = value
    audit = dict(path=str(path.relative_to(ROOT)), sourceCompressedSha256=CALLOSUM_FOLLOWUP_SOURCE_SHA256,
        sourceRawVoxelSha256=CALLOSUM_FOLLOWUP_RAW_SHA256, editCount=1596,
        indicesSha256=CALLOSUM_FOLLOWUP_INDICES_SHA256, transitions={"30->0":1596},
        completeCallosum=False, expertReviewed=False, labelStatus="image-guided candidate",
        review=patch["review"], workflowMetadataStatus=metadata["status"])
    # Include every validation and provenance operation before caller-visible mutation.
    volume[...] = np.frombuffer(baseline, dtype=np.uint8).reshape(volume.shape, order="F")
    return audit


CALLOSUM_INFERIOR_SOURCE_SHA256 = "8cc65edf36e1e3a420168bfb663d6440418dd67189808263d11c180c4b403d16"
CALLOSUM_INFERIOR_RAW_SHA256 = "3c9d959acbdb67b7603ed7f2f105d7c333f0f89facc7e637f16b5fb740a16cd5"
CALLOSUM_INFERIOR_INDICES_SHA256 = "6a4b7677801edf90d45a3b43a409bbe379c13035fe5d99a1e412e8e49b677675"


def apply_approved_callosal_inferior_patch(volume: np.ndarray, path: Path) -> dict[str, object]:
    """Exclude the fixed inferior 2,160-voxel island, without calling it fornix."""
    if volume.dtype != np.uint8 or volume.shape != (394, 466, 378):
        raise ValueError("callosal inferior repair requires the exact uint8 BigBrain grid")
    baseline = bytearray(volume.tobytes(order="F"))
    if hashlib.sha256(baseline).hexdigest() != CALLOSUM_INFERIOR_RAW_SHA256:
        raise ValueError("callosal inferior baseline changed")
    patch, edits, metadata = validate_patch(path, volume.shape, volume.size, baseline, CALLOSUM_INFERIOR_SOURCE_SHA256)
    if metadata["status"] != "strict" or patch.get("reviewStatus") != "approved":
        raise ValueError("callosal inferior repair requires strict approved review")
    indices = np.asarray(sorted(i for i, _ in edits), dtype='<u4')
    if (len(edits) != 2160 or hashlib.sha256(indices.tobytes()).hexdigest() != CALLOSUM_INFERIOR_INDICES_SHA256
            or any(value != 0 or baseline[index] != 30 for index, value in edits)):
        raise ValueError("callosal inferior repair must be the exact 2160-voxel 30->0 exclusion")
    for index, value in edits:
        baseline[index] = value
    audit = dict(path=str(path.relative_to(ROOT)), sourceCompressedSha256=CALLOSUM_INFERIOR_SOURCE_SHA256,
        sourceRawVoxelSha256=CALLOSUM_INFERIOR_RAW_SHA256, editCount=2160,
        indicesSha256=CALLOSUM_INFERIOR_INDICES_SHA256, transitions={"30->0":2160},
        completeCallosum=False, completeFornix=False, expertReviewed=False,
        labelStatus="image-guided candidate", review=patch["review"], workflowMetadataStatus=metadata["status"])
    volume[...] = np.frombuffer(baseline, dtype=np.uint8).reshape(volume.shape, order="F")
    return audit


def load_nifti_entry(path: Path) -> nib.Nifti1Image:
    import nibabel as nib
    from build_bigbrain_manual_seg import extract_zip_entry

    return nib.Nifti1Image.from_bytes(extract_zip_entry(path))


def dice(a: np.ndarray, b: np.ndarray) -> float:
    denominator = int(a.sum()) + int(b.sum())
    return 2.0 * float(np.logical_and(a, b).sum()) / denominator if denominator else 0.0


def resample_mask(mask: np.ndarray, source: nib.Nifti1Image, target: nib.Nifti1Image) -> np.ndarray:
    import nibabel as nib
    from nibabel.processing import resample_from_to

    image = nib.Nifti1Image(mask.astype(np.uint8), source.affine)
    return np.asarray(resample_from_to(image, (target.shape, target.affine), order=0).dataobj) > 0


def atlas_white_matter_candidates(
    cerebra: np.ndarray,
    wm_probability: np.ndarray,
    affine: np.ndarray,
    *,
    preserve_nuclear_exclusions: bool = True,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Create conservative CC/internal-capsule candidates in the 1 mm atlas grid."""
    from scipy import ndimage

    # Distances below are voxel distances interpreted as millimetres, and the
    # coordinate calculation assumes axis-aligned world x/y/z. Reject grids
    # that would silently invalidate either assumption.
    if cerebra.ndim != 3 or wm_probability.shape != cerebra.shape:
        raise ValueError("white-matter candidate grids must be matching 3-D arrays")
    if affine.shape != (4, 4) or not np.isfinite(affine).all():
        raise ValueError("white-matter candidates require a finite 4x4 affine")
    if (not np.allclose(affine[:3, :3], np.diag(np.diag(affine[:3, :3])), atol=1e-6, rtol=0)
            or not np.allclose(np.abs(np.diag(affine[:3, :3])), 1, atol=1e-6, rtol=0)
            or not np.allclose(affine[3], [0, 0, 0, 1], atol=1e-6, rtol=0)):
        raise ValueError("white-matter candidates require an axis-aligned 1 mm atlas grid")

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
    # Closing can refill holes deliberately excluded as neighbouring nuclei.
    # Preserve that anatomical exclusion after morphology, not only before it.
    if preserve_nuclear_exclusions:
        capsule &= ~medial & ~lateral
    left_capsule = capsule & (x < 0)
    right_capsule = capsule & (x > 0)
    return callosum, left_capsule, right_capsule


def main() -> None:
    from build_bigbrain_manual_seg import write_browser_volume, require_legacy_reproduction

    parser = argparse.ArgumentParser()
    parser.add_argument("image_entry", type=Path)
    parser.add_argument("manual_entry", type=Path)
    parser.add_argument("--cerebra", type=Path, required=True)
    parser.add_argument("--wm-prob", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--legacy-grid-reproduction", action="store_true", help="Acknowledge known manual/image space mismatch; research output inside new work/ directory only")
    args = parser.parse_args()
    args.output_dir = require_legacy_reproduction(args.output_dir, args.legacy_grid_reproduction)

    import nibabel as nib
    from nibabel.processing import resample_from_to

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
        cerebra, wm_probability, cerebra_nii.affine,
        # Reproduce the pinned pre-review baseline. The stricter morphology
        # remains an unadopted experiment (INTERNAL_CAPSULE_REPAIR.md); changing
        # it here would invalidate both reviewed patch inputs. Once reviewed,
        # apply the bounded capsule correction as a new pinned patch stage.
        preserve_nuclear_exclusions=False,
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

    reviewed_patch_audit = apply_approved_patch(practical, MAMMILLARY_PATCH)
    ventricle_patch_audit = apply_approved_ventricle_patch(practical, VENTRICLE_PATCH)
    classification_patch_audit = apply_approved_ventricle_classification_patch(practical,
        ROOT / "segmentation-patches/review/ventricle-classification-project-review-2026-09-06.json")
    callosal_patch_audit = apply_approved_callosal_local_patch(practical,
        ROOT / "segmentation-patches/review/callosum-local-exclusion-project-review-2026-09-06.json")
    callosal_followup_audit = apply_approved_callosal_followup_patch(practical,
        ROOT / "segmentation-patches/review/callosum-cortical-followup-project-review-2026-09-06.json")
    callosal_inferior_audit = apply_approved_callosal_inferior_patch(practical,
        ROOT / "segmentation-patches/review/callosum-inferior-exclusion-project-review-2026-09-06.json")

    if not np.array_equal(practical[manual > 0], manual[manual > 0]):
        raise ValueError("official manual labels were modified")
    published_ids = list(range(1, 36)) + [39, 40, 41]
    counts = {str(label_id): int((practical == label_id).sum()) for label_id in published_ids}
    if any(counts[str(label_id)] == 0 for label_id in PRACTICAL_LABELS):
        raise ValueError(f"one or more practical labels are empty: {counts}")

    args.output_dir.mkdir(parents=True, exist_ok=True)
    output = args.output_dir / "bigbrain-practical-segmentation-icbm500.bin.gz"
    validation_output = args.output_dir / "bigbrain-practical-segmentation-icbm500-validation.json"
    write_browser_volume(output, b"BBS1", practical)
    validation = {
        "spatialRegistrationStatus": "legacy-grid-only; known nonlinear image/manual history mismatch",
        "spatialAlignmentValidated": False,
        "shape": list(practical.shape),
        "voxelSizeMm": list(map(float, manual_nii.header.get_zooms()[:3])),
        "officialManualIds": list(range(1, 23)),
        "officialLabelsPreserved": True,
        "atlasDerivedIds": list(range(23, 30)) + [33, 34, 35],
        "imageGuidedCandidateIds": [30, 31, 32, 41],
        "projectReviewedPartialIds": [41],
        "imageGuidedReviewedIds": [39, 40],
        "labelNames": {str(key): value for key, value in PRACTICAL_LABELS.items()},
        "labelCounts": counts,
        "atlasToManualDiceAudit": overlap_audit,
        "ventricleLabelsRestrictedToEmptySpace": True,
        "ventricleTissueOverlap": float((~empty_space[np.isin(practical, [23, 24, 25, 26, 41])]).mean()),
        "coordinatePolicy": "historical reproduction only: exact 0.5 mm grid and CerebrA overlap checks do not establish image/manual nonlinear spatial alignment",
        "reviewedPatchAudit": reviewed_patch_audit,
        "ventriclePatchAudit": ventricle_patch_audit,
        "ventricleClassificationPatchAudit": classification_patch_audit,
        "callosalLocalPatchAudit": callosal_patch_audit,
        "callosalFollowupPatchAudit": callosal_followup_audit,
        "callosalInferiorPatchAudit": callosal_inferior_audit,
        "reviewedPatchAudits": [reviewed_patch_audit, ventricle_patch_audit, classification_patch_audit, callosal_patch_audit, callosal_followup_audit, callosal_inferior_audit],
        "preVentricleCompressedSha256": VENTRICLE_SOURCE_COMPRESSED_SHA256,
        "preVentricleRawVoxelSha256": VENTRICLE_SOURCE_LABELS_SHA256,
        "preClassificationCompressedSha256": AQUEDUCT_SOURCE_COMPRESSED_SHA256,
        "preCallosalRepairCompressedSha256": CALLOSUM_SOURCE_COMPRESSED_SHA256,
        "preCallosalFollowupCompressedSha256": CALLOSUM_FOLLOWUP_SOURCE_SHA256,
        "preCallosalInferiorCompressedSha256": CALLOSUM_INFERIOR_SOURCE_SHA256,
        "rawVoxelSha256": hashlib.sha256(practical.tobytes(order='F')).hexdigest(),
        "teachingPolicy": "IDs 23-35 are provisional teaching overlays; the 33-voxel ventricle repair is project-reviewed under PR #14 and is not expert-reviewed or research ground truth; IDs 39-40 are project-reviewed image-guided teaching labels, not research ground truth. ID41 is only a partial aqueduct candidate; the 47-voxel classification correction is AI-assisted project adoption under PR #27, not expert review. ID30 remains a provisional candidate after the 1605-voxel, 1596-voxel and inferior 2160-voxel exclusions; remaining cingulum/fornix separation is incomplete and no complete callosal or fornix boundary is claimed.",
    }
    validation_output.write_text(json.dumps(validation, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"output": str(output), "validation": str(validation_output), **validation}, ensure_ascii=False))


if __name__ == "__main__":
    main()
