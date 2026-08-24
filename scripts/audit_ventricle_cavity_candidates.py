#!/usr/bin/env python3
"""Audit conservative BigBrain ventricle cavity completion candidates.

This tool is deliberately read-only.  It never changes the distributed BBS1
label volume.  A candidate voxel must be encoded BigBrain background (255), be
currently unlabeled, and belong to the same 6-connected background component
as an existing ventricle label.  The component is tested in successively wider
boxes: a component that reaches a box boundary or keeps changing with margin is
not considered safe for automatic completion.
"""

from __future__ import annotations

import argparse
from collections import deque
import gzip
import hashlib
import json
from pathlib import Path
import struct
from typing import Any

import numpy as np


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_IMAGE = ROOT / "public/atlas/bigbrain-icbm500.bin.gz"
DEFAULT_LABELS = ROOT / "tests/fixtures/bigbrain-practical-segmentation-pre-ventricle-6744.bin.gz"
EXPECTED_IMAGE_SHA256 = "c4b69975f0dece2512adf3bcae690226492cfa66ded38380b3b94aa8dba52746"
EXPECTED_LABEL_SHA256 = "6744e7c0184436789f42c7107d05ead93cf36703bb36372df5f63b82a38f7b56"
EXPECTED_DIMS = (394, 466, 378)
VENTRICLE_IDS = (23, 24, 25, 26)
VENTRICLE_NAMES = {
    23: "left lateral ventricle",
    24: "right lateral ventricle",
    25: "third ventricle",
    26: "fourth ventricle",
}
VENTRICLE_NAMES_JA = {23: "左側脳室", 24: "右側脳室", 25: "第三脳室", 26: "第四脳室"}


class AuditError(RuntimeError):
    pass


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def read_browser_volume(path: Path, magic: bytes) -> tuple[tuple[int, int, int], np.ndarray]:
    payload = gzip.decompress(path.read_bytes())
    if payload[:4] != magic or len(payload) < 10:
        raise AuditError(f"{path}: expected {magic.decode('ascii')} volume")
    dims = struct.unpack_from("<3H", payload, 4)
    expected = 10 + int(np.prod(dims))
    if len(payload) != expected:
        raise AuditError(f"{path}: payload length {len(payload)} != {expected}")
    values = np.frombuffer(payload, dtype=np.uint8, offset=10).reshape(dims, order="F")
    return dims, values


def expanded_box(points: np.ndarray, dims: tuple[int, int, int], margin: int) -> tuple[np.ndarray, np.ndarray]:
    lower = np.maximum(points.min(axis=0) - margin, 0)
    upper = np.minimum(points.max(axis=0) + margin + 1, np.asarray(dims))
    return lower.astype(np.int32), upper.astype(np.int32)


def flood_from_seed(
    traversable: np.ndarray,
    seed: np.ndarray,
    *,
    max_reached: int,
) -> tuple[np.ndarray, bool, bool]:
    """Return reached mask, boundary contact, and max-size cutoff state."""
    shape = traversable.shape
    flat_traversable = np.ascontiguousarray(traversable).ravel()
    reached = np.zeros(flat_traversable.size, dtype=np.bool_)
    initial = np.flatnonzero(np.ascontiguousarray(seed).ravel())
    reached[initial] = True
    queue: deque[int] = deque(int(value) for value in initial)
    stride_x = shape[1] * shape[2]
    stride_y = shape[2]
    touches_boundary = False
    cutoff = False
    reached_count = int(initial.size)

    while queue:
        index = queue.popleft()
        x, remainder = divmod(index, stride_x)
        y, z = divmod(remainder, stride_y)
        if x == 0 or y == 0 or z == 0 or x == shape[0] - 1 or y == shape[1] - 1 or z == shape[2] - 1:
            touches_boundary = True
            break
        for neighbor in (index - stride_x, index + stride_x, index - stride_y, index + stride_y, index - 1, index + 1):
            if flat_traversable[neighbor] and not reached[neighbor]:
                reached[neighbor] = True
                queue.append(neighbor)
                reached_count += 1
                if reached_count > max_reached:
                    cutoff = True
                    queue.clear()
                    break

    return reached.reshape(shape), touches_boundary, cutoff


