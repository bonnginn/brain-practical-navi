"""Install the fixed reviewed developmental cavity repair and its dependent mesh."""
import json
import numpy as np
from stage_third_ventricle_core_repair import ROOT, WORK, BASE_SHA, BASE_RAW, digest, replay, read_browser_volume, MAGIC_LABELS, DEFAULT_LABELS
from adopt_registered_red_nuclei import encode

FINAL_SHA = '9bc51ab0b0f6932871a93a0d225491ed0649ef827012a7db41d3f3e049b166a8'
FINAL_RAW = 'f5d552ac7856dfb5bb555e289f16c5d1f0dfa918107af2b567491202dba54fbe'


def checked(path, sha):
    data = path.read_bytes()
    if digest(data) != sha:
        raise ValueError('Changed input: '+str(path))
    return json.loads(data)


def plan():
    stage = WORK/'third-ventricle-core-stage-v1'
    meshes = WORK/'third-ventricle-core-meshes-v1'
    r = checked(stage/'repair.json', '741cdb07c4199df4bcc17ebc7f4575e875ffd03c7b19521c757a911ff6196d38')
    impact = checked(meshes/'report.json', 'b63c8f6c976e0c1f1af6ad2cf23fe323e432373922e4a9f644d5af24ab5bd511')
    baseline = checked(WORK/'third-ventricle-mesh-baseline-v1.json', 'bf48705cc9bb84ec10491235f250bcb0beb1ecebf563afbb205e17c3177ea72b')
    if not baseline['historicalReproducesInstalled'] or baseline['changes'] != [dict(zyx=[70,127,99], before=False, after=True)]:
        raise ValueError('Historical drift differs')
    # The historical mesh is reproduced exactly; the one missing point belongs to the adopted August patch.
    old_patch = json.loads((ROOT/'segmentation-patches/review/ventricles-orthogonally-bracketed-candidate-2026-08-23.json').read_text(encoding='utf-8'))
    if old_patch['reviewStatus'] != 'approved' or dict(start=25804834, length=1, label=25) not in old_patch['runs']:
        raise ValueError('Old repair provenance differs')
    _, _, old = read_browser_volume(stage/'base.bin.gz', MAGIC_LABELS, BASE_SHA)
    new = replay(old, r['points'])
    data = encode(new)
    if len(r['points']) != 1587 or np.count_nonzero(old != new) != 1587 or digest(data) != FINAL_SHA or digest(new.tobytes(order='F')) != FINAL_RAW:
        raise ValueError('Repair replay differs')
    if digest(old.tobytes(order='F')) != BASE_RAW or not np.array_equal(replay(new, r['points'], True), old):
        raise ValueError('Repair inverse differs')
    if digest(DEFAULT_LABELS.read_bytes()) not in (BASE_SHA, FINAL_SHA):
        raise ValueError('Unrelated current labels')
    changed = [p for p in impact['blockMaskImpact'] if p['changedMaskVoxels']]
    if len(impact['blockMaskImpact']) != 55 or len(changed) != 1 or changed[0]['changedMaskVoxels'] != 179:
        raise ValueError('Mesh impact differs')
    mesh = changed[0]
    if mesh['file'] != 'block-diencephalon-third-ventricle.mesh' or mesh['beforeSha256'] != baseline['installedMeshSha256']:
        raise ValueError('Mesh identity differs')
    mesh_path = ROOT/'public/atlas'/mesh['file']
    mesh_data = (meshes/mesh['file']).read_bytes()
    mesh_before = (meshes/('installed-'+mesh['file'])).read_bytes()
    if digest(mesh_data) != mesh['afterSha256'] or digest(mesh_before) != mesh['beforeSha256'] or digest(mesh_path.read_bytes()) not in (mesh['beforeSha256'], mesh['afterSha256']):
        raise ValueError('Mesh bytes differ')
    record_path = ROOT/'segmentation-patches/review/third-ventricle-core-adoption-2026-09-07.json'
    r.update(adopted=True, projectAdopted=True, installed=True, expertReviewed=False,
             status='AI-image-reviewed-project-adopted-development-only', meshImpact=impact,
             historicalMeshBaseline=baseline, meshBaselineDriftResolved=True)
    r['limitations'][-1] = 'Integrated developmental assets; full tests/build/browser verification tracked separately. No publication or expert ground truth.'
    record_data = (json.dumps(r, indent=2)+'\n').encode()
    meta_path = ROOT/'public/atlas/bigbrain-practical-segmentation-icbm500-validation.json'
    meta = json.loads(meta_path.read_text(encoding='utf-8'))
    if meta['rawVoxelSha256'] not in (BASE_RAW, FINAL_RAW):
        raise ValueError('Metadata baseline differs')
    meta['rawVoxelSha256'] = FINAL_RAW
    for label in (0, 25):
        meta['labelCounts'][str(label)] = int(np.count_nonzero(new == label))
    meta['thirdVentricleCoreAudit'] = dict(record=record_path.relative_to(ROOT).as_posix(), recordSha256=digest(record_data),
        changedVoxelCount=1587, projectAdopted=True, expertReviewed=False, changedBlockPartMasks=[mesh['file']])
    manifest_path = ROOT/'public/atlas/specimen-blocks.json'
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    part = next(p for p in manifest['specimens']['diencephalon'] if p['part'] == 'third-ventricle')
    part.update(vertices=mesh['vertices'], faces=mesh['faces'], meshSha256=mesh['afterSha256'],
                segmentationSourceSha256=FINAL_SHA, repairReview='AI-image-reviewed developmental central cavity repair and prior label-to-mesh synchronization; not expert review.')
    retained = [
        (ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-third-core-777b.bin.gz', (stage/'base.bin.gz').read_bytes()),
        (ROOT/'tests/fixtures/block-diencephalon-third-ventricle-pre-core.mesh', mesh_before),
        (record_path, record_data),
    ]
    for path, value in retained:
        if path.exists() and path.read_bytes() != value:
            raise ValueError('Existing recovery record differs')
    return retained + [(DEFAULT_LABELS, data), (mesh_path, mesh_data),
        (meta_path, (json.dumps(meta, ensure_ascii=False, indent=2)+'\n').encode()),
        (manifest_path, (json.dumps(manifest, ensure_ascii=False, indent=2)+'\n').encode())]


if __name__ == '__main__':
    updates = plan()
    for path, data in updates:
        path.write_bytes(data)
    print('Installed development-only third-ventricle repair: '+FINAL_SHA)
