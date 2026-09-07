"""Stage two reviewed inferior tip removals, leaving all other labels intact."""
import json
import hashlib
import numpy as np
from adopt_registered_red_nuclei import encode
from build_orthogonal_review_bundle import ROOT,DEFAULT_LABELS,DEFAULT_IMAGE,MAGIC_LABELS,MAGIC_IMAGE,EXPECTED_IMAGE_SHA256,read_browser_volume
from render_current_ventral_midbrain import LABEL_SHA

POINTS=((193,252,107),(193,253,107))
sha=lambda b:hashlib.sha256(b).hexdigest()


def repair(labels,raw):
    if labels.shape!=raw.shape or labels.ndim!=3:raise ValueError('Grid differs')
    if any(any(v<0 or v>=labels.shape[k] for k,v in enumerate(p)) for p in POINTS):raise ValueError('Outside grid')
    if [int(labels[p]) for p in POINTS]!=[39,39] or [int(raw[p]) for p in POINTS]!=[250,248]:
        raise ValueError('Reviewed source changed')
    result=labels.copy()
    for p in POINTS:result[p]=0
    reverse=result.copy()
    for p in POINTS:reverse[p]=39
    if not np.array_equal(reverse,labels) or np.count_nonzero(result!=labels)!=2:raise ValueError('Unexpected difference')
    return result


def main():
    out=ROOT/'work/anatomy-review/mammillary-tip-stage-v1'
    if out.exists():raise ValueError('Evidence exists')
    _,_,labels=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,LABEL_SHA)
    _,_,raw=read_browser_volume(DEFAULT_IMAGE,MAGIC_IMAGE,EXPECTED_IMAGE_SHA256)
    evidence=[]
    for rel,digest in [('mammillary-voxel-extent-v1.json','e6934e296afcbb305a0fad373b9fa19d2406f7de4235fe10c48aa7f3b19052b5'),
                       ('mammillary-tip-context-v2/report.json','846219ab9405f68d35de0c9c288f6ba7871bce210bfd27b0bad18d5b728dcd96')]:
        path=ROOT/'work/anatomy-review'/rel
        if sha(path.read_bytes())!=digest:raise ValueError('Evidence changed')
        record=json.loads(path.read_text())
        for figure in record.get('figures',[]):
            if sha((path.parent/figure['path']).read_bytes())!=figure['sha256']:raise ValueError('Figure changed')
        evidence.append(dict(path=path.relative_to(ROOT).as_posix(),sha256=digest,record=record))
    result=repair(labels,raw)
    # Existing block pipeline samples even indices at 1 mm. Both changed
    # points have odd X and Z, so its complete input mask remains identical.
    if not np.array_equal(labels[::2,::2,::2],result[::2,::2,::2]):raise ValueError('Block input changed')
    encoded=encode(result)
    record=dict(scope='left-mammillary-inferior-two-tip-voxels',date='2026-09-06',
        decision='AI-image-reviewed-stage-pending-integration',expertReviewed=False,
        inputCompressedSha256=LABEL_SHA,outputCompressedSha256=sha(encoded),
        inputRawSha256=sha(labels.tobytes(order='F')),outputRawSha256=sha(result.tobytes(order='F')),
        imageSha256=EXPECTED_IMAGE_SHA256,points=POINTS,transitions={'39->0':2},changedVoxelCount=2,
        beforeCount39=int((labels==39).sum()),afterCount39=int((result==39).sum()),retainedCount40=int((result==40).sum()),
        changedBlockPartMasks=[],evidence=evidence,
        rationale='All six point-specific sheets visually inspected: adjacent coronal/sagittal/horizontal app and native raw show the two inferior tips beyond the visible tissue contour. All 125 finite-voxel samples per target are below native raw 500. Scope fixed to these two points, not the other 80 screened points; no automatic threshold deletion.',
        limitations='AI-assisted project repair, not expert confirmation. Transform roundtrip tests numerical precision, not registration accuracy. Superior hypothalamic attachment and all other mammillary borders are not certified.')
    out.mkdir()
    (out/'labels.bin.gz').write_bytes(encoded)
    (out/'base.bin.gz').write_bytes(DEFAULT_LABELS.read_bytes())
    (out/'adoption.json').write_text(json.dumps(record,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:record[k] for k in ['outputCompressedSha256','outputRawSha256','afterCount39','retainedCount40','changedVoxelCount']}))


if __name__=='__main__':main()
