import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const read=p=>readFile(new URL('../'+p,import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');
test('midline surface stage independently changes exactly four external points and preserves twelve',async()=>{
 const r=JSON.parse(await read('segmentation-patches/review/midline-surface-adoption-2026-09-06.json'));
 const base=await read('tests/fixtures/bigbrain-practical-segmentation-pre-midline-surface-2a73.bin.gz');
 assert.equal(sha(base),r.inputCompressedSha256);
 const data=gunzipSync(base),before=data.subarray(10),after=Buffer.from(before);
 const nx=data.readUInt16LE(4),ny=data.readUInt16LE(6);
 const expected=[[195,242,73],[195,242,74],[196,242,73],[196,242,74]];
 assert.deepEqual(r.points,expected);assert.equal(r.retainedPoints.length,12);
 for(const [x,y,z] of expected){const i=x+nx*(y+ny*z);assert.equal(after[i],27);after[i]=0;}
 assert.equal(sha(before),r.inputRawSha256);assert.equal(sha(after),r.outputRawSha256);
 const installed=await read('tests/fixtures/bigbrain-practical-segmentation-pre-inferior-support-732b.bin.gz');
 assert.equal(sha(installed),r.outputCompressedSha256);assert.deepEqual(gunzipSync(installed).subarray(10),after);
 const metadata=JSON.parse(await read('public/atlas/bigbrain-practical-segmentation-icbm500-validation.json'));
 assert.equal(metadata.midlineSurfaceAudit.recordSha256,'59f6aa6dae2f3eb3ee864c7b159361aa539bd1681df59eacb0b9f853f6b712fd');
 for(const [x,y,z] of r.retainedPoints)assert.equal(after[x+nx*(y+ny*z)],27);
 for(const [x,y,z] of expected)after[x+nx*(y+ny*z)]=27;
 assert.deepEqual(after,before);assert.deepEqual(r.changedBlockPartMasks,[]);assert.equal(r.expertReviewed,false);
 assert.equal(r.beforeCount27-r.afterCount27,4);
});
test('all sixteen midline points are shown in every orthogonal direction',async()=>{
 const r=JSON.parse(await read('segmentation-patches/review/midline-surface-adoption-2026-09-06.json'));
 assert.equal(r.review.points.length,16);assert.equal(r.reviewedSheets.length,2);
 const frames=r.review.sheets.flatMap(s=>s.frames);assert.equal(frames.length,8);
 for(const p of r.review.points)for(const [k,axis] of [...'xyz'].entries())assert.equal(frames.filter(f=>f.axis===axis&&f.index===p[k]).length,1);
 for(const f of frames){const k='xyz'.indexOf(f.axis);assert.equal(f.selectedVoxelCount,r.review.points.filter(p=>p[k]===f.index).length);}
});
