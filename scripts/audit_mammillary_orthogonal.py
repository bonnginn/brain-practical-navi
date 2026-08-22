#!/usr/bin/env python3
"""Produce a reproducible objective audit of the published mammillary labels.

This script reads the distributed BBS1 label volume without changing it.  It
records the exact source digest, geometry, per-axis occupancy, 6-neighbour
components, face contacts, and shortest grid distances for IDs 27, 33, 39,
and 40.  The audit is a shape/label consistency check; it is not anatomical
validation or expert confirmation.
"""

from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import struct
from collections import Counter, deque
from pathlib import Path
from typing import Iterable


MAGIC = b"BBS1"
EXPECTED_SHA256 = "6744e7c0184436789f42c7107d05ead93cf36703bb36372df5f63b82a38f7b56"
EXPECTED_DIMS = (394, 466, 378)
VOXEL_SIZE_MM = (0.5, 0.5, 0.5)
AUDIT_LABELS = (27, 33, 39, 40)
MAMMILLARY_LABELS = (39, 40)
EXPECTED_MAMMILLARY_BBOXES = {
    39: {"min": [187, 246, 107], "max": [196, 256, 121]},
    40: {"min": [197, 247, 108], "max": [204, 258, 121]},
}
PAIR_KEYS = tuple(
    f"{left}-{right}"
    for position, left in enumerate(AUDIT_LABELS)
    for right in AUDIT_LABELS[position + 1 :]
)


class AuditError(ValueError):
    """An input or objective expectation failed."""


def index3d(x: int, y: int, z: int, dims: tuple[int, int, int]) -> int:
    dx, dy, _ = dims
    return x + dx * (y + dy * z)


def xyz(index: int, dims: tuple[int, int, int]) -> tuple[int, int, int]:
    dx, dy, _ = dims
    z, remainder = divmod(index, dx * dy)
    y, x = divmod(remainder, dx)
    return x, y, z


def neighbours6(index: int, dims: tuple[int, int, int]) -> Iterable[int]:
    x, y, z = xyz(index, dims)
    dx, dy, dz = dims
    if x > 0:
        yield index - 1
    if x + 1 < dx:
        yield index + 1
    if y > 0:
        yield index - dx
    if y + 1 < dy:
        yield index + dx
    if z > 0:
        yield index - dx * dy
    if z + 1 < dz:
        yield index + dx * dy


def positive_neighbours(index: int, dims: tuple[int, int, int]) -> Iterable[int]:
    """Yield only +X/+Y/+Z neighbours, so each face is counted once."""

    x, y, z = xyz(index, dims)
    dx, dy, dz = dims
    if x + 1 < dx:
        yield index + 1
    if y + 1 < dy:
        yield index + dx
    if z + 1 < dz:
        yield index + dx * dy


def read_bbs1(path: Path) -> tuple[str, tuple[int, int, int], bytes]:
    compressed = path.read_bytes()
    digest = hashlib.sha256(compressed).hexdigest()
    if digest != EXPECTED_SHA256:
        raise AuditError(
            f"{path}: SHA-256 {digest} does not match the expected published label volume"
        )
    try:
        payload = gzip.decompress(compressed)
    except OSError as exc:
        raise AuditError(f"{path}: invalid gzip payload") from exc
    if len(payload) < 10 or payload[:4] != MAGIC:
        raise AuditError(f"{path}: expected BBS1 magic")
    dims = struct.unpack_from("<HHH", payload, 4)
    voxel_count = dims[0] * dims[1] * dims[2]
    if dims != EXPECTED_DIMS:
        raise AuditError(f"{path}: dims {dims} do not match expected {EXPECTED_DIMS}")
    if len(payload) != 10 + voxel_count:
        raise AuditError(
            f"{path}: payload length {len(payload)} does not match BBS1 grid {voxel_count}"
        )
    return digest, dims, payload[10:]


