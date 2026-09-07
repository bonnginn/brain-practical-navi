import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root));
const sha = data => createHash('sha256').update(data).digest('hex');

test('section ventricular assets match the current source and exact label counts', () => {
  const report = JSON.parse(read('public/atlas/section-current-ventricles.json'));
  const source = read(`public/atlas/${report.source}`);
  assert.equal(report.sourceSha256, sha(source));
  const voxels = gunzipSync(source).subarray(10);
  assert.equal(report.rawVoxelSha256, sha(voxels));
  const counts = new Uint32Array(256);
  for (const id of voxels) counts[id]++;
  const expected = {
    'section-current-lateral-ventricles': [23,24],
    'section-current-third-ventricle': [25],
    'section-current-fourth-ventricle': [26],
    'section-current-ventricular-system': [23,24,25,26,41],
  };
  assert.deepEqual(Object.keys(report.meshes).sort(), Object.keys(expected).sort());
  for (const [name, ids] of Object.entries(expected)) {
    const info = report.meshes[name];
    assert.deepEqual(info.labelIds, ids);
    assert.equal(info.voxels, ids.reduce((n,id) => n + counts[id], 0));
    assert.equal(info.componentSizes.reduce((a,b) => a+b, 0), info.voxels);
    const mesh = read(`public/atlas/${name}.mesh`);
    assert.equal(sha(mesh), info.sha256);
    assert.equal(mesh.subarray(0,4).toString(), 'BNM2');
    assert.equal(mesh.length, 12 + mesh.readUInt32LE(4)*28 + mesh.readUInt32LE(8)*12);
  }
});

test('BigBrain section selection/context are distinct from legacy MNI and cropped blocks', () => {
  const page = read('app/page.tsx').toString();
  const canvas = read('app/AtlasVolumeCanvas.tsx').toString();
  assert.match(page, /ventricle:\["section-current-lateral-ventricles"\]/);
  assert.match(page, /contrast==="bigbrain"\?bigbrainSectionMeshFiles\[key\]:undefined/);
  assert.match(canvas, /contrast==="bigbrain"\?"section-current-ventricular-system":"segment-ventricles"/);
  assert.match(canvas, /name.startsWith\("section-current-"\)/);
  assert.match(canvas, /\[kind,specimenBlock,view,contrast,/);
});
