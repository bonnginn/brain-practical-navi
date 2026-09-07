"""Preflight and optionally install the fixed development-only lateral repair."""
import argparse
import json
import numpy as np
from stage_lateral_fringe_repair import ROOT, CURRENT_SHA, replay, digest, encode
from build_orthogonal_review_bundle import DEFAULT_LABELS, MAGIC_LABELS, read_browser_volume
from install_third_ventricle_core_repair import checked

FINAL_SHA='83dcbdda59e86f393cc93b9d91ccd8f68c1fa08bc1156df99467fe3aef792567'
FINAL_RAW='cfe86d863d828dbae8051f148114368f25b54b668f973715da02bd95f7d25672'


def plan():
    work=ROOT/'work/anatomy-review';stage=work/'lateral-fringe-stage-v1';meshes=work/'lateral-fringe-meshes-v1'
    record=checked(stage/'repair.json','65df6a9cf6056991241d64f87b85ab4f504e76084f5d7a63f05b58f0b280a071')
    impact=checked(meshes/'report.json','76351679d899d53a60af0fbeddf5a2362e9d623701e81ce3c5d4d927cf83df1d')
    baseline=checked(work/'lateral-fringe-mesh-baseline-v1.json','7b9061fd08a0434795d2f2b1d1f5087174e71db3db179df92ed8e8f1422eb065')
    changed=[p for p in impact['blockMaskImpact'] if p['changedMaskVoxels']]
    expected=[('lateral-ventricle','ventricular-cavity',2,[[224,206,176]]),
        ('commissural-system','lateral-ventricles',5,[[166,204,176],[224,206,176]]),
        ('choroid-plexus','ventricular-cavity',2,[[224,206,176]])]
    if len(impact['blockMaskImpact'])!=55 or len(changed)!=3 or len(baseline['results'])!=3:raise ValueError('Unexpected impact')
    old_patch=json.loads((ROOT/'segmentation-patches/review/ventricles-orthogonally-bracketed-candidate-2026-08-23.json').read_text(encoding='utf-8'))
    if old_patch['reviewStatus']!='approved':raise ValueError('Prior adoption not approved')
    retained=[];updates=[]
    manifest_path=ROOT/'public/atlas/specimen-blocks.json';manifest=json.loads(manifest_path.read_text(encoding='utf-8'))
    for part,previous,(block,key,count,coordinates) in zip(changed,baseline['results'],expected):
        name=f'block-{block}-{key}.mesh'
        if part['file']!=name or part['changedMaskVoxels']!=count or previous['file']!=name or not previous['historicalReproducesInstalled']:
            raise ValueError('Unexpected mesh or unexplained baseline')
        if [p['appXYZ'] for p in previous['changes']]!=coordinates or any(p['before'] or not p['after'] for p in previous['changes']):raise ValueError('Historical mask difference changed')
        for x,y,z in coordinates:
            index=x+394*(y+466*z);target=23 if x==166 else 24
            if not any(r['start']<=index<r['start']+r['length'] and r['label']==target for r in old_patch['runs']):raise ValueError('Drift not covered by adopted patch')
        source=ROOT/'public/atlas'/name;before=(meshes/('installed-'+name)).read_bytes();after=(meshes/name).read_bytes()
        if digest(before)!=part['beforeSha256'] or digest(after)!=part['afterSha256'] or digest(source.read_bytes()) not in (part['beforeSha256'],part['afterSha256']):raise ValueError('Mesh bytes changed')
        retained.append((ROOT/'tests/fixtures'/('pre-lateral-fringe-'+name),before));updates.append((source,after))
        entry=next(p for p in manifest['specimens'][block] if p['part']==key)
        entry.update(vertices=part['vertices'],faces=part['faces'],meshSha256=part['afterSha256'],segmentationSourceSha256=FINAL_SHA,
            repairReview='Image-reviewed local cavity repair plus synchronization of previously adopted August labels; not expert review.')
    _,_,before=read_browser_volume(stage/'base.bin.gz',MAGIC_LABELS,CURRENT_SHA)
    after=replay(before,record['points']);data=encode(after)
    if digest(data)!=FINAL_SHA or digest(after.tobytes(order='F'))!=FINAL_RAW or not np.array_equal(replay(after,record['points'],True),before):raise ValueError('Replay changed')
    if digest(DEFAULT_LABELS.read_bytes()) not in (CURRENT_SHA,FINAL_SHA):raise ValueError('Current labels changed')
    record_path=ROOT/'segmentation-patches/review/lateral-fringe-adoption-2026-09-07.json'
    record.update(adopted=True,projectAdopted=True,installed=True,expertReviewed=False,status='AI-image-reviewed-project-adopted-development-only',meshImpact=impact,historicalMeshReconciliation=baseline)
    record['limitations'][-1]='Development integration only; downstream verification recorded separately. Not published.'
    record_data=(json.dumps(record,indent=2)+'\n').encode()
    meta_path=ROOT/'public/atlas/bigbrain-practical-segmentation-icbm500-validation.json';meta=json.loads(meta_path.read_text(encoding='utf-8'))
    if meta['rawVoxelSha256'] not in (record['inputRawSha256'],FINAL_RAW):raise ValueError('Metadata baseline changed')
    meta['rawVoxelSha256']=FINAL_RAW
    for ident in (0,23,24):meta['labelCounts'][str(ident)]=int(np.count_nonzero(after==ident))
    meta['lateralFringeAudit']=dict(record=record_path.relative_to(ROOT).as_posix(),recordSha256=digest(record_data),changedVoxelCount=308,projectAdopted=True,expertReviewed=False,changedBlockPartMasks=[p['file'] for p in changed])
    retained.extend([(ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-lateral-fringe-d429.bin.gz',(stage/'base.bin.gz').read_bytes()),(record_path,record_data)])
    for path,value in retained:
        if path.exists() and path.read_bytes()!=value:raise ValueError('Recovery evidence changed')
    return retained+updates+[(DEFAULT_LABELS,data),(meta_path,(json.dumps(meta,ensure_ascii=False,indent=2)+'\n').encode()),(manifest_path,(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n').encode())]


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--apply',action='store_true');args=parser.parse_args()
    changes=plan()
    if args.apply:
        for path,data in changes:path.write_bytes(data)
    print(json.dumps(dict(preflightPassed=True,applied=args.apply,files=[p.relative_to(ROOT).as_posix() for p,_ in changes])))
