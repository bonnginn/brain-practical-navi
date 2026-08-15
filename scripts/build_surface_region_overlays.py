#!/usr/bin/env python3
"""Attach CerebrA cortical region IDs to the high-density pial-like meshes.

The GIFTI white surfaces and CerebrA labels share MNI152NLin2009cSym space.
Labels are sampled around each corresponding white-surface vertex along its
normal (up to 3 mm) to avoid boundary holes, then stored as BNM3 float values.
"""

import csv
import gzip
import json
import struct
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "work" / "pydeps"))

import nibabel as nib
import numpy as np
import trimesh


SRC = ROOT / "work" / "atlas-source"
OUT = ROOT / "public" / "atlas"
OFFSETS_MM = [0, -.5, .5, -1, 1, -1.5, 1.5, -2, 2, -3, 3]


def read_mesh(path):
    raw = path.read_bytes()
    if path.suffix == ".gz":
        raw = gzip.decompress(raw)
    magic = raw[:4]
    if magic not in (b"BNM2", b"BNM3"):
        raise ValueError(f"{path.name}: expected BNM2 or BNM3")
    vertices_count, faces_count = struct.unpack_from("<II", raw, 4)
    vertices = np.frombuffer(raw, dtype="<f4", count=vertices_count * 3, offset=12).copy()
    normals = np.frombuffer(raw, dtype="<f4", count=vertices_count * 3, offset=12 + vertices_count * 12).copy()
    shade = np.frombuffer(raw, dtype="<f4", count=vertices_count, offset=12 + vertices_count * 24).copy()
    face_offset = 12 + vertices_count * (32 if magic == b"BNM3" else 28)
    faces = np.frombuffer(raw, dtype="<u4", count=faces_count * 3, offset=face_offset).copy()
    return vertices.reshape(-1, 3), normals.reshape(-1, 3), shade, faces.reshape(-1, 3)


def write_mesh(path, vertices, normals, shade, region_ids, faces):
    payload = (b"BNM3" + struct.pack("<II", len(vertices), len(faces)) +
               vertices.astype("<f4").tobytes() + normals.astype("<f4").tobytes() +
               shade.astype("<f4").tobytes() + region_ids.astype("<f4").tobytes() +
               faces.astype("<u4").tobytes())
    with gzip.open(path, "wb", compresslevel=9) as handle:
        handle.write(payload)


def label_surface(hemisphere, label_image, label_data, rows):
    surface = nib.load(SRC / f"mni152-white-{hemisphere}.surf.gii")
    xyz = surface.darrays[0].data.astype(np.float64)
    faces = surface.darrays[1].data.astype(np.int64)
    mesh = trimesh.Trimesh(vertices=xyz, faces=faces, process=False)
    normals = np.asarray(mesh.vertex_normals)
    inverse_affine = np.linalg.inv(label_image.affine)
    expected = "L" if hemisphere == "left" else "R"
    accepted = np.zeros(256, dtype=bool)
    for label_id, row in rows.items():
        is_cortex = int(row["mindboggle mapping"]) >= 2000
        if is_cortex and row["hemi"] == expected:
            accepted[label_id] = True
    result = np.zeros(len(xyz), dtype=np.uint8)
    for offset in OFFSETS_MM:
        sample_xyz = xyz + normals * offset
        ijk = np.rint(nib.affines.apply_affine(inverse_affine, sample_xyz)).astype(np.int64)
        valid = np.all((ijk >= 0) & (ijk < np.asarray(label_data.shape)), axis=1)
        sampled = np.zeros(len(xyz), dtype=np.uint8)
        coords = ijk[valid]
        sampled[valid] = label_data[coords[:, 0], coords[:, 1], coords[:, 2]].astype(np.uint8)
        take = (result == 0) & accepted[sampled]
        result[take] = sampled[take]
    return result


def main():
    label_image = nib.load(SRC / "cerebra.nii.gz")
    label_data = np.asanyarray(label_image.dataobj)
    with (SRC / "cerebra.tsv").open(newline="") as handle:
        rows = {int(row["label"]): row for row in csv.DictReader(handle, delimiter="\t")}

    metadata = {
        "version": 1,
        "source": "CerebrA in MNI152NLin2009cSym space",
        "method": "nearest voxel sampling along matched white-surface normal, ±3 mm maximum",
        "status": "atlas-derived teaching overlay; not a manual pial-surface parcellation",
        "hemispheres": {},
    }
    for hemisphere in ("left", "right"):
        raw_path = OUT / f"pial-{hemisphere}.mesh"
        path = OUT / f"pial-{hemisphere}.mesh.gz"
        vertices, normals, shade, faces = read_mesh(raw_path if raw_path.exists() else path)
        region_ids = label_surface(hemisphere, label_image, label_data, rows)
        if len(region_ids) != len(vertices):
            raise ValueError(f"{hemisphere}: GIFTI and pial mesh vertex count differ")
        write_mesh(path, vertices, normals, shade, region_ids, faces)
        raw_path.unlink(missing_ok=True)
        ids, counts = np.unique(region_ids, return_counts=True)
        label_counts = {
            str(int(label_id)): {
                "name": rows[int(label_id)]["name"],
                "count": int(count),
            }
            for label_id, count in zip(ids, counts)
            if label_id > 0
        }
        metadata["hemispheres"][hemisphere] = {
            "vertices": len(vertices),
            "labelledVertices": int(np.count_nonzero(region_ids)),
            "coverage": float(np.count_nonzero(region_ids) / len(region_ids)),
            "labels": label_counts,
        }
        print(hemisphere, metadata["hemispheres"][hemisphere]["coverage"], len(label_counts))
    (OUT / "surface-region-labels.json").write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
