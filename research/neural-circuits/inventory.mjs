import { readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { GRID, SPACE, voxelToWorld, worldToMesh, sectionPositions } from './coordinates.mjs';
import { validateCatalog } from './catalog.mjs';

const root = new URL('../../', import.meta.url);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
export function inventory(compressed) {
  const raw = gunzipSync(compressed);
  if (raw.subarray(0, 4).toString() !== 'BBS1') throw new Error('Unexpected segmentation header');
  const dims = [4, 6, 8].map(offset => raw.readUInt16LE(offset));
  if (JSON.stringify(dims) !== JSON.stringify(GRID.dimensions) || raw.length !== 10 + dims.reduce((a, b) => a * b)) {
    throw new Error('Unexpected target grid');
  }
  const rows = [15, 16].map(id => ({ id, count: 0, sums: [0, 0, 0], bounds: [[Infinity, Infinity, Infinity], [-Infinity, -Infinity, -Infinity]] }));
  const [dx, dy] = dims;
  const coordinates = i => [i % dx, Math.floor(i / dx) % dy, Math.floor(i / (dx * dy))];
  for (let i = 0; i < raw.length - 10; i++) {
    const id = raw[i + 10];
    if (id !== 15 && id !== 16) continue;
    const row = rows[id - 15], xyz = coordinates(i);
    row.count++;
    xyz.forEach((v, axis) => { row.sums[axis] += v; row.bounds[0][axis] = Math.min(row.bounds[0][axis], v); row.bounds[1][axis] = Math.max(row.bounds[1][axis], v); });
  }
  return {
    schemaVersion: 1, scope: 'Whole-thalamus context only. No subnuclear localization or anatomical validation.',
    labelSource: 'public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz',
    labelSha256: sha(compressed), dimensionsXYZ: dims, coordinateSpace: SPACE,
    displayTransform: 'scientific XYZ -> [Z-18, Y+18, X] stored BNM2 ZYX',
    catalog: validateCatalog(),
    context: rows.map(row => {
      if (!row.count) throw new Error(`Missing context label ${row.id}`);
      const centroid = row.sums.map(v => v / row.count);
      // Centroid can lie outside a concave mask; use an actual occupied voxel.
      let distance = Infinity, selected;
      for (let z = row.bounds[0][2]; z <= row.bounds[1][2]; z++) for (let y = row.bounds[0][1]; y <= row.bounds[1][1]; y++) for (let x = row.bounds[0][0]; x <= row.bounds[1][0]; x++) {
        if (raw[10 + x + dx * (y + dy * z)] !== row.id) continue;
        const xyz = [x, y, z], d = xyz.reduce((sum, v, axis) => sum + (v - centroid[axis]) ** 2, 0);
        if (d < distance) { distance = d; selected = xyz; }
      }
      const world = voxelToWorld(selected);
      return { labelId: row.id, hemisphere: row.id === 15 ? 'left' : 'right', voxelCount: row.count,
        boundsXYZ: row.bounds, centroidVoxelXYZ: centroid, contextVoxelXYZ: selected,
        contextWorldXYZ: world, contextMeshZYX: worldToMesh(world, SPACE), sectionPositions: sectionPositions(world, SPACE),
        purpose: 'Navigate to existing whole-thalamus label only; never reuse for a nucleus.' };
    }),
  };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.slice(2).some(arg => arg !== '--write-snapshot')) throw new Error('Usage: node research/neural-circuits/inventory.mjs [--write-snapshot]');
  const bytes = readFileSync(new URL('public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz', root));
  const report = inventory(bytes), json = JSON.stringify(report, null, 2) + '\n';
  if (process.argv.includes('--write-snapshot')) writeFileSync(new URL('./context-inventory.json', import.meta.url), json);
  process.stdout.write(json);
}
