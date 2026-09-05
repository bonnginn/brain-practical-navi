import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';

test('archived classification stage contains exactly 47 edits and current labels retain its result',async()=>{
 const old=gunzipSync(await readFile(new URL('./fixtures/bigbrain-practical-segmentation-pre-classification-b75a.bin.gz',import.meta.url)));
 const current=await readFile(new URL('./fixtures/bigbrain-practical-segmentation-pre-callosum-930e.bin.gz',import.meta.url));
 assert.equal(createHash('sha256').update(current).digest('hex'),'930eaaed7eed8782b1b162f3aa5c59c2428f4062d0d2da3a9a1cb563f49b7db7');
 const next=gunzipSync(current);assert.equal(next.length,old.length);assert.deepEqual(next.subarray(0,10),old.subarray(0,10));
 const transitions={};let changed=0;
 for(let i=10;i<old.length;i++)if(old[i]!==next[i]){const key=`${old[i]}->${next[i]}`;transitions[key]=(transitions[key]??0)+1;changed++;}
 assert.equal(changed,47);assert.deepEqual(transitions,{'26->0':31,'26->41':16});
 const metadata=JSON.parse(await readFile(new URL('../public/atlas/bigbrain-practical-segmentation-icbm500-validation.json',import.meta.url),'utf8'));
 const actual=gunzipSync(await readFile(new URL('../public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz',import.meta.url)));
 assert.equal(metadata.rawVoxelSha256,createHash('sha256').update(actual.subarray(10)).digest('hex'));
 for(let i=10;i<next.length;i++)if(old[i]!==next[i])assert.equal(actual[i],next[i]);
 assert.deepEqual(metadata.projectReviewedPartialIds,[41]);
 assert.equal(metadata.labelCounts['26'],8520);assert.equal(metadata.labelCounts['41'],16);
 assert.equal(metadata.reviewedPatchAudits.length,5);
});

test('fourth ventricle mesh metadata matches the classification repair',async()=>{
 const file='block-hindbrain-fourth-ventricle.mesh';
 const mesh=await readFile(new URL('../public/atlas/'+file,import.meta.url));
 assert.equal(createHash('sha256').update(mesh).digest('hex'),'1cfc2dade80d86c041f0696af721b3068c7121bfbcc77bee70c59ce717df5613');
 const metadata=JSON.parse(await readFile(new URL('../public/atlas/specimen-blocks.json',import.meta.url),'utf8'));
 const part=metadata.specimens.hindbrain.find(x=>x.file===file);
 assert.equal(part.vertices,mesh.readUInt32LE(4));assert.equal(part.faces,mesh.readUInt32LE(8));
});
