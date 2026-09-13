"""Create a deterministic, read-only inventory of the fornix teaching scope.

This audit keeps the current schematic teaching mesh separate from the
unadopted registered300 image drafts.  It reads fixed inputs and writes one
JSON record; it never edits labels, meshes, or app source files.
"""

from __future__ import annotations

import hashlib
import json
import re
import struct
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "segmentation-patches/review/fornix-scope-inventory-2026-09-14.json"

INPUTS = {
    "scopeDecision": "docs/FORNIX_SCOPE_DECISION_2026-09-14.md",
    "segmentationReview": "docs/FORNIX_SEGMENTATION_REVIEW.md",
    "bodyDraftReport": "work/anatomy-review/fornix-core-draft-body-extension-v2/report.json",
    "bendDraftReport": "work/anatomy-review/fornix-bend-core-draft-v1/report.json",
    "combinedReport": "work/anatomy-review/fornix-combined-orthogonal-v1/report.json",
    "gridReport": "work/anatomy-review/fornix-draft-grid-body-extension-v1/report.json",
    "specimenBlocks": "public/atlas/specimen-blocks.json",
    "structureProvenance": "public/atlas/structure-provenance.json",
    "pathwayStepper": "src/pathwayStepper.mjs",
    "atlasVolumeCanvas": "app/AtlasVolumeCanvas.tsx",
    "specimenBuilder": "scripts/build_specimen_blocks.py",
    "fornixMesh": "public/atlas/block-commissural-system-fornix.mesh",
}

EXPECTED_SHA256 = {
    "scopeDecision": "16396f2b2244c247ac9693d43f462e71fb9660bb2f636062c84be768c1b5103a",
    "segmentationReview": "ecc3e6fa4cc67393989f75769064b777cca6c28613dceddb3454e96b8177f06f",
    "bodyDraftReport": "c4dc1bc17eaf9be89ae044803f3e38300eb02833294011450785f1150cb5d1ef",
    "bendDraftReport": "b89f0852a00defefe16e569068820cba876ad00fd178a011031b7adb3f7bee4c",
    "combinedReport": "bd6d2da6707057f21a536024c1b1197e0f5d337b4d7a6938befb75186ea7fb60",
    "gridReport": "55fd791cacd74d9c427adf9b341647a650c7147dea87be04b78ddc1fc5e2d304",
    "specimenBlocks": "bfa3127cc901982b8dda3de2ba84d0fb69323976139ff6688151c4da75a37220",
    "structureProvenance": "b9ab66c65a0dfefde58fd84ed55fe123636a6330fd66961addddfda63d2cd581",
    "pathwayStepper": "fe3a930291476666879e2b370982095eb2a8cfd62131c96dfb15d80c27214e8a",
    "atlasVolumeCanvas": "664e41e819950a853754ebf294789dc47ad1dd2042faee3c689890abfd476297",
    "specimenBuilder": "3c57d8dc4ed8e284d921ad7a9470575173d7742067af4ab5dca2c2d6d90adffa",
    "fornixMesh": "2f283799278be67a71843a3de868154a6b4f0ad0ef59a0b3490e3b2295b18d39",
}


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def read_checked(name: str) -> bytes:
    path = ROOT / INPUTS[name]
    data = path.read_bytes()
    actual = sha256(data)
    expected = EXPECTED_SHA256[name]
    if actual != expected:
        raise ValueError(f"{name} SHA changed: {actual} != {expected}")
    return data


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def point_bounds(points: Any, expected_count: int, name: str) -> list[list[int]]:
    require(isinstance(points, list) and len(points) == expected_count, f"{name} point list drift")
    require(all(isinstance(point, list) and len(point) == 3 and all(isinstance(value, int) for value in point) for point in points), f"{name} point shape drift")
    return [[min(point[axis] for point in points), max(point[axis] for point in points)] for axis in range(3)]


