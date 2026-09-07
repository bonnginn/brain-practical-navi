import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const root=new URL('../',import.meta.url);
const read=p=>readFile(new URL(p,root));
const sha=b=>createHash('sha256').update(b).digest('hex');

test('brainstem island adoption independently replays exactly 40 points and reverses',async()=>{
 const recordBytes=await read('segmentation-patches/review/brainstem-island-adoption-2026-09-06.json');
 assert.equal(sha(recordBytes),'2afc8d4bb428b9f808b6d09317ae98d8db4587ee61d6c6e008e20101465f9550');
 const r=JSON.parse(recordBytes);
 const base=await read('tests/fixtures/bigbrain-practical-segmentation-pre-brainstem-island-7ebe.bin.gz');
 const installed=await read('tests/fixtures/bigbrain-practical-segmentation-pre-paired-islands-c58f.bin.gz');
 assert.equal(sha(base),r.inputCompressedSha256);
 assert.equal(sha(installed),r.outputCompressedSha256);
 const decoded=gunzipSync(base),before=decoded.subarray(10),after=Buffer.from(before);
 const nx=decoded.readUInt16LE(4),ny=decoded.readUInt16LE(6),nz=decoded.readUInt16LE(8);
 assert.deepEqual([nx,ny,nz],[394,466,378]);
 assert.equal(r.points.length,40);assert.equal(new Set(r.points.map(p=>p.join(','))).size,40);
 for(const [x,y,z] of r.points){
  assert.ok([x,y,z].every(Number.isInteger)&&x>=0&&x<nx&&y>=0&&y<ny&&z>=0&&z<nz);
  const i=x+nx*(y+ny*z);assert.equal(after[i],27);after[i]=0;
 }
 assert.equal(sha(before),r.inputRawSha256);assert.equal(sha(after),r.outputRawSha256);
 assert.deepEqual(after,gunzipSync(installed).subarray(10));
 for(const [x,y,z] of r.points)after[x+nx*(y+ny*z)]=27;
 assert.deepEqual(after,before);assert.equal(r.expertReviewed,false);
 const metadata=JSON.parse(await read('public/atlas/bigbrain-practical-segmentation-icbm500-validation.json'));
 assert.equal(metadata.brainstemIslandAudit.recordSha256,sha(recordBytes));
 assert.equal(metadata.brainstemIslandAudit.changedVoxelCount,40);
});
