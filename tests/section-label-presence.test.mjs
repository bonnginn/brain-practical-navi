import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import test from "node:test";
import {nearestLabeledSection,representativeLabeledSection,planePositionForSlice,planeSliceIndex} from "../app/segmentationGeometry.ts";
import {sectionStudyThemes} from "../src/sectionStudyThemes.ts";

const root=new URL("../",import.meta.url);
const index=JSON.parse(readFileSync(new URL("app/sectionLabelPresence.json",root),"utf8"));

test("section navigation index matches the exact current label volume",()=>{
  const compressed=readFileSync(new URL("public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz",root));
  assert.equal(index.revision,createHash("sha256").update(compressed).digest("hex"));
  assert.deepEqual(index.dims,[394,466,378]);
});

test("a selected partial aqueduct offers an occupied section only when absent",()=>{
  const current=planeSliceIndex(52,"coronal",index.dims);
  const target=nearestLabeledSection(index.labels,[41],"coronal",current);
  assert.equal(current,242);
  assert.equal(target,201);
  assert.equal(nearestLabeledSection(index.labels,[41],"coronal",target),null);
});

test("paired labels count either hemisphere as present",()=>{
  assert.equal(nearestLabeledSection(index.labels,[37,38],"sagittal",154),null);
  assert.equal(nearestLabeledSection(index.labels,[37,38],"sagittal",239),null);
  assert.equal(nearestLabeledSection(index.labels,[37,38],"sagittal",197),239);
});

test("identification starts within a component instead of between paired hemispheres",()=>{
  const peak=representativeLabeledSection(index.labels,[37,38],"sagittal");
  assert.notEqual(peak,197);
  assert.equal(nearestLabeledSection(index.labels,[37,38],"sagittal",peak),null);
  assert.equal(representativeLabeledSection(index.labels,[999],"sagittal"),null);
});

test("indexed starting views remain occupied through all three plane coordinate conversions",()=>{
  for(const id of Object.keys(index.labels))for(const plane of ["coronal","horizontal","sagittal"]){
    const peak=representativeLabeledSection(index.labels,[Number(id)],plane);
    assert.notEqual(peak,null,`${id}: ${plane}`);
    const position=planePositionForSlice(peak,plane,index.dims);
    assert.equal(planeSliceIndex(position,plane,index.dims),peak);
    assert.equal(nearestLabeledSection(index.labels,[Number(id)],plane,peak),null);
  }
});

test("the internal-capsule lesson starts where all five compared structures are visible",()=>{
  const theme=sectionStudyThemes.find(item=>item.key==="deep-nuclei");
  const slice=planeSliceIndex(theme.position,theme.plane,index.dims);
  assert.equal(slice,260);
  for(const [name,ids] of Object.entries({caudate:[7,8],putamen:[9,10],pallidum:[11,12,13,14],thalamus:[15,16],internalCapsule:[31,32]})){
    assert.ok(theme.members.includes(name),`${name} is part of this comparison`);
    assert.equal(nearestLabeledSection(index.labels,ids,theme.plane,slice),null,`${name} is visible at the starting slice`);
  }
});
