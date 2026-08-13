#!/usr/bin/env python3
"""Generate representative fixed-MRI tone candidates for offline visual QA."""
from pathlib import Path
import gzip
import struct

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public/atlas/bigbrain-fixed-mri-0444.bin.gz"
OUTPUT = ROOT / "work/tone-preview/fixed-mri-tone-candidates.png"

CANDIDATES = [
    ("neutral", 1.00, 0, 0.00),
    ("gentle", 1.07, 1, 0.08),
    ("balanced", 1.12, 2, 0.12),
    ("strong", 1.18, 2, 0.18),
]


def render(values: np.ndarray, mask: np.ndarray, y: int, contrast: float, brightness: float, sharpness: float) -> np.ndarray:
    raw = values[:, y, :].T[::-1].astype(np.float32)
    alpha = mask[:, y, :].T[::-1] > 0
    near = (
        np.roll(raw, 1, 0) + np.roll(raw, -1, 0)
        + np.roll(raw, 1, 1) + np.roll(raw, -1, 1)
    ) * .25
    base = raw + (raw - near) * sharpness
    val = np.clip((base - 128) * contrast + 128 + brightness, 0, 255)
    gx = np.abs(np.roll(raw, -1, 1) - np.roll(raw, 1, 1))
    gy = np.abs(np.roll(raw, -1, 0) - np.roll(raw, 1, 0))
    edge = np.minimum(22, (gx + gy) * (.07 + sharpness * .18))
    rgb = np.stack((36 + val * .78 - edge, 31 + val * .68 - edge * .74, 25 + val * .55 - edge * .46), axis=-1)
    return np.where(alpha[..., None], np.clip(rgb, 0, 255), np.array([23, 27, 28])).astype(np.uint8)


def main() -> None:
    payload = gzip.open(SOURCE, "rb").read()
    if payload[:4] != b"BFM1":
        raise ValueError("Expected raw fixed-MRI BFM1 payload")
    dims = struct.unpack("<3H", payload[4:10])
    n = int(np.prod(dims))
    values = np.frombuffer(payload, np.uint8, n, 10).reshape(dims, order="F")
    mask = np.frombuffer(payload, np.uint8, n, 10 + n).reshape(dims, order="F")
    ys = [int(dims[1] * q) for q in (.38, .50, .62)]
    panel_w, panel_h = dims[0], dims[2]
    gap, label_h = 14, 28
    sheet = Image.new("RGB", (len(CANDIDATES) * panel_w + (len(CANDIDATES) - 1) * gap, len(ys) * (panel_h + label_h) + (len(ys) - 1) * gap), (241, 239, 233))
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()
    for row, y in enumerate(ys):
        top = row * (panel_h + label_h + gap)
        for col, (name, contrast, brightness, sharpness) in enumerate(CANDIDATES):
            left = col * (panel_w + gap)
            draw.text((left + 5, top + 8), f"{name}  C{contrast:.2f} B{brightness:+.0f} S{sharpness:.2f}", fill=(48, 46, 41), font=font)
            sheet.paste(Image.fromarray(render(values, mask, y, contrast, brightness, sharpness)), (left, top + label_h))
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(OUTPUT)
    print(OUTPUT)


if __name__ == "__main__":
    main()
