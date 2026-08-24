import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import {
  BLOCK_CONTEXT_SPECIMENS,
  createBlockContextState,
  isBlockContextSpecimen,
  shouldRenderBlockContext,
  transitionBlockContext,
} from "../src/blockContext.mjs";

const root = new URL("../", import.meta.url);
const page = await readFile(new URL("app/page.tsx", root), "utf8");
const canvas = await readFile(new URL("app/AtlasVolumeCanvas.tsx", root), "utf8");
const css = await readFile(new URL("app/canvas.css", root), "utf8");
const metadata = JSON.parse(await readFile(new URL("public/atlas/specimen-blocks.json", root), "utf8"));
const manifest = JSON.parse(await readFile(new URL("public/atlas/DATA-MANIFEST.json", root), "utf8"));
const expectedContext = {
  "lateral-ventricle": ["sagittal", 58],
  diencephalon: ["sagittal", 50],
  radiations: ["horizontal", 53],
  "commissural-system": ["sagittal", 50],
  "choroid-plexus": ["sagittal", 55],
  "medial-temporal": ["horizontal", 69],
  "midbrain-section": ["horizontal", 67],
  hindbrain: ["horizontal", 80],
};

function meshData(file) {
  const view = new DataView(file.buffer, file.byteOffset, file.byteLength);
  const magic = view.getUint32(0, false);
  assert.ok([0x424e4d31, 0x424e4d32, 0x424e4d33].includes(magic), "context mesh must use a supported BNM header");
  const vertices = view.getUint32(4, true);
  const declaredFaces = view.getUint32(8, true);
  const stride = magic === 0x424e4d33 ? 32 : magic === 0x424e4d32 ? 28 : 24;
  const storedFaces = (file.byteLength - 12 - vertices * stride) / 12;
  assert.ok(Number.isInteger(storedFaces), "context mesh length must align to complete triangle records");
  assert.ok(declaredFaces === storedFaces || declaredFaces === storedFaces * 3, "context mesh header must store face or triangle-index count");
  return { view, vertices, stride };
}

function bounds(mesh) {
  const low = [Infinity, Infinity, Infinity];
  const high = [-Infinity, -Infinity, -Infinity];
  for (let index = 0; index < mesh.vertices; index += 1) {
    for (let axis = 0; axis < 3; axis += 1) {
      const value = mesh.view.getFloat32(12 + index * mesh.stride + axis * 4, true);
      assert.ok(Number.isFinite(value), `mesh vertex ${index}/${axis} must be finite`);
      low[axis] = Math.min(low[axis], value);
      high[axis] = Math.max(high[axis], value);
    }
  }
  return { low, high };
}

function unionBounds(boxes) {
  return {
    low: [0, 1, 2].map(axis => Math.min(...boxes.map(box => box.low[axis]))),
    high: [0, 1, 2].map(axis => Math.max(...boxes.map(box => box.high[axis]))),
  };
}

function representativeCoordinate(plane, position) {
  const fraction = position / 100;
  if (plane === "sagittal") return -98 + 196.5 * fraction;
  if (plane === "horizontal") return 98.5 - 188.5 * fraction;
  return -116 + 232.5 * fraction;
}

function rendererRawAxis(plane) {
  return plane === "sagittal" ? 2 : plane === "horizontal" ? 0 : 1;
}

function assertRepresentativePlaneIntersects(box, plane, position) {
  const coordinate = representativeCoordinate(plane, position);
  const rawAxis = rendererRawAxis(plane);
  assert.ok(
    box.low[rawAxis] <= coordinate && coordinate <= box.high[rawAxis],
    `${plane} ${position} must intersect raw mesh axis ${rawAxis} after renderer conversion`,
  );
}

test("all eight configured specimens retain existing metadata and context assets", () => {
  assert.equal(metadata.version, 3);
  assert.deepEqual(BLOCK_CONTEXT_SPECIMENS, Object.keys(expectedContext));
  assert.deepEqual(Object.keys(metadata.specimens), BLOCK_CONTEXT_SPECIMENS);
  const group = manifest.groups.find(item => item.id === "specimen-block-assets");
  assert.ok(group, "specimen block DATA-MANIFEST group must exist");
  for (const [key, [plane, position]] of Object.entries(expectedContext)) {
    assert.match(page, new RegExp(`(?:${JSON.stringify(key)}|${key}):\\{name:[\\s\\S]*?plane:${JSON.stringify(plane)},position:${position}`));
    const parts = metadata.specimens[key].filter(part => part.material === "specimen");
    assert.equal(parts.length, key === "hindbrain" ? 3 : 1);
    for (const part of parts) {
      assert.ok(new RegExp(group.pattern).test(part.file), `${part.file} must be covered by DATA-MANIFEST`);
      assert.ok(["specimen-derived", "same-grid-segmentation", "teaching-segmentation"].includes(part.sourceType));
    }
  }
});

