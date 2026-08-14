#!/usr/bin/env node

import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const landmarkMetadata = JSON.parse(await readFile(new URL("public/atlas/surface-landmarks.json", root), "utf8"));
const regionMetadata = JSON.parse(await readFile(new URL("public/atlas/surface-region-labels.json", root), "utf8"));

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

async function readPial(file) {
  const mesh = await readFile(new URL(`public/atlas/${file}`, root));
  if (mesh.subarray(0, 4).toString("ascii") !== "BNM3") throw new Error(`${file} is not a regional pial mesh`);
  const vertices = mesh.readUInt32LE(4), faces = mesh.readUInt32LE(8);
  const regionOffset = 12 + vertices * 28, faceOffset = 12 + vertices * 32;
  const ids = Array.from({ length: vertices }, (_, index) => Math.round(mesh.readFloatLE(regionOffset + index * 4)));
  const pointsById = new Map();
  for (let index = 0; index < vertices; index += 1) {
    const points = pointsById.get(ids[index]) ?? [];
    points.push(pointAt(mesh, index));
    pointsById.set(ids[index], points);
  }
  const edgeCounts = new Map(), seen = new Set();
  for (let face = 0; face < faces; face += 1) {
    const offset = faceOffset + face * 12;
    const triangle = [mesh.readUInt32LE(offset), mesh.readUInt32LE(offset + 4), mesh.readUInt32LE(offset + 8)];
    for (const [from, to] of [[triangle[0], triangle[1]], [triangle[1], triangle[2]], [triangle[2], triangle[0]]]) {
      const low = Math.min(from, to), high = Math.max(from, to), edge = `${low}:${high}`;
      if (seen.has(edge)) continue;
      seen.add(edge);
      const a = ids[from], b = ids[to];
      if (a === b) continue;
      const key = a < b ? `${a}:${b}` : `${b}:${a}`;
      edgeCounts.set(key, (edgeCounts.get(key) ?? 0) + 1);
    }
  }
  return { metrics: new Map([...pointsById].map(([id, points]) => [id, summarize(points)])), edgeCounts };
}

async function readLandmark(file) {
  const mesh = await readFile(new URL(`public/atlas/${file}`, root));
  if (mesh.subarray(0, 4).toString("ascii") !== "BNM1") throw new Error(`${file} is not a surface landmark mesh`);
  const vertices = mesh.readUInt32LE(4);
  return summarize(Array.from({ length: vertices }, (_, index) => pointAt(mesh, index)));
}

function boundaryEdges(pial, firstIds, secondIds) {
  let total = 0;
  for (const first of firstIds) for (const second of secondIds) {
    const key = first < second ? `${first}:${second}` : `${second}:${first}`;
    total += pial.edgeCounts.get(key) ?? 0;
  }
  return total;
}

function weightedCenter(pial, ids, axis) {
  let total = 0, count = 0;
  for (const id of ids) {
    const metrics = pial.metrics.get(id);
    if (!metrics) continue;
    total += metrics.center[axis] * metrics.vertices;
    count += metrics.vertices;
  }
  return total / count;
}

function weightedMeanAbsX(pial, ids) {
  let total = 0, count = 0;
  for (const id of ids) {
    const metrics = pial.metrics.get(id);
    if (!metrics) continue;
    total += metrics.meanAbsX * metrics.vertices;
    count += metrics.vertices;
  }
  return total / count;
}

const [left, right] = await Promise.all([readPial("pial-left.mesh"), readPial("pial-right.mesh")]);
const landmarks = Object.fromEntries(await Promise.all(landmarkMetadata.landmarks.map(async item => [item.key, await readLandmark(item.file)])));
const hemispheres = [
  { name: "left", pial: left, precentral: 86, postcentral: 64, frontal: [89, 93, 52, 83, 73], superiorFrontal: 89, middleFrontal: [93, 52], superiorTemporal: 96, opercular: [83, 73, 102], precuneus: 82, cuneus: 94, pericalcarine: 57, lingual: 63, medialOrbitofrontal: 66, lateralOrbitofrontal: 58 },
  { name: "right", pial: right, precentral: 35, postcentral: 13, frontal: [38, 42, 1, 32, 22], superiorFrontal: 38, middleFrontal: [42, 1], superiorTemporal: 45, opercular: [32, 22, 51], precuneus: 31, cuneus: 43, pericalcarine: 6, lingual: 12, medialOrbitofrontal: 15, lateralOrbitofrontal: 7 },
];

const checks = [];
function check(name, condition, evidence) { checks.push({ name, pass: Boolean(condition), evidence }); }

const expectedKeys = ["central-sulcus", "precentral-sulcus", "lateral-sulcus", "superior-frontal-sulcus", "parieto-occipital-sulcus", "calcarine-sulcus", "olfactory-sulcus", "longitudinal-fissure"];
check("all eight disclosed sulcal guides remain packaged and schematic", JSON.stringify(landmarkMetadata.landmarks.map(item => item.key)) === JSON.stringify(expectedKeys) && landmarkMetadata.landmarks.every(item => item.sourceType === "schematic-surface-guide"), landmarkMetadata.landmarks.map(item => [item.key, item.sourceType]));

