/** Preparation only. No imports from the learner app and no segmentation writes. */
export const SPACE = 'project:bigbrain-icbm500-scientific';
export const GRID = Object.freeze({
  dimensions: Object.freeze([394, 466, 378]),
  spacing: Object.freeze([0.5, 0.5, 0.5]),
  origin: Object.freeze([-98, -134, -72]),
  displayOrigin: Object.freeze([-98, -116, -90]),
});

function vector(value) {
  if (!Array.isArray(value) || value.length !== 3 || !value.every(Number.isFinite)) {
    throw new TypeError('Expected three finite XYZ coordinates');
  }
  return value;
}
function planeAxis(plane) {
  const axis = { sagittal: 0, coronal: 1, horizontal: 2 }[plane];
  if (axis === undefined) throw new TypeError('Unknown section plane');
  return axis;
}
export function voxelToWorld(voxel) {
  return vector(voxel).map((v, i) => v * GRID.spacing[i] + GRID.origin[i]);
}
export function worldToVoxel(world, space) {
  if (space !== SPACE) throw new Error('Coordinate space mismatch: registration required');
  return vector(world).map((v, i) => (v - GRID.origin[i]) / GRID.spacing[i]);
}
export function insideGrid(voxel) {
  return vector(voxel).every((v, i) => v >= 0 && v <= GRID.dimensions[i] - 1);
}
/** BNM2 stores Z,Y,X. This is a display transform, NEVER an atlas registration. */
export function worldToMesh(world, space) {
  const voxel = worldToVoxel(world, space);
  return voxel.map((v, i) => v * GRID.spacing[i] + GRID.displayOrigin[i]).reverse();
}
export function meshToWorld(storedZYX) {
  return vector(storedZYX).slice().reverse().map((v, i) => v - GRID.displayOrigin[i] + GRID.origin[i]);
}
/** Pixel centres before AtlasVolumeCanvas zoom/pan. Do not snap subvoxel anchors. */
export function projectToSection(world, space, plane, sliceIndex, halfThicknessMm = 0.25) {
  const axis = planeAxis(plane);
  if (!Number.isInteger(sliceIndex) || sliceIndex < 0 || sliceIndex >= GRID.dimensions[axis]) {
    throw new RangeError('Invalid slice index');
  }
  if (!Number.isFinite(halfThicknessMm) || halfThicknessMm < 0) throw new RangeError('Invalid slab thickness');
  const voxel = worldToVoxel(world, space);
  if (!insideGrid(voxel)) return null;
  const [x, y, z] = voxel;
  const distanceMm = (voxel[axis] - sliceIndex) * GRID.spacing[axis];
  if (Math.abs(distanceMm) > halfThicknessMm) return null;
  const pixel = plane === 'horizontal' ? [x, GRID.dimensions[1] - 1 - y]
    : plane === 'sagittal' ? [GRID.dimensions[1] - 1 - y, GRID.dimensions[2] - 1 - z]
      : [x, GRID.dimensions[2] - 1 - z];
  return { pixelCenter: pixel.map(v => v + 0.5), sliceIndex, distanceMm };
}
export function sectionPositions(world, space) {
  const voxel = worldToVoxel(world, space);
  if (!insideGrid(voxel)) throw new RangeError('Anchor outside target grid');
  const [x, y, z] = voxel.map(Math.round);
  return { sagittal: x / 393 * 100, coronal: y / 465 * 100, horizontal: (1 - z / 377) * 100 };
}

/** Missing/unreviewed geometry must not fall back to a parent's centroid. */
export function resolveAnchor(record, currentTargetSha256) {
  if (record?.status !== 'project-reviewed' || !record.anchor) return null;
  if (!record.evidence?.sourceId || !record.evidence?.reviewRecord ||
      !/^[a-f0-9]{64}$/.test(record.evidence?.targetSha256 ?? '') ||
      record.evidence.targetSha256 !== currentTargetSha256) return null;
  const { xyz, space } = record.anchor;
  const voxel = worldToVoxel(xyz, space);
  if (!insideGrid(voxel)) return null;
  if (!['left', 'right', 'midline'].includes(record.hemisphere)) return null;
  if ((record.hemisphere === 'left' && xyz[0] >= 0) ||
      (record.hemisphere === 'right' && xyz[0] <= 0) ||
      (record.hemisphere === 'midline' && xyz[0] !== 0)) return null;
  return { world: xyz.slice(), voxel, meshZYX: worldToMesh(xyz, space), positions: sectionPositions(xyz, space) };
}
