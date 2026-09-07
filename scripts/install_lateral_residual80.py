"""Preflight the reviewed cisternal-side exclusion and all development representations."""
import argparse
import gzip
import json
import numpy as np
from stage_lateral_residual80 import ROOT, SHA, replay, digest, reviewed_points
from build_section_ventricle_meshes import build_assets, SOURCE, ATLAS

FINAL = 'a512880c4dcd1b1291664f8ee4aaa3bd8d609b62dd2e037634953cd7ebd12efd'
RAW = 'a972bd3e0e47d395112bfe29d7587aac0248e992a6720ce052f4c0b5da10c1d5'


def serialized(value):
    return (json.dumps(value, ensure_ascii=False, indent=2)+'\n').encode('utf-8')


def checked(path, sha):
    data = path.read_bytes()
    if digest(data) != sha:
        raise ValueError('Evidence changed: '+str(path))
    return json.loads(data)


def plan():
    work = ROOT/'work/anatomy-review'
    stage = work/'lateral-residual80-stage-v1'
    record = checked(stage/'repair.json', '7fa310a4165d7cb199235b37c483d45513b5bb33d24a0b0e864e66b229f2c722')
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
    mesh_dir = work/'lateral-residual80-meshes-v1'
    impact = checked(mesh_dir/'report.json', '4a9ec5e4a7d9a513d84548bafedb8c3d40429b7b7dab38eeeda12c77a58c6f21')
    direction = checked(work/'lateral-residual80-mask-direction-v1.json', 'c78242f56fe28126ab60944f8c112ef44f96dd2ac77719de3922cee5aec54516')
    manifest_path = ATLAS/'specimen-blocks.json'
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    expected = {(b, p['part']) for b, ps in manifest['specimens'].items() for p in ps}
    rows = impact['blockMaskImpact']
    if len(rows) != 55 or {(r['block'], r['part']) for r in rows} != expected:
        raise ValueError('Incomplete block coverage')
    if impact['inputSha256'] != SHA or impact['outputSha256'] != FINAL or impact['installationBlocked']:
        raise ValueError('Impact input mismatch')
    changes = [r for r in rows if r['changedMaskVoxels']]
    expected_changes = {('lateral-ventricle', 'tissue'): 1717, ('lateral-ventricle', 'ventricular-cavity'): 11,
                        ('choroid-plexus', 'tissue'): 857, ('choroid-plexus', 'ventricular-cavity'): 11,
                        ('medial-temporal', 'inferior-horn'): 11}
    if {(r['block'], r['part']): r['changedMaskVoxels'] for r in changes} != expected_changes:
        raise ValueError('Unexpected block impact')
    if any(r['added'] for r in direction['blockRows']):
        raise ValueError('Unexpected mask addition')
    retained = [(ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-lateral-residual80-7d2b.bin.gz', base)]
    writes = []
    for part in changes:
        name = part['file']
        old_mesh = (mesh_dir/('installed-'+name)).read_bytes()
        new_mesh = (mesh_dir/name).read_bytes()
        if (not part['beforeMatches'] or digest(old_mesh) != part['beforeSha256']
                or digest(new_mesh) != part['afterSha256'] or (ATLAS/name).read_bytes() not in (old_mesh, new_mesh)):
            raise ValueError('Block byte mismatch')
        retained.append((ROOT/'tests/fixtures'/(name[:-5]+'-pre-lateral-residual80.mesh'), old_mesh))
        writes.append((ATLAS/name, new_mesh))
        entry = next(p for p in manifest['specimens'][part['block']] if p['part'] == part['part'])
        entry.update(vertices=part['vertices'], faces=part['faces'], meshSha256=part['afterSha256'],
                     segmentationSourceSha256=FINAL,
                     repairReview='AI-image-reviewed cisternal-side ID24 exclusion; derived block crop updated. Development only, not expert review.')
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
    record_path = ROOT/'segmentation-patches/review/lateral-residual80-adoption-2026-09-07.json'
    record.update(status='AI-image-reviewed-project-adopted-development-only', adopted=True, projectAdopted=True,
                  expertReviewed=False, published=False, meshImpact=impact, maskDirection=direction,
                  sectionMeshImpact=dict(before=old_report, after=new_report, changedFiles=changed))
    record['limitation'] = 'Specific cistern unassigned; nearby 116-point component and other fragments untouched. Zero means unlabelled. Integration verification recorded separately; not expert review or publication.'
    record_data = serialized(record)
    retained.append((record_path, record_data))
    meta_path = ATLAS/'bigbrain-practical-segmentation-icbm500-validation.json'
    meta = json.loads(meta_path.read_text(encoding='utf-8'))
    if meta['rawVoxelSha256'] not in (digest(before_raw[10:]), RAW):
        raise ValueError('Metadata baseline differs')
    meta['rawVoxelSha256'] = RAW
    for ident in (0, 24):
        meta['labelCounts'][str(ident)] = int(np.count_nonzero(after == ident))
    meta['lateralResidual80Audit'] = dict(record=record_path.relative_to(ROOT).as_posix(), recordSha256=digest(record_data),
                                         changedVoxelCount=80, projectAdopted=True, expertReviewed=False,
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
