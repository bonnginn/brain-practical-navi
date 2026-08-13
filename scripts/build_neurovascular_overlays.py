#!/usr/bin/env python3
"""Build simplified 3D basal artery and cranial-nerve-root teaching overlays.

The paths are manually modelled in the same MNI-oriented display space as the
current pial-like brain. They represent major practical landmarks, not traced
angiography, dissection measurements, individual variation, or surgical data.
"""

import json
import struct
from pathlib import Path

import numpy as np


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "atlas"
SIDES = 10
DISPLAY_SHIFT = np.array([0., 18., -18.])


def p(x, y, z):
    """Anatomical MNI-like x (right), y (anterior), z (superior), in mm."""
    return [x, y, z]


def mirror(points):
    return [[-x, y, z] for x, y, z in points]


def catmull_rom(points, subdivisions=5):
    points = np.asarray(points, dtype=np.float64)
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


def tube_mesh(paths):
    vertices, normals, regions, faces = [], [], [], []
    for path in paths:
        centerline = catmull_rom(path["points"], path.get("subdivisions", 5))
        radius = float(path["radius"])
        start = len(vertices)
        previous_normal = None
        for index, center in enumerate(centerline):
            if index == 0:
                tangent = centerline[1] - center
            elif index == len(centerline) - 1:
                tangent = center - centerline[index - 1]
            else:
                tangent = centerline[index + 1] - centerline[index - 1]
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
            local_radius = radius
            if "bulb_radius" in path:
                taper_end = max(2, int(len(centerline) * .22))
                mix = min(1.0, index / taper_end)
                local_radius = float(path["bulb_radius"]) * (1.0 - mix) + radius * mix
            for side in range(SIDES):
                angle = 2 * np.pi * side / SIDES
                radial = normal * np.cos(angle) + binormal * np.sin(angle)
                vertices.append(center + radial * local_radius)
                normals.append(radial)
                regions.append(path["id"])
        rings = len(centerline)
        for ring in range(rings - 1):
            for side in range(SIDES):
                a = start + ring * SIDES + side
                b = start + ring * SIDES + (side + 1) % SIDES
                c = start + (ring + 1) * SIDES + (side + 1) % SIDES
                d = start + (ring + 1) * SIDES + side
                faces.extend([[a, b, c], [a, c, d]])
    return (np.asarray(vertices), np.asarray(normals),
            np.asarray(regions, dtype=np.float32), np.asarray(faces, dtype=np.uint32))


def write_mesh(name, paths, display_shift=True):
    xyz, normal_xyz, regions, faces = tube_mesh(paths)
    # Arterial paths follow the shifted pial source. Cranial-nerve roots are
    # anchored directly to the unshifted 0.5 mm brainstem segmentation surface.
    if display_shift:
        xyz = xyz + DISPLAY_SHIFT
    # AtlasVolumeCanvas stores p as z,y,x; its shader restores x,z,y for display.
    vertices = xyz[:, [2, 1, 0]].astype("<f4")
    normals = normal_xyz[:, [2, 1, 0]].astype("<f4")
    shade = np.ones(len(vertices), dtype="<f4")
    regions = regions.astype("<f4")
    faces = faces.astype("<u4")
    target = OUT / f"{name}.mesh"
    with target.open("wb") as handle:
        handle.write(b"BNM3" + struct.pack("<II", len(vertices), len(faces)))
        handle.write(vertices.tobytes())
        handle.write(normals.tobytes())
        handle.write(shade.tobytes())
        handle.write(regions.tobytes())
        handle.write(faces.tobytes())
    return {
        "file": target.name,
        "vertices": len(vertices),
        "faces": len(faces),
        "displayShiftApplied": display_shift,
        "structures": [{"id": path["id"], "name": path["name"]} for path in paths],
    }


def pair(name, points, radius):
    return [
        {"name": f"左{name}", "points": mirror(points), "radius": radius},
        {"name": f"右{name}", "points": points, "radius": radius},
    ]


