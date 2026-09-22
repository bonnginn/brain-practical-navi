"""Preflight and explicitly install the image-reviewed eight-cell roof repair locally."""
import argparse
import json
import numpy as np
from stage_lateral_roof8 import ROOT, BASE, DEFAULT_LABELS, MAGIC_LABELS, read_browser_volume, replay, digest

FINAL = 'd7fc87b5b18e1221c2979aeab9d6fefeefcfd4d353cfc78cab782930f32f8e29'

def serialized(value):
    return (json.dumps(value,ensure_ascii=False,indent=2)+'\n').encode('utf-8')

def checked(path, sha):
    data=path.read_bytes()
    if digest(data)!=sha:
        raise ValueError('Evidence changed: '+str(path))
    return json.loads(data)

def plan():
    work=ROOT/'work/anatomy-review';atlas=ROOT/'public/atlas'
    stage=work/'lateral-roof8-stage-v1';sections=work/'lateral-roof8-section-meshes-v1'
    r=checked(stage/'repair.json','3dfceac94f3b09f458efac3efb92854c835c158d957289e37f5b92cb107f1728')
    impact=checked(work/'lateral-roof8-meshes-v1/report.json','8b1322e3711b1cefed0ecf988b70b948dab472f3c5125ae5bf0d900e3ab7f8a8')
    section=checked(sections/'report.json','355b791399ee6f47a739097d45fb539c97917e9d034c5a7070caccbfcff21095')
    for e in r['evidence']:
        if digest((ROOT/e['path']).read_bytes())!=e['sha256']:
            raise ValueError('Reviewed image changed')
    _,_,before=read_browser_volume(stage/'before.bin.gz',MAGIC_LABELS,BASE)
    _,_,after=read_browser_volume(stage/'labels.bin.gz',MAGIC_LABELS,FINAL)
    if not np.array_equal(replay(before,r['points']),after) or not np.array_equal(replay(after,r['points'],True),before):
        raise ValueError('Replay failed')
    if digest(DEFAULT_LABELS.read_bytes())!=BASE:
        raise ValueError('Current baseline changed')
    if impact['installationBlocked'] or len(impact['blockMaskImpact'])!=55 or any(p['changedMaskVoxels'] for p in impact['blockMaskImpact']):
        raise ValueError('Unexpected block impact')
    if set(section['changedMeshes'])!={'section-current-lateral-ventricles.mesh','section-current-ventricular-system.mesh'} or not section['allBeforeAssetsMatch']:
        raise ValueError('Unexpected section impact')
    if section['beforeSha256']!=BASE or section['afterSha256']!=FINAL or impact['inputSha256']!=BASE or impact['outputSha256']!=FINAL:
        raise ValueError('Wrong source chain')
    updates=[(ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-lateral-roof8.bin.gz',(stage/'before.bin.gz').read_bytes())]
    for name, info in section['before']['meshes'].items():
        file=name+'.mesh';existing=(atlas/file).read_bytes();new=(sections/file).read_bytes()
        if digest(existing)!=info['sha256'] or digest(new)!=section['after']['meshes'][name]['sha256']:
            raise ValueError('Mesh changed')
        if file in section['changedMeshes']:
            updates.extend([(ROOT/'tests/fixtures'/(name+'-pre-lateral-roof8.mesh'),existing),(atlas/file,new)])
    updates.append((atlas/'section-current-ventricles.json',(sections/'section-current-ventricles.json').read_bytes()))
    # These independent exact-grid geometries are unchanged; carry their verified source revision forward.
    for name, ids in [('aqueduct-partial',[41]),('internal-capsule',[31,32])]:
        if not np.array_equal(np.isin(before,ids),np.isin(after,ids)):
            raise ValueError('Unchanged mask assertion failed')
        path=atlas/('section-current-'+name+'.json');data=path.read_bytes();meta=json.loads(data)
        if meta['sourceSha256']!=BASE or digest((atlas/('section-current-'+name+'.mesh')).read_bytes())!=meta['sha256']:
            raise ValueError('Independent mesh baseline changed')
        meta['sourceSha256']=FINAL
        updates.extend([(ROOT/'tests/fixtures'/('section-current-'+name+'-pre-lateral-roof8.json'),data),(path,serialized(meta))])
    r.update(adopted=True,projectAdopted=True,installed=True,published=False,
             status='AI-image-reviewed-project-adopted-development-only',meshImpact=impact,sectionMeshImpact=section)
    r['limitation']=r['limitation'].replace('Installation pending.','Locally installed; validation recorded in docs. Not published.')
    record_path=ROOT/'segmentation-patches/review/lateral-roof8-adoption-2026-09-15.json';record_data=serialized(r)
    meta_path=atlas/'bigbrain-practical-segmentation-icbm500-validation.json';meta=json.loads(meta_path.read_bytes())
    if meta['rawVoxelSha256']!=digest(before.tobytes(order='F')):
        raise ValueError('Metadata baseline changed')
    meta['rawVoxelSha256']=r['afterRawVoxelSha256']
    for k,v in r['countsAfter'].items():meta['labelCounts'][k]=v
    meta['regionalBatchAudits']['lateral-roof8']=dict(record=record_path.relative_to(ROOT).as_posix(),recordSha256=digest(record_data),changedVoxelCount=8,projectAdopted=True,expertReviewed=False,changedBlockPartMasks=[])
    revision=ROOT/'app/segmentationLabelRevision.ts';revision_data=revision.read_bytes()
    if BASE.encode() not in revision_data:raise ValueError('Cache revision changed')
    updates.extend([(record_path,record_data),(DEFAULT_LABELS,(stage/'labels.bin.gz').read_bytes()),(meta_path,serialized(meta)),(revision,revision_data.replace(BASE.encode(),FINAL.encode()))])
    for path,data in updates:
        if ('tests/fixtures' in path.as_posix() or path==record_path) and path.exists() and path.read_bytes()!=data:
            raise ValueError('Recovery evidence already exists')
    return updates

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--apply',action='store_true');args=parser.parse_args()
    updates=plan()
    if args.apply:
        for path,data in updates:path.write_bytes(data)
    print(json.dumps(dict(preflightPassed=True,applied=args.apply,files=[p.relative_to(ROOT).as_posix() for p,_ in updates])))
