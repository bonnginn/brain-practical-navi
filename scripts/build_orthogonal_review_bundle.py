#!/usr/bin/env python3
"""Build a deterministic, local-only orthogonal review evidence bundle.

The bundle is intentionally an evidence pack, not a segmentation editor or an
anatomical decision.  It pairs the pinned BBV1 BigBrain browser image with the
pinned BBS1 teaching labels, renders a small raw-image crop with 2-D boundary
outlines for IDs 27, 33, 39 and 40, and records the exact source/output pixel
digests.  No label bytes are written and no candidate IDs 36--38 are derived,
interpolated, thresholded, or emitted.
"""

from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import os
import struct
from pathlib import Path
from typing import Iterable

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_IMAGE = ROOT / "public/atlas/bigbrain-icbm500.bin.gz"
DEFAULT_LABELS = ROOT / "public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz"
REVIEW_ROOT = ROOT / "work/anatomy-review"
DEFAULT_OUTPUT = REVIEW_ROOT / "orthogonal-review-bundle-v3"

MAGIC_IMAGE = b"BBV1"
MAGIC_LABELS = b"BBS1"
EXPECTED_DIMS = (394, 466, 378)
EXPECTED_VOXEL_SIZE_MM = (0.5, 0.5, 0.5)
EXPECTED_IMAGE_SHA256 = "c4b69975f0dece2512adf3bcae690226492cfa66ded38380b3b94aa8dba52746"
EXPECTED_LABELS_SHA256 = "6744e7c0184436789f42c7107d05ead93cf36703bb36372df5f63b82a38f7b56"
EXPECTED_COUNTS = {27: 254786, 33: 8482, 39: 561, 40: 729}
REVIEW_LABEL_IDS = (33, 39, 40)
CONTEXT_LABEL_IDS = (27,)
OVERLAY_LABEL_IDS = (27, 33, 39, 40)
MAMMILLARY_LABEL_IDS = (39, 40)
FORBIDDEN_PROPOSED_IDS = (36, 37, 38)
AXES = ("x", "y", "z")
AXIS_NUMBER = {axis: index for index, axis in enumerate(AXES)}
PLANE_NAMES = {"x": "sagittal", "y": "coronal", "z": "horizontal"}
OUTLINE_COLORS = {
    27: (91, 185, 119),
    33: (241, 173, 66),
    39: (76, 166, 240),
    40: (226, 101, 174),
}
EXPECTED_IMAGE_PATH = "public/atlas/bigbrain-icbm500.bin.gz"
EXPECTED_LABELS_PATH = "public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz"
EXPECTED_CROP = {
    "sourceLabelIds": [33, 39, 40],
    "overlayLabelIds": [27, 33, 39, 40],
    "contextOnlyLabelIds": [27],
    "contextOnlyScope": "within-crop-only",
    "marginVoxels": 4,
    "min": [159, 242, 82],
    "max": [232, 306, 126],
    "size": [74, 65, 45],
}
REVIEW_PURPOSE = "Local orthogonal raw-image evidence for later human review; not an anatomical validation or expert-approved segmentation."
REVIEW_FIXED = {
    "status": "unreviewed",
    "purpose": REVIEW_PURPOSE,
    "textOverlay": False,
    "labelMutation": False,
    "proposedIdsEmitted": [],
    "contextOnlyLabelIds": [27],
}
DEFINITIONS_FIXED = {
    "rawPixelSha256": "SHA-256 of the oriented uint8 raw-image crop pixels in row-major order before color outlines.",
    "outputPixelSha256": "SHA-256 of the oriented RGB uint8 output pixels in row-major order; PNG metadata/text are not used.",
    "pngFileSha256": "SHA-256 of the complete deterministic PNG file bytes.",
    "outline": "Only 2-D boundary pixels of the listed stored labels are colored; interior pixels remain the raw image.",
    "canonicalSections": "IDs 39/40 include every occupied X/Y/Z index plus the immediately outside endpoint where in bounds; ID 33 includes every occupied X/Y/Z index and no inferred section.",
    "coordinates": "Array coordinates are x,y,z in the exact BBS1/BBV1 Fortran grid; plane orientation follows the existing canvas convention.",
    "limitations": "This bundle does not identify ID 33 anatomy, split ID 33, generate IDs 36-38, or establish expert/ground-truth boundaries.",
}
PIXEL_TO_VOXEL_FIXED = {
    "arrayOrder": "x,y,z",
    "pixelOrigin": "row=0,column=0 at the top-left of the crop PNG",
    "planes": {
        "x": {"plane": "sagittal", "slice": "x=sliceIndex", "row": "z=crop.max[2]-row", "column": "y=crop.min[1]+column"},
        "y": {"plane": "coronal", "slice": "y=sliceIndex", "row": "z=crop.max[2]-row", "column": "x=crop.min[0]+column"},
        "z": {"plane": "horizontal", "slice": "z=sliceIndex", "row": "y=crop.max[1]-row", "column": "x=crop.min[0]+column"},
    },
}
ANCHOR_SLICE_INDICES = {"x": 163, "y": 246, "z": 86}
EXPECTED_FRAME_COUNT = 161
EXPECTED_OUTPUT_ENTRIES = {"manifest.json", "frames"}
ANCHOR_PIXEL_SAMPLES = {
    "x": ((1, 7), (11, 29), (31, 61)),
    "y": ((2, 11), (17, 37), (39, 68)),
    "z": ((3, 13), (27, 41), (59, 70)),
}


class BundleError(ValueError):
    """The pinned input or bundle contract is invalid."""


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _shape_tuple(values: Iterable[int]) -> tuple[int, int, int]:
    return tuple(int(value) for value in values)  # type: ignore[return-value]


