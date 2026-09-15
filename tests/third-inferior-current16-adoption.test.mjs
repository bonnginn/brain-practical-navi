import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";

const read = (path) => readFile(new URL("../" + path, import.meta.url));
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");

test("third-ventricle inferior correction replays exactly 16 reviewed 25-to-0 cells", async () => {
  const [recordBytes, beforeCompressed, afterCompressed] = await Promise.all([
    read("segmentation-patches/review/third-inferior-current16-adoption-2026-09-14.json"),
    read("tests/fixtures/bigbrain-practical-segmentation-pre-third-inferior-current16.bin.gz"),
    read("tests/fixtures/bigbrain-practical-segmentation-pre-lateral-roof8.bin.gz"),
  ]);
  assert.equal(sha(recordBytes), "bb3063466a39ebedb3c4f7d2250661c6d69bf3eed557d92a35d0065be4c9029d");
  const record = JSON.parse(recordBytes);
  assert.equal(sha(beforeCompressed), record.beforeSha256);
  assert.equal(sha(afterCompressed), record.afterSha256);
  assert.equal(record.transition, "25->0");
  assert.equal(record.count, 16);
  assert.equal(record.projectAdopted, true);
  assert.equal(record.expertReviewed, false);
  assert.equal(record.published, false);

  const before = gunzipSync(beforeCompressed);
  const after = gunzipSync(afterCompressed);
  const replay = Buffer.from(before);
  const seen = new Set();
  for (const point of record.points) {
    const [x, y, z] = point.xyz;
    assert.equal(point.before, 25);
    assert.equal(point.after, 0);
    assert.ok(x >= 195 && x <= 196 && y >= 265 && y <= 268 && z >= 107 && z <= 108);
    const offset = 10 + x + 394 * (y + 466 * z);
    assert.ok(!seen.has(offset));
    seen.add(offset);
    assert.equal(replay[offset], 25);
    replay[offset] = 0;
  }
  assert.ok(replay.equals(after));
  for (const point of record.points) {
    const [x, y, z] = point.xyz;
    replay[10 + x + 394 * (y + 466 * z)] = 25;
  }
  assert.ok(replay.equals(before));
});

test("third-ventricle correction synchronizes current counts and affected meshes", async () => {
  const [record, metadata, section, manifest] = await Promise.all([
    read("segmentation-patches/review/third-inferior-current16-adoption-2026-09-14.json").then(JSON.parse),
    read("public/atlas/bigbrain-practical-segmentation-icbm500-validation.json").then(JSON.parse),
    read("public/atlas/section-current-ventricles.json").then(JSON.parse),
    read("public/atlas/specimen-blocks.json").then(JSON.parse),
  ]);
  assert.equal(metadata.labelCounts["25"], 11837);
  assert.equal(metadata.labelCounts["23"], 81670);
  assert.equal(metadata.labelCounts["24"], 82250);
  assert.equal(metadata.labelCounts["26"], 9008);
  assert.equal(metadata.labelCounts["41"], 259);
  const latest = await (await import('./helpers/residual-mesh-successor.mjs')).withRegionalBatches(record, { afterRevision: record.afterSha256 });
  assert.equal(metadata.rawVoxelSha256, latest.afterRawVoxelSha256);
  assert.equal(metadata.regionalBatchAudits["third-inferior-current16"].recordSha256,
    "bb3063466a39ebedb3c4f7d2250661c6d69bf3eed557d92a35d0065be4c9029d");
  assert.equal(section.sourceSha256, latest.afterSha256);
  assert.equal(section.meshes["section-current-third-ventricle"].voxels, 11837);
  assert.equal(section.meshes["section-current-ventricular-system"].voxels, 185024);
  assert.equal(sha(await read("public/atlas/section-current-third-ventricle.mesh")),
    "1093a7c1304e1faa0ab5ecbda2573257192a282c6443b24294a459fe677028f6");
  assert.equal(sha(await read("public/atlas/section-current-ventricular-system.mesh")),
    "048c509fabc6591d3053a604bfcbd061fafdb4fd79856a6ddae6b30d99dfce51");

  const changed = record.meshImpact.blockMaskImpact.filter((part) => part.changedMaskVoxels);
  assert.deepEqual(changed.map((part) => [part.block, part.part, part.added, part.removed]),
    [["diencephalon", "third-ventricle", 0, 2]]);
  const part = manifest.specimens.diencephalon.find((item) => item.part === "third-ventricle");
  assert.equal(part.meshSha256, "01b1ddf80d3be59f66aa6fc04855e85874156be44e4377ee463f2a1093fc7d4e");
  assert.equal(sha(await read("public/atlas/block-diencephalon-third-ventricle.mesh")), part.meshSha256);
  assert.equal(sha(await read("tests/fixtures/block-diencephalon-third-ventricle-pre-third-inferior-current16.mesh")),
    "34905fdc6138b8d6a070f3515ae643b770fac3d4e9d924fa3dd171c0af0fb3cb");
});

test("unchanged aqueduct geometry is pinned to the current source revision", async () => {
  const report = JSON.parse(await read("public/atlas/section-current-aqueduct-partial.json"));
  assert.equal(report.sourceSha256, "d7fc87b5b18e1221c2979aeab9d6fefeefcfd4d353cfc78cab782930f32f8e29");
  assert.equal(report.voxels, 259);
  assert.equal(sha(await read("public/atlas/section-current-aqueduct-partial.mesh")),
    "22b992bfa93ec644aaf29d7644aebe12b50513b27c877941c70c65e641a4eeef");
  assert.equal(sha(await read("tests/fixtures/section-current-aqueduct-partial-pre-third-inferior-current16.json")),
    "0a41cc5e785ef082c92ad65e359db4b0f4b25983447cf3fb321e0332f7dc9320");
});
