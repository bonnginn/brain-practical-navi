"""Preflight the reviewed ventricular omission repair and all development representations."""
import argparse
from datetime import date
import gzip
import json
import numpy as np
from pathlib import Path
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


def plan_unchanged_blocks(prefix, record_sha, mesh_report_sha=None, *, review_date='2026-09-07'):
    """Plan a regional fill; changed blocks additionally require a pinned impact report."""
    if not isinstance(review_date,str) or date.fromisoformat(review_date).isoformat()!=review_date:
        raise ValueError('Expected ISO review date')
    from stage_lateral_crop34 import load_batch_stage
    stage, record = load_batch_stage(prefix, record_sha)
    base=(stage/'before.bin.gz').read_bytes(); data=(stage/'labels.bin.gz').read_bytes()
    before_raw=gzip.decompress(base); after_raw=gzip.decompress(data)
    if before_raw[:10]!=after_raw[:10] or len(before_raw)!=10+394*466*378:
        raise ValueError('Unexpected volume format')
    before=np.frombuffer(before_raw,np.uint8,offset=10).reshape((394,466,378),order='F')
    after=np.frombuffer(after_raw,np.uint8,offset=10).reshape(before.shape,order='F')
    exclusions=record['transition'] in ('mixed-ventricular-exclusions','23->0','24->0','25->0','26->0','41->0')
    brainstem_reclassification=record['transition']=='27->26'
    mixed_cavity=record['transition']=='mixed-to-26'
    partial_aqueduct=record['transition']=='mixed-to-41'
    mixed_repair=record['transition']=='mixed-ventricular-repair'
    posterior_repair=record['transition']=='mixed-posterior-ventricular-repair'
    bilateral_fill=record['transition']=='mixed-lateral-cavity-fill'
    cerebellar_repair=record['transition']=='mixed-cerebellar-folia-repair'
    septal_partial=record['transition']=='0->43'
    commissural_partial=record['transition']=='0->42'
    aqueduct_fourth=record['transition']=='mixed-aqueduct-fourth-repair'
    lgn_layers=record['transition']=='mixed-lgn-layers'
    fornix_body=record['transition']=='mixed-fornix-body-partial'
    right_foramen=prefix=='right-foramen36'
    if right_foramen:
        from stage_right_foramen36 import replay as replay_foramen
        if record_sha!='1a9fbde53ff9a6f8a4cd133a878b82acdef808327479115ba33ae73ce22d8a23' or record['transition']!='0->25':
            raise ValueError('Unreviewed right foramen core')
        if not np.array_equal(replay_foramen(before,record['points']),after) or not np.array_equal(replay_foramen(after,record['points'],True),before):
            raise ValueError('Right foramen replay differs')
    new_partial=septal_partial or commissural_partial
    points=np.asarray([p['xyz'] for p in record['points']] if exclusions or brainstem_reclassification or mixed_cavity or mixed_repair or partial_aqueduct or posterior_repair or bilateral_fill or cerebellar_repair or new_partial or aqueduct_fourth or lgn_layers or fornix_body else record['points']); count=record['count']
    if fornix_body:
        from stage_fornix_body987 import replay as replay_fornix
        if prefix!='fornix-body987' or record_sha!='d0a65f6f099c4dce798d4031737f7077d21627f605c08702a351efa4ae17dac8':raise ValueError('Unreviewed fornix body stage')
        fornix_decision=checked(ROOT/record['decision']['path'],'a7eb117d385a9a03c66edd88f54db29d623dc34142d802253937d667fb227cac')
        if not fornix_decision['approved'] or fornix_decision['expertReviewed'] or fornix_decision['sourceLabelSha256']!=record['beforeSha256']:raise ValueError('Fornix decision differs')
        for fig in fornix_decision['reviewedFigures']:
            if digest((ROOT/fig['path']).read_bytes())!=fig['sha256']:raise ValueError('Fornix reviewed figure differs')
        if not np.array_equal(replay_fornix(before,record['points']),after) or not np.array_equal(replay_fornix(after,record['points'],True),before):raise ValueError('Fornix replay differs')
        source_values=np.asarray([p['before'] for p in record['points']]);destination=np.asarray([p['after'] for p in record['points']]);affected={0,46}
    elif lgn_layers:
        from stage_lgn_layers2571 import replay as replay_lgn
        if prefix!='lgn-layers2571' or record_sha!='13453800cc0fce33956606d3726a9a0e26f2a29e14f1565201f2568e9cd2b8f3':raise ValueError('Unreviewed LGN layer stage')
        decision_path=ROOT/'work/visual-pathway-completion-20260916-v4/primary-lgn-decision.json'
        lgn_decision=checked(decision_path,'04a3b8873b80d34fee37056cd9a62488e0cdcf9935b63f0b4d9129d9b5ecfb20')
        if not lgn_decision['approved'] or lgn_decision['expertReviewed'] or lgn_decision['sourceLabelSha256']!=record['beforeSha256']:raise ValueError('LGN decision differs')
        for fig in lgn_decision['reviewedFigures']:
            if digest((ROOT/fig['path']).read_bytes())!=fig['sha256']:raise ValueError('LGN reviewed figure differs')
        if not np.array_equal(replay_lgn(before,record['points']),after) or not np.array_equal(replay_lgn(after,record['points'],True),before):raise ValueError('LGN replay differs')
        source_values=np.asarray([p['before'] for p in record['points']]);destination=np.asarray([p['after'] for p in record['points']]);affected={0,16,44,45}
    elif aqueduct_fourth:
        from stage_aqueduct_fourth44 import replay as replay_junction
        if prefix!='aqueduct-fourth44' or record_sha!='5ba7a57c4f49781aa98a0a0aadcb90af53ad3ecbc39ad2cc2b42e9b2f5037e1f':
            raise ValueError('Unreviewed aqueduct/fourth junction')
        if not np.array_equal(replay_junction(before,record['points']),after) or not np.array_equal(replay_junction(after,record['points'],True),before):
            raise ValueError('Junction replay differs')
        source_values=np.asarray([p['before'] for p in record['points']]);destination=np.asarray([p['after'] for p in record['points']]);affected={0,26,27,41}
    elif bilateral_fill:
        if prefix=='lateral-upper729' and record_sha=='cd0d9bb10cff47e170197d4cb37a25b9faac26d65f0ebe2fc996c0033f43f3ec':
            from stage_lateral_upper729 import replay as replay_bilateral
        elif prefix=='lateral-anterior1981' and record_sha=='835ee20097df4be2b38a0b5d6c7f5faaae3236aa72881beb0ddbf907aea69ba2':
            from stage_lateral_anterior1981 import replay as replay_bilateral
        elif prefix=='lateral-upper-nearblack1487' and record_sha=='c83a417c9a53bbae1f710da114c20317902cc7ad7cc0b41858fe7d924edd56c5':
            from stage_lateral_upper_nearblack1487 import replay as replay_bilateral
        elif prefix=='lateral-posterior196' and record_sha=='30778fec523fbd25e1ee17b1610c0878aba1c5a4da82d950517ed36acc13031f':
            from stage_lateral_posterior_september12 import replay as replay_bilateral
        elif prefix=='lateral-superomedial75' and record_sha=='37f5c397b5f99a4f32037a5bdfdc448d711d41bcbef7673756d6e69abf8e4114':
            from stage_lateral_superomedial75 import replay as replay_bilateral
        else:
            raise ValueError('Unreviewed bilateral cavity fill')
        if not np.array_equal(replay_bilateral(before,record['points']),after):raise ValueError('Bilateral replay differs')
        source_values=0;destination=np.asarray([p['after'] for p in record['points']]);affected={0,23,24}
    elif posterior_repair:
        from stage_posterior_ventricles158 import replay as replay_posterior
        if prefix!='posterior-ventricles158' or record_sha!='3d2670bbd02c1880d254c024c64aa2915f99454d9a41040bc7dcb42bee774cf1':
            raise ValueError('Unreviewed posterior ventricular repair')
        if not np.array_equal(replay_posterior(before,record['points']),after):raise ValueError('Posterior replay differs')
        source_values=np.asarray([p['before'] for p in record['points']]);destination=np.asarray([p['after'] for p in record['points']]);affected={0,25,27,41}
    elif mixed_repair:
        from stage_ventricular_mixed12 import replay as replay_mixed
        if prefix!='ventricular-mixed12' or record_sha!='7d688ef29bac9d40de94bbd21e0f5a9857e9e5e2439badb83d38ffb9e933d708':
            raise ValueError('Unreviewed mixed ventricular repair')
        if not np.array_equal(replay_mixed(before,record['points']),after):raise ValueError('Mixed replay differs')
        source_values=np.asarray([p['before'] for p in record['points']]);destination=np.asarray([p['after'] for p in record['points']]);affected={0,25,26}
    elif partial_aqueduct:
        from stage_aqueduct_core179 import replay as replay_aqueduct
        if prefix!='aqueduct-core179' or record_sha!='7fd5af19d6f0813b35c02cb98cf685616964d9866df4b08af1cb15288f493c70':
            raise ValueError('Unreviewed partial aqueduct repair')
        if not np.array_equal(replay_aqueduct(before,record['points']),after):raise ValueError('Aqueduct replay differs')
        source_values=np.asarray([p['before'] for p in record['points']]);destination=41;affected={0,27,41}
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
        if prefix=='fourth-depth27' and record_sha=='c2f7d98fdb51559b3ff785b873d80e932d4ecfd796c9fa6e073650ec697632a7':
            from stage_fourth_depth27 import replay as replay_depth
        elif prefix=='upper-fourth-gap' and record_sha=='875497e350c6e8573ee4c785c644a7833b53c619113bcfbe0b235c21017394fa':
            from stage_upper_fourth_gap import replay as replay_depth
        else:
            raise ValueError('Unreviewed mixed cavity repair')
        if not np.array_equal(replay_depth(before,record['points']),after):raise ValueError('Mixed cavity replay differs')
        source_values=np.asarray([p['before'] for p in record['points']]);destination=26;affected={0,26,27}
    elif cerebellar_repair:
        expected_record='8e93e2ded0be9333e4d2670c19bba39c76680b78c197302e40fdf4bf5a841ae7'
        expected_impact='94d77607d0877c1925e2589ba1c2158b9a0a4029ca289a0c8d42c7bc364b732f'
        if prefix!='cerebellar-folia197' or record_sha!=expected_record or mesh_report_sha!=expected_impact:
            raise ValueError('Unreviewed cerebellar folia repair')
        from stage_cerebellar_folia197 import replay as replay_cerebellar
        entries=record['points']
        transitions={(p.get('before'),p.get('after')) for p in entries}
        counts={pair:sum((p.get('before'),p.get('after'))==pair for p in entries) for pair in transitions}
        if count!=197 or transitions!={(0,28),(0,29),(27,28)} or counts!={(0,28):153,(0,29):38,(27,28):6}:
            raise ValueError('Invalid fixed cerebellar transition set')
        if not np.array_equal(replay_cerebellar(before,entries),after):raise ValueError('Cerebellar replay differs')
        source_values=np.asarray([p['before'] for p in entries]);destination=np.asarray([p['after'] for p in entries]);affected={0,27,28,29}
    elif septal_partial:
        if (prefix!='septal-membrane282' or record_sha!='3dc0eda90e13160d41907143dadf5c5545cfea37d25c46d12eb45c6ede63139e'
                or mesh_report_sha!='a052df6a7e683eee64ae8d32b35aa757e4119464370faa0358ee31ee4e6ecbea' or count!=282):
            raise ValueError('Unreviewed partial septal membrane')
        from stage_septal_membrane282 import replay as replay_septal
        if np.any(before==43) or not np.array_equal(replay_septal(before,record['points']),after):
            raise ValueError('Partial septal replay differs or ID43 is occupied')
        source_values=0;destination=43;affected={0,43}
    elif commissural_partial:
        if (prefix!='anterior-commissure-core416' or record_sha!='d7070d39f5f3582740e72310ea5b3584ea0f8aff538b606b20482e50ae719672'
                or mesh_report_sha!='118d9972225357b7e0592e474dbf606ba7a618cebb57a47b46b95c96507a6756' or count!=416):
            raise ValueError('Unreviewed partial anterior commissure')
        from stage_anterior_commissure_core416 import replay as replay_commissural
        if np.any(before==42) or not np.array_equal(replay_commissural(before,record['points']),after):
            raise ValueError('Partial commissural replay differs or ID42 is occupied')
        source_values=0;destination=42;affected={0,42}
    elif record['transition']=='30->0':
        from stage_callosal_remaining304 import replay as replay_callosal
        if prefix!='callosal-remaining304' or record_sha!='777c2e4d4a6f5a0f2e1df1fb95d462586b8cdd84001ebf112ea0b8a6b1966ce7':
            raise ValueError('Unreviewed callosal exclusion')
        if not np.array_equal(replay_callosal(before,points),after):raise ValueError('Callosal replay differs')
        source_values=30;destination=0;affected={0,30}
    elif record['transition']=='27->0':
        from stage_midbrain_interface14 import replay as replay_interface
        if prefix!='midbrain-interface14' or record_sha!='c19a98eceed7ef2e307409a7740553410143d630ea38aed69b5c385c4352c751':
            raise ValueError('Unreviewed midbrain interface hold')
        if not np.array_equal(replay_interface(before,points),after):raise ValueError('Interface hold replay differs')
        source_values=27;destination=0;affected={0,27}
    elif record['transition']=='0->27':
        from stage_midbrain_ventral14803 import replay as replay_ventral
        if prefix!='midbrain-ventral14803' or record_sha!='8fff92c8ee7bc4e0d0c5de27caf54a40c3a8c77ea95c6e47815cd4d7a5fefb7d':
            raise ValueError('Unreviewed brainstem tissue fill')
        if not np.array_equal(replay_ventral(before,points),after):raise ValueError('Ventral repair replay differs')
        source_values=0;destination=27;affected={0,27}
    else:
        transition=record['transition'].split('->')
        if len(transition)!=2 or transition[0]!='0' or transition[1] not in ('23','24','25','26'):
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
    if new_partial and changed_parts:raise ValueError('New partial label must not change existing block masks')
    if changed_parts and not mesh_report_sha:
        raise ValueError('Block changes require a pinned impact report')
    if cerebellar_repair:
        if (len(changed_parts)!=1 or (changed_parts[0]['block'],changed_parts[0]['part'])!=('hindbrain','cerebellum')
                or changed_parts[0]['changedMaskVoxels']!=22 or changed_parts[0]['added']!=22 or changed_parts[0]['removed']!=0):
            raise ValueError('Unexpected cerebellar block impact')
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
                # Older block entries lack a metadata digest. Their actual bytes
                # must still match the independently reproduced baseline above.
                or entry.get('meshSha256') not in (None,part['beforeSha256'],part['afterSha256'])
                or (ATLAS/name).read_bytes() not in (old_mesh,new_mesh)):
            raise ValueError('Block byte mismatch')
        retained_meshes.append((ROOT/'tests/fixtures'/(name[:-5]+'-pre-'+prefix+'.mesh'),old_mesh))
        mesh_writes.append((ATLAS/name,new_mesh))
        entry.update(vertices=part['vertices'],faces=part['faces'],meshSha256=part['afterSha256'],
            segmentationSourceSha256=record['afterSha256'],
            repairReview=('AI-image-reviewed local cerebellar folia repair; derived block synchronized. Development only, not expert review.'
                if cerebellar_repair else 'AI-image-reviewed local callosal exclusion; derived block synchronized. Development only, not expert review.'
                if record['transition']=='30->0' else 'AI-image-reviewed partial lower-midbrain tissue repair; derived block synchronized. Development only, not expert review.'
                if record['transition']=='0->27' else 'AI-image-reviewed regional cavity repair; derived block synchronized. Development only, not expert review.'))
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
    independent_retained=[]; independent_updates=[]
    if aqueduct_fourth or right_foramen or lgn_layers or fornix_body:
        from build_section_ventricle_meshes import reconstruct
        from stage_aqueduct_fourth44 import encode
        groups=[('aqueduct-partial',(41,)),('brainstem',(27,)),('internal-capsule',(31,32)),('cerebellum',(28,29)),('septum-pellucidum-partial',(43,)),('anterior-commissure-partial',(42,))]
        if fornix_body:groups.append(('lateral-geniculate-bodies',(44,45)))
        for name,ids in groups:
            stem='section-current-'+name
            meta_path=ATLAS/(stem+'.json');mesh_path=ATLAS/(stem+'.mesh')
            old_meta_data=meta_path.read_bytes();old_meta=json.loads(old_meta_data);old_mesh=mesh_path.read_bytes()
            if old_meta['sourceSha256']!=record['beforeSha256'] or digest(old_mesh)!=old_meta['sha256']:
                raise ValueError('Independent section baseline differs: '+name)
            independent_retained.append((ROOT/'tests/fixtures'/(stem+'-pre-'+prefix+'.json'),old_meta_data))
            meta=dict(old_meta)
            if not np.array_equal(np.isin(before,ids),np.isin(after,ids)):
                raw_old,_=reconstruct(np.isin(before,ids).transpose(2,1,0))
                compressed=old_mesh[:2]==b'\x1f\x8b'
                if (gzip.decompress(old_mesh) if compressed else old_mesh)!=raw_old:raise ValueError('Independent baseline reconstruction differs')
                raw_mesh,details=reconstruct(np.isin(after,ids).transpose(2,1,0));mesh=encode(raw_mesh) if compressed else raw_mesh
                meta.update(details,sha256=digest(mesh),bytes=len(mesh))
                if compressed:
                    meta.update(rawSha256=digest(raw_mesh),storedSha256=digest(mesh),rawBytes=len(raw_mesh),storedBytes=len(mesh))
                if 'labelVoxelCounts' in meta:meta['labelVoxelCounts']={str(k):int((after==k).sum()) for k in ids}
                meta['reviewRecord']=f'segmentation-patches/review/{prefix}-adoption-{review_date}.json'
                independent_retained.append((ROOT/'tests/fixtures'/(stem+'-pre-'+prefix+'.mesh'),old_mesh))
                independent_updates.append((mesh_path,mesh))
            meta['sourceSha256']=record['afterSha256']
            independent_updates.append((meta_path,serialized(meta)))
    if prefix in ('upper-fourth-gap','cerebellar-folia197','septal-membrane282','anterior-commissure-core416'):
        independent_groups=[('aqueduct-partial', (41,)), ('internal-capsule', (31, 32))]
        if new_partial:independent_groups += [('cerebellum',(28,29)),('brainstem',(27,))]
        if commissural_partial:independent_groups += [('septum-pellucidum-partial',(43,))]
        for name, ids in independent_groups:
            if not np.array_equal(np.isin(before, ids), np.isin(after, ids)):
                raise ValueError('Independent section mask changed: '+name)
            meta_path = ATLAS/('section-current-'+name+'.json')
            mesh_path = ATLAS/('section-current-'+name+'.mesh')
            meta_data = meta_path.read_bytes(); meta = json.loads(meta_data)
            if meta.get('sourceSha256') not in (record['beforeSha256'], record['afterSha256']) or digest(mesh_path.read_bytes()) != meta.get('sha256'):
                raise ValueError('Independent section baseline changed: '+name)
            fixture_path = ROOT/'tests/fixtures'/('section-current-'+name+'-pre-'+prefix+'.json')
            retained_data = meta_data
            if meta['sourceSha256'] == record['afterSha256']:
                retained_data = fixture_path.read_bytes()
                retained_meta = json.loads(retained_data)
                if retained_meta.get('sourceSha256') != record['beforeSha256']:
                    raise ValueError('Independent section fixture source changed: '+name)
                for key in set(retained_meta) | set(meta):
                    if key != 'sourceSha256' and retained_meta.get(key) != meta.get(key):
                        raise ValueError('Independent section metadata changed: '+name)
            meta['sourceSha256'] = record['afterSha256']
            independent_retained.append((fixture_path, retained_data))
            independent_updates.append((meta_path, serialized(meta)))
    record_path=ROOT/f'segmentation-patches/review/{prefix}-adoption-{review_date}.json'
    record.update(status='AI-image-reviewed-project-adopted-development-only',adopted=True,projectAdopted=True,
        expertReviewed=False,published=False,meshImpact=impact,
        sectionMeshImpact=dict(before=old_report,after=new_report,changedFiles=changed))
    if aqueduct_fourth:
        record.update(installed=True,independentSectionChanges=['section-current-aqueduct-partial.mesh','section-current-brainstem.mesh'])
    if right_foramen:
        record.update(installed=True,independentSectionChanges=[])
    if fornix_body:
        from build_section_ventricle_meshes import reconstruct,DISPLAY_ORIGIN_ZYX
        from stage_aqueduct_fourth44 import encode
        raw_mesh,mesh_details=reconstruct((after==46).transpose(2,1,0));mesh=encode(raw_mesh)
        stem='section-current-fornix-body-partial'
        mesh_meta=dict(**mesh_details,source=SOURCE.name,sourceSha256=record['afterSha256'],labelIds=[46],
            labelVoxelCounts={'46':987},sourceSamplingMm=.5,displayOriginZYX=DISPLAY_ORIGIN_ZYX.tolist(),
            method='native-image-reviewed partial body; marching cubes 0.5; no resampling, smoothing or filling',
            rawSha256=digest(raw_mesh),rawBytes=len(raw_mesh),compression='gzip',expertReviewed=False,partialExtent=True,
            scope=fornix_decision['limitation'],reviewRecord=record_path.relative_to(ROOT).as_posix())
        mesh_meta.update(sha256=digest(mesh),bytes=len(mesh))
        for path,payload in [(ATLAS/(stem+'.mesh'),mesh),(ATLAS/(stem+'.json'),serialized(mesh_meta))]:
            if path.exists() and path.read_bytes()!=payload:raise ValueError('Unrelated fornix section asset')
            independent_updates.append((path,payload))
        record.update(installed=True,primaryReview=fornix_decision,newSectionMesh=mesh_meta)
    if lgn_layers:
        from build_section_ventricle_meshes import reconstruct,DISPLAY_ORIGIN_ZYX
        from stage_aqueduct_fourth44 import encode
        raw_mesh,mesh_details=reconstruct(np.isin(after,[44,45]).transpose(2,1,0));mesh=encode(raw_mesh)
        stem='section-current-lateral-geniculate-bodies'
        mesh_meta=dict(**mesh_details,source=SOURCE.name,sourceSha256=record['afterSha256'],labelIds=[44,45],
            labelVoxelCounts={'44':1197,'45':1374},sourceSamplingMm=.5,displayOriginZYX=DISPLAY_ORIGIN_ZYX.tolist(),
            method='published six-layer union; nearest-neighbour official registration; marching cubes 0.5; no filling or smoothing',
            rawSha256=digest(raw_mesh),rawBytes=len(raw_mesh),compression='gzip',expertReviewed=False,
            reviewRecord=record_path.relative_to(ROOT).as_posix(),sourceDataset=record['sourceDataset'])
        mesh_meta.update(sha256=digest(mesh),bytes=len(mesh))
        for path,payload in [(ATLAS/(stem+'.mesh'),mesh),(ATLAS/(stem+'.json'),serialized(mesh_meta))]:
            if path.exists() and path.read_bytes()!=payload:raise ValueError('Unrelated LGN section asset')
            independent_updates.append((path,payload))
        record.update(installed=True,rationale=lgn_decision['rationale'],limitation=lgn_decision['limitation'],
            primaryReview=lgn_decision,newSectionMesh=mesh_meta)
    if prefix == 'upper-fourth-gap':
        decision_info = record.get('decision', {})
        decision_path = ROOT/decision_info.get('path', '')
        decision = checked(decision_path, decision_info.get('sha256'))
        if (decision.get('approved') is not True or decision.get('expertReviewed') is not False
                or decision.get('reviewer') != 'primary AI project review; not expert review'
                or not isinstance(decision.get('reviewNote'), str)):
            raise ValueError('Upper-fourth review decision is incomplete')
        record.update(
            installed=True,
            rationale=decision['reviewNote'],
            limitation=('Local project adoption, not expert-reviewed; does not close the remaining '
                        'aqueduct/fourth-ventricle gap; no public deployment.'),
        )
    if prefix == 'cerebellar-folia197':
        decision_info=record.get('decision',{})
        decision=checked(ROOT/decision_info.get('path',''),decision_info.get('sha256'))
        if (decision.get('approved') is not True or decision.get('expertReviewed') is not False
                or decision.get('sourceLabelsSha256')!=record['beforeSha256']
                or not isinstance(decision.get('reviewNote'),str)):
            raise ValueError('Cerebellar review decision is incomplete')
        record.update(installed=True,rationale=decision['reviewNote'],
            limitation=('Local project adoption of 197 explicitly reviewed folial cells, not expert-reviewed or publicly deployed. '
                        'Five disconnected candidates remain deferred; no joining fill or completion of cerebellar boundaries.'))
    if new_partial:
        decision_info=record['decision'];decision=checked(ROOT/decision_info['path'],decision_info['sha256'])
        if decision.get('approved') is not True or decision.get('expertReviewed') is not False or decision.get('sourceLabelsSha256')!=record['beforeSha256']:
            raise ValueError('Partial structure decision differs')
        name='section-current-septum-pellucidum-partial' if septal_partial else 'section-current-anterior-commissure-partial'
        ident=43 if septal_partial else 42
        expected_mesh_sha='688cfc9feceee6d62612df273e598f73e8cbcee84c7ed53390b50668472a5e91' if septal_partial else 'b0772400be64709cf58c13c4b955940f01b51269c376a0a62a1bc83c8ef07292'
        mesh_data=(ROOT/f'work/anatomy-review/{prefix}-meshes-v1/{name}.mesh').read_bytes()
        if digest(mesh_data)!=expected_mesh_sha:
            raise ValueError('Partial structure mesh differs')
        from build_section_ventricle_meshes import reconstruct,DISPLAY_ORIGIN_ZYX
        raw_mesh,mesh_evidence=reconstruct((after==ident).transpose(2,1,0))
        if gzip.decompress(mesh_data)!=raw_mesh:raise ValueError('Partial structure mesh does not reconstruct current label')
        mesh_meta={**mesh_evidence,'source':SOURCE.name,'sourceSha256':record['afterSha256'],'labelIds':[ident],
            'labelVoxelCounts':{str(ident):count},'sourceSamplingMm':.5,'displayOriginZYX':DISPLAY_ORIGIN_ZYX.tolist(),
            'method':'marching cubes 0.5; no resampling, smoothing, filling or component removal',
            'rawSha256':digest(raw_mesh),'rawBytes':len(raw_mesh),'sha256':digest(mesh_data),'bytes':len(mesh_data),
            'compression':'gzip','partialExtent':True,'expertReviewed':False,'installed':True,'scope':decision['limitation']}
        for path,payload in [(ATLAS/(name+'.mesh'),mesh_data),(ATLAS/(name+'.json'),serialized(mesh_meta))]:
            if path.exists() and path.read_bytes()!=payload:raise ValueError('Unrelated partial structure asset')
            independent_updates.append((path,payload))
        record.update(installed=True,rationale=decision['reviewNote'],limitation=decision['limitation'],
            newSectionMesh=mesh_meta)
    if isinstance(record['limitation'],str):
        record['limitation']=record['limitation'].replace('Mesh synchronization and product adoption pending.','Integration verification recorded separately; not public deployment.')
        record['limitation']=record['limitation'].replace('Product adoption and mesh synchronization pending.','Integration verification recorded separately; not public deployment.')
        record['limitation']=record['limitation'].replace('Mesh/adoption pending.','Integration verification recorded separately; not public deployment.')
    else:
        record['limitation'].append('Adoption record supersedes the work-stage status above; integration verification is recorded separately, not public deployment.')
    record_data=serialized(record)
    meta_path=ATLAS/'bigbrain-practical-segmentation-icbm500-validation.json'
    meta=json.loads(meta_path.read_bytes())
    if meta['rawVoxelSha256'] not in (digest(before_raw[10:]),record['afterRawVoxelSha256']):raise ValueError('Metadata changed')
    meta['rawVoxelSha256']=record['afterRawVoxelSha256']
    for ident in affected:meta['labelCounts'][str(ident)]=int((after==ident).sum())
    if lgn_layers:
        meta['labelNames'].update({'44':'left lateral geniculate nucleus (published BigBrain layer union)','45':'right lateral geniculate nucleus (published BigBrain layer union)'})
        meta['publishedCytoarchitectonicIds']=sorted(set(meta.get('publishedCytoarchitectonicIds',[]))|{44,45})
    if fornix_body:
        meta['labelNames']['46']='fornix body (partial image-reviewed extent)'
        for key in ('imageGuidedCandidateIds','projectReviewedPartialIds'):
            meta[key]=sorted(set(meta.get(key,[]))|{46})
    if new_partial:
        ident=43 if septal_partial else 42
        meta['labelNames'][str(ident)]='septum pellucidum (partial membrane)' if septal_partial else 'anterior commissure (partial core)'
        for key in ('imageGuidedCandidateIds','projectReviewedPartialIds'):
            meta[key]=sorted(set(meta.get(key,[]))|{ident})
    audits=meta.setdefault('regionalBatchAudits',{})
    audits[prefix]=dict(record=record_path.relative_to(ROOT).as_posix(),recordSha256=digest(record_data),
        changedVoxelCount=count,projectAdopted=True,expertReviewed=False,changedSectionMeshes=changed)
    retained=retained_meshes+[(ROOT/f'tests/fixtures/bigbrain-practical-segmentation-pre-{prefix}.bin.gz',base),(record_path,record_data)]
    if prefix == 'upper-fourth-gap':
        # Preserve every derived section asset whose bytes change.  This is
        # assembled during preflight and written only by an explicit --apply.
        retained += [
            (ROOT/'tests/fixtures'/(Path(name).stem+'-pre-'+prefix+Path(name).suffix), old_assets[name])
            for name in new_assets if old_assets[name] != new_assets[name]
        ]
    for path,payload in retained + independent_retained:
        if path.exists() and path.read_bytes()!=payload:raise ValueError('Retained evidence changed')
    if changed_parts:mesh_writes.append((ATLAS/'specimen-blocks.json',serialized(manifest)))
    return retained+independent_retained+mesh_writes+[(SOURCE,data),(meta_path,serialized(meta))]+[(ATLAS/n,b) for n,b in new_assets.items()]+independent_updates


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true')
    parser.add_argument('--stage-prefix')
    parser.add_argument('--record-sha')
    parser.add_argument('--mesh-report-sha')
    parser.add_argument('--review-date',default='2026-09-07')
    args = parser.parse_args()
    if bool(args.stage_prefix)!=bool(args.record_sha):raise ValueError('Stage and SHA required together')
    if args.mesh_report_sha and not args.stage_prefix:raise ValueError('Mesh report requires a regional stage')
    if args.review_date!='2026-09-07' and not args.stage_prefix:raise ValueError('Review date requires a regional stage')
    changes = plan_unchanged_blocks(args.stage_prefix,args.record_sha,args.mesh_report_sha,review_date=args.review_date) if args.stage_prefix else plan()
    if args.apply:
        for path, data in changes:
            path.write_bytes(data)
    print(json.dumps(dict(preflightPassed=True, applied=args.apply, files=[p.relative_to(ROOT).as_posix() for p, _ in changes])))