def candidate_identity(candidate: np.ndarray, lower: np.ndarray) -> tuple[str | None, list[list[int]] | None]:
    local = np.argwhere(candidate)
    if local.size == 0:
        return None, None
    global_points = (local + lower).astype("<i4", copy=False)
    bounds = [global_points.min(axis=0).tolist(), global_points.max(axis=0).tolist()]
    return hashlib.sha256(global_points.tobytes(order="C")).hexdigest(), bounds


def locally_enclosed_candidate(
    image: np.ndarray,
    labels: np.ndarray,
    label_id: int,
    minimum_neighbors: int,
) -> tuple[dict[str, Any], set[int]]:
    target_points = np.argwhere(labels == label_id)
    lower = np.maximum(target_points.min(axis=0) - 1, 0)
    upper = np.minimum(target_points.max(axis=0) + 2, np.asarray(labels.shape))
    crop = tuple(slice(int(lower[axis]), int(upper[axis])) for axis in range(3))
    labels_crop = labels[crop]
    target = labels_crop == label_id
    target_neighbors = np.zeros(target.shape, dtype=np.uint8)
    other_neighbors = np.zeros(target.shape, dtype=np.bool_)
    other = (labels_crop != 0) & ~target
    target_neighbors[1:] += target[:-1]
    target_neighbors[:-1] += target[1:]
    target_neighbors[:, 1:] += target[:, :-1]
    target_neighbors[:, :-1] += target[:, 1:]
    target_neighbors[:, :, 1:] += target[:, :, :-1]
    target_neighbors[:, :, :-1] += target[:, :, 1:]
    other_neighbors[1:] |= other[:-1]
    other_neighbors[:-1] |= other[1:]
    other_neighbors[:, 1:] |= other[:, :-1]
    other_neighbors[:, :-1] |= other[:, 1:]
    other_neighbors[:, :, 1:] |= other[:, :, :-1]
    other_neighbors[:, :, :-1] |= other[:, :, 1:]
    candidate = (image[crop] == 255) & (labels_crop == 0) & (target_neighbors >= minimum_neighbors) & ~other_neighbors
    points = (np.argwhere(candidate) + lower).astype("<i4", copy=False)
    indices = set(int((x * labels.shape[1] + y) * labels.shape[2] + z) for x, y, z in points)
    bounds = None if points.size == 0 else [points.min(axis=0).tolist(), points.max(axis=0).tolist()]
    digest = None if points.size == 0 else hashlib.sha256(points.tobytes(order="C")).hexdigest()
    exact_counts = {str(count): int((candidate & (target_neighbors == count)).sum()) for count in range(minimum_neighbors, 7)}
    return {
        "minimumSameLabelFaceNeighbors": minimum_neighbors,
        "forbidsOtherLabelFaceNeighbor": True,
        "candidateVoxelCount": len(indices),
        "candidateCountBySameLabelFaceNeighbors": exact_counts,
        "candidateSha256": digest,
        "candidateBoundsInclusive": bounds,
        "status": "review-candidate-only" if indices else "no-candidate",
    }, indices


