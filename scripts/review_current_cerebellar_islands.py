"""Read-only orthogonal review of two current right-cerebellar label islands.

The images are for judging tissue versus fissure and do not authorize an edit
from component size or intensity alone.
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
TARGETS = ((29, (223, 81, 65), 24), (29, (271, 191, 49), 16))
OUTPUT = ROOT / "work/anatomy-review/current-cerebellar-islands-2026-09-29"


def main():
    if OUTPUT.exists():
        raise ValueError("Preserve existing review bundle")
    _, _, labels = read_browser_volume(LABELS, b"BBS1", EXPECTED_LABELS_SHA256)
    _, _, raw = read_browser_volume(DEFAULT_IMAGE, MAGIC_IMAGE, EXPECTED_IMAGE_SHA256)
    if labels.shape != raw.shape:
        raise ValueError("Image/label grid mismatch")
    OUTPUT.mkdir(parents=True)
    results = []
    for label_id, seed_values, expected_count in TARGETS:
        seed = np.asarray(seed_values)
        bounds = tuple(slice(max(0, int(v)-25), min(int(labels.shape[i]), int(v)+26)) for i, v in enumerate(seed))
        local = labels[bounds] == label_id
        components, _ = ndimage.label(local, ndimage.generate_binary_structure(3, 3))
        origin = np.asarray([part.start for part in bounds])
        component_id = int(components[tuple(seed-origin)])
        if not component_id:
            raise ValueError(f"Missing target {label_id} at {seed.tolist()}")
        points = np.argwhere(components == component_id) + origin
        if len(points) != expected_count:
            raise ValueError(f"Target changed: {len(points)} voxels")
        crop = {"min": np.maximum(points.min(0)-18, 0).tolist(), "max": np.minimum(points.max(0)+18, np.asarray(labels.shape)-1).tolist()}
        selected = np.zeros_like(labels, dtype=bool)
        selected[tuple(points.T)] = True
        center = points[np.argmin(np.linalg.norm(points-points.mean(0), axis=1))]
        figures = []
        for axis_index, axis in enumerate("xyz"):
            panels = []
            for section in range(int(center[axis_index])-1, int(center[axis_index])+2):
                image = _oriented_crop(raw, axis, section, crop)
                current = _oriented_crop(labels == label_id, axis, section, crop)
                target = _oriented_crop(selected, axis, section, crop)
                plain = np.repeat(image[:, :, None], 3, axis=2)
                marked = plain.copy()
                marked[_outline(current)] = (0, 175, 215)
                marked[_outline(target)] = (255, 70, 100)
                h, w = image.shape
                panel = Image.new("RGB", (w*8+16, h*4+34), "#1d1d1d")
                draw = ImageDraw.Draw(panel)
                draw.text((4, 4), f"BigBrain original 0.5 mm {axis}{section} / ID {label_id}", fill="white")
                draw.text((4, 18), "Left raw; right current label cyan, island red", fill="white")
                panel.paste(Image.fromarray(plain).resize((w*4, h*4), Image.Resampling.NEAREST), (0, 34))
                panel.paste(Image.fromarray(marked).resize((w*4, h*4), Image.Resampling.NEAREST), (w*4+16, 34))
                panels.append(panel)
            sheet = Image.new("RGB", (panels[0].width, sum(panel.height for panel in panels)))
            y = 0
            for panel in panels:
                sheet.paste(panel, (0, y))
                y += panel.height
            name = f"id{label_id}-x{seed[0]}y{seed[1]}z{seed[2]}-{axis}.png"
            sheet.save(OUTPUT / name)
            figures.append(name)
        results.append({"labelId": label_id, "seedXYZ": seed.tolist(), "pointsXYZ": points.tolist(), "centerXYZ": center.tolist(), "count": len(points), "figures": figures})
    (OUTPUT / "report.json").write_text(json.dumps({"labelSha256": EXPECTED_LABELS_SHA256, "imageSha256": EXPECTED_IMAGE_SHA256, "mutation": False, "decision": "pending image review", "targets": results}, indent=2) + "\n", encoding="utf-8")
    print(json.dumps([{"seed": item["seedXYZ"], "count": item["count"], "figures": item["figures"]} for item in results]))


if __name__ == "__main__":
    main()
