"""Validate the entire volume/two-mesh update before writing any development asset."""
import argparse,json,struct
from pathlib import Path
import numpy as np
from install_brainstem_three_repair import ROOT,TARGET,FINAL_SHA as BASE_SHA,sha
from apply_segmentation_patch import read_volume
from adopt_registered_red_nuclei import encode
BASE=ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-cerebellar-islands-8238.bin.gz'
RECORD=ROOT/'segmentation-patches/review/cerebellar-islands-adoption-2026-09-06.json'
RECORD_SHA='85bc0bdfcd782173e53d13c4146641cda2024b0cfb55596effbebb590cd8947b'
MANIFEST=ROOT/'segmentation-patches/review/cerebellar-island-meshes-2026-09-06.json'
MANIFEST_SHA='b5db21e6b098bc4e6946832bd2c440df9d88fb61e50656c2eae723a2f794829e'
FINAL_SHA='2a73ff567741aa9b7965eef645765bfc0d87b3cad80d789d5512cabf4ffc2ed2'

def replay(labels,record):
    if sha(RECORD.read_bytes())!=RECORD_SHA or record!=json.loads(RECORD.read_text(encoding='utf-8')):raise ValueError('Changed adoption')
    if sha(labels.tobytes(order='F'))!=record['inputRawSha256']:raise ValueError('Wrong source')
    result=labels.copy();seen=set();counts={0:0,28:0,29:0}
    for e in record['edits']:
        p=tuple(e['xyz']);target=e['toLabel']
        if p in seen or len(p)!=3 or any(type(i) is not int or i<0 or i>=labels.shape[k] for k,i in enumerate(p)):raise ValueError('Invalid coordinates')
        if e['fromLabel']!=27 or labels[p]!=27 or target not in counts:raise ValueError('Invalid transition')
        seen.add(p);counts[target]+=1;result[p]=target
    if len(seen)!=64 or counts!={0:28,28:16,29:20}:raise ValueError('Wrong transition inventory')
    if sha(result.tobytes(order='F'))!=record['outputRawSha256']:raise ValueError('Wrong result')
    reverse=result.copy()
    for p in seen:reverse[p]=27
    if not np.array_equal(reverse,labels):raise ValueError('Reverse differs')
    return result

def plan(staged):
    if sha(BASE.read_bytes())!=BASE_SHA or sha(TARGET.read_bytes()) not in (BASE_SHA,FINAL_SHA):raise ValueError('Unrelated volume')
    if sha(MANIFEST.read_bytes())!=MANIFEST_SHA:raise ValueError('Changed mesh manifest')
    record=json.loads(RECORD.read_text(encoding='utf-8'));dims,data=read_volume(BASE)
    encoded=encode(replay(np.frombuffer(data,dtype=np.uint8).reshape(dims,order='F'),record))
    if sha(encoded)!=FINAL_SHA:raise ValueError('Wrong encoded volume')
    manifest=json.loads(MANIFEST.read_text(encoding='utf-8'))
    meta_path=ROOT/'public/atlas/specimen-blocks.json';meta=json.loads(meta_path.read_text(encoding='utf-8'))
    planned=[(TARGET,encoded)]
    for e in manifest['meshes']:
        target=ROOT/'public/atlas'/e['file'];blob=(staged/e['file']).read_bytes()
        if sha(target.read_bytes()) not in (e['beforeSha256'],e['afterSha256']) or sha(blob)!=e['afterSha256']:raise ValueError('Unrelated mesh: '+e['file'])
        v,f=struct.unpack('<II',blob[4:12])
        if blob[:4]!=b'BNM2' or (v,f)!=(e['vertices'],e['faces']) or len(blob)!=12+28*v+12*f:raise ValueError('Wrong mesh geometry')
        part=next(p for p in meta['specimens'][e['block']] if p['part']==e['part'])
        shade=np.frombuffer(blob,dtype='<f4',count=v,offset=12+v*24)
        part.update(vertices=v,faces=f,shadeMin=round(float(shade.min()),4),shadeMax=round(float(shade.max()),4),
            meshSha256=e['afterSha256'],segmentationSourceSha256=FINAL_SHA,
            segmentationReview='Image-guided project correction of cerebellar-side misclassification; not expert review.')
        planned.append((target,blob))
    validation_path=ROOT/'public/atlas/bigbrain-practical-segmentation-icbm500-validation.json'
    validation=json.loads(validation_path.read_text(encoding='utf-8'))
    if validation['rawVoxelSha256'] not in (record['inputRawSha256'],record['outputRawSha256']):raise ValueError('Unrelated metadata')
    validation['rawVoxelSha256']=record['outputRawSha256']
    for k,v in record['afterCounts'].items():validation['labelCounts'][k]=v
    validation['cerebellarIslandAudit']=dict(record=RECORD.relative_to(ROOT).as_posix(),recordSha256=RECORD_SHA,
        changedVoxelCount=64,transitions=record['transitions'],projectAdopted=True,expertReviewed=False,
        unassignedBoundaryVoxelCount=24,clearVoidVoxelCount=4)
    planned.extend([(meta_path,(json.dumps(meta,ensure_ascii=False,indent=2)+'\n').encode()),
                    (validation_path,(json.dumps(validation,ensure_ascii=False,indent=2)+'\n').encode())])
    return planned

def install(staged):
    planned=plan(staged)
    for path,data in planned:path.write_bytes(data)
    print('Installed fixed 64-voxel correction, two meshes and metadata. '+FINAL_SHA)

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--staged',type=Path,required=True);install(p.parse_args().staged)