def read_browser_volume(
    path: Path,
    expected_magic: bytes,
    expected_sha256: str,
) -> tuple[str, tuple[int, int, int], np.ndarray]:
    """Read and strictly validate one browser volume without changing it."""

    try:
        compressed = path.read_bytes()
    except OSError as exc:
        raise BundleError(f"cannot read {path}: {exc}") from exc
    digest = sha256_bytes(compressed)
    if digest != expected_sha256:
        raise BundleError(f"{path}: SHA-256 {digest} does not match pinned {expected_sha256}")
    try:
        payload = gzip.decompress(compressed)
    except OSError as exc:
        raise BundleError(f"{path}: invalid gzip payload") from exc
    if len(payload) < 10 or payload[:4] != expected_magic:
        raise BundleError(f"{path}: expected {expected_magic.decode('ascii')} header")
    dims = struct.unpack_from("<3H", payload, 4)
    if dims != EXPECTED_DIMS:
        raise BundleError(f"{path}: dims {dims} do not match {EXPECTED_DIMS}")
    expected_bytes = int(np.prod(dims))
    if len(payload) != 10 + expected_bytes:
        raise BundleError(f"{path}: payload length {len(payload)} does not match {expected_bytes}")
    values = np.frombuffer(payload, dtype=np.uint8, count=expected_bytes, offset=10)
    # The browser writer and all existing audits use the exact x,y,z Fortran
    # grid.  Copying keeps the source mmap-like buffer read-only and untouched.
    return digest, dims, values.reshape(dims, order="F").copy()


def _bbox(indices: np.ndarray) -> dict[str, object]:
    points = np.argwhere(indices)
    if not len(points):
        raise BundleError("cannot calculate a bbox for an empty label")
    minimum = points.min(axis=0).astype(int).tolist()
    maximum = points.max(axis=0).astype(int).tolist()
    return {
        "min": minimum,
        "max": maximum,
        "size": [maximum[index] - minimum[index] + 1 for index in range(3)],
    }


def _occupied_slices(mask: np.ndarray, axis: str) -> list[int]:
    axis_number = AXIS_NUMBER[axis]
    counts = np.count_nonzero(mask, axis=tuple(index for index in range(3) if index != axis_number))
    return [int(index) for index in np.flatnonzero(counts)]


def _slice_counts(mask: np.ndarray, axis: str) -> dict[int, int]:
    axis_number = AXIS_NUMBER[axis]
    counts = np.count_nonzero(mask, axis=tuple(index for index in range(3) if index != axis_number))
    return {int(index): int(count) for index, count in enumerate(counts) if count}


def _canonical_sections(mask: np.ndarray, dims: tuple[int, int, int], include_outside: bool) -> dict[str, dict[str, object]]:
    result: dict[str, dict[str, object]] = {}
    for axis in AXES:
        occupied = _occupied_slices(mask, axis)
        review = list(occupied)
        outside: list[int] = []
        if include_outside and occupied:
            lower = max(0, occupied[0] - 1)
            upper = min(dims[AXIS_NUMBER[axis]] - 1, occupied[-1] + 1)
            outside = [value for value in (lower, upper) if value not in occupied]
            review = sorted(set(review + outside))
        counts = _slice_counts(mask, axis)
        result[axis] = {
            "axis": axis,
            "plane": PLANE_NAMES[axis],
            "occupiedSliceIndices": occupied,
            "outsideEndpointSliceIndices": sorted(outside),
            "canonicalSliceIndices": review,
            "sliceVoxelCounts": {str(index): counts[index] for index in sorted(counts)},
        }
    return result


def _target_crop(labels: np.ndarray, margin: int = 4) -> dict[str, object]:
    # The crop follows the optic/mammillary review region, not the full
    # brainstem.  ID27 remains an overlay when it occurs in that region.
    target = np.isin(labels, [33, 39, 40])
    points = np.argwhere(target)
    if not len(points):
        raise BundleError("IDs 33/39/40 are absent; cannot define review crop")
    minimum = np.maximum(points.min(axis=0) - margin, 0).astype(int)
    maximum = np.minimum(points.max(axis=0) + margin, np.asarray(labels.shape) - 1).astype(int)
    return {
        "sourceLabelIds": [33, 39, 40],
        "overlayLabelIds": list(OVERLAY_LABEL_IDS),
        "contextOnlyLabelIds": list(CONTEXT_LABEL_IDS),
        "contextOnlyScope": "within-crop-only",
        "marginVoxels": margin,
        "min": minimum.tolist(),
        "max": maximum.tolist(),
        "size": (maximum - minimum + 1).tolist(),
    }


def _crop_slices(crop: dict[str, object]) -> tuple[slice, slice, slice]:
    minimum = [int(value) for value in crop["min"]]  # type: ignore[index]
    maximum = [int(value) for value in crop["max"]]  # type: ignore[index]
    return tuple(slice(lo, hi + 1) for lo, hi in zip(minimum, maximum))  # type: ignore[return-value]


def _four_corner_anchors(crop: dict[str, object]) -> dict[str, object]:
    """Return fixed top-left/top-right/bottom-left/bottom-right voxel anchors."""

    minimum = [int(value) for value in crop["min"]]  # type: ignore[index]
    maximum = [int(value) for value in crop["max"]]  # type: ignore[index]
    result: dict[str, object] = {}
    for axis in AXES:
        slice_index = ANCHOR_SLICE_INDICES[axis]
        if axis == "x":
            voxels = (
                [slice_index, minimum[1], maximum[2]],
                [slice_index, maximum[1], maximum[2]],
                [slice_index, minimum[1], minimum[2]],
                [slice_index, maximum[1], minimum[2]],
            )
        elif axis == "y":
            voxels = (
                [minimum[0], slice_index, maximum[2]],
                [maximum[0], slice_index, maximum[2]],
                [minimum[0], slice_index, minimum[2]],
                [maximum[0], slice_index, minimum[2]],
            )
        else:
            voxels = (
                [minimum[0], maximum[1], slice_index],
                [maximum[0], maximum[1], slice_index],
                [minimum[0], minimum[1], slice_index],
                [maximum[0], minimum[1], slice_index],
            )
        result[axis] = {
            "sliceIndex": slice_index,
            "corners": [
                {"name": name, "row": row, "column": column, "voxel": voxel}
                for name, row, column, voxel in zip(
                    ("top-left", "top-right", "bottom-left", "bottom-right"),
                    (0, 0, int(crop["size"][2 if axis == "x" else 2 if axis == "y" else 1]) - 1, int(crop["size"][2 if axis == "x" else 2 if axis == "y" else 1]) - 1),
                    (0, int(crop["size"][1 if axis == "x" else 0]) - 1, 0, int(crop["size"][1 if axis == "x" else 0]) - 1),
                    voxels,
                )
            ],
        }
    return result


