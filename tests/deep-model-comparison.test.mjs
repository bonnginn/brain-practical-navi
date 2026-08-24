import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import assert from "node:assert/strict";
import { generateSchematicVentricleMesh, SCHEMATIC_FORMAT } from "../scripts/build_comparison_schematic_ventricle.mjs";

const root = new URL("../", import.meta.url);
const meshUrl = new URL("public/atlas/comparison-schematic-ventricle.mesh", root);
const evaluationUrl = new URL("model-comparison/deep-ventricle-evaluation.json", root);
const manifestUrl = new URL("public/atlas/DATA-MANIFEST.json", root);
const pageUrl = new URL("app/page.tsx", root);
const canvasUrl = new URL("app/AtlasVolumeCanvas.tsx", root);
const componentUrl = new URL("app/ModelStrategyComparison.tsx", root);

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function parseBnm2(bytes) {
  assert.equal(bytes.subarray(0, 4).toString("ascii"), "BNM2");
  const vertices = bytes.readUInt32LE(4);
  const faces = bytes.readUInt32LE(8);
  const faceOffset = 12 + vertices * 28;
  assert.equal(bytes.length, faceOffset + faces * 12);
  const values = new Float32Array(bytes.buffer, bytes.byteOffset + 12, vertices * 7);
  const indices = new Uint32Array(bytes.buffer, bytes.byteOffset + faceOffset, faces * 3);
  return { vertices, faces, values, indices };
}

test("schematic ventricle mesh is deterministic, lightweight, and label-free", async () => {
  const asset = await readFile(meshUrl);
  const generated = generateSchematicVentricleMesh();
  assert.deepEqual(generated, asset);
  const parsed = parseBnm2(asset);
  assert.equal(SCHEMATIC_FORMAT, "BNM2");
  assert.equal(parsed.vertices, 156);
  assert.equal(parsed.faces, 300);
  assert.ok(parsed.vertices < 500, "comparison asset should remain lightweight");
  assert.ok([...parsed.values].every(Number.isFinite), "vertices, normals, and shade values must be finite");
  assert.ok([...parsed.indices].every(index => index < parsed.vertices), "faces must reference existing vertices");
  const vertexValues = parsed.values.slice(0, parsed.vertices * 3);
  assert.ok(Math.min(...vertexValues) >= -30 && Math.max(...vertexValues) <= 30, "schematic bounds must be intentional");
  assert.equal(sha256(asset), "6bcf655746ed58175ebbc3ebb9068a5e82b8f52c14d5b9ce719987c415c19123");
});

test("comparison evaluation records exactly seven expert-pending dimensions", async () => {
  const evaluation = JSON.parse(await readFile(evaluationUrl, "utf8"));
  assert.equal(evaluation.status, "contributor-only-prototype");
  assert.equal(evaluation.optIn, true);
  assert.equal(evaluation.learnerRoutesChanged, false);
  assert.deepEqual(evaluation.dimensions.map(dimension => dimension.key), [
    "identification-ease",
    "spatial-relationships",
    "surface-quality",
    "rotation-readability",
    "detach-and-color-ease",
    "runtime-load",
    "authoring-revision-cost",
  ]);
  assert.equal(evaluation.dimensions.length, 7);
  for (const dimension of evaluation.dimensions) {
    assert.equal(dimension.expertJudgment.status, "pending");
    assert.equal(dimension.expertJudgment.A, null);
    assert.equal(dimension.expertJudgment.B, null);
    assert.deepEqual(dimension.scale, { min: 1, max: 5, unit: "ordinal", ...(dimension.scale.direction ? { direction: dimension.scale.direction } : {}) });
  }
  assert.equal(evaluation.review.expertJudgments, "pending");
});

