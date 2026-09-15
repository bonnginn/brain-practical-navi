"""Freeze the current schematic V/IX/X/XI overlay scope.

This is a structural inventory of authored mesh and metadata.  It does not
infer root exits, rootlet counts, or anatomical boundaries from the meshes.
"""

from __future__ import annotations

import ast
import hashlib
import json
import math
import re
import struct
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
EVIDENCE_ROOT = ROOT / "work/anatomy-review"
OUTPUT = ROOT / "segmentation-patches/review/current-schematic-roots-scope-inventory-2026-09-14.json"
INPUTS = {
    "docs/NERVE_ORIGIN_IMAGE_REVIEW.md": "3f099a21a2248c4d204634437eb3f49f9b11d8ba896cacc49c9f53e33c61a0ef",
    "scripts/build_neurovascular_overlays.py": "8a0a09142c61badf051bf5ee41db6f31179a371a91cee2776f918717888943fd",
    "public/atlas/neurovascular-overlays.json": "fa0143afd6725f073a853a31d9a1f32c83cb06b28a08a0b3b9512f26ba29ebc9",
    "public/atlas/structure-provenance.json": "b9ab66c65a0dfefde58fd84ed55fe123636a6330fd66961addddfda63d2cd581",
    "src/quizAnatomyHold.mjs": "e3ad0b68adaf1140f852ee6a2895a2d078e7e3f0069c7ca19c5bccd59b5bb088",
}
MESHES = {
    "pontine": ("public/atlas/overlay-nerves-pontine.mesh", "1244f483c765ef084648a74bbad13cff78ea498d4edb9918e15812709e4fd823"),
    "medullary": ("public/atlas/overlay-nerves-medullary.mesh", "e4528cc306b535837d049385817c49aada20d25bf37a7a2caf7fa81d18ad157e"),
}
EVIDENCE = {
    "work/anatomy-review/nerve-origin-sections-v1/report.json": "ffada8125389c3e1d5064f2ae011a5dbfd95ca19a28d934e934a8c52e130de75",
    "work/anatomy-review/medullary-proximal-v1/report.json": "2c3ea31189af209c896aefe1211ed45f6495a15f92dc7caee523b97c2300c291",
    "work/anatomy-review/medullary-native300-v1/report.json": "01521b9c5f88dbcf461dd1b3bf097c178c33b341cb459ab33edf71bc77fdc496",
    "work/anatomy-review/medullary-path-sections-v1/report.json": "c16392ed5ca51e9e9be6dbe53a0fd27515acf3ad473903ba251c8eaaec9b161c",
    "work/anatomy-review/temporal-nerve-path-sections-v1/report.json": "7b9f85a178b286166ec4303207f2941a4b8ef494e91b417682b02e95f278742e",
}
TARGETS = {
    "V": {"target": "cn5", "mesh": "pontine", "leftId": 30, "rightId": 31, "prefix": "V 三叉神経"},
    "IX": {"target": "cn9", "mesh": "medullary", "leftId": 38, "rightId": 39, "prefix": "IX 舌咽神経"},
    "X": {"target": "cn10", "mesh": "medullary", "leftId": 40, "rightId": 41, "prefix": "X 迷走神経"},
    "XI": {"target": "cn11", "mesh": "medullary", "leftId": 42, "rightId": 43, "prefix": "XI 副神経"},
}
EXPECTED_GROUPS = {
    "pontine": (960, 1760),
    "medullary": (1280, 2400),
}
SIDES_PER_RING = 10


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def fixed_file(relative: str, expected: str) -> dict[str, object]:
    data = (ROOT / relative).read_bytes()
    actual = sha256(data)
    if actual != expected:
        raise ValueError(f"{relative} changed: {actual} != {expected}")
    return {"sha256": actual, "bytes": len(data)}


def number(node: ast.AST) -> int | float:
    value = ast.literal_eval(node)
    if not isinstance(value, (int, float)) or isinstance(value, bool):
        raise ValueError("expected numeric AST literal")
    return value


def generator_declarations(source: bytes) -> dict[str, dict[str, object]]:
    tree = ast.parse(source.decode("utf-8"))
    declarations: dict[str, dict[str, object]] = {}
    for node in ast.walk(tree):
        if not isinstance(node, ast.Call) or not isinstance(node.func, ast.Name) or node.func.id != "pair":
            continue
        if len(node.args) < 3 or not isinstance(node.args[0], ast.Constant):
            continue
        name = node.args[0].value
        if name not in [target["prefix"] for target in TARGETS.values()]:
            continue
        points_node = node.args[1]
        if not isinstance(points_node, ast.List):
            raise ValueError(f"{name} generator points are not a list")
        points = []
        for point in points_node.elts:
            if not isinstance(point, ast.Call) or not isinstance(point.func, ast.Name) or point.func.id != "p":
                raise ValueError(f"{name} generator point is not p(...)" )
            points.append([number(argument) for argument in point.args])
        radius = number(node.args[2])
        declarations[name] = {
            "generatorCall": "pair",
            "mirroredSides": True,
            "controlPointCount": len(points),
            "controlPoints": points,
            "radius": radius,
        }
    if set(declarations) != {target["prefix"] for target in TARGETS.values()}:
        raise ValueError("generator declarations for V/IX/X/XI are incomplete")
    return declarations


