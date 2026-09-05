import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const sha=data=>createHash('sha256').update(data).digest('hex');
const root=new URL('../',import.meta.url);

test('archived first callosal stage is exactly 1605 edits retained by the current volume',async()=>{
 const prior=gunzipSync(await readFile(new URL('tests/fixtures/bigbrain-practical-segmentation-pre-callosum-930e.bin.gz',root)));
 const compressed=await readFile(new URL('tests/fixtures/bigbrain-practical-segmentation-pre-callosal-followup-5348.bin.gz',root));
 assert.equal(sha(compressed),'5348b7650a3ba28c95a00407d62cf4054fb0c670a62de717f2c572f66a51c9a3');
 const current=gunzipSync(compressed);assert.deepEqual(current.subarray(0,10),prior.subarray(0,10));assert.equal(current.length,prior.length);
 const patch=JSON.parse(await readFile(new URL('segmentation-patches/review/callosum-local-exclusion-project-review-2026-09-06.json',root),'utf8'));
 const expected=new Set(patch.runs.flatMap(r=>Array.from({length:r.length},(_,i)=>r.start+i)));
 const indices=[];for(let i=10;i<current.length;i++)if(current[i]!==prior[i]){assert.equal(prior[i],30);assert.equal(current[i],0);assert.ok(expected.has(i-10));indices.push(i-10);}
 assert.equal(indices.length,1605);assert.equal(expected.size,1605);
 const encoded=Buffer.alloc(indices.length*4);indices.forEach((i,n)=>encoded.writeUInt32LE(i,n*4));
 assert.equal(sha(encoded),'3374e25c75c68b4a1b0b305655f962efc043a07cc7e9c3d1580fb8c0d4997eed');
 assert.equal(patch.reviewStatus,'approved');assert.match(patch.review.reason,/専門家レビューではない/);
 const metadata=JSON.parse(await readFile(new URL('public/atlas/bigbrain-practical-segmentation-icbm500-validation.json',root),'utf8'));
 const live=gunzipSync(await readFile(new URL('public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz',root)));
 for(const index of indices)assert.equal(live[index+10],0);
 assert.equal(metadata.labelCounts['30'],146019);assert.equal(metadata.rawVoxelSha256,sha(live.subarray(10)));
 assert.equal(metadata.callosalLocalPatchAudit.completeCallosum,false);assert.equal(metadata.callosalLocalPatchAudit.expertReviewed,false);
 assert.ok(metadata.imageGuidedCandidateIds.includes(30));assert.ok(!metadata.imageGuidedReviewedIds.includes(30));
 const catalog=JSON.parse(await readFile(new URL('app/english-catalog.json',root),'utf8'));
 assert.equal(catalog['脳梁候補（試作）'],'Corpus callosum candidate (provisional)');
});

test('callosal block mesh carries the corresponding actual geometry metadata',async()=>{
 const name='block-commissural-system-corpus-callosum.mesh';
 const data=await readFile(new URL('public/atlas/'+name,root));
 assert.equal(sha(data),'c9e4162ee7e4c43c5c8356c50db34b0e69488cf73c6c061dadddc9d84724bed3');
 const metadata=JSON.parse(await readFile(new URL('public/atlas/specimen-blocks.json',root),'utf8'));
 const part=metadata.specimens['commissural-system'].find(p=>p.file===name);
 assert.equal(part.vertices,data.readUInt32LE(4));assert.equal(part.faces,data.readUInt32LE(8));
 const tissueName='block-commissural-system-tissue.mesh',tissue=await readFile(new URL('public/atlas/'+tissueName,root));
 assert.equal(sha(tissue),'8aec8d9a37e9709aa32911d19848967d7a7f1281ddc1664da5ce583aa08b2478');
 const tissuePart=metadata.specimens['commissural-system'].find(p=>p.file===tissueName);
 assert.equal(tissuePart.vertices,tissue.readUInt32LE(4));assert.equal(tissuePart.faces,tissue.readUInt32LE(8));
});
