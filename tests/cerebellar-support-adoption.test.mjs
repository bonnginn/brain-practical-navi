import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const read=p=>readFile(new URL('../'+p,import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');
for(const [suffix,basePath,afterPath,count,retained,field,isCurrent] of [
 ['','tests/fixtures/bigbrain-practical-segmentation-pre-cerebellar-support-86e3.bin.gz','tests/fixtures/bigbrain-practical-segmentation-pre-cerebellar-2274-2943.bin.gz',348,211,'cerebellarSupportAudit',false],
 ['-2274','tests/fixtures/bigbrain-practical-segmentation-pre-cerebellar-2274-2943.bin.gz','tests/fixtures/bigbrain-practical-segmentation-pre-cerebellar-997-2fc8.bin.gz',52,376,'cerebellarSupport2274Audit',false],
 ['-997','tests/fixtures/bigbrain-practical-segmentation-pre-cerebellar-997-2fc8.bin.gz','tests/fixtures/bigbrain-practical-segmentation-pre-cerebellar-1393-190f.bin.gz',259,748,'cerebellarSupport997Audit',false],
 ['-1393','tests/fixtures/bigbrain-practical-segmentation-pre-cerebellar-1393-190f.bin.gz','tests/fixtures/bigbrain-practical-segmentation-pre-cerebellar-1603-0908.bin.gz',372,571,'cerebellarSupport1393Audit',false],
 ['-1603','tests/fixtures/bigbrain-practical-segmentation-pre-cerebellar-1603-0908.bin.gz','tests/fixtures/bigbrain-practical-segmentation-pre-cerebellar-843-c989.bin.gz',229,425,'cerebellarSupport1603Audit',false],
 ['-843','tests/fixtures/bigbrain-practical-segmentation-pre-cerebellar-843-c989.bin.gz','tests/fixtures/bigbrain-practical-segmentation-pre-cerebellar-1105-212d.bin.gz',3353,3914,'cerebellarSupport843Audit',false],
 ['-1105','tests/fixtures/bigbrain-practical-segmentation-pre-cerebellar-1105-212d.bin.gz','tests/fixtures/bigbrain-practical-segmentation-pre-third-core-777b.bin.gz',21290,18701,'cerebellarSupport1105Audit',false],
])test(`cerebellar support${suffix} adoption is exactly ${count} reversible removals`,async()=>{
 const date=['-843','-1105'].includes(suffix)?'2026-09-07':'2026-09-06';
 const bytes=await read(`segmentation-patches/review/cerebellar-support${suffix}-adoption-${date}.json`),r=JSON.parse(bytes);
 const base=await read(basePath),current=await read(afterPath);
 assert.equal(sha(base),r.inputCompressedSha256);assert.equal(sha(current),r.outputCompressedSha256);
 const header=gunzipSync(base),before=header.subarray(10),after=Buffer.from(before),nx=header.readUInt16LE(4),ny=header.readUInt16LE(6);
 assert.equal(r.points.length,count);assert.equal(new Set(r.points.map(p=>p.xyz.join(','))).size,count);
 for(const p of r.points){const [x,y,z]=p.xyz,i=x+nx*(y+ny*z);assert.ok([28,29].includes(p.before));assert.equal(p.after,0);assert.equal(after[i],p.before);after[i]=0;}
 assert.deepEqual(gunzipSync(current).subarray(10),after);assert.equal(sha(after),r.outputRawSha256);assert.equal(sha(before),r.inputRawSha256);
 const meta=JSON.parse(await read('public/atlas/bigbrain-practical-segmentation-icbm500-validation.json'));
 assert.equal(meta[field].recordSha256,sha(bytes));
 const counts={28:0,29:0};for(const value of after)if(value===28||value===29)counts[value]++;
 if(isCurrent){assert.equal(meta.rawVoxelSha256,sha(after));assert.equal(meta.labelCounts['28'],counts[28]);assert.equal(meta.labelCounts['29'],counts[29]);}
 assert.equal(r.adopted,true);assert.equal(r.expertReviewed,false);assert.equal(r.retainedFromOriginalComponent,retained);
 assert.equal(r.reviewEvidence.record.blockMaskImpact.length,55);assert.ok(r.reviewEvidence.record.blockMaskImpact.every(p=>p.changedMaskVoxels===0));
 if(suffix==='-1105'){
  assert.equal(r.nativeReviewEvidence.visuallyReviewedPlanes,54);
  assert.equal(r.nativeReviewEvidence.record.figures.length,18);
  assert.equal(r.nativeReviewEvidence.record.baseSha256,r.inputCompressedSha256);
  assert.equal(r.nativeReviewEvidence.record.candidateSha256,r.outputCompressedSha256);
 }
 for(const p of r.points){const [x,y,z]=p.xyz;after[x+nx*(y+ny*z)]=p.before;}assert.deepEqual(after,before);
});
