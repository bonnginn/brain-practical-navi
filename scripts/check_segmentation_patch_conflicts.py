#!/usr/bin/env python3
"""Detect voxel-level conflicts between browser segmentation patches."""

import argparse
import hashlib
import json
from pathlib import Path

from apply_segmentation_patch import read_patch, read_volume


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("patches", type=Path, nargs="+", help="two or more patch JSON files")
    parser.add_argument(
        "--input",
        type=Path,
        default=Path("public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz"),
    )
    args = parser.parse_args()
    if len(args.patches) < 2:
        parser.error("at least two patch files are required")

    dims, labels = read_volume(args.input)
    digest = hashlib.sha256(args.input.read_bytes()).hexdigest()
    assignments = {}
    same_label_overlap = 0
    conflicts = []
    patch_summaries = []
    for patch_path in args.patches:
        patch, edits = read_patch(patch_path, dims, len(labels))
        if patch.get("sourceLabelsSha256") != digest:
            raise ValueError(f"{patch_path}: sourceLabelsSha256 does not match {args.input}")
        patch_summaries.append({
            "path": str(patch_path),
            "authorGitHub": patch.get("authorGitHub", ""),
            "targetSide": patch.get("targetSide", "mixed"),
            "confidence": patch.get("confidence", "medium"),
            "reviewStatus": patch.get("reviewStatus", "unreviewed"),
            "editCount": len(edits),
        })
        for index, label in edits:
            previous = assignments.get(index)
            if previous is None:
                assignments[index] = (label, str(patch_path))
            elif previous[0] == label:
                same_label_overlap += 1
            else:
                conflicts.append({
                    "index": index,
                    "firstLabel": previous[0],
                    "firstPatch": previous[1],
                    "secondLabel": label,
                    "secondPatch": str(patch_path),
                })

    audit = {
        "input": str(args.input),
        "inputSha256": digest,
        "dims": list(dims),
        "patches": patch_summaries,
        "uniqueAssignedVoxels": len(assignments),
        "sameLabelOverlapCount": same_label_overlap,
        "conflictCount": len(conflicts),
        "conflicts": conflicts[:100],
        "conflictsTruncated": len(conflicts) > 100,
    }
    print(json.dumps(audit, ensure_ascii=False, indent=2))
    if conflicts:
        raise SystemExit(2)


if __name__ == "__main__":
    main()
