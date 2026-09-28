#!/usr/bin/env python3
"""Index slices occupied by current teaching labels for section navigation only."""

from __future__ import annotations

import gzip
import hashlib
import json
import re
import struct
from pathlib import Path

import numpy as np


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz"
OUTPUT = ROOT / "app/sectionLabelPresence.json"


def main() -> None:
    compressed = SOURCE.read_bytes()
    payload = gzip.decompress(compressed)
    if payload[:4] != b"BBS1":
        raise ValueError("unexpected segmentation header")
    dims = struct.unpack("<3H", payload[4:10])
    labels = np.frombuffer(payload, dtype=np.uint8, offset=10).reshape(dims, order="F")
    page = (ROOT / "app/page.tsx").read_text(encoding="utf-8")
    ids = sorted({int(value) for group in re.findall(r"bigbrainIds:\s*\[([0-9,]+)\]", page) for value in group.split(",")})
    result: dict[str, object] = {
        "revision": hashlib.sha256(compressed).hexdigest(),
        "dims": list(dims),
        "labels": {},
    }
    for label_id in ids:
        mask = labels == label_id
        if not mask.any():
            raise ValueError(f"structure label {label_id} is empty")
        planes = {}
        for plane, axes in (("sagittal", (1, 2)), ("coronal", (0, 2)), ("horizontal", (0, 1))):
            counts = mask.sum(axis=axes)
            present = np.flatnonzero(counts)
            groups = np.split(present, np.flatnonzero(np.diff(present) > 1) + 1)
            planes[plane] = [[int(group[0]), int(group[-1]), int(group[np.argmax(counts[group])])] for group in groups if group.size]
        result["labels"][str(label_id)] = planes
    OUTPUT.write_text(json.dumps(result, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"indexed {len(ids)} labels in {OUTPUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
