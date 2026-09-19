import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { withRegionalBatches } from './helpers/residual-mesh-successor.mjs';

const read = (path) => readFile(new URL('../' + path, import.meta.url));
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const points = [
  [175, 297, 181], [177, 301, 177], [179, 299, 177], [183, 299, 175],
  [184, 299, 175], [185, 301, 173], [208, 299, 175], [212, 299, 177],
];
const offsets = (x, y, z) => 10 + x + 394 * (y + 466 * z);
const neighbors = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];

test('lateral roof8 replays exact forward and reverse mixed cavity transition', async () => {
  const [recordBytes, beforeCompressed, afterCompressed] = await Promise.all([
    read('segmentation-patches/review/lateral-roof8-adoption-2026-09-15.json'),
    read('tests/fixtures/bigbrain-practical-segmentation-pre-lateral-roof8.bin.gz'),
    read('tests/fixtures/bigbrain-practical-segmentation-pre-upper-fourth-gap.bin.gz'),
  ]);
  const record = JSON.parse(recordBytes);
  assert.equal(sha(recordBytes), 'cbed33ec8a4d851aeda15bec1b7682f44b754ea139f5bc117d965817bd73e8a1');
  assert.equal(sha(beforeCompressed), '785ce199e2c7226e5527a771e953d1b78cfed1067179aa04c63b9eba74577e0f');
  assert.equal(sha(afterCompressed), record.afterSha256);
  assert.equal(record.transition, 'mixed-ventricular-repair');
  assert.equal(record.count, 8);
  assert.deepEqual(record.points.map((p) => p.xyz), points);
  const before = gunzipSync(beforeCompressed);
  const after = gunzipSync(afterCompressed);
  const replay = Buffer.from(before);
  const seen = new Set();
  for (const point of record.points) {
    const [x, y, z] = point.xyz;
    const i = offsets(x, y, z);
    assert.ok(!seen.has(i));
    seen.add(i);
    assert.equal(point.before, 30);
    assert.ok([23, 24].includes(point.after));
    assert.equal(replay[i], 30);
    assert.ok(neighbors.some(([dx, dy, dz]) => replay[offsets(x + dx, y + dy, z + dz)] === point.after));
    replay[i] = point.after;
  }
  assert.deepEqual(replay, after);
  for (const point of record.points) replay[offsets(...point.xyz)] = point.before;
  assert.deepEqual(replay, before);
});

test('lateral roof8 preserves other labels and synchronizes successor metadata and meshes', async () => {
  const [record, metadata, sections] = await Promise.all([
    read('segmentation-patches/review/lateral-roof8-adoption-2026-09-15.json').then(JSON.parse),
    read('public/atlas/bigbrain-practical-segmentation-icbm500-validation.json').then(JSON.parse),
    read('public/atlas/section-current-ventricles.json').then(JSON.parse),
  ]);
  const latest = await withRegionalBatches(record, { afterRevision: record.afterSha256 });
  assert.equal(latest.afterSha256, 'c3ffa981882eb6faae62a9bd7ef35b420ae6e19155c27440b1e3789bf2e00c42');
  assert.equal(latest.afterRawVoxelSha256, 'b7728a4892e726815654913a9e0ab220c7ce8942bb0f277b8da05665dc8eb4aa');
  assert.deepEqual(metadata.labelCounts, { ...metadata.labelCounts, '23': 81670, '24': 82250, '30': 145707 });
  assert.equal(metadata.rawVoxelSha256, latest.afterRawVoxelSha256);
  assert.equal(sections.sourceSha256, latest.afterSha256);
  assert.equal(sections.meshes['section-current-lateral-ventricles'].voxels, 163920);
  assert.equal(sections.meshes['section-current-ventricular-system'].voxels, 185262);
  for (const name of ['section-current-lateral-ventricles', 'section-current-ventricular-system']) {
    const info = latest.sectionMeshImpact.after.meshes[name];
    assert.equal(sha(await read('public/atlas/' + name + '.mesh')), info.sha256);
    assert.equal(sections.meshes[name].sha256, info.sha256);
  }
  assert.equal(record.meshImpact.blockMaskImpact.length, 55);
  assert.ok(record.meshImpact.blockMaskImpact.every((part) => part.changedMaskVoxels === 0));
});
