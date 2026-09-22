"""Install the pinned partial anterior fornix extension after full preflight."""
import argparse
import gzip
import json

import numpy as np
from build_orthogonal_review_bundle import DEFAULT_LABELS, MAGIC_LABELS, read_browser_volume
from build_section_ventricle_meshes import ATLAS, build_assets, reconstruct
from stage_aqueduct_fourth44 import ROOT, digest, encode
from stage_fornix_continuation269 import BASE_SHA, HERE, INPUTS, replay

PREFIX = 'fornix-continuation269'
STAGE = ROOT / 'work/anatomy-review/fornix-continuation269-stage-v1'
RECORD = ROOT / f'segmentation-patches/review/{PREFIX}-adoption-2026-09-19.json'
SCOPE = ('Partial fornix body and anterior transition, native Y780-900 (about 12 mm anterior-posterior extent). '
         'Superior septal attachment and anterior/posterior cuts remain scope limits, not established anatomical boundaries. '
         'Crura, columns, fimbria and continuity to hippocampus/mammillary body remain incomplete. '
         'Small internal clefts may remain unresolved at 0.5 mm sampling. Not expert-reviewed.')


def serialized(data):
    return (json.dumps(data, ensure_ascii=False, indent=2) + '\n').encode('utf-8')


def checked(path, sha):
    data = path.read_bytes()
    if digest(data) != sha:
        raise ValueError('Changed evidence: ' + str(path))
    return json.loads(data)


