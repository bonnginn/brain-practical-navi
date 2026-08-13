#!/usr/bin/env python3
"""Build representative same-subject MRI/histology fusion previews."""
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "work/pydeps"))

import nibabel as nib
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy.ndimage import gaussian_filter, map_coordinates

SRC = ROOT / "work/atlas-source"
OUT = ROOT / "work/guided-preview"


def robust01(data: np.ndarray, mask: np.ndarray, low=.5, high=99.5) -> np.ndarray:
    lo, hi = np.percentile(data[mask], [low, high])
    return np.clip((data - lo) / max(1e-6, hi - lo), 0, 1)


def resample_histology(hist_img: nib.Nifti1Image, target_img: nib.Nifti1Image) -> np.ndarray:
    """Linear resampling, preserving the target MRI x/y/z voxel grid."""
    target_shape = target_img.shape[:3]
    transform = np.linalg.inv(hist_img.affine) @ target_img.affine
    hist_data = np.asanyarray(hist_img.dataobj)
    out = np.empty(target_shape, dtype=np.float32)
    # Work one target z plane at a time to keep memory use modest.
    xx, yy = np.meshgrid(
        np.arange(target_shape[0], dtype=np.float32),
        np.arange(target_shape[1], dtype=np.float32),
        indexing="ij",
    )
    ones = np.ones(xx.size, dtype=np.float32)
    for z in range(target_shape[2]):
        target = np.vstack((xx.ravel(), yy.ravel(), np.full(xx.size, z), ones))
        source = transform @ target
        out[:, :, z] = map_coordinates(
            hist_data,
            source[:3].reshape(3, *xx.shape),
            order=1,
            mode="constant",
            cval=65535,
            prefilter=False,
        )
    return out


def specimen_rgb(value: np.ndarray, detail: np.ndarray | float = 0) -> np.ndarray:
    value = np.clip(value + detail, 0, 1)
    edge = np.clip(np.abs(detail) * 1.4, 0, .16)
    rgb = np.stack((.16 + .78 * value, .13 + .69 * value, .10 + .57 * value), axis=-1)
    rgb -= edge[..., None] if isinstance(edge, np.ndarray) else edge
    return np.clip(rgb * 255, 0, 255).astype(np.uint8)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    fixed_img = nib.load(SRC / "bigbrain-fixed-mri-0444.nii.gz")
    hist_img = nib.load(SRC / "bigbrain-400um.nii.gz")
    fixed = np.asanyarray(fixed_img.dataobj).astype(np.float32)
    hist = resample_histology(hist_img, fixed_img)
    fixed_mask = fixed > 0
    mri = robust01(fixed, fixed_mask)

    # BigBrain background is near 65535. Normalize only the tissue-bearing range,
    # then use its band-pass component as genuine same-subject edge information.
    hist_mask = (hist > 1000) & (hist < 65000)
    hist_tone = robust01(hist, hist_mask, 1, 99)
    hist_tone *= hist_mask
    detail = gaussian_filter(hist_tone, .55) - gaussian_filter(hist_tone, 2.1)
    detail /= max(.001, float(np.percentile(np.abs(detail[hist_mask]), 98)))
    detail = np.clip(detail, -.55, .55)
    guided = np.clip(mri + .24 * detail, 0, 1)

    # Representative coronal slices around the thalamic/ventricular region.
    ys = [int(fixed.shape[1] * q) for q in (.38, .50, .62)]
    rows = []
    font = ImageFont.load_default()
    for y in ys:
        mask2 = fixed_mask[:, y, :].T[::-1]
        mri2 = mri[:, y, :].T[::-1]
        hist2 = hist_tone[:, y, :].T[::-1]
        detail2 = detail[:, y, :].T[::-1]
        guided2 = guided[:, y, :].T[::-1]
        panels = [
            specimen_rgb(mri2),
            np.repeat((np.clip(hist2, 0, 1) * 255).astype(np.uint8)[..., None], 3, axis=-1),
            specimen_rgb(guided2),
        ]
        panels = [np.where(mask2[..., None], panel, np.array([23, 27, 28], np.uint8)) for panel in panels]
        row = Image.new("RGB", (fixed.shape[0] * 3 + 28, fixed.shape[2] + 34), (244, 241, 235))
        for i, panel in enumerate(panels):
            row.paste(Image.fromarray(panel), (i * (fixed.shape[0] + 14), 28))
        draw = ImageDraw.Draw(row)
        for i, label in enumerate(("MRI 0.444 mm", "Histology guide", "Guided reconstruction")):
            draw.text((i * (fixed.shape[0] + 14) + 5, 8), label, fill=(40, 38, 34), font=font)
        rows.append(row)
    sheet = Image.new("RGB", (rows[0].width, sum(r.height for r in rows) + 20), (244, 241, 235))
    y0 = 10
    for row in rows:
        sheet.paste(row, (0, y0)); y0 += row.height
    sheet.save(OUT / "same-subject-guided-comparison.png")
    np.savez_compressed(
        OUT / "guided-volume-pilot.npz",
        mri=(mri * 255).astype(np.uint8),
        guided=(guided * 255).astype(np.uint8),
        mask=fixed_mask.astype(np.uint8),
    )
    print({
        "fixed_shape": fixed.shape,
        "hist_shape": hist_img.shape,
        "fixed_affine": fixed_img.affine.tolist(),
        "hist_affine": hist_img.affine.tolist(),
        "preview": str(OUT / "same-subject-guided-comparison.png"),
    })


if __name__ == "__main__":
    main()
