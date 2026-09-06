"""Create a reversible WORK-ONLY composite for registered manual-label review.

This is deliberately not an adoption/production command. It preserves current
ventricles and reviewed structures, permits manual-over-coarse brainstem/capsule
overlap for inspection, and removes obsolete manual positions without inventing
replacement anatomy. All 6 historical repair stages remain unchanged upstream.
"""
import argparse
import gzip
import hashlib
import json
import struct
from pathlib import Path

import numpy as np

from audit_manual_label_space import LABEL_SHA
from audit_registered_manual_conflicts import CANDIDATE_SHA, CANDIDATE_RAW_SHA
from build_orthogonal_review_bundle import ROOT, DEFAULT_LABELS, MAGIC_LABELS, read_browser_volume

COARSE_OVERRIDE_IDS = (27, 31, 32)
POLICY = 'research-v1-clear-obsolete-manual-preserve-other-except-coarse-27-31-32'
TIGHT_CANDIDATE_SHA = 'fdf1ac7aba8c7cb1081e1956a78309c85698f18ee524c34a14471172cad0f4b6'
TIGHT_CANDIDATE_RAW_SHA = '86ee9c8f279020d5472dd82e986f0243179111a3b717972e503e859c0c948825'


def candidate_identity(version):
    if version == 'historical': return CANDIDATE_SHA, CANDIDATE_RAW_SHA
    if version == 'tight': return TIGHT_CANDIDATE_SHA, TIGHT_CANDIDATE_RAW_SHA
    raise ValueError('Unknown research candidate version')


def compose(old, registered):
    """Pure explicit priority proposal; never mutate input or fill empty space."""
    if old.shape != registered.shape or old.ndim != 3 or old.dtype != np.uint8 or registered.dtype != np.uint8 or not np.isin(old, range(42)).all() or not np.isin(registered, range(23)).all():
        raise ValueError('Expected same-shape uint8 XYZ current IDs0-41 and manual IDs0-22')
    old_manual = (old > 0) & (old <= 22)
    new_manual = registered > 0
    protected = (old > 22) & ~np.isin(old, COARSE_OVERRIDE_IDS)
    result = old.copy()
    result[old_manual] = 0
    accept = new_manual & ~protected
    result[accept] = registered[accept]
    vacated = old_manual & ~new_manual
    blocked = new_manual & protected
    if not np.array_equal(result[protected],old[protected]) or np.any(result[vacated]):
        raise AssertionError('Composite priority invariant failed')
    return result, dict(policy=POLICY, oldManualCount=int(old_manual.sum()),
        registeredManualCount=int(new_manual.sum()), acceptedManualCount=int(accept.sum()),
        preservedConflicts=int(blocked.sum()), obsoleteManualClearedToUnlabeled=int(vacated.sum()),
        replacedCoarseCount=int(np.count_nonzero(new_manual & np.isin(old,COARSE_OVERRIDE_IDS))),
        protectedConflictCounts={f'{int(a)}->{int(b)}': int(np.count_nonzero(blocked & (old==a) & (registered==b)))
            for a,b in np.unique(np.column_stack((old[blocked],registered[blocked])),axis=0)},
        vacatedPolicy='Unlabeled, NOT background/tissue absence. No morphological fill or nearest-label invention.')


def make_delta(old, new):
    if old.shape != new.shape or old.dtype != np.uint8 or new.dtype != np.uint8:
        raise ValueError('Incompatible delta inputs')
    before, after = old.ravel(order='F'), new.ravel(order='F')
    indices = np.flatnonzero(before != after).astype(np.int64)
    return indices, before[indices].copy(), after[indices].copy()


def replay_delta(volume, indices, before, after, reverse=False):
    """Strict atomic replay into a copy, including reversible pre-value checks."""
    if volume.ndim != 3 or volume.dtype != np.uint8 or indices.ndim != 1 or indices.dtype.kind not in 'iu' or before.dtype != np.uint8 or after.dtype != np.uint8 or before.shape != indices.shape or after.shape != indices.shape:
        raise ValueError('Invalid delta schema')
    if len(indices) and (indices[0] < 0 or indices[-1] >= volume.size or np.any(indices[1:] <= indices[:-1])):
        raise ValueError('Delta indices must be unique sorted in-range Fortran offsets')
    if np.any(before == after):
        raise ValueError('Delta contains no-op entries')
    expected, replacement = (after,before) if reverse else (before,after)
    flat = volume.ravel(order='F')
    if not np.array_equal(flat[indices],expected):
        raise ValueError('Delta pre-values do not match')
    result = flat.copy()
    result[indices] = replacement
    return result.reshape(volume.shape,order='F')


