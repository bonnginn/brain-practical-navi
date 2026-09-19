import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {withRegionalBatches,regionalMeshSuccessor} from './helpers/residual-mesh-successor.mjs';
const read=p=>readFile(new URL('../'+p,import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');

test('partial aqueduct is selectable only for BigBrain, labelled partial, and absent from the quiz bank',async()=>{
 const page=(await read('app/page.tsx')).toString();
 assert.match(page,/aqueductPartial: \{name:"中脳水道候補（部分）",latin:"Cerebral aqueduct \(partial\)"[^\n]+ids:\[\],bigbrainIds:\[41\],labelSource:"image-guided"/);
 assert.match(page,/aqueductPartial:\["section-current-aqueduct-partial"\]/);
 assert.match(page,/members:\["ventricle","thirdVentricle","fourthVentricle","aqueductPartial"\]/);
 const questions=page.slice(page.indexOf('const quizQuestions:'),page.indexOf('const visualQuizQuestions:'));
 assert.doesNotMatch(questions,/aqueductPartial/);
 assert.doesNotMatch((await read('app/quiz-concept-bank.json')).toString(),/aqueductPartial/);
 const report=JSON.parse(await read('public/atlas/section-current-aqueduct-partial.json'));
 assert.equal(report.sourceSha256,'e0c294dfd1dc5a706d44631ced417914ebb71cc9a571d762659fdd1f4f452558');
 assert.equal(report.voxels,267);assert.equal(report.partialExtent,true);assert.equal(report.expertReviewed,false);
 assert.equal(sha(await read('public/atlas/section-current-aqueduct-partial.mesh')),report.sha256);
 const catalog=JSON.parse(await read('app/english-catalog.json'));
 assert.equal(catalog['中脳水道候補（部分）'],'Cerebral aqueduct candidate (partial)');
 assert.match(catalog['中脳蓋と被蓋の間。断面ラベルの主腔は第三・第四脳室へ連続しますが、名称の切替境界は暫定です'],/connects to the third and fourth ventricles/);
});

test('partial aqueduct repair replays exactly 64 zero and 115 brainstem cells with no other changes',async()=>{
 const bytes=await read('segmentation-patches/review/aqueduct-core179-adoption-2026-09-08.json');
 assert.equal(sha(bytes),'4ba89544a86ec75b180e1901444c5c3bb34043a738b64b7a2cfc30c2830f9a78');
 const r=JSON.parse(bytes),base=await read('tests/fixtures/bigbrain-practical-segmentation-pre-aqueduct-core179.bin.gz'),current=await read('tests/fixtures/bigbrain-practical-segmentation-pre-posterior-ventricles158.bin.gz');
 assert.equal(sha(base),'2983ac84a194043b0f974a6ee93fd34e74efce94d7c58c66e69f34f1475a7ef3');
 assert.equal(sha(current),'a21cb6ab8aa7080b6e26766c2f82834871d3e72c174b72d0b018733ee5ef278a');
 assert.equal(r.beforeSha256,sha(base));assert.equal(r.afterSha256,sha(current));
 const before=gunzipSync(base),after=gunzipSync(current),expected=Buffer.from(before),seen=new Set();
 assert.equal(r.count,179);assert.equal(r.points.length,179);assert.equal(r.transition,'mixed-to-41');
 assert.equal(r.points.filter(p=>p.before===0).length,64);assert.equal(r.points.filter(p=>p.before===27).length,115);
 for(const p of r.points){
  const [x,y,z]=p.xyz;assert.ok(p.xyz.every(Number.isInteger)&&x>=194&&x<=197&&y>=201&&y<=218&&z>=124&&z<=135);
  assert.equal(p.after,41);const i=10+x+394*(y+466*z);assert.ok(!seen.has(i));seen.add(i);assert.equal(expected[i],p.before);expected[i]=41;
 }
 assert.ok(expected.equals(after),'Only explicit reviewed cells may change');
 for(const p of r.points){const [x,y,z]=p.xyz;expected[10+x+394*(y+466*z)]=p.before;}
 assert.ok(expected.equals(before),'Reverse replay must restore all bytes');
 assert.equal(sha(after.subarray(10)),r.afterRawVoxelSha256);
 assert.equal(r.countsBefore['41'],16);assert.equal(r.countsAfter['41'],195);
 assert.equal(r.sixNeighbourComponentsAfter,1);assert.equal(r.partialExtent,true);assert.equal(r.heldLocatorCount,94);
 assert.equal(r.projectAdopted,true);assert.equal(r.expertReviewed,false);assert.equal(r.published,false);
 assert.match(r.limitation,/Not expert review or complete aqueduct/);
 assert.equal(r.evidence.reduce((n,e)=>n+(e.visuallyInspectedFigures?.length??0),0),37);
 const meta=JSON.parse(await read('public/atlas/bigbrain-practical-segmentation-icbm500-validation.json'));
 assert.equal(meta.regionalBatchAudits['aqueduct-core179'].recordSha256,sha(bytes));
 const latest=await withRegionalBatches(r,{afterRevision:r.afterSha256});
 assert.equal(meta.labelCounts['41'],267);assert.equal(meta.labelCounts['27'],264456);assert.equal(meta.labelCounts['25'],11873);
 assert.equal(meta.rawVoxelSha256,latest.afterRawVoxelSha256);
});

test('partial aqueduct synchronizes all affected tissue masks without replacing the schematic aqueduct',async()=>{
 const r=JSON.parse(await read('segmentation-patches/review/aqueduct-core179-adoption-2026-09-08.json'));
 assert.equal(r.meshImpact.blockMaskImpact.length,55);
 const changed=r.meshImpact.blockMaskImpact.filter(p=>p.changedMaskVoxels);
 assert.deepEqual(changed.map(p=>[p.block,p.part,p.added,p.removed]),[['diencephalon','hypothalamus',0,3],['radiations','tissue',0,6],['midbrain-section','tissue',0,1],['hindbrain','midbrain',0,5]]);
 const manifest=JSON.parse(await read('public/atlas/specimen-blocks.json'));
 for(const p of changed){const successor=await regionalMeshSuccessor(p.file,p.afterSha256,r.afterSha256),latest=successor??p;assert.equal(p.beforeMatches,true);assert.equal(p.reproducedBeforeSha256,p.beforeSha256);assert.equal(sha(await read('public/atlas/'+p.file)),latest.afterSha256);assert.equal(sha(await read('tests/fixtures/'+p.file.slice(0,-5)+'-pre-aqueduct-core179.mesh')),p.beforeSha256);assert.equal(manifest.specimens[p.block].find(q=>q.part===p.part).meshSha256,latest.afterSha256);}
 assert.deepEqual(r.sectionMeshImpact.changedFiles,['section-current-ventricular-system.mesh']);
 const latest=await withRegionalBatches(r,{afterRevision:r.afterSha256});
 for(const [name,info] of Object.entries(latest.sectionMeshImpact.after.meshes))assert.equal(sha(await read('public/atlas/'+name+'.mesh')),info.sha256);
 const page=await read('app/page.tsx');assert.match(page.toString(),/中脳水道は模式3D/);
 assert.ok(r.meshImpact.blockMaskImpact.filter(p=>p.part==='aqueduct').every(p=>p.changedMaskVoxels===0));
});
