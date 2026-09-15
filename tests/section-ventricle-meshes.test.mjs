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
  assert.match(canvas, /atlasMeshRevisionQuery\(name,SEGMENTATION_LABEL_REVISION\)/);
  assert.match(canvas, /\[kind,specimenBlock,surfaceAtlas,view,contrast,/);
});


test('internal capsule section mesh retains both full labels instead of the right cropped block', () => {
  const info = JSON.parse(read('public/atlas/section-current-internal-capsule.json'));
  const source = read(`public/atlas/${info.source}`);
  assert.equal(info.sourceSha256, sha(source));
  assert.deepEqual(info.labelIds, [31,32]);
  const counts = {31:0,32:0};
  for (const id of gunzipSync(source).subarray(10)) if (id in counts) counts[id]++;
  assert.deepEqual(info.labelVoxelCounts, counts);
  assert.ok(counts[31] > 0 && counts[32] > 0);
  const mesh = read('public/atlas/section-current-internal-capsule.mesh');
  assert.equal(sha(mesh), info.sha256);
  const nv = mesh.readUInt32LE(4);
  const xs = Array.from({length:nv}, (_,i)=>mesh.readFloatLE(12+i*12+8));
  assert.ok(Math.min(...xs)<-20 && Math.max(...xs)>20);
  const page = read('app/page.tsx').toString().split('const bigbrainSectionMeshFiles:')[1].split('};')[0];
  assert.match(page, /internalCapsule:\["section-current-internal-capsule"\]/);
});