test("every finite context mesh overlaps the recorded whole-brain coordinate extent on each axis", async () => {
  const wholeFiles = ["pial-left.mesh", "pial-right.mesh", "segment-cerebellum.mesh", "segment-pons-medulla.mesh", "segment-midbrain.mesh"];
  const whole = unionBounds(await Promise.all(wholeFiles.map(file => readFile(new URL(`public/atlas/${file}`, root)).then(meshData).then(bounds))));
  for (const key of BLOCK_CONTEXT_SPECIMENS) {
    for (const part of metadata.specimens[key].filter(item => item.material === "specimen")) {
      const box = bounds(meshData(await readFile(new URL(`public/atlas/${part.file}`, root))));
      box.low.forEach((value, axis) => assert.ok(value <= whole.high[axis], `${part.file} starts beyond whole-brain axis ${axis}`));
      box.high.forEach((value, axis) => assert.ok(value >= whole.low[axis], `${part.file} ends before whole-brain axis ${axis}`));
    }
  }
});

test("lateral-ventricle remains strictly contained by the original bilateral pial extent", async () => {
  const [tissue, left, right] = await Promise.all([
    "block-lateral-ventricle-tissue.mesh", "pial-left.mesh", "pial-right.mesh",
  ].map(file => readFile(new URL(`public/atlas/${file}`, root)).then(meshData).then(bounds)));
  const pial = unionBounds([left, right]);
  tissue.low.forEach((value, axis) => assert.ok(value >= pial.low[axis] - .01, `lateral tissue low axis ${axis}`));
  tissue.high.forEach((value, axis) => assert.ok(value <= pial.high[axis] + .01, `lateral tissue high axis ${axis}`));
});

test("each existing representative plane intersects the union bbox on the renderer-mapped raw axis", async () => {
  for (const [key, [plane, position]] of Object.entries(expectedContext)) {
    const boxes = await Promise.all(metadata.specimens[key]
      .filter(part => part.material === "specimen")
      .map(part => readFile(new URL(`public/atlas/${part.file}`, root)).then(meshData).then(bounds)));
    assertRepresentativePlaneIntersects(unionBounds(boxes), plane, position);
  }
});

test("representative plane audit rejects an intersection on the wrong raw mesh axis", () => {
  const coordinate = representativeCoordinate("sagittal", 58);
  const wrongAxisOnly = { low: [coordinate - 1, -10, coordinate + 10], high: [coordinate + 1, 10, coordinate + 20] };
  assert.ok(wrongAxisOnly.low[0] <= coordinate && coordinate <= wrongAxisOnly.high[0], "fixture must overlap the wrong raw axis");
  assert.throws(() => assertRepresentativePlaneIntersects(wrongAxisOnly, "sagittal", 58), /raw mesh axis 2/);
});

test("context support is limited to the eight learner block specimens", () => {
  for (const specimen of BLOCK_CONTEXT_SPECIMENS) {
    assert.equal(isBlockContextSpecimen(specimen), true);
    const on = transitionBlockContext(createBlockContextState(), { type: "toggle", specimen });
    assert.equal(on.enabled, true);
    assert.equal(shouldRenderBlockContext({ workspace: "blocks", specimen, state: on }), true);
  }
  for (const specimen of [undefined, "unknown", "model-strategy-current-ventricles", "model-strategy-ventricle"]) {
    assert.equal(isBlockContextSpecimen(specimen), false);
    assert.equal(transitionBlockContext(createBlockContextState(), { type: "set-enabled", specimen, enabled: true }).enabled, false);
  }
});