def read_bnm3(relative: str, expected_sha: str) -> dict[str, object]:
    data = (ROOT / relative).read_bytes()
    actual = sha256(data)
    if actual != expected_sha:
        raise ValueError(f"{relative} changed: {actual} != {expected_sha}")
    if data[:4] != b"BNM3":
        raise ValueError(f"{relative} is not BNM3")
    vertex_count, face_count = struct.unpack_from("<II", data, 4)
    offset = 12
    vertex_bytes = vertex_count * 3 * 4
    vertices = [struct.unpack_from("<3f", data, offset + index * 12) for index in range(vertex_count)]
    offset += vertex_bytes
    offset += vertex_bytes  # normals
    offset += vertex_count * 4  # shade
    regions = [struct.unpack_from("<f", data, offset + index * 4)[0] for index in range(vertex_count)]
    offset += vertex_count * 4
    faces = [struct.unpack_from("<3I", data, offset + index * 12) for index in range(face_count)]
    expected_size = offset + face_count * 12
    if len(data) != expected_size:
        raise ValueError(f"{relative} payload size changed")
    if any(not math.isfinite(value) for vertex in vertices for value in vertex):
        raise ValueError(f"{relative} contains nonfinite vertices")
    return {"path": relative, "sha256": actual, "vertices": vertex_count, "faces": face_count, "vertexData": vertices, "regions": regions, "faceData": faces}


def bounds(vertices: list[tuple[float, float, float]]) -> dict[str, list[float]]:
    return {"min": [min(v[axis] for v in vertices) for axis in range(3)], "max": [max(v[axis] for v in vertices) for axis in range(3)]}


def region_summary(mesh: dict[str, object], region_id: int, side: str, name: str) -> dict[str, object]:
    regions = mesh["regions"]
    vertex_indices = [index for index, value in enumerate(regions) if int(value) == region_id]
    if not vertex_indices:
        raise ValueError(f"mesh region {region_id} is empty")
    vertex_set = set(vertex_indices)
    face_indices = [index for index, face in enumerate(mesh["faceData"]) if all(vertex in vertex_set for vertex in face)]
    if len(vertex_indices) % SIDES_PER_RING:
        raise ValueError(f"mesh region {region_id} does not have whole rings")
    if vertex_indices != list(range(vertex_indices[0], vertex_indices[-1] + 1)):
        raise ValueError(f"mesh region {region_id} is not contiguous")
    ring_count = len(vertex_indices) // SIDES_PER_RING
    expected_faces = (ring_count - 1) * SIDES_PER_RING * 2
    if len(face_indices) != expected_faces or face_indices != list(range(face_indices[0], face_indices[-1] + 1)):
        raise ValueError(f"mesh region {region_id} face range is inconsistent")
    return {
        "side": side,
        "regionId": region_id,
        "name": name,
        "vertexCount": len(vertex_indices),
        "vertexIndexRange": [vertex_indices[0], vertex_indices[-1]],
        "ringCount": ring_count,
        "ringIndexRange": [0, ring_count - 1],
        "sidesPerRing": SIDES_PER_RING,
        "faceCount": len(face_indices),
        "faceIndexRange": [face_indices[0], face_indices[-1]],
        "storedVertexBoundsZYX": bounds([mesh["vertexData"][index] for index in vertex_indices]),
    }


def parse_quiz_hold(source: bytes) -> list[str]:
    match = re.search(r"heldTargets\s*=\s*new\s+Set\(\[(.*?)\]\)", source.decode("utf-8"), re.DOTALL)
    if not match:
        raise ValueError("heldTargets declaration not found")
    values = json.loads("[" + match.group(1) + "]")
    if not all(isinstance(value, str) for value in values):
        raise ValueError("heldTargets contains a non-string target")
    return sorted(values)


