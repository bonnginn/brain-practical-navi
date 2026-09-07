"""Stage the reviewed 105-point fourth-ventricle fringe, without installation."""
import json
import numpy as np
from scipy.ndimage import binary_dilation, generate_binary_structure
from build_orthogonal_review_bundle import ROOT, DEFAULT_LABELS, MAGIC_LABELS, read_browser_volume
from adopt_registered_red_nuclei import encode
from stage_third_ventricle_core_repair import digest, checked_report

WORK = ROOT/'work/anatomy-review'
BASE_SHA = 'e98cd4060d735c732a5fd75030be2f701f57fe91b6cd5b9a12c65e1cb68b37e3'
CANDIDATE_SHA = 'adcbfe9bc10bf811af0eb5ec005f43cfb803370f1f12ee1070ffc58561ff85b1'


def reviewed_points():
    path = WORK/'fourth-ventricle-anterior-next-candidate-v1/candidate.json'
    if digest(path.read_bytes()) != CANDIDATE_SHA:
        raise ValueError('Candidate changed')
    candidate = json.loads(path.read_text(encoding='utf-8'))
    records = [r for r in candidate['records'] if r['selected']]
    if candidate['inputCompressedSha256'] != BASE_SHA or len(records) != 105:
        raise ValueError('Candidate baseline/count differs')
    if any(r['before'] != 0 or r['after'] != 26 or r['supportCornerMinimum'] < 65000 for r in records):
        raise ValueError('Candidate support differs')
    return sorted(tuple(r['xyz']) for r in records)


def replay(volume, points, reverse=False):
    if volume.dtype != np.uint8 or volume.shape != (394,466,378):
        raise ValueError('Unexpected source grid')
    if len(points) != 105 or any(len(p) != 3 or any(type(v) is not int for v in p) for p in points):
        raise ValueError('Invalid finite repair')
    if sorted(tuple(p) for p in points) != reviewed_points():
        raise ValueError('Repair coordinates differ')
    indices = tuple(np.asarray(points, dtype=int).T)
    source, target = (26,0) if reverse else (0,26)
    if np.any(volume[indices] != source):
        raise ValueError('Source voxel differs')
    result = volume.copy()
    result[indices] = target
    return result


def main():
    out = WORK/'fourth-ventricle-anterior105-stage-v1'
    if out.exists():
        raise ValueError('Preserve existing evidence')
    evidence = [
        checked_report('fourth-ventricle-anterior-next-difference-v1','a61e3f3ec04bcc0e95556abae1fd22cfabc2f55d38b65231e99921f8b53101fb',16),
        checked_report('fourth-ventricle-anterior-next-native-v1','d47dc1a998095b1c352efcbe90111a19545c5b9ae215771d8ea709f7d52cf386',25),
    ]
    _,_,before = read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,BASE_SHA)
    points = reviewed_points()
    adjacent = binary_dilation(before == 26, structure=generate_binary_structure(3,1))
    if not np.all(adjacent[tuple(np.asarray(points).T)]):
        raise ValueError('Candidate is not one face-neighbour layer')
    after = replay(before,points)
    if np.count_nonzero(before != after) != 105 or not np.array_equal(replay(after,points,True),before):
        raise ValueError('Reversibility failed')
    encoded = encode(after)
    report = dict(inputCompressedSha256=BASE_SHA,inputRawSha256=digest(before.tobytes(order='F')),
        outputCompressedSha256=digest(encoded),outputRawSha256=digest(after.tobytes(order='F')),
        points=[dict(xyz=list(p),before=0,after=26) for p in points],changedVoxelCount=105,
        transitions={'0->26':105},candidateSha256=CANDIDATE_SHA,reviewEvidence=evidence,
        status='AI-image-reviewed-development-repair-staged',imageReviewed=True,
        expertReviewed=False,installed=False,published=False,
        rationale='43 app-grid orthogonal planes and 73 consecutive registered300 planes show anterior cavity contour omissions, separated from the brainstem tissue and cerebellar-facing open margins.',
        limitations=['Local fringe repair, not complete fourth-ventricle segmentation.',
                     'Native100 point views are supportive context, not full candidate coverage.',
                     'Additional omissions remain beyond the finite candidate.',
                     'Mesh impact, integration, downstream audits and live browser checks pending.'])
    out.mkdir()
    (out/'base.bin.gz').write_bytes(DEFAULT_LABELS.read_bytes())
    (out/'labels.bin.gz').write_bytes(encoded)
    (out/'repair.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:report[k] for k in ['changedVoxelCount','outputCompressedSha256','outputRawSha256','installed']}))


if __name__ == '__main__':
    main()
