"""Prepare/replay reviewed registration of IDs3-22 after the red-nucleus stage.

This is project adoption of the source delineations, not a new intensity-based
segmentation or an expert approval. Preserve the one reviewed ventricle conflict.
"""
import argparse
import hashlib
import json
from pathlib import Path
import numpy as np
from adopt_registered_red_nuclei import ROOT, TARGET, encode, digest
from apply_segmentation_patch import read_volume
from compose_registered_practical_candidate import compose, raw_sha, make_delta, replay_delta, TIGHT_CANDIDATE_SHA, TIGHT_CANDIDATE_RAW_SHA

BASE_SHA='cec9c331d2a8e77bba1e79226c1d630905f2b7e89db7032cdc6e3db0e114dca8'
BASE_RAW='75b32f8bc7579b36fecb842defd80654b9c56511eb7d7c772d73879ab2ff71c4'
FINAL_RAW='153ba1ede7988736785a127f42b50793427e50e6f029e46bd9a69218a3920834'
FINAL_SHA='7ebed144c2b200233ad1389d3288b2407edcb542fe46eaf8626ef872522f8c3f'
FIXTURE=ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-remaining-registration-cec9.bin.gz'
RECORD=ROOT/'segmentation-patches/review/remaining-manual-registration-project-adoption-2026-09-06.json'
RECORD_SHA='cd246260ac82b66f36078c4354138f28afc9b8fb2a5162d7affa92eb025af673'


def pack_runs(indices,before,after):
    runs=[]
    for i,a,b in zip(indices,before,after):
        i,a,b=int(i),int(a),int(b)
        if runs and runs[-1][0]+runs[-1][1]==i and runs[-1][2:]==[a,b]:runs[-1][1]+=1
        else:runs.append([i,1,a,b])
    return runs


def apply_record(volume,record):
    if record.get('scope')!='registered-ids-3-through-22' or record.get('reviewStatus')!='project-adopted' or record.get('expertReviewed') is not False:
        raise ValueError('Wrong review scope/status')
    if list(volume.shape)!=record['dimensions'] or raw_sha(volume)!=BASE_RAW:
        raise ValueError('Wrong baseline')
    indices=[];before=[];after=[];end=0
    for row in record['runs']:
        if len(row)!=4 or any(type(v) is not int for v in row):raise ValueError('Invalid run')
        start,length,a,b=row
        if start<end or length<1 or start+length>volume.size or a==b or a not in (0,*range(3,23),27,31,32) or b not in (0,*range(3,23)):
            raise ValueError('Out-of-scope or overlapping run')
        end=start+length
        indices.extend(range(start,end));before.extend([a]*length);after.extend([b]*length)
    indices=np.asarray(indices,dtype=np.int64);before=np.asarray(before,dtype=np.uint8);after=np.asarray(after,dtype=np.uint8)
    if len(indices)!=record['changedVoxelCount']:raise ValueError('Wrong edit count')
    result=replay_delta(volume,indices,before,after)
    if raw_sha(result)!=FINAL_RAW or record['outputRawSha256']!=FINAL_RAW:
        raise ValueError('Wrong final identity')
    if not np.array_equal(replay_delta(result,indices,before,after,reverse=True),volume):raise ValueError('Reverse replay failed')
    return result


def prepare(output):
    output=output.resolve()
    if output.exists() or not output.is_relative_to(ROOT/'work'):raise ValueError('Use a new work directory')
    baseline=FIXTURE if FIXTURE.exists() else TARGET
    if digest(baseline.read_bytes())!=BASE_SHA:raise ValueError('Wrong baseline file')
    dims,data=read_volume(baseline);old=np.frombuffer(data,dtype=np.uint8).reshape(dims,order='F')
    source=ROOT/'work/anatomy-review/manual-all22-registered-tight-v1/candidate-all22.npz'
    if digest(source.read_bytes())!=TIGHT_CANDIDATE_SHA:raise ValueError('Wrong candidate')
    candidate=np.zeros(dims,dtype=np.uint8)
    with np.load(source,allow_pickle=False) as f:
        if not np.array_equal(f['dimensions'],dims):raise ValueError('Wrong candidate grid')
        candidate[tuple(slice(int(a),int(b)) for a,b in zip(f['minimum'],f['maximumExclusive']))]=f['labels']
    if raw_sha(candidate)!=TIGHT_CANDIDATE_RAW_SHA:raise ValueError('Wrong candidate raw')
    final,stats=compose(old,candidate)
    if raw_sha(final)!=FINAL_RAW or digest(encode(final))!=FINAL_SHA:raise ValueError('Previously reviewed composite differs')
    for label in (1,2,23,24,25,26,28,29,30,33,34,35,39,40,41):
        if not np.array_equal(old==label,final==label):raise ValueError('Protected structure changed')
    indices,before,after=make_delta(old,final)
    record=dict(schemaVersion=1,scope='registered-ids-3-through-22',reviewStatus='project-adopted',expertReviewed=False,researchGroundTruth=False,
        decisionDate='2026-09-06',decisionBasis='User requested consecutive autonomous corrections following red-nucleus adoption; existing full image review supports source-registration repair, not expert boundary approval.',
        dimensions=list(dims),inputCompressedSha256=BASE_SHA,inputRawSha256=BASE_RAW,outputCompressedSha256=FINAL_SHA,outputRawSha256=FINAL_RAW,
        sourceCandidateSha256=TIGHT_CANDIDATE_SHA,sourceCandidateRawSha256=TIGHT_CANDIDATE_RAW_SHA,
        changedVoxelCount=len(indices),runs=pack_runs(indices,before,after),runFormat='[Fortran XYZ start, length, before, after]',statistics=stats,
        byLabel={str(i):dict(before=int(np.count_nonzero(old==i)),after=int(np.count_nonzero(final==i))) for i in range(42)},
        evidenceDocuments=['MANUAL_REGISTERED_REVIEW_CONCLUSIONS.md','REGISTERED_LABELS_ADOPTION.md'],
        limitations='Keep internal bright bands and source delineations. No subnuclei, threshold carving or nearest-label filling. Vacated labels mean unlabeled tissue. Preserve left ventricle at [173,262,184]. Coarse brainstem/internal-capsule overlap is resolved only at the reviewed nuclear borders.')
    assert np.array_equal(apply_record(old,record),final)
    output.mkdir(parents=True)
    (output/'record.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    (output/'labels.bin.gz').write_bytes(encode(final))
    print(json.dumps({k:v for k,v in record.items() if k not in ('runs','byLabel')},ensure_ascii=False))


def install():
    if digest(RECORD.read_bytes())!=RECORD_SHA:raise ValueError('Reviewed record changed')
    record=json.loads(RECORD.read_text(encoding='utf-8'))
    if digest(FIXTURE.read_bytes())!=BASE_SHA or digest(TARGET.read_bytes()) not in (BASE_SHA,FINAL_SHA):raise ValueError('Refuse unrelated input')
    dims,data=read_volume(FIXTURE)
    final=apply_record(np.frombuffer(data,dtype=np.uint8).reshape(dims,order='F'),record)
    encoded=encode(final)
    if digest(encoded)!=FINAL_SHA:raise ValueError('Compressed identity differs')
    TARGET.write_bytes(encoded)
    print(FINAL_SHA)


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);g=p.add_mutually_exclusive_group(required=True)
    g.add_argument('--prepare',type=Path);g.add_argument('--install-development',action='store_true')
    a=p.parse_args()
    if a.prepare:prepare(a.prepare)
    else:install()