def _oriented_plane(values: np.ndarray, axis: str, slice_index: int) -> np.ndarray:
    """Return a deterministic 2-D x/y image in the existing canvas convention."""

    if axis == "x":
        return values[slice_index, :, :].T[::-1, :]
    if axis == "y":
        return values[:, slice_index, :].T[::-1, :]
    if axis == "z":
        return values[:, :, slice_index].T[::-1, :]
    raise BundleError(f"unknown axis {axis}")


def _oriented_crop(values: np.ndarray, axis: str, slice_index: int, crop: dict[str, object]) -> np.ndarray:
    minimum = [int(value) for value in crop["min"]]  # type: ignore[index]
    maximum = [int(value) for value in crop["max"]]  # type: ignore[index]
    if axis == "x":
        return values[slice_index, minimum[1] : maximum[1] + 1, minimum[2] : maximum[2] + 1].T[::-1, :]
    if axis == "y":
        return values[minimum[0] : maximum[0] + 1, slice_index, minimum[2] : maximum[2] + 1].T[::-1, :]
    if axis == "z":
        return values[minimum[0] : maximum[0] + 1, minimum[1] : maximum[1] + 1, slice_index].T[::-1, :]
    raise BundleError(f"unknown axis {axis}")


def _outline(mask: np.ndarray) -> np.ndarray:
    """Return only 2-D boundary pixels; the source image stays visible inside."""

    edge = mask.copy()
    edge[:-1, :] &= mask[1:, :]
    edge[1:, :] &= mask[:-1, :]
    edge[:, :-1] &= mask[:, 1:]
    edge[:, 1:] &= mask[:, :-1]
    return mask & ~edge


def _render_frame(
    image: np.ndarray,
    labels: np.ndarray,
    axis: str,
    slice_index: int,
    crop: dict[str, object],
    output_path: Path,
) -> dict[str, object]:
    raw = _oriented_crop(image, axis, slice_index, crop).astype(np.uint8, copy=False)
    raw_sha256 = sha256_bytes(raw.tobytes(order="C"))
    rgb = np.repeat(raw[:, :, None], 3, axis=2)
    slice_labels = _oriented_crop(labels, axis, slice_index, crop)
    pixel_counts: dict[str, int] = {}
    full_slice_counts: dict[str, int] = {}
    for label_id in OVERLAY_LABEL_IDS:
        mask = slice_labels == label_id
        pixel_counts[str(label_id)] = int(mask.sum())
        full_slice_counts[str(label_id)] = int((_oriented_plane(labels == label_id, axis, slice_index)).sum())
        edge = _outline(mask)
        rgb[edge] = OUTLINE_COLORS[label_id]
    output_pixels = np.ascontiguousarray(rgb, dtype=np.uint8)
    output_sha256 = sha256_bytes(output_pixels.tobytes(order="C"))
    output_path.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(output_pixels, mode="RGB").save(
        output_path,
        format="PNG",
        optimize=False,
        compress_level=9,
    )
    png_file_sha256 = sha256_bytes(output_path.read_bytes())
    return {
        "axis": axis,
        "plane": PLANE_NAMES[axis],
        "sliceIndex": int(slice_index),
        "crop": {"min": crop["min"], "max": crop["max"], "size": crop["size"]},
        "width": int(output_pixels.shape[1]),
        "height": int(output_pixels.shape[0]),
        "rawPixelBytes": int(raw.size),
        "outputPixelBytes": int(output_pixels.size),
        "rawPixelSha256": raw_sha256,
        "outputPixelSha256": output_sha256,
        "pngFileSha256": png_file_sha256,
        "cropVoxelCounts": pixel_counts,
        "fullSliceVoxelCounts": full_slice_counts,
        "path": output_path.name,
        "textOverlay": False,
    }


def _relative_input(path: Path) -> str:
    try:
        return path.resolve().relative_to(ROOT).as_posix()
    except ValueError:
        return path.resolve().as_posix()


