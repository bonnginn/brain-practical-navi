"""Install source-reviewed posterior third-ventricle exclusions with reversible evidence."""
import argparse,gzip,hashlib,json
from pathlib import Path
import numpy as np
from install_optic_central112 import labels
from build_section_ventricle_meshes import build_assets
import build_specimen_blocks as blocks
from build_orthogonal_review_bundle import DEFAULT_IMAGE,MAGIC_IMAGE,EXPECTED_IMAGE_SHA256,read_browser_volume
ROOT=Path(__file__).resolve().parents[1];ATLAS=ROOT/'public/atlas'
STAGE=ROOT/'work/third-residual32-20260920';PREFIX='third-residual11'
BASE='68b1c10d263f0f730334e3acbf633ef1659ab615b71dd27cdbfb312aa36d37d0'
AFTER='a7f3320c7bbe64786726b4058c895cebe6da95200534bfc9d324caf1122a634a'
RECORD=ROOT/f'segmentation-patches/review/{PREFIX}-adoption-2026-09-20.json'
sha=lambda b:hashlib.sha256(b).hexdigest()
encode=lambda r:(json.dumps(r,ensure_ascii=False,indent=2)+'\n').encode()
def plan():
 base=(STAGE/'before.bin.gz').read_bytes();data=(STAGE/'candidate-labels.bin.gz').read_bytes()
 assert sha(base)==BASE and sha(data)==AFTER
 assert (ATLAS/'bigbrain-practical-segmentation-icbm500.bin.gz').read_bytes()==base
 before,after=labels(base),labels(data);r=json.loads((STAGE/'repair.json').read_bytes());assert r['count']==11
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
 assert len(impact['blockMaskImpact'])==55 and len(impact['fineMaskImpact'])==5
 assert not any(x['changed'] for x in impact['fineMaskImpact'])
 assert [(x['block'],x['part'],x['changed']) for x in impact['blockMaskImpact'] if x['changed']]==[('diencephalon','third-ventricle',1)]
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
 review=STAGE/'candidate11.json';figures=[]
 for f in json.loads(review.read_bytes())['figures']:
  p=review.parent/f['file'];assert sha(p.read_bytes())==f['sha256'];figures.append(dict(path=p.relative_to(ROOT).as_posix(),sha256=f['sha256']))
 assert len(figures)==3
 r.update(status='AI-image-reviewed-project-adopted-development-only',adopted=True,installed=True,projectAdopted=True,published=False,
  meshImpact=impact,sectionMeshImpact=dict(before=oldreport,after=newreport,changedFiles=changed),
  primaryReview=dict(reviewer='AI project image review',approved=True,reviewedFigures=figures,rationale='Native100 coronal Y685, sagittal X665 and axial Z593 show the lateral residual component outside the preserved third-ventricle wall. Remove its 11 voxels, retaining roof152, the other 21 non-roof voxels and all other labels. This is not a connectivity-only deletion.'),integrationVerification='docs/THIRD_RESIDUAL11_INTEGRATION_2026-09-20.md')
 record=encode(r);retain(RECORD,record)
 p=ATLAS/'bigbrain-practical-segmentation-icbm500-validation.json';v=json.loads(p.read_bytes());assert v['rawVoxelSha256']==sha(before.tobytes(order='F'))
 v['rawVoxelSha256']=r['afterRawVoxelSha256'];v['labelCounts'].update(r['countsAfter']);m=v['currentImageMeasurements'];assert m['sourceLabelSha256']==BASE
 m.update(sourceLabelSha256=AFTER,rawVoxelSha256=r['afterRawVoxelSha256']);m['labelCounts'].update(r['countsAfter'])
 v['regionalBatchAudits'][PREFIX]=dict(record=RECORD.relative_to(ROOT).as_posix(),recordSha256=sha(record),changedVoxelCount=11,projectAdopted=True,expertReviewed=False,changedSectionMeshes=changed)
 writes.extend([(p,encode(v)),(ATLAS/'bigbrain-practical-segmentation-icbm500.bin.gz',data)])
 return writes
if __name__=='__main__':
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--apply',action='store_true');args=parser.parse_args();writes=plan()
 if args.apply:
  for p,b in writes:p.write_bytes(b)
 print(json.dumps(dict(applied=args.apply,changedVoxels=11,files=len(writes))))
