"""Preflight the fixed 265-point repair and four meshes; --apply installs locally."""
import argparse
import json
import numpy as np
from stage_lateral_fringe_repair import ROOT,replay,digest,encode
from build_orthogonal_review_bundle import DEFAULT_LABELS,MAGIC_LABELS,read_browser_volume
from install_third_ventricle_core_repair import checked

BASE='83dcbdda59e86f393cc93b9d91ccd8f68c1fa08bc1156df99467fe3aef792567'
FINAL='7c54fdd2e391ca3e1ed70f7e5fdead7be940d1007b891eb4bb4dd22d7407f0ef'
RAW='bed9a7d37c5f8709aa4c82845112ed7f5f429c689b1a111bad95b22e31d09e7e'


def plan():
    work=ROOT/'work/anatomy-review';stage=work/'lateral-fringe-next-stage-v1';meshes=work/'lateral-fringe-next-meshes-v1'
    record=checked(stage/'repair.json','90fd67a9e526dd116e47f302f26d13efd3b3daf2a92fae65bbe518fef6072f15')
    impact=checked(meshes/'report.json','d2bef1e8fb66d04ef77d8d1506f9c5a7a34c8c60743feb6b5d19fa1ace5a74e0')
    context=checked(work/'lateral-fringe-next-support-v2.json','cdd9e77086a7c8e837501ba7c0a101750f3e17c0d916115cedfe8248efb5851c')
    if digest((ROOT/'scripts/build_specimen_blocks.py').read_bytes())!=context['sourceCodeSha256']:raise ValueError('Mesh generator changed')
    c=context['changes']
    if len(c)!=1 or c[0]['appXYZ']!=[216,300,130] or c[0]['labelBefore']!=8 or c[0]['labelAfter']!=8 or not c[0]['distanceBeforeMm']>8.5>=c[0]['distanceAfterMm']:raise ValueError('Context explanation changed')
    changed=[p for p in impact['blockMaskImpact'] if p['changedMaskVoxels']]
    expected=[('lateral-ventricle','ventricular-cavity',11),('commissural-system','lateral-ventricles',11),('choroid-plexus','tissue',1),('choroid-plexus','ventricular-cavity',11)]
    if len(impact['blockMaskImpact'])!=55 or len(changed)!=4 or impact['installationBlocked']:raise ValueError('Unexpected mask impact')
    retained=[];updates=[]
    manifest_path=ROOT/'public/atlas/specimen-blocks.json';manifest=json.loads(manifest_path.read_text(encoding='utf-8'))
    for p,(block,key,count) in zip(changed,expected):
        name=f'block-{block}-{key}.mesh'
        if p['file']!=name or p['changedMaskVoxels']!=count or not p['beforeMatches'] or p['beforeSha256']!=p['reproducedBeforeSha256']:raise ValueError('Mesh identity or reproduction changed')
        source=ROOT/'public/atlas'/name;before=(meshes/('installed-'+name)).read_bytes();after=(meshes/name).read_bytes()
        if digest(before)!=p['beforeSha256'] or digest(after)!=p['afterSha256'] or digest(source.read_bytes()) not in (p['beforeSha256'],p['afterSha256']):raise ValueError('Mesh bytes changed')
        retained.append((ROOT/'tests/fixtures'/('pre-lateral-next-'+name),before));updates.append((source,after))
        entry=next(q for q in manifest['specimens'][block] if q['part']==key)
        entry.update(vertices=p['vertices'],faces=p['faces'],meshSha256=p['afterSha256'],segmentationSourceSha256=FINAL,repairReview='Image-reviewed local lateral cavity repair; context clipping follows unchanged 8.5 mm rule. Not expert review.')
    _,_,before=read_browser_volume(stage/'base.bin.gz',MAGIC_LABELS,BASE)
    after=replay(before,record['points']);data=encode(after)
    if len(record['points'])!=265 or np.count_nonzero(after!=before)!=265 or digest(data)!=FINAL or digest(after.tobytes(order='F'))!=RAW or not np.array_equal(replay(after,record['points'],True),before):raise ValueError('Replay differs')
    if digest(DEFAULT_LABELS.read_bytes()) not in (BASE,FINAL):raise ValueError('Current labels changed')
    record_path=ROOT/'segmentation-patches/review/lateral-next-adoption-2026-09-07.json'
    record.update(adopted=True,projectAdopted=True,installed=True,expertReviewed=False,published=False,status='AI-image-reviewed-project-adopted-development-only',meshImpact=impact,contextMaskExplanation=context)
    record['limitations'][-1]='Development integration only; verification recorded separately. Not published.'
    record_data=(json.dumps(record,indent=2)+'\n').encode()
    meta_path=ROOT/'public/atlas/bigbrain-practical-segmentation-icbm500-validation.json';meta=json.loads(meta_path.read_text(encoding='utf-8'))
    if meta['rawVoxelSha256'] not in (record['inputRawSha256'],RAW):raise ValueError('Metadata changed')
    meta['rawVoxelSha256']=RAW
    for ident in (0,23,24):meta['labelCounts'][str(ident)]=int(np.count_nonzero(after==ident))
    meta['lateralNextAudit']=dict(record=record_path.relative_to(ROOT).as_posix(),recordSha256=digest(record_data),changedVoxelCount=265,projectAdopted=True,expertReviewed=False,changedBlockPartMasks=[p['file'] for p in changed])
    retained.extend([(ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-lateral-next-83dc.bin.gz',(stage/'base.bin.gz').read_bytes()),(record_path,record_data)])
    for path,value in retained:
        if path.exists() and path.read_bytes()!=value:raise ValueError('Recovery evidence changed')
    return retained+updates+[(DEFAULT_LABELS,data),(meta_path,(json.dumps(meta,ensure_ascii=False,indent=2)+'\n').encode()),(manifest_path,(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n').encode())]


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--apply',action='store_true');args=parser.parse_args()
    changes=plan()
    if args.apply:
        for path,data in changes:path.write_bytes(data)
    print(json.dumps(dict(preflightPassed=True,applied=args.apply,files=[p.relative_to(ROOT).as_posix() for p,_ in changes])))
