#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";

const root = new URL("../", import.meta.url);
const volumeUrl = new URL("public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz", root);
const validationUrl = new URL("public/atlas/bigbrain-practical-segmentation-icbm500-validation.json", root);

const manualNames = [
  "left red nucleus", "right red nucleus", "left substantia nigra", "right substantia nigra",
  "left subthalamic nucleus", "right subthalamic nucleus", "left caudate", "right caudate",
  "left putamen", "right putamen", "left globus pallidus external", "right globus pallidus external",
  "left globus pallidus internal", "right globus pallidus internal", "left thalamus", "right thalamus",
  "left hippocampus", "right hippocampus", "left accumbens", "right accumbens",
  "left amygdala", "right amygdala",
];

function sourceType(id) {
  if (id <= 22) return "manual";
  if (id >= 30 && id <= 32) return "image-guided";
  return "atlas-derived";
}

function spanMetrics(counts) {
  const occupied = [];
  for (let index = 0; index < counts.length; index += 1) if (counts[index] > 0) occupied.push(index);
  const first = occupied[0];
  const last = occupied.at(-1);
  return {
    first,
    last,
    occupied: occupied.length,
    gaps: last - first + 1 - occupied.length,
  };
}

const compressed = await readFile(volumeUrl);
const payload = gunzipSync(compressed);
if (payload.subarray(0, 4).toString("ascii") !== "BBS1") throw new Error("unexpected segmentation volume magic");
const dims = [payload.readUInt16LE(4), payload.readUInt16LE(6), payload.readUInt16LE(8)];
const voxelCount = dims[0] * dims[1] * dims[2];
if (payload.length !== voxelCount + 10) throw new Error("segmentation volume length does not match header");
const labels = payload.subarray(10);
const validation = JSON.parse(await readFile(validationUrl, "utf8"));
const names = Object.fromEntries(manualNames.map((name, index) => [index + 1, name]));
Object.assign(names, validation.labelNames);

const voxelsById = Array.from({ length: 36 }, () => []);
const sliceCounts = Array.from({ length: 36 }, () => ({
  sagittal: new Uint32Array(dims[0]),
  coronal: new Uint32Array(dims[1]),
  horizontal: new Uint32Array(dims[2]),
}));

for (let index = 0; index < labels.length; index += 1) {
  const id = labels[index];
  if (id === 0 || id > 35) continue;
  const x = index % dims[0];
  const yz = (index - x) / dims[0];
  const y = yz % dims[1];
  const z = (yz - y) / dims[1];
  voxelsById[id].push(index);
  sliceCounts[id].sagittal[x] += 1;
  sliceCounts[id].coronal[y] += 1;
  sliceCounts[id].horizontal[z] += 1;
}

const visited = new Uint8Array(labels.length);
const planeStride = dims[0] * dims[1];
const rows = [];
const minimumLargestRatio = { manual: 0.9995, "atlas-derived": 0.95, "image-guided": 0.98 };

for (let id = 1; id <= 35; id += 1) {
  const indices = voxelsById[id];
  const expected = validation.labelCounts[String(id)];
  if (indices.length !== expected) throw new Error(`label ${id} count ${indices.length} != validation ${expected}`);
  const queue = new Uint32Array(indices.length);
  const components = [];
  for (const seed of indices) {
    if (visited[seed]) continue;
    let head = 0;
    let tail = 1;
    let componentSize = 0;
    const bounds = { x: [dims[0], -1], y: [dims[1], -1], z: [dims[2], -1] };
    queue[0] = seed;
    visited[seed] = 1;
    while (head < tail) {
      const current = queue[head++];
      componentSize += 1;
      const x = current % dims[0];
      const yz = (current - x) / dims[0];
      const y = yz % dims[1];
      const z = (yz - y) / dims[1];
      bounds.x[0] = Math.min(bounds.x[0], x); bounds.x[1] = Math.max(bounds.x[1], x);
      bounds.y[0] = Math.min(bounds.y[0], y); bounds.y[1] = Math.max(bounds.y[1], y);
      bounds.z[0] = Math.min(bounds.z[0], z); bounds.z[1] = Math.max(bounds.z[1], z);
      const neighbours = [];
      if (x > 0) neighbours.push(current - 1);
      if (x + 1 < dims[0]) neighbours.push(current + 1);
      if (y > 0) neighbours.push(current - dims[0]);
      if (y + 1 < dims[1]) neighbours.push(current + dims[0]);
      if (current >= planeStride) neighbours.push(current - planeStride);
      if (current + planeStride < labels.length) neighbours.push(current + planeStride);
      for (const neighbour of neighbours) {
        if (!visited[neighbour] && labels[neighbour] === id) {
          visited[neighbour] = 1;
          queue[tail++] = neighbour;
        }
      }
    }
    components.push({ size: componentSize, bounds });
  }
  components.sort((left, right) => right.size - left.size);
  const spans = Object.fromEntries(Object.entries(sliceCounts[id]).map(([plane, counts]) => [plane, spanMetrics(counts)]));
  const secondaryVoxels = indices.length - components[0].size;
  const largestRatio = components[0].size / indices.length;
  rows.push({
    id,
    name: names[id],
    source: sourceType(id),
    voxels: indices.length,
    components: components.length,
    largestComponent: components[0].size,
    largestRatio,
    secondaryVoxels,
    secondaryComponents: components.slice(1, 6),
    smallComponents: components.slice(1).filter(component => component.size <= 8).length,
    spans,
  });
}

const failures = rows.filter(row => row.largestRatio < minimumLargestRatio[row.source]);
const warnings = rows.filter(row => row.components > 1 || Object.values(row.spans).some(span => span.gaps > 0));

if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ dims, thresholds: minimumLargestRatio, failures, warnings: warnings.map(row => row.id), rows }, null, 2));
} else {
  for (const row of rows) {
    const gaps = Object.entries(row.spans).map(([plane, span]) => `${plane}:${span.gaps}`).join(" ");
    const secondary = row.secondaryComponents.map(component => `${component.size}@x${component.bounds.x.join("-")}/y${component.bounds.y.join("-")}/z${component.bounds.z.join("-")}`).join(",") || "none";
    const state = row.components > 1 || Object.values(row.spans).some(span => span.gaps > 0) ? "WARN" : "PASS";
    console.log(`${state}\t${row.id}\t${row.source}\t${row.name}\tvoxels=${row.voxels}\tcomponents=${row.components}\tlargest=${(row.largestRatio * 100).toFixed(3)}%\tsecondary=${secondary}\tgaps ${gaps}`);
  }
  console.log(`${failures.length ? "FAIL" : "PASS"}\t${rows.length} labels; ${warnings.length} require visual review; ${failures.length} below source-specific largest-component thresholds`);
}

if (failures.length) process.exitCode = 1;
