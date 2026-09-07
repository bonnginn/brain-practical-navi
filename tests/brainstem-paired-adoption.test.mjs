import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const root=new URL('../',import.meta.url);
const read=p=>readFile(new URL(p,root));
const sha=b=>createHash('sha256').update(b).digest('hex');

test('paired brainstem island adoption independently replays exactly 16 points and reverses',async()=>{
 const recordBytes=await read('segmentation-patches/review/brainstem-paired-islands-adoption-2026-09-06.json');
 assert.equal(sha(recordBytes),'22ed2f98719a9bec65af4d1fffa985085e732965c4f7817b48573b25684d2600');
 const r=JSON.parse(recordBytes);
 const base=await read('tests/fixtures/bigbrain-practical-segmentation-pre-paired-islands-c58f.bin.gz');
 const installed=await read('tests/fixtures/bigbrain-practical-segmentation-pre-three-islands-189f.bin.gz');
 assert.equal(sha(base),r.inputCompressedSha256);
 assert.equal(sha(installed),r.outputCompressedSha256);
 const decoded=gunzipSync(base),before=decoded.subarray(10),after=Buffer.from(before);
 const nx=decoded.readUInt16LE(4),ny=decoded.readUInt16LE(6),nz=decoded.readUInt16LE(8);
 assert.deepEqual([nx,ny,nz],[394,466,378]);
 assert.equal(r.points.length,16);assert.equal(new Set(r.points.map(p=>p.join(','))).size,16);
 for(const [x,y,z] of r.points){
  assert.ok([x,y,z].every(Number.isInteger)&&x>=0&&x<nx&&y>=0&&y<ny&&z>=0&&z<nz);
  const i=x+nx*(y+ny*z);assert.equal(after[i],27);after[i]=0;
 }
 assert.equal(sha(before),r.inputRawSha256);assert.equal(sha(after),r.outputRawSha256);
 assert.deepEqual(after,gunzipSync(installed).subarray(10));
 for(const [x,y,z] of r.points)after[x+nx*(y+ny*z)]=27;
 assert.deepEqual(after,before);assert.equal(r.expertReviewed,false);
 const metadata=JSON.parse(await read('public/atlas/bigbrain-practical-segmentation-icbm500-validation.json'));
 assert.equal(metadata.brainstemPairedIslandsAudit.recordSha256,sha(recordBytes));
 assert.equal(metadata.brainstemPairedIslandsAudit.changedVoxelCount,16);
});
