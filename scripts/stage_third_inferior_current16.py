"""Create a reversible work-only 25-to-0 stage for the reviewed current 16 points."""

from __future__ import annotations

import gzip
import hashlib
import json
from pathlib import Path

import numpy as np

from build_orthogonal_review_bundle import DEFAULT_LABELS, MAGIC_LABELS, ROOT, read_browser_volume


INVENTORY = ROOT / "work/anatomy-review/stage2-ventricular-terminals-inventory-v3/report.json"
INVENTORY_SHA = "6d0475b6af9330a1d2ee8ddb4663c20fced18968a678bc709ef62ae3dc2b9a0d"
NATIVE_REPORT = ROOT / "work/anatomy-review/third-inferior-current16-native100-v2/report.json"
NATIVE_REPORT_SHA = "1a0d59a0e3860ad590c076188e27d2fdb284cfde73d277dc55de90c2fec37216"
LABEL_SHA = "48e1602b871b10bd7b31f99278aef8d0e44bcfb8930051fa9aa20ffd48802db2"
SOURCE_LABELS = ROOT / "tests/fixtures/bigbrain-practical-segmentation-pre-third-inferior-current16.bin.gz"
HISTORICAL_LABEL_SHA = "3aa4127843d1ca59ee4fa2d542632748ec542958c76329b627b3968b6d53f45e"
HISTORICAL_EXTENT = {
    "x": ("work/anatomy-review/third-inferior-terminal-extent-2026-09-08-series-x-v1/report.json", "c2b05f0c060ef72b6a9abdc52d12f03be95cc7ceb548f3305fdfca5bc9ab457c"),
    "y": ("work/anatomy-review/third-inferior-terminal-extent-2026-09-08-series-y-v1/report.json", "042b1d44511d3103d55e18f73f6073410eab260b956e3fd7355b6a58660d0622"),
    "z": ("work/anatomy-review/third-inferior-terminal-extent-2026-09-08-series-z-v1/report.json", "ec05f97dd0b5261dd6740d5a33a78c18bb2fe28cd7a9e11e272bb8a8739320fc"),
}
HISTORICAL_EXCLUSION = ROOT / "work/anatomy-review/third-inferior-terminal24-candidate-v1.json"
HISTORICAL_EXCLUSION_SHA = "368d5a479d510fb2e004a0430f3e83f8df8a3475c3e0e20c73155623d1084aef"
CANDIDATE_DIR = ROOT / "work/anatomy-review/third-inferior-current16-candidate-v1"
STAGE_DIR = ROOT / "work/anatomy-review/third-inferior-current16-stage-v1"
SHAPE = (394, 466, 378)


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def read_pinned(path: Path, expected: str) -> tuple[bytes, dict]:
    data = path.read_bytes()
    if digest(data) != expected:
        raise ValueError(f"pinned evidence changed: {path}")
    return data, json.loads(data)


def current_points(labels: np.ndarray) -> tuple[np.ndarray, dict]:
    _, inventory = read_pinned(INVENTORY, INVENTORY_SHA)
    region = inventory["regions"]["thirdVentricleInferiorTerminal"]
    points = np.asarray(region["currentHeldPoints"], dtype=np.int64)
    if (
        points.shape != (16, 3)
        or len(np.unique(points, axis=0)) != 16
        or region["currentHeldValueCounts"] != {"25": 16}
        or np.any(labels[tuple(points.T)] != 25)
        or not np.array_equal(points, np.asarray([
            [195, 265, 107], [195, 265, 108], [195, 266, 107], [195, 266, 108],
            [195, 267, 107], [195, 267, 108], [195, 268, 107], [195, 268, 108],
            [196, 265, 107], [196, 265, 108], [196, 266, 107], [196, 266, 108],
            [196, 267, 107], [196, 267, 108], [196, 268, 107], [196, 268, 108],
        ], dtype=np.int64))
    ):
        raise ValueError("current third-inferior 16-point set changed")
    return points, region


