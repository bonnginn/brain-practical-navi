"""Install the pinned partial upper-column fornix extension after full preflight."""
import argparse
import gzip
import json

import numpy as np
from build_orthogonal_review_bundle import DEFAULT_LABELS, MAGIC_LABELS, read_browser_volume
from build_section_ventricle_meshes import ATLAS, build_assets, reconstruct
from stage_aqueduct_fourth44 import ROOT, digest, encode
BASE_SHA = '2cdba3f15427af2fdb5b9bcdb9b1b9904f6fcc5199fc1bfa4b76b2bfbbe6e8da'
HERE = ROOT / 'work/fornix-lower-column-draft-20260919'

PREFIX = 'fornix-lower-column23'
STAGE = ROOT / 'work/anatomy-review/fornix-lower-column23-stage-v3'
RECORD = ROOT / f'segmentation-patches/review/{PREFIX}-adoption-2026-09-19.json'
SCOPE = ('Partial body and upper-column interior extended through native40 Z650-610. Scope cuts are not anatomical boundaries. Lower columns near/below the anterior commissure, crura, fimbria and mammillary continuity remain incomplete. Not expert-reviewed.')
INPUTS = {'spec-v1.json': '9eb20b2ff8d99f8e763722213f9229b6f85780a77bc66ae27b2e398d9b00bede', 'v1\\candidate.json': '059149f3a7de4111e7eacaa4132f8726d04fbbc217f8af28d646ed4d8b4092cd', 'sampling-v1\\measurements.json': 'ba020422154fb49802b07cb707e3f5116ecf9485758bc00261e8da67900cc41b', 'independent-raw-check.json': 'b6a48d9bdd5963ddbddf204633abd6c3d646ff4f0d294c76b583ea1e6660c5b4', 'stage_lower_column23_v3.py': 'a68319a0e6ae5e10e05e953959d17737ff256ff31d270f34a72fbb4057424e4b'}
REVIEW_REPORTS = {
    ROOT / 'work/fornix-lower-column-draft-20260919/v1/report.json': '059149f3a7de4111e7eacaa4132f8726d04fbbc217f8af28d646ed4d8b4092cd',
    ROOT / 'work/fornix-lower-column-draft-20260919/native40-v1/report.json': '7f506849748e0c2ad3093b62b6185ac6587dec40f02a0626910c9b268f03f050',
}


def replay(labels, points, reverse=False):
    if len(points) != 23:
        raise ValueError('Expected 23 reviewed points')
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


def serialized(data):
    return (json.dumps(data, ensure_ascii=False, indent=2) + '\n').encode('utf-8')


def checked(path, sha):
    data = path.read_bytes()
    if digest(data) != sha:
        raise ValueError('Changed evidence: ' + str(path))
    return json.loads(data) if path.suffix == ".json" else data


def plan():
    record = checked(STAGE / 'repair.json', 'ca5432987478730325990cb6381f2d234c1f0e97efbe29da7544e4db79d94c3f')
    impact = checked(STAGE / 'block-impact.json', '56aded81b411bc88d2bb0d22bfca04bc5404cbc3bbfdd797d1d0fd107910719d')
    for name, sha in INPUTS.items():
        checked(HERE / name, sha)
    record['evidence'] = [dict(path=(HERE / name).relative_to(ROOT).as_posix(), sha256=sha) for name, sha in INPUTS.items()]
    if record['count'] != 23 or record['countsBefore'] != {'46': 1686} or record['countsAfter'] != {'46': 1709}:
        raise ValueError('Unexpected staged transition')
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
            if info['voxels'] != 1709 or info['componentSizes'] != [907, 802]:
                raise ValueError('Unexpected fornix geometry')
            retained.append((ROOT / f'tests/fixtures/{stem}-pre-{PREFIX}.mesh', old_mesh))
            meta.update(info, sha256=digest(payload), bytes=len(payload), rawSha256=digest(raw_after),
                        rawBytes=len(raw_after), labelVoxelCounts={'46': 1709}, scope=SCOPE,
                        method='native-image-reviewed partial body and upper columns; marching cubes 0.5; no resampling, smoothing or filling',
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
    figures = []
    evidence_reports = []
    for report_path, report_sha in REVIEW_REPORTS.items():
        report = checked(report_path, report_sha)
        folder = report_path.parent
        names = [f['file'] for f in report['figures']]
        for name in names:
            path = folder / name
            if not path.exists() or digest(path.read_bytes()) != next(f['sha256'] for f in report['figures'] if f['file'] == name):
                raise ValueError('Reviewed figure changed: ' + str(path))
            figures.append(path)
        evidence_reports.append(dict(path=report_path.relative_to(ROOT).as_posix(), sha256=report_sha))
    if len(figures) != 55:
        raise ValueError('Expected 35 native100 and 20 native40 figures')
    record['evidence'] += evidence_reports
    record.update(status='AI-image-reviewed-project-adopted-development-only', adopted=True, installed=True,
                  projectAdopted=True, expertReviewed=False, published=False, partialExtent=True,
                  limitation=SCOPE, integrationVerification='See docs/FORNIX_LOWER_COLUMN23_INTEGRATION_2026-09-19.md.',
                  primaryReview=dict(reviewer='primary AI project review; not expert review', approved=True,
                                     reviewedFigures=[dict(path=p.relative_to(ROOT).as_posix(), sha256=digest(p.read_bytes())) for p in figures],
                                     rationale='Native100 and native40 source views support this partial upper-column interior. Brightness and face connectivity were screening aids, not anatomical classification.'),
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
    measurements['labelCounts']['46'] = 1709
    validation['regionalBatchAudits'][PREFIX] = dict(record=RECORD.relative_to(ROOT).as_posix(),
        recordSha256=digest(record_bytes), changedVoxelCount=23, projectAdopted=True, expertReviewed=False,
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
