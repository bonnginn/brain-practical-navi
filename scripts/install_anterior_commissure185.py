"""Install the image-reviewed teaching extent of the anterior commissure core."""
import argparse,gzip,hashlib,json
from pathlib import Path
import numpy as np
from install_optic_central112 import labels
from build_section_ventricle_meshes import reconstruct
import build_specimen_blocks as blocks
from build_orthogonal_review_bundle import DEFAULT_IMAGE,MAGIC_IMAGE,EXPECTED_IMAGE_SHA256,read_browser_volume
ROOT=Path(__file__).resolve().parents[1];ATLAS=ROOT/'public/atlas'
STAGE=ROOT/'work/anterior-commissure-teaching-20260920/stage';PREFIX='anterior-commissure185'
BASE='a7f3320c7bbe64786726b4058c895cebe6da95200534bfc9d324caf1122a634a'
AFTER='a0be53bb43f2316bd9100903d6e81ac65b23fe6830c3500cd18c4acba5883417'
RECORD=ROOT/f'segmentation-patches/review/{PREFIX}-adoption-2026-09-20.json'
sha=lambda b:hashlib.sha256(b).hexdigest()
encode=lambda r:(json.dumps(r,ensure_ascii=False,indent=2)+'\n').encode()

def plan():
 base=(STAGE/'before.bin.gz').read_bytes();data=(STAGE/'labels.bin.gz').read_bytes()
 assert sha(base)==BASE and sha(data)==AFTER
 assert (ATLAS/'bigbrain-practical-segmentation-icbm500.bin.gz').read_bytes()==base
 before,after=labels(base),labels(data);r=json.loads((STAGE/'repair.json').read_bytes());assert r['count']==185
 forward=before.copy();reverse=after.copy();seen=set()
 for p in r['points']:
  k=tuple(p['xyz']);assert k not in seen and p['before'] in (0,31,32) and p['after']==42;seen.add(k)
  assert before[k]==p['before'] and after[k]==42;forward[k]=42;reverse[k]=p['before']
 assert np.array_equal(forward,after) and np.array_equal(reverse,before)
 assert r['afterRawVoxelSha256']==sha(after.tobytes(order='F'))
 assert {p:sha((ROOT/p).read_bytes()) for p in r['evidence']}==r['evidence']
 writes=[]
 def retain(p,b):
  assert not p.exists() or p.read_bytes()==b,str(p)
  writes.append((p,b))
 retain(ROOT/f'tests/fixtures/bigbrain-practical-segmentation-pre-{PREFIX}.bin.gz',base)
 impact=json.loads((STAGE/'block-impact.json').read_bytes());assert impact['beforeSha256']==BASE and impact['afterSha256']==AFTER
 assert len(impact['blockMaskImpact'])==55 and len(impact['fineMaskImpact'])==5
 assert not any(x['changed'] for x in impact['fineMaskImpact'])
 assert [(x['block'],x['part'],x['changed']) for x in impact['blockMaskImpact'] if x['changed']]==[('radiations','tissue',3),('radiations','internal-capsule',3)]
 _,_,raw=read_browser_volume(DEFAULT_IMAGE,MAGIC_IMAGE,EXPECTED_IMAGE_SHA256);values=raw.transpose(2,1,0)[::2,::2,::2]
 olddefs=blocks.specimen_definitions(values,before.transpose(2,1,0)[::2,::2,::2]);newdefs=blocks.specimen_definitions(values,after.transpose(2,1,0)[::2,::2,::2])
 manifest=json.loads((ATLAS/'specimen-blocks.json').read_bytes());generated=STAGE/'blocks';generated.mkdir(exist_ok=True)
 for row in impact['blockMaskImpact']:
  old=next(p for p in olddefs[row['block']] if p.key==row['part']);new=next(p for p in newdefs[row['block']] if p.key==row['part'])
  assert int(np.count_nonzero(new.mask!=old.mask))==row['changed']
  if not row['changed']:continue
  entry=next(p for p in manifest['specimens'][row['block']] if p['part']==row['part']);name=entry['file'][:-5]
  blocks.write_mesh(name,blocks.mesh_from_mask(old.mask,values,old.material=='specimen'),generated)
  oldmesh=(generated/(name+'.mesh')).read_bytes();assert oldmesh==(ATLAS/(name+'.mesh')).read_bytes()
  newinfo=blocks.write_mesh(name,blocks.mesh_from_mask(new.mask,values,new.material=='specimen'),generated)
  newmesh=(generated/(name+'.mesh')).read_bytes();retain(ROOT/f'tests/fixtures/{name}-pre-{PREFIX}.mesh',oldmesh)
  writes.append((ATLAS/(name+'.mesh'),newmesh));entry.update(newinfo,segmentationSourceSha256=AFTER)
  row.update(file=name+'.mesh',beforeSha256=sha(oldmesh),afterSha256=sha(newmesh),beforeMatches=True)
 writes.append((ATLAS/'specimen-blocks.json',encode(manifest)))
 changed=[]
 for p in sorted(ATLAS.glob('section-current-*.json')):
  meta=json.loads(p.read_bytes());assert meta['sourceSha256']==BASE
  groups=meta['meshes'] if 'meshes' in meta else {p.stem:meta}
  for name,m in groups.items():
   oldmesh=(ATLAS/(name+'.mesh')).read_bytes();assert sha(oldmesh)==m['sha256']
   ids=m['labelIds'];oldmask=np.isin(before.transpose(2,1,0),ids);newmask=np.isin(after.transpose(2,1,0),ids)
   if np.array_equal(oldmask,newmask):continue
   assert name in ('section-current-anterior-commissure-partial','section-current-internal-capsule')
   oldraw,_=reconstruct(oldmask);assert gzip.decompress(oldmesh)==oldraw
   newraw,info=reconstruct(newmask);newmesh=gzip.compress(newraw,mtime=0)
   info.update(rawSha256=sha(newraw),rawBytes=len(newraw),sha256=sha(newmesh),bytes=len(newmesh),compression='gzip')
   m.update(info,labelVoxelCounts={str(i):int(np.count_nonzero(after==i)) for i in ids})
   if ids==[42]:
    assert m['voxels']==601 and m['components6']==1
    m['scope']='Continuous transverse teaching core traced in source images, including local correction of capsule overlap. Approximate 0.5-mm contour; complete outer boundary and temporal terminations remain unrecorded. Not expert validation or quiz eligibility.'
   retain(ROOT/f'tests/fixtures/{name}-pre-{PREFIX}.mesh',oldmesh)
   writes.append((ATLAS/(name+'.mesh'),newmesh));changed.append(name+'.mesh')
  meta['sourceSha256']=AFTER
  if 'rawVoxelSha256' in meta:meta['rawVoxelSha256']=r['afterRawVoxelSha256']
  writes.append((p,encode(meta)))
 assert len(changed)==2
 r.update(status='AI-image-reviewed-project-adopted-development-only',adopted=True,installed=True,projectAdopted=True,published=False,meshImpact=impact,changedSectionMeshes=changed,integrationVerification='docs/ANTERIOR_COMMISSURE_TEACHING_2026-09-20.md')
 record=encode(r);retain(RECORD,record)
 p=ATLAS/'bigbrain-practical-segmentation-icbm500-validation.json';v=json.loads(p.read_bytes());assert v['rawVoxelSha256']==sha(before.tobytes(order='F'))
 v['rawVoxelSha256']=r['afterRawVoxelSha256'];v['labelCounts'].update(r['countsAfter']);m=v['currentImageMeasurements'];assert m['sourceLabelSha256']==BASE
 m.update(sourceLabelSha256=AFTER,rawVoxelSha256=r['afterRawVoxelSha256']);m['labelCounts'].update(r['countsAfter'])
 v['regionalBatchAudits'][PREFIX]=dict(record=RECORD.relative_to(ROOT).as_posix(),recordSha256=sha(record),changedVoxelCount=185,projectAdopted=True,expertReviewed=False,changedSectionMeshes=changed)
 writes.extend([(p,encode(v)),(ATLAS/'bigbrain-practical-segmentation-icbm500.bin.gz',data)])
 return writes

if __name__=='__main__':
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--apply',action='store_true');args=parser.parse_args();writes=plan()
 if args.apply:
  for p,b in writes:p.write_bytes(b)
 print(json.dumps(dict(applied=args.apply,changedVoxels=185,files=len(writes))))
