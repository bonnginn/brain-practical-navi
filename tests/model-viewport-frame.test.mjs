import test from 'node:test';
import assert from 'node:assert/strict';
import {modelViewportFrame} from '../src/modelViewportFrame.mjs';

test('equal anatomical distances retain equal screen lengths across viewport shapes',()=>{
  for(const [width,height] of [[400,400],[700,220],[240,600],[970,545]]){
    const {aspect,scale}=modelViewportFrame(width,height);
    const horizontal=20/96*scale/aspect*width/2;
    const vertical=20/96*scale*height/2;
    assert.ok(Math.abs(horizontal-vertical)<1e-10);
    assert.ok(Math.abs(horizontal-20/192*Math.min(width,height))<1e-10);
  }
});
