import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const read=p=>readFile(new URL('../../'+p,import.meta.url));
// Older immutable fibre records name the input sourceSha256. Accept that field
// without rewriting their pinned bytes, and reject contradictory dual fields.
export function regionalBeforeSha(record){
 if(record.beforeSha256!==undefined&&record.sourceSha256!==undefined)
  assert.equal(record.beforeSha256,record.sourceSha256,'Conflicting regional input revisions');
 const before=record.beforeSha256??record.sourceSha256;
 assert.match(before??'',/^[a-f0-9]{64}$/,'Missing regional input revision');
 return before;
}
// Preserve historical start evidence while checking every regional successor link.
export async function withRegionalBatches(record,{afterRevision=null}={}){
 const meta=JSON.parse(await read('public/atlas/bigbrain-practical-segmentation-icbm500-validation.json'));
 let result=record,active=afterRevision===null;
 for(const [name,audit] of Object.entries(meta.regionalBatchAudits??{})){
  const bytes=await read(audit.record),next=JSON.parse(bytes);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),audit.recordSha256);
  if(!active){if(next.afterSha256===afterRevision){assert.deepEqual(next,record);active=true;}continue;}
  assert.equal(regionalBeforeSha(next),result.afterSha256);
  let sectionImpact=next.sectionMeshImpact;
  if(['cerebellar-exterior-islands40','cerebellar-left-exterior24'].includes(name)){
   assert.equal(next.blockMaskChanged,false);
   assert.ok(next.points.length===next.count&&next.points.every(p=>[28,29].includes(p.before)&&p.after===0));
   assert.ok(sectionImpact,'Missing cerebellar section-mesh evidence');
   // Cerebellar geometry changed, while these historical ventricular meshes did not.
   sectionImpact={before:result.sectionMeshImpact.after,after:{...result.sectionMeshImpact.after,
    sourceSha256:next.afterSha256,rawVoxelSha256:next.afterRawVoxelSha256}};
  }
  if(!sectionImpact){
   // This adoption uses a compact record: only anterior commissure/internal capsule changed.
   assert.equal(name,'anterior-commissure185','Unknown compact regional record');
   assert.ok(next.points.every(p=>[0,31,32].includes(p.before)&&p.after===42));
   assert.deepEqual(next.changedSectionMeshes,['section-current-anterior-commissure-partial.mesh','section-current-internal-capsule.mesh']);
   sectionImpact={before:result.sectionMeshImpact.after,after:{...result.sectionMeshImpact.after,sourceSha256:next.afterSha256,rawVoxelSha256:next.afterRawVoxelSha256}};
  }
  assert.deepEqual(sectionImpact.before,result.sectionMeshImpact.after);
  const blockImpact=next.meshImpact?.blockMaskImpact;
  if(!blockImpact){
   assert.equal(next.blockMaskChanged,false,'Missing block impact requires a verified unchanged block mask');
   assert.ok(next.sectionMeshImpact,'Missing section-mesh impact for unchanged-block adoption');
  }
  for(const p of blockImpact??[]){
   if(name==='anterior-commissure185')assert.ok(Number.isInteger(p.changed)&&p.changed>=0);
   else assert.equal(p.changedMaskVoxels,p.added+p.removed);
   if(p.changedMaskVoxels??p.changed){
    assert.equal(p.beforeMatches,true);if(name!=='anterior-commissure185')assert.equal(p.reproducedBeforeSha256,p.beforeSha256);
    assert.equal(createHash('sha256').update(await read('tests/fixtures/'+p.file.slice(0,-5)+'-pre-'+name+'.mesh')).digest('hex'),p.beforeSha256);
   }
  }
  result={...result,afterSha256:next.afterSha256,afterRawVoxelSha256:next.afterRawVoxelSha256,
   sectionMeshImpact:{...result.sectionMeshImpact,after:sectionImpact.after}};
 }
 assert.equal(active,true,'Unknown regional starting record');return result;
}
export async function regionalMeshSuccessor(file,previousSha,afterRevision=null){
 const meta=JSON.parse(await read('public/atlas/bigbrain-practical-segmentation-icbm500-validation.json'));
 let result=null,active=afterRevision===null;
 for(const [name,audit] of Object.entries(meta.regionalBatchAudits??{})){
  const bytes=await read(audit.record),r=JSON.parse(bytes);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),audit.recordSha256);
  if(!active){if(r.afterSha256===afterRevision)active=true;continue;}
  const blockImpact=r.meshImpact?.blockMaskImpact;
  if(!blockImpact){
   assert.equal(r.blockMaskChanged,false,'Missing block impact requires a verified unchanged block mask');
   assert.ok(r.sectionMeshImpact,'Missing section-mesh impact for unchanged-block adoption');
  }
  const p=blockImpact?.find(p=>p.file===file&&(p.changedMaskVoxels??p.changed));
  if(!p)continue;
  assert.equal(p.beforeSha256,result?.afterSha256??previousSha);
  assert.equal(createHash('sha256').update(await read('tests/fixtures/'+file.slice(0,-5)+'-pre-'+name+'.mesh')).digest('hex'),p.beforeSha256);
 result={...p,segmentationSourceSha256:r.afterSha256,
   firstRecoveryPath:result?.firstRecoveryPath??'tests/fixtures/'+file.slice(0,-5)+'-pre-'+name+'.mesh'};
 }
 assert.equal(active,true,'Unknown regional starting revision');
 const representation=await fineCavityRepresentationSuccessor(file,result?.afterSha256??previousSha);
 if(representation)return {...representation,firstRecoveryPath:result?.firstRecoveryPath??representation.firstRecoveryPath};
 if(result&&(result.vertices===undefined||result.faces===undefined)){
  // Compact adoption records omit geometry counts. Read them from the mesh
  // only after proving its bytes are the recorded successor.
  const bytes=await read('public/atlas/'+file);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),result.afterSha256);
  const geometry=bytes[0]===0x1f&&bytes[1]===0x8b?gunzipSync(bytes):bytes;
  assert.equal(geometry.toString('ascii',0,4),'BNM2');
  result={...result,vertices:geometry.readUInt32LE(4),faces:geometry.readUInt32LE(8)};
 }
 return result;
}
// The 2026-09-15 fine-cavity install changes only mesh representation. Keep it
// after the historical regional chain so old adoption records remain immutable.
export async function fineCavityRepresentationSuccessor(file,previousSha){
 const records=await Promise.all(['fine-cavity-mesh-representation-2026-09-15','fine-fourth-mesh-representation-2026-09-20'].map(async name=>JSON.parse(await read('segmentation-patches/review/'+name+'.json'))));
 const r=records.find(r=>r.meshes.some(p=>p.file===file));
 const next=r?.meshes.find(p=>p.file===file);
 if(!next)return null;
 assert.equal(next.beforeSha256,previousSha);
 assert.equal(createHash('sha256').update(await read(next.beforeFixture)).digest('hex'),previousSha);
 const current=await read('public/atlas/'+file);
 const geometry=current[0]===0x1f&&current[1]===0x8b?gunzipSync(current):current;
 assert.equal(createHash('sha256').update(current).digest('hex'),next.afterSha256);
 assert.equal(createHash('sha256').update(geometry).digest('hex'),next.uncompressedSha256);
 return {...next,segmentationSourceSha256:r.segmentationSourceSha256,
  firstRecoveryPath:next.beforeFixture};
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
