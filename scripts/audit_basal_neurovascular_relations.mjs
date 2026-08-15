#!/usr/bin/env node

import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);

function summarize(points) {
  const low = [Infinity, Infinity, Infinity];
  const high = [-Infinity, -Infinity, -Infinity];
  const sum = [0, 0, 0];
  let sumAbsX = 0;
  for (const point of points) {
    point.forEach((value, axis) => {
      low[axis] = Math.min(low[axis], value);
      high[axis] = Math.max(high[axis], value);
      sum[axis] += value;
    });
    sumAbsX += Math.abs(point[0]);
  }
  return { vertices: points.length, low, high, center: sum.map(value => value / points.length), meanAbsX: sumAbsX / points.length };
}

function pointAt(mesh, index) {
  const offset = 12 + index * 12;
  // BNM meshes store display z/y/x; expose anatomical x-right, y-anterior, z-superior.
  return [mesh.readFloatLE(offset + 8), mesh.readFloatLE(offset + 4), mesh.readFloatLE(offset)];
}

async function readLandmark(file) {
  const mesh = await readFile(new URL(`public/atlas/${file}`, root));
  if (mesh.subarray(0, 4).toString("ascii") !== "BNM1") throw new Error(`${file} is not a landmark mesh`);
  const count = mesh.readUInt32LE(4);
  return summarize(Array.from({ length: count }, (_, index) => pointAt(mesh, index)));
}

async function readRegionalMesh(file) {
  const mesh = await readFile(new URL(`public/atlas/${file}`, root));
  if (mesh.subarray(0, 4).toString("ascii") !== "BNM3") throw new Error(`${file} is not a regional mesh`);
  const count = mesh.readUInt32LE(4);
  const regionOffset = 12 + count * 28;
  const pointsById = new Map();
  const roots = new Map();
  for (let index = 0; index < count; index += 1) {
    const id = Math.round(mesh.readFloatLE(regionOffset + index * 4));
    const points = pointsById.get(id) ?? [];
    points.push(pointAt(mesh, index));
    pointsById.set(id, points);
    if (!roots.has(id)) roots.set(id, summarize(Array.from({ length: Math.min(10, count - index) }, (_, side) => pointAt(mesh, index + side))).center);
  }
  return { metrics: new Map([...pointsById].map(([id, points]) => [id, summarize(points)])), roots };
}

const basalFiles = {
  olfactory: "landmark-olfactory-pathway.mesh",
  optic: "landmark-optic-pathway.mesh",
  infundibulum: "landmark-infundibulum.mesh",
  mammillary: "landmark-mammillary-bodies.mesh",
  perforated: "landmark-anterior-perforated-substance.mesh",
};
const basal = Object.fromEntries(await Promise.all(Object.entries(basalFiles).map(async ([key, file]) => [key, await readLandmark(file)])));
const groups = await Promise.all([
  "overlay-arteries-anterior.mesh", "overlay-arteries-posterior.mesh",
  "overlay-nerves-anterior.mesh", "overlay-nerves-pontine.mesh", "overlay-nerves-medullary.mesh",
].map(readRegionalMesh));
const region = id => groups.map(group => group.metrics.get(id)).find(Boolean);
const rootPoint = id => groups.map(group => group.roots.get(id)).find(Boolean);
const absX = id => Math.abs(rootPoint(id)[0]);
const mean = (ids, axis) => ids.reduce((total, id) => total + rootPoint(id)[axis], 0) / ids.length;

const checks = [];
function check(name, condition, evidence) { checks.push({ name, pass: Boolean(condition), evidence }); }
function paired(leftId, rightId) {
  const left = rootPoint(leftId), right = rootPoint(rightId);
  return left[0] < 0 && right[0] > 0 && Math.abs(Math.abs(left[0]) - Math.abs(right[0])) < 4;
}

check("ventral forebrain landmarks keep anterior-to-posterior teaching order",
  basal.olfactory.center[1] > basal.perforated.center[1]
    && basal.perforated.center[1] > basal.optic.center[1]
    && basal.optic.center[1] > basal.infundibulum.center[1]
    && basal.infundibulum.center[1] > basal.mammillary.center[1],
  [basal.olfactory.center[1], basal.perforated.center[1], basal.optic.center[1], basal.infundibulum.center[1], basal.mammillary.center[1]]);
check("infundibulum remains midline between optic pathway and mammillary bodies",
  basal.infundibulum.meanAbsX < 3 && basal.optic.center[1] > basal.infundibulum.center[1] && basal.infundibulum.center[1] > basal.mammillary.center[1],
  [basal.infundibulum.meanAbsX, basal.optic.center[1], basal.infundibulum.center[1], basal.mammillary.center[1]]);
