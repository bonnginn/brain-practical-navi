#!/usr/bin/env python3
"""Build structure-focused 3D teaching specimens from the 0.5 mm BigBrain volume.

These are deliberately not generic thick slabs. Each specimen removes enough
surrounding tissue to expose one practical-learning relationship. Tissue,
ventricles and available nuclei are reconstructed from the co-registered volume.
Fiber routes, choroid plexus, fimbria, fornix, thin midline structures and
regional markers are project-authored teaching approximations and are identified
as such in the generated metadata.
"""

from __future__ import annotations

import gzip
import json
import struct
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from scipy import ndimage
from skimage.measure import marching_cubes


ROOT = Path(__file__).resolve().parents[1]
ATLAS = ROOT / "public" / "atlas"
BIGBRAIN = ATLAS / "bigbrain-icbm500.bin.gz"
SEGMENTATION = ATLAS / "bigbrain-practical-segmentation-icbm500.bin.gz"

ORIGIN_XYZ = np.array([-98.0, -116.0, -90.0], dtype=np.float32)
SOURCE_SPACING_MM = 0.5
GEOMETRY_STRIDE = 2
GEOMETRY_SPACING_MM = SOURCE_SPACING_MM * GEOMETRY_STRIDE

RIGHT_CAUDATE = 8
RIGHT_PUTAMEN = 10
RIGHT_GPE = 12
RIGHT_GPI = 14
THALAMI = (15, 16)
RIGHT_THALAMUS = 16
RIGHT_HIPPOCAMPUS = 18
RIGHT_AMYGDALA = 22
RIGHT_LATERAL_VENTRICLE = 24
VENTRICLES = (23, 24, 25, 26)
LATERAL_VENTRICLES = (23, 24)
THIRD_VENTRICLE = 25
CEREBELLUM = (28, 29)
BRAINSTEM = 27
CORPUS_CALLOSUM = 30
RIGHT_INTERNAL_CAPSULE = 32
RED_NUCLEI = (1, 2)
SUBSTANTIA_NIGRA = (3, 4)
SUBTHALAMIC_NUCLEI = (5, 6)
MIDBRAIN_MIN_Z_MM = -40.0


@dataclass(frozen=True)
class Part:
    key: str
    mask: np.ndarray
    name_ja: str
    source: str
    color: str
    material: str = "model"


def read_volume(path: Path, magic: bytes) -> tuple[np.ndarray, tuple[int, int, int]]:
    payload = gzip.decompress(path.read_bytes())
    if payload[:4] != magic:
        raise ValueError(f"unexpected header in {path.name}: {payload[:4]!r}")
    dims = struct.unpack("<HHH", payload[4:10])
    values = np.frombuffer(payload, dtype=np.uint8, offset=10)
    return values.reshape((dims[2], dims[1], dims[0])), dims


def largest_component(mask: np.ndarray) -> np.ndarray:
    labels, count = ndimage.label(mask)
    if count == 0:
        return mask
    sizes = np.bincount(labels.ravel())
    sizes[0] = 0
    return labels == sizes.argmax()


def world_grids(shape: tuple[int, int, int]) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    z = ORIGIN_XYZ[2] + np.arange(shape[0], dtype=np.float32) * GEOMETRY_SPACING_MM
    y = ORIGIN_XYZ[1] + np.arange(shape[1], dtype=np.float32) * GEOMETRY_SPACING_MM
    x = ORIGIN_XYZ[0] + np.arange(shape[2], dtype=np.float32) * GEOMETRY_SPACING_MM
    return z[:, None, None], y[None, :, None], x[None, None, :]


def bounds(zz: np.ndarray, yy: np.ndarray, xx: np.ndarray, *, x: tuple[float, float], y: tuple[float, float], z: tuple[float, float]) -> np.ndarray:
    return (xx >= x[0]) & (xx <= x[1]) & (yy >= y[0]) & (yy <= y[1]) & (zz >= z[0]) & (zz <= z[1])


def ball(radius_mm: float) -> np.ndarray:
    radius = max(1, int(np.ceil(radius_mm / GEOMETRY_SPACING_MM)))
    q = np.arange(-radius, radius + 1, dtype=np.float32) * GEOMETRY_SPACING_MM
    zz, yy, xx = np.meshgrid(q, q, q, indexing="ij")
    return (xx * xx + yy * yy + zz * zz) <= radius_mm * radius_mm


