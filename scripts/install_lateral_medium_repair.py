"""Preflight the image-reviewed 867-point repair; explicit --apply installs locally."""
import argparse
import json
import numpy as np
from stage_lateral_fringe_repair import ROOT, replay, digest, encode
from build_orthogonal_review_bundle import DEFAULT_LABELS, MAGIC_LABELS, read_browser_volume
from install_third_ventricle_core_repair import checked

BASE='b473638881ac75dc3ce27cf9963d612ffa41f768906e895f2281954c44be9567'
FINAL='0d31037722a8a31eee3ff6feed49dc076ece3d6c864297240c687cd1526cc229'
RAW='b36c2bc3f2ceb8701283dde2cfdd47305b8861e11d357762bd1c160e9dafaa9d'
EXPECTED=[('lateral-ventricle','tissue',147),('lateral-ventricle','ventricular-cavity',27),('commissural-system','tissue',8),('commissural-system','lateral-ventricles',46),('choroid-plexus','tissue',114),('choroid-plexus','ventricular-cavity',27),('medial-temporal','inferior-horn',7)]

def serialized(record):return (json.dumps(record,ensure_ascii=False,indent=2)+'\n').encode('utf-8')

def plan():
    work=ROOT/'work/anatomy-review';stage=work/'lateral-fringe-medium-stage-v1';meshes=work/'lateral-fringe-medium-meshes-v1'
    record=checked(stage/'repair.json','0a0eb1962cdd19991b951cd0b0a957d57b90118c746fb7ef29c48c0301ca7ab5')
    finite=checked(work/'lateral-fringe-medium-finite-support-v1.json','9934fedcab96d57ef52534ade2f4bc8f67b846f3b6162204af3df6739bb58525')
    if {(tuple(p['xyz']),p['target']) for p in finite['records']} != {(tuple(p['xyz']),p['after']) for p in record['points']}:raise ValueError('Finite coverage changed')
    impact=checked(meshes/'report.json','0da30da6eb54d3fcd1fd4b9182731487c7b9f47428bec75ae76669004c13c6f4')
    context=checked(work/'lateral-fringe-medium-context-v1.json','01b85eee15cadf1499bb29c94c3e22993fd0771d9a5dce5168a68f377cd0ddf5')
    union_dir=work/'lateral-fringe-medium-union-v1'
    union=checked(union_dir/'report.json','b1596dd128c195cc151cd73a733c154e10a89b88f853d53e4f5e986b92002323')
    if union['totalPanels']!=745 or len(union['figures'])!=357 or len(union['unchangedPanels'])!=388:raise ValueError('Union coverage changed')
    for f in union['figures']:
        if digest((union_dir/f['path']).read_bytes())!=f['sha256']:raise ValueError('Union image changed')
    if digest((ROOT/'scripts/build_specimen_blocks.py').read_bytes())!=context['sourceCodeSha256']:raise ValueError('Generator changed')
    if len(context['changes'])!=269 or not context['unionReplayExact'] or not context['reverseExact']:raise ValueError('Context coverage changed')
    for c in context['changes']:
        if c['reason']!='unchanged-tissue-enters-distance-cutoff' or c['labelBefore']!=c['labelAfter'] or not c['distanceBeforeMm']>c['cutoffMm']>=c['distanceAfterMm']:raise ValueError('Unexplained context')
    changed=[p for p in impact['blockMaskImpact'] if p['changedMaskVoxels']]
    if len(impact['blockMaskImpact'])!=55 or len(changed)!=7 or impact['installationBlocked']:raise ValueError('Mask impact changed')
    manifest_path=ROOT/'public/atlas/specimen-blocks.json';manifest=json.loads(manifest_path.read_text(encoding='utf-8'));retained=[];updates=[]
    for p,(block,key,count) in zip(changed,EXPECTED):
        name=f'block-{block}-{key}.mesh';source=ROOT/'public/atlas'/name
        if p['file']!=name or p['changedMaskVoxels']!=count or not p['beforeMatches'] or p['beforeSha256']!=p['reproducedBeforeSha256']:raise ValueError('Mesh identity changed')
        previous=(meshes/('installed-'+name)).read_bytes();after=(meshes/name).read_bytes()
        if digest(previous)!=p['beforeSha256'] or digest(after)!=p['afterSha256'] or digest(source.read_bytes()) not in (p['beforeSha256'],p['afterSha256']):raise ValueError('Mesh bytes changed')
        retained.append((ROOT/'tests/fixtures'/('pre-lateral-medium-'+name),previous));updates.append((source,after))
        entry=next(e for e in manifest['specimens'][block] if e['part']==key)
        entry.update(vertices=p['vertices'],faces=p['faces'],meshSha256=p['afterSha256'],segmentationSourceSha256=FINAL,repairReview='Image-reviewed local lateral cavity omissions; context distance rules unchanged. Not expert reviewed.')
    _,_,before=read_browser_volume(stage/'base.bin.gz',MAGIC_LABELS,BASE);after=replay(before,record['points']);data=encode(after)
    if len(record['points'])!=867 or np.count_nonzero(before!=after)!=867 or digest(data)!=FINAL or digest(after.tobytes(order='F'))!=RAW or not np.array_equal(replay(after,record['points'],True),before):raise ValueError('Replay changed')
    if record['transitions']!={'0->23':555,'0->24':312} or digest(DEFAULT_LABELS.read_bytes()) not in (BASE,FINAL):raise ValueError('Baseline changed')
    record_path=ROOT/'segmentation-patches/review/lateral-medium-adoption-2026-09-07.json'
    record.update(adopted=True,projectAdopted=True,installed=True,expertReviewed=False,published=False,status='AI-image-reviewed-project-adopted-development-only',meshImpact=impact,contextMaskExplanation=context,unionImageReview=dict(reportSha256=digest((union_dir/'report.json').read_bytes()),reviewedChangedPanels=357,identicalPreviouslyReviewedPanels=388))
    record['limitations'][-1]='Development integration only; tests/build/browser verification recorded separately. Not published.'
    record_data=serialized(record)
    meta_path=ROOT/'public/atlas/bigbrain-practical-segmentation-icbm500-validation.json';meta=json.loads(meta_path.read_text(encoding='utf-8'))
    if meta['rawVoxelSha256'] not in (record['inputRawSha256'],RAW):raise ValueError('Metadata changed')
    meta['rawVoxelSha256']=RAW
    for ident in (0,23,24):meta['labelCounts'][str(ident)]=int(np.count_nonzero(after==ident))
    meta['lateralMediumAudit']=dict(record=record_path.relative_to(ROOT).as_posix(),recordSha256=digest(record_data),changedVoxelCount=867,projectAdopted=True,expertReviewed=False,changedBlockPartMasks=[p['file'] for p in changed])
    retained.extend([(ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-lateral-medium-b473.bin.gz',(stage/'base.bin.gz').read_bytes()),(record_path,record_data)])
    for path,value in retained:
        if path.exists() and path.read_bytes()!=value:raise ValueError('Recovery evidence changed')
    return retained+updates+[(DEFAULT_LABELS,data),(meta_path,serialized(meta)),(manifest_path,serialized(manifest))]

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--apply',action='store_true');args=parser.parse_args();changes=plan()
    if args.apply:
        for path,data in changes:path.write_bytes(data)
    print(json.dumps(dict(preflightPassed=True,applied=args.apply,files=[p.relative_to(ROOT).as_posix() for p,_ in changes])))
