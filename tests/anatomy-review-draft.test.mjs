import assert from "node:assert/strict";
import {readFile, mkdtemp, rm, writeFile} from "node:fs/promises";
import {join} from "node:path";
import {tmpdir} from "node:os";
import test from "node:test";
import {auditAnatomyReviewDraft} from "../scripts/audit_anatomy_review_record_draft.mjs";
import {deriveAnatomyReviewQueue, isLegacyOpticEntry, isMammillaryEntry} from "../src/anatomyReviewQueue.mjs";
import {ANATOMY_REVIEW_RECORD_CHECK_KEYS, ANATOMY_REVIEW_RECORD_CONCERN_CODES, ANATOMY_REVIEW_RECORD_LOCK_REASONS, ANATOMY_REVIEW_RECORD_OUTCOMES, ANATOMY_REVIEW_RECORD_PRIVACY, ANATOMY_REVIEW_RECORD_STORAGE_PREFIX, anatomyReviewRecordStorageKey, anatomyReviewStorageSnapshotMatches, buildAnatomyReviewRecordExport, canonicalAnatomyReviewJson, createAnatomyReviewRecordDraft, inspectAnatomyReviewRecordStorage, nextAnatomyReviewDraftRevision, sha256Canonical, shouldApplyAnatomyReviewDraftRevision, updateAnatomyReviewRecordCheck, updateAnatomyReviewRecordScope, validateAnatomyReviewRecordDraft, validateAnatomyReviewRecordExport} from "../src/anatomyReviewRecordDraft.mjs";

const root = new URL("../", import.meta.url);
const registry = JSON.parse(await readFile(new URL("public/atlas/structure-provenance.json", root), "utf8"));
const queue = deriveAnatomyReviewQueue(registry);
const entry = queue[0].entry;
const entryKey = entry.key;
const fixedNow = "2026-08-24T03:00:00.000Z";
const clone = value => structuredClone(value);
const [page, component, css, draftModule] = await Promise.all([
  readFile(new URL("app/page.tsx", root), "utf8"),
  readFile(new URL("app/AnatomyReviewRecordDraft.tsx", root), "utf8"),
  readFile(new URL("app/canvas.css", root), "utf8"),
  readFile(new URL("src/anatomyReviewRecordDraft.mjs", root), "utf8"),
]);

test("v1 is one anonymous, source-bound record with exact fixed checks", async () => {
  const record = await createAnatomyReviewRecordDraft(registry, entryKey, fixedNow);
  assert.equal(record.recordType, "anatomy-review-record-draft");
  assert.equal(record.privacy, ANATOMY_REVIEW_RECORD_PRIVACY);
  assert.equal(record.status, "local-unsubmitted-draft");
  assert.deepEqual(record.sourceRegistry, {
    path: "public/atlas/structure-provenance.json",
    schemaVersion: registry.schemaVersion,
    updated: registry.updated,
    registrySha256: await sha256Canonical(registry),
    entryKey,
    entrySha256: await sha256Canonical(entry),
  });
  assert.match(record.sourceRegistry.registrySha256, /^sha256:[0-9a-f]{64}$/);
  assert.match(record.sourceRegistry.entrySha256, /^sha256:[0-9a-f]{64}$/);
  assert.deepEqual(record.scope, {learnerSurface: "not-selected", representation: "not-selected"});
  assert.deepEqual(record.checks.map(check => check.key), ANATOMY_REVIEW_RECORD_CHECK_KEYS);
  assert.ok(record.checks.every(check => check.outcome === "not-assessed" && check.concernCodes.length === 0));
  assert.equal("submissionStatus" in record, false);
  assert.equal("name" in record, false);
  assert.equal("email" in record, false);
  assert.equal("role" in record, false);
  assert.equal("notes" in record, false);
  assert.equal((await validateAnatomyReviewRecordDraft(record, registry)).ok, true);
});

