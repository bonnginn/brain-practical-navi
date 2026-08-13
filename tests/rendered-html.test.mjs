import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { gunzipSync } from "node:zlib";

const root = new URL("../", import.meta.url);

function readVolumeHeader(buffer, expectedMagic) {
  const payload = gunzipSync(buffer);
  assert.equal(payload.subarray(0, 4).toString("ascii"), expectedMagic);
  const dims = [payload.readUInt16LE(4), payload.readUInt16LE(6), payload.readUInt16LE(8)];
  const voxelCount = dims.reduce((total, value) => total * value, 1);
  assert.equal(payload.length, 10 + voxelCount);
  return { payload, dims, voxelCount };
}

test("uses an exact coordinate-matched BigBrain image and manual label grid", async () => {
  const [imageFile, labelFile, metadataFile] = await Promise.all([
    readFile(new URL("public/atlas/bigbrain-icbm500.bin.gz", root)),
    readFile(new URL("public/atlas/bigbrain-manual-subcortical-icbm500.bin.gz", root)),
    readFile(new URL("public/atlas/bigbrain-icbm500-validation.json", root), "utf8"),
  ]);

  const image = readVolumeHeader(imageFile, "BBV1");
  const labels = readVolumeHeader(labelFile, "BBS1");
  assert.deepEqual(image.dims, [394, 466, 378]);
  assert.deepEqual(labels.dims, image.dims);

  const metadata = JSON.parse(metadataFile);
  assert.deepEqual(metadata.shape, image.dims);
  assert.deepEqual(metadata.voxelSizeMm, [0.5, 0.5, 0.5]);
  assert.deepEqual(metadata.labelIds, Array.from({ length: 22 }, (_, index) => index + 1));
  assert.ok(metadata.labelTissueOverlap > 0.99);
  assert.equal(metadata.leftRightPairsValidated, 11);
  assert.match(metadata.coordinatePolicy, /exact shared ICBM2009 symmetric grid/);
});

test("does not load the rejected affine-only label transfer", async () => {
  const [canvas, page, html] = await Promise.all([
    readFile(new URL("app/AtlasVolumeCanvas.tsx", root), "utf8"),
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("dist/index.html", root), "utf8"),
  ]);

  assert.match(canvas, /bigbrain-icbm500\.bin\.gz/);
  assert.match(canvas, /bigbrain-manual-subcortical-\$\{name\}\.bin\.gz/);
  assert.doesNotMatch(canvas, /manual-subcortical-(fixed|histology)/);
  assert.match(page, /同一格子で検証済み/);
  assert.match(page, /未検証ラベルは表示しません/);
  assert.match(html, /<title>脳実習ナビ/);
});
