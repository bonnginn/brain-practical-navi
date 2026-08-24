#!/usr/bin/env python3
"""Audit the published legacy optic label ID 33 without changing it.

The output is an objective array/grid inventory for expert review.  It does
not identify the optic chiasm or optic tracts, validate a boundary, or make
ID 33 eligible for learner-facing sections or quizzes.
"""

from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import struct
from collections import Counter
from pathlib import Path
from typing import Iterable


MAGIC = b"BBS1"
EXPECTED_SHA256 = "b75a24903ec08526b3e7f08df9efc8cee15af80d86bb96a821260913a2b176f3"
EXPECTED_DIMS = (394, 466, 378)
VOXEL_SIZE_MM = (0.5, 0.5, 0.5)
LABEL_ID = 33
EXPECTED_VOXEL_COUNT = 8482
LOGICAL_INPUT_PATH = "public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz"
AXES = ("x", "y", "z")
PLANE_NAMES = {"x": "sagittal", "y": "coronal", "z": "horizontal"}
NEIGHBOURS = (
    ("-X", -1, 0, 0), ("+X", 1, 0, 0),
    ("-Y", 0, -1, 0), ("+Y", 0, 1, 0),
    ("-Z", 0, 0, -1), ("+Z", 0, 0, 1),
)


class AuditError(ValueError):
    """The input is not the pinned published volume or violates its contract."""


def xyz(index: int, dims: tuple[int, int, int]) -> tuple[int, int, int]:
    dx, dy, _ = dims
    z, remainder = divmod(index, dx * dy)
    y, x = divmod(remainder, dx)
    return x, y, z


def index3d(x: int, y: int, z: int, dims: tuple[int, int, int]) -> int:
    return x + dims[0] * (y + dims[1] * z)


def decode_bbs1(compressed: bytes, expected_sha256: str = EXPECTED_SHA256) -> tuple[str, tuple[int, int, int], bytes]:
    digest = hashlib.sha256(compressed).hexdigest()
    if digest != expected_sha256:
        raise AuditError(f"SHA-256 {digest} does not match the expected published label volume")
    try:
        payload = gzip.decompress(compressed)
    except OSError as exc:
        raise AuditError("invalid gzip payload") from exc
    if len(payload) < 10 or payload[:4] != MAGIC:
        raise AuditError("expected BBS1 magic")
    dims = struct.unpack_from("<HHH", payload, 4)
    if dims != EXPECTED_DIMS:
        raise AuditError(f"dims {dims} do not match expected {EXPECTED_DIMS}")
    voxel_count = dims[0] * dims[1] * dims[2]
    if len(payload) != 10 + voxel_count:
        raise AuditError(f"payload length {len(payload)} does not match BBS1 grid {voxel_count}")
    return digest, dims, payload[10:]


def read_bbs1(path: Path) -> tuple[str, tuple[int, int, int], bytes]:
    try:
        return decode_bbs1(path.read_bytes())
    except OSError as exc:
        raise AuditError(f"{path}: {exc}") from exc


def bbox(indices: Iterable[int], dims: tuple[int, int, int]) -> dict[str, object]:
    points = [xyz(index, dims) for index in indices]
    if not points:
        return {"min": None, "max": None, "size": [0, 0, 0]}
    minimum = [min(point[axis] for point in points) for axis in range(3)]
    maximum = [max(point[axis] for point in points) for axis in range(3)]
    return {
        "min": minimum,
        "max": maximum,
        "size": [maximum[axis] - minimum[axis] + 1 for axis in range(3)],
    }


def centroid(indices: set[int], dims: tuple[int, int, int]) -> dict[str, list[float]]:
    points = [xyz(index, dims) for index in indices]
    voxel = [sum(point[axis] for point in points) / len(points) for axis in range(3)]
    return {
        "voxel": voxel,
        "mmFromArrayOrigin": [voxel[axis] * VOXEL_SIZE_MM[axis] for axis in range(3)],
    }


def neighbours6(index: int, dims: tuple[int, int, int]) -> Iterable[int]:
    x, y, z = xyz(index, dims)
    for _direction, ox, oy, oz in NEIGHBOURS:
        nx, ny, nz = x + ox, y + oy, z + oz
        if 0 <= nx < dims[0] and 0 <= ny < dims[1] and 0 <= nz < dims[2]:
            yield index3d(nx, ny, nz, dims)


def components6(indices: set[int], dims: tuple[int, int, int]) -> list[dict[str, object]]:
    remaining = set(indices)
    result: list[dict[str, object]] = []
    while remaining:
        seed = min(remaining)
        remaining.remove(seed)
        queue = [seed]
        component = [seed]
        while queue:
            current = queue.pop()
            for neighbour in neighbours6(current, dims):
                if neighbour in remaining:
                    remaining.remove(neighbour)
                    queue.append(neighbour)
                    component.append(neighbour)
        result.append({
            "voxelCount": len(component),
            "seedVoxel": list(xyz(seed, dims)),
            "bbox": bbox(component, dims),
        })
    result.sort(key=lambda item: (-int(item["voxelCount"]), item["seedVoxel"]))
    return result


def slice_occupancy(indices: set[int], dims: tuple[int, int, int]) -> dict[str, object]:
    counts = {axis: Counter() for axis in AXES}
    for index in indices:
        point = xyz(index, dims)
        for axis_number, axis in enumerate(AXES):
            counts[axis][point[axis_number]] += 1
    return {
        axis: {
            "occupiedSliceCount": len(counts[axis]),
            "slices": [{"index": index, "count": counts[axis][index]} for index in sorted(counts[axis])],
        }
        for axis in AXES
    }