def bbox_for(indices: Iterable[int], dims: tuple[int, int, int]) -> dict[str, object]:
    points = [xyz(index, dims) for index in indices]
    if not points:
        return {
            "min": None,
            "max": None,
            "size": [0, 0, 0],
            "x": None,
            "y": None,
            "z": None,
        }
    minimum = [min(point[axis] for point in points) for axis in range(3)]
    maximum = [max(point[axis] for point in points) for axis in range(3)]
    return {
        "min": minimum,
        "max": maximum,
        "size": [maximum[axis] - minimum[axis] + 1 for axis in range(3)],
        "x": [minimum[0], maximum[0]],
        "y": [minimum[1], maximum[1]],
        "z": [minimum[2], maximum[2]],
    }


def centroid_for(indices: Iterable[int], dims: tuple[int, int, int]) -> dict[str, list[float]]:
    points = [xyz(index, dims) for index in indices]
    if not points:
        return {"voxel": [0.0, 0.0, 0.0], "mm": [0.0, 0.0, 0.0]}
    voxel = [sum(point[axis] for point in points) / len(points) for axis in range(3)]
    return {"voxel": voxel, "mm": [voxel[axis] * VOXEL_SIZE_MM[axis] for axis in range(3)]}


def occupancy_for(indices: Iterable[int], dims: tuple[int, int, int]) -> dict[str, object]:
    counts = {axis: Counter() for axis in ("x", "y", "z")}
    for index in indices:
        point = xyz(index, dims)
        for axis, coordinate in zip(("x", "y", "z"), point):
            counts[axis][coordinate] += 1
    return {
        axis: {
            "occupiedSliceCount": len(counts[axis]),
            "slices": [
                {"index": coordinate, "count": counts[axis][coordinate]}
                for coordinate in sorted(counts[axis])
            ],
        }
        for axis in ("x", "y", "z")
    }


def connected_components6(indices: set[int], dims: tuple[int, int, int]) -> list[dict[str, object]]:
    remaining = set(indices)
    components: list[dict[str, object]] = []
    while remaining:
        seed = min(remaining)
        remaining.remove(seed)
        component = [seed]
        queue = [seed]
        while queue:
            current = queue.pop()
            for neighbour in neighbours6(current, dims):
                if neighbour in remaining:
                    remaining.remove(neighbour)
                    queue.append(neighbour)
                    component.append(neighbour)
        components.append(
            {
                "voxelCount": len(component),
                "seedVoxel": list(xyz(seed, dims)),
                "bbox": bbox_for(component, dims),
                "centroid": centroid_for(component, dims),
            }
        )
    components.sort(key=lambda component: (-int(component["voxelCount"]), component["seedVoxel"]))
    return components


def pair_key(left: int, right: int) -> str:
    return f"{min(left, right)}-{max(left, right)}"


def face_contacts6(
    positions: dict[int, set[int]], labels: bytes, dims: tuple[int, int, int]
) -> dict[str, int]:
    contacts = Counter({key: 0 for key in PAIR_KEYS})
    audited = set(positions)
    for label in AUDIT_LABELS:
        for index in positions[label]:
            for neighbour in positive_neighbours(index, dims):
                other = labels[neighbour]
                if other in audited and other != label:
                    contacts[pair_key(label, other)] += 1
    return dict(contacts)


def shortest_voxel_distance6(
    left: set[int], right_label: int, labels: bytes, dims: tuple[int, int, int]
) -> int | None:
    """Return the minimum full-grid 6-neighbour path length to right_label.

    The search is multi-source BFS from the smaller label set.  Other labels
    and background are traversable; a face-touching pair therefore has a
    distance of one.  This is a grid-graph distance, not a tissue-aware path.
    """

    if not left:
        return None
    queue = deque((index, 0) for index in left)
    seen = set(left)
    while queue:
        index, distance = queue.popleft()
        for neighbour in neighbours6(index, dims):
            if labels[neighbour] == right_label:
                return distance + 1
            if neighbour not in seen:
                seen.add(neighbour)
                queue.append((neighbour, distance + 1))
    return None


