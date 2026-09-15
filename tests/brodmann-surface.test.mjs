import assert from 'node:assert/strict';
import fs from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { decodeCompactSurface } from '../app/brodmannMesh.ts';

const root = new URL('../', import.meta.url);
const read = path => fs.readFileSync(new URL(path, root));
const report = JSON.parse(read('public/atlas/brodmann-surface.json'));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
test('full-resolution reference surfaces fit the separate 12 MiB observation budget', () => {
  const names = Object.values(report.hemispheres).flatMap(info => [info.mesh, info.inflated.mesh]);
  const bytes = [...names, 'brodmann-surface.json', report.notice].reduce((sum, name) => sum + read(`public/atlas/${name}`).length, 0);
  assert.ok(bytes < 12 * 1024 * 1024);
});
function mesh(name) {
  const compressed = read(`public/atlas/${name}`), raw = gunzipSync(compressed);
  assert.equal(raw.subarray(0, 4).toString(), 'BNM4');
  const nv = raw.readUInt32LE(4), nf = raw.readUInt32LE(8);
  const decoded = decodeCompactSurface(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength));
  return { compressed, raw, nv, nf, ...decoded };
}
test('compact decoder rejects truncated data, invalid scale, normals and face indices', () => {
  const { raw, nv } = mesh(report.hemispheres.left.mesh);
  const buffer = () => raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength);
  assert.throws(() => decodeCompactSurface(buffer().slice(0, 15)), /header/);
  assert.throws(() => decodeCompactSurface(buffer().slice(0, -1)), /length/);
  let copy = buffer(); new DataView(copy).setFloat32(12, NaN, true);
  assert.throws(() => decodeCompactSurface(copy), /scale/);
  copy = buffer(); new Int8Array(copy, 16 + nv * 6, 3).fill(0);
  assert.throws(() => decodeCompactSurface(copy), /normal/);
  copy = buffer(); new DataView(copy).setUint32(Math.ceil((16 + nv * 11) / 4) * 4, nv, true);
  assert.throws(() => decodeCompactSurface(copy), /face index/);
});
for (const side of ['left', 'right']) test(`${side}: all 41 area IDs survive conversion, including distinct BA3 and BA33`, () => {
  const info = report.hemispheres[side], data = mesh(info.mesh);
  assert.equal(data.nv, 163842); assert.equal(data.nf, 327680);
  assert.equal(hash(data.compressed), info.sha256); assert.equal(hash(data.raw), info.rawSha256);
  const counts = {};
  for (const id of data.regions) { assert.ok(Number.isInteger(id) && id >= 0 && id <= 52); counts[id] = (counts[id] ?? 0) + 1; }
  assert.equal(counts[0], info.unlabelledVertices); delete counts[0];
  assert.deepEqual(counts, info.counts);
  assert.deepEqual(Object.keys(counts).map(Number).sort((a, b) => a - b), report.areaNumbers);
  assert.ok(counts[3] > 0 && counts[33] > 0);
  assert.equal(counts[34], undefined);
  const inflated = mesh(info.inflated.mesh);
  assert.equal(hash(inflated.compressed), info.inflated.sha256);
  assert.equal(hash(inflated.raw), info.inflated.rawSha256);
  assert.deepEqual(inflated.regions, data.regions);
  assert.deepEqual(inflated.faces, data.faces);
  assert.notEqual(hash(inflated.raw), hash(data.raw));
  // Inflated source hemispheres are each centred at zero. Their display
  // transforms must separate them and fit the renderer's default +/-96 frame.
  for (let i = 0; i < inflated.vertices.length; i += 3) {
    const x = inflated.vertices[i + 2], y = inflated.vertices[i + 1], z = inflated.vertices[i] + 16;
    assert.ok(side === 'left' ? x < 0 : x > 0);
    assert.ok(Math.max(Math.abs(x), Math.abs(y), Math.abs(z)) < 96);
  }
});
test('provenance pins original inputs and documents historic bilateral mapping rather than individual measurements', () => {
  assert.equal(hash(read('scripts/brodmann-source-lock.json')), report.sourceLockSha256);
  assert.equal(report.sourceSpace, 'fsaverage');
  assert.equal(report.expertReview, 'pending');
  for (const side of ['left', 'right']) assert.match(report.hemispheres[side].sourceMapName, /from colin RIGHT/);
  const notice = read('public/atlas/BRODMANN-FREESURFER-NOTICE.txt').toString();
  assert.match(notice, /All or portions of this licensed product/);
  assert.match(notice, /PART B\. DOWNLOADING AGREEMENT/);
  assert.match(notice, /8\. This Software License/);
});

