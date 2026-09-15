"""Check existing registered300 coverage for lateral-midline597 components 05-19.

The script only reads the pinned triage report, existing reports/PNGs, and the
current label.  It does not infer anatomy and creates no new figures when all
points are already covered.
"""

from __future__ import annotations

import gzip
import hashlib
import json
import struct
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "work/anatomy-review/lateral-midline597-component-05-19-coverage-v1/report.json"
CURRENT_LABEL = ROOT / "public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz"
CURRENT_LABEL_SHA = "785ce199e2c7226e5527a771e953d1b78cfed1067179aa04c63b9eba74577e0f"
EXPECTED_DIMS = (394, 466, 378)
APP_ORIGIN_MM = (-98.0, -134.0, -72.0)
APP_STEP_MM = (0.5, 0.5, 0.5)
REGISTERED300_START_MM = (-98.0999984741211, -134.10000610351562, -72.0999984741211)
REGISTERED300_STEP_MM = (0.30000001192092896, 0.30000001192092896, 0.30000001192092896)
LOCATOR = ROOT / "work/anatomy-review/lateral-midline597-regional-triage-v2/report.json"
LOCATOR_SHA = "617658cfc6bff53edddcfff73c7c740fd06b89164156258454301837ec9b3b77"
DOC = "docs/LATERAL_MIDLINE597_REGIONAL_REVIEW.md"
DOC_SHA = "4e7f4c966f9b0e102a370c38793bff549e9b9a366d1de385c47effb290763431"
EVIDENCE = {
    "work/anatomy-review/lateral-midline597-regional-triage-v2/component-01-native300-v1/report.json": "2239657722b6b65e67ae54708a5a841b113492126653cfee674edfddc19b6bfc",
    "work/anatomy-review/lateral-midline597-regional-triage-v2/component-02-native300-v1/report.json": "d87b1dfaab81115deb7ea2741d7c2f0b26add5b1988476a5c7cb1be9bb63a986",
    "work/anatomy-review/lateral-midline597-regional-triage-v2/component-03-native300-v1/report.json": "b5c960a78483107c0bbceda73ca71c9a9a9123dbac9ed503b6b356c5abaef13e",
    "work/anatomy-review/lateral-midline597-regional-triage-v2/component-04-native300-v1/report.json": "0b9b5eafa610e97eebca96c1e32646f0c09ef94140dc16cb53dcd059c8ba9d54",
    "work/anatomy-review/lateral-midline672-september12-native300-v1/report.json": "f10436e4c1418bfeafc6eb9a75248aed669f36141d0c09e08bbf096980197017",
    "work/anatomy-review/lateral-midline672-september12-series-x-v1/report.json": "c14759d7d90f680f50794858e7224097c4a90c9c8410b50c17658da94be25169",
    "work/anatomy-review/lateral-midline672-september12-series-y-v1/report.json": "ddfc602c227e45691aed7fca02ad60004c498676b3c295c2456835a65f785360",
    "work/anatomy-review/lateral-midline672-september12-series-z-v1/report.json": "646be1b3229229de4e36ccf179a8b8c403adc8ba27eb34cc71dd311e558901f6",
}


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def fixed_bytes(path: Path, expected_sha: str) -> bytes:
    data = path.read_bytes()
    actual = sha256(data)
    if actual != expected_sha:
        raise ValueError(f"{path} SHA changed: {actual} != {expected_sha}")
    return data


def read_bbs1() -> tuple[tuple[int, int, int], bytes]:
    compressed = fixed_bytes(CURRENT_LABEL, CURRENT_LABEL_SHA)
    payload = gzip.decompress(compressed)
    if payload[:4] != b"BBS1":
        raise ValueError("current label magic changed")
    dims = struct.unpack_from("<HHH", payload, 4)
    if dims != EXPECTED_DIMS or len(payload) != 10 + dims[0] * dims[1] * dims[2]:
        raise ValueError("current label dimensions or payload changed")
    return dims, payload[10:]


