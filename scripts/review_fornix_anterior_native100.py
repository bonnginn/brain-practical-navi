"""Render source-verified Native100 raw/current-label context for fornix review.

This is a bounded comparison artifact. It does not create or infer a candidate
segmentation and does not alter any product asset.
"""
import gzip
import hashlib
import json
import sys
import argparse
from pathlib import Path

import h5py
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from audit_native_roi_transform import checked, load_linear, load_native_grid  # noqa: E402
from build_orthogonal_review_bundle import (  # noqa: E402
    DEFAULT_LABELS,
    MAGIC_LABELS,
    _outline,
    read_browser_volume,
)
from read_native100_crop import read_crop  # noqa: E402
from render_fornix_native100_connection import sample_native_labels  # noqa: E402
from render_trigeminal_native100_review import SOURCE_SHA  # noqa: E402
from review_bigbrain_grid_transform import load_published_grids  # noqa: E402

CURRENT_LABEL_SHA = "d815aaff6b98c95109cdd7c052a29871d49cc9cdf463bcb3db7e28a1497c2392"
LOW = np.array([620, 850, 520], dtype=int)
HIGH = np.array([760, 941, 711], dtype=int)
WINDOW = (40000, 65535)
SCALE = 2
PANEL_GAP = 72
PLANES = {
    "y": [875, 880, 885, 890, 895, 900, 905],
    "x": [650, 660, 670, 680, 690, 700, 710, 720, 730],
    "z": [560, 580, 600, 620, 640, 660, 680],
}
COLORS = {46: (0, 220, 235), 43: (255, 145, 20), 23: (55, 145, 255), 24: (55, 145, 255), 25: (240, 50, 205)}
CONTEXT_COLORS = {**COLORS, 42: (190, 70, 235), 39: (255, 230, 60), 40: (255, 230, 60)}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def axis_image(values, axis, index, low):
    """Return a plane in display orientation and its displayed axis mapping."""
    local = index - int(low["xyz".index(axis)])
    if not 0 <= local < values.shape["xyz".index(axis)]:
        raise ValueError(f"Plane {axis}{index} lies outside crop")
    plane = np.take(values, local, axis="xyz".index(axis)).T[::-1, :]
    return plane


def project_plane(labels, axis, index, low, high, start, step, linear, native_grid, grids, affine):
    axis_index = "xyz".index(axis)
    shape = tuple(int(high[a] - low[a]) for a in range(3) if a != axis_index)
    uv = np.indices(shape).reshape(2, -1).T
    coords = np.empty((len(uv), 3), dtype=float)
    coords[:, axis_index] = index
    remaining = [a for a in range(3) if a != axis_index]
    for k, a in enumerate(remaining):
        coords[:, a] = uv[:, k] + low[a]
    projected = sample_native_labels(labels, coords, start, step, linear, native_grid, grids, affine)
    return projected.reshape(shape).T[::-1, :]


def gray_rgb(raw):
    gray = np.rint(np.clip((raw - WINDOW[0]) / (WINDOW[1] - WINDOW[0]), 0, 1) * 255).astype(np.uint8)
    return np.repeat(gray[:, :, None], 3, axis=2)


def with_outlines(base, labels, colors):
    out = base.copy()
    for label, color in colors.items():
        out[_outline(labels == label)] = color
    return out


def tick_positions(axis, index, low, high, width, height):
    fixed = "xyz".index(axis)
    remaining = [a for a in range(3) if a != fixed]
    # Columns are remaining[0], rows are remaining[1] reversed.
    x_ticks = list(range(int(low[remaining[0]]), int(high[remaining[0]]), 20))
    y_ticks = list(range(int(low[remaining[1]]), int(high[remaining[1]]), 20))
    return remaining, x_ticks, y_ticks


