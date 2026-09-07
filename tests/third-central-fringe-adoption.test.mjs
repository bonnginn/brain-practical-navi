import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const read=p=>readFile(new URL('../'+p,import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');

test('central third-ventricle fill changes exactly 61 reviewed zero cells and reverses without collateral changes',async()=>{
 const bytes=await read('segmentation-patches/review/third-central-fringe61-adoption-2026-09-08.json');
 assert.equal(sha(bytes),'a568ec85d72f0acc6fa022f61f33f3812a58e165f1e5124c9f25623f3372317a');
 const r=JSON.parse(bytes),base=await read('tests/fixtures/bigbrain-practical-segmentation-pre-third-central-fringe61.bin.gz');
 const current=await read('tests/fixtures/bigbrain-practical-segmentation-pre-aqueduct-core179.bin.gz');
 assert.equal(sha(base),'bd0c1c048262876fd5f84d7fd5622c9ddb341b6a18716b14a03e5ad57ff360fb');
 assert.equal(sha(current),'2983ac84a194043b0f974a6ee93fd34e74efce94d7c58c66e69f34f1475a7ef3');
 assert.equal(r.beforeSha256,sha(base));assert.equal(r.afterSha256,sha(current));
 const before=gunzipSync(base),after=gunzipSync(current),expected=Buffer.from(before),seen=new Set();
 assert.equal(r.count,61);assert.equal(r.points.length,61);assert.equal(r.transition,'0->25');
 for(const p of r.points){
  const [x,y,z]=p;
  assert.ok(p.length===3&&p.every(Number.isInteger)&&x>=192&&x<=199&&y>=225&&y<=260&&z>=135&&z<=164);
  const i=10+x+394*(y+466*z);assert.ok(!seen.has(i));seen.add(i);assert.equal(expected[i],0);expected[i]=25;
 }
 assert.deepEqual(expected,after);assert.equal(sha(after.subarray(10)),r.afterRawVoxelSha256);
 for(const i of seen)expected[i]=0;
 assert.deepEqual(expected,before);
 const previous=JSON.parse(await read('segmentation-patches/review/third-remnants91-adoption-2026-09-08.json'));
 assert.equal(previous.afterSha256,r.beforeSha256);
 for(const {xyz:[x,y,z]} of previous.points)assert.equal(after[10+x+394*(y+466*z)],0);
 assert.equal(r.projectAdopted,true);assert.equal(r.expertReviewed,false);assert.equal(r.published,false);
 assert.match(r.limitation,/not expert review/);assert.match(r.rationale,/46.*138|46 registered300/);
 assert.equal(r.evidence.filter(e=>e.visuallyInspectedFigures).reduce((n,e)=>n+e.visuallyInspectedFigures.length,0),46);
 const meta=JSON.parse(await read('public/atlas/bigbrain-practical-segmentation-icbm500-validation.json'));
 assert.equal(meta.regionalBatchAudits['third-central-fringe61'].recordSha256,sha(bytes));
 assert.equal(meta.labelCounts['25'],11947);
 const successor=JSON.parse(await read('segmentation-patches/review/aqueduct-core179-adoption-2026-09-08.json'));
 assert.equal(successor.beforeSha256,r.afterSha256);assert.equal(meta.rawVoxelSha256,successor.afterRawVoxelSha256);
});

test('central fill synchronizes its two section meshes and only two coarse third-ventricle block cells',async()=>{
 const r=JSON.parse(await read('segmentation-patches/review/third-central-fringe61-adoption-2026-09-08.json'));
 assert.equal(r.meshImpact.blockMaskImpact.length,55);
 const changed=r.meshImpact.blockMaskImpact.filter(p=>p.changedMaskVoxels);
 assert.deepEqual(changed.map(p=>[p.block,p.part,p.added,p.removed]),[['diencephalon','third-ventricle',2,0]]);
 assert.deepEqual(r.sectionMeshImpact.changedFiles,['section-current-third-ventricle.mesh','section-current-ventricular-system.mesh']);
 const p=changed[0],mesh=await read('public/atlas/'+p.file);
 assert.equal(sha(mesh),p.afterSha256);assert.equal(mesh.readUInt32LE(4),2134);assert.equal(mesh.readUInt32LE(8),4228);
 assert.equal(sha(await read('tests/fixtures/block-diencephalon-third-ventricle-pre-third-central-fringe61.mesh')),p.beforeSha256);
 const successor=JSON.parse(await read('segmentation-patches/review/aqueduct-core179-adoption-2026-09-08.json'));
 assert.deepEqual(successor.sectionMeshImpact.before,r.sectionMeshImpact.after);
 for(const [name,info] of Object.entries(successor.sectionMeshImpact.after.meshes))assert.equal(sha(await read('public/atlas/'+name+'.mesh')),info.sha256);
});
