"""Stage two independently image-reviewed posterior ventricular corrections."""
import gzip
import json
import numpy as np
from scipy import ndimage
from build_orthogonal_review_bundle import ROOT,DEFAULT_LABELS,MAGIC_LABELS,read_browser_volume
from review_aqueduct_native100 import LABEL_SHA,CANDIDATE,CANDIDATE_SHA,sha
from stage_aqueduct_core179 import REVIEWS
from review_third_posterior_native100 import LOCATOR,LOCATOR_SHA

POSTERIOR='work/anatomy-review/third-posterior-native100-candidate-2026-09-08-v1/report.json'
POSTERIOR_SHA='cfdfa5fd1ae10369813d8a7e139af4ef28cee88356abefd8a31491232d922f38'


def replay(labels,entries,reverse=False):
    if len(entries)!=158:raise ValueError('Expected 158 reviewed cells')
    points=np.asarray([p['xyz'] for p in entries])
    if (points.shape!=(158,3) or points.dtype.kind not in 'iu' or len(np.unique(points,axis=0))!=158
            or np.any(points<0) or np.any(points>=labels.shape)):
        raise ValueError('Invalid coordinates')
    transitions=[]
    for p in entries:
        if type(p['before'])is not int or type(p['after'])is not int:raise ValueError('Invalid labels')
        transitions.append((p['before'],p['after']))
    if transitions.count((25,0))!=94 or sum(t in [(0,41),(27,41)] for t in transitions)!=64:
        raise ValueError('Unexpected regional transitions')
    before=np.array([p['before'] for p in entries],np.uint8);after=np.array([p['after'] for p in entries],np.uint8)
    if np.any(labels[tuple(points.T)]!=(after if reverse else before)):raise ValueError('Conflicting labels')
    result=labels.copy();result[tuple(points.T)]=before if reverse else after
    return result


def evidence_file(relative,expected,visually_reviewed=False):
    path=ROOT/relative;raw=path.read_bytes()
    if sha(raw)!=expected:raise ValueError('Evidence changed: '+relative)
    report=json.loads(raw);entry=dict(path=relative,sha256=expected)
    if visually_reviewed:
        for f in report['figures']:
            if sha((path.parent/f['path']).read_bytes())!=f['sha256']:raise ValueError('Figure changed')
        entry['visuallyInspectedFigures']=report['figures']
    return report,entry


