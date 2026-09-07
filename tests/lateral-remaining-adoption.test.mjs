import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const read=p=>readFile(new URL('../'+p,import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');
test('630 lateral additions replay exactly and preserve every other voxel',async()=>{
 const bytes=await read('segmentation-patches/review/lateral-remaining-adoption-2026-09-07.json'),r=JSON.parse(bytes);
 const base=await read('tests/fixtures/bigbrain-practical-segmentation-pre-lateral-remaining-7c54.bin.gz'),current=await read('tests/fixtures/bigbrain-practical-segmentation-pre-lateral-medium-b473.bin.gz');
 assert.equal(sha(base),r.inputCompressedSha256);assert.equal(sha(current),r.outputCompressedSha256);
 const h=gunzipSync(base),before=h.subarray(10),after=Buffer.from(before),nx=h.readUInt16LE(4),ny=h.readUInt16LE(6),nz=h.readUInt16LE(8),seen=new Set(),counts={23:0,24:0};
 assert.equal(r.points.length,630);
 for(const p of r.points){const [x,y,z]=p.xyz;assert.ok(p.xyz.length===3&&p.xyz.every(Number.isInteger)&&x>=0&&x<nx&&y>=0&&y<ny&&z>=0&&z<nz);const i=x+nx*(y+ny*z);assert.equal(p.before,0);assert.ok(p.after===23||p.after===24);assert.ok(!seen.has(i));seen.add(i);assert.equal(after[i],0);after[i]=p.after;counts[p.after]++;}
 assert.deepEqual(counts,{23:173,24:457});assert.deepEqual(after,gunzipSync(current).subarray(10));assert.equal(sha(after),r.outputRawSha256);
 const meta=JSON.parse(await read('public/atlas/bigbrain-practical-segmentation-icbm500-validation.json'));
 assert.equal(meta.lateralRemainingAudit.recordSha256,sha(bytes));assert.equal(meta.lateralRemainingAudit.changedVoxelCount,630);
 for(const [id,count] of [[23,64283],[24,63636]]){assert.equal(after.reduce((n,v)=>n+(v===id),0),count);}
 assert.equal(r.projectAdopted,true);assert.equal(r.expertReviewed,false);assert.equal(r.published,false);
 for(const i of seen)after[i]=0;assert.deepEqual(after,before);
});
test('six historical meshes match the adoption and unchanged tissue distance explanations',async()=>{
 const r=JSON.parse(await read('segmentation-patches/review/lateral-remaining-adoption-2026-09-07.json'));
 const changed=r.meshImpact.blockMaskImpact.filter(p=>p.changedMaskVoxels),manifest=JSON.parse(await read('public/atlas/specimen-blocks.json'));
 assert.equal(r.meshImpact.blockMaskImpact.length,55);assert.deepEqual(changed.map(p=>[p.block,p.part,p.changedMaskVoxels]),[['lateral-ventricle','tissue',8],['lateral-ventricle','ventricular-cavity',34],['commissural-system','lateral-ventricles',41],['choroid-plexus','tissue',18],['choroid-plexus','ventricular-cavity',34],['medial-temporal','inferior-horn',1]]);
 for(const p of changed){assert.equal(sha(await read('tests/fixtures/pre-lateral-medium-'+p.file)),p.afterSha256);assert.equal(sha(await read('tests/fixtures/pre-lateral-remaining-'+p.file)),p.beforeSha256);assert.equal(p.beforeMatches,true);assert.equal(p.beforeSha256,p.reproducedBeforeSha256);}
 assert.equal(r.contextMaskExplanation.changes.length,26);
 const labels=gunzipSync(await read('tests/fixtures/bigbrain-practical-segmentation-pre-lateral-medium-b473.bin.gz')).subarray(10);
 for(const c of r.contextMaskExplanation.changes){assert.equal(c.labelBefore,c.labelAfter);assert.equal(c.before,false);assert.equal(c.after,true);assert.ok(c.distanceBeforeMm>c.cutoffMm&&c.distanceAfterMm<=c.cutoffMm);const [x,y,z]=c.appXYZ;assert.equal(labels[x+394*(y+466*z)],c.labelAfter);}
 assert.equal(r.unionImageReview.reviewedChangedPanels,124);assert.equal(r.unionImageReview.identicalPreviouslyReviewedPanels,184);
});
