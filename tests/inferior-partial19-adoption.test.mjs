import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const read=p=>readFile(new URL('../'+p,import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');
test('19-cell adoption is exact, reversible and development-only',async()=>{
 const bytes=await read('segmentation-patches/review/inferior-partial19-adoption-2026-09-07.json'),r=JSON.parse(bytes);
 const base=await read('tests/fixtures/bigbrain-practical-segmentation-pre-inferior-partial19-ba31.bin.gz'),current=await read('tests/fixtures/bigbrain-practical-segmentation-pre-inferior-outer40-58d8.bin.gz');
 assert.equal(sha(base),r.inputCompressedSha256);assert.equal(sha(current),r.outputCompressedSha256);
 const before=gunzipSync(base),after=gunzipSync(current),expected=Buffer.from(before),seen=new Set();
 assert.equal(before.subarray(0,4).toString(),'BBS1');assert.deepEqual(before.subarray(0,10),after.subarray(0,10));
 assert.equal(r.points.length,19);
 for(const p of r.points){const [x,y,z]=p.xyz;assert.ok(p.xyz.length===3&&p.xyz.every(Number.isInteger)&&x>=0&&x<394&&y>=0&&y<466&&z>=0&&z<378);const i=10+x+394*(y+466*z);assert.ok(!seen.has(i));seen.add(i);assert.equal(p.before,0);assert.equal(p.after,24);assert.equal(expected[i],0);expected[i]=24;}
 assert.deepEqual(expected,after);assert.equal(sha(after.subarray(10)),r.outputRawSha256);
 assert.equal(after.subarray(10).reduce((n,v)=>n+(v===24),0),64381);
 const meta=JSON.parse(await read('public/atlas/bigbrain-practical-segmentation-icbm500-validation.json'));
 assert.equal(meta.inferiorPartial19Audit.recordSha256,sha(bytes));
 assert.equal(r.expertReviewed,false);assert.equal(r.published,false);
 for(const i of seen)expected[i]=0;assert.deepEqual(expected,before);
});
test('six meshes preserve recovery evidence and match manifest',async()=>{
 const {lateralDetachedSuccessor}=await import('./helpers/residual-mesh-successor.mjs');
 const r=JSON.parse(await read('segmentation-patches/review/inferior-partial19-adoption-2026-09-07.json'));
 const m=JSON.parse(await read('public/atlas/specimen-blocks.json'));
 const changed=r.meshImpact.blockMaskImpact.filter(p=>p.changedMaskVoxels);assert.equal(changed.length,6);
 for(const p of changed){const next=await lateralDetachedSuccessor(p.file,p.afterSha256)??{...p,segmentationSourceSha256:r.outputCompressedSha256};assert.equal(sha(await read('tests/fixtures/pre-inferior-partial19-'+p.file)),p.beforeSha256);assert.equal(sha(await read('public/atlas/'+p.file)),next.afterSha256);assert.equal(p.reproducedBeforeSha256,p.beforeSha256);const part=m.specimens[p.block].find(v=>v.part===p.part);assert.equal(part.meshSha256,next.afterSha256);assert.equal(part.segmentationSourceSha256,next.segmentationSourceSha256);assert.equal(part.vertices,next.vertices);assert.equal(part.faces,next.faces);}
});
