"""Preflight the image-reviewed 630-point repair; explicit --apply installs locally."""
import argparse
import json
import numpy as np
from stage_lateral_fringe_repair import ROOT, replay, digest, encode
from build_orthogonal_review_bundle import DEFAULT_LABELS, MAGIC_LABELS, read_browser_volume
from install_third_ventricle_core_repair import checked

BASE='7c54fdd2e391ca3e1ed70f7e5fdead7be940d1007b891eb4bb4dd22d7407f0ef'
FINAL='b473638881ac75dc3ce27cf9963d612ffa41f768906e895f2281954c44be9567'
RAW='3c295bb532aacc1654f44fd20d2c6524644ef42e83d0ac44f8078607bffaf922'
EXPECTED=[('lateral-ventricle','tissue',8),('lateral-ventricle','ventricular-cavity',34),('commissural-system','lateral-ventricles',41),('choroid-plexus','tissue',18),('choroid-plexus','ventricular-cavity',34),('medial-temporal','inferior-horn',1)]

def serialized(record):return (json.dumps(record,ensure_ascii=False,indent=2)+'\n').encode('utf-8')

def plan():
    work=ROOT/'work/anatomy-review';stage=work/'lateral-fringe-remaining-large-stage-v1';meshes=work/'lateral-fringe-remaining-large-meshes-v1'
    record=checked(stage/'repair.json','48e2fea89750e10afbbdd812628cebfcac5e004f2f235858992543804687ece1')
    impact=checked(meshes/'report.json','0197ff47513012eac595af9365d5fbcc121cb3730566c5b1b8de4b6fbbc2fab7')
    context=checked(work/'lateral-fringe-remaining-large-support-v1.json','33a3db07f394f61980f82ef9d7524e3b2abb65601ad4047232238edb2c6a51d1')
    union_dir=work/'lateral-fringe-remaining-large-union-v1'
    union=checked(union_dir/'report.json','c88f11f8bbfb074e076c8435618f68805be738d586cde0632b824c3b26f69cda')
    if union['totalPanels']!=308 or len(union['figures'])!=124 or len(union['unchangedPanels'])!=184:raise ValueError('Union coverage changed')
    for f in union['figures']:
        if digest((union_dir/f['path']).read_bytes())!=f['sha256']:raise ValueError('Union image changed')
    if digest((ROOT/'scripts/build_specimen_blocks.py').read_bytes())!=context['sourceCodeSha256']:raise ValueError('Generator changed')
    if len(context['changes'])!=26 or not context['unionReplayExact'] or not context['reverseExact']:raise ValueError('Context coverage changed')
    for c in context['changes']:
        if c['reason']!='unchanged-tissue-enters-distance-cutoff' or c['labelBefore']!=c['labelAfter'] or not c['distanceBeforeMm']>c['cutoffMm']>=c['distanceAfterMm']:raise ValueError('Unexplained context')
    changed=[p for p in impact['blockMaskImpact'] if p['changedMaskVoxels']]
    if len(impact['blockMaskImpact'])!=55 or len(changed)!=6 or impact['installationBlocked']:raise ValueError('Mask impact changed')
    manifest_path=ROOT/'public/atlas/specimen-blocks.json';manifest=json.loads(manifest_path.read_text(encoding='utf-8'));retained=[];updates=[]
    for p,(block,key,count) in zip(changed,EXPECTED):
        name=f'block-{block}-{key}.mesh';source=ROOT/'public/atlas'/name
        if p['file']!=name or p['changedMaskVoxels']!=count or not p['beforeMatches'] or p['beforeSha256']!=p['reproducedBeforeSha256']:raise ValueError('Mesh identity changed')
        previous=(meshes/('installed-'+name)).read_bytes();after=(meshes/name).read_bytes()
        if digest(previous)!=p['beforeSha256'] or digest(after)!=p['afterSha256'] or digest(source.read_bytes()) not in (p['beforeSha256'],p['afterSha256']):raise ValueError('Mesh bytes changed')
        retained.append((ROOT/'tests/fixtures'/('pre-lateral-remaining-'+name),previous));updates.append((source,after))
        entry=next(e for e in manifest['specimens'][block] if e['part']==key)
        entry.update(vertices=p['vertices'],faces=p['faces'],meshSha256=p['afterSha256'],segmentationSourceSha256=FINAL,repairReview='Image-reviewed local lateral cavity omissions; context distance rules unchanged. Not expert reviewed.')
    _,_,before=read_browser_volume(stage/'base.bin.gz',MAGIC_LABELS,BASE);after=replay(before,record['points']);data=encode(after)
    if len(record['points'])!=630 or np.count_nonzero(before!=after)!=630 or digest(data)!=FINAL or digest(after.tobytes(order='F'))!=RAW or not np.array_equal(replay(after,record['points'],True),before):raise ValueError('Replay changed')
    if record['transitions']!={'0->23':173,'0->24':457} or digest(DEFAULT_LABELS.read_bytes()) not in (BASE,FINAL):raise ValueError('Baseline changed')
    record_path=ROOT/'segmentation-patches/review/lateral-remaining-adoption-2026-09-07.json'
    record.update(adopted=True,projectAdopted=True,installed=True,expertReviewed=False,published=False,status='AI-image-reviewed-project-adopted-development-only',meshImpact=impact,contextMaskExplanation=context,unionImageReview=dict(reportSha256=digest((union_dir/'report.json').read_bytes()),reviewedChangedPanels=124,identicalPreviouslyReviewedPanels=184))
    record['limitations'][-1]='Development integration only; tests/build/browser verification recorded separately. Not published.'
    record_data=serialized(record)
    meta_path=ROOT/'public/atlas/bigbrain-practical-segmentation-icbm500-validation.json';meta=json.loads(meta_path.read_text(encoding='utf-8'))
    if meta['rawVoxelSha256'] not in (record['inputRawSha256'],RAW):raise ValueError('Metadata changed')
    meta['rawVoxelSha256']=RAW
    for ident in (0,23,24):meta['labelCounts'][str(ident)]=int(np.count_nonzero(after==ident))
    meta['lateralRemainingAudit']=dict(record=record_path.relative_to(ROOT).as_posix(),recordSha256=digest(record_data),changedVoxelCount=630,projectAdopted=True,expertReviewed=False,changedBlockPartMasks=[p['file'] for p in changed])
    retained.extend([(ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-lateral-remaining-7c54.bin.gz',(stage/'base.bin.gz').read_bytes()),(record_path,record_data)])
    for path,value in retained:
        if path.exists() and path.read_bytes()!=value:raise ValueError('Recovery evidence changed')
    return retained+updates+[(DEFAULT_LABELS,data),(meta_path,serialized(meta)),(manifest_path,serialized(manifest))]

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--apply',action='store_true');args=parser.parse_args();changes=plan()
    if args.apply:
        for path,data in changes:path.write_bytes(data)
    print(json.dumps(dict(preflightPassed=True,applied=args.apply,files=[p.relative_to(ROOT).as_posix() for p,_ in changes])))
