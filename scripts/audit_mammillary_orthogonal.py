#!/usr/bin/env python3
"""Produce a reproducible objective audit of the published mammillary labels.

This script reads the distributed BBS1 label volume without changing it.  It
records the exact source digest, geometry, per-axis occupancy, 6-neighbour
components, oriented interface faces, representative review slices, and
shortest grid distances for IDs 27, 33, 39, and 40.  The audit is a
shape/label consistency check; it is not anatomical validation or expert
confirmation.
"""

from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import math
import struct
from collections import Counter, deque
from pathlib import Path
from typing import Iterable


MAGIC = b"BBS1"
EXPECTED_SHA256 = "098edfbf365016c6c53ccf7b7032258db72a4912378c457d348c01613a4a1694"
EXPECTED_DIMS = (394, 466, 378)
VOXEL_SIZE_MM = (0.5, 0.5, 0.5)
AUDIT_LABELS = (27, 33, 39, 40)
MAMMILLARY_LABELS = (39, 40)
AXES = ("x", "y", "z")
PLANE_NAMES = {"x": "sagittal", "y": "coronal", "z": "horizontal"}
CONTACT_DIRECTIONS = (
    ("-X", -1, 0, 0, "x"),
    ("+X", 1, 0, 0, "x"),
    ("-Y", 0, -1, 0, "y"),
    ("+Y", 0, 1, 0, "y"),
    ("-Z", 0, 0, -1, "z"),
    ("+Z", 0, 0, 1, "z"),
)
CONTACT_DIRECTION_ORDER = {direction: order for order, (direction, *_rest) in enumerate(CONTACT_DIRECTIONS)}
CONTACT_INTERFACE_PAIRS = ((27, 39), (33, 39), (27, 40), (33, 40))
EXPECTED_MAMMILLARY_BBOXES = {
    39: {"min": [187, 246, 107], "max": [196, 256, 121]},
    40: {"min": [197, 247, 108], "max": [204, 258, 121]},
}
EXPECTED_CONTACT_INTERFACE_FACE_COUNTS = {
    "27-39": 69,
    "33-39": 171,
    "27-40": 38,
    "33-40": 162,
}
EXPECTED_REPRESENTATIVE_SLICES = {
    39: {
        "axis": "y",
        "sliceIndex": 251,
        "pairInPlaneFaceCounts": {"27": 12, "33": 12},
        "pairUniqueMammillaryVoxelCounts": {"27": 10, "33": 9},
    },
    40: {
        "axis": "y",
        "sliceIndex": 253,
        "pairInPlaneFaceCounts": {"27": 8, "33": 6},
        "pairUniqueMammillaryVoxelCounts": {"27": 8, "33": 5},
    },
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


def contact_interface_for(
    mammillary_label: int,
    other_label: int,
    positions: dict[int, set[int]],
    labels: bytes,
    dims: tuple[int, int, int],
) -> dict[str, object]:
    """Record every face where one mammillary label meets one reference label.

    The scan starts at the mammillary voxel, so orientation counts describe the
    direction from the mammillary side toward the neighbouring reference label.
    A slice record is keyed by the mammillary voxel's coordinate in that view.
    """

    faces: list[dict[str, object]] = []
    mammillary_face_voxels: set[int] = set()
    orientation_counts = Counter({direction: 0 for direction, *_rest in CONTACT_DIRECTIONS})
    slice_data = {
        axis: {
            index: {
                "inPlane": 0,
                "outOfPlane": 0,
                "inPlaneVoxels": set(),
                "outOfPlaneVoxels": set(),
            }
            for index in range(
                EXPECTED_MAMMILLARY_BBOXES[mammillary_label]["min"][axis_number],
                EXPECTED_MAMMILLARY_BBOXES[mammillary_label]["max"][axis_number] + 1,
            )
        }
        for axis_number, axis in enumerate(AXES)
    }
    dx, dy, dz = dims

    for index in sorted(positions[mammillary_label]):
        point = xyz(index, dims)
        for direction, offset_x, offset_y, offset_z, normal_axis in CONTACT_DIRECTIONS:
            neighbour_point = (
                point[0] + offset_x,
                point[1] + offset_y,
                point[2] + offset_z,
            )
            if not (
                0 <= neighbour_point[0] < dx
                and 0 <= neighbour_point[1] < dy
                and 0 <= neighbour_point[2] < dz
            ):
                continue
            neighbour = index3d(*neighbour_point, dims)
            if labels[neighbour] != other_label:
                continue

            orientation_counts[direction] += 1
            mammillary_face_voxels.add(index)
            faces.append(
                {
                    "mammillaryVoxel": list(point),
                    "otherVoxel": list(neighbour_point),
                    "orientation": direction,
                }
            )
            for axis_number, axis in enumerate(AXES):
                slice_record = slice_data[axis][point[axis_number]]
                if normal_axis == axis:
                    slice_record["outOfPlane"] += 1
                    slice_record["outOfPlaneVoxels"].add(index)
                else:
                    slice_record["inPlane"] += 1
                    slice_record["inPlaneVoxels"].add(index)

    faces.sort(
        key=lambda face: (
            tuple(face["mammillaryVoxel"]),
            CONTACT_DIRECTION_ORDER[face["orientation"]],
            tuple(face["otherVoxel"]),
        )
    )
    source_bbox = EXPECTED_MAMMILLARY_BBOXES[mammillary_label]
    serialized_slices: dict[str, object] = {}
    for axis_number, axis in enumerate(AXES):
        slice_records = []
        for index in range(source_bbox["min"][axis_number], source_bbox["max"][axis_number] + 1):
            record = slice_data[axis][index]
            all_voxels = record["inPlaneVoxels"] | record["outOfPlaneVoxels"]
            slice_records.append(
                {
                    "index": index,
                    "inPlaneFaceCount": record["inPlane"],
                    "outOfPlaneFaceCount": record["outOfPlane"],
                    "inPlaneUniqueMammillaryVoxelCount": len(record["inPlaneVoxels"]),
                    "outOfPlaneUniqueMammillaryVoxelCount": len(record["outOfPlaneVoxels"]),
                    "allUniqueMammillaryVoxelCount": len(all_voxels),
                    "uniqueMammillaryVoxelCount": len(all_voxels),
                }
            )
        serialized_slices[axis] = {
            "occupiedSliceCount": sum(
                1
                for record in slice_records
                if record["inPlaneFaceCount"] or record["outOfPlaneFaceCount"]
            ),
            "slices": slice_records,
        }

    return {
        "mammillaryLabel": mammillary_label,
        "otherLabel": other_label,
        "faceCount": len(faces),
        "uniqueMammillaryVoxelCount": len(mammillary_face_voxels),
        "mammillaryVoxelBbox": bbox_for(mammillary_face_voxels, dims),
        "faceOrientationCounts": {
            direction: orientation_counts[direction]
            for direction, *_rest in CONTACT_DIRECTIONS
        },
        "faces": faces,
        "slices": serialized_slices,
        "_sliceData": slice_data,
    }


def bbox_center(bbox: dict[str, object]) -> tuple[float, float, float]:
    minimum = bbox["min"]
    maximum = bbox["max"]
    if minimum is None or maximum is None:
        return (0.0, 0.0, 0.0)
    return tuple((minimum[axis] + maximum[axis]) / 2 for axis in range(3))


def contact_interfaces(
    positions: dict[int, set[int]], labels: bytes, dims: tuple[int, int, int]
) -> dict[str, dict[str, object]]:
    return {
        f"{other_label}-{mammillary_label}": contact_interface_for(
            mammillary_label, other_label, positions, labels, dims
        )
        for other_label, mammillary_label in CONTACT_INTERFACE_PAIRS
    }


def representative_slices(
    interfaces: dict[str, dict[str, object]],
    positions: dict[int, set[int]],
    dims: tuple[int, int, int],
) -> dict[str, object]:
    """Choose reproducible display candidates; this is not boundary validation."""

    representatives: dict[str, object] = {}
    for mammillary_label in MAMMILLARY_LABELS:
        interface_27 = interfaces[f"27-{mammillary_label}"]
        interface_33 = interfaces[f"33-{mammillary_label}"]
        mammillary_bbox = bbox_for(positions[mammillary_label], dims)
        mammillary_center = bbox_center(mammillary_bbox)
        candidates: list[dict[str, object]] = []
        # Coronal is the common review plane for the mammillary bodies.  The
        # contactInterfaces data still retains all X/Y/Z slice metrics; this
        # selector keeps the two representative choices comparable rather
        # than ranking unrelated view directions against each other.
        axis = "y"
        slices_27 = interface_27["_sliceData"][axis]
        slices_33 = interface_33["_sliceData"][axis]
        for slice_index in sorted(set(slices_27) & set(slices_33)):
            record_27 = slices_27[slice_index]
            record_33 = slices_33[slice_index]
            pair_face_counts = {
                "27": record_27["inPlane"],
                "33": record_33["inPlane"],
            }
            pair_unique_counts = {
                "27": len(record_27["inPlaneVoxels"]),
                "33": len(record_33["inPlaneVoxels"]),
            }
            if not pair_face_counts["27"] or not pair_face_counts["33"]:
                continue
            contact_voxels = record_27["inPlaneVoxels"] | record_33["inPlaneVoxels"]
            contact_bbox = bbox_for(contact_voxels, dims)
            contact_center = bbox_center(contact_bbox)
            center_distance = math.sqrt(
                sum(
                    (contact_center[coordinate] - mammillary_center[coordinate]) ** 2
                    for coordinate in range(3)
                )
            )
            candidates.append(
                {
                    "axis": axis,
                    "plane": PLANE_NAMES[axis],
                    "sliceIndex": slice_index,
                    "pairInPlaneFaceCounts": pair_face_counts,
                    "pairUniqueMammillaryVoxelCounts": pair_unique_counts,
                    "minimumUniqueMammillaryVoxelCount": min(pair_unique_counts.values()),
                    "totalUniqueMammillaryVoxelCount": sum(pair_unique_counts.values()),
                    "contactBboxCenterDistanceVoxels": center_distance,
                    "contactBbox": contact_bbox,
                }
            )

        # Rank by the requested evidence strength.  Duplicate faces from one
        # mammillary voxel do not outweigh coverage of additional mammillary
        # voxels, so the two count fields used for ranking are the unique
        # mammillary source-voxel counts.  Index is the final tie-break.
        chosen = min(
            candidates,
            key=lambda candidate: (
                -candidate["minimumUniqueMammillaryVoxelCount"],
                -candidate["totalUniqueMammillaryVoxelCount"],
                candidate["contactBboxCenterDistanceVoxels"],
                candidate["sliceIndex"],
            ),
        )
        representatives[str(mammillary_label)] = {
            **chosen,
            "candidateCount": len(candidates),
            "candidateScores": [
                {
                    key: candidate[key]
                    for key in (
                        "axis",
                        "plane",
                        "sliceIndex",
                        "pairInPlaneFaceCounts",
                        "pairUniqueMammillaryVoxelCounts",
                        "minimumUniqueMammillaryVoxelCount",
                        "totalUniqueMammillaryVoxelCount",
                        "contactBboxCenterDistanceVoxels",
                    )
                }
                for candidate in sorted(
                    candidates,
                    key=lambda candidate: (AXES.index(candidate["axis"]), candidate["sliceIndex"]),
                )
            ],
        }
    return representatives


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
    interfaces = contact_interfaces(positions, labels, dims)
    representatives = representative_slices(interfaces, positions, dims)
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
        "expectedContactInterfaceFaceCounts": EXPECTED_CONTACT_INTERFACE_FACE_COUNTS,
        "expectedRepresentativeSlices": {
            str(label): expected for label, expected in EXPECTED_REPRESENTATIVE_SLICES.items()
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
            and all(
                interfaces[key]["faceCount"] == expected
                for key, expected in EXPECTED_CONTACT_INTERFACE_FACE_COUNTS.items()
            )
            and all(
                representatives[str(label)][field] == expected[field]
                for label, expected in EXPECTED_REPRESENTATIVE_SLICES.items()
                for field in (
                    "axis",
                    "sliceIndex",
                    "pairInPlaneFaceCounts",
                    "pairUniqueMammillaryVoxelCounts",
                )
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
        "contactInterfaces": "Each listed face is scanned from a mammillary voxel toward its adjacent reference-label voxel. faceOrientationCounts use the mammillary-side normal (-/+X, -/+Y, -/+Z). For each x/y/z slice, inPlaneFaceCount/outOfPlaneFaceCount split faces by whether their normal differs from or matches the section axis. inPlaneUniqueMammillaryVoxelCount and outOfPlaneUniqueMammillaryVoxelCount count source voxels in their respective face sets; allUniqueMammillaryVoxelCount is their union, and uniqueMammillaryVoxelCount is a compatibility alias for that union.",
        "contactBboxCenterDistance": "For representative-slice ranking, Euclidean voxel distance from the combined ID 27/33 in-plane contact bbox center on that slice to the full mammillary-label bbox center.",
        "representativeSliceSelection": "For each mammillary label, use the common coronal (Y) review plane and intersect ID 27 and ID 33 slices with inPlaneFaceCount > 0. Rank by minimum of the two in-plane unique mammillary source-voxel counts descending, their sum descending, in-plane contact-bbox-center distance ascending, then slice index ascending. Raw inPlaneFaceCount remains in the selected record; in-plane unique source-voxel counts make repeated faces from one voxel neutral. This selects a display candidate only; it does not establish anatomical boundaries or boundary correctness.",
        "anatomicalStatus": "Objective volume-shape audit only; not anatomical validation or expert confirmation.",
    }
    serializable_interfaces = {
        key: {field: value for field, value in interface.items() if not field.startswith("_")}
        for key, interface in interfaces.items()
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
        "contactInterfaces": serializable_interfaces,
        "representativeSlices": representatives,
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
