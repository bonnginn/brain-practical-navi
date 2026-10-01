import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const read=p=>readFile(new URL('../../'+p,import.meta.url));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const regionalBlockImpact=r=>r.meshImpact?.blockMaskImpact??(['10.25493/TKTP-7NR','10.5281/zenodo.7757416'].includes(r.sourceDoi)?r.blockMaskImpact:undefined);
async function verifyHippocampalSuccessor(record){
 assert.equal(record.count,356);
 assert.equal(record.sourceDoi,'10.5281/zenodo.7757416');
 assert.equal(record.paperDoi,'10.7554/eLife.88404');
 assert.equal(record.points.length,record.count);
 assert.ok(record.points.every(p=>p.before===0&&[17,18].includes(p.after)));
 assert.deepEqual(record.countsBySide,{left:226,right:130});
 assert.equal(sha(gunzipSync(await read('tests/fixtures/section-current-hippocampus-pre-hippocampal-core356.mesh'))),record.sectionMeshImpact.before.sha256);
 assert.equal(sha(gunzipSync(await read('public/atlas/section-current-hippocampus.mesh'))),record.sectionMeshImpact.after.sha256);
}
async function verifyTissueSectionSuccessor(meta,record,stem,field){
 let expected=record.sectionMeshImpact.after,active=false;
 for(const audit of Object.values(meta.regionalBatchAudits??{})){
  const bytes=await read(audit.record),next=JSON.parse(bytes);
  assert.equal(sha(bytes),audit.recordSha256);
  if(!active){if(next.afterSha256===record.afterSha256)active=true;continue;}
  const impact=next[field];
  if(impact){assert.deepEqual(impact.before,expected);expected=impact.after;}
 }
 assert.equal(active,true);
 const stored=await read('public/atlas/'+stem+'.mesh');
 assert.equal(sha(stored[0]===0x1f&&stored[1]===0x8b?gunzipSync(stored):stored),expected.sha256);
}
async function verifyAmygdalaSuccessor(record){
 assert.equal(record.count,1505);
 assert.equal(record.sourceDoi,'10.25493/TKTP-7NR');
 assert.deepEqual(record.sourceCodes,['bl','bm','ce','la','me','pl','vcod','vcov']);
 assert.equal(record.points.length,record.count);
 assert.ok(record.points.every(p=>p.before===0&&[21,22].includes(p.after)));
 assert.deepEqual(record.countsBySide,{left:649,right:856});
 assert.equal(sha(gunzipSync(await read('tests/fixtures/section-current-amygdala-pre-amygdala-core1505.mesh'))),record.sectionMeshImpact.before.sha256);
 assert.equal(sha(gunzipSync(await read('public/atlas/section-current-amygdala.mesh'))),record.sectionMeshImpact.after.sha256);
}
async function verifyCallosalCingulateSuccessor(record){
 assert.equal(record.transition,'30→0');
 assert.equal(record.count,48395);
 assert.equal(record.callosumBefore-record.callosumAfter,record.count);
 assert.equal(record.afterRawVoxelSha256,record.rawVoxelSha256);
 const indices=gunzipSync(await read('segmentation-patches/review/callosal-cingulate-broad-2026-09-30.indices.bin.gz'));
 assert.equal(sha(indices),record.indexSha256);
 assert.equal(indices.length,record.count*4);
 const section=gunzipSync(await read('public/atlas/section-current-corpus-callosum.mesh'));
 assert.equal(sha(section),record.sectionMeshImpact.after.sha256);
 assert.deepEqual(record.blockMeshImpact.map(p=>[p.file,p.changedMaskVoxels]),[
  ['block-commissural-system-corpus-callosum.mesh',6004],
  ['block-commissural-system-tissue.mesh',2356],
 ]);
 for(const p of record.blockMeshImpact)assert.equal(sha(await read('public/atlas/'+p.file)),p.afterSha256);
}
// Older fibre records use sourceSha256 for input labels. The enclosed-tissue
// schema instead uses it for the pinned native100 image, with beforeSha256 for labels.
export function regionalBeforeSha(record){
 if(record.beforeSha256!==undefined&&record.sourceSha256!==undefined){
  if(record.transition==='bounded-cerebellar-enclosed-tissue-repair'){
   assert.ok(record.cerebellarSectionMeshImpact,'Missing separate cerebellar surface evidence');
   assert.equal(record.sourceSha256,'61e6ebbeb0d6876051b9348a68bfe22b733fead04d112c35ff1a29819b67d351','Wrong native100 source identity');
  }else assert.equal(record.beforeSha256,record.sourceSha256,'Conflicting regional input revisions');
 }
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
  if(name==='callosal-cingulate-broad'){
   await verifyCallosalCingulateSuccessor(next);
   // The callosal mesh changes; the historical ventricular mesh chain does not.
   sectionImpact={before:result.sectionMeshImpact.after,after:{...result.sectionMeshImpact.after,
    sourceSha256:next.afterSha256,rawVoxelSha256:next.afterRawVoxelSha256}};
  }
  if(name==='amygdala-core1505'){
   await verifyAmygdalaSuccessor(next);
   // The amygdala surface changes, while the ventricular representations do not.
   sectionImpact={before:result.sectionMeshImpact.after,after:{...result.sectionMeshImpact.after,
    sourceSha256:next.afterSha256,rawVoxelSha256:next.afterRawVoxelSha256}};
  }
  if(name==='hippocampal-core356'){
   await verifyHippocampalSuccessor(next);
   // This changes hippocampal surfaces; the ventricular geometry is unchanged.
   sectionImpact={before:result.sectionMeshImpact.after,after:{...result.sectionMeshImpact.after,
    sourceSha256:next.afterSha256,rawVoxelSha256:next.afterRawVoxelSha256}};
  }
  if(['cerebellar-exterior-islands40','cerebellar-left-exterior24','cerebellar-left-lower16','cerebellar-white-islands46','cerebellar-interstitial16'].includes(name)){
   assert.equal(next.blockMaskChanged,false);
   assert.ok(next.points.length===next.count&&next.points.every(p=>[28,29].includes(p.before)&&p.after===0));
   assert.ok(sectionImpact,'Missing cerebellar section-mesh evidence');
   // Cerebellar geometry changed, while these historical ventricular meshes did not.
    sectionImpact={before:result.sectionMeshImpact.after,after:{...result.sectionMeshImpact.after,
    sourceSha256:next.afterSha256,rawVoxelSha256:next.afterRawVoxelSha256}};
  }
  if(name==='cerebellar-exterior10'||name==='brainstem-exterior3'){
   assert.equal(next.blockMaskChanged,false);
   assert.equal(next.count,name==='brainstem-exterior3'?3:10);
   assert.ok(next.points.every(p=>(name==='brainstem-exterior3'?p.before===27:[28,29].includes(p.before))&&p.after===0));
   assert.ok(next.sectionMeshImpact?.before?.sha256&&next.sectionMeshImpact?.after?.sha256);
   await verifyTissueSectionSuccessor(meta,next,name==='brainstem-exterior3'?'section-current-brainstem':'section-current-cerebellum',name==='brainstem-exterior3'?'brainstemSectionMeshImpact':'cerebellarSectionMeshImpact');
   // These tissue meshes are recorded separately; the historical ventricular mesh chain is unchanged.
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
  const blockImpact=regionalBlockImpact(next)??(name==='callosal-cingulate-broad'?[]:undefined);
  if(!blockImpact){
   assert.equal(next.blockMaskChanged,false,'Missing block impact requires a verified unchanged block mask');
   assert.ok(next.sectionMeshImpact,'Missing section-mesh impact for unchanged-block adoption');
  }
  for(const p of blockImpact??[]){
   if(name==='anterior-commissure185')assert.ok(Number.isInteger(p.changed)&&p.changed>=0);
   else assert.equal(p.changedMaskVoxels,p.added+p.removed);
   if(p.changedMaskVoxels??p.changed){
    assert.equal(p.beforeMatches,true);if(!['anterior-commissure185','amygdala-core1505'].includes(name))assert.equal(p.reproducedBeforeSha256,p.beforeSha256);
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
  if(name==='callosal-cingulate-broad'){
   await verifyCallosalCingulateSuccessor(r);
   const p=r.blockMeshImpact.find(p=>p.file===file);
   if(p){
    assert.equal(p.beforeSha256,result?.afterSha256??previousSha);
    result={...p,segmentationSourceSha256:r.afterSha256,
     firstRecoveryPath:result?.firstRecoveryPath};
   }
   continue;
  }
  const blockImpact=regionalBlockImpact(r);
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