test("canonical hashing is recursive and scope can only select values on the bound entry", async () => {
  assert.equal(canonicalAnatomyReviewJson({b: 1, a: {d: 2, c: 3}}), '{"a":{"c":3,"d":2},"b":1}');
  let record = await createAnatomyReviewRecordDraft(registry, entryKey, fixedNow);
  record = updateAnatomyReviewRecordScope(record, entry.learnerSurfaces[0], entry.representations[0], "2026-08-24T03:01:00.000Z");
  assert.equal((await validateAnatomyReviewRecordDraft(record, registry)).ok, true);
  const badScope = clone(record); badScope.scope.learnerSurface = "sections-not-on-entry";
  assert.equal((await validateAnatomyReviewRecordDraft(badScope, registry)).ok, false);
});

test("revision and storage snapshot guards are deterministic and fail closed", () => {
  assert.equal(nextAnatomyReviewDraftRevision(0), 1);
  assert.equal(nextAnatomyReviewDraftRevision(nextAnatomyReviewDraftRevision(0)), 2);
  assert.equal(nextAnatomyReviewDraftRevision(-1), 1);
  assert.equal(shouldApplyAnatomyReviewDraftRevision(1, 1), true);
  assert.equal(shouldApplyAnatomyReviewDraftRevision(1, 2), false);
  assert.equal(shouldApplyAnatomyReviewDraftRevision(0, 0), true);
  assert.equal(shouldApplyAnatomyReviewDraftRevision(1.5, 1.5), false);
  assert.equal(anatomyReviewStorageSnapshotMatches(undefined, null), true);
  assert.equal(anatomyReviewStorageSnapshotMatches("A", "A"), true);
  assert.equal(anatomyReviewStorageSnapshotMatches("A", "B"), false);
  assert.deepEqual(ANATOMY_REVIEW_RECORD_LOCK_REASONS, [
    "malformed-storage", "stale-source", "source-entry-missing", "source-entry-not-pending",
    "storage-conflict", "storage-read-failed", "storage-write-failed", "storage-remove-failed", "invalid-record",
  ]);
});

test("checks require exact outcomes and concern codes only for concern-observed", async () => {
  let record = await createAnatomyReviewRecordDraft(registry, entryKey, fixedNow);
  record = updateAnatomyReviewRecordCheck(record, ANATOMY_REVIEW_RECORD_CHECK_KEYS[0], "concern-observed", ["naming"], "2026-08-24T03:01:00.000Z");
  record = updateAnatomyReviewRecordCheck(record, ANATOMY_REVIEW_RECORD_CHECK_KEYS[1], "no-concern-observed", [], "2026-08-24T03:02:00.000Z");
  assert.equal((await validateAnatomyReviewRecordDraft(record, registry)).ok, true);
  assert.deepEqual(ANATOMY_REVIEW_RECORD_OUTCOMES, ["not-assessed", "no-concern-observed", "concern-observed", "unable-to-assess"]);
  assert.equal(ANATOMY_REVIEW_RECORD_CONCERN_CODES.length, 8);
  const missingCode = clone(record); missingCode.checks[0].concernCodes = [];
  assert.equal((await validateAnatomyReviewRecordDraft(missingCode, registry)).ok, false);
  const strayCode = clone(record); strayCode.checks[1].concernCodes = ["naming"];
  assert.equal((await validateAnatomyReviewRecordDraft(strayCode, registry)).ok, false);
  const duplicateCode = clone(record); duplicateCode.checks[0].concernCodes = ["naming", "naming"];
  assert.equal((await validateAnatomyReviewRecordDraft(duplicateCode, registry)).ok, false);
  const wrongOrder = clone(record); wrongOrder.checks.reverse();
  assert.equal((await validateAnatomyReviewRecordDraft(wrongOrder, registry)).ok, false);
});

