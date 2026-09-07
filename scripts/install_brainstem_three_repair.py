"""Replay the fixed 27-point adoption; refuse unrelated input or target versions."""
import json
import numpy as np
from install_brainstem_paired_repair import ROOT,TARGET,FINAL_SHA as BASE_SHA,sha
from adopt_registered_red_nuclei import encode
from apply_segmentation_patch import read_volume
from prepare_brainstem_three_adoption import repair,EVIDENCE,EVIDENCE_SHA
BASE=ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-three-islands-189f.bin.gz'
RECORD=ROOT/'segmentation-patches/review/brainstem-three-islands-adoption-2026-09-06.json'
RECORD_SHA='9c7b14f4272969261e3e2415d3f522b7e5d7db1eeca7cb0c8ae28b225458be66'
FINAL_SHA='82384fa6961b4eb6aa272aa556f76febd4027cf1f67937504ee227ac0a8e4726'

def replay(labels,record):
    if sha(RECORD.read_bytes())!=RECORD_SHA or sha(EVIDENCE.read_bytes())!=EVIDENCE_SHA:raise ValueError('Changed records')
    if record!=json.loads(RECORD.read_text(encoding='utf-8')):raise ValueError('Changed adoption')
    if sha(labels.tobytes(order='F'))!=record['inputRawSha256']:raise ValueError('Wrong source')
    result,points=repair(labels,json.loads(EVIDENCE.read_text(encoding='utf-8')))
    if points.tolist()!=record['points'] or sha(result.tobytes(order='F'))!=record['outputRawSha256']:raise ValueError('Wrong replay')
    return result

def install():
    if sha(BASE.read_bytes())!=BASE_SHA or sha(TARGET.read_bytes()) not in (BASE_SHA,FINAL_SHA):raise ValueError('Refuse unrelated version')
    dims,data=read_volume(BASE)
    result=replay(np.frombuffer(data,dtype=np.uint8).reshape(dims,order='F'),json.loads(RECORD.read_text(encoding='utf-8')))
    encoded=encode(result)
    if sha(encoded)!=FINAL_SHA:raise ValueError('Wrong compressed version')
    TARGET.write_bytes(encoded);print(FINAL_SHA)

if __name__=='__main__':install()
