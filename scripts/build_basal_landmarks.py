#!/usr/bin/env python3
"""Build simplified ventral-brain landmark meshes for practical teaching.

These project-authored meshes show the olfactory bulbs/tracts, optic
nerves/chiasm/tracts, infundibulum (pituitary stalk), mammillary bodies, and
anterior perforated substance in the same MNI-oriented display space as the
pial-like model. They are explanatory geometry, not donor-derived segmentation
or validated morphometry.
"""

import json
import struct
from pathlib import Path

import numpy as np


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "atlas"
SIDES = 12
DISPLAY_SHIFT = np.array([0., 18., -18.])


def p(x, y, z):
    """Anatomical x (right), y (anterior), z (superior), in display mm."""
    return [x, y, z]


def mirror(points):
    return [[-x, y, z] for x, y, z in points]


def catmull_rom(points, subdivisions=6):
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
    vertices, normals, faces = [], [], []
    for path in paths:
        centerline = catmull_rom(path["points"], path.get("subdivisions", 6))
        radius_start = float(path.get("radiusStart", path.get("radius", 1)))
        radius_end = float(path.get("radiusEnd", path.get("radius", radius_start)))
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
            fraction = index / max(1, len(centerline) - 1)
            radius = radius_start * (1 - fraction) + radius_end * fraction
            for side in range(SIDES):
                angle = 2 * np.pi * side / SIDES
                radial = normal * np.cos(angle) + binormal * np.sin(angle)
                vertices.append(center + radial * radius)
                normals.append(radial)
        rings = len(centerline)
        for ring in range(rings - 1):
            for side in range(SIDES):
                a = start + ring * SIDES + side
                b = start + ring * SIDES + (side + 1) % SIDES
                c = start + (ring + 1) * SIDES + (side + 1) % SIDES
                d = start + (ring + 1) * SIDES + side
                faces.extend([[a, b, c], [a, c, d]])
    return np.asarray(vertices), np.asarray(normals), np.asarray(faces, dtype=np.uint32)


def ellipsoid_mesh(center, radii, latitudes=18, longitudes=24):
    center = np.asarray(center, dtype=np.float64)
    radii = np.asarray(radii, dtype=np.float64)
    vertices, normals, faces = [], [], []
    for latitude in range(latitudes + 1):
        theta = np.pi * latitude / latitudes
        for longitude in range(longitudes):
            phi = 2 * np.pi * longitude / longitudes
            unit = np.array([np.sin(theta) * np.cos(phi),
                             np.sin(theta) * np.sin(phi), np.cos(theta)])
            vertices.append(center + unit * radii)
            normal = unit / radii
            normals.append(normal / max(np.linalg.norm(normal), 1e-8))
    for latitude in range(latitudes):
        for longitude in range(longitudes):
            a = latitude * longitudes + longitude
            b = latitude * longitudes + (longitude + 1) % longitudes
            c = (latitude + 1) * longitudes + (longitude + 1) % longitudes
            d = (latitude + 1) * longitudes + longitude
            faces.extend([[a, b, c], [a, c, d]])
    return np.asarray(vertices), np.asarray(normals), np.asarray(faces, dtype=np.uint32)


def combine(parts):
    vertices, normals, faces = [], [], []
    offset = 0
    for part_vertices, part_normals, part_faces in parts:
        vertices.append(part_vertices)
        normals.append(part_normals)
        faces.append(part_faces + offset)
        offset += len(part_vertices)
    return np.vstack(vertices), np.vstack(normals), np.vstack(faces)


def write_mesh(name, geometry):
    xyz, normal_xyz, faces = geometry
    # Match the display-space translation applied to the pial meshes.
    xyz = xyz + DISPLAY_SHIFT
    vertices = xyz[:, [2, 1, 0]].astype("<f4")
    normals = normal_xyz[:, [2, 1, 0]].astype("<f4")
    faces = faces.astype("<u4")
    target = OUT / f"{name}.mesh"
    with target.open("wb") as handle:
        handle.write(b"BNM1" + struct.pack("<II", len(vertices), len(faces)))
        handle.write(vertices.tobytes())
        handle.write(normals.tobytes())
        handle.write(faces.tobytes())
    return {"file": target.name, "vertices": len(vertices), "faces": len(faces)}


