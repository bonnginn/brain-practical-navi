"""Preflight and install the fixed two-voxel educational repair locally."""
import json
import numpy as np
from prepare_mammillary_tip_repair import ROOT,POINTS,sha,repair
from adopt_registered_red_nuclei import encode
from build_orthogonal_review_bundle import read_browser_volume,MAGIC_LABELS,MAGIC_IMAGE,DEFAULT_IMAGE,EXPECTED_IMAGE_SHA256

BASE_SHA='e7e61a7060c7f1ddfa8106ba659c0488e077495acdd6564862db44663d233ea3'
FINAL_SHA='86e3b22dc7ce69cf31c5ba821e980ce283a366fd952bf46ce880efd8f3127e14'
STAGE=ROOT/'work/anatomy-review/mammillary-tip-stage-v1'
RECORD=ROOT/'segmentation-patches/review/mammillary-tip-adoption-2026-09-06.json'
BASE=ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-mammillary-tip-e7e6.bin.gz'


def plan():
    source=STAGE/'adoption.json'
    if sha(source.read_bytes())!='6e135a8817bddcd498fac81da4813c33a2c9a329a5a2fe2e780e892527f7179e':raise ValueError('Stage changed')
    record=json.loads(source.read_text())
    target=ROOT/'public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz'
    if sha(target.read_bytes()) not in (BASE_SHA,FINAL_SHA):raise ValueError('Unrelated installed volume')
    _,_,labels=read_browser_volume(STAGE/'base.bin.gz',MAGIC_LABELS,BASE_SHA)
    _,_,raw=read_browser_volume(DEFAULT_IMAGE,MAGIC_IMAGE,EXPECTED_IMAGE_SHA256)
    result=repair(labels,raw);encoded=encode(result)
    if sha(encoded)!=FINAL_SHA or encoded!=(STAGE/'labels.bin.gz').read_bytes():raise ValueError('Stage replay differs')
    if tuple(map(tuple,record['points']))!=POINTS or sha(result.tobytes(order='F'))!=record['outputRawSha256']:raise ValueError('Record differs')
    if not np.array_equal(labels[::2,::2,::2],result[::2,::2,::2]):raise ValueError('Block source changed')
    record['decision']='AI-image-reviewed-project-adopted-development-only'
    record['projectAdopted']=True
    record_bytes=(json.dumps(record,indent=2)+'\n').encode()
    base_bytes=(STAGE/'base.bin.gz').read_bytes()
    for p,b in [(RECORD,record_bytes),(BASE,base_bytes)]:
        if p.exists() and p.read_bytes()!=b:raise ValueError('Existing record/fixture differs')
    path=ROOT/'public/atlas/bigbrain-practical-segmentation-icbm500-validation.json'
    meta=json.loads(path.read_text(encoding='utf-8'))
    if meta['rawVoxelSha256'] not in (record['inputRawSha256'],record['outputRawSha256']) or meta['labelCounts']['39'] not in (561,559):raise ValueError('Metadata source differs')
    meta['rawVoxelSha256']=record['outputRawSha256'];meta['labelCounts']['39']=559
    if '0' in meta['labelCounts']:meta['labelCounts']['0']=int((result==0).sum())
    meta['mammillaryTipAudit']=dict(record=RECORD.relative_to(ROOT).as_posix(),recordSha256=sha(record_bytes),
        changedVoxelCount=2,projectAdopted=True,expertReviewed=False,changedBlockPartMasks=[])
    return [(BASE,base_bytes),(RECORD,record_bytes),(target,encoded),(path,(json.dumps(meta,ensure_ascii=False,indent=2)+'\n').encode())]


if __name__=='__main__':
    updates=plan()
    for path,data in updates:path.write_bytes(data)
    print('Installed local two-voxel repair: '+FINAL_SHA)
