"""Reversible WORK-ONLY candidate; no adoption or public writes."""
import hashlib,json,argparse
import numpy as np
from adopt_registered_red_nuclei import encode
from audit_nerve_origin_context import LABEL_SHA
from build_orthogonal_review_bundle import ROOT,DEFAULT_LABELS,MAGIC_LABELS,read_browser_volume

EVIDENCE_SHA='e48c578bb5fd79e31020e1ec7f321302b49c38e2b934f1382a1d24ae7e362627'
sha=lambda data:hashlib.sha256(data).hexdigest()


def main(component=2532):
    configs={2532:(LABEL_SHA,EVIDENCE_SHA,559,348,'cerebellar-finite-2532-v2','cerebellar-support-stage-v1'),
        2274:('294379b727b7263b6d60af7f693ebb27ab9e75a149844ff42535d7399dc0acae','19955c3f879da17fee06dd06ae981bbce1ed5a9becae2cae83d0c3b86e518013',428,52,'cerebellar-finite-2274-v1','cerebellar-support-2274-stage-v1'),
        997:('2fc863aee8009ad9280dd2dd5fd2a9e8fa91de7f84a3ec5f59764317972c4cd9','700aa7b31d93bb9aa1c679fab5d8b2117ba3b003f9bb1476bb9fd345233d40b3',1007,259,'cerebellar-finite-997-v1','cerebellar-support-997-stage-v1'),
        1393:('190f88dc05345e36b2e556829eb7882b6d01d0a67240b7738c1ab58820cd5548','0378ec2aa96b328ccb8db4e71ed03b5da6676452f28f34a65be8cf1ac675d55e',943,372,'cerebellar-finite-1393-v1','cerebellar-support-1393-stage-v1'),
        1603:('09088a9cf76b8c0578e96f21b9e35077ef345fd90bebc5294308e1603262bb34','c7965e8cf1f0007855a71c9b69ab2942d4b4b3b134d2d7f413c61154008a766b',654,229,'cerebellar-finite-1603-v1','cerebellar-support-1603-stage-v1'),
        843:('c9899d58afb39c1eb4b9873b0a39ecb5e44c7e0de895874a2284cfa8bd627f56','2ba5999fa2ab1448e81d190a58983c2dc1a4bb3ece2117c1a4bd54f60855fb78',7267,3353,'cerebellar-finite-843-v1','cerebellar-support-843-stage-v1'),
        1105:('212df1a6130977c23eb4561a5f883a2bd7efecba5f2b870cc1bbc5eae1b80b3b','eec46be33247d158332d2d8ecb9b57fa144aa28c0e7e8a99071f0059b1ac433c',39991,21290,'cerebellar-finite-1105-v1','cerebellar-support-1105-stage-v1')}
    label_sha,evidence_sha,total_count,changed_count,evidence_folder,output_folder=configs[component]
    out=ROOT/'work/anatomy-review'/output_folder
    if out.exists():raise ValueError('Evidence exists')
    path=ROOT/'work/anatomy-review'/evidence_folder/'report.json'
    if sha(path.read_bytes())!=evidence_sha:raise ValueError('Evidence changed')
    evidence=json.loads(path.read_text())
    if evidence['labelsSha256']!=label_sha:raise ValueError('Label version changed')
    for f in evidence['figures']:
        if sha((path.parent/f['path']).read_bytes())!=f['sha256']:raise ValueError('Figure changed')
    selected=[r for r in evidence['records'] if r['allSupportCornersSaturated']]
    if len(selected)!=changed_count or len(evidence['records'])!=total_count:raise ValueError('Scope differs')
    _,_,labels=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,label_sha)
    result=labels.copy();reverse=[]
    for r in selected:
        p=tuple(r['xyz']);old=int(labels[p])
        if old!=r['label'] or old not in (28,29):raise ValueError('Source conflict')
        result[p]=0;reverse.append(dict(xyz=list(p),before=old,after=0))
    if len({tuple(r['xyz']) for r in reverse})!=changed_count or np.count_nonzero(result!=labels)!=changed_count:raise ValueError('Diff differs')
    restored=result.copy()
    for r in reverse:restored[tuple(r['xyz'])]=r['before']
    if not np.array_equal(restored,labels):raise ValueError('Not reversible')
    encoded=encode(result)
    report=dict(component=component,inputCompressedSha256=label_sha,outputCompressedSha256=sha(encoded),inputRawSha256=sha(labels.tobytes(order='F')),
        outputRawSha256=sha(result.tobytes(order='F')),evidenceSha256=evidence_sha,points=reverse,
        changedVoxelCount=changed_count,retainedFromOriginalComponent=total_count-changed_count,
        changedEvenGridSamples=int(np.count_nonzero(labels[::2,::2,::2]!=result[::2,::2,::2])),
        adopted=False,expertReviewed=False,status='candidate-only-pending-difference-image-review-and-mesh-impact',
        limitation='Support-corner saturation constrains an image interpolant, not anatomy. No public asset replacement.')
    out.mkdir();(out/'labels.bin.gz').write_bytes(encoded);(out/'base.bin.gz').write_bytes(DEFAULT_LABELS.read_bytes())
    (out/'candidate.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:report[k] for k in ['changedVoxelCount','retainedFromOriginalComponent','changedEvenGridSamples','outputCompressedSha256']}))


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--component',type=int,choices=[2532,2274,997,1393,1603,843,1105],default=2532)
    main(parser.parse_args().component)
