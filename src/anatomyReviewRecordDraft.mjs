import {isLegacyOpticEntry, isMammillaryEntry} from "./anatomyReviewQueue.mjs";

export const ANATOMY_REVIEW_RECORD_SCHEMA_VERSION = 1;
export const ANATOMY_REVIEW_RECORD_TYPE = "anatomy-review-record-draft";
export const ANATOMY_REVIEW_RECORD_STATUS = "local-unsubmitted-draft";
export const ANATOMY_REVIEW_RECORD_PRIVACY = "no-identity-or-contact-data-recorded";
export const ANATOMY_REVIEW_RECORD_STORAGE_PREFIX = "brain-practical-navi:anatomy-review-record-draft:v1:";
export const ANATOMY_REVIEW_RECORD_SOURCE_PATH = "public/atlas/structure-provenance.json";
export const ANATOMY_REVIEW_RECORD_SENTINEL_SCOPE = "not-selected";
export const ANATOMY_REVIEW_RECORD_CHECK_KEYS = Object.freeze([
  "anatomical-correspondence",
  "naming-and-laterality",
  "learner-facing-presentation",
]);
export const ANATOMY_REVIEW_RECORD_CHECK_LABELS = Object.freeze({
  "anatomical-correspondence": "解剖学的対応・位置",
  "naming-and-laterality": "名称・左右",
  "learner-facing-presentation": "学習者向けの表示",
});
export const ANATOMY_REVIEW_RECORD_OUTCOMES = Object.freeze([
  "not-assessed",
  "no-concern-observed",
  "concern-observed",
  "unable-to-assess",
]);
export const ANATOMY_REVIEW_RECORD_OUTCOME_LABELS = Object.freeze({
  "not-assessed": "未評価",
  "no-concern-observed": "この観察範囲では懸念を記録しない（承認・妥当性確認ではありません）",
  "concern-observed": "懸念あり（固定コードを選択）",
  "unable-to-assess": "判断できない・保留",
});
export const ANATOMY_REVIEW_RECORD_CONCERN_CODES = Object.freeze([
  "boundary-or-position",
  "laterality",
  "naming",
  "continuity-or-topology",
  "representation-source-mismatch",
  "visibility-or-occlusion",
  "learner-target-ambiguity",
  "source-evidence-insufficient",
]);
export const ANATOMY_REVIEW_RECORD_CONCERN_LABELS = Object.freeze({
  "boundary-or-position": "境界・位置",
  laterality: "左右",
  naming: "名称",
  "continuity-or-topology": "連続性・トポロジー",
  "representation-source-mismatch": "表示区分・由来の不一致",
  "visibility-or-occlusion": "視認性・遮蔽",
  "learner-target-ambiguity": "学習対象の曖昧さ",
  "source-evidence-insufficient": "根拠不足",
});
export const ANATOMY_REVIEW_RECORD_LOCK_REASONS = Object.freeze([
  "malformed-storage",
  "stale-source",
  "source-entry-missing",
  "source-entry-not-pending",
  "storage-conflict",
  "storage-read-failed",
  "storage-write-failed",
  "storage-remove-failed",
  "invalid-record",
]);

const DRAFT_KEYS = Object.freeze([
  "schemaVersion", "recordType", "privacy", "status", "sourceRegistry", "scope", "checks",
  "createdAt", "updatedAt", "adoptionDecision", "expertReviewStatus",
]);
const SOURCE_KEYS = Object.freeze(["path", "schemaVersion", "updated", "registrySha256", "entryKey", "entrySha256"]);
const SCOPE_KEYS = Object.freeze(["learnerSurface", "representation"]);
const CHECK_KEYS = Object.freeze(["key", "outcome", "concernCodes"]);

function isRecord(value) { return value !== null && typeof value === "object" && !Array.isArray(value); }
function exactKeys(value, expected) {
  if (!isRecord(value)) return false;
  const actual = Object.keys(value).sort(), sorted = [...expected].sort();
  return actual.length === sorted.length && actual.every((key, index) => key === sorted[index]);
}
function validIso(value) { return typeof value === "string" && Number.isFinite(Date.parse(value)) && value.includes("T"); }
function validSha256(value) { return typeof value === "string" && /^sha256:[0-9a-f]{64}$/.test(value); }

function canonicalValue(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") { if (!Number.isFinite(value)) throw new Error("canonical JSON cannot contain a non-finite number"); return value; }
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (isRecord(value)) return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalValue(value[key])]));
  throw new Error("canonical JSON cannot contain unsupported values");
}

