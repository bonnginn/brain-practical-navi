import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import {
  auditCurrentBetaSnapshot,
  deriveCurrentBetaSnapshot,
  SNAPSHOT_MARKER_BLOCK,
  SNAPSHOT_MARKER_DOCUMENTS,
  validateCurrentBetaSnapshot,
  validateSnapshotDocumentMarkers,
} from "../scripts/audit_current_beta_snapshot.mjs";

const root = new URL("../", import.meta.url);
const snapshot = JSON.parse(await readFile(new URL("BETA_CURRENT_SNAPSHOT.json", root), "utf8"));

test("current beta snapshot is derived from the checked-in authoritative contracts", () => {
  const expected = deriveCurrentBetaSnapshot();
  assert.deepEqual(snapshot, expected);
  const report = auditCurrentBetaSnapshot({snapshot});
  assert.equal(report.ok, true, report.errors.join("; "));
  assert.deepEqual(report.summary, {
    registryEntryCount: 75,
    mappingCount: 222,
    routeChecks: 162,
    pwaChecks: 20,
  });
});

test("snapshot records the current review, quiz, and route boundaries", () => {
  assert.deepEqual(snapshot.provenance.reviewFilterCounts, {surface: 54, sections: 16, blocks: 30, quiz: 22});
  assert.deepEqual(snapshot.provenance.learnerMappings, {total: 222, resolved: 222});
  assert.deepEqual(snapshot.quiz, {existingQuestionCount: 23, neurovascularPilotCount: 18, totalQuestionCount: 41});
  assert.deepEqual(snapshot.routes, {canonicalRouteCount: 27, viewportCount: 3, phaseCount: 2, expectedChecks: 162});
});

test("snapshot preserves exact Go/No-Go state strings and counts", () => {
  assert.equal(snapshot.goNoGo.criterionCount, 12);
  assert.deepEqual(snapshot.goNoGo.stateCounts, {
    "proven-local": 3,
    "partial-local": 1,
    "expert-blocked": 4,
    "administrator-blocked": 1,
    "deployment-blocked": 3,
  });
});

test("snapshot separates the PWA matrix and documented evidence from unverified scope", () => {
  assert.deepEqual(snapshot.pwa.matrix, {
    baseCount: 2,
    actionsPerBase: 10,
    expectedChecks: 20,
  });
  assert.deepEqual(snapshot.pwa.reportedEvidence, {
    document: "PWA_OFFLINE_AUDIT.md",
    date: "2026-08-24",
    scope: "local-runner",
    status: "documented-not-recomputed",
  });
  assert.deepEqual(snapshot.pwa.unverifiedScope, {
    physicalNetworkOrOsOffline: true,
    publicUrl: true,
    physicalDevice: true,
    installedPwaAndHomeScreenLaunch: true,
    safariOrOtherBrowser: true,
  });
});

test("snapshot keeps optic-pathway adoption boundaries explicit", () => {
  assert.deepEqual(snapshot.opticPathway.legacyId33, {
    legacyVolumeId33TargetExcluded: true,
    semanticOpticChiasmWrongOptionPresent: true,
    legacyEntryLearnerMappingCount: 0,
  });
  assert.deepEqual(snapshot.opticPathway.ids36To38, {
    status: "unsegmented",
    perId: {"36": {adopted: false}, "37": {adopted: false}, "38": {adopted: false}},
    anyAdopted: false,
    allAdopted: false,
    expertReviewPending: true,
  });
  assert.deepEqual(snapshot.opticPathway.ids39To40, {
    status: "adopted-project-reviewed",
    adopted: true,
    projectReview: "reviewed-by-project",
    expertReview: "pending",
    orthogonalBoundaryReviewPending: true,
  });
});

test("validator rejects provenance count mutations", () => {
  const mutated = structuredClone(snapshot);
  mutated.provenance.registryEntryCount += 1;
  mutated.provenance.reviewFilterCounts.surface -= 1;
  mutated.provenance.learnerMappings.resolved -= 1;
  const result = validateCurrentBetaSnapshot(mutated);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /registryEntryCount|reviewFilterCounts\.surface|learnerMappings\.resolved/);
});

test("validator rejects quiz and route mutations", () => {
  const mutated = structuredClone(snapshot);
  mutated.quiz.neurovascularPilotCount = 17;
  mutated.routes.expectedChecks = 160;
  const result = validateCurrentBetaSnapshot(mutated);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /neurovascularPilotCount|routes\.expectedChecks/);
});

test("validator rejects Go/No-Go state mutations", () => {
  const mutated = structuredClone(snapshot);
  mutated.goNoGo.stateCounts["expert-blocked"] = 3;
  mutated.goNoGo.stateCounts["proven-local"] = 4;
  const result = validateCurrentBetaSnapshot(mutated);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /expert-blocked|proven-local/);
});

test("validator rejects PWA matrix, evidence-status, and unverified-scope mutations", () => {
  const mutated = structuredClone(snapshot);
  mutated.pwa.matrix.expectedChecks = 19;
  mutated.pwa.reportedEvidence.status = "recomputed-pass";
  mutated.pwa.unverifiedScope.publicUrl = false;
  const result = validateCurrentBetaSnapshot(mutated);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /matrix\.expectedChecks|reportedEvidence\.status|publicUrl/);
});

test("validator rejects optic adoption and exclusion mutations", () => {
  const mutated = structuredClone(snapshot);
  mutated.opticPathway.legacyId33.legacyVolumeId33TargetExcluded = false;
  mutated.opticPathway.legacyId33.semanticOpticChiasmWrongOptionPresent = false;
  mutated.opticPathway.ids36To38.status = "adopted";
  mutated.opticPathway.ids39To40.expertReview = "expert-reviewed";
  const result = validateCurrentBetaSnapshot(mutated);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /legacyVolumeId33TargetExcluded|semanticOpticChiasmWrongOptionPresent|ids36To38\.status|ids39To40\.expertReview/);
});

test("cross-document marker guard rejects a missing or altered bounded block", () => {
  const documentTexts = Object.fromEntries(SNAPSHOT_MARKER_DOCUMENTS.map(document => [document, `heading\n${SNAPSHOT_MARKER_BLOCK}\nbody`]));
  assert.equal(validateSnapshotDocumentMarkers({documentTexts}).ok, true);

  const missing = {...documentTexts, [SNAPSHOT_MARKER_DOCUMENTS[0]]: "heading without marker"};
  const missingResult = validateSnapshotDocumentMarkers({documentTexts: missing});
  assert.equal(missingResult.ok, false);
  assert.match(missingResult.errors.join("\n"), new RegExp(SNAPSHOT_MARKER_DOCUMENTS[0].replaceAll(".", "\\.")));

  const altered = {...documentTexts, [SNAPSHOT_MARKER_DOCUMENTS[1]]: documentTexts[SNAPSHOT_MARKER_DOCUMENTS[1]].replace("dated historical evidence", "current evidence")};
  const alteredResult = validateSnapshotDocumentMarkers({documentTexts: altered});
  assert.equal(alteredResult.ok, false);
  assert.match(alteredResult.errors.join("\n"), /exact beta current snapshot marker block must appear once/);
});
