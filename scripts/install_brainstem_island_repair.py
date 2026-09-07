"""Replay the exact project-reviewed 40-point repair, with full reverse check."""
import json,hashlib
import numpy as np
from adopt_remaining_registered_labels import ROOT,TARGET,FINAL_SHA as BASE_SHA
from adopt_registered_red_nuclei import encode
from apply_segmentation_patch import read_volume

BASE=ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-brainstem-island-7ebe.bin.gz'
RECORD=ROOT/'segmentation-patches/review/brainstem-island-adoption-2026-09-06.json'
RECORD_SHA='2afc8d4bb428b9f808b6d09317ae98d8db4587ee61d6c6e008e20101465f9550'
FINAL_SHA='c58f8bebc02ca6ce10a9d1a82c4e8fe7a4fe9c8c349f66a4e1675ffd93b94899'
sha=lambda data:hashlib.sha256(data).hexdigest()

def replay(labels,record):
    if record['decision']!='project-adopted-for-integration' or record['expertReviewed'] is not False:raise ValueError('Wrong review status')
    if sha(labels.tobytes(order='F'))!=record['inputRawSha256']:raise ValueError('Wrong source')
    points=record['points']
    if len(points)!=40 or any(len(p)!=3 or any(type(i) is not int for i in p) for p in points) or len(set(map(tuple,points)))!=40:raise ValueError('Wrong points')
    if record['sourceLabel']!=27 or record['targetLabel']!=0 or record['changedVoxelCount']!=40:raise ValueError('Wrong transitions')
    xyz=np.array(points)
    if np.any(xyz<0) or np.any(xyz>=np.array(labels.shape)) or not np.all(labels[tuple(xyz.T)]==27):raise ValueError('Invalid source points')
    result=labels.copy();result[tuple(xyz.T)]=0
    if sha(result.tobytes(order='F'))!=record['outputRawSha256']:raise ValueError('Wrong result')
    reverse=result.copy();reverse[tuple(xyz.T)]=27
    if not np.array_equal(reverse,labels):raise ValueError('Reverse differs')
    return result

def install():
    if sha(BASE.read_bytes())!=BASE_SHA or sha(RECORD.read_bytes())!=RECORD_SHA or sha(TARGET.read_bytes()) not in (BASE_SHA,FINAL_SHA):raise ValueError('Refuse unrelated version')
    record=json.loads(RECORD.read_text(encoding='utf-8'));dims,data=read_volume(BASE)
    result=replay(np.frombuffer(data,dtype=np.uint8).reshape(dims,order='F'),record)
    encoded=encode(result)
    if sha(encoded)!=FINAL_SHA:raise ValueError('Wrong compressed version')
    TARGET.write_bytes(encoded);print(FINAL_SHA)

if __name__=='__main__':install()