export function canonicalAnatomyReviewJson(value) { return JSON.stringify(canonicalValue(value)); }
export async function sha256Canonical(value) {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error("Web Crypto SHA-256 is unavailable");
  const bytes = new TextEncoder().encode(canonicalAnatomyReviewJson(value));
  const digest = await subtle.digest("SHA-256", bytes);
  return `sha256:${[...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("")}`;
}

function findEntry(registry, entryKey) { return isRecord(registry) && Array.isArray(registry.entries) ? registry.entries.find(entry => entry?.key === entryKey) ?? null : null; }
function sourceEntryState(registry, entryKey) {
  const entry = findEntry(registry, entryKey);
  if (!entry) return {entry: null, reason: "source-entry-missing"};
  if (entry.expertReview !== "pending") return {entry, reason: "source-entry-not-pending"};
  if (isLegacyOpticEntry(entry) && (entry.excludedFromSectionAndQuizTargets !== true || entry.learnerSurfaces?.includes("sections") || entry.learnerSurfaces?.includes("quiz"))) return {entry, reason: "invalid-record"};
  if (isMammillaryEntry(entry) && (entry.projectReview !== "reviewed-by-project" || entry.expertReview !== "pending")) return {entry, reason: "invalid-record"};
  return {entry, reason: null};
}
async function currentSourceRegistry(registry, entryKey) {
  if (!isRecord(registry) || !Number.isInteger(registry.schemaVersion) || typeof registry.updated !== "string") throw new Error("provenance registry metadata is invalid");
  const {entry, reason} = sourceEntryState(registry, entryKey);
  if (reason) throw new Error(reason);
  return {path: ANATOMY_REVIEW_RECORD_SOURCE_PATH, schemaVersion: registry.schemaVersion, updated: registry.updated, registrySha256: await sha256Canonical(registry), entryKey, entrySha256: await sha256Canonical(entry)};
}
function sourceMatches(expected, actual) { return exactKeys(actual, SOURCE_KEYS) && SOURCE_KEYS.every(key => actual[key] === expected[key]); }
function sourceShapeValid(value) {
  return exactKeys(value, SOURCE_KEYS) && typeof value.path === "string" && Number.isInteger(value.schemaVersion) && typeof value.updated === "string" && typeof value.entryKey === "string" && validSha256(value.registrySha256) && validSha256(value.entrySha256);
}
function sourceActuallyDiffers(expected, actual) { return sourceShapeValid(actual) && !sourceMatches(expected, actual); }
function scopeValueAllowed(entry, key, value) {
  if (value === ANATOMY_REVIEW_RECORD_SENTINEL_SCOPE) return true;
  const values = key === "learnerSurface" ? entry?.learnerSurfaces : entry?.representations;
  return Array.isArray(values) && values.includes(value);
}
function countSummary(record) {
  const checks = Array.isArray(record?.checks) ? record.checks : [];
  return {
    scopeSelected: record?.scope?.learnerSurface !== ANATOMY_REVIEW_RECORD_SENTINEL_SCOPE && record?.scope?.representation !== ANATOMY_REVIEW_RECORD_SENTINEL_SCOPE,
    assessedCheckCount: checks.filter(check => check?.outcome !== "not-assessed").length,
    checkTotal: ANATOMY_REVIEW_RECORD_CHECK_KEYS.length,
    concernsRecorded: checks.some(check => check?.outcome === "concern-observed"),
  };
}
function emptyChecks() { return ANATOMY_REVIEW_RECORD_CHECK_KEYS.map(key => ({key, outcome: "not-assessed", concernCodes: []})); }

export function anatomyReviewRecordStorageKey(entryKey) {
  if (typeof entryKey !== "string" || entryKey.trim() === "") throw new Error("entryKey is required for per-entry storage");
  return `${ANATOMY_REVIEW_RECORD_STORAGE_PREFIX}${encodeURIComponent(entryKey)}`;
}

export function shouldApplyAnatomyReviewDraftRevision(completedRevision, latestRevision) {
  return Number.isInteger(completedRevision) && Number.isInteger(latestRevision) && completedRevision === latestRevision;
}

export function nextAnatomyReviewDraftRevision(currentRevision) {
  return Number.isSafeInteger(currentRevision) && currentRevision >= 0 ? currentRevision + 1 : 1;
}

export function anatomyReviewStorageSnapshotMatches(actual, expected) {
  return (actual ?? null) === (expected ?? null);
}

