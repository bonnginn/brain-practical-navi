import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const read=p=>readFile(new URL('../../'+p,import.meta.url));
// Preserve historical start evidence while checking every regional successor link.
export async function withRegionalBatches(record){
 const meta=JSON.parse(await read('public/atlas/bigbrain-practical-segmentation-icbm500-validation.json'));
 let result=record;
 for(const [name,audit] of Object.entries(meta.regionalBatchAudits??{})){
  const bytes=await read(audit.record),next=JSON.parse(bytes);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),audit.recordSha256);
  assert.equal(next.beforeSha256,result.afterSha256);
  assert.deepEqual(next.sectionMeshImpact.before,result.sectionMeshImpact.after);
  for(const p of next.meshImpact.blockMaskImpact){
   assert.equal(p.changedMaskVoxels,p.added+p.removed);
   if(p.changedMaskVoxels){
    assert.equal(p.beforeMatches,true);assert.equal(p.reproducedBeforeSha256,p.beforeSha256);
    assert.equal(createHash('sha256').update(await read('tests/fixtures/'+p.file.slice(0,-5)+'-pre-'+name+'.mesh')).digest('hex'),p.beforeSha256);
   }
  }
  result={...result,afterSha256:next.afterSha256,afterRawVoxelSha256:next.afterRawVoxelSha256,
   sectionMeshImpact:{...result.sectionMeshImpact,after:next.sectionMeshImpact.after}};
 }
 return result;
}
export async function regionalMeshSuccessor(file,previousSha,afterRevision=null){
 const meta=JSON.parse(await read('public/atlas/bigbrain-practical-segmentation-icbm500-validation.json'));
 let result=null,active=afterRevision===null;
 for(const [name,audit] of Object.entries(meta.regionalBatchAudits??{})){
  const bytes=await read(audit.record),r=JSON.parse(bytes);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),audit.recordSha256);
  if(!active){if(r.afterSha256===afterRevision)active=true;continue;}
  const p=r.meshImpact.blockMaskImpact.find(p=>p.file===file&&p.changedMaskVoxels);
  if(!p)continue;
  assert.equal(p.beforeSha256,result?.afterSha256??previousSha);
  assert.equal(createHash('sha256').update(await read('tests/fixtures/'+file.slice(0,-5)+'-pre-'+name+'.mesh')).digest('hex'),p.beforeSha256);
  result={...p,segmentationSourceSha256:r.afterSha256,
   firstRecoveryPath:result?.firstRecoveryPath??'tests/fixtures/'+file.slice(0,-5)+'-pre-'+name+'.mesh'};
 }
 assert.equal(active,true,'Unknown regional starting revision');return result;
}
export async function lateralCrop34Successor(file,previousSha){
 const r=JSON.parse(await read('segmentation-patches/review/lateral-crop34-adoption-2026-09-07.json'));
 const next=r.meshImpact.blockMaskImpact.find(p=>p.file===file&&p.changedMaskVoxels);
 if(!next)return regionalMeshSuccessor(file,previousSha);
 assert.equal(next.beforeSha256,previousSha);
 assert.equal(createHash('sha256').update(await read('tests/fixtures/'+file.slice(0,-5)+'-pre-lateral-crop34.mesh')).digest('hex'),previousSha);
 return await regionalMeshSuccessor(file,next.afterSha256)??{...next,segmentationSourceSha256:r.afterSha256};
}
export async function lateralCavity21Successor(file,previousSha){
 const r=JSON.parse(await read('segmentation-patches/review/lateral-cavity21-adoption-2026-09-07.json'));
 const next=r.meshImpact.blockMaskImpact.find(p=>p.file===file&&p.changedMaskVoxels);
 if(!next)return lateralCrop34Successor(file,previousSha);
 assert.equal(next.beforeSha256,previousSha);
 assert.equal(createHash('sha256').update(await read('tests/fixtures/'+file.slice(0,-5)+'-pre-lateral-cavity21.mesh')).digest('hex'),previousSha);
 return await lateralCrop34Successor(file,next.afterSha256)??{...next,segmentationSourceSha256:r.afterSha256};
}
export async function lateralResidual80Successor(file,previousSha){
 const r=JSON.parse(await read('segmentation-patches/review/lateral-residual80-adoption-2026-09-07.json'));
 const next=r.meshImpact.blockMaskImpact.find(p=>p.file===file&&p.changedMaskVoxels);
 if(!next)return lateralCavity21Successor(file,previousSha);
 assert.equal(next.beforeSha256,previousSha);
 assert.equal(createHash('sha256').update(await read('tests/fixtures/'+file.slice(0,-5)+'-pre-lateral-residual80.mesh')).digest('hex'),previousSha);
 return await lateralCavity21Successor(file,next.afterSha256)??{...next,segmentationSourceSha256:r.afterSha256};
}
export async function lateralDetachedSuccessor(file,previousSha){
 const r=JSON.parse(await read('segmentation-patches/review/lateral-detached547-adoption-2026-09-07.json'));
 const next=r.meshImpact.blockMaskImpact.find(p=>p.file===file&&p.changedMaskVoxels);
 if(!next)return lateralResidual80Successor(file,previousSha);
 assert.equal(next.beforeSha256,previousSha);
 assert.equal(createHash('sha256').update(await read('tests/fixtures/'+file.slice(0,-5)+'-pre-lateral-detached547.mesh')).digest('hex'),previousSha);
 return await lateralResidual80Successor(file,next.afterSha256)??{...next,segmentationSourceSha256:r.afterSha256};
}
export async function partial19Successor(file,previousSha){
 const r=JSON.parse(await read('segmentation-patches/review/inferior-partial19-adoption-2026-09-07.json'));
 const next=r.meshImpact.blockMaskImpact.find(p=>p.file===file&&p.changedMaskVoxels);
 if(!next)return lateralDetachedSuccessor(file,previousSha);
 assert.equal(next.beforeSha256,previousSha);
 assert.equal(createHash('sha256').update(await read('tests/fixtures/pre-inferior-partial19-'+file)).digest('hex'),previousSha);
 return await lateralDetachedSuccessor(file,next.afterSha256)??{...next,segmentationSourceSha256:r.outputCompressedSha256};
}
export async function residual53Successor(file,previousSha){
 const r=JSON.parse(await read('segmentation-patches/review/inferior-residual53-adoption-2026-09-07.json'));
 const next=r.meshImpact.blockMaskImpact.find(p=>p.file===file&&p.changedMaskVoxels);
 if(!next)return partial19Successor(file,previousSha);
 assert.equal(next.beforeSha256,previousSha);
 assert.equal(createHash('sha256').update(await read('tests/fixtures/pre-inferior-residual53-'+file)).digest('hex'),previousSha);
 return await partial19Successor(file,next.afterSha256)??{...next,segmentationSourceSha256:r.outputCompressedSha256};
}
export async function residualSuccessor(file,previousSha){
 const r=JSON.parse(await read('segmentation-patches/review/inferior-residual-adoption-2026-09-07.json'));
 const next=r.meshImpact.blockMaskImpact.find(p=>p.file===file&&p.changedMaskVoxels);
 if(!next)return residual53Successor(file,previousSha);
 assert.equal(next.beforeSha256,previousSha);
 const recovery=await read('tests/fixtures/pre-inferior-residual-'+file);
 assert.equal(createHash('sha256').update(recovery).digest('hex'),previousSha);
 return await residual53Successor(file,next.afterSha256)??{...next,segmentationSourceSha256:r.outputCompressedSha256};
}
