"""Rebuild a left MGB reference surface, independent of specimen labels.

Uses the already image-reviewed, source-hash-pinned same-BigBrain projection.
This does not add an MGB label or change any application segmentation voxel.
"""
import hashlib
import json
from pathlib import Path

import numpy as np
from skimage.measure import marching_cubes

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "work/mgb-same-specimen-2026-10-01/mgb-app500-candidate.npz"
SHA = "a18dfa562df0a556085e54f9a243a6160ccbfd45f2ff59b1b7fa56bd7883a7b7"
PROJECTION = ROOT / "work/mgb-same-specimen-2026-10-01/projection-report.json"
assert hashlib.sha256(SOURCE.read_bytes()).hexdigest() == SHA
assert hashlib.sha256(PROJECTION.read_bytes()).hexdigest() == "b17b1ced5b3bd3cfdff7689a47c12c0110856a691705a5059d945a7f3b969d3c"
report = json.loads(PROJECTION.read_bytes())
provider_bytes = (SOURCE.parent / "provider-volumes.json").read_bytes()
assert hashlib.sha256(provider_bytes).hexdigest() == report["providerRecordSha256"]
provider = json.loads(provider_bytes)
a = np.load(SOURCE)
left_columns = ["left" in row["name"] for row in provider["volumes"]]
xyz = a["xyz"][a["subdivisions"][:, left_columns].any(axis=1)]
assert len(xyz) == report["sides"][0]["count"] == 571
assert len(np.unique(xyz, axis=0)) == 571
lo, hi = xyz.min(axis=0), xyz.max(axis=0)
assert lo.tolist() == report["sides"][0]["bboxMinXYZ"]
assert hi.tolist() == report["sides"][0]["bboxMaxXYZ"]
field = np.zeros(tuple(hi-lo+3), dtype=np.float32)
field[tuple((xyz-lo+1).T)] = 1
vertices, faces, _, _ = marching_cubes(field, level=.5, allow_degenerate=False)
vertices = (vertices+lo-1)*.5+np.array([-98., -116., -90.])
assert np.all(vertices[:, 0] < 0)
assert np.all(np.isfinite(vertices)) and faces.min() >= 0 and faces.max() < len(vertices)
# Every closed triangular edge has two incident faces; retain all components.
edges = np.sort(np.concatenate([faces[:, [0,1]], faces[:, [1,2]], faces[:, [2,0]]]), axis=1)
_, counts = np.unique(edges, axis=0, return_counts=True)
assert np.all(counts == 2)
result = dict(sourceDataset=report["doi"], license=report["license"], sourceSha256=SHA,
              side="left", sampledVoxelCount=571, coordinateOrder="XYZ display mm",
              method="Marching cubes level 0.5 on the reviewed app500 union; no smoothing, filling, component removal or mirroring.",
              scope="Published same-BigBrain reference surface in the location guide only; not an adopted segmentation label or expert validation.",
              verticesXYZmm=vertices.tolist(), faces=faces.tolist())
out = ROOT / "app/thalamusMgbSurface.json"
out.write_text(json.dumps(result, separators=(",", ":"))+"\n", encoding="utf-8")
print(json.dumps(dict(vertices=len(vertices), faces=len(faces), bytes=out.stat().st_size,
                      closedEdges=True, labelMutation=False)))
