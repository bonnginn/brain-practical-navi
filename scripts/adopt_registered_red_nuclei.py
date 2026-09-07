"""Bounded red-nucleus registration repair, never an all-22 adoption.

Prepare once from the pinned reviewed source under work; install only by replaying
the tracked reversible JSON against the pinned six-stage baseline. No intensity
threshold, hole filling, smoothing, or assignment to another tissue is performed.
"""
import argparse
import gzip
import hashlib
import json
import struct
from pathlib import Path
import numpy as np
from apply_segmentation_patch import read_volume
from compose_registered_practical_candidate import (
    TIGHT_CANDIDATE_SHA, TIGHT_CANDIDATE_RAW_SHA, raw_sha,
    make_delta, replay_delta,
)

ROOT = Path(__file__).resolve().parents[1]
BASE_SHA = '098edfbf365016c6c53ccf7b7032258db72a4912378c457d348c01613a4a1694'
BASE_RAW = 'afc55069f2ecdcad36429f1026276f10c8e17a31fa9c6bf985b3beec3f640130'
RECORD_SHA = '4e8e83794e932261c4d1d1b288989216cf33d301765b7c4f3977e1917ad8f102'
TARGET = ROOT/'public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz'
FIXTURE = ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-red-registration-098e.bin.gz'
RECORD = ROOT/'segmentation-patches/review/red-nuclei-registration-project-adoption-2026-09-06.json'


def digest(data):
    return hashlib.sha256(data).hexdigest()


def compose_red(old, candidate):
    if old.shape != candidate.shape or old.ndim != 3 or old.dtype != np.uint8 or candidate.dtype != np.uint8:
        raise ValueError('Expected matching uint8 XYZ volumes')
    selected = np.isin(candidate, (1, 2))
    if any(not np.any(candidate == value) for value in (1, 2)):
        raise ValueError('Both red nuclei are required')
    if np.any(selected & ~np.isin(old, (0, 1, 2))):
        raise ValueError('Red-nucleus repair would overwrite another structure')
    result = old.copy()
    result[np.isin(old, (1, 2))] = 0
    result[selected] = candidate[selected]
    return result


def encode(volume):
    return gzip.compress(b'BBS1'+struct.pack('<3H', *volume.shape)+volume.tobytes(order='F'), mtime=0)


def apply_record(old, record):
    if record.get('schemaVersion') != 1 or record.get('scope') != 'red-nuclei-1-2-only' or record.get('expertReviewed') is not False:
        raise ValueError('Invalid adoption scope/status')
    if list(old.shape) != record['dimensions'] or raw_sha(old) != record['inputRawSha256']:
        raise ValueError('Baseline geometry/identity changed')
    edits = np.asarray(record['edits'])
    if edits.ndim != 2 or edits.shape[1] != 3 or edits.dtype.kind not in 'iu' or not np.isin(edits[:,1:], (0,1,2)).all():
        raise ValueError('Invalid or out-of-scope edits')
    indices = edits[:,0].astype(np.int64)
    before, after = edits[:,1].astype(np.uint8), edits[:,2].astype(np.uint8)
    result = replay_delta(old, indices, before, after)
    if len(indices) != record['changedVoxelCount'] or raw_sha(result) != record['outputRawSha256']:
        raise ValueError('Output identity/count changed')
    if not np.array_equal(replay_delta(result, indices, before, after, reverse=True), old):
        raise ValueError('Reverse replay failed')
    return result


