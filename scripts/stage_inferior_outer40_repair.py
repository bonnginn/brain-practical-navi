"""Stage the fixed image-reviewed outer 40 cells; never install or publish."""
import hashlib
import json
import numpy as np
from build_orthogonal_review_bundle import ROOT, DEFAULT_LABELS, MAGIC_LABELS, read_browser_volume
from stage_lateral_fringe_repair import replay, encode
from stage_third_ventricle_core_repair import digest, checked_report
from diagnose_inferior_horn_sampling import topology
from locate_inferior_horn_fragments import fragment_records

BASE = '58d8044071bd0b638bfdbbcc309c35ac3301a9c8f449b8ebcc5b77e5435cfae7'
BASE_RAW = '94a8a3edd960256d0fc22e2c5fff2085d88e3f3e8fcc1415ae112b37c2d794f1'
SOURCE_SHA = 'ebf0e88def96476d0a32ddaff6f28e37d7afd125dec724e6d8855b12357c7e86'
GRID_SHA = 'f07efa84d1b8d9a324d8f9f462db90a68608af045fede6129fa89f98129251f3'
EXPLORATION_SHA = 'e759bd719aeb572cf2b06b0cc1ea22ad1d355425d3a4e25563fec49e5935693a'
FINITE_SHA = 'f73e4a835c638aa662c4c7bb7797d56364749ce04c85276f1616641b466f2fe8'
REVIEW_SHA = '296949d7699c6d8ad401bdc8e015094b6844376802bdd2bb8122d714082b6a20'
XYZ = [(267,245,105),(267,246,105),(267,247,103),(267,247,104),(267,249,101),
       (267,249,102),(267,250,101),(268,249,101),(269,243,105),(269,243,106),
       (269,244,105),(269,245,103),(269,245,104),(269,246,103),(269,246,104),
       (269,247,101),(269,247,102),(269,248,101),(269,249,99),(269,249,100),
       (269,250,99),(270,243,105),(270,245,103),(270,247,101),(270,249,99),
       (271,241,105),(271,243,103),(271,243,104),(271,244,103),(271,244,104),
       (271,245,102),(271,246,101),(271,247,100),(272,241,105),(272,243,103),
       (272,243,104),(272,244,103),(272,245,102),(272,246,101),(273,240,105)]
WORK = ROOT/'work/anatomy-review'


def validated_points(grid, finite):
    for report in (grid, finite):
        if report['labelSha256'] != BASE or report['sourceSha256'] != SOURCE_SHA:
            raise ValueError('Wrong baseline or source')
    if grid['explorationReportSha256'] != EXPLORATION_SHA:
        raise ValueError('Exploration differs')
    candidates = grid['candidateAppXYZ']
    selected = [r for r in grid['records'] if r['fullySupported'] and r['currentLabel'] == 0]
    if len(candidates) != 40 or set(map(tuple, candidates)) != set(XYZ):
        raise ValueError('Fixed reviewed set differs')
    if len(selected) != 40 or {tuple(r['xyz']) for r in selected} != set(XYZ):
        raise ValueError('Supported set differs')
    for r in selected:
        if r['outsideCropCells'] or r['outsideExplorationCells'] or r['touchesCropFace'] or r['sourceCells'] <= 0:
            raise ValueError('Finite support contradicts selection')
    if sum(bool(r['fullySupported']) for r in grid['records']) != 329:
        raise ValueError('Support coverage differs')
    if finite['finiteCandidateEvidence'] != dict(reportSha256=GRID_SHA, appCandidateCount=40, sourceProjectionCount=204):
        raise ValueError('Finite projection differs')
    expected = {(a,i) for a,indices in [('x',range(444,458)),('y',range(399,419)),('z',range(164,179))] for i in indices}
    if len(finite['figures']) != 49 or {(f['axis'],f['index']) for f in finite['figures']} != expected:
        raise ValueError('Orthogonal coverage differs')
    panels = [p for c in finite['contacts'] for p in c['sourcePanels']]
    if len(finite['contacts']) != 13 or len(panels) != 49 or set(panels) != {f['path'] for f in finite['figures']}:
        raise ValueError('Contact coverage differs')
    return [dict(xyz=list(p),before=0,after=24) for p in XYZ]