test("legacy ID33 and mammillary ID39/40 constraints remain protected", async () => {
  const legacy = queue.find(item => isLegacyOpticEntry(item.entry));
  const mammillary = queue.find(item => isMammillaryEntry(item.entry));
  assert.ok(legacy && mammillary);
  const legacyRecord = await createAnatomyReviewRecordDraft(registry, legacy.key, fixedNow);
  assert.equal((await validateAnatomyReviewRecordDraft(legacyRecord, registry)).ok, true);
  const badLegacy = clone(registry); badLegacy.entries.find(item => isLegacyOpticEntry(item)).learnerSurfaces.push("sections");
  await assert.rejects(() => createAnatomyReviewRecordDraft(badLegacy, legacy.key, fixedNow), /invalid-record/);
  const badMammillary = clone(registry); badMammillary.entries.find(item => isMammillaryEntry(item)).expertReview = "expert-reviewed";
  await assert.rejects(() => createAnatomyReviewRecordDraft(badMammillary, mammillary.key, fixedNow), /source-entry-not-pending/);
});

test("malformed and stale stored data stay untouched and lock editing", async () => {
  const malformed = "{not-json";
  const malformedResult = await inspectAnatomyReviewRecordStorage(malformed, registry, entryKey, fixedNow);
  assert.equal(malformedResult.state, "locked");
  assert.equal(malformedResult.reason, "malformed-storage");
  assert.equal(malformed, "{not-json");
  const valid = await createAnatomyReviewRecordDraft(registry, entryKey, fixedNow);
  const structurallyInvalid = clone(valid); structurallyInvalid.sourceRegistry.extra = "do-not-accept";
  const structuralValidation = await validateAnatomyReviewRecordDraft(structurallyInvalid, registry);
  assert.equal(structuralValidation.ok, false);
  assert.equal(structuralValidation.lockReason, "invalid-record");
  const staleRegistry = clone(registry); staleRegistry.updated = "2099-01-01";
  const staleResult = await inspectAnatomyReviewRecordStorage(JSON.stringify(valid), staleRegistry, entryKey, fixedNow);
  assert.equal(staleResult.state, "locked");
  assert.equal(staleResult.reason, "stale-source");
  const missingResult = await inspectAnatomyReviewRecordStorage(JSON.stringify(valid), {schemaVersion: 1, updated: "2026-08-24", entries: []}, entryKey, fixedNow);
  assert.equal(missingResult.state, "locked");
  assert.equal(missingResult.reason, "source-entry-missing");
  const nonPendingRegistry = clone(registry); nonPendingRegistry.entries.find(item => item.key === entryKey).expertReview = "expert-reviewed";
  const nonPendingResult = await inspectAnatomyReviewRecordStorage(JSON.stringify(valid), nonPendingRegistry, entryKey, fixedNow);
  assert.equal(nonPendingResult.state, "locked");
  assert.equal(nonPendingResult.reason, "source-entry-not-pending");
});

test("export derives bounded completeness and never claims submission, adoption, or expert completion", async () => {
  let record = await createAnatomyReviewRecordDraft(registry, entryKey, fixedNow);
  record = updateAnatomyReviewRecordScope(record, entry.learnerSurfaces[0], entry.representations[0], "2026-08-24T03:01:00.000Z");
  record = updateAnatomyReviewRecordCheck(record, ANATOMY_REVIEW_RECORD_CHECK_KEYS[0], "no-concern-observed", [], "2026-08-24T03:02:00.000Z");
  record = updateAnatomyReviewRecordCheck(record, ANATOMY_REVIEW_RECORD_CHECK_KEYS[1], "unable-to-assess", [], "2026-08-24T03:03:00.000Z");
  const exported = await buildAnatomyReviewRecordExport(record, registry, "2026-08-24T03:04:00.000Z");
  assert.deepEqual(exported.completeness, {scopeSelected: true, assessedCheckCount: 2, checkTotal: 3, concernsRecorded: false});
  assert.equal(exported.submissionStatus, "not-submitted");
  assert.equal(exported.registryMatch, "current");
  assert.equal((await validateAnatomyReviewRecordExport(exported, registry)).ok, true);
  const submitted = clone(exported); submitted.submissionStatus = "submitted";
  assert.equal((await validateAnatomyReviewRecordExport(submitted, registry)).ok, false);
  const drift = clone(exported); drift.completeness.assessedCheckCount = 3;
  assert.equal((await validateAnatomyReviewRecordExport(drift, registry)).ok, false);
  const draftSubmission = clone(record); draftSubmission.submissionStatus = "not-submitted";
  assert.equal((await validateAnatomyReviewRecordDraft(draftSubmission, registry)).ok, false);
});