def validate_native_evidence() -> dict:
    data, report = read_pinned(NATIVE_REPORT, NATIVE_REPORT_SHA)
    if (
        report.get("currentLabelSha256") != LABEL_SHA
        or report.get("currentHeldCount") != 16
        or report.get("currentHeldValueCounts") != {"25": 16}
        or len(report.get("figures", [])) != 6
        or sum(len(figure.get("planes", [])) for figure in report["figures"]) != 18
    ):
        raise ValueError("native100 review scope changed")
    for figure in report["figures"]:
        figure_path = NATIVE_REPORT.parent / figure["path"]
        if digest(figure_path.read_bytes()) != figure["sha256"]:
            raise ValueError("native100 figure changed")
    return {
        "path": NATIVE_REPORT.relative_to(ROOT).as_posix(),
        "sha256": digest(data),
        "figureCount": 6,
        "planeCount": 18,
        "figures": report["figures"],
    }


def validate_historical_extent() -> list[dict]:
    evidence = []
    for axis, (relative, expected) in HISTORICAL_EXTENT.items():
        path = ROOT / relative
        data, report = read_pinned(path, expected)
        if report.get("labelsSha256") != HISTORICAL_LABEL_SHA or len(report.get("points", [])) != 143:
            raise ValueError(f"historical {axis} extent changed")
        figures = report.get("figures", [])
        plane_count = 0
        for figure in figures:
            figure_path = path.parent / figure["path"]
            if digest(figure_path.read_bytes()) != figure["sha256"]:
                raise ValueError(f"historical {axis} figure changed")
            plane_count += len(figure.get("indices", []))
        evidence.append({
            "axis": axis,
            "path": relative,
            "sha256": digest(data),
            "labelSha256": report["labelsSha256"],
            "pointCount": len(report["points"]),
            "figureCount": len(figures),
            "planeCount": plane_count,
            "figures": figures,
        })
    if sum(item["planeCount"] for item in evidence) != 69:
        raise ValueError("historical extent must cover 69 registered300 planes")
    return evidence


def preserve_header_gzip(raw: bytes, after: np.ndarray, original_compressed: bytes) -> bytes:
    if len(raw) != 10 + int(np.prod(SHAPE)):
        raise ValueError("unexpected label raw/header layout")
    generated = gzip.compress(raw[:10] + after.tobytes(order="F"), mtime=0)
    staged = original_compressed[:10] + generated[10:]
    if gzip.decompress(staged) != raw[:10] + after.tobytes(order="F"):
        raise ValueError("staged gzip does not restore expected raw bytes")
    return staged


