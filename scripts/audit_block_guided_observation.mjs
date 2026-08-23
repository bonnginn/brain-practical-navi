#!/usr/bin/env node

/**
 * Independent static audit for the beta-focus block specimen walkthrough.
 *
 * The walkthrough is a UI ordering aid only. This audit derives its expected
 * steps from the existing lesson layer records and does not introduce or
 * judge geometry, segmentation, provenance, or anatomical order.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  BLOCK_GUIDED_SPECIMEN_KEYS,
  deriveBlockGuidedSteps,
  validateBlockGuidedSteps,
} from "../src/blockGuidedObservation.mjs";
import {
  BLOCK_PRIORITY_GROUPS,
  BLOCK_SPECIMEN_KEYS,
} from "../src/blockPriority.mjs";

const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
export const REPOSITORY_ROOT = path.resolve(SCRIPT_DIRECTORY, "..");
export const BLOCK_GUIDED_OBSERVATION_AUDIT_SCHEMA_VERSION = 1;

const EXPECTED_FOCUS_KEYS = Object.freeze([
  "lateral-ventricle",
  "radiations",
  "choroid-plexus",
  "medial-temporal",
]);
const EXPECTED_DEVELOPMENT_KEYS = Object.freeze([
  "diencephalon",
  "commissural-system",
  "midbrain-section",
  "hindbrain",
]);
const EXPECTED_FOCUS_LAYER_KEYS = Object.freeze({
  "lateral-ventricle": Object.freeze(["ventricular-cavity", "caudate", "thalamus", "hippocampus"]),
  radiations: Object.freeze(["putamen", "pallidum-external", "pallidum-internal", "internal-capsule", "corona-radiata", "optic-radiation", "auditory-radiation"]),
  "choroid-plexus": Object.freeze(["ventricular-cavity", "choroid-plexus", "hippocampus"]),
  "medial-temporal": Object.freeze(["hippocampus", "amygdala", "inferior-horn"]),
});
const SAFE_ORDERING_COPY = "UI上の確認順です。解剖・摘出の順序や実習手順を示しません。";
const PROHIBITED_GUIDE_TEXT = /(昇格|格上げ|promot(?:e|ed|es|ion)|dissection\s*(?:order|sequence)|anatomical\s*(?:dissection\s*)?(?:order|sequence))/i;

function sameArray(actual, expected) {
  return Array.isArray(actual)
    && actual.length === expected.length
    && actual.every((value, index) => value === expected[index]);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function addFailure(errors, code, message) {
  errors.push({ code, message });
}

function parseBlockSpecimenBody(source) {
  return source.match(/const blockSpecimens:Record<BlockSpecimenKey,BlockLesson>=\{(?<body>[\s\S]*?)\n\};/)?.groups?.body ?? "";
}

export function parseExistingBlockSpecimenKeys(source) {
  const body = parseBlockSpecimenBody(source);
  return [...body.matchAll(/^\s*(?:"([^"]+)"|([a-z][a-z0-9-]*)):\{name:/gm)].map(match => match[1] ?? match[2]);
}

/** Parse only the pre-existing layer records; no guide copy is maintained here. */
export function parseExistingBlockLessonLayers(source, specimenKey) {
  const body = parseBlockSpecimenBody(source);
  const key = escapeRegExp(specimenKey);
  const keyPattern = specimenKey.includes("-") ? `"${key}"` : `(?:"${key}"|${key})`;
  const layerBody = body.match(new RegExp(`(?:^|\\n)\\s*${keyPattern}:\\{[\\s\\S]*?layers:\\[([\\s\\S]*?)\\]\\},`))?.[1] ?? "";
  return [...layerBody.matchAll(/\{key:"([^"]+)",name:"([^"]+)",latin:"([^"]+)",color:"([^"]+)",source:"([^"]+)",note:"([^"]+)"\}/g)]
    .map(([, keyValue, name, latin, color, sourceValue, note]) => ({ key: keyValue, name, latin, color, source: sourceValue, note }));
}

