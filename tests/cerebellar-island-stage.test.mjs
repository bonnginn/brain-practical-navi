import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {regionalMeshSuccessor} from './helpers/residual-mesh-successor.mjs';
const read=p=>readFile(new URL('../'+p,import.meta.url)),sha=b=>createHash('sha256').update(b).digest('hex');
test('both affected installed meshes and their metadata match the reviewed output',async()=>{
 const bytes=await read('segmentation-patches/review/cerebellar-island-meshes-2026-09-06.json');
 assert.equal(sha(bytes),'b5db21e6b098bc4e6946832bd2c440df9d88fb61e50656c2eae723a2f794829e');
 const r=JSON.parse(bytes),meta=JSON.parse(await read('public/atlas/specimen-blocks.json'));
 assert.deepEqual(r.meshes.map(e=>e.part).sort(),['cerebellum','pons-medulla']);
 for(const e of r.meshes){
  const successor=await regionalMeshSuccessor(e.file,e.afterSha256),latest=successor??e;
  const blob=await read('public/atlas/'+e.file);assert.equal(sha(blob),latest.afterSha256);
  assert.equal(blob.readUInt32LE(4),latest.vertices);assert.equal(blob.readUInt32LE(8),latest.faces);
  const p=meta.specimens[e.block].find(p=>p.part===e.part);
  assert.equal(p.meshSha256,latest.afterSha256);assert.equal(p.segmentationSourceSha256,successor?.segmentationSourceSha256??r.outputLabelSha256);
  assert.equal(p.vertices,latest.vertices);assert.equal(p.faces,latest.faces);assert.equal(e.beforeMatches,true);
 }
});
test('cerebellar-side stage independently replays all 64 edits and reverses',async()=>{
 const bytes=await read('segmentation-patches/review/cerebellar-islands-adoption-2026-09-06.json');
 assert.equal(sha(bytes),'85bc0bdfcd782173e53d13c4146641cda2024b0cfb55596effbebb590cd8947b');
 const r=JSON.parse(bytes),base=await read('tests/fixtures/bigbrain-practical-segmentation-pre-cerebellar-islands-8238.bin.gz');
 assert.equal(sha(base),r.inputCompressedSha256);const data=gunzipSync(base),before=data.subarray(10),after=Buffer.from(before);
 const nx=data.readUInt16LE(4),ny=data.readUInt16LE(6),nz=data.readUInt16LE(8),counts={0:0,28:0,29:0};
 assert.equal(r.edits.length,64);assert.equal(new Set(r.edits.map(e=>e.xyz.join(','))).size,64);
 for(const e of r.edits){const [x,y,z]=e.xyz;assert.ok([x,y,z].every(Number.isInteger)&&x>=0&&x<nx&&y>=0&&y<ny&&z>=0&&z<nz);
  const i=x+nx*(y+ny*z);assert.equal(e.fromLabel,27);assert.equal(after[i],27);assert.ok(e.toLabel in counts);after[i]=e.toLabel;counts[e.toLabel]++;}
 assert.deepEqual(counts,{0:28,28:16,29:20});assert.equal(sha(after),r.outputRawSha256);
 const installed=await read('tests/fixtures/bigbrain-practical-segmentation-pre-midline-surface-2a73.bin.gz');
 assert.equal(sha(installed),r.outputCompressedSha256);assert.deepEqual(gunzipSync(installed).subarray(10),after);
 const metadata=JSON.parse(await read('public/atlas/bigbrain-practical-segmentation-icbm500-validation.json'));
 assert.equal(metadata.cerebellarIslandAudit.recordSha256,sha(bytes));
 const support=JSON.parse(await read('segmentation-patches/review/cerebellar-support-adoption-2026-09-06.json'));
 const later=JSON.parse(await read('segmentation-patches/review/cerebellar-support-2274-adoption-2026-09-06.json'));
 const latest=JSON.parse(await read('segmentation-patches/review/cerebellar-support-997-adoption-2026-09-06.json'));
 const inferiorRight=JSON.parse(await read('segmentation-patches/review/cerebellar-support-1393-adoption-2026-09-06.json'));
 const medialRight=JSON.parse(await read('segmentation-patches/review/cerebellar-support-1603-adoption-2026-09-06.json'));
 const superior=JSON.parse(await read('segmentation-patches/review/cerebellar-support-843-adoption-2026-09-07.json'));
 const outerRight=JSON.parse(await read('segmentation-patches/review/cerebellar-support-1105-adoption-2026-09-07.json'));
 for(const key of ['28','29'])assert.equal(metadata.labelCounts[key],r.afterCounts[key]-[...support.points,...later.points,...latest.points,...inferiorRight.points,...medialRight.points,...superior.points,...outerRight.points].filter(p=>p.before===Number(key)&&p.after===0).length);
 assert.equal(r.unresolvedBoundaryPoints.length,24);
 for(const [x,y,z] of r.unresolvedBoundaryPoints)assert.equal(after[x+nx*(y+ny*z)],0);
 for(const e of r.edits){const [x,y,z]=e.xyz;after[x+nx*(y+ny*z)]=27;}
 assert.deepEqual(after,before);assert.equal(r.expertReviewed,false);
});
test('voxel evidence covers all 64 points in each of three axes without claiming adoption',async()=>{
 const bytes=await read('segmentation-patches/review/cerebellar-island-voxel-review-2026-09-06.json');
 assert.equal(sha(bytes),'73a198e8f970cb0493bec2ed716dbab4c37f003b0dc8142782d41111490943f0');
 const r=JSON.parse(bytes);assert.equal(r.mutation,false);assert.equal(r.adopted,false);let n=0;
 for(const c of r.components){const frames=c.sheets.flatMap(s=>s.frames);n+=frames.length;
  for(const [k,axis] of [...'xyz'].entries())for(const p of c.points)assert.equal(frames.filter(f=>f.axis===axis&&f.index===p[k]).length,1);}
 assert.equal(n,32);assert.equal(r.components.flatMap(c=>c.points).length,64);
});
