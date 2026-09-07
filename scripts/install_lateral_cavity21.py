"""Preflight the reviewed ventricular omission repair and all development representations."""
import argparse
import gzip
import json
import numpy as np
from stage_lateral_cavity21 import ROOT, SHA, replay, digest, reviewed_points
from build_section_ventricle_meshes import build_assets, SOURCE, ATLAS

FINAL = '3849b1bd3c9ccf6d68b8864644c7ac784cba00dceaa006ec4be329f3d217fa29'
RAW = '932c1924688c3d4e041868567bd1ce64c61e8acc61abb7a2904a80c0bb6e9819'


def serialized(value):
    return (json.dumps(value, ensure_ascii=False, indent=2)+'\n').encode('utf-8')


def checked(path, sha):
    data = path.read_bytes()
    if digest(data) != sha:
        raise ValueError('Evidence changed: '+str(path))
    return json.loads(data)


def plan():
    work = ROOT/'work/anatomy-review'
    stage = work/'lateral-cavity21-stage-v1'
    record = checked(stage/'repair.json', '50275ff60114f8e524ad7fa07f682ded7e1673e8fb9c2130b58b9122f18e9e82')
    base = (stage/'before.bin.gz').read_bytes()
    if digest(base) != SHA:
        raise ValueError('Baseline changed')
    before_raw = gzip.decompress(base)
    before = np.frombuffer(before_raw, np.uint8, offset=10).reshape((394, 466, 378), order='F')
    points = np.asarray(record['points'])
    measured, evidence = reviewed_points()
    if not np.array_equal(measured, points) or evidence != record['evidence']:
        raise ValueError('Review evidence changed')
    after = replay(before, points)
    data = gzip.compress(before_raw[:10]+after.tobytes(order='F'), mtime=0)
    if digest(data) != FINAL or digest(after.tobytes(order='F')) != RAW:
        raise ValueError('Reconstruction differs')
    if data != (stage/'labels.bin.gz').read_bytes() or not np.array_equal(replay(after, points, True), before):
        raise ValueError('Stage or reverse differs')
    if digest(SOURCE.read_bytes()) not in (SHA, FINAL):
        raise ValueError('Unrelated current labels')
    mesh_dir = work/'lateral-cavity21-meshes-v1'
    impact = checked(mesh_dir/'report.json', '589492d085c1f63e034476108aaac183183bd5de76affad1e1cb14f51cf66d2e')
    direction = checked(work/'lateral-cavity21-mask-direction-v1.json', '80a52f2c47325f31d3fc65587e8a96c73972656cac35ee52d9d660e06ebd48a9')
    manifest_path = ATLAS/'specimen-blocks.json'
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    expected = {(b, p['part']) for b, ps in manifest['specimens'].items() for p in ps}
    rows = impact['blockMaskImpact']
    if len(rows) != 55 or {(r['block'], r['part']) for r in rows} != expected:
        raise ValueError('Incomplete block coverage')
    if impact['inputSha256'] != SHA or impact['outputSha256'] != FINAL or impact['installationBlocked']:
        raise ValueError('Impact input mismatch')
    changes = [r for r in rows if r['changedMaskVoxels']]
    expected_changes = {('lateral-ventricle', 'tissue'): 39, ('lateral-ventricle', 'ventricular-cavity'): 3,
                        ('choroid-plexus', 'tissue'): 37, ('choroid-plexus', 'ventricular-cavity'): 3,
                        ('medial-temporal', 'tissue'): 1, ('medial-temporal', 'inferior-horn'): 3}
    if {(r['block'], r['part']): r['changedMaskVoxels'] for r in changes} != expected_changes:
        raise ValueError('Unexpected block impact')
    expected_direction = {('lateral-ventricle','tissue'):(38,1), ('lateral-ventricle','ventricular-cavity'):(3,0),
                          ('choroid-plexus','tissue'):(36,1), ('choroid-plexus','ventricular-cavity'):(3,0),
                          ('medial-temporal','tissue'):(0,1), ('medial-temporal','inferior-horn'):(3,0)}
    if (len(direction['blockRows']) != 55 or {(r['block'],r['part']) for r in direction['blockRows']} != expected
            or {(r['block'],r['part']):(r['added'],r['removed']) for r in direction['blockRows'] if r['added'] or r['removed']} != expected_direction):
        raise ValueError('Unexpected mask directions')
    retained = [(ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-lateral-cavity21-a512.bin.gz', base)]
    writes = []
    for part in changes:
        name = part['file']
        old_mesh = (mesh_dir/('installed-'+name)).read_bytes()
        new_mesh = (mesh_dir/name).read_bytes()
        if (not part['beforeMatches'] or digest(old_mesh) != part['beforeSha256']
                or digest(new_mesh) != part['afterSha256'] or (ATLAS/name).read_bytes() not in (old_mesh, new_mesh)):
            raise ValueError('Block byte mismatch')
        retained.append((ROOT/'tests/fixtures'/(name[:-5]+'-pre-lateral-cavity21.mesh'), old_mesh))
        writes.append((ATLAS/name, new_mesh))
        entry = next(p for p in manifest['specimens'][part['block']] if p['part'] == part['part'])
        entry.update(vertices=part['vertices'], faces=part['faces'], meshSha256=part['afterSha256'],
                     segmentationSourceSha256=FINAL,
                     repairReview='AI-image-reviewed local 0-to-ID24 cavity repair; derived block crop updated. Development only, not expert review.')
    old_report, old_assets = build_assets(base)
    new_report, new_assets = build_assets(data)
    changed = []
    for name, payload in new_assets.items():
        current = (ATLAS/name).read_bytes()
        equal = json.loads(current) in (json.loads(old_assets[name]), json.loads(payload)) if name.endswith('.json') else current in (old_assets[name], payload)
        if not equal:
            raise ValueError('Unrelated current section asset: '+name)
        if name.endswith('.mesh') and payload != old_assets[name]:
            changed.append(name)
    if set(changed) != {'section-current-lateral-ventricles.mesh', 'section-current-ventricular-system.mesh'}:
        raise ValueError('Unexpected section impact')
    record_path = ROOT/'segmentation-patches/review/lateral-cavity21-adoption-2026-09-07.json'
    record.update(status='AI-image-reviewed-project-adopted-development-only', adopted=True, projectAdopted=True,
                  expertReviewed=False, published=False, meshImpact=impact, maskDirection=direction,
                  sectionMeshImpact=dict(before=old_report, after=new_report, changedFiles=changed))
    record['limitation'] = 'Only 21 reviewed omissions added. Existing labels retained; crop-edge and partial-support omissions remain unresolved. Integration verification recorded separately; not expert review or publication.'
    record_data = serialized(record)
    retained.append((record_path, record_data))
    meta_path = ATLAS/'bigbrain-practical-segmentation-icbm500-validation.json'
    meta = json.loads(meta_path.read_text(encoding='utf-8'))
    if meta['rawVoxelSha256'] not in (digest(before_raw[10:]), RAW):
        raise ValueError('Metadata baseline differs')
    meta['rawVoxelSha256'] = RAW
    for ident in (0, 24):
        meta['labelCounts'][str(ident)] = int(np.count_nonzero(after == ident))
    meta['lateralCavity21Audit'] = dict(record=record_path.relative_to(ROOT).as_posix(), recordSha256=digest(record_data),
                                         changedVoxelCount=21, projectAdopted=True, expertReviewed=False,
                                         changedBlockPartMasks=[r['file'] for r in changes], changedSectionMeshes=changed)
    for path, payload in retained:
        if path.exists() and path.read_bytes() != payload:
            raise ValueError('Retained evidence differs')
    return retained+writes+[(SOURCE, data), (meta_path, serialized(meta)), (manifest_path, serialized(manifest))]+[(ATLAS/n, b) for n, b in new_assets.items()]


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    changes = plan()
    if args.apply:
        for path, data in changes:
            path.write_bytes(data)
    print(json.dumps(dict(preflightPassed=True, applied=args.apply, files=[p.relative_to(ROOT).as_posix() for p, _ in changes])))
