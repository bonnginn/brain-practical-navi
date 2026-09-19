"""Stage the reviewed anterior body candidate and mesh; never install assets."""
import argparse
import gzip
import json
from pathlib import Path

import numpy as np
from build_orthogonal_review_bundle import DEFAULT_LABELS, MAGIC_LABELS, read_browser_volume
from build_section_ventricle_meshes import reconstruct
from stage_aqueduct_fourth44 import ROOT, digest, encode

BASE_SHA = 'a009c09fbcf2d13eb28de9a27830c6bcd0572d3b825cf9554b5879ca11efb707'
HERE = ROOT / 'work/fornix-descent-draft-20260919'
INPUTS = {'spec-v1.json': '72d97ddfd21147be2ef922e449c78a4a3893b5ac259f1a64cd63d20081b60010', 'sampling-v1/measurements.json': '8b2087761285e31c6dee30b7a75c107535fccfdf153b076443ab81d193527a49', 'generated-v2/candidate.json': '304529135e31e9275ec94ec41eab12028a4dc14014f1f5e4b7781b039fdc6210'}


def replay(labels, points, reverse=False):
    if len(points) != 108:
        raise ValueError('Expected 108 reviewed points')
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
    data = json.loads((HERE / 'generated-v2/candidate.json').read_text(encoding='utf-8'))
    _, _, before = read_browser_volume(DEFAULT_LABELS, MAGIC_LABELS, BASE_SHA)
    points = [dict(xyz=p['xyz'], before=p['before'], after=46, side=p['side']) for p in data['rows']]
    after = replay(before, points)
    if not np.array_equal(replay(after, points, True), before):
        raise ValueError('Reverse replay differs')
    if np.count_nonzero(before == 46) != 1522 or np.count_nonzero(after == 46) != 1630:
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
                  afterRawVoxelSha256=digest(after.tobytes(order='F')), count=108, points=points,
                  transition='mixed-fornix-descent-interior-partial', countsBefore={'46': 1522},
                  countsAfter={'46': 1630}, sideAdditions={str(s): sum(p['side'] == s for p in points) for s in (1, 2)},
                  evidence=[dict(path=(HERE / n).relative_to(ROOT).as_posix(), sha256=h) for n, h in INPUTS.items()],
                  status='work-stage-only', adopted=False, installed=False, expertReviewed=False, published=False,
                  rationale='Retain 108 interior continuation points supported by adjacent and orthogonal native100 images and native40 source comparison. Do not extend into the lower attachment or claim a complete column.',
                  limitation='Partial anterior descent interior only, native100 Y900-910. Scope cuts are not anatomical boundaries. Crura and columns remain incomplete; integration review is pending.')
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
    parser.add_argument('--out', type=Path, default=ROOT / 'work/anatomy-review/fornix-descent108-stage-v1')
    stage(parser.parse_args().out)