def plan():
    record = checked(STAGE / 'repair.json', 'e5ea140e3d073eb9a00d170434ae534f856ac440dafec664551f91bfd5548858')
    impact = checked(STAGE / 'block-impact.json', 'f179557195680b6f35325d1226727a5cd846e6646c09f6380807cfbe95b83bb3')
    for name, sha in INPUTS.items():
        checked(HERE / name, sha)
    _, _, before = read_browser_volume(STAGE / 'before.bin.gz', MAGIC_LABELS, BASE_SHA)
    _, _, after = read_browser_volume(STAGE / 'labels.bin.gz', MAGIC_LABELS, record['afterSha256'])
    base, data = (STAGE / 'before.bin.gz').read_bytes(), (STAGE / 'labels.bin.gz').read_bytes()
    if DEFAULT_LABELS.read_bytes() != base:
        raise ValueError('Current labels differ; never reapply over newer work')
    if (not np.array_equal(replay(before, record['points']), after)
            or not np.array_equal(replay(after, record['points'], True), before)):
        raise ValueError('Reversible stage differs')
    if digest(after.tobytes(order='F')) != record['afterRawVoxelSha256']:
        raise ValueError('Raw digest differs')
    manifest = json.loads((ATLAS / 'specimen-blocks.json').read_bytes())
    parts = {(b, p['part']): p for b, ps in manifest['specimens'].items() for p in ps}
    if (len(impact['blockMaskImpact']) != 55
            or {(r['block'], r['part']) for r in impact['blockMaskImpact']} != set(parts)
            or impact['beforeSha256'] != BASE_SHA or impact['afterSha256'] != record['afterSha256']
            or len(impact['fineMaskImpact']) != 4
            or any(r['changed'] for r in impact['blockMaskImpact'] + impact['fineMaskImpact'])):
        raise ValueError('Unexpected block impact')
    old_report, old_assets = build_assets(base)
    new_report, new_assets = build_assets(data)
    writes = []
    retained = [(ROOT / f'tests/fixtures/bigbrain-practical-segmentation-pre-{PREFIX}.bin.gz', base)]
    for name, payload in old_assets.items():
        current = (ATLAS / name).read_bytes()
        if (json.loads(current) != json.loads(payload) if name.endswith('.json') else current != payload):
            raise ValueError('Ventricular baseline mismatch: ' + name)
        if name.endswith('.mesh') and new_assets[name] != payload:
            raise ValueError('Unexpected ventricular geometry change')
    writes.append((ATLAS / 'section-current-ventricles.json', new_assets['section-current-ventricles.json']))
    independent = ['aqueduct-partial', 'brainstem', 'internal-capsule', 'cerebellum',
                   'septum-pellucidum-partial', 'anterior-commissure-partial', 'lateral-geniculate-bodies']
    for name in independent + ['fornix-body-partial']:
        stem = 'section-current-' + name
        meta_path, mesh_path = ATLAS / (stem + '.json'), ATLAS / (stem + '.mesh')
        old_meta_bytes, old_mesh = meta_path.read_bytes(), mesh_path.read_bytes()
        meta = json.loads(old_meta_bytes)
        if meta['sourceSha256'] != BASE_SHA or meta['sha256'] != digest(old_mesh):
            raise ValueError('Independent asset baseline mismatch: ' + name)
        retained.append((ROOT / f'tests/fixtures/{stem}-pre-{PREFIX}.json', old_meta_bytes))
        ids = meta['labelIds']
        if name == 'fornix-body-partial':
            raw_before, _ = reconstruct((before == 46).transpose(2, 1, 0))
            raw_after, info = reconstruct((after == 46).transpose(2, 1, 0))
            payload = encode(raw_after)
            if gzip.decompress(old_mesh) != raw_before or payload != (STAGE / (stem + '.mesh')).read_bytes():
                raise ValueError('Fornix mesh reconstruction mismatch')
            if info['voxels'] != 1522 or info['componentSizes'] != [797, 725]:
                raise ValueError('Unexpected fornix geometry')
            retained.append((ROOT / f'tests/fixtures/{stem}-pre-{PREFIX}.mesh', old_mesh))
            meta.update(info, sha256=digest(payload), bytes=len(payload), rawSha256=digest(raw_after),
                        rawBytes=len(raw_after), labelVoxelCounts={'46': 1522}, scope=SCOPE,
                        reviewRecord=RECORD.relative_to(ROOT).as_posix())
            writes.append((mesh_path, payload))
        elif not np.array_equal(np.isin(before, ids), np.isin(after, ids)):
            raise ValueError('Unexpected independent structure change: ' + name)
        meta['sourceSha256'] = record['afterSha256']
        writes.append((meta_path, serialized(meta)))
    nuclei_path = ATLAS / 'section-current-nuclei.json'
    nuclei = json.loads(nuclei_path.read_bytes())
    if nuclei['sourceSha256'] != BASE_SHA:
        raise ValueError('Nuclei provenance baseline mismatch')
    for name, meta in nuclei['meshes'].items():
        if digest((ATLAS / (name + '.mesh')).read_bytes()) != meta['sha256']:
            raise ValueError('Nuclei mesh mismatch: ' + name)
        if not np.array_equal(np.isin(before, meta['labelIds']), np.isin(after, meta['labelIds'])):
            raise ValueError('Unexpected nuclei change: ' + name)
    nuclei['sourceSha256'] = record['afterSha256']
    writes.append((nuclei_path, serialized(nuclei)))
    block_rows = [dict(block=r['block'], part=r['part'], file=parts[(r['block'], r['part'])]['file'],
                       changedMaskVoxels=0, added=0, removed=0) for r in impact['blockMaskImpact']]
    figures = ([p for p in sorted((HERE / 'refined269-v2').glob('*.png')) if p.name.startswith(('x', 'z'))]
               + [p for p in sorted((HERE / 'refined269-closeup-v2').glob('y*.png'))])
    if len(figures) != 38:
        raise ValueError('Expected 27 reviewed coronal and 11 orthogonal figures')
    record.update(status='AI-image-reviewed-project-adopted-development-only', adopted=True, installed=True,
                  projectAdopted=True, expertReviewed=False, published=False, partialExtent=True,
                  limitation=SCOPE, integrationVerification='See docs/FORNIX_CONTINUATION_2026-09-19.md',
                  primaryReview=dict(reviewer='primary AI project review; not expert review', approved=True,
                                     reviewedFigures=[dict(path=p.relative_to(ROOT).as_posix(), sha256=digest(p.read_bytes())) for p in figures],
                                     rationale='Native adjacent and orthogonal images support this partial body-to-anterior-transition interior; 5 partial-volume uncertainty points remain deferred. Brightness and face connectivity were screening aids, not anatomical classification.'),
                  meshImpact=dict(blockMaskImpact=block_rows, fineMaskImpact=impact['fineMaskImpact'], installationBlocked=False),
                  sectionMeshImpact=dict(before=old_report, after=new_report, changedFiles=[]),
                  independentSectionChanges=['section-current-fornix-body-partial.mesh'])
    record_bytes = serialized(record)
    validation_path = ATLAS / 'bigbrain-practical-segmentation-icbm500-validation.json'
    validation = json.loads(validation_path.read_bytes())
    if validation['rawVoxelSha256'] != digest(before.tobytes(order='F')):
        raise ValueError('Validation baseline differs')
    validation['rawVoxelSha256'] = record['afterRawVoxelSha256']
    validation['labelCounts']['46'] = int(np.count_nonzero(after == 46))
    # Measurements exclude label 0; ventricular overlap is unchanged because
    # the exact reversible patch only adds ID46 to previously unlabelled cells.
    measurements = validation['currentImageMeasurements']
    if measurements['sourceLabelSha256'] != BASE_SHA:
        raise ValueError('Current measurements baseline differs')
    measurements.update(sourceLabelSha256=record['afterSha256'], rawVoxelSha256=record['afterRawVoxelSha256'])
    measurements['labelCounts']['46'] = 1522
    validation['regionalBatchAudits'][PREFIX] = dict(record=RECORD.relative_to(ROOT).as_posix(),
        recordSha256=digest(record_bytes), changedVoxelCount=269, projectAdopted=True, expertReviewed=False,
        changedSectionMeshes=['section-current-fornix-body-partial.mesh'])
    retained.append((RECORD, record_bytes))
    for path, payload in retained:
        if path.exists() and path.read_bytes() != payload:
            raise ValueError('Preserved evidence conflict: ' + str(path))
    return retained + writes + [(validation_path, serialized(validation)), (DEFAULT_LABELS, data)]


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    changes = plan()
    if args.apply:
        for path, payload in changes:
            path.write_bytes(payload)
    print(json.dumps(dict(preflightPassed=True, applied=args.apply, files=[p.relative_to(ROOT).as_posix() for p, _ in changes])))
