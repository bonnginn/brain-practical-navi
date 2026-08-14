#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";

const root = new URL("../", import.meta.url);
const volumeUrl = new URL("public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz", root);
const validationUrl = new URL("public/atlas/bigbrain-practical-segmentation-icbm500-validation.json", root);
const coordinateUrl = new URL("public/atlas/bigbrain-icbm500-validation.json", root);

const [compressed, validation, coordinateMetadata] = await Promise.all([
  readFile(volumeUrl),
  readFile(validationUrl, "utf8").then(JSON.parse),
  readFile(coordinateUrl, "utf8").then(JSON.parse),
]);
const payload = gunzipSync(compressed);
if (payload.subarray(0, 4).toString("ascii") !== "BBS1") throw new Error("unexpected segmentation volume magic");
const dims = [payload.readUInt16LE(4), payload.readUInt16LE(6), payload.readUInt16LE(8)];
if (dims.some((value, axis) => value !== coordinateMetadata.shape[axis])) throw new Error("coordinate metadata shape mismatch");
const voxelCount = dims[0] * dims[1] * dims[2];
if (payload.length !== voxelCount + 10) throw new Error("segmentation volume length does not match header");
const labels = payload.subarray(10);
const affine = coordinateMetadata.affine;

const manualNames = [
  "left red nucleus", "right red nucleus", "left substantia nigra", "right substantia nigra",
  "left subthalamic nucleus", "right subthalamic nucleus", "left caudate", "right caudate",
  "left putamen", "right putamen", "left globus pallidus external", "right globus pallidus external",
  "left globus pallidus internal", "right globus pallidus internal", "left thalamus", "right thalamus",
  "left hippocampus", "right hippocampus", "left accumbens", "right accumbens",
  "left amygdala", "right amygdala",
];
const names = Object.fromEntries(manualNames.map((name, index) => [index + 1, name]));
Object.assign(names, validation.labelNames);

const accumulators = Array.from({ length: 36 }, () => ({
  count: 0,
  sum: [0, 0, 0],
  low: [Infinity, Infinity, Infinity],
  high: [-Infinity, -Infinity, -Infinity],
  anteriorCount: 0,
  anteriorSum: [0, 0, 0],
}));

for (let index = 0; index < labels.length; index += 1) {
  const id = labels[index];
  if (id === 0 || id > 35) continue;
  const x = index % dims[0];
  const yz = (index - x) / dims[0];
  const y = yz % dims[1];
  const z = (yz - y) / dims[1];
  const voxel = [x, y, z, 1];
  const world = affine.slice(0, 3).map(row => row.reduce((sum, value, axis) => sum + value * voxel[axis], 0));
  const accumulator = accumulators[id];
  accumulator.count += 1;
  for (let axis = 0; axis < 3; axis += 1) {
    accumulator.sum[axis] += world[axis];
    accumulator.low[axis] = Math.min(accumulator.low[axis], world[axis]);
    accumulator.high[axis] = Math.max(accumulator.high[axis], world[axis]);
  }
  // The caudate head forms the lateral wall of the anterior horn, whereas
  // the ventricle continues far posteriorly and inferiorly. Compare their
  // shared anterior portion instead of the misleading whole-volume centres.
  if (world[1] > -10) {
    accumulator.anteriorCount += 1;
    for (let axis = 0; axis < 3; axis += 1) accumulator.anteriorSum[axis] += world[axis];
  }
}

const stats = Object.fromEntries(accumulators.slice(1).map((item, offset) => {
  const id = offset + 1;
  if (item.count !== validation.labelCounts[String(id)]) throw new Error(`label ${id} count mismatch`);
  return [id, {
    id,
    name: names[id],
    count: item.count,
    center: item.sum.map(value => value / item.count),
    anteriorCenter: item.anteriorSum.map(value => value / item.anteriorCount),
    low: item.low,
    high: item.high,
  }];
}));

const results = [];
function check(name, condition, evidence) {
  results.push({ name, pass: Boolean(condition), evidence });
}
function center(id, axis) { return stats[id].center[axis]; }
function absX(id) { return Math.abs(center(id, 0)); }
function anteriorAbsX(id) { return Math.abs(stats[id].anteriorCenter[0]); }
function round(values) { return values.map(value => Number(value.toFixed(2))); }

const bilateralPairs = [
  [1, 2], [3, 4], [5, 6], [7, 8], [9, 10], [11, 12], [13, 14], [15, 16],
  [17, 18], [19, 20], [21, 22], [23, 24], [28, 29], [31, 32], [34, 35],
];
check(
  "all paired structures retain left-negative and right-positive centroids",
  bilateralPairs.every(([left, right]) => center(left, 0) < 0 && center(right, 0) > 0),
  bilateralPairs.map(([left, right]) => [left, right, ...round([center(left, 0), center(right, 0)])]),
);
check(
  "paired structures remain coarsely symmetric in lateral position",
  bilateralPairs.every(([left, right]) => Math.abs(absX(left) - absX(right)) < 4),
  bilateralPairs.map(([left, right]) => [left, right, Number(Math.abs(absX(left) - absX(right)).toFixed(2))]),
);