def build_report() -> dict[str, object]:
    fixed_inputs = {relative: fixed_file(relative, expected) for relative, expected in INPUTS.items()}
    generator_source = (ROOT / "scripts/build_neurovascular_overlays.py").read_bytes()
    declarations = generator_declarations(generator_source)
    overlay = json.loads((ROOT / "public/atlas/neurovascular-overlays.json").read_text(encoding="utf-8"))
    provenance = json.loads((ROOT / "public/atlas/structure-provenance.json").read_text(encoding="utf-8"))
    provenance_entry = next(entry for entry in provenance["entries"] if entry.get("key") == "cranial-nerves-one-to-twelve")
    if provenance_entry.get("representations") != ["schematic-3d"] or provenance_entry.get("quizEligibility") != "pilot":
        raise ValueError("cranial nerve provenance representation or quiz state changed")
    if not any("根糸" in limitation for limitation in provenance_entry.get("knownLimitations", [])):
        raise ValueError("cranial nerve provenance no longer records rootlet omission")
    quiz_source = (ROOT / "src/quizAnatomyHold.mjs").read_bytes()
    held_targets = parse_quiz_hold(quiz_source)
    if held_targets != ["cn10", "cn11", "cn5", "cn9"]:
        raise ValueError("V/IX/X/XI quiz hold changed")
    meshes = {}
    for group, (relative, expected_sha) in MESHES.items():
        mesh = read_bnm3(relative, expected_sha)
        expected_counts = EXPECTED_GROUPS[group]
        if (mesh["vertices"], mesh["faces"]) != expected_counts:
            raise ValueError(f"{group} mesh counts changed")
        meshes[group] = mesh
        fixed_inputs[relative] = {"sha256": mesh["sha256"], "bytes": len((ROOT / relative).read_bytes())}
    groups = {group["file"]: group for group in overlay["groups"]}
    structures = {}
    for nerve, target in TARGETS.items():
        group = groups[f"overlay-nerves-{target['mesh']}.mesh"]
        structure_by_id = {structure["id"]: structure for structure in group["structures"]}
        mesh = meshes[target["mesh"]]
        structures[nerve] = {
            "quizTarget": target["target"],
            "mesh": target["mesh"],
            "displayShiftApplied": group["displayShiftApplied"],
            "left": region_summary(mesh, target["leftId"], "left", structure_by_id[target["leftId"]]["name"]),
            "right": region_summary(mesh, target["rightId"], "right", structure_by_id[target["rightId"]]["name"]),
        }
    evidence = []
    for relative, expected_sha in EVIDENCE.items():
        item = fixed_file(relative, expected_sha)
        report = json.loads((ROOT / relative).read_text(encoding="utf-8"))
        evidence.append({"path": relative, **item, "mutation": report.get("mutation", False), "expertReviewed": report.get("expertReviewed", False), "figureCount": len(report.get("figures", []))})
    return {
        "format": "brain-practical-current-schematic-roots-scope-inventory",
        "version": 1,
        "fixedInputs": fixed_inputs,
        "generator": {"path": "scripts/build_neurovascular_overlays.py", "sha256": fixed_inputs["scripts/build_neurovascular_overlays.py"]["sha256"], "declarations": declarations},
        "overlayMetadata": {"path": "public/atlas/neurovascular-overlays.json", "sha256": fixed_inputs["public/atlas/neurovascular-overlays.json"]["sha256"], "version": overlay["version"], "coordinateSpace": overlay["coordinateSpace"], "status": overlay["status"]},
        "provenance": {"key": "cranial-nerves-one-to-twelve", "representations": provenance_entry["representations"], "learnerSurfaces": provenance_entry["learnerSurfaces"], "quizEligibility": provenance_entry["quizEligibility"], "knownLimitations": provenance_entry["knownLimitations"]},
        "quizHold": {"path": "src/quizAnatomyHold.mjs", "sha256": fixed_inputs["src/quizAnatomyHold.mjs"]["sha256"], "heldTargets": held_targets, "targetStatus": {target["target"]: "held" for target in TARGETS.values()}},
        "structures": structures,
        "historicalImageEvidence": evidence,
        "status": {"mutation": False, "adopted": False, "expertReviewed": False},
        "limitation": "This is a read-only inventory of authored schematic paths and their current metadata. Mesh ring ranges describe generated geometry only; they do not establish anatomical root exits, rootlet counts, laterality beyond the mesh side labels, or a complete nerve course. Historical reports are retained as evidence references and are not rejudged here.",
    }


def main() -> None:
    if OUTPUT.exists():
        raise ValueError(f"Refusing to overwrite existing evidence: {OUTPUT}")
    report = build_report()
    OUTPUT.write_bytes((json.dumps(report, ensure_ascii=False, indent=2) + "\n").encode("utf-8"))
    print(json.dumps({"output": str(OUTPUT), "sha256": sha256(OUTPUT.read_bytes())}, ensure_ascii=False))


if __name__ == "__main__":
    main()