export async function createAnatomyReviewRecordDraft(registry, entryKey, now = new Date().toISOString()) {
  if (!validIso(now)) throw new Error("anatomy review record requires an ISO timestamp");
  const sourceRegistry = await currentSourceRegistry(registry, entryKey);
  return {schemaVersion: ANATOMY_REVIEW_RECORD_SCHEMA_VERSION, recordType: ANATOMY_REVIEW_RECORD_TYPE, privacy: ANATOMY_REVIEW_RECORD_PRIVACY, status: ANATOMY_REVIEW_RECORD_STATUS, sourceRegistry, scope: {learnerSurface: ANATOMY_REVIEW_RECORD_SENTINEL_SCOPE, representation: ANATOMY_REVIEW_RECORD_SENTINEL_SCOPE}, checks: emptyChecks(), createdAt: now, updatedAt: now, adoptionDecision: "not-recorded", expertReviewStatus: "not-claimed"};
}

export async function validateAnatomyReviewRecordDraft(value, registry) {
  const errors = [];
  let sourceMismatch = false;
  if (!exactKeys(value, DRAFT_KEYS)) errors.push("draft must contain only the fixed record fields");
  if (value?.schemaVersion !== ANATOMY_REVIEW_RECORD_SCHEMA_VERSION) errors.push("schemaVersion must be 1");
  if (value?.recordType !== ANATOMY_REVIEW_RECORD_TYPE) errors.push("recordType must be anatomy-review-record-draft");
  if (value?.privacy !== ANATOMY_REVIEW_RECORD_PRIVACY) errors.push("privacy sentinel is required");
  if (value?.status !== ANATOMY_REVIEW_RECORD_STATUS) errors.push("status must remain local-unsubmitted-draft");
  if (value?.adoptionDecision !== "not-recorded") errors.push("draft cannot record adoption");
  if (value?.expertReviewStatus !== "not-claimed") errors.push("draft cannot claim expert review");
  if (!validIso(value?.createdAt) || !validIso(value?.updatedAt)) errors.push("timestamps must be ISO dates");
  const entryKey = value?.sourceRegistry?.entryKey, {entry, reason} = sourceEntryState(registry, entryKey);
  if (reason === "source-entry-missing") errors.push("source entry is missing");
  else if (reason === "source-entry-not-pending") errors.push("source entry is not expert-pending");
  else if (reason) errors.push("source entry violates the protected review constraints");
  if (entry) {
    let expectedSource;
    try { expectedSource = await currentSourceRegistry(registry, entryKey); } catch (error) { errors.push(error.message); }
    if (!exactKeys(value?.sourceRegistry, SOURCE_KEYS)) errors.push("sourceRegistry must contain only the fixed source fields");
    if (!validSha256(value?.sourceRegistry?.registrySha256) || !validSha256(value?.sourceRegistry?.entrySha256)) errors.push("sourceRegistry fingerprints must use sha256:<64hex>");
    if (expectedSource && !sourceMatches(expectedSource, value?.sourceRegistry)) { errors.push("sourceRegistry does not match the current full registry and entry hashes"); sourceMismatch = sourceActuallyDiffers(expectedSource, value?.sourceRegistry); }
    if (!exactKeys(value?.scope, SCOPE_KEYS)) errors.push("scope must contain only learnerSurface and representation");
    if (!scopeValueAllowed(entry, "learnerSurface", value?.scope?.learnerSurface)) errors.push("scope.learnerSurface is not present on the bound entry");
    if (!scopeValueAllowed(entry, "representation", value?.scope?.representation)) errors.push("scope.representation is not present on the bound entry");
  }
  if (!Array.isArray(value?.checks) || value.checks.length !== ANATOMY_REVIEW_RECORD_CHECK_KEYS.length) errors.push("checks must contain the exact three fixed checks");
  else value.checks.forEach((check, index) => {
    const prefix = `checks[${index}]`;
    if (!exactKeys(check, CHECK_KEYS)) errors.push(`${prefix} has unexpected fields`);
    if (check?.key !== ANATOMY_REVIEW_RECORD_CHECK_KEYS[index]) errors.push(`${prefix}.key must preserve the fixed order`);
    if (!ANATOMY_REVIEW_RECORD_OUTCOMES.includes(check?.outcome)) errors.push(`${prefix}.outcome is invalid`);
    if (!Array.isArray(check?.concernCodes)) errors.push(`${prefix}.concernCodes must be an array`);
    else {
      if (new Set(check.concernCodes).size !== check.concernCodes.length) errors.push(`${prefix}.concernCodes must be unique`);
      for (const code of check.concernCodes) if (!ANATOMY_REVIEW_RECORD_CONCERN_CODES.includes(code)) errors.push(`${prefix}.concernCodes contains an unknown code`);
      if (check.outcome === "concern-observed" && check.concernCodes.length === 0) errors.push(`${prefix}.concernCodes are required for concern-observed`);
      if (check.outcome !== "concern-observed" && check.concernCodes.length !== 0) errors.push(`${prefix}.concernCodes must be empty unless concern-observed`);
    }
  });
  return {ok: errors.length === 0, errors, lockReason: errors.length ? classifyRecordLockReason(value, registry, sourceMismatch) : null};
}
function classifyRecordLockReason(value, registry, sourceMismatch = false) {
  const {reason} = sourceEntryState(registry, value?.sourceRegistry?.entryKey);
  if (reason) return reason;
  if (sourceMismatch) return "stale-source";
  return "invalid-record";
}

