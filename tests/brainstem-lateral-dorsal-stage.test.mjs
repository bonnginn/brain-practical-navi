import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const read=p=>readFile(new URL('../'+p,import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');
test('lateral/dorsal stage independently replays exactly 466 points and preserves other labels',async()=>{
 const r=JSON.parse(await read('segmentation-patches/review/brainstem-lateral-dorsal-adoption-2026-09-06.json'));
 const base=await read('tests/fixtures/bigbrain-practical-segmentation-pre-lateral-dorsal-50de.bin.gz');assert.equal(sha(base),r.inputCompressedSha256);
 const data=gunzipSync(base),before=data.subarray(10),after=Buffer.from(before),nx=data.readUInt16LE(4),ny=data.readUInt16LE(6),nz=data.readUInt16LE(8);
 assert.equal(r.points.length,466);assert.equal(new Set(r.points.map(p=>p.join(','))).size,466);
 assert.deepEqual(r.regions.map(r=>r.count),[242,224]);
 assert.deepEqual(new Set(r.points.map(p=>p.join(','))),new Set(r.regions.flatMap(r=>r.points).map(p=>p.join(','))));
 for(const [x,y,z] of r.points){assert.ok([x,y,z].every(Number.isInteger)&&x>=0&&x<nx&&y>=0&&y<ny&&z>=0&&z<nz);const i=x+nx*(y+ny*z);assert.equal(after[i],27);after[i]=0;}
 assert.equal(sha(before),r.inputRawSha256);assert.equal(sha(after),r.outputRawSha256);
 const installed=await read('tests/fixtures/bigbrain-practical-segmentation-pre-mammillary-tip-e7e6.bin.gz');assert.equal(sha(installed),r.outputCompressedSha256);assert.deepEqual(gunzipSync(installed).subarray(10),after);
 const meta=JSON.parse(await read('public/atlas/bigbrain-practical-segmentation-icbm500-validation.json'));assert.equal(meta.labelCounts['27'],249983);assert.equal(meta.brainstemLateralDorsalAudit.recordSha256,'a0909129446eeba7a7bae898b3a665e5e4f015f49a321288a100de4e56320621');
 for(const [x,y,z] of r.points)after[x+nx*(y+ny*z)]=27;
 assert.deepEqual(after,before);assert.equal(r.afterCount27,250042);assert.deepEqual(r.changedBlockPartMasks,[]);assert.equal(r.expertReviewed,false);
});
test('pinned edge reviews cover every point in all three planes and use current dorsal evidence',async()=>{
 const r=JSON.parse(await read('segmentation-patches/review/brainstem-lateral-dorsal-adoption-2026-09-06.json'));
 let total=0;
 for(const region of r.regions){
  const bytes=await read(region.review);assert.equal(sha(bytes),region.reviewSha256);const evidence=JSON.parse(bytes),frames=evidence.rendered.flatMap(s=>s.frames);total+=frames.length;
  assert.equal(frames.length,region.name==='lateral'?57:52);
  if(region.name==='dorsal')assert.equal(evidence.sourceSha256,r.inputCompressedSha256);
  for(const p of region.points)for(const [k,axis] of [...'xyz'].entries())assert.equal(frames.filter(f=>f.axis===axis&&f.index===p[k]).length,1);
 }
 assert.equal(total,109);
});
