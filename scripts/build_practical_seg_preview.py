#!/usr/bin/env python3
"""Render representative practical-overlay panels for local visual QA."""

from __future__ import annotations

import gzip
import struct
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
IMAGE = ROOT / "public/atlas/bigbrain-icbm500.bin.gz"
LABELS = ROOT / "public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz"
OUTPUT = ROOT / "work/practical-seg-preview.png"

COLORS = {
    23: (73, 169, 180), 24: (73, 169, 180), 25: (88, 174, 184), 26: (73, 151, 176),
    27: (115, 155, 114), 28: (139, 168, 103), 29: (139, 168, 103),
    30: (219, 194, 112), 31: (226, 150, 79), 32: (226, 150, 79),
}


def load(path: Path, magic: bytes) -> tuple[tuple[int, int, int], np.ndarray]:
    payload = gzip.open(path, "rb").read()
    if payload[:4] != magic:
        raise ValueError(path)
    dims = struct.unpack("<3H", payload[4:10])
    data = np.frombuffer(payload, np.uint8, int(np.prod(dims)), 10).reshape(dims, order="F")
    return dims, data


def specimen(raw: np.ndarray, labels: np.ndarray, ids: set[int]) -> np.ndarray:
    val = raw.astype(np.float32)
    rgb = np.stack((47 + val * .81, 40 + val * .75, 32 + val * .66), axis=-1)
    for label_id in ids:
        if 23 <= label_id <= 26:
            continue
        hit = labels == label_id
        color = np.asarray(COLORS[label_id], np.float32)
        rgb[hit] = rgb[hit] * .45 + color * .55
    rgb[raw >= 252] = (23, 27, 28)
    for label_id in ids:
        if 23 <= label_id <= 26:
            rgb[labels == label_id] = COLORS[label_id]
    return np.clip(rgb, 0, 255).astype(np.uint8)


def section(data: np.ndarray, plane: str, p: float) -> np.ndarray:
    if plane == "coronal":
        return data[:, int(round(p * (data.shape[1] - 1))), :].T[::-1]
    if plane == "horizontal":
        return data[:, :, int(round((1 - p) * (data.shape[2] - 1)))].T[::-1]
    return data[int(round(p * (data.shape[0] - 1))), :, :].T[::-1]


def main() -> None:
    dims, image = load(IMAGE, b"BBV1")
    label_dims, labels = load(LABELS, b"BBS1")
    if dims != label_dims:
        raise ValueError("dimension mismatch")
    panels = [
        ("ventricles / coronal", "coronal", .52, {23, 24, 25}),
        ("ventricles / sagittal", "sagittal", .50, {23, 24, 25, 26}),
        ("brainstem + cerebellum", "sagittal", .54, {27, 28, 29}),
        ("corpus callosum candidate", "sagittal", .50, {30}),
        ("internal capsule candidate", "coronal", .52, {31, 32}),
        ("all practical overlays", "coronal", .60, set(COLORS)),
    ]
    thumb_w, thumb_h, label_h, gap = 394, 378, 30, 14
    sheet = Image.new("RGB", (thumb_w * 3 + gap * 2, (thumb_h + label_h) * 2 + gap), (239, 236, 229))
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()
    for i, (title, plane, p, ids) in enumerate(panels):
        raw = section(image, plane, p)
        seg = section(labels, plane, p)
        panel = Image.fromarray(specimen(raw, seg, ids))
        panel.thumbnail((thumb_w, thumb_h), Image.Resampling.NEAREST)
        x = (i % 3) * (thumb_w + gap)
        y = (i // 3) * (thumb_h + label_h + gap)
        draw.text((x + 4, y + 8), title, fill=(42, 40, 36), font=font)
        sheet.paste(panel, (x + (thumb_w - panel.width) // 2, y + label_h))
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(OUTPUT)
    print(OUTPUT)


if __name__ == "__main__":
    main()