def label_at(labels: bytes, point: list[int], dims: tuple[int, int, int]) -> int:
    x, y, z = point
    if not (0 <= x < dims[0] and 0 <= y < dims[1] and 0 <= z < dims[2]):
        raise ValueError(f"point out of current label bounds: {point}")
    return labels[x + dims[0] * (y + dims[1] * z)]


def native_xyz(point: list[int]) -> list[int]:
    # Existing registered300 renderer maps app XYZ to world via the validation
    # affine, then to the registered image grid via its MINC start/step.
    return [
        int(round((point[axis] * APP_STEP_MM[axis] + APP_ORIGIN_MM[axis] - REGISTERED300_START_MM[axis]) / REGISTERED300_STEP_MM[axis]))
        for axis in range(3)
    ]


def in_crop(native: list[int], low: list[int], high: list[int]) -> bool:
    return all(low[axis] <= native[axis] < high[axis] for axis in range(3))


def evidence_record(relative: str, expected_sha: str) -> tuple[dict[str, object], dict[str, object]]:
    path = ROOT / relative
    data = fixed_bytes(path, expected_sha)
    report = json.loads(data.decode("utf-8"))
    figures = []
    for figure in report.get("figures", []):
        figure_path = path.parent / figure["path"]
        figure_data = figure_path.read_bytes()
        actual_figure_sha = sha256(figure_data)
        if actual_figure_sha != figure["sha256"]:
            raise ValueError(f"figure SHA mismatch: {figure_path}")
        figures.append({"path": figure["path"], "axis": figure["axis"], "indices": figure["indices"], "sha256": actual_figure_sha})
    record = {
        "path": relative,
        "reportSha256": expected_sha,
        "figureCount": len(figures),
        "labelsSha256": report.get("labelsSha256"),
        "labelsShaMatchesCurrent": report.get("labelsSha256") == CURRENT_LABEL_SHA,
        "originalSha256": report.get("originalSha256"),
        "seriesAxis": report.get("seriesAxis"),
        "figures": figures,
    }
    return record, report


