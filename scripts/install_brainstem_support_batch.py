"""Install the fixed two-region image-support repair after complete preflight."""
import json
import numpy as np
from prepare_brainstem_inferior_support import ROOT,BASE,SOURCE_SHA as BASE_SHA,sha
from apply_segmentation_patch import read_volume
from adopt_registered_red_nuclei import encode
TARGET=ROOT/'public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz'
RECORD=ROOT/'segmentation-patches/review/brainstem-support-batch-adoption-2026-09-06.json'
RECORD_SHA='fda267537a478ecda65b592ebeeb3fd75a6fe5551e8657cde8fd07ce657a5269'
FINAL_SHA='50ded72a4a9b43e7c2c93b4bc5933b76680ab89e3e9eb7bb4f2cb5cfccc68d6c'

def replay(labels,record):
    if sha(RECORD.read_bytes())!=RECORD_SHA or record!=json.loads(RECORD.read_text(encoding='utf-8')):raise ValueError('Changed adoption')
    if sha(labels.tobytes(order='F'))!=record['inputRawSha256']:raise ValueError('Wrong source')
    result=labels.copy();seen=set()
    for coords in record['points']:
        p=tuple(coords)
        if len(p)!=3 or p in seen or any(type(v) is not int or v<0 or v>=labels.shape[k] for k,v in enumerate(p)):raise ValueError('Invalid point')
        if labels[p]!=27:raise ValueError('Invalid transition')
        seen.add(p);result[p]=0
    if len(seen)!=4005 or sha(result.tobytes(order='F'))!=record['outputRawSha256']:raise ValueError('Wrong replay')
    reverse=result.copy()
    for p in seen:reverse[p]=27
    if not np.array_equal(reverse,labels):raise ValueError('Reverse differs')
    return result

def plan():
    if sha(BASE.read_bytes())!=BASE_SHA or sha(TARGET.read_bytes()) not in (BASE_SHA,FINAL_SHA):raise ValueError('Unrelated target')
    record=json.loads(RECORD.read_text(encoding='utf-8'));dims,data=read_volume(BASE)
    encoded=encode(replay(np.frombuffer(data,dtype=np.uint8).reshape(dims,order='F'),record))
    if sha(encoded)!=FINAL_SHA:raise ValueError('Wrong compressed result')
    path=ROOT/'public/atlas/bigbrain-practical-segmentation-icbm500-validation.json';meta=json.loads(path.read_text(encoding='utf-8'))
    if meta['rawVoxelSha256'] not in (record['inputRawSha256'],record['outputRawSha256']) or meta['labelCounts']['27'] not in (254513,250508):raise ValueError('Unrelated metadata')
    meta['rawVoxelSha256']=record['outputRawSha256'];meta['labelCounts']['27']=250508
    meta['brainstemSupportAudit']=dict(record=RECORD.relative_to(ROOT).as_posix(),recordSha256=RECORD_SHA,changedVoxelCount=4005,inferiorImageSupportVoxels=3385,externalSurfaceGapVoxels=620,projectAdopted=True,expertReviewed=False,changedBlockPartMasks=[])
    return [(TARGET,encoded),(path,(json.dumps(meta,ensure_ascii=False,indent=2)+'\n').encode())]

if __name__=='__main__':
    updates=plan()
    for path,data in updates:path.write_bytes(data)
    print('Installed fixed 4005-voxel image-support repair: '+FINAL_SHA)