def representative_slices(occupancy: dict[str, object], center: list[float]) -> dict[str, object]:
    result = {}
    for axis_number, axis in enumerate(AXES):
        slices = occupancy[axis]["slices"]
        chosen = min(slices, key=lambda item: (-item["count"], abs(item["index"] - center[axis_number]), item["index"]))
        result[axis] = {
            "plane": PLANE_NAMES[axis],
            "sliceIndex": chosen["index"],
            "voxelCountOnSlice": chosen["count"],
            "distanceFromCentroidVoxels": abs(chosen["index"] - center[axis_number]),
        }
    return result


def face_contacts(indices: set[int], labels: bytes, dims: tuple[int, int, int]) -> tuple[dict[str, int], dict[str, dict[str, int]]]:
    counts: Counter[int] = Counter()
    directions: dict[int, Counter[str]] = {}
    for index in sorted(indices):
        x, y, z = xyz(index, dims)
        for direction, ox, oy, oz in NEIGHBOURS:
            nx, ny, nz = x + ox, y + oy, z + oz
            if not (0 <= nx < dims[0] and 0 <= ny < dims[1] and 0 <= nz < dims[2]):
                continue
            neighbour_label = labels[index3d(nx, ny, nz, dims)]
            if neighbour_label == LABEL_ID:
                continue
            counts[neighbour_label] += 1
            directions.setdefault(neighbour_label, Counter())[direction] += 1
    ordered_labels = sorted(counts)
    return (
        {str(label): counts[label] for label in ordered_labels},
        {
            str(label): {direction: directions[label][direction] for direction, *_ in NEIGHBOURS}
            for label in ordered_labels
        },
    )


def build_audit(path: Path) -> dict[str, object]:
    digest, dims, labels = read_bbs1(path)
    positions = {index for index, label in enumerate(labels) if label == LABEL_ID}
    if len(positions) != EXPECTED_VOXEL_COUNT:
        raise AuditError(f"ID {LABEL_ID} voxel count {len(positions)} does not match expected {EXPECTED_VOXEL_COUNT}")
    component_records = components6(positions, dims)
    occupancy = slice_occupancy(positions, dims)
    center = centroid(positions, dims)
    contacts, contact_directions = face_contacts(positions, labels, dims)
    for required_label in (0, 27, 39, 40):
        contacts.setdefault(str(required_label), 0)
        contact_directions.setdefault(str(required_label), {direction: 0 for direction, *_ in NEIGHBOURS})
    contacts = dict(sorted(contacts.items(), key=lambda item: int(item[0])))
    contact_directions = dict(sorted(contact_directions.items(), key=lambda item: int(item[0])))
    return {
        "format": "brain-practical-optic-orthogonal-objective-audit",
        "version": 1,
        "input": LOGICAL_INPUT_PATH,
        "inputSha256": digest,
        "magic": MAGIC.decode("ascii"),
        "dims": list(dims),
        "voxelSizeMm": list(VOXEL_SIZE_MM),
        "auditedLabelId": LABEL_ID,
        "label": {
            "voxelCount": len(positions),
            "voxelVolumeMm3": len(positions) * 0.125,
            "bbox": bbox(positions, dims),
            "centroid": center,
            "connectedComponentCount6": len(component_records),
            "connectedComponents6": component_records,
            "sliceOccupancy": occupancy,
        },
        "representativeSlices": representative_slices(occupancy, center["voxel"]),
        "faceContacts6ByNeighbourLabel": contacts,
        "faceContactDirections6ByNeighbourLabel": contact_directions,
        "definitions": {
            "sliceOccupancy": "Voxel count for ID 33 on every occupied array X/Y/Z slice.",
            "connectedComponents6": "Components use face sharing only; edge and corner contact do not connect components.",
            "faceContacts6": "Every oriented ID 33 boundary face is counted by the neighbouring stored label value. Label 0 is unlabelled background. Counts do not identify anatomy.",
            "representativeSliceSelection": "For each axis, choose the occupied slice with the largest ID 33 voxel count, then the smallest distance to the ID 33 voxel centroid, then the lowest slice index. This is a deterministic display candidate, not anatomical boundary validation.",
            "centroidMm": "Voxel-coordinate centroid multiplied by 0.5 mm from the array origin; not MNI/world coordinates.",
            "anatomicalStatus": "Objective volume-shape inventory only; not anatomical validation, expert confirmation, or a basis for mechanically splitting ID 33 into IDs 36-38.",
        },
        "validation": {
            "expectedInputSha256": EXPECTED_SHA256,
            "expectedDims": list(EXPECTED_DIMS),
            "expectedVoxelSizeMm": list(VOXEL_SIZE_MM),
            "expectedLabelId": LABEL_ID,
            "expectedVoxelCount": EXPECTED_VOXEL_COUNT,
            "passed": True,
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=Path("public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz"))
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    try:
        audit = build_audit(args.input)
    except (AuditError, OSError, struct.error) as exc:
        parser.error(str(exc))
    serialized = json.dumps(audit, ensure_ascii=False, indent=2) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(serialized, encoding="utf-8")
    print(serialized, end="")


if __name__ == "__main__":
    main()
