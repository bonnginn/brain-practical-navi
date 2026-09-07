import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('metadata distinguishes schematic paths from reconstructed roots',()=>{
 const meta=JSON.parse(read('public/atlas/neurovascular-overlays.json'));
 assert.match(meta.cranialNerveRootCalibration,/not validated/);
 assert.doesNotMatch(meta.cranialNerveRootCalibration,/within 2 mm/);
 assert.match(meta.cranialNerveRootTopography.V,/sensory and motor roots not separated/);
 assert.match(meta.cranialNerveRootTopography['IX-XI'],/not rootlet rows.*spinal root/);
 for(const term of ['individual cranial-nerve rootlets','separate trigeminal sensory and motor roots','accessory spinal root and ascending course'])assert.ok(meta.omissions.includes(term));
});
test('generator retains the public scope and omission strings',()=>{
 const meta=JSON.parse(read('public/atlas/neurovascular-overlays.json'));
 const generator=read('scripts/build_neurovascular_overlays.py');
 for(const term of [meta.scope,meta.cranialNerveRootCalibration,...meta.omissions])assert.ok(generator.includes(JSON.stringify(term)),term);
 assert.doesNotMatch(generator,/# IX–XI: serial rootlets/);
});
test('VII/VIII crop is disclosed as a display limit, not an anatomical endpoint',()=>{
 const meta=JSON.parse(read('public/atlas/neurovascular-overlays.json'));
 assert.match(meta.pontineProximalDisplayPolicy,/not an observed nerve endpoint/);
 assert.match(meta.pontineProximalDisplayPolicy,/remain unvalidated/);
 const structures=meta.groups.find(g=>g.file==='overlay-nerves-pontine.mesh').structures;
 for(const s of structures){
  if([34,35,36,37].includes(s.id)){
   assert.equal(s.displayedRings,8);assert.equal(s.anatomicalEndpoint,false);
  }else assert.equal(s.displayedRings,undefined);
 }
 assert.ok(read('app/AtlasVolumeCanvas.tsx').includes('name==="overlay-nerves-pontine"?"?v=1244f483c765ef08"'));
});
