import fs from "node:fs";
import path from "node:path";
import {fileURLToPath, pathToFileURL} from "node:url";

import {
  BETA_GO_NO_GO_STATE_ENUM,
  BETA_GO_NO_GO_STATE_LABELS,
  createBetaGoNoGoProjection,
} from "../src/betaGoNoGo.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
export const REPOSITORY_ROOT = path.resolve(SCRIPT_DIR, "..");
export const LEDGER_RELATIVE_PATH = "BETA_GO_NO_GO.json";
export const DISPLAY_RELATIVE_PATH = "app/beta-go-no-go-display.json";
export const PAGE_RELATIVE_PATH = "app/page.tsx";
export const CSS_RELATIVE_PATH = "app/canvas.css";
export const PROJECTION_ITEM_KEYS = Object.freeze([
  "id", "heading", "state", "stateLabel", "locallyProven", "unprovenScope", "nextAction",
]);
export const PROJECTION_GROUP_KEYS = Object.freeze(["state", "stateLabel", "items"]);
export const EXPECTED_STATE_COUNTS = Object.freeze({
  "proven-local": 3,
  "partial-local": 1,
  "expert-blocked": 4,
  "administrator-blocked": 1,
  "deployment-blocked": 3,
});
export const EXPECTED_HEADINGS = Object.freeze({
  "criterion-01-essential-structure-labels": "必修構造の表示区分",
  "criterion-02-learning-target-integrity": "学習対象の完全性",
  "criterion-03-desktop-tablet-core-operations": "PC・タブレット中心操作",
  "criterion-04-smartphone-core-operations": "スマートフォン中心操作",
  "criterion-05-payload-performance": "初回表示とデータ量",
  "criterion-06-tests-build-and-public-routes": "テスト・ビルド・公開経路",
  "criterion-07-quiz-target-visibility": "クイズ対象の可視性",
  "criterion-08-expert-review-handoff": "専門家レビュー引継ぎ",
  "criterion-09-public-rights-and-notices": "公開権利・利用条件",
  "criterion-10-feedback-operations": "フィードバック運用",
  "criterion-11-expert-required-scope-review": "必修範囲の専門家レビュー",
  "criterion-12-publish-known-limitations": "既知の制限公開",
});

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function readText(rootDir, relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function readJson(rootDir, relativePath) {
  return JSON.parse(readText(rootDir, relativePath));
}

function exactKeys(value, expected) {
  if (!isRecord(value)) return false;
  const actual = Object.keys(value).sort();
  const sorted = [...expected].sort();
  return actual.length === sorted.length && actual.every((key, index) => key === sorted[index]);
}

function nonEmptyText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function hasForbiddenReference(value) {
  return typeof value === "string" && (/(?:^|["'\s])work[\\/]/i.test(value) || /localArtifactRefs|committedEvidenceRefs|evidenceRefs/i.test(value));
}

function validateProjectionAgainstLedger(ledger, projection, errors) {
  if (!isRecord(ledger) || !Array.isArray(ledger.criteria)) {
    errors.push("ledger.criteria must be an array");
    return;
  }
  if (!isRecord(projection)) {
    errors.push("projection must be an object");
    return;
  }
  if (!exactKeys(projection, ["ledgerId", "updated", "itemCount", "stateCounts", "items", "groups"])) {
    errors.push("projection has unexpected or missing top-level fields");
    return;
  }
  if (projection.ledgerId !== ledger.ledgerId) errors.push("projection ledgerId does not match the ledger");
  if (projection.updated !== ledger.updated) errors.push("projection updated date does not match the ledger");
  if (projection.itemCount !== ledger.criteria.length) errors.push("projection itemCount does not match the ledger");
  if (!Array.isArray(projection.items) || projection.items.length !== ledger.criteria.length) {
    errors.push("projection must contain exactly one item per ledger criterion");
    return;
  }
  const expectedCounts = Object.fromEntries(BETA_GO_NO_GO_STATE_ENUM.map(state => [state, 0]));
  const expectedIds = [];
  const seenIds = new Set();
  ledger.criteria.forEach((criterion, index) => {
    if (!isRecord(criterion) || typeof criterion.id !== "string") {
      errors.push(`ledger criteria[${index}] is missing a stable id`);
      return;
    }
    expectedIds.push(criterion.id);
    if (seenIds.has(criterion.id)) errors.push(`ledger criterion id is duplicated: ${criterion.id}`);
    seenIds.add(criterion.id);
    const item = projection.items[index];
    if (!isRecord(item) || !exactKeys(item, PROJECTION_ITEM_KEYS)) {
      errors.push(`projection item ${criterion.id} has unexpected or missing fields`);
      return;
    }
    if (item.id !== criterion.id) errors.push(`projection item order/id mismatch at criteria[${index}]`);
    if (item.heading !== EXPECTED_HEADINGS[criterion.id]) errors.push(`projection heading is not fixed for ${criterion.id}`);
    if (!BETA_GO_NO_GO_STATE_ENUM.includes(item.state)) errors.push(`projection state is invalid for ${criterion.id}`);
    if (item.state !== criterion.state) errors.push(`projection state does not match the ledger for ${criterion.id}`);
    if (item.stateLabel !== BETA_GO_NO_GO_STATE_LABELS[item.state]) errors.push(`projection state label is invalid for ${criterion.id}`);
    if (!Array.isArray(item.locallyProven) || item.locallyProven.length === 0 || item.locallyProven.some(value => !nonEmptyText(value))) errors.push(`projection local proof is invalid for ${criterion.id}`);
    if (item.unprovenScope === undefined || !nonEmptyText(item.unprovenScope)) errors.push(`projection unproven scope is missing for ${criterion.id}`);
    if (item.nextAction === undefined || !nonEmptyText(item.nextAction)) errors.push(`projection next action is missing for ${criterion.id}`);
    if (JSON.stringify(item.locallyProven) !== JSON.stringify(criterion.locallyProven)) errors.push(`projection local proof does not match the ledger for ${criterion.id}`);
    if (item.unprovenScope !== criterion.unprovenScope) errors.push(`projection unproven scope does not match the ledger for ${criterion.id}`);
    if (item.nextAction !== criterion.nextAction) errors.push(`projection next action does not match the ledger for ${criterion.id}`);
    expectedCounts[item.state] += 1;
  });
  if (JSON.stringify(projection.stateCounts) !== JSON.stringify(expectedCounts)) errors.push("projection state counts are not independently derived from the ledger");
  if (JSON.stringify(expectedCounts) !== JSON.stringify(EXPECTED_STATE_COUNTS)) errors.push("ledger state counts drifted from the fixed five-state contract");
  if (!Array.isArray(projection.groups) || projection.groups.length !== BETA_GO_NO_GO_STATE_ENUM.length) {
    errors.push("projection must contain exactly five state groups");
  } else {
    const flattened = [];
    projection.groups.forEach((group, index) => {
      const state = BETA_GO_NO_GO_STATE_ENUM[index];
      if (!isRecord(group) || !exactKeys(group, PROJECTION_GROUP_KEYS)) {
        errors.push(`projection group ${state} has unexpected or missing fields`);
        return;
      }
      if (group.state !== state) errors.push(`projection groups must use the fixed state order at index ${index}`);
      if (group.stateLabel !== BETA_GO_NO_GO_STATE_LABELS[state]) errors.push(`projection group label is invalid for ${state}`);
      const expectedIdsForGroup = ledger.criteria.filter(criterion => criterion?.state === state).map(criterion => criterion.id);
      const actualIds = Array.isArray(group.items) ? group.items.map(item => item?.id) : [];
      if (JSON.stringify(actualIds) !== JSON.stringify(expectedIdsForGroup)) errors.push(`projection group membership is not derived from the ledger for ${state}`);
      if (actualIds.some(id => flattened.includes(id))) errors.push(`projection criterion is present in more than one state group: ${state}`);
      flattened.push(...actualIds);
    });
    if (JSON.stringify([...flattened].sort()) !== JSON.stringify([...expectedIds].sort())) errors.push("projection groups do not cover each criterion exactly once");
  }
  const serialized = JSON.stringify(projection);
  if (hasForbiddenReference(serialized) || serialized.includes("criterionText") || serialized.includes("japanese")) {
    errors.push("projection exposes ledger prose or local/work evidence references");
  }
}

function validateUiContract(rootDir, errors) {
  const page = readText(rootDir, PAGE_RELATIVE_PATH);
  const css = readText(rootDir, CSS_RELATIVE_PATH);
  if (!page.includes('import betaGoNoGoDisplay from "./beta-go-no-go-display.json";')) errors.push("page must import the generated safe display projection");
  if (page.includes('from "../BETA_GO_NO_GO.json"') || page.includes("createBetaGoNoGoProjection(betaGoNoGoLedger)")) errors.push("page must not bundle the private ledger source");
  const panelStart = page.indexOf("function BetaGoNoGoPanel");
  const panelEnd = page.indexOf("export default function Home", panelStart);
  if (panelStart < 0 || panelEnd < 0) {
    errors.push("page must define a dedicated Go/No-Go panel");
  } else {
    const panel = page.slice(panelStart, panelEnd);
    for (const marker of ["data-beta-go-no-go-ledger", "data-beta-go-no-go-state-count", "data-beta-go-no-go-group", "data-beta-go-no-go-id", "data-beta-go-no-go-field=\"locallyProven\"", "data-beta-go-no-go-field=\"unprovenScope\"", "data-beta-go-no-go-field=\"nextAction\""]) {
      if (!panel.includes(marker)) errors.push(`panel is missing ${marker}`);
    }
    if (/criterionText|localArtifactRefs|committedEvidenceRefs|evidenceRefs|work\//.test(panel)) errors.push("panel must not render ledger prose or local/work evidence paths");
    if (/(?:overall|total|pass(?:ed|rate)|ready|合格|公開可|公開可能|公開済み|β公開済み|専門家確認済み|expert complete)/i.test(panel)) errors.push("panel contains an overall readiness/publication claim");
  }
  if (!/\.betaGoNoGoGroups\s*\{[^}]*max-height:[^}]*overflow-y:\s*auto/s.test(css)) errors.push("Go/No-Go groups must have an internal scroll region");
  if (!/@media\(max-width:760px\)/.test(css) || !/\.betaGoNoGoGroups\{grid-template-columns:1fr;/.test(css)) errors.push("Go/No-Go groups must be one column on the phone layout");
  const detailsRule = css.match(/\.betaGoNoGoDetails summary\s*\{([^}]*)\}/s)?.[1] ?? "";
  const minHeight = Number(detailsRule.match(/min-height:\s*([0-9.]+)px/)?.[1]);
  if (!Number.isFinite(minHeight) || minHeight < 44) errors.push("Go/No-Go details control must be at least 44px");
}

export function auditBetaGoNoGoProjection({ledger, projection, rootDir = REPOSITORY_ROOT} = {}) {
  const errors = [];
  let loadedLedger = ledger;
  try {
    if (loadedLedger === undefined) loadedLedger = readJson(rootDir, LEDGER_RELATIVE_PATH);
  } catch (error) {
    return {ok: false, errors: [`could not read ${LEDGER_RELATIVE_PATH}: ${error.message}`], summary: {}};
  }
  let loadedProjection = projection;
  try {
    if (loadedProjection === undefined) loadedProjection = readJson(rootDir, DISPLAY_RELATIVE_PATH);
  } catch (error) {
    errors.push(`projection creation failed: ${error.message}`);
  }
  if (loadedProjection !== undefined) validateProjectionAgainstLedger(loadedLedger, loadedProjection, errors);
  try {
    validateUiContract(rootDir, errors);
  } catch (error) {
    errors.push(`could not inspect UI contract: ${error.message}`);
  }
  const counts = isRecord(loadedProjection) && isRecord(loadedProjection.stateCounts) ? loadedProjection.stateCounts : {};
  return {
    ok: errors.length === 0,
    errors,
    summary: {
      criterionCount: Array.isArray(loadedLedger?.criteria) ? loadedLedger.criteria.length : 0,
      groupCount: Array.isArray(loadedProjection?.groups) ? loadedProjection.groups.length : 0,
      stateCounts: counts,
      forbiddenEvidenceExposed: typeof loadedProjection === "object" && loadedProjection !== null && hasForbiddenReference(JSON.stringify(loadedProjection)),
    },
  };
}

function parseArgs(argv) {
  const args = {output: null, help: false};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help" || argument === "-h") args.help = true;
    else if (argument === "--output") {
      args.output = argv[++index];
      if (!args.output) throw new Error("--output requires a path");
    } else throw new Error(`unknown option: ${argument}`);
  }
  return args;
}

export function main(argv = process.argv.slice(2)) {
  let args;
  try { args = parseArgs(argv); } catch (error) { console.error(error.message); return 1; }
  if (args.help) {
    console.log("Usage: node scripts/audit_beta_go_no_go_projection.mjs [--output path]");
    return 0;
  }
  const result = auditBetaGoNoGoProjection();
  const output = JSON.stringify({generatedAt: new Date().toISOString(), ...result}, null, 2);
  console.log(output);
  if (args.output) {
    const outputPath = path.resolve(REPOSITORY_ROOT, args.output);
    fs.mkdirSync(path.dirname(outputPath), {recursive: true});
    fs.writeFileSync(outputPath, `${output}\n`, "utf8");
  }
  return result.ok ? 0 : 1;
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : "";
if (import.meta.url === invokedPath) process.exitCode = main();
