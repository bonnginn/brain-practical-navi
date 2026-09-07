import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const read=p=>readFile(new URL('../'+p,import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');

test('third detached repair is exactly eight reversible zero-to-25 additions',async()=>{
 const bytes=await read('segmentation-patches/review/third-detached8-adoption-2026-09-07.json'),r=JSON.parse(bytes);
 const base=await read('tests/fixtures/bigbrain-practical-segmentation-pre-third-detached8-ffb8.bin.gz'),current=await read('tests/fixtures/bigbrain-practical-segmentation-pre-lateral-detached547-b45c.bin.gz');
 assert.equal(sha(base),r.beforeSha256);assert.equal(sha(current),r.afterSha256);
 const before=gunzipSync(base),after=gunzipSync(current),expected=Buffer.from(before),seen=new Set();
 assert.equal(r.points.length,8);assert.deepEqual(before.subarray(0,10),after.subarray(0,10));
 for(const p of r.points){const [x,y,z]=p;assert.ok(p.length===3&&p.every(Number.isInteger)&&x>=0&&x<394&&y>=0&&y<466&&z>=0&&z<378);const i=10+x+394*(y+466*z);assert.ok(!seen.has(i));seen.add(i);assert.equal(expected[i],0);expected[i]=25;}
 assert.deepEqual(expected,after);assert.equal(sha(after.subarray(10)),r.afterRawVoxelSha256);
 for(const i of seen)expected[i]=0;assert.deepEqual(expected,before);
 const meta=JSON.parse(await read('public/atlas/bigbrain-practical-segmentation-icbm500-validation.json'));
 const next=JSON.parse(await read('segmentation-patches/review/lateral-detached547-adoption-2026-09-07.json'));
 const final=JSON.parse(await read('segmentation-patches/review/lateral-residual80-adoption-2026-09-07.json'));
 const last=JSON.parse(await read('segmentation-patches/review/lateral-cavity21-adoption-2026-09-07.json'));
 const currentRepair=await withRegionalBatches(JSON.parse(await read('segmentation-patches/review/lateral-crop34-adoption-2026-09-07.json')));assert.equal(currentRepair.beforeSha256,last.afterSha256);
 assert.equal(last.beforeSha256,final.afterSha256);
 assert.equal(final.beforeSha256,next.afterSha256);
 assert.equal(next.beforeSha256,r.afterSha256);assert.equal(meta.rawVoxelSha256,currentRepair.afterRawVoxelSha256);assert.equal(meta.thirdDetached8Audit.recordSha256,sha(bytes));assert.equal(meta.labelCounts['25'],11977);
 assert.equal(r.projectAdopted,true);assert.equal(r.expertReviewed,false);assert.equal(r.published,false);
 for(const [name,info] of Object.entries(r.sectionMeshImpact.after.meshes)){assert.equal(next.sectionMeshImpact.before.meshes[name].sha256,info.sha256);assert.equal(final.sectionMeshImpact.before.meshes[name].sha256,next.sectionMeshImpact.after.meshes[name].sha256);assert.equal(last.sectionMeshImpact.before.meshes[name].sha256,final.sectionMeshImpact.after.meshes[name].sha256);assert.equal(currentRepair.sectionMeshImpact.before.meshes[name].sha256,last.sectionMeshImpact.after.meshes[name].sha256);assert.equal(sha(await read('public/atlas/'+name+'.mesh')),currentRepair.sectionMeshImpact.after.meshes[name].sha256);}
 assert.equal(r.meshImpact.blockMaskImpact.length,55);assert.ok(r.meshImpact.blockMaskImpact.every(p=>p.changedMaskVoxels===0));
});
import {withRegionalBatches} from './helpers/residual-mesh-successor.mjs';
