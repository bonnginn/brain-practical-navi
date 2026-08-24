#!/usr/bin/env python3
"""Validate or apply a reviewed browser segmentation patch to a BBS1 volume.

The browser editor never mutates the bundled label volume. A maintainer runs
this script after reviewing a JSON patch and commits the regenerated volume
and an audit summary together. Patch metadata version 1 is checked against
the input volume rather than trusted from the JSON document.
"""

import argparse
import gzip
import hashlib
import json
import re
import struct
import sys
from collections import Counter
from datetime import datetime
from pathlib import Path


MAGIC = b"BBS1"
EXPECTED_FORMAT = "brain-practical-segmentation-patch"
EXPECTED_SOURCE_IMAGE = "/atlas/bigbrain-icbm500.bin.gz"
EXPECTED_SOURCE_LABELS = "/atlas/bigbrain-practical-segmentation-icbm500.bin.gz"
WORKFLOW_METADATA_VERSION = 1
LABEL_NAMES = {
    1: "左赤核", 2: "右赤核", 3: "左黒質", 4: "右黒質", 5: "左視床下核", 6: "右視床下核",
    7: "左尾状核", 8: "右尾状核", 9: "左被殻", 10: "右被殻", 11: "左淡蒼球外節", 12: "右淡蒼球外節",
    13: "左淡蒼球内節", 14: "右淡蒼球内節", 15: "左視床", 16: "右視床", 17: "左海馬", 18: "右海馬",
    19: "左側坐核", 20: "右側坐核", 21: "左扁桃体", 22: "右扁桃体", 23: "左側脳室", 24: "右側脳室",
    25: "第三脳室", 26: "第四脳室", 27: "脳幹", 28: "左小脳", 29: "右小脳", 30: "脳梁候補",
    31: "左内包候補", 32: "右内包候補", 33: "視交叉候補", 34: "左島皮質候補", 35: "右島皮質候補",
    36: "視交叉（正中）", 37: "左視索", 38: "右視索", 39: "左乳頭体", 40: "右乳頭体",
}
DATE_ONLY = re.compile(r"^\d{4}-\d{2}-\d{2}$")
RFC3339 = re.compile(
    r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$"
)
HEX40 = re.compile(r"^[0-9a-fA-F]{40}$")
TARGET_SIDES = {"left", "right", "bilateral", "midline", "mixed"}
CONFIDENCE_LEVELS = {"high", "medium", "low"}


def _integer(value):
    return isinstance(value, int) and not isinstance(value, bool)


def read_volume(path: Path):
    try:
        payload = gzip.decompress(path.read_bytes())
    except (OSError, EOFError) as exc:
        raise ValueError(f"{path}: invalid gzip volume") from exc
    if len(payload) < 10 or payload[:4] != MAGIC:
        raise ValueError(f"{path}: expected BBS1 volume")
    dims = struct.unpack_from("<HHH", payload, 4)
    voxel_count = dims[0] * dims[1] * dims[2]
    if len(payload) != 10 + voxel_count:
        raise ValueError(f"{path}: invalid payload length")
    return dims, bytearray(payload[10:])


def read_patch(path: Path, dims, voxel_count: int):
    try:
        patch = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ValueError(f"{path}: invalid patch JSON") from exc
    if not isinstance(patch, dict):
        raise ValueError(f"{path}: patch root must be an object")
    if patch.get("format") != EXPECTED_FORMAT or patch.get("version") != 1:
        raise ValueError(f"{path}: unsupported patch format or version")
    if tuple(patch.get("dims", ())) != tuple(dims):
        raise ValueError(f"{path}: patch grid {patch.get('dims')} != volume grid {dims}")
    if patch.get("sourceLabels") != EXPECTED_SOURCE_LABELS:
        raise ValueError(f"{path}: unexpected sourceLabels")
    if patch.get("primaryPlane") != "horizontal":
        raise ValueError(f"{path}: primaryPlane must be horizontal")
    if patch.get("voxelSizeMm") != [0.5, 0.5, 0.5]:
        raise ValueError(f"{path}: patch voxelSizeMm must be [0.5, 0.5, 0.5]")
    runs = patch.get("runs")
    if not isinstance(runs, list):
        raise ValueError(f"{path}: runs must be an array")
    edits = []
    occupied = set()
    for number, run in enumerate(runs, start=1):
        if not isinstance(run, dict):
            raise ValueError(f"{path}: run {number} must be an object")
        start, length, label = run.get("start"), run.get("length"), run.get("label")
        if not all(_integer(value) for value in (start, length, label)):
            raise ValueError(f"{path}: run {number} contains non-integer values")
        if start < 0 or length < 1 or start + length > voxel_count or not 0 <= label <= 255:
            raise ValueError(f"{path}: run {number} is outside the label grid")
        for index in range(start, start + length):
            if index in occupied:
                raise ValueError(f"{path}: overlapping edit at voxel {index}")
            occupied.add(index)
            edits.append((index, label))
    if not _integer(patch.get("editCount")) or patch["editCount"] != len(edits):
        raise ValueError(f"{path}: editCount does not match expanded runs")
    return patch, edits


