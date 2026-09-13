"""Build a read-only regional triage report for the 597 unadopted points.

The source locator contains 869 points; its Y>=230 subset contains 672 points.
The 75 points in the existing project-adoption record are removed exactly by
coordinate.  The remaining points are grouped by 26-neighbour connectivity.
This script records current-label contact as a triage aid and never writes a
label volume or an adoption proposal.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from scipy import ndimage

from build_orthogonal_review_bundle import (
    DEFAULT_LABELS,
    MAGIC_LABELS,
    ROOT,
    read_browser_volume,
)
from review_lateral_detached547 import CONTEXT_PALETTE, main as render_registered300


LOCATOR = ROOT / "work/anatomy-review/lateral-middle-native300-september12-v1/report.json"
ADOPTION = ROOT / "segmentation-patches/review/lateral-superomedial75-adoption-2026-09-12.json"
# v1 remains the earlier single-ID evidence; v2 is the regenerated multi-label view.
OUTPUT = ROOT / "work/anatomy-review/lateral-midline597-regional-triage-v2"
LOCATOR_SHA = "60e2845777b438bf11455f156c31078f217825aba7ebbac19354428accd0ea89"
LABEL_SHA = "48e1602b871b10bd7b31f99278aef8d0e44bcfb8930051fa9aa20ffd48802db2"
ADOPTION_AFTER_SHA = LABEL_SHA
CONTACT_IDS = (23, 24, 25, 26, 41)
EXPECTED_TOTAL = 672
EXPECTED_ADOPTED = 75
EXPECTED_REMAINING = 597
EXPECTED_COMPONENTS = 19


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _load_points(labels: np.ndarray) -> tuple[np.ndarray, np.ndarray, dict[str, object], dict[str, object]]:
    locator_bytes = LOCATOR.read_bytes()
    if sha256(locator_bytes) != LOCATOR_SHA:
        raise ValueError("locator digest changed")
    locator = json.loads(locator_bytes)
    if (
        locator.get("labelSha256") != "84f91400e7f6b9d059707772b01889f74112d62e853bcebfffddaf589b423ba3"
        or locator.get("count") != 869
        or len(locator.get("points", [])) != 869
    ):
        raise ValueError("locator identity changed")
    selected = np.asarray(
        [point["xyz"] for point in locator["points"] if point["xyz"][1] >= 230],
        dtype=np.int64,
    )
    if (
        selected.shape != (EXPECTED_TOTAL, 3)
        or len(np.unique(selected, axis=0)) != EXPECTED_TOTAL
        or np.any(selected < 0)
        or np.any(selected >= labels.shape)
    ):
        raise ValueError("locator candidate subset changed")

    adoption_bytes = ADOPTION.read_bytes()
    adoption = json.loads(adoption_bytes)
    adopted = np.asarray([point["xyz"] for point in adoption["points"]], dtype=np.int64)
    if (
        adoption.get("beforeSha256") != "96fb242a78c66cc4ab9fd69e8bd6ed3cef5fca51b67f0338f063da98ae02381b"
        or adoption.get("afterSha256") != ADOPTION_AFTER_SHA
        or adoption.get("count") != EXPECTED_ADOPTED
        or adopted.shape != (EXPECTED_ADOPTED, 3)
        or len(np.unique(adopted, axis=0)) != EXPECTED_ADOPTED
        or any(point.get("before") != 0 or point.get("after") not in (23, 24) for point in adoption["points"])
    ):
        raise ValueError("adoption record identity changed")

    selected_set = {tuple(point) for point in selected.tolist()}
    adopted_set = {tuple(point) for point in adopted.tolist()}
    if not adopted_set <= selected_set or len(selected_set - adopted_set) != EXPECTED_REMAINING:
        raise ValueError("selected/adopted set difference is not exactly 597")
    remaining = np.asarray(sorted(selected_set - adopted_set), dtype=np.int64)
    if np.any(labels[tuple(remaining.T)] != 0):
        raise ValueError("remaining candidates are not all unlabeled in current volume")
    expected_adopted_labels = np.asarray([point["after"] for point in adoption["points"]], dtype=np.int64)
    if not np.array_equal(labels[tuple(adopted.T)], expected_adopted_labels):
        raise ValueError("current adopted labels differ from the pinned adoption record")
    return remaining, adopted, locator, adoption


def _representatives(points: np.ndarray) -> list[list[int]]:
    """Choose deterministic member coordinates for a component."""
    points = np.asarray(sorted(map(tuple, points)), dtype=np.int64)
    centroid = points.mean(axis=0)
    center = min(points.tolist(), key=lambda point: (float(np.sum((np.asarray(point) - centroid) ** 2)), tuple(point)))
    choices = [tuple(int(value) for value in center), tuple(int(value) for value in points[0]), tuple(int(value) for value in points[-1])]
    result = []
    for point in choices:
        if point not in result:
            result.append(point)
    return [list(point) for point in result]


def _components(points: np.ndarray, labels: np.ndarray) -> list[dict[str, object]]:
    mask = np.zeros(labels.shape, dtype=np.uint8)
    mask[tuple(points.T)] = 1
    structure = ndimage.generate_binary_structure(3, 3)
    connected, count = ndimage.label(mask, structure)
    if count != EXPECTED_COMPONENTS:
        raise ValueError(f"expected {EXPECTED_COMPONENTS} 26-neighbour components, got {count}")
    components = []
    for ident in range(1, count + 1):
        members = np.argwhere(connected == ident)
        bounds_min = members.min(axis=0)
        bounds_max = members.max(axis=0)
        centroid = members.mean(axis=0)
        contacts = {str(label_id): 0 for label_id in CONTACT_IDS}
        for point in members:
            point_contacts = set()
            for axis in range(3):
                for delta in (-1, 1):
                    neighbor = point.copy()
                    neighbor[axis] += delta
                    if np.any(neighbor < 0) or np.any(neighbor >= labels.shape):
                        continue
                    label_id = int(labels[tuple(neighbor)])
                    if label_id in CONTACT_IDS:
                        point_contacts.add(label_id)
            for label_id in point_contacts:
                contacts[str(label_id)] += 1
        components.append(
            {
                "count": int(len(members)),
                "bounds": {"min": bounds_min.tolist(), "max": bounds_max.tolist()},
                "centroid": [round(float(value), 6) for value in centroid],
                "sixNeighborContactCandidateCounts": contacts,
                "representativePoints": _representatives(members),
                "points": sorted(members.tolist()),
            }
        )
    components.sort(
        key=lambda component: (
            -int(component["count"]),
            tuple(component["bounds"]["min"]),
            tuple(component["bounds"]["max"]),
        )
    )
    for index, component in enumerate(components, 1):
        component["rank"] = index
        component["componentId"] = f"component-{index:02d}"
    return components


def _render_top_components(components: list[dict[str, object]], labels: np.ndarray) -> list[dict[str, object]]:
    rendered = []
    for component in components[:4]:
        component_id = str(component["componentId"])
        points = np.asarray(component["points"], dtype=np.int64)
        prefix = f"lateral-midline597-regional-triage-v2/{component_id}"
        # review_lateral_detached547 appends its canonical native300 suffix.
        child = OUTPUT / f"{component_id}-native300-v1" / "report.json"
        if not child.exists():
            render_registered300(
                component_count=int(component["count"]),
                candidate_points=points,
                labels_sha=LABEL_SHA,
                prefix=prefix,
                label_id=24,
                context_margin=12,
                reference_points=np.asarray(component["representativePoints"], dtype=np.int64),
                selection_title=f"UNADOPTED {component['count']} regional candidates",
                context_label_ids=(23, 24, 25, 26, 41),
            )
        child_report = json.loads(child.read_text(encoding="utf-8"))
        child_report["expertReviewed"] = False
        child_report["triageComponentId"] = component_id
        child_report["limitation"] = (
            "Registered300 orthogonal context for regional triage only. Red marks unadopted candidate cells; "
            "colored legend marks current IDs23/24/25/26/41. Contact and continuity do not establish anatomical identity or approval."
        )
        child.write_text(json.dumps(child_report, indent=2) + "\n", encoding="utf-8")
        rendered.append(
            {
                "componentId": component_id,
                "reportPath": child.relative_to(ROOT).as_posix(),
                "figureCount": len(child_report["figures"]),
                "figures": child_report["figures"],
            }
        )
    return rendered


def build(*, render: bool = True, refresh_report: bool = False) -> Path:
    existing_report = None
    if OUTPUT.exists() and (OUTPUT / "report.json").exists():
        if not refresh_report:
            raise ValueError(f"preserve prior evidence: {OUTPUT}")
        existing_report = json.loads((OUTPUT / "report.json").read_text(encoding="utf-8"))
    if OUTPUT.exists() and not OUTPUT.is_dir():
        raise ValueError(f"output path is not a directory: {OUTPUT}")
    _, _, labels = read_browser_volume(DEFAULT_LABELS, MAGIC_LABELS, LABEL_SHA)
    remaining, adopted, locator, adoption = _load_points(labels)
    components = _components(remaining, labels)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    rendered = _render_top_components(components, labels) if render else (existing_report or {}).get("renderedTopComponents", [])
    report = {
        "schemaVersion": 1,
        "status": "read-only-unadopted-regional-triage",
        "mutation": False,
        "adopted": False,
        "expertReviewed": False,
        "currentLabelPath": DEFAULT_LABELS.relative_to(ROOT).as_posix(),
        "currentLabelSha256": LABEL_SHA,
        "locatorPath": LOCATOR.relative_to(ROOT).as_posix(),
        "locatorSha256": sha256(LOCATOR.read_bytes()),
        "adoptionRecordPath": ADOPTION.relative_to(ROOT).as_posix(),
        "adoptionRecordSha256": sha256(ADOPTION.read_bytes()),
        "sourceCounts": {"locatorTotal": 869, "yAtLeast230": EXPECTED_TOTAL, "adopted": EXPECTED_ADOPTED},
        "candidateCount": len(remaining),
        "adoptedExcludedCount": len(adopted),
        "componentCount": len(components),
        "candidatePoints": remaining.tolist(),
        "components": components,
        "renderedTopComponents": rendered,
        "contextLabelIds": [23, 24, 25, 26, 41],
        "contextPalette": {
            str(label_id): {"rgb": CONTEXT_PALETTE[label_id], "legend": f"ID{label_id}"}
            for label_id in (23, 24, 25, 26, 41)
        },
        "figureLegend": "Colored squares in each registered300 figure identify current labels; red identifies unadopted candidates.",
        "limitation": (
            "Six-neighbor contact and 26-neighbor continuity are triage metadata, not anatomical determination. "
            "They do not assign a side or cavity, and no ID23/24/25 adoption proposal is made. "
            "Only the four largest components have registered300 orthogonal context figures."
        ),
        "references": {
            "locatorCount": locator["count"],
            "adoptionCount": adoption["count"],
            "contactLabelIds": list(CONTACT_IDS),
        },
    }
    payload = (json.dumps(report, indent=2) + "\n").encode("utf-8")
    (OUTPUT / "report.json").write_bytes(payload)
    print(json.dumps({"path": (OUTPUT / "report.json").relative_to(ROOT).as_posix(), "sha256": sha256(payload)}))
    return OUTPUT / "report.json"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--no-render", action="store_true", help="write the report without top-component figures")
    parser.add_argument("--refresh-report", action="store_true", help="recompute report metadata in an existing triage directory")
    args = parser.parse_args()
    build(render=not args.no_render, refresh_report=args.refresh_report)


if __name__ == "__main__":
    main()
