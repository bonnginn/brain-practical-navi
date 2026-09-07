import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const read=p=>readFile(new URL('../'+p,import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');
test('inferior image-support stage replays and reverses exactly the reviewed 3385 points',async()=>{
 const r=JSON.parse(await read('segmentation-patches/review/brainstem-inferior-support-adoption-2026-09-06.json'));
 const base=await read('tests/fixtures/bigbrain-practical-segmentation-pre-inferior-support-732b.bin.gz');
 assert.equal(sha(base),r.inputCompressedSha256);
 const data=gunzipSync(base),before=data.subarray(10),after=Buffer.from(before);
 const nx=data.readUInt16LE(4),ny=data.readUInt16LE(6),nz=data.readUInt16LE(8);
 assert.equal(r.points.length,3385);assert.equal(new Set(r.points.map(p=>p.join(','))).size,3385);
 for(const [x,y,z] of r.points){
  assert.ok([x,y,z].every(Number.isInteger)&&x>=181&&x<=210&&y>=165&&y<=192&&z>=0&&z<=14&&z<nz);
  const i=x+nx*(y+ny*z);assert.equal(after[i],27);after[i]=0;
 }
 assert.equal(sha(before),r.inputRawSha256);assert.equal(sha(after),r.outputRawSha256);
 for(const [x,y,z] of r.points)after[x+nx*(y+ny*z)]=27;
 assert.deepEqual(after,before);assert.deepEqual(r.changedBlockPartMasks,[]);assert.equal(r.expertReviewed,false);
 assert.equal(r.beforeCount27-r.afterCount27,3385);
});
test('inferior region review covers every slice of all axes plus available neighbours',async()=>{
 const r=JSON.parse(await read('segmentation-patches/review/brainstem-inferior-support-adoption-2026-09-06.json'));
 assert.equal(r.review.rendered.length,20);assert.equal(r.reviewedSheets.length,20);
 const frames=r.review.rendered.flatMap(s=>s.frames);assert.equal(frames.length,78);
 for(const [k,axis] of [...'xyz'].entries()){
  const [lo,hi]=[[180,211],[164,193],[0,15]][k];
  assert.deepEqual(frames.filter(f=>f.axis===axis).map(f=>f.index),Array.from({length:hi-lo+1},(_,i)=>lo+i));
 }
 for(const p of r.points)for(const [k,axis] of [...'xyz'].entries())assert.equal(frames.filter(f=>f.axis===axis&&f.index===p[k]).length,1);
});
