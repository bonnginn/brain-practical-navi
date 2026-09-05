import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const root=new URL('../',import.meta.url),sha=b=>createHash('sha256').update(b).digest('hex');

test('follow-up record defines exactly 1596 reviewed exclusions from its preserved baseline',async()=>{
 const compressed=await readFile(new URL('tests/fixtures/bigbrain-practical-segmentation-pre-callosal-followup-5348.bin.gz',root));
 assert.equal(sha(compressed),'5348b7650a3ba28c95a00407d62cf4054fb0c670a62de717f2c572f66a51c9a3');
 const before=gunzipSync(compressed).subarray(10),after=Buffer.from(before);
 const record=JSON.parse(await readFile(new URL('segmentation-patches/review/callosum-cortical-followup-project-review-2026-09-06.json',root),'utf8'));
 assert.equal(record.sourceLabelsSha256,sha(compressed));assert.equal(record.editCount,1596);
 assert.equal(record.reviewStatus,'approved');assert.equal(record.review.pullRequest.mergeCommit,null);
 assert.match(record.review.reason,/専門家レビューではない/);
 const indices=[];
 for(const run of record.runs){assert.equal(run.label,0);for(let i=run.start;i<run.start+run.length;i++){assert.equal(before[i],30);indices.push(i);after[i]=0;}}
 assert.equal(indices.length,1596);assert.equal(new Set(indices).size,1596);
 const encoded=Buffer.alloc(indices.length*4);indices.sort((a,b)=>a-b).forEach((i,n)=>encoded.writeUInt32LE(i,n*4));
 assert.equal(sha(encoded),'88da382e9f7ea296be43c4c31530ac392510d20cb851c74e172316d26f7d5f80');
 assert.equal(sha(after),'3c9d959acbdb67b7603ed7f2f105d7c333f0f89facc7e637f16b5fb740a16cd5');
 const installed=await readFile(new URL('public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz',root));
 assert.equal(sha(installed),'8cc65edf36e1e3a420168bfb663d6440418dd67189808263d11c180c4b403d16');
 assert.deepEqual(gunzipSync(installed).subarray(10),after);
 const metadata=JSON.parse(await readFile(new URL('public/atlas/bigbrain-practical-segmentation-icbm500-validation.json',root),'utf8'));
 assert.equal(metadata.callosalFollowupPatchAudit.editCount,1596);
 assert.equal(metadata.callosalFollowupPatchAudit.expertReviewed,false);
 assert.equal(metadata.callosalFollowupPatchAudit.completeCallosum,false);
 const prior=JSON.parse(await readFile(new URL('segmentation-patches/review/callosum-local-exclusion-project-review-2026-09-06.json',root),'utf8'));
 const set=new Set(indices);for(const run of prior.runs)for(let i=run.start;i<run.start+run.length;i++)assert.ok(!set.has(i));
});