def main():
    out=ROOT/'work/anatomy-review/posterior-ventricles158-stage-v1'
    if out.exists():raise ValueError('Preserve existing stage')
    _,_,before=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,LABEL_SHA)
    evidence=[]
    posterior,item=evidence_file(POSTERIOR,POSTERIOR_SHA,True);evidence.append(item)
    _,item=evidence_file(LOCATOR,LOCATOR_SHA);evidence.append(item)
    if posterior['labelSha256']!=LABEL_SHA or posterior['candidateCount']!=94 or posterior['adopted']:
        raise ValueError('Posterior review identity changed')
    exclusions=[dict(xyz=p['xyz'],before=25,after=0) for p in posterior['points']]
    locator,item=evidence_file(CANDIDATE,CANDIDATE_SHA);evidence.append(item)
    # Partial extent reviewed on all source300 planes and native100 context;
    # these planes delimit the adopted subset, NOT anatomical aqueduct endpoints.
    chosen=[p for p in locator['points'] if 114<=p['xyz'][2]<=123]
    if len(chosen)!=64:raise ValueError('Partial caudal subset changed')
    additions=[dict(xyz=p['xyz'],before=p['before'],after=41) for p in chosen]
    for axis,digest in REVIEWS.items():
        _,item=evidence_file(f'work/anatomy-review/aqueduct273-2026-09-08-series-{axis}-v1/report.json',digest,True);evidence.append(item)
    for suffix,digest in [('', '6457e40fa5fc9e2ae39444056ac1438266cb80b33c9533c662ac1f36812958bb'),
                          ('-wide12mm','e93588565b774082b1275fb4e9a85e5ab327237ee31f4d769f9a7a91b65e2279')]:
        _,item=evidence_file(f'work/anatomy-review/aqueduct-native100-terminals-2026-09-08-v1{suffix}/report.json',digest,True);evidence.append(item)
    entries=exclusions+additions;after=replay(before,entries)
    if np.count_nonzero(before!=after)!=158 or not np.array_equal(replay(after,entries,True),before):raise ValueError('Full reverse differs')
    if np.any(after[before==41]!=41):raise ValueError('Existing aqueduct changed')
    _,components=ndimage.label(after==41,ndimage.generate_binary_structure(3,1))
    if components!=1 or np.count_nonzero(after==41)!=259:raise ValueError('Partial aqueduct continuity changed')
    prior=[];selected={tuple(p['xyz']) for p in additions}
    for path in sorted((ROOT/'segmentation-patches/review').glob('brainstem-*-adoption-*.json')):
        raw=path.read_bytes();record=json.loads(raw)
        points=record.get('points',[])
        if not points:raise ValueError('Missing previous brainstem evidence')
        xyz=[p['xyz'] if isinstance(p,dict) else p for p in points]
        if selected.intersection(map(tuple,xyz)):raise ValueError('Prior brainstem correction overlaps')
        prior.append(dict(path=path.relative_to(ROOT).as_posix(),sha256=sha(raw),overlapCount=0))
    base=DEFAULT_LABELS.read_bytes();raw=gzip.decompress(base);data=gzip.compress(raw[:10]+after.tobytes(order='F'),mtime=0)
    record=dict(beforeSha256=LABEL_SHA,afterSha256=sha(data),afterRawVoxelSha256=sha(after.tobytes(order='F')),
        points=entries,count=158,transition='mixed-posterior-ventricular-repair',evidence=evidence,priorBrainstemRepairs=prior,
        countsBefore={str(k):int(np.count_nonzero(before==k)) for k in [0,25,27,41]},
        countsAfter={str(k):int(np.count_nonzero(after==k)) for k in [0,25,27,41]},sixNeighbourAqueductComponentsAfter=1,
        subregions=[dict(name='third-posterior-tissue-exclusion',count=94,bounds=[np.min([p['xyz'] for p in exclusions],axis=0).tolist(),np.max([p['xyz'] for p in exclusions],axis=0).tolist()]),
                    dict(name='partial-aqueduct-caudal-extension',count=64,bounds=[np.min([p['xyz'] for p in additions],axis=0).tolist(),np.max([p['xyz'] for p in additions],axis=0).tolist()])],
        heldAqueductLocatorCount=30,partialAqueductExtent=True,status='AI-image-reviewed-work-stage-only',
        adopted=False,expertReviewed=False,publicMutation=False,
        rationale='Two independent image-reviewed subsets. Third: all 14 native100 sheets (39 planes) show selected ID25 cells within preserved posterior tissue, '
        'not ventricular lumen; exclude 94 conservative interior cells without assigning a pineal label. The 27-point low-intensity fraction was only a locator, '
        'not the anatomical decision. Aqueduct: source300 all 37 sheets/111 planes and native100 18 sheets/27 distinct planes show a closed lumen '
        'continuing caudally between tectum and tegmentum; add the reviewed 64-cell partial subset, retaining both terminal uncertainties.',
        limitation='Not expert review or full segmentation. Native100 review samples are 0.4 mm apart in the posterior tissue series; not every native plane. '
        'Image registration is not exact anatomy. Third-ventricle tissue borders, internal pale spaces, posterior recesses and remaining uncertain cells retained; '
        'the gland is not newly segmented. Aqueduct app Z114–123 delimits a partial adoption, not anatomical ends. 30 original locator cells remain unadopted. '
        'Mesh synchronization and product adoption pending.')
    out.mkdir();(out/'before.bin.gz').write_bytes(base);(out/'labels.bin.gz').write_bytes(data)
    (out/'repair.json').write_text(json.dumps(record,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:v for k,v in record.items() if k not in ['points','evidence','priorBrainstemRepairs','rationale','limitation']}))
    print('recordSha256',sha((out/'repair.json').read_bytes()))


if __name__=='__main__':main()
