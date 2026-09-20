import {currentSegmentation} from './helpers/current-segmentation.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {withRegionalBatches} from './helpers/residual-mesh-successor.mjs';
const read=p=>readFile(new URL('../'+p,import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');

test('third-ventricle regional exclusions replay exactly, leaving all unrelated voxels intact',async()=>{
 const bytes=await read('segmentation-patches/review/third-remnants91-adoption-2026-09-08.json');
 assert.equal(sha(bytes),'1a5b82f171a2461c879bf3d50fc2e2cebe74936bbca4c55ee6f55ae4b80ea212');
 const r=JSON.parse(bytes),base=await read('tests/fixtures/bigbrain-practical-segmentation-pre-third-remnants91.bin.gz');
 const current=await read('tests/fixtures/bigbrain-practical-segmentation-pre-third-central-fringe61.bin.gz');
 assert.equal(sha(base),'3aa4127843d1ca59ee4fa2d542632748ec542958c76329b627b3968b6d53f45e');
 assert.equal(sha(current),'bd0c1c048262876fd5f84d7fd5622c9ddb341b6a18716b14a03e5ad57ff360fb');
 const before=gunzipSync(base),after=gunzipSync(current),expected=Buffer.from(before),seen=new Set();
 assert.equal(r.count,91);assert.equal(r.points.length,91);
 assert.equal(r.points.filter(p=>p.xyz[2]<=108).length,24);
 for(const p of r.points){
  assert.equal(p.before,25);assert.equal(p.after,0);
  const [x,y,z]=p.xyz;
  assert.ok(p.xyz.length===3&&p.xyz.every(Number.isInteger)&&x>=0&&x<394&&y>=0&&y<466&&z>=0&&z<378);
  const i=10+x+394*(y+466*z);assert.ok(!seen.has(i));seen.add(i);assert.equal(expected[i],25);expected[i]=0;
 }
 assert.deepEqual(expected,after);assert.equal(sha(after.subarray(10)),r.afterRawVoxelSha256);
 for(const i of seen)expected[i]=25;
 assert.deepEqual(expected,before);
 for(const x of [195,196])for(const y of [265,266,267,268])for(const z of [107,108])assert.equal(after[10+x+394*(y+466*z)],25);
 assert.equal(r.projectAdopted,true);assert.equal(r.expertReviewed,false);assert.equal(r.published,false);
 assert.match(r.limitation,/not expert review/);
 const meta=JSON.parse(await read('public/atlas/bigbrain-practical-segmentation-icbm500-validation.json'));
 assert.equal(meta.regionalBatchAudits['third-remnants91'].recordSha256,sha(bytes));
 assert.equal(meta.labelCounts['25'],currentSegmentation.counts[25]);
 const latest=gunzipSync(await read('public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz'));
 for(const i of seen)assert.equal(latest[i],0,'A previously excluded cell must not be filled again');
});

test('third-ventricle repair synchronizes only its section meshes and one block part',async()=>{
 const r=JSON.parse(await read('segmentation-patches/review/third-remnants91-adoption-2026-09-08.json'));
 assert.equal(r.meshImpact.blockMaskImpact.length,55);
 const changed=r.meshImpact.blockMaskImpact.filter(p=>p.changedMaskVoxels);
 assert.deepEqual(changed.map(p=>[p.block,p.part,p.added,p.removed]),[['diencephalon','third-ventricle',0,10]]);
 assert.deepEqual(r.sectionMeshImpact.changedFiles,['section-current-third-ventricle.mesh','section-current-ventricular-system.mesh']);
 const p=changed[0],mesh=await read('tests/fixtures/block-diencephalon-third-ventricle-pre-third-central-fringe61.mesh');
 assert.equal(sha(mesh),p.afterSha256);assert.equal(mesh.readUInt32LE(4),2132);assert.equal(mesh.readUInt32LE(8),4224);
 assert.equal(sha(await read('tests/fixtures/block-diencephalon-third-ventricle-pre-third-remnants91.mesh')),p.beforeSha256);
 const successor=JSON.parse(await read('segmentation-patches/review/third-central-fringe61-adoption-2026-09-08.json'));
 assert.equal(successor.beforeSha256,r.afterSha256);
 assert.deepEqual(successor.sectionMeshImpact.before,r.sectionMeshImpact.after);
 const intermediate=JSON.parse(await read('segmentation-patches/review/aqueduct-core179-adoption-2026-09-08.json'));
 assert.deepEqual(intermediate.sectionMeshImpact.before,successor.sectionMeshImpact.after);
 const latest=await withRegionalBatches(r,{afterRevision:r.afterSha256});
 for(const [name,info] of Object.entries(latest.sectionMeshImpact.after.meshes))assert.equal(sha(await read('public/atlas/'+name+'.mesh')),info.sha256);
});
