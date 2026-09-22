"""Install the reviewed central optic interior only after work-stage preflight."""
import argparse
import gzip
import hashlib
import json
from pathlib import Path
import numpy as np
from build_section_ventricle_meshes import reconstruct, build_assets

ROOT=Path(__file__).resolve().parents[1]
ATLAS=ROOT/'public/atlas'
STAGE=ROOT/'work/optic-central-volume-20260919/stage-v1'
BASE_SHA='c3ffa981882eb6faae62a9bd7ef35b420ae6e19155c27440b1e3789bf2e00c42'
AFTER_SHA='d3eaa45d8e2e43416dfc931f4a720da203131f7e579a320c3f51c9f8069c7056'
PREFIX='optic-central112'
RECORD=ROOT/f'segmentation-patches/review/{PREFIX}-adoption-2026-09-19.json'
SCOPE='Partial central optic chiasm interior only. Scope cuts and gaps are not anatomical outer boundaries. Optic nerves, optic tracts and optic radiation remain incomplete. Not expert-reviewed.'
digest=lambda b:hashlib.sha256(b).hexdigest()
serialized=lambda v:(json.dumps(v,ensure_ascii=False,indent=2)+'\n').encode()

def checked(path,sha):
    data=path.read_bytes()
    if digest(data)!=sha:raise ValueError('Evidence changed: '+str(path))
    return data

def labels(data):
    raw=gzip.decompress(data)
    if raw[:10]!=b'BBS1'+np.array([394,466,378],dtype='<u2').tobytes():raise ValueError('Unexpected grid')
    return np.frombuffer(raw,np.uint8,offset=10).reshape((394,466,378),order='F')

def replay(volume,points,reverse=False):
    if len(points)!=112:raise ValueError('Expected 112 points')
    result=volume.copy();seen=set()
    for p in points:
        xyz=p['xyz']
        if len(xyz)!=3 or any(type(v)!=int or not 0<=v<volume.shape[i] for i,v in enumerate(xyz)):raise ValueError('Invalid coordinate')
        k=tuple(xyz)
        if k in seen or p['before'] not in (0,33) or p['after']!=36:raise ValueError('Invalid transition')
        seen.add(k);old,new=(36,p['before']) if reverse else (p['before'],36)
        if result[k]!=old:raise ValueError('Conflicting voxel')
        result[k]=new
    return result

