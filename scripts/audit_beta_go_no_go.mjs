import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { auditLearnerProvenance } from "./audit_learner_provenance.mjs";
import { parseQuizGranularity } from "./audit_quiz_granularity.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
export const REPOSITORY_ROOT = path.resolve(SCRIPT_DIR, "..");
export const LEDGER_RELATIVE_PATH = "BETA_GO_NO_GO.json";
export const ROADMAP_RELATIVE_PATH = "BETA_ROADMAP.md";
export const PAGE_RELATIVE_PATH = "app/page.tsx";
export const PROVENANCE_RELATIVE_PATH = "public/atlas/structure-provenance.json";
export const LEARNER_PROVENANCE_RELATIVE_PATH = "src/learnerProvenance.mjs";
export const LEDGER_SCHEMA_VERSION = 1;
export const STATE_ENUM = Object.freeze([
  "proven-local",
  "partial-local",
  "expert-blocked",
  "administrator-blocked",
  "deployment-blocked",
]);
export const EXPECTED_SOURCE_COUNTS = Object.freeze({
  entryCount: 75,
  expertPendingCount: 75,
  quizTargetCount: 41,
  mappingCount: 222,
  resolvedMappingCount: 222,
});
export const EXPECTED_CRITERION_STATES = Object.freeze({
  "criterion-01-essential-structure-labels": "expert-blocked",
  "criterion-02-learning-target-integrity": "expert-blocked",
  "criterion-03-desktop-tablet-core-operations": "proven-local",
  "criterion-04-smartphone-core-operations": "partial-local",
  "criterion-05-payload-performance": "proven-local",
  "criterion-06-tests-build-and-public-routes": "deployment-blocked",
  "criterion-07-quiz-target-visibility": "expert-blocked",
  "criterion-08-expert-review-handoff": "proven-local",
  "criterion-09-public-rights-and-notices": "deployment-blocked",
  "criterion-10-feedback-operations": "administrator-blocked",
  "criterion-11-expert-required-scope-review": "expert-blocked",
  "criterion-12-publish-known-limitations": "deployment-blocked",
});
export const PHONE_CORE_CRITERION_ID = "criterion-04-smartphone-core-operations";
export const PHONE_CORE_REQUIRED_COMMITTED_EVIDENCE_REFS = Object.freeze([
  "PHONE_CORE_INTERACTION_AUDIT.md",
  "BLOCK_GUIDED_OBSERVATION_AUDIT.md",
  "scripts/audit_phone_core_interactions.mjs",
  "tests/phone-core-interaction-audit.test.mjs",
]);
export const PHONE_CORE_REQUIRED_LOCAL_ARTIFACT_PATH = "work/browser-audit/phone-core-interactions-v18-focus4-guided-2026-08-24.json";
export const ORTHOGONAL_CRITERION_ID = "criterion-02-learning-target-integrity";
export const ORTHOGONAL_REQUIRED_COMMITTED_EVIDENCE_REFS = Object.freeze([
  "ORTHOGONAL_REVIEW_BUNDLE_AUDIT.md",
  "scripts/build_orthogonal_review_bundle.py",
  "tests/orthogonal-review-bundle.test.mjs",
]);
export const ORTHOGONAL_REQUIRED_LOCAL_ARTIFACT_PATH = "work/anatomy-review/orthogonal-review-bundle-v3/manifest.json";

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function readText(rootDir, relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function readJson(rootDir, relativePath) {
  return JSON.parse(readText(rootDir, relativePath));
}

function isStableId(value) {
  return typeof value === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)+$/.test(value);
}

function isIsoDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

function isSafeRelativePath(value) {
  if (typeof value !== "string" || value.length === 0 || path.isAbsolute(value)) return false;
  const normalized = value.replaceAll("\\", "/");
  return normalized === value
    && !path.posix.isAbsolute(normalized)
    && !normalized.startsWith("./")
    && !normalized.split("/").includes("..");
}

