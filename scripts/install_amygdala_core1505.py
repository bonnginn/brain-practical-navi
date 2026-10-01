"""Install the reviewed same-BigBrain eight-nucleus additions to gross amygdala labels."""
import argparse, gzip, hashlib, json, struct
from pathlib import Path
import numpy as np
import build_specimen_blocks as b
import build_teaching_specimens as t
from build_section_ventricle_meshes import reconstruct

ROOT=Path(__file__).resolve().parents[1]
ATLAS=ROOT/'public/atlas'
STAGE=ROOT/'work/amygdala-core1505-stage-2026-10-01'
BASE='3f0bc383ccc4e8434cc71340f3db0772e4581ddf177133678364f1cd9c4b09f1'
AFTER='84f56821b8b47ef5a6551f756978dee2512fc0a9a8f5ae972bab5674c84564c0'
RECORD=ROOT/'segmentation-patches/review/amygdala-core1505-adoption-2026-10-01.json'
sha=lambda data:hashlib.sha256(data).hexdigest()
encode=lambda data:(json.dumps(data,ensure_ascii=False,indent=2)+'\n').encode('utf-8')

def labels(data):
    raw=gzip.decompress(data);assert raw[:4]==b'BBS1'
    return np.frombuffer(raw,np.uint8,offset=10).reshape(struct.unpack_from('<3H',raw,4),order='F')

def ranges(mask):
    result={}
    for plane,axes in (('sagittal',(1,2)),('coronal',(0,2)),('horizontal',(0,1))):
        counts=mask.sum(axis=axes);present=np.flatnonzero(counts)
        groups=np.split(present,np.flatnonzero(np.diff(present)>1)+1)
        result[plane]=[[int(g[0]),int(g[-1]),int(g[np.argmax(counts[g])])] for g in groups if g.size]
    return result

