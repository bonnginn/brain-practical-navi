#!/usr/bin/env python3
"""Reproduce the historical BigBrain image/manual-label browser artifacts.

The distributed pair shares a grid but not a nonlinear registration history.
See MANUAL_LABEL_SPACE_REVIEW.md. This legacy CLI is now restricted to explicit
research reproduction in work/, not production regeneration. Geometry checks
below are necessary bookkeeping, not proof of anatomical spatial alignment.
"""

from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import struct
import sys
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "work/pydeps"))

import numpy as np


def extract_zip_entry(path: Path) -> bytes:
    payload = path.read_bytes()
    if payload[:4] != b"PK\x03\x04":
        raise ValueError(f"{path}: expected a ZIP local-file entry")
    header = struct.unpack_from("<4s5H3L2H", payload, 0)
    method, compressed_size = header[3], header[7]
    filename_length, extra_length = header[9], header[10]
    start = 30 + filename_length + extra_length
    compressed = payload[start : start + compressed_size]
    if method != 8:
        raise ValueError(f"{path}: unsupported ZIP method {method}")
    return zlib.decompress(compressed, -15)


def load_entry(path: Path) -> tuple[nib.Nifti1Image, str]:
    import nibabel as nib

    raw = extract_zip_entry(path)
    return nib.Nifti1Image.from_bytes(raw), hashlib.sha256(path.read_bytes()).hexdigest()


def encode_tissue(image: np.ndarray) -> tuple[np.ndarray, np.ndarray, tuple[float, float]]:
    # 65535 is the background in the official BigBrain NIfTI. Keep tissue
    # below 252 so the browser can use 255 as an unambiguous transparent value.
    tissue = np.isfinite(image) & (image < 65000)
    low, high = np.percentile(image[tissue], (1.0, 99.5))
    scaled = np.clip((image - low) / max(high - low, 1.0), 0.0, 1.0)
    encoded = np.rint(scaled * 250.0).astype(np.uint8)
    encoded[~tissue] = 255
    return encoded, tissue, (float(low), float(high))


def write_browser_volume(path: Path, magic: bytes, array: np.ndarray) -> None:
    payload = magic + struct.pack("<3H", *array.shape) + array.tobytes(order="F")
    with gzip.open(path, "wb", compresslevel=9) as stream:
        stream.write(payload)


def require_legacy_reproduction(output_dir: Path, acknowledged: bool) -> Path:
    """Stop accidental reuse of the known unregistered pair before any I/O."""
    output = output_dir.resolve()
    work = (ROOT / 'work').resolve()
    if not acknowledged:
        raise ValueError('Known nonlinear image/manual space mismatch: production generation is disabled. See MANUAL_LABEL_SPACE_REVIEW.md. Historical research reproduction requires --legacy-grid-reproduction and a new work/ subdirectory.')
    if output == work or not output.is_relative_to(work) or output.exists():
        raise ValueError('Legacy reproduction requires a new subdirectory inside work/; never public/ or existing artifacts')
    return output


def validate_pair(
    image_nii: nib.Nifti1Image,
    labels_nii: nib.Nifti1Image,
    tissue: np.ndarray,
    labels: np.ndarray,
) -> dict[str, object]:
    if image_nii.shape != labels_nii.shape:
        raise ValueError(f"shape mismatch: image {image_nii.shape}, labels {labels_nii.shape}")
    if not np.array_equal(image_nii.affine, labels_nii.affine):
        raise ValueError("affine mismatch: image and labels are not in the same coordinate grid")
    if image_nii.shape != (394, 466, 378):
        raise ValueError(f"unexpected BigBrain 500 um grid: {image_nii.shape}")
    if not np.allclose(image_nii.header.get_zooms()[:3], (0.5, 0.5, 0.5)):
        raise ValueError(f"unexpected voxel size: {image_nii.header.get_zooms()[:3]}")

    ids = sorted(int(value) for value in np.unique(labels) if value)
    if ids != list(range(1, 23)):
        raise ValueError(f"expected manual label IDs 1-22, got {ids}")

    overlap = float(tissue[labels > 0].mean())
    if overlap < 0.98:
        raise ValueError(f"only {overlap:.3%} of label voxels overlap BigBrain tissue")

    centroids: dict[str, list[float]] = {}
    counts: dict[str, int] = {}
    for label_id in ids:
        points = np.argwhere(labels == label_id)
        centroids[str(label_id)] = [round(float(value), 3) for value in points.mean(axis=0)]
        counts[str(label_id)] = int(len(points))

    # Odd IDs are left and the following even IDs are right in the supplied LUT.
    for left_id in range(1, 23, 2):
        right_id = left_id + 1
        if centroids[str(left_id)][0] >= centroids[str(right_id)][0]:
            raise ValueError(f"left/right centroid check failed for labels {left_id}/{right_id}")

    return {
        "spatialRegistrationStatus": "legacy-grid-only; known nonlinear image/manual history mismatch",
        "spatialAlignmentValidated": False,
        "shape": list(image_nii.shape),
        "voxelSizeMm": list(map(float, image_nii.header.get_zooms()[:3])),
        "affine": image_nii.affine.tolist(),
        "labelIds": ids,
        "labelCounts": counts,
        "labelCentroidsVoxel": centroids,
        "labelTissueOverlap": overlap,
        "leftRightPairsValidated": 11,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("image_entry", type=Path, help="ZIP entry for BigBrain-to-ICBM2009sym-nonlin-500um.nii")
    parser.add_argument("label_entry", type=Path, help="ZIP entry for BigBrain-SubCorSeg-500um.nii")
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--legacy-grid-reproduction", action="store_true", help="Acknowledge known space mismatch; output only to a new work/ subdirectory")
    args = parser.parse_args()
    args.output_dir = require_legacy_reproduction(args.output_dir, args.legacy_grid_reproduction)

    image_nii, image_sha = load_entry(args.image_entry)
    labels_nii, labels_sha = load_entry(args.label_entry)
    image = np.asarray(image_nii.dataobj, dtype=np.float32)
    labels_float = np.asarray(labels_nii.dataobj, dtype=np.float32)
    if not np.allclose(labels_float, np.rint(labels_float)):
        raise ValueError("manual segmentation contains non-integral labels")
    labels = np.rint(labels_float).astype(np.uint8)
    encoded, tissue, window = encode_tissue(image)
    validation = validate_pair(image_nii, labels_nii, tissue, labels)
    validation.update(
        {
            "sourceImage": "BigBrain-to-ICBM2009sym-nonlin-500um.nii",
            "sourceLabels": "BigBrain-SubCorSeg-500um.nii",
            "sourceImageEntrySha256": image_sha,
            "sourceLabelEntrySha256": labels_sha,
            "intensityWindow": list(window),
            "coordinatePolicy": "historical reproduction only: shared grid does not establish shared nonlinear space; manual labels remain untransformed",
        }
    )

    args.output_dir.mkdir(parents=True, exist_ok=True)
    image_output = args.output_dir / "bigbrain-icbm500.bin.gz"
    label_output = args.output_dir / "bigbrain-manual-subcortical-icbm500.bin.gz"
    metadata_output = args.output_dir / "bigbrain-icbm500-validation.json"
    write_browser_volume(image_output, b"BBV1", encoded)
    write_browser_volume(label_output, b"BBS1", labels)
    metadata_output.write_text(json.dumps(validation, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"image": str(image_output), "labels": str(label_output), **validation}, ensure_ascii=False))


if __name__ == "__main__":
    main()