export function extractRoadmapCriteria(markdown) {
  if (typeof markdown !== "string") throw new Error("roadmap must be text");
  const heading = "## β版 Go / No-Go";
  const start = markdown.indexOf(heading);
  if (start < 0) throw new Error(`could not find ${heading}`);
  const rest = markdown.slice(start + heading.length);
  const end = rest.search(/^##\s+/m);
  const section = end < 0 ? rest : rest.slice(0, end);
  return section
    .split(/\r?\n/)
    .map(line => line.match(/^- \[[ xX]\] (.+)$/)?.[1] ?? null)
    .filter(value => value !== null);
}

function parseNeurovascularQuizTargets(source) {
  const block = source.match(/const neurovascularQuizQuestions:NeurovascularQuizQuestion\[\]=\[(?<body>[\s\S]*?)\r?\n\];/);
  if (!block) throw new Error("could not locate neurovascularQuizQuestions in app/page.tsx");
  return [...block.groups.body.matchAll(/^\s*\{target:"([^"]+)"/gm)].map(match => match[1]);
}

function countQuotedValues(text) {
  return [...text.matchAll(/"([^"\\]*(?:\\.[^"\\]*)*)"/g)].length;
}

function captureLiteralArray(source, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const expression = new RegExp(`(?:export\\s+)?const\\s+${escaped}\\s*=\\s*Object\\.freeze\\(\\[(?<body>[\\s\\S]*?)\\]\\);`);
  const match = source.match(expression);
  if (!match) throw new Error(`could not locate ${name}`);
  return match.groups.body;
}

function countLiteralArrayValues(source, name) {
  return countQuotedValues(captureLiteralArray(source, name));
}

function captureLiteralObject(source, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const expression = new RegExp(`(?:export\\s+)?const\\s+${escaped}\\s*=\\s*Object\\.freeze\\(\\{(?<body>[\\s\\S]*?)\\r?\n\\}\\);`);
  const match = source.match(expression);
  if (!match) throw new Error(`could not locate ${name}`);
  return match.groups.body;
}

function countTopLevelObjectKeys(source, name) {
  return [...captureLiteralObject(source, name).matchAll(/^\s*(?:"[^"]+"|[A-Za-z][A-Za-z0-9_-]*)\s*:/gm)].length;
}

function countBlockLayers(source) {
  const body = captureLiteralObject(source, "LEARNER_BLOCK_LAYERS_BY_SPECIMEN");
  return [...body.matchAll(/:\s*\[([^\]]*)\]/g)]
    .reduce((total, match) => total + countQuotedValues(match[1]), 0);
}

function countNeurovascularMappings(source, keyCount) {
  const block = source.match(/const neurovascularMappings = (?<body>[\s\S]*?)\r?\n\r?\nconst freeRegionMappings/);
  if (!block) throw new Error("could not locate neurovascularMappings");
  const directCount = [...block.groups.body.matchAll(/\bdirect\(/g)].length;
  return keyCount * directCount;
}

function countPathwayMappings(source) {
  const block = source.match(/const pathwayMappings = \[(?<body>[\s\S]*?)\r?\n\];/);
  if (!block) throw new Error("could not locate pathwayMappings");
  return [...block.groups.body.matchAll(/\bfreezeMapping\(/g)].length;
}

/**
 * Count the generated mapping families from the learner mapping source. The
 * source intentionally builds mappings from literal inventories; counting
 * those inventories keeps this release ledger independent of prose claims.
 */
export function countLearnerMappingsFromSource(source) {
  if (typeof source !== "string") throw new Error("learner provenance source must be text");
  const sectionCount = countTopLevelObjectKeys(source, "sectionEntryByKey");
  const surfaceRegionCount = countLiteralArrayValues(source, "LEARNER_SURFACE_REGION_KEYS");
  const surfaceLandmarkCount = countTopLevelObjectKeys(source, "surfaceLandmarkEntryByKey");
  const deepCount = countTopLevelObjectKeys(source, "deepEntryByKey");
  const basalCount = countLiteralArrayValues(source, "LEARNER_SURFACE_BASAL_KEYS");
  const neurovascularKeyCount = countLiteralArrayValues(source, "LEARNER_NEUROVASCULAR_KEYS");
  const blockSpecimenCount = countLiteralArrayValues(source, "LEARNER_BLOCK_SPECIMEN_KEYS");
  const blockLayerCount = countBlockLayers(source);
  const freeBasalBlock = source.match(/const freeBasalMappings = (?<body>[\s\S]*?)\r?\n\r?\nexport const LEARNER_BLOCK_SPECIMEN_KEYS/);
  if (!freeBasalBlock) throw new Error("could not locate freeBasalMappings");
  const excludedBasalKeys = [...freeBasalBlock.groups.body.matchAll(/key !== "([^"]+)"/g)].length;
  const counts = {
    sectionCount,
    surfaceRegionCount,
    surfaceLandmarkCount,
    deepCount,
    basalCount,
    neurovascularCount: countNeurovascularMappings(source, neurovascularKeyCount),
    freeRegionCount: surfaceRegionCount,
    freeLandmarkCount: surfaceLandmarkCount,
    freeDeepCount: deepCount,
    freeBasalCount: basalCount - excludedBasalKeys,
    blockLayerCount,
    blockSpecimenCount,
    pathwayCount: countPathwayMappings(source),
  };
  return {
    ...counts,
    mappingCount: Object.values(counts).reduce((total, value) => total + value, 0),
  };
}

export function computeSourceCounts(rootDir = REPOSITORY_ROOT) {
  const provenance = readJson(rootDir, PROVENANCE_RELATIVE_PATH);
  const pageSource = readText(rootDir, PAGE_RELATIVE_PATH);
  const standardQuestions = parseQuizGranularity(pageSource);
  const neurovascularTargets = parseNeurovascularQuizTargets(pageSource);
  const quizTargets = new Set([
    ...standardQuestions.map(question => question.target),
    ...neurovascularTargets,
  ].filter(value => typeof value === "string" && value.length > 0));
  const learnerSource = readText(rootDir, LEARNER_PROVENANCE_RELATIVE_PATH);
  const staticMappingCount = countLearnerMappingsFromSource(learnerSource).mappingCount;
  const learnerAudit = auditLearnerProvenance({rootDir});
  const mappingCount = learnerAudit.summary?.mappingCount ?? staticMappingCount;
  const resolvedMappingCount = learnerAudit.summary?.resolvedCount ?? 0;
  return {
    entryCount: Array.isArray(provenance.entries) ? provenance.entries.length : 0,
    expertPendingCount: Array.isArray(provenance.entries)
      ? provenance.entries.filter(entry => entry?.expertReview === "pending").length
      : 0,
    quizTargetCount: quizTargets.size,
    mappingCount,
    resolvedMappingCount,
    staticMappingCount,
  };
}

function trackedPathSet(rootDir) {
  const result = spawnSync("git", ["ls-files", "-z"], {
    cwd: rootDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  if (result.status !== 0) return null;
  return new Set(result.stdout.split("\0").filter(Boolean));
}

function validateCommittedEvidenceRefs(item, index, rootDir, trackedPaths, errors) {
  if (!Array.isArray(item.committedEvidenceRefs) || item.committedEvidenceRefs.length === 0) {
    errors.push(`criteria[${index}].committedEvidenceRefs must contain at least one committed file`);
    return;
  }
  const seen = new Set();
  item.committedEvidenceRefs.forEach((ref, refIndex) => {
    const label = `criteria[${index}].committedEvidenceRefs[${refIndex}]`;
    if (!isSafeRelativePath(ref)) {
      errors.push(`${label} must be a safe repository-relative path`);
      return;
    }
    if (seen.has(ref)) errors.push(`${label} is duplicated`);
    seen.add(ref);
    if (ref === "work" || ref.startsWith("work/")) {
      errors.push(`${label} must not reference ignored work artifacts`);
      return;
    }
    const absolute = path.join(rootDir, ref);
    if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) errors.push(`${label} does not exist: ${ref}`);
    if (!trackedPaths || !trackedPaths.has(ref)) errors.push(`${label} is not tracked/committed: ${ref}`);
  });
}

function validateLocalArtifactRefs(item, index, errors) {
  if (item.localArtifactRefs === undefined) return;
  if (!Array.isArray(item.localArtifactRefs)) {
    errors.push(`criteria[${index}].localArtifactRefs must be an array when provided`);
    return;
  }
  const seenPaths = new Set();
  item.localArtifactRefs.forEach((artifact, artifactIndex) => {
    const label = `criteria[${index}].localArtifactRefs[${artifactIndex}]`;
    if (!isRecord(artifact)) {
      errors.push(`${label} must be an object`);
      return;
    }
    if (!isSafeRelativePath(artifact.path) || !artifact.path.startsWith("work/")) {
      errors.push(`${label}.path must be under work/`);
    }
    if (typeof artifact.path === "string") {
      if (seenPaths.has(artifact.path)) errors.push(`${label}.path is duplicated`);
      seenPaths.add(artifact.path);
    }
    if (artifact.localOnly !== true) errors.push(`${label}.localOnly must be true`);
    if (artifact.label !== undefined && artifact.label !== "local-only") errors.push(`${label}.label must be local-only`);
  });
}

function validatePhoneCoreCriterionEvidence(item, index, errors) {
  if (item.id !== PHONE_CORE_CRITERION_ID) return;
  const label = `criteria[${index}]`;
  const committedRefs = Array.isArray(item.committedEvidenceRefs) ? new Set(item.committedEvidenceRefs) : new Set();
  for (const requiredRef of PHONE_CORE_REQUIRED_COMMITTED_EVIDENCE_REFS) {
    if (!committedRefs.has(requiredRef)) {
      errors.push(`${label}.committedEvidenceRefs must include phone v18 evidence: ${requiredRef}`);
    }
  }
  const localArtifacts = Array.isArray(item.localArtifactRefs) ? item.localArtifactRefs : [];
  if (!localArtifacts.some(artifact => isRecord(artifact) && artifact.path === PHONE_CORE_REQUIRED_LOCAL_ARTIFACT_PATH)) {
    errors.push(`${label}.localArtifactRefs must include the exact phone v18 artifact path: ${PHONE_CORE_REQUIRED_LOCAL_ARTIFACT_PATH}`);
  }
}

const ORTHOGONAL_UNSUPPORTED_CLAIM_PATTERNS = Object.freeze([
  /\b(?:reviewed|verified|confirmed|approved|validated|completed|finalized|adopted)\b/gi,
  /(?:検証済み|確認済み|レビュー済み|承認済み|採用済み|専門家確認済み)/gi,
  /(?:解剖学的(?:妥当性|境界|採用)|anatomical\s+(?:validity|boundary|adoption))[^。\n]{0,32}(?:verified|confirmed|reviewed|approved|validated|検証済み|確認済み|確定|採用済み)/gi,
]);

function isNegatedClaim(text, start, end) {
  const before = text.slice(Math.max(0, start - 24), start).trim();
  const after = text.slice(end, end + 24).trim();
  return /(?:\b(?:not|never|without|no|un)\s*|未|非|無|ない|ず)$/i.test(before)
    || /^(?:ではない|でない|ではありません|では無い|not\b|unproven\b|未)/i.test(after);
}

function findUnsupportedOrthogonalClaim(text) {
  if (typeof text !== "string") return null;
  for (const pattern of ORTHOGONAL_UNSUPPORTED_CLAIM_PATTERNS) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (!isNegatedClaim(text, match.index, match.index + match[0].length)) return match[0];
      if (match[0].length === 0) pattern.lastIndex += 1;
    }
  }
  return null;
}

function validateOrthogonalCriterionEvidence(item, index, errors) {
  if (item.id !== ORTHOGONAL_CRITERION_ID) return;
  const label = `criteria[${index}]`;
  const committedRefs = Array.isArray(item.committedEvidenceRefs) ? new Set(item.committedEvidenceRefs) : new Set();
  for (const requiredRef of ORTHOGONAL_REQUIRED_COMMITTED_EVIDENCE_REFS) {
    if (!committedRefs.has(requiredRef)) {
      errors.push(`${label}.committedEvidenceRefs must include orthogonal review v3 evidence: ${requiredRef}`);
    }
  }
  const localArtifacts = Array.isArray(item.localArtifactRefs) ? item.localArtifactRefs : [];
  if (!localArtifacts.some(artifact => isRecord(artifact) && artifact.path === ORTHOGONAL_REQUIRED_LOCAL_ARTIFACT_PATH)) {
    errors.push(`${label}.localArtifactRefs must include the exact orthogonal review v3 manifest path: ${ORTHOGONAL_REQUIRED_LOCAL_ARTIFACT_PATH}`);
  }

  const claimText = [
    ...(Array.isArray(item.locallyProven) ? item.locallyProven : []),
    item.unprovenScope,
  ].filter(value => typeof value === "string").join("\n");
  if (!/review\.status\s*[:=]\s*unreviewed/i.test(claimText)) {
    errors.push(`${label}.locallyProven/unprovenScope must record orthogonal review.status=unreviewed`);
  }
  if (!/(?:解剖学的妥当性|anatomical\s+validity)[^。\n]{0,48}(?:未|unproven|not\s+(?:established|proven)|含まない|does\s+not)/i.test(claimText)
      || !/(?:境界|boundary)[^。\n]{0,48}(?:未|unproven|not\s+(?:established|proven)|含まない|does\s+not)/i.test(claimText)
      || !/(?:採用|adoption)[^。\n]{0,48}(?:未|unproven|not\s+(?:established|proven)|含まない|does\s+not)/i.test(claimText)) {
    errors.push(`${label}.locallyProven/unprovenScope must explicitly leave anatomical validity, boundaries, and adoption unproven`);
  }
  const unsupportedClaim = findUnsupportedOrthogonalClaim(claimText);
  if (unsupportedClaim) {
    errors.push(`${label}.locallyProven/unprovenScope contains unsupported orthogonal review claim: ${unsupportedClaim}`);
  }
}

const authorityPatternByState = Object.freeze({
  "expert-blocked": /expert|専門家|neuroanatom/i,
  "administrator-blocked": /administrator|管理者|運営|maintainer/i,
  "deployment-blocked": /deployment|deploy|公開|host|運用/i,
});

const passClaimPattern = /(?:public|global|expert|公開(?:URL|版|環境)?|専門家|全体)[^。\n]{0,32}(?:pass(?:ed)?|verified|approved|reviewed|complete(?:d)?|合格(?!扱いしていない|は主張していない)|検証済み|確認済み|承認済み|(?<!未)完了)/i;
const betaReadyPattern = /(?:β|beta)[^。\n]{0,24}(?:ready|準備完了|公開可能|公開可)/i;

function validateState(item, index, errors) {
  const label = `criteria[${index}]`;
    if (!STATE_ENUM.includes(item.state)) {
      errors.push(`${label}.state is not one of the stable Go/No-Go states`);
      return;
    }
  const expectedState = EXPECTED_CRITERION_STATES[item.id];
  if (expectedState && item.state !== expectedState) {
    errors.push(`${label}.state must remain ${expectedState} for ${item.id}`);
  }
  if (!Array.isArray(item.locallyProven) || item.locallyProven.length === 0 || item.locallyProven.some(claim => typeof claim !== "string" || claim.trim() === "")) {
    errors.push(`${label}.locallyProven must be a non-empty array of non-empty strings`);
  } else if (new Set(item.locallyProven).size !== item.locallyProven.length) {
    errors.push(`${label}.locallyProven contains duplicate claims`);
  }

  if (typeof item.unprovenScope !== "string" || item.unprovenScope.trim() === "") errors.push(`${label}.unprovenScope is required`);
  if (typeof item.nextAction !== "string" || item.nextAction.trim() === "") errors.push(`${label}.nextAction is required`);
  if (item.blockingAuthority !== null && (typeof item.blockingAuthority !== "string" || item.blockingAuthority.trim() === "")) {
    errors.push(`${label}.blockingAuthority must be null or non-empty text`);
  }
  if ((item.state === "proven-local" || item.state === "partial-local") && item.blockingAuthority !== null) {
    errors.push(`${label}: ${item.state} cannot name an external blocking authority`);
  }
  if (authorityPatternByState[item.state]) {
    if (typeof item.blockingAuthority !== "string" || !authorityPatternByState[item.state].test(item.blockingAuthority)) {
      errors.push(`${label}: ${item.state} requires a matching blockingAuthority`);
    }
  }
  const claimText = [item.unprovenScope, item.blockingAuthority, item.nextAction, ...(Array.isArray(item.locallyProven) ? item.locallyProven : [])]
    .filter(value => typeof value === "string").join("\n");
  const allClaimText = [item.criterionText, claimText].filter(value => typeof value === "string").join("\n");
  if (passClaimPattern.test(claimText) || betaReadyPattern.test(allClaimText)) {
    errors.push(`${label} contains an unsupported public/expert/global pass claim`);
  }
  if (item.state === "proven-local" && !/(未|not|unproven|pending|未確認|未完了)/i.test(item.unprovenScope)) {
    errors.push(`${label}: proven-local must state the remaining unproven scope`);
  }
  if (item.state === "proven-local" && !/(公開|public|expert|専門家|外部|物理|GPU|端末)/i.test(item.unprovenScope)) {
    errors.push(`${label}: proven-local must not imply global/public/expert proof`);
  }
}

export function auditBetaGoNoGo({ledger, rootDir = REPOSITORY_ROOT} = {}) {
  const errors = [];
  let loaded = ledger;
  if (loaded === undefined) {
    try {
      loaded = readJson(rootDir, LEDGER_RELATIVE_PATH);
    } catch (error) {
      return {ok: false, errors: [`could not read ${LEDGER_RELATIVE_PATH}: ${error.message}`], summary: {}};
    }
  }
  if (!isRecord(loaded)) return {ok: false, errors: ["Go/No-Go ledger root must be an object"], summary: {}};
  if (loaded.schemaVersion !== LEDGER_SCHEMA_VERSION) errors.push(`schemaVersion must be ${LEDGER_SCHEMA_VERSION}`);
  if (loaded.ledgerId !== "beta-go-no-go") errors.push("ledgerId must be beta-go-no-go");
  if (!isIsoDate(loaded.updated)) errors.push("updated must be a valid ISO date (YYYY-MM-DD)");
  if (loaded.roadmapRef !== ROADMAP_RELATIVE_PATH) errors.push(`roadmapRef must be ${ROADMAP_RELATIVE_PATH}`);
  if (JSON.stringify(loaded.stateEnum) !== JSON.stringify(STATE_ENUM)) errors.push("stateEnum drifted from the stable Go/No-Go state contract");

  let roadmapCriteria = [];
  try {
    roadmapCriteria = extractRoadmapCriteria(readText(rootDir, ROADMAP_RELATIVE_PATH));
  } catch (error) {
    errors.push(error.message);
  }
  if (roadmapCriteria.length !== 12) errors.push(`roadmap must contain exactly 12 Go/No-Go criteria, found ${roadmapCriteria.length}`);

  const criteria = Array.isArray(loaded.criteria) ? loaded.criteria : [];
  if (!Array.isArray(loaded.criteria)) errors.push("criteria must be an array");
  if (criteria.length !== 12) errors.push(`ledger must contain exactly 12 criteria, found ${criteria.length}`);
  const ids = new Set();
  const texts = new Set();
  const trackedPaths = trackedPathSet(rootDir);
  if (!trackedPaths) errors.push("could not inspect tracked committed evidence paths");
  criteria.forEach((item, index) => {
    const label = `criteria[${index}]`;
    if (!isRecord(item)) {
      errors.push(`${label} must be an object`);
      return;
    }
    if (!isStableId(item.id)) errors.push(`${label}.id must be a stable kebab-case id`);
    if (typeof item.id === "string") {
      if (ids.has(item.id)) errors.push(`duplicate criterion id: ${item.id}`);
      ids.add(item.id);
    }
    if (typeof item.criterionText !== "string" || item.criterionText.trim() === "") errors.push(`${label}.criterionText is required`);
    else {
      if (texts.has(item.criterionText)) errors.push(`duplicate criterion text at ${label}`);
      texts.add(item.criterionText);
      if (roadmapCriteria[index] !== item.criterionText) errors.push(`${label}.criterionText does not exactly match roadmap criterion ${index + 1}`);
    }
    validateState(item, index, errors);
    validateCommittedEvidenceRefs(item, index, rootDir, trackedPaths, errors);
    validateLocalArtifactRefs(item, index, errors);
    validatePhoneCoreCriterionEvidence(item, index, errors);
    validateOrthogonalCriterionEvidence(item, index, errors);
  });
  const expectedIds = Object.keys(EXPECTED_CRITERION_STATES);
  if (JSON.stringify([...ids].sort()) !== JSON.stringify([...expectedIds].sort())) {
    errors.push("ledger criterion ids do not exactly match the stable criterion contract");
  }
  if (criteria.length === roadmapCriteria.length) {
    const ledgerTexts = criteria.map(item => item?.criterionText);
    if (JSON.stringify([...new Set(ledgerTexts)].sort()) !== JSON.stringify([...new Set(roadmapCriteria)].sort())) {
      errors.push("ledger criterion text set does not exactly cover the roadmap");
    }
  }

  let sourceCounts = null;
  try {
    sourceCounts = computeSourceCounts(rootDir);
    if (sourceCounts.mappingCount !== sourceCounts.staticMappingCount) {
      errors.push(`source mapping count disagrees with static learner source count: ${sourceCounts.mappingCount} vs ${sourceCounts.staticMappingCount}`);
    }
    for (const [key, expected] of Object.entries(EXPECTED_SOURCE_COUNTS)) {
      if (sourceCounts[key] !== expected) errors.push(`source-derived ${key} must be ${expected}, found ${sourceCounts[key]}`);
      if (!isRecord(loaded.sourceCounts) || loaded.sourceCounts[key] !== sourceCounts[key]) {
        errors.push(`ledger sourceCounts.${key} does not match source-derived count ${sourceCounts[key]}`);
      }
    }
  } catch (error) {
    errors.push(`could not compute source-derived counts: ${error.message}`);
  }

  const stateCounts = Object.fromEntries(STATE_ENUM.map(state => [state, criteria.filter(item => item?.state === state).length]));
  return {
    ok: errors.length === 0,
    errors,
    summary: {criterionCount: criteria.length, stateCounts, sourceCounts},
    sourceCounts,
    roadmapCriteria,
    ledger: loaded,
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
  try {
    args = parseArgs(argv);
  } catch (error) {
    console.error(error.message);
    return 1;
  }
  if (args.help) {
    console.log("Usage: node scripts/audit_beta_go_no_go.mjs [--output path]");
    return 0;
  }
  const result = auditBetaGoNoGo();
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
