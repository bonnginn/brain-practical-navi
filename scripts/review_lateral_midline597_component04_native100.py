"""Render native100 context for regional-triage component-04 only.

This is a read-only evidence wrapper.  It fixes the v2 regional report and
passes its 20-point component directly to the existing native100 renderer.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import numpy as np

from build_orthogonal_review_bundle import DEFAULT_LABELS, MAGIC_LABELS, ROOT, read_browser_volume
from render_native100_candidate_context import render_context


REGIONAL_REPORT = ROOT / "work/anatomy-review/lateral-midline597-regional-triage-v2/report.json"
REGIONAL_REPORT_SHA = "617658cfc6bff53edddcfff73c7c740fd06b89164156258454301837ec9b3b77"
LABEL_SHA = "48e1602b871b10bd7b31f99278aef8d0e44bcfb8930051fa9aa20ffd48802db2"
OUTPUT_PREFIX = "lateral-midline597-regional-triage-v2-component-04-native100-v1"
OUTPUT = ROOT / "work/anatomy-review" / OUTPUT_PREFIX
EXPECTED_POINTS = 20
EXPECTED_BOUNDS = {"min": [194, 235, 165], "max": [198, 247, 165]}
EXPECTED_REPRESENTATIVES = [[197, 242, 165], [194, 246, 165], [198, 245, 165]]


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def load_component() -> tuple[np.ndarray, list[list[int]], dict[str, object]]:
    payload = REGIONAL_REPORT.read_bytes()
    if sha256(payload) != REGIONAL_REPORT_SHA:
        raise ValueError("regional v2 report digest changed")
    report = json.loads(payload)
    component = next((item for item in report["components"] if item.get("componentId") == "component-04"), None)
    if component is None or component.get("count") != EXPECTED_POINTS or component.get("bounds") != EXPECTED_BOUNDS:
        raise ValueError("component-04 identity changed")
    points = np.asarray(component["points"], dtype=np.int64)
    references = component.get("representativePoints")
    if (
        points.shape != (EXPECTED_POINTS, 3)
        or len(np.unique(points, axis=0)) != EXPECTED_POINTS
        or references != EXPECTED_REPRESENTATIVES
        or any(tuple(point) not in {tuple(member) for member in points.tolist()} for point in references)
    ):
        raise ValueError("component-04 points or representatives changed")
    return points, references, component


def build() -> Path:
    if OUTPUT.exists():
        raise ValueError(f"preserve prior evidence: {OUTPUT}")
    _, _, labels = read_browser_volume(DEFAULT_LABELS, MAGIC_LABELS, LABEL_SHA)
    points, references, component = load_component()
    if np.any(labels[tuple(points.T)] != 0):
        raise ValueError("component-04 contains a currently labelled point")
    render_context(
        labels,
        points,
        np.asarray(references, dtype=np.int64),
        label_sha=LABEL_SHA,
        locator_path=REGIONAL_REPORT.relative_to(ROOT).as_posix(),
        locator_sha=REGIONAL_REPORT_SHA,
        prefix=OUTPUT_PREFIX,
        radius=6,
    )
    report_path = OUTPUT / "report.json"
    report = json.loads(report_path.read_text(encoding="utf-8"))
    report.update(
        {
            "triageComponentId": "component-04",
            "triageComponentCount": EXPECTED_POINTS,
            "triageComponentBounds": component["bounds"],
            "representativeAppXYZ": references,
            "mutation": False,
            "adopted": False,
            "expertReviewed": False,
            "native100LabelLegend": {
                "ID23": {"color": "cyan", "rgb": [0, 190, 220]},
                "ID24": {"color": "cyan", "rgb": [0, 190, 220]},
                "ID25": {"color": "amber", "rgb": [255, 190, 20]},
                "candidate": {"color": "pink", "rgb": [255, 70, 130]},
            },
            "figureLegend": "Cyan=current ID23/24; amber=current ID25; pink=unadopted candidate projection.",
            "limitation": (
                "Sparse native100 context for component-04 only: three representative app coordinates and "
                "their XYZ center +/-1 planes. Projections and numerical roundtrip do not establish cavity "
                "identity, side, boundary approval, or anatomical adoption."
            ),
        }
    )
    report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    payload = report_path.read_bytes()
    print(json.dumps({"path": report_path.relative_to(ROOT).as_posix(), "sha256": sha256(payload)}))
    return report_path


if __name__ == "__main__":
    build()
