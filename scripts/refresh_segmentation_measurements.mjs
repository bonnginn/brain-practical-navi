import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = new URL('../', import.meta.url);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const VENTRICLES = [23, 24, 25, 26, 41];

export function decodeVolume(compressed, magic) {
  const bytes = gunzipSync(compressed);
  if (bytes.length < 10 || bytes.subarray(0, 4).toString() !== magic) throw new Error(`Expected ${magic} volume`);
  const dimensions = [4, 6, 8].map(offset => bytes.readUInt16LE(offset));
  if (dimensions.some(n => n === 0) || bytes.length !== 10 + dimensions.reduce((a, b) => a * b, 1)) {
    throw new Error('Invalid dimensions or payload length');
  }
  return { dimensions, voxels: bytes.subarray(10) };
}

export function measureSegmentation(labelBytes, imageBytes) {
  const labels = decodeVolume(labelBytes, 'BBS1');
  const image = decodeVolume(imageBytes, 'BBV1');
  if (JSON.stringify(labels.dimensions) !== JSON.stringify(image.dimensions)) throw new Error('Image/label grid mismatch');
  const counts = new Array(256).fill(0);
  const nonBackground = new Array(256).fill(0);
  for (let i = 0; i < labels.voxels.length; i++) {
    const id = labels.voxels[i];
    counts[id]++;
    if (image.voxels[i] !== 255) nonBackground[id]++;
  }
  const ventricularVoxels = VENTRICLES.reduce((sum, id) => sum + counts[id], 0);
  const ventricularNonBackgroundVoxels = VENTRICLES.reduce((sum, id) => sum + nonBackground[id], 0);
  return {
    schemaVersion: 1,
    sourceLabelSha256: sha(labelBytes), sourceImageSha256: sha(imageBytes),
    rawVoxelSha256: sha(labels.voxels), dimensionsXYZ: labels.dimensions,
    backgroundImageValue: 255,
    interpretation: 'Image-value overlap only; non-background is not proof of tissue misclassification. Grid equality is not anatomical registration validation.',
    labelCounts: Object.fromEntries(counts.flatMap((n, id) => n && id ? [[String(id), n]] : [])),
    ventricularLabelIds: VENTRICLES,
    ventricularVoxels, ventricularNonBackgroundVoxels,
    ventricularNonBackgroundFraction: ventricularVoxels ? ventricularNonBackgroundVoxels / ventricularVoxels : null,
    ventricularLabelsRestrictedToImageBackground: ventricularVoxels ? ventricularNonBackgroundVoxels === 0 : null,
    perVentricularLabel: Object.fromEntries(VENTRICLES.map(id => [String(id), {
      voxels: counts[id], nonBackgroundVoxels: nonBackground[id],
    }])),
  };
}

export function refreshedMetadata(metadata, measurements) {
  const result = structuredClone(metadata);
  // Preserve the original claims once, separately from recomputed current values.
  if (!result.historicalGenerationClaims) result.historicalGenerationClaims = {
    scope: 'Legacy values present before current-image measurement; not claims about the current label volume.',
    ventricleLabelsRestrictedToEmptySpace: metadata.ventricleLabelsRestrictedToEmptySpace ?? null,
    ventricleTissueOverlap: metadata.ventricleTissueOverlap ?? null,
  };
  result.currentImageMeasurements = measurements;
  result.labelCounts = measurements.labelCounts;
  result.rawVoxelSha256 = measurements.rawVoxelSha256;
  // Compatibility names: interpretation is explicitly the encoded image mask, not histological truth.
  result.ventricleLabelsRestrictedToEmptySpace = measurements.ventricularLabelsRestrictedToImageBackground;
  result.ventricleTissueOverlap = measurements.ventricularNonBackgroundFraction;
  return result;
}

export function main(args = process.argv.slice(2)) {
  if (args.length !== 1 || !['--check', '--write'].includes(args[0])) throw new Error('Usage: node scripts/refresh_segmentation_measurements.mjs --check|--write');
  const metadataPath = new URL('public/atlas/bigbrain-practical-segmentation-icbm500-validation.json', root);
  const metadata = JSON.parse(readFileSync(metadataPath, 'utf8'));
  const measurements = measureSegmentation(
    readFileSync(new URL('public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz', root)),
    readFileSync(new URL('public/atlas/bigbrain-icbm500.bin.gz', root)),
  );
  const updated = refreshedMetadata(metadata, measurements);
  if (args[0] === '--write') writeFileSync(metadataPath, JSON.stringify(updated, null, 2) + '\n');
  else if (JSON.stringify(updated) !== JSON.stringify(metadata)) throw new Error('Current segmentation measurements are stale; review and run --write');
  console.log(JSON.stringify({ status: 'ok', mode: args[0], sourceLabelSha256: measurements.sourceLabelSha256,
    ventricularVoxels: measurements.ventricularVoxels, ventricularNonBackgroundVoxels: measurements.ventricularNonBackgroundVoxels }));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
