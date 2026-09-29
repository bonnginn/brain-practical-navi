"""Render current lateral-ventricle islands against the original BigBrain image.

Read-only evidence for deciding whether small disconnected labels should remain.
Connectivity alone is not a deletion criterion.
"""

import json

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

from build_orthogonal_review_bundle import (
    ROOT, DEFAULT_IMAGE, EXPECTED_IMAGE_SHA256, MAGIC_IMAGE,
    _oriented_crop, _outline, read_browser_volume,
)


LABELS = ROOT / "public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz"
EXPECTED_LABELS_SHA256 = "71eebaf135377bf8da9b121e6a7a510de8066c3ca9172cf02d32b55baa140a0a"
TARGETS = ((23, (147, 198, 161), 8), (24, (250, 239, 119), 7))
OUTPUT = ROOT / "work/anatomy-review/current-lateral-islands-2026-09-29"


def main():
    if OUTPUT.exists():
        raise ValueError("Preserve the existing review bundle")
    _, _, labels = read_browser_volume(LABELS, b"BBS1", EXPECTED_LABELS_SHA256)
    _, _, raw = read_browser_volume(DEFAULT_IMAGE, MAGIC_IMAGE, EXPECTED_IMAGE_SHA256)
    if labels.shape != raw.shape:
        raise ValueError("Image/label grid mismatch")
    OUTPUT.mkdir(parents=True)
    results = []
    repeated_ids = {label_id for label_id, _, _ in TARGETS if sum(target[0] == label_id for target in TARGETS) > 1}
    for label_id, seed, expected_count in TARGETS:
        seed = np.asarray(seed)
        stem = f"id{label_id}-x{seed[0]}y{seed[1]}z{seed[2]}" if label_id in repeated_ids else f"id{label_id}"
        bounds = tuple(slice(max(0, int(v)-25), min(int(labels.shape[i]), int(v)+26)) for i, v in enumerate(seed))
        local = labels[bounds] == label_id
        components, _ = ndimage.label(local, ndimage.generate_binary_structure(3, 3))
        origin = np.asarray([part.start for part in bounds])
        component_id = int(components[tuple(seed-origin)])
        if not component_id:
            raise ValueError(f"Missing target {label_id} at {seed.tolist()}")
        points = np.argwhere(components == component_id) + origin
        if len(points) != expected_count:
            raise ValueError(f"Target {label_id} changed: {len(points)} voxels")
        crop = {"min": (np.maximum(points.min(0)-16, 0)).tolist(), "max": (np.minimum(points.max(0)+16, np.asarray(labels.shape)-1)).tolist()}
        chosen = np.zeros_like(local, dtype=bool)
        chosen[components == component_id] = True
        chosen_full = np.zeros_like(labels, dtype=bool)
        chosen_full[bounds] = chosen
        center = points[np.argmin(np.linalg.norm(points-points.mean(0), axis=1))]
        files = []
        for axis_index, axis in enumerate("xyz"):
            panels = []
            for section in range(int(center[axis_index])-1, int(center[axis_index])+2):
                image = _oriented_crop(raw, axis, section, crop)
                current = _oriented_crop(labels == label_id, axis, section, crop)
                target = _oriented_crop(chosen_full, axis, section, crop)
                plain = np.repeat(image[:, :, None], 3, axis=2)
                marked = plain.copy()
                marked[_outline(current)] = (0, 175, 215)
                marked[_outline(target)] = (255, 70, 100)
                h, w = image.shape
                row = Image.new("RGB", (w*6+16, h*3+34), "#1d1d1d")
                draw = ImageDraw.Draw(row)
                draw.text((4, 4), f"BigBrain original 0.5 mm {axis}{section} / ID {label_id}", fill="white")
                draw.text((4, 18), "Left raw; right current label cyan, island red", fill="white")
                row.paste(Image.fromarray(plain).resize((w*3, h*3), Image.Resampling.NEAREST), (0, 34))
                row.paste(Image.fromarray(marked).resize((w*3, h*3), Image.Resampling.NEAREST), (w*3+16, 34))
                panels.append(row)
            sheet = Image.new("RGB", (panels[0].width, sum(panel.height for panel in panels)))
            y = 0
            for panel in panels:
                sheet.paste(panel, (0, y))
                y += panel.height
            name = f"{stem}-{axis}.png"
            sheet.save(OUTPUT / name)
            files.append(name)
        results.append({"labelId": label_id, "seedXYZ": seed.tolist(), "pointsXYZ": points.tolist(), "centerXYZ": center.tolist(), "count": len(points), "figures": files})
    (OUTPUT / "report.json").write_text(json.dumps({"labelSha256": EXPECTED_LABELS_SHA256, "imageSha256": EXPECTED_IMAGE_SHA256, "mutation": False, "decision": "pending image review", "targets": results}, indent=2) + "\n", encoding="utf-8")
    print(json.dumps([{"id": item["labelId"], "voxels": item["count"], "figures": item["figures"]} for item in results]))


if __name__ == "__main__":
    main()
