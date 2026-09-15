import test from 'node:test';
import {withRegionalBatches,regionalMeshSuccessor} from './helpers/residual-mesh-successor.mjs';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const read=p=>readFile(new URL('../'+p,import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');

test('lateral cavity repair is exactly 34 reversible zero-to-ID24 voxels',async()=>{
 const bytes=await read('segmentation-patches/review/lateral-crop34-adoption-2026-09-07.json'),r=JSON.parse(bytes);
 const base=await read('tests/fixtures/bigbrain-practical-segmentation-pre-lateral-crop34-3849.bin.gz'),current=await read('tests/fixtures/bigbrain-practical-segmentation-pre-left-lower-cavity.bin.gz');
 const latest=await withRegionalBatches(r);
 assert.equal(sha(base),r.beforeSha256);assert.equal(sha(current),r.afterSha256);
 const before=gunzipSync(base),after=gunzipSync(current),expected=Buffer.from(before),seen=new Set();
 assert.equal(r.points.length,34);assert.deepEqual(before.subarray(0,10),after.subarray(0,10));
 for(const p of r.points){const [x,y,z]=p;assert.ok(p.length===3&&p.every(Number.isInteger)&&x>=0&&x<394&&y>=0&&y<466&&z>=0&&z<378);const i=10+x+394*(y+466*z);assert.ok(!seen.has(i));seen.add(i);assert.equal(expected[i],0);expected[i]=24;}
 assert.deepEqual(expected,after);assert.equal(sha(after.subarray(10)),r.afterRawVoxelSha256);
 for(const i of seen)expected[i]=0;assert.deepEqual(expected,before);
 const meta=JSON.parse(await read('public/atlas/bigbrain-practical-segmentation-icbm500-validation.json'));
 assert.equal(meta.rawVoxelSha256,latest.afterRawVoxelSha256);assert.equal(meta.lateralCrop34Audit.recordSha256,sha(bytes));assert.equal(meta.labelCounts['24'],82250);
 assert.equal(r.projectAdopted,true);assert.equal(r.expertReviewed,false);assert.equal(r.published,false);
 const manifest=JSON.parse(await read('public/atlas/specimen-blocks.json'));
 assert.equal(r.meshImpact.blockMaskImpact.length,55);assert.equal(new Set(r.meshImpact.blockMaskImpact.map(p=>p.block+'/'+p.part)).size,55);
 const changed=r.meshImpact.blockMaskImpact.filter(p=>p.changedMaskVoxels);assert.equal(changed.length,5);
 for(const p of changed){const successor=await regionalMeshSuccessor(p.file,p.afterSha256),current=successor??p;assert.equal(sha(await read('public/atlas/'+p.file)),current.afterSha256);assert.equal(sha(await read('tests/fixtures/'+p.file.slice(0,-5)+'-pre-lateral-crop34.mesh')),p.beforeSha256);const item=manifest.specimens[p.block].find(q=>q.part===p.part);assert.equal(item.meshSha256,current.afterSha256);assert.equal(item.segmentationSourceSha256,successor?.segmentationSourceSha256??r.afterSha256);}
 for(const [name,info] of Object.entries(latest.sectionMeshImpact.after.meshes))assert.equal(sha(await read('public/atlas/'+name+'.mesh')),info.sha256);
 for(const name of ['section-current-third-ventricle','section-current-fourth-ventricle'])assert.deepEqual(r.sectionMeshImpact.before.meshes[name],r.sectionMeshImpact.after.meshes[name]);
 assert.equal(r.maskDirection.blockRows.length,55);assert.deepEqual(r.maskDirection.blockRows.filter(p=>p.added||p.removed).map(p=>[p.block,p.part,p.added,p.removed]),[['lateral-ventricle','tissue',394,0],['lateral-ventricle','ventricular-cavity',5,0],['choroid-plexus','tissue',281,0],['choroid-plexus','ventricular-cavity',5,0],['medial-temporal','inferior-horn',5,0]]);
});

test('regional cavity batches replay exactly and preserve every unrelated voxel and block',async()=>{
 const meta=JSON.parse(await read('public/atlas/bigbrain-practical-segmentation-icbm500-validation.json'));
 let current;
 for(const [name,audit] of Object.entries(meta.regionalBatchAudits)){
  const bytes=await read(audit.record),r=JSON.parse(bytes);
  assert.equal(sha(bytes),audit.recordSha256);
  const base=await read('tests/fixtures/bigbrain-practical-segmentation-pre-'+name+'.bin.gz');
  assert.equal(sha(base),r.beforeSha256);if(current)assert.deepEqual(gunzipSync(base),current);
  const expected=gunzipSync(base),seen=new Set(),label=r.transition==='mixed-to-26'?26:r.transition==='mixed-to-41'?41:Number(r.transition.split('->')[1]);
  const exclusions=r.transition==='mixed-ventricular-exclusions'||['23->0','24->0','25->0','26->0','41->0'].includes(r.transition);
  const brainstem=r.transition==='27->26';
  const interfaceHold=r.transition==='27->0';
  const callosalExclusion=r.transition==='30->0';
  const mixed=['mixed-to-26','mixed-to-41'].includes(r.transition);
  const posterior=r.transition==='mixed-posterior-ventricular-repair';
  const bilateral=r.transition==='mixed-lateral-cavity-fill';
  const combined=r.transition==='mixed-ventricular-repair'||posterior||bilateral;
  if(name==='upper-fourth-gap'){assert.equal(r.count,158);assert.equal(r.transition,'mixed-to-26');assert.equal(r.points.filter(p=>p.before===0&&p.after===26).length,57);assert.equal(r.points.filter(p=>p.before===27&&p.after===26).length,101);}
  else if(name==='lateral-roof8'){
   assert.equal(r.transition,'mixed-ventricular-repair');assert.equal(r.count,8);
   assert.deepEqual(r.points.map(p=>[p.before,p.after]),[[30,23],[30,23],[30,23],[30,23],[30,23],[30,23],[30,24],[30,24]]);
   assert.equal(r.meshImpact.blockMaskImpact.length,55);assert.equal(r.meshImpact.blockMaskImpact.filter(p=>p.changedMaskVoxels).length,0);
  }
  else if(bilateral){
   const ranges={'lateral-upper729':[729,209,520,174,202],'lateral-anterior1981':[1981,133,1848,136,173],'lateral-upper-nearblack1487':[1487,740,747,174,202],'lateral-posterior196':[196,182,14,136,173],'lateral-superomedial75':[75,31,44,166,173]};
   assert.ok(Object.hasOwn(ranges,name));const [count,left,right,zmin,zmax]=ranges[name];
   assert.equal(r.count,count);assert.equal(r.points.filter(p=>p.before===0&&p.after===23).length,left);assert.equal(r.points.filter(p=>p.before===0&&p.after===24).length,right);assert.ok(r.points.every(p=>p.xyz[2]>=zmin&&p.xyz[2]<=zmax));
   if(name==='lateral-anterior1981')assert.ok(r.points.every(p=>p.xyz[1]>=270));
   if(name==='lateral-posterior196'){assert.ok(r.points.every(p=>p.xyz[1]<230));assert.equal(r.indicesSha256,'7dda60df84fc1a30ff5952fbbf51e53a6d34ac5140331a5fbc7f9457e6f5367f');assert.deepEqual(r.heldDisconnectedXYZ,[[132,146,147]]);}
  }
  else if(posterior){assert.equal(name,'posterior-ventricles158');assert.equal(r.count,158);assert.equal(r.points.filter(p=>p.before===25&&p.after===0).length,94);assert.equal(r.points.filter(p=>p.before===0&&p.after===41).length,12);assert.equal(r.points.filter(p=>p.before===27&&p.after===41).length,52);}
  else if(combined){assert.equal(name,'ventricular-mixed12');assert.equal(r.count,12);assert.equal(r.points.filter(p=>p.before===0&&p.after===26).length,8);assert.equal(r.points.filter(p=>p.before===25&&p.after===0).length,4);}
  else if(mixed&&label===41){assert.equal(name,'aqueduct-core179');assert.equal(r.count,179);assert.equal(r.points.filter(p=>p.before===0).length,64);assert.equal(r.points.filter(p=>p.before===27).length,115);assert.ok(r.points.every(p=>p.after===41));}
  else if(mixed){assert.equal(name,'fourth-depth27');assert.equal(r.count,27);assert.equal(r.points.filter(p=>p.before===0).length,16);assert.equal(r.points.filter(p=>p.before===27).length,11);assert.ok(r.points.every(p=>p.after===26));}
  else if(brainstem){assert.equal(name,'fourth-brainstem48');assert.equal(r.count,48);assert.ok(r.points.every(p=>p.before===27&&p.after===26));}
  else if(interfaceHold){assert.equal(name,'midbrain-interface14');assert.equal(r.count,14);assert.ok(r.points.every(([x,y,z])=>x>=187&&x<=205&&y>=247&&y<=250&&z===115));assert.equal(r.netVentralAdditions,14789);}
  else if(label===27){assert.equal(name,'midbrain-ventral14803');assert.equal(r.transition,'0->27');assert.equal(r.count,14803);assert.ok(r.points.every(([x,y,z])=>x>=145&&x<248&&y>=215&&y<251&&z>=104&&z<116));}
  else if(callosalExclusion){assert.equal(name,'callosal-remaining304');assert.equal(r.count,304);assert.equal(r.indicesSha256,'b7156aa26def7b907a170de76de7922432e35eb3373e8ffa475887742b134eb6');}
  else if(!exclusions){assert.ok([23,24,25,26].includes(label));assert.equal(r.transition,'0->'+label);if(label===25){assert.equal(name,'third-central-fringe61');assert.equal(r.count,61);}if(label===26){const counts={'fourth-remaining-anterior173':173,'fourth-upper-posterior111':111};assert.ok(Object.hasOwn(counts,name));assert.equal(r.count,counts[name]);}}
  else if(name==='third-inferior-current16'){
   assert.equal(r.transition,'25->0');assert.equal(r.count,16);assert.ok(r.points.every(p=>p.before===25&&p.after===0));
  }
  else if(name==='posterior-ventricular-islands2') {
   assert.equal(r.count,2);
   assert.deepEqual(r.points,[{xyz:[151,111,156],before:23,after:0},{xyz:[237,120,158],before:24,after:0}]);
  }
  else if(name==='lateral-medial-islands11'){assert.equal(r.count,11);assert.equal(r.points.filter(p=>p.before===23).length,4);assert.equal(r.points.filter(p=>p.before===24).length,7);assert.ok(r.points.every(p=>p.after===0&&p.xyz[2]>=119&&p.xyz[2]<=120));assert.equal(r.visuallyInspectedUniquePlanes,45);}
  else if(name==='third-remnants91'){assert.equal(r.count,91);assert.ok(r.points.every(p=>p.before===25&&p.after===0));}
  else {assert.equal(name,'ventricular-exclusions46');assert.equal(r.count,46);assert.equal(r.points.filter(p=>p.before===23).length,12);assert.equal(r.points.filter(p=>p.before===25).length,34);}
  assert.equal(r.points.length,r.count);
  for(const entry of r.points){const p=exclusions||brainstem||mixed||combined?entry.xyz:entry;const [x,y,z]=p;assert.ok(p.length===3&&p.every(Number.isInteger)&&x>=0&&x<394&&y>=0&&y<466&&z>=0&&z<378);const i=10+x+394*(y+466*z);assert.ok(!seen.has(i));seen.add(i);assert.equal(expected[i],exclusions||brainstem||mixed||combined?entry.before:interfaceHold?27:callosalExclusion?30:0);if(exclusions)assert.equal(entry.after,0);expected[i]=combined?entry.after:exclusions?0:label;}
  assert.equal(sha(expected.subarray(10)),r.afterRawVoxelSha256);current=expected;
  assert.equal(r.projectAdopted,true);assert.equal(r.expertReviewed,false);assert.equal(r.published,false);
  const manifest=JSON.parse(await read('public/atlas/specimen-blocks.json'));
  const ids=Object.entries(manifest.specimens).flatMap(([b,ps])=>ps.map(p=>b+'/'+p.part)).sort();
  assert.deepEqual(r.meshImpact.blockMaskImpact.map(p=>p.block+'/'+p.part).sort(),ids);
  const changed=r.meshImpact.blockMaskImpact.filter(p=>p.changedMaskVoxels);
  const expectedChanges={'left-lower-majority':[['diencephalon','tissue',0,4]],'left-lower-posterior1396':[['diencephalon','tissue',0,58],['commissural-system','tissue',41,0]],'ventricular-exclusions46':[['diencephalon','third-ventricle',0,5]]};
  expectedChanges['upper-fourth-gap']=[['diencephalon','tissue',0,23],['medial-temporal','tissue',0,2],['hindbrain','pons-medulla',0,9],['hindbrain','midbrain',0,1],['hindbrain','fourth-ventricle',24,0]];
  expectedChanges['right-inferior-gap421']=[['lateral-ventricle','tissue',350,59],['lateral-ventricle','ventricular-cavity',61,0],['diencephalon','tissue',0,6],['choroid-plexus','tissue',236,59],['choroid-plexus','ventricular-cavity',61,0],['medial-temporal','tissue',0,59],['medial-temporal','inferior-horn',61,0]];
  if(name==='right-inferior-gap421'){assert.equal(r.count,421);assert.equal(r.transition,'0->24');}
  expectedChanges['right-inferior-wide830']=[['lateral-ventricle','tissue',911,78],['lateral-ventricle','ventricular-cavity',88,0],['diencephalon','tissue',0,5],['choroid-plexus','tissue',727,78],['choroid-plexus','ventricular-cavity',88,0],['medial-temporal','tissue',0,78],['medial-temporal','inferior-horn',88,0]];
  if(name==='right-inferior-wide830'){assert.equal(r.count,830);assert.equal(r.transition,'0->24');}
  expectedChanges['right-posterior2308']=[['lateral-ventricle','tissue',370,51],['lateral-ventricle','ventricular-cavity',271,0],['radiations','tissue',0,193],['commissural-system','lateral-ventricles',14,0],['choroid-plexus','tissue',141,23],['choroid-plexus','ventricular-cavity',239,0],['medial-temporal','tissue',0,92],['medial-temporal','inferior-horn',125,0]];
  if(name==='right-posterior2308'){assert.equal(r.count,2308);assert.equal(r.transition,'0->24');}
  expectedChanges['right-posterior-superior7160']=[['lateral-ventricle','tissue',619,152],['lateral-ventricle','ventricular-cavity',760,0],['radiations','tissue',0,547],['commissural-system','tissue',167,0],['commissural-system','lateral-ventricles',389,0],['choroid-plexus','tissue',191,56],['choroid-plexus','ventricular-cavity',760,0],['medial-temporal','tissue',0,10],['medial-temporal','inferior-horn',12,0]];
  if(name==='right-posterior-superior7160'){assert.equal(r.count,7160);assert.equal(r.transition,'0->24');}
  expectedChanges['left-posterior-superior5757']=[['lateral-ventricle','tissue',0,14],['diencephalon','tissue',0,277],['commissural-system','tissue',581,268],['commissural-system','lateral-ventricles',530,0],['choroid-plexus','tissue',0,14]];
  if(name==='left-posterior-superior5757'){assert.equal(r.count,5757);assert.equal(r.transition,'0->23');}
  expectedChanges['left-anterior2224']=[['lateral-ventricle','tissue',0,10],['diencephalon','tissue',0,19],['commissural-system','tissue',293,61],['commissural-system','lateral-ventricles',312,0],['choroid-plexus','tissue',0,10]];
  if(name==='left-anterior2224'){assert.equal(r.count,2224);assert.equal(r.transition,'0->23');}
  expectedChanges['left-anterior-terminal3341']=[['lateral-ventricle','tissue',0,4],['diencephalon','tissue',0,16],['commissural-system','tissue',369,102],['commissural-system','lateral-ventricles',434,0],['choroid-plexus','tissue',0,4]];
  if(name==='left-anterior-terminal3341'){assert.equal(r.count,3341);assert.equal(r.transition,'0->23');}
  expectedChanges['right-anterior-terminal4515']=[['lateral-ventricle','tissue',1361,102],['lateral-ventricle','ventricular-cavity',497,0],['radiations','tissue',0,166],['commissural-system','tissue',26,0],['commissural-system','lateral-ventricles',497,0],['choroid-plexus','tissue',406,57],['choroid-plexus','ventricular-cavity',402,0]];
  if(name==='right-anterior-terminal4515'){assert.equal(r.count,4515);assert.equal(r.transition,'0->24');}
  expectedChanges['left-medial-anterior1092']=[['lateral-ventricle','tissue',0,35],['commissural-system','lateral-ventricles',97,0],['choroid-plexus','tissue',0,35]];
  expectedChanges['fourth-remaining-anterior173']=[['diencephalon','tissue',0,4],['medial-temporal','tissue',0,1],['hindbrain','fourth-ventricle',17,0]];
  expectedChanges['fourth-depth27']=[['diencephalon','tissue',0,2],['medial-temporal','tissue',0,1],['hindbrain','pons-medulla',0,3],['hindbrain','fourth-ventricle',6,0]];
  expectedChanges['fourth-upper-posterior111']=[['diencephalon','tissue',0,3],['medial-temporal','tissue',0,3],['hindbrain','fourth-ventricle',6,0]];
  expectedChanges['ventricular-mixed12']=[['diencephalon','tissue',0,1],['hindbrain','fourth-ventricle',3,0]];
  expectedChanges['third-remnants91']=[['diencephalon','third-ventricle',0,10]];
  expectedChanges['third-central-fringe61']=[['diencephalon','third-ventricle',2,0]];
  expectedChanges['aqueduct-core179']=[['diencephalon','hypothalamus',0,3],['radiations','tissue',0,6],['midbrain-section','tissue',0,1],['hindbrain','midbrain',0,5]];
  expectedChanges['posterior-ventricles158']=[['diencephalon','third-ventricle',0,14],['midbrain-section','tissue',0,2],['hindbrain','midbrain',0,2]];
  expectedChanges['lateral-upper729']=[['lateral-ventricle','tissue',39,0],['lateral-ventricle','ventricular-cavity',56,0],['commissural-system','tissue',3,0],['commissural-system','lateral-ventricles',88,0],['choroid-plexus','tissue',53,0],['choroid-plexus','ventricular-cavity',56,0]];
  expectedChanges['lateral-anterior1981']=[['lateral-ventricle','tissue',251,115],['lateral-ventricle','ventricular-cavity',297,0],['radiations','tissue',0,111],['commissural-system','tissue',3,9],['commissural-system','lateral-ventricles',318,0],['choroid-plexus','tissue',161,114],['choroid-plexus','ventricular-cavity',294,0],['medial-temporal','tissue',0,12],['medial-temporal','inferior-horn',37,0]];
  expectedChanges['lateral-upper-nearblack1487']=[['lateral-ventricle','tissue',78,118],['lateral-ventricle','ventricular-cavity',99,0],['diencephalon','tissue',0,46],['radiations','tissue',0,98],['commissural-system','tissue',57,48],['commissural-system','lateral-ventricles',183,0],['choroid-plexus','tissue',89,117],['choroid-plexus','ventricular-cavity',99,0]];
  expectedChanges['midbrain-ventral14803']=[['midbrain-section','tissue',814,0],['hindbrain','midbrain',1801,0]];
  expectedChanges['callosal-remaining304']=[['commissural-system','corpus-callosum',0,44]];
  expectedChanges['lateral-posterior196']=[['lateral-ventricle','ventricular-cavity',2,0],['diencephalon','tissue',0,13],['radiations','tissue',0,2],['commissural-system','tissue',34,2],['commissural-system','lateral-ventricles',2,0],['choroid-plexus','ventricular-cavity',2,0]];
  expectedChanges['lateral-medial-islands11']=[['lateral-ventricle','tissue',0,295],['lateral-ventricle','ventricular-cavity',0,1],['commissural-system','tissue',0,500],['choroid-plexus','tissue',0,114],['choroid-plexus','ventricular-cavity',0,1],['medial-temporal','inferior-horn',0,1]];
  expectedChanges['lateral-superomedial75']=[['lateral-ventricle','tissue',0,6],['lateral-ventricle','ventricular-cavity',8,0],['radiations','tissue',0,6],['commissural-system','lateral-ventricles',9,0],['choroid-plexus','tissue',3,6],['choroid-plexus','ventricular-cavity',8,0]];
  expectedChanges['third-inferior-current16']=[['diencephalon','third-ventricle',0,2]];
  if(name==='left-medial-anterior1092'){assert.equal(r.count,1092);assert.equal(r.transition,'0->23');}
  assert.deepEqual(changed.map(p=>[p.block,p.part,p.added,p.removed]),expectedChanges[name]??[]);
  for(const p of changed){
   assert.equal(p.beforeMatches,true);assert.equal(p.reproducedBeforeSha256,p.beforeSha256);
   assert.equal(sha(await read('tests/fixtures/'+p.file.slice(0,-5)+'-pre-'+name+'.mesh')),p.beforeSha256);
   const successor=await regionalMeshSuccessor(p.file,p.afterSha256,r.afterSha256),latest=successor??p;
   assert.equal(sha(await read('public/atlas/'+p.file)),latest.afterSha256);
   const entry=manifest.specimens[p.block].find(e=>e.part===p.part);
   assert.equal(entry.meshSha256,latest.afterSha256);assert.equal(entry.segmentationSourceSha256,successor?.segmentationSourceSha256??r.afterSha256);
  }
 }
 assert.ok(current);assert.deepEqual(gunzipSync(await read('public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz')),current);
 assert.equal(meta.rawVoxelSha256,sha(current.subarray(10)));
 assert.equal(meta.labelCounts['23'],81670);assert.equal(meta.labelCounts['24'],82250);assert.equal(meta.labelCounts['25'],11837);
});
