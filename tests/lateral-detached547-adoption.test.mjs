import test from 'node:test';
import {lateralResidual80Successor} from './helpers/residual-mesh-successor.mjs';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const read=p=>readFile(new URL('../'+p,import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');

test('lateral sulcal exclusion is exactly 547 reversible ID24-to-zero voxels',async()=>{
 const bytes=await read('segmentation-patches/review/lateral-detached547-adoption-2026-09-07.json'),r=JSON.parse(bytes);
 const base=await read('tests/fixtures/bigbrain-practical-segmentation-pre-lateral-detached547-b45c.bin.gz'),current=await read('tests/fixtures/bigbrain-practical-segmentation-pre-lateral-residual80-7d2b.bin.gz');
 assert.equal(sha(base),r.beforeSha256);assert.equal(sha(current),r.afterSha256);
 const before=gunzipSync(base),after=gunzipSync(current),expected=Buffer.from(before),seen=new Set();
 assert.equal(r.points.length,547);assert.deepEqual(before.subarray(0,10),after.subarray(0,10));
 for(const p of r.points){const [x,y,z]=p;assert.ok(p.length===3&&p.every(Number.isInteger)&&x>=0&&x<394&&y>=0&&y<466&&z>=0&&z<378);const i=10+x+394*(y+466*z);assert.ok(!seen.has(i));seen.add(i);assert.equal(expected[i],24);expected[i]=0;}
 assert.deepEqual(expected,after);assert.equal(sha(after.subarray(10)),r.afterRawVoxelSha256);
 for(const i of seen)expected[i]=24;assert.deepEqual(expected,before);
 const meta=JSON.parse(await read('public/atlas/bigbrain-practical-segmentation-icbm500-validation.json'));
 const latest=JSON.parse(await read('segmentation-patches/review/lateral-residual80-adoption-2026-09-07.json'));
 const last=JSON.parse(await read('segmentation-patches/review/lateral-cavity21-adoption-2026-09-07.json'));
 const currentRepair=await withRegionalBatches(JSON.parse(await read('segmentation-patches/review/lateral-crop34-adoption-2026-09-07.json')));assert.equal(currentRepair.beforeSha256,last.afterSha256);
 assert.equal(last.beforeSha256,latest.afterSha256);
 assert.equal(latest.beforeSha256,r.afterSha256);assert.equal(meta.rawVoxelSha256,currentRepair.afterRawVoxelSha256);assert.equal(meta.lateralDetached547Audit.recordSha256,sha(bytes));assert.equal(meta.labelCounts['24'],79082);
 assert.equal(r.projectAdopted,true);assert.equal(r.expertReviewed,false);assert.equal(r.published,false);
 const manifest=JSON.parse(await read('public/atlas/specimen-blocks.json'));
 assert.equal(r.meshImpact.blockMaskImpact.length,55);assert.equal(new Set(r.meshImpact.blockMaskImpact.map(p=>p.block+'/'+p.part)).size,55);
 const changed=r.meshImpact.blockMaskImpact.filter(p=>p.changedMaskVoxels);assert.equal(changed.length,3);
 for(const p of changed){const next=await lateralResidual80Successor(p.file,p.afterSha256);assert.ok(next);assert.equal(sha(await read('public/atlas/'+p.file)),next.afterSha256);assert.equal(sha(await read('tests/fixtures/'+p.file.slice(0,-5)+'-pre-lateral-detached547.mesh')),p.beforeSha256);const item=manifest.specimens[p.block].find(q=>q.part===p.part);assert.equal(item.meshSha256,next.afterSha256);assert.equal(item.segmentationSourceSha256,next.segmentationSourceSha256);}
 for(const [name,info] of Object.entries(r.sectionMeshImpact.after.meshes)){assert.equal(latest.sectionMeshImpact.before.meshes[name].sha256,info.sha256);assert.equal(last.sectionMeshImpact.before.meshes[name].sha256,latest.sectionMeshImpact.after.meshes[name].sha256);assert.equal(currentRepair.sectionMeshImpact.before.meshes[name].sha256,last.sectionMeshImpact.after.meshes[name].sha256);assert.equal(sha(await read('public/atlas/'+name+'.mesh')),currentRepair.sectionMeshImpact.after.meshes[name].sha256);}
 for(const name of ['section-current-third-ventricle','section-current-fourth-ventricle'])assert.deepEqual(r.sectionMeshImpact.before.meshes[name],r.sectionMeshImpact.after.meshes[name]);
 assert.equal(r.maskDirection.blockRows.length,55);assert.ok(r.maskDirection.blockRows.every(p=>p.added===0));
});
import {withRegionalBatches} from './helpers/residual-mesh-successor.mjs';
