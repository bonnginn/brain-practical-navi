"""Install source-reviewed posterior third-ventricle exclusions with reversible evidence."""
import argparse,gzip,hashlib,json
from pathlib import Path
import numpy as np
from install_optic_central112 import labels
from build_section_ventricle_meshes import build_assets
import build_specimen_blocks as blocks
from build_orthogonal_review_bundle import DEFAULT_IMAGE,MAGIC_IMAGE,EXPECTED_IMAGE_SHA256,read_browser_volume
ROOT=Path(__file__).resolve().parents[1];ATLAS=ROOT/'public/atlas'
STAGE=ROOT/'work/third-posterior197-stage-20260920';PREFIX='third-posterior197'
BASE='7f24c6e53b1819fcf676fcd9bb038064957bf9fc0f27e564419e4af972fcd6a3'
AFTER='15db8e50352584247bc6073a2a78f4c191c68afc26de0d63f2e44615873de4ba'
RECORD=ROOT/f'segmentation-patches/review/{PREFIX}-adoption-2026-09-20.json'
sha=lambda b:hashlib.sha256(b).hexdigest()
encode=lambda r:(json.dumps(r,ensure_ascii=False,indent=2)+'\n').encode()
def plan():
 base=(STAGE/'before.bin.gz').read_bytes();data=(STAGE/'labels.bin.gz').read_bytes()
 assert sha(base)==BASE and sha(data)==AFTER
 assert (ATLAS/'bigbrain-practical-segmentation-icbm500.bin.gz').read_bytes()==base
 before,after=labels(base),labels(data);r=json.loads((STAGE/'repair.json').read_bytes());assert r['count']==197
 forward=before.copy();reverse=after.copy();seen=set()
 for p in r['points']:
  k=tuple(p['xyz']);assert k not in seen and p['before']==25 and p['after']==0;seen.add(k)
  assert before[k]==25 and after[k]==0;forward[k]=0;reverse[k]=25
 assert np.array_equal(forward,after) and np.array_equal(reverse,before)
 assert r['afterRawVoxelSha256']==sha(after.tobytes(order='F'))
 writes=[]
 def retain(p,b):
  assert not p.exists() or p.read_bytes()==b,str(p)
  writes.append((p,b))
 retain(ROOT/f'tests/fixtures/bigbrain-practical-segmentation-pre-{PREFIX}.bin.gz',base)
 impact=json.loads((STAGE/'block-impact.json').read_bytes());assert impact['beforeSha256']==BASE and impact['afterSha256']==AFTER
 assert len(impact['blockMaskImpact'])==55 and len(impact['fineMaskImpact'])==4
 assert not any(x['changed'] for x in impact['fineMaskImpact'])
 assert [(x['block'],x['part'],x['changed']) for x in impact['blockMaskImpact'] if x['changed']]==[('diencephalon','third-ventricle',28)]
 _,_,raw=read_browser_volume(DEFAULT_IMAGE,MAGIC_IMAGE,EXPECTED_IMAGE_SHA256);values=raw.transpose(2,1,0)[::2,::2,::2]
 olddefs=blocks.specimen_definitions(values,before.transpose(2,1,0)[::2,::2,::2]);newdefs=blocks.specimen_definitions(values,after.transpose(2,1,0)[::2,::2,::2])
 manifest=json.loads((ATLAS/'specimen-blocks.json').read_bytes());generated=STAGE/'blocks';generated.mkdir(exist_ok=True)
 for row in impact['blockMaskImpact']:
  old=next(p for p in olddefs[row['block']] if p.key==row['part']);new=next(p for p in newdefs[row['block']] if p.key==row['part'])
  added=int((new.mask&~old.mask).sum());removed=int((old.mask&~new.mask).sum());assert added+removed==row['changed']
  row.update(changedMaskVoxels=added+removed,added=added,removed=removed)
  if not row['changed']:continue
  entry=next(p for p in manifest['specimens'][row['block']] if p['part']==row['part']);name=entry['file'][:-5]
  oldinfo=blocks.write_mesh(name,blocks.mesh_from_mask(old.mask,values,old.material=='specimen'),generated)
  oldmesh=(generated/(name+'.mesh')).read_bytes();assert oldmesh==(ATLAS/(name+'.mesh')).read_bytes()
  newinfo=blocks.write_mesh(name,blocks.mesh_from_mask(new.mask,values,new.material=='specimen'),generated)
  newmesh=(generated/(name+'.mesh')).read_bytes();retain(ROOT/f'tests/fixtures/{name}-pre-{PREFIX}.mesh',oldmesh)
  writes.append((ATLAS/(name+'.mesh'),newmesh));entry.update(newinfo,segmentationSourceSha256=AFTER)
  row.update(file=name+'.mesh',beforeSha256=sha(oldmesh),afterSha256=sha(newmesh),reproducedBeforeSha256=sha(oldmesh),beforeMatches=True)
 writes.append((ATLAS/'specimen-blocks.json',encode(manifest)))
 oldreport,oldassets=build_assets(base);newreport,newassets=build_assets(data);changed=[]
 for name,b in oldassets.items():
  if name.endswith('.mesh'):
   assert (ATLAS/name).read_bytes()==b,name
   if b!=newassets[name]:
    changed.append(name);retain(ROOT/f'tests/fixtures/{name[:-5]}-pre-{PREFIX}.mesh',b)
 assert set(changed)=={'section-current-third-ventricle.mesh','section-current-ventricular-system.mesh'}
 writes.extend((ATLAS/n,b) for n,b in newassets.items())
 for p in sorted(ATLAS.glob('section-current-*.json')):
  if p.name=='section-current-ventricles.json':continue
  meta=json.loads(p.read_bytes());assert meta['sourceSha256']==BASE
  groups=meta['meshes'] if 'meshes' in meta else {p.stem:meta}
  for name,m in groups.items():
   assert 25 not in m['labelIds'];assert sha((ATLAS/(name+'.mesh')).read_bytes())==m['sha256']
  meta['sourceSha256']=AFTER
  if 'rawVoxelSha256' in meta:meta['rawVoxelSha256']=r['afterRawVoxelSha256']
  writes.append((p,encode(meta)))
 assert {p:sha((ROOT/p).read_bytes()) for p in r['evidence']}==r['evidence']
 review=ROOT/'work/third-remnants-current-20260920/source-review.json';figures=[]
 for f in json.loads(review.read_bytes())['figures']:
  p=review.parent/f['file'];assert sha(p.read_bytes())==f['sha256'];figures.append(dict(path=p.relative_to(ROOT).as_posix(),sha256=f['sha256']))
 assert len(figures)==7
 r.update(status='AI-image-reviewed-project-adopted-development-only',adopted=True,installed=True,projectAdopted=True,published=False,
  meshImpact=impact,sectionMeshImpact=dict(before=oldreport,after=newreport,changedFiles=changed),
  primaryReview=dict(reviewer='AI project image review',approved=True,reviewedFigures=figures,rationale='Coronal Y650/670/690, sagittal X681/729 and axial Z552/570 show the two posterior components outside the preserved wall of the third ventricle. Remove their gross external-space extent, retaining roof152 and all other labels. No intensity threshold or connectivity-only deletion.'),integrationVerification='docs/THIRD_POSTERIOR197_INTEGRATION_2026-09-20.md')
 record=encode(r);retain(RECORD,record)
 p=ATLAS/'bigbrain-practical-segmentation-icbm500-validation.json';v=json.loads(p.read_bytes());assert v['rawVoxelSha256']==sha(before.tobytes(order='F'))
 v['rawVoxelSha256']=r['afterRawVoxelSha256'];v['labelCounts'].update(r['countsAfter']);m=v['currentImageMeasurements'];assert m['sourceLabelSha256']==BASE
 m.update(sourceLabelSha256=AFTER,rawVoxelSha256=r['afterRawVoxelSha256']);m['labelCounts'].update(r['countsAfter'])
 v['regionalBatchAudits'][PREFIX]=dict(record=RECORD.relative_to(ROOT).as_posix(),recordSha256=sha(record),changedVoxelCount=197,projectAdopted=True,expertReviewed=False,changedSectionMeshes=changed)
 writes.extend([(p,encode(v)),(ATLAS/'bigbrain-practical-segmentation-icbm500.bin.gz',data)])
 return writes
if __name__=='__main__':
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--apply',action='store_true');args=parser.parse_args();writes=plan()
 if args.apply:
  for p,b in writes:p.write_bytes(b)
 print(json.dumps(dict(applied=args.apply,changedVoxels=197,files=len(writes))))
