"""Render native100 context for the two current aqueduct-held components.

This is a read-only overlay of the fixed 30-point current held set from the
stage-2 inventory.  It does not search, classify, or apply a stage.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import h5py
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

from audit_native_roi_transform import checked, load_linear, load_native_grid, GRID_SHA, LIN_SHA, NL_SHA
from build_orthogonal_review_bundle import DEFAULT_LABELS, MAGIC_LABELS, ROOT, _outline, read_browser_volume
from read_native100_crop import read_crop
from review_aqueduct_native100 import SOURCE_SHA as AQUEDUCT_NATIVE_SOURCE_SHA
from render_fornix_native100_connection import sample_native_labels
from render_trigeminal_native100_review import native_points
from review_aqueduct_native100 import plane_coordinates
from review_bigbrain_grid_transform import GRID_SHAS, XFM_SHA, load_published_grids


INVENTORY = ROOT / "work/anatomy-review/stage2-ventricular-terminals-inventory-v3/report.json"
INVENTORY_SHA = "6d0475b6af9330a1d2ee8ddb4663c20fced18968a678bc709ef62ae3dc2b9a0d"
LABEL_SHA = "48e1602b871b10bd7b31f99278aef8d0e44bcfb8930051fa9aa20ffd48802db2"
SOURCE_LABELS = ROOT / "tests/fixtures/bigbrain-practical-segmentation-pre-third-inferior-current16.bin.gz"
OUTPUT = ROOT / "work/anatomy-review/aqueduct-current30-native100-v1"
GROUP_COUNT = (9, 21)
CONTEXT_IDS = (23, 24, 25, 26, 41)
PALETTE = {
    23: [0, 190, 220],
    24: [40, 140, 255],
    25: [255, 190, 20],
    26: [175, 100, 255],
    41: [230, 80, 190],
    "candidate": [255, 70, 130],
}


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def load_current_set(labels: np.ndarray) -> tuple[np.ndarray, list[dict[str, object]], dict[str, object]]:
    payload = INVENTORY.read_bytes()
    if sha256(payload) != INVENTORY_SHA:
        raise ValueError("stage-2 inventory digest changed")
    inventory = json.loads(payload)
    region = inventory["regions"]["aqueduct"]
    points = np.asarray(region["currentHeldPoints"], dtype=np.int64)
    if points.shape != (30, 3) or len(np.unique(points, axis=0)) != 30:
        raise ValueError("current aqueduct held coordinates changed")
    values = labels[tuple(points.T)]
    unique, counts = np.unique(values, return_counts=True)
    if region["currentHeldValueCounts"] != {"0": 11, "27": 19} or {
        int(value): int(count) for value, count in zip(unique, counts)
    } != {0: 11, 27: 19}:
        raise ValueError("current aqueduct held values changed")
    low = points.min(axis=0) - 1
    high = points.max(axis=0) + 2
    mask = np.zeros(high - low, dtype=np.uint8)
    mask[tuple((points - low).T)] = 1
    connected, count = ndimage.label(mask, np.ones((3, 3, 3), dtype=np.uint8))
    groups = []
    for ident in range(1, count + 1):
        members = np.argwhere(connected == ident) + low
        centroid = members.mean(axis=0)
        representative = min(
            members.tolist(),
            key=lambda point: (float(np.sum((np.asarray(point) - centroid) ** 2)), tuple(int(value) for value in point)),
        )
        groups.append(
            {
                "count": int(len(members)),
                "bounds": {"min": members.min(axis=0).tolist(), "max": members.max(axis=0).tolist()},
                "centroid": [round(float(value), 6) for value in centroid],
                "representativeAppXYZ": [[int(value) for value in representative]],
                "points": members.tolist(),
            }
        )
    groups.sort(key=lambda group: (int(group["count"]), tuple(group["bounds"]["min"]), tuple(group["bounds"]["max"])))
    if [group["count"] for group in groups] != list(GROUP_COUNT):
        raise ValueError(f"expected 26-neighbor groups {GROUP_COUNT}, got {[group['count'] for group in groups]}")
    if int((labels == 41).sum()) != 259:
        raise ValueError("current ID41 count changed")
    return points, groups, inventory


def render_group(points: np.ndarray, group: dict[str, object], labels: np.ndarray, report: dict[str, object], file):
    refs = np.asarray(group["representativeAppXYZ"], dtype=np.int64)
    geometry_bytes = (ROOT / "public/atlas/bigbrain-icbm500-validation.json").read_bytes()
    affine = np.asarray(json.loads(geometry_bytes)["affine"])
    world = refs @ affine[:3, :3].T + affine[:3, 3]
    linear = load_linear()
    native_grid = load_native_grid()
    grids = load_published_grids("catmull-rom")
    native, error = native_points(world, grids, native_grid, linear)
    source = checked(ROOT / "work/full16_100um_optbal.mnc", AQUEDUCT_NATIVE_SOURCE_SHA)
    dims = file["minc-2.0/dimensions"]
    start = np.array([dims[axis + "space"].attrs["start"] for axis in "xyz"])
    step = np.array([dims[axis + "space"].attrs["step"] for axis in "xyz"])
    selected = np.zeros(labels.shape, dtype=np.uint8)
    selected[tuple(points.T)] = 1
    report["groups"].append(
        {
            "componentId": group["componentId"],
            "count": group["count"],
            "bounds": group["bounds"],
            "centroid": group["centroid"],
            "representativeAppXYZ": refs.tolist(),
            "points": group["points"],
            "nativeXYZ": [point.tolist() for point in ((native - start) / step)],
            "maxForwardRoundtripErrorMm": float(error.max()),
            "figures": [],
        }
    )
    output_group = report["groups"][-1]
    for number, (app_point, native_point) in enumerate(zip(refs, native)):
        q = (native_point - start) / step
        center = np.rint(q).astype(int)
        low = center - 60
        high = center + 61
        decoded, _, _, meta = read_crop(file["minc-2.0/image/0"], low, high)
        reference = {
            "appXYZ": app_point.tolist(),
            "nativeXYZ": q.tolist(),
            "crop": meta,
            "decodedSha256": sha256(decoded.tobytes()),
        }
        report["references"].append(reference)
        for axis in range(3):
            rows = []
            planes = []
            for delta in (-1, 0, 1):
                index = int(center[axis] + delta)
                coords, shape2 = plane_coordinates(decoded.shape, low, axis, index)
                values = decoded[tuple((coords - low).T)].reshape(shape2).T[::-1, :]
                gray = np.rint(np.clip((values - 40000) / 25535, 0, 1) * 255).astype(np.uint8)
                lab = sample_native_labels(labels, coords, start, step, linear, native_grid, grids, affine).reshape(shape2).T[::-1, :]
                candidate = sample_native_labels(selected, coords, start, step, linear, native_grid, grids, affine).reshape(shape2).T[::-1, :]
                rgb = np.repeat(gray[:, :, None], 3, axis=2)
                for label_id in CONTEXT_IDS:
                    rgb[_outline(lab == label_id)] = PALETTE[label_id]
                rgb[_outline(candidate != 0)] = PALETTE["candidate"]
                row = Image.new("RGB", (738, 413), "#181818")
                draw = ImageDraw.Draw(row)
                draw.text((4, 3), f"App {app_point.tolist()} | native {'XYZ'[axis]}={index} | raw LEFT / projections RIGHT", fill="white")
                draw.text((4, 18), "Candidate30 includes current 0/27; no destination assigned.", fill="white")
                cursor = 4
                for label in (23, 24, 25, 26, 41, "candidate"):
                    draw.rectangle((cursor, 33, cursor + 9, 42), fill=tuple(PALETTE[label]))
                    draw.text((cursor + 13, 31), f"ID{label}" if isinstance(label, int) else "candidate", fill="white")
                    cursor += 118
                row.paste(Image.fromarray(gray).convert("RGB").resize((363, 363), Image.Resampling.NEAREST), (0, 50))
                row.paste(Image.fromarray(rgb).resize((363, 363), Image.Resampling.NEAREST), (375, 50))
                rows.append(row)
                planes.append(
                    {
                        "axis": "xyz"[axis],
                        "nativeIndex": index,
                        "valuesSha256": sha256(values.tobytes()),
                        "labelProjectionSha256": sha256(lab.tobytes()),
                        "candidateProjectionSha256": sha256(candidate.tobytes()),
                    }
                )
            sheet = Image.new("RGB", (738, 1239), "#181818")
            for row_index, row in enumerate(rows):
                sheet.paste(row, (0, row_index * 413))
            target = OUTPUT / f"group-{group['count']:02d}-reference-{number}-{'xyz'[axis]}.png"
            sheet.save(target)
            figure_record = {"path": target.name, "sha256": sha256(target.read_bytes()), "planes": planes}
            output_group["figures"].append(figure_record)
            report["figures"].append({"componentId": output_group["componentId"], **figure_record})


def build() -> Path:
    if OUTPUT.exists():
        raise ValueError(f"preserve prior evidence: {OUTPUT}")
    _, _, labels = read_browser_volume(SOURCE_LABELS, MAGIC_LABELS, LABEL_SHA)
    points, groups, inventory = load_current_set(labels)
    OUTPUT.mkdir(parents=True)
    report = {
        "schemaVersion": 1,
        "status": "read-only-current-aqueduct-held-native100-context",
        "mutation": False,
        "adopted": False,
        "expertReviewed": False,
        "inventoryPath": INVENTORY.relative_to(ROOT).as_posix(),
        "inventorySha256": INVENTORY_SHA,
        "currentLabelPath": DEFAULT_LABELS.relative_to(ROOT).as_posix(),
        "currentLabelSha256": LABEL_SHA,
        "nativeSourcePath": "work/full16_100um_optbal.mnc",
        "nativeSourceSha256": AQUEDUCT_NATIVE_SOURCE_SHA,
        "candidateCount": 30,
        "candidateValueCounts": {"0": 11, "27": 19},
        "candidatePoints": points.tolist(),
        "currentContextLabelVoxelCounts": {str(label_id): int((labels == label_id).sum()) for label_id in CONTEXT_IDS},
        "references": [],
        "groups": [],
        "figures": [],
        "transformHashes": {"nativeGrid": GRID_SHA, "linear": LIN_SHA, "nativeNonlinear": NL_SHA, "improved": XFM_SHA, "grids": GRID_SHAS},
        "colors": {"ID23": {"name": "cyan", "rgb": PALETTE[23]}, "ID24": {"name": "blue", "rgb": PALETTE[24]}, "ID25": {"name": "amber", "rgb": PALETTE[25]}, "ID26": {"name": "violet", "rgb": PALETTE[26]}, "ID41": {"name": "magenta", "rgb": PALETTE[41]}, "candidate": {"name": "pink", "rgb": PALETTE["candidate"]}},
        "figureLegend": "Colored squares: current ID23/24/25/26/41; pink candidate30 (current 0/27).",
        "limitation": "Two separate 26-neighbor components are shown with one member representative each; projections and numerical roundtrip do not establish aqueduct anatomy, endpoint, boundary approval, or adoption.",
        "sourceHistoricalNote": "The 94-point native100 terminal evidence is historical context from an earlier label revision; this report overlays only the current 30-point held set.",
    }
    with h5py.File(checked(ROOT / "work/full16_100um_optbal.mnc", AQUEDUCT_NATIVE_SOURCE_SHA), "r") as file:
        for index, group in enumerate(groups, start=1):
            group["componentId"] = f"component-{index:02d}"
            render_group(np.asarray(group["points"], dtype=np.int64), group, labels, report, file)
    payload = (json.dumps(report, indent=2) + "\n").encode("utf-8")
    (OUTPUT / "report.json").write_bytes(payload)
    print(json.dumps({"path": OUTPUT.relative_to(ROOT).as_posix() + "/report.json", "sha256": sha256(payload)}))
    return OUTPUT / "report.json"


if __name__ == "__main__":
    build()
