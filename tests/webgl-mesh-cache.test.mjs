import {test} from 'node:test';
import assert from 'node:assert/strict';
import {atlasMeshBuffers,atlasAttributeBuffer} from '../src/webglMeshCache.mjs';

function context() {
  const live=new Set(),uploads=[];
  return {ARRAY_BUFFER:1,ELEMENT_ARRAY_BUFFER:2,STATIC_DRAW:3,lost:false,failAfter:Infinity,created:0,uploads,
    createBuffer(){if(this.created++>=this.failAfter)return null;const b={};live.add(b);return b},
    isBuffer:b=>live.has(b),deleteBuffer:b=>live.delete(b),bindBuffer(){},
    bufferData:(target,data)=>uploads.push({target,data}),isContextLost(){return this.lost},
    invalidate:()=>live.clear(),live};
}
const mesh=()=>({vertices:new Float32Array(9),normals:new Float32Array(9),shade:new Float32Array(3),faces:new Uint32Array([0,1,2])});

test('600 frames upload an immutable mesh only once, preserving data and index type',()=>{
  const gl=context(),m=mesh(),first=atlasMeshBuffers(gl,m);
  for(let i=0;i<600;i++)assert.equal(atlasMeshBuffers(gl,m),first);
  assert.equal(gl.created,4);assert.equal(gl.uploads.length,4);
  assert.equal(gl.uploads[0].data,m.vertices);assert.equal(gl.uploads[3].target,gl.ELEMENT_ARRAY_BUFFER);assert.equal(gl.uploads[3].data,m.faces);
});

test('different meshes/contexts are isolated and a restored context reuploads',()=>{
  const gl=context(),other=context(),m=mesh(),first=atlasMeshBuffers(gl,m);
  assert.notEqual(atlasMeshBuffers(gl,mesh()),first);assert.notEqual(atlasMeshBuffers(other,m),first);
  gl.invalidate();gl.lost=true;assert.equal(atlasMeshBuffers(gl,m),null);
  gl.lost=false;assert.notEqual(atlasMeshBuffers(gl,m),first);assert.equal(gl.uploads.length,12);
});

test('partial allocation failure frees resources and permits retry',()=>{
  const gl=context(),m=mesh();gl.failAfter=2;
  assert.equal(atlasMeshBuffers(gl,m),null);assert.equal(gl.live.size,0);
  gl.failAfter=Infinity;assert.ok(atlasMeshBuffers(gl,m));assert.equal(gl.live.size,4);
});

test('attribute snapshots reuse bounded buffers while selection changes replace contents',()=>{
  const gl=context(),first=new Float32Array([1,0,0,1]),next=new Float32Array([0,1,0,1]);
  const buffer=atlasAttributeBuffer(gl,'highlight',first);
  for(let i=0;i<600;i++)assert.equal(atlasAttributeBuffer(gl,'highlight',first),buffer);
  assert.equal(gl.uploads.length,1);
  assert.equal(atlasAttributeBuffer(gl,'highlight',next),buffer);
  assert.equal(atlasAttributeBuffer(gl,'highlight',first),buffer);
  assert.equal(gl.uploads.length,3);
  assert.notEqual(atlasAttributeBuffer(gl,'travel',first),buffer);
  assert.equal(gl.live.size,2);
});

test('attribute buffers recover after context loss and allocation failure',()=>{
  const gl=context(),data=new Float32Array([1]);gl.failAfter=0;
  assert.equal(atlasAttributeBuffer(gl,'highlight',data),null);
  gl.failAfter=Infinity;const first=atlasAttributeBuffer(gl,'highlight',data);
  gl.invalidate();gl.lost=true;assert.equal(atlasAttributeBuffer(gl,'highlight',data),null);
  gl.lost=false;assert.notEqual(atlasAttributeBuffer(gl,'highlight',data),first);
  assert.equal(gl.uploads.length,2);
});
