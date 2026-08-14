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
        centerline += np.asarray(path.get("display_shift", [0., 0., 0.]), dtype=np.float64)
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
    # The anterior circulation follows the shifted pial source. Individual
    # forebrain nerve paths can request the same shift, while III-XII remain
    # authored directly against the unshifted brainstem segmentation surface.
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
        "structures": [{"id": path["id"], "name": path["name"],
                        "displayShiftApplied": bool(display_shift or "display_shift" in path)}
                       for path in paths],
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
    # Track the ventrolateral medulla, converge at the pontomedullary junction,
    # and continue over the ventral pons. These coordinates are calibrated to
    # the unshifted practical-label-27 brainstem surface.
    posterior_arteries += pair("椎骨動脈", [p(7, -12, -82), p(8, -10, -75), p(10, -4, -68), p(8, 2.5, -63), p(4, 6, -59), p(0, 7, -58)], 2.25)
    posterior_arteries.append({"name": "脳底動脈", "points": [p(0, 7, -58), p(0, 7, -53), p(0, 7, -48), p(0, 6.5, -44), p(0, 6, -40)], "radius": 2.5})
    posterior_arteries += pair("後大脳動脈", [p(0, 6, -40), p(11, 4, -39), p(23, -2, -35), p(36, -12, -27), p(49, -22, -18)], 1.9)
    posterior_arteries += pair("上小脳動脈", [p(0, 6, -42), p(12, 3, -43), p(25, -6, -40), p(38, -18, -33)], 1.25)
    posterior_arteries += pair("前下小脳動脈", [p(0, 7, -51), p(13, 3, -53), p(27, -6, -50), p(39, -18, -43)], 1.15)
    posterior_arteries += pair("後下小脳動脈", [p(9, -2, -66), p(18, -10, -68), p(30, -22, -61), p(40, -30, -50)], 1.15)

    anterior_nerves = []
    # The olfactory bulb and tract lie in the olfactory sulcus between the
    # gyrus rectus and orbital gyri. Keep the tract narrow and follow the local
    # inferior pial trough instead of suspending it over the orbital surface.
    olfactory_paths = pair("I 嗅球・嗅索", [p(14, 62, -23), p(14, 50, -27), p(14, 38, -29), p(13, 27, -28)], 1.15)
    for path in olfactory_paths:
        path["bulb_radius"] = 3.8
        path["display_shift"] = DISPLAY_SHIFT.tolist()
    anterior_nerves += olfactory_paths
    # Continue each optic nerve through the chiasmal junction into the optic
    # tract. The paired curves form the gross X-shaped pathway in inferior
    # view; the short transverse bridge below gives the chiasm a visible body.
    optic_paths = pair("II 視神経・視索", [p(23, 25, -24), p(18, 18, -25), p(12, 11, -25), p(7, 6, -24),
                                             p(3, 4, -24), p(7, 2, -23), p(11, 0, -22), p(15, -6, -21), p(17, -11, -20)], 1.95)
    for path in optic_paths:
        path["display_shift"] = DISPLAY_SHIFT.tolist()
    anterior_nerves += optic_paths
    anterior_nerves.append({"name": "II 視交叉", "points": [p(-9, 4, -24), p(0, 4, -24), p(9, 4, -24)], "radius": 2.55,
                            "display_shift": DISPLAY_SHIFT.tolist()})
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
    results = [
        write_mesh(name, paths, display_shift=name == "overlay-arteries-anterior")
        for name, paths in groups.items()
    ]
    metadata = {
        "version": 2,
        "coordinateSpace": "manually approximated MNI-oriented display space",
        "displayShiftMm": DISPLAY_SHIFT.tolist(),
        "alignmentPolicy": "anterior arteries and forebrain-associated cranial nerves I-II retain the pial display shift; vertebrobasilar arteries and cranial-nerve roots III-XII are anchored directly to the ICBM500 brainstem segmentation",
        "vertebrobasilarCalibration": "vertebral arteries track the ventrolateral medulla, unite at the pontomedullary junction, and continue over the ventral pons; teaching approximation",
        "forebrainNerveCalibration": "olfactory bulbs and tracts plus optic nerves and chiasm follow the shifted pial source so they remain exposed on the inferior surface; teaching approximation",
        "cranialNerveRootCalibration": "III-XII apparent origins placed on or within 2 mm of practical label 27 surface; teaching approximation",
        "cranialNerveRootTopography": {
            "I-II": "basal forebrain rather than brainstem roots",
            "III": "ventral midbrain, interpeduncular fossa",
            "IV": "dorsal caudal midbrain, just caudal to the inferior colliculi, then wraps laterally",
            "V": "anterolateral mid-pons",
            "VI": "medial pontomedullary sulcus",
            "VII-VIII": "pontomedullary sulcus/cerebellopontine angle, lateral to VI; VII medial to VIII",
            "IX-XI": "post-olivary sulcus, ordered superior to inferior",
            "XII": "pre-olivary sulcus between pyramid and olive",
        },
        "anatomyReferences": [
            "https://www.ncbi.nlm.nih.gov/books/NBK608599/",
            "https://www.ncbi.nlm.nih.gov/books/NBK406/",
            "https://www.ncbi.nlm.nih.gov/books/NBK544297/",
        ],
        "status": "project-authored simplified teaching overlay; not validated morphometry",
        "scope": "major basal arteries and visible cranial-nerve roots only",
        "omissions": ["individual variation", "small perforators", "distal nerve course beyond the proximal olfactory bulb/tract and cranial-nerve roots", "skull foramina", "surgical accuracy"],
        "groups": results,
    }
    (OUT / "neurovascular-overlays.json").write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(metadata, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
