import test from 'node:test';
import assert from 'node:assert/strict';
import {readCircuitWorkspaceState} from '../src/circuitWorkspaceProgress.mjs';
const saved={key:'auditory',positions:{},rotation:{x:-7,y:-18},auditoryStep:'bilateral',observation:{target:'cortex',mode:'slice'},sectionPlane:'horizontal',sectionPosition:55};
test('schematic explanation retains separately observed structure and section after restoration',()=>assert.deepEqual(readCircuitWorkspaceState(JSON.parse(JSON.stringify(saved))),saved));
test('invalid section coordinates are rejected without coercion',()=>{for(const sectionPosition of [-1,101,Infinity,'55'])assert.equal(readCircuitWorkspaceState({...saved,sectionPosition}),null);assert.equal(readCircuitWorkspaceState({...saved,sectionPlane:'oblique'}),null);});
test('per-circuit camera memory survives restoration and discards invalid view entries',()=>{
 const view={rotation:{x:22,y:90,z:0},zoom:2.11,pan:{x:30,y:10}};
 const restored=readCircuitWorkspaceState({...saved,circuitViews:{papez:view,visual:{...view,zoom:99}}});
 assert.deepEqual(restored.circuitViews,{papez:view});
});
test('unmodelled Papez step can retain its preceding valid observation',()=>{const state={...saved,key:'papez',positions:{papez:{pathIndex:0,nodeIndex:3}},observation:{index:2,node:'mammillary',mode:'slice'}};assert.deepEqual(readCircuitWorkspaceState(state),state);assert.equal(readCircuitWorkspaceState({...state,observation:{index:2,node:'fornix',mode:'slice'}}),null);});