def build_bundle(
    image_path: Path = DEFAULT_IMAGE,
    labels_path: Path = DEFAULT_LABELS,
    output_dir: Path = DEFAULT_OUTPUT,
) -> dict[str, object]:
    _prepare_output_dir(output_dir)
    image_digest, image_dims, image = read_browser_volume(
        image_path, MAGIC_IMAGE, EXPECTED_IMAGE_SHA256
    )
    labels_digest, labels_dims, labels = read_browser_volume(
        labels_path, MAGIC_LABELS, EXPECTED_LABELS_SHA256
    )
    if image_dims != labels_dims:
        raise BundleError(f"image/labels dims differ: {image_dims} != {labels_dims}")
    counts = {label_id: int((labels == label_id).sum()) for label_id in OVERLAY_LABEL_IDS}
    for label_id, expected in EXPECTED_COUNTS.items():
        if counts[label_id] != expected:
            raise BundleError(f"ID {label_id} count {counts[label_id]} does not match {expected}")
    if any(int(label_id) in FORBIDDEN_PROPOSED_IDS for label_id in np.unique(labels)):
        raise BundleError("forbidden proposed IDs 36-38 were found in the pinned label source")
    crop = _target_crop(labels)
    _require(crop == EXPECTED_CROP, "source crop does not match the pinned review crop")
    labels_by_id: dict[str, object] = {}
    canonical_by_axis: dict[str, set[int]] = {axis: set() for axis in AXES}
    for label_id in OVERLAY_LABEL_IDS:
        sections = _canonical_sections(labels == label_id, labels.shape, label_id in MAMMILLARY_LABEL_IDS)
        labels_by_id[str(label_id)] = {
            "voxelCount": counts[label_id],
            "bbox": _bbox(labels == label_id),
            "sections": sections,
            "role": "context-only-within-crop" if label_id in CONTEXT_LABEL_IDS else "review-label",
        }
        # ID27 is included as a contextual outline only.  It must not expand
        # the review index set: canonical frames are driven by the mixed optic
        # region (ID33) and the two mammillary labels (IDs39/40).
        if label_id in (33, *MAMMILLARY_LABEL_IDS):
            for axis in AXES:
                canonical_by_axis[axis].update(int(value) for value in sections[axis]["canonicalSliceIndices"])
    frames: list[dict[str, object]] = []
    frames_dir = output_dir / "frames"
    # Rebuilding the same ignored evidence directory must not leave frames
    # from an earlier canonical-index policy behind.
    if frames_dir.exists():
        for stale in frames_dir.glob("*.png"):
            stale.unlink()
    for axis in AXES:
        for slice_index in sorted(canonical_by_axis[axis]):
            frame_name = f"{axis}-{slice_index:03d}.png"
            frames.append(_render_frame(image, labels, axis, slice_index, crop, frames_dir / frame_name))
    _require(len(frames) == EXPECTED_FRAME_COUNT, f"canonical frame count {len(frames)} does not match {EXPECTED_FRAME_COUNT}")
    manifest: dict[str, object] = {
        "format": "brain-practical-orthogonal-review-bundle",
        "version": 3,
        "review": REVIEW_FIXED,
        "inputs": {
            "image": {
                "path": _relative_input(image_path),
                "magic": MAGIC_IMAGE.decode("ascii"),
                "sha256": image_digest,
                "dims": list(image_dims),
                "voxelSizeMm": list(EXPECTED_VOXEL_SIZE_MM),
            },
            "labels": {
                "path": _relative_input(labels_path),
                "magic": MAGIC_LABELS.decode("ascii"),
                "sha256": labels_digest,
                "dims": list(labels_dims),
                "voxelSizeMm": list(EXPECTED_VOXEL_SIZE_MM),
            },
        },
        "crop": crop,
        "labels": labels_by_id,
        "canonicalSections": {
            "mammillaryIds": {
                str(label_id): {
                    axis: labels_by_id[str(label_id)]["sections"][axis]  # type: ignore[index]
                    for axis in AXES
                }
                for label_id in MAMMILLARY_LABEL_IDS
            },
            "opticMixedId33": {
                axis: labels_by_id["33"]["sections"][axis]  # type: ignore[index]
                for axis in AXES
            },
        },
        "frames": frames,
        "coverage": {
            "reviewLabels": list(REVIEW_LABEL_IDS),
            "contextOnlyLabels": list(CONTEXT_LABEL_IDS),
            "mammillaryIdsAllOccupiedAndOutsideEndpoints": True,
            "id33AllOccupiedCanonicalIndices": True,
            "frameCount": len(frames),
            "axes": {axis: sorted(canonical_by_axis[axis]) for axis in AXES},
        },
        "geometry": {
            "pixelToVoxel": PIXEL_TO_VOXEL_FIXED,
            "anchorSliceIndices": ANCHOR_SLICE_INDICES,
            "fourCornerVoxelAnchors": _four_corner_anchors(crop),
        },
        "definitions": DEFINITIONS_FIXED,
    }
    manifest_path = output_dir / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return manifest


def _require(condition: bool, message: str) -> None:
    if not condition:
        raise BundleError(message)


def _require_exact_keys(value: object, expected: Iterable[str], context: str) -> None:
    _require(isinstance(value, dict), f"{context}: expected object")
    actual = set(value.keys())
    expected_set = set(expected)
    _require(actual == expected_set, f"{context}: exact keys mismatch (got {sorted(actual)}, expected {sorted(expected_set)})")


def _require_exact_int(value: object, context: str) -> int:
    _require(type(value) is int, f"{context}: expected integer")
    return int(value)


def _require_exact_int_list(value: object, context: str, length: int | None = None) -> list[int]:
    _require(isinstance(value, list), f"{context}: expected integer list")
    if length is not None:
        _require(len(value) == length, f"{context}: expected list length {length}")
    return [_require_exact_int(item, f"{context}[{index}]") for index, item in enumerate(value)]


def _validate_bbox_integer_schema(value: object, context: str) -> None:
    _require_exact_keys(value, ("min", "max", "size"), context)
    _require_exact_int_list(value["min"], f"{context}.min", 3)
    _require_exact_int_list(value["max"], f"{context}.max", 3)
    _require_exact_int_list(value["size"], f"{context}.size", 3)


def _validate_sections_integer_schema(value: object, context: str) -> None:
    _require_exact_keys(value, AXES, context)
    for axis in AXES:
        section = value[axis]
        _require_exact_keys(section, ("axis", "plane", "occupiedSliceIndices", "outsideEndpointSliceIndices", "canonicalSliceIndices", "sliceVoxelCounts"), f"{context}.{axis}")
        _require_exact_int_list(section["occupiedSliceIndices"], f"{context}.{axis}.occupiedSliceIndices")
        _require_exact_int_list(section["outsideEndpointSliceIndices"], f"{context}.{axis}.outsideEndpointSliceIndices")
        _require_exact_int_list(section["canonicalSliceIndices"], f"{context}.{axis}.canonicalSliceIndices")
        _require(isinstance(section["sliceVoxelCounts"], dict), f"{context}.{axis}.sliceVoxelCounts: expected object")
        for key, count in section["sliceVoxelCounts"].items():
            _require(type(key) is str and key.isdigit(), f"{context}.{axis}.sliceVoxelCounts key must be decimal string")
            _require_exact_int(count, f"{context}.{axis}.sliceVoxelCounts[{key}]")


