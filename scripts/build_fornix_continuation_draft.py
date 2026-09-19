"""Build an unapplied fornix continuation candidate from native contour specs."""
import argparse
import hashlib
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from audit_native_roi_transform import checked, load_linear, load_native_grid  # noqa: E402
from build_orthogonal_review_bundle import DEFAULT_LABELS, MAGIC_LABELS, _outline, read_browser_volume  # noqa: E402
from read_native100_crop import read_crop  # noqa: E402
from render_fornix_native100_connection import sample_native_labels  # noqa: E402
from render_trigeminal_native100_review import native_points  # noqa: E402
from review_bigbrain_grid_transform import forward_chain, load_published_grids  # noqa: E402

SCALE = 4
WINDOW = (40000, 65535)
APP_ORIGIN = np.array([-98.0, -134.0, -72.0])
APP_STEP = np.array([0.5, 0.5, 0.5])
CURRENT_COLORS = {46: (0, 220, 235), 43: (255, 145, 20), 23: (55, 145, 255), 24: (55, 145, 255), 25: (240, 50, 205)}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def inside(point, polygon):
    x, y = point
    hit = False
    for (a, b), (c, d) in zip(polygon, np.roll(polygon, 1, axis=0)):
        if (b > y) != (d > y) and x < (c - a) * (y - b) / (d - b) + a:
            hit = not hit
    return hit


def interpolated_polygon(contours, y):
    anchors = sorted(contours)
    if y < anchors[0] or y > anchors[-1]:
        return None
    if y == anchors[-1]:
        return contours[anchors[-1]]
    hi = next(i for i in range(1, len(anchors)) if y <= anchors[i])
    a, b = anchors[hi - 1], anchors[hi]
    t = (y - a) / (b - a)
    return contours[a] * (1 - t) + contours[b] * t


def native_to_app(native_xyz, start, step, linear, native_grid, grids, affine):
    world = np.asarray(native_xyz, dtype=float) * step + start
    registered = forward_chain(grids, native_grid.forward(world @ linear[:, :3].T + linear[:, 3]))
    return (registered - affine[:3, 3]) / np.diag(affine)[:3]


def gray_rgb(values):
    gray = np.rint(np.clip((values - WINDOW[0]) / (WINDOW[1] - WINDOW[0]), 0, 1) * 255).astype(np.uint8)
    return np.repeat(gray[:, :, None], 3, axis=2)


def plane_image(values, axis, index, low):
    a = "xyz".index(axis)
    local = int(index) - int(low[a])
    if not 0 <= local < values.shape[a]:
        raise ValueError(f"Plane {axis}{index} is outside cached region")
    return np.take(values, local, axis=a).T[::-1, :]


def project_plane(labels, axis, index, low, high, start, step, linear, native_grid, grids, affine):
    a = "xyz".index(axis)
    shape = tuple(int(high[k] - low[k]) for k in range(3) if k != a)
    uv = np.indices(shape).reshape(2, -1).T
    coords = np.empty((len(uv), 3), dtype=float)
    coords[:, a] = index
    rem = [k for k in range(3) if k != a]
    for i, k in enumerate(rem):
        coords[:, k] = uv[:, i] + low[k]
    return sample_native_labels(labels, coords, start, step, linear, native_grid, grids, affine).reshape(shape).T[::-1, :]


def outline_rgb(base, labels, colors):
    result = base.copy()
    for label, color in colors.items():
        result[_outline(labels == label)] = color
    return result