for (const hemi of hemispheres) {
  const p = hemi.pial;
  const centralEdges = boundaryEdges(p, [hemi.precentral], [hemi.postcentral]);
  check(`${hemi.name} central sulcus stays between precentral and postcentral regions`, centralEdges > 40 && p.metrics.get(hemi.precentral).center[1] > p.metrics.get(hemi.postcentral).center[1], [centralEdges, p.metrics.get(hemi.precentral).center[1], p.metrics.get(hemi.postcentral).center[1]]);

  const precentralEdges = boundaryEdges(p, [hemi.precentral], hemi.frontal);
  check(`${hemi.name} precentral sulcus stays on the anterior border of precentral gyrus`, precentralEdges > 25 && weightedCenter(p, hemi.frontal, 1) > p.metrics.get(hemi.precentral).center[1], [precentralEdges, weightedCenter(p, hemi.frontal, 1), p.metrics.get(hemi.precentral).center[1]]);

  const superiorFrontalEdges = boundaryEdges(p, [hemi.superiorFrontal], hemi.middleFrontal);
  check(`${hemi.name} superior frontal sulcus separates medial superior from lateral middle frontal regions`, superiorFrontalEdges > 20 && p.metrics.get(hemi.superiorFrontal).meanAbsX < weightedMeanAbsX(p, hemi.middleFrontal), [superiorFrontalEdges, p.metrics.get(hemi.superiorFrontal).meanAbsX, weightedMeanAbsX(p, hemi.middleFrontal)]);

  const lateral = p.metrics.get(hemi.superiorTemporal);
  check(`${hemi.name} lateral sulcus guide follows the superior temporal rim below the opercula`, lateral.high[1] > 30 && lateral.meanAbsX > 45 && lateral.center[2] < weightedCenter(p, hemi.opercular, 2), [lateral.high[1], lateral.meanAbsX, lateral.center[2], weightedCenter(p, hemi.opercular, 2)]);

  const parietoOccipitalEdges = boundaryEdges(p, [hemi.precuneus], [hemi.cuneus]);
  check(`${hemi.name} parieto-occipital sulcus stays between precuneus and cuneus`, parietoOccipitalEdges > 10 && p.metrics.get(hemi.precuneus).center[1] > p.metrics.get(hemi.cuneus).center[1], [parietoOccipitalEdges, p.metrics.get(hemi.precuneus).center[1], p.metrics.get(hemi.cuneus).center[1]]);

  const pericalcarine = p.metrics.get(hemi.pericalcarine), cuneus = p.metrics.get(hemi.cuneus), lingual = p.metrics.get(hemi.lingual);
  check(`${hemi.name} calcarine guide remains between cuneus and lingual gyrus`, cuneus.center[2] > pericalcarine.center[2] && pericalcarine.center[2] > lingual.center[2], [cuneus.center[2], pericalcarine.center[2], lingual.center[2]]);

  const olfactoryEdges = boundaryEdges(p, [hemi.medialOrbitofrontal], [hemi.lateralOrbitofrontal]);
  check(`${hemi.name} olfactory sulcus stays between medial and lateral orbitofrontal regions`, olfactoryEdges > 10 && p.metrics.get(hemi.medialOrbitofrontal).meanAbsX < p.metrics.get(hemi.lateralOrbitofrontal).meanAbsX, [olfactoryEdges, p.metrics.get(hemi.medialOrbitofrontal).meanAbsX, p.metrics.get(hemi.lateralOrbitofrontal).meanAbsX]);
}

const fissure = landmarks["longitudinal-fissure"];
check("longitudinal fissure remains a midline anterior-posterior guide", fissure.meanAbsX < 4 && fissure.high[1] - fissure.low[1] > 100, [fissure.meanAbsX, fissure.low, fissure.high]);
check("CerebrA surface projection keeps matched bilateral coverage", Math.abs(regionMetadata.hemispheres.left.coverage - regionMetadata.hemispheres.right.coverage) < 1e-9 && regionMetadata.hemispheres.left.coverage > .93, [regionMetadata.hemispheres.left.coverage, regionMetadata.hemispheres.right.coverage]);

const failures = checks.filter(item => !item.pass);
const result = { checks, failures: failures.map(item => item.name), landmarks };
if (process.argv.includes("--json")) console.log(JSON.stringify(result, null, 2));
else {
  for (const item of checks) console.log(`${item.pass ? "PASS" : "FAIL"}\t${item.name}\t${JSON.stringify(item.evidence)}`);
  console.log(`${failures.length ? "FAIL" : "PASS"}\t${checks.length} surface relations; ${failures.length} failures`);
}
if (failures.length) process.exitCode = 1;
