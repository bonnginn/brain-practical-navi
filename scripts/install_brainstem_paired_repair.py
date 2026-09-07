"""Replay the fixed 16-point adoption; refuse unrelated input or target versions."""
import json
import numpy as np
from install_brainstem_island_repair import ROOT,TARGET,FINAL_SHA as BASE_SHA,sha
from adopt_registered_red_nuclei import encode
from apply_segmentation_patch import read_volume
from prepare_brainstem_paired_adoption import repair,EVIDENCE,EVIDENCE_SHA
BASE=ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-paired-islands-c58f.bin.gz'
RECORD=ROOT/'segmentation-patches/review/brainstem-paired-islands-adoption-2026-09-06.json'
RECORD_SHA='22ed2f98719a9bec65af4d1fffa985085e732965c4f7817b48573b25684d2600'
FINAL_SHA='189fbd26080448aa7813918dae6f17bdfed11a5ca15a12211cadfa3a6a5723d8'

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
