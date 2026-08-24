#!/usr/bin/env python3
"""Render local-only pre-adoption evidence for the reviewed ventricle patch."""

from __future__ import annotations

import argparse
import gzip
import hashlib
import json
from pathlib import Path
import struct

import numpy as np
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
IMAGE = ROOT / "public/atlas/bigbrain-icbm500.bin.gz"
LABELS = ROOT / "tests/fixtures/bigbrain-practical-segmentation-pre-ventricle-6744.bin.gz"
PATCH = ROOT / "segmentation-patches/review/ventricles-orthogonally-bracketed-candidate-2026-08-23.json"
OUTPUT = ROOT / "work/anatomy-review/ventricle-cavity-candidate-2026-08-23"
EXPECTED_DIMS = (394, 466, 378)
COLORS = {23: np.asarray((55, 190, 218), dtype=np.float32), 24: np.asarray((55, 190, 218), dtype=np.float32), 25: np.asarray((103, 207, 221), dtype=np.float32)}
CANDIDATE_COLOR = np.asarray((255, 67, 151), dtype=np.float32)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load(path: Path, magic: bytes) -> np.ndarray:
    payload = gzip.decompress(path.read_bytes())
    if payload[:4] != magic:
        raise ValueError(f"{path}: wrong magic")
    dims = struct.unpack_from("<3H", payload, 4)
    if dims != EXPECTED_DIMS or len(payload) != 10 + int(np.prod(dims)):
        raise ValueError(f"{path}: wrong dimensions or payload length")
    return np.frombuffer(payload, dtype=np.uint8, offset=10).reshape(dims, order="F")


def patch_candidate(patch: dict[str, object]) -> np.ndarray:
    candidate = np.zeros(EXPECTED_DIMS, dtype=np.uint8)
    for run in patch["runs"]:  # type: ignore[index]
        start, length, label_id = int(run["start"]), int(run["length"]), int(run["label"])
        for index in range(start, start + length):
            z, remainder = divmod(index, EXPECTED_DIMS[0] * EXPECTED_DIMS[1])
            y, x = divmod(remainder, EXPECTED_DIMS[0])
            if candidate[x, y, z] or label_id not in COLORS:
                raise ValueError("patch contains an invalid or duplicate candidate voxel")
            candidate[x, y, z] = label_id
    if int(np.count_nonzero(candidate)) != int(patch["editCount"]):
        raise ValueError("patch editCount mismatch")
    return candidate


def oriented(array: np.ndarray, axis: int, index: int, crop: tuple[slice, slice, slice]) -> np.ndarray:
    cropped = array[crop]
    local = index - int(crop[axis].start or 0)
    if axis == 0:
        return cropped[local, :, :].T[::-1, :]
    if axis == 1:
        return cropped[:, local, :].T[::-1, :]
    return cropped[:, :, local].T[::-1, :]


def render(raw: np.ndarray, labels: np.ndarray, candidate: np.ndarray) -> np.ndarray:
    values = raw.astype(np.float32)
    rgb = np.stack((47 + values * .81, 40 + values * .75, 32 + values * .66), axis=-1)
    rgb[raw >= 252] = (20, 24, 26)
    for label_id, color in COLORS.items():
        hit = labels == label_id
        rgb[hit] = rgb[hit] * .35 + color * .65
        proposed = candidate == label_id
        rgb[proposed] = CANDIDATE_COLOR
    return np.clip(rgb, 0, 255).astype(np.uint8)


def sheet_for_axis(
    image: np.ndarray,
    labels: np.ndarray,
    candidate: np.ndarray,
    crop: tuple[slice, slice, slice],
    axis: int,
    name: str,
    output: Path,
) -> dict[str, object]:
    other_axes = tuple(value for value in range(3) if value != axis)
    slices = [int(value) for value in np.flatnonzero(np.any(candidate > 0, axis=other_axes))]
    panels = []
    font = ImageFont.load_default()
    for index in slices:
        panel = Image.fromarray(render(oriented(image, axis, index, crop), oriented(labels, axis, index, crop), oriented(candidate, axis, index, crop))).resize(
            (oriented(image, axis, index, crop).shape[1] * 3, oriented(image, axis, index, crop).shape[0] * 3), Image.Resampling.NEAREST
        )
        framed = Image.new("RGB", (panel.width, panel.height + 24), (239, 236, 229))
        ImageDraw.Draw(framed).text((6, 7), f"{name} {index}", fill=(32, 32, 30), font=font)
        framed.paste(panel, (0, 24))
        panels.append(framed)
    columns = min(4, len(panels))
    rows = (len(panels) + columns - 1) // columns
    sheet = Image.new("RGB", (columns * panels[0].width, rows * panels[0].height), (230, 227, 220))
    for position, panel in enumerate(panels):
        sheet.paste(panel, ((position % columns) * panel.width, (position // columns) * panel.height))
    path = output / f"{name}.png"
    sheet.save(path, optimize=False)
    return {"plane": name, "axis": "XYZ"[axis], "sliceIndices": slices, "file": path.name, "sha256": sha256(path), "width": sheet.width, "height": sheet.height}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=OUTPUT)
    args = parser.parse_args()
    image = load(IMAGE, b"BBV1")
    labels = load(LABELS, b"BBS1")
    patch = json.loads(PATCH.read_text(encoding="utf-8"))
    candidate = patch_candidate(patch)
    points = np.argwhere(candidate > 0)
    lower = np.maximum(points.min(axis=0) - 8, 0)
    upper = np.minimum(points.max(axis=0) + 9, np.asarray(EXPECTED_DIMS))
    crop = tuple(slice(int(lower[axis]), int(upper[axis])) for axis in range(3))
    args.output.mkdir(parents=True, exist_ok=True)
    frames = [sheet_for_axis(image, labels, candidate, crop, axis, name, args.output) for axis, name in enumerate(("sagittal", "coronal", "horizontal"))]
    manifest = {
        "schemaVersion": 1,
        "status": "project-reviewed-source-evidence",
        "purpose": "Local pre-adoption raw-image/label/candidate preview; not expert review, anatomical ground truth, or institutional approval.",
        "source": {"imageSha256": sha256(IMAGE), "labelsSha256": sha256(LABELS), "patchSha256": sha256(PATCH)},
        "dims": list(EXPECTED_DIMS),
        "crop": {"lowerInclusive": lower.tolist(), "upperExclusive": upper.tolist()},
        "candidateVoxelCount": int(points.shape[0]),
        "colors": {"currentLabels": {str(key): value.astype(int).tolist() for key, value in COLORS.items()}, "candidate": CANDIDATE_COLOR.astype(int).tolist()},
        "frames": frames,
        "publishedLabelsModified": False,
    }
    (args.output / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(manifest, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
