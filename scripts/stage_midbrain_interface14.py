"""Hold newly added cells at the unresolved mammillary/legacy-optic interface."""
import gzip
import json
import argparse
from pathlib import Path
import numpy as np
from scipy import ndimage
from build_orthogonal_review_bundle import ROOT, MAGIC_LABELS, read_browser_volume
from stage_lateral_detached547 import digest
from stage_midbrain_ventral14803 import REVIEW, REVIEW_SHA

LABEL_SHA='409dac37154b25dd6bc9caa387c4aa5a7b774cb430794c082bdfc956e874f7b5'
BASELINE=ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-midbrain-interface14.bin.gz'
HELD=[[187,249,115],[187,250,115],[188,248,115],[189,247,115],[190,247,115],[191,247,115],[192,247,115],
      [193,247,115],[194,248,115],[202,247,115],[203,247,115],[204,248,115],[205,249,115],[205,250,115]]


def replay(labels,points,reverse=False):
    p=np.asarray(points)
    if p.dtype.kind not in 'iu' or p.shape!=(14,3) or p.tolist()!=HELD:raise ValueError('Unexpected held interface cells')
    if labels.ndim!=3 or np.any(p>=labels.shape) or np.any(labels[tuple(p.T)]!=(0 if reverse else 27)):
        raise ValueError('Conflicting interface labels')
    after=labels.copy();after[tuple(p.T)]=27 if reverse else 0
    return after


def main(output=None):
    out=Path(output) if output is not None else ROOT/'work/anatomy-review/midbrain-interface14-stage-v1'
    if out.exists():raise ValueError('Preserve evidence')
    _,_,before=read_browser_volume(BASELINE,MAGIC_LABELS,LABEL_SHA)
    prior_path=ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-midbrain-ventral14803.bin.gz'
    prior_blob=prior_path.read_bytes();prior_raw=gzip.decompress(prior_blob)
    prior=np.frombuffer(prior_raw,np.uint8,offset=10).reshape(before.shape,order='F')
    if digest(prior_blob)!='976684fb22e372f3b0942190d2a8985bc41b1535cd56e332e7a055f5b6d88ffb':raise ValueError('Prior baseline changed')
    selected=(before==27)&(prior==0);six=ndimage.generate_binary_structure(3,1)
    boundary=ndimage.binary_dilation(np.isin(prior,[33,39,40]),structure=six)&selected
    if np.argwhere(boundary).tolist()!=HELD:raise ValueError('Interface inventory changed')
    after=replay(before,HELD)
    if not np.array_equal(replay(after,HELD,True),before):raise ValueError('Reverse differs')
    reached=ndimage.binary_propagation(prior==27,mask=after==27,structure=six)
    if np.any((after==27)&~reached):raise ValueError('New disconnected tissue')
    evidence_path=ROOT/REVIEW;evidence_blob=evidence_path.read_bytes();evidence=json.loads(evidence_blob)
    if digest(evidence_blob)!=REVIEW_SHA:raise ValueError('Image evidence changed')
    # The previously inspected all-plane review includes the upper interface in z-07.
    figures=[f for f in evidence['figures'] if f['path'] in ['z-07.png','x-01.png','y-01.png']]
    for f in figures:
        if digest((evidence_path.parent/f['path']).read_bytes())!=f['sha256']:raise ValueError('Figure changed')
    base=BASELINE.read_bytes();raw=gzip.decompress(base);data=gzip.compress(raw[:10]+after.tobytes(order='F'),mtime=0)
    record=dict(beforeSha256=LABEL_SHA,afterSha256=digest(data),afterRawVoxelSha256=digest(after.tobytes(order='F')),
        points=HELD,count=14,transition='27->0',
        evidence=[dict(path=REVIEW,sha256=REVIEW_SHA,visuallyInspectedFigures=figures)],
        netVentralAdditions=14789,countsBefore={str(k):int((before==k).sum()) for k in [0,27]},
        countsAfter={str(k):int((after==k).sum()) for k in [0,27]},
        status='AI-image-reviewed-work-stage-only',adopted=False,expertReviewed=False,publicMutation=False,
        rationale='Post-repair interface audit found 14 new cells at app Z115 contacting unchanged ID33/39/40. '
        'The inspected upper-plane and orthogonal images do not establish a new mammillary/hypothalamic/legacy-optic boundary. '
        'These cells alone return to their pre-repair background value; this is a conservative hold, not a claim that the tissue is absent. '
        'All 14789 remaining new ID27 cells stay 6-connected to the pre-repair brainstem. '
        'The existing reference nuclei and their original interface contacts are preserved.',
        limitation='This hold is not a new anatomical boundary and does not repair or validate the old mixed ID33. '
        'All pre-existing nonzero labels are unchanged relative to the pre-ventral baseline. '
        'Higher midbrain attachments remain unresolved. Mesh synchronization and product adoption pending.')
    out.mkdir();(out/'before.bin.gz').write_bytes(base);(out/'labels.bin.gz').write_bytes(data)
    (out/'repair.json').write_text(json.dumps(record,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:record[k] for k in ['beforeSha256','afterSha256','afterRawVoxelSha256','count','countsAfter']}))
    print('recordSha256',digest((out/'repair.json').read_bytes()))


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output',type=Path,help='New evidence directory; existing directories are never overwritten')
    main(parser.parse_args().output)