def prepare(output):
    output = output.resolve()
    if output.exists() or not output.is_relative_to(ROOT/'work'):
        raise ValueError('Preparation requires a new work directory')
    baseline = FIXTURE if FIXTURE.exists() else TARGET
    if digest(baseline.read_bytes()) != BASE_SHA:
        raise ValueError('Development baseline changed')
    dims, data = read_volume(baseline)
    old = np.frombuffer(data, dtype=np.uint8).reshape(dims, order='F')
    source = ROOT/'work/anatomy-review/manual-all22-registered-tight-v1/candidate-all22.npz'
    if digest(source.read_bytes()) != TIGHT_CANDIDATE_SHA:
        raise ValueError('Wrong reviewed source')
    with np.load(source, allow_pickle=False) as f:
        if not np.array_equal(f['dimensions'], dims):
            raise ValueError('Wrong candidate grid')
        candidate = np.zeros(dims, dtype=np.uint8)
        candidate[tuple(slice(int(a),int(b)) for a,b in zip(f['minimum'],f['maximumExclusive']))] = f['labels']
    if raw_sha(candidate) != TIGHT_CANDIDATE_RAW_SHA or raw_sha(old) != BASE_RAW:
        raise ValueError('Wrong raw source')
    result = compose_red(old, candidate)
    indices, before, after = make_delta(old, result)
    record = dict(schemaVersion=1, scope='red-nuclei-1-2-only', dimensions=list(dims),
        reviewStatus='project-adopted', expertReviewed=False, researchGroundTruth=False,
        decisionDate='2026-09-06', decisionBasis='User requested correction after reviewing improvement; AI-assisted project adoption, not expert boundary approval.',
        inputCompressedSha256=BASE_SHA, inputRawSha256=BASE_RAW,
        registeredCandidateSha256=TIGHT_CANDIDATE_SHA, registeredRawSha256=TIGHT_CANDIDATE_RAW_SHA,
        outputRawSha256=raw_sha(result), outputCompressedSha256=digest(encode(result)),
        changedVoxelCount=len(indices), edits=np.column_stack((indices,before,after)).tolist(),
        beforeCounts={str(i):int(np.count_nonzero(old==i)) for i in (1,2)},
        afterCounts={str(i):int(np.count_nonzero(result==i)) for i in (1,2)},
        indexOrder='Fortran XYZ: x + dimX*(y + dimY*z)',
        policy='Whole red-nucleus region transferred from source manual delineation. Internal bright bands retained, not identified as red-nucleus gray matter or a specific tract. Obsolete positions become unlabeled, not absent tissue. Other labels unchanged.',
        evidenceDocuments=['MANUAL_REGISTERED_REVIEW_CONCLUSIONS.md','RED_NUCLEUS_REGISTRATION_ADOPTION.md'])
    assert np.array_equal(apply_record(old, record), result)
    output.mkdir(parents=True)
    (output/'record.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    (output/'labels.bin.gz').write_bytes(encode(result))
    print(json.dumps({k:v for k,v in record.items() if k!='edits'},ensure_ascii=False))


def install():
    if digest(RECORD.read_bytes()) != RECORD_SHA:
        raise ValueError('Reviewed adoption record changed')
    record = json.loads(RECORD.read_text(encoding='utf-8'))
    source = FIXTURE.read_bytes()
    if digest(source) != BASE_SHA or record['inputCompressedSha256'] != BASE_SHA or record['inputRawSha256'] != BASE_RAW:
        raise ValueError('Pinned baseline changed')
    if digest(TARGET.read_bytes()) not in (BASE_SHA, record['outputCompressedSha256']):
        raise ValueError('Refuse to overwrite unrelated development asset')
    dims, data = read_volume(FIXTURE)
    result = apply_record(np.frombuffer(data,dtype=np.uint8).reshape(dims,order='F'),record)
    encoded = encode(result)
    if digest(encoded) != record['outputCompressedSha256']:
        raise ValueError('Compressed reproduction differs')
    TARGET.write_bytes(encoded)
    print(record['outputCompressedSha256'])


def rebuild_red_mesh():
    """Only the red-nucleus block part; preserve every other mesh and mask."""
    import build_specimen_blocks as b
    mesh_path=ROOT/'public/atlas/block-midbrain-section-red-nuclei.mesh'
    if digest(RECORD.read_bytes()) != RECORD_SHA or digest(mesh_path.read_bytes()) not in (
        'b1311f184cd4c0f4f5cc8d9fb86aa55717f558dd609419f7cdbc4469759f242a',
        '1ac905f08e241798c81601c5aa1733efab039f5efe6a38df1f3e3063a9d650ec'):
        raise ValueError('Reviewed record or existing mesh changed')
    record=json.loads(RECORD.read_text(encoding='utf-8'))
    if digest(TARGET.read_bytes()) != record['outputCompressedSha256']:
        raise ValueError('Install reviewed labels before rebuilding mesh')
    seg,_=b.read_volume(TARGET,b'BBS1')
    seg=seg[::2,::2,::2]
    zz,yy,xx=b.world_grids(seg.shape)
    mask=np.isin(seg,(1,2)) & b.bounds(zz,yy,xx,x=(-24,24),y=(-32,20),z=(-36,-26))
    mesh=b.mesh_from_mask(mask,np.zeros(seg.shape,dtype=np.uint8),False)
    vertices,normals,shade,faces=mesh
    encoded=b'BNM2'+struct.pack('<II',len(vertices),len(faces))+vertices.tobytes()+normals.tobytes()+shade.tobytes()+faces.tobytes()
    if digest(encoded) != '1ac905f08e241798c81601c5aa1733efab039f5efe6a38df1f3e3063a9d650ec':
        raise ValueError('Mesh reproduction differs; refusing mutation')
    info=b.write_mesh('block-midbrain-section-red-nuclei',mesh)
    print(json.dumps(info))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--prepare',type=Path)
    group.add_argument('--install-development',action='store_true')
    group.add_argument('--rebuild-red-mesh',action='store_true')
    args = parser.parse_args()
    if args.prepare: prepare(args.prepare)
    elif args.rebuild_red_mesh: rebuild_red_mesh()
    else: install()
