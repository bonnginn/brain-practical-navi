import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const read=p=>readFile(new URL('../'+p,import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');

test('fourth paired repair is exactly 16 reversible additions with current metadata',async()=>{
 const bytes=await read('segmentation-patches/review/fourth-ventricle-paired-adoption-2026-09-07.json'),r=JSON.parse(bytes);
 const base=await read('tests/fixtures/bigbrain-practical-segmentation-pre-fourth-paired-9bc5.bin.gz');
 const current=await read('tests/fixtures/bigbrain-practical-segmentation-pre-lateral-fringe-d429.bin.gz');
 assert.equal(sha(base),r.inputCompressedSha256);assert.equal(sha(current),r.outputCompressedSha256);
 const h=gunzipSync(base),before=h.subarray(10),after=Buffer.from(before),nx=h.readUInt16LE(4),ny=h.readUInt16LE(6);
 const expected=[];for(const x of [187,188,203,204])for(const y of [181,182])for(const z of [71,72])expected.push({xyz:[x,y,z],before:0,after:26});
 assert.deepEqual(r.points,expected);
 for(const p of r.points){const [x,y,z]=p.xyz,i=x+nx*(y+ny*z);assert.equal(after[i],0);after[i]=26;}
 assert.deepEqual(after,gunzipSync(current).subarray(10));assert.equal(sha(after),r.outputRawSha256);
 const meta=JSON.parse(await read('public/atlas/bigbrain-practical-segmentation-icbm500-validation.json'));
 assert.equal(r.outputRawSha256,sha(after));assert.equal(meta.fourthVentriclePairedAudit.recordSha256,sha(bytes));
 assert.equal(meta.labelCounts['26'],9008);assert.equal(after.reduce((n,v)=>n+(v===26),0),8536);
 assert.equal(r.projectAdopted,true);assert.equal(r.expertReviewed,false);assert.equal(r.published,false);
 for(const p of r.points){const [x,y,z]=p.xyz;after[x+nx*(y+ny*z)]=0;}assert.deepEqual(after,before);
});

test('only fourth ventricle mask changes and old mesh is reproducible',async()=>{
 const r=JSON.parse(await read('segmentation-patches/review/fourth-ventricle-paired-adoption-2026-09-07.json'));
 const parts=r.meshImpact.blockMaskImpact,changed=parts.filter(p=>p.changedMaskVoxels);
 assert.equal(parts.length,55);assert.equal(changed.length,1);
 const p=changed[0];assert.equal(p.changedMaskVoxels,2);assert.equal(p.part,'fourth-ventricle');assert.equal(p.beforeMatches,true);
 assert.equal(p.beforeSha256,p.reproducedBeforeSha256);
 assert.equal(sha(await read('tests/fixtures/block-hindbrain-fourth-ventricle-pre-anterior105.mesh')),p.afterSha256);
 assert.equal(sha(await read('tests/fixtures/block-hindbrain-fourth-ventricle-pre-paired.mesh')),p.beforeSha256);
 const meta=JSON.parse(await read('public/atlas/specimen-blocks.json')).specimens.hindbrain.find(p=>p.part==='fourth-ventricle');
 const successor=JSON.parse(await read('segmentation-patches/review/fourth-anterior105-adoption-2026-09-07.json')).meshImpact.blockMaskImpact.find(v=>v.changedMaskVoxels);
 assert.equal(successor.beforeSha256,p.afterSha256);assert.equal(successor.vertices,1212);assert.equal(successor.faces,2420);
 const currentMesh=await regionalMeshSuccessor(p.file,successor.afterSha256)??successor;
 assert.equal(meta.meshSha256,currentMesh.afterSha256);assert.equal(meta.vertices,currentMesh.vertices);assert.equal(meta.faces,currentMesh.faces);
});
import {regionalMeshSuccessor} from './helpers/residual-mesh-successor.mjs';
