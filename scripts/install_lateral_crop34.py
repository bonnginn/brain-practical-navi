"""Preflight the reviewed ventricular omission repair and all development representations."""
import argparse
import gzip
import json
import numpy as np
from stage_lateral_crop34 import ROOT, SHA, replay, digest, reviewed_points
from build_section_ventricle_meshes import build_assets, SOURCE, ATLAS

FINAL = 'a2ceb2649ec0950eb7ba0620f38db9f8fc83293ad46bb2b7fcce82091360a6c5'
RAW = '3b21494d28710dd1f88b452e4d0385fe1b521767ac3cdbe96409090d0a49d1e6'


def serialized(value):
    return (json.dumps(value, ensure_ascii=False, indent=2)+'\n').encode('utf-8')


def checked(path, sha):
    data = path.read_bytes()
    if digest(data) != sha:
        raise ValueError('Evidence changed: '+str(path))
    return json.loads(data)


def plan():
    work = ROOT/'work/anatomy-review'
    stage = work/'lateral-crop34-stage-v1'
    record = checked(stage/'repair.json', '41f6300c9cc729ab1def24838c0e6b5c3284a9b21ef2bd85fbe02beb67ddab81')
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
    mesh_dir = work/'lateral-crop34-meshes-v1'
    impact = checked(mesh_dir/'report.json', '040a43850155ea4c31911b0b78a8bf0c2644b645783bf8a483ddb411faf31789')
    direction = checked(work/'lateral-crop34-mask-direction-v1.json', '42402fa800980039b4e089f462e52295c3cf5e39a388096cd6d1e7d345b5d1fe')
    manifest_path = ATLAS/'specimen-blocks.json'
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    expected = {(b, p['part']) for b, ps in manifest['specimens'].items() for p in ps}
    rows = impact['blockMaskImpact']
    if len(rows) != 55 or {(r['block'], r['part']) for r in rows} != expected:
        raise ValueError('Incomplete block coverage')
    if impact['inputSha256'] != SHA or impact['outputSha256'] != FINAL or impact['installationBlocked']:
        raise ValueError('Impact input mismatch')
    changes = [r for r in rows if r['changedMaskVoxels']]
    expected_changes = {('lateral-ventricle', 'tissue'): 394, ('lateral-ventricle', 'ventricular-cavity'): 5,
                        ('choroid-plexus', 'tissue'): 281, ('choroid-plexus', 'ventricular-cavity'): 5,
                        ('medial-temporal', 'inferior-horn'): 5}
    if {(r['block'], r['part']): r['changedMaskVoxels'] for r in changes} != expected_changes:
        raise ValueError('Unexpected block impact')
    expected_direction = {('lateral-ventricle','tissue'):(394,0), ('lateral-ventricle','ventricular-cavity'):(5,0),
                          ('choroid-plexus','tissue'):(281,0), ('choroid-plexus','ventricular-cavity'):(5,0),
                          ('medial-temporal','inferior-horn'):(5,0)}
    if (len(direction['blockRows']) != 55 or {(r['block'],r['part']) for r in direction['blockRows']} != expected
            or {(r['block'],r['part']):(r['added'],r['removed']) for r in direction['blockRows'] if r['added'] or r['removed']} != expected_direction):
        raise ValueError('Unexpected mask directions')
    retained = [(ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-lateral-crop34-3849.bin.gz', base)]
    writes = []
    for part in changes:
        name = part['file']
        old_mesh = (mesh_dir/('installed-'+name)).read_bytes()
        new_mesh = (mesh_dir/name).read_bytes()
        if (not part['beforeMatches'] or digest(old_mesh) != part['beforeSha256']
                or digest(new_mesh) != part['afterSha256'] or (ATLAS/name).read_bytes() not in (old_mesh, new_mesh)):
            raise ValueError('Block byte mismatch')
        retained.append((ROOT/'tests/fixtures'/(name[:-5]+'-pre-lateral-crop34.mesh'), old_mesh))
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
    record_path = ROOT/'segmentation-patches/review/lateral-crop34-adoption-2026-09-07.json'
    record.update(status='AI-image-reviewed-project-adopted-development-only', adopted=True, projectAdopted=True,
                  expertReviewed=False, published=False, meshImpact=impact, maskDirection=direction,
                  sectionMeshImpact=dict(before=old_report, after=new_report, changedFiles=changed))
    record['limitation'] = 'Only 34 reviewed omissions added. Existing labels retained; crop-edge and partial-support omissions remain unresolved. Integration verification recorded separately; not expert review or publication.'
    record_data = serialized(record)
    retained.append((record_path, record_data))
    meta_path = ATLAS/'bigbrain-practical-segmentation-icbm500-validation.json'
    meta = json.loads(meta_path.read_text(encoding='utf-8'))
    if meta['rawVoxelSha256'] not in (digest(before_raw[10:]), RAW):
        raise ValueError('Metadata baseline differs')
    meta['rawVoxelSha256'] = RAW
    for ident in (0, 24):
        meta['labelCounts'][str(ident)] = int(np.count_nonzero(after == ident))
    meta['lateralCrop34Audit'] = dict(record=record_path.relative_to(ROOT).as_posix(), recordSha256=digest(record_data),
                                         changedVoxelCount=34, projectAdopted=True, expertReviewed=False,
                                         changedBlockPartMasks=[r['file'] for r in changes], changedSectionMeshes=changed)
    for path, payload in retained:
        if path.exists() and path.read_bytes() != payload:
            raise ValueError('Retained evidence differs')
    return retained+writes+[(SOURCE, data), (meta_path, serialized(meta)), (manifest_path, serialized(manifest))]+[(ATLAS/n, b) for n, b in new_assets.items()]


def plan_unchanged_blocks(prefix, record_sha, mesh_report_sha=None):
    """Plan a regional fill; changed blocks additionally require a pinned impact report."""
    from stage_lateral_crop34 import load_batch_stage
    stage, record = load_batch_stage(prefix, record_sha)
    base=(stage/'before.bin.gz').read_bytes(); data=(stage/'labels.bin.gz').read_bytes()
    before_raw=gzip.decompress(base); after_raw=gzip.decompress(data)
    if before_raw[:10]!=after_raw[:10] or len(before_raw)!=10+394*466*378:
        raise ValueError('Unexpected volume format')
    before=np.frombuffer(before_raw,np.uint8,offset=10).reshape((394,466,378),order='F')
    after=np.frombuffer(after_raw,np.uint8,offset=10).reshape(before.shape,order='F')
    exclusions=record['transition']=='mixed-ventricular-exclusions'
    brainstem_reclassification=record['transition']=='27->26'
    mixed_cavity=record['transition']=='mixed-to-26'
    mixed_repair=record['transition']=='mixed-ventricular-repair'
    points=np.asarray([p['xyz'] for p in record['points']] if exclusions or brainstem_reclassification or mixed_cavity or mixed_repair else record['points']); count=record['count']
    if mixed_repair:
        from stage_ventricular_mixed12 import replay as replay_mixed
        if prefix!='ventricular-mixed12' or record_sha!='7d688ef29bac9d40de94bbd21e0f5a9857e9e5e2439badb83d38ffb9e933d708':
            raise ValueError('Unreviewed mixed ventricular repair')
        if not np.array_equal(replay_mixed(before,record['points']),after):raise ValueError('Mixed replay differs')
        source_values=np.asarray([p['before'] for p in record['points']]);destination=np.asarray([p['after'] for p in record['points']]);affected={0,25,26}
    elif exclusions:
        entries=record['points']
        if any(type(p['before']) is not int or p['before'] not in (23,24,25,26,41) or type(p['after']) is not int or p['after']!=0 for p in entries):
            raise ValueError('Invalid ventricular exclusions')
        source_values=np.asarray([p['before'] for p in entries]);destination=0
        affected={0,*map(int,source_values)}
    elif brainstem_reclassification:
        from stage_fourth_brainstem48 import replay as replay_brainstem
        if prefix!='fourth-brainstem48' or record_sha!='c88ca05bf5bc4825575204a69eed1f5ee02db951564fc35e78d30f61f97f8280':
            raise ValueError('Unreviewed brainstem reclassification')
        if any(type(p['before']) is not int or p['before']!=27 or type(p['after']) is not int or p['after']!=26 for p in record['points']):
            raise ValueError('Invalid brainstem reclassification')
        if not np.array_equal(replay_brainstem(before,points),after):raise ValueError('Brainstem replay differs')
        source_values=27;destination=26;affected={26,27}
    elif mixed_cavity:
        from stage_fourth_depth27 import replay as replay_depth
        if prefix!='fourth-depth27' or record_sha!='c2f7d98fdb51559b3ff785b873d80e932d4ecfd796c9fa6e073650ec697632a7':
            raise ValueError('Unreviewed mixed cavity repair')
        if not np.array_equal(replay_depth(before,record['points']),after):raise ValueError('Mixed cavity replay differs')
        source_values=np.asarray([p['before'] for p in record['points']]);destination=26;affected={0,26,27}
    else:
        transition=record['transition'].split('->')
        if len(transition)!=2 or transition[0]!='0' or transition[1] not in ('23','24','26'):
            raise ValueError('Unsupported regional fill')
        destination=int(transition[1]);source_values=0;affected={0,destination}
    if (points.shape!=(count,3) or points.dtype.kind not in 'iu' or len(np.unique(points,axis=0))!=count
            or np.any(points<0) or np.any(points>=before.shape) or np.any(before[tuple(points.T)]!=source_values)):
        raise ValueError('Conflicting or invalid batch')
    expected=before.copy();expected[tuple(points.T)]=destination
    if not np.array_equal(expected,after) or digest(after_raw[10:])!=record['afterRawVoxelSha256']:
        raise ValueError('Unexpected full-volume difference')
    for e in record['evidence']:
        path=ROOT/e['path']
        if digest(path.read_bytes())!=e['sha256']:raise ValueError('Evidence changed')
        for f in e.get('visuallyInspectedFigures',[]):
            if digest((path.parent/f['path']).read_bytes())!=f['sha256']:raise ValueError('Reviewed image changed')
    impact_path=ROOT/f'work/anatomy-review/{prefix}-meshes-v1/report.json'
    impact=checked(impact_path,mesh_report_sha) if mesh_report_sha else json.loads(impact_path.read_bytes())
    manifest=json.loads((ATLAS/'specimen-blocks.json').read_bytes())
    identities={(b,p['part']) for b,ps in manifest['specimens'].items() for p in ps}
    rows=impact['blockMaskImpact']
    if (impact['inputSha256']!=record['beforeSha256'] or impact['outputSha256']!=record['afterSha256']
            or impact['installationBlocked'] or len(rows)!=len(identities)
            or {(r['block'],r['part']) for r in rows}!=identities
            or any(not all(isinstance(r[k],int) and r[k]>=0 for k in ('changedMaskVoxels','added','removed'))
                   or r['changedMaskVoxels']!=r['added']+r['removed'] for r in rows)):
        raise ValueError('Invalid block impact')
    changed_parts=[r for r in rows if r['changedMaskVoxels']]
    if changed_parts and not mesh_report_sha:
        raise ValueError('Block changes require a pinned impact report')
    if SOURCE.read_bytes() not in (base,data):raise ValueError('Unrelated current labels')
    retained_meshes=[]; mesh_writes=[]
    for part in changed_parts:
        entry=next(p for p in manifest['specimens'][part['block']] if p['part']==part['part'])
        name=part['file']
        if '/' in name or '\\' in name or not name.endswith('.mesh'):
            raise ValueError('Invalid mesh filename')
        old_mesh=(impact_path.parent/('installed-'+name)).read_bytes()
        new_mesh=(impact_path.parent/name).read_bytes()
        if (not part['beforeMatches'] or part['reproducedBeforeSha256']!=part['beforeSha256']
                or digest(old_mesh)!=part['beforeSha256'] or digest(new_mesh)!=part['afterSha256']
                or entry['meshSha256'] not in (part['beforeSha256'],part['afterSha256'])
                or (ATLAS/name).read_bytes() not in (old_mesh,new_mesh)):
            raise ValueError('Block byte mismatch')
        retained_meshes.append((ROOT/'tests/fixtures'/(name[:-5]+'-pre-'+prefix+'.mesh'),old_mesh))
        mesh_writes.append((ATLAS/name,new_mesh))
        entry.update(vertices=part['vertices'],faces=part['faces'],meshSha256=part['afterSha256'],
            segmentationSourceSha256=record['afterSha256'],
            repairReview='AI-image-reviewed regional cavity repair; derived block synchronized. Development only, not expert review.')
    old_report,old_assets=build_assets(base); new_report,new_assets=build_assets(data)
    changed=[]
    for name,payload in new_assets.items():
        current=(ATLAS/name).read_bytes()
        equal=json.loads(current) in (json.loads(old_assets[name]),json.loads(payload)) if name.endswith('.json') else current in (old_assets[name],payload)
        if not equal:raise ValueError('Unrelated current section asset')
        if name.endswith('.mesh') and old_assets[name]!=payload:changed.append(name)
    from build_section_ventricle_meshes import GROUPS
    expected_sections={name+'.mesh' for name,ids in GROUPS.items() if affected.intersection(ids)}
    if set(changed)!=expected_sections:
        raise ValueError('Unexpected section impact')
    record_path=ROOT/f'segmentation-patches/review/{prefix}-adoption-2026-09-07.json'
    record.update(status='AI-image-reviewed-project-adopted-development-only',adopted=True,projectAdopted=True,
        expertReviewed=False,published=False,meshImpact=impact,
        sectionMeshImpact=dict(before=old_report,after=new_report,changedFiles=changed))
    if isinstance(record['limitation'],str):
        record['limitation']=record['limitation'].replace('Mesh synchronization and product adoption pending.','Integration verification recorded separately; not public deployment.')
        record['limitation']=record['limitation'].replace('Product adoption and mesh synchronization pending.','Integration verification recorded separately; not public deployment.')
    else:
        record['limitation'].append('Adoption record supersedes the work-stage status above; integration verification is recorded separately, not public deployment.')
    record_data=serialized(record)
    meta_path=ATLAS/'bigbrain-practical-segmentation-icbm500-validation.json'
    meta=json.loads(meta_path.read_bytes())
    if meta['rawVoxelSha256'] not in (digest(before_raw[10:]),record['afterRawVoxelSha256']):raise ValueError('Metadata changed')
    meta['rawVoxelSha256']=record['afterRawVoxelSha256']
    for ident in affected:meta['labelCounts'][str(ident)]=int((after==ident).sum())
    audits=meta.setdefault('regionalBatchAudits',{})
    audits[prefix]=dict(record=record_path.relative_to(ROOT).as_posix(),recordSha256=digest(record_data),
        changedVoxelCount=count,projectAdopted=True,expertReviewed=False,changedSectionMeshes=changed)
    retained=retained_meshes+[(ROOT/f'tests/fixtures/bigbrain-practical-segmentation-pre-{prefix}.bin.gz',base),(record_path,record_data)]
    for path,payload in retained:
        if path.exists() and path.read_bytes()!=payload:raise ValueError('Retained evidence changed')
    if changed_parts:mesh_writes.append((ATLAS/'specimen-blocks.json',serialized(manifest)))
    return retained+mesh_writes+[(SOURCE,data),(meta_path,serialized(meta))]+[(ATLAS/n,b) for n,b in new_assets.items()]


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true')
    parser.add_argument('--stage-prefix')
    parser.add_argument('--record-sha')
    parser.add_argument('--mesh-report-sha')
    args = parser.parse_args()
    if bool(args.stage_prefix)!=bool(args.record_sha):raise ValueError('Stage and SHA required together')
    if args.mesh_report_sha and not args.stage_prefix:raise ValueError('Mesh report requires a regional stage')
    changes = plan_unchanged_blocks(args.stage_prefix,args.record_sha,args.mesh_report_sha) if args.stage_prefix else plan()
    if args.apply:
        for path, data in changes:
            path.write_bytes(data)
    print(json.dumps(dict(preflightPassed=True, applied=args.apply, files=[p.relative_to(ROOT).as_posix() for p, _ in changes])))
