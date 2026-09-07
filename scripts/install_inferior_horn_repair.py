"""Preflight the 304-cell image-reviewed repair; --apply installs development files only."""
import argparse
import json
import numpy as np
from stage_lateral_fringe_repair import ROOT, replay, digest, encode
from build_orthogonal_review_bundle import DEFAULT_LABELS, MAGIC_LABELS, read_browser_volume
from install_third_ventricle_core_repair import checked
from stage_third_ventricle_core_repair import checked_report

BASE='0d31037722a8a31eee3ff6feed49dc076ece3d6c864297240c687cd1526cc229'
FINAL='5f1847a300e0a988ec19037c947e18b525f5d4dc01da8de87222035abbf88eba'
RAW='6335e0b37e926a9523a1c4d451104157e044a968bddfcaadd069f0c1b7f471dd'
EXPECTED=[('lateral-ventricle','tissue',55),('lateral-ventricle','ventricular-cavity',31),('radiations','tissue',5),('choroid-plexus','tissue',1),('choroid-plexus','ventricular-cavity',28),('medial-temporal','tissue',3),('medial-temporal','inferior-horn',27)]


def serialized(record):return (json.dumps(record,ensure_ascii=False,indent=2)+'\n').encode('utf-8')


def plan():
    work=ROOT/'work/anatomy-review';stage=work/'inferior-horn-cavity-stage-v1';meshes=work/'inferior-horn-cavity-meshes-v1'
    record=checked(stage/'repair.json','470b0b86c0183416f2e5c308d10ce76e6ed797b5b64c49052819ccccecb06b50')
    finite=checked(work/'inferior-horn-cavity-grid-v1.json','ae68fb441a485258ab93d4294834c7a5ca560c5a6334c6a0b05f25d67b175ce2')
    expected_points={tuple(r['xyz']) for r in finite['records'] if r['fullySupported'] and r['currentLabel']==0}
    if expected_points!={tuple(p['xyz']) for p in record['points']} or len(expected_points)!=304:raise ValueError('Finite coverage changed')
    impact=checked(meshes/'report.json','c609be6207fb5c4e55e23416a17be35cff70d2effaf340fee3250dabf84ee04e')
    context=checked(work/'inferior-horn-cavity-context-v1.json','cd3f32bc82750c4701b815425c650a32d21c31a4bad9ba4c212b27e53954d42b')
    for folder,sha,count in [('inferior-horn-cavity-finite-difference-v1','be00a4dacacf62f98c61765d253b5dc2de269a16f935a65ef772c1af18992278',164),('inferior-horn-cavity-wide-context-v1','777913e141aa0856d9ad7ea68a4471a8011ea9d2cf16dcb7889b60e6ccc1bb09',14)]:
        checked_report(folder,sha,count)
    if digest((ROOT/'scripts/build_specimen_blocks.py').read_bytes())!=context['sourceCodeSha256']:raise ValueError('Generator changed')
    if len(context['changes'])!=64 or not context['unionReplayExact'] or not context['reverseExact']:raise ValueError('Context coverage changed')
    for c in context['changes']:
        if c['reason']=='unchanged-tissue-enters-distance-cutoff':
            valid=not c['before'] and c['after'] and c['labelBefore']==c['labelAfter'] and c['distanceBeforeMm']>c['cutoffMm']>=c['distanceAfterMm']
        elif c['reason']=='new-ventricular-label-excluded-from-context':
            valid=c['before'] and not c['after'] and (c['labelBefore'],c['labelAfter'])==(0,24)
        else:valid=False
        if not valid:raise ValueError('Unexplained context')
    changed=[p for p in impact['blockMaskImpact'] if p['changedMaskVoxels']]
    if len(impact['blockMaskImpact'])!=55 or [(p['block'],p['part'],p['changedMaskVoxels']) for p in changed]!=EXPECTED or impact['installationBlocked']:raise ValueError('Mask impact changed')
    manifest_path=ROOT/'public/atlas/specimen-blocks.json';manifest=json.loads(manifest_path.read_text(encoding='utf-8'));retained=[];updates=[]
    for p in changed:
        name=p['file'];source=ROOT/'public/atlas'/name
        previous=(meshes/('installed-'+name)).read_bytes();after=(meshes/name).read_bytes()
        if not p['beforeMatches'] or digest(previous)!=p['beforeSha256'] or digest(previous)!=p['reproducedBeforeSha256'] or digest(after)!=p['afterSha256'] or digest(source.read_bytes()) not in (p['beforeSha256'],p['afterSha256']):raise ValueError('Mesh changed')
        retained.append((ROOT/'tests/fixtures'/('pre-inferior-horn-'+name),previous));updates.append((source,after))
        entry=next(e for e in manifest['specimens'][p['block']] if e['part']==p['part'])
        entry.update(vertices=p['vertices'],faces=p['faces'],meshSha256=p['afterSha256'],segmentationSourceSha256=FINAL,repairReview='Image-reviewed right ventricular cavity omissions; existing tissue display rules retained. Not expert reviewed.')
    _,_,before=read_browser_volume(stage/'base.bin.gz',MAGIC_LABELS,BASE);after=replay(before,record['points']);data=encode(after)
    if np.count_nonzero(before!=after)!=304 or digest(data)!=FINAL or digest(after.tobytes(order='F'))!=RAW or not np.array_equal(replay(after,record['points'],True),before):raise ValueError('Replay changed')
    if record['transitions']!={'0->24':304} or digest(DEFAULT_LABELS.read_bytes()) not in (BASE,FINAL):raise ValueError('Current baseline changed')
    record_path=ROOT/'segmentation-patches/review/inferior-horn-adoption-2026-09-07.json'
    record.update(adopted=True,projectAdopted=True,installed=True,expertReviewed=False,published=False,status='AI-image-reviewed-project-adopted-development-only',meshImpact=impact,contextMaskExplanation=context,visualReview=dict(localPlanes=164,widerContextPlanes=14,expertReviewed=False))
    record['limitations'][-1]='Development integration only; application tests/build/browser recorded separately. Not published.'
    record_data=serialized(record)
    meta_path=ROOT/'public/atlas/bigbrain-practical-segmentation-icbm500-validation.json';meta=json.loads(meta_path.read_text(encoding='utf-8'))
    if meta['rawVoxelSha256'] not in (record['inputRawSha256'],RAW):raise ValueError('Metadata changed')
    meta['rawVoxelSha256']=RAW
    for ident in (0,24):meta['labelCounts'][str(ident)]=int(np.count_nonzero(after==ident))
    meta['inferiorHornAudit']=dict(record=record_path.relative_to(ROOT).as_posix(),recordSha256=digest(record_data),changedVoxelCount=304,projectAdopted=True,expertReviewed=False,changedBlockPartMasks=[p['file'] for p in changed])
    retained.extend([(ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-inferior-horn-0d31.bin.gz',(stage/'base.bin.gz').read_bytes()),(record_path,record_data)])
    for path,value in retained:
        if path.exists() and path.read_bytes()!=value:raise ValueError('Recovery evidence changed')
    return retained+updates+[(DEFAULT_LABELS,data),(meta_path,serialized(meta)),(manifest_path,serialized(manifest))]


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--apply',action='store_true');args=parser.parse_args();changes=plan()
    if args.apply:
        for path,data in changes:path.write_bytes(data)
    print(json.dumps(dict(preflightPassed=True,applied=args.apply,files=[p.relative_to(ROOT).as_posix() for p,_ in changes])))