def build() -> tuple[Path, Path]:
    if CANDIDATE_DIR.exists() or STAGE_DIR.exists():
        raise ValueError("preserve prior candidate/stage evidence")
    _, _, before = read_browser_volume(SOURCE_LABELS, MAGIC_LABELS, LABEL_SHA)
    points, region = current_points(before)
    native_evidence = validate_native_evidence()
    historical_evidence = validate_historical_extent()
    exclusion_data, exclusion = read_pinned(HISTORICAL_EXCLUSION, HISTORICAL_EXCLUSION_SHA)
    if exclusion.get("count") != 24 or len(exclusion.get("points", [])) != 24:
        raise ValueError("historical 24-point exclusion changed")
    historical_points = {tuple(item["xyz"]) for item in exclusion["points"]}
    if historical_points.intersection(map(tuple, points.tolist())):
        raise ValueError("current 16 and historical 24 sets overlap")
    candidate = {
        "schemaVersion": 1,
        "status": "read-only-current-third-inferior-current16-candidate",
        "sourceSha256": LABEL_SHA,
        "currentLabelSha256": LABEL_SHA,
        "inventoryPath": INVENTORY.relative_to(ROOT).as_posix(),
        "inventorySha256": INVENTORY_SHA,
        "native100ReportPath": NATIVE_REPORT.relative_to(ROOT).as_posix(),
        "native100ReportSha256": NATIVE_REPORT_SHA,
        "count": 16,
        "points": [{"xyz": point.tolist(), "before": 25, "after": 0} for point in points],
        "representatives": [[195, 265, 107], [196, 268, 108]],
        "historicalExcluded24": {
            "path": HISTORICAL_EXCLUSION.relative_to(ROOT).as_posix(),
            "sha256": HISTORICAL_EXCLUSION_SHA,
            "count": 24,
            "setsDisjoint": True,
            "note": "Historical excluded 24 points are separate context; this candidate contains only the retained current 16 points.",
        },
        "evidence": [native_evidence, *historical_evidence, {
            "path": HISTORICAL_EXCLUSION.relative_to(ROOT).as_posix(),
            "sha256": digest(exclusion_data),
            "count": 24,
            "role": "historical exclusion context; not part of this candidate",
        }],
        "adopted": False,
        "expertReviewed": False,
        "published": False,
        "publicMutation": False,
        "rationale": "visible specimen上で外部開放空間へ突出する局所誤収録を除く",
        "limitations": "This is a reversible work-only 25-to-0 candidate. It does not reconstruct the third-ventricle floor, establish an anatomical endpoint, or claim expert confirmation; public label, mesh, and application integration remain unchanged.",
    }
    candidate_data = (json.dumps(candidate, indent=2) + "\n").encode("utf-8")
    CANDIDATE_DIR.mkdir(parents=True)
    candidate_path = CANDIDATE_DIR / "candidate.json"
    candidate_path.write_bytes(candidate_data)
    compressed = SOURCE_LABELS.read_bytes()
    raw = gzip.decompress(compressed)
    after = before.copy()
    after[tuple(points.T)] = 0
    if int(np.count_nonzero(before != after)) != 16 or not np.array_equal(after[tuple(points.T)], np.zeros(16, dtype=np.uint8)):
        raise ValueError("unexpected 16-point difference")
    restored = after.copy()
    restored[tuple(points.T)] = 25
    if not np.array_equal(restored, before):
        raise ValueError("reverse restoration failed")
    staged = preserve_header_gzip(raw, after, compressed)
    before_counts = {str(int(label)): int(count) for label, count in zip(*np.unique(before, return_counts=True))}
    after_counts = {str(int(label)): int(count) for label, count in zip(*np.unique(after, return_counts=True))}
    if before_counts.get("25") != 11853 or after_counts.get("25") != 11837:
        raise ValueError("third-ventricle ID25 count mismatch")
    for key, value in before_counts.items():
        if key not in ("0", "25") and after_counts.get(key) != value:
            raise ValueError(f"unexpected label count change for {key}")
    if after_counts.get("0") != before_counts.get("0", 0) + 16:
        raise ValueError("unexpected background count change")
    stage_report = {
        "schemaVersion": 1,
        "status": "AI-image-reviewed-work-stage-only",
        "sourceSha256": LABEL_SHA,
        "beforeSha256": LABEL_SHA,
        "beforeRawVoxelSha256": digest(raw[10:]),
        "afterSha256": digest(staged),
        "afterRawVoxelSha256": digest(gzip.decompress(staged)[10:]),
        "gzipHeaderHex": compressed[:10].hex(),
        "gzipHeaderPreserved": staged[:10] == compressed[:10],
        "points": candidate["points"],
        "count": 16,
        "transition": "25->0",
        "changedVoxelCount": int(np.count_nonzero(before != after)),
        "reverseRestored": True,
        "thirdVentricleBefore": before_counts["25"],
        "thirdVentricleAfter": after_counts["25"],
        "labelVoxelCountsBefore": before_counts,
        "labelVoxelCountsAfter": after_counts,
        "candidatePath": candidate_path.relative_to(ROOT).as_posix(),
        "candidateSha256": digest(candidate_data),
        "inventorySha256": INVENTORY_SHA,
        "native100ReportSha256": NATIVE_REPORT_SHA,
        "evidence": candidate["evidence"],
        "adopted": False,
        "expertReviewed": False,
        "publicMutation": False,
        "published": False,
        "rationale": candidate["rationale"],
        "limitation": candidate["limitations"],
    }
    STAGE_DIR.mkdir(parents=True)
    (STAGE_DIR / "before.bin.gz").write_bytes(compressed)
    (STAGE_DIR / "labels.bin.gz").write_bytes(staged)
    stage_report_data = (json.dumps(stage_report, indent=2) + "\n").encode("utf-8")
    (STAGE_DIR / "repair.json").write_bytes(stage_report_data)
    print(json.dumps({
        "candidateSha256": digest(candidate_data),
        "stageReportSha256": digest(stage_report_data),
        "beforeSha256": LABEL_SHA,
        "afterSha256": digest(staged),
        "afterRawVoxelSha256": stage_report["afterRawVoxelSha256"],
        "count": 16,
    }))
    return candidate_path, STAGE_DIR / "repair.json"


if __name__ == "__main__":
    build()