check("paired mammillary bodies remain lateral to the infundibulum",
  basal.mammillary.meanAbsX > basal.infundibulum.meanAbsX + 2 && basal.mammillary.low[0] < 0 && basal.mammillary.high[0] > 0,
  [basal.mammillary.meanAbsX, basal.infundibulum.meanAbsX, basal.mammillary.low[0], basal.mammillary.high[0]]);
check("anterior perforated substance remains bilateral beside the olfactory-optic interval",
  basal.perforated.meanAbsX > 10 && basal.perforated.low[0] < -5 && basal.perforated.high[0] > 5,
  [basal.perforated.meanAbsX, basal.perforated.low[0], basal.perforated.high[0]]);

check("cranial nerves I-II remain anterior to the midbrain nerve roots",
  Math.min(mean([21, 22], 1), mean([23, 24, 25], 1)) > mean([26, 27, 28, 29], 1) + 20,
  [mean([21, 22], 1), mean([23, 24, 25], 1), mean([26, 27, 28, 29], 1)]);
check("midbrain, pontine, and medullary nerve groups keep rostrocaudal levels",
  mean([26, 27, 28, 29], 2) > mean([30, 31, 32, 33, 34, 35, 36, 37], 2)
    && mean([30, 31, 32, 33, 34, 35, 36, 37], 2) > mean([38, 39, 40, 41, 42, 43, 44, 45], 2),
  [mean([26, 27, 28, 29], 2), mean([30, 31, 32, 33, 34, 35, 36, 37], 2), mean([38, 39, 40, 41, 42, 43, 44, 45], 2)]);
check("VI-VIII roots keep medial-to-lateral order", absX(33) < absX(35) && absX(35) < absX(37), [absX(33), absX(35), absX(37)]);
check("IX-XI roots keep superior-to-inferior order", rootPoint(39)[2] > rootPoint(41)[2] && rootPoint(41)[2] > rootPoint(43)[2], [rootPoint(39)[2], rootPoint(41)[2], rootPoint(43)[2]]);
check("XII remains medial to post-olivary IX-XI roots", absX(45) < Math.min(absX(39), absX(41), absX(43)), [absX(45), absX(39), absX(41), absX(43)]);
check("all paired cranial-nerve roots preserve left-right placement",
  [[21,22],[23,24],[26,27],[28,29],[30,31],[32,33],[34,35],[36,37],[38,39],[40,41],[42,43],[44,45]].every(([left,right]) => paired(left,right)),
  [[21,22],[23,24],[26,27],[28,29],[30,31],[32,33],[34,35],[36,37],[38,39],[40,41],[42,43],[44,45]].map(([left,right]) => [rootPoint(left)[0], rootPoint(right)[0]]));

check("anterior communicating artery stays on the midline", region(5).meanAbsX < 3, [region(5).meanAbsX, region(5).center]);
check("anterior cerebral arteries remain medial to middle cerebral arteries",
  (region(3).meanAbsX + region(4).meanAbsX) / 2 < (region(6).meanAbsX + region(7).meanAbsX) / 2,
  [region(3).meanAbsX, region(4).meanAbsX, region(6).meanAbsX, region(7).meanAbsX]);
check("paired vertebral arteries converge into a midline basilar artery",
  paired(10,11) && region(12).meanAbsX < 2.5 && rootPoint(12)[2] > mean([10,11], 2),
  [rootPoint(10), rootPoint(11), region(12).meanAbsX, rootPoint(12)]);
check("cerebellar arteries keep superior, anterior-inferior, posterior-inferior levels",
  mean([15,16], 2) > mean([17,18], 2) && mean([17,18], 2) > mean([19,20], 2),
  [mean([15,16], 2), mean([17,18], 2), mean([19,20], 2)]);

const failures = checks.filter(item => !item.pass);
const result = { checks, failures: failures.map(item => item.name), basal, roots: Object.fromEntries(Array.from({ length: 45 }, (_, index) => index + 1).filter(id => rootPoint(id)).map(id => [id, rootPoint(id)])) };
if (process.argv.includes("--json")) console.log(JSON.stringify(result, null, 2));
else {
  for (const item of checks) console.log(`${item.pass ? "PASS" : "FAIL"}\t${item.name}\t${JSON.stringify(item.evidence)}`);
  console.log(`${failures.length ? "FAIL" : "PASS"}\t${checks.length} basal/neurovascular relations; ${failures.length} failures`);
}
if (failures.length) process.exitCode = 1;
