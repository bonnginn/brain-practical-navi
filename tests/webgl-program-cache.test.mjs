import {test} from 'node:test';
import assert from 'node:assert/strict';
import {atlasProgram} from '../src/webglProgramCache.mjs';

function context(){
  const live=new Set(),counts={compile:0,link:0,deletedShaders:0};
  return {counts,VERTEX_SHADER:1,FRAGMENT_SHADER:2,COMPILE_STATUS:3,LINK_STATUS:4,lost:false,compileOK:true,linkOK:true,
    isContextLost(){return this.lost},createProgram(){const p={};live.add(p);return p},isProgram(p){return live.has(p)},
    deleteProgram(p){live.delete(p)},createShader(){return {}},shaderSource(){},compileShader(){counts.compile++},
    getShaderParameter(){return this.compileOK},attachShader(){},linkProgram(){counts.link++},
    getProgramParameter(){return this.linkOK},deleteShader(){counts.deletedShaders++},invalidate(){live.clear()}};
}

test('repeated frames reuse a linked program, and restored contexts rebuild it',()=>{
  const gl=context(),first=atlasProgram(gl,'vertex','fragment');
  for(let frame=0;frame<600;frame++)assert.equal(atlasProgram(gl,'vertex','fragment'),first);
  assert.deepEqual(gl.counts,{compile:2,link:1,deletedShaders:2});
  gl.invalidate();gl.lost=true;
  assert.equal(atlasProgram(gl,'vertex','fragment'),null);
  gl.lost=false;
  assert.notEqual(atlasProgram(gl,'vertex','fragment'),first);
  assert.equal(gl.counts.link,2);
});

test('contexts and shader sources never share an incompatible program',()=>{
  const gl=context(),other=context(),first=atlasProgram(gl,'v','f');
  assert.notEqual(atlasProgram(other,'v','f'),first);
  const changed=atlasProgram(gl,'new vertex','f');
  assert.notEqual(changed,first);assert.equal(gl.isProgram(first),false);
});

test('compile and link failures clean up and can be retried',()=>{
  const gl=context();gl.compileOK=false;
  assert.equal(atlasProgram(gl,'v','f'),null);assert.equal(gl.counts.deletedShaders,1);
  gl.compileOK=true;gl.linkOK=false;
  assert.equal(atlasProgram(gl,'v','f'),null);assert.equal(gl.counts.deletedShaders,3);
  gl.linkOK=true;assert.ok(atlasProgram(gl,'v','f'));
});
