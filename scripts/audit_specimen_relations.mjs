#!/usr/bin/env node

import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const metadata = JSON.parse(await readFile(new URL("public/atlas/specimen-blocks.json", root), "utf8"));

async function meshMetrics(file) {
  const mesh = await readFile(new URL(`public/atlas/${file}`, root));
  if (mesh.subarray(0, 4).toString("ascii") !== "BNM2") throw new Error(`${file} is not a specimen mesh`);
  const vertices = mesh.readUInt32LE(4);
  const low = [Infinity, Infinity, Infinity];
  const high = [-Infinity, -Infinity, -Infinity];
  const sum = [0, 0, 0];
  let sumAbsX = 0;
  let left = 0;
  let right = 0;
  for (let index = 0; index < vertices; index += 1) {
    const offset = 12 + index * 12;
    // BNM2 stores display z/y/x; expose anatomical x-right, y-anterior, z-superior.
    const xyz = [mesh.readFloatLE(offset + 8), mesh.readFloatLE(offset + 4), mesh.readFloatLE(offset)];
    xyz.forEach((value, axis) => {
      low[axis] = Math.min(low[axis], value);
      high[axis] = Math.max(high[axis], value);
      sum[axis] += value;
    });
    sumAbsX += Math.abs(xyz[0]);
    if (xyz[0] < -0.5) left += 1;
    if (xyz[0] > 0.5) right += 1;
  }
  return { vertices, low, high, center: sum.map(value => value / vertices), meanAbsX: sumAbsX / vertices, left, right };
}

async function collect(specimen) {
  return Object.fromEntries(await Promise.all(metadata.specimens[specimen].map(async part => [part.part, await meshMetrics(part.file)])));
}

const [hindbrain, midbrain] = await Promise.all([collect("hindbrain"), collect("midbrain-section")]);
const checks = [];
function check(name, condition, evidence) {
  checks.push({ name, pass: Boolean(condition), evidence });
}
function bilateral(metrics) {
  return metrics.left > metrics.vertices * 0.25 && metrics.right > metrics.vertices * 0.25;
}

const superior = hindbrain["superior-cerebellar-peduncles"];
const middle = hindbrain["middle-cerebellar-peduncles"];
const inferior = hindbrain["inferior-cerebellar-peduncles"];
check("three cerebellar peduncles stay bilateral", [superior, middle, inferior].every(bilateral), [superior.left, superior.right, middle.left, middle.right, inferior.left, inferior.right]);
check("superior, middle, inferior peduncles keep superior-to-inferior display levels", superior.center[2] > middle.center[2] && middle.center[2] > inferior.center[2], [superior.center[2], middle.center[2], inferior.center[2]]);
check("middle peduncle remains the largest connection", middle.vertices > superior.vertices && middle.vertices > inferior.vertices, [superior.vertices, middle.vertices, inferior.vertices]);
check("middle peduncle reaches farther laterally than superior peduncle", middle.meanAbsX > superior.meanAbsX + 5, [middle.meanAbsX, superior.meanAbsX]);

const facial = hindbrain["facial-colliculi"];
const vestibular = hindbrain["vestibular-areas"];
const hypoglossal = hindbrain["hypoglossal-trigones"];
const vagal = hindbrain["vagal-trigones"];
const pyramids = hindbrain.pyramids;
const olives = hindbrain.olives;
check("fourth-ventricle floor guides stay dorsal to ventral medullary reliefs", Math.max(facial.center[1], vestibular.center[1], hypoglossal.center[1], vagal.center[1]) < Math.min(pyramids.center[1], olives.center[1]) - 20, [facial.center[1], vestibular.center[1], hypoglossal.center[1], vagal.center[1], pyramids.center[1], olives.center[1]]);
check("facial colliculi remain rostral to caudal medullary trigones", facial.center[2] > hypoglossal.center[2] + 7 && facial.center[2] > vagal.center[2] + 7, [facial.center[2], hypoglossal.center[2], vagal.center[2]]);
check("motor-to-sensory floor guides keep medial-to-lateral order", hypoglossal.meanAbsX < vagal.meanAbsX && vagal.meanAbsX < vestibular.meanAbsX, [hypoglossal.meanAbsX, vagal.meanAbsX, vestibular.meanAbsX]);
check("pyramids remain medial to olives", pyramids.meanAbsX + 3 < olives.meanAbsX, [pyramids.meanAbsX, olives.meanAbsX]);

const superiorColliculi = midbrain["superior-colliculi"];
const inferiorColliculi = midbrain["inferior-colliculi"];
const lateralGeniculate = midbrain["lateral-geniculate-bodies"];
const medialGeniculate = midbrain["medial-geniculate-bodies"];
const fossa = midbrain["interpeduncular-fossa"];
const peduncles = midbrain["cerebral-peduncles"];
const aqueduct = midbrain.aqueduct;
check("superior colliculi remain rostral-superior to inferior colliculi", superiorColliculi.center[1] > inferiorColliculi.center[1] + 3 && superiorColliculi.center[2] > inferiorColliculi.center[2] + 3, [superiorColliculi.center, inferiorColliculi.center]);
check("geniculate bodies keep lateral-to-medial order", lateralGeniculate.meanAbsX > medialGeniculate.meanAbsX + 4, [lateralGeniculate.meanAbsX, medialGeniculate.meanAbsX]);
check("interpeduncular fossa stays midline between ventral peduncles", fossa.meanAbsX < 3 && fossa.center[1] < peduncles.center[1] && fossa.low[0] < 0 && fossa.high[0] > 0, [fossa.meanAbsX, fossa.center[1], peduncles.center[1], fossa.low[0], fossa.high[0]]);
check("aqueduct stays midline and dorsal to cerebral peduncles", aqueduct.meanAbsX < 2.5 && aqueduct.center[1] < peduncles.center[1] - 10, [aqueduct.meanAbsX, aqueduct.center[1], peduncles.center[1]]);

const failures = checks.filter(item => !item.pass);
const result = { checks, failures: failures.map(item => item.name), specimens: { hindbrain, midbrain } };
if (process.argv.includes("--json")) console.log(JSON.stringify(result, null, 2));
else {
  for (const item of checks) console.log(`${item.pass ? "PASS" : "FAIL"}\t${item.name}\t${JSON.stringify(item.evidence)}`);
  console.log(`${failures.length ? "FAIL" : "PASS"}\t${checks.length} landmark relations; ${failures.length} failures`);
}
if (failures.length) process.exitCode = 1;