def raw_sha(volume):
    return hashlib.sha256(volume.tobytes(order='F')).hexdigest()


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--candidate-dir',type=Path,required=True)
    parser.add_argument('--output',type=Path,required=True)
    parser.add_argument('--candidate-version',choices=('historical','tight'),default='historical')
    args=parser.parse_args(); output=args.output.resolve()
    if not output.is_relative_to((ROOT/'work').resolve()) or output.exists():
        raise ValueError('Output must be a new directory strictly inside work')
    path=args.candidate_dir/'candidate-all22.npz'
    candidate_sha,candidate_raw_sha=candidate_identity(args.candidate_version)
    if hashlib.sha256(path.read_bytes()).hexdigest()!=candidate_sha:
        raise ValueError('Unexpected registered candidate')
    _, dims, old=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,LABEL_SHA)
    registered=np.zeros(dims,dtype=np.uint8)
    with np.load(path,allow_pickle=False) as source:
        low,high=source['minimum'],source['maximumExclusive']
        if not np.array_equal(source['dimensions'],dims) or low.shape!=(3,) or high.shape!=(3,) or np.any(low<0) or np.any(high>dims) or np.any(low>=high):
            raise ValueError('Invalid candidate geometry')
        registered[tuple(slice(int(a),int(b)) for a,b in zip(low,high))]=source['labels']
    if raw_sha(registered)!=candidate_raw_sha:
        raise ValueError('Registered raw identity mismatch')
    before_sha=raw_sha(old)
    composed,stats=compose(old,registered)
    indices,before,after=make_delta(old,composed)
    if not np.array_equal(replay_delta(old,indices,before,after),composed) or not np.array_equal(replay_delta(composed,indices,before,after,reverse=True),old) or raw_sha(old)!=before_sha:
        raise AssertionError('Independent delta round-trip/input identity failed')
    payload=MAGIC_LABELS+struct.pack('<3H',*dims)+composed.tobytes(order='F')
    compressed=gzip.compress(payload,mtime=0)
    transitions,count=np.unique(np.column_stack((before,after)),axis=0,return_counts=True)
    report=dict(schemaVersion=1,adopted=False,publicAssetMutation=False,expertReview=False,
        scope='Research composite only. Priority policy still requires anatomical/composed review; never deploy this artifact directly.',
        inputCompressedSha256=LABEL_SHA,inputRawSha256=before_sha,
        registeredCandidateSha256=candidate_sha,registeredRawSha256=candidate_raw_sha,
        candidateVersion=args.candidate_version,
        outputCompressedSha256=hashlib.sha256(compressed).hexdigest(),outputRawSha256=raw_sha(composed),
        dimensions=dims,statistics=stats,changedVoxelCount=len(indices),
        transitions={f'{int(a)}->{int(b)}':int(n) for (a,b),n in zip(transitions,count)},
        deltaOrder='Fortran XYZ; x + dimX*(y + dimY*z)',roundTripVerified=True,
        byLabel={str(value):dict(before=int(np.count_nonzero(old==value)),after=int(np.count_nonzero(composed==value))) for value in range(42)},
        historicalStages='Input is the unchanged strict six-stage current volume. No original patch SHA or expert-review status is rebased.',
        visualReview='Not performed by this generator. Unlabeled old positions are not inferred tissue/background.')
    output.mkdir(parents=True)
    (output/'candidate-practical.bin.gz').write_bytes(compressed)
    np.savez_compressed(output/'reversible-delta.npz',indices=indices,before=before,after=after,
        dimensions=np.asarray(dims),inputRawSha256=np.asarray(before_sha),outputRawSha256=np.asarray(report['outputRawSha256']))
    report['deltaSha256']=hashlib.sha256((output/'reversible-delta.npz').read_bytes()).hexdigest()
    (output/'report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(dict(statistics=stats,changedVoxelCount=len(indices),outputRawSha256=report['outputRawSha256'])),flush=True)


if __name__=='__main__': main()