def _expected_workflow_metadata(edits, labels, dims):
    width, height, _depth = dims
    target_ids = set()
    z_values = []
    transition_counts = Counter()
    changed = 0
    unchanged = 0
    for index, new_label in edits:
        old_label = labels[index]
        if old_label:
            target_ids.add(old_label)
        if new_label:
            target_ids.add(new_label)
        z_values.append(index // (width * height))
        if old_label == new_label:
            unchanged += 1
        else:
            changed += 1
            transition_counts[(old_label, new_label)] += 1
    unknown_ids = sorted(target_ids - LABEL_NAMES.keys())
    if unknown_ids:
        raise ValueError(f"workflow metadata cannot name label IDs: {unknown_ids}")
    return {
        "targetStructures": [
            {"id": label_id, "name": LABEL_NAMES[label_id]}
            for label_id in sorted(target_ids)
        ],
        "sliceRanges": [] if not z_values else [{
            "plane": "horizontal",
            "axis": "Z",
            "min": min(z_values),
            "max": max(z_values),
        }],
        "changeSummary": {
            "changedVoxelCount": changed,
            "unchangedVoxelCount": unchanged,
            "transitions": [
                {"from": old, "to": new, "voxels": count}
                for (old, new), count in sorted(transition_counts.items())
            ],
        },
    }


def _validate_decided_at(path: Path, value):
    if not isinstance(value, str) or not (DATE_ONLY.fullmatch(value) or RFC3339.fullmatch(value)):
        raise ValueError(f"{path}: review.decidedAt must be YYYY-MM-DD or RFC3339")
    try:
        if DATE_ONLY.fullmatch(value):
            datetime.strptime(value, "%Y-%m-%d")
        else:
            datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ValueError(f"{path}: review.decidedAt is not a real date/time") from exc


def _validate_review(path: Path, patch):
    review = patch.get("review")
    if not isinstance(review, dict) or set(review) != {"decision", "reviewer", "decidedAt", "reason", "pullRequest"}:
        raise ValueError(f"{path}: version 1 requires the complete review object")
    decision = review.get("decision")
    if decision not in {"unreviewed", "approved", "rejected"}:
        raise ValueError(f"{path}: review.decision is invalid")
    if patch.get("reviewStatus") != decision:
        raise ValueError(f"{path}: reviewStatus must equal review.decision")
    reviewer = review.get("reviewer")
    decided_at = review.get("decidedAt")
    reason = review.get("reason")
    pull_request = review.get("pullRequest")
    if decision == "unreviewed":
        if reviewer is not None or decided_at is not None or reason != "" or pull_request is not None:
            raise ValueError(f"{path}: unreviewed patches must have empty review fields")
        return
    if not isinstance(reviewer, dict) or set(reviewer) != {"kind", "id"}:
        raise ValueError(f"{path}: reviewed patch requires reviewer kind and id")
    if reviewer.get("kind") not in {"github", "project-role"} or not isinstance(reviewer.get("id"), str) or not reviewer["id"].strip():
        raise ValueError(f"{path}: reviewer kind/id is invalid")
    _validate_decided_at(path, decided_at)
    if not isinstance(reason, str) or not reason.strip():
        raise ValueError(f"{path}: reviewed patch requires a non-empty reason")
    if not isinstance(pull_request, dict) or set(pull_request) != {"number", "mergeCommit"}:
        raise ValueError(f"{path}: reviewed patch requires pullRequest number and mergeCommit")
    if not _integer(pull_request.get("number")) or pull_request["number"] <= 0:
        raise ValueError(f"{path}: pullRequest.number must be positive")
    merge_commit = pull_request.get("mergeCommit")
    if merge_commit is not None and (not isinstance(merge_commit, str) or not HEX40.fullmatch(merge_commit)):
        raise ValueError(f"{path}: pullRequest.mergeCommit must be null or a 40-character hexadecimal commit")


def validate_workflow_metadata(path: Path, patch, edits, labels, dims):
    """Validate metadata against the unmodified input labels.

    Legacy patches remain checkable so old contributions can be reviewed, but
    they are never eligible for output. Version 1 metadata is exact rather
    than advisory.
    """

    if "workflowMetadataVersion" not in patch:
        return {
            "status": "legacy+missing fields",
            "warnings": [
                "workflowMetadataVersion is missing; targetStructures, sliceRanges, changeSummary, and review are legacy-missing",
            ],
        }
    if patch.get("workflowMetadataVersion") != WORKFLOW_METADATA_VERSION:
        raise ValueError(f"{path}: unsupported workflowMetadataVersion")
    if not edits:
        raise ValueError(f"{path}: strict patches must contain at least one edited voxel")
    if patch.get("sourceImage") != EXPECTED_SOURCE_IMAGE:
        raise ValueError(f"{path}: strict sourceImage must use the canonical /atlas path")
    if patch.get("targetSide") not in TARGET_SIDES:
        raise ValueError(f"{path}: targetSide is required and must be one of {sorted(TARGET_SIDES)}")
    if patch.get("confidence") not in CONFIDENCE_LEVELS:
        raise ValueError(f"{path}: confidence is required and must be one of {sorted(CONFIDENCE_LEVELS)}")
    if not isinstance(patch.get("evidence"), str) or not patch["evidence"].strip():
        raise ValueError(f"{path}: strict patches require non-empty evidence")
    expected = _expected_workflow_metadata(edits, labels, dims)
    for field in ("targetStructures", "sliceRanges", "changeSummary"):
        if field not in patch or patch[field] != expected[field]:
            raise ValueError(f"{path}: {field} does not match the input volume and runs")
    _validate_review(path, patch)
    return {"status": "strict", "warnings": []}


def validate_patch(path: Path, dims, voxel_count: int, labels, input_sha256: str):
    patch, edits = read_patch(path, dims, voxel_count)
    if patch.get("sourceLabelsSha256") != input_sha256:
        raise ValueError(
            f"{path}: sourceLabelsSha256 does not match the input volume; "
            "review or regenerate the patch against the current label volume"
        )
    metadata = validate_workflow_metadata(path, patch, edits, labels, dims)
    return patch, edits, metadata


def build_audit(path: Path, input_path: Path, patch, edits, metadata, dims, labels, input_sha256):
    original = labels
    transitions = Counter()
    unchanged = 0
    for index, new_label in edits:
        old_label = original[index]
        if old_label == new_label:
            unchanged += 1
        else:
            transitions[(old_label, new_label)] += 1
            labels[index] = new_label
    return {
        "patch": str(path),
        "input": str(input_path),
        "inputSha256": input_sha256,
        "authorGitHub": patch.get("authorGitHub", ""),
        "dims": list(dims),
        "authorNote": patch.get("authorNote", ""),
        "targetSide": patch.get("targetSide", "mixed"),
        "evidence": patch.get("evidence", ""),
        "confidence": patch.get("confidence", "medium"),
        "reviewStatus": patch.get("reviewStatus", "unreviewed"),
        "workflowMetadataVersion": patch.get("workflowMetadataVersion"),
        "workflowMetadataStatus": metadata["status"],
        "workflowMetadataWarnings": metadata["warnings"],
        "review": patch.get("review"),
        "targetStructures": patch.get("targetStructures"),
        "sliceRanges": patch.get("sliceRanges"),
        "changeSummary": patch.get("changeSummary"),
        "editCount": len(edits),
        "changedVoxelCount": len(edits) - unchanged,
        "unchangedVoxelCount": unchanged,
        "transitions": [
            {"from": old, "to": new, "voxels": count}
            for (old, new), count in sorted(transitions.items())
        ],
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("patch", type=Path, help="JSON patch exported by the browser editor")
    parser.add_argument(
        "--input",
        type=Path,
        default=Path("public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz"),
        help="source BBS1 label volume",
    )
    parser.add_argument("--output", type=Path, help="new BBS1 .bin.gz; strict approved patches only")
    parser.add_argument("--check", action="store_true", help="validate and print audit only")
    args = parser.parse_args()

    dims, labels = read_volume(args.input)
    input_sha256 = hashlib.sha256(args.input.read_bytes()).hexdigest()
    patch, edits, metadata = validate_patch(args.patch, dims, len(labels), labels, input_sha256)
    if metadata["status"] == "legacy+missing fields":
        print(f"WARNING: {args.patch}: legacy patch; workflow metadata is missing", file=sys.stderr)
    audit = build_audit(args.patch, args.input, patch, edits, metadata, dims, labels, input_sha256)
    # Keep CLI JSON ASCII-safe on Windows terminals whose default code page is
    # not UTF-8; JSON consumers still decode the escaped Unicode faithfully.
    print(json.dumps(audit, ensure_ascii=True, indent=2))

    if args.check:
        return
    if args.output is None:
        parser.error("--output is required unless --check is used")
    if metadata["status"] != "strict" or patch.get("review", {}).get("decision") != "approved":
        raise ValueError("--output is allowed only for strict workflow metadata with review decision approved")
    if args.output.resolve() == args.input.resolve():
        parser.error("refusing to overwrite --input; choose a separate --output path")
    payload = MAGIC + struct.pack("<HHH", *dims) + bytes(labels)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_bytes(gzip.compress(payload, compresslevel=9, mtime=0))


if __name__ == "__main__":
    main()
