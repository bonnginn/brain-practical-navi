#!/usr/bin/env python3
"""Render orthographic QA views of the procedural neurovascular overlays."""

import struct
import gzip
import sys
from pathlib import Path

import numpy as np


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "work" / "pydeps"))
from PIL import Image, ImageDraw

ATLAS = ROOT / "public" / "atlas"
OUTPUT = ROOT / "work" / "neurovascular-overlay-qa.png"


def vertices(name):
    path = ATLAS / (f"{name}.mesh.gz" if name in ("pial-left", "pial-right") else f"{name}.mesh")
    raw = gzip.decompress(path.read_bytes()) if path.suffix == ".gz" else path.read_bytes()
    count = struct.unpack_from("<I", raw, 4)[0]
    stored = np.frombuffer(raw, dtype="<f4", count=count * 3, offset=12).reshape(-1, 3)
    return stored[:, [2, 1, 0]]  # anatomical x, y, z


def main():
    # Keep the pial envelope visible enough to judge whether a path actually
    # lies on the ventral brain instead of reviewing isolated "wiring".
    brain = np.vstack([vertices("pial-left"), vertices("pial-right")])[::60]
    groups = [
        ("Optic pathway", "landmark-optic-pathway", "#d3bd8e"),
        ("Infundibulum", "landmark-infundibulum", "#c78070"),
        ("Mammillary bodies", "landmark-mammillary-bodies", "#9a7056"),
        ("Anterior circulation", "overlay-arteries-anterior", "#dc3027"),
        ("Vertebrobasilar", "overlay-arteries-posterior", "#9f2d22"),
        ("CN I–IV", "overlay-nerves-anterior", "#e7bf41"),
        ("CN V–VIII", "overlay-nerves-pontine", "#d5962d"),
        ("CN IX–XII", "overlay-nerves-medullary", "#b87522"),
    ]
    projections = [
        (0, 1, "Inferior footprint", "x (right)", "y (anterior)"),
        (1, 2, "Sagittal extent", "y (anterior)", "z (superior)"),
        (0, 2, "Coronal extent", "x (right)", "z (superior)"),
    ]
    width, height, panel_width = 1800, 640, 580
    image = Image.new("RGB", (width, height), "white")
    draw = ImageDraw.Draw(image, "RGBA")
    draw.text((30, 16), "Neurovascular overlay QA — simplified teaching geometry", fill="#1d2628")
    loaded = [(label, vertices(name), color) for label, name, color in groups]
    for panel, (a, b, title, xlabel, ylabel) in enumerate(projections):
        x0, y0, x1, y1 = panel * panel_width + 38, 70, panel * panel_width + 550, 580
        all_points = np.vstack([brain] + [points for _, points, _ in loaded])
        low = all_points[:, [a, b]].min(axis=0) - 5
        high = all_points[:, [a, b]].max(axis=0) + 5
        scale = min((x1 - x0) / (high[0] - low[0]), (y1 - y0) / (high[1] - low[1]))
        def project(points):
            x = x0 + (points[:, a] - low[0]) * scale
            y = y1 - (points[:, b] - low[1]) * scale
            return np.column_stack([x, y]).astype(int)
        draw.rectangle((x0, y0, x1, y1), outline="#cfd4d3", width=1)
        for fraction in [.25, .5, .75]:
            gx = int(x0 + (x1 - x0) * fraction); gy = int(y0 + (y1 - y0) * fraction)
            draw.line((gx, y0, gx, y1), fill="#e7e9e8", width=1)
            draw.line((x0, gy, x1, gy), fill="#e7e9e8", width=1)
        for x, y in project(brain):
            draw.ellipse((x - 1, y - 1, x + 1, y + 1),
                         fill=(92, 101, 104, 105))
        for label, points, color in loaded:
            for x, y in project(points):
                draw.ellipse((x - 1, y - 1, x + 1, y + 1), fill=color)
        draw.text((x0, 48), title, fill="#263033")
        draw.text((x0, 590), xlabel, fill="#6b7475")
        draw.text((x0 + 365, 590), ylabel, fill="#6b7475")
    legend_x, legend_y = 45, 92
    for index, (label, _, color) in enumerate(loaded):
        y = legend_y + index * 18
        draw.line((legend_x, y + 5, legend_x + 22, y + 5), fill=color, width=4)
        draw.text((legend_x + 29, y), label, fill="#333b3d")
    image.save(OUTPUT)
    print(OUTPUT)


if __name__ == "__main__":
    main()