check(
  "third ventricle remains on the midline between the thalami",
  Math.abs(center(25, 0)) < 2 && center(15, 0) < center(25, 0) && center(25, 0) < center(16, 0),
  round([center(15, 0), center(25, 0), center(16, 0)]),
);
check(
  "corpus callosum candidate remains midline and dorsal to the lateral ventricles",
  Math.abs(center(30, 0)) < 3 && center(30, 2) > Math.max(center(23, 2), center(24, 2)),
  round([center(30, 0), center(30, 2), center(23, 2), center(24, 2)]),
);
check(
  "fourth ventricle remains behind the brainstem and in front of the cerebellum",
  center(26, 1) < center(27, 1) && center(26, 1) > (center(28, 1) + center(29, 1)) / 2,
  round([center(27, 1), center(26, 1), (center(28, 1) + center(29, 1)) / 2]),
);

for (const side of [
  { name: "left", caudate: 7, putamen: 9, external: 11, internal: 13, thalamus: 15, hippocampus: 17, accumbens: 19, amygdala: 21, ventricle: 23, capsule: 31, insula: 34 },
  { name: "right", caudate: 8, putamen: 10, external: 12, internal: 14, thalamus: 16, hippocampus: 18, accumbens: 20, amygdala: 22, ventricle: 24, capsule: 32, insula: 35 },
]) {
  const medialNuclei = (absX(side.caudate) + absX(side.thalamus)) / 2;
  const lentiform = (absX(side.putamen) + absX(side.external) + absX(side.internal)) / 3;
  check(
    `${side.name} internal capsule stays between caudate/thalamus and lentiform nucleus`,
    medialNuclei < absX(side.capsule) && absX(side.capsule) < lentiform,
    round([medialNuclei, absX(side.capsule), lentiform]),
  );
  check(
    `${side.name} putamen stays lateral to both pallidal segments`,
    absX(side.putamen) > absX(side.external) && absX(side.putamen) > absX(side.internal),
    round([absX(side.putamen), absX(side.external), absX(side.internal)]),
  );
  check(
    `${side.name} insula stays lateral to the putamen`,
    absX(side.insula) > absX(side.putamen),
    round([absX(side.insula), absX(side.putamen)]),
  );
  check(
    `${side.name} amygdala stays anterior to the hippocampus`,
    center(side.amygdala, 1) > center(side.hippocampus, 1),
    round([center(side.amygdala, 1), center(side.hippocampus, 1)]),
  );
  check(
    `${side.name} caudate stays lateral to the anterior lateral ventricle`,
    anteriorAbsX(side.caudate) > anteriorAbsX(side.ventricle) && stats[side.caudate].low[1] < stats[side.ventricle].high[1] && stats[side.caudate].high[1] > stats[side.ventricle].low[1],
    round([anteriorAbsX(side.caudate), anteriorAbsX(side.ventricle), stats[side.caudate].low[1], stats[side.caudate].high[1], stats[side.ventricle].low[1], stats[side.ventricle].high[1]]),
  );
}

check(
  "subthalamic nuclei remain inferior to the thalami and superior to substantia nigra",
  center(5, 2) < center(15, 2) && center(5, 2) > center(3, 2) && center(6, 2) < center(16, 2) && center(6, 2) > center(4, 2),
  round([center(15, 2), center(5, 2), center(3, 2), center(16, 2), center(6, 2), center(4, 2)]),
);
check(
  "optic chiasm candidate remains midline, inferior to the third ventricle, and anterior to brainstem",
  Math.abs(center(33, 0)) < 4 && center(33, 2) < center(25, 2) && center(33, 1) > center(27, 1),
  round([center(33, 0), center(33, 2), center(25, 2), center(33, 1), center(27, 1)]),
);
check(
  "ventricular labels remain restricted to histological empty space",
  validation.ventricleLabelsRestrictedToEmptySpace === true && validation.ventricleTissueOverlap === 0,
  [validation.ventricleLabelsRestrictedToEmptySpace, validation.ventricleTissueOverlap],
);

const failures = results.filter(result => !result.pass);
if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ dims, relations: results.length, failures, results, stats }, null, 2));
} else {
  for (const result of results) console.log(`${result.pass ? "PASS" : "FAIL"}\t${result.name}\t${JSON.stringify(result.evidence)}`);
  console.log(`${failures.length ? "FAIL" : "PASS"}\t${results.length} deep-structure relations; ${failures.length} failures`);
}
if (failures.length) process.exitCode = 1;
