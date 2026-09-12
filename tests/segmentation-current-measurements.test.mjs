import test from 'node:test';
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
import { decodeVolume, measureSegmentation, refreshedMetadata } from '../scripts/refresh_segmentation_measurements.mjs';

function volume(magic, values, dimensions = [values.length, 1, 1]) {
  const header = Buffer.alloc(10); header.write(magic);
  dimensions.forEach((n, i) => header.writeUInt16LE(n, 4 + i * 2));
  return gzipSync(Buffer.concat([header, Buffer.from(values)]));
}

test('measurements count encoded image overlap, including partial aqueduct, without judging anatomy', () => {
  const m = measureSegmentation(volume('BBS1', [0, 23, 23, 24, 25, 26, 41, 1]), volume('BBV1', [0, 255, 240, 255, 255, 200, 199, 30]));
  assert.equal(m.ventricularVoxels, 6); assert.equal(m.ventricularNonBackgroundVoxels, 3);
  assert.equal(m.ventricularNonBackgroundFraction, 0.5);
  assert.equal(m.ventricularLabelsRestrictedToImageBackground, false);
  assert.deepEqual(m.perVentricularLabel['23'], { voxels: 2, nonBackgroundVoxels: 1 });
  assert.equal(m.labelCounts['0'], undefined);
  assert.match(m.interpretation, /not proof/);
});
test('empty ventricular masks are unknown, not a successful zero-overlap claim', () => {
  const m = measureSegmentation(volume('BBS1', [1]), volume('BBV1', [255]));
  assert.equal(m.ventricularNonBackgroundFraction, null);
  assert.equal(m.ventricularLabelsRestrictedToImageBackground, null);
});
test('rejects malformed volumes and equal-sized but differently shaped grids', () => {
  assert.throws(() => decodeVolume(volume('BBV1', [1]), 'BBS1'), /Expected/);
  assert.throws(() => decodeVolume(volume('BBS1', [1], [2, 1, 1]), 'BBS1'), /payload/);
  assert.throws(() => decodeVolume(volume('BBS1', [], [0, 1, 1]), 'BBS1'), /dimensions/);
  assert.throws(() => measureSegmentation(volume('BBS1', [1, 1]), volume('BBV1', [1, 1], [1, 2, 1])), /mismatch/);
});
test('refresh preserves review history and is idempotent', () => {
  const original = { ventricleTissueOverlap: 0, ventricleLabelsRestrictedToEmptySpace: true, reviewedPatchAudit: { expertReviewed: false } };
  const m = measureSegmentation(volume('BBS1', [23]), volume('BBV1', [200]));
  const result = refreshedMetadata(original, m);
  assert.equal(result.ventricleTissueOverlap, 1);
  assert.equal(result.historicalGenerationClaims.ventricleTissueOverlap, 0);
  assert.deepEqual(result.reviewedPatchAudit, original.reviewedPatchAudit);
  assert.equal(original.ventricleTissueOverlap, 0);
  assert.deepEqual(refreshedMetadata(result, m), result);
});
test('checked-in current measurements are reproduced from both current assets', () => {
  const read = p => readFileSync(new URL('../public/atlas/' + p, import.meta.url));
  const metadata = JSON.parse(read('bigbrain-practical-segmentation-icbm500-validation.json'));
  const m = measureSegmentation(read('bigbrain-practical-segmentation-icbm500.bin.gz'), read('bigbrain-icbm500.bin.gz'));
  assert.deepEqual(metadata.currentImageMeasurements, m);
  assert.deepEqual(refreshedMetadata(metadata, m), metadata);
});
