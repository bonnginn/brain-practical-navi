#!/usr/bin/env python3
"""Validate or apply a reviewed browser segmentation patch to a BBS1 volume.

The browser editor never mutates the bundled label volume. A maintainer runs
this script after reviewing a JSON patch and commits the regenerated volume and
an audit summary together.
"""

import argparse
import gzip
import hashlib
import json
import struct
from collections import Counter
from pathlib import Path


MAGIC = b"BBS1"
EXPECTED_FORMAT = "brain-practical-segmentation-patch"


def read_volume(path: Path):
    payload = gzip.decompress(path.read_bytes())
    if payload[:4] != MAGIC:
        raise ValueError(f"{path}: expected BBS1 volume")
    dims = struct.unpack_from("<HHH", payload, 4)
    voxel_count = dims[0] * dims[1] * dims[2]
    if len(payload) != 10 + voxel_count:
        raise ValueError(f"{path}: invalid payload length")
    return dims, bytearray(payload[10:])


def read_patch(path: Path, dims, voxel_count: int):
    patch = json.loads(path.read_text(encoding="utf-8"))
    if patch.get("format") != EXPECTED_FORMAT or patch.get("version") != 1:
        raise ValueError(f"{path}: unsupported patch format or version")
    if tuple(patch.get("dims", ())) != tuple(dims):
        raise ValueError(f"{path}: patch grid {patch.get('dims')} != volume grid {dims}")
    if patch.get("sourceLabels") != "/atlas/bigbrain-practical-segmentation-icbm500.bin.gz":
        raise ValueError(f"{path}: unexpected sourceLabels")
    edits = []
    occupied = set()
    for number, run in enumerate(patch.get("runs", []), start=1):
        start, length, label = run.get("start"), run.get("length"), run.get("label")
        if not all(isinstance(value, int) for value in (start, length, label)):
            raise ValueError(f"{path}: run {number} contains non-integer values")
        if start < 0 or length < 1 or start + length > voxel_count or not 0 <= label <= 255:
            raise ValueError(f"{path}: run {number} is outside the label grid")
        for index in range(start, start + length):
            if index in occupied:
                raise ValueError(f"{path}: overlapping edit at voxel {index}")
            occupied.add(index)
            edits.append((index, label))
    if patch.get("editCount") != len(edits):
        raise ValueError(f"{path}: editCount does not match expanded runs")
    return patch, edits


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("patch", type=Path, help="JSON patch exported by the browser editor")
    parser.add_argument(
        "--input",
        type=Path,
        default=Path("public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz"),
        help="source BBS1 label volume",
    )
    parser.add_argument("--output", type=Path, help="new BBS1 .bin.gz; must differ from --input")
    parser.add_argument("--check", action="store_true", help="validate and print audit only")
    args = parser.parse_args()

    dims, labels = read_volume(args.input)
    patch, edits = read_patch(args.patch, dims, len(labels))
    input_sha256 = hashlib.sha256(args.input.read_bytes()).hexdigest()
    if patch.get("sourceLabelsSha256") != input_sha256:
        raise ValueError(
            f"{args.patch}: sourceLabelsSha256 does not match {args.input}; "
            "review or regenerate the patch against the current label volume"
        )
    transitions = Counter()
    unchanged = 0
    for index, new_label in edits:
        old_label = labels[index]
        if old_label == new_label:
            unchanged += 1
        else:
            transitions[(old_label, new_label)] += 1
            labels[index] = new_label

    audit = {
        "patch": str(args.patch),
        "input": str(args.input),
        "inputSha256": input_sha256,
        "authorGitHub": patch.get("authorGitHub", ""),
        "dims": list(dims),
        "authorNote": patch.get("authorNote", ""),
        "targetSide": patch.get("targetSide", "mixed"),
        "evidence": patch.get("evidence", ""),
        "confidence": patch.get("confidence", "medium"),
        "reviewStatus": patch.get("reviewStatus", "unreviewed"),
        "editCount": len(edits),
        "changedVoxelCount": len(edits) - unchanged,
        "unchangedVoxelCount": unchanged,
        "transitions": [
            {"from": old, "to": new, "voxels": count}
            for (old, new), count in sorted(transitions.items())
        ],
    }
    print(json.dumps(audit, ensure_ascii=False, indent=2))

    if args.check:
        return
    if args.output is None:
        parser.error("--output is required unless --check is used")
    if args.output.resolve() == args.input.resolve():
        parser.error("refusing to overwrite --input; choose a separate --output path")
    payload = MAGIC + struct.pack("<HHH", *dims) + bytes(labels)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_bytes(gzip.compress(payload, compresslevel=9, mtime=0))


if __name__ == "__main__":
    main()
