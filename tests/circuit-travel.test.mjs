import test from 'node:test';
import assert from 'node:assert/strict';
import {circuitTravel} from '../src/circuitTravel.mjs';
test('arrival follows a folded mesh instead of jumping across its nearby ends',()=>{
 const vertices=new Float32Array([0,0,0, 1,0,0, 2,0,0, 2,1,0, 1,1,0, 0,1,0]);
 const mesh={vertices,faces:new Uint32Array([0,1,1,1,2,2,2,3,3,3,4,4,4,5,5])};
 const marker=p=>({vertices:new Float32Array(p),faces:new Uint32Array()});
 const field=circuitTravel(mesh,[marker([0,0,0])],[marker([0,1,0])]);
 assert.equal(field[0],0);assert.equal(field[5],1);
 for(let i=1;i<field.length;i++)assert.ok(field[i]>field[i-1]);
 assert.deepEqual(vertices,mesh.vertices);
});
test('separate hemispheres and isolated vertices have finite independent arrival fields',()=>{
 const mesh={vertices:new Float32Array([0,0,0,1,0,0,2,0,0, 0,10,0,1,10,0,2,10,0, 5,5,5]),faces:new Uint32Array([0,1,2,3,4,5])};
 const field=circuitTravel(mesh);
 assert.ok([...field].every(x=>Number.isFinite(x)&&x>=0&&x<=1));
 assert.deepEqual([...field.slice(0,3)],[...field.slice(3,6)]);
 assert.equal(field[6],0);
});
test('a joined bilateral mesh receives the front from both incoming sides',()=>{
 const mesh={vertices:new Float32Array([0,0,-2,1,0,-1,2,0,0,1,0,1,0,0,2]),faces:new Uint32Array([0,1,1,1,2,2,2,3,3,3,4,4])};
 const incoming={vertices:new Float32Array([0,0,-2,0,0,2]),faces:new Uint32Array()};
 const outgoing={vertices:new Float32Array([2,0,0]),faces:new Uint32Array()};
 const f=circuitTravel(mesh,[incoming],[outgoing]);
 assert.equal(f[0],0);assert.equal(f[4],0);assert.equal(f[2],1);
 assert.equal(f[1],f[3]);assert.ok(f[1]>0&&f[1]<1);
});
