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
  assert.equal(metadata.labelCounts["25"], 11873);
  assert.equal(metadata.labelCounts["23"], 81670);
  assert.equal(metadata.labelCounts["24"], 82250);
  assert.equal(metadata.labelCounts["26"], 9202);
  assert.equal(metadata.labelCounts["41"], 267);
  const latest = await (await import('./helpers/residual-mesh-successor.mjs')).withRegionalBatches(record, { afterRevision: record.afterSha256 });
  assert.equal(metadata.rawVoxelSha256, latest.afterRawVoxelSha256);
  assert.equal(metadata.regionalBatchAudits["third-inferior-current16"].recordSha256,
    "bb3063466a39ebedb3c4f7d2250661c6d69bf3eed557d92a35d0065be4c9029d");
  assert.equal(section.sourceSha256, latest.afterSha256);
  assert.equal(section.meshes["section-current-third-ventricle"].voxels, 11873);
  assert.equal(section.meshes["section-current-ventricular-system"].voxels, 185262);
  assert.equal(sha(await read("public/atlas/section-current-third-ventricle.mesh")),
    "1281cf7aba8a01ebd095fe131f02169af5578cf7166b0d4448599861e98b6ee2");
  assert.equal(sha(await read("public/atlas/section-current-ventricular-system.mesh")),
    latest.sectionMeshImpact.after.meshes["section-current-ventricular-system"].sha256);

  const changed = record.meshImpact.blockMaskImpact.filter((part) => part.changedMaskVoxels);
  assert.deepEqual(changed.map((part) => [part.block, part.part, part.added, part.removed]),
    [["diencephalon", "third-ventricle", 0, 2]]);
  const part = manifest.specimens.diencephalon.find((item) => item.part === "third-ventricle");
  assert.equal(part.meshSha256, "cc0c38208dc6d9547c662b0fa8ab5839db354faba55bf8c39e10c81eb66f2526");
  assert.equal(sha(await read("public/atlas/block-diencephalon-third-ventricle.mesh")), part.meshSha256);
  assert.equal(sha(await read("tests/fixtures/block-diencephalon-third-ventricle-pre-third-inferior-current16.mesh")),
    "34905fdc6138b8d6a070f3515ae643b770fac3d4e9d924fa3dd171c0af0fb3cb");
});

test("unchanged aqueduct geometry is pinned to the current source revision", async () => {
  const report = JSON.parse(await read("public/atlas/section-current-aqueduct-partial.json"));
  assert.equal(report.sourceSha256, "d815aaff6b98c95109cdd7c052a29871d49cc9cdf463bcb3db7e28a1497c2392");
  assert.equal(report.voxels, 267);
  assert.equal(sha(await read("public/atlas/section-current-aqueduct-partial.mesh")),
    "13cc011f6507b9f3ad3ff830009c2c9150fbb3b52602c1f561e253c4a9765faa");
  assert.equal(sha(await read("tests/fixtures/section-current-aqueduct-partial-pre-third-inferior-current16.json")),
    "0a41cc5e785ef082c92ad65e359db4b0f4b25983447cf3fb321e0332f7dc9320");
});
