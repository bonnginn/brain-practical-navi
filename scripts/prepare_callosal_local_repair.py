"""Prepare the bounded 1,605-voxel AI/project callosal exclusion in work.

No application asset writes. The project-review record explicitly distinguishes
the autonomous maintainer instruction from human per-voxel/expert approval.
"""
import gzip
import hashlib
import json
import struct
import numpy as np
from scipy import ndimage
from apply_segmentation_patch import _expected_workflow_metadata,validate_patch,read_volume
from build_orthogonal_review_bundle import ROOT,DEFAULT_IMAGE,MAGIC_IMAGE,EXPECTED_IMAGE_SHA256,read_browser_volume

LABEL_SHA='930eaaed7eed8782b1b162f3aa5c59c2428f4062d0d2da3a9a1cb563f49b7db7'
DEFAULT_LABELS=ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-callosum-930e.bin.gz'
GAP_INDICES_SHA='3bcc458093db2607299697abe602b7125758038333e52d6894c80983d2b8fa17'
CORTICAL_INDICES_SHA='e57b1f4409dd5a819a530513ad1e19371440dd9f3b331974a8668038e8b03b93'


def indices_digest(indices):
    return hashlib.sha256(np.asarray(sorted(indices),dtype='<u4').tobytes()).hexdigest()


def main():
    if hashlib.sha256(DEFAULT_LABELS.read_bytes()).hexdigest()!=LABEL_SHA:raise ValueError('Repair input changed')
    dims,payload=read_volume(DEFAULT_LABELS);labels=np.frombuffer(payload,dtype=np.uint8).reshape(dims,order='F')
    _,_,raw=read_browser_volume(DEFAULT_IMAGE,MAGIC_IMAGE,EXPECTED_IMAGE_SHA256)
    gap_path=ROOT/'segmentation-patches/review/callosum-three-gap-candidate-2026-09-06.json'
    _,gap_edits,_=validate_patch(gap_path,dims,len(payload),payload,LABEL_SHA)
    gap_indices=[i for i,v in gap_edits if v==0]
    if len(gap_indices)!=291 or indices_digest(gap_indices)!=GAP_INDICES_SHA:raise ValueError('Gap candidate changed')
    samples=np.load(ROOT/'work/anatomy-review/callosum-official-tissue-v1/sampled-callosal-classes.npz')
    points=samples['points'];chosen=samples['prescreen']
    if not np.array_equal(points,np.argwhere(labels==30)):raise ValueError('Classification point order changed')
    mask=np.zeros(dims,dtype=bool);mask[tuple(points[chosen].T)]=True
    components,_=ndimage.label(mask)
    cortical_indices=np.flatnonzero((components==85).ravel(order='F'))
    if len(cortical_indices)!=1314 or indices_digest(cortical_indices)!=CORTICAL_INDICES_SHA:raise ValueError('Cortical prescreen identity changed')
    all_indices=sorted(set(gap_indices)|set(cortical_indices.tolist()))
    if len(all_indices)!=1605 or any(payload[i]!=30 for i in all_indices):raise ValueError('Unexpected union or original labels')
    image_flat=raw.ravel(order='F')
    if np.any(image_flat[gap_indices]!=255) or np.any(image_flat[cortical_indices]==255):raise ValueError('Original image evidence changed')
    edits=[(i,0) for i in all_indices]
    runs=[]
    for index,value in edits:
        if runs and runs[-1]['start']+runs[-1]['length']==index:runs[-1]['length']+=1
        else:runs.append(dict(start=index,length=1,label=value))
    record=dict(format='brain-practical-segmentation-patch',version=1,sourceImage='/atlas/bigbrain-icbm500.bin.gz',sourceLabels='/atlas/bigbrain-practical-segmentation-icbm500.bin.gz',sourceLabelsSha256=LABEL_SHA,dims=list(dims),voxelSizeMm=[.5,.5,.5],primaryPlane='horizontal',authorGitHub='',targetSide='right',confidence='medium',
        authorNote='AI-assisted project adoption under maintainer-directed autonomous repair. Original image plus adjacent/orthogonal review of three gaps (291 voxels) and a specific cortical-spillover component (1314 voxels). Not human per-voxel approval or expert review.',
        evidence='CALLOSUM_LOCAL_REPAIR.md; CALLOSUM_EMPTY_SPACE_REVIEW.md; OFFICIAL_TISSUE_ALIGNMENT_REVIEW.md. Three gaps: all 97 occupied/adjacent X/Y/Z planes. Component85: all 99 occupied/adjacent X/Y/Z planes. Full callosal X175-216 reviewed separately. Published tissue classification with validated inverse displacement is supplementary evidence, not regional ground truth. Preserve every other voxel; 0 means unlabelled, not absence of tissue. Broader cingulum/fornix contamination remains unresolved.',
        workflowMetadataVersion=1,reviewStatus='approved',review=dict(decision='approved',reviewer=dict(kind='project-role',id='ai-assisted-project-review-under-maintainer-direction'),decidedAt='2026-09-06',
        reason='原画像と全占有／隣接三方向断面をAIが目視し、脳梁本体ではない組織間隙291 voxelと周辺皮質へのはみ出し1,314 voxelだけを開発版で30→0とする。ユーザーの自律修復指示に基づくプロジェクト採用であり、ユーザーによる個々の境界の目視承認や専門家レビューではない。脳梁全境界の完成を意味せず、隣接帯状束・脳弓・残りのはみ出しは別途保留。公開・main統合は行わない。',pullRequest=dict(number=27,mergeCommit=None)),editCount=len(edits),runs=runs,**_expected_workflow_metadata(edits,payload,dims))
    out=ROOT/'work/anatomy-review/callosum-local-repair-v1';out.mkdir(parents=True,exist_ok=True)
    path=out/'callosum-local-exclusion-project-review-2026-09-06.json'
    path.write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');validate_patch(path,dims,len(payload),payload,LABEL_SHA)
    changed=bytearray(payload)
    for i,_ in edits:changed[i]=0
    encoded=gzip.compress(b'BBS1'+struct.pack('<3H',*dims)+changed,compresslevel=9,mtime=0)
    (out/'labels.bin.gz').write_bytes(encoded)
    report=dict(inputSha256=LABEL_SHA,inputRawSha256=hashlib.sha256(payload).hexdigest(),outputSha256=hashlib.sha256(encoded).hexdigest(),outputRawSha256=hashlib.sha256(changed).hexdigest(),editCount=1605,indicesSha256=indices_digest(all_indices),gapIndicesSha256=GAP_INDICES_SHA,corticalIndicesSha256=CORTICAL_INDICES_SHA,label30Before=151380,label30After=149775,patchSha256=hashlib.sha256(path.read_bytes()).hexdigest(),publicMutation=False,installed=False,expertReviewed=False)
    (out/'report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(report))


if __name__=='__main__':main()
