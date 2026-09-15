"""Inventory existing stage-2 ventricular evidence against the current labels.

This read-only inventory does not search for new candidates or render images.
It reports coordinate-set overlap, historical label revisions, and current
voxel values for the aqueduct, inferior third-ventricle terminal, and inferior
fourth-ventricle review regions.
"""

from __future__ import annotations

import hashlib
import json
import itertools
from pathlib import Path

import numpy as np

from build_orthogonal_review_bundle import DEFAULT_LABELS, MAGIC_LABELS, ROOT, read_browser_volume


CURRENT_LABEL_SHA = "48e1602b871b10bd7b31f99278aef8d0e44bcfb8930051fa9aa20ffd48802db2"
SOURCE_LABELS = ROOT / "tests/fixtures/bigbrain-practical-segmentation-pre-third-inferior-current16.bin.gz"
OUTPUT = ROOT / "work/anatomy-review/stage2-ventricular-terminals-inventory-v3/report.json"


REGIONS = {
    "aqueduct": {
        "locator": "work/anatomy-review/aqueduct-enclosed-continuity-2026-09-08-majority-v1/candidate.json",
        "review": [
            "work/anatomy-review/aqueduct-native100-terminals-2026-09-08-v1/report.json",
            "work/anatomy-review/aqueduct-native100-terminals-2026-09-08-v1-wide12mm/report.json",
        ],
        "adoptions": [
            "segmentation-patches/review/aqueduct-core179-adoption-2026-09-08.json",
            "segmentation-patches/review/posterior-ventricles158-adoption-2026-09-08.json",
        ],
        "held_count": 94,
        "description": "aqueduct candidate and terminal native100 context",
    },
    "thirdVentricleInferiorTerminal": {
        "locator": "work/anatomy-review/third-inferior-terminal24-candidate-v1.json",
        "review": ["work/anatomy-review/third-inferior-terminal-2026-09-08-native300-v1/report.json"],
        "adoptions": ["segmentation-patches/review/third-remnants91-adoption-2026-09-08.json"],
        "held_count": 24,
        "current_definition": "fixed-range",
        "description": "retained ambiguous inferior third-ventricle terminal with historical exclusion context",
    },
    "fourthVentricleInferior": {
        "locator": "work/anatomy-review/fourth-lower-posterior-remaining-native300-v1/report.json",
        "review": ["work/anatomy-review/fourth-ventricle-tail-native-v1/report.json"],
        "adoptions": [
            "segmentation-patches/review/fourth-brainstem48-adoption-2026-09-07.json",
            "segmentation-patches/review/fourth-depth27-adoption-2026-09-07.json",
            "segmentation-patches/review/fourth-anterior105-adoption-2026-09-07.json",
            "segmentation-patches/review/fourth-upper-posterior111-adoption-2026-09-07.json",
            "segmentation-patches/review/fourth-ventricle-paired-adoption-2026-09-07.json",
        ],
        "held_count": 316,
        "description": "inferior/posterior fourth-ventricle held review extent",
    },
}

THIRD_CURRENT_HELD_POINTS = np.asarray(
    list(itertools.product((195, 196), range(265, 269), (107, 108))), dtype=np.int64
)

DOCS = [
    "docs/AQUEDUCT_PARTIAL_REPAIR.md",
    "docs/FOURTH_VENTRICLE_REPAIR.md",
    "docs/THIRD_VENTRICLE_REMNANTS_REPAIR.md",
]


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _read(path: Path) -> dict[str, object]:
    return json.loads(path.read_text(encoding="utf-8"))


def _points(data: dict[str, object]) -> np.ndarray:
    values = data.get("points")
    if not isinstance(values, list):
        raise ValueError("source has no points list")
    result = []
    for value in values:
        point = value.get("xyz") if isinstance(value, dict) else value
        if not isinstance(point, list) or len(point) != 3:
            raise ValueError("invalid source coordinate")
        result.append(point)
    points = np.asarray(result, dtype=np.int64)
    if points.ndim != 2 or points.shape[1] != 3 or len(np.unique(points, axis=0)) != len(points):
        raise ValueError("source coordinates are not unique integer triples")
    return points


