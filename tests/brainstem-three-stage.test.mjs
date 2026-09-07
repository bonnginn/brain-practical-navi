import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const read=p=>readFile(new URL('../'+p,import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');
test('three-island staged adoption independently reconstructs and reverses exactly 27 points',async()=>{
 const bytes=await read('segmentation-patches/review/brainstem-three-islands-adoption-2026-09-06.json');
 assert.equal(sha(bytes),'9c7b14f4272969261e3e2415d3f522b7e5d7db1eeca7cb0c8ae28b225458be66');
 const r=JSON.parse(bytes),base=await read('tests/fixtures/bigbrain-practical-segmentation-pre-three-islands-189f.bin.gz');
 assert.equal(sha(base),r.inputCompressedSha256);
 const data=gunzipSync(base),before=data.subarray(10),after=Buffer.from(before);
 const nx=data.readUInt16LE(4),ny=data.readUInt16LE(6),nz=data.readUInt16LE(8);
 assert.equal(r.points.length,27);assert.equal(new Set(r.points.map(p=>p.join(','))).size,27);
 const removedContacts={33:0,39:0,40:0};
 for(const [x,y,z] of r.points)for(const [dx,dy,dz] of [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]){
  const value=before[(x+dx)+nx*((y+dy)+ny*(z+dz))];
  if(value===33||value===39||value===40)removedContacts[value]++;
 }
 assert.deepEqual(removedContacts,{33:3,39:11,40:7});
 for(const [x,y,z] of r.points){
  assert.ok([x,y,z].every(Number.isInteger)&&x>=0&&x<nx&&y>=0&&y<ny&&z>=0&&z<nz);
  const i=x+nx*(y+ny*z);assert.equal(after[i],27);after[i]=0;
 }
 assert.equal(sha(before),r.inputRawSha256);assert.equal(sha(after),r.outputRawSha256);
 const installed=await read('tests/fixtures/bigbrain-practical-segmentation-pre-cerebellar-islands-8238.bin.gz');
 assert.equal(sha(installed),r.outputCompressedSha256);
 assert.deepEqual(gunzipSync(installed).subarray(10),after);
 const metadata=JSON.parse(await read('public/atlas/bigbrain-practical-segmentation-icbm500-validation.json'));
 assert.equal(metadata.brainstemThreeIslandsAudit.recordSha256,sha(bytes));
 for(const [x,y,z] of r.points)after[x+nx*(y+ny*z)]=27;
 assert.deepEqual(after,before);assert.equal(r.expertReviewed,false);
 assert.deepEqual(r.changedBlockPartMasks,[]);
});
