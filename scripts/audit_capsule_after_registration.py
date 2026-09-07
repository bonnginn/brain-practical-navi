"""Read-only reassessment of historical capsule removal after registration.

Never rebase an unreviewed deletion patch onto newly identified nuclei.
"""
import json,hashlib,argparse
from pathlib import Path
import numpy as np
from adopt_remaining_registered_labels import ROOT,FINAL_SHA
# Freeze this historical review at the registration stage, before island removal.
TARGET=ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-brainstem-island-7ebe.bin.gz'
from apply_segmentation_patch import read_volume

PATCH=ROOT/'segmentation-patches/review/capsule-morphology-candidate-2026-09-06.json'
PATCH_SHA='53b3d8709957a13234c068edc4bc8ca26e1c6f1e32a6704ec1fd9cb45213cf66'
BASE=ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-classification-b75a.bin.gz'

def inspect(target=None, expected_sha=None):
    target=TARGET if target is None else target
    expected_sha=FINAL_SHA if expected_sha is None else expected_sha
    sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
    if sha(PATCH)!=PATCH_SHA or sha(target)!=expected_sha:raise ValueError('Wrong version')
    patch=json.loads(PATCH.read_text(encoding='utf-8'))
    if sha(BASE)!=patch['sourceLabelsSha256'] or patch['reviewStatus']!='unreviewed':raise ValueError('Wrong historical source')
    dims,before=read_volume(BASE);now_dims,after=read_volume(target)
    if dims!=now_dims:raise ValueError('Grid mismatch')
    old=np.frombuffer(before,dtype=np.uint8);new=np.frombuffer(after,dtype=np.uint8)
    indices=[]
    for run in patch['runs']:
        if run['label']!=0:raise ValueError('Not the deletion candidate')
        indices.extend(range(run['start'],run['start']+run['length']))
    if len(indices)!=1616 or len(set(indices))!=1616 or not np.isin(old[indices],[31,32]).all():raise ValueError('Wrong candidate scope')
    result=dict(inputSha256=expected_sha,historicalCandidateSha256=PATCH_SHA,adopted=False,mutation=False,
        expertReviewed=False,warning='Unreviewed historical removal; do not apply to current labels.',items=[])
    for label in [31,32]:
        ix=np.array(indices)[old[indices]==label]
        values,counts=np.unique(new[ix],return_counts=True)
        result['items'].append(dict(oldLabel=label,originalCandidateCount=len(ix),
            currentLabelCounts={str(int(k)):int(v) for k,v in zip(values,counts)},
            stillCapsule=int(np.count_nonzero(new[ix]==label)),
            nowManual=int(np.count_nonzero((new[ix]>=1)&(new[ix]<=22)))))
    return result

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--output',type=Path,required=True)
    p.add_argument('--input',type=Path);p.add_argument('--sha256');a=p.parse_args()
    if bool(a.input)!=bool(a.sha256):p.error('--input and --sha256 must be supplied together')
    output=a.output.resolve()
    if output.exists() or not output.is_relative_to(ROOT/'work'):raise ValueError('New work file required')
    result=inspect(a.input.resolve(),a.sha256) if a.input else inspect()
    output.write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8');print(json.dumps(result,indent=2))