def plan():
    base=checked(STAGE/'before.bin.gz',BASE_SHA);data=checked(STAGE/'labels.bin.gz',AFTER_SHA)
    checked(ATLAS/'bigbrain-practical-segmentation-icbm500.bin.gz',BASE_SHA)
    r=json.loads(checked(STAGE/'repair.json','98c169281d78a9b9669075b3ab13b21e37aa97f90d9cdba0aae1442d5de89da8'))
    impact=json.loads(checked(STAGE/'block-impact.json','1caeff6ae7bb9aa1b5da8887cffe6d25fe303607680d41ec33a576e0db27fef2'))
    for p,sha in r['evidence'].items():checked(ROOT/p,sha)
    if impact['beforeSha256']!=BASE_SHA or impact['afterSha256']!=AFTER_SHA:raise ValueError('Wrong block inputs')
    if len(impact['blockMaskImpact'])!=55 or len(impact['fineMaskImpact'])!=4 or any(x['changed'] for x in impact['blockMaskImpact']+impact['fineMaskImpact']):raise ValueError('Unexpected block impact')
    before,after=labels(base),labels(data)
    if not np.array_equal(replay(before,r['points']),after) or not np.array_equal(replay(after,r['points'],True),before):raise ValueError('Stage not reversible')
    if np.count_nonzero(before!=after)!=112 or np.count_nonzero(before==36)!=0 or np.count_nonzero(after==36)!=112:raise ValueError('Unexpected change extent')
    writes=[];retained=[(ROOT/f'tests/fixtures/bigbrain-practical-segmentation-pre-{PREFIX}.bin.gz',base)]
    for p in sorted(ATLAS.glob('section-current-*.json')):
        meta=json.loads(p.read_bytes())
        if meta['sourceSha256']!=BASE_SHA:raise ValueError('Metadata source differs: '+p.name)
        groups=meta['meshes'] if 'meshes' in meta else {p.stem:meta}
        for name,m in groups.items():
            if not np.array_equal(np.isin(before,m['labelIds']),np.isin(after,m['labelIds'])):raise ValueError('Existing geometry changed: '+name)
            checked(ATLAS/(name+'.mesh'),m['sha256'])
        retained.append((ROOT/f'tests/fixtures/{p.stem}-pre-{PREFIX}.json',p.read_bytes()))
        meta['sourceSha256']=AFTER_SHA
        if 'rawVoxelSha256' in meta:meta['rawVoxelSha256']=digest(after.tobytes(order='F'))
        writes.append((p,serialized(meta)))
    mesh,info=reconstruct((after==36).transpose(2,1,0))
    if mesh!=(STAGE/'optic-central-partial.mesh').read_bytes() or info['componentSizes']!=[108,2,2]:raise ValueError('Mesh differs')
    compressed=gzip.compress(mesh,compresslevel=9,mtime=0)
    meta=dict(info,source='bigbrain-practical-segmentation-icbm500.bin.gz',sourceSha256=AFTER_SHA,labelIds=[36],labelVoxelCounts={'36':112},sourceSamplingMm=.5,displayOriginZYX=[-90.,-116.,-98.],method='native-image-reviewed central interior; marching cubes 0.5; no smoothing, filling or component removal',rawSha256=digest(mesh),rawBytes=len(mesh),sha256=digest(compressed),bytes=len(compressed),compression='gzip',expertReviewed=False,partialExtent=True,scope=SCOPE,reviewRecord=RECORD.relative_to(ROOT).as_posix())
    writes.extend([(ATLAS/'section-current-optic-chiasm-partial.mesh',compressed),(ATLAS/'section-current-optic-chiasm-partial.json',serialized(meta))])
    figures=[]
    report_path=ROOT/'work/optic-central-volume-20260919/orthogonal-v1/report.json';report=json.loads(report_path.read_bytes())
    for f in report['figures']:
        p=report_path.parent/f['file'];checked(p,f['sha256']);figures.append(dict(path=p.relative_to(ROOT).as_posix(),sha256=f['sha256']))
    if len(figures)!=49:raise ValueError('Expected 49 cross-resolution views')
    r.update(count=112,transition='mixed-optic-central-interior-partial',countsBefore={'33':int(np.count_nonzero(before==33)),'36':0},countsAfter={'33':int(np.count_nonzero(after==33)),'36':112},afterRawVoxelSha256=digest(after.tobytes(order='F')),status='AI-image-reviewed-project-adopted-development-only',adopted=True,installed=True,projectAdopted=True,published=False,partialExtent=True,limitation=SCOPE,primaryReview=dict(reviewer='AI project review, not independent expert review',approved=True,reviewedFigures=figures,rationale='Native40 coronal interior traced from raw images and checked with orthogonal native40/native100 views and a second-direction tissue support trace. No coordinate split of the whole old ID33.'),meshImpact=dict(blockMaskImpact=[dict(x,changedMaskVoxels=0,added=0,removed=0) for x in impact['blockMaskImpact']],fineMaskImpact=impact['fineMaskImpact']),independentSectionChanges=['section-current-optic-chiasm-partial.mesh'],integrationVerification='docs/OPTIC_CENTRAL112_INTEGRATION_2026-09-19.md')
    old_ventricles,old_assets=build_assets(base);new_ventricles,new_assets=build_assets(data)
    for name,payload in old_assets.items():
        if name.endswith('.mesh') and (payload!=new_assets[name] or payload!=(ATLAS/name).read_bytes()):raise ValueError('Ventricular geometry changed')
    r['sectionMeshImpact']=dict(before=old_ventricles,after=new_ventricles,changedFiles=[])
    r.pop('publicMutation',None)  # Work-stage flag is superseded by installed/published.
    record_bytes=serialized(r);retained.append((RECORD,record_bytes))
    validation_path=ATLAS/'bigbrain-practical-segmentation-icbm500-validation.json';v=json.loads(validation_path.read_bytes())
    if v['rawVoxelSha256']!=digest(before.tobytes(order='F')):raise ValueError('Validation baseline mismatch')
    v['rawVoxelSha256']=r['afterRawVoxelSha256'];v['labelCounts'].update(r['countsAfter']);v['labelNames']['36']='optic chiasm central region (partial image-reviewed interior)'
    for k in ['imageGuidedCandidateIds','projectReviewedPartialIds']:v[k]=sorted(set(v[k]+[36]))
    measurements=v['currentImageMeasurements']
    if measurements['sourceLabelSha256']!=BASE_SHA:raise ValueError('Measurement baseline mismatch')
    measurements.update(sourceLabelSha256=AFTER_SHA,rawVoxelSha256=r['afterRawVoxelSha256']);measurements['labelCounts'].update(r['countsAfter'])
    v['regionalBatchAudits'][PREFIX]=dict(record=RECORD.relative_to(ROOT).as_posix(),recordSha256=digest(record_bytes),changedVoxelCount=112,projectAdopted=True,expertReviewed=False,changedSectionMeshes=['section-current-optic-chiasm-partial.mesh'])
    retained.append((ROOT/f'tests/fixtures/section-current-fornix-body-partial-pre-{PREFIX}.mesh',(ATLAS/'section-current-fornix-body-partial.mesh').read_bytes()))
    for p,payload in retained:
        if p.exists() and p.read_bytes()!=payload:raise ValueError('Historical evidence conflict: '+str(p))
    return retained+writes+[(validation_path,serialized(v)),(ATLAS/'bigbrain-practical-segmentation-icbm500.bin.gz',data)]

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--apply',action='store_true');args=parser.parse_args();changes=plan()
    if args.apply:
        for p,data in changes:p.write_bytes(data)
    print(json.dumps(dict(preflightPassed=True,applied=args.apply,files=[p.relative_to(ROOT).as_posix() for p,_ in changes])))