def orthogonally_bracketed_candidate(
    image: np.ndarray,
    labels: np.ndarray,
    label_id: int,
) -> tuple[dict[str, Any], set[int]]:
    points = np.argwhere(labels == label_id)
    lower = points.min(axis=0)
    upper = points.max(axis=0) + 1
    crop = tuple(slice(int(lower[axis]), int(upper[axis])) for axis in range(3))
    target = labels[crop] == label_id
    bracketed = np.ones(target.shape, dtype=np.bool_)
    for axis in range(3):
        before = np.maximum.accumulate(target, axis=axis)
        after = np.flip(np.maximum.accumulate(np.flip(target, axis=axis), axis=axis), axis=axis)
        bracketed &= before & after
    labels_crop = labels[crop]
    candidate = bracketed & (image[crop] == 255) & (labels_crop == 0)
    other = (labels_crop != 0) & ~target
    other_neighbors = np.zeros(target.shape, dtype=np.bool_)
    other_neighbors[1:] |= other[:-1]
    other_neighbors[:-1] |= other[1:]
    other_neighbors[:, 1:] |= other[:, :-1]
    other_neighbors[:, :-1] |= other[:, 1:]
    other_neighbors[:, :, 1:] |= other[:, :, :-1]
    other_neighbors[:, :, :-1] |= other[:, :, 1:]
    candidate &= ~other_neighbors
    global_points = (np.argwhere(candidate) + lower).astype("<i4", copy=False)
    indices = set(int((x * labels.shape[1] + y) * labels.shape[2] + z) for x, y, z in global_points)
    fortran_indices = sorted(int(x + labels.shape[0] * (y + labels.shape[1] * z)) for x, y, z in global_points)
    bounds = None if global_points.size == 0 else [global_points.min(axis=0).tolist(), global_points.max(axis=0).tolist()]
    digest = None if global_points.size == 0 else hashlib.sha256(global_points.tobytes(order="C")).hexdigest()
    return {
        "requiresSameLabelOnBothSidesOfAllThreeAxes": True,
        "forbidsOtherLabelFaceNeighbor": True,
        "candidateVoxelCount": len(indices),
        "candidateSha256": digest,
        "candidateBoundsInclusive": bounds,
        "candidateLinearIndicesFortran": fortran_indices,
        "status": "review-candidate-only" if indices else "no-candidate",
    }, indices


def audit_one(
    image: np.ndarray,
    labels: np.ndarray,
    label_id: int,
    margins: tuple[int, ...],
    max_reached: int,
    minimum_neighbors: int,
) -> tuple[dict[str, Any], set[int]]:
    seed_points = np.argwhere(labels == label_id)
    if seed_points.size == 0:
        raise AuditError(f"ventricle ID {label_id} is empty")
    results: list[dict[str, Any]] = []
    for margin in margins:
        lower, upper = expanded_box(seed_points, labels.shape, margin)
        slices = tuple(slice(int(lower[axis]), int(upper[axis])) for axis in range(3))
        image_crop = image[slices]
        labels_crop = labels[slices]
        seed = labels_crop == label_id
        traversable = (image_crop == 255) & ((labels_crop == 0) | seed)
        reached, boundary, cutoff = flood_from_seed(traversable, seed, max_reached=max_reached)
        candidate = reached & (labels_crop == 0)
        candidate_sha, candidate_bounds = candidate_identity(candidate, lower)
        results.append(
            {
                "marginVoxels": margin,
                "cropLowerInclusive": lower.tolist(),
                "cropUpperExclusive": upper.tolist(),
                "seedVoxelCount": int(seed.sum()),
                "reachedVoxelCount": int(reached.sum()),
                "candidateVoxelCount": int(candidate.sum()),
                "touchesCropBoundary": boundary,
                "maxReachedCutoff": cutoff,
                "candidateSha256": candidate_sha,
                "candidateBoundsInclusive": candidate_bounds,
            }
        )

    stable_pair = len(results) >= 2 and results[-1]["candidateSha256"] == results[-2]["candidateSha256"]
    closed_all = all(not item["touchesCropBoundary"] and not item["maxReachedCutoff"] for item in results)
    candidate_count = results[-1]["candidateVoxelCount"]
    eligible = bool(candidate_count > 0 and stable_pair and closed_all)
    reasons: list[str] = []
    if candidate_count == 0:
        reasons.append("no connected unlabeled background voxels")
    if not stable_pair:
        reasons.append("candidate changed between the two widest margins")
    if not closed_all:
        reasons.append("component reached an audit boundary or safety cutoff")
    local_audit, local_indices = locally_enclosed_candidate(image, labels, label_id, minimum_neighbors)
    bracket_audit, bracket_indices = orthogonally_bracketed_candidate(image, labels, label_id)
    return {
        "labelId": label_id,
        "name": VENTRICLE_NAMES[label_id],
        "publishedVoxelCount": int(seed_points.shape[0]),
        "publishedBoundsInclusive": [seed_points.min(axis=0).tolist(), seed_points.max(axis=0).tolist()],
        "marginAudits": results,
        "automaticCandidateEligible": eligible,
        "rejectionReasons": reasons,
        "locallyEnclosedRepairAudit": local_audit,
        "localRepairCandidateAvailable": bool(local_indices),
        "orthogonallyBracketedRepairAudit": bracket_audit,
        "orthogonallyBracketedReviewCandidateAvailable": bool(bracket_indices),
    }, bracket_indices


