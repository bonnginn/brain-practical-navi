#!/usr/bin/env python3
"""Build colourable 3D counterparts for section-practical label layers.

The source is the exact 0.5 mm practical-segmentation grid. Geometry is reduced
to 1 mm and written as a teaching surface without external meshing dependencies,
keeping this asset build reproducible with NumPy alone.
"""

from __future__ import annotations

import gzip
import struct
from pathlib import Path

import numpy as np


ROOT = Path(__file__).resolve().parents[1]
ATLAS = ROOT / "public" / "atlas"
SEGMENTATION = ATLAS / "bigbrain-practical-segmentation-icbm500.bin.gz"
ORIGIN_ZYX = np.array([-90.0, -116.0, -98.0], dtype=np.float32)
GEOMETRY_STRIDE = 2


STRUCTURES = {
    "section-accumbens": (19, 20),
    "section-optic-chiasm": (33,),
    "section-insula": (34, 35),
}

POSITIVE_CORNERS = {
    0: np.array([[.5, -.5, -.5], [.5, .5, -.5], [.5, .5, .5], [.5, -.5, .5]], dtype=np.float32),
    1: np.array([[-.5, .5, -.5], [-.5, .5, .5], [.5, .5, .5], [.5, .5, -.5]], dtype=np.float32),
    2: np.array([[-.5, -.5, .5], [.5, -.5, .5], [.5, .5, .5], [-.5, .5, .5]], dtype=np.float32),
}


def read_labels() -> np.ndarray:
    payload = gzip.decompress(SEGMENTATION.read_bytes())
    if payload[:4] != b"BBS1":
        raise ValueError(f"unexpected segmentation header: {payload[:4]!r}")
    dims = struct.unpack("<HHH", payload[4:10])
    labels = np.frombuffer(payload, dtype=np.uint8, offset=10)
    return labels.reshape((dims[2], dims[1], dims[0]))


def neighbour(mask: np.ndarray, axis: int, sign: int) -> np.ndarray:
    result = np.zeros_like(mask)
    source = [slice(None)] * 3
    target = [slice(None)] * 3
    if sign > 0:
        source[axis] = slice(1, None)
        target[axis] = slice(None, -1)
    else:
        source[axis] = slice(None, -1)
        target[axis] = slice(1, None)
    result[tuple(target)] = mask[tuple(source)]
    return result


def voxel_surface(mask: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    vertex_parts: list[np.ndarray] = []
    normal_parts: list[np.ndarray] = []
    face_parts: list[np.ndarray] = []
    vertex_offset = 0
    for axis in range(3):
        for sign in (-1, 1):
            cells = np.argwhere(mask & ~neighbour(mask, axis, sign)).astype(np.float32)
            if not len(cells):
                continue
            corners = POSITIVE_CORNERS[axis].copy()
            if sign < 0:
                corners[:, axis] *= -1
                corners = corners[[0, 3, 2, 1]]
            local = cells[:, None, :] + corners[None, :, :]
            world = local + ORIGIN_ZYX[None, None, :]
            vertex_parts.append(world.reshape((-1, 3)).astype("<f4"))
            normal = np.zeros(3, dtype=np.float32)
            normal[axis] = sign
            normal_parts.append(np.tile(normal, (len(cells) * 4, 1)).astype("<f4"))
            base = np.arange(len(cells), dtype=np.uint32)[:, None] * 4 + vertex_offset
            face_parts.append(np.column_stack((base, base + 1, base + 2, base, base + 2, base + 3)).reshape(-1).astype("<u4"))
            vertex_offset += len(cells) * 4
    vertices = np.concatenate(vertex_parts)
    normals = np.concatenate(normal_parts)
    shade = np.full(len(vertices), .82, dtype="<f4")
    faces = np.concatenate(face_parts)
    return vertices, normals, shade, faces


def write_mesh(name: str, mesh: tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]) -> None:
    vertices, normals, shade, faces = mesh
    path = ATLAS / f"{name}.mesh"
    with path.open("wb") as handle:
        handle.write(b"BNM2" + struct.pack("<II", len(vertices), len(faces)))
        handle.write(vertices.tobytes())
        handle.write(normals.tobytes())
        handle.write(shade.tobytes())
        handle.write(faces.tobytes())
    print(f"{name}: {len(vertices):,} vertices, {len(faces):,} face indices")


def main() -> None:
    seg = read_labels()[::GEOMETRY_STRIDE, ::GEOMETRY_STRIDE, ::GEOMETRY_STRIDE]
    for name, ids in STRUCTURES.items():
        mask = np.isin(seg, ids)
        if np.count_nonzero(mask) < 8:
            raise ValueError(f"{name} contains too few voxels")
        write_mesh(name, voxel_surface(mask))


if __name__ == "__main__":
    main()