def validate_mapping(relative: str, report: dict[str, object]) -> dict[str, object]:
    refs = report.get("referencePoints", [])
    if report.get("seriesAxis") is not None or not refs:
        return {"path": relative, "checked": False, "reason": "continuous series centers are independent of referencePoints"}
    if len(report.get("figures", [])) != len(refs) * 3:
        raise ValueError(f"reference/figure count mismatch in {relative}")
    mismatches = []
    for index, figure in enumerate(report["figures"]):
        reference = refs[index // 3]
        native = native_xyz(reference)
        axis = "xyz".index(figure["axis"])
        if figure["indices"][1] != native[axis]:
            mismatches.append({"figureIndex": index, "reference": reference, "expectedCenter": native[axis], "actualCenter": figure["indices"][1]})
    if mismatches:
        raise ValueError(f"registered300 affine mapping mismatch in {relative}")
    return {"path": relative, "checked": True, "referenceFigurePairs": len(report["figures"]), "mismatchCount": 0}


def build_report() -> dict[str, object]:
    doc_data = fixed_bytes(ROOT / DOC, DOC_SHA)
    locator = json.loads(fixed_bytes(LOCATOR, LOCATOR_SHA).decode("utf-8"))
    if locator.get("componentCount") != 19 or len(locator.get("components", [])) != 19:
        raise ValueError("regional locator component structure changed")
    target_components = locator["components"][4:]
    if [component["componentId"] for component in target_components] != [f"component-{index:02d}" for index in range(5, 20)]:
        raise ValueError("target component order changed")
    candidate_points = [point for component in target_components for point in component["points"]]
    if len(candidate_points) != 29 or len({tuple(point) for point in candidate_points}) != 29:
        raise ValueError("component-05-19 point count or uniqueness changed")
    dims, labels = read_bbs1()
    current_values = {str(value): sum(label_at(labels, point, dims) == value for point in candidate_points) for value in sorted({label_at(labels, point, dims) for point in candidate_points})}
    if current_values != {"0": 29}:
        raise ValueError(f"target point current labels changed: {current_values}")

    evidence_records = []
    parsed_reports = {}
    mapping_validation = []
    for relative, expected_sha in EVIDENCE.items():
        record, report = evidence_record(relative, expected_sha)
        evidence_records.append(record)
        parsed_reports[relative] = report
        mapping_validation.append(validate_mapping(relative, report))

    point_coverage = []
    for component in target_components:
        for point in component["points"]:
            native = native_xyz(point)
            matches = []
            for relative, report in parsed_reports.items():
                low_high = report.get("nativeCropExclusive")
                if not low_high or not in_crop(native, low_high["low"], low_high["high"]):
                    continue
                for figure in report.get("figures", []):
                    axis_index = "xyz".index(figure["axis"])
                    if native[axis_index] in figure["indices"]:
                        matches.append({"reportPath": relative, "figurePath": f"{Path(relative).parent.as_posix()}/{figure['path']}", "axis": figure["axis"], "indices": figure["indices"]})
            axis_matches = {axis: [match for match in matches if match["axis"] == axis] for axis in "xyz"}
            axis_coverage = {axis: bool(axis_matches[axis]) for axis in "xyz"}
            point_coverage.append({"componentId": component["componentId"], "appXYZ": point, "nativeXYZ": native, "axisCoverage": axis_coverage, "covered": all(axis_coverage.values()), "matches": matches})
    uncovered = [item for item in point_coverage if not item["covered"]]
    return {
        "format": "lateral-midline597-component-05-19-registered300-coverage",
        "version": 1,
        "status": "read-only-coverage-audit",
        "mutation": False,
        "adopted": False,
        "expertReviewed": False,
        "currentLabel": {"path": CURRENT_LABEL.relative_to(ROOT).as_posix(), "sha256": CURRENT_LABEL_SHA, "dims": list(dims), "targetPointValueCounts": current_values},
        "locator": {"path": LOCATOR.relative_to(ROOT).as_posix(), "sha256": LOCATOR_SHA, "sourceCurrentLabelSha256": locator["currentLabelSha256"], "sourceCurrentLabelShaMatches": locator["currentLabelSha256"] == CURRENT_LABEL_SHA, "targetComponents": [component["componentId"] for component in target_components], "targetPointCount": len(candidate_points)},
        "fixedInputs": {DOC: {"sha256": DOC_SHA, "bytes": len(doc_data)}, "work/anatomy-review/lateral-midline597-regional-triage-v2/report.json": {"sha256": LOCATOR_SHA, "bytes": len(LOCATOR.read_bytes())}},
        "existingEvidence": evidence_records,
        "coverageMethod": {"nativeCoordinateMapping": {"appOriginMm": list(APP_ORIGIN_MM), "appStepMm": list(APP_STEP_MM), "registered300StartMm": list(REGISTERED300_START_MM), "registered300StepMm": list(REGISTERED300_STEP_MM), "formula": "round((appXYZ * appStepMm + appOriginMm - registered300StartMm) / registered300StepMm)"}, "mappingValidation": mapping_validation, "planeRule": "point is covered only when each x, y and z native coordinate is inside report crop and is one of that axis figure's center-1, center, center+1 indices", "consideredExistingReports": list(EVIDENCE)},
        "points": point_coverage,
        "coveredPointCount": len(point_coverage) - len(uncovered),
        "uncoveredPointCount": len(uncovered),
        "uncoveredPoints": uncovered,
        "additionalReviewTargets": [],
        "limitation": "Coverage is a mechanical plane/crop check of existing registered300 evidence. It does not re-view pixels, determine anatomical identity, or certify a boundary; the v2 locator used a historical label SHA distinct from the current label SHA, while all 29 target coordinates remain value 0 on the pinned current label.",
    }


def main() -> None:
    if OUTPUT.exists():
        raise ValueError(f"Refusing to overwrite existing evidence: {OUTPUT}")
    report = build_report()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    payload = (json.dumps(report, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
    OUTPUT.write_bytes(payload)
    print(json.dumps({"path": OUTPUT.relative_to(ROOT).as_posix(), "sha256": sha256(payload), "covered": report["coveredPointCount"], "uncovered": report["uncoveredPointCount"]}, ensure_ascii=False))


if __name__ == "__main__":
    main()