def _is_fs_link(path: Path) -> bool:
    """Detect symlinks, Windows junctions, and reparse points without following."""

    if path.is_symlink():
        return True
    is_junction = getattr(path, "is_junction", None)
    if callable(is_junction) and is_junction():
        return True
    try:
        attributes = int(path.lstat().st_file_attributes)
    except (AttributeError, FileNotFoundError, OSError):
        attributes = 0
    return bool(attributes & 0x400) if os.name == "nt" else False


def _require_contained_path(path: Path, parent: Path, context: str) -> None:
    _require(not _is_fs_link(path), f"{context}: symlink/junction/reparse point is forbidden")
    parent_resolved = parent.resolve(strict=False)
    resolved = path.resolve(strict=False)
    _require(resolved.parent == parent_resolved, f"{context}: resolved parent containment mismatch")
    _require(resolved.name == path.name, f"{context}: resolved name mismatch")


def _prepare_output_dir(output_dir: Path) -> None:
    """Permit generation only in a dedicated, non-public evidence directory."""

    _require(not _is_fs_link(output_dir), "output directory: symlink/junction/reparse point is forbidden")
    resolved = output_dir.resolve(strict=False)
    _require(resolved.name == DEFAULT_OUTPUT.name, "output directory must be the dedicated orthogonal-review-bundle-v3 directory")
    _require(resolved != ROOT and ROOT / "public" not in resolved.parents, "output directory must not be the repository or public asset tree")
    output_dir.mkdir(parents=True, exist_ok=True)
    _require_contained_path(output_dir, output_dir.parent, "output directory")
    entries = {entry.name for entry in output_dir.iterdir()}
    _require(entries <= EXPECTED_OUTPUT_ENTRIES, "output directory contains unexpected files before generation")
    frames_dir = output_dir / "frames"
    if frames_dir.exists():
        _require_contained_path(frames_dir, output_dir, "output frames directory")
        _require(frames_dir.is_dir(), "output frames entry must be a directory")
        for entry in frames_dir.iterdir():
            _require_contained_path(entry, frames_dir, f"output frame {entry.name}")
            _require(entry.is_file() and entry.suffix == ".png", "output frames directory contains unexpected entries")
    manifest = output_dir / "manifest.json"
    if manifest.exists():
        _require_contained_path(manifest, output_dir, "output manifest")
        _require(manifest.is_file(), "output manifest must be a regular file")


def _validate_bundle_file_set(root: Path, expected_frame_names: set[str] | None = None) -> None:
    _require(not _is_fs_link(root), "bundle root: symlink/junction/reparse point is forbidden")
    _require(root.name == DEFAULT_OUTPUT.name, "bundle must be the dedicated orthogonal-review-bundle-v3 directory")
    _require(root.is_dir(), "bundle root is not a directory")
    root_resolved = root.resolve(strict=False)
    _require(root_resolved.name == root.name, "bundle root resolved name mismatch")
    manifest = root / "manifest.json"
    _require_contained_path(manifest, root, "bundle manifest")
    frames_dir = root / "frames"
    _require_contained_path(frames_dir, root, "bundle frames directory")
    entries = {entry.name for entry in root.iterdir()}
    _require(entries == EXPECTED_OUTPUT_ENTRIES, "bundle root file set must be exactly manifest.json plus frames/")
    _require(frames_dir.is_dir(), "bundle frames directory is missing")
    frame_entries = list(frames_dir.iterdir())
    for entry in frame_entries:
        _require_contained_path(entry, frames_dir, f"bundle frame {entry.name}")
        _require(entry.is_file() and entry.suffix == ".png", "bundle frames contains an unexpected file or subdirectory")
    if expected_frame_names is not None:
        _require({entry.name for entry in frame_entries} == expected_frame_names, "bundle frames file set does not match manifest")


def _expected_frame_pixels(
    image: np.ndarray,
    labels: np.ndarray,
    axis: str,
    slice_index: int,
    crop: dict[str, object],
) -> tuple[np.ndarray, np.ndarray, dict[str, int], dict[str, int]]:
    raw = _oriented_crop(image, axis, slice_index, crop).astype(np.uint8, copy=False)
    rgb = np.repeat(raw[:, :, None], 3, axis=2)
    slice_labels = _oriented_crop(labels, axis, slice_index, crop)
    crop_counts: dict[str, int] = {}
    full_counts: dict[str, int] = {}
    for label_id in OVERLAY_LABEL_IDS:
        mask = slice_labels == label_id
        crop_counts[str(label_id)] = int(mask.sum())
        full_counts[str(label_id)] = int(_oriented_plane(labels == label_id, axis, slice_index).sum())
        rgb[_outline(mask)] = OUTLINE_COLORS[label_id]
    return raw, np.ascontiguousarray(rgb, dtype=np.uint8), crop_counts, full_counts


def _flat_fortran_pixel_value(
    source_flat: np.ndarray,
    dims: tuple[int, int, int],
    axis: str,
    slice_index: int,
    row: int,
    column: int,
    crop: dict[str, object],
) -> int:
    """Map a PNG pixel to the source flat Fortran index independently."""

    minimum = [int(value) for value in crop["min"]]  # type: ignore[index]
    maximum = [int(value) for value in crop["max"]]  # type: ignore[index]
    if axis == "x":
        x, y, z = slice_index, minimum[1] + column, maximum[2] - row
    elif axis == "y":
        x, y, z = minimum[0] + column, slice_index, maximum[2] - row
    elif axis == "z":
        x, y, z = minimum[0] + column, maximum[1] - row, slice_index
    else:
        raise BundleError(f"flat Fortran mapping: unknown axis {axis}")
    _require(0 <= x < dims[0] and 0 <= y < dims[1] and 0 <= z < dims[2], "flat Fortran mapping voxel is outside source")
    flat_index = x + dims[0] * (y + dims[1] * z)
    return int(source_flat[flat_index])


