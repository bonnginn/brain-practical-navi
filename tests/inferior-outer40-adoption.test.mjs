import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const read=p=>readFile(new URL('../'+p,import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');

test('outer 40 adopted cells exactly replay to their preserved successor input and reverse',async()=>{
 const recordBytes=await read('segmentation-patches/review/inferior-outer40-adoption-2026-09-07.json'),r=JSON.parse(recordBytes);
 const base=await read('tests/fixtures/bigbrain-practical-segmentation-pre-inferior-outer40-58d8.bin.gz'),current=await read('tests/fixtures/bigbrain-practical-segmentation-pre-fourth-anterior105-e98c.bin.gz');
 assert.equal(sha(base),r.inputCompressedSha256);assert.equal(sha(current),r.outputCompressedSha256);
 const before=gunzipSync(base),after=gunzipSync(current),expected=Buffer.from(before),seen=new Set();
 assert.equal(before.subarray(0,4).toString(),'BBS1');assert.deepEqual(before.subarray(0,10),after.subarray(0,10));
 assert.equal(r.points.length,40);assert.deepEqual(r.transitions,{'0->24':40});
 for(const p of r.points){const [x,y,z]=p.xyz;assert.ok(p.xyz.length===3&&p.xyz.every(Number.isInteger)&&x>=0&&x<394&&y>=0&&y<466&&z>=0&&z<378);const i=10+x+394*(y+466*z);assert.ok(!seen.has(i));seen.add(i);assert.equal(p.before,0);assert.equal(p.after,24);assert.equal(expected[i],0);expected[i]=24;}
 assert.deepEqual(expected,after);assert.equal(sha(after.subarray(10)),r.outputRawSha256);
 assert.equal(after.subarray(10).reduce((n,v)=>n+(v===24),0),64421);
 const meta=JSON.parse(await read('public/atlas/bigbrain-practical-segmentation-icbm500-validation.json'));
 const successor=JSON.parse(await read('segmentation-patches/review/fourth-anterior105-adoption-2026-09-07.json'));
 const latest=JSON.parse(await read('segmentation-patches/review/third-detached8-adoption-2026-09-07.json'));
 const final=JSON.parse(await read('segmentation-patches/review/lateral-detached547-adoption-2026-09-07.json'));
 const newest=JSON.parse(await read('segmentation-patches/review/lateral-residual80-adoption-2026-09-07.json'));
 const last=JSON.parse(await read('segmentation-patches/review/lateral-cavity21-adoption-2026-09-07.json'));
 const currentRepair=await withRegionalBatches(JSON.parse(await read('segmentation-patches/review/lateral-crop34-adoption-2026-09-07.json')));assert.equal(currentRepair.beforeSha256,last.afterSha256);
 assert.equal(last.beforeSha256,newest.afterSha256);
 assert.equal(newest.beforeSha256,final.afterSha256);
 assert.equal(final.beforeSha256,latest.afterSha256);
 assert.equal(successor.inputRawSha256,r.outputRawSha256);assert.equal(latest.beforeSha256,successor.outputCompressedSha256);assert.equal(meta.rawVoxelSha256,currentRepair.afterRawVoxelSha256);assert.equal(meta.inferiorOuter40Audit.recordSha256,sha(recordBytes));
 assert.equal(r.projectAdopted,true);assert.equal(r.expertReviewed,false);assert.equal(r.published,false);
 const rows=r.meshImpact.blockMaskImpact;assert.equal(rows.length,55);assert.equal(new Set(rows.map(p=>p.block+'/'+p.part)).size,55);assert.ok(rows.every(p=>p.changedMaskVoxels===0));
 for(const i of seen)expected[i]=0;assert.deepEqual(expected,before);
});
import {withRegionalBatches} from './helpers/residual-mesh-successor.mjs';
