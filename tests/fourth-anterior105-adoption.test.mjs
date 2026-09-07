import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const read=p=>readFile(new URL('../'+p,import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');

test('fourth anterior adoption is exactly 105 reversible additions, without other label changes',async()=>{
 const bytes=await read('segmentation-patches/review/fourth-anterior105-adoption-2026-09-07.json'),r=JSON.parse(bytes);
 const base=await read('tests/fixtures/bigbrain-practical-segmentation-pre-fourth-anterior105-e98c.bin.gz'),current=await read('tests/fixtures/bigbrain-practical-segmentation-pre-third-detached8-ffb8.bin.gz');
 assert.equal(sha(base),r.inputCompressedSha256);assert.equal(sha(current),r.outputCompressedSha256);
 const before=gunzipSync(base),after=gunzipSync(current),expected=Buffer.from(before),seen=new Set();
 assert.deepEqual(before.subarray(0,10),after.subarray(0,10));assert.equal(r.points.length,105);assert.deepEqual(r.transitions,{'0->26':105});
 for(const p of r.points){const [x,y,z]=p.xyz;assert.ok(p.xyz.length===3&&p.xyz.every(Number.isInteger)&&x>=0&&x<394&&y>=0&&y<466&&z>=0&&z<378);const i=10+x+394*(y+466*z);assert.ok(!seen.has(i));seen.add(i);assert.equal(p.before,0);assert.equal(p.after,26);assert.equal(expected[i],0);expected[i]=26;}
 assert.deepEqual(expected,after);assert.equal(sha(after.subarray(10)),r.outputRawSha256);
 assert.equal(after.subarray(10).reduce((n,v)=>n+(v===26),0),8641);
 const meta=JSON.parse(await read('public/atlas/bigbrain-practical-segmentation-icbm500-validation.json'));
 const next=JSON.parse(await read('segmentation-patches/review/third-detached8-adoption-2026-09-07.json'));
 const latest=JSON.parse(await read('segmentation-patches/review/lateral-detached547-adoption-2026-09-07.json'));
 const newest=JSON.parse(await read('segmentation-patches/review/lateral-residual80-adoption-2026-09-07.json'));
 const last=JSON.parse(await read('segmentation-patches/review/lateral-cavity21-adoption-2026-09-07.json'));
 const currentRepair=await withRegionalBatches(JSON.parse(await read('segmentation-patches/review/lateral-crop34-adoption-2026-09-07.json')));assert.equal(currentRepair.beforeSha256,last.afterSha256);
 assert.equal(last.beforeSha256,newest.afterSha256);
 assert.equal(newest.beforeSha256,latest.afterSha256);
 assert.equal(next.beforeSha256,r.outputCompressedSha256);assert.equal(latest.beforeSha256,next.afterSha256);assert.equal(meta.rawVoxelSha256,currentRepair.afterRawVoxelSha256);assert.equal(meta.fourthAnterior105Audit.recordSha256,sha(bytes));
 assert.equal(r.projectAdopted,true);assert.equal(r.expertReviewed,false);assert.equal(r.published,false);
 for(const i of seen)expected[i]=0;assert.deepEqual(expected,before);
});

test('fourth block and full section meshes retain source and reconstruction evidence',async()=>{
 const r=JSON.parse(await read('segmentation-patches/review/fourth-anterior105-adoption-2026-09-07.json'));
 const rows=r.meshImpact.blockMaskImpact;assert.equal(rows.length,55);assert.equal(new Set(rows.map(p=>p.block+'/'+p.part)).size,55);
 const changed=rows.filter(p=>p.changedMaskVoxels);assert.equal(changed.length,1);
 const p=changed[0];assert.equal(p.file,'block-hindbrain-fourth-ventricle.mesh');assert.equal(p.changedMaskVoxels,9);
 const currentMesh=await regionalMeshSuccessor(p.file,p.afterSha256)??p;
 assert.equal(sha(await read('public/atlas/'+p.file)),currentMesh.afterSha256);assert.equal(p.beforeSha256,p.reproducedBeforeSha256);
 assert.equal(sha(await read('tests/fixtures/block-hindbrain-fourth-ventricle-pre-anterior105.mesh')),p.beforeSha256);
 assert.deepEqual(r.sectionMeshImpact.changedFiles.sort(),['section-current-fourth-ventricle.mesh','section-current-ventricular-system.mesh']);
 const next=JSON.parse(await read('segmentation-patches/review/third-detached8-adoption-2026-09-07.json'));
 const latest=JSON.parse(await read('segmentation-patches/review/lateral-detached547-adoption-2026-09-07.json'));
 const newest=JSON.parse(await read('segmentation-patches/review/lateral-residual80-adoption-2026-09-07.json'));
 const last=JSON.parse(await read('segmentation-patches/review/lateral-cavity21-adoption-2026-09-07.json'));
 const currentRepair=await withRegionalBatches(JSON.parse(await read('segmentation-patches/review/lateral-crop34-adoption-2026-09-07.json')));assert.equal(currentRepair.beforeSha256,last.afterSha256);
 assert.equal(last.beforeSha256,newest.afterSha256);
 assert.equal(newest.beforeSha256,latest.afterSha256);
 for(const [name,info] of Object.entries(r.sectionMeshImpact.after.meshes)) {assert.equal(next.sectionMeshImpact.before.meshes[name].sha256,info.sha256);assert.equal(latest.sectionMeshImpact.before.meshes[name].sha256,next.sectionMeshImpact.after.meshes[name].sha256);assert.equal(newest.sectionMeshImpact.before.meshes[name].sha256,latest.sectionMeshImpact.after.meshes[name].sha256);assert.equal(last.sectionMeshImpact.before.meshes[name].sha256,newest.sectionMeshImpact.after.meshes[name].sha256);assert.equal(currentRepair.sectionMeshImpact.before.meshes[name].sha256,last.sectionMeshImpact.after.meshes[name].sha256);assert.equal(sha(await read('public/atlas/'+name+'.mesh')),currentRepair.sectionMeshImpact.after.meshes[name].sha256);}
 assert.equal(r.sectionMeshImpact.after.sourceSha256,r.outputCompressedSha256);
 for(const name of ['section-current-lateral-ventricles','section-current-third-ventricle'])assert.deepEqual(r.sectionMeshImpact.before.meshes[name],r.sectionMeshImpact.after.meshes[name]);
});
import {withRegionalBatches,regionalMeshSuccessor} from './helpers/residual-mesh-successor.mjs';
