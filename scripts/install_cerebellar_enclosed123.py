"""Preflight/install the image-reviewed 2026-10-01 cerebellar enclosed-region tissue subset."""
import argparse, gzip, hashlib, json, struct
from pathlib import Path
import numpy as np
import build_specimen_blocks as blocks
from build_section_ventricle_meshes import reconstruct

ROOT=Path(__file__).resolve().parents[1]
ATLAS=ROOT/'public/atlas'
STAGE=ROOT/'work/cerebellar-enclosed123-stage-2026-10-01'
BASE='cf4e1217db8ee33830c73164d3be40eca2bcb27ca1159714fa6fb66cb8bf95d0'
AFTER='a97b1a3bd06b1f28cb6569bd49d5dd41b49784715d1ce5d28fe52b31d8b01f65'
RECORD=ROOT/'segmentation-patches/review/cerebellar-enclosed123-adoption-2026-10-01.json'
sha=lambda b:hashlib.sha256(b).hexdigest()
encode=lambda r:(json.dumps(r,ensure_ascii=False,indent=2)+'\n').encode()

def labels(data):
    raw=gzip.decompress(data)
    assert raw[:4]==b'BBS1'
    return np.frombuffer(raw,np.uint8,offset=10).reshape(struct.unpack_from('<3H',raw,4),order='F')