def _source_entry(path_string: str, role: str) -> dict[str, object]:
    path = ROOT / path_string
    entry = {"path": path_string, "sha256": sha256(path), "role": role}
    if path.suffix == ".json":
        data = _read(path)
        for key in ("count", "candidateCount", "remainingCandidateCount", "selectedCount", "generatedPlanes"):
            if key in data and isinstance(data[key], (int, float)):
                entry[key] = data[key]
        for key in ("inputSha256", "sourceSha256", "labelsSha256", "currentLabelSha256", "afterSha256"):
            if key in data:
                entry[key] = data[key]
        if "adopted" in data:
            entry["adopted"] = data["adopted"]
        if "expertReviewed" in data:
            entry["expertReviewed"] = data["expertReviewed"]
        if "mutation" in data:
            entry["mutation"] = data["mutation"]
    return entry


def _adopted_union(paths: list[str]) -> tuple[set[tuple[int, int, int]], dict[str, set[tuple[int, int, int]]]]:
    union: set[tuple[int, int, int]] = set()
    by_source: dict[str, set[tuple[int, int, int]]] = {}
    for path_string in paths:
        data = _read(ROOT / path_string)
        if data.get("adopted") is not True:
            raise ValueError(f"historical adoption is not marked adopted: {path_string}")
        points = _points(data)
        source_points = {tuple(int(value) for value in point) for point in points.tolist()}
        by_source[path_string] = source_points
        union.update(source_points)
    return union, by_source


def _region_inventory(name: str, spec: dict[str, object], labels: np.ndarray) -> dict[str, object]:
    locator_path = ROOT / str(spec["locator"])
    locator = _read(locator_path)
    points = _points(locator)
    if np.any(points < 0) or np.any(points >= labels.shape):
        raise ValueError(f"{name}: locator coordinates outside current volume")
    adopted_union, adopted_by_source = _adopted_union(list(spec["adoptions"]))
    point_set = {tuple(int(value) for value in point) for point in points.tolist()}
    overlap_by_source = {path: len(point_set & source_points) for path, source_points in adopted_by_source.items()}
    if name == "aqueduct":
        current_points = np.asarray(sorted(point_set - adopted_union), dtype=np.int64)
        current_definition = {
            "method": "historical 273-point locator minus exact union of listed adopted coordinate sets",
            "sourceAdoptionPaths": list(spec["adoptions"]),
        }
    elif name == "thirdVentricleInferiorTerminal":
        current_points = THIRD_CURRENT_HELD_POINTS
        current_definition = {
            "method": "fixed retained ambiguous range from the existing stage rationale",
            "rangesInclusive": {"x": [195, 196], "y": [265, 268], "z": [107, 108]},
            "sourceScript": "scripts/stage_third_inferior_terminal24.py",
            "sourceNote": "The 24-point exclusion footprint is historical context; these adjacent 16 points were deliberately retained.",
        }
    else:
        current_points = points.copy()
        current_definition = {
            "method": "historical held review points retained as current held set",
            "sourceLocator": str(spec["locator"]),
        }
    if (
        current_points.shape != (len(current_points), 3)
        or len(np.unique(current_points, axis=0)) != len(current_points)
        or np.any(current_points < 0)
        or np.any(current_points >= labels.shape)
    ):
        raise ValueError(f"{name}: current held coordinates invalid")
    current_values = labels[tuple(current_points.T)]
    unique, counts = np.unique(current_values, return_counts=True)
    current_value_counts = {str(int(value)): int(count) for value, count in zip(unique, counts)}
    current_point_set = {tuple(int(value) for value in point) for point in current_points.tolist()}
    historical_source_sha = locator.get("inputSha256", locator.get("sourceSha256", locator.get("labelsSha256")))
    review_sources = list(spec["review"])
    return {
        "description": spec["description"],
        "locator": _source_entry(str(spec["locator"]), "coordinate locator or held review points"),
        "reviewEvidence": [_source_entry(path, "existing review evidence; reusable") for path in review_sources],
        "historicalSourceLabelSha256": historical_source_sha,
        "directCurrentLabelComparison": historical_source_sha == CURRENT_LABEL_SHA,
        "candidateCount": int(len(points)),
        "historicalContextCount": int(len(points)),
        "historicalHeldCount": int(spec["held_count"]),
        "currentHeldCount": int(len(current_points)),
        "currentHeldPoints": current_points.tolist(),
        "currentHeldValueCounts": current_value_counts,
        "currentHeldUnlabelledCount": int(np.count_nonzero(current_values == 0)),
        "currentHeldNonzeroCount": int(np.count_nonzero(current_values != 0)),
        "currentHeldDefinition": current_definition,
        "coordinateUniqueCount": int(len(point_set)),
        "currentLabelValueCounts": current_value_counts,
        "currentlyUnlabelledCount": int(np.count_nonzero(current_values == 0)),
        "currentNonzeroCount": int(np.count_nonzero(current_values != 0)),
        "historicalAdoptedCoordinateOverlapCount": int(len(point_set & adopted_union)),
        "historicalAdoptedCoordinateOverlapBySource": overlap_by_source,
        "currentHeldAdoptedCoordinateOverlapCount": int(len(current_point_set & adopted_union)),
        "knownAdoptedUnionCount": int(len(adopted_union)),
        "comparisonNote": (
            "Historical locator used a different label revision; current held voxel values were re-read at the exact coordinates."
            if historical_source_sha != CURRENT_LABEL_SHA
            else "Historical locator and current label revision match."
        ),
        "nextEvidence": "current-SHA overlay needed before any stage-2 anatomical decision",
        "limitation": "Coordinate overlap and current values are inventory facts, not anatomical attribution or adoption.",
    }