def main():
    OUT.mkdir(parents=True, exist_ok=True)

    optic_side = [p(23, 25, -24), p(18, 18, -25), p(12, 11, -25), p(7, 6, -24),
                  p(3, 4, -24), p(7, 2, -23), p(11, 0, -22), p(15, -6, -21), p(17, -11, -20)]
    optic_paths = [
        {"points": mirror(optic_side), "radiusStart": 2.2, "radiusEnd": 1.8},
        {"points": optic_side, "radiusStart": 2.2, "radiusEnd": 1.8},
        {"points": [p(-9, 4, -24), p(0, 4, -24), p(9, 4, -24)], "radius": 2.7},
    ]
    optic = tube_mesh(optic_paths)

    olfactory = combine([
        tube_mesh([
            {"points": mirror([p(14, 62, -23), p(14, 50, -27), p(14, 38, -29), p(13, 27, -28)]), "radiusStart": 1.7, "radiusEnd": 1.15},
            {"points": [p(14, 62, -23), p(14, 50, -27), p(14, 38, -29), p(13, 27, -28)], "radiusStart": 1.7, "radiusEnd": 1.15},
        ]),
        ellipsoid_mesh(p(-14, 62, -23), [3.5, 5.0, 2.8]),
        ellipsoid_mesh(p(14, 62, -23), [3.5, 5.0, 2.8]),
    ])

    # The diencephalic teaching mesh reaches an inferior z of about -36.5 mm
    # after display alignment.  Seat both landmarks in that surface instead of
    # leaving the former ~6 mm air gap beneath the hypothalamus.
    infundibulum = combine([
        ellipsoid_mesh(p(0, -1, -18.5), [3.8, 3.2, 1.9]),
        tube_mesh([{"points": [p(0, -1, -19.5), p(0, -1, -24.5), p(0, -1, -30.5)],
                    "radiusStart": 2.5, "radiusEnd": 1.45, "subdivisions": 8}]),
    ])
    mammillary = combine([
        ellipsoid_mesh(p(-4.0, -10.0, -21.0), [3.1, 3.4, 2.8]),
        ellipsoid_mesh(p(4.0, -10.0, -21.0), [3.1, 3.4, 2.8]),
    ])
    anterior_perforated = combine([
        ellipsoid_mesh(p(-14.0, 11.0, -22.5), [8.0, 6.0, 1.0]),
        ellipsoid_mesh(p(14.0, 11.0, -22.5), [8.0, 6.0, 1.0]),
    ])

    meshes = {
        "landmark-olfactory-pathway": (olfactory, "嗅球・嗅索"),
        "landmark-optic-pathway": (optic, "視神経・視交叉・視索"),
        "landmark-infundibulum": (infundibulum, "漏斗（下垂体茎）"),
        "landmark-mammillary-bodies": (mammillary, "乳頭体"),
        "landmark-anterior-perforated-substance": (anterior_perforated, "前有孔質（位置目安）"),
    }
    results = []
    for name, (geometry, label) in meshes.items():
        result = write_mesh(name, geometry)
        result["label"] = label
        results.append(result)

    metadata = {
        "version": 2,
        "coordinateSpace": "manually approximated MNI-oriented display space",
        "displayShiftMm": DISPLAY_SHIFT.tolist(),
        "alignmentPolicy": "same [x, y, z] display shift as the pial meshes",
        "status": "project-authored simplified teaching landmarks; not validated segmentation or morphometry",
        "anteriorToPosteriorOrder": ["olfactory bulbs/tracts", "anterior perforated substance", "optic nerves/chiasm", "infundibulum", "mammillary bodies"],
        "specimenNote": "the pituitary gland is not shown; a brain specimen may retain only a cut stalk",
        "attachmentPolicy": "infundibulum and mammillary bodies overlap the inferior hypothalamic teaching surface; no detached floating landmarks",
        "meshes": results,
    }
    (OUT / "basal-landmarks.json").write_text(
        json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(metadata, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
