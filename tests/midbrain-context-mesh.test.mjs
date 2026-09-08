import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import test from 'node:test';

test('midbrain context mesh matches the recorded source-preserving repair and metadata',async()=>{
 const [data,text]=await Promise.all([
  readFile(new URL('../public/atlas/block-midbrain-section-tissue.mesh',import.meta.url)),
  readFile(new URL('../public/atlas/specimen-blocks.json',import.meta.url),'utf8')]);
 // The registered tissue is preserved except reviewed cavity-mask corrections.
 const record=JSON.parse(await readFile(new URL('../segmentation-patches/review/posterior-ventricles158-adoption-2026-09-08.json',import.meta.url),'utf8'));
 const impact=record.meshImpact.blockMaskImpact.find(p=>p.block==='midbrain-section'&&p.part==='tissue');
 assert.equal(impact.beforeSha256,'a9276115e005f5db68d82f4ff73c678213005ce6d5833ce1f3b92bf6b4f9da2d');
 assert.equal(impact.removed,2);assert.equal(impact.added,0);
 assert.equal(createHash('sha256').update(data).digest('hex'),impact.afterSha256);
 assert.equal(data.subarray(0,4).toString(),'BNM2');
 const vertices=data.readUInt32LE(4),faces=data.readUInt32LE(8);
 const meta=JSON.parse(text).specimens['midbrain-section'].find(x=>x.part==='tissue');
 assert.equal(vertices,2087);assert.equal(faces,4162);
 assert.equal(meta.vertices,vertices);assert.equal(meta.faces,faces);
 assert.equal(data.length,12+vertices*28+faces*12);
 for(let offset=12;offset<12+vertices*24;offset+=4)assert.ok(Number.isFinite(data.readFloatLE(offset)));
 for(let offset=12+vertices*24;offset<12+vertices*28;offset+=4){const shade=data.readFloatLE(offset);assert.ok(shade>=0&&shade<=1);}
 for(let offset=12+vertices*28;offset<data.length;offset+=4)assert.ok(data.readUInt32LE(offset)<vertices);
});
