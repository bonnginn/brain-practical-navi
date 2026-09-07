"""Install only the hash-pinned image-reviewed fourth-ventricle repair locally."""
import json
import numpy as np
from stage_fourth_ventricle_paired_repair import ROOT, WORK, LABEL_SHA, POINTS, replay, digest
from build_orthogonal_review_bundle import DEFAULT_LABELS, MAGIC_LABELS, read_browser_volume
from adopt_registered_red_nuclei import encode
from install_third_ventricle_core_repair import checked

FINAL_SHA = 'd4295e7cc00edd3639b631473445d5db1bb25f9fbe18c5c7f21ff8b8471d7152'
FINAL_RAW = 'b17bcfbcad38430f33d3bb6973d6ea847295e37670a4f04710d78a2986546142'


def plan():
    stage = WORK/'fourth-ventricle-paired-stage-v1'
    meshes = WORK/'fourth-ventricle-paired-meshes-v1'
    record = checked(stage/'repair.json','a7ccf662012ff66a266e2e21424d960b4d7cd56d55bacf075a2aeaeeaf668abd')
    impact = checked(meshes/'report.json','4d0da8b0f3fc9b7f9b5f85c8a07cf5f6afeb2fb26a1df888621cd27e7bc46dcd')
    _,_,before = read_browser_volume(stage/'base.bin.gz',MAGIC_LABELS,LABEL_SHA)
    after = replay(before,[p['xyz'] for p in record['points']])
    data = encode(after)
    if digest(data) != FINAL_SHA or digest(after.tobytes(order='F')) != FINAL_RAW or not np.array_equal(replay(after,POINTS,True),before):
        raise ValueError('Repair replay differs')
    if digest(DEFAULT_LABELS.read_bytes()) not in (LABEL_SHA,FINAL_SHA):
        raise ValueError('Current label baseline differs')
    changed = [p for p in impact['blockMaskImpact'] if p['changedMaskVoxels']]
    if len(impact['blockMaskImpact']) != 55 or len(changed) != 1 or impact['installationBlocked']:
        raise ValueError('Mesh impact differs')
    part = changed[0]
    if part['file'] != 'block-hindbrain-fourth-ventricle.mesh' or part['changedMaskVoxels'] != 2 or not part['beforeMatches']:
        raise ValueError('Unexpected mesh')
    mesh_path = ROOT/'public/atlas'/part['file']
    mesh_data = (meshes/part['file']).read_bytes()
    mesh_before = (meshes/('installed-'+part['file'])).read_bytes()
    if digest(mesh_data) != part['afterSha256'] or digest(mesh_before) != part['beforeSha256'] or digest(mesh_path.read_bytes()) not in (part['beforeSha256'],part['afterSha256']):
        raise ValueError('Mesh bytes differ')
    record_path = ROOT/'segmentation-patches/review/fourth-ventricle-paired-adoption-2026-09-07.json'
    record.update(adopted=True,projectAdopted=True,installed=True,expertReviewed=False,
        status='AI-image-reviewed-project-adopted-development-only',meshImpact=impact)
    record['limitations'][-1] = 'Development assets integrated; downstream tests/build/browser verification recorded separately. Not published.'
    record_data = (json.dumps(record,indent=2)+'\n').encode()
    meta_path = ROOT/'public/atlas/bigbrain-practical-segmentation-icbm500-validation.json'
    meta = json.loads(meta_path.read_text(encoding='utf-8'))
    if meta['rawVoxelSha256'] not in (record['inputRawSha256'],FINAL_RAW):
        raise ValueError('Metadata baseline differs')
    meta['rawVoxelSha256'] = FINAL_RAW
    for label in (0,26):
        meta['labelCounts'][str(label)] = int(np.count_nonzero(after == label))
    meta['fourthVentriclePairedAudit'] = dict(record=record_path.relative_to(ROOT).as_posix(),recordSha256=digest(record_data),
        changedVoxelCount=16,projectAdopted=True,expertReviewed=False,changedBlockPartMasks=[part['file']])
    manifest_path = ROOT/'public/atlas/specimen-blocks.json'
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    entry = next(p for p in manifest['specimens']['hindbrain'] if p['part'] == 'fourth-ventricle')
    entry.update(vertices=part['vertices'],faces=part['faces'],meshSha256=part['afterSha256'],segmentationSourceSha256=FINAL_SHA,
        repairReview='AI-image-reviewed paired cavity omission repair, development only; not expert review or complete ventricular boundary.')
    retained = [(ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-fourth-paired-9bc5.bin.gz',(stage/'base.bin.gz').read_bytes()),
        (ROOT/'tests/fixtures/block-hindbrain-fourth-ventricle-pre-paired.mesh',mesh_before),(record_path,record_data)]
    for path,value in retained:
        if path.exists() and path.read_bytes() != value:
            raise ValueError('Existing recovery evidence differs')
    return retained+[(DEFAULT_LABELS,data),(mesh_path,mesh_data),
        (meta_path,(json.dumps(meta,ensure_ascii=False,indent=2)+'\n').encode()),
        (manifest_path,(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n').encode())]


if __name__ == '__main__':
    changes = plan()
    for path,data in changes:
        path.write_bytes(data)
    print('Installed development-only fourth ventricle repair: '+FINAL_SHA)
