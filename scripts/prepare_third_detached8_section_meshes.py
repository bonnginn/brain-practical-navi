"""Reproduce installed section meshes and stage the exact eight-voxel effect."""
import json
from build_section_ventricle_meshes import build_assets, ROOT, ATLAS
from stage_third_detached8 import digest


def main():
    stage = ROOT/'work/anatomy-review/third-detached8-stage-v1'
    out = ROOT/'work/anatomy-review/third-detached8-section-meshes-v1'
    if out.exists():raise ValueError('Preserve evidence')
    before = (stage/'before.bin.gz').read_bytes()
    after = (stage/'labels.bin.gz').read_bytes()
    if digest(before) != 'ffb8e56e0939f97b6bc9f8e2585bb3f74e11b525006c6f7d631ae85cd4b033c2':raise ValueError('Wrong baseline')
    if digest(after) != 'b45c0669122b628529f56e73af06fa1cb697b621da99d51c8b921b136ea52463':raise ValueError('Wrong stage')
    old_report, old_assets = build_assets(before)
    new_report, new_assets = build_assets(after)
    for name, data in old_assets.items():
        installed = (ATLAS/name).read_bytes()
        equal = json.loads(data) == json.loads(installed) if name.endswith('.json') else data == installed
        if not equal:raise ValueError('Baseline reproduction mismatch: '+name)
    changed = [name for name in old_assets if old_assets[name] != new_assets[name] and name.endswith('.mesh')]
    if set(changed) != {'section-current-third-ventricle.mesh','section-current-ventricular-system.mesh'}:
        raise ValueError('Unexpected mesh impact')
    out.mkdir()
    for name, data in new_assets.items():(out/name).write_bytes(data)
    report = dict(beforeSha256=digest(before), afterSha256=digest(after), allBeforeAssetsMatch=True,
        changedMeshes=changed, before=old_report, after=new_report, installed=False)
    (out/'report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(dict(changedMeshes=changed, baselineMatches=True, installed=False)))


if __name__ == '__main__':main()
