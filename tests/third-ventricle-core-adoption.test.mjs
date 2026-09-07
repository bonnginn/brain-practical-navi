import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {regionalMeshSuccessor} from './helpers/residual-mesh-successor.mjs';
const read=p=>readFile(new URL('../'+p,import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');

test('third ventricle core is exactly 1587 reversible additions without other label changes',async()=>{
 const bytes=await read('segmentation-patches/review/third-ventricle-core-adoption-2026-09-07.json'),r=JSON.parse(bytes);
 const base=await read('tests/fixtures/bigbrain-practical-segmentation-pre-third-core-777b.bin.gz');
 const current=await read('tests/fixtures/bigbrain-practical-segmentation-pre-fourth-paired-9bc5.bin.gz');
 assert.equal(sha(base),r.inputCompressedSha256); assert.equal(sha(current),r.outputCompressedSha256);
 const h=gunzipSync(base), before=h.subarray(10), after=Buffer.from(before);
 const nx=h.readUInt16LE(4),ny=h.readUInt16LE(6),nz=h.readUInt16LE(8);
 assert.equal(r.points.length,1587); assert.equal(new Set(r.points.map(p=>p.xyz.join(','))).size,1587);
 for(const p of r.points){const [x,y,z]=p.xyz;assert.ok(p.xyz.every(Number.isInteger)&&x>=0&&x<nx&&y>=0&&y<ny&&z>=0&&z<nz);const i=x+nx*(y+ny*z);assert.equal(p.before,0);assert.equal(p.after,25);assert.equal(after[i],0);after[i]=25;}
 assert.deepEqual(after,gunzipSync(current).subarray(10)); assert.equal(sha(after),r.outputRawSha256);
 const meta=JSON.parse(await read('public/atlas/bigbrain-practical-segmentation-icbm500-validation.json'));
 assert.equal(meta.fourthVentriclePairedAudit.changedVoxelCount,16);assert.equal(meta.thirdVentricleCoreAudit.recordSha256,sha(bytes));
 assert.equal(meta.labelCounts['25'],11977);assert.equal(after.reduce((n,v)=>n+(v===25),0),12007);
 assert.equal(r.projectAdopted,true);assert.equal(r.expertReviewed,false);
 for(const p of r.points){const [x,y,z]=p.xyz;after[x+nx*(y+ny*z)]=0;}assert.deepEqual(after,before);
});

test('third ventricle mesh includes explained historical synchronization and no other mask changes',async()=>{
 const r=JSON.parse(await read('segmentation-patches/review/third-ventricle-core-adoption-2026-09-07.json'));
 const parts=r.meshImpact.blockMaskImpact, changed=parts.filter(p=>p.changedMaskVoxels);
 assert.equal(parts.length,55);assert.equal(changed.length,1);assert.equal(changed[0].changedMaskVoxels,179);
 const p=changed[0]; assert.equal(p.part,'third-ventricle');
 const successor=await regionalMeshSuccessor(p.file,p.afterSha256);
 assert.ok(successor);
 const historical=await read(successor.firstRecoveryPath);
 assert.equal(sha(historical),p.afterSha256);
 assert.equal(historical.readUInt32LE(4),2210);assert.equal(historical.readUInt32LE(8),4344);
 assert.equal(sha(await read('public/atlas/'+p.file)),successor.afterSha256);
 assert.equal(sha(await read('tests/fixtures/block-diencephalon-third-ventricle-pre-core.mesh')),p.beforeSha256);
 assert.equal(r.historicalMeshBaseline.historicalReproducedSha256,p.beforeSha256);
 assert.deepEqual(r.historicalMeshBaseline.changes,[{zyx:[70,127,99],before:false,after:true}]);
 const meta=JSON.parse(await read('public/atlas/specimen-blocks.json')).specimens.diencephalon.find(p=>p.part==='third-ventricle');
 assert.equal(meta.meshSha256,successor.afterSha256);assert.equal(meta.vertices,2186);assert.equal(meta.faces,4304);
});