def run_audit(
    image_path: Path,
    labels_path: Path,
    margins: tuple[int, ...],
    max_reached: int,
    minimum_neighbors: int,
) -> dict[str, Any]:
    if tuple(sorted(set(margins))) != margins or len(margins) < 2 or margins[0] < 1:
        raise AuditError("margins must contain at least two unique ascending positive integers")
    if minimum_neighbors not in (4, 5, 6):
        raise AuditError("minimum enclosing neighbors must be 4, 5, or 6")
    image_sha = sha256_file(image_path)
    labels_sha = sha256_file(labels_path)
    if image_path.resolve() == DEFAULT_IMAGE.resolve() and image_sha != EXPECTED_IMAGE_SHA256:
        raise AuditError("distributed BigBrain image SHA-256 mismatch")
    if labels_path.resolve() == DEFAULT_LABELS.resolve() and labels_sha != EXPECTED_LABEL_SHA256:
        raise AuditError("pre-ventricle practical labels SHA-256 mismatch")
    image_dims, image = read_browser_volume(image_path, b"BBV1")
    label_dims, labels = read_browser_volume(labels_path, b"BBS1")
    if image_dims != label_dims or image_dims != EXPECTED_DIMS:
        raise AuditError(f"unexpected or mismatched dimensions: image={image_dims}, labels={label_dims}")
    if any(np.any(image[labels == label_id] != 255) for label_id in VENTRICLE_IDS):
        raise AuditError("published ventricle labels include non-background BigBrain voxels")
    audited = [audit_one(image, labels, label_id, margins, max_reached, minimum_neighbors) for label_id in VENTRICLE_IDS]
    entries = [entry for entry, _ in audited]
    candidate_sets = [(entry["labelId"], candidate) for entry, candidate in audited]
    overlaps = []
    for index, (left_id, left) in enumerate(candidate_sets):
        for right_id, right in candidate_sets[index + 1 :]:
            count = len(left & right)
            if count:
                overlaps.append({"labelIds": [left_id, right_id], "voxelCount": count})
    return {
        "schemaVersion": 1,
        "tool": "scripts/audit_ventricle_cavity_candidates.py",
        "mode": "read-only-candidate-audit",
        "source": {
            "image": str(image_path.relative_to(ROOT)).replace("\\", "/") if image_path.is_relative_to(ROOT) else str(image_path),
            "imageSha256": image_sha,
            "labels": str(labels_path.relative_to(ROOT)).replace("\\", "/") if labels_path.is_relative_to(ROOT) else str(labels_path),
            "labelsSha256": labels_sha,
            "dims": list(image_dims),
            "voxelSizeMm": [0.5, 0.5, 0.5],
        },
        "policy": {
            "imageBackgroundValue": 255,
            "connectivity": 6,
            "candidateRequiresCurrentLabelZero": True,
            "publishedLabelsModified": False,
            "marginsVoxels": list(margins),
            "maxReachedVoxels": max_reached,
            "localRepairMinimumSameLabelFaceNeighbors": minimum_neighbors,
            "localRepairForbidsOtherLabelFaceNeighbor": True,
            "localRepairRule": "one-pass unlabeled BigBrain background voxel locally enclosed on at least four of six faces by the same current ventricle label",
            "orthogonallyBracketedRule": "unlabeled BigBrain background voxel with the same current ventricle label on both sides of x, y, and z; other-label face neighbors forbidden",
            "eligibility": "nonempty, closed at every tested margin, and byte-identical candidate coordinates at the two widest margins",
        },
        "entries": entries,
        "summary": {
            "entryCount": len(entries),
            "eligibleCount": sum(bool(entry["automaticCandidateEligible"]) for entry in entries),
            "localRepairCandidateEntryCount": sum(bool(entry["localRepairCandidateAvailable"]) for entry in entries),
            "orthogonallyBracketedCandidateEntryCount": sum(bool(entry["orthogonallyBracketedReviewCandidateAvailable"]) for entry in entries),
            "crossLabelCandidateOverlaps": overlaps,
            "publishedLabelsModified": False,
        },
    }


