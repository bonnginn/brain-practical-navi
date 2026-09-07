"""Install the fixed lateral/dorsal edge repair after complete preflight."""
import json
import numpy as np
from prepare_brainstem_lateral_dorsal import ROOT,BASE,BASE_SHA,sha
from apply_segmentation_patch import read_volume
from adopt_registered_red_nuclei import encode
TARGET=ROOT/'public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz'
RECORD=ROOT/'segmentation-patches/review/brainstem-lateral-dorsal-adoption-2026-09-06.json'
RECORD_SHA='a0909129446eeba7a7bae898b3a665e5e4f015f49a321288a100de4e56320621'
FINAL_SHA='e7e61a7060c7f1ddfa8106ba659c0488e077495acdd6564862db44663d233ea3'

def replay(labels,record):
    if sha(RECORD.read_bytes())!=RECORD_SHA or record!=json.loads(RECORD.read_text(encoding='utf-8')):raise ValueError('Changed adoption')
    if sha(labels.tobytes(order='F'))!=record['inputRawSha256']:raise ValueError('Wrong source')
    result=labels.copy();seen=set()
    for coords in record['points']:
        p=tuple(coords)
        if len(p)!=3 or p in seen or any(type(v) is not int or v<0 or v>=labels.shape[k] for k,v in enumerate(p)):raise ValueError('Invalid point')
        if labels[p]!=27:raise ValueError('Invalid transition')
        seen.add(p);result[p]=0
    if len(seen)!=466 or sha(result.tobytes(order='F'))!=record['outputRawSha256']:raise ValueError('Wrong replay')
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
    if meta['rawVoxelSha256'] not in (record['inputRawSha256'],record['outputRawSha256']) or meta['labelCounts']['27'] not in (250508,250042):raise ValueError('Unrelated metadata')
    meta['rawVoxelSha256']=record['outputRawSha256'];meta['labelCounts']['27']=250042
    meta['brainstemLateralDorsalAudit']=dict(record=RECORD.relative_to(ROOT).as_posix(),recordSha256=RECORD_SHA,changedVoxelCount=466,lateralEdgeVoxels=242,dorsalEdgeVoxels=224,projectAdopted=True,expertReviewed=False,changedBlockPartMasks=[])
    return [(TARGET,encoded),(path,(json.dumps(meta,ensure_ascii=False,indent=2)+'\n').encode())]

if __name__=='__main__':
    updates=plan()
    for path,data in updates:path.write_bytes(data)
    print('Installed fixed 466-voxel image-support repair: '+FINAL_SHA)
