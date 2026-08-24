#!/usr/bin/env python3
"""Upgrade legacy segmentation patch JSON to workflow metadata version 1.

The input label volume is mandatory because target coverage and transition
counts are derived from its actual bytes. Existing review status is preserved;
the one approved mammillary candidate is given the recorded project review
metadata supplied by the project audit.
"""

import argparse
import gzip
import hashlib
import json
import struct
import subprocess
from pathlib import Path

from apply_segmentation_patch import (
    EXPECTED_SOURCE_IMAGE,
    EXPECTED_SOURCE_LABELS,
    _expected_workflow_metadata,
    validate_workflow_metadata,
    read_patch,
    read_volume,
)


MAMMILLARY_SOURCE_SHA256 = "de30b5c77f4ed4f2902564a5d238b0e733413c247643ef828fb66aa03d8cc8be"
APPROVED_MAMMILLARY_FILENAME = "mammillary-bodies-horizontal-core-plus-clear-rim-candidate-2026-08-16.json"
APPROVED_MAMMILLARY_PRE_UPGRADE_GIT_BLOB_SHA = "1b03d956cfcbce8e61241ca5be47b8b1521718ae"
APPROVED_REASON = (
    "水平断Z107–121で画像誘導分節した左右乳頭体を公開教材ラベルへ採用し、"
    "視床下部付着境界は推測で拡張しない判断を記録した。"
)
APPROVED_REVIEW = {
    "decision": "approved",
    "reviewer": {"kind": "project-role", "id": "project-lead"},
    "decidedAt": "2026-08-16",
    "reason": APPROVED_REASON,
    "pullRequest": {"number": 10, "mergeCommit": "9daec82bf2135743aa428d2032b4c81b2d76e57d"},
}


def git_blob_sha(data: bytes) -> str:
    header = f"blob {len(data)}\0".encode("ascii")
    return hashlib.sha1(header + data).hexdigest()


def read_git_blob_volume(blob: str):
    compressed = subprocess.check_output(["git", "cat-file", "blob", blob])
    digest = hashlib.sha256(compressed).hexdigest()
    payload = gzip.decompress(compressed)
    if payload[:4] != b"BBS1" or len(payload) < 10:
        raise ValueError(f"git blob {blob}: expected a BBS1 gzip volume")
    dims = struct.unpack_from("<HHH", payload, 4)
    voxel_count = dims[0] * dims[1] * dims[2]
    if len(payload) != 10 + voxel_count:
        raise ValueError(f"git blob {blob}: invalid BBS1 payload length")
    return digest, dims, bytearray(payload[10:])


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("patches", type=Path, nargs="+", help="legacy patch JSON files to upgrade")
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument("--input", type=Path, help="source BBS1 volume")
    source.add_argument("--git-blob", help="git blob containing the source BBS1 gzip volume")
    parser.add_argument("--output-dir", type=Path, help="write upgraded copies here")
    parser.add_argument("--in-place", action="store_true", help="replace each patch JSON")
    args = parser.parse_args()
    if bool(args.output_dir) == bool(args.in_place):
        parser.error("choose exactly one of --output-dir or --in-place")

    if args.git_blob:
        digest, dims, labels = read_git_blob_volume(args.git_blob)
    else:
        dims, labels = read_volume(args.input)
        digest = hashlib.sha256(args.input.read_bytes()).hexdigest()

    for patch_path in args.patches:
        raw_patch = patch_path.read_bytes()
        patch, edits = read_patch(patch_path, dims, len(labels))
        if patch.get("sourceLabels") != EXPECTED_SOURCE_LABELS or patch.get("sourceLabelsSha256") != digest:
            raise ValueError(f"{patch_path}: sourceLabels/sourceLabelsSha256 do not match the selected input")
        if patch.get("workflowMetadataVersion") == 1:
            # Re-running the upgrader on an already strengthened JSON is safe,
            # but never reassign an existing decision from its current review.
            validate_workflow_metadata(patch_path, patch, edits, labels, dims)
            upgraded = dict(patch)
            output_path = patch_path if args.in_place else args.output_dir / patch_path.name
            output_path.parent.mkdir(parents=True, exist_ok=True)
            output_path.write_text(json.dumps(upgraded, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            print(output_path)
            continue
        metadata = _expected_workflow_metadata(edits, labels, dims)
        decision = patch.get("reviewStatus", "unreviewed")
        if decision not in {"unreviewed", "approved"}:
            raise ValueError(f"{patch_path}: cannot infer review metadata for {decision}")
        if decision == "approved":
            allowlisted = (
                patch_path.name == APPROVED_MAMMILLARY_FILENAME
                and patch.get("sourceLabelsSha256") == MAMMILLARY_SOURCE_SHA256
                and git_blob_sha(raw_patch) == APPROVED_MAMMILLARY_PRE_UPGRADE_GIT_BLOB_SHA
            )
            if not allowlisted:
                raise ValueError(
                    f"{patch_path}: legacy approved patch is not an allowlisted mammillary migration; "
                    "add an explicit maintainer review record before upgrading"
                )
        upgraded = dict(patch)
        upgraded["sourceImage"] = EXPECTED_SOURCE_IMAGE
        upgraded["sourceLabels"] = EXPECTED_SOURCE_LABELS
        upgraded.update({"workflowMetadataVersion": 1, **metadata})
        upgraded["review"] = dict(APPROVED_REVIEW) if decision == "approved" else {
            "decision": "unreviewed",
            "reviewer": None,
            "decidedAt": None,
            "reason": "",
            "pullRequest": None,
        }
        upgraded["reviewStatus"] = decision
        output_path = patch_path if args.in_place else args.output_dir / patch_path.name
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(json.dumps(upgraded, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(output_path)


if __name__ == "__main__":
    main()
