"""Preflight and install the reviewed outer 40 cells in development only."""
import argparse
import json
import numpy as np
from stage_inferior_outer40_repair import BASE, BASE_RAW, GRID_SHA, FINITE_SHA, REVIEW_SHA, WORK, validated_points
from stage_lateral_fringe_repair import ROOT, replay, digest, encode
from build_orthogonal_review_bundle import DEFAULT_LABELS, MAGIC_LABELS, read_browser_volume
from install_third_ventricle_core_repair import checked
from stage_third_ventricle_core_repair import checked_report
from install_inferior_residual53_repair import serialized

FINAL='e98cd4060d735c732a5fd75030be2f701f57fe91b6cd5b9a12c65e1cb68b37e3'
RAW='9a524981ddf521236b8fec835aef04891fa2b6ef58d22a2b5f03ca1a9f68d64d'
IMPACT='e2b4aea594957f7479870bbd992dcd65d0a9b876e0e782b672b8391a400fdd4f'


def validate_impact(impact,manifest):
    expected={(block,p['part']) for block,parts in manifest['specimens'].items() for p in parts}
    rows=impact['blockMaskImpact']
    observed=[(p['block'],p['part']) for p in rows]
    if len(rows)!=55 or len(set(observed))!=55 or set(observed)!=expected:
        raise ValueError('Incomplete or duplicate mesh impact coverage')
    if any(p['changedMaskVoxels']!=0 for p in rows):raise ValueError('Unexpected mesh change requires review')
    if impact['inputSha256']!=BASE or impact['outputSha256']!=FINAL or impact['installationBlocked']:
        raise ValueError('Impact baseline or gate differs')


def plan():
    stage=WORK/'inferior-horn-outer40-stage-v1'
    record=checked(stage/'repair.json','2b85f78bb78dffb8614e8201c2d60da57977d9fe8ca0eb7b0ed391364d62e8f9')
    grid=checked(WORK/'inferior-horn-outer-after19-grid-v1.json',GRID_SHA)
    finite=checked_report('inferior-horn-outer-after19-finite-v1',FINITE_SHA,49)
    for contact in finite['report']['contacts']:
        if digest((ROOT/finite['path']).parent.joinpath(contact['path']).read_bytes())!=contact['sha256']:
            raise ValueError('Contact evidence changed')
    if digest((WORK/'inferior-horn-outer-after19-finite-v1/visual-review.md').read_bytes())!=REVIEW_SHA:
        raise ValueError('Visual review changed')
    if validated_points(grid,finite['report'])!=record['points']:raise ValueError('Selected points changed')
    impact=checked(WORK/'inferior-horn-outer40-meshes-v1/report.json',IMPACT)
    manifest=json.loads((ROOT/'public/atlas/specimen-blocks.json').read_text(encoding='utf-8'))
    validate_impact(impact,manifest)
    _,_,before=read_browser_volume(stage/'base.bin.gz',MAGIC_LABELS,BASE)
    after=replay(before,record['points']);data=encode(after)
    if digest(before.tobytes(order='F'))!=BASE_RAW or digest(data)!=FINAL or digest(after.tobytes(order='F'))!=RAW:
        raise ValueError('Volume replay hash differs')
    if np.count_nonzero(before!=after)!=40 or not np.array_equal(replay(after,record['points'],True),before):
        raise ValueError('Difference/reverse replay differs')
    if record['transitions']!={'0->24':40} or digest(DEFAULT_LABELS.read_bytes()) not in (BASE,FINAL):
        raise ValueError('Current baseline changed')
    record_path=ROOT/'segmentation-patches/review/inferior-outer40-adoption-2026-09-07.json'
    record.update(adopted=True,projectAdopted=True,installed=True,expertReviewed=False,published=False,
                  status='AI-image-reviewed-project-adopted-development-only',meshImpact=impact,
                  visualReview=dict(pairedPlanes=49,contactSheets=13,expertReviewed=False))
    record['limitations']=['Development integration only; not expert ground truth or full inferior-horn completion.',
        'Do not fill crop-edge threshold components or bridge separate medial fragments.',
        'All 55 derived block masks unchanged; no mesh or specimen manifest replacement. Tests/build/browser tracked separately.']
    record_data=serialized(record)
    meta_path=ROOT/'public/atlas/bigbrain-practical-segmentation-icbm500-validation.json'
    meta=json.loads(meta_path.read_text(encoding='utf-8'))
    if meta['rawVoxelSha256'] not in (BASE_RAW,RAW):raise ValueError('Metadata baseline changed')
    meta['rawVoxelSha256']=RAW
    for ident in (0,24):meta['labelCounts'][str(ident)]=int(np.count_nonzero(after==ident))
    meta['inferiorOuter40Audit']=dict(record=record_path.relative_to(ROOT).as_posix(),recordSha256=digest(record_data),
        changedVoxelCount=40,projectAdopted=True,expertReviewed=False,changedBlockPartMasks=[])
    retained=[(ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-inferior-outer40-58d8.bin.gz',(stage/'base.bin.gz').read_bytes()),(record_path,record_data)]
    for path,value in retained:
        if path.exists() and path.read_bytes()!=value:raise ValueError('Recovery evidence changed')
    return retained+[(DEFAULT_LABELS,data),(meta_path,serialized(meta))]


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--apply',action='store_true')
    args=parser.parse_args();changes=plan()
    if args.apply:
        for path,data in changes:path.write_bytes(data)
    print(json.dumps(dict(preflightPassed=True,applied=args.apply,files=[p.relative_to(ROOT).as_posix() for p,_ in changes])))
