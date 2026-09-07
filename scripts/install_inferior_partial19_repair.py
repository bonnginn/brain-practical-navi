"""Install the fixed 19-cell repair locally with recovery artifacts; never publish."""
import argparse
import json
import numpy as np
from stage_inferior_partial19_repair import BASE, BASE_RAW, PRECISION, validated_points
from stage_lateral_fringe_repair import ROOT, replay, digest, encode
from build_orthogonal_review_bundle import DEFAULT_LABELS, MAGIC_LABELS, read_browser_volume
from install_third_ventricle_core_repair import checked
from stage_third_ventricle_core_repair import checked_report
from install_inferior_residual53_repair import serialized

FINAL='58d8044071bd0b638bfdbbcc309c35ac3301a9c8f449b8ebcc5b77e5435cfae7'
RAW='94a8a3edd960256d0fc22e2c5fff2085d88e3f3e8fcc1415ae112b37c2d794f1'
EXPECTED=[('lateral-ventricle','tissue',7),('lateral-ventricle','ventricular-cavity',1),
          ('choroid-plexus','tissue',5),('choroid-plexus','ventricular-cavity',1),
          ('medial-temporal','tissue',1),('medial-temporal','inferior-horn',1)]


def plan():
    work=ROOT/'work/anatomy-review';stage=work/'inferior-horn-partial19-stage-v1';meshes=work/'inferior-horn-partial19-meshes-v1'
    record=checked(stage/'repair.json','7075358385037d381b17207d786939dcf3ea0b6dc765948357ba1689563fd021')
    precision=checked(work/'inferior-horn-residual-107-grid-precision-v1.json',PRECISION)
    evidence=[]
    for e,n in zip(record['reviewEvidence'],[19,65,8,10]):
        folder=(ROOT/e['path']).parent.relative_to(work).as_posix()
        evidence.append(checked_report(folder,e['sha256'],n))
    if validated_points(precision,evidence[0]['report'])!=record['points']:
        raise ValueError('Reviewed points changed')
    impact=checked(meshes/'report.json','7fac3bade79a3fd35b02810e27bad3dbd5aa52e7fd2bcb914629d8e6f996705d')
    context=checked(work/'inferior-horn-partial19-context-v1.json','b2f4ff112d2b058dd0175332ebbb292bbee9e5f9ab6df975fc71c91007effe8a')
    if digest((ROOT/'scripts/build_specimen_blocks.py').read_bytes())!=context['sourceCodeSha256']:
        raise ValueError('Generator changed')
    if len(context['changes'])!=13 or not context['unionReplayExact'] or not context['reverseExact']:
        raise ValueError('Context coverage changed')
    for c in context['changes']:
        if c['reason']=='unchanged-tissue-enters-distance-cutoff':
            valid=not c['before'] and c['after'] and c['labelBefore']==c['labelAfter'] and c['distanceBeforeMm']>c['cutoffMm']>=c['distanceAfterMm']
        elif c['reason']=='new-ventricular-label-excluded-from-context':
            valid=c['before'] and not c['after'] and (c['labelBefore'],c['labelAfter'])==(0,24)
        else: valid=False
        if not valid: raise ValueError('Unexplained context')
    changed=[p for p in impact['blockMaskImpact'] if p['changedMaskVoxels']]
    if len(impact['blockMaskImpact'])!=55 or [(p['block'],p['part'],p['changedMaskVoxels']) for p in changed]!=EXPECTED or impact['installationBlocked']:
        raise ValueError('Mask coverage changed')
    manifest_path=ROOT/'public/atlas/specimen-blocks.json'
    manifest=json.loads(manifest_path.read_text(encoding='utf-8'));retained=[];updates=[]
    for p in changed:
        name=p['file'];source=ROOT/'public/atlas'/name
        previous=(meshes/('installed-'+name)).read_bytes();after=(meshes/name).read_bytes()
        if not p['beforeMatches'] or digest(previous)!=p['beforeSha256'] or digest(previous)!=p['reproducedBeforeSha256'] or digest(after)!=p['afterSha256'] or digest(source.read_bytes()) not in (p['beforeSha256'],p['afterSha256']):
            raise ValueError('Mesh changed')
        retained.append((ROOT/'tests/fixtures'/('pre-inferior-partial19-'+name),previous));updates.append((source,after))
        entry=next(e for e in manifest['specimens'][p['block']] if e['part']==p['part'])
        entry.update(vertices=p['vertices'],faces=p['faces'],meshSha256=p['afterSha256'],segmentationSourceSha256=FINAL,
                     repairReview='Image-reviewed local cavity omissions with individual coordinate-precision evidence; not expert reviewed.')
    _,_,before=read_browser_volume(stage/'base.bin.gz',MAGIC_LABELS,BASE)
    after=replay(before,record['points']);data=encode(after)
    if digest(before.tobytes(order='F'))!=BASE_RAW or np.count_nonzero(before!=after)!=19 or digest(data)!=FINAL or digest(after.tobytes(order='F'))!=RAW or not np.array_equal(replay(after,record['points'],True),before):
        raise ValueError('Replay changed')
    if record['transitions']!={'0->24':19} or digest(DEFAULT_LABELS.read_bytes()) not in (BASE,FINAL):
        raise ValueError('Current baseline changed')
    record_path=ROOT/'segmentation-patches/review/inferior-partial19-adoption-2026-09-07.json'
    record.update(adopted=True,projectAdopted=True,installed=True,expertReviewed=False,published=False,
                  status='AI-image-reviewed-project-adopted-development-only',meshImpact=impact,contextMaskExplanation=context,
                  visualReview=dict(individualCellPanels=271,unionPlanes=65,widerContextPlanes=18,expertReviewed=False))
    record['limitations'][-1]='Development integration only; tests/build/browser tracked separately. Residual gaps remain. Not published.'
    record_data=serialized(record)
    meta_path=ROOT/'public/atlas/bigbrain-practical-segmentation-icbm500-validation.json'
    meta=json.loads(meta_path.read_text(encoding='utf-8'))
    if meta['rawVoxelSha256'] not in (BASE_RAW,RAW): raise ValueError('Metadata changed')
    meta['rawVoxelSha256']=RAW
    for ident in (0,24):meta['labelCounts'][str(ident)]=int(np.count_nonzero(after==ident))
    meta['inferiorPartial19Audit']=dict(record=record_path.relative_to(ROOT).as_posix(),recordSha256=digest(record_data),
        changedVoxelCount=19,projectAdopted=True,expertReviewed=False,changedBlockPartMasks=[p['file'] for p in changed])
    retained.extend([(ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-inferior-partial19-ba31.bin.gz',(stage/'base.bin.gz').read_bytes()),(record_path,record_data)])
    for path,value in retained:
        if path.exists() and path.read_bytes()!=value: raise ValueError('Recovery evidence changed')
    return retained+updates+[(DEFAULT_LABELS,data),(meta_path,serialized(meta)),(manifest_path,serialized(manifest))]


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--apply',action='store_true')
    args=parser.parse_args();changes=plan()
    if args.apply:
        for path,data in changes:path.write_bytes(data)
    print(json.dumps(dict(preflightPassed=True,applied=args.apply,files=[p.relative_to(ROOT).as_posix() for p,_ in changes])))
