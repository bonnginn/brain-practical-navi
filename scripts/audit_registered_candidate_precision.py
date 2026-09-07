"""Work-only numerical sensitivity of every enumerated conflict/anomaly point.

Tighter inverse tolerance is not anatomical ground truth or native-MINC parity.
The original candidate, source labels, and historical evidence remain unchanged.
"""
import argparse
import hashlib
import json
from pathlib import Path
import numpy as np
from audit_manual_label_space import SOURCE, FILES, load_identity_minc
from audit_registered_manual_conflicts import CANDIDATE_SHA
from build_registered_manual_candidate import nearest_labels
from build_orthogonal_review_bundle import ROOT
from review_bigbrain_grid_transform import load_published_grids, precise_inverse

FINDINGS = ROOT/'work/anatomy-review/manual-all22-conflicts-pairs-v1/report.json'
FINDINGS_SHA = 'd1ad402143dfb60aa02dabe92a4efc0fe28c13af360e19338748093b44a0719c'


def unique_evidence_points(findings):
    points = set()
    for finding in findings:
        listed = finding['points']
        if len(listed) != finding['voxelCount'] or len(set(map(tuple, listed))) != len(listed):
            raise ValueError('Inconsistent finding points')
        for point in listed:
            if len(point) != 3 or any(type(v) is not int or v < 0 for v in point):
                raise ValueError('Expected nonnegative integer XYZ')
            points.add(tuple(point))
    if not points:
        raise ValueError('Empty evidence')
    return np.asarray(sorted(points), dtype=np.int64)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    output = args.output.resolve()
    if not output.is_relative_to((ROOT/'work').resolve()) or output.exists():
        raise ValueError('Output must be new and inside work')
    if hashlib.sha256(FINDINGS.read_bytes()).hexdigest() != FINDINGS_SHA:
        raise ValueError('Unexpected conflict evidence')
    findings = json.loads(FINDINGS.read_text(encoding='utf-8'))
    points = unique_evidence_points(findings['findings'])
    path = ROOT/'work/anatomy-review/manual-all22-registered-v1/candidate-all22.npz'
    if hashlib.sha256(path.read_bytes()).hexdigest() != CANDIDATE_SHA:
        raise ValueError('Unexpected candidate')
    with np.load(path, allow_pickle=False) as candidate:
        low, high = candidate['minimum'], candidate['maximumExclusive']
        if np.any(points < low) or np.any(points >= high):
            raise ValueError('Evidence outside candidate')
        before = candidate['labels'][tuple((points-low).T)]
        affine = candidate['affine']
    source, start, step, _ = load_identity_minc(SOURCE/'BigBrain-SubCorSeg-300um.mnc', FILES['BigBrain-SubCorSeg-300um.mnc'])
    world = points @ affine[:3,:3].T + affine[:3,3]
    inverse, residual = precise_inverse(load_published_grids('catmull-rom'), world)
    after = nearest_labels(source, inverse, start, step)
    changed = np.flatnonzero(before != after)
    report = dict(schemaVersion=1, adopted=False, labelMutation=False, expertReview=False,
        scope='All unique coordinates in enumerated conflicts/anomalies, NOT every candidate voxel; numerical sensitivity only.',
        findingsSha256=FINDINGS_SHA, candidateSha256=CANDIDATE_SHA,
        sourceSha256=FILES['BigBrain-SubCorSeg-300um.mnc'], uniquePointCount=len(points),
        perGridToleranceMm=1e-6, maximumComposedResidualMm=residual,
        changedCount=len(changed), changes=[dict(xyz=points[i].tolist(), previous=int(before[i]), tighter=int(after[i])) for i in changed],
        outcome='No automatic replacement. Differences, if any, require review before production adoption.',
        pointsSha256=hashlib.sha256(points.astype('<i8').tobytes()).hexdigest())
    output.mkdir(parents=True)
    np.savez_compressed(output/'samples.npz', points=points, originalCandidate=before, tighter=after, inverseWorld=inverse)
    report['samplesSha256']=hashlib.sha256((output/'samples.npz').read_bytes()).hexdigest()
    (output/'report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(report),flush=True)


if __name__ == '__main__': main()