def plan():
    source=ATLAS/'bigbrain-practical-segmentation-icbm500.bin.gz'
    base=(STAGE/'before.bin.gz').read_bytes();data=(STAGE/'labels.bin.gz').read_bytes()
    assert sha(base)==BASE and sha(data)==AFTER and source.read_bytes()==base
    before,after=labels(base),labels(data)
    r=json.loads((STAGE/'repair.json').read_bytes())
    assert r['beforeSha256']==BASE and r['afterSha256']==AFTER and r['count']==123
    forward=before.copy();reverse=after.copy();seen=set()
    for p in r['points']:
        k=tuple(p['xyz']);assert k not in seen and p['before']==0 and p['after'] in (28,29)
        seen.add(k);assert before[k]==0 and after[k]==p['after']
        forward[k]=p['after'];reverse[k]=0
    assert len(seen)==123 and np.array_equal(forward,after) and np.array_equal(reverse,before)
    assert sha(after.tobytes(order='F'))==r['afterRawVoxelSha256']
    for path,digest in r['evidence'].items():assert sha((ROOT/path).read_bytes())==digest
    assert len(r['evidence'])==21
    writes=[]
    ventricular_before=json.loads((ATLAS/'section-current-ventricles.json').read_bytes())
    ventricular_after={**ventricular_before,'sourceSha256':AFTER,'rawVoxelSha256':r['afterRawVoxelSha256']}
    def retain(path,payload):
        assert not path.exists() or path.read_bytes()==payload,str(path)
        writes.append((path,payload))
    retain(ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-cerebellar-enclosed123.bin.gz',base)
    # Reproduce the installed full-resolution surface before changing it.
    stem='section-current-cerebellum'
    oldmesh,oldinfo=reconstruct(np.isin(before,(28,29)).transpose(2,1,0))
    mesh,info=reconstruct(np.isin(after,(28,29)).transpose(2,1,0))
    installed=(ATLAS/(stem+'.mesh')).read_bytes()
    assert gzip.decompress(installed)==oldmesh
    assert info['components6']<=oldinfo['components6']
    stored=blocks.deterministic_gzip(mesh)
    retain(ROOT/f'tests/fixtures/{stem}-pre-cerebellar-enclosed123.mesh',installed)
    meta=json.loads((ATLAS/(stem+'.json')).read_bytes())
    meta.update(info,sourceSha256=AFTER,rawSha256=sha(mesh),storedSha256=sha(stored),
                rawBytes=len(mesh),storedBytes=len(stored),sha256=sha(stored),bytes=len(stored),
                labelVoxelCounts={str(i):r['countsAfter'][str(i)] for i in (28,29)},
                reviewRecord=RECORD.relative_to(ROOT).as_posix())
    writes.extend([(ATLAS/(stem+'.mesh'),stored),(ATLAS/(stem+'.json'),encode(meta))])
    # All other current section meshes contain unchanged labels; verify bytes and advance provenance.
    for path in sorted(ATLAS.glob('section-current-*.json')):
        if path.name==stem+'.json':continue
        m=json.loads(path.read_bytes());assert m['sourceSha256']==BASE,path
        groups=m.get('meshes',{path.stem:m})
        for name,g in groups.items():
            assert not set(g['labelIds']) & {28,29},name
            assert sha((ATLAS/(name+'.mesh')).read_bytes())==g['sha256'],name
        m['sourceSha256']=AFTER
        if 'rawVoxelSha256' in m:m['rawVoxelSha256']=r['afterRawVoxelSha256']
        writes.append((path,encode(m)))
    # Compare masks once; rebuild only actually affected block parts.
    raw,_=blocks.read_volume(blocks.BIGBRAIN,b'BBV1')
    values=raw[::2,::2,::2]
    b=before.transpose(2,1,0);a=after.transpose(2,1,0)
    olddefs=blocks.specimen_definitions(values,b[::2,::2,::2])
    newdefs=blocks.specimen_definitions(values,a[::2,::2,::2])
    manifest=json.loads((ATLAS/'specimen-blocks.json').read_bytes())
    generated=STAGE/'meshes';generated.mkdir(exist_ok=True)
    impact=[]
    for block,parts in olddefs.items():
        for old in parts:
            new=next(p for p in newdefs[block] if p.key==old.key)
            changed=int(np.count_nonzero(old.mask!=new.mask))
            row=dict(block=block,part=old.key,changedMaskVoxels=changed,
                     added=int((new.mask&~old.mask).sum()),removed=int((old.mask&~new.mask).sum()));impact.append(row)
            fine=blocks.FINE_CAVITY_PARTS.get((block,old.key))
            if fine:
                assert np.array_equal(blocks.fine_cavity_mask(b,*fine),blocks.fine_cavity_mask(a,*fine))
            if not changed:continue
            assert not fine and (block,old.key)==('hindbrain','cerebellum')
            entry=next(p for p in manifest['specimens'][block] if p['part']==old.key)
            name=entry['file'][:-5]
            blocks.write_mesh(name,blocks.mesh_from_mask(old.mask,values,old.material=='specimen'),generated)
            oldbytes=(generated/(name+'.mesh')).read_bytes()
            assert oldbytes==(ATLAS/(name+'.mesh')).read_bytes()
            newinfo=blocks.write_mesh(name,blocks.mesh_from_mask(new.mask,values,new.material=='specimen'),generated)
            newbytes=(generated/(name+'.mesh')).read_bytes()
            retain(ROOT/f'tests/fixtures/{name}-pre-cerebellar-enclosed123.mesh',oldbytes)
            writes.append((ATLAS/(name+'.mesh'),newbytes))
            entry.update(newinfo,segmentationSourceSha256=AFTER)
            row.update(file=name+'.mesh',beforeSha256=sha(oldbytes),afterSha256=sha(newbytes),
                       reproducedBeforeSha256=sha(oldbytes),beforeMatches=True)
    writes.append((ATLAS/'specimen-blocks.json',encode(manifest)))
    # Opaque teaching preparations use raw tissue minus ventricles; their
    # exposed-colour IDs do not include the two cerebellar IDs changed here.
    teaching_path=ROOT/'app/teachingSpecimens.json'
    teaching=json.loads(teaching_path.read_bytes());assert teaching['sourceLabelSha256']==BASE
    for specimen in teaching['specimens'].values():
        for part in specimen['parts']:
            assert not set(part.get('sourceLabelIds',[])) & {28,29}
            assert sha((ATLAS/part['file']).read_bytes())==part['meshSha256']
    teaching['sourceLabelSha256']=AFTER;writes.append((teaching_path,encode(teaching)))
    revision_path=ROOT/'app/segmentationLabelRevision.ts'
    revision=revision_path.read_text(encoding='utf-8');assert BASE in revision
    writes.append((revision_path,revision.replace(BASE,AFTER).encode('utf-8')))
    # Occupancy navigation is derived from the changed labels, not just re-stamped.
    def ranges(mask):
        result={}
        for plane,axes in (("sagittal",(1,2)),("coronal",(0,2)),("horizontal",(0,1))):
            counts=mask.sum(axis=axes);present=np.flatnonzero(counts)
            groups=np.split(present,np.flatnonzero(np.diff(present)>1)+1)
            result[plane]=[[int(g[0]),int(g[-1]),int(g[np.argmax(counts[g])])] for g in groups if g.size]
        return result
    index_path=ROOT/'app/sectionLabelPresence.json';index=json.loads(index_path.read_bytes())
    assert index['revision']==BASE
    for label_id in (28,29):
        assert index['labels'][str(label_id)]==ranges(before==label_id)
        index['labels'][str(label_id)]=ranges(after==label_id)
    index['revision']=AFTER
    writes.append((index_path,(json.dumps(index,ensure_ascii=False,separators=(',',':'))+'\n').encode()))
    r.update(adopted=True,installed=True,projectAdopted=True,published=False,
             status='AI-image-reviewed-project-adopted-development-only',transition='bounded-cerebellar-enclosed-tissue-repair',
             meshImpact=dict(blockMaskImpact=impact),cerebellarSectionMeshImpact=dict(before=oldinfo,after=info),
             sectionMeshImpact=dict(before=ventricular_before,after=ventricular_after),
             integrationVerification='docs/CEREBELLAR_ENCLOSED123_2026-10-01.md')
    record=encode(r);retain(RECORD,record)
    path=ATLAS/'bigbrain-practical-segmentation-icbm500-validation.json'
    v=json.loads(path.read_bytes());assert v['rawVoxelSha256']==sha(before.tobytes(order='F'))
    changed_counts={str(i):r['countsAfter'][str(i)] for i in (28,29)}
    v['rawVoxelSha256']=r['afterRawVoxelSha256'];v['labelCounts'].update(changed_counts)
    m=v['currentImageMeasurements'];assert m['sourceLabelSha256']==BASE
    m.update(sourceLabelSha256=AFTER,rawVoxelSha256=r['afterRawVoxelSha256']);m['labelCounts'].update(changed_counts)
    v['regionalBatchAudits']['cerebellar-enclosed123']=dict(record=RECORD.relative_to(ROOT).as_posix(),recordSha256=sha(record),changedVoxelCount=123,projectAdopted=True,expertReviewed=False)
    writes.extend([(path,encode(v)),(source,data)])
    return writes,impact

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--apply',action='store_true');args=p.parse_args()
    writes,impact=plan()
    if args.apply:
        for path,data in writes:path.write_bytes(data)
    print(json.dumps(dict(applied=args.apply,changedVoxels=123,files=len(writes),changedBlocks=[x for x in impact if x['changedMaskVoxels']])))