def parse_builder_details(builder: str) -> dict[str, Any]:
    spacing = re.search(r"SOURCE_SPACING_MM\s*=\s*([0-9.]+).*?GEOMETRY_STRIDE\s*=\s*([0-9]+)", builder, flags=re.S)
    require(spacing is not None, "builder spacing declaration missing")
    source_spacing = float(spacing.group(1))
    stride = int(spacing.group(2))
    path = re.search(r"for side in \(([^)]*)\):\s*#.*?fornix\s*\|=\s*polyline_mask\(\s*raw\.shape,\s*\[(.*?)\],\s*([0-9.]+),", builder, flags=re.S)
    require(path is not None, "builder fornix polyline declaration missing")
    sides = [float(value.strip()) for value in path.group(1).split(",") if value.strip()]
    template = []
    for match in re.finditer(r"\(side,\s*([-0-9.]+),\s*([-0-9.]+)\)", path.group(2)):
        template.append([sides[0], float(match.group(1)), float(match.group(2))])
    require(sides == [-3.0, 3.0] and len(template) == 7, "builder fornix sides or points drift")
    radius = float(path.group(3))
    require(radius == 1.55, "builder fornix radius drift")
    order = "np.column_stack((z_world, y_world, x_world))"
    require(order in builder, "builder stored vertex order declaration missing")
    return {
        "script": INPUTS["specimenBuilder"],
        "gridSpacingMm": source_spacing * stride,
        "radiusMm": radius,
        "sides": sides,
        "polylinePointsXYZmm": template,
        "mirroredSideIsProjectAuthored": True,
        "storedVertexOrder": ["z", "y", "x"],
    }


def mesh_vertex_bounds(mesh: bytes, vertices: int, faces: int) -> list[list[float]]:
    offset = 12
    values = struct.unpack_from(f"<{vertices * 3}f", mesh, offset)
    axes = [[values[index * 3 + axis] for index in range(vertices)] for axis in range(3)]
    return [[min(axis), max(axis)] for axis in axes]