def _flat_fortran_crop(image: np.ndarray, axis: str, slice_index: int, crop: dict[str, object]) -> np.ndarray:
    size = [int(value) for value in crop["size"]]  # type: ignore[index]
    height = size[2] if axis in ("x", "y") else size[1]
    width = size[1] if axis == "x" else size[0]
    source_flat = image.ravel(order="F")
    result = np.empty((height, width), dtype=np.uint8)
    for row in range(height):
        for column in range(width):
            result[row, column] = _flat_fortran_pixel_value(source_flat, image.shape, axis, slice_index, row, column, crop)
    return result


def _validate_flat_anchor_pixels(image: np.ndarray, crop: dict[str, object]) -> None:
    source_flat = image.ravel(order="F")
    for axis in AXES:
        slice_index = ANCHOR_SLICE_INDICES[axis]
        oriented = _oriented_crop(image, axis, slice_index, crop)
        for row, column in ANCHOR_PIXEL_SAMPLES[axis]:
            direct = _flat_fortran_pixel_value(source_flat, image.shape, axis, slice_index, row, column, crop)
            _require(int(oriented[row, column]) == direct, f"flat Fortran anchor mismatch {axis} {slice_index} {row},{column}")


def _verify_png_frame(
    frame: dict[str, object],
    frame_path: Path,
    image: np.ndarray,
    labels: np.ndarray,
    crop: dict[str, object],
) -> None:
    try:
        with Image.open(frame_path) as png_image:
            _require(png_image.mode == "RGB", f"{frame_path}: expected RGB PNG")
            _require(dict(png_image.info) == {}, f"{frame_path}: PNG metadata must be empty")
            pixels = np.asarray(png_image, dtype=np.uint8)
    except OSError as exc:
        raise BundleError(f"cannot read frame {frame_path}: {exc}") from exc
    _require(pixels.shape[1] == int(frame["width"]), f"{frame_path}: width mismatch")
    _require(pixels.shape[0] == int(frame["height"]), f"{frame_path}: height mismatch")
    axis = str(frame["axis"])
    slice_index = int(frame["sliceIndex"])
    expected_raw, expected_pixels, expected_crop_counts, expected_full_counts = _expected_frame_pixels(
        image, labels, axis, slice_index, crop
    )
    _require(sha256_bytes(expected_raw.tobytes(order="C")) == frame["rawPixelSha256"], f"{frame_path}: raw pixel SHA mismatch")
    _require(sha256_bytes(expected_pixels.tobytes(order="C")) == frame["outputPixelSha256"], f"{frame_path}: output pixel SHA mismatch")
    _require(pixels.shape == expected_pixels.shape and np.array_equal(pixels, expected_pixels), f"{frame_path}: output pixels differ")
    _require(frame.get("rawPixelBytes") == int(expected_raw.size), f"{frame_path}: raw pixel byte count mismatch")
    _require(frame.get("outputPixelBytes") == int(expected_pixels.size), f"{frame_path}: output pixel byte count mismatch")
    _require(frame.get("cropVoxelCounts") == expected_crop_counts, f"{frame_path}: crop voxel count mismatch")
    _require(frame.get("fullSliceVoxelCounts") == expected_full_counts, f"{frame_path}: full slice voxel count mismatch")
    _require(frame.get("textOverlay") is False, f"{frame_path}: text overlay is forbidden")
    _require(sha256_bytes(frame_path.read_bytes()) == frame["pngFileSha256"], f"{frame_path}: PNG file SHA mismatch")