test("B strategy is explicitly schematic, expert-unreviewed, and not specimen-derived", async () => {
  const evaluation = JSON.parse(await readFile(evaluationUrl, "utf8"));
  const strategy = evaluation.strategies.B;
  assert.equal(strategy.schematic, true);
  assert.equal(strategy.sourceType, "project-authored-schematic");
  assert.equal(strategy.expertReview.status, "pending");
  assert.equal(strategy.specimenDerived, false);
  assert.equal(strategy.learnerFacing, false);
  assert.match(strategy.displayNoticeJa, /模式3D/);
  assert.match(strategy.displayNoticeJa, /専門家未確認/);
  assert.match(strategy.displayNoticeJa, /実標本由来ではありません/);
  assert.ok(strategy.knownLimitationsJa.some(item => /連結部/.test(item)));
  assert.ok(strategy.knownLimitationsJa.some(item => /形態計測/.test(item)));
  assert.deepEqual(evaluation.task.labelIds, []);
  assert.deepEqual(evaluation.assetIntegrity.regionIds, []);
});

test("comparison mesh has exactly one explicit DATA-MANIFEST coverage group", async () => {
  const manifest = JSON.parse(await readFile(manifestUrl, "utf8"));
  const matching = manifest.groups.filter(group => new RegExp(group.pattern).test("comparison-schematic-ventricle.mesh"));
  assert.deepEqual(matching.map(group => group.id), ["contributor-comparison-prototype-assets"]);
  assert.match(matching[0].displayObligation, /schematic/);
  assert.match(matching[0].displayObligation, /expert-unreviewed/);
  assert.match(matching[0].displayObligation, /not specimen-derived/);
});

test("contributor comparison is opt-in, code-split, and has a durable contributor route", async () => {
  const page = await readFile(pageUrl, "utf8");
  assert.match(page, /lazy\(\(\)=>import\("\.\/ModelStrategyComparison"\)\)/);
  assert.match(page, /modelStrategyComparisonOpen&&<div id="model-strategy-comparison"/);
  assert.match(page, /workspace==="collaborate"/);
  assert.match(page, /MODEL_STRATEGY_ROUTE="#workspace\/collaborate\/model-strategy"/);
  assert.match(page, /modelStrategyFromHash\(window\.location\.hash\)/);
  assert.match(page, /updateScreenHistory\(MODEL_STRATEGY_ROUTE,"push"\)/);
  assert.match(page, /M2 · CONTRIBUTOR PILOT/);
  assert.match(page, /A\/B比較を開く/);
});

test("A and B share controls while B keeps its full provenance warning", async () => {
  const component = await readFile(componentUrl, "utf8");
  const canvas = await readFile(canvasUrl, "utf8");
  assert.match(component, /同じ観察課題・色・向き・表示操作/);
  assert.match(component, /Bは模式・専門家未確認です/);
  assert.match(component, /実標本由来、正解セグメンテーション、検証済み形状ではありません/);
  assert.match(component, /specimen:"model-strategy-current-ventricles"/);
  assert.match(component, /specimen:"model-strategy-ventricle"/);
  assert.match(component, /rotation=\{rotation\}/);
  assert.match(component, /specimenLayers=\{cavityVisible\?\["ventricular-cavity"\]:\[\]\}/);
  assert.match(canvas, /asset:"block-commissural-system-lateral-ventricles"/);
  assert.match(canvas, /asset:"block-diencephalon-third-ventricle"/);
  assert.match(canvas, /asset:"comparison-schematic-ventricle"/);
});

test("comparison review stays anonymous, local, export-only, and non-adoptive",async()=>{
  const component=await readFile(componentUrl,"utf8");
  assert.match(component,/LOCAL REVIEW DRAFT/);
  assert.match(component,/比較レビューを記録する/);
  assert.match(component,/個人情報は入力しないでください/);
  assert.match(component,/MODEL_STRATEGY_REVIEW_STORAGE_KEY/);
  assert.match(component,/localStorage\.setItem/);
  assert.match(component,/buildModelStrategyReviewExport/);
  assert.match(component,/JSONを端末へ書き出す/);
  assert.match(component,/送信・採用ではありません/);
  assert.doesNotMatch(component,/updateReview\(current=>[^\n]*event\.currentTarget/);
  assert.doesNotMatch(component,/fetch\(|XMLHttpRequest|mailto:/);
});
