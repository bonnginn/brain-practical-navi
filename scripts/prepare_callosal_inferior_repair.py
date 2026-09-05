"""Prepare only the fixed, image-reviewed inferior ID30 exclusion under work."""
import gzip
import hashlib
import json
import struct
import numpy as np
from scipy import ndimage
from apply_segmentation_patch import _expected_workflow_metadata, validate_patch, read_volume
from render_callosal_inferior_component import ROOT, LABEL_PATH, LABEL_SHA

INDICES_SHA = '6a4b7677801edf90d45a3b43a409bbe379c13035fe5d99a1e412e8e49b677675'


def main():
    if hashlib.sha256(LABEL_PATH.read_bytes()).hexdigest() != LABEL_SHA:
        raise ValueError('Inferior repair baseline changed')
    dims, payload = read_volume(LABEL_PATH)
    labels = np.frombuffer(payload, dtype=np.uint8).reshape(dims, order='F')
    cc, _ = ndimage.label(labels == 30)
    indices = np.flatnonzero((cc == 4).ravel(order='F')).astype('<u4')
    if len(indices) != 2160 or hashlib.sha256(indices.tobytes()).hexdigest() != INDICES_SHA:
        raise ValueError('Fixed component changed')
    folder = ROOT/'work/anatomy-review/callosal-inferior-component-v1'
    report = json.loads((folder/'report.json').read_text(encoding='utf-8'))
    if (report['labelsSha256'] != LABEL_SHA or report['indicesSha256'] != INDICES_SHA
            or report['count'] != 2160 or len(report['figures']) != 24
            or sum(len(f['indices']) for f in report['figures']) != 114
            or len(report['locators']) != 3):
        raise ValueError('Image evidence coverage changed')
    for figure in report['figures']+report['locators']:
        if hashlib.sha256((folder/figure['file']).read_bytes()).hexdigest() != figure['sha256']:
            raise ValueError('Reviewed image changed')
    edits = [(int(i), 0) for i in indices]
    runs = []
    for i, _ in edits:
        if runs and runs[-1]['start']+runs[-1]['length'] == i:
            runs[-1]['length'] += 1
        else:
            runs.append(dict(start=i, length=1, label=0))
    record = dict(
        format='brain-practical-segmentation-patch', version=1,
        sourceImage='/atlas/bigbrain-icbm500.bin.gz',
        sourceLabels='/atlas/bigbrain-practical-segmentation-icbm500.bin.gz',
        sourceLabelsSha256=LABEL_SHA, dims=list(dims), voxelSizeMm=[.5, .5, .5],
        primaryPlane='horizontal', authorGitHub='', targetSide='bilateral', confidence='medium',
        authorNote='AI-assisted project adoption under maintainer-directed autonomous image-backed repair. No expert or per-voxel human approval. Do not reclassify the entire component as fornix.',
        evidence='CALLOSUM_INFERIOR_REPAIR.md. All 114 occupied/adjacent X/Y/Z planes on 24 sheets and three whole-image locators were visually inspected by AI. The fixed inferior island follows a distinct arch below the main callosal white matter. Exclude only its exact 2160 voxels from ID30; this does not identify a complete fornix, establish expert review, remove source tissue or authorize publication.',
        workflowMetadataVersion=1, reviewStatus='approved',
        review=dict(decision='approved',
            reviewer=dict(kind='project-role', id='ai-assisted-project-review-under-maintainer-direction'),
            decidedAt='2026-09-06',
            reason='原画像の全114占有／隣接断面と3全体図をAIが目視し、脳梁本体より下方の別の弧状構造を脳梁として収録している固定2160 voxelだけを30→0へ戻す。ユーザーの自律修復指示に基づくプロジェクト採用であり、専門家レビューではない。脳弓全体の新規分節や人間による各境界承認とは扱わず、未ラベルへ戻す範囲に限定する。',
            pullRequest=dict(number=27, mergeCommit=None)),
        editCount=2160, runs=runs, **_expected_workflow_metadata(edits, payload, dims),
    )
    out = ROOT/'work/anatomy-review/callosal-inferior-repair-v1'
    out.mkdir(parents=True, exist_ok=True)
    path = out/'callosum-inferior-exclusion-project-review-2026-09-06.json'
    path.write_text(json.dumps(record, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    validate_patch(path, dims, len(payload), payload, LABEL_SHA)
    after = bytearray(payload)
    for i, _ in edits:
        after[i] = 0
    encoded = gzip.compress(b'BBS1'+struct.pack('<3H', *dims)+after, compresslevel=9, mtime=0)
    (out/'labels.bin.gz').write_bytes(encoded)
    result = dict(inputSha256=LABEL_SHA, inputRawSha256=hashlib.sha256(payload).hexdigest(),
        outputSha256=hashlib.sha256(encoded).hexdigest(), outputRawSha256=hashlib.sha256(after).hexdigest(),
        indicesSha256=INDICES_SHA, editCount=2160, label30Before=148179, label30After=146019,
        patchSha256=hashlib.sha256(path.read_bytes()).hexdigest(),
        evidenceReportSha256=hashlib.sha256((folder/'report.json').read_bytes()).hexdigest(),
        installed=False, expertReviewed=False)
    (out/'report.json').write_text(json.dumps(result, indent=2)+'\n', encoding='utf-8')
    print(json.dumps(result))


if __name__ == '__main__':
    main()