def shortest_pair_distances(
    positions: dict[int, set[int]], labels: bytes, dims: tuple[int, int, int]
) -> dict[str, dict[str, float | int | None]]:
    distances: dict[str, dict[str, float | int | None]] = {}
    for position, left_label in enumerate(AUDIT_LABELS):
        for right_label in AUDIT_LABELS[position + 1 :]:
            left_set, right_set = positions[left_label], positions[right_label]
            if len(left_set) <= len(right_set):
                distance = shortest_voxel_distance6(left_set, right_label, labels, dims)
            else:
                distance = shortest_voxel_distance6(right_set, left_label, labels, dims)
            distances[pair_key(left_label, right_label)] = {
                "voxelDistance6": distance,
                "distanceMm": None if distance is None else distance * VOXEL_SIZE_MM[0],
            }
    return distances


def build_audit(path: Path) -> dict[str, object]:
    digest, dims, labels = read_bbs1(path)
    positions = {label: set() for label in AUDIT_LABELS}
    for index, label in enumerate(labels):
        if label in positions:
            positions[label].add(index)

    label_audits: dict[str, object] = {}
    components_by_label: dict[int, list[dict[str, object]]] = {}
    for label in AUDIT_LABELS:
        label_positions = positions[label]
        components = connected_components6(label_positions, dims)
        components_by_label[label] = components
        label_audits[str(label)] = {
            "voxelCount": len(label_positions),
            "voxelVolumeMm3": len(label_positions) * VOXEL_SIZE_MM[0] * VOXEL_SIZE_MM[1] * VOXEL_SIZE_MM[2],
            "bbox": bbox_for(label_positions, dims),
            "centroid": centroid_for(label_positions, dims),
            "sliceOccupancy": occupancy_for(label_positions, dims),
            "connectedComponents6": components,
            "connectedComponentCount6": len(components),
        }

    contacts = face_contacts6(positions, labels, dims)
    distances = shortest_pair_distances(positions, labels, dims)
    validation = {
        "expectedInputSha256": EXPECTED_SHA256,
        "expectedDims": list(EXPECTED_DIMS),
        "expectedVoxelSizeMm": list(VOXEL_SIZE_MM),
        "expectedMammillaryVoxelCounts": {"39": 561, "40": 729},
        "expectedMammillaryComponentCount6": {"39": 1, "40": 1},
        "expectedMammillaryBboxes": {
            str(label): expected for label, expected in EXPECTED_MAMMILLARY_BBOXES.items()
        },
        "passed": (
            digest == EXPECTED_SHA256
            and dims == EXPECTED_DIMS
            and all(len(positions[label]) == expected for label, expected in ((39, 561), (40, 729)))
            and all(len(components_by_label[label]) == 1 for label in MAMMILLARY_LABELS)
            and all(
                label_audits[str(label)]["bbox"][bound] == expected[bound]
                for label, expected in EXPECTED_MAMMILLARY_BBOXES.items()
                for bound in ("min", "max")
            )
        ),
    }
    if not validation["passed"]:
        raise AuditError("published mammillary label expectations failed")

    definition = {
        "faceContacts6": "For each voxel, inspect only its +X, +Y, +Z neighbour; each unordered label-pair face is counted once.",
        "shortestVoxelDistance6": "Minimum 6-neighbour grid-graph path length between any voxel of the two labels; all grid voxels are traversable and a face contact is distance 1.",
        "distanceMm": "voxelDistance6 multiplied by the isotropic 0.5 mm voxel size.",
        "centroidMm": "Voxel-coordinate centroid multiplied by 0.5 mm from the array origin; these are not MNI/world coordinates.",
        "connectedComponents6": "Components use face sharing only (6-neighbour connectivity); edges and corners do not connect components.",
        "anatomicalStatus": "Objective volume-shape audit only; not anatomical validation or expert confirmation.",
    }
    return {
        "format": "brain-practical-mammillary-orthogonal-audit",
        "version": 1,
        "input": path.as_posix(),
        "inputSha256": digest,
        "magic": MAGIC.decode("ascii"),
        "dims": list(dims),
        "voxelSizeMm": list(VOXEL_SIZE_MM),
        "auditedLabelIds": list(AUDIT_LABELS),
        "labels": label_audits,
        "definitions": definition,
        "faceContacts6": contacts,
        "shortestVoxelDistances6": distances,
        "validation": validation,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--input",
        type=Path,
        default=Path("public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz"),
        help="published BBS1 label volume",
    )
    parser.add_argument("--output", type=Path, help="write the audit JSON to this path")
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
