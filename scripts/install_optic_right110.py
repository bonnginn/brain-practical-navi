"""Integrate bilateral optic interior thickness and synchronize the legacy mesh."""
import argparse
import gzip
import hashlib
import json
from pathlib import Path
import numpy as np
from install_optic_central112 import labels
from build_section_ventricle_meshes import build_assets, reconstruct
from build_section_structure_meshes import encode_mesh, voxel_surface

ROOT=Path(__file__).resolve().parents[1]
ATLAS=ROOT/'public/atlas'
STAGE=ROOT/'work/optic-right-posterior-stage-20260920'
BASE='d031beb339367fa10887bc98795f3252f6227cf5ff2612f3a56ddc429eb79b93'
AFTER='709afea6d99ddda15670bd1c92f4a5c076b203a417f55f8dd1e47675c956c212'
PREFIX='optic-right110'
RECORD=ROOT/f'segmentation-patches/review/{PREFIX}-adoption-2026-09-20.json'
sha=lambda b:hashlib.sha256(b).hexdigest()
encode=lambda v:(json.dumps(v,ensure_ascii=False,indent=2)+'\n').encode()

def plan():
    base=(STAGE/'before.bin.gz').read_bytes();data=(STAGE/'labels.bin.gz').read_bytes()
    assert sha(base)==BASE and sha(data)==AFTER
    assert (ATLAS/'bigbrain-practical-segmentation-icbm500.bin.gz').read_bytes()==base
    r=json.loads((STAGE/'repair.json').read_bytes());assert len(r['points'])==110
    before,after=labels(base),labels(data);forward=before.copy();reverse=after.copy();seen=set()
    for p in r['points']:
        k=tuple(p['xyz']);assert k not in seen and (p['before'],p['after']) in ((0,37),(33,37),(0,38),(33,38))
        seen.add(k);assert before[k]==p['before'] and after[k]==p['after']
        forward[k]=p['after'];reverse[k]=p['before']
    assert np.array_equal(forward,after) and np.array_equal(reverse,before)
    assert r['countsAfter']=={'33': 6775, '37': 813, '38': 854}
    impact=json.loads((STAGE/'block-impact.json').read_bytes())
    assert impact['beforeSha256']==BASE and impact['afterSha256']==AFTER
    assert len(impact['blockMaskImpact'])==55 and len(impact['fineMaskImpact'])==4
    assert not any(x['changed'] for x in impact['blockMaskImpact']+impact['fineMaskImpact'])
    for row in impact['blockMaskImpact']:row.update(changedMaskVoxels=0,added=0,removed=0)
    writes=[]
    def retain(p,b):
        assert not p.exists() or p.read_bytes()==b,str(p)
        writes.append((p,b))
    retain(ROOT/f'tests/fixtures/bigbrain-practical-segmentation-pre-{PREFIX}.bin.gz',base)
    oldreport,oldassets=build_assets(base);newreport,newassets=build_assets(data)
    changed=[]
    for name,b in oldassets.items():
        if name.endswith('.mesh'):
            assert (ATLAS/name).read_bytes()==b,name
            if b!=newassets[name]:
                changed.append(name);retain(ROOT/f'tests/fixtures/{name[:-5]}-pre-{PREFIX}.mesh',b)
    assert not changed
    writes.extend((ATLAS/n,b) for n,b in newassets.items())
    for p in sorted(ATLAS.glob('section-current-*.json')):
        if p.name=='section-current-ventricles.json':continue
        meta=json.loads(p.read_bytes());assert meta['sourceSha256']==BASE,p.name
        if p.name=='section-current-optic-tracts-partial.json':
            oldmesh,_=reconstruct(np.isin(before,(37,38)).transpose(2,1,0))
            assert gzip.decompress((ATLAS/'section-current-optic-tracts-partial.mesh').read_bytes())==oldmesh
            retain(ROOT/f'tests/fixtures/section-current-optic-tracts-partial-pre-{PREFIX}.mesh',(ATLAS/'section-current-optic-tracts-partial.mesh').read_bytes())
            mesh,info=reconstruct(np.isin(after,(37,38)).transpose(2,1,0));compressed=gzip.compress(mesh,compresslevel=9,mtime=0)
            assert info['voxels']==1667 and info['componentSizes']==[854,810,3]
            meta.update(info,rawSha256=sha(mesh),rawBytes=len(mesh),sha256=sha(compressed),bytes=len(compressed),labelVoxelCounts={'37':813,'38':854},scope='Partial bilateral optic tracts, with right posterior continuation traced from the same specimen. The right tract and combined chiasm/tract labels are continuous. Approximate 0.5 mm boundaries include partial volume. LGN continuity and optic radiations remain incomplete. Not expert-reviewed.',reviewRecord=RECORD.relative_to(ROOT).as_posix())
            writes.append((ATLAS/'section-current-optic-tracts-partial.mesh',compressed))
        else:
            groups=meta['meshes'] if 'meshes' in meta else {p.stem:meta}
            for name,m in groups.items():
                assert np.array_equal(np.isin(before,m['labelIds']),np.isin(after,m['labelIds'])),name
                assert sha((ATLAS/(name+'.mesh')).read_bytes())==m['sha256'],name
        meta['sourceSha256']=AFTER
        if 'rawVoxelSha256' in meta:meta['rawVoxelSha256']=r['afterRawVoxelSha256']
        writes.append((p,encode(meta)))
    legacy_path=ATLAS/'section-optic-chiasm.mesh'
    oldlegacy=legacy_path.read_bytes()
    retain(STAGE/'legacy-before.mesh',oldlegacy)
    newlegacy=encode_mesh(voxel_surface((after==33).transpose(2,1,0)[::2,::2,::2]))
    writes.append((legacy_path,newlegacy))
    r['legacyMeshImpact']=dict(beforeSha256=sha(oldlegacy),afterSha256=sha(newlegacy),note='Regenerated after fifteen source-reviewed ID33 cells were reassigned to the right optic tract.')
    evidence={p:sha((ROOT/p).read_bytes()) for p in r['evidence']}
    assert evidence==r['evidence'], 'Staged image evidence changed'
    r.update(status='AI-image-reviewed-project-adopted-development-only',adopted=True,installed=True,
        projectAdopted=True,published=False,transition='0/33->38',expertReviewed=False,evidence=evidence,
        meshImpact=impact,sectionMeshImpact=dict(before=oldreport,after=newreport,changedFiles=changed),
        independentSectionChanges=['section-current-optic-tracts-partial.mesh','section-optic-chiasm.mesh'],
        limitation='The combined chiasm/tract component is continuous; full outer boundaries, LGN continuity and optic radiations remain incomplete. Tissue-centre sampling includes edge partial volume. Not expert-reviewed.',
        primaryReview=dict(reviewer='AI project image review',approved=True,
            rationale='Nine native40 raw/footprint views support the previously traced right posterior envelope at Y42..117. Approximate centre sampling permits edge partial volume; app [230,252,122] is excluded after a source crop confirms its centre in a fissure. Existing small right components join through source-supported tissue, without artificial bridging or deletion. ID33 reassignment is source-reviewed, not based only on side or coordinates.'),
        integrationVerification='docs/OPTIC_RIGHT110_INTEGRATION_2026-09-20.md')
    
    figures=[]
    for rel in ['work/optic-right-posterior-20260920/footprints/report.json']:
        rp=ROOT/rel
        for f in json.loads(rp.read_bytes())['figures']:
            fp=rp.parent/f['file'];assert sha(fp.read_bytes())==f['sha256']
            figures.append(dict(path=fp.relative_to(ROOT).as_posix(),sha256=f['sha256']))
    assert len(figures)==9
    r['primaryReview']['reviewedFigures']=figures
    record=encode(r);retain(RECORD,record)
    p=ATLAS/'bigbrain-practical-segmentation-icbm500-validation.json';v=json.loads(p.read_bytes())
    assert v['rawVoxelSha256']==sha(before.tobytes(order='F'))
    v['rawVoxelSha256']=r['afterRawVoxelSha256'];v['labelCounts'].update(r['countsAfter'])
    m=v['currentImageMeasurements'];assert m['sourceLabelSha256']==BASE
    m.update(sourceLabelSha256=AFTER,rawVoxelSha256=r['afterRawVoxelSha256']);m['labelCounts'].update(r['countsAfter'])
    v['regionalBatchAudits'][PREFIX]=dict(record=RECORD.relative_to(ROOT).as_posix(),recordSha256=sha(record),changedVoxelCount=110,
        projectAdopted=True,expertReviewed=False,changedSectionMeshes=changed+r['independentSectionChanges'])
    writes.extend([(p,encode(v)),(ATLAS/'bigbrain-practical-segmentation-icbm500.bin.gz',data)])
    return writes

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--apply',action='store_true');args=parser.parse_args()
    writes=plan()
    if args.apply:
        for p,b in writes:p.write_bytes(b)
    print(json.dumps(dict(applied=args.apply,changedVoxels=110,files=len(writes),blockGeometryChanged=False)))
