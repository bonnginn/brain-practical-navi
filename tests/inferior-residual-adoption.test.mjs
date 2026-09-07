import {residual53Successor} from './helpers/residual-mesh-successor.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const read=p=>readFile(new URL('../'+p,import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');
test('residual adoption changes exactly 57 unlabelled voxels and is reversible',async()=>{
 const bytes=await read('segmentation-patches/review/inferior-residual-adoption-2026-09-07.json'),r=JSON.parse(bytes);
 const base=await read('tests/fixtures/bigbrain-practical-segmentation-pre-inferior-residual-5f18.bin.gz'),current=await read('tests/fixtures/bigbrain-practical-segmentation-pre-inferior-residual53-681f.bin.gz');
 assert.equal(sha(base),r.inputCompressedSha256);assert.equal(sha(current),r.outputCompressedSha256);
 const h=gunzipSync(base),c=gunzipSync(current);assert.equal(h.subarray(0,4).toString(),'BBS1');assert.deepEqual(h.subarray(0,10),c.subarray(0,10));
 const before=h.subarray(10),after=Buffer.from(before),seen=new Set();
 assert.equal(r.points.length,57);
 for(const p of r.points){const [x,y,z]=p.xyz;assert.ok(p.xyz.length===3&&p.xyz.every(Number.isInteger)&&x>=0&&x<394&&y>=0&&y<466&&z>=0&&z<378);const i=x+394*(y+466*z);assert.ok(!seen.has(i));seen.add(i);assert.equal(p.before,0);assert.equal(p.after,24);assert.equal(after[i],0);after[i]=24;}
 assert.deepEqual(after,c.subarray(10));assert.equal(sha(after),r.outputRawSha256);
 assert.equal(after.reduce((n,v)=>n+(v===24),0),64309);
 const meta=JSON.parse(await read('public/atlas/bigbrain-practical-segmentation-icbm500-validation.json'));
 assert.equal(meta.inferiorResidualAudit.recordSha256,sha(bytes));const successor=JSON.parse(await read('segmentation-patches/review/inferior-residual53-adoption-2026-09-07.json'));assert.equal(successor.inputRawSha256,sha(after));
 assert.equal(r.expertReviewed,false);assert.equal(r.published,false);
 for(const i of seen)after[i]=0;assert.deepEqual(after,before);
});
test('six updated meshes and recovery artifacts match the adoption record',async()=>{
 const r=JSON.parse(await read('segmentation-patches/review/inferior-residual-adoption-2026-09-07.json'));
 const manifest=JSON.parse(await read('public/atlas/specimen-blocks.json'));
 assert.equal(r.meshImpact.blockMaskImpact.length,55);
 const changed=r.meshImpact.blockMaskImpact.filter(p=>p.changedMaskVoxels);assert.equal(changed.length,6);
 for(const p of changed){const next=await residual53Successor(p.file,p.afterSha256);assert.equal(sha(await read('tests/fixtures/pre-inferior-residual-'+p.file)),p.beforeSha256);assert.equal(sha(await read('public/atlas/'+p.file)),next?.afterSha256??p.afterSha256);assert.equal(p.beforeSha256,p.reproducedBeforeSha256);const part=manifest.specimens[p.block].find(v=>v.part===p.part);assert.equal(part.meshSha256,next?.afterSha256??p.afterSha256);assert.equal(part.vertices,next?.vertices??p.vertices);assert.equal(part.faces,next?.faces??p.faces);}
 assert.equal(r.contextMaskExplanation.changes.length,259);
});
