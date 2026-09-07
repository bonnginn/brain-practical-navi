import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const read=p=>readFile(new URL('../'+p,import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');

test('mammillary tip adoption changes exactly two points, preserving every other voxel',async()=>{
 const bytes=await read('segmentation-patches/review/mammillary-tip-adoption-2026-09-06.json'),r=JSON.parse(bytes);
 const base=await read('tests/fixtures/bigbrain-practical-segmentation-pre-mammillary-tip-e7e6.bin.gz');
 const current=await read('tests/fixtures/bigbrain-practical-segmentation-pre-cerebellar-support-86e3.bin.gz');
 assert.equal(sha(base),r.inputCompressedSha256);assert.equal(sha(current),r.outputCompressedSha256);
 const header=gunzipSync(base),before=header.subarray(10),after=Buffer.from(before),nx=header.readUInt16LE(4),ny=header.readUInt16LE(6);
 const expected=[[193,252,107],[193,253,107]];assert.deepEqual(r.points,expected);
 for(const [x,y,z] of expected){const i=x+nx*(y+ny*z);assert.equal(after[i],39);after[i]=0;}
 assert.deepEqual(gunzipSync(current).subarray(10),after);assert.equal(sha(after),r.outputRawSha256);assert.equal(sha(before),r.inputRawSha256);
 const meta=JSON.parse(await read('public/atlas/bigbrain-practical-segmentation-icbm500-validation.json'));
 const next=JSON.parse(await read('segmentation-patches/review/cerebellar-support-adoption-2026-09-06.json'));
 assert.equal(next.inputRawSha256,sha(after));assert.equal(meta.mammillaryTipAudit.recordSha256,sha(bytes));
 assert.equal(meta.labelCounts['39'],559);assert.equal(meta.labelCounts['40'],729);
 assert.equal(r.projectAdopted,true);assert.equal(r.expertReviewed,false);assert.deepEqual(r.changedBlockPartMasks,[]);
 assert.equal(r.evidence[1].record.figures.length,6);
 for(const [x,y,z] of expected)after[x+nx*(y+ny*z)]=39;
 assert.deepEqual(after,before);
});
