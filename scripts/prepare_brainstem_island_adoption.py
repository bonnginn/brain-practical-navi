"""Prepare the reviewed 40-voxel removal for integration; WORK output only."""
import argparse,json,hashlib
from pathlib import Path
import numpy as np
from prepare_brainstem_island_review import selected_island
from adopt_remaining_registered_labels import ROOT,FINAL_SHA
# Freeze this historical review at the registration stage, before island removal.
TARGET=ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-brainstem-island-7ebe.bin.gz'
from adopt_registered_red_nuclei import encode
from build_orthogonal_review_bundle import DEFAULT_IMAGE,MAGIC_IMAGE,MAGIC_LABELS,EXPECTED_IMAGE_SHA256,read_browser_volume

def remove_reviewed_island(labels):
    points=selected_island(labels)
    result=labels.copy();result[tuple(points.T)]=0
    if np.count_nonzero(result!=labels)!=40:raise ValueError('Wrong change count')
    restore=result.copy();restore[tuple(points.T)]=27
    if not np.array_equal(restore,labels):raise ValueError('Reverse replay differs')
    return result,points

def main(out):
    out=out.resolve()
    if out.exists() or not out.is_relative_to(ROOT/'work'):raise ValueError('New work directory required')
    _,_,labels=read_browser_volume(TARGET,MAGIC_LABELS,FINAL_SHA)
    _,_,raw=read_browser_volume(DEFAULT_IMAGE,MAGIC_IMAGE,EXPECTED_IMAGE_SHA256)
    result,points=remove_reviewed_island(labels)
    if not np.all(raw[tuple(points.T)]==255):raise ValueError('Image identity differs')
    data=encode(result);sha=lambda b:hashlib.sha256(b).hexdigest()
    record=dict(scope='isolated-midbrain-id27-bar-40',decision='project-adopted-for-integration',expertReviewed=False,
        date='2026-09-06',inputCompressedSha256=FINAL_SHA,outputCompressedSha256=sha(data),
        inputRawSha256=sha(labels.tobytes(order='F')),outputRawSha256=sha(result.tobytes(order='F')),
        changedVoxelCount=40,sourceLabel=27,targetLabel=0,points=points.tolist(),
        evidence='BRAINSTEM_ISLAND_REPAIR.md; all 20 local orthogonal frames reviewed. Isolated bar in uniform image void, not a global brightness/size rule.',
        beforeCount=int(np.count_nonzero(labels==27)),afterCount=int(np.count_nonzero(result==27)),
        limitations='Unlabeled, not reassigned to aqueduct/ventricle. Other islands and missing ventral midbrain are unchanged. Asset integration and downstream verification are separate.')
    out.mkdir();(out/'labels.bin.gz').write_bytes(data)
    (out/'adoption.json').write_text(json.dumps(record,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:v for k,v in record.items() if k!='points'},indent=2))

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--output',type=Path,required=True);main(p.parse_args().output)
