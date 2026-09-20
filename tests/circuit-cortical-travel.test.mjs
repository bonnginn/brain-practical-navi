import test from 'node:test';
import assert from 'node:assert/strict';
import {corticalCircuitTravel,circuitStageDuration} from '../src/circuitTravel.mjs';
test('cortical signal stays on the labelled folded ribbon',()=>{
 const mesh={vertices:new Float32Array([0,2,1,1,2,1,2,2,1,2,1.2,1,1,1.1,1,0,1,1,0,9,1]),regions:new Float32Array([8,8,8,8,8,8,9]),faces:new Uint32Array([0,1,1,1,2,2,2,3,3,3,4,4,4,5,5,0,6,5])};
 const field=corticalCircuitTravel(mesh,[8]);
 for(let i=1;i<6;i++)assert.ok(field[i]>field[i-1]);
 assert.equal(field[6],0);assert.equal(field[0],0);assert.equal(field[5],1);
 assert.ok(circuitStageDuration('mammillary')<circuitStageDuration('cingulate'));
});

