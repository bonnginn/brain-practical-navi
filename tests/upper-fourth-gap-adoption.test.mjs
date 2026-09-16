import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {withRegionalBatches} from './helpers/residual-mesh-successor.mjs';

const read=p=>readFile(new URL('../'+p,import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');

test('upper fourth gap adoption replays exactly 158 reversible reviewed cells',async()=>{
 const bytes=await read('segmentation-patches/review/upper-fourth-gap-adoption-2026-09-15.json'),r=JSON.parse(bytes);
 const base=await read('tests/fixtures/bigbrain-practical-segmentation-pre-upper-fourth-gap.bin.gz');
 assert.equal(sha(base),r.beforeSha256);assert.equal(r.count,158);assert.equal(r.transition,'mixed-to-26');
 const before=gunzipSync(base),after=Buffer.from(before),nx=before.readUInt16LE(4),ny=before.readUInt16LE(6),seen=new Set();
 assert.deepEqual(before.subarray(0,10),after.subarray(0,10));
 assert.deepEqual(r.points.reduce((a,p)=>(a[p.before]??=0,a[p.before]++,a),{}),{'0':57,'27':101});
 for(const p of r.points){const [x,y,z]=p.xyz;assert.equal(p.after,26);assert.ok(x>=0&&x<nx&&y>=0&&y<ny&&z>=0&&z<before.readUInt16LE(8));const i=10+x+nx*(y+ny*z);assert.ok(!seen.has(i));seen.add(i);assert.equal(after[i],p.before);after[i]=26;}
 assert.equal(seen.size,158);const installed=await read('public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz'),latest=await withRegionalBatches(r,{afterRevision:r.afterSha256});assert.equal(sha(installed),latest.afterSha256);
 for(const p of r.points){const [x,y,z]=p.xyz;after[10+x+nx*(y+ny*z)]=p.before;}assert.deepEqual(after,before);
});

test('upper fourth install preserves metadata and synchronizes changed meshes',async()=>{
 const r=JSON.parse(await read('segmentation-patches/review/upper-fourth-gap-adoption-2026-09-15.json')),latest=await withRegionalBatches(r,{afterRevision:r.afterSha256});
 assert.equal(r.projectAdopted,true);assert.equal(r.expertReviewed,false);assert.equal(r.published,false);assert.equal(r.installed,true);
 const meta=JSON.parse(await read('public/atlas/bigbrain-practical-segmentation-icbm500-validation.json'));
 assert.equal(meta.labelCounts['26'],9202);assert.equal(meta.labelCounts['27'],264456);assert.equal(meta.rawVoxelSha256,latest.afterRawVoxelSha256);
 const manifest=JSON.parse(await read('public/atlas/specimen-blocks.json'));
 for(const p of r.meshImpact.blockMaskImpact.filter(p=>p.changedMaskVoxels)){const e=manifest.specimens[p.block].find(e=>e.part===p.part);assert.equal(e.meshSha256,sha(await read('public/atlas/'+p.file)));assert.equal(sha(await read('tests/fixtures/'+p.file.replace('.mesh','-pre-upper-fourth-gap.mesh'))),p.beforeSha256);}
 for(const [name,info] of Object.entries(latest.sectionMeshImpact.after.meshes)){assert.equal(sha(await read('public/atlas/'+name+'.mesh')),info.sha256);}
 for(const name of ['block-lateral-ventricle-ventricular-cavity.mesh','block-commissural-system-lateral-ventricles.mesh','block-choroid-plexus-ventricular-cavity.mesh','block-medial-temporal-inferior-horn.mesh']){const p=JSON.parse(await read('segmentation-patches/review/fine-cavity-mesh-representation-2026-09-15.json')).meshes.find(p=>p.file===name);assert.equal(sha(await read('public/atlas/'+name)),p.afterSha256);}
});
