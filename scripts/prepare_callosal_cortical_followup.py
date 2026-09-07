"""Prepare the second bounded callosal correction under work, never install.

The fixed components were inspected on all occupied/adjacent X/Y/Z planes.
Their numeric identities are tied to the archived 930e prescreen, while the
patch applies to the later 5348 baseline and preserves the prior 1605 edits.
"""
import gzip
import hashlib
import json
import struct
import numpy as np
from scipy import ndimage
from apply_segmentation_patch import _expected_workflow_metadata,validate_patch,read_volume
from build_orthogonal_review_bundle import ROOT,DEFAULT_IMAGE,MAGIC_IMAGE,EXPECTED_IMAGE_SHA256,read_browser_volume

SOURCE_SHA='5348b7650a3ba28c95a00407d62cf4054fb0c670a62de717f2c572f66a51c9a3'
COMPONENTS={
 15:(297,'83c055f904e3ce0f6a4383505fa3d560685614c8b05e8fa7be5170fa99c6e7d6',61),
 76:(682,'983d0f2e945517b42d98c2648ff0f4de64540bd6f4b6a92b4c9dfffa93a8ba35',50),
 83:(617,'d5ec86c477309735fca49a808efe3c3eec733784a9685a20c90a63bcc935212f',71),
}
INDICES_SHA='88da382e9f7ea296be43c4c31530ac392510d20cb851c74e172316d26f7d5f80'


def main():
    current=ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-callosal-followup-5348.bin.gz'
    if hashlib.sha256(current.read_bytes()).hexdigest()!=SOURCE_SHA:raise ValueError('Follow-up input changed')
    dims,payload=read_volume(current)
    samples=np.load(ROOT/'work/anatomy-review/callosum-official-tissue-v1/sampled-callosal-classes.npz')
    points=samples['points'];chosen=samples['prescreen']
    mask=np.zeros(dims,dtype=bool);mask[tuple(points[chosen].T)]=True
    cc,_=ndimage.label(mask);indices=[];reports={}
    for component,(count,expected,planes) in COMPONENTS.items():
        selected=np.flatnonzero((cc==component).ravel(order='F')).astype('<u4')
        if len(selected)!=count or hashlib.sha256(selected.tobytes()).hexdigest()!=expected:raise ValueError('Prescreen component changed')
        folder=ROOT/f'work/anatomy-review/callosum-cortical-spillover-component{component}-v1'
        report=json.loads((folder/'report.json').read_text(encoding='utf-8'))
        if report['component']!=component or report['count']!=count or sum(len(f['indices']) for f in report['figures'])!=planes:raise ValueError('Review coverage changed')
        for figure in report['figures']:
            if hashlib.sha256((folder/figure['file']).read_bytes()).hexdigest()!=figure['sha256']:raise ValueError('Reviewed figure changed')
        reports[str(component)]=hashlib.sha256((folder/'report.json').read_bytes()).hexdigest()
        indices.extend(selected.tolist())
    indices=sorted(indices)
    if len(indices)!=1596 or len(set(indices))!=1596 or hashlib.sha256(np.array(indices,dtype='<u4').tobytes()).hexdigest()!=INDICES_SHA:raise ValueError('Unexpected follow-up union')
    if any(payload[i]!=30 for i in indices):raise ValueError('Prior edits overlap or original label changed')
    _,_,raw=read_browser_volume(DEFAULT_IMAGE,MAGIC_IMAGE,EXPECTED_IMAGE_SHA256)
    if np.any(raw.ravel(order='F')[indices]==255):raise ValueError('Raw image condition changed')
    edits=[(i,0) for i in indices];runs=[]
    for i,_ in edits:
        if runs and runs[-1]['start']+runs[-1]['length']==i:runs[-1]['length']+=1
        else:runs.append(dict(start=i,length=1,label=0))
    record=dict(format='brain-practical-segmentation-patch',version=1,sourceImage='/atlas/bigbrain-icbm500.bin.gz',sourceLabels='/atlas/bigbrain-practical-segmentation-icbm500.bin.gz',sourceLabelsSha256=SOURCE_SHA,dims=list(dims),voxelSizeMm=[.5,.5,.5],primaryPlane='horizontal',authorGitHub='',targetSide='bilateral',confidence='medium',
        authorNote='AI-assisted project adoption under maintainer-directed autonomous image-backed repair. Fixed components 15 (left), 76 and 83 (right), not a mirrored or threshold-only edit. No expert or per-voxel human approval.',
        evidence='CALLOSUM_CORTICAL_FOLLOWUP_REPAIR.md; OFFICIAL_TISSUE_ALIGNMENT_REVIEW.md. All 61/50/71 occupied and neighbouring X/Y/Z planes (39 sheets) inspected for fixed components 15/76/83; archived whole-callosal sagittal context inspected separately. Only these 1596 voxels change 30 to 0. The complementary tissue classification is supplementary evidence, not a regional ground truth. Preserve all preceding repairs and all other voxels; cingulum/fornix separation remains incomplete.',
        workflowMetadataVersion=1,reviewStatus='approved',review=dict(decision='approved',reviewer=dict(kind='project-role',id='ai-assisted-project-review-under-maintainer-direction'),decidedAt='2026-09-06',reason='原画像と全占有／隣接三方向182断面をAIが目視し、脳梁本体から離れた周辺皮質・溝側への誤収録を認めた固定3成分1596 voxelだけを30→0へ変更する。ユーザーの自律修復指示に基づくプロジェクト採用であり、個々の境界の人間による承認や専門家レビューではない。白質／帯状束や脳弓との分離、残りの皮質候補を一括修正しない。公開・main統合は行わない。',pullRequest=dict(number=27,mergeCommit=None)),editCount=len(edits),runs=runs,**_expected_workflow_metadata(edits,payload,dims))
    out=ROOT/'work/anatomy-review/callosum-cortical-followup-v1';out.mkdir(parents=True,exist_ok=True)
    path=out/'callosum-cortical-followup-project-review-2026-09-06.json'
    path.write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');validate_patch(path,dims,len(payload),payload,SOURCE_SHA)
    changed=bytearray(payload)
    for i,_ in edits:changed[i]=0
    encoded=gzip.compress(b'BBS1'+struct.pack('<3H',*dims)+changed,compresslevel=9,mtime=0)
    (out/'labels.bin.gz').write_bytes(encoded)
    report=dict(inputSha256=SOURCE_SHA,inputRawSha256=hashlib.sha256(payload).hexdigest(),outputSha256=hashlib.sha256(encoded).hexdigest(),outputRawSha256=hashlib.sha256(changed).hexdigest(),editCount=1596,indicesSha256=INDICES_SHA,componentEvidenceReportSha256=reports,patchSha256=hashlib.sha256(path.read_bytes()).hexdigest(),label30Before=149775,label30After=148179,installed=False,expertReviewed=False)
    (out/'report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8');print(json.dumps(report))


if __name__=='__main__':main()
