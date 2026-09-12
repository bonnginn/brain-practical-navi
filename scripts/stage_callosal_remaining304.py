"""Stage one fixed image-reviewed callosal exclusion; preserve public assets."""
import gzip
import hashlib
import json
import numpy as np
from scipy import ndimage
from build_orthogonal_review_bundle import ROOT, DEFAULT_LABELS, MAGIC_LABELS, read_browser_volume

LABEL_SHA='0662770388033cafa573337ab9349efd8b30888bc864566fe4d116de704a0b17'
INDEX_SHA='b7156aa26def7b907a170de76de7922432e35eb3373e8ffa475887742b134eb6'


def digest(data):
    return hashlib.sha256(data).hexdigest()


def replay(labels, points, reverse=False):
    p=np.asarray(points)
    if labels.shape!=(394,466,378) or p.shape!=(304,3) or p.dtype.kind not in 'iu' or np.any(p<0) or np.any(p>=labels.shape):
        raise ValueError('Invalid grid or points')
    indices=np.sort(np.ravel_multi_index(p.T,labels.shape,order='F')).astype('<u4')
    if digest(indices.tobytes())!=INDEX_SHA or len(np.unique(indices))!=304:
        raise ValueError('Candidate identity changed')
    if np.any(labels[tuple(p.T)]!=(0 if reverse else 30)):
        raise ValueError('Conflicting labels')
    result=labels.copy()
    result[tuple(p.T)]=30 if reverse else 0
    return result


def main():
    out=ROOT/'work/anatomy-review/callosal-remaining304-stage-v1'
    if out.exists():
        raise ValueError('Preserve prior evidence')
    baseline=ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-callosal-remaining304.bin.gz'
    _,_,before=read_browser_volume(baseline,MAGIC_LABELS,LABEL_SHA)
    cc,_=ndimage.label(before==30)
    points=np.argwhere(cc==6)
    after=replay(before,points)
    if not np.array_equal(replay(after,points,True),before):
        raise ValueError('Reverse differs')
    review=ROOT/'work/anatomy-review/callosal-remaining-304-v1/report.json'
    review_bytes=review.read_bytes(); report=json.loads(review_bytes)
    if report['labelSha256']!=LABEL_SHA or report['indicesSha256']!=INDEX_SHA or len(report['figures'])!=13:
        raise ValueError('Review identity differs')
    figures=[]
    for f in report['figures']:
        if digest((review.parent/f['file']).read_bytes())!=f['sha256']:
            raise ValueError('Reviewed figure differs')
        figures.append(dict(path=f['file'],indices=f['indices'],sha256=f['sha256']))
    base=baseline.read_bytes();raw=gzip.decompress(base)
    blob=gzip.compress(raw[:10]+after.tobytes(order='F'),mtime=0)
    record=dict(beforeSha256=LABEL_SHA,afterSha256=digest(blob),afterRawVoxelSha256=digest(after.tobytes(order='F')),
        points=points.tolist(),count=304,transition='30->0',indicesSha256=INDEX_SHA,
        evidence=[dict(path=review.relative_to(ROOT).as_posix(),sha256=digest(review_bytes),visuallyInspectedFigures=figures)],
        countsBefore={'30':int((before==30).sum())},countsAfter={'30':int((after==30).sum())},
        status='AI-image-reviewed-work-stage-only',adopted=False,expertReviewed=False,publicMutation=False,
        rationale='The remaining anterior-right disconnected ID30 component was inspected on all occupied planes plus one adjacent plane at each end: X204–217, Y289–307, Z197–209, 46 planes in 13 sheets, with an X212 whole-brain locator. '
        'It follows the sulcal/cortical edge above the callosal body rather than its white-matter core. Remove only this fixed erroneous assignment to ID30; do not infer a replacement tissue label. '
        'Connectivity and component size locate the candidate but are not the anatomical basis of removal.',
        limitation='AI image review of the 0.5 mm browser histology, not expert review, native-resolution review or ground truth. Remaining small islands and the entire callosal boundary are not certified. Mesh synchronization and product adoption pending.')
    out.mkdir()
    (out/'before.bin.gz').write_bytes(base)
    (out/'labels.bin.gz').write_bytes(blob)
    data=(json.dumps(record,indent=2)+'\n').encode()
    (out/'repair.json').write_bytes(data)
    print(json.dumps(dict(recordSha256=digest(data),afterSha256=record['afterSha256'],countsAfter=record['countsAfter'])))


if __name__=='__main__':
    main()
