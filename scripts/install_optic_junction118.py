"""Integrate source-traced chiasm/tract junction and synchronize the three labels."""
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
STAGE=ROOT/'work/optic-junction118-stage-20260920'
BASE='601374e1bb8669831c882721e3f3edbef42a57230f23aab81496da32c4fde88c'
AFTER='ef5cc35efec2d67663b9047c706649c60110f7e83c52a8066d6dfaa238335840'
PREFIX='optic-junction118'
RECORD=ROOT/f'segmentation-patches/review/{PREFIX}-adoption-2026-09-20.json'
sha=lambda b:hashlib.sha256(b).hexdigest()
encode=lambda v:(json.dumps(v,ensure_ascii=False,indent=2)+'\n').encode()

def plan():
    base=(STAGE/'before.bin.gz').read_bytes();data=(STAGE/'labels.bin.gz').read_bytes()
    assert sha(base)==BASE and sha(data)==AFTER
    assert (ATLAS/'bigbrain-practical-segmentation-icbm500.bin.gz').read_bytes()==base
    r=json.loads((STAGE/'repair.json').read_bytes());assert len(r['points'])==118
    r['beforeSha256']=BASE
    before,after=labels(base),labels(data);forward=before.copy();reverse=after.copy();seen=set()
    for p in r['points']:
        k=tuple(p['xyz']);assert k not in seen and (p['before'],p['after']) in ((0,36),(33,36),(0,37),(33,37),(0,38),(33,38))
        seen.add(k);assert before[k]==p['before'] and after[k]==p['after']
        forward[k]=p['after'];reverse[k]=p['before']
    assert np.array_equal(forward,after) and np.array_equal(reverse,before)
    assert r['countsAfter']=={'33':6790,'36':405,'37':813,'38':744}
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
        if p.name in ('section-current-optic-tracts-partial.json','section-current-optic-chiasm-partial.json'):
            ids=(37,38) if 'tracts' in p.name else (36,)
            name=p.stem+'.mesh'
            oldmesh,_=reconstruct(np.isin(before,ids).transpose(2,1,0))
            assert gzip.decompress((ATLAS/name).read_bytes())==oldmesh
            retain(ROOT/f'tests/fixtures/{p.stem}-pre-{PREFIX}.mesh',(ATLAS/name).read_bytes())
            mesh,info=reconstruct(np.isin(after,ids).transpose(2,1,0));compressed=gzip.compress(mesh,compresslevel=9,mtime=0)
            assert info['voxels']==sum(r['countsAfter'][str(i)] for i in ids)
            meta.update(info,rawSha256=sha(mesh),rawBytes=len(mesh),sha256=sha(compressed),bytes=len(compressed),labelVoxelCounts={str(i):r['countsAfter'][str(i)] for i in ids},scope='Source-traced partial chiasm and bilateral optic tracts meet across an operational teaching naming plane at native40 Y275. Approximate 0.5 mm tissue-centre sampling includes edge partial volume. The combined major component is continuous; individual fibers and full chiasm/tract boundaries, LGN continuity and optic radiations are not established. Not expert-reviewed.',reviewRecord=RECORD.relative_to(ROOT).as_posix())
            writes.append((ATLAS/name,compressed))
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
    r['legacyMeshImpact']=dict(beforeSha256=sha(oldlegacy),afterSha256=sha(newlegacy),note='Regenerated from current ID33 after source-traced proximal tract reclassification.')
    evidence={p:sha((ROOT/p).read_bytes()) for p in r['evidence']}
    assert evidence==r['evidence'], 'Staged image evidence changed'
    r.update(status='AI-image-reviewed-project-adopted-development-only',adopted=True,installed=True,
        projectAdopted=True,published=False,transition='0/33->36/37/38',evidence=evidence,
        meshImpact=impact,sectionMeshImpact=dict(before=oldreport,after=newreport,changedFiles=changed),
        independentSectionChanges=['section-current-optic-tracts-partial.mesh','section-current-optic-chiasm-partial.mesh','section-optic-chiasm.mesh'],
        limitation='Partial chiasm and both optic tracts now share one major component; full outer boundaries, LGN continuity and optic radiations remain incomplete. The native40 Y275 naming plane is an operational teaching convention, not a proven fiber boundary. Tissue-centre sampling includes edge partial volume. Not expert-reviewed.',
        primaryReview=dict(reviewer='AI project image review',approved=True,
            rationale='Six native40 raw/footprint views support side bands at Y265..275 and the central transverse band at Y275..280. Existing wide source images show the transition from separate ventral bands to an intact transverse band. Y275 is the project naming convention, informed by the documented CMA chiasm-to-two-tracts criterion, not a histological border. Centre sampling allows partial-volume edges; inferior specimen defects are not filled. Legacy ID33 cells are assigned from source-image evidence, not coordinates alone. No gap filling or removal of existing components.'),
        integrationVerification='docs/OPTIC_JUNCTION118_INTEGRATION_2026-09-20.md')
    
    figures=[]
    for rel in ['work/optic-junction-20260920/footprints/report.json']:
        rp=ROOT/rel
        for f in json.loads(rp.read_bytes())['figures']:
            fp=rp.parent/f['file'];assert sha(fp.read_bytes())==f['sha256']
            figures.append(dict(path=fp.relative_to(ROOT).as_posix(),sha256=f['sha256']))
    assert len(figures)==6
    r['primaryReview']['reviewedFigures']=figures
    record=encode(r);retain(RECORD,record)
    p=ATLAS/'bigbrain-practical-segmentation-icbm500-validation.json';v=json.loads(p.read_bytes())
    assert v['rawVoxelSha256']==sha(before.tobytes(order='F'))
    v['rawVoxelSha256']=r['afterRawVoxelSha256'];v['labelCounts'].update(r['countsAfter'])
    m=v['currentImageMeasurements'];assert m['sourceLabelSha256']==BASE
    m.update(sourceLabelSha256=AFTER,rawVoxelSha256=r['afterRawVoxelSha256']);m['labelCounts'].update(r['countsAfter'])
    v['regionalBatchAudits'][PREFIX]=dict(record=RECORD.relative_to(ROOT).as_posix(),recordSha256=sha(record),changedVoxelCount=118,
        projectAdopted=True,expertReviewed=False,changedSectionMeshes=changed+r['independentSectionChanges'])
    writes.extend([(p,encode(v)),(ATLAS/'bigbrain-practical-segmentation-icbm500.bin.gz',data)])
    return writes

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--apply',action='store_true');args=parser.parse_args()
    writes=plan()
    if args.apply:
        for p,b in writes:p.write_bytes(b)
    print(json.dumps(dict(applied=args.apply,changedVoxels=118,files=len(writes),blockGeometryChanged=False)))