def polyline_mask(shape: tuple[int, int, int], points_xyz: list[tuple[float, float, float]], radius_mm: float) -> np.ndarray:
    """Rasterize a smooth-enough teaching path on the 1 mm geometry grid."""
    seeds = np.zeros(shape, dtype=bool)
    for start, end in zip(points_xyz, points_xyz[1:]):
        a = np.asarray(start, dtype=np.float32)
        b = np.asarray(end, dtype=np.float32)
        count = max(2, int(np.linalg.norm(b - a) / 0.55) + 1)
        for point in np.linspace(a, b, count):
            xyz = np.rint((point - ORIGIN_XYZ) / GEOMETRY_SPACING_MM).astype(int)
            zyx = (xyz[2], xyz[1], xyz[0])
            if all(0 <= zyx[i] < shape[i] for i in range(3)):
                seeds[zyx] = True
    return ndimage.binary_dilation(seeds, structure=ball(radius_mm))


def ellipse_mask(zz: np.ndarray, yy: np.ndarray, xx: np.ndarray, center: tuple[float, float, float], radii: tuple[float, float, float]) -> np.ndarray:
    cx, cy, cz = center
    rx, ry, rz = radii
    return ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2 + ((zz - cz) / rz) ** 2 <= 1


def specimen_definitions(raw: np.ndarray, seg: np.ndarray) -> dict[str, list[Part]]:
    zz, yy, xx = world_grids(raw.shape)
    outside_free = largest_component(raw < 252)
    tissue = outside_free & ~np.isin(seg, VENTRICLES)

    right_ventricle = seg == RIGHT_LATERAL_VENTRICLE
    lateral_ventricles = np.isin(seg, LATERAL_VENTRICLES)
    caudate = seg == RIGHT_CAUDATE
    thalamus = seg == RIGHT_THALAMUS
    thalami = np.isin(seg, THALAMI)
    subthalamic_nuclei = np.isin(seg, SUBTHALAMIC_NUCLEI)
    third_ventricle = seg == THIRD_VENTRICLE
    hippocampus = seg == RIGHT_HIPPOCAMPUS
    amygdala = seg == RIGHT_AMYGDALA
    right_putamen = seg == RIGHT_PUTAMEN
    right_gpe = seg == RIGHT_GPE
    right_gpi = seg == RIGHT_GPI
    lentiform = right_putamen | right_gpe | right_gpi
    internal_capsule = seg == RIGHT_INTERNAL_CAPSULE
    corpus_callosum = seg == CORPUS_CALLOSUM
    red_nuclei = np.isin(seg, RED_NUCLEI)
    substantia_nigra = np.isin(seg, SUBSTANTIA_NIGRA)

    # 1) Lateral ventricle: retain a medial/periventricular support rather than a
    # whole hemisphere, so the actual C-shaped cavity can be inspected in full.
    distance_to_ventricle = ndimage.distance_transform_edt(~right_ventricle) * GEOMETRY_SPACING_MM
    ventricular_region = bounds(zz, yy, xx, x=(-3, 44), y=(-64, 52), z=(-52, 17))
    ventricular_support = tissue & ventricular_region & (distance_to_ventricle <= 11)
    # Open the lateral side while preserving roof, medial wall and temporal floor.
    ventricular_support &= (xx <= 13) | (zz <= -25) | (zz >= 8)
    ventricular_support &= ~(caudate | thalamus | hippocampus)

    # 2) Diencephalon: expose the paired thalami around the third ventricle and
    # retain their vertical relationship with the hypothalamic region and STN.
    # The hypothalamus is not independently segmented in the current grid, so a
    # conservative medial region marker is kept explicitly provisional.
    diencephalon_region = bounds(zz, yy, xx, x=(-30, 30), y=(-31, 39), z=(-45, 12))
    hypothalamus = tissue & ellipse_mask(zz, yy, xx, (0, 7, -28), (14, 24, 13))
    hypothalamus &= diencephalon_region & ~(thalami | subthalamic_nuclei)
    mammillary_bodies = (
        ellipse_mask(zz, yy, xx, (-4, -10, -27), (3.8, 4.0, 3.4))
        | ellipse_mask(zz, yy, xx, (4, -10, -27), (3.8, 4.0, 3.4))
    ) & diencephalon_region
    diencephalon_support = tissue & diencephalon_region & ((xx <= -13) | (zz <= -39))
    diencephalon_support &= ~(thalami | subthalamic_nuclei | hypothalamus | mammillary_bodies)

    # 3) Lentiform / radiations: a compact horizontal cut specimen. Available
    # segmentations touch the upper cut face. Schematic pathways are projected
    # 1.5 mm above that face so their course is readable without pretending they
    # were segmented from histology.
    radiation_box = bounds(zz, yy, xx, x=(0, 67), y=(-76, 48), z=(-29, 9))
    radiation_tissue = tissue & radiation_box & ~(lentiform | internal_capsule)
    surface_z = 10.5
    corona_paths = np.zeros_like(tissue)
    for endpoint in [(35, 42, surface_z), (48, 25, surface_z), (56, 5, surface_z), (48, -18, surface_z), (31, -36, surface_z)]:
        corona_paths |= polyline_mask(raw.shape, [(18, 12, surface_z), (24, 12, surface_z), endpoint], 1.25)
    optic_paths = np.zeros_like(tissue)
    for offset in (-3.5, 0, 3.5):
        optic_paths |= polyline_mask(raw.shape, [(18, -13, surface_z), (29 + offset, -25, surface_z), (36 + offset, -50, surface_z), (34 + offset, -72, surface_z)], 1.15)
    auditory_paths = np.zeros_like(tissue)
    for offset in (-2.5, 0, 2.5):
        auditory_paths |= polyline_mask(raw.shape, [(18, -17, surface_z), (29, -16 + offset, surface_z), (44, -10 + offset, surface_z), (55, -7 + offset, surface_z)], 1.1)
    path_crop = bounds(zz, yy, xx, x=(0, 67), y=(-78, 49), z=(8.5, 13))
    corona_paths &= path_crop
    optic_paths &= path_crop
    auditory_paths &= path_crop
    deep_crop = bounds(zz, yy, xx, x=(0, 40), y=(-12, 46), z=(-29, 9))

    # 4) Corpus callosum / fornix: a restricted midline specimen. The corpus
    # callosum is the existing image-guided candidate; fornix and septum are
    # teaching geometry because those thin structures are not independently
    # segmented at a usable quality in the present volume.
    commissural_region = bounds(zz, yy, xx, x=(-19, 19), y=(-39, 60), z=(-24, 26))
    distance_to_lateral_ventricles = ndimage.distance_transform_edt(~lateral_ventricles) * GEOMETRY_SPACING_MM
    commissural_support = tissue & commissural_region & (distance_to_lateral_ventricles <= 13)
    commissural_support &= (xx <= -8) | (zz >= 19)
    fornix = np.zeros_like(tissue)
    for side in (-3.0, 3.0):
        fornix |= polyline_mask(raw.shape, [(side, -29, -7), (side, -10, -5), (side, 7, -3), (side, 20, -7), (side, 25, -21)], 1.55)
    fornix &= commissural_region
    septum_pellucidum = (
        (np.abs(xx) <= 1.25)
        & (((yy - 18) / 22) ** 2 + ((zz - 4) / 13) ** 2 <= 1)
        & commissural_region
    )
    commissural_support &= ~(corpus_callosum | fornix | septum_pellucidum)

    # 5) Choroid plexus: an opened medial wall plus the actual ventricular cast.
    # The plexus itself is a branched teaching model following the choroidal
    # fissure, because it is not resolved by the current segmentation.
    choroid_region = bounds(zz, yy, xx, x=(-3, 38), y=(-42, 43), z=(-49, 12))
    choroid_support = tissue & choroid_region & (distance_to_ventricle <= 8.5) & ((xx <= 10) | (zz <= -29))
    choroid_support &= ~hippocampus
    choroid = polyline_mask(raw.shape, [(8, 25, -2), (8, 5, -4), (10, -14, -11), (14, -26, -23), (17, -17, -37), (17, 2, -41)], 1.35)
    for anchor in [(8, 21, -2), (8, 11, -3), (9, 0, -6), (11, -11, -11), (14, -23, -22), (17, -18, -33), (17, -7, -40), (17, 2, -41)]:
        ax, ay, az = anchor
        choroid |= polyline_mask(raw.shape, [(ax, ay, az), (ax + 4.5, ay + 1.5, az + 1.5)], 0.95)
        choroid |= polyline_mask(raw.shape, [(ax, ay, az), (ax + 3.5, ay - 2.2, az - 1.2)], 0.9)
    choroid &= choroid_region

    # 6) Medial temporal specimen: actual hippocampus/amygdala are separated from
    # their local tissue block. Fimbria and uncus are explicit teaching markers.
    temporal_box = bounds(zz, yy, xx, x=(3, 43), y=(-31, 35), z=(-54, -19))
    temporal_tissue = tissue & temporal_box & ~(hippocampus | amygdala)
    inferior_horn = right_ventricle & temporal_box
    fimbria = polyline_mask(raw.shape, [(11, 5, -28), (13, -4, -31), (15, -13, -35), (18, -22, -38)], 1.5) & temporal_box
    uncus = tissue & ellipse_mask(zz, yy, xx, (14, 20, -38), (8.5, 11, 8.5)) & temporal_box
    temporal_tissue &= ~uncus

    # 7) Midbrain transverse specimen: a real 10 mm tissue slab at the level of
    # red nucleus and substantia nigra. The aqueduct is a through-slab cavity
    # marker, while the peduncular regions are conservative surface regions.
    midbrain_box = bounds(zz, yy, xx, x=(-24, 24), y=(-32, 20), z=(-36, -26))
    midbrain_slab = tissue & (seg == BRAINSTEM) & midbrain_box
    aqueduct = polyline_mask(raw.shape, [(0, -11, -36), (0, -11, -26)], 2.25) & midbrain_box
    cerebral_peduncles = (
        ellipse_mask(zz, yy, xx, (-11, 7, -31), (9, 10, 5.5))
        | ellipse_mask(zz, yy, xx, (11, 7, -31), (9, 10, 5.5))
    ) & tissue & midbrain_box
    red_in_slab = red_nuclei & midbrain_box
    nigra_in_slab = substantia_nigra & midbrain_box
    midbrain_slab &= ~(red_in_slab | nigra_in_slab | aqueduct | cerebral_peduncles)

    # 8) Retain the detachable hindbrain specimen requested earlier.
    midbrain = tissue & (seg == BRAINSTEM) & (zz >= MIDBRAIN_MIN_Z_MM)
    pons_medulla = tissue & (seg == BRAINSTEM) & ~midbrain
    cerebellum = tissue & np.isin(seg, CEREBELLUM)

    return {
        "lateral-ventricle": [
            Part("tissue", ventricular_support, "脳室周囲実質", "specimen-derived", "#c9a27d", "specimen"),
            Part("ventricular-cavity", right_ventricle & ventricular_region, "側脳室腔", "same-grid-segmentation", "#45aebd"),
            Part("caudate", caudate & ventricular_region, "尾状核", "manual-segmentation", "#dc914b"),
            Part("thalamus", thalamus & ventricular_region, "視床", "manual-segmentation", "#8d82c4"),
            Part("hippocampus", hippocampus & ventricular_region, "海馬", "manual-segmentation", "#c8798d"),
        ],
        "diencephalon": [
            Part("tissue", diencephalon_support, "間脳周囲実質", "specimen-derived", "#c9a27d", "specimen"),
            Part("thalami", thalami & diencephalon_region, "視床", "manual-segmentation", "#8d82c4"),
            Part("third-ventricle", third_ventricle & diencephalon_region, "第三脳室", "same-grid-segmentation", "#45aebd"),
            Part("hypothalamus", hypothalamus, "視床下部（位置目安）", "regional-approximation", "#b97864"),
            Part("subthalamic-nuclei", subthalamic_nuclei & diencephalon_region, "視床下核", "manual-segmentation", "#e0ad45"),
            Part("mammillary-bodies", mammillary_bodies, "乳頭体", "schematic-3d", "#a8795f"),
        ],
        "radiations": [
            Part("tissue", radiation_tissue, "水平切断標本", "specimen-derived", "#c9a27d", "specimen"),
            Part("putamen", right_putamen & deep_crop, "被殻", "manual-segmentation", "#d9854f"),
            Part("pallidum-external", right_gpe & deep_crop, "淡蒼球外節", "manual-segmentation", "#d0ae5c"),
            Part("pallidum-internal", right_gpi & deep_crop, "淡蒼球内節", "manual-segmentation", "#b88d42"),
            Part("internal-capsule", internal_capsule & deep_crop, "内包", "image-guided-segmentation", "#e4d27a"),
            Part("corona-radiata", corona_paths, "放線冠", "schematic-surface-guide", "#e7c85d"),
            Part("optic-radiation", optic_paths, "視放線", "schematic-surface-guide", "#7d9fd0"),
            Part("auditory-radiation", auditory_paths, "聴放線", "schematic-surface-guide", "#74b99e"),
        ],
        "commissural-system": [
            Part("tissue", commissural_support, "正中周囲実質", "specimen-derived", "#c9a27d", "specimen"),
            Part("corpus-callosum", corpus_callosum & commissural_region, "脳梁", "image-guided-segmentation", "#dbc270"),
            Part("lateral-ventricles", lateral_ventricles & commissural_region, "側脳室", "same-grid-segmentation", "#45aebd"),
            Part("fornix", fornix, "脳弓", "schematic-3d", "#e7d9a6"),
            Part("septum-pellucidum", septum_pellucidum, "透明中隔", "regional-approximation", "#a9c5bd"),
        ],
        "choroid-plexus": [
            Part("tissue", choroid_support, "脳室内側壁", "specimen-derived", "#c9a27d", "specimen"),
            Part("ventricular-cavity", right_ventricle & choroid_region, "側脳室腔", "same-grid-segmentation", "#45aebd"),
            Part("choroid-plexus", choroid, "脈絡叢", "schematic-3d", "#b34c62"),
            Part("hippocampus", hippocampus & choroid_region, "海馬", "manual-segmentation", "#c8798d"),
        ],
        "medial-temporal": [
            Part("tissue", temporal_tissue, "内側側頭葉標本", "specimen-derived", "#c9a27d", "specimen"),
            Part("hippocampus", hippocampus & temporal_box, "海馬", "manual-segmentation", "#c8798d"),
            Part("amygdala", amygdala & temporal_box, "扁桃体", "manual-segmentation", "#9c6cae"),
            Part("inferior-horn", inferior_horn, "側脳室下角", "same-grid-segmentation", "#45aebd"),
            Part("fimbria", fimbria, "海馬采", "schematic-3d", "#e3d8b0"),
            Part("uncus", uncus, "鉤（位置目安）", "regional-approximation", "#b78165"),
        ],
        "midbrain-section": [
            Part("tissue", midbrain_slab, "中脳横断標本", "specimen-derived", "#c9a27d", "specimen"),
            Part("red-nuclei", red_in_slab, "赤核", "manual-segmentation", "#d24f49"),
            Part("substantia-nigra", nigra_in_slab, "黒質", "manual-segmentation", "#716387"),
            Part("aqueduct", aqueduct, "中脳水道", "schematic-3d", "#45aebd"),
            Part("cerebral-peduncles", cerebral_peduncles, "大脳脚（位置目安）", "regional-approximation", "#d29a55"),
        ],
        "hindbrain": [
            Part("pons-medulla", pons_medulla, "橋・延髄", "same-grid-segmentation", "#b89778", "specimen"),
            Part("cerebellum", cerebellum, "小脳", "same-grid-segmentation", "#d0ad83", "specimen"),
            Part("midbrain", midbrain, "中脳", "teaching-segmentation", "#bd8e69", "specimen"),
        ],
    }


