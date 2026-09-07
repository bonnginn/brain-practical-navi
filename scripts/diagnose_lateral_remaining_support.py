"""Explain every context change of the pinned 630-voxel stage; no installation."""
import json
import numpy as np
from scipy import ndimage
import build_specimen_blocks as blocks
from build_orthogonal_review_bundle import ROOT, DEFAULT_IMAGE, MAGIC_IMAGE, MAGIC_LABELS, EXPECTED_IMAGE_SHA256, read_browser_volume
from stage_third_ventricle_core_repair import digest
from stage_lateral_fringe_repair import replay


def main():
    work = ROOT/'work/anatomy-review'
    stage = work/'lateral-fringe-remaining-large-stage-v1'
    out = work/'lateral-fringe-remaining-large-support-v1.json'
    if out.exists(): raise ValueError('Preserve evidence')
    record_bytes = (stage/'repair.json').read_bytes()
    if digest(record_bytes) != '48e2fea89750e10afbbdd812628cebfcac5e004f2f235858992543804687ece1': raise ValueError('Stage changed')
    record = json.loads(record_bytes)
    _, _, old = read_browser_volume(stage/'base.bin.gz', MAGIC_LABELS, record['inputCompressedSha256'])
    _, _, new = read_browser_volume(stage/'labels.bin.gz', MAGIC_LABELS, record['outputCompressedSha256'])
    if not np.array_equal(replay(old, record['points']), new): raise ValueError('Union differs')
    if not np.array_equal(replay(new, record['points'], True), old): raise ValueError('Reverse differs')
    _, _, raw = read_browser_volume(DEFAULT_IMAGE, MAGIC_IMAGE, EXPECTED_IMAGE_SHA256)
    coarse = raw.transpose(2,1,0)[::2,::2,::2]
    labels = [v.transpose(2,1,0)[::2,::2,::2] for v in (old,new)]
    definitions = [blocks.specimen_definitions(coarse, v) for v in labels]
    distances = [ndimage.distance_transform_edt(v != 24)*blocks.GEOMETRY_SPACING_MM for v in labels]
    changes = []
    for block, expected, cutoff in [('lateral-ventricle',8,11),('choroid-plexus',18,8.5)]:
        a,b = [next(p.mask for p in d[block] if p.key == 'tissue') for d in definitions]
        coords = np.argwhere(a != b)
        if len(coords) != expected: raise ValueError('Unexpected context count')
        for p in coords:
            key = tuple(p); xyz = (p[::-1]*2).tolist(); fullkey = tuple(xyz)
            before, after = int(old[fullkey]), int(new[fullkey])
            da,db = [float(d[key]) for d in distances]
            if bool(a[key]) and not bool(b[key]) and before == 0 and after in (23,24):
                reason = 'new-ventricular-label-excluded-from-context'
            elif not bool(a[key]) and bool(b[key]) and before == after and da > cutoff >= db:
                reason = 'unchanged-tissue-enters-distance-cutoff'
            else: raise ValueError(f'Unexplained context change: {block} {xyz}')
            changes.append(dict(block=block,appXYZ=xyz,coarseZYX=p.tolist(),before=bool(a[key]),after=bool(b[key]),labelBefore=before,labelAfter=after,raw500=int(raw[fullkey]),distanceBeforeMm=da,distanceAfterMm=db,cutoffMm=cutoff,reason=reason))
    topology = {}
    for target in (23,24):
        topology[str(target)] = [int(ndimage.label(v==target, structure=ndimage.generate_binary_structure(3,1))[1]) for v in (old,new)]
    result = dict(stageSha256=digest(record_bytes),sourceCodeSha256=digest((ROOT/'scripts/build_specimen_blocks.py').read_bytes()),changes=changes,sixConnectedComponentCountsBeforeAfter=topology,unionReplayExact=True,reverseExact=True,installed=False,anatomyProvenByTopology=False)
    out.write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(dict(changes=len(changes),reasons={r:sum(c['reason']==r for c in changes) for r in set(c['reason'] for c in changes)},topology=topology,installed=False)))


if __name__ == '__main__': main()