def build_unreviewed_patch(report: dict[str, Any], created_at: str) -> dict[str, Any]:
    edits: list[tuple[int, int]] = []
    for entry in report["entries"]:
        label_id = int(entry["labelId"])
        for index in entry["orthogonallyBracketedRepairAudit"]["candidateLinearIndicesFortran"]:
            edits.append((int(index), label_id))
    edits.sort()
    if not edits:
        raise AuditError("orthogonally bracketed review candidate is empty")
    runs: list[dict[str, int]] = []
    for index, label_id in edits:
        if runs and runs[-1]["label"] == label_id and runs[-1]["start"] + runs[-1]["length"] == index:
            runs[-1]["length"] += 1
        else:
            runs.append({"start": index, "length": 1, "label": label_id})
    transitions = []
    labels_used = sorted({label_id for _, label_id in edits})
    for label_id in labels_used:
        transitions.append({"from": 0, "to": label_id, "voxels": sum(1 for _, value in edits if value == label_id)})
    slice_stride = EXPECTED_DIMS[0] * EXPECTED_DIMS[1]
    z_values = [index // slice_stride for index, _ in edits]
    return {
        "format": "brain-practical-segmentation-patch",
        "version": 1,
        "sourceImage": "/atlas/bigbrain-icbm500.bin.gz",
        "sourceLabels": "/atlas/bigbrain-practical-segmentation-icbm500.bin.gz",
        "sourceLabelsSha256": report["source"]["labelsSha256"],
        "dims": list(EXPECTED_DIMS),
        "voxelSizeMm": [0.5, 0.5, 0.5],
        "primaryPlane": "horizontal",
        "workflowMetadataVersion": 1,
        "createdAt": created_at,
        "authorNote": "BigBrain背景値255の未ラベルvoxelのうち、現行の同一脳室ラベルがX・Y・Z各軸の両側に存在し、別ラベルと6近傍で接しない33 voxelを抽出した自動修正候補。公開ラベルへは未適用。直交断の原画像と隣接断で要レビュー。",
        "authorGitHub": "",
        "targetSide": "mixed",
        "evidence": f"read-only audit {report['tool']}; image SHA-256 {report['source']['imageSha256']}; labels SHA-256 {report['source']['labelsSha256']}; orthogonally bracketed candidate; no cross-label overlap",
        "confidence": "medium",
        "targetStructures": [{"id": label_id, "name": VENTRICLE_NAMES_JA[label_id]} for label_id in labels_used],
        "sliceRanges": [{"plane": "horizontal", "axis": "Z", "min": min(z_values), "max": max(z_values)}],
        "changeSummary": {
            "changedVoxelCount": len(edits),
            "unchangedVoxelCount": 0,
            "transitions": transitions,
        },
        "review": {
            "decision": "unreviewed",
            "reviewer": None,
            "decidedAt": None,
            "reason": "",
            "pullRequest": None,
        },
        "reviewStatus": "unreviewed",
        "editCount": len(edits),
        "runs": runs,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--image", type=Path, default=DEFAULT_IMAGE)
    parser.add_argument("--labels", type=Path, default=DEFAULT_LABELS)
    parser.add_argument("--margins", default="8,16,24")
    parser.add_argument("--max-reached", type=int, default=2_000_000)
    parser.add_argument("--minimum-enclosing-neighbors", type=int, default=4)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--patch-output", type=Path)
    parser.add_argument("--created-at", default="2026-08-23T15:00:00.000Z")
    args = parser.parse_args()
    margins = tuple(int(value) for value in args.margins.split(",") if value)
    report = run_audit(args.image.resolve(), args.labels.resolve(), margins, args.max_reached, args.minimum_enclosing_neighbors)
    rendered = json.dumps(report, ensure_ascii=False, indent=2) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(rendered, encoding="utf-8")
    if args.patch_output:
        patch = build_unreviewed_patch(report, args.created_at)
        args.patch_output.parent.mkdir(parents=True, exist_ok=True)
        args.patch_output.write_text(json.dumps(patch, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(rendered, end="")


if __name__ == "__main__":
    main()