def render_three(raw, current, candidate, axis, index, low, high):
    raw_rgb = gray_rgb(raw)
    current_rgb = outline_rgb(raw_rgb, current, CURRENT_COLORS)
    candidate_rgb = outline_rgb(raw_rgb, candidate, {1: (255, 245, 70), 2: (120, 255, 90)})
    h, w = raw.shape
    margin_left, margin_top, margin_bottom, gap = 62, 42, 42, 72
    pane_w, pane_h = w * SCALE, h * SCALE
    offsets = [margin_left, margin_left + pane_w + gap, margin_left + 2 * (pane_w + gap)]
    width = offsets[-1] + pane_w + 12
    image = Image.new("RGB", (width, pane_h + margin_top + margin_bottom), "#181818")
    panels = [raw_rgb, current_rgb, candidate_rgb]
    for offset, panel, name in zip(offsets, panels, ["RAW", "CURRENT LABELS", "CANDIDATE VOXEL RANGE"]):
        image.paste(Image.fromarray(panel).resize((pane_w, pane_h), Image.Resampling.NEAREST), (offset, margin_top))
        ImageDraw.Draw(image).text((offset, image.height - 17), name, fill="white")
    draw = ImageDraw.Draw(image)
    fixed = "xyz".index(axis)
    rem = [k for k in range(3) if k != fixed]
    ticks = [list(range(int(low[k]), int(high[k]), 20)) for k in rem]
    for offset in offsets:
        draw.line((offset - 1, margin_top, offset - 1, margin_top + pane_h), fill="#aaa")
        draw.line((offset, margin_top + pane_h, offset + pane_w, margin_top + pane_h), fill="#aaa")
        for value in ticks[0]:
            x = offset + (value - low[rem[0]]) * SCALE
            draw.line((x, margin_top + pane_h, x, margin_top + pane_h + 5), fill="#aaa")
            draw.text((x - 10, margin_top + pane_h + 6), str(value), fill="#bbb")
        for value in ticks[1]:
            y = margin_top + (high[rem[1]] - 1 - value) * SCALE
            draw.line((offset - 6, y, offset - 1, y), fill="#aaa")
            draw.text((offset - 48, y - 6), str(value), fill="#bbb")
        draw.text((offset + pane_w // 2 - 8, image.height - 30), "XYZ"[rem[0]], fill="#bbb")
        draw.text((offset - 55, margin_top + pane_h // 2), "XYZ"[rem[1]], fill="#bbb")
    draw.text((4, 4), f"Native100 {axis.upper()}={index}: RAW / CURRENT / UNAPPLIED CANDIDATE", fill="white")
    draw.text((4, 20), "46 cyan | 43 orange | 23/24 blue | 25 magenta | side1 yellow | side2 green", fill="#ddd")
    return image


def main(spec_path, out):
    if out.exists():
        raise ValueError("Preserve existing evidence: output directory already exists")
    spec = json.loads(spec_path.read_text(encoding="utf-8"))
    for key in ("cachePath", "cacheSha256", "decodedSha256", "labelSha256", "contoursNativeXZ"):
        if key not in spec:
            raise ValueError(f"Spec missing {key}")
    cache_path = checked(ROOT / spec["cachePath"], spec["cacheSha256"])
    cache = np.load(cache_path)
    if sha(cache_path.read_bytes()) != spec["cacheSha256"] or sha(cache["decoded"].tobytes()) != spec["decodedSha256"]:
        raise ValueError("Native cache hash mismatch")
    low = np.asarray(cache["lowXYZ"], dtype=int)
    if "lowXYZ" in spec and not np.array_equal(low, np.asarray(spec["lowXYZ"], dtype=int)):
        raise ValueError("Spec lowXYZ does not match native cache")
    decoded = cache["decoded"]
    high = low + np.asarray(decoded.shape, dtype=int)
    start, step = cache["start"], cache["step"]
    _, _, labels = read_browser_volume(DEFAULT_LABELS, MAGIC_LABELS, spec["labelSha256"])
    affine = np.array(json.loads((ROOT / "public/atlas/bigbrain-icbm500-validation.json").read_text())["affine"])
    if not np.array_equal(APP_ORIGIN, affine[:3, 3]) or not np.array_equal(APP_STEP, np.diag(affine)[:3]):
        raise ValueError("App origin/step differs from the official affine")
    linear, native_grid, grids = load_linear(), load_native_grid(), load_published_grids("catmull-rom")
    contours = {}
    anchors = None
    for side in ("left", "right"):
        raw_side = spec["contoursNativeXZ"][side]
        current = {int(y): np.asarray(points, dtype=float) for y, points in raw_side.items()}
        if len(current) < 2 or len({len(p) for p in current.values()}) != 1:
            raise ValueError(f"{side} contours must have equal vertex counts at every anchor")
        contours[side] = current
        if anchors is None:
            anchors = sorted(current)
        elif sorted(current) != anchors:
            raise ValueError("Left and right contour anchors differ")
    vertices = np.array([[x, y, z] for side in contours.values() for y, poly in side.items() for x, z in poly])
    app_vertices = native_to_app(np.column_stack((vertices[:, 0], vertices[:, 1], vertices[:, 2])), start, step, linear, native_grid, grids, affine)
    app_low = np.floor(app_vertices.min(0)).astype(int) - 2
    app_high = np.ceil(app_vertices.max(0)).astype(int) + 3
    if np.any(app_low < 0) or np.any(app_high > np.asarray(labels.shape)):
        raise ValueError("Candidate app bbox lies outside the current label grid")
    app_xyz = np.indices(tuple(app_high - app_low)).reshape(3, -1).T + app_low
    native, errors = native_points(app_xyz * APP_STEP + APP_ORIGIN, grids, native_grid, linear)
    native_q = (native - start) / step
    label_values = labels[tuple(app_xyz.T)]
    claims = {}
    for i, q in enumerate(native_q):
        y = q[1]
        if y < anchors[0] or y > anchors[-1]:
            continue
        for side_number, side in enumerate(("left", "right"), 1):
            polygon = interpolated_polygon(contours[side], y)
            if inside(q[[0, 2]], polygon):
                claims.setdefault(tuple(app_xyz[i]), []).append((side_number, i))
    rows, existing46, excluded = [], [], []
    claim_counts = {}
    for xyz in sorted(claims):
        indices = claims[xyz]
        i = indices[0][1]
        value = int(labels[xyz])
        claim_counts[str(value)] = claim_counts.get(str(value), 0) + 1
        if value == 46:
            existing46.append(dict(xyz=[int(v) for v in xyz], sides=[int(s) for s, _ in indices]))
            continue
        if value != 0 or len(indices) != 1:
            excluded.append(dict(xyz=[int(v) for v in xyz], before=value, sides=[int(s) for s, _ in indices], reason="label-collision" if value else "side-overlap"))
            continue
        q = native_q[i]
        rows.append(dict(xyz=[int(v) for v in xyz], side=int(indices[0][0]), before=0, nativeXYZ=q.tolist(),
                         forwardRoundtripErrorMm=float(errors[i])))
    candidate_mask = np.zeros(labels.shape, dtype=np.uint8)
    for row in rows:
        candidate_mask[tuple(row["xyz"])] = row["side"]
    out.mkdir(parents=True)
    figures = []
    plane_y = list(range(max(int(low[1]), anchors[0] - 3), min(int(high[1]) - 1, anchors[-1] + 3) + 1))
    requested = dict(y=plane_y, x=list(spec.get("orthogonalPlanesNative", {}).get("x", [])), z=list(spec.get("orthogonalPlanesNative", {}).get("z", [])))
    for axis, planes in requested.items():
        for index in planes:
            raw = plane_image(decoded, axis, index, low)
            current = project_plane(labels, axis, index, low, high, start, step, linear, native_grid, grids, affine)
            candidate = project_plane(candidate_mask, axis, index, low, high, start, step, linear, native_grid, grids, affine)
            panel = render_three(raw, current, candidate, axis, index, low, high)
            expected = np.asarray(Image.fromarray(gray_rgb(raw)).resize((raw.shape[1] * SCALE, raw.shape[0] * SCALE), Image.Resampling.NEAREST))
            actual = np.asarray(panel)[42:42 + expected.shape[0], 62:62 + expected.shape[1]]
            if not np.array_equal(actual, expected):
                raise AssertionError("RAW rectangle changed during rendering")
            path = out / f"{axis}{index}.png"
            panel.save(path)
            figures.append(dict(file=path.name, axis=axis, index=index, sha256=sha(path.read_bytes())))
    report = dict(specSha256=sha(spec_path.read_bytes()), cachePath=spec["cachePath"], cacheSha256=spec["cacheSha256"], decodedSha256=spec["decodedSha256"], labelSha256=spec["labelSha256"], lowXYZ=low.tolist(), highExclusiveXYZ=high.tolist(), nativeStartMm=start.tolist(), nativeStepMm=step.tolist(), appBoundsXYZ=[app_low.tolist(), app_high.tolist()], anchorsNativeY=anchors, planes=requested, rows=rows, existing46=existing46, excluded=excluded, beforeCounts=claim_counts, candidateCount=len(rows), maxRoundtripErrorMm=float(errors.max()), figures=figures, rawPixelChecks=len(figures), adopted=False, labelsWritten=False, anatomyInferred=False)
    (out / "candidate.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    (out / "report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(dict(output=str(out), candidateCount=len(rows), existing46=len(existing46), excluded=len(excluded), figures=len(figures), maxRoundtripErrorMm=report["maxRoundtripErrorMm"])))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--spec", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    main(args.spec.resolve(), args.out.resolve())
