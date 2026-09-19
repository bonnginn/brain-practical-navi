"""Stage the reviewed upper-column interior and mesh; never install assets."""
import argparse
import gzip
import json
from pathlib import Path

import numpy as np
from build_orthogonal_review_bundle import DEFAULT_LABELS, MAGIC_LABELS, read_browser_volume
from build_section_ventricle_meshes import reconstruct
from stage_aqueduct_fourth44 import ROOT, digest, encode

BASE_SHA = 'cb0e727292c6d677e26063a506b07dee793a7b5058f6bf8fb820d0dfbc106c74'
HERE = ROOT / 'work/fornix-column-interior-draft-20260919'
INPUTS = {'spec-v1.json': '85bccee3aebb6eaf193cc37ad469c4c28930045c0ec488b9e20133a9cd96e83a', 'sampling-v1/measurements.json': '3168fdd9f74c174fd335d4d67514b010c8cfcc6bd37b977a3ea70e0980480ef6', 'selected56.json': '317c838076dfc66a092c7d5d8082e7b6ef0456b0baee24d72a1184be599867d3'}


def replay(labels, points, reverse=False):
    if len(points) != 56:
        raise ValueError('Expected 56 reviewed points')
    out = labels.copy()
    seen = set()
    for p in points:
        xyz = p['xyz']
        if (not isinstance(xyz, list) or len(xyz) != 3
                or any(type(v) is not int or not 0 <= v < labels.shape[i] for i, v in enumerate(xyz))):
            raise ValueError('Invalid coordinate')
        key = tuple(xyz)
        if key in seen or p['before'] != 0 or p['after'] != 46 or p['side'] not in (1, 2):
            raise ValueError('Invalid or duplicate transition')
        seen.add(key)
        old, new = (46, 0) if reverse else (0, 46)
        if out[key] != old:
            raise ValueError('Label conflict')
        out[key] = new
    return out


def write_json(path, data):
    path.write_bytes((json.dumps(data, indent=2) + '\n').encode('utf-8'))


def stage(out):
    if out.exists():
        raise ValueError('Preserve existing evidence: choose a new directory')
    for name, expected in INPUTS.items():
        if digest((HERE / name).read_bytes()) != expected:
            raise ValueError('Evidence changed: ' + name)
    data = json.loads((HERE / 'selected56.json').read_text(encoding='utf-8'))
    _, _, before = read_browser_volume(DEFAULT_LABELS, MAGIC_LABELS, BASE_SHA)
    points = [dict(xyz=p['xyz'], before=p['before'], after=46, side=p['side']) for p in data['rows']]
    after = replay(before, points)
    if not np.array_equal(replay(after, points, True), before):
        raise ValueError('Reverse replay differs')
    if np.count_nonzero(before == 46) != 1630 or np.count_nonzero(after == 46) != 1686:
        raise ValueError('Unexpected body count')
    old_mesh, old_info = reconstruct((before == 46).transpose(2, 1, 0))
    installed_mesh = ROOT / 'public/atlas/section-current-fornix-body-partial.mesh'
    if gzip.decompress(installed_mesh.read_bytes()) != old_mesh:
        raise ValueError('Existing mesh does not match baseline labels')
    new_mesh, new_info = reconstruct((after == 46).transpose(2, 1, 0))
    if new_info['components6'] != 2:
        raise ValueError('Unexpected face-connected components')
    base = DEFAULT_LABELS.read_bytes()
    stored = encode(gzip.decompress(base)[:10] + after.tobytes(order='F'))
    mesh = encode(new_mesh)
    record = dict(beforeSha256=BASE_SHA, afterSha256=digest(stored),
                  afterRawVoxelSha256=digest(after.tobytes(order='F')), count=56, points=points,
                  transition='mixed-fornix-upper-column-interior-partial', countsBefore={'46': 1630},
                  countsAfter={'46': 1686}, sideAdditions={str(s): sum(p['side'] == s for p in points) for s in (1, 2)},
                  evidence=[dict(path=(HERE / n).relative_to(ROOT).as_posix(), sha256=h) for n, h in INPUTS.items()],
                  status='work-stage-only', adopted=False, installed=False, expertReviewed=False, published=False,
                  rationale='Retain 56 upper-column interior points supported by adjacent and orthogonal native100 and native40 source views. Exclude 2 medial cleft-edge voxels; do not claim whole columns or mammillary continuity.',
                  limitation='Partial upper-column interior, native40 Z745-650. Scope cuts are not anatomical boundaries. Crura, lower columns and mammillary continuity remain incomplete; integration review is pending.')
    out.mkdir(parents=True)
    (out / 'before.bin.gz').write_bytes(base)
    (out / 'labels.bin.gz').write_bytes(stored)
    (out / 'section-current-fornix-body-partial.mesh').write_bytes(mesh)
    write_json(out / 'repair.json', record)
    write_json(out / 'mesh-report.json', dict(before=old_info, after=new_info, sourceSha256=record['afterSha256'],
                                              compressedMeshSha256=digest(mesh), installed=False))
    if digest(DEFAULT_LABELS.read_bytes()) != BASE_SHA:
        raise ValueError('Product source changed during staging')
    print(json.dumps(dict(out=str(out), afterSha256=record['afterSha256'], sideAdditions=record['sideAdditions'], mesh=new_info)))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out', type=Path, default=ROOT / 'work/anatomy-review/fornix-column56-stage-v1')
    stage(parser.parse_args().out)