def plan():
    base=(STAGE/'before.bin.gz').read_bytes();data=(STAGE/'labels.bin.gz').read_bytes()
    assert sha(base)==BASE and sha(data)==AFTER
    assert (ATLAS/'bigbrain-practical-segmentation-icbm500.bin.gz').read_bytes()==base
    before,after=labels(base),labels(data)
    r=json.loads((STAGE/'repair.json').read_bytes());assert r['count']==1505
    forward=before.copy();reverse=after.copy();seen=set()
    for p in r['points']:
        k=tuple(p['xyz']);assert k not in seen and p['before']==0 and p['after'] in (21,22)
        seen.add(k);assert before[k]==0 and after[k]==p['after']
        forward[k]=p['after'];reverse[k]=0
    assert len(seen)==1505 and np.array_equal(forward,after) and np.array_equal(reverse,before)
    assert sha(after.tobytes(order='F'))==r['afterRawVoxelSha256']
    for path,digest in r['evidence'].items():assert sha((ROOT/path).read_bytes())==digest,path
    writes=[]
    def add(path,payload):
        assert not any(path==old for old,_ in writes),str(path)
        writes.append((path,payload))
    def retain(path,payload):
        assert not path.exists() or path.read_bytes()==payload,str(path)
        add(path,payload)
    retain(ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-amygdala-core1505.bin.gz',base)
    stem='section-current-amygdala'
    oldmesh,oldinfo=reconstruct(np.isin(before,(21,22)).transpose(2,1,0))
    mesh,info=reconstruct(np.isin(after,(21,22)).transpose(2,1,0))
    installed=(ATLAS/(stem+'.mesh')).read_bytes();assert gzip.decompress(installed)==oldmesh
    stored=b.deterministic_gzip(mesh)
    retain(ROOT/f'tests/fixtures/{stem}-pre-amygdala-core1505.mesh',installed)
    add(ATLAS/(stem+'.mesh'),stored)
    for path in sorted(ATLAS.glob('section-current-*.json')):
        meta=json.loads(path.read_bytes());assert meta['sourceSha256']==BASE,path
        groups=meta.get('meshes',{path.stem:meta})
        for name,g in groups.items():
            if name==stem:
                assert set(g['labelIds'])=={21,22}
                g.update(info,sha256=sha(stored),bytes=len(stored),rawSha256=sha(mesh),
                         labelVoxelCounts=r['countsAfter'],reviewRecord=RECORD.relative_to(ROOT).as_posix())
            else:
                assert not set(g['labelIds']) & {21,22},name
                assert sha((ATLAS/(name+'.mesh')).read_bytes())==g['sha256'],name
        meta['sourceSha256']=AFTER
        if 'rawVoxelSha256' in meta:meta['rawVoxelSha256']=r['afterRawVoxelSha256']
        add(path,encode(meta))
    raw,_=b.read_volume(b.BIGBRAIN,b'BBV1');values=raw[::2,::2,::2]
    oldfine=before.transpose(2,1,0);newfine=after.transpose(2,1,0)
    olddefs=b.specimen_definitions(values,oldfine[::2,::2,::2])
    newdefs=b.specimen_definitions(values,newfine[::2,::2,::2])
    manifest=json.loads((ATLAS/'specimen-blocks.json').read_bytes())
    generated=STAGE/'meshes';generated.mkdir(exist_ok=True);impact=[]
    for key,parts in olddefs.items():
        for old in parts:
            new=next(p for p in newdefs[key] if p.key==old.key)
            changed=int(np.count_nonzero(old.mask!=new.mask))
            row=dict(block=key,part=old.key,changedMaskVoxels=changed,
                     added=int((new.mask&~old.mask).sum()),removed=int((old.mask&~new.mask).sum()))
            impact.append(row)
            fine=b.FINE_CAVITY_PARTS.get((key,old.key))
            if fine:assert np.array_equal(b.fine_cavity_mask(oldfine,*fine),b.fine_cavity_mask(newfine,*fine))
            if not changed:continue
            assert not fine and key=='medial-temporal' and old.key in ('amygdala','tissue')
            entry=next(p for p in manifest['specimens'][key] if p['part']==old.key)
            name=entry['file'][:-5]
            b.write_mesh(name,b.mesh_from_mask(old.mask,values,old.material=='specimen'),generated)
            oldbytes=(generated/(name+'.mesh')).read_bytes();assert oldbytes==(ATLAS/(name+'.mesh')).read_bytes()
            newinfo=b.write_mesh(name,b.mesh_from_mask(new.mask,values,new.material=='specimen'),generated)
            newbytes=(generated/(name+'.mesh')).read_bytes()
            retain(ROOT/f'tests/fixtures/{name}-pre-amygdala-core1505.mesh',oldbytes)
            add(ATLAS/(name+'.mesh'),newbytes);entry.update(newinfo,segmentationSourceSha256=AFTER)
            row.update(file=name+'.mesh',beforeSha256=sha(oldbytes),afterSha256=sha(newbytes),beforeMatches=True)
    assert len(impact)==55
    add(ATLAS/'specimen-blocks.json',encode(manifest))
    # Repartition the existing medial temporal cut surface, preserving its geometry.
    teaching=json.loads((ROOT/'app/teachingSpecimens.json').read_bytes())
    assert teaching['sourceLabelSha256']==BASE
    zz,yy,xx=b.world_grids(values.shape);cut=t.CUTS['medial-temporal']
    body=b.largest_component(values<252)&~np.isin(oldfine[::2,::2,::2],b.VENTRICLES)
    body &= b.bounds(zz,yy,xx,x=cut[0],y=cut[1],z=cut[2])
    shape=b.mesh_from_mask(body,values,True)
    oldids=t.surface_ids(shape,body,oldfine);newids=t.surface_ids(shape,body,newfine)
    entries=teaching['specimens']['medial-temporal']['parts'];changes=[]
    oldassigned=np.zeros(len(oldids),bool);newassigned=np.zeros(len(newids),bool)
    for entry in entries:
        key=entry['key']
        if key in t.IDS:
            oldkeep=np.isin(oldids,t.IDS[key])&~oldassigned;newkeep=np.isin(newids,t.IDS[key])&~newassigned
            oldassigned|=oldkeep;newassigned|=newkeep
        elif key=='tissue':oldkeep=~oldassigned;newkeep=~newassigned
        else:
            assert sha((ATLAS/entry['file']).read_bytes())==entry['meshSha256'];continue
        name=entry['file'][:-5]
        b.write_mesh(name,t.subset_mesh(shape,oldkeep),generated,compress=True)
        oldbytes=(generated/entry['file']).read_bytes()
        assert oldbytes==(ATLAS/entry['file']).read_bytes() and sha(oldbytes)==entry['meshSha256'],name
        info2=b.write_mesh(name,t.subset_mesh(shape,newkeep),generated,compress=True)
        newbytes=(generated/entry['file']).read_bytes()
        if oldbytes!=newbytes:
            assert key in ('amygdala','tissue')
            retain(ROOT/f'tests/fixtures/{name}-pre-amygdala-core1505.mesh',oldbytes)
            add(ATLAS/entry['file'],newbytes)
            for field in ('vertices','faces','shadeMin','shadeMax','meshSha256'):entry[field]=info2[field]
            changes.append(dict(part=key,beforeSha256=sha(oldbytes),afterSha256=sha(newbytes)))
    assert sum(p['faces'] for p in entries if p.get('surfaceOnly'))==len(shape[3])
    teaching['sourceLabelSha256']=AFTER;add(ROOT/'app/teachingSpecimens.json',encode(teaching))
    indexpath=ROOT/'app/sectionLabelPresence.json';index=json.loads(indexpath.read_bytes());assert index['revision']==BASE
    for i in (21,22):
        assert index['labels'][str(i)]==ranges(before==i)
        index['labels'][str(i)]=ranges(after==i)
    index['revision']=AFTER;add(indexpath,(json.dumps(index,separators=(',',':'))+'\n').encode())
    revisionpath=ROOT/'app/segmentationLabelRevision.ts';revision=revisionpath.read_text(encoding='utf-8');assert revision.count(BASE)==1
    add(revisionpath,revision.replace(BASE,AFTER).encode('utf-8'))
    r.update(adopted=True,installed=True,projectAdopted=True,status='AI-image-reviewed-project-adopted-development-only',
             sectionMeshImpact=dict(before=oldinfo,after=info),blockMaskImpact=impact,teachingMeshChanges=changes,
             integrationVerification='docs/AMYGDALA_CORE1505_2026-10-01.md')
    record=encode(r);retain(RECORD,record)
    path=ATLAS/'bigbrain-practical-segmentation-icbm500-validation.json';v=json.loads(path.read_bytes())
    assert v['rawVoxelSha256']==sha(before.tobytes(order='F'))
    v['rawVoxelSha256']=r['afterRawVoxelSha256'];v['labelCounts'].update(r['countsAfter'])
    m=v['currentImageMeasurements'];assert m['sourceLabelSha256']==BASE
    m.update(sourceLabelSha256=AFTER,rawVoxelSha256=r['afterRawVoxelSha256']);m['labelCounts'].update(r['countsAfter'])
    v['regionalBatchAudits']['amygdala-core1505']=dict(record=RECORD.relative_to(ROOT).as_posix(),recordSha256=sha(record),changedVoxelCount=1505,projectAdopted=True,expertReviewed=False)
    add(path,encode(v));add(ATLAS/'bigbrain-practical-segmentation-icbm500.bin.gz',data)
    return writes,dict(files=len(writes),changedVoxels=1505,section=info,blocks=[x for x in impact if x['changedMaskVoxels']],teaching=changes)

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--apply',action='store_true');args=parser.parse_args()
    writes,report=plan()
    if args.apply:
        for path,data in writes:path.write_bytes(data)
    print(json.dumps(dict(applied=args.apply,**report)),flush=True)
