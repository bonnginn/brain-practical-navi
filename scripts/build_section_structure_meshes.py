#!/usr/bin/env python3
"""Build colourable 3D counterparts for section-practical label layers.

The source is the exact 0.5 mm practical-segmentation grid. Geometry is reduced
to 1 mm and written as a teaching surface without external meshing dependencies,
keeping this asset build reproducible with NumPy alone.
"""

from __future__ import annotations

import gzip
import argparse
import hashlib
import json
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


def encode_mesh(mesh: tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]) -> bytes:
    vertices, normals, shade, faces = mesh
    return (b"BNM2" + struct.pack("<II", len(vertices), len(faces)) + vertices.tobytes()
            + normals.tobytes() + shade.tobytes() + faces.tobytes())


def write_mesh(name: str, mesh: tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]) -> None:
    vertices, normals, shade, faces = mesh
    path = ATLAS / f"{name}.mesh"
    path.write_bytes(encode_mesh(mesh))
    print(f"{name}: {len(vertices):,} vertices, {len(faces):,} face indices")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument('--check', action='store_true', help='Read-only byte comparison (default)')
    mode.add_argument('--output-dir', type=Path, help='Generate into a new staging directory, never public')
    args = parser.parse_args()
    if args.output_dir and (args.output_dir.exists() or args.output_dir.resolve() == ATLAS.resolve()):
        raise ValueError('Use a new staging directory; preserve existing assets/evidence')
    seg = read_labels()[::GEOMETRY_STRIDE, ::GEOMETRY_STRIDE, ::GEOMETRY_STRIDE]
    generated = {}
    report = dict(sourceSha256=hashlib.sha256(SEGMENTATION.read_bytes()).hexdigest(),
                  geometryStride=GEOMETRY_STRIDE, meshes={},
                  limitation='Exact reconstruction of the existing 1 mm teaching surfaces; not anatomical validation. ID33 remains an excluded mixed scaffold.')
    for name, ids in STRUCTURES.items():
        mask = np.isin(seg, ids)
        if np.count_nonzero(mask) < 8:
            raise ValueError(f"{name} contains too few voxels")
        payload = encode_mesh(voxel_surface(mask))
        generated[name] = payload
        old = (ATLAS / f'{name}.mesh').read_bytes()
        report['meshes'][name] = dict(labelIds=list(ids), sampledVoxels=int(mask.sum()),
            oldSha256=hashlib.sha256(old).hexdigest(), newSha256=hashlib.sha256(payload).hexdigest(),
            oldBytes=len(old), newBytes=len(payload), matches=old == payload)
    if args.output_dir:
        args.output_dir.mkdir(parents=True, exist_ok=False)
        for name, payload in generated.items():
            (args.output_dir / f'{name}.mesh').write_bytes(payload)
        (args.output_dir / 'report.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(report, indent=2))
    if not args.output_dir and not all(m['matches'] for m in report['meshes'].values()):
        raise SystemExit('Stale section structure meshes; stage and review before adopting')


if __name__ == "__main__":
    main()
