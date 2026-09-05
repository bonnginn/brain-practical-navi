import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../app/AtlasVolumeCanvas.tsx', import.meta.url), 'utf8');
const labels = JSON.parse(fs.readFileSync(new URL('../public/atlas/labels.json', import.meta.url), 'utf8'));
const block = source.match(/const SURFACE_BOUNDARY_LABELS:[\s\S]*?=\{([\s\S]*?)\n\};/)[1];
const definitions = Object.fromEntries([...block.matchAll(/"([^"]+)":\{a:\[([^\]]*)\],b:\[([^\]]*)\]\}/g)]
  .map(([,key,a,b]) => [key,{a:a.split(',').map(Number),b:b.split(',').map(Number)}]));

test('all six sulcal boundary definitions refer to existing, bilaterally paired atlas labels', () => {
  assert.equal(Object.keys(definitions).length, 6);
  const byId = new Map(labels.map(label => [label.id,label]));
  for (const [key, sides] of Object.entries(definitions)) {
    for (const ids of Object.values(sides)) {
      assert.equal(new Set(ids).size, ids.length, `${key}: duplicate label`);
      for (const id of ids) {
        const label = byId.get(id);
        assert.ok(label, `${key}: unknown label ${id}`);
        assert.ok(ids.some(other => byId.get(other)?.name === label.name && byId.get(other)?.hemi !== label.hemi),
          `${key}: missing contralateral counterpart for ${id}`);
      }
    }
  }
});

test('frontal sulcal guides include the right rostral middle frontal label, not nonexistent ID103', () => {
  for (const key of ['precentral-sulcus','superior-frontal-sulcus']) {
    assert.ok(definitions[key].b.includes(1));
    assert.ok(definitions[key].b.includes(52));
    assert.ok(!definitions[key].b.includes(103));
  }
});
