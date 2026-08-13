#!/usr/bin/env python3
"""Render orthographic QA previews of labelled high-density pial meshes."""

import struct
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "work" / "pydeps"))
from PIL import Image, ImageDraw

ATLAS = ROOT / "public" / "atlas"
OUTPUT = ROOT / "work" / "surface-region-qa.png"

COLORS = {
    86: "#d66e58", 35: "#d66e58", 64: "#4f9aae", 13: "#4f9aae",
    89: "#c18c4b", 38: "#c18c4b", 83: "#dd9650", 32: "#dd9650",
    73: "#dd9650", 22: "#dd9650", 96: "#9970b4", 45: "#9970b4",
    102: "#4d86b2", 51: "#4d86b2", 60: "#68a06c", 9: "#68a06c",
    67: "#ad708c", 16: "#ad708c", 82: "#7d9c5e", 31: "#7d9c5e",
    94: "#6d8db7", 43: "#6d8db7", 57: "#c35f75", 6: "#c35f75",
    63: "#b28a53", 12: "#b28a53", 75: "#a76f78", 24: "#a76f78",
}


def mesh_data(name):
    raw = (ATLAS / f"pial-{name}.mesh").read_bytes()
    if raw[:4] != b"BNM3":
        raise ValueError("expected labelled BNM3")
    count = struct.unpack_from("<I", raw, 4)[0]
    stored = np.frombuffer(raw, dtype="<f4", count=count * 3, offset=12).reshape(-1, 3)
    region_offset = 12 + count * 28
    regions = np.frombuffer(raw, dtype="<f4", count=count, offset=region_offset).round().astype(np.uint8)
    return stored[:, [2, 1, 0]], regions


def panel(points, regions, axes, depth_axis, prefer_max, selected, size=490):
    margin = 16
    values = points[:, list(axes)]
    low, high = values.min(axis=0), values.max(axis=0)
    scale = min((size - margin * 2) / (high[0] - low[0]), (size - margin * 2) / (high[1] - low[1]))
    px = np.clip(np.rint(margin + (values[:, 0] - low[0]) * scale), 0, size - 1).astype(int)
    py = np.clip(np.rint(size - margin - (values[:, 1] - low[1]) * scale), 0, size - 1).astype(int)
    order = np.argsort(points[:, depth_axis])
    if prefer_max:
        order = order[::-1]
    visible = {}
    for index in order:
        key = int(py[index] * size + px[index])
        if key not in visible:
            visible[key] = index
    image = Image.new("RGB", (size, size), "#1b2022")
    draw = ImageDraw.Draw(image)
    selected = set(selected)
    for index in visible.values():
        region = int(regions[index])
        color = COLORS.get(region, "#aab0b0") if region in selected else "#7f8889"
        x, y = px[index], py[index]
        draw.ellipse((x - 1, y - 1, x + 1, y + 1), fill=color)
    return image


def main():
    left, left_regions = mesh_data("left")
    right, right_regions = mesh_data("right")
    both = np.vstack([left, right]); both_regions = np.concatenate([left_regions, right_regions])
    views = [
        ("Left lateral", left, left_regions, (1, 2), 0, False, [86, 64, 83, 73, 96, 102]),
        ("Superior", both, both_regions, (0, 1), 2, True, [89, 38, 86, 35, 64, 13, 60, 9]),
        ("Inferior", both, both_regions, (0, 1), 2, False, [96, 45, 63, 12, 75, 24]),
        ("Left medial", left, left_regions, (1, 2), 0, True, [67, 82, 94, 57, 63]),
    ]
    canvas = Image.new("RGB", (1000, 1040), "white")
    draw = ImageDraw.Draw(canvas)
    for index, (title, points, regions, axes, depth, prefer_max, selected) in enumerate(views):
        image = panel(points, regions, axes, depth, prefer_max, selected)
        x = 5 + (index % 2) * 500; y = 25 + (index // 2) * 510
        canvas.paste(image, (x, y))
        draw.text((x + 8, y - 17), title, fill="#263033")
    canvas.save(OUTPUT)
    print(OUTPUT)


if __name__ == "__main__":
    main()
