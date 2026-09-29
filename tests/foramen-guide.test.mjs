import assert from "node:assert/strict";
import fs from "node:fs";
import { gunzipSync } from "node:zlib";
import test from "node:test";
import { coronalGuidePixels, coronalGuidePoint, FORAMEN_GUIDE, FORAMEN_COLORS } from "../app/foramenGuideData.ts";

test("raw and colored crops sample the same coronal voxels with superior up",()=>{
  const dims=[5,4,6], values=Uint8Array.from({length:120},(_,i)=>i),labels=new Uint8Array(120);
  const crop={x:1,z:2,width:3,height:3},y=2;
  const index=(x,z)=>x+5*(y+4*z);
  values[index(2,3)]=255;labels[index(2,3)]=25;labels[index(1,4)]=24;
  const data={dims,values,labels},raw=coronalGuidePixels(data,y,crop,false),color=coronalGuidePixels(data,y,crop,true);
  for(let z=2;z<=4;z++)for(let x=1;x<=3;x++){
    const point=coronalGuidePoint(x,z,crop),pixel=(Math.floor(point.y)*3+Math.floor(point.x))*4;
    const v=values[index(x,z)],label=labels[index(x,z)];
    assert.deepEqual([...raw.slice(pixel,pixel+4)],[v,v,v,255]);
    assert.deepEqual([...color.slice(pixel,pixel+4)],[...(label===25?FORAMEN_COLORS.third:label===24?FORAMEN_COLORS.lateral:[v,v,v]),255]);
  }
  assert.throws(()=>coronalGuidePixels(data,4,crop,false));
  assert.throws(()=>coronalGuidePixels(data,2,{...crop,x:4},false));
});

test("guide anchor comes from the reviewed right-foramen patch and all three slices retain both cavity labels",()=>{
  // The guide follows the learner's coronal slider from anterior to posterior.
  assert.ok(FORAMEN_GUIDE.slices.every((slice,index)=>index===0||FORAMEN_GUIDE.slices[index-1]>slice));
  const compressed=fs.readFileSync(new URL("../public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz",import.meta.url));
  const patch=JSON.parse(fs.readFileSync(new URL("../segmentation-patches/review/right-foramen36-adoption-2026-09-16.json",import.meta.url)));
  assert.ok(patch.points.some(point=>point.every((value,i)=>value===FORAMEN_GUIDE.center[i])));
  const raw=gunzipSync(compressed),dims=[4,6,8].map(offset=>raw.readUInt16LE(offset)),labels=raw.subarray(10);
  // Recheck this region if its reviewed cavity changes; unrelated label edits are allowed.
  for(const [x,y,z] of patch.points)assert.equal(labels[x+dims[0]*(y+dims[1]*z)],25);
  const data={dims,labels,values:new Uint8Array(labels.length)};
  const [x,y,z]=FORAMEN_GUIDE.center;assert.equal(labels[x+dims[0]*(y+dims[1]*z)],25);
  for(const slice of FORAMEN_GUIDE.slices){
    const pixels=coronalGuidePixels(data,slice,FORAMEN_GUIDE.crop,true);
    for(const color of [FORAMEN_COLORS.lateral,FORAMEN_COLORS.third]){
      let count=0;for(let i=0;i<pixels.length;i+=4)if(color.every((value,j)=>pixels[i+j]===value))count++;
      assert.ok(count>0,`Y ${slice} contains ${color}`);
    }
  }
});
