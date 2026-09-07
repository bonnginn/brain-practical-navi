"""Reconstruct uncropped BigBrain ventricular labels for the section viewer.

No hole filling, component deletion, resampling or smoothing is performed.
This synchronizes representations, not anatomical boundary validation.
"""
import gzip
import hashlib
import json
import struct
from pathlib import Path

import numpy as np
from scipy import ndimage
from skimage.measure import marching_cubes

ROOT = Path(__file__).resolve().parents[1]
ATLAS = ROOT / "public/atlas"
SOURCE = ATLAS / "bigbrain-practical-segmentation-icbm500.bin.gz"
GROUPS = {
    "section-current-lateral-ventricles": (23, 24),
    "section-current-third-ventricle": (25,),
    "section-current-fourth-ventricle": (26,),
    "section-current-ventricular-system": (23, 24, 25, 26, 41),
}
# Existing viewer storage is Z,Y,X in the centred display grid, not the
# scientific ICBM source affine (-98,-134,-72), which must not be substituted.
DISPLAY_ORIGIN_ZYX = np.array([-90., -116., -98.])


def reconstruct(mask):
    if mask.ndim != 3 or not np.any(mask):
        raise ValueError("expected a non-empty 3D mask")
    occupied = np.argwhere(mask)
    lo, hi = occupied.min(axis=0), occupied.max(axis=0) + 1
    crop = mask[tuple(slice(int(a), int(b)) for a, b in zip(lo, hi))]
    # Pad outside the full occupied extent; retain even one-voxel components.
    field = np.pad(crop.astype(np.float32), 1)
    vertices, faces, normals, _ = marching_cubes(field, level=.5, allow_degenerate=False)
    vertices = ((vertices + lo - 1) * .5 + DISPLAY_ORIGIN_ZYX).astype("<f4")
    shade = np.full(len(vertices), .82, dtype="<f4")
    payload = b"BNM2" + struct.pack("<II", len(vertices), len(faces))
    payload += vertices.tobytes() + normals.astype("<f4").tobytes()
    payload += shade.tobytes() + faces.astype("<u4").tobytes()
    labels, count = ndimage.label(mask, structure=ndimage.generate_binary_structure(3, 1))
    sizes = sorted(np.bincount(labels.ravel())[1:].tolist(), reverse=True)
    return payload, {
        "voxels": int(mask.sum()), "components6": int(count), "componentSizes": sizes,
        "boundsZYX": [lo.tolist(), (hi - 1).tolist()],
        "vertices": len(vertices), "faces": len(faces),
        "sha256": hashlib.sha256(payload).hexdigest(), "bytes": len(payload),
    }


def build_assets(compressed):
    """Return all bytes without touching the filesystem, for atomic preflight."""
    raw = gzip.decompress(compressed)
    if raw[:4] != b"BBS1":
        raise ValueError("unexpected label format")
    dims = struct.unpack("<3H", raw[4:10])
    seg = np.frombuffer(raw, dtype=np.uint8, offset=10).reshape(dims[::-1])
    report = {
        "source": SOURCE.name, "sourceSha256": hashlib.sha256(compressed).hexdigest(),
        "rawVoxelSha256": hashlib.sha256(raw[10:]).hexdigest(), "dimensionsXYZ": dims,
        "samplingMm": .5, "displayOriginZYX": DISPLAY_ORIGIN_ZYX.tolist(),
        "method": "marching cubes 0.5; no smoothing, resampling, filling or component removal",
        "scope": "section-view BigBrain selection/context only; not expert validation",
        "meshes": {},
    }
    assets = {}
    for name, ids in GROUPS.items():
        payload, evidence = reconstruct(np.isin(seg, ids))
        evidence["labelIds"] = ids
        assets[f"{name}.mesh"] = payload
        report["meshes"][name] = evidence
    assets['section-current-ventricles.json'] = (json.dumps(report, indent=2) + "\n").encode('utf-8')
    return report, assets


def main():
    report, assets = build_assets(SOURCE.read_bytes())
    for name, data in assets.items():
        (ATLAS/name).write_bytes(data)
    for name, evidence in report['meshes'].items():
        print(name, evidence['voxels'], evidence['components6'], evidence['bytes'])


if __name__ == "__main__":
    main()
