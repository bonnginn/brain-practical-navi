import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import test from 'node:test';

test('midbrain context mesh matches the recorded source-preserving repair and metadata',async()=>{
 const [data,text]=await Promise.all([
  readFile(new URL('../public/atlas/block-midbrain-section-tissue.mesh',import.meta.url)),
  readFile(new URL('../public/atlas/specimen-blocks.json',import.meta.url),'utf8')]);
 assert.equal(createHash('sha256').update(data).digest('hex'),'af977041f979fa95241aac508a9983b8368c7ec92cb275eec33b5e5409635d8e');
 assert.equal(data.subarray(0,4).toString(),'BNM2');
 const vertices=data.readUInt32LE(4),faces=data.readUInt32LE(8);
 const meta=JSON.parse(text).specimens['midbrain-section'].find(x=>x.part==='tissue');
 assert.equal(vertices,2083);assert.equal(faces,4154);
 assert.equal(meta.vertices,vertices);assert.equal(meta.faces,faces);
 assert.equal(data.length,12+vertices*28+faces*12);
 for(let offset=12;offset<12+vertices*24;offset+=4)assert.ok(Number.isFinite(data.readFloatLE(offset)));
 for(let offset=12+vertices*24;offset<12+vertices*28;offset+=4){const shade=data.readFloatLE(offset);assert.ok(shade>=0&&shade<=1);}
 for(let offset=12+vertices*28;offset<data.length;offset+=4)assert.ok(data.readUInt32LE(offset)<vertices);
});
