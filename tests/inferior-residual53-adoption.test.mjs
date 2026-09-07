import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {partial19Successor} from './helpers/residual-mesh-successor.mjs';
const read=p=>readFile(new URL('../'+p,import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');
test('residual adoption changes exactly 53 unlabelled voxels and is reversible',async()=>{
 const bytes=await read('segmentation-patches/review/inferior-residual53-adoption-2026-09-07.json'),r=JSON.parse(bytes);
 const base=await read('tests/fixtures/bigbrain-practical-segmentation-pre-inferior-residual53-681f.bin.gz'),current=await read('tests/fixtures/bigbrain-practical-segmentation-pre-inferior-partial19-ba31.bin.gz');
 assert.equal(sha(base),r.inputCompressedSha256);assert.equal(sha(current),r.outputCompressedSha256);
 const h=gunzipSync(base),c=gunzipSync(current);assert.equal(h.subarray(0,4).toString(),'BBS1');assert.deepEqual(h.subarray(0,10),c.subarray(0,10));
 const before=h.subarray(10),after=Buffer.from(before),seen=new Set();
 assert.equal(r.points.length,53);
 for(const p of r.points){const [x,y,z]=p.xyz;assert.ok(p.xyz.length===3&&p.xyz.every(Number.isInteger)&&x>=0&&x<394&&y>=0&&y<466&&z>=0&&z<378);const i=x+394*(y+466*z);assert.ok(!seen.has(i));seen.add(i);assert.equal(p.before,0);assert.equal(p.after,24);assert.equal(after[i],0);after[i]=24;}
 assert.deepEqual(after,c.subarray(10));assert.equal(sha(after),r.outputRawSha256);
 assert.equal(after.reduce((n,v)=>n+(v===24),0),64362);
 const meta=JSON.parse(await read('public/atlas/bigbrain-practical-segmentation-icbm500-validation.json'));
 assert.equal(meta.inferiorResidual53Audit.recordSha256,sha(bytes));
 const successor=JSON.parse(await read('segmentation-patches/review/inferior-partial19-adoption-2026-09-07.json'));
 const outer=JSON.parse(await read('segmentation-patches/review/inferior-outer40-adoption-2026-09-07.json'));
 const fourth=JSON.parse(await read('segmentation-patches/review/fourth-anterior105-adoption-2026-09-07.json'));
 const latest=JSON.parse(await read('segmentation-patches/review/third-detached8-adoption-2026-09-07.json'));
 const final=JSON.parse(await read('segmentation-patches/review/lateral-detached547-adoption-2026-09-07.json'));
 const newest=JSON.parse(await read('segmentation-patches/review/lateral-residual80-adoption-2026-09-07.json'));
 const last=JSON.parse(await read('segmentation-patches/review/lateral-cavity21-adoption-2026-09-07.json'));
 const currentRepair=await withRegionalBatches(JSON.parse(await read('segmentation-patches/review/lateral-crop34-adoption-2026-09-07.json')));assert.equal(currentRepair.beforeSha256,last.afterSha256);
 assert.equal(last.beforeSha256,newest.afterSha256);
 assert.equal(newest.beforeSha256,final.afterSha256);
 assert.equal(final.beforeSha256,latest.afterSha256);
 assert.equal(successor.inputRawSha256,sha(after));assert.equal(outer.inputRawSha256,successor.outputRawSha256);assert.equal(fourth.inputRawSha256,outer.outputRawSha256);assert.equal(latest.beforeSha256,fourth.outputCompressedSha256);assert.equal(meta.rawVoxelSha256,currentRepair.afterRawVoxelSha256);
 assert.equal(r.expertReviewed,false);assert.equal(r.published,false);
 for(const i of seen)after[i]=0;assert.deepEqual(after,before);
});
test('five updated meshes and recovery artifacts match the adoption record',async()=>{
 const r=JSON.parse(await read('segmentation-patches/review/inferior-residual53-adoption-2026-09-07.json'));
 const manifest=JSON.parse(await read('public/atlas/specimen-blocks.json'));
 assert.equal(r.meshImpact.blockMaskImpact.length,55);
 const changed=r.meshImpact.blockMaskImpact.filter(p=>p.changedMaskVoxels);assert.equal(changed.length,5);
 for(const p of changed){assert.equal(sha(await read('tests/fixtures/pre-inferior-residual53-'+p.file)),p.beforeSha256);const next=await partial19Successor(p.file,p.afterSha256)??p;assert.equal(sha(await read('public/atlas/'+p.file)),next.afterSha256);assert.equal(p.beforeSha256,p.reproducedBeforeSha256);const part=manifest.specimens[p.block].find(v=>v.part===p.part);assert.equal(part.meshSha256,next.afterSha256);assert.equal(part.vertices,next.vertices);assert.equal(part.faces,next.faces);}
 assert.equal(r.contextMaskExplanation.changes.length,1520);
});
import {withRegionalBatches} from './helpers/residual-mesh-successor.mjs';
