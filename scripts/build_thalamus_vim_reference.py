"""Transform the published single-section BigBrain VIM annotation for a teaching guide.

No label mutation, nucleus extrusion or inferred three-dimensional boundary.
The separately retained source is pinned to siibra-python's figure-6 example.
"""
import hashlib
import json
from pathlib import Path

import numpy as np

from audit_native_roi_transform import load_linear, load_native_grid, GRID_SHA, LIN_SHA, NL_SHA
from build_section_ventricle_meshes import DISPLAY_ORIGIN_ZYX
from render_trigeminal_native100_review import native_points
from review_bigbrain_grid_transform import load_published_grids, forward_chain, GRID_SHAS, XFM_SHA

ROOT = Path(__file__).resolve().parents[1]
SOURCE_SHA = "823b136c18204da3d1edd19da137d4e52e373017e66db6216129a5a5855793bc"
COMMIT = "e1bf71cf74d63fa00f93d38369ca50a8a8201ade"
SPACE = "minds/core/referencespace/v1.0.0/a1655b99-82f1-420f-a3c2-fe80fd4c8588"


def build():
    path = ROOT / "work/anatomy-review/thalamus-vim-reference-2026-10-01/e2ec8c09.sands.json"
    data = path.read_bytes()
    assert hashlib.sha256(data).hexdigest() == SOURCE_SHA
    source = json.loads(data)
    assert source["coordinateSpace"]["@id"] == SPACE and source["closed"] is True
    for row in source["coordinates"]:
        assert len(row) == 3
        assert all(v["unit"]["@id"].endswith("/millimeter") for v in row)
    points = np.array([[v["value"] for v in row] for row in source["coordinates"]])
    assert points.shape == (71, 3) and np.isfinite(points).all()
    assert np.all(points[:, 1] == 5.93)
    # A representative centre of this 2D polygon, not the centre of a nucleus volume.
    x, z = points[:, 0], points[:, 2]
    nx, nz = np.roll(x, -1), np.roll(z, -1)
    cross = x * nz - nx * z
    twice_area = cross.sum()
    assert abs(twice_area) > 1
    centre = np.array([((x + nx) * cross).sum() / (3 * twice_area), 5.93,
                       ((z + nz) * cross).sum() / (3 * twice_area)])
    native = np.vstack((points, centre))
    linear = load_linear()
    grid = load_native_grid()
    improved = load_published_grids("catmull-rom")
    world = forward_chain(improved, grid.forward(native @ linear[:, :3].T + linear[:, 3]))
    back, error = native_points(world, improved, grid, linear)
    assert np.max(np.abs(back - native)) < 1e-4
    affine = np.array(json.loads((ROOT / "public/atlas/bigbrain-icbm500-validation.json").read_bytes())["affine"])
    indices = (np.linalg.inv(affine) @ np.c_[world, np.ones(len(world))].T).T[:, :3]
    display = indices * .5 + DISPLAY_ORIGIN_ZYX[::-1]
    return {
        "sourceUrl": f"https://github.com/FZJ-INM1-BDA/siibra-python/blob/{COMMIT}/examples/tutorials/e2ec8c09.sands.json",
        "sourceCommit": COMMIT, "sourceSha256": SOURCE_SHA,
        "sourceLicense": "Apache-2.0", "sourceCoordinateSpace": SPACE,
        "sourceAnnotationName": source["siibra:explorer"]["name"],
        "section": 3797, "nativePlaneYmm": 5.93,
        "scope": "Single-section literature reference contour; not a 3D nuclear segmentation or an extruded volume.",
        "modifications": "Validated native-to-application registration; XYZ display projection; polygon representative centre. No specimen labels changed.",
        "nativeContourXYZmm": points.tolist(),
        "displayContourXYZmm": display[:-1].round(6).tolist(),
        "displayReferencePointXYZmm": display[-1].round(6).tolist(),
        "maximumRoundtripErrorMm": float(error.max()),
        "mappingHashes": {"nativeGrid": GRID_SHA, "linear": LIN_SHA, "nonlinear": NL_SHA,
                          "improvedGrids": GRID_SHAS, "improvedTransform": XFM_SHA},
    }


if __name__ == "__main__":
    result = build()
    path = ROOT / "app/thalamusVimReference.json"
    path.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"71 contour points; section {result['section']}; max roundtrip {result['maximumRoundtripErrorMm']:.3g} mm")
