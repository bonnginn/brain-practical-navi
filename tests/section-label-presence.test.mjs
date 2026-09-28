import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import test from "node:test";
import {nearestLabeledSection,planeSliceIndex} from "../app/segmentationGeometry.ts";

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
