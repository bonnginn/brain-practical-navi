import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const read=p=>readFile(new URL('../'+p,import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');

test('lateral fringe adoption replays exactly 308 points and preserves prior labels',async()=>{
 const bytes=await read('segmentation-patches/review/lateral-fringe-adoption-2026-09-07.json'),r=JSON.parse(bytes);
 const base=await read('tests/fixtures/bigbrain-practical-segmentation-pre-lateral-fringe-d429.bin.gz');
 const current=await read('tests/fixtures/bigbrain-practical-segmentation-pre-lateral-next-83dc.bin.gz');
 assert.equal(sha(base),r.inputCompressedSha256);assert.equal(sha(current),r.outputCompressedSha256);
 const h=gunzipSync(base),before=h.subarray(10),after=Buffer.from(before),nx=h.readUInt16LE(4),ny=h.readUInt16LE(6),seen=new Set(),counts={23:0,24:0};
 assert.equal(r.points.length,308);
 for(const p of r.points){const [x,y,z]=p.xyz,i=x+nx*(y+ny*z);assert.equal(p.before,0);assert.ok(p.after===23||p.after===24);assert.ok(!seen.has(i));seen.add(i);assert.equal(after[i],0);after[i]=p.after;counts[p.after]++;}
 assert.deepEqual(counts,{23:144,24:164});assert.deepEqual(after,gunzipSync(current).subarray(10));assert.equal(sha(after),r.outputRawSha256);
 const meta=JSON.parse(await read('public/atlas/bigbrain-practical-segmentation-icbm500-validation.json'));
 assert.equal(r.outputRawSha256,sha(after));assert.equal(meta.lateralFringeAudit.recordSha256,sha(bytes));
 for(const [id,count] of [[23,63991],[24,63033]])assert.equal(after.reduce((n,v)=>n+(v===id),0),count);
 assert.equal(r.projectAdopted,true);assert.equal(r.expertReviewed,false);assert.equal(r.published,false);
 for(const i of seen)after[i]=0;assert.deepEqual(after,before);
});

test('three dependent meshes reconcile historical drift with preserved fixtures',async()=>{
 const r=JSON.parse(await read('segmentation-patches/review/lateral-fringe-adoption-2026-09-07.json'));
 const parts=r.meshImpact.blockMaskImpact,changed=parts.filter(p=>p.changedMaskVoxels);
 assert.equal(parts.length,55);assert.deepEqual(changed.map(p=>p.changedMaskVoxels),[2,5,2]);
 for(const p of changed){assert.equal(sha(await read('tests/fixtures/pre-lateral-next-'+p.file)),p.afterSha256);assert.equal(sha(await read('tests/fixtures/pre-lateral-fringe-'+p.file)),p.beforeSha256);
  const history=r.historicalMeshReconciliation.results.find(h=>h.file===p.file);assert.equal(history.historicalReproducesInstalled,true);assert.equal(history.historicalReproducedSha256,p.beforeSha256);
 }
});
