"""Preflight the 57-cell image-reviewed repair; --apply installs development files only."""
import argparse
import json
import numpy as np
from stage_lateral_fringe_repair import ROOT, replay, digest, encode
from build_orthogonal_review_bundle import DEFAULT_LABELS, MAGIC_LABELS, read_browser_volume
from install_third_ventricle_core_repair import checked
from stage_third_ventricle_core_repair import checked_report

BASE='5f1847a300e0a988ec19037c947e18b525f5d4dc01da8de87222035abbf88eba'
FINAL='681fb599fd6d2181d7b7398a775abf5f1335eb644ce95afc2149b39fab9f9c88'
RAW='eaee5e5809932b06e8b497c4b195edf659438e2a6d0fdb823b55ea2dea2b3086'
EXPECTED=[('lateral-ventricle','tissue',129),('lateral-ventricle','ventricular-cavity',6),('choroid-plexus','tissue',125),('choroid-plexus','ventricular-cavity',6),('medial-temporal','tissue',5),('medial-temporal','inferior-horn',6)]


def serialized(record):return (json.dumps(record,ensure_ascii=False,indent=2)+'\n').encode('utf-8')


def plan():
    work=ROOT/'work/anatomy-review';stage=work/'inferior-horn-residual-51-stage-v1';meshes=work/'inferior-horn-residual-51-meshes-v1'
    record=checked(stage/'repair.json','4401e414aa3e940e3991b0e631215af27415dd221a60c41e4d1b8f10c33b34e1')
    finite=checked(work/'inferior-horn-residual-51-grid-v1.json','2478cea0ab00d3ba0a915ecc63c8d170526916f5196877b36ef036ffc2ea3129')
    expected_points={tuple(r['xyz']) for r in finite['records'] if r['fullySupported'] and r['currentLabel']==0}
    if expected_points!={tuple(p['xyz']) for p in record['points']} or len(expected_points)!=57:raise ValueError('Finite coverage changed')
    impact=checked(meshes/'report.json','a0574729a33f575e57649466b66c569c27d8acdb85350b22a5e0c8b73c439c52')
    context=checked(work/'inferior-horn-residual-51-context-v1.json','8f04034807cdf6fae0b7e4419d54f67645bb93e711d0971adc5a316913736072')
    for folder,sha,count in [('inferior-horn-residual-51-finite-v1','b1e8c8079036e2e7961dd2f7a2db689c2beab0cdbee4fba85ed055ffd1401df8',72),('inferior-horn-residual-51-coronal-v1','ecb7dffc1077169bbf6de0da9e02fc3751bd29625947eec0a166ea308e193ec4',13),('inferior-horn-residual-51-native-v1','06974a1ec40849199696e6160a5acfd1723d4496772aa86003c15104796cea40',11)]:
        checked_report(folder,sha,count)
    if digest((ROOT/'scripts/build_specimen_blocks.py').read_bytes())!=context['sourceCodeSha256']:raise ValueError('Generator changed')
    if len(context['changes'])!=259 or not context['unionReplayExact'] or not context['reverseExact']:raise ValueError('Context coverage changed')
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
        retained.append((ROOT/'tests/fixtures'/('pre-inferior-residual-'+name),previous));updates.append((source,after))
        entry=next(e for e in manifest['specimens'][p['block']] if e['part']==p['part'])
        entry.update(vertices=p['vertices'],faces=p['faces'],meshSha256=p['afterSha256'],segmentationSourceSha256=FINAL,repairReview='Image-reviewed right ventricular cavity omissions; existing tissue display rules retained. Not expert reviewed.')
    _,_,before=read_browser_volume(stage/'base.bin.gz',MAGIC_LABELS,BASE);after=replay(before,record['points']);data=encode(after)
    if np.count_nonzero(before!=after)!=57 or digest(data)!=FINAL or digest(after.tobytes(order='F'))!=RAW or not np.array_equal(replay(after,record['points'],True),before):raise ValueError('Replay changed')
    if record['transitions']!={'0->24':57} or digest(DEFAULT_LABELS.read_bytes()) not in (BASE,FINAL):raise ValueError('Current baseline changed')
    record_path=ROOT/'segmentation-patches/review/inferior-residual-adoption-2026-09-07.json'
    record.update(adopted=True,projectAdopted=True,installed=True,expertReviewed=False,published=False,status='AI-image-reviewed-project-adopted-development-only',meshImpact=impact,contextMaskExplanation=context,visualReview=dict(localPlanes=72,widerContextPlanes=24,expertReviewed=False))
    record['limitations'][-1]='Development integration only; application tests/build/browser recorded separately. Not published.'
    record_data=serialized(record)
    meta_path=ROOT/'public/atlas/bigbrain-practical-segmentation-icbm500-validation.json';meta=json.loads(meta_path.read_text(encoding='utf-8'))
    if meta['rawVoxelSha256'] not in (record['inputRawSha256'],RAW):raise ValueError('Metadata changed')
    meta['rawVoxelSha256']=RAW
    for ident in (0,24):meta['labelCounts'][str(ident)]=int(np.count_nonzero(after==ident))
    meta['inferiorResidualAudit']=dict(record=record_path.relative_to(ROOT).as_posix(),recordSha256=digest(record_data),changedVoxelCount=57,projectAdopted=True,expertReviewed=False,changedBlockPartMasks=[p['file'] for p in changed])
    retained.extend([(ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-inferior-residual-5f18.bin.gz',(stage/'base.bin.gz').read_bytes()),(record_path,record_data)])
    for path,value in retained:
        if path.exists() and path.read_bytes()!=value:raise ValueError('Recovery evidence changed')
    return retained+updates+[(DEFAULT_LABELS,data),(meta_path,serialized(meta)),(manifest_path,serialized(manifest))]


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--apply',action='store_true');args=parser.parse_args();changes=plan()
    if args.apply:
        for path,data in changes:path.write_bytes(data)
    print(json.dumps(dict(preflightPassed=True,applied=args.apply,files=[p.relative_to(ROOT).as_posix() for p,_ in changes])))
