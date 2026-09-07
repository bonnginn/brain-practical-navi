import test from 'node:test';
import {lateralCrop34Successor} from './helpers/residual-mesh-successor.mjs';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const read=p=>readFile(new URL('../'+p,import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');

test('lateral cavity repair is exactly 21 reversible zero-to-ID24 voxels',async()=>{
 const bytes=await read('segmentation-patches/review/lateral-cavity21-adoption-2026-09-07.json'),r=JSON.parse(bytes);
 const base=await read('tests/fixtures/bigbrain-practical-segmentation-pre-lateral-cavity21-a512.bin.gz'),current=await read('tests/fixtures/bigbrain-practical-segmentation-pre-lateral-crop34-3849.bin.gz');
 assert.equal(sha(base),r.beforeSha256);assert.equal(sha(current),r.afterSha256);
 const before=gunzipSync(base),after=gunzipSync(current),expected=Buffer.from(before),seen=new Set();
 assert.equal(r.points.length,21);assert.deepEqual(before.subarray(0,10),after.subarray(0,10));
 for(const p of r.points){const [x,y,z]=p;assert.ok(p.length===3&&p.every(Number.isInteger)&&x>=0&&x<394&&y>=0&&y<466&&z>=0&&z<378);const i=10+x+394*(y+466*z);assert.ok(!seen.has(i));seen.add(i);assert.equal(expected[i],0);expected[i]=24;}
 assert.deepEqual(expected,after);assert.equal(sha(after.subarray(10)),r.afterRawVoxelSha256);
 for(const i of seen)expected[i]=0;assert.deepEqual(expected,before);
 const meta=JSON.parse(await read('public/atlas/bigbrain-practical-segmentation-icbm500-validation.json'));
 const latest=await withRegionalBatches(JSON.parse(await read('segmentation-patches/review/lateral-crop34-adoption-2026-09-07.json')));assert.equal(latest.beforeSha256,r.afterSha256);assert.equal(meta.rawVoxelSha256,latest.afterRawVoxelSha256);assert.equal(meta.lateralCavity21Audit.recordSha256,sha(bytes));assert.equal(meta.labelCounts['24'],79082);
 assert.equal(r.projectAdopted,true);assert.equal(r.expertReviewed,false);assert.equal(r.published,false);
 const manifest=JSON.parse(await read('public/atlas/specimen-blocks.json'));
 assert.equal(r.meshImpact.blockMaskImpact.length,55);assert.equal(new Set(r.meshImpact.blockMaskImpact.map(p=>p.block+'/'+p.part)).size,55);
 const changed=r.meshImpact.blockMaskImpact.filter(p=>p.changedMaskVoxels);assert.equal(changed.length,6);
 for(const p of changed){const next=await lateralCrop34Successor(p.file,p.afterSha256)??{...p,segmentationSourceSha256:r.afterSha256};assert.equal(sha(await read('public/atlas/'+p.file)),next.afterSha256);assert.equal(sha(await read('tests/fixtures/'+p.file.slice(0,-5)+'-pre-lateral-cavity21.mesh')),p.beforeSha256);const item=manifest.specimens[p.block].find(q=>q.part===p.part);assert.equal(item.meshSha256,next.afterSha256);assert.equal(item.segmentationSourceSha256,next.segmentationSourceSha256);}
 for(const [name,info] of Object.entries(r.sectionMeshImpact.after.meshes)){assert.equal(latest.sectionMeshImpact.before.meshes[name].sha256,info.sha256);assert.equal(sha(await read('public/atlas/'+name+'.mesh')),latest.sectionMeshImpact.after.meshes[name].sha256);}
 for(const name of ['section-current-third-ventricle','section-current-fourth-ventricle'])assert.deepEqual(r.sectionMeshImpact.before.meshes[name],r.sectionMeshImpact.after.meshes[name]);
 assert.equal(r.maskDirection.blockRows.length,55);assert.deepEqual(r.maskDirection.blockRows.filter(p=>p.added||p.removed).map(p=>[p.block,p.part,p.added,p.removed]),[['lateral-ventricle','tissue',38,1],['lateral-ventricle','ventricular-cavity',3,0],['choroid-plexus','tissue',36,1],['choroid-plexus','ventricular-cavity',3,0],['medial-temporal','tissue',0,1],['medial-temporal','inferior-horn',3,0]]);
});
import {withRegionalBatches} from './helpers/residual-mesh-successor.mjs';