test("standalone audit validates one record and exposes non-adoptive claims", async () => {
  const folder = await mkdtemp(join(tmpdir(), "brain-navi-anatomy-record-"));
  try {
    const input = join(folder, "record.json");
    const record = await createAnatomyReviewRecordDraft(registry, entryKey, fixedNow);
    const exported = await buildAnatomyReviewRecordExport(record, registry, "2026-08-24T03:05:00.000Z");
    await writeFile(input, JSON.stringify(exported), "utf8");
    const report = await auditAnatomyReviewDraft({inputPath: input, rootDir: process.cwd(), registry});
    assert.equal(report.validation.ok, true, report.validation.errors.join("; "));
    assert.equal(report.source.entryKey, entryKey);
    assert.deepEqual(report.claims, {submitted: false, adoptionDecided: false, expertReviewCompleted: false, provenanceMutated: false});
  } finally { await rm(folder, {recursive: true, force: true}); }
});

test("UI integration exposes only fixed choices and delete-only locked recovery", () => {
  assert.match(page, /AnatomyReviewRecordDraftCard/);
  assert.match(page, /const AnatomyReviewRecordDraftCard=lazy\(\(\)=>import\("\.\/AnatomyReviewRecordDraft"\)/);
  assert.match(page, /確認記録を読み込み中…[\s\S]*<AnatomyReviewRecordDraftCard/);
  assert.doesNotMatch(page, /reviewedCount|anatomyReviewDraftStorageState|AnatomyReviewDraftToolbar/);
  assert.match(draftModule, /この観察範囲では懸念を記録しない（承認・妥当性確認ではありません）/);
  assert.match(component, /端末内記録を消去して再開/);
  assert.match(component, /下書きを開く/);
  assert.match(component, /storage-conflict|storage-read-failed|storage-remove-failed/);
  assert.match(component, /operationRef|generationRef/);
  assert.match(component, /revisionRef|lastSerializedRef|storageSnapshotKnownRef/);
  assert.match(component, /navigator.*locks|storageLocks|locks\.request/);
  assert.match(component, /anatomyReviewStorageSnapshotMatches/);
  assert.match(component, /allowConflictRecovery/);
  assert.match(component, /懸念ありを選んだ項目では、懸念コードを1つ以上選んでください。/);
  assert.match(component, /storage-write-failed|storage-read-failed|storage-remove-failed/);
  assert.match(component, /氏名・連絡先・所属/);
  assert.match(component, /独立した教材開発/);
  assert.doesNotMatch(component, /textarea|name=|email=|affiliation|reviewerRole|notes/);
  assert.match(css, /\.anatomyReviewRecordChecks/);
  assert.match(css, /\.anatomyReviewRecordLocked/);
  assert.match(css, /\.anatomyReviewRecordDraft select/);
  assert.match(css, /\.anatomyReviewRecordLaunch/);
  assert.match(css, /\.anatomyReviewRecordDraft[^\n]*min-width: 0[^\n]*width: 100%/);
  assert.match(css, /\.anatomyReviewRecordDraft select[^\n]*width: 100%[^\n]*max-width: 100%[^\n]*min-width: 0/);
  assert.equal(anatomyReviewRecordStorageKey(entryKey), `${ANATOMY_REVIEW_RECORD_STORAGE_PREFIX}${encodeURIComponent(entryKey)}`);
});
