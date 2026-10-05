import test from 'node:test';import assert from 'node:assert/strict';import {readCircuitHistory,circuitHistoryState} from '../src/circuitHistory.mjs';
const stage={circuitKey:'visual',pathIndex:2,nodeIndex:4};const section={plane:'coronal',position:47,structureKey:'lateralGeniculateBodies'};
test('independent guide and section history entries preserve the originating side and stage',()=>{
 const guide=circuitHistoryState({learningOrigin:'retained'},'#workspace/surface/free',stage);const observation=circuitHistoryState(null,'#workspace/sections/coronal',{...stage,section});const returned=circuitHistoryState(null,'#workspace/surface/free',readCircuitHistory(observation,'#workspace/sections/coronal'));
 assert.deepEqual(readCircuitHistory(guide,'#workspace/surface/free'),stage);assert.deepEqual(readCircuitHistory(observation,'#workspace/sections/coronal'),{...stage,section});assert.deepEqual(readCircuitHistory(returned,'#workspace/surface/free'),stage);assert.equal(guide.learningOrigin,'retained');assert.deepEqual(readCircuitHistory(observation,'#workspace/sections/coronal'),{...stage,section});
});
test('direct routes and malformed or stale contexts cannot invent a circuit origin',()=>{
 assert.equal(readCircuitHistory(null,'#workspace/sections/coronal'),null);assert.equal(readCircuitHistory({circuitObservation:stage},'#workspace/home'),null);
 for(const invalid of [{...stage,circuitKey:'unknown'},{...stage,circuitKey:'__proto__'},{...stage,pathIndex:4},{...stage,nodeIndex:-1},{...stage,nodeIndex:7},{...stage,nodeIndex:NaN}])assert.equal(readCircuitHistory({circuitObservation:invalid},'#workspace/surface/free'),null);
});
test('changing section planes keeps context while leaving the circuit drops it',()=>{
 const observation=circuitHistoryState(null,'#workspace/sections/coronal',{...stage,section});const changed=circuitHistoryState(observation,'#workspace/sections/horizontal',readCircuitHistory(observation,'#workspace/sections/coronal'));
 assert.equal(readCircuitHistory(changed,'#workspace/sections/horizontal').circuitKey,'visual');assert.equal(circuitHistoryState(changed,'#workspace/home',stage).circuitObservation,undefined);
 assert.equal(readCircuitHistory({circuitObservation:{...stage,section:{...section,position:101}}},'#workspace/sections/coronal').section,undefined);
});
