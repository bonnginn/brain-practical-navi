"""Preflight the 53-cell image-reviewed repair; --apply installs development files only."""
import argparse
import json
import numpy as np
from stage_lateral_fringe_repair import ROOT, replay, digest, encode
from build_orthogonal_review_bundle import DEFAULT_LABELS, MAGIC_LABELS, read_browser_volume
from install_third_ventricle_core_repair import checked
from stage_third_ventricle_core_repair import checked_report

BASE='681fb599fd6d2181d7b7398a775abf5f1335eb644ce95afc2149b39fab9f9c88'
FINAL='ba31c7b26409ce771fe5df47548299e671489649580a004017bd0617c9100efb'
RAW='2b870431f39cb214d01a8cfc49bbd37f0cb5f23b23264615bbb256329f112d6a'
EXPECTED=[('lateral-ventricle','tissue',997),('lateral-ventricle','ventricular-cavity',8),('choroid-plexus','tissue',523),('choroid-plexus','ventricular-cavity',8),('medial-temporal','inferior-horn',8)]


def serialized(record):return (json.dumps(record,ensure_ascii=False,indent=2)+'\n').encode('utf-8')


def plan():
    work=ROOT/'work/anatomy-review';stage=work/'inferior-horn-residual-27-stage-v1';meshes=work/'inferior-horn-residual-27-meshes-v1'
    record=checked(stage/'repair.json','6cfb2c826aab3efc0cc69f1d03b4a13d7591ecd392ee3527a83c1a34da90f80f')
    finite=checked(work/'inferior-horn-residual-27-grid-v1.json','db7a89e6566dad644e53ab3e35588902911a28b2fe835a400f34eeeaa03b30bb')
    expected_points={tuple(r['xyz']) for r in finite['records'] if r['fullySupported'] and r['currentLabel']==0}
    if expected_points!={tuple(p['xyz']) for p in record['points']} or len(expected_points)!=53:raise ValueError('Finite coverage changed')
    impact=checked(meshes/'report.json','a3064b6c75a6a82ed0462c62578a3cdeae23a3c9ea9c04fd60d6e3869d762e67')
    context=checked(work/'inferior-horn-residual-27-context-v1.json','6f9b9035327610c61803e72acf4837a625d1df4b70b5dab3d52801ec825942b1')
    for folder,sha,count in [('inferior-horn-residual-27-finite-v1','c90dfe8aa4fd17dfae7bfb2cfad7f6c4966d15f657cffc91462fe5b8fb4a625f',46),('inferior-horn-residual-27-coronal-v1','0de998da31a8b2b13f5d1eb77a7ce23e37fff1220e2f948f5325078178e04dd5',14),('inferior-horn-residual-27-native-v1','600eee35a2096315e4af07e1ebdf9f45d5ab2e8324552b462a6912199960bc4e',8)]:
        checked_report(folder,sha,count)
    if digest((ROOT/'scripts/build_specimen_blocks.py').read_bytes())!=context['sourceCodeSha256']:raise ValueError('Generator changed')
    if len(context['changes'])!=1520 or not context['unionReplayExact'] or not context['reverseExact']:raise ValueError('Context coverage changed')
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
        retained.append((ROOT/'tests/fixtures'/('pre-inferior-residual53-'+name),previous));updates.append((source,after))
        entry=next(e for e in manifest['specimens'][p['block']] if e['part']==p['part'])
        entry.update(vertices=p['vertices'],faces=p['faces'],meshSha256=p['afterSha256'],segmentationSourceSha256=FINAL,repairReview='Image-reviewed right ventricular cavity omissions; existing tissue display rules retained. Not expert reviewed.')
    _,_,before=read_browser_volume(stage/'base.bin.gz',MAGIC_LABELS,BASE);after=replay(before,record['points']);data=encode(after)
    if np.count_nonzero(before!=after)!=53 or digest(data)!=FINAL or digest(after.tobytes(order='F'))!=RAW or not np.array_equal(replay(after,record['points'],True),before):raise ValueError('Replay changed')
    if record['transitions']!={'0->24':53} or digest(DEFAULT_LABELS.read_bytes()) not in (BASE,FINAL):raise ValueError('Current baseline changed')
    record_path=ROOT/'segmentation-patches/review/inferior-residual53-adoption-2026-09-07.json'
    record.update(adopted=True,projectAdopted=True,installed=True,expertReviewed=False,published=False,status='AI-image-reviewed-project-adopted-development-only',meshImpact=impact,contextMaskExplanation=context,visualReview=dict(localPlanes=46,widerContextPlanes=22,expertReviewed=False))
    record['limitations'][-1]='Development integration only; application tests/build/browser recorded separately. Not published.'
    record_data=serialized(record)
    meta_path=ROOT/'public/atlas/bigbrain-practical-segmentation-icbm500-validation.json';meta=json.loads(meta_path.read_text(encoding='utf-8'))
    if meta['rawVoxelSha256'] not in (record['inputRawSha256'],RAW):raise ValueError('Metadata changed')
    meta['rawVoxelSha256']=RAW
    for ident in (0,24):meta['labelCounts'][str(ident)]=int(np.count_nonzero(after==ident))
    meta['inferiorResidual53Audit']=dict(record=record_path.relative_to(ROOT).as_posix(),recordSha256=digest(record_data),changedVoxelCount=53,projectAdopted=True,expertReviewed=False,changedBlockPartMasks=[p['file'] for p in changed])
    retained.extend([(ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-inferior-residual53-681f.bin.gz',(stage/'base.bin.gz').read_bytes()),(record_path,record_data)])
    for path,value in retained:
        if path.exists() and path.read_bytes()!=value:raise ValueError('Recovery evidence changed')
    return retained+updates+[(DEFAULT_LABELS,data),(meta_path,serialized(meta)),(manifest_path,serialized(manifest))]


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--apply',action='store_true');args=parser.parse_args();changes=plan()
    if args.apply:
        for path,data in changes:path.write_bytes(data)
    print(json.dumps(dict(preflightPassed=True,applied=args.apply,files=[p.relative_to(ROOT).as_posix() for p,_ in changes])))