def sample_shade(values: np.ndarray, mask: np.ndarray, vertices: np.ndarray, normals: np.ndarray) -> np.ndarray:
    shape = np.array(values.shape, dtype=np.float32)
    candidates: list[np.ndarray] = []
    occupied: list[np.ndarray] = []
    mask_float = mask.astype(np.float32)
    for offset in (-0.75, 0.75, -1.5, 1.5, 0.0):
        points = np.clip(vertices + normals * offset, 0, shape - 1).T
        candidates.append(ndimage.map_coordinates(values, points, order=1, mode="nearest"))
        occupied.append(ndimage.map_coordinates(mask_float, points, order=0, mode="nearest") > 0.5)
    stacked = np.stack(candidates)
    occupied_array = np.stack(occupied)
    valid = (stacked < 252) & occupied_array
    picked = np.full(vertices.shape[0], 170.0, dtype=np.float32)
    chosen = np.zeros(vertices.shape[0], dtype=bool)
    for row in range(stacked.shape[0]):
        use = valid[row] & ~chosen
        picked[use] = stacked[row, use]
        chosen[use] = True
    return np.clip((picked - 30.0) / 215.0, 0.0, 1.0).astype("<f4")


def mesh_from_mask(mask: np.ndarray, values: np.ndarray, specimen_material: bool) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    if np.count_nonzero(mask) < 8:
        raise ValueError("specimen part contains too few voxels")
    occupied = np.argwhere(mask)
    lo = np.maximum(occupied.min(axis=0) - 2, 0)
    hi = np.minimum(occupied.max(axis=0) + 3, mask.shape)
    slices = tuple(slice(int(lo[i]), int(hi[i])) for i in range(3))
    local_mask = mask[slices]
    local_values = values[slices]
    sigma = 0.42 if specimen_material else 0.34
    field = ndimage.gaussian_filter(local_mask.astype(np.float32), sigma=sigma)
    vertices, faces, normals, _ = marching_cubes(field, level=0.5)
    shade = sample_shade(local_values, local_mask, vertices, normals) if specimen_material else np.full(len(vertices), 0.82, dtype="<f4")
    full_zyx = vertices + lo
    z_world = ORIGIN_XYZ[2] + full_zyx[:, 0] * GEOMETRY_SPACING_MM
    y_world = ORIGIN_XYZ[1] + full_zyx[:, 1] * GEOMETRY_SPACING_MM
    x_world = ORIGIN_XYZ[0] + full_zyx[:, 2] * GEOMETRY_SPACING_MM
    stored_vertices = np.column_stack((z_world, y_world, x_world)).astype("<f4")
    return stored_vertices, normals.astype("<f4"), shade, faces.astype("<u4")


