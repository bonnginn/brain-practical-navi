"""Reproduce all installed section ventricular assets; stage exact exclusion."""
import json
import argparse
from build_section_ventricle_meshes import build_assets, ROOT, ATLAS
from stage_lateral_detached547 import digest, SHA


def main(residual80=False, cavity21=False, crop34=False, stage_prefix=None, record_sha=None):
    if sum([residual80,cavity21,crop34,bool(stage_prefix)])>1:raise ValueError('Choose one repair')
    if bool(stage_prefix)!=bool(record_sha):raise ValueError('Stage and SHA required together')
    prefix = 'lateral-residual80' if residual80 else 'lateral-detached547'
    if cavity21:prefix='lateral-cavity21'
    if crop34:prefix='lateral-crop34'
    batch=None
    if stage_prefix:
        from stage_lateral_crop34 import load_batch_stage
        _,batch=load_batch_stage(stage_prefix,record_sha)
        prefix=stage_prefix
    stage = ROOT/f'work/anatomy-review/{prefix}-stage-v1'
    out = ROOT/f'work/anatomy-review/{prefix}-section-meshes-v1'
    if out.exists():
        raise ValueError('Preserve evidence')
    before = (stage/'before.bin.gz').read_bytes()
    after = (stage/'labels.bin.gz').read_bytes()
    expected_before = '7d2b88c3e966b9633571e1d5cfe4d86a99439e2ea7873c672217abd4c235a1f2' if residual80 else SHA
    expected_after = 'a512880c4dcd1b1291664f8ee4aaa3bd8d609b62dd2e037634953cd7ebd12efd' if residual80 else '7d2b88c3e966b9633571e1d5cfe4d86a99439e2ea7873c672217abd4c235a1f2'
    if cavity21:
        expected_before='a512880c4dcd1b1291664f8ee4aaa3bd8d609b62dd2e037634953cd7ebd12efd'
        expected_after='3849b1bd3c9ccf6d68b8864644c7ac784cba00dceaa006ec4be329f3d217fa29'
    if crop34:
        expected_before='3849b1bd3c9ccf6d68b8864644c7ac784cba00dceaa006ec4be329f3d217fa29'
        expected_after='a2ceb2649ec0950eb7ba0620f38db9f8fc83293ad46bb2b7fcce82091360a6c5'
    if digest(before) != expected_before or digest(after) != expected_after:
        if not batch or digest(before)!=batch['beforeSha256'] or digest(after)!=batch['afterSha256']:
            raise ValueError('Wrong inputs')
    old_report, old_assets = build_assets(before)
    new_report, new_assets = build_assets(after)
    for name, data in old_assets.items():
        installed = (ATLAS/name).read_bytes()
        equal = json.loads(data) == json.loads(installed) if name.endswith('.json') else data == installed
        if not equal:
            raise ValueError('Baseline reproduction mismatch: '+name)
    changed = [name for name in old_assets if name.endswith('.mesh') and old_assets[name] != new_assets[name]]
    expected={'section-current-lateral-ventricles.mesh', 'section-current-ventricular-system.mesh'}
    if batch and batch.get('transition') in ('mixed-ventricular-exclusions','mixed-ventricular-repair'):
        from build_section_ventricle_meshes import GROUPS
        ids={v for p in batch['points'] for v in (p['before'],p['after']) if v!=0}
        expected={name+'.mesh' for name,labels in GROUPS.items() if ids.intersection(labels)}
    elif batch and batch.get('transition') in ('0->26','27->26','mixed-to-26'):
        expected={'section-current-fourth-ventricle.mesh','section-current-ventricular-system.mesh'}
    if set(changed) != expected:
        raise ValueError('Unexpected mesh impact')
    out.mkdir()
    for name, data in new_assets.items():
        (out/name).write_bytes(data)
    report = dict(beforeSha256=digest(before), afterSha256=digest(after), allBeforeAssetsMatch=True,
                  changedMeshes=changed, before=old_report, after=new_report, installed=False)
    (out/'report.json').write_text(json.dumps(report, indent=2)+'\n', encoding='utf-8')
    print(json.dumps(dict(changedMeshes=changed, baselineMatches=True, installed=False)))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--residual80', action='store_true')
    parser.add_argument('--cavity21', action='store_true')
    parser.add_argument('--crop34', action='store_true')
    parser.add_argument('--stage-prefix')
    parser.add_argument('--record-sha')
    args=parser.parse_args();main(args.residual80,args.cavity21,args.crop34,args.stage_prefix,args.record_sha)