export async function inspectAnatomyReviewRecordStorage(serialized, registry, entryKey, now = new Date().toISOString()) {
  const storageKey = anatomyReviewRecordStorageKey(entryKey);
  if (typeof serialized !== "string") {
    try { return {state: "ready", draft: await createAnatomyReviewRecordDraft(registry, entryKey, now), storageKey, errors: []}; }
    catch (error) { return {state: "locked", draft: null, storageKey, reason: error.message, errors: [error.message]}; }
  }
  let parsed;
  try { parsed = JSON.parse(serialized); } catch { return {state: "locked", draft: null, storageKey, reason: "malformed-storage", errors: ["stored JSON is malformed and was left untouched"]}; }
  const validation = await validateAnatomyReviewRecordDraft(parsed, registry);
  if (validation.ok && parsed.sourceRegistry.entryKey === entryKey) return {state: "ready", draft: parsed, storageKey, errors: []};
  return {state: "locked", draft: null, storageKey, reason: validation.lockReason ?? "invalid-record", errors: validation.errors};
}

export function updateAnatomyReviewRecordScope(draft, learnerSurface, representation, now = new Date().toISOString()) {
  if (!validIso(now)) throw new Error("updatedAt must be an ISO timestamp");
  return {...draft, scope: {learnerSurface, representation}, updatedAt: now};
}
export function updateAnatomyReviewRecordCheck(draft, checkKey, outcome, concernCodes = [], now = new Date().toISOString()) {
  if (!ANATOMY_REVIEW_RECORD_CHECK_KEYS.includes(checkKey)) throw new Error("check key is invalid");
  if (!ANATOMY_REVIEW_RECORD_OUTCOMES.includes(outcome)) throw new Error("check outcome is invalid");
  if (!validIso(now)) throw new Error("updatedAt must be an ISO timestamp");
  return {...draft, checks: draft.checks.map(check => check.key === checkKey ? {...check, outcome, concernCodes: outcome === "concern-observed" ? [...concernCodes] : []} : check), updatedAt: now};
}

export async function buildAnatomyReviewRecordExport(draft, registry, exportedAt = new Date().toISOString()) {
  const validation = await validateAnatomyReviewRecordDraft(draft, registry);
  if (!validation.ok) throw new Error(validation.errors.join("; "));
  if (!validIso(exportedAt)) throw new Error("exportedAt must be an ISO timestamp");
  return {...draft, exportedAt, completeness: countSummary(draft), submissionStatus: "not-submitted", registryMatch: "current"};
}
export async function validateAnatomyReviewRecordExport(value, registry) {
  const errors = [], expectedKeys = [...DRAFT_KEYS, "exportedAt", "completeness", "submissionStatus", "registryMatch"];
  if (!exactKeys(value, expectedKeys)) errors.push("export must contain only the fixed record and export fields");
  const draft = Object.fromEntries(DRAFT_KEYS.map(key => [key, value?.[key]])), draftValidation = await validateAnatomyReviewRecordDraft(draft, registry);
  errors.push(...draftValidation.errors);
  if (!validIso(value?.exportedAt)) errors.push("exportedAt must be an ISO timestamp");
  if (value?.submissionStatus !== "not-submitted") errors.push("export cannot claim submission");
  if (value?.registryMatch !== "current") errors.push("registryMatch must remain current");
  const expectedCompleteness = countSummary(draft);
  if (!exactKeys(value?.completeness, Object.keys(expectedCompleteness))) errors.push("completeness must contain only derived fields");
  else for (const [key, expected] of Object.entries(expectedCompleteness)) if (value.completeness[key] !== expected) errors.push(`completeness.${key} must be derived from the record`);
  return {ok: errors.length === 0, errors, summary: expectedCompleteness, lockReason: draftValidation.lockReason};
}
