"""Integrate bilateral crural interiors with approximate teaching boundaries."""
import argparse
import gzip
import hashlib
import json
from pathlib import Path
import numpy as np
from install_optic_central112 import labels
from build_section_ventricle_meshes import build_assets, reconstruct

ROOT=Path(__file__).resolve().parents[1]
ATLAS=ROOT/'public/atlas'
STAGE=ROOT/'work/fornix-transition-stage-20260920'
BASE='e0c294dfd1dc5a706d44631ced417914ebb71cc9a571d762659fdd1f4f452558'
AFTER='9c9385a2aa45eee270df2da65ef71c21b4dd2c18d1501b781cc3a3bb1d9cc00d'
PREFIX='fornix-transition347'
RECORD=ROOT/f'segmentation-patches/review/{PREFIX}-adoption-2026-09-20.json'
sha=lambda b:hashlib.sha256(b).hexdigest()
encode=lambda v:(json.dumps(v,ensure_ascii=False,indent=2)+'\n').encode()

def plan():
    base=(STAGE/'before.bin.gz').read_bytes();data=(STAGE/'labels.bin.gz').read_bytes()
    assert sha(base)==BASE and sha(data)==AFTER
    assert (ATLAS/'bigbrain-practical-segmentation-icbm500.bin.gz').read_bytes()==base
    r=json.loads((STAGE/'repair.json').read_bytes());assert len(r['points'])==347
    before,after=labels(base),labels(data);forward=before.copy();reverse=after.copy();seen=set()
    for p in r['points']:
        k=tuple(p['xyz']);assert k not in seen and (p['before'],p['after']) in ((0,46),)
        seen.add(k);assert before[k]==p['before'] and after[k]==p['after']
        forward[k]=p['after'];reverse[k]=p['before']
    assert np.array_equal(forward,after) and np.array_equal(reverse,before)
    assert r['countsAfter']=={'46':3193}
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
        if p.name=='section-current-fornix-body-partial.json':
            oldmesh,_=reconstruct((before==46).transpose(2,1,0))
            assert gzip.decompress((ATLAS/'section-current-fornix-body-partial.mesh').read_bytes())==oldmesh
            retain(ROOT/f'tests/fixtures/section-current-fornix-body-partial-pre-{PREFIX}.mesh',(ATLAS/'section-current-fornix-body-partial.mesh').read_bytes())
            mesh,info=reconstruct((after==46).transpose(2,1,0));compressed=gzip.compress(mesh,compresslevel=9,mtime=0)
            assert info['voxels']==3193 and info['componentSizes']==[1628,1565]
            meta.update(info,rawSha256=sha(mesh),rawBytes=len(mesh),sha256=sha(compressed),bytes=len(compressed),labelVoxelCounts={'46':3193},scope='Partial body, upper columns and bilateral posterior/crural interiors on a 0.5 mm teaching grid. Approximate cell edges include partial volume. Both posterior intervals now continue to the body/upper-column portions; full fimbria, lower columns and mammillary continuity remain incomplete. Not expert-reviewed.',reviewRecord=RECORD.relative_to(ROOT).as_posix())
            writes.append((ATLAS/'section-current-fornix-body-partial.mesh',compressed))
        else:
            groups=meta['meshes'] if 'meshes' in meta else {p.stem:meta}
            for name,m in groups.items():
                assert not set(m['labelIds']).intersection((46,)),name
                assert sha((ATLAS/(name+'.mesh')).read_bytes())==m['sha256'],name
        meta['sourceSha256']=AFTER
        if 'rawVoxelSha256' in meta:meta['rawVoxelSha256']=r['afterRawVoxelSha256']
        writes.append((p,encode(meta)))
    evidence={p:sha((ROOT/p).read_bytes()) for p in r['evidence']}
    assert evidence==r['evidence'], 'Staged image evidence changed'
    r.update(status='AI-image-reviewed-project-adopted-development-only',adopted=True,installed=True,
        projectAdopted=True,published=False,transition='0->46',evidence=evidence,
        meshImpact=impact,sectionMeshImpact=dict(before=oldreport,after=newreport,changedFiles=changed),
        independentSectionChanges=['section-current-fornix-body-partial.mesh'],
        limitation='Fornix remains partial: bilateral crural/posterior interiors, body and upper columns. Both posterior portions continue to the body; full fimbria and mammillary continuity remain unrecorded. Boundaries are approximate. Not expert-reviewed.',
        primaryReview=dict(reviewer='AI project image review',approved=True,
            rationale='Existing same-specimen native100 Y730..780 interior contours were sampled at tissue centres and inspected in eleven orthogonal footprint views. Historical six fissure holds and two new bright/edge uncertainties remain excluded; eleven tiny pieces are held. Both posterior portions join the existing body/column regions without morphological gap filling. This demonstrates label continuity within the reviewed extent, not a complete fornix or microscopic tract boundary.'),
        integrationVerification='docs/FORNIX_TRANSITION347_INTEGRATION_2026-09-20.md')
    
    rp=ROOT/'work/fornix-crura-context-20260919/center-footprints-v2/report.json'
    figures=[]
    for f in json.loads(rp.read_bytes())['figures']:
        fp=rp.parent/f['file'];assert sha(fp.read_bytes())==f['sha256']
        figures.append(dict(path=fp.relative_to(ROOT).as_posix(),sha256=f['sha256']))
    assert len(figures)==11
    r['primaryReview']['reviewedFigures']=figures
    record=encode(r);retain(RECORD,record)
    p=ATLAS/'bigbrain-practical-segmentation-icbm500-validation.json';v=json.loads(p.read_bytes())
    assert v['rawVoxelSha256']==sha(before.tobytes(order='F'))
    v['rawVoxelSha256']=r['afterRawVoxelSha256'];v['labelCounts'].update(r['countsAfter'])
    m=v['currentImageMeasurements'];assert m['sourceLabelSha256']==BASE
    m.update(sourceLabelSha256=AFTER,rawVoxelSha256=r['afterRawVoxelSha256']);m['labelCounts'].update(r['countsAfter'])
    v['regionalBatchAudits'][PREFIX]=dict(record=RECORD.relative_to(ROOT).as_posix(),recordSha256=sha(record),changedVoxelCount=347,
        projectAdopted=True,expertReviewed=False,changedSectionMeshes=changed+r['independentSectionChanges'])
    writes.extend([(p,encode(v)),(ATLAS/'bigbrain-practical-segmentation-icbm500.bin.gz',data)])
    return writes

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--apply',action='store_true');args=parser.parse_args()
    writes=plan()
    if args.apply:
        for p,b in writes:p.write_bytes(b)
    print(json.dumps(dict(applied=args.apply,changedVoxels=347,files=len(writes),blockGeometryChanged=False)))