def main():
    out = WORK/'inferior-horn-outer40-stage-v1'
    if out.exists():
        raise ValueError('Preserve existing stage evidence')
    source = ROOT/'work/official-bigbrain-tissue/mni_PD25_20190708_minc2/BigBrain-to-ICBM2009sym-nonlin-300um.mnc'
    with source.open('rb') as stream:
        if hashlib.file_digest(stream,'sha256').hexdigest() != SOURCE_SHA:
            raise ValueError('Raw source changed')
    path = WORK/'inferior-horn-outer-after19-grid-v1.json'
    data = path.read_bytes()
    if digest(data) != GRID_SHA:
        raise ValueError('Grid changed')
    evidence = [checked_report('inferior-horn-outer-after19-exploration-v1',EXPLORATION_SHA,11),
                checked_report('inferior-horn-outer-after19-finite-v1',FINITE_SHA,49)]
    for e in evidence:
        if e['report']['labelSha256'] != BASE or e['report']['sourceSha256'] != SOURCE_SHA:
            raise ValueError('Image evidence baseline differs')
        for c in e['report']['contacts']:
            if digest((ROOT/e['path']).parent.joinpath(c['path']).read_bytes()) != c['sha256']:
                raise ValueError('Contact image changed')
    review = WORK/'inferior-horn-outer-after19-finite-v1/visual-review.md'
    if digest(review.read_bytes()) != REVIEW_SHA:
        raise ValueError('Review decision changed')
    points = validated_points(json.loads(data),evidence[1]['report'])
    _,_,before = read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,BASE)
    if digest(before.tobytes(order='F')) != BASE_RAW:
        raise ValueError('Raw baseline differs')
    after = replay(before,points)
    changed = np.argwhere(before != after)
    if set(map(tuple,changed)) != set(XYZ) or not np.array_equal(replay(after,points,True),before):
        raise ValueError('Exact full-volume difference/reverse mismatch')
    lo=np.array([202,170,72]); hi=np.array([283,303,143])
    crop=tuple(slice(int(a),int(b)) for a,b in zip(lo,hi))
    connectivity={}
    for name,volume in [('before',before),('after',after)]:
        complete=volume == 24; mask=complete[crop]
        connectivity[name]=dict(totalLabel24=int(complete.sum()),cropTopology=topology(mask),groups=fragment_records(mask,lo,complete,3))
    compressed=encode(after)
    result=dict(inputCompressedSha256=BASE,inputRawSha256=BASE_RAW,
        outputCompressedSha256=digest(compressed),outputRawSha256=digest(after.tobytes(order='F')),
        sourceEvidence=dict(path=source.relative_to(ROOT).as_posix(),sha256=SOURCE_SHA),
        gridEvidence=dict(path=path.relative_to(ROOT).as_posix(),sha256=GRID_SHA),
        reviewDecision=dict(path=review.relative_to(ROOT).as_posix(),sha256=REVIEW_SHA),
        reviewEvidence=[{k:e[k] for k in ['path','sha256']} for e in evidence],
        changedVoxelCount=40,transitions={'0->24':40},points=points,reverseExact=True,
        connectivity=connectivity,cropAppXYZ=dict(min=lo.tolist(),maxExclusive=hi.tolist()),
        status='AI-image-reviewed-development-repair-staged',imageReviewed=True,
        adopted=False,installed=False,published=False,expertReviewed=False,
        rationale='Fixed finite-supported outer cavity omissions, reviewed in all 49 paired raw/overlay planes and 13 contact sheets. Preserve other labels and crop-edge cells.',
        limitations=['Stage only; not expert ground truth or full inferior-horn completion.',
          'Do not adopt the entire crop-touching threshold exploration or bridge medial fragments.',
          'Derived mesh anatomical review and integration checks remain pending.'])
    out.mkdir()
    (out/'base.bin.gz').write_bytes(DEFAULT_LABELS.read_bytes())
    (out/'labels.bin.gz').write_bytes(compressed)
    (out/'repair.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:result[k] for k in ['outputCompressedSha256','outputRawSha256','changedVoxelCount','installed']}))
    print(json.dumps({k:dict(total=v['totalLabel24'],topology=v['cropTopology']) for k,v in connectivity.items()}))


if __name__ == '__main__':
    main()