def write_mesh(name: str, mesh: tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]) -> dict[str, int | str | float]:
    vertices, normals, shade, faces = mesh
    path = ATLAS / f"{name}.mesh"
    with path.open("wb") as handle:
        handle.write(b"BNM2" + struct.pack("<II", len(vertices), len(faces)))
        handle.write(vertices.tobytes())
        handle.write(normals.tobytes())
        handle.write(shade.tobytes())
        handle.write(faces.tobytes())
    return {
        "file": path.name,
        "vertices": len(vertices),
        "faces": len(faces),
        "shadeMin": round(float(shade.min()), 4),
        "shadeMax": round(float(shade.max()), 4),
    }


def main() -> None:
    raw_05, raw_dims = read_volume(BIGBRAIN, b"BBV1")
    seg_05, seg_dims = read_volume(SEGMENTATION, b"BBS1")
    if raw_dims != seg_dims:
        raise ValueError(f"volume/segmentation mismatch: {raw_dims} != {seg_dims}")

    raw = raw_05[::GEOMETRY_STRIDE, ::GEOMETRY_STRIDE, ::GEOMETRY_STRIDE].copy()
    seg = seg_05[::GEOMETRY_STRIDE, ::GEOMETRY_STRIDE, ::GEOMETRY_STRIDE]
    specimens = specimen_definitions(raw, seg)

    results: dict[str, list[dict[str, int | str | float]]] = {}
    for specimen_key, parts in specimens.items():
        results[specimen_key] = []
        for part in parts:
            filename = f"block-{specimen_key}-{part.key}"
            result = write_mesh(filename, mesh_from_mask(part.mask, raw, part.material == "specimen"))
            result.update({
                "part": part.key,
                "nameJa": part.name_ja,
                "sourceType": part.source,
                "color": part.color,
                "material": part.material,
            })
            results[specimen_key].append(result)
            print(f"{filename}: {result['vertices']:,} vertices, {result['faces']:,} faces")

    metadata = {
        "version": 3,
        "source": BIGBRAIN.name,
        "segmentation": SEGMENTATION.name,
        "sourceVoxelMm": SOURCE_SPACING_MM,
        "geometrySamplingMm": GEOMETRY_SPACING_MM,
        "specimens": results,
        "sourceTypeDefinitions": {
            "specimen-derived": "surface reconstructed directly from the 0.5 mm histological volume",
            "manual-segmentation": "same-grid manually delineated subcortical structure",
            "same-grid-segmentation": "same-grid practical teaching segmentation",
            "image-guided-segmentation": "image-guided provisional white-matter segmentation",
            "teaching-segmentation": "project-authored teaching subdivision of a same-grid label",
            "schematic-surface-guide": "project-authored pathway projected onto the specimen cut face",
            "schematic-3d": "project-authored three-dimensional teaching approximation",
            "regional-approximation": "project-authored regional location marker, not a validated boundary",
        },
        "status": "structure-focused teaching specimens; not validated morphometry or surgical anatomy",
    }
    (ATLAS / "specimen-blocks.json").write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