def validate_bundle(manifest_path: Path) -> dict[str, object]:
    """Independently validate a generated manifest and all referenced PNGs."""

    _require(manifest_path.name == "manifest.json", "manifest must be the canonical manifest.json")
    root = manifest_path.parent
    _validate_bundle_file_set(root)
    _require_contained_path(manifest_path, root, "manifest path")
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise BundleError(f"cannot read manifest {manifest_path}: {exc}") from exc
    _require_exact_keys(
        manifest,
        ("format", "version", "review", "inputs", "crop", "labels", "canonicalSections", "frames", "coverage", "geometry", "definitions"),
        "manifest",
    )
    _require(manifest.get("format") == "brain-practical-orthogonal-review-bundle", "format mismatch")
    _require_exact_int(manifest.get("version"), "manifest.version")
    _require(manifest.get("version") == 3, "version mismatch")
    _require(manifest.get("review") == REVIEW_FIXED, "review fixed values mismatch")
    inputs = manifest.get("inputs")
    _require_exact_keys(inputs, ("image", "labels"), "inputs")
    for kind, magic, expected_sha, expected_path in (
        ("image", MAGIC_IMAGE.decode("ascii"), EXPECTED_IMAGE_SHA256, EXPECTED_IMAGE_PATH),
        ("labels", MAGIC_LABELS.decode("ascii"), EXPECTED_LABELS_SHA256, EXPECTED_LABELS_PATH),
    ):
        item = inputs.get(kind)
        _require_exact_keys(item, ("path", "magic", "sha256", "dims", "voxelSizeMm"), f"input {kind}")
        _require(item.get("path") == expected_path, f"input {kind} path mismatch")
        _require(item.get("magic") == magic, f"input {kind} magic mismatch")
        _require(item.get("sha256") == expected_sha, f"input {kind} SHA mismatch")
        _require_exact_int_list(item.get("dims"), f"input {kind}.dims", 3)
        _require(item.get("dims") == list(EXPECTED_DIMS), f"input {kind} dims mismatch")
        _require(item.get("voxelSizeMm") == list(EXPECTED_VOXEL_SIZE_MM), f"input {kind} voxel size mismatch")
    image_path = ROOT / EXPECTED_IMAGE_PATH
    labels_path = ROOT / EXPECTED_LABELS_PATH
    _image_digest, image_dims, image = read_browser_volume(image_path, MAGIC_IMAGE, EXPECTED_IMAGE_SHA256)
    _labels_digest, labels_dims, labels = read_browser_volume(labels_path, MAGIC_LABELS, EXPECTED_LABELS_SHA256)
    _require(image_dims == labels_dims == EXPECTED_DIMS, "source dimensions mismatch")
    _require(not any(int(label_id) in FORBIDDEN_PROPOSED_IDS for label_id in np.unique(labels)), "forbidden proposed IDs present")
    labels_meta = manifest.get("labels")
    _require_exact_keys(labels_meta, tuple(str(label_id) for label_id in OVERLAY_LABEL_IDS), "labels")
    expected_sections_by_id: dict[int, dict[str, dict[str, object]]] = {}
    for label_id in OVERLAY_LABEL_IDS:
        item = labels_meta.get(str(label_id))
        _require_exact_keys(item, ("voxelCount", "bbox", "sections", "role"), f"label {label_id}")
        actual_mask = labels == label_id
        expected_role = "context-only-within-crop" if label_id in CONTEXT_LABEL_IDS else "review-label"
        _require(item.get("role") == expected_role, f"label {label_id} role mismatch")
        _require_exact_int(item.get("voxelCount"), f"label {label_id}.voxelCount")
        _validate_bbox_integer_schema(item.get("bbox"), f"label {label_id}.bbox")
        _validate_sections_integer_schema(item.get("sections"), f"label {label_id}.sections")
        _require(int(item.get("voxelCount", -1)) == EXPECTED_COUNTS[label_id], f"label {label_id} fixed voxel count mismatch")
        _require(int(item.get("voxelCount", -1)) == int(actual_mask.sum()), f"label {label_id} voxel count mismatch")
        _require(item.get("bbox") == _bbox(actual_mask), f"label {label_id} bbox mismatch")
        expected_sections = _canonical_sections(actual_mask, EXPECTED_DIMS, label_id in MAMMILLARY_LABEL_IDS)
        expected_sections_by_id[label_id] = expected_sections
        _require_exact_keys(item.get("sections"), AXES, f"label {label_id}.sections")
        for axis in AXES:
            _require_exact_keys(item["sections"][axis], ("axis", "plane", "occupiedSliceIndices", "outsideEndpointSliceIndices", "canonicalSliceIndices", "sliceVoxelCounts"), f"label {label_id}.sections.{axis}")
        _require(item.get("sections") == expected_sections, f"label {label_id} section metadata mismatch")
    crop = manifest.get("crop")
    _require_exact_keys(crop, ("sourceLabelIds", "overlayLabelIds", "contextOnlyLabelIds", "contextOnlyScope", "marginVoxels", "min", "max", "size"), "crop")
    _require_exact_int(crop.get("marginVoxels"), "crop.marginVoxels")
    _require_exact_int_list(crop.get("min"), "crop.min", 3)
    _require_exact_int_list(crop.get("max"), "crop.max", 3)
    _require_exact_int_list(crop.get("size"), "crop.size", 3)
    _require(crop == EXPECTED_CROP, "crop fixed values mismatch")
    _require(crop == _target_crop(labels, int(crop["marginVoxels"])), "crop mismatch")
    _validate_flat_anchor_pixels(image, crop)
    canonical = manifest.get("canonicalSections")
    _require_exact_keys(canonical, ("mammillaryIds", "opticMixedId33"), "canonicalSections")
    _require_exact_keys(canonical["mammillaryIds"], ("39", "40"), "canonicalSections.mammillaryIds")
    _require_exact_keys(canonical["opticMixedId33"], AXES, "canonicalSections.opticMixedId33")
    for label_id in MAMMILLARY_LABEL_IDS:
        _validate_sections_integer_schema(canonical["mammillaryIds"][str(label_id)], f"canonicalSections.mammillaryIds.{label_id}")
    _validate_sections_integer_schema(canonical["opticMixedId33"], "canonicalSections.opticMixedId33")
    expected_canonical = {
        "mammillaryIds": {
            str(label_id): {axis: expected_sections_by_id[label_id][axis] for axis in AXES}
            for label_id in MAMMILLARY_LABEL_IDS
        },
        "opticMixedId33": {axis: expected_sections_by_id[33][axis] for axis in AXES},
    }
    _require(canonical == expected_canonical, "canonicalSections volume recomputation mismatch")
    geometry = manifest.get("geometry")
    _require_exact_keys(geometry, ("pixelToVoxel", "anchorSliceIndices", "fourCornerVoxelAnchors"), "geometry")
    _require(geometry["pixelToVoxel"] == PIXEL_TO_VOXEL_FIXED, "pixel-to-voxel formulas mismatch")
    _require_exact_keys(geometry["anchorSliceIndices"], AXES, "geometry.anchorSliceIndices")
    for axis in AXES:
        _require_exact_int(geometry["anchorSliceIndices"][axis], f"geometry.anchorSliceIndices.{axis}")
    _require_exact_keys(geometry["fourCornerVoxelAnchors"], AXES, "geometry.fourCornerVoxelAnchors")
    for axis in AXES:
        anchor = geometry["fourCornerVoxelAnchors"][axis]
        _require_exact_keys(anchor, ("sliceIndex", "corners"), f"geometry.fourCornerVoxelAnchors.{axis}")
        _require_exact_int(anchor["sliceIndex"], f"geometry.fourCornerVoxelAnchors.{axis}.sliceIndex")
        _require(isinstance(anchor["corners"], list) and len(anchor["corners"]) == 4, f"geometry.fourCornerVoxelAnchors.{axis}.corners: expected four corners")
        for index, corner in enumerate(anchor["corners"]):
            _require_exact_keys(corner, ("name", "row", "column", "voxel"), f"geometry.fourCornerVoxelAnchors.{axis}.corners[{index}]")
            _require_exact_int(corner["row"], f"geometry.fourCornerVoxelAnchors.{axis}.corners[{index}].row")
            _require_exact_int(corner["column"], f"geometry.fourCornerVoxelAnchors.{axis}.corners[{index}].column")
            _require_exact_int_list(corner["voxel"], f"geometry.fourCornerVoxelAnchors.{axis}.corners[{index}].voxel", 3)
    _require(geometry["anchorSliceIndices"] == ANCHOR_SLICE_INDICES, "anchor slice indices mismatch")
    _require(geometry["fourCornerVoxelAnchors"] == _four_corner_anchors(EXPECTED_CROP), "four-corner voxel anchors mismatch")
    _require(manifest.get("definitions") == DEFINITIONS_FIXED, "definitions fixed values mismatch")
    frame_list = manifest.get("frames")
    _require(isinstance(frame_list, list) and len(frame_list) == EXPECTED_FRAME_COUNT, "frames exact count mismatch")
    expected_axes: dict[str, list[int]] = {}
    for axis in AXES:
        values: set[int] = set()
        for label_id in (33, *MAMMILLARY_LABEL_IDS):
            values.update(int(value) for value in expected_sections_by_id[label_id][axis]["canonicalSliceIndices"])
        expected_axes[axis] = sorted(values)
    coverage = manifest.get("coverage")
    _require_exact_keys(coverage, ("reviewLabels", "contextOnlyLabels", "mammillaryIdsAllOccupiedAndOutsideEndpoints", "id33AllOccupiedCanonicalIndices", "frameCount", "axes"), "coverage")
    _require(coverage.get("reviewLabels") == list(REVIEW_LABEL_IDS), "coverage review labels mismatch")
    _require(coverage.get("contextOnlyLabels") == list(CONTEXT_LABEL_IDS), "coverage context labels mismatch")
    _require(coverage.get("mammillaryIdsAllOccupiedAndOutsideEndpoints") is True, "mammillary coverage flag missing")
    _require(coverage.get("id33AllOccupiedCanonicalIndices") is True, "ID33 coverage flag missing")
    _require_exact_int(coverage.get("frameCount"), "coverage.frameCount")
    _require_exact_keys(coverage.get("axes"), AXES, "coverage.axes")
    for axis in AXES:
        _require_exact_int_list(coverage["axes"][axis], f"coverage.axes.{axis}")
    _require(coverage.get("frameCount") == EXPECTED_FRAME_COUNT, "coverage frame count mismatch")
    _require(coverage.get("axes") == expected_axes, "coverage axis indices mismatch")
    expected_frame_keys: set[tuple[str, int]] = {
        (axis, value) for axis in AXES for value in expected_axes[axis]
    }
    expected_frame_names = {f"{axis}-{slice_index:03d}.png" for axis, slice_index in expected_frame_keys}
    _require(len(expected_frame_names) == EXPECTED_FRAME_COUNT, "expected frame set count mismatch")
    _validate_bundle_file_set(root, expected_frame_names)
    seen: set[tuple[str, int]] = set()
    for frame in frame_list:
        _require_exact_keys(frame, ("axis", "plane", "sliceIndex", "crop", "width", "height", "rawPixelBytes", "outputPixelBytes", "rawPixelSha256", "outputPixelSha256", "pngFileSha256", "cropVoxelCounts", "fullSliceVoxelCounts", "path", "textOverlay"), "frame")
        axis = frame.get("axis")
        slice_index = frame.get("sliceIndex")
        _require_exact_int(slice_index, "frame.sliceIndex")
        for field in ("width", "height", "rawPixelBytes", "outputPixelBytes"):
            _require_exact_int(frame.get(field), f"frame.{field}")
        _require_exact_keys(frame.get("crop"), ("min", "max", "size"), "frame.crop")
        _require_exact_int_list(frame["crop"]["min"], "frame.crop.min", 3)
        _require_exact_int_list(frame["crop"]["max"], "frame.crop.max", 3)
        _require_exact_int_list(frame["crop"]["size"], "frame.crop.size", 3)
        for count_name in ("cropVoxelCounts", "fullSliceVoxelCounts"):
            _require_exact_keys(frame.get(count_name), tuple(str(label_id) for label_id in OVERLAY_LABEL_IDS), f"frame.{count_name}")
            for label_id in OVERLAY_LABEL_IDS:
                _require_exact_int(frame[count_name][str(label_id)], f"frame.{count_name}.{label_id}")
        _require(axis in AXES and isinstance(slice_index, int), "frame axis/slice invalid")
        key = (axis, slice_index)
        _require(key not in seen, f"duplicate frame {key}")
        seen.add(key)
        _require(key in expected_frame_keys, f"non-canonical frame {key}")
        _require(frame.get("plane") == PLANE_NAMES[axis], f"frame plane mismatch {key}")
        _require(frame.get("crop") == {"min": crop["min"], "max": crop["max"], "size": crop["size"]}, f"frame crop mismatch {key}")
        _require(frame.get("rawPixelSha256") and frame.get("outputPixelSha256"), f"frame pixel SHA missing {key}")
        _require(frame.get("cropVoxelCounts", {}).keys() == {str(id_) for id_ in OVERLAY_LABEL_IDS}, f"frame count labels mismatch {key}")
        _require(frame.get("fullSliceVoxelCounts", {}).keys() == {str(id_) for id_ in OVERLAY_LABEL_IDS}, f"frame full count labels mismatch {key}")
        _require(frame.get("path") == f"{axis}-{slice_index:03d}.png", f"frame path mismatch {key}")
        frame_path = root / "frames" / str(frame["path"])
        _require_contained_path(frame_path, root / "frames", f"frame path {frame_path.name}")
        _verify_png_frame(frame, frame_path, image, labels, crop)
    _require(seen == expected_frame_keys, "canonical frame coverage mismatch")
    return {"passed": True, "frameCount": len(frame_list), "manifest": str(manifest_path)}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--image", type=Path, default=DEFAULT_IMAGE)
    parser.add_argument("--labels", type=Path, default=DEFAULT_LABELS)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--validate", type=Path, help="validate an existing manifest instead of building")
    args = parser.parse_args(argv)
    try:
        result = validate_bundle(args.validate) if args.validate else {"passed": True, **build_bundle(args.image, args.labels, args.output_dir)}
    except (BundleError, OSError, ValueError) as exc:
        parser.error(str(exc))
    if args.validate:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        print(json.dumps({"passed": True, "outputDir": str(args.output_dir), "frameCount": len(result["frames"])}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
