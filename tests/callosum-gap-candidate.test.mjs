import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');

test('original callosal gap proposal remains an exact historical unreviewed record',async()=>{
 const patch=JSON.parse(await readFile(new URL('../segmentation-patches/review/callosum-three-gap-candidate-2026-09-06.json',import.meta.url),'utf8'));
 const compressed=await readFile(new URL('./fixtures/bigbrain-practical-segmentation-pre-callosum-930e.bin.gz',import.meta.url));
 assert.equal(sha(compressed),patch.sourceLabelsSha256);assert.equal(patch.sourceLabelsSha256,'930eaaed7eed8782b1b162f3aa5c59c2428f4062d0d2da3a9a1cb563f49b7db7');
 const labels=gunzipSync(compressed).subarray(10),raw=gunzipSync(await readFile(new URL('../public/atlas/bigbrain-icbm500.bin.gz',import.meta.url))).subarray(10);
 assert.equal(patch.reviewStatus,'unreviewed');assert.equal(patch.review.decision,'unreviewed');assert.equal(patch.review.reviewer,null);
 assert.equal(patch.primaryPlane,'horizontal');assert.equal(patch.editCount,291);assert.equal(patch.runs.length,291);
 const indices=Buffer.alloc(291*4),remaining=new Set();
 patch.runs.forEach((r,i)=>{assert.equal(r.length,1);assert.equal(r.label,0);assert.equal(labels[r.start],30);assert.equal(raw[r.start],255);indices.writeUInt32LE(r.start,i*4);remaining.add(r.start);});
 assert.equal(remaining.size,291);assert.equal(sha(indices),'3bcc458093db2607299697abe602b7125758038333e52d6894c80983d2b8fa17');
 const sizes=[];
 while(remaining.size){const queue=[remaining.values().next().value];remaining.delete(queue[0]);for(let n=0;n<queue.length;n++){const i=queue[n];for(const offset of [-1,1,-394,394,-394*466,394*466])if(remaining.delete(i+offset))queue.push(i+offset);}sizes.push(queue.length);}
 assert.deepEqual(sizes.sort((a,b)=>a-b),[79,81,131]);
 // The archived input remains unchanged. A separate project-review record
 // now adopts these coordinates with a bounded additional cortical exclusion.
 assert.equal(patch.runs.filter(r=>labels[r.start]===30).length,291);
});
