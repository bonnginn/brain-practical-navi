import test from 'node:test';
import assert from 'node:assert/strict';
import { atlasMeshRevisionQuery } from '../src/atlasMeshRevision.mjs';

test('all three legacy section meshes and current/block families change URLs with labels', () => {
  for (const name of ['section-accumbens', 'section-optic-chiasm', 'section-insula', 'section-current-third-ventricle', 'block-hindbrain-midbrain']) {
    assert.equal(atlasMeshRevisionQuery(name, 'old'), '?v=old');
    assert.equal(atlasMeshRevisionQuery(name, 'new'), '?v=new');
  }
});
test('unrelated meshes retain their existing cache policy', () => {
  assert.equal(atlasMeshRevisionQuery('overlay-arteries-anterior', 'new'), '?v=8e1d872281eb6439');
  assert.equal(atlasMeshRevisionQuery('overlay-nerves-pontine', 'new'), '?v=1244f483c765ef08');
  for (const name of ['pial-left', 'brodmann-left', 'segment-ventricles', 'section-unrelated']) assert.equal(atlasMeshRevisionQuery(name, 'new'), '');
  assert.equal(atlasMeshRevisionQuery('section-insula', 'a&b'), '?v=a%26b');
});