def render_panel(raw_plane, label_plane, axis, index, low, high, colors, title_prefix="Native100"):
    left = gray_rgb(raw_plane)
    right = with_outlines(left, label_plane, colors)
    h, w = left.shape[:2]
    margin_left, margin_top, margin_bottom = 62, 42, 42
    right_x = margin_left + w * SCALE + PANEL_GAP
    panel_w, panel_h = right_x + w * SCALE + 12, h * SCALE + margin_top + margin_bottom
    image = Image.new("RGB", (panel_w, panel_h), "#181818")
    draw = ImageDraw.Draw(image)
    remaining, x_ticks, y_ticks = tick_positions(axis, index, low, high, w, h)
    axis_names = "XYZ"
    title = f"{title_prefix} {axis.upper()}={index} | raw / current labels"
    draw.text((4, 4), title, fill="white")
    image.paste(Image.fromarray(left).resize((w * SCALE, h * SCALE), Image.Resampling.NEAREST), (margin_left, margin_top))
    image.paste(Image.fromarray(right).resize((w * SCALE, h * SCALE), Image.Resampling.NEAREST), (right_x, margin_top))
    for offset, label in ((margin_left, "RAW"), (right_x, "CURRENT LABEL OUTLINES")):
        draw.text((offset, panel_h - 17), label, fill="white")
        draw.line((offset, margin_top + h * SCALE, offset + w * SCALE, margin_top + h * SCALE), fill="#aaa")
        draw.line((offset - 1, margin_top, offset - 1, margin_top + h * SCALE), fill="#aaa")
        for value in x_ticks:
            x = offset + int((value - low[remaining[0]]) * SCALE)
            draw.line((x, margin_top + h * SCALE, x, margin_top + h * SCALE + 5), fill="#aaa")
            draw.text((x - 10, margin_top + h * SCALE + 6), str(value), fill="#bbb")
        for value in y_ticks:
            y = margin_top + int((high[remaining[1]] - 1 - value) * SCALE)
            draw.line((offset - 6, y, offset - 1, y), fill="#aaa")
            draw.text((offset - 48, y - 6), str(value), fill="#bbb")
        draw.text((offset + w * SCALE // 2 - 8, panel_h - 30), axis_names[remaining[0]], fill="#bbb")
        draw.text((offset - 55, margin_top + h * SCALE // 2), axis_names[remaining[1]], fill="#bbb")
    names = {46: "46 cyan", 43: "43 orange", 23: "23/24 blue", 25: "25 magenta", 42: "42 purple", 39: "39/40 yellow"}
    draw.text((4, 20), " | ".join(names[k] for k in colors if k in names), fill="#ddd")
    return image


def assert_raw_rectangle(panel, raw_plane):
    expected = np.asarray(Image.fromarray(gray_rgb(raw_plane)).resize(
        (raw_plane.shape[1] * SCALE, raw_plane.shape[0] * SCALE), Image.Resampling.NEAREST))
    actual = np.asarray(panel)[42:42 + expected.shape[0], 62:62 + expected.shape[1]]
    if not np.array_equal(actual, expected):
        raise AssertionError("Rendered RAW rectangle differs from gray_rgb native plane")


def main(output="work/fornix-anterior-next-20260919"):
    out = (ROOT / output).resolve()
    if out.exists():
        raise ValueError("Preserve existing evidence: output directory already exists")
    source = checked(ROOT / "work/full16_100um_optbal.mnc", SOURCE_SHA)
    label_bytes = DEFAULT_LABELS.read_bytes()
    if sha(label_bytes) != CURRENT_LABEL_SHA:
        raise ValueError("Current label source SHA does not match the requested post-adoption state")
    _, dims, labels = read_browser_volume(DEFAULT_LABELS, MAGIC_LABELS, CURRENT_LABEL_SHA)
    geometry_bytes = (ROOT / "public/atlas/bigbrain-icbm500-validation.json").read_bytes()
    affine = np.array(json.loads(geometry_bytes)["affine"])
    linear = load_linear()
    native_grid = load_native_grid()
    grids = load_published_grids("catmull-rom")
    with h5py.File(source, "r") as file:
        image_group = file["minc-2.0/image/0"]
        decoded, start, step, crop_meta = read_crop(image_group, LOW, HIGH)
    npz_path = out / "region.npz"
    out.mkdir(parents=True)
    np.savez_compressed(npz_path, decoded=decoded, start=start, step=step, lowXYZ=LOW, highExclusiveXYZ=HIGH)
    report = dict(
        sourcePath=source.relative_to(ROOT).as_posix(), sourceSha256=SOURCE_SHA,
        currentLabelPath=DEFAULT_LABELS.relative_to(ROOT).as_posix(), currentLabelSha256=CURRENT_LABEL_SHA,
        geometrySha256=sha(geometry_bytes), dimensionsXYZ=list(dims), lowXYZ=LOW.tolist(), highExclusiveXYZ=HIGH.tolist(),
        cropShapeXYZ=list(decoded.shape), nativeStartMm=start.tolist(), nativeStepMm=step.tolist(),
        cropMetadata=crop_meta, sourceHashVerified=True, decodedSha256=sha(decoded.tobytes()), decodedRegionPath=npz_path.relative_to(ROOT).as_posix(),
        intensityWindow=list(WINDOW), inverted=False, scale=SCALE,
        labelColors={str(k): list(v) for k, v in COLORS.items()}, planes=PLANES,
        mutation=False, adopted=False, expertReviewed=False, figures=[]
    )
    with h5py.File(source, "r"):
        for axis, indices in PLANES.items():
            for index in indices:
                raw_plane = axis_image(decoded, axis, index, LOW)
                label_plane = project_plane(labels, axis, index, LOW, HIGH, start, step, linear, native_grid, grids, affine)
                panel = render_panel(raw_plane, label_plane, axis, index, LOW, HIGH, COLORS)
                assert_raw_rectangle(panel, raw_plane)
                path = out / f"{axis}{index}.png"
                panel.save(path)
                report["figures"].append(dict(path=path.name, axis=axis, index=index, sha256=sha(path.read_bytes()), shape=list(panel.size)))
    for offset in range(0, len(report["figures"]), 4):
        chunk = report["figures"][offset:offset + 4]
        images = [Image.open(out / item["path"]) for item in chunk]
        width = max(im.width for im in images)
        height = max(im.height for im in images)
        sheet = Image.new("RGB", (width * 2, height * 2), "#eeeeee")
        draw = ImageDraw.Draw(sheet)
        for pos, (item, image) in enumerate(zip(chunk, images)):
            x, y = (pos % 2) * width, (pos // 2) * height
            sheet.paste(image, (x, y))
            draw.text((x + 4, y + 4), item["path"], fill="white")
        sheet.save(out / f"sheet-{offset // 4 + 1:02}.png")
    report["contactSheets"] = [p.name for p in sorted(out.glob("sheet-*.png"))]
    context_low = np.array([620, 780, 380], dtype=int)
    context_high = np.array([800, 961, 721], dtype=int)
    context_out = out / "context"
    with h5py.File(source, "r") as file:
        context_decoded, context_start, context_step, context_meta = read_crop(file["minc-2.0/image/0"], context_low, context_high)
    context_out.mkdir()
    context_npz = context_out / "region.npz"
    np.savez_compressed(context_npz, decoded=context_decoded, start=context_start, step=context_step,
                        lowXYZ=context_low, highExclusiveXYZ=context_high)
    context_figures = []
    for axis, indices in {"x": [665, 695, 725], "y": [910]}.items():
        for index in indices:
            raw_plane = axis_image(context_decoded, axis, index, context_low)
            label_plane = project_plane(labels, axis, index, context_low, context_high, context_start, context_step,
                                        linear, native_grid, grids, affine)
            panel = render_panel(raw_plane, label_plane, axis, index, context_low, context_high, CONTEXT_COLORS,
                                 title_prefix="Native100 context")
            assert_raw_rectangle(panel, raw_plane)
            path = context_out / f"{axis}{index}.png"
            panel.save(path)
            context_figures.append(dict(path=path.name, axis=axis, index=index, sha256=sha(path.read_bytes()), shape=list(panel.size)))
    for offset in range(0, len(context_figures), 4):
        chunk = context_figures[offset:offset + 4]
        images = [Image.open(context_out / item["path"]) for item in chunk]
        width = max(im.width for im in images)
        height = max(im.height for im in images)
        sheet = Image.new("RGB", (width * 2, height * 2), "#eeeeee")
        draw = ImageDraw.Draw(sheet)
        for pos, (item, image) in enumerate(zip(chunk, images)):
            x, y = (pos % 2) * width, (pos // 2) * height
            sheet.paste(image, (x, y))
            draw.text((x + 4, y + 4), item["path"], fill="white")
        sheet.save(context_out / f"sheet-{offset // 4 + 1:02}.png")
    report["rawPixelChecks"] = len(report["figures"]) + len(context_figures)
    report["context"] = dict(lowXYZ=context_low.tolist(), highExclusiveXYZ=context_high.tolist(), cropShapeXYZ=list(context_decoded.shape),
                              nativeStartMm=context_start.tolist(), nativeStepMm=context_step.tolist(), cropMetadata=context_meta,
                              sourceHashVerified=True, decodedSha256=sha(context_decoded.tobytes()), decodedRegionPath=context_npz.relative_to(ROOT).as_posix(), planes={"x": [665, 695, 725], "y": [910]},
                              labelColors={str(k): list(v) for k, v in CONTEXT_COLORS.items()}, figures=context_figures,
                              contactSheets=[p.name for p in sorted(context_out.glob("sheet-*.png"))])
    (out / "report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(dict(output=str(out), figures=len(report["figures"]), contactSheets=len(report["contactSheets"]), cropShapeXYZ=list(decoded.shape), sourceSha256=SOURCE_SHA, currentLabelSha256=CURRENT_LABEL_SHA)))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", default="work/fornix-anterior-next-20260919")
    main(parser.parse_args().output)
