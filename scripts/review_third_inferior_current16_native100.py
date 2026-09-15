"""Render native100 context for the fixed current third-ventricle held set.

The 16 coordinates are read from the stage-2 inventory and overlaid as a
review mask.  This script performs no search, stage application, or anatomy
decision; the historical 24-point exclusion is recorded as separate context.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import h5py
import numpy as np
from PIL import Image, ImageDraw
from build_orthogonal_review_bundle import DEFAULT_LABELS, MAGIC_LABELS, ROOT, _outline, read_browser_volume
from audit_native_roi_transform import checked, load_linear, load_native_grid, GRID_SHA, LIN_SHA, NL_SHA
from read_native100_crop import read_crop
from render_fornix_native100_connection import sample_native_labels
from render_trigeminal_native100_review import native_points, SOURCE_SHA
from review_aqueduct_native100 import plane_coordinates
from review_bigbrain_grid_transform import GRID_SHAS, XFM_SHA, load_published_grids


INVENTORY = ROOT / "work/anatomy-review/stage2-ventricular-terminals-inventory-v3/report.json"
INVENTORY_SHA = "6d0475b6af9330a1d2ee8ddb4663c20fced18968a678bc709ef62ae3dc2b9a0d"
LABEL_SHA = "48e1602b871b10bd7b31f99278aef8d0e44bcfb8930051fa9aa20ffd48802db2"
SOURCE_LABELS = ROOT / "tests/fixtures/bigbrain-practical-segmentation-pre-third-inferior-current16.bin.gz"
OUTPUT = ROOT / "work/anatomy-review/third-inferior-current16-native100-v2"
EXPECTED_POINTS = np.asarray(
    [
        [195, 265, 107], [195, 265, 108], [195, 266, 107], [195, 266, 108],
        [195, 267, 107], [195, 267, 108], [195, 268, 107], [195, 268, 108],
        [196, 265, 107], [196, 265, 108], [196, 266, 107], [196, 266, 108],
        [196, 267, 107], [196, 267, 108], [196, 268, 107], [196, 268, 108],
    ],
    dtype=np.int64,
)
REPRESENTATIVES = np.asarray([[195, 265, 107], [196, 268, 108]], dtype=np.int64)
ID25_RGB = [255, 190, 20]
CANDIDATE_RGB = [255, 70, 130]


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def load_current_set(labels: np.ndarray) -> tuple[np.ndarray, dict[str, object]]:
    payload = INVENTORY.read_bytes()
    if sha256(payload) != INVENTORY_SHA:
        raise ValueError("stage-2 inventory digest changed")
    inventory = json.loads(payload)
    region = inventory["regions"]["thirdVentricleInferiorTerminal"]
    points = np.asarray(region["currentHeldPoints"], dtype=np.int64)
    if (
        points.shape != (16, 3)
        or not np.array_equal(points, EXPECTED_POINTS)
        or region["currentHeldCount"] != 16
        or region["currentHeldValueCounts"] != {"25": 16}
        or np.any(labels[tuple(points.T)] != 25)
    ):
        raise ValueError("current third-inferior held set changed")
    definition = region["currentHeldDefinition"]
    if definition.get("rangesInclusive") != {"x": [195, 196], "y": [265, 268], "z": [107, 108]}:
        raise ValueError("fixed retained range changed")
    if not all(any(np.array_equal(rep, point) for point in points) for rep in REPRESENTATIVES):
        raise ValueError("representative is outside current held set")
    return points, region


def render_reference(*, number: int, app_point: np.ndarray, native_point: np.ndarray,
                     labels: np.ndarray, selected: np.ndarray, file, report: dict[str, object],
                     start: np.ndarray, step: np.ndarray, linear, native_grid, grids, affine) -> None:
    q = (native_point - start) / step
    center = np.rint(q).astype(int)
    low = center - 60
    high = center + 61
    decoded, _, _, meta = read_crop(file["minc-2.0/image/0"], low, high)
    report["references"].append({
        "appXYZ": app_point.tolist(),
        "nativeXYZ": q.tolist(),
        "crop": meta,
        "decodedSha256": sha256(decoded.tobytes()),
    })
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
            rgb[_outline(lab == 25)] = ID25_RGB
            rgb[_outline(candidate != 0)] = CANDIDATE_RGB
            row = Image.new("RGB", (738, 433), "#181818")
            draw = ImageDraw.Draw(row)
            draw.text((4, 3), f"App {app_point.tolist()} | native {'XYZ'[axis]}={index} | raw LEFT / projections RIGHT", fill="white")
            draw.text((4, 18), "Amber: current ID25; pink: fixed current-held 16-point overlay.", fill="white")
            draw.text((4, 33), "Native100, window 40000..65535. Sagittal A=RIGHT. Not boundary approval.", fill="white")
            draw.rectangle((4, 48, 13, 57), fill=tuple(ID25_RGB))
            draw.text((17, 46), "ID25", fill="white")
            draw.rectangle((70, 48, 79, 57), fill=tuple(CANDIDATE_RGB))
            draw.text((83, 46), "held16", fill="white")
            row.paste(Image.fromarray(gray).convert("RGB").resize((363, 363), Image.Resampling.NEAREST), (0, 70))
            row.paste(Image.fromarray(rgb).resize((363, 363), Image.Resampling.NEAREST), (375, 70))
            rows.append(row)
            planes.append({
                "axis": "xyz"[axis],
                "nativeIndex": index,
                "valuesSha256": sha256(values.tobytes()),
                "labelProjectionSha256": sha256(lab.tobytes()),
                "candidateProjectionSha256": sha256(candidate.tobytes()),
            })
        sheet = Image.new("RGB", (738, 1299), "#181818")
        for row_index, row in enumerate(rows):
            sheet.paste(row, (0, row_index * 433))
        target = OUTPUT / f"reference-{number}-{'xyz'[axis]}.png"
        sheet.save(target)
        figure = {"path": target.name, "sha256": sha256(target.read_bytes()), "planes": planes}
        report["figures"].append(figure)


def build() -> Path:
    if OUTPUT.exists():
        raise ValueError(f"preserve prior evidence: {OUTPUT}")
    _, _, labels = read_browser_volume(SOURCE_LABELS, MAGIC_LABELS, LABEL_SHA)
    points, region = load_current_set(labels)
    geometry_bytes = (ROOT / "public/atlas/bigbrain-icbm500-validation.json").read_bytes()
    affine = np.asarray(json.loads(geometry_bytes)["affine"])
    linear = load_linear()
    native_grid = load_native_grid()
    grids = load_published_grids("catmull-rom")
    world = REPRESENTATIVES @ affine[:3, :3].T + affine[:3, 3]
    native, error = native_points(world, grids, native_grid, linear)
    source = checked(ROOT / "work/full16_100um_optbal.mnc", SOURCE_SHA)
    selected = np.zeros(labels.shape, dtype=np.uint8)
    selected[tuple(points.T)] = 1
    report: dict[str, object] = {
        "schemaVersion": 1,
        "status": "read-only-current-third-inferior-held-native100-context",
        "mutation": False,
        "adopted": False,
        "expertReviewed": False,
        "visualReviewPending": True,
        "inventoryPath": INVENTORY.relative_to(ROOT).as_posix(),
        "inventorySha256": INVENTORY_SHA,
        "currentLabelPath": DEFAULT_LABELS.relative_to(ROOT).as_posix(),
        "currentLabelSha256": LABEL_SHA,
        "nativeSourcePath": "work/full16_100um_optbal.mnc",
        "nativeSourceSha256": SOURCE_SHA,
        "historicalContextCount": 24,
        "historicalHeldCount": 24,
        "historicalExcluded24": {
            "locatorPath": region["locator"]["path"],
            "locatorSha256": region["locator"]["sha256"],
            "count": 24,
            "note": "Historical 24-point exclusion context is a separate coordinate set from the current retained 16 points.",
        },
        "currentHeldCount": 16,
        "currentHeldValueCounts": {"25": 16},
        "currentHeldDefinition": region["currentHeldDefinition"],
        "candidatePoints": points.tolist(),
        "representativeAppXYZ": REPRESENTATIVES.tolist(),
        "representativeNativeMm": native.tolist(),
        "geometrySha256": sha256(geometry_bytes),
        "transformHashes": {"nativeGrid": GRID_SHA, "linear": LIN_SHA, "nativeNonlinear": NL_SHA, "improved": XFM_SHA, "grids": GRID_SHAS},
        "maxForwardRoundtripErrorMm": float(error.max()),
        "intensityWindow": [40000, 65535],
        "radiusMm": 6,
        "colors": {
            "ID25": {"name": "amber", "rgb": ID25_RGB},
            "held16": {"name": "pink", "rgb": CANDIDATE_RGB},
        },
        "figureLegend": "Amber outline: current ID25. Pink outline: fixed current-held 16 points. The 16 points are not deletion or adoption proposals.",
        "references": [],
        "figures": [],
        "limitation": "Native100 intensity and nearest-cell projections provide review context only; they do not establish third-ventricle identity, cavity boundary, endpoint, deletion, or adoption.",
    }
    OUTPUT.mkdir(parents=True)
    with h5py.File(source, "r") as file:
        dims = file["minc-2.0/dimensions"]
        start = np.array([dims[axis + "space"].attrs["start"] for axis in "xyz"])
        step = np.array([dims[axis + "space"].attrs["step"] for axis in "xyz"])
        for number, (app_point, native_point) in enumerate(zip(REPRESENTATIVES, native)):
            render_reference(number=number, app_point=app_point, native_point=native_point, labels=labels,
                             selected=selected, file=file, report=report, start=start, step=step,
                             linear=linear, native_grid=native_grid, grids=grids, affine=affine)
    payload = (json.dumps(report, indent=2) + "\n").encode("utf-8")
    report_path = OUTPUT / "report.json"
    report_path.write_bytes(payload)
    print(json.dumps({"path": report_path.relative_to(ROOT).as_posix(), "sha256": sha256(payload)}))
    return report_path


if __name__ == "__main__":
    build()