test("entry, close, selection, and route restore reset OFF and whole without mutating specimen state", () => {
  const specimenRotation = { x: 3, y: 8, z: 1 };
  const specimenLayers = ["tissue", "thalamus"];
  const state = createBlockContextState({ specimenRotation, specimenLayers, specimenTissueMode: "ghost" });
  const on = transitionBlockContext(state, { type: "toggle", specimen: "hindbrain" });
  assert.equal(on.enabled, true);
  assert.strictEqual(on.specimenRotation, specimenRotation);
  assert.strictEqual(on.specimenLayers, specimenLayers);
  assert.equal(on.specimenTissueMode, "ghost");
  const section = transitionBlockContext(on, { type: "set-view", view: "section" });
  assert.equal(section.enabled, true);
  assert.equal(section.view, "section");
  for (const type of ["close", "enter-workspace", "leave-workspace", "select-specimen", "restore-route"]) {
    const reset = transitionBlockContext(section, { type });
    assert.equal(reset.enabled, false);
    assert.equal(reset.view, "whole");
    assert.strictEqual(reset.specimenRotation, specimenRotation);
    assert.strictEqual(reset.specimenLayers, specimenLayers);
    assert.equal(reset.specimenTissueMode, "ghost");
  }
  assert.equal(shouldRenderBlockContext({ workspace: "surface", specimen: "hindbrain", state: on }), false);
});

test("Canvas reuses one loaded part, merges multiple parts, and disposes the extra layer when off", () => {
  assert.match(canvas, /SPECIMEN_PARTS\[blockContext\]\.filter\(definition=>definition\.material===4\)/);
  assert.match(canvas, /Promise\.all\(definitions\.map\(definition=>loadMesh/);
  assert.match(canvas, /setBlockContextMesh\(parts\.length===1\?parts\[0\]:mergeMeshes\(parts\)\)/);
  assert.match(canvas, /if\(kind!=="surface"\|\|blockContext==="none"\|\|specimenBlock!=="none"\)\{setBlockContextMesh\(null\);return\}/);
  assert.match(canvas, /return\(\)=>\{active=false\}/);
  assert.match(canvas, /draw\(blockContextMesh,\[\.79,\.64,\.49,\.34\],4\)/);
  assert.match(canvas, /drawSurfaceShell\(\)/);
});

test("page wiring is data-driven and keeps route rotation, cut metadata, and specimen state isolated", () => {
  assert.doesNotMatch(page, /blockSpecimen==="lateral-ventricle"&&<div className="blockContextLauncher"/);
  assert.match(page, /blockContextVisible&&<section id="block-context-panel"/);
  assert.match(page, /plane=\{specimenLesson\.plane\} position=\{specimenLesson\.position\} focus=\{specimenLesson\.focus\}/);
  assert.match(page, /blockContext=\{blockSpecimen as BlockContextSpecimen\}/);
  assert.match(page, /showCutPlane=\{true\}/);
  assert.match(page, /blockContextView==="section"/);
  assert.match(page, /aria-controls="block-context-panel"/);
  assert.match(page, /useState<Rotation>\(\(\)=>\(\{\.\.\.blockInitialRotations\[initialBlockSpecimen\]\}\)\)/);
  assert.match(page, /setBlockContextRotation\(\{\.\.\.blockInitialRotations\[key\]\}\)/);
  assert.match(page, /transitionBlockContextState\(\{type:"restore-route"/);
  assert.match(page, /function moveBlockContext\(e:PointerEvent<HTMLDivElement>\)/);
  const markup = page.split('<section id="block-context-panel" className="blockContextPanel"')[1].split("</section>}")[0];
  assert.doesNotMatch(markup, /setRotation\(|setBlockLayers\(|setBlockTissueMode\(|setBlockViewPreset\(/);
});

test("controls retain fallback, cautious labels, focus return, and mobile sizing", () => {
  assert.match(page, /onWebGLUnavailableChange=\{setBlockContextWebglUnavailable\}/);
  assert.match(page, /位置目安・教材内代表断面/);
  assert.match(page, /全切断面、切断幅、摘出順、実習手順を再現するものではありません/);
  assert.match(page, /実標本の代替ではなく/);
  assert.match(page, /blockContextLauncherRef\.current\?\.focus\(\)/);
  assert.match(css, /\.blockContextLauncher button \{[^}]*min-height: 44px/);
  assert.match(css, /\.blockContextClose \{[^}]*min-height: 44px/);
  assert.match(css, /\.blockContextSwitch button \{[^}]*min-height: 44px/);
  assert.match(css, /@media\(max-width:760px\)\{\.learningGrid\.blockContext-active\{display:flex;flex-direction:column/);
  assert.match(css, /\.learningGrid\.blockContext-active \.blockContextPanel\{order:2\}/);
  assert.match(css, /\.learningGrid\.blockContext-active \.learningGuide\{order:3\}/);
});
