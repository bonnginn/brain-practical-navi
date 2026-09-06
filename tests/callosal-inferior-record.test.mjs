import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const root=new URL('../',import.meta.url),sha=b=>createHash('sha256').update(b).digest('hex');

test('inferior repair changes only its exact reviewed 2160 voxels without identifying a complete fornix',async()=>{
 const input=await readFile(new URL('tests/fixtures/bigbrain-practical-segmentation-pre-callosal-inferior-8cc6.bin.gz',root));
 assert.equal(sha(input),'8cc65edf36e1e3a420168bfb663d6440418dd67189808263d11c180c4b403d16');
 const before=gunzipSync(input).subarray(10),after=Buffer.from(before);
 const record=JSON.parse(await readFile(new URL('segmentation-patches/review/callosum-inferior-exclusion-project-review-2026-09-06.json',root),'utf8'));
 assert.equal(record.sourceLabelsSha256,sha(input));assert.equal(record.editCount,2160);
 assert.equal(record.reviewStatus,'approved');assert.equal(record.review.pullRequest.mergeCommit,null);
 assert.match(record.review.reason,/専門家レビューではない/);
 const indices=[];
 for(const run of record.runs){assert.equal(run.label,0);for(let i=run.start;i<run.start+run.length;i++){assert.equal(before[i],30);indices.push(i);after[i]=0;}}
 assert.equal(indices.length,2160);assert.equal(new Set(indices).size,2160);
 const encoded=Buffer.alloc(indices.length*4);indices.sort((a,b)=>a-b).forEach((i,n)=>encoded.writeUInt32LE(i,n*4));
 assert.equal(sha(encoded),'6a4b7677801edf90d45a3b43a409bbe379c13035fe5d99a1e412e8e49b677675');
 assert.equal(sha(after),'afc55069f2ecdcad36429f1026276f10c8e17a31fa9c6bf985b3beec3f640130');
 const installed=await readFile(new URL('public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz',root));
 assert.equal(sha(installed),'098edfbf365016c6c53ccf7b7032258db72a4912378c457d348c01613a4a1694');
 assert.deepEqual(gunzipSync(installed).subarray(10),after);
 const metadata=JSON.parse(await readFile(new URL('public/atlas/bigbrain-practical-segmentation-icbm500-validation.json',root),'utf8'));
 assert.equal(metadata.labelCounts['30'],146019);assert.equal(metadata.callosalInferiorPatchAudit.editCount,2160);
 assert.equal(metadata.callosalInferiorPatchAudit.expertReviewed,false);
 assert.equal(metadata.callosalInferiorPatchAudit.completeCallosum,false);
 assert.equal(metadata.callosalInferiorPatchAudit.completeFornix,false);
 const set=new Set(indices);
 for(const name of ['callosum-local-exclusion','callosum-cortical-followup']){
  const prior=JSON.parse(await readFile(new URL(`segmentation-patches/review/${name}-project-review-2026-09-06.json`,root),'utf8'));
  for(const run of prior.runs)for(let i=run.start;i<run.start+run.length;i++)assert.ok(!set.has(i));
 }
});
