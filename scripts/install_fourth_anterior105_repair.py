"""Preflight an exact development-only repair and all its ventricular meshes."""
import argparse
import json
import numpy as np
from stage_fourth_ventricle_anterior_repair import BASE_SHA, WORK, ROOT, replay, reviewed_points
from stage_third_ventricle_core_repair import digest, checked_report
from install_third_ventricle_core_repair import checked
from build_orthogonal_review_bundle import DEFAULT_LABELS, MAGIC_LABELS, read_browser_volume
from adopt_registered_red_nuclei import encode
from build_section_ventricle_meshes import build_assets

FINAL = 'ffb8e56e0939f97b6bc9f8e2585bb3f74e11b525006c6f7d631ae85cd4b033c2'
RAW = '60d4b7c9c98acd1ed83d935919e713430099dcdeee3e6571480a3606f993f64e'
serialized = lambda value: (json.dumps(value,ensure_ascii=False,indent=2)+'\n').encode('utf-8')


def plan():
    stage = WORK/'fourth-ventricle-anterior105-stage-v1'
    mesh_dir = WORK/'fourth-ventricle-anterior105-meshes-v1'
    record = checked(stage/'repair.json','1c47eb7801d6c90f1d62b89401b6774a62108546c7c42c2974693380e7014e8a')
    impact = checked(mesh_dir/'report.json','c98b0d5d929e658d6d878be90c31ec142be706af543795c0ff01c9ea3daef642')
    for item in record['reviewEvidence']:
        checked_report(str((ROOT/item['path']).parent.relative_to(WORK)),item['sha256'],len(item['report']['figures']))
    base = (stage/'base.bin.gz').read_bytes()
    _,_,before = read_browser_volume(stage/'base.bin.gz',MAGIC_LABELS,BASE_SHA)
    points = reviewed_points()
    if [p['xyz'] for p in record['points']] != [list(p) for p in points]:
        raise ValueError('Adoption points differ')
    after = replay(before,points)
    data = encode(after)
    if digest(data) != FINAL or digest(after.tobytes(order='F')) != RAW:
        raise ValueError('Reconstruction hash differs')
    if not np.array_equal(replay(after,points,True),before):
        raise ValueError('Not reversible')
    if digest(DEFAULT_LABELS.read_bytes()) not in (BASE_SHA,FINAL):
        raise ValueError('Current source differs')
    atlas = ROOT/'public/atlas'
    manifest_path = atlas/'specimen-blocks.json'
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    expected = {(b,p['part']) for b,ps in manifest['specimens'].items() for p in ps}
    rows = impact['blockMaskImpact']
    if len(rows)!=55 or len({(p['block'],p['part']) for p in rows})!=55 or {(p['block'],p['part']) for p in rows}!=expected:
        raise ValueError('Incomplete block coverage')
    changed = [p for p in rows if p['changedMaskVoxels']]
    if len(changed)!=1 or impact['installationBlocked'] or impact['inputSha256']!=BASE_SHA or impact['outputSha256']!=FINAL:
        raise ValueError('Unexpected impact')
    part = changed[0]
    if part['file']!='block-hindbrain-fourth-ventricle.mesh' or part['changedMaskVoxels']!=9 or not part['beforeMatches']:
        raise ValueError('Unexpected changed block')
    mesh_path = atlas/part['file']
    old_mesh = (mesh_dir/('installed-'+part['file'])).read_bytes()
    new_mesh = (mesh_dir/part['file']).read_bytes()
    if digest(old_mesh)!=part['beforeSha256'] or digest(new_mesh)!=part['afterSha256'] or digest(mesh_path.read_bytes()) not in (part['beforeSha256'],part['afterSha256']):
        raise ValueError('Block bytes differ')
    old_report, old_assets = build_assets(base)
    new_report, new_assets = build_assets(data)
    section_changes = []
    for name, payload in new_assets.items():
        current = (atlas/name).read_bytes()
        # The earlier Windows write_text producer used CRLF. Compare the
        # complete JSON value while still checking binary meshes byte-for-byte.
        matches = json.loads(current) in (json.loads(old_assets[name]),json.loads(payload)) if name.endswith('.json') else current in (old_assets[name],payload)
        if not matches:
            raise ValueError('Current section asset has unrelated changes: '+name)
        if name.endswith('.mesh') and payload!=old_assets[name]:
            section_changes.append(name)
    if set(section_changes)!={'section-current-fourth-ventricle.mesh','section-current-ventricular-system.mesh'}:
        raise ValueError('Unexpected section mesh changes')
    record_path = ROOT/'segmentation-patches/review/fourth-anterior105-adoption-2026-09-07.json'
    record.update(adopted=True,projectAdopted=True,installed=True,expertReviewed=False,published=False,
        status='AI-image-reviewed-project-adopted-development-only',meshImpact=impact,
        sectionMeshImpact=dict(changedFiles=section_changes,before=old_report,after=new_report))
    record['limitations'][-1]='Development assets integrated; downstream tests/build/browser are recorded separately. Not published.'
    record_data = serialized(record)
    meta_path = atlas/'bigbrain-practical-segmentation-icbm500-validation.json'
    meta = json.loads(meta_path.read_text(encoding='utf-8'))
    if meta['rawVoxelSha256'] not in (record['inputRawSha256'],RAW):
        raise ValueError('Metadata baseline differs')
    meta['rawVoxelSha256']=RAW
    for ident in (0,26): meta['labelCounts'][str(ident)]=int(np.count_nonzero(after==ident))
    meta['fourthAnterior105Audit']=dict(record=record_path.relative_to(ROOT).as_posix(),recordSha256=digest(record_data),
        changedVoxelCount=105,projectAdopted=True,expertReviewed=False,changedBlockPartMasks=[part['file']],changedSectionMeshes=section_changes)
    entry = next(p for p in manifest['specimens']['hindbrain'] if p['part']=='fourth-ventricle')
    entry.update(vertices=part['vertices'],faces=part['faces'],meshSha256=part['afterSha256'],segmentationSourceSha256=FINAL,
        repairReview='AI-image-reviewed anterior cavity fringe repair, development only; not expert review or complete ventricular segmentation.')
    retained = [(ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-fourth-anterior105-e98c.bin.gz',base),
                (ROOT/'tests/fixtures/block-hindbrain-fourth-ventricle-pre-anterior105.mesh',old_mesh),(record_path,record_data)]
    for path,payload in retained:
        if path.exists() and path.read_bytes()!=payload: raise ValueError('Recovery record differs')
    return retained+[(DEFAULT_LABELS,data),(mesh_path,new_mesh),(meta_path,serialized(meta)),(manifest_path,serialized(manifest))]+[(atlas/n,b) for n,b in new_assets.items()]


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply',action='store_true')
    args=parser.parse_args()
    changes=plan()
    if args.apply:
        for path,data in changes: path.write_bytes(data)
    print(json.dumps(dict(preflightPassed=True,applied=args.apply,files=[p.relative_to(ROOT).as_posix() for p,_ in changes])))
