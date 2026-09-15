"""Render the registered300 posterior interval beside the existing body draft.

The interval is read-only context: only the already fixed 1,098-point body
draft is overlaid, and no candidate points are created or adopted.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

from audit_manual_label_space import SOURCE, load_identity_minc
from build_orthogonal_review_bundle import ROOT
from render_registered_manual_fine_review import IMAGE_NAME, IMAGE_SHA, encode_image


OUTPUT = ROOT / "work/anatomy-review/fornix-posterior-interval-registered300-v1"
BODY_REPORT = ROOT / "work/anatomy-review/fornix-core-draft-body-extension-v2/report.json"
WIDE_REPORT = ROOT / "work/anatomy-review/fornix-draft-wide-coronal-v1/report.json"
GEOMETRY = ROOT / "public/atlas/bigbrain-icbm500-validation.json"
LOW = np.array([305, 340, 230])
HIGH = np.array([350, 475, 345])
INTERVAL = list(range(392, 405))
BODY_SHA = "c4dc1bc17eaf9be89ae044803f3e38300eb02833294011450785f1150cb5d1ef"
WIDE_SHA = "ed3cb881f28a928bc3f35d285eb228d7c8e0fdb8be284268fc7a7db7e5ae9fe6"
FIXED_FILES = {
    "docs/FORNIX_SCOPE_DECISION_2026-09-14.md": "16396f2b2244c247ac9693d43f462e71fb9660bb2f636062c84be768c1b5103a",
    "docs/FORNIX_SEGMENTATION_REVIEW.md": "ecc3e6fa4cc67393989f75769064b777cca6c28613dceddb3454e96b8177f06f",
    "scripts/render_fornix_draft_orthogonal.py": "2a94e2a10cf71c813914b89ce8c7558e301b8d1338aec926217e2e3f6eae2a0d",
    "scripts/render_registered_manual_fine_review.py": "c8d5457c45a15a2a1c20e84f3b45924897e0128daf99893accecec016af5fa37",
    "scripts/audit_manual_label_space.py": "d4e3b83de4f8d4eea8aef41392aab35bca97ee5cbd505e8737759281e342a4a7",
    "public/atlas/bigbrain-icbm500-validation.json": "14f3c7946def4f475170a49e9bf23ba17cdb9f05c030b367277a8c77a3d72429",
}


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def checked(path: Path, expected: str) -> bytes:
    data = path.read_bytes()
    actual = sha256(data)
    if actual != expected:
        raise ValueError(f"{path} SHA changed: {actual} != {expected}")
    return data


def main() -> None:
    if OUTPUT.exists():
        raise ValueError("Preserve existing evidence")
    body_bytes = checked(BODY_REPORT, BODY_SHA)
    wide_bytes = checked(WIDE_REPORT, WIDE_SHA)
    fixed_input_hashes = {}
    for relative, expected in FIXED_FILES.items():
        data = checked(ROOT / relative, expected)
        fixed_input_hashes[relative] = {"sha256": sha256(data), "bytes": len(data)}
    body = json.loads(body_bytes.decode("utf-8"))
    wide = json.loads(wide_bytes.decode("utf-8"))
    points = np.asarray(body["sourcePoints"], dtype=int)
    if points.shape != (1098, 3) or len(set(map(tuple, points))) != 1098:
        raise ValueError("Body draft point set changed")
    if wide.get("sourceSha256") != IMAGE_SHA:
        raise ValueError("Existing wide-coronal source changed")
    existing_by_index = {
        int(entry["indices"][0]): entry
        for entry in wide["figures"]
        if entry.get("axis") == "y" and len(entry.get("indices", [])) == 1
    }
    if not all(index in existing_by_index for index in (392, 398, 404)):
        raise ValueError("Existing wide-coronal anchor panels missing")

    geometry = json.loads(GEOMETRY.read_text(encoding="utf-8"))
    window = geometry["intensityWindow"]
    raw, _, _, _ = load_identity_minc(SOURCE / IMAGE_NAME, IMAGE_SHA)
    crop = raw[tuple(slice(int(LOW[axis]), int(HIGH[axis])) for axis in range(3))]
    if crop.shape != (45, 135, 115):
        raise ValueError(f"Unexpected crop shape: {crop.shape}")
    mask = np.zeros(crop.shape, dtype=bool)
    mask[tuple((points - LOW).T)] = True

    OUTPUT.mkdir(parents=True)
    figures = []
    for index in INTERVAL:
        gray = encode_image(np.take(crop, index - LOW[1], axis=1), window).T[::-1, :]
        selected = np.take(mask, index - LOW[1], axis=1).T[::-1, :]
        rgb = np.repeat(gray[:, :, None], 3, axis=2)
        overlay = rgb.copy()
        overlay[selected] = np.rint(
            0.65 * overlay[selected] + 0.35 * np.array([255, 120, 0])
        ).astype(np.uint8)
        height, width = gray.shape
        scale = 3
        panel_width, panel_height = width * scale, height * scale
        sheet = Image.new("RGB", (max(650, panel_width * 2 + 12), panel_height + 38), "#181818")
        ImageDraw.Draw(sheet).text(
            (4, 3),
            f"Registered300 Y{index}: raw / orange exact 1098-point body draft\n"
            "Posterior interval adjacent to body draft; crus identity unresolved.",
            fill="white",
        )
        raw_panel = Image.fromarray(rgb).resize((panel_width, panel_height), Image.Resampling.NEAREST)
        overlay_panel = Image.fromarray(overlay).resize((panel_width, panel_height), Image.Resampling.NEAREST)
        sheet.paste(raw_panel, (0, 38))
        sheet.paste(overlay_panel, (panel_width + 12, 38))
        path = OUTPUT / f"y-{index}.png"
        sheet.save(path)

        raw_panel_bytes = raw_panel.tobytes()
        matching = None
        if index in existing_by_index:
            existing_path = ROOT / "work/anatomy-review/fornix-draft-wide-coronal-v1" / existing_by_index[index]["path"]
            existing_image = Image.open(existing_path).convert("RGB")
            existing_panel = existing_image.crop((0, 38, panel_width, 38 + panel_height))
            matching = existing_panel.tobytes() == raw_panel_bytes
        figures.append(
            {
                "path": path.name,
                "axis": "y",
                "index": index,
                "sha256": sha256(path.read_bytes()),
                "rawDecodedSha256": sha256(gray.tobytes()),
                "rawPanelSha256": sha256(raw_panel_bytes),
                "overlayPanelSha256": sha256(overlay_panel.tobytes()),
                "overlayPointCount": int(selected.sum()),
                "rawPanelMatchesExistingWideCoronal": matching,
                "newCandidatePointCount": 0,
            }
        )

    report = {
        "schemaVersion": 1,
        "sourceSha256": IMAGE_SHA,
        "bodyDraftReportSha256": BODY_SHA,
        "existingWideCoronalReportSha256": WIDE_SHA,
        "fixedInputFiles": fixed_input_hashes,
        "cropLowXYZ": LOW.tolist(),
        "cropHighExclusiveXYZ": HIGH.tolist(),
        "registered300Y": INTERVAL,
        "intensityWindow": window,
        "bodyDraftPointCount": len(points),
        "newCandidatePointCount": 0,
        "figures": figures,
        "mutation": False,
        "adopted": False,
        "visualReviewPending": True,
        "limitation": "Read-only posterior interval context adjacent to the body draft. The overlay adds no points and does not determine fornix body, crus, or column identity or boundary.",
    }
    (OUTPUT / "report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"figures": len(figures), "planes": len(INTERVAL), "outputSha256": sha256((OUTPUT / "report.json").read_bytes())}))


if __name__ == "__main__":
    main()
