import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const root=new URL('../',import.meta.url);
const read=p=>readFile(new URL(p,root));
const sha=b=>createHash('sha256').update(b).digest('hex');
test('red adoption replays exactly 2224 edits and preserves all other voxels',async()=>{
 const recordBytes=await read('segmentation-patches/review/red-nuclei-registration-project-adoption-2026-09-06.json');
 assert.equal(sha(recordBytes),'4e8e83794e932261c4d1d1b288989216cf33d301765b7c4f3977e1917ad8f102');
 const record=JSON.parse(recordBytes);
 const baseline=await read('tests/fixtures/bigbrain-practical-segmentation-pre-red-registration-098e.bin.gz');
 assert.equal(sha(baseline),record.inputCompressedSha256);
 const before=gunzipSync(baseline).subarray(10),after=Buffer.from(before);
 let previous=-1;
 for(const [i,from,to] of record.edits){
  assert.ok(Number.isInteger(i)&&i>previous&&i<after.length);previous=i;
  assert.ok([0,1,2].includes(from)&&[0,1,2].includes(to)&&from!==to);
  assert.equal(after[i],from);after[i]=to;
 }
 assert.equal(record.edits.length,2224);
 const installed=await read('tests/fixtures/bigbrain-practical-segmentation-pre-remaining-registration-cec9.bin.gz');
 assert.equal(sha(installed),record.outputCompressedSha256);
 assert.deepEqual(gunzipSync(installed).subarray(10),after);
 for(const [i,from,to] of [...record.edits].reverse()){assert.equal(after[i],to);after[i]=from;}
 assert.deepEqual(after,before);
 assert.equal(record.expertReviewed,false);assert.equal(record.researchGroundTruth,false);
});
test('red block mesh and metadata use the repaired label revision',async()=>{
 const mesh=await read('public/atlas/block-midbrain-section-red-nuclei.mesh');
 assert.equal(sha(mesh),'1ac905f08e241798c81601c5aa1733efab039f5efe6a38df1f3e3063a9d650ec');
 assert.equal(mesh.readUInt32LE(4),640);assert.equal(mesh.readUInt32LE(8),1272);
 const metadata=JSON.parse(await read('public/atlas/specimen-blocks.json'));
 const part=metadata.specimens['midbrain-section'].find(x=>x.part==='red-nuclei');
 assert.equal(part.meshSha256,sha(mesh));
 const volume=await read('public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz');
 const redStage=await read('tests/fixtures/bigbrain-practical-segmentation-pre-remaining-registration-cec9.bin.gz');
 assert.equal(part.registrationSourceSha256,sha(redStage));
 const validation=JSON.parse(await read('public/atlas/bigbrain-practical-segmentation-icbm500-validation.json'));
 assert.equal(validation.rawVoxelSha256,sha(gunzipSync(volume).subarray(10)));
 assert.equal(validation.labelCounts['1'],2887);assert.equal(validation.labelCounts['2'],2888);
});
