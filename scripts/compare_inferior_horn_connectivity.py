"""Measure residual inferior-horn gaps after adoption; never infer anatomical bridges."""
import json
import argparse
import numpy as np
from build_orthogonal_review_bundle import ROOT, DEFAULT_LABELS, MAGIC_LABELS, read_browser_volume
from diagnose_inferior_horn_sampling import topology
from locate_inferior_horn_fragments import fragment_records
from stage_third_ventricle_core_repair import digest


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    modes=parser.add_mutually_exclusive_group()
    modes.add_argument('--after-residual',action='store_true')
    modes.add_argument('--after-residual53',action='store_true')
    args=parser.parse_args()
    out=ROOT/'work/anatomy-review/inferior-horn-connectivity-after-adoption-v1.json'
    if args.after_residual:out=ROOT/'work/anatomy-review/inferior-horn-connectivity-after-residual-v1.json'
    if args.after_residual53:out=ROOT/'work/anatomy-review/inferior-horn-connectivity-after-residual53-v1.json'
    if out.exists():
        raise ValueError('Preserve existing evidence')
    record_path=ROOT/'segmentation-patches/review/inferior-horn-adoption-2026-09-07.json'
    if args.after_residual:record_path=ROOT/'segmentation-patches/review/inferior-residual-adoption-2026-09-07.json'
    if args.after_residual53:record_path=ROOT/'segmentation-patches/review/inferior-residual53-adoption-2026-09-07.json'
    record_bytes=record_path.read_bytes(); record=json.loads(record_bytes)
    expected='5f1847a300e0a988ec19037c947e18b525f5d4dc01da8de87222035abbf88eba'
    if args.after_residual:expected='681fb599fd6d2181d7b7398a775abf5f1335eb644ce95afc2149b39fab9f9c88'
    if args.after_residual53:expected='ba31c7b26409ce771fe5df47548299e671489649580a004017bd0617c9100efb'
    if record['outputCompressedSha256']!=expected:
        raise ValueError('Unexpected adoption stage')
    lo=np.array([202,170,72]); hi=np.array([283,303,143])
    crop=tuple(slice(int(a),int(b)) for a,b in zip(lo,hi))
    stages={}
    before_path=ROOT/('tests/fixtures/bigbrain-practical-segmentation-pre-inferior-residual-5f18.bin.gz' if args.after_residual else 'tests/fixtures/bigbrain-practical-segmentation-pre-inferior-horn-0d31.bin.gz')
    if args.after_residual53:before_path=ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-inferior-residual53-681f.bin.gz'
    for name,path,sha in [
        ('before',before_path,record['inputCompressedSha256']),
        ('after',DEFAULT_LABELS,expected),
    ]:
        _,_,labels=read_browser_volume(path,MAGIC_LABELS,sha)
        complete=labels==24; mask=complete[crop]
        groups={key:fragment_records(mask,lo,complete,c) for key,c in [('six',1),('twentySix',3)]}
        stages[name]=dict(labelSha256=sha,cropTopology=topology(mask),groups=groups)
        del labels,complete,mask
    report=dict(adoptionRecordSha256=digest(record_bytes),cropAppXYZ=dict(min=lo.tolist(),maxExclusive=hi.tolist()),
                stages=stages,mutation=False,
                limitation='Fixed display crop, not a definition of the inferior horn. Connectivity and nearest points locate residual gaps only. No joining, deletion, anatomical approval or mesh change is authorized by this diagnostic.')
    out.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({name:dict(topology=r['cropTopology'],significant=[p for p in r['groups']['twentySix'] if p['count']>=7]) for name,r in stages.items()},indent=2))


if __name__=='__main__':main()
