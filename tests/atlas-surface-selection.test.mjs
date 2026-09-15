import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const source = fs.readFileSync(new URL('../app/AtlasVolumeCanvas.tsx', import.meta.url), 'utf8');
const start = source.indexOf('const selectedSurfaceMeshCache=');
const end = source.indexOf('function meshHighlightEvidence', start);
assert.ok(start >= 0 && end > start, 'selected surface helper is present');
const helper = ts.transpileModule(source.slice(start, end).replace('export function', 'function'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText + '\nexports.selectedSurfaceMesh=selectedSurfaceMesh;';
const context = { exports: {} };
vm.runInNewContext(helper, context);
const { selectedSurfaceMesh } = context.exports;

const layer = ids => [{ ids, color: [255, 0, 0] }];
const fixture = () => ({
  vertices: new Float32Array(12),
  normals: new Float32Array(12),
  shade: new Float32Array(4),
  regions: new Float32Array([3, 7, 0, 7]),
  faces: new Uint32Array([0, 1, 2, 1, 2, 3]),
});

test('selected surface keeps incident triangles, excludes unrelated triangles, and preserves source mesh', () => {
  const mesh = fixture(), originalFaces = mesh.faces.slice();
  const selected = selectedSurfaceMesh(mesh, layer([3]));
  assert.deepEqual([...selected.faces], [0, 1, 2]);
  assert.deepEqual([...mesh.faces], [...originalFaces]);
  assert.equal(selected.vertices, mesh.vertices);
});

test('selected surface reuses cached variants and falls back to the full mesh without IDs', () => {
  const mesh = fixture();
  assert.equal(selectedSurfaceMesh(mesh, []), mesh);
  assert.equal(selectedSurfaceMesh(mesh, layer([7])), selectedSurfaceMesh(mesh, layer([7])));
  assert.deepEqual([...selectedSurfaceMesh(mesh, layer([99])).faces], []);
});