def build() -> Path:
    if OUTPUT.exists():
        raise ValueError(f"preserve prior inventory: {OUTPUT}")
    _, _, labels = read_browser_volume(SOURCE_LABELS, MAGIC_LABELS, CURRENT_LABEL_SHA)
    report = {
        "schemaVersion": 1,
        "status": "read-only-historical-stage2-evidence-inventory",
        "mutation": False,
        "adopted": False,
        "expertReviewed": False,
        "currentLabelPath": DEFAULT_LABELS.relative_to(ROOT).as_posix(),
        "currentLabelSha256": CURRENT_LABEL_SHA,
        "regions": {name: _region_inventory(name, spec, labels) for name, spec in REGIONS.items()},
        "inputs": [_source_entry(path, "scope document; digest only") for path in DOCS]
        + [
            _source_entry(str(spec["locator"]), f"{name} locator")
            for name, spec in REGIONS.items()
        ]
        + [
            _source_entry(path, f"{name} reusable review evidence")
            for name, spec in REGIONS.items()
            for path in spec["review"]
        ]
        + [
            _source_entry(path, f"{name} historical adoption")
            for name, spec in REGIONS.items()
            for path in spec["adoptions"]
        ]
        + [_source_entry("scripts/stage_third_inferior_terminal24.py", "third current held range provenance")],
        "limitation": "This inventory reuses existing coordinates and reports only current label values; it performs no candidate search, rendering, anatomical attribution, or stage application.",
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    payload = (json.dumps(report, indent=2) + "\n").encode("utf-8")
    OUTPUT.write_bytes(payload)
    print(json.dumps({"path": OUTPUT.relative_to(ROOT).as_posix(), "sha256": sha256(OUTPUT)}))
    return OUTPUT


if __name__ == "__main__":
    build()
