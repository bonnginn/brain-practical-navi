"""Install image-reviewed short bilateral optic tract interiors, preserving the baseline."""
import argparse
import copy
import gzip
import hashlib
import json
from pathlib import Path
import numpy as np
from install_optic_central112 import labels
from build_section_ventricle_meshes import reconstruct
from build_section_structure_meshes import encode_mesh, voxel_surface

ROOT=Path(__file__).resolve().parents[1]
ATLAS=ROOT/'public/atlas'
STAGE=ROOT/'work/optic-tract-interior-20260919/stage-v1'
BASE='d3eaa45d8e2e43416dfc931f4a720da203131f7e579a320c3f51c9f8069c7056'
AFTER='32bb0113dd207ce2644136723c798061b4366bbd47cb800b0ae9884972eadf1c'
RECORD=ROOT/'segmentation-patches/review/optic-tract77-adoption-2026-09-19.json'
sha=lambda b:hashlib.sha256(b).hexdigest()
encode=lambda v:(json.dumps(v,ensure_ascii=False,indent=2)+'\n').encode()

def plan():
    base=(STAGE/'before.bin.gz').read_bytes();data=(STAGE/'labels.bin.gz').read_bytes()
    assert sha(base)==BASE and sha(data)==AFTER
    assert (ATLAS/'bigbrain-practical-segmentation-icbm500.bin.gz').read_bytes()==base
    r=json.loads((STAGE/'repair.json').read_bytes())
    assert r['beforeSha256']==BASE and r['afterSha256']==AFTER and len(r['points'])==77
    for p,h in r['evidence'].items():assert sha((ROOT/p).read_bytes())==h,p
    before,after=labels(base),labels(data);forward=before.copy();reverse=after.copy();seen=set()
    for p in r['points']:
        k=tuple(p['xyz']);assert k not in seen and p['before'] in (0,33) and p['after'] in (37,38)
        seen.add(k);assert before[k]==p['before'] and after[k]==p['after']
        forward[k]=p['after'];reverse[k]=p['before']
    assert np.array_equal(forward,after) and np.array_equal(reverse,before)
    assert r['countsAfter']=={'33':8323,'37':38,'38':39}
    impact=json.loads((STAGE/'block-impact.json').read_bytes())
    assert impact['beforeSha256']==BASE and impact['afterSha256']==AFTER
    assert not any(x['changed'] for x in impact['blockMaskImpact']+impact['fineMaskImpact'])
    writes=[]
    def retain(p,b):
        assert not p.exists() or p.read_bytes()==b,str(p)
        writes.append((p,b))
    retain(ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-optic-tract77.bin.gz',base)
    for p in sorted(ATLAS.glob('section-current-*.json')):
        meta=json.loads(p.read_bytes());assert meta['sourceSha256']==BASE,p.name
        groups=meta['meshes'] if 'meshes' in meta else {p.stem:meta}
        for name,m in groups.items():
            assert not set(m['labelIds']).intersection((0,33,37,38)),name
            assert sha((ATLAS/(name+'.mesh')).read_bytes())==m['sha256'],name
        if p.stem=='section-current-optic-chiasm-partial':
            retain(ROOT/'tests/fixtures/section-current-optic-chiasm-partial-pre-optic-tract77.json',p.read_bytes())
        meta['sourceSha256']=AFTER
        if 'rawVoxelSha256' in meta:meta['rawVoxelSha256']=r['afterRawVoxelSha256']
        writes.append((p,encode(meta)))
    mesh,info=reconstruct(np.isin(after,(37,38)).transpose(2,1,0))
    assert mesh==(STAGE/'optic-tracts-partial.mesh').read_bytes()
    assert info['componentSizes']==[37,36,1,1,1,1]
    compressed=gzip.compress(mesh,compresslevel=9,mtime=0)
    meta=dict(info,source='bigbrain-practical-segmentation-icbm500.bin.gz',sourceSha256=AFTER,
        labelIds=[37,38],labelVoxelCounts={'37':38,'38':39},sourceSamplingMm=.5,
        displayOriginZYX=[-90.,-116.,-98.],method='native-image-reviewed short interior portions; marching cubes 0.5; no smoothing, filling or component removal',
        rawSha256=sha(mesh),rawBytes=len(mesh),sha256=sha(compressed),bytes=len(compressed),compression='gzip',
        expertReviewed=False,partialExtent=True,scope=r['scope'],reviewRecord=RECORD.relative_to(ROOT).as_posix())
    writes.extend([(ATLAS/'section-current-optic-tracts-partial.mesh',compressed),(ATLAS/'section-current-optic-tracts-partial.json',encode(meta))])
    oldlegacy=(ATLAS/'section-optic-chiasm.mesh').read_bytes()
    retain(STAGE/'legacy-before.mesh',oldlegacy)
    legacy=encode_mesh(voxel_surface((after==33).transpose(2,1,0)[::2,::2,::2]))
    writes.append((ATLAS/'section-optic-chiasm.mesh',legacy))
    figures=[]
    for folder in ['orthogonal-v1','native100-v1']:
        reportpath=STAGE.parent/folder/'report.json'
        for f in json.loads(reportpath.read_bytes())['figures']:
            p=reportpath.parent/f['file'];assert sha(p.read_bytes())==f['sha256']
            figures.append(dict(path=p.relative_to(ROOT).as_posix(),sha256=f['sha256']))
    assert len(figures)==22
    r.update(status='AI-image-reviewed-project-adopted-development-only',adopted=True,installed=True,
        projectAdopted=True,published=False,partialExtent=True,
        transition='mixed-optic-bilateral-tract-interiors-partial',limitation=r['scope'],
        primaryReview=dict(reviewer='AI project review, not independent expert review',approved=True,reviewedFigures=figures,
            rationale='Source-traced coronal tissue interiors checked in sagittal/horizontal native40 views and native100 coronal views. Anatomical location compared with EPTN optic tract landmarks; old ID33 was not split by side or coordinates alone.'),
        meshImpact=impact,independentSectionChanges=['section-current-optic-tracts-partial.mesh','section-optic-chiasm.mesh'],
        legacyMeshImpact=dict(beforeSha256=sha(oldlegacy),afterSha256=sha(legacy)),
        integrationVerification='docs/OPTIC_TRACT77_INTEGRATION_2026-09-19.md')
    previous=json.loads((ROOT/'segmentation-patches/review/optic-central112-adoption-2026-09-19.json').read_bytes())['sectionMeshImpact']['after']
    current=copy.deepcopy(previous)
    current.update(sourceSha256=AFTER,rawVoxelSha256=r['afterRawVoxelSha256'])
    r['sectionMeshImpact']=dict(before=previous,after=current,changedFiles=[])
    for row in r['meshImpact']['blockMaskImpact']:row.update(changedMaskVoxels=0,added=0,removed=0)
    record=encode(r);retain(RECORD,record)
    p=ATLAS/'bigbrain-practical-segmentation-icbm500-validation.json';v=json.loads(p.read_bytes())
    assert v['rawVoxelSha256']==sha(before.tobytes(order='F'))
    v['rawVoxelSha256']=r['afterRawVoxelSha256'];v['labelCounts'].update(r['countsAfter'])
    v['labelNames'].update({'37':'left optic tract (partial image-reviewed interior)','38':'right optic tract (partial image-reviewed interior)'})
    for k in ['imageGuidedCandidateIds','projectReviewedPartialIds']:v[k]=sorted(set(v[k]+[37,38]))
    m=v['currentImageMeasurements'];assert m['sourceLabelSha256']==BASE
    m.update(sourceLabelSha256=AFTER,rawVoxelSha256=r['afterRawVoxelSha256']);m['labelCounts'].update(r['countsAfter'])
    v['regionalBatchAudits']['optic-tract77']=dict(record=RECORD.relative_to(ROOT).as_posix(),recordSha256=sha(record),changedVoxelCount=77,
        projectAdopted=True,expertReviewed=False,changedSectionMeshes=r['independentSectionChanges'])
    writes.extend([(p,encode(v)),(ATLAS/'bigbrain-practical-segmentation-icbm500.bin.gz',data)])
    return writes

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--apply',action='store_true');args=parser.parse_args()
    changes=plan()
    if args.apply:
        for p,b in changes:p.write_bytes(b)
    print(json.dumps(dict(applied=args.apply,changedVoxels=77,files=len(changes),existingBlockGeometryChanged=False)))
