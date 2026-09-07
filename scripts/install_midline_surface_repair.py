"""Replay the pinned four-voxel surface repair and preflight development metadata."""
import json
import numpy as np
from prepare_midline_surface_repair import ROOT,BASE,BASE_SHA,POINTS,sha
from apply_segmentation_patch import read_volume
from adopt_registered_red_nuclei import encode
TARGET=ROOT/'public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz'
RECORD=ROOT/'segmentation-patches/review/midline-surface-adoption-2026-09-06.json'
RECORD_SHA='59f6aa6dae2f3eb3ee864c7b159361aa539bd1681df59eacb0b9f853f6b712fd'
FINAL_SHA='732bdf1996109926c516d5114d8861e338f22c414ec80804b7cd096885a25ef2'

def replay(labels,record):
    if sha(RECORD.read_bytes())!=RECORD_SHA or record!=json.loads(RECORD.read_text(encoding='utf-8')):raise ValueError('Changed adoption')
    if sha(labels.tobytes(order='F'))!=record['inputRawSha256']:raise ValueError('Wrong source volume')
    if tuple(map(tuple,record['points']))!=POINTS:raise ValueError('Wrong points')
    result=labels.copy()
    for p in POINTS:
        if labels[p]!=27:raise ValueError('Wrong source label')
        result[p]=0
    if sha(result.tobytes(order='F'))!=record['outputRawSha256']:raise ValueError('Wrong result')
    reverse=result.copy()
    for p in POINTS:reverse[p]=27
    if not np.array_equal(reverse,labels):raise ValueError('Reverse differs')
    return result

def plan():
    if sha(BASE.read_bytes())!=BASE_SHA or sha(TARGET.read_bytes()) not in (BASE_SHA,FINAL_SHA):raise ValueError('Unrelated volume')
    record=json.loads(RECORD.read_text(encoding='utf-8'));dims,data=read_volume(BASE)
    encoded=encode(replay(np.frombuffer(data,dtype=np.uint8).reshape(dims,order='F'),record))
    if sha(encoded)!=FINAL_SHA:raise ValueError('Wrong encoded volume')
    path=ROOT/'public/atlas/bigbrain-practical-segmentation-icbm500-validation.json'
    meta=json.loads(path.read_text(encoding='utf-8'))
    if meta['rawVoxelSha256'] not in (record['inputRawSha256'],record['outputRawSha256']):raise ValueError('Unrelated metadata')
    if meta['labelCounts']['27'] not in (254517,254513):raise ValueError('Wrong count')
    meta['rawVoxelSha256']=record['outputRawSha256'];meta['labelCounts']['27']=254513
    meta['midlineSurfaceAudit']=dict(record=RECORD.relative_to(ROOT).as_posix(),recordSha256=RECORD_SHA,changedVoxelCount=4,projectAdopted=True,expertReviewed=False,retainedBoundaryVoxelCount=4,changedBlockPartMasks=[])
    return [(TARGET,encoded),(path,(json.dumps(meta,ensure_ascii=False,indent=2)+'\n').encode())]

if __name__=='__main__':
    updates=plan()
    for path,data in updates:path.write_bytes(data)
    print('Installed four-voxel surface repair: '+FINAL_SHA)
