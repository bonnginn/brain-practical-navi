import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';

// Current metadata is checked against actual voxels, not a copied checkpoint
// constant. Historical replay tests keep their own immutable input hashes.
const compressed=await readFile(new URL('../../public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz',import.meta.url));
const raw=gunzipSync(compressed);
assert.equal(raw.toString('ascii',0,4),'BBS1');
assert.deepEqual([4,6,8].map(offset=>raw.readUInt16LE(offset)),[394,466,378]);
assert.equal(raw.length,10+394*466*378);
const counts=new Uint32Array(256);
for(let i=10;i<raw.length;i++)counts[raw[i]]++;
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export const currentSegmentation=Object.freeze({
  sha256:sha(compressed),rawVoxelSha256:sha(raw.subarray(10)),
  counts:Object.freeze(Array.from(counts)),
  ventricularVoxels:[23,24,25,26,41].reduce((sum,id)=>sum+counts[id],0),
});
