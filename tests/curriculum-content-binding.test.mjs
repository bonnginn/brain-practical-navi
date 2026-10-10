import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createCurriculumLookup,materialIdForFreeKey} from '../src/curriculumContent.mjs';
const map=JSON.parse(await fs.readFile(new URL('../data/curriculum/content-map.json',import.meta.url),'utf8'));
const lookup=createCurriculumLookup(map);
test('27 restored provenance links and three observation lesson links are retrievable',()=>{
  const restored=map.materials.filter(m=>m.provenance_mapping);
  assert.equal(restored.length,27);
  for(const m of restored){
    const result=lookup(m.id);
    assert.deepEqual(result.evidence,m.evidence);
    const [registry,key]=m.id.split('/');
    const family={surfaceRegions:'region',surfaceLandmarks:'landmark',surfaceDeepLandmarks:'deep',basalLandmarks:'basal'}[registry];
    assert.equal(materialIdForFreeKey(family+':'+key),m.id);
    assert.equal(result.material.evidence_state.medical_judgment,'医学判断待ち');
  }
  for(const key of ['central-sulcus','longitudinal-fissure','calcarine-sulcus']){
    assert(lookup('surfaceLandmarks/'+key).source_text_refs.some(r=>r.symbol==='surfaceObservationGuides'));
    assert(lookup('surfaceLandmarks/'+key).topics.some(t=>t.id.startsWith('surfaceObservationGuides/')));
  }
});
test('namespaces, unknown IDs and switching cannot leak the previous target',()=>{
  assert.notEqual(lookup('basalLandmarks/hypothalamus').material.id,lookup('surfaceDeepLandmarks/hypothalamus').material.id);
  for(const id of [undefined,null,42,'hypothalamus','missing','structures/central-sulcus','__proto__'])assert.equal(lookup(id),null);
  assert.equal(lookup('surfaceLandmarks/calcarine-sulcus').material.name,'鳥距溝');
  assert.equal(materialIdForFreeKey('landmark:central-sulcus:extra'),null);
});
test('missing references remain empty and scoped tasks retain runtime availability',()=>{
  const empty=createCurriculumLookup({materials:[{id:'x',evidence_state:{}}]});
  assert.deepEqual(empty('x').evidence,[]);assert.deepEqual(empty('x').topics,[]);assert.deepEqual(empty('x').tasks,[]);
  for(const m of map.materials)for(const task of lookup(m.id).tasks){assert(task.material_refs.includes(m.id));assert.equal(task.availability,'definition-only-runtime-filtered');}
  assert(lookup('basalLandmarks/mammillary').gaps.some(g=>g.kind==='missing-provenance-link'));
});

test('runtime projection preserves displayed teaching references and scoped task counts',async()=>{const runtime=JSON.parse(await fs.readFile(new URL('../data/curriculum/runtime-reference-map.json',import.meta.url),'utf8'));const live=createCurriculumLookup(runtime);for(const m of map.materials){const expected=lookup(m.id),actual=live(m.id);assert.equal(actual.material.name,expected.material.name);assert.equal(actual.material.evidence_state.image_position,expected.material.evidence_state.image_position);assert.deepEqual(actual.evidence,expected.evidence.map(e=>({entry_key:e.entry_key,limitations:e.limitations,source_refs:e.source_refs})));assert.deepEqual(actual.source_text_refs,expected.source_text_refs.filter(r=>r.symbol==='surfaceObservationGuides').map(r=>({symbol:r.symbol,key:r.key})));assert.deepEqual(actual.tasks.map(t=>t.id),expected.tasks.map(t=>t.id));assert.deepEqual(actual.gaps.map(g=>g.kind),expected.gaps.map(g=>g.kind));}assert(!('sources'in runtime));assert(!('concept_inventory'in runtime));});
