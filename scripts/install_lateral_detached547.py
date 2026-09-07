"""Preflight the reviewed sulcal exclusion and all development representations."""
import argparse
import gzip
import json
import numpy as np
from stage_lateral_detached547 import ROOT, SHA, replay, digest, validate_review
from build_section_ventricle_meshes import build_assets, SOURCE, ATLAS

FINAL = '7d2b88c3e966b9633571e1d5cfe4d86a99439e2ea7873c672217abd4c235a1f2'
RAW = 'c82bde4c3ea2c79bdd29ff4a964bc48f7169f1cbac089f9d323fbe7078cd7fff'


def serialized(value):
    return (json.dumps(value, ensure_ascii=False, indent=2)+'\n').encode('utf-8')


def checked(path, sha):
    data = path.read_bytes()
    if digest(data) != sha:
        raise ValueError('Evidence changed: '+str(path))
    return json.loads(data)


def plan():
    work = ROOT/'work/anatomy-review'
    stage = work/'lateral-detached547-stage-v1'
    record = checked(stage/'repair.json', 'd8655c4d9a7f356b97d589b96ac5671cfc9923ede5932ecb40a594b3a83bfba6')
    base = (stage/'before.bin.gz').read_bytes()
    if digest(base) != SHA:
        raise ValueError('Baseline changed')
    before_raw = gzip.decompress(base)
    before = np.frombuffer(before_raw, np.uint8, offset=10).reshape((394, 466, 378), order='F')
    points = np.asarray(record['points'])
    for axis, item in zip('xyz', record['evidence']):
        path = ROOT/item['path']
        review = checked(path, item['sha256'])
        if not np.array_equal(validate_review(review, axis), points):
            raise ValueError('Review points changed')
        for f in review['figures']:
            if digest((path.parent/f['path']).read_bytes()) != f['sha256']:
                raise ValueError('Figure changed')
    if len(record['evidence']) != 3:
        raise ValueError('Missing review axis')
    after = replay(before, points)
    data = gzip.compress(before_raw[:10]+after.tobytes(order='F'), mtime=0)
    if digest(data) != FINAL or digest(after.tobytes(order='F')) != RAW:
        raise ValueError('Reconstruction differs')
    if data != (stage/'labels.bin.gz').read_bytes() or not np.array_equal(replay(after, points, True), before):
        raise ValueError('Stage or reverse differs')
    if digest(SOURCE.read_bytes()) not in (SHA, FINAL):
        raise ValueError('Unrelated current labels')
    mesh_dir = work/'lateral-detached547-meshes-v1'
    impact = checked(mesh_dir/'report.json', '9adfea8cf97facd6a1689ddb87983bef04eb142ef0d2cd24fde39eb217ecd8b5')
    direction = checked(work/'lateral-detached547-mask-direction-v1.json', '448125850c63cece0e6ede1f1899e9462f0b10055012ea62d6eb812c930b3ba7')
    manifest_path = ATLAS/'specimen-blocks.json'
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    expected = {(b, p['part']) for b, ps in manifest['specimens'].items() for p in ps}
    rows = impact['blockMaskImpact']
    if len(rows) != 55 or {(r['block'], r['part']) for r in rows} != expected:
        raise ValueError('Incomplete block coverage')
    if impact['inputSha256'] != SHA or impact['outputSha256'] != FINAL or impact['installationBlocked']:
        raise ValueError('Impact input mismatch')
    changes = [r for r in rows if r['changedMaskVoxels']]
    expected_changes = {('lateral-ventricle', 'tissue'): 414, ('lateral-ventricle', 'ventricular-cavity'): 76,
                        ('choroid-plexus', 'ventricular-cavity'): 6}
    if {(r['block'], r['part']): r['changedMaskVoxels'] for r in changes} != expected_changes:
        raise ValueError('Unexpected block impact')
    if any(r['added'] for r in direction['blockRows']):
        raise ValueError('Unexpected mask addition')
    retained = [(ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-lateral-detached547-b45c.bin.gz', base)]
    writes = []
    for part in changes:
        name = part['file']
        old_mesh = (mesh_dir/('installed-'+name)).read_bytes()
        new_mesh = (mesh_dir/name).read_bytes()
        if (not part['beforeMatches'] or digest(old_mesh) != part['beforeSha256']
                or digest(new_mesh) != part['afterSha256'] or (ATLAS/name).read_bytes() not in (old_mesh, new_mesh)):
            raise ValueError('Block byte mismatch')
        retained.append((ROOT/'tests/fixtures'/(name[:-5]+'-pre-lateral-detached547.mesh'), old_mesh))
        writes.append((ATLAS/name, new_mesh))
        entry = next(p for p in manifest['specimens'][part['block']] if p['part'] == part['part'])
        entry.update(vertices=part['vertices'], faces=part['faces'], meshSha256=part['afterSha256'],
                     segmentationSourceSha256=FINAL,
                     repairReview='AI-image-reviewed sulcal ID24 exclusion; derived block crop updated. Development only, not expert review.')
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
    record_path = ROOT/'segmentation-patches/review/lateral-detached547-adoption-2026-09-07.json'
    record.update(status='AI-image-reviewed-project-adopted-development-only', adopted=True, projectAdopted=True,
                  expertReviewed=False, published=False, meshImpact=impact, maskDirection=direction,
                  sectionMeshImpact=dict(before=old_report, after=new_report, changedFiles=changed))
    record['limitation'] = 'Specific sulcus unassigned; adjacent other fragments untouched. Zero means unlabelled. Integration verification recorded separately; not expert review or publication.'
    record_data = serialized(record)
    retained.append((record_path, record_data))
    meta_path = ATLAS/'bigbrain-practical-segmentation-icbm500-validation.json'
    meta = json.loads(meta_path.read_text(encoding='utf-8'))
    if meta['rawVoxelSha256'] not in (digest(before_raw[10:]), RAW):
        raise ValueError('Metadata baseline differs')
    meta['rawVoxelSha256'] = RAW
    for ident in (0, 24):
        meta['labelCounts'][str(ident)] = int(np.count_nonzero(after == ident))
    meta['lateralDetached547Audit'] = dict(record=record_path.relative_to(ROOT).as_posix(), recordSha256=digest(record_data),
                                         changedVoxelCount=547, projectAdopted=True, expertReviewed=False,
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
