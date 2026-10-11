import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BODY_CIRCUIT_TEACHING} from '../src/bodyCircuitTeaching.mjs';
import {readCircuitWorkspaceState} from '../src/circuitWorkspaceProgress.mjs';

test('sensory routes keep distinct crossing levels and cortex beyond relay',()=>{
 const dcml=BODY_CIRCUIT_TEACHING.dcml,als=BODY_CIRCUIT_TEACHING.anterolateral;
 assert.match(dcml.nodes.find(n=>n.key==='dcml-cross').label.en,/medulla/);
 assert.match(als.nodes.find(n=>n.key==='als-cross').label.en,/spinal cord/);
 for(const route of [dcml,als]){
  const crossing=route.nodes.find(n=>n.key.endsWith('cross'));
  assert.equal(crossing.observationIndex,null);
  assert.deepEqual(crossing.observationTargets,[]);
  assert.match(route.nodes.at(-1).label.en,/Right primary somatosensory cortex/);
 }
});
test('new last-stage observation, section and camera survive saved round-trip',()=>{
 for(const route of Object.values(BODY_CIRCUIT_TEACHING)){
  const node=route.nodes.filter(n=>n.observationIndex!==null).at(-1);
  const state={key:route.key,positions:{[route.key]:{pathIndex:0,nodeIndex:route.nodes.indexOf(node)}},rotation:{x:15,y:35},zoom:1.2,pan:{x:0,y:0},auditoryStep:'input',observation:{index:node.observationIndex,node:node.key,mode:'slice'},sectionPlane:node.observationPlane,sectionPosition:node.observationPosition};
  assert.deepEqual(readCircuitWorkspaceState(JSON.parse(JSON.stringify(state))),state);
  assert.equal(readCircuitWorkspaceState({...state,observation:{...state.observation,index:99}}),null);
 }
});
test('GPi and VL revisions retain stable keys and separate old allowlist entries',()=>{
 const current=JSON.parse(readFileSync(new URL('../services/quiz-statistics/catalog.json',import.meta.url)));
 const legacy=JSON.parse(readFileSync(new URL('../services/quiz-statistics/legacy-catalog.json',import.meta.url)));
 for(const id of ['pallidum-direct-disinhibition','cerebellum-dentate-cortical-loop']){
  const fresh=current.find(r=>r.question===id),old=legacy.find(r=>r.question===id&&r.revision!==fresh.revision);
  assert.ok(old);assert.deepEqual(fresh.options,old.options);
 }
 assert.match(current.find(r=>r.question==='pallidum-direct-disinhibition').prompt,/GPi（淡蒼球内節）/);
});
