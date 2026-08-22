import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { createBlockContextState, shouldRenderBlockContext, transitionBlockContext } from "../src/blockContext.mjs";

const root = new URL("../", import.meta.url);
const page = await readFile(new URL("app/page.tsx", root), "utf8");
const canvas = await readFile(new URL("app/AtlasVolumeCanvas.tsx", root), "utf8");
const css = await readFile(new URL("app/canvas.css", root), "utf8");
const metadata = JSON.parse(await readFile(new URL("public/atlas/specimen-blocks.json", root), "utf8"));
const manifest = JSON.parse(await readFile(new URL("public/atlas/DATA-MANIFEST.json", root), "utf8"));

function meshData(file) {
  const view = new DataView(file.buffer, file.byteOffset, file.byteLength);
  const magic = view.getUint32(0, false);
  assert.ok([0x424e4d31, 0x424e4d32, 0x424e4d33].includes(magic), "context mesh must use a supported BNM header");
  const vertices = view.getUint32(4, true);
  const faces = view.getUint32(8, true);
  const stride = magic === 0x424e4d33 ? 32 : magic === 0x424e4d32 ? 28 : 24;
  assert.equal(file.byteLength, 12 + vertices * stride + faces * 12, "context mesh length must match header");
  return { view, vertices, faces, stride };
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

function assertSagittal58IntersectsRendererAxis(box) {
  const sagittal58Coordinate = -98 + 196.5 * (58 / 100);
  // The renderer converts raw mesh p=[axis0,axis1,axis2] to anatomy
  // q=[p.z,p.x,p.y]. Sagittal clipping uses anatomy axis 0, so the matching
  // raw mesh coordinate is axis 2—not whichever bbox axis happens to overlap.
  assert.ok(box.low[2] <= sagittal58Coordinate && sagittal58Coordinate <= box.high[2], "sagittal 58 cut coordinate must intersect raw mesh axis 2 after renderer conversion");
}

test("lateral-ventricle context keeps the recorded metadata and manifest asset", async () => {
  assert.equal(metadata.version, 3);
  assert.deepEqual(metadata.specimens["lateral-ventricle"].map(part => part.file), [
    "block-lateral-ventricle-tissue.mesh",
    "block-lateral-ventricle-ventricular-cavity.mesh",
    "block-lateral-ventricle-caudate.mesh",
    "block-lateral-ventricle-thalamus.mesh",
    "block-lateral-ventricle-hippocampus.mesh",
  ]);
  const tissue = metadata.specimens["lateral-ventricle"].find(part => part.part === "tissue");
  assert.equal(tissue.sourceType, "specimen-derived");
  assert.equal(tissue.material, "specimen");
  assert.equal(tissue.vertices, 34252);
  assert.equal(tissue.faces, 67900);
  assert.ok(manifest.groups.some(group => group.id === "specimen-block-assets" && new RegExp(group.pattern).test(tissue.file)));
  assert.match(page, /"lateral-ventricle":\{name:"側脳室の全景"[\s\S]*?plane:"sagittal",position:58/);
});

test("the recorded lateral-ventricle tissue is finite and remains inside the whole-brain surface extent", async () => {
  const [tissueFile, leftFile, rightFile] = await Promise.all([
    readFile(new URL("public/atlas/block-lateral-ventricle-tissue.mesh", root)),
    readFile(new URL("public/atlas/pial-left.mesh", root)),
    readFile(new URL("public/atlas/pial-right.mesh", root)),
  ]);
  const tissue = bounds(meshData(tissueFile));
  const whole = [bounds(meshData(leftFile)), bounds(meshData(rightFile))];
  const wholeLow = whole[0].low.map((value, axis) => Math.min(value, whole[1].low[axis]));
  const wholeHigh = whole[0].high.map((value, axis) => Math.max(value, whole[1].high[axis]));
  tissue.low.forEach((value, axis) => assert.ok(value >= wholeLow[axis] - 0.01, `tissue low axis ${axis} detached from whole brain`));
  tissue.high.forEach((value, axis) => assert.ok(value <= wholeHigh[axis] + 0.01, `tissue high axis ${axis} detached from whole brain`));
  assertSagittal58IntersectsRendererAxis(tissue);
});

test("the sagittal bbox audit rejects an intersection on the wrong raw mesh axis", () => {
  const sagittal58Coordinate = -98 + 196.5 * (58 / 100);
  const wrongAxisOnly = {low: [-100, -10, -40], high: [100, 10, 10]};
  assert.ok(wrongAxisOnly.low[0] <= sagittal58Coordinate && sagittal58Coordinate <= wrongAxisOnly.high[0], "fixture must overlap the renderer coordinate on a non-renderer raw axis");
  assert.throws(() => assertSagittal58IntersectsRendererAxis(wrongAxisOnly), /raw mesh axis 2/);
});

test("context is an opt-in lateral-ventricle-only layer with a representative cut plane", () => {
  assert.match(page, /const blockContextSpecimen:BlockContextSpecimen=BLOCK_CONTEXT_SPECIMEN/);
  assert.match(page, /const \[blockContextState,setBlockContextState\]=useState\(\(\)=>createBlockContextState\(\)\)/);
  assert.match(page, /blockSpecimen==="lateral-ventricle"&&blockContextVisible&&<section id="block-context-panel" className="blockContextPanel"/);
  assert.match(page, /blockContext=\{blockContextSpecimen\}/);
  assert.match(page, /plane=\{blockSpecimens\["lateral-ventricle"\]\.plane\}/);
  assert.match(page, /position=\{blockSpecimens\["lateral-ventricle"\]\.position\}/);
  assert.match(page, /showCutPlane=\{true\}/);
  assert.match(page, /blockContextView==="section"/);
  assert.match(page, /aria-controls="block-context-panel"/);
  assert.match(canvas, /loadMesh\(`block-\$\{blockContext\}-tissue`\)/);
  assert.match(canvas, /contextOverlay=blockContext!=="none"&&specimenBlock==="none"&&!!blockContextMesh/);
  assert.match(canvas, /draw\(blockContextMesh,\[\.79,\.64,\.49,\.34\],4\)/);
  assert.match(canvas, /drawSurfaceShell\(\)/);
});

test("context state transitions reset on entry, leave, specimen change, and history restore", () => {
  const specimenRotation = {x: 3, y: 8, z: 1};
  const specimenLayers = ["tissue", "thalamus"];
  const specimenState = createBlockContextState({specimenRotation, specimenLayers, specimenTissueMode: "ghost"});
  const on = transitionBlockContext(specimenState, {type: "toggle", specimen: "lateral-ventricle"});
  assert.equal(on.enabled, true);
  assert.equal(shouldRenderBlockContext({workspace: "blocks", specimen: "lateral-ventricle", state: on}), true);
  assert.strictEqual(on.specimenRotation, specimenRotation);
  assert.strictEqual(on.specimenLayers, specimenLayers);
  assert.equal(on.specimenTissueMode, "ghost");

  const section = transitionBlockContext(on, {type: "set-view", view: "section"});
  assert.equal(section.enabled, true);
  assert.equal(section.view, "section");
  const off = transitionBlockContext(section, {type: "close"});
  assert.equal(off.enabled, false);
  assert.equal(shouldRenderBlockContext({workspace: "blocks", specimen: "lateral-ventricle", state: off}), false);
  const reentered = transitionBlockContext(on, {type: "enter-workspace", workspace: "blocks"});
  assert.equal(reentered.enabled, false);
  const left = transitionBlockContext(on, {type: "leave-workspace", workspace: "surface"});
  assert.equal(left.enabled, false);
  const otherSpecimen = transitionBlockContext(on, {type: "select-specimen", specimen: "diencephalon"});
  assert.equal(otherSpecimen.enabled, false);
  const restored = transitionBlockContext(on, {type: "restore-route", workspace: "blocks", specimen: "lateral-ventricle"});
  assert.equal(restored.enabled, false);
  assert.equal(shouldRenderBlockContext({workspace: "blocks", specimen: "diencephalon", state: on}), false);
  assert.equal(shouldRenderBlockContext({workspace: "surface", specimen: "lateral-ventricle", state: on}), false);
});

test("context close, rotation, and view switching do not write specimen state", () => {
  const contextMarkup = page.split("<section id=\"block-context-panel\" className=\"blockContextPanel\"")[1].split("</section>}")[0];
  assert.doesNotMatch(contextMarkup, /setRotation\(/);
  assert.doesNotMatch(contextMarkup, /setBlockLayers\(|setBlockTissueMode\(|setBlockViewPreset\(/);
  assert.match(page, /function moveBlockContext\(e:PointerEvent<HTMLDivElement>\)/);
  assert.match(page, /setBlockContextRotation\(current=>/);
  assert.match(page, /transitionBlockContextState\(\{type:"select-specimen",specimen:key\}\)/);
  assert.match(page, /transitionBlockContextState\(\{type:"restore-route"/);
  assert.match(page, /blockContextVisible\?"位置表示を閉じる":"全脳で位置を確認"/);
  assert.match(page, /function closeBlockContext\(\)/);
  assert.match(page, /blockContextLauncherRef\.current\?\.focus\(\)/);
});

test("context controls retain WebGL fallback, disclaimers, and 44px mobile stacking", () => {
  assert.match(page, /onWebGLUnavailableChange=\{setBlockContextWebglUnavailable\}/);
  assert.match(page, /位置目安・教材内代表断面/);
  assert.match(page, /全切断面、切断幅、摘出順、実習手順を再現するものではありません/);
  assert.match(page, /実標本の代替ではなく/);
  assert.match(css, /\.blockContextLauncher button \{[^}]*min-height: 44px/);
  assert.match(css, /\.blockContextClose \{[^}]*min-height: 44px/);
  assert.match(css, /\.blockContextSwitch button \{[^}]*min-height: 44px/);
  assert.match(css, /@media\(max-width:760px\)\{\.learningGrid\.blockContext-active\{display:flex;flex-direction:column/);
  assert.match(css, /\.learningGrid\.blockContext-active \.blockContextPanel\{order:2\}/);
  assert.match(css, /\.learningGrid\.blockContext-active \.learningGuide\{order:3\}/);
  for (const key of ["diencephalon", "radiations", "commissural-system", "choroid-plexus", "medial-temporal", "midbrain-section", "hindbrain"]) {
    assert.doesNotMatch(page, new RegExp(`blockSpecimen===\\"${key}\\"&&blockContextEnabled`));
  }
});
