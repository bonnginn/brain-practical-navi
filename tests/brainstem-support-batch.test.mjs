import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const read=p=>readFile(new URL('../'+p,import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');
test('installed support repair exactly combines two reviewed regions and reverses the full volume',async()=>{
 const bytes=await read('segmentation-patches/review/brainstem-support-batch-adoption-2026-09-06.json');
 assert.equal(sha(bytes),'fda267537a478ecda65b592ebeeb3fd75a6fe5551e8657cde8fd07ce657a5269');
 const r=JSON.parse(bytes),base=await read('tests/fixtures/bigbrain-practical-segmentation-pre-inferior-support-732b.bin.gz');
 assert.equal(sha(base),r.inputCompressedSha256);
 const data=gunzipSync(base),before=data.subarray(10),after=Buffer.from(before),nx=data.readUInt16LE(4),ny=data.readUInt16LE(6),nz=data.readUInt16LE(8);
 assert.equal(r.points.length,4005);assert.equal(new Set(r.points.map(p=>p.join(','))).size,4005);
 const inferior=JSON.parse(await read(r.regions[0].record));
 assert.deepEqual(new Set(r.points.map(p=>p.join(','))),new Set([...inferior.points,...r.regions[1].points].map(p=>p.join(','))));
 assert.equal(r.regions[1].points.length,620);
 for(const region of r.regions)assert.equal(sha(await read(region.record)),region.sha256);
 for(const [x,y,z] of r.points){assert.ok([x,y,z].every(Number.isInteger)&&x>=0&&x<nx&&y>=0&&y<ny&&z>=0&&z<nz);const i=x+nx*(y+ny*z);assert.equal(after[i],27);after[i]=0;}
 assert.equal(sha(before),r.inputRawSha256);assert.equal(sha(after),r.outputRawSha256);
 const installed=await read('tests/fixtures/bigbrain-practical-segmentation-pre-lateral-dorsal-50de.bin.gz');assert.equal(sha(installed),r.outputCompressedSha256);assert.deepEqual(gunzipSync(installed).subarray(10),after);
 const meta=JSON.parse(await read('public/atlas/bigbrain-practical-segmentation-icbm500-validation.json'));assert.equal(meta.brainstemSupportAudit.recordSha256,sha(bytes));
 for(const [x,y,z] of r.points)after[x+nx*(y+ny*z)]=27;
 assert.deepEqual(after,before);assert.equal(r.expertReviewed,false);assert.deepEqual(r.changedBlockPartMasks,[]);
});
test('surface gap review covers all 620 points in 72 planes without a ventricular reassignment',async()=>{
 const r=JSON.parse(await read('segmentation-patches/review/brainstem-support-batch-adoption-2026-09-06.json'));
 const g=JSON.parse(await read(r.regions[1].record)),frames=g.rendered.flatMap(s=>s.frames);
 assert.equal(g.rendered.length,18);assert.equal(frames.length,72);assert.deepEqual(r.transitions,{'27->0':4005});
 for(const [k,axis] of [...'xyz'].entries()){
  const [lo,hi]=[[176,217],[200,215],[38,51]][k];assert.deepEqual(frames.filter(f=>f.axis===axis).map(f=>f.index),Array.from({length:hi-lo+1},(_,i)=>lo+i));
 }
 for(const p of r.regions[1].points)for(const [k,axis] of [...'xyz'].entries())assert.equal(frames.filter(f=>f.axis===axis&&f.index===p[k]).length,1);
});
