"""Stage the image-reviewed 304-cell right ventricular repair; no installation."""
import json
import argparse
import numpy as np
from build_orthogonal_review_bundle import ROOT, DEFAULT_LABELS, MAGIC_LABELS, read_browser_volume
from stage_lateral_fringe_repair import replay, encode
from stage_third_ventricle_core_repair import digest, checked_report
from diagnose_inferior_horn_sampling import SHA


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--residual-51',action='store_true')
    parser.add_argument('--residual-27',action='store_true')
    args=parser.parse_args()
    if args.residual_51 and args.residual_27:parser.error('Select one residual mode')
    baseline='5f1847a300e0a988ec19037c947e18b525f5d4dc01da8de87222035abbf88eba' if args.residual_51 else SHA
    count=57 if args.residual_51 else 304
    candidate_sha='2478cea0ab00d3ba0a915ecc63c8d170526916f5196877b36ef036ffc2ea3129' if args.residual_51 else 'ae68fb441a485258ab93d4294834c7a5ca560c5a6334c6a0b05f25d67b175ce2'
    if args.residual_27:
        baseline='681fb599fd6d2181d7b7398a775abf5f1335eb644ce95afc2149b39fab9f9c88'
        count=53
        candidate_sha='db7a89e6566dad644e53ab3e35588902911a28b2fe835a400f34eeeaa03b30bb'
    work=ROOT/'work/anatomy-review';out=work/'inferior-horn-cavity-stage-v1'
    if args.residual_51:out=work/'inferior-horn-residual-51-stage-v1'
    if args.residual_27:out=work/'inferior-horn-residual-27-stage-v1'
    if out.exists():raise ValueError('Preserve stage evidence')
    source=work/'inferior-horn-cavity-grid-v1.json';data=source.read_bytes()
    if args.residual_51:source=work/'inferior-horn-residual-51-grid-v1.json';data=source.read_bytes()
    if args.residual_27:source=work/'inferior-horn-residual-27-grid-v1.json';data=source.read_bytes()
    if digest(data)!=candidate_sha:raise ValueError('Candidate evidence changed')
    report=json.loads(data)
    if report['labelSha256']!=baseline:raise ValueError('Baseline differs')
    candidates=report['candidateAppXYZ']
    independent={tuple(r['xyz']) for r in report['records'] if r['fullySupported'] and r['currentLabel']==0}
    if len(candidates)!=count or set(map(tuple,candidates))!=independent:raise ValueError('Candidate coverage differs')
    review_inputs=[
        ('inferior-horn-cavity-finite-difference-v1','be00a4dacacf62f98c61765d253b5dc2de269a16f935a65ef772c1af18992278',164),
        ('inferior-horn-cavity-wide-context-v1','777913e141aa0856d9ad7ea68a4471a8011ea9d2cf16dcb7889b60e6ccc1bb09',14)]
    if args.residual_51:review_inputs=[
        ('inferior-horn-residual-51-finite-v1','b1e8c8079036e2e7961dd2f7a2db689c2beab0cdbee4fba85ed055ffd1401df8',72),
        ('inferior-horn-residual-51-coronal-v1','ecb7dffc1077169bbf6de0da9e02fc3751bd29625947eec0a166ea308e193ec4',13),
        ('inferior-horn-residual-51-native-v1','06974a1ec40849199696e6160a5acfd1723d4496772aa86003c15104796cea40',11)]
    if args.residual_27:review_inputs=[
        ('inferior-horn-residual-27-finite-v1','c90dfe8aa4fd17dfae7bfb2cfad7f6c4966d15f657cffc91462fe5b8fb4a625f',46),
        ('inferior-horn-residual-27-coronal-v1','0de998da31a8b2b13f5d1eb77a7ce23e37fff1220e2f948f5325078178e04dd5',14),
        ('inferior-horn-residual-27-native-v1','600eee35a2096315e4af07e1ebdf9f45d5ab2e8324552b462a6912199960bc4e',8)]
    evidence=[checked_report(folder,sha,n) for folder,sha,n in review_inputs]
    points=[dict(xyz=p,before=0,after=24) for p in candidates]
    _,_,before=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,baseline)
    after=replay(before,points)
    if np.count_nonzero(before!=after)!=count or not np.array_equal(replay(after,points,True),before):raise ValueError('Reverse replay differs')
    compressed=encode(after)
    result=dict(inputCompressedSha256=baseline,inputRawSha256=digest(before.tobytes(order='F')),
                outputCompressedSha256=digest(compressed),outputRawSha256=digest(after.tobytes(order='F')),
                changedVoxelCount=count,transitions={'0->24':count},points=points,
                reviewEvidence=[{k:e[k] for k in ['path','sha256']} for e in evidence],
                finiteEvidence=dict(path=source.relative_to(ROOT).as_posix(),sha256=digest(data)),
                status='AI-image-reviewed-development-repair-staged',adopted=False,installed=False,published=False,expertReviewed=False,
                rationale='Localized omissions within the right ventricular cavity; all projected change planes and adjacent planes reviewed against registered raw 300um images, with wider anatomical context at crop-near locations. Internal gray structures retained.',
                limitations=['Not full inferior-horn completion, expert ground truth, or approval of the threshold exploration.',
                             'Do not interpolate missing connections or transfer unreviewed threshold cells.',
                             'Dependent meshes, integration, application tests/build/browser remain pending.'])
    out.mkdir();(out/'base.bin.gz').write_bytes(DEFAULT_LABELS.read_bytes())
    (out/'labels.bin.gz').write_bytes(compressed)
    (out/'repair.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:result[k] for k in ['changedVoxelCount','outputCompressedSha256','outputRawSha256','installed']}))


if __name__=='__main__':main()
