#!/usr/bin/env node

/**
 * Static audit for the learner-facing eight-specimen routing contract.
 *
 * The priority groups are a navigation aid. This audit deliberately does not
 * score specimen provenance, confidence, geometry, or expert-review status.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  BLOCK_PRIORITY_DISCLAIMER,
  BLOCK_PRIORITY_ENTRIES,
  BLOCK_PRIORITY_GROUPS,
  BLOCK_PRIORITY_GROUP_KEYS,
  BLOCK_SPECIMEN_KEYS,
  validateBlockPriorityContract,
} from "../src/blockPriority.mjs";

const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
export const REPOSITORY_ROOT = path.resolve(SCRIPT_DIRECTORY, "..");
export const BLOCK_PRIORITY_AUDIT_SCHEMA_VERSION = 1;

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

function sameArray(actual, expected) {
  return Array.isArray(actual)
    && actual.length === expected.length
    && actual.every((value, index) => value === expected[index]);
}

function addFailure(errors, code, message) {
  errors.push({ code, message });
}

function parseLessonKeys(source) {
  const block = source.match(/const blockSpecimens:Record<BlockSpecimenKey,BlockLesson>=\{(?<body>[\s\S]*?)\n\};/)?.groups?.body ?? "";
  return [...block.matchAll(/^\s*(?:"([^"]+)"|([a-z][a-z0-9-]*)):\{name:/gm)].map(match => match[1] ?? match[2]);
}

function auditStaticAppContract(source, routeSource, errors) {
  const lessonKeys = parseLessonKeys(source);
  if (!sameArray(lessonKeys, BLOCK_SPECIMEN_KEYS)) addFailure(errors, "existing-order-drift", `blockSpecimens order must remain ${BLOCK_SPECIMEN_KEYS.join(",")}; got ${lessonKeys.join(",")}`);
  if (!source.includes("const blockSpecimenKeys:BlockSpecimenKey[]=[...BLOCK_SPECIMEN_KEYS];")) addFailure(errors, "source-key-contract", "app must consume the fixed BLOCK_SPECIMEN_KEYS contract");

  if (!/function blockSpecimenFromHash\(hash:string\):BlockSpecimenKey\{[\s\S]*?blockSpecimenKeys\.includes\(candidate as BlockSpecimenKey\)\?candidate as BlockSpecimenKey:"lateral-ventricle"\}/.test(source)) {
    addFailure(errors, "initial-route-contract", "unknown or empty block route must retain lateral-ventricle as the initial fallback");
  }
  if (!/key==="blocks"\?blockSpecimen/.test(source) || !/function workspaceHash\(key:WorkspaceMode/.test(source)) addFailure(errors, "hash-contract", "block routes must continue to use #workspace/blocks/<key>");
  if (!/const initialBlockSpecimen=typeof window==="undefined"\?"lateral-ventricle":blockSpecimenFromHash\(window\.location\.hash\)/.test(source)) addFailure(errors, "initial-specimen-contract", "initial specimen must continue to come from the existing route/fallback");

  const requiredStatePatterns = [
    /const blockInitialRotations:Record<BlockSpecimenKey,Rotation>/,
    /setBlockLayers\(next\.layers\.map\(layer=>layer\.key\)\)/,
    /setRotation\(\{\.\.\.blockInitialRotations\[key\]\}\)/,
    /setBlockTissueMode\(next\.layers\.length\?"ghost":"solid"\)/,
    /function chooseBlock\(key:BlockSpecimenKey/,
  ];
  for (const pattern of requiredStatePatterns) if (!pattern.test(source)) addFailure(errors, "selection-state-contract", `existing selection state contract missing: ${pattern}`);

  const canvasPattern = /<AtlasVolumeCanvas kind="surface" plane=\{specimenLesson\.plane\} position=\{specimenLesson\.position\} focus=\{specimenLesson\.focus\} display="specimen" rotation=\{rotation\} view="inside" contrast="bigbrain"[\s\S]*?specimenBlock=\{blockSpecimen\} specimenLayers=\{blockLayers\} specimenTissueMode=\{blockTissueMode\}/;
  if (!canvasPattern.test(source)) addFailure(errors, "canvas-contract", "block Canvas must retain the existing plane/position/focus/camera/layer/mesh contract");
  if (!/layers:\[/.test(source) || !/color:"#[0-9a-fA-F]{6}"/.test(source)) addFailure(errors, "layer-contract", "existing block layer color/mesh contract is missing");
  if (!/plane:"(?:coronal|horizontal|sagittal)",position:\d+/.test(source)) addFailure(errors, "section-contract", "existing representative section contract is missing");
  if (!/specimenBlock=\{blockSpecimen\}/.test(source)) addFailure(errors, "mesh-contract", "existing specimen mesh selection must remain data-driven");
  if (/(?<!blockPriority)["'](?:voxelPatch|newMesh|priorityMesh)["']?\s*:/.test(source)) addFailure(errors, "geometry-mutation", "priority routing must not introduce voxel or mesh fields");
  for (const key of BLOCK_SPECIMEN_KEYS) {
    const idPattern = new RegExp(String.raw`id:\s*["']blocks-${key}["']`);
    const hashPattern = new RegExp(String.raw`hash:\s*["']#workspace/blocks/${key}["']`);
    if (!idPattern.test(routeSource) || !hashPattern.test(routeSource)) {
      addFailure(errors, "route-inventory-drift", `existing browser route must retain blocks-${key} at #workspace/blocks/${key}`);
    }
  }

  const groupRail = /BLOCK_PRIORITY_GROUP_KEYS\.map\(groupKey=>[\s\S]*?blockPriorityGroup-[^"`]+[\s\S]*?group\.specimenKeys\.map/;
  if (!groupRail.test(source)) addFailure(errors, "rail-group-contract", "left rail must render both fixed priority groups from the contract");
  if (!/blockPrioritySelection[\s\S]*?blockPriorityBadge[\s\S]*?BLOCK_PRIORITY_ENTRY_BY_KEY\[blockSpecimen\]\.reason/.test(source)) addFailure(errors, "selected-explanation-contract", "selected specimen explanation must show a small group badge and its routing reason");
  if (!source.includes("BLOCK_PRIORITY_DISCLAIMER")) addFailure(errors, "routing-disclaimer", "priority UI must display the routing-only disclaimer");
}

export function auditBlockPriority(root = REPOSITORY_ROOT) {
  const errors = [];
  const source = fs.readFileSync(path.join(root, "app/page.tsx"), "utf8");
  const routeSource = fs.readFileSync(path.join(root, "scripts/audit_beta_routes.mjs"), "utf8");
  const contract = {
    specimenKeys: [...BLOCK_SPECIMEN_KEYS],
    groupKeys: [...BLOCK_PRIORITY_GROUP_KEYS],
    groups: BLOCK_PRIORITY_GROUPS,
    entries: BLOCK_PRIORITY_ENTRIES,
    disclaimer: BLOCK_PRIORITY_DISCLAIMER,
  };
  const validation = validateBlockPriorityContract(contract);
  for (const message of validation.errors) addFailure(errors, "data-contract", message);
  if (!sameArray(BLOCK_PRIORITY_GROUPS.focus.specimenKeys, EXPECTED_FOCUS_KEYS)) addFailure(errors, "focus-set-drift", "β重点 must be the exact four fixed specimens");
  if (!sameArray(BLOCK_PRIORITY_GROUPS.development.specimenKeys, EXPECTED_DEVELOPMENT_KEYS)) addFailure(errors, "development-set-drift", "発展観察 must be the exact four remaining specimens");
  if (new Set(BLOCK_SPECIMEN_KEYS).size !== 8 || BLOCK_SPECIMEN_KEYS.length !== 8) addFailure(errors, "inventory-cardinality", "the learner inventory must contain eight unique specimens");
  auditStaticAppContract(source, routeSource, errors);
  return {
    schemaVersion: BLOCK_PRIORITY_AUDIT_SCHEMA_VERSION,
    ok: errors.length === 0,
    errors,
    summary: {
      specimenCount: BLOCK_SPECIMEN_KEYS.length,
      focusKeys: [...BLOCK_PRIORITY_GROUPS.focus.specimenKeys],
      developmentKeys: [...BLOCK_PRIORITY_GROUPS.development.specimenKeys],
      existingOrder: parseLessonKeys(source),
      routePattern: "#workspace/blocks/<existing-key>",
      initialSpecimen: "lateral-ventricle",
      canvasContract: "existing specimen plane/position/focus/rotation/layers/tissue mode",
    },
  };
}

function usage() {
  return [
    "Usage:",
    "  node scripts/audit_block_priority.mjs [--output path]",
    "",
    "Audits the fixed eight-specimen learner routing contract without judging anatomy or review status.",
  ].join("\n");
}

function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(usage());
    return;
  }
  const outputIndex = process.argv.indexOf("--output");
  const output = outputIndex >= 0 ? process.argv[outputIndex + 1] : null;
  const report = auditBlockPriority();
  const serialized = `${JSON.stringify(report, null, 2)}\n`;
  if (output) fs.writeFileSync(path.resolve(output), serialized, "utf8");
  process.stdout.write(serialized);
  if (!report.ok) process.exitCode = 1;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) main();
