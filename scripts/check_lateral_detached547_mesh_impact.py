"""Independently recompute all block mask effects; no product writes."""
import json
import argparse
import numpy as np
import build_specimen_blocks as blocks
from build_orthogonal_review_bundle import DEFAULT_IMAGE, MAGIC_IMAGE, EXPECTED_IMAGE_SHA256, MAGIC_LABELS, read_browser_volume
from stage_lateral_detached547 import ROOT, SHA, digest


def main(residual80=False, cavity21=False, crop34=False):
    if sum([residual80,cavity21,crop34])>1:raise ValueError('Choose one repair')
    work = ROOT/'work/anatomy-review'
    prefix = 'lateral-residual80' if residual80 else 'lateral-detached547'
    baseline = '7d2b88c3e966b9633571e1d5cfe4d86a99439e2ea7873c672217abd4c235a1f2' if residual80 else SHA
    if cavity21:
        prefix='lateral-cavity21'
        baseline='a512880c4dcd1b1291664f8ee4aaa3bd8d609b62dd2e037634953cd7ebd12efd'
    if crop34:
        prefix='lateral-crop34'
        baseline='3849b1bd3c9ccf6d68b8864644c7ac784cba00dceaa006ec4be329f3d217fa29'
    destination = work/f'{prefix}-mask-direction-v1.json'
    if destination.exists():
        raise ValueError('Preserve evidence')
    stage = work/f'{prefix}-stage-v1'
    final = 'a512880c4dcd1b1291664f8ee4aaa3bd8d609b62dd2e037634953cd7ebd12efd' if residual80 else '7d2b88c3e966b9633571e1d5cfe4d86a99439e2ea7873c672217abd4c235a1f2'
    if cavity21:final='3849b1bd3c9ccf6d68b8864644c7ac784cba00dceaa006ec4be329f3d217fa29'
    if crop34:final='a2ceb2649ec0950eb7ba0620f38db9f8fc83293ad46bb2b7fcce82091360a6c5'
    _, _, before = read_browser_volume(stage/'before.bin.gz', MAGIC_LABELS, baseline)
    _, _, after = read_browser_volume(stage/'labels.bin.gz', MAGIC_LABELS, final)
    _, _, raw = read_browser_volume(DEFAULT_IMAGE, MAGIC_IMAGE, EXPECTED_IMAGE_SHA256)
    coarse = raw.transpose(2, 1, 0)[::2, ::2, ::2]
    old = blocks.specimen_definitions(coarse, before.transpose(2, 1, 0)[::2, ::2, ::2])
    new = blocks.specimen_definitions(coarse, after.transpose(2, 1, 0)[::2, ::2, ::2])
    report_path = work/f'{prefix}-meshes-v1/report.json'
    impact = json.loads(report_path.read_text())
    recorded = {(r['block'], r['part']): r for r in impact['blockMaskImpact']}
    if len(recorded) != 55 or len(impact['blockMaskImpact']) != 55 or old.keys() != new.keys():
        raise ValueError('Matrix mismatch')
    rows = []
    for key, parts in old.items():
        if len(parts) != len(new[key]):
            raise ValueError('Part cardinality')
        for a, b in zip(parts, new[key]):
            if a.key != b.key:
                raise ValueError('Part identity')
            added = int(np.count_nonzero(b.mask & ~a.mask))
            removed = int(np.count_nonzero(a.mask & ~b.mask))
            if added+removed != recorded[(key, a.key)]['changedMaskVoxels']:
                raise ValueError('Reported change differs')
            rows.append(dict(block=key, part=a.key, added=added, removed=removed))
    section_path = work/f'{prefix}-section-meshes-v1/report.json'
    sections = json.loads(section_path.read_text())
    if sections['beforeSha256'] != baseline or sections['afterSha256'] != final:
        raise ValueError('Section input mismatch')
    section_rows = []
    for key, before_mesh in sections['before']['meshes'].items():
        after_mesh = sections['after']['meshes'][key]
        expected = (80 if residual80 else 547) if key in ['section-current-lateral-ventricles', 'section-current-ventricular-system'] else 0
        if cavity21:expected=-21 if key in ['section-current-lateral-ventricles', 'section-current-ventricular-system'] else 0
        if crop34:expected=-34 if key in ['section-current-lateral-ventricles', 'section-current-ventricular-system'] else 0
        if before_mesh['voxels']-after_mesh['voxels'] != expected:
            raise ValueError('Section voxel count differs')
        path = section_path.parent/(key+'.mesh')
        if digest(path.read_bytes()) != after_mesh['sha256']:
            raise ValueError('Section staged mesh differs')
        entry=dict(mesh=key, before=before_mesh['voxels'], after=after_mesh['voxels'], removed=max(0,expected))
        if cavity21 or crop34:entry['added']=max(0,-expected)
        section_rows.append(entry)
    result = dict(beforeSha256=baseline, afterSha256=final, blockRows=rows, sectionRows=section_rows,
                  impactReportSha256=digest(report_path.read_bytes()),
                  sectionReportSha256=digest(section_path.read_bytes()), mutation=False,
                  limitation='Mask changes are procedural geometry evidence, not new anatomical review.')
    destination.write_text(json.dumps(result, indent=2)+'\n', encoding='utf-8')
    print(json.dumps(dict(changed=[r for r in rows if r['added'] or r['removed']], sections=section_rows)))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--residual80', action='store_true')
    parser.add_argument('--cavity21', action='store_true')
    parser.add_argument('--crop34', action='store_true')
    args=parser.parse_args();main(args.residual80,args.cavity21,args.crop34)
