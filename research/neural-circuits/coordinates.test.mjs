import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { SPACE, GRID, voxelToWorld, worldToVoxel, worldToMesh, meshToWorld, projectToSection, sectionPositions, resolveAnchor } from './coordinates.mjs';
import { targets, studyPlans, validateCatalog } from './catalog.mjs';
import { inventory } from './inventory.mjs';
import { planeVoxel, planeSliceIndex } from '../../app/segmentationGeometry.ts';

test('scientific coordinates use the documented source affine', () => {
  const source = JSON.parse(readFileSync(new URL('../../public/atlas/bigbrain-icbm500-validation.json', import.meta.url)));
  assert.deepEqual(source.shape, GRID.dimensions);
  for (const voxel of [[0, 0, 0], [393, 465, 377], [170.5, 231.25, 160.5]]) {
    const world = source.affine.slice(0, 3).map(row => row[3] + voxel.reduce((sum, v, i) => sum + row[i] * v, 0));
    assert.deepEqual(voxelToWorld(voxel), world);
    assert.deepEqual(worldToVoxel(world, SPACE), voxel);
  }
});
test('existing mesh display shift and ZYX order are explicit and reversible', () => {
  assert.deepEqual(worldToMesh([-10, -20, 5], SPACE), [-13, -2, -10]);
  assert.deepEqual(meshToWorld([-13, -2, -10]), [-10, -20, 5]);
  assert.deepEqual(worldToMesh(voxelToWorld([0, 0, 0]), SPACE), [-90, -116, -98]);
});
for (const plane of ['horizontal', 'coronal', 'sagittal']) test(`${plane}: anchor projection matches existing section sampling and navigation`, () => {
  const axis = { horizontal: 2, coronal: 1, sagittal: 0 }[plane];
  for (const voxel of [[0, 0, 0], [393, 465, 377], [170, 231, 160]]) {
    const world = voxelToWorld(voxel);
    const projected = projectToSection(world, SPACE, plane, voxel[axis]);
    const [a, b] = projected.pixelCenter.map(v => v - 0.5);
    assert.deepEqual(planeVoxel(a, b, voxel[axis], plane, [...GRID.dimensions]), voxel);
    assert.equal(planeSliceIndex(sectionPositions(world, SPACE)[plane], plane, [...GRID.dimensions]), voxel[axis]);
  }
});
test('thin slice hides distant or outside anchors without clamping them into anatomy', () => {
  const world = voxelToWorld([170, 231, 160.25]);
  assert.equal(projectToSection(world, SPACE, 'horizontal', 159), null);
  assert.equal(projectToSection(world, SPACE, 'horizontal', 160).distanceMm, 0.125);
  assert.equal(projectToSection(voxelToWorld([-1, 231, 160]), SPACE, 'horizontal', 160), null);
  assert.throws(() => sectionPositions(voxelToWorld([-1, 0, 0]), SPACE), /outside/);
});
test('rejects unregistered atlas coordinates, nonfinite values and invalid slices', () => {
  assert.throws(() => worldToMesh([0, 0, 0], 'MNI152-2009c-symmetric'), /registration/);
  assert.throws(() => voxelToWorld([NaN, 0, 0]), /finite/);
  assert.throws(() => projectToSection([0, 0, 0], SPACE, 'axial', 1), /plane/);
  assert.throws(() => projectToSection([0, 0, 0], SPACE, 'horizontal', -1), /slice/);
  assert.throws(() => projectToSection([0, 0, 0], SPACE, 'horizontal', 1, -1), /thickness/);
});
test('localization requires evidence, project review and matching laterality', () => {
  const record = { hemisphere: 'left', status: 'project-reviewed', anchor: { xyz: [-10, -20, 5], space: SPACE }, evidence: { sourceId: 'fixture', reviewRecord: 'synthetic-test', targetSha256: 'a'.repeat(64) } };
  const hash = 'a'.repeat(64);
  assert.ok(resolveAnchor(record, hash));
  assert.equal(resolveAnchor(record), null);
  assert.equal(resolveAnchor(record, 'b'.repeat(64)), null);
  assert.equal(resolveAnchor({ ...record, status: 'candidate' }, hash), null);
  assert.equal(resolveAnchor({ ...record, evidence: null }, hash), null);
  assert.equal(resolveAnchor({ ...record, hemisphere: 'right' }, hash), null);
  assert.equal(resolveAnchor({ ...record, anchor: null }, hash), null);
});
test('curriculum remains unlocalized with no invented atlas mappings or tract edges', () => {
  assert.equal(validateCatalog().targets, 26);
  assert.equal(validateCatalog().localized, 0);
  for (const target of targets) {
    assert.deepEqual(target.atlasMappings, []);
    for (const slot of target.localizationSlots) assert.equal(resolveAnchor(slot), null);
  }
  for (const plan of studyPlans) assert.deepEqual(plan.edges, []);
});
test('inventory rejects incompatible grids instead of silently reading another atlas', () => {
  assert.throws(() => inventory(gzipSync(Buffer.from('wrong header'))), /header/);
  const data = Buffer.alloc(10); data.write('BBS1'); data.writeUInt16LE(2, 4);
  assert.throws(() => inventory(gzipSync(data)), /grid/);
});
test('inventory context point stays inside a concave label even when centroid is outside', () => {
  const [dx, dy, dz] = GRID.dimensions;
  const raw = Buffer.alloc(10 + dx * dy * dz); raw.write('BBS1');
  [dx, dy, dz].forEach((value, i) => raw.writeUInt16LE(value, 4 + i * 2));
  for (const [id, x, y, z] of [[15, 170, 230, 160], [15, 174, 230, 160], [16, 220, 230, 160]]) raw[10 + x + dx * (y + dy * z)] = id;
  const report = inventory(gzipSync(raw));
  assert.deepEqual(report.context[0].centroidVoxelXYZ, [172, 230, 160]);
  for (const row of report.context) {
    const [x, y, z] = row.contextVoxelXYZ;
    assert.equal(raw[10 + x + dx * (y + dy * z)], row.labelId);
  }
});