const require = createRequire(import.meta.url);
const source = read('app/BrodmannExplorer.tsx').toString().replaceAll('import.meta.env.BASE_URL', '"/"');
const compiled = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } }).outputText;
const exports = {};
vm.runInNewContext(compiled, { exports, require: name => name === './AtlasVolumeCanvas' ? {
  AtlasVolumeCanvas: props => React.createElement('div', { 'data-renderer-atlas': props.surfaceAtlas, 'data-highlight-count': props.surfaceHighlights.length, 'data-highlight-colors': JSON.stringify(props.surfaceHighlights.map(layer => layer.color)),
    'data-hemisphere': props.hemisphere, 'data-cut-plane': props.showCutPlane, 'data-specimen-focus': props.showFocus }),
} : name === '../public/atlas/brodmann-surface.json' ? report : name.endsWith('.css') ? {} : require(name) });
test('both languages expose all area choices, six views and explicit source limitations', () => {
  for (const english of [false, true]) {
    const html = renderToStaticMarkup(React.createElement(exports.default, { english }));
    assert.equal((html.match(/data-brodmann-area=/g) ?? []).length, 41);
    assert.match(html, /data-renderer-atlas="brodmann"/);
    assert.match(html, /data-highlight-count="41"/);
    assert.match(html, /data-hemisphere="left"/);
    assert.match(html, /data-cut-plane="false"/);
    assert.match(html, /data-specimen-focus="false"/);
    assert.match(html, /BRODMANN-FREESURFER-NOTICE/);
    if (english) { assert.doesNotMatch(html, /[ぁ-んァ-ヶ一-龠]/u); assert.match(html, /Registration to BigBrain/); }
    else { assert.match(html, /専門家レビューは未実施/); assert.match(html, /膨張表示/); }
  }
});
test('area colour is finite, deterministic and does not alias BA3 to BA33', () => {
  for (const area of report.areaNumbers) assert.ok(exports.brodmannColor(area).every(value => Number.isInteger(value) && value >= 80 && value <= 255));
  assert.notDeepEqual(exports.brodmannColor(3), exports.brodmannColor(33));
});
test('Brodmann mode has a separate lazy loader and pauses existing pathway steppers', () => {
  const page = read('app/page.tsx').toString(), canvas = read('app/AtlasVolumeCanvas.tsx').toString();
  assert.match(page, /BrodmannExplorer=lazy/);
  assert.match(page, /selectedPathway==="basal-ganglia"&&!brodmannActive/);
  assert.match(page, /selectedPathway==="papez"&&!brodmannActive/);
  assert.match(canvas, /surfaceAtlas!=="mni"/);
  assert.match(canvas, /loadMesh\(surfaceAtlas==="brodmann-inflated"\?"brodmann-left-inflated":"brodmann-left"\)/);
});


test('renderer receives the same RGB bytes as the area swatches', () => {
  const html = renderToStaticMarkup(React.createElement(exports.default));
  const colors = JSON.parse(html.match(/data-highlight-colors="([^"]+)"/)[1].replaceAll('&quot;', '"'));
  assert.equal(colors.length, report.areaNumbers.length);
  for (const [index, area] of report.areaNumbers.entries()) {
    assert.deepEqual(colors[index], [...exports.brodmannColor(area)]);
    assert.ok(Math.max(...colors[index].map(value => value / 255)) > 0.8);
    assert.ok(html.includes(`background:rgb(${colors[index].join(',')})`));
  }
});
