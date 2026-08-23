import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { BLOCK_PRIORITY_GROUPS } from "../src/blockPriority.mjs";
import { auditBlockGuidedObservation, auditBlockGuidedSource, REPOSITORY_ROOT } from "../scripts/audit_block_guided_observation.mjs";
import {
  BLOCK_GUIDED_SPECIMEN_KEYS,
  createBlockGuidedState,
  deriveBlockGuidedSteps,
  finishBlockGuidedObservation,
  firstBlockGuidedObservation,
  guidedStepLayers,
  moveBlockGuidedObservation,
  startBlockGuidedObservation,
  validateBlockGuidedSteps,
} from "../src/blockGuidedObservation.mjs";

const repositoryRoot = join(import.meta.dirname, "..");
const pageSource = readFileSync(join(repositoryRoot, "app", "page.tsx"), "utf8");
const routeSource = readFileSync(join(repositoryRoot, "scripts", "audit_beta_routes.mjs"), "utf8");
const auditScript = join(repositoryRoot, "scripts", "audit_block_guided_observation.mjs");

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Read only the existing layer records; the guide contract owns no lesson copy. */
function existingLessonLayers(specimenKey) {
  const key = escapeRegExp(specimenKey);
  const lessonMatch = pageSource.match(new RegExp(`(?:^|\\n)\\s*(?:"${key}"|${key}):\\{[\\s\\S]*?layers:\\[([\\s\\S]*?)\\]\\},`));
  assert.ok(lessonMatch, `existing blockSpecimens layer list missing for ${specimenKey}`);
  const layers = [...lessonMatch[1].matchAll(/\{key:"([^"]+)",name:"([^"]+)",latin:"[^"]+",color:"[^"]+",source:"([^"]+)",note:"([^"]+)"\}/g)]
    .map(([, layerKey, name, source, note]) => ({key: layerKey, name, source, note}));
  assert.ok(layers.length > 0, `existing blockSpecimens layer list empty for ${specimenKey}`);
  return layers;
}

const focusLayers = Object.fromEntries(BLOCK_GUIDED_SPECIMEN_KEYS.map(key => [key, existingLessonLayers(key)]));

test("guided contract is fixed to the exact four beta-focus specimen keys", () => {
  assert.deepEqual(BLOCK_GUIDED_SPECIMEN_KEYS, [
    "lateral-ventricle",
    "radiations",
    "choroid-plexus",
    "medial-temporal",
  ]);
  assert.throws(() => deriveBlockGuidedSteps("diencephalon", focusLayers["lateral-ventricle"]), /limited to beta-focus/);
  assert.throws(() => deriveBlockGuidedSteps("unknown", focusLayers["lateral-ventricle"]), /limited to beta-focus/);
});

test("each existing focus lesson derives single-layer steps in existing order and one exact final all step", () => {
  for (const specimenKey of BLOCK_GUIDED_SPECIMEN_KEYS) {
    const layers = focusLayers[specimenKey];
    const steps = deriveBlockGuidedSteps(specimenKey, layers);
    const result = validateBlockGuidedSteps({specimenKey, layers, steps});
    assert.equal(result.ok, true, `${specimenKey}: ${result.errors.join("; ")}`);
    assert.equal(steps.length, layers.length + 1);
    assert.deepEqual(steps.slice(0, -1).map(step => step.layerKeys), layers.map(layer => [layer.key]));
    assert.deepEqual(steps.at(-1).layerKeys, layers.map(layer => layer.key));
    assert.equal(steps.at(-1).name, layers.map(layer => layer.name).join("・"));
    assert.equal(steps.at(-1).note, layers.map(layer => layer.note).join(" "));
    assert.equal(steps.at(-1).source, [...new Set(layers.map(layer => layer.source))].join("・"));
  }
});

test("validator rejects duplicate, missing, empty-source, text-drift, and legacy guided targets", () => {
  const specimenKey = "lateral-ventricle";
  const layers = focusLayers[specimenKey];
  const steps = deriveBlockGuidedSteps(specimenKey, layers);

  const duplicate = [...steps];
  duplicate[1] = {...duplicate[0]};
  assert.equal(validateBlockGuidedSteps({specimenKey, layers, steps: duplicate}).ok, false);

  const missing = steps.slice(0, -2).concat(steps.at(-1));
  assert.equal(validateBlockGuidedSteps({specimenKey, layers, steps: missing}).ok, false);

  const emptySource = layers.map(layer => ({...layer}));
  emptySource[0].source = "  ";
  assert.equal(validateBlockGuidedSteps({specimenKey, layers: emptySource, steps}).ok, false);

  const textDrift = steps.map(step => ({...step}));
  textDrift.at(-1).note = "解剖学的な摘出順を示す";
  const textResult = validateBlockGuidedSteps({specimenKey, layers, steps: textDrift});
  assert.equal(textResult.ok, false);
  assert.ok(textResult.errors.some(error => /final step text/.test(error)));

  const legacyTarget = steps.map(step => ({...step, layerKeys: [...step.layerKeys]}));
  legacyTarget[0].key = "opticChiasm";
  assert.equal(validateBlockGuidedSteps({specimenKey, layers, steps: legacyTarget}).ok, false);
});

