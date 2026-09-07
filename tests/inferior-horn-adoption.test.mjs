import {residualSuccessor} from './helpers/residual-mesh-successor.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const read=p=>readFile(new URL('../'+p,import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');

test('304 right ventricular additions exactly replay the archived stage and reverse',async()=>{
 const bytes=await read('segmentation-patches/review/inferior-horn-adoption-2026-09-07.json'),r=JSON.parse(bytes);
 const base=await read('tests/fixtures/bigbrain-practical-segmentation-pre-inferior-horn-0d31.bin.gz'),current=await read('tests/fixtures/bigbrain-practical-segmentation-pre-inferior-residual-5f18.bin.gz');
 assert.equal(sha(base),r.inputCompressedSha256);assert.equal(sha(current),r.outputCompressedSha256);
 const before=gunzipSync(base),actual=gunzipSync(current),after=Buffer.from(before),seen=new Set();
 assert.equal(before.subarray(0,4).toString(),'BBS1');assert.deepEqual([before.readUInt16LE(4),before.readUInt16LE(6),before.readUInt16LE(8)],[394,466,378]);
 assert.equal(r.points.length,304);
 for(const p of r.points){const [x,y,z]=p.xyz;assert.ok(p.xyz.length===3&&p.xyz.every(Number.isInteger)&&x>=0&&x<394&&y>=0&&y<466&&z>=0&&z<378);const i=10+x+394*(y+466*z);assert.ok(!seen.has(i));seen.add(i);assert.equal(p.before,0);assert.equal(p.after,24);assert.equal(after[i],0);after[i]=24;}
 assert.deepEqual(after,actual);assert.equal(sha(after.subarray(10)),r.outputRawSha256);
 const meta=JSON.parse(await read('public/atlas/bigbrain-practical-segmentation-icbm500-validation.json'));
 const successor=JSON.parse(await read('segmentation-patches/review/inferior-residual-adoption-2026-09-07.json'));assert.equal(successor.inputRawSha256,r.outputRawSha256);assert.equal(meta.inferiorHornAudit.recordSha256,sha(bytes));
 assert.equal(after.subarray(10).reduce((n,v)=>n+(v===24),0),64252);
 assert.equal(r.expertReviewed,false);assert.equal(r.published,false);assert.equal(r.projectAdopted,true);
 for(const i of seen)after[i]=0;assert.deepEqual(after,before);
});

test('seven regenerated meshes retain recovery evidence and current provenance',async()=>{
 const r=JSON.parse(await read('segmentation-patches/review/inferior-horn-adoption-2026-09-07.json')),manifest=JSON.parse(await read('public/atlas/specimen-blocks.json'));
 const changed=r.meshImpact.blockMaskImpact.filter(p=>p.changedMaskVoxels);
 assert.equal(r.meshImpact.blockMaskImpact.length,55);assert.equal(changed.length,7);assert.equal(r.meshImpact.installationBlocked,false);
 for(const p of changed){const successor=await residualSuccessor(p.file,p.afterSha256);assert.equal(sha(await read('public/atlas/'+p.file)),successor?.afterSha256??p.afterSha256);assert.equal(sha(await read('tests/fixtures/pre-inferior-horn-'+p.file)),p.beforeSha256);assert.equal(p.beforeSha256,p.reproducedBeforeSha256);const entry=manifest.specimens[p.block].find(e=>e.part===p.part);assert.equal(entry.meshSha256,successor?.afterSha256??p.afterSha256);assert.equal(entry.segmentationSourceSha256,successor?.segmentationSourceSha256??r.outputCompressedSha256);}
 assert.deepEqual(r.visualReview,{localPlanes:164,widerContextPlanes:14,expertReviewed:false});
 assert.equal(r.contextMaskExplanation.changes.length,64);
});
