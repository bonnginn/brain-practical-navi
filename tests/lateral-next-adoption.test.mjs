import {residualSuccessor} from './helpers/residual-mesh-successor.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const read=p=>readFile(new URL('../'+p,import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');
test('second lateral adoption is exactly 265 reversible additions without other label changes',async()=>{
 const bytes=await read('segmentation-patches/review/lateral-next-adoption-2026-09-07.json'),r=JSON.parse(bytes);
 const base=await read('tests/fixtures/bigbrain-practical-segmentation-pre-lateral-next-83dc.bin.gz'),current=await read('tests/fixtures/bigbrain-practical-segmentation-pre-lateral-remaining-7c54.bin.gz');
 assert.equal(sha(base),r.inputCompressedSha256);assert.equal(sha(current),r.outputCompressedSha256);
 const h=gunzipSync(base),before=h.subarray(10),after=Buffer.from(before),nx=h.readUInt16LE(4),ny=h.readUInt16LE(6),nz=h.readUInt16LE(8),seen=new Set(),counts={23:0,24:0};
 assert.equal(r.points.length,265);
 for(const p of r.points){const [x,y,z]=p.xyz;assert.ok(p.xyz.length===3&&p.xyz.every(Number.isInteger)&&x>=0&&x<nx&&y>=0&&y<ny&&z>=0&&z<nz);const i=x+nx*(y+ny*z);assert.equal(p.before,0);assert.ok(p.after===23||p.after===24);assert.ok(!seen.has(i));seen.add(i);assert.equal(after[i],0);after[i]=p.after;counts[p.after]++;}
 assert.deepEqual(counts,{23:119,24:146});assert.deepEqual(after,gunzipSync(current).subarray(10));assert.equal(sha(after),r.outputRawSha256);
 const meta=JSON.parse(await read('public/atlas/bigbrain-practical-segmentation-icbm500-validation.json'));
 assert.equal(meta.lateralNextAudit.recordSha256,sha(bytes));assert.equal(meta.lateralNextAudit.changedVoxelCount,265);
 for(const [id,count] of [[23,64110],[24,63179]]){assert.equal(after.reduce((n,v)=>n+(v===id),0),count);}
 assert.equal(r.projectAdopted,true);assert.equal(r.expertReviewed,false);assert.equal(r.published,false);
 for(const i of seen)after[i]=0;assert.deepEqual(after,before);
});
test('four meshes match adoption, with context clipping distinguished from anatomical labeling',async()=>{
 const r=JSON.parse(await read('segmentation-patches/review/lateral-next-adoption-2026-09-07.json'));
 const changed=r.meshImpact.blockMaskImpact.filter(p=>p.changedMaskVoxels),manifest=JSON.parse(await read('public/atlas/specimen-blocks.json'));
 assert.equal(r.meshImpact.blockMaskImpact.length,55);assert.deepEqual(changed.map(p=>[p.block,p.part,p.changedMaskVoxels]),[['lateral-ventricle','ventricular-cavity',11],['commissural-system','lateral-ventricles',11],['choroid-plexus','tissue',1],['choroid-plexus','ventricular-cavity',11]]);
 for(const p of changed){assert.equal(sha(await read('tests/fixtures/pre-lateral-remaining-'+p.file)),p.afterSha256);assert.equal(sha(await read('tests/fixtures/pre-lateral-next-'+p.file)),p.beforeSha256);assert.equal(p.beforeMatches,true);assert.equal(p.beforeSha256,p.reproducedBeforeSha256);const e=manifest.specimens[p.block].find(e=>e.part===p.part);const latest=JSON.parse(await read('segmentation-patches/review/lateral-remaining-adoption-2026-09-07.json'));const current=latest.meshImpact.blockMaskImpact.find(q=>q.file===p.file);assert.equal(current.beforeSha256,p.afterSha256);assert.equal(sha(await read('tests/fixtures/pre-lateral-medium-'+p.file)),current.afterSha256);const medium=JSON.parse(await read('segmentation-patches/review/lateral-medium-adoption-2026-09-07.json')).meshImpact.blockMaskImpact.find(q=>q.file===p.file);assert.equal(medium.beforeSha256,current.afterSha256);const horn=JSON.parse(await read('segmentation-patches/review/inferior-horn-adoption-2026-09-07.json')).meshImpact.blockMaskImpact.find(q=>q.file===p.file);if(horn){assert.equal(horn.beforeSha256,medium.afterSha256);assert.equal(sha(await read('tests/fixtures/pre-inferior-horn-'+p.file)),medium.afterSha256);}const residual=await residualSuccessor(p.file,horn?.afterSha256??medium.afterSha256);const expected=residual?.afterSha256??horn?.afterSha256??medium.afterSha256;assert.equal(e.meshSha256,expected);assert.equal(sha(await read('public/atlas/'+p.file)),expected);}
 const [c]=r.contextMaskExplanation.changes;assert.deepEqual(c.appXYZ,[216,300,130]);assert.equal(c.labelBefore,8);assert.equal(c.labelAfter,8);assert.equal(c.before,false);assert.equal(c.after,true);assert.ok(c.distanceBeforeMm>8.5&&c.distanceAfterMm<=8.5);
 const labels=gunzipSync(await read('public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz')).subarray(10);assert.equal(labels[216+394*(300+466*130)],8);
});
