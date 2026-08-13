#!/usr/bin/env python3
"""Build project-authored sulcus/fissure guides projected to pial-like meshes.

The polylines are teaching landmarks, not donor-traced or atlas-validated
sulcal curves. Seed points are projected onto the nearest vertex of the
high-density left/right pial-like surfaces before being converted to thin tubes.
"""

from __future__ import annotations

import json
import struct
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "work/pydeps"))

import numpy as np
from scipy.spatial import cKDTree

OUT = ROOT / "public" / "atlas"
SIDES = 8


def read_pial(path: Path) -> np.ndarray:
    payload = path.read_bytes()
    if payload[:4] != b"BNM3":
        raise ValueError(f"{path.name}: expected BNM3")
    vertices = struct.unpack_from("<I", payload, 4)[0]
    stored = np.frombuffer(payload, dtype="<f4", offset=12, count=vertices * 3).reshape(-1, 3)
    return stored[:, [2, 1, 0]].astype(np.float64)  # anatomical x, y, z


def catmull_rom(points: np.ndarray, subdivisions: int = 5) -> np.ndarray:
    if len(points) == 2:
        t = np.linspace(0, 1, subdivisions + 1)[:, None]
        return points[0] * (1 - t) + points[1] * t
    padded = np.vstack([points[0], points, points[-1]])
    samples = []
    for index in range(1, len(padded) - 2):
        p0, p1, p2, p3 = padded[index - 1:index + 3]
        for t in np.linspace(0, 1, subdivisions, endpoint=False):
            t2, t3 = t * t, t * t * t
            samples.append(.5 * ((2 * p1) + (-p0 + p2) * t +
                                  (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
                                  (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
    samples.append(points[-1])
    return np.asarray(samples)


def tube_mesh(paths: list[np.ndarray], radius: float = 1.05) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    vertices, normals, faces = [], [], []
    for path in paths:
        centerline = catmull_rom(path)
        start = len(vertices)
        previous_normal = None
        for index, center in enumerate(centerline):
            tangent = centerline[min(index + 1, len(centerline) - 1)] - centerline[max(index - 1, 0)]
            tangent /= max(np.linalg.norm(tangent), 1e-8)
            reference = np.array([0., 0., 1.])
            if abs(np.dot(tangent, reference)) > .88:
                reference = np.array([0., 1., 0.])
            normal = np.cross(tangent, reference)
            normal /= max(np.linalg.norm(normal), 1e-8)
            if previous_normal is not None and np.dot(normal, previous_normal) < 0:
                normal *= -1
            binormal = np.cross(tangent, normal)
            binormal /= max(np.linalg.norm(binormal), 1e-8)
            previous_normal = normal
            for side in range(SIDES):
                angle = 2 * np.pi * side / SIDES
                radial = normal * np.cos(angle) + binormal * np.sin(angle)
                vertices.append(center + radial * radius)
                normals.append(radial)
        for ring in range(len(centerline) - 1):
            for side in range(SIDES):
                a = start + ring * SIDES + side
                b = start + ring * SIDES + (side + 1) % SIDES
                c = start + (ring + 1) * SIDES + (side + 1) % SIDES
                d = start + (ring + 1) * SIDES + side
                faces.extend([[a, b, c], [a, c, d]])
    return np.asarray(vertices), np.asarray(normals), np.asarray(faces, dtype=np.uint32)


def project(tree: cKDTree, vertices: np.ndarray, seeds: list[tuple[float, float, float]]) -> np.ndarray:
    _, indices = tree.query(np.asarray(seeds, dtype=float))
    return vertices[indices]


def write_mesh(name: str, geometry: tuple[np.ndarray, np.ndarray, np.ndarray]) -> dict[str, int | str]:
    xyz, normals_xyz, faces = geometry
    stored = xyz[:, [2, 1, 0]].astype("<f4")
    normals = normals_xyz[:, [2, 1, 0]].astype("<f4")
    faces = faces.astype("<u4")
    path = OUT / f"surface-landmark-{name}.mesh"
    with path.open("wb") as handle:
        handle.write(b"BNM1" + struct.pack("<II", len(stored), len(faces)))
        handle.write(stored.tobytes())
        handle.write(normals.tobytes())
        handle.write(faces.tobytes())
    return {"file": path.name, "vertices": len(stored), "faces": len(faces)}


def main() -> None:
    left = read_pial(OUT / "pial-left.mesh")
    right = read_pial(OUT / "pial-right.mesh")
    trees = {"left": cKDTree(left), "right": cKDTree(right)}
    vertices = {"left": left, "right": right}

    bilateral = {
        "central-sulcus": [(-18, -5, 70), (-38, -2, 56), (-52, 1, 38), (-58, 6, 19)],
        "precentral-sulcus": [(-23, 11, 68), (-42, 13, 52), (-55, 16, 30)],
        "lateral-sulcus": [(-53, 23, -7), (-60, 6, -3), (-62, -17, 4), (-56, -38, 15)],
        "superior-frontal-sulcus": [(-31, 52, 42), (-37, 31, 47), (-42, 9, 49)],
        "parieto-occipital-sulcus": [(-4, -48, 72), (-5, -57, 58), (-5, -65, 40)],
        "calcarine-sulcus": [(-4, -24, 8), (-4, -45, 11), (-4, -67, 12), (-5, -82, 15)],
        "olfactory-sulcus": [(-14, 55, -18), (-14, 40, -21), (-14, 23, -22)],
    }
    guides: dict[str, list[np.ndarray]] = {}
    for key, left_seeds in bilateral.items():
        right_seeds = [(-x, y, z) for x, y, z in left_seeds]
        guides[key] = [
            project(trees["left"], vertices["left"], left_seeds),
            project(trees["right"], vertices["right"], right_seeds),
        ]

    longitudinal_paths = []
    for side, x in (("left", -4.0), ("right", 4.0)):
        seeds = [
            (x, 88, 4), (x, 84, 13), (x, 78, 22),
            (x, 65, 40), (x, 48, 58),
            (x, 27, 71), (x, 2, 78), (x, -28, 74),
            (x, -54, 60), (x, -76, 42), (x, -88, 22),
        ]
        longitudinal_paths.append(project(trees[side], vertices[side], seeds))
    # Unlike a sulcus on one hemisphere, the longitudinal fissure is the
    # negative space between the two medial banks.  Place one teaching filler
    # on their midpoint instead of drawing separate tubes on both hemispheres.
    longitudinal_filler = (longitudinal_paths[0] + longitudinal_paths[1]) * .5
    longitudinal_filler[:, 2] -= 1.8
    guides["longitudinal-fissure"] = [longitudinal_filler]

    labels = {
        "central-sulcus": "中心溝",
        "precentral-sulcus": "中心前溝",
        "lateral-sulcus": "外側溝",
        "superior-frontal-sulcus": "上前頭溝",
        "longitudinal-fissure": "大脳縦裂",
        "parieto-occipital-sulcus": "頭頂後頭溝",
        "calcarine-sulcus": "鳥距溝",
        "olfactory-sulcus": "嗅溝",
    }
    results = []
    for key, paths in guides.items():
        radius = 2.55 if key == "longitudinal-fissure" else 1.05
        result = write_mesh(key, tube_mesh(paths, radius=radius))
        result.update({"key": key, "label": labels[key], "sourceType": "schematic-surface-guide"})
        results.append(result)

    metadata = {
        "version": 1,
        "source": "project-authored seed curves projected to pial-left/right.mesh",
        "status": "schematic surface guides; not donor-traced or validated sulcal curves",
        "method": "nearest high-density pial vertex projection followed by thin tube generation; the longitudinal fissure uses an anterior-posterior extended midpoint filler recessed between left and right medial banks",
        "landmarks": results,
    }
    (OUT / "surface-landmarks.json").write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(metadata, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
