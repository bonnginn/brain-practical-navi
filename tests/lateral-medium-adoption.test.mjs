import {residualSuccessor,regionalMeshSuccessor} from './helpers/residual-mesh-successor.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const read=p=>readFile(new URL('../'+p,import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');
test('867 lateral additions replay exactly and preserve every other voxel',async()=>{
 const bytes=await read('segmentation-patches/review/lateral-medium-adoption-2026-09-07.json'),r=JSON.parse(bytes);
 const base=await read('tests/fixtures/bigbrain-practical-segmentation-pre-lateral-medium-b473.bin.gz'),current=await read('tests/fixtures/bigbrain-practical-segmentation-pre-inferior-horn-0d31.bin.gz');
 assert.equal(sha(base),r.inputCompressedSha256);assert.equal(sha(current),r.outputCompressedSha256);
 const h=gunzipSync(base),before=h.subarray(10),after=Buffer.from(before),nx=h.readUInt16LE(4),ny=h.readUInt16LE(6),nz=h.readUInt16LE(8),seen=new Set(),counts={23:0,24:0};
 assert.equal(r.points.length,867);
 for(const p of r.points){const [x,y,z]=p.xyz;assert.ok(p.xyz.length===3&&p.xyz.every(Number.isInteger)&&x>=0&&x<nx&&y>=0&&y<ny&&z>=0&&z<nz);const i=x+nx*(y+ny*z);assert.equal(p.before,0);assert.ok(p.after===23||p.after===24);assert.ok(!seen.has(i));seen.add(i);assert.equal(after[i],0);after[i]=p.after;counts[p.after]++;}
 assert.deepEqual(counts,{23:555,24:312});assert.deepEqual(after,gunzipSync(current).subarray(10));assert.equal(sha(after),r.outputRawSha256);
 const meta=JSON.parse(await read('public/atlas/bigbrain-practical-segmentation-icbm500-validation.json'));
 const next=JSON.parse(await read('segmentation-patches/review/inferior-horn-adoption-2026-09-07.json'));
 assert.equal(next.inputRawSha256,sha(after));assert.equal(meta.lateralMediumAudit.recordSha256,sha(bytes));assert.equal(meta.lateralMediumAudit.changedVoxelCount,867);
 for(const [id,count] of [[23,64838],[24,63948]])assert.equal(after.reduce((n,v)=>n+(v===id),0),count);
 assert.equal(r.projectAdopted,true);assert.equal(r.expertReviewed,false);assert.equal(r.published,false);
 for(const i of seen)after[i]=0;assert.deepEqual(after,before);
});
test('seven current meshes match the adoption and unchanged tissue distance explanations',async()=>{
 const r=JSON.parse(await read('segmentation-patches/review/lateral-medium-adoption-2026-09-07.json'));
 const changed=r.meshImpact.blockMaskImpact.filter(p=>p.changedMaskVoxels),manifest=JSON.parse(await read('public/atlas/specimen-blocks.json'));
 assert.equal(r.meshImpact.blockMaskImpact.length,55);assert.deepEqual(changed.map(p=>[p.block,p.part,p.changedMaskVoxels]),[['lateral-ventricle','tissue',147],['lateral-ventricle','ventricular-cavity',27],['commissural-system','tissue',8],['commissural-system','lateral-ventricles',46],['choroid-plexus','tissue',114],['choroid-plexus','ventricular-cavity',27],['medial-temporal','inferior-horn',7]]);
 const next=JSON.parse(await read('segmentation-patches/review/inferior-horn-adoption-2026-09-07.json'));
 for(const p of changed){const successor=next.meshImpact.blockMaskImpact.find(q=>q.file===p.file&&q.changedMaskVoxels);const regional=successor?null:await regionalMeshSuccessor(p.file,p.afterSha256);assert.equal(sha(await read(successor?'tests/fixtures/pre-inferior-horn-'+p.file:regional?.firstRecoveryPath??'public/atlas/'+p.file)),p.afterSha256);if(successor)assert.equal(successor.beforeSha256,p.afterSha256);assert.equal(sha(await read('tests/fixtures/pre-lateral-medium-'+p.file)),p.beforeSha256);assert.equal(p.beforeMatches,true);assert.equal(p.beforeSha256,p.reproducedBeforeSha256);const e=manifest.specimens[p.block].find(e=>e.part===p.part);const residual=await residualSuccessor(p.file,successor?.afterSha256??p.afterSha256);assert.equal(e.meshSha256,residual?.afterSha256??successor?.afterSha256??p.afterSha256);assert.equal(e.segmentationSourceSha256,residual?.segmentationSourceSha256??(successor?next.outputCompressedSha256:r.outputCompressedSha256));}
 assert.equal(r.contextMaskExplanation.changes.length,269);
 const labels=gunzipSync(await read('public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz')).subarray(10);
 for(const c of r.contextMaskExplanation.changes){assert.equal(c.labelBefore,c.labelAfter);assert.equal(c.before,false);assert.equal(c.after,true);assert.ok(c.distanceBeforeMm>c.cutoffMm&&c.distanceAfterMm<=c.cutoffMm);const [x,y,z]=c.appXYZ;assert.equal(labels[x+394*(y+466*z)],c.labelAfter);}
 assert.equal(r.unionImageReview.reviewedChangedPanels,357);assert.equal(r.unionImageReview.identicalPreviouslyReviewedPanels,388);
});