function auditLessonSteps(source, errors, specimenKey) {
  const layers = parseExistingBlockLessonLayers(source, specimenKey);
  if (!layers.length) {
    addFailure(errors, "missing-lesson-layers", `${specimenKey} must expose its existing blockSpecimens layers`);
    return { specimenKey, layers, steps: [] };
  }
  if (!sameArray(layers.map(layer => layer.key), EXPECTED_FOCUS_LAYER_KEYS[specimenKey])) addFailure(errors, "lesson-layer-order", `${specimenKey} existing layer keys/order drifted`);
  let steps = [];
  try {
    steps = [...deriveBlockGuidedSteps(specimenKey, layers)];
  } catch (error) {
    addFailure(errors, "derive-failed", `${specimenKey} could not derive guided steps: ${error.message}`);
    return { specimenKey, layers, steps };
  }
  const validation = validateBlockGuidedSteps({ specimenKey, layers, steps });
  for (const message of validation.errors) addFailure(errors, "contract-validation", `${specimenKey}: ${message}`);

  const expectedSingleKeys = layers.map(layer => layer.key);
  const expectedFinal = {
    key: "all",
    layerKeys: expectedSingleKeys,
    name: layers.map(layer => layer.name).join("・"),
    note: layers.map(layer => layer.note).join(" "),
    source: [...new Set(layers.map(layer => layer.source))].join("・"),
    final: true,
  };
  if (steps.length !== layers.length + 1) addFailure(errors, "step-count", `${specimenKey} must have ${layers.length + 1} steps, got ${steps.length}`);
  for (const [index, layer] of layers.entries()) {
    const step = steps[index];
    if (!step || step.key !== layer.key || !sameArray(step.layerKeys, [layer.key]) || step.name !== layer.name || step.note !== layer.note || step.source !== layer.source || step.final !== false) {
      addFailure(errors, "single-step-drift", `${specimenKey} step ${index + 1} must be the existing layer ${layer.key} without copied text drift`);
    }
  }
  const final = steps.at(-1);
  if (!final || final.key !== expectedFinal.key || final.final !== true || !sameArray(final.layerKeys, expectedFinal.layerKeys) || final.name !== expectedFinal.name || final.note !== expectedFinal.note || final.source !== expectedFinal.source) {
    addFailure(errors, "final-step-drift", `${specimenKey} final step must derive all layer keys and text in existing order`);
  }
  for (const layer of layers) {
    if (PROHIBITED_GUIDE_TEXT.test([layer.name, layer.note, layer.source].join(" "))) addFailure(errors, "prohibited-layer-text", `${specimenKey} existing layer text contains a prohibited promotion/order claim`);
  }
  for (const step of steps) {
    if (PROHIBITED_GUIDE_TEXT.test([step.name, step.note, step.source].join(" "))) addFailure(errors, "prohibited-step-text", `${specimenKey} derived step text contains a prohibited promotion/order claim`);
  }
  return { specimenKey, layers, steps };
}

function requirePattern(source, errors, code, pattern, message) {
  if (!pattern.test(source)) addFailure(errors, code, message);
}