def main():
    OUT.mkdir(parents=True, exist_ok=True)

    anterior_arteries = []
    # Calibrated around the CerebrA optic-chiasm/tract centroid
    # (MNI x=0, y=3.3, z=-19.6) instead of the former freehand +20 mm offset.
    anterior_arteries += pair("内頸動脈", [p(17, -4, -43), p(18, -2, -34), p(17, 2, -27), p(15, 7, -21)], 2.6)
    anterior_arteries += pair("前大脳動脈", [p(15, 7, -21), p(10, 9, -18), p(4, 11, -15), p(4, 20, -8), p(6, 32, 2)], 1.8)
    anterior_arteries.append({"name": "前交通動脈", "points": [p(-4, 11, -15), p(0, 12, -14), p(4, 11, -15)], "radius": 1.25})
    anterior_arteries += pair("中大脳動脈", [p(15, 7, -21), p(25, 8, -18), p(36, 10, -12), p(47, 10, -3), p(54, 8, 6)], 2.15)
    anterior_arteries += pair("後交通動脈", [p(15, 5, -23), p(14, 0, -24), p(12, -6, -25), p(11, -11, -26)], 1.15)

    posterior_arteries = []
    posterior_arteries += pair("椎骨動脈", [p(13, -73, -54), p(12, -64, -50), p(9, -55, -47), p(0, -47, -43)], 2.25)
    posterior_arteries.append({"name": "脳底動脈", "points": [p(0, -48, -43), p(0, -37, -39), p(0, -27, -34), p(0, -17, -29), p(0, -10, -26)], "radius": 2.5})
    posterior_arteries += pair("後大脳動脈", [p(0, -10, -26), p(11, -11, -26), p(23, -14, -22), p(36, -19, -16), p(49, -27, -7)], 1.9)
    posterior_arteries += pair("上小脳動脈", [p(0, -17, -32), p(12, -19, -34), p(25, -25, -31), p(38, -33, -25)], 1.25)
    posterior_arteries += pair("前下小脳動脈", [p(0, -34, -40), p(13, -36, -42), p(27, -41, -39), p(39, -47, -32)], 1.15)
    posterior_arteries += pair("後下小脳動脈", [p(10, -60, -49), p(21, -63, -48), p(32, -62, -43), p(40, -57, -36)], 1.15)

    anterior_nerves = []
    olfactory_paths = pair("I 嗅球・嗅索", [p(18, 62, -14), p(18, 49, -19), p(17, 36, -23), p(15, 25, -25)], 1.25)
    for path in olfactory_paths:
        path["bulb_radius"] = 3.8
    anterior_nerves += olfactory_paths
    anterior_nerves += pair("II 視神経", [p(42, 34, -24), p(32, 27, -25), p(20, 17, -25), p(8, 7, -24)], 1.95)
    anterior_nerves.append({"name": "II 視交叉", "points": [p(-8, 7, -24), p(0, 4, -24), p(8, 7, -24)], "radius": 2.3})
    # Roots III–XII are calibrated against practical label 27 in the same
    # ICBM500 grid as the specimen. The first point is the apparent origin.
    # III: ventral midbrain in the interpeduncular fossa.
    anterior_nerves += pair("III 動眼神経", [p(4, -6, -30), p(7, -1, -31), p(12, 5, -31), p(18, 11, -29)], 1.05)
    # IV: dorsal caudal midbrain, then around its lateral surface to the base.
    anterior_nerves += pair("IV 滑車神経", [p(7, -20, -35), p(11, -18, -36), p(15, -13, -36), p(19, -7, -35), p(24, -1, -33)], .72)

    pontine_nerves = []
    # V: broad root on the anterolateral pons.
    pontine_nerves += pair("V 三叉神経", [p(17, -6, -46), p(23, -2, -45), p(30, 2, -43), p(37, 7, -39)], 1.75)
    # VI–VIII: pontomedullary sulcus, ordered medial to lateral.
    pontine_nerves += pair("VI 外転神経", [p(3, 3, -58), p(6, 7, -58), p(10, 11, -57), p(14, 15, -54)], .72)
    pontine_nerves += pair("VII 顔面神経", [p(13, -1, -57), p(18, 3, -56), p(24, 7, -53), p(30, 11, -49)], .82)
    pontine_nerves += pair("VIII 内耳神経", [p(17, -6, -57), p(22, -3, -55), p(28, 1, -51), p(34, 5, -46)], 1.0)

    medullary_nerves = []
    # IX–XI: serial rootlets along the post-olivary sulcus.
    medullary_nerves += pair("IX 舌咽神経", [p(13, -26, -62), p(18, -22, -61), p(23, -17, -58), p(29, -11, -54)], .66)
    medullary_nerves += pair("X 迷走神経", [p(10.5, -25, -68), p(16, -22, -67), p(23, -18, -63), p(30, -13, -58)], .72)
    medullary_nerves += pair("XI 副神経", [p(9, -25, -76), p(14, -24, -74), p(20, -21, -70), p(27, -17, -64)], .68)
    # XII: pre-olivary sulcus, between pyramid and olive.
    medullary_nerves += pair("XII 舌下神経", [p(7, -8, -66), p(11, -5, -65), p(16, -2, -62), p(22, 2, -57)], .66)

    groups = {
        "overlay-arteries-anterior": anterior_arteries,
        "overlay-arteries-posterior": posterior_arteries,
        "overlay-nerves-anterior": anterior_nerves,
        "overlay-nerves-pontine": pontine_nerves,
        "overlay-nerves-medullary": medullary_nerves,
    }
    structure_id = 1
    for paths in groups.values():
        for path in paths:
            path["id"] = structure_id
            structure_id += 1
    results = [write_mesh(name, paths, display_shift=not name.startswith("overlay-nerves")) for name, paths in groups.items()]
    metadata = {
        "version": 1,
        "coordinateSpace": "manually approximated MNI-oriented display space",
        "displayShiftMm": DISPLAY_SHIFT.tolist(),
        "alignmentPolicy": "arteries retain the pial display shift; cranial-nerve roots are anchored directly to the ICBM500 brainstem segmentation",
        "cranialNerveRootCalibration": "III-XII apparent origins placed on or within 2 mm of practical label 27 surface; teaching approximation",
        "status": "project-authored simplified teaching overlay; not validated morphometry",
        "scope": "major basal arteries and visible cranial-nerve roots only",
        "omissions": ["individual variation", "small perforators", "distal nerve course beyond the proximal olfactory bulb/tract and cranial-nerve roots", "skull foramina", "surgical accuracy"],
        "groups": results,
    }
    (OUT / "neurovascular-overlays.json").write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(metadata, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
