import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import { atlasMeshRevisionQuery } from '../src/atlasMeshRevision.mjs';

test('all three legacy section meshes and current/block families change URLs with labels', () => {
  for (const name of ['section-accumbens', 'section-optic-chiasm', 'section-insula', 'section-current-third-ventricle', 'block-hindbrain-midbrain']) {
    assert.equal(atlasMeshRevisionQuery(name, 'old'), '?v=old');
    assert.equal(atlasMeshRevisionQuery(name, 'new'), '?v=new');
  }
});
test('unrelated meshes retain their existing cache policy', () => {
  assert.equal(atlasMeshRevisionQuery('overlay-arteries-anterior', 'new'), '?v=8e1d872281eb6439');
  assert.equal(atlasMeshRevisionQuery('overlay-nerves-pontine', 'new'), '?v=348dd0eeda9cc4c6');
  assert.equal(atlasMeshRevisionQuery('overlay-nerves-medullary', 'new'), '?v=20586505af22ab64');
  for (const name of ['pial-left', 'brodmann-left', 'segment-ventricles', 'section-unrelated']) assert.equal(atlasMeshRevisionQuery(name, 'new'), '');
  assert.equal(atlasMeshRevisionQuery('section-insula', 'a&b'), '?v=a%26b');
});
test('fine cavity mesh URLs pin the installed representation while retaining the label revision', async () => {
  const names = [
    'block-lateral-ventricle-ventricular-cavity',
    'block-commissural-system-lateral-ventricles',
    'block-choroid-plexus-ventricular-cavity',
    'block-medial-temporal-inferior-horn'
  ];
  for (const name of names) {
    const bytes = await readFile(new URL(`../public/atlas/${name}.mesh`, import.meta.url));
    const meshRevision = createHash('sha256').update(bytes).digest('hex').slice(0, 16);
    assert.equal(atlasMeshRevisionQuery(name, 'label-revision'), `?v=label-revision-${meshRevision}`);
  }
});