function auditStaticUiContract(source, routeSource, errors) {
  requirePattern(source, errors, "guided-import", /blockGuidedObservation\.mjs/, "page must import the separated guided-observation contract");
  requirePattern(source, errors, "guided-eligibility", /const blockGuidedSpecimenKey=\(\[\.\.\.BLOCK_GUIDED_SPECIMEN_KEYS\] as string\[\]\)\.includes\(blockSpecimen\)\?blockSpecimen as BlockGuidedSpecimenKey:null;/, "page must derive guide eligibility from the fixed focus keys");
  requirePattern(source, errors, "focus-only-ui", /\{blockGuidedSpecimenKey&&<section className=\{"blockGuidedObservation"/, "guided section must be rendered only when the current specimen is in focus4");
  requirePattern(source, errors, "safe-ordering-copy", new RegExp(escapeRegExp(SAFE_ORDERING_COPY)), "guide must state that its order is UI confirmation order, not anatomical/dissection order");
  requirePattern(source, errors, "start-off", /data-block-guided-status=\{blockGuidedActive\?"active":"off"\}/, "guide must expose an explicit inactive/off state");
  for (const marker of ["data-block-guided-start", "data-block-guided-first", "data-block-guided-previous", "data-block-guided-next", "data-block-guided-stop"]) {
    requirePattern(source, errors, "guide-control", new RegExp(marker), `guide control ${marker} is missing`);
  }
  requirePattern(source, errors, "final-display-name", /blockGuidedStep\.final\?"全ての部品":blockGuidedStep\.name/, "final display must use the short all-parts label");
  requirePattern(source, errors, "final-display-note", /blockGuidedStep\.final\?"既存の全レイヤーを表示中":blockGuidedStep\.note/, "final display must not show the long concatenated final note");
  requirePattern(source, errors, "step-layer-application", /setBlockLayers\(next\.active\?\[\.\.\.guidedStepLayers\(next\)\]:\[\.\.\.next\.restoredLayers\]\)/, "current guided step layerKeys must drive blockLayers and finish must restore them");
  requirePattern(source, errors, "manual-selection-save", /startBlockGuidedObservation\(\{specimenKey:blockGuidedSpecimenKey,layers:specimenLesson\.layers,currentLayers:blockLayers\}\)/, "guide start must save the current manual layer selection");
  requirePattern(source, errors, "cleanup-transition", /function chooseBlock\(key:BlockSpecimenKey[\s\S]*?\{stopBlockGuided\(\);/, "specimen switching must stop and restore the active guide");
  requirePattern(source, errors, "cleanup-workspace", /function openWorkspace\(key:WorkspaceMode\)\{if\(key!=="blocks"\)stopBlockGuided\(\);/, "leaving the block workspace must stop and restore the active guide");
  requirePattern(source, errors, "cleanup-unmount", /useEffect\(\(\)=>\(\)=>\{[\s\S]*?finishBlockGuidedObservation\(current\)[\s\S]*?\},\[workspace,blockSpecimen\]\);/, "workspace/specimen cleanup must finish the guide on transition and unmount");

  const canvasPattern = /<AtlasVolumeCanvas kind="surface" plane=\{specimenLesson\.plane\} position=\{specimenLesson\.position\} focus=\{specimenLesson\.focus\} display="specimen" rotation=\{rotation\} view="inside" contrast="bigbrain"[\s\S]*?specimenBlock=\{blockSpecimen\} specimenLayers=\{blockLayers\} specimenTissueMode=\{blockTissueMode\}/;
  requirePattern(source, errors, "canvas-contract", canvasPattern, "guided observation must preserve the existing specimen Canvas contract");
  requirePattern(source, errors, "manual-picker-contract", /function toggleBlockLayer\(key:string\)/, "existing manual layer controls must remain available outside the guide");
  requirePattern(source, errors, "context-contract", /blockContextVisible[\s\S]*?blockContextLauncher[\s\S]*?block-context-panel/, "existing block context route and panel contract must remain");
  if (/\b(?:priorityMesh|guidedMesh|voxelPatch|guidedVoxel)\b/.test(source)) addFailure(errors, "geometry-mutation", "guided observation must not add mesh or voxel fields");

  for (const key of BLOCK_SPECIMEN_KEYS) {
    const idPattern = new RegExp(String.raw`id:\s*["']blocks-${escapeRegExp(key)}["']`);
    const hashPattern = new RegExp(String.raw`hash:\s*["']#workspace/blocks/${escapeRegExp(key)}["']`);
    if (!idPattern.test(routeSource) || !hashPattern.test(routeSource)) addFailure(errors, "route-contract", `existing route inventory must retain blocks-${key}`);
  }
  if (!/const initialBlockSpecimen=typeof window==="undefined"\?"lateral-ventricle":blockSpecimenFromHash\(window\.location\.hash\)/.test(source)) addFailure(errors, "initial-specimen-contract", "initial specimen and direct route fallback must remain lateral-ventricle");
}

export function auditBlockGuidedSource({ source, routeSource }) {
  const errors = [];
  const lessonKeys = parseExistingBlockSpecimenKeys(source);
  if (!sameArray(lessonKeys, BLOCK_SPECIMEN_KEYS)) addFailure(errors, "existing-order-drift", `blockSpecimens order must remain ${BLOCK_SPECIMEN_KEYS.join(",")}; got ${lessonKeys.join(",")}`);
  if (!sameArray(BLOCK_PRIORITY_GROUPS.focus.specimenKeys, EXPECTED_FOCUS_KEYS)) addFailure(errors, "focus-priority-drift", "priority focus group drifted from the fixed roadmap four");
  if (!sameArray(BLOCK_PRIORITY_GROUPS.development.specimenKeys, EXPECTED_DEVELOPMENT_KEYS)) addFailure(errors, "development-priority-drift", "development group drifted from the fixed remaining four");
  if (!sameArray(BLOCK_GUIDED_SPECIMEN_KEYS, EXPECTED_FOCUS_KEYS)) addFailure(errors, "guided-key-drift", "guided contract must target the exact focus four");
  if (BLOCK_PRIORITY_GROUPS.development.specimenKeys.some(key => BLOCK_GUIDED_SPECIMEN_KEYS.includes(key))) addFailure(errors, "development-guided-leak", "development specimens must not be eligible for the guided UI");

  const specimenReports = EXPECTED_FOCUS_KEYS.map(specimenKey => auditLessonSteps(source, errors, specimenKey));
  for (const specimenKey of EXPECTED_DEVELOPMENT_KEYS) {
    const layers = parseExistingBlockLessonLayers(source, specimenKey);
    try {
      deriveBlockGuidedSteps(specimenKey, layers);
      addFailure(errors, "development-derived", `${specimenKey} must be rejected by the guided contract`);
    } catch {
      // Expected: development4 is intentionally outside the guided contract.
    }
  }
  auditStaticUiContract(source, routeSource, errors);
  return {
    schemaVersion: BLOCK_GUIDED_OBSERVATION_AUDIT_SCHEMA_VERSION,
    ok: errors.length === 0,
    errors,
    summary: {
      focusKeys: [...EXPECTED_FOCUS_KEYS],
      developmentKeys: [...EXPECTED_DEVELOPMENT_KEYS],
      specimens: specimenReports.map(report => ({
        key: report.specimenKey,
        layerCount: report.layers.length,
        stepCount: report.steps.length,
        singleStepKeys: report.steps.slice(0, -1).map(step => step.key),
        finalLayerKeys: report.steps.at(-1)?.layerKeys ?? [],
      })),
      finalStepPolicy: "single existing layer per step; final step all existing layers; UI displays short final label",
      orderingPolicy: "UI confirmation order only; not anatomical, dissection, or practical-training order",
      browserVerification: "この静的監査コマンドは実ブラウザを実行しない",
    },
  };
}

export function auditBlockGuidedObservation(root = REPOSITORY_ROOT) {
  const source = fs.readFileSync(path.join(root, "app/page.tsx"), "utf8");
  const routeSource = fs.readFileSync(path.join(root, "scripts/audit_beta_routes.mjs"), "utf8");
  return auditBlockGuidedSource({ source, routeSource });
}

function usage() {
  return [
    "Usage:",
    "  node scripts/audit_block_guided_observation.mjs [--output path]",
    "",
    "Audits the focus-four block layer walkthrough without browser or anatomical validation.",
  ].join("\n");
}

function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(usage());
    return;
  }
  const outputIndex = process.argv.indexOf("--output");
  const output = outputIndex >= 0 ? process.argv[outputIndex + 1] : null;
  const report = auditBlockGuidedObservation();
  const serialized = `${JSON.stringify(report, null, 2)}\n`;
  if (output) fs.writeFileSync(path.resolve(output), serialized, "utf8");
  process.stdout.write(serialized);
  if (!report.ok) process.exitCode = 1;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) main();