test("guide state saves manual layers, clamps navigation, and restores them on finish", () => {
  const specimenKey = "choroid-plexus";
  const layers = focusLayers[specimenKey];
  const initial = createBlockGuidedState();
  assert.equal(initial.active, false);
  assert.deepEqual(guidedStepLayers(initial), []);

  const started = startBlockGuidedObservation({specimenKey, layers, currentLayers: ["ventricular-cavity", "hippocampus"]});
  assert.equal(started.active, true);
  assert.equal(started.stageIndex, 0);
  assert.deepEqual(started.savedLayers, ["ventricular-cavity", "hippocampus"]);
  assert.deepEqual(guidedStepLayers(started), [layers[0].key]);

  const next = moveBlockGuidedObservation(started, 1);
  assert.equal(next.stageIndex, 1);
  assert.deepEqual(guidedStepLayers(next), [layers[1].key]);
  const first = firstBlockGuidedObservation(next);
  assert.equal(first.stageIndex, 0);
  const final = moveBlockGuidedObservation(started, 999);
  assert.equal(final.stageIndex, layers.length);
  assert.deepEqual(guidedStepLayers(final), layers.map(layer => layer.key));
  assert.equal(moveBlockGuidedObservation(final, 1).stageIndex, layers.length);

  const stopped = finishBlockGuidedObservation(final);
  assert.equal(stopped.active, false);
  assert.deepEqual(stopped.restoredLayers, ["ventricular-cavity", "hippocampus"]);
  assert.deepEqual(guidedStepLayers(stopped), []);
});

test("focus-only UI wiring is additive and keeps the existing Canvas/manual contracts", () => {
  const css = readFileSync(join(repositoryRoot, "app", "canvas.css"), "utf8");
  assert.match(pageSource, /BLOCK_GUIDED_SPECIMEN_KEYS/);
  assert.match(pageSource, /startBlockGuidedObservation\(\{specimenKey:blockGuidedSpecimenKey,layers:specimenLesson\.layers,currentLayers:blockLayers\}\)/);
  assert.match(pageSource, /setBlockLayers\(next\.active\?\[\.\.\.guidedStepLayers\(next\)\]:\[\.\.\.next\.restoredLayers\]\)/);
  assert.match(pageSource, /\{blockGuidedSpecimenKey&&<section className=\{"blockGuidedObservation"/);
  assert.equal(BLOCK_PRIORITY_GROUPS.development.specimenKeys.some(key => BLOCK_GUIDED_SPECIMEN_KEYS.includes(key)), false, "development4 must not enter the guided UI eligibility set");
  for (const label of ["部品を順に確認", "前へ", "次へ", "最初へ", "ガイドを終了"]) assert.match(pageSource, new RegExp(label));
  assert.match(pageSource, /finishBlockGuidedObservation/);
  assert.match(pageSource, /\[workspace,blockSpecimen\]/);
  assert.match(pageSource, /specimenLayers=\{blockLayers\}/);
  assert.match(pageSource, /rotation=\{rotation\}/);
  assert.doesNotMatch(pageSource, /blockGuidedSpecimenKey.*diencephalon/);
  assert.match(css, /\.blockGuidedObservation/);
  assert.match(css, /\.blockGuidedStep nav/);
});

test("independent guided-observation audit succeeds and CLI emits a passing JSON report", () => {
  const report = auditBlockGuidedObservation(REPOSITORY_ROOT);
  assert.equal(report.ok, true, report.errors.map(error => `${error.code}: ${error.message}`).join("\n"));
  assert.deepEqual(report.summary.focusKeys, ["lateral-ventricle", "radiations", "choroid-plexus", "medial-temporal"]);
  assert.deepEqual(report.summary.specimens.map(specimen => [specimen.key, specimen.layerCount, specimen.stepCount]), [
    ["lateral-ventricle", 4, 5],
    ["radiations", 7, 8],
    ["choroid-plexus", 3, 4],
    ["medial-temporal", 3, 4],
  ]);
  assert.equal(report.summary.browserVerification, "この静的監査コマンドは実ブラウザを実行しない");

  const cli = spawnSync(process.execPath, [auditScript], {encoding: "utf8", cwd: repositoryRoot});
  assert.equal(cli.status, 0, cli.stderr);
  assert.equal(JSON.parse(cli.stdout).ok, true);
});

test("independent audit rejects focus UI, layer-order, forbidden-text, and route mutations", () => {
  const unguarded = pageSource.replace("{blockGuidedSpecimenKey&&<section", "<section");
  const unguardedReport = auditBlockGuidedSource({source: unguarded, routeSource});
  assert.equal(unguardedReport.ok, false);
  assert.ok(unguardedReport.errors.some(error => error.code === "focus-only-ui"));

  const duplicateLayer = pageSource.replace('key:"auditory-radiation"', 'key:"putamen"');
  const duplicateReport = auditBlockGuidedSource({source: duplicateLayer, routeSource});
  assert.equal(duplicateReport.ok, false);
  assert.ok(duplicateReport.errors.some(error => error.code === "lesson-layer-order"));

  const forbiddenText = pageSource.replace("前角から下角まで連続する腔の形を示します。", "昇格順を示します。");
  const forbiddenReport = auditBlockGuidedSource({source: forbiddenText, routeSource});
  assert.equal(forbiddenReport.ok, false);
  assert.ok(forbiddenReport.errors.some(error => error.code === "prohibited-layer-text"));

  const missingRoute = routeSource.replace('hash: "#workspace/blocks/hindbrain"', 'hash: "#workspace/blocks/removed"');
  const routeReport = auditBlockGuidedSource({source: pageSource, routeSource: missingRoute});
  assert.equal(routeReport.ok, false);
  assert.ok(routeReport.errors.some(error => error.code === "route-contract"));
});