def inventory() -> dict[str, Any]:
    raw = {name: read_checked(name) for name in INPUTS}
    body = json.loads(raw["bodyDraftReport"].decode("utf-8"))
    bend = json.loads(raw["bendDraftReport"].decode("utf-8"))
    combined = json.loads(raw["combinedReport"].decode("utf-8"))
    grid = json.loads(raw["gridReport"].decode("utf-8"))
    specimen = json.loads(raw["specimenBlocks"].decode("utf-8"))
    provenance = json.loads(raw["structureProvenance"].decode("utf-8"))
    stepper = raw["pathwayStepper"].decode("utf-8")
    canvas = raw["atlasVolumeCanvas"].decode("utf-8")
    builder = raw["specimenBuilder"].decode("utf-8")

    body_bounds = point_bounds(body["sourcePoints"], body["sourcePointCount"], "body")
    bend_bounds = point_bounds(bend["sourcePoints"], bend["sourcePointCount"], "bend")
    require(body["sourcePointCount"] == 1098, "body draft count drift")
    require(bend["sourcePointCount"] == 130, "bend draft count drift")
    combined_points = body["sourcePoints"] + bend["sourcePoints"]
    require(len(combined_points) == body["sourcePointCount"] + bend["sourcePointCount"] == 1228, "combined point count drift")
    require(body["sourceSha256"] == bend["sourceSha256"] == "ebf0e88def96476d0a32ddaff6f28e37d7afd125dec724e6d8855b12357c7e86", "draft source drift")
    require(combined["draftReportSha256"] == EXPECTED_SHA256["bodyDraftReport"], "combined body reference drift")
    require(combined["bendReportSha256"] == EXPECTED_SHA256["bendDraftReport"], "combined bend reference drift")
    for report_name, report in (("body", body), ("bend", bend), ("combined", combined), ("grid", grid)):
        require(report.get("adopted") is False, f"{report_name} adopted state changed")
        require(report.get("mutation") is False, f"{report_name} mutation state changed")
    require(grid["mappedAppVoxelCount"] == 301, "mapped voxel count drift")
    require(grid["fullyInsideCount"] == 75, "fully-inside voxel count drift")
    require(grid["conflicts"] == 0, "grid conflict state changed")

    fornix_part = next(
        part
        for part in specimen["specimens"]["commissural-system"]
        if part.get("part") == "fornix"
    )
    require(fornix_part["file"] == "block-commissural-system-fornix.mesh", "fornix mesh file drift")
    require(fornix_part["sourceType"] == "schematic-3d", "fornix specimen source drift")
    require(fornix_part["vertices"] == 2560 and fornix_part["faces"] == 5112, "fornix mesh size drift")
    require("segmentationSourceSha256" not in fornix_part, "schematic mesh gained a label source")

    provenance_entries = {entry["key"]: entry for entry in provenance["entries"]}
    for key in ("surface-deep-fornix", "section-fornix"):
        entry = provenance_entries[key]
        require(entry["representations"] == ["schematic-3d"], f"{key} representation drift")
        require(entry["learnerSurfaces"] == ["surface", "blocks"], f"{key} learner surfaces drift")
        require(entry["quizEligibility"] == "none", f"{key} quiz eligibility drift")
        require("labelIds" not in entry, f"{key} gained an independent label ID")
    require("section-fornix" in provenance_entries, "section-fornix provenance entry missing")

    # Keep this source audit deliberately textual: it avoids importing app JS
    # while checking the exact six-stage Papez fornix declaration.
    stage = re.search(r'Object\.freeze\(\{\s*key: "fornix".*?\n\s*\}\),', stepper, flags=re.S)
    require(stage is not None, "Papez fornix stage missing")
    stage_text = stage.group(0)
    for token in (
        'kind: "schematic-3d"',
        'source: "schematic-3d"',
        'targetKeys: Object.freeze(["fornix"])',
        '脳弓は模式3Dのみです。実標本の分節や断面ラベルは表示しません。',
    ):
        require(token in stage_text, f"Papez fornix declaration drift: {token}")
    require("labelIds:" not in stage_text and "plane:" not in stage_text, "Papez fornix became a section-label stage")

    mesh = raw["fornixMesh"]
    require(mesh[:4] == b"BNM2", "fornix mesh header drift")
    vertices, faces = struct.unpack_from("<II", mesh, 4)
    require((vertices, faces) == (2560, 5112), "fornix mesh header size drift")
    mesh_sha = sha256(mesh)
    actual_mesh_bounds = mesh_vertex_bounds(mesh, vertices, faces)
    builder_details = parse_builder_details(builder)
    mapping_token = 'item.key==="fornix"?"block-commissural-system-fornix"'
    require(mapping_token in canvas, "fornix canvas mesh mapping drift")

    return {
        "schemaVersion": 1,
        "generatedBy": "scripts/audit_fornix_scope.py",
        "date": "2026-09-14",
        "mutation": False,
        "adopted": False,
        "expertReviewed": False,
        "quizEligibility": "none",
        "limitation": "This is a provenance and scope inventory. Schematic geometry, image continuity, and geometric containment are not anatomical boundary validation and do not authorize label or mesh adoption.",
        "inputs": {
            name: {"path": INPUTS[name], "sha256": sha256(raw[name]), "bytes": len(raw[name])}
            for name in INPUTS
        },
        "currentTeaching": {
            "surfaceDeepFornix": {
                "provenanceKey": "surface-deep-fornix",
                "representations": ["schematic-3d"],
                "learnerSurfaces": ["surface", "blocks"],
                "quizEligibility": "none",
                "labelIds": [],
                "independentSectionLabel": False,
                "meshFile": fornix_part["file"],
                "meshSha256": mesh_sha,
            },
            "sectionFornix": {
                "provenanceKey": "section-fornix",
                "representations": ["schematic-3d"],
                "learnerSurfaces": ["surface", "blocks"],
                "quizEligibility": "none",
                "labelIds": [],
                "independentSectionLabel": False,
                "meshFile": fornix_part["file"],
                "meshSha256": mesh_sha,
            },
            "mesh": {
                "file": fornix_part["file"],
                "sourceType": fornix_part["sourceType"],
                "vertices": vertices,
                "faces": faces,
                "color": fornix_part["color"],
                "storedVertexOrder": ["z", "y", "x"],
                "storedVertexBoundsZYXmm": actual_mesh_bounds,
                "generation": builder_details,
            },
            "papezStepper": {
                "source": "src/pathwayStepper.mjs",
                "key": "fornix",
                "kind": "schematic-3d",
                "sourceType": "schematic-3d",
                "targetKeys": ["fornix"],
                "sectionLabelIds": [],
                "note": "脳弓は模式3Dのみです。実標本の分節や断面ラベルは表示しません。",
            },
        },
        "sharedMeshMapping": {
            "meshFile": fornix_part["file"],
            "meshSha256": mesh_sha,
            "surfaceDeepLandmarkKey": "fornix",
            "canvasSource": INPUTS["atlasVolumeCanvas"],
            "mappingToken": mapping_token,
            "usedBy": ["currentTeaching.surfaceDeepFornix", "currentTeaching.sectionFornix"],
        },
        "unadoptedImageDrafts": {
            "body": {
                "reportSha256": sha256(raw["bodyDraftReport"]),
                "pointCount": len(body["sourcePoints"]),
                "registered300XYZBounds": body_bounds,
                "status": "interior local draft; outer contour and anterior/posterior ends unresolved",
                "adopted": False,
                "mutation": False,
            },
            "bend": {
                "reportSha256": sha256(raw["bendDraftReport"]),
                "pointCount": len(bend["sourcePoints"]),
                "registered300XYZBounds": bend_bounds,
                "status": "inferior bend interior draft; connection to body and outer contour unresolved",
                "adopted": False,
                "mutation": False,
            },
            "combined": {
                "reportSha256": sha256(raw["combinedReport"]),
                "pointCount": len(combined_points),
                "componentReports": [sha256(raw["bodyDraftReport"]), sha256(raw["bendDraftReport"])],
                "status": "combined display only; not a continuous completed fornix segmentation",
                "adopted": False,
                "mutation": False,
            },
            "gridContainment": {
                "reportSha256": sha256(raw["gridReport"]),
                "mappedAppVoxelCount": grid["mappedAppVoxelCount"],
                "fullyInsideCount": grid["fullyInsideCount"],
                "existingLabelCenterConflicts": grid["conflicts"],
                "status": "geometric containment audit only; no adoption",
                "adopted": False,
                "mutation": False,
            },
        },
        "notTracked": [
            "fornix body anterior/posterior ends and full outer contour",
            "full left and right crura and transition to fimbria",
            "full left and right columns, anterior commissure relationship, and mammillary-side termination",
            "boundary at which body, crus, and column terminology changes",
            "separation from septum pellucidum, choroidal tissue, ventricular roof, and adjacent white matter",
        ],
        "nextEvidenceMinimum": [
            "Declare one bounded body, crus, or column interval before drawing any candidate.",
            "Review that interval in consecutive original registered300 planes and at both ends plus a midpoint in native100 data.",
            "Record boundaries against septum/choroidal tissue/ventricular space/adjacent white matter separately on each side; do not mirror one side to the other.",
        ],
    }


def main() -> None:
    result = inventory()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    payload = (json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True) + "\n").encode("utf-8")
    OUTPUT.write_bytes(payload)
    print(json.dumps({"output": str(OUTPUT), "sha256": sha256(payload), "bytes": len(payload)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
