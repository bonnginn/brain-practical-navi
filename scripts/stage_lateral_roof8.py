"""Stage eight image-reviewed callosal/lateral lumen corrections; never install."""
import gzip
import json
import hashlib
import numpy as np
from build_orthogonal_review_bundle import ROOT, DEFAULT_LABELS, MAGIC_LABELS, read_browser_volume

BASE = '785ce199e2c7226e5527a771e953d1b78cfed1067179aa04c63b9eba74577e0f'
SELECTED = [(175,297,181),(177,301,177),(179,299,177),(183,299,175),
            (184,299,175),(185,301,173),(208,299,175),(212,299,177)]

def digest(data):
    return hashlib.sha256(data).hexdigest()

def replay(labels, entries, reverse=False):
    if labels.shape != (394,466,378) or [tuple(p['xyz']) for p in entries] != SELECTED:
        raise ValueError('Reviewed point set changed')
    out = labels.copy()
    for p, reviewed_side in zip(entries,[23,23,23,23,23,23,24,24]):
        if p['before'] != 30 or p['after'] != reviewed_side:
            raise ValueError('Unexpected transition')
        xyz = tuple(p['xyz']); source,dest = (p['after'],30) if reverse else (30,p['after'])
        if out[xyz] != source:
            raise ValueError('Label conflict')
        out[xyz] = dest
    return out

def main():
    out = ROOT/'work/anatomy-review/lateral-roof8-stage-v1'
    if out.exists():
        raise ValueError('Preserve prior evidence')
    _,_,before = read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,BASE)
    entries = []
    for p in SELECTED:
        neighbours = {int(before[tuple(np.array(p)+d)]) for d in
                      [(1,0,0),(-1,0,0),(0,1,0),(0,-1,0),(0,0,1),(0,0,-1)]} & {23,24}
        if len(neighbours) != 1:
            raise ValueError('No unique same-cavity face neighbour')
        entries.append(dict(xyz=list(p),before=30,after=neighbours.pop()))
    after = replay(before,entries)
    assert np.count_nonzero(before != after) == 8
    assert np.array_equal(replay(after,entries,True),before)
    evidence = []
    review = ROOT/'work/segmentation-resume-20260915'
    for file in [review/'ventricle-crop-location.png', review/'roof300-marked/candidates.json',
                 *sorted((review/'roof300-cell-review').glob('candidate-*.png'))]:
        evidence.append(dict(path=file.relative_to(ROOT).as_posix(),sha256=digest(file.read_bytes())))
    assert len(evidence) == 15
    data = gzip.compress(gzip.decompress(DEFAULT_LABELS.read_bytes())[:10]+after.tobytes(order='F'),mtime=0)
    record = dict(beforeSha256=BASE,afterSha256=digest(data),afterRawVoxelSha256=digest(after.tobytes(order='F')),
        points=entries,count=8,transition='mixed-ventricular-repair',evidence=evidence,
        countsBefore={str(k):int((before==k).sum()) for k in (23,24,30)},
        countsAfter={str(k):int((after==k).sum()) for k in (23,24,30)},
        visuallyReviewedCandidateSheets=13,visuallyReviewedPlanes=117,heldCandidateIndices=[1,4,5,8,10],
        status='AI-image-reviewed-work-stage-only',adopted=False,expertReviewed=False,
        rationale='User screenshot localized to coronal Y299 by current mask shape. Regional raw registered300 views '
        'and all 13 candidate XYZ contact sheets (center and adjacent 300um planes) reviewed. Eight cells lie on '
        'the lumen side of the continuous callosal roof, with cavity continuity in three axes. Five cells touching '
        'the thin tissue edge remain held. Destination follows unique existing lateral cavity face adjacency, '
        'not coordinate splitting. Intensity support was a locator and corroboration, not the adoption rule.',
        limitation='AI-supported local educational correction, not expert review. Registered300 only; native100 '
        'not reviewed for this batch. Partial-volume and registration uncertainty remain. Does not complete '
        'ventricular segmentation, aqueduct junctions, or detached components. Installation pending.')
    out.mkdir();(out/'before.bin.gz').write_bytes(DEFAULT_LABELS.read_bytes());(out/'labels.bin.gz').write_bytes(data)
    payload=(json.dumps(record,indent=2)+'\n').encode();(out/'repair.json').write_bytes(payload)
    print(json.dumps(dict(recordSha256=digest(payload),afterSha256=digest(data),counts=record['countsAfter'])))

if __name__ == '__main__':
    main()
