import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {buildContentMap,root} from '../scripts/build_curriculum_content_map.mjs';
import {validateContentMap} from '../scripts/validate_curriculum_content_map.mjs';
const baseline=JSON.parse(await fs.readFile(`${root}/data/curriculum/content-map.json`,'utf8'));
const check=async mutate=>{const map=structuredClone(baseline);mutate(map);return (await validateContentMap(map,{verifySources:false})).errors;};
test('generated inventory reproduces checked-in map and source keys/hashes validate',async()=>{
  assert.deepEqual(await buildContentMap(),baseline);
  assert.deepEqual((await validateContentMap(baseline)).errors,[]);
});
test('missing required fields and unknown evidence approval state are rejected',async()=>{
  assert((await check(m=>delete m.materials[0].evidence_state)).some(e=>e.includes('missing')));
  assert((await check(m=>m.materials[0].evidence_state.medical_judgment='approved')).some(e=>e.includes('invalid enum')));
});
test('duplicate IDs and orphan task targets are rejected',async()=>{
  assert((await check(m=>m.materials.push(structuredClone(m.materials[0])))).some(e=>e.includes('duplicate id')));
  assert((await check(m=>m.tasks[0].material_refs=['missing'])).some(e=>e.includes('orphan')));
});
test('evidence inadequacy cannot disappear without resolving its provenance link',async()=>{
  assert((await check(m=>m.gaps=m.gaps.filter(g=>g.kind!=='missing-provenance-link'))).some(e=>e.includes('undocumented evidence inadequacy')));
});
test('project adoption cannot be promoted to expert approval',async()=>{
  assert((await check(m=>m.materials.find(x=>x.evidence.length).evidence[0].expert_review='expert-reviewed')).some(e=>e.includes('altered provenance')));
});
test('empty label IDs cannot claim an existing image association',async()=>{
  assert((await check(m=>m.materials.find(x=>!x.label_ids.length).evidence_state.image_position='既存ラベル対応あり・画像位置未検証')).some(e=>e.includes('unsupported image position state')));
  assert((await check(m=>m.materials.find(x=>x.label_ids.length).evidence_state.image_position='画像位置対応不足')).some(e=>e.includes('unsupported image position state')));
});
test('CSF cannot become a circuit through metadata links',async()=>{
  assert((await check(m=>m.topics.find(t=>t.existing_key==='csf-route').circuit_refs=['papez'])).some(e=>e.includes('CSF')));
});
test('unresolved concept target and source IDs are rejected',async()=>{
  assert((await check(m=>m.concept_inventory[0].target='absent-target')).some(e=>e.includes('unresolved concept target')));
  assert((await check(m=>m.concept_inventory[0].source_refs=['absent-source'])).some(e=>e.includes('orphan concept source')));
});
test('source drift is rejected without reading or changing anatomy assets',async()=>{
  const map=structuredClone(baseline);map.sources[0].sha256='0'.repeat(64);
  assert((await validateContentMap(map)).errors.some(e=>e.includes('source drift')));
});

test('explicit learner mapping resolves links without promoting composite or expert scope',async()=>{
  const m=baseline.materials.find(m=>m.id==='basalLandmarks/olfactory');
  assert.deepEqual(m.evidence.map(e=>e.entry_key).sort(),['surface-olfactory-bulb','surface-olfactory-sulcus','surface-olfactory-tract']);
  assert.equal(m.provenance_mapping.mapping.composite,true);
  assert.equal(m.evidence_state.medical_judgment,'医学判断待ち');
  assert((await check(map=>map.materials.find(m=>m.id==='basalLandmarks/olfactory').provenance_mapping.mapping.entryKeys=['section-thalamus'])).some(e=>e.includes('altered learner mapping')));
  assert((await check(map=>map.materials.find(m=>m.id==='basalLandmarks/olfactory').evidence=[])).some(e=>e.includes('altered provenance linkage')));
});
test('existing guide links reduce lesson gaps while provenance mapping alone is not a lesson',async()=>{
  for(const key of ['central-sulcus','longitudinal-fissure','calcarine-sulcus']){
    const m=baseline.materials.find(m=>m.id==='surfaceLandmarks/'+key);
    assert(m.source_text_refs.some(r=>r.file==='src/surfaceObservationGuides.ts'));
    assert(!baseline.gaps.some(g=>g.subject_ref===m.id));
  }
  assert(baseline.gaps.some(g=>g.subject_ref==='surfaceLandmarks/precentral-sulcus'&&g.kind==='no-dedicated-observation-lesson'));
  assert((await check(map=>map.gaps=map.gaps.filter(g=>g.kind!=='no-dedicated-observation-lesson'))).some(e=>e.includes('inconsistent observation lesson gap')));
});

test('valid guide key cannot be attached to an unrelated landmark',async()=>{
  assert((await check(map=>map.materials.find(m=>m.id==='surfaceLandmarks/central-sulcus').source_text_refs.find(r=>r.file==='src/surfaceObservationGuides.ts').key='medial')).some(e=>e.includes('unsupported observation guide linkage')));
});
