"""Stage two image-reviewed lateral cavity omissions, never install or publish."""
import json
import argparse
import numpy as np
from build_orthogonal_review_bundle import ROOT, DEFAULT_LABELS, MAGIC_LABELS, read_browser_volume
from adopt_registered_red_nuclei import encode
from stage_third_ventricle_core_repair import digest, checked_report
from review_fornix_native300 import CURRENT_SHA


def replay(volume, points, reverse=False):
    result=volume.copy();seen=set()
    for p in points:
        xyz=p['xyz']
        if len(xyz)!=3 or any(type(v) is not int for v in xyz):raise ValueError('Invalid coordinate')
        key=tuple(xyz)
        if key in seen or any(v<0 or v>=n for v,n in zip(key,result.shape)):raise ValueError('Duplicate or outside grid')
        seen.add(key)
        if p['before']!=0 or p['after'] not in (23,24):raise ValueError('Invalid transition')
        before,after=(p['after'],0) if reverse else (0,p['after'])
        if result[key]!=before:raise ValueError('Voxel conflict')
        result[key]=after
    return result


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    mode=parser.add_mutually_exclusive_group()
    mode.add_argument('--next-components',action='store_true')
    mode.add_argument('--remaining-large',action='store_true')
    args=parser.parse_args()
    label_sha='83dcbdda59e86f393cc93b9d91ccd8f68c1fa08bc1156df99467fe3aef792567' if args.next_components else CURRENT_SHA
    label_path=DEFAULT_LABELS if args.next_components else ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-lateral-fringe-d429.bin.gz'
    specs=[(23,334,119),(24,66,146)] if args.next_components else [(23,339,144),(24,73,164)]
    if args.next_components:
        label_path=ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-lateral-next-83dc.bin.gz'
    if args.remaining_large:
        label_sha='7c54fdd2e391ca3e1ed70f7e5fdead7be940d1007b891eb4bb4dd22d7407f0ef'
        label_path=DEFAULT_LABELS
        specs=[(23,59,61),(23,278,61),(23,297,51),(24,88,132),(24,103,123),(24,52,84),(24,124,66),(24,21,52)]
    total=sum(c for _,_,c in specs)
    work=ROOT/'work/anatomy-review';out=work/('lateral-fringe-next-stage-v1' if args.next_components else 'lateral-fringe-stage-v1')
    if args.remaining_large:out=work/'lateral-fringe-remaining-large-stage-v1'
    if out.exists():raise ValueError('Preserve evidence')
    path=work/'lateral-ventricle-fringe-v1/report.json'
    candidate_sha='1c8884fe812d21d3ec6303e9dff2878e2374bd6767bfee8b0dff3b3ca78c6042'
    if digest(path.read_bytes())!=candidate_sha:raise ValueError('Candidate changed')
    candidate=json.loads(path.read_text(encoding='utf-8'));points=[]
    if candidate['labelSha256']!=CURRENT_SHA:raise ValueError('Wrong baseline')
    for target,ident,count in specs:
        entry=next(r for r in candidate['results'] if r['target']==target)
        c=next(c for c in entry['components'] if c['id']==ident)
        if len(c['points'])!=count:raise ValueError('Wrong count')
        points.extend(dict(xyz=p,before=0,after=target) for p in c['points'])
    evidence=[checked_report('lateral-fringe-remaining-large-difference-v1','f7d862d4af9d7b694d90d4420289ac970382d0a3e290ce2d26d1c7a0907ca3b6',114),
        checked_report('lateral-fringe-remaining-large-native-v1','b2b23f0b2e204a638465f1e5da5e56120f4fc079ad5245fd2f5af89ff2ec07bf',24)] if args.remaining_large else [checked_report('lateral-fringe-next-difference-v1','691a2555100c2cebe70f7e6ae113e09aefa8b0225b220dae6be4372544b7cb6c',34),
        checked_report('lateral-ventricle-fringe-next-v1','412935376ea7e3e582d2923cf4c21b827b7bc56791641e3d8d7402030eaf23da',6)] if args.next_components else [checked_report('lateral-fringe-difference-v1','a06bd720e00c7be59052d9f24bac044395e5ea1fb6b7601ba11bb3c4370b828e',42),
        checked_report('lateral-ventricle-fringe-largest-v1','2abe2b729c4f3c6c4f8f743f68c35b3062cbb9ca34097bcd8611a667c1648d5f',6)]
    _,_,before=read_browser_volume(label_path,MAGIC_LABELS,label_sha)
    after=replay(before,points)
    if np.count_nonzero(before!=after)!=total or not np.array_equal(replay(after,points,True),before):raise ValueError('Replay differs')
    encoded=encode(after)
    report=dict(inputCompressedSha256=label_sha,inputRawSha256=digest(before.tobytes(order='F')),
        outputCompressedSha256=digest(encoded),outputRawSha256=digest(after.tobytes(order='F')),
        points=points,changedVoxelCount=total,transitions={f'0->{target}':sum(c for t,_,c in specs if t==target) for target in (23,24)},candidateSha256=candidate_sha,
        components=[dict(target=t,component=i,count=c) for t,i,c in specs],
        reviewEvidence=evidence,status='AI-image-reviewed-development-repair-staged',expertReviewed=False,
        installed=False,published=False,rationale=f'Localized cavity-side omissions supported by original300 orthogonal views and all {308 if args.remaining_large else 96 if args.next_components else 116} app difference planes; preserve visible tissue walls.',
        limitations=['Local fringes, not all ventricular boundaries.','One layer does not resolve every residual cavity omission.','Combined-mask review, mesh integration, downstream audits, tests and live browser verification pending.'])
    out.mkdir();(out/'base.bin.gz').write_bytes(label_path.read_bytes());(out/'labels.bin.gz').write_bytes(encoded)
    (out/'repair.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:report[k] for k in ['changedVoxelCount','outputCompressedSha256','outputRawSha256','installed']}))


if __name__=='__main__':main()
