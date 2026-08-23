import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  auditBetaGoNoGo,
  PHONE_CORE_CRITERION_ID,
  PHONE_CORE_REQUIRED_COMMITTED_EVIDENCE_REFS,
  PHONE_CORE_REQUIRED_LOCAL_ARTIFACT_PATH,
  ORTHOGONAL_CRITERION_ID,
  ORTHOGONAL_REQUIRED_COMMITTED_EVIDENCE_REFS,
  ORTHOGONAL_REQUIRED_LOCAL_ARTIFACT_PATH,
  REPOSITORY_ROOT,
} from "../scripts/audit_beta_go_no_go.mjs";

const ledgerPath = `${REPOSITORY_ROOT}/BETA_GO_NO_GO.json`;
const baseLedger = JSON.parse(fs.readFileSync(ledgerPath, "utf8"));
const clone = value => JSON.parse(JSON.stringify(value));
const audit = ledger => auditBetaGoNoGo({ledger, rootDir: REPOSITORY_ROOT});

test("beta Go/No-Go ledger is valid, exact, and source-counted", () => {
  const result = audit(baseLedger);
  assert.equal(result.ok, true, result.errors.join("\n"));
  assert.equal(result.summary.criterionCount, 12);
  assert.deepEqual(result.summary.stateCounts, {
    "proven-local": 3,
    "partial-local": 1,
    "expert-blocked": 4,
    "administrator-blocked": 1,
    "deployment-blocked": 3,
  });
  assert.deepEqual(result.sourceCounts, {
    entryCount: 75,
    expertPendingCount: 75,
    quizTargetCount: 40,
    mappingCount: 222,
    resolvedMappingCount: 222,
    staticMappingCount: 222,
  });
});

test("audit rejects missing and duplicate criteria", () => {
  const missing = clone(baseLedger);
  missing.criteria.pop();
  const missingResult = audit(missing);
  assert.equal(missingResult.ok, false);
  assert.match(missingResult.errors.join("\n"), /exactly 12 criteria/);

  const duplicate = clone(baseLedger);
  duplicate.criteria[1].id = duplicate.criteria[0].id;
  const duplicateResult = audit(duplicate);
  assert.equal(duplicateResult.ok, false);
  assert.match(duplicateResult.errors.join("\n"), /duplicate criterion id/);
});

test("audit rejects criterion text drift and invalid state/blocker combinations", () => {
  const textDrift = clone(baseLedger);
  textDrift.criteria[0].criterionText += " 変更";
  const textResult = audit(textDrift);
  assert.equal(textResult.ok, false);
  assert.match(textResult.errors.join("\n"), /does not exactly match roadmap/);

  const badState = clone(baseLedger);
  badState.criteria[0].state = "proven-local";
  badState.criteria[0].locallyProven = ["ローカル確認"];
  badState.criteria[0].blockingAuthority = "neuroanatomy expert reviewer";
  const stateResult = audit(badState);
  assert.equal(stateResult.ok, false);
  assert.match(stateResult.errors.join("\n"), /cannot name an external blocking authority/);

  const unknownState = clone(baseLedger);
  unknownState.criteria[0].state = "approved-global";
  const unknownStateResult = audit(unknownState);
  assert.equal(unknownStateResult.ok, false);
  assert.match(unknownStateResult.errors.join("\n"), /stable Go\/No-Go states/);
});

test("audit rejects reassignment of a valid state to a different criterion", () => {
  const drift = clone(baseLedger);
  drift.criteria[0].state = "deployment-blocked";
  drift.criteria[0].blockingAuthority = "deployment operator";
  const result = audit(drift);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /state must remain expert-blocked/);
});

test("audit rejects boolean, empty, and duplicate local claims", () => {
  const booleanClaim = clone(baseLedger);
  booleanClaim.criteria[0].locallyProven = true;
  const booleanResult = audit(booleanClaim);
  assert.equal(booleanResult.ok, false);
  assert.match(booleanResult.errors.join("\n"), /non-empty array of non-empty strings/);

  const emptyClaim = clone(baseLedger);
  emptyClaim.criteria[0].locallyProven = [];
  const emptyResult = audit(emptyClaim);
  assert.equal(emptyResult.ok, false);
  assert.match(emptyResult.errors.join("\n"), /non-empty array of non-empty strings/);

  const duplicateClaim = clone(baseLedger);
  duplicateClaim.criteria[0].locallyProven = ["同じローカル確認", "同じローカル確認"];
  const duplicateResult = audit(duplicateClaim);
  assert.equal(duplicateResult.ok, false);
  assert.match(duplicateResult.errors.join("\n"), /duplicate claims/);
});

test("audit rejects missing committed evidence and ignored work evidence", () => {
  const missingRef = clone(baseLedger);
  missingRef.criteria[0].committedEvidenceRefs = ["does-not-exist.md"];
  const missingResult = audit(missingRef);
  assert.equal(missingResult.ok, false);
  assert.match(missingResult.errors.join("\n"), /does-not-exist\.md/);

  const workRef = clone(baseLedger);
  workRef.criteria[0].committedEvidenceRefs = ["work/not-committed.json"];
  const workResult = audit(workRef);
  assert.equal(workResult.ok, false);
  assert.match(workResult.errors.join("\n"), /ignored work artifacts/);
});

test("criterion 04 cannot regress to the old mobile-route evidence only", () => {
  const missingPhoneRefs = clone(baseLedger);
  const phoneCriterion = missingPhoneRefs.criteria.find(item => item.id === PHONE_CORE_CRITERION_ID);
  phoneCriterion.committedEvidenceRefs = phoneCriterion.committedEvidenceRefs
    .filter(ref => !PHONE_CORE_REQUIRED_COMMITTED_EVIDENCE_REFS.includes(ref));
  const missingRefsResult = audit(missingPhoneRefs);
  assert.equal(missingRefsResult.ok, false);
  assert.match(missingRefsResult.errors.join("\n"), /must include phone v16 evidence/);

  const oldArtifactOnly = clone(baseLedger);
  const oldArtifactCriterion = oldArtifactOnly.criteria.find(item => item.id === PHONE_CORE_CRITERION_ID);
  oldArtifactCriterion.localArtifactRefs = oldArtifactCriterion.localArtifactRefs
    .filter(artifact => artifact.path !== PHONE_CORE_REQUIRED_LOCAL_ARTIFACT_PATH);
  const oldArtifactResult = audit(oldArtifactOnly);
  assert.equal(oldArtifactResult.ok, false);
  assert.match(oldArtifactResult.errors.join("\n"), /exact phone v16 artifact path/);
});

test("criterion 02 requires the orthogonal review bundle v3 evidence and exact manifest path", () => {
  const criterion = baseLedger.criteria.find(item => item.id === ORTHOGONAL_CRITERION_ID);
  assert.ok(criterion);
  assert.equal(criterion.state, "expert-blocked");
  assert.equal(criterion.blockingAuthority, "neuroanatomy expert reviewer");
  assert.equal(criterion.nextAction, "全学習対象の欠落・重複・遊離・空着色を専門家と再確認する。");
  for (const requiredRef of ORTHOGONAL_REQUIRED_COMMITTED_EVIDENCE_REFS) {
    assert.ok(criterion.committedEvidenceRefs.includes(requiredRef), requiredRef);
  }
  assert.ok(criterion.localArtifactRefs.some(artifact => artifact.path === ORTHOGONAL_REQUIRED_LOCAL_ARTIFACT_PATH));

  const oldObjectiveOnly = clone(baseLedger);
  const oldCriterion = oldObjectiveOnly.criteria.find(item => item.id === ORTHOGONAL_CRITERION_ID);
  oldCriterion.committedEvidenceRefs = oldCriterion.committedEvidenceRefs
    .filter(ref => !ORTHOGONAL_REQUIRED_COMMITTED_EVIDENCE_REFS.includes(ref));
  oldCriterion.localArtifactRefs = [];
  const oldResult = audit(oldObjectiveOnly);
  assert.equal(oldResult.ok, false);
  assert.match(oldResult.errors.join("\n"), /orthogonal review v3 evidence/);
  assert.match(oldResult.errors.join("\n"), /exact orthogonal review v3 manifest path/);

  const wrongVersion = clone(baseLedger);
  const wrongCriterion = wrongVersion.criteria.find(item => item.id === ORTHOGONAL_CRITERION_ID);
  wrongCriterion.localArtifactRefs[0].path = "work/anatomy-review/orthogonal-review-bundle-v2/manifest.json";
  const wrongResult = audit(wrongVersion);
  assert.equal(wrongResult.ok, false);
  assert.match(wrongResult.errors.join("\n"), /exact orthogonal review v3 manifest path/);
});

test("criterion 02 rejects orthogonal expert/anatomical pass claims but accepts explicit unreviewed scope", () => {
  const reviewed = clone(baseLedger);
  const reviewedCriterion = reviewed.criteria.find(item => item.id === ORTHOGONAL_CRITERION_ID);
  reviewedCriterion.locallyProven.push("orthogonal bundle reviewed and verified by an expert");
  const reviewedResult = audit(reviewed);
  assert.equal(reviewedResult.ok, false);
  assert.match(reviewedResult.errors.join("\n"), /unsupported orthogonal review claim/);

  const japaneseReviewed = clone(baseLedger);
  const japaneseCriterion = japaneseReviewed.criteria.find(item => item.id === ORTHOGONAL_CRITERION_ID);
  japaneseCriterion.unprovenScope = "解剖学的境界は専門家確認済みである。";
  const japaneseResult = audit(japaneseReviewed);
  assert.equal(japaneseResult.ok, false);
  assert.match(japaneseResult.errors.join("\n"), /unsupported orthogonal review claim/);

  const explicitUnreviewed = clone(baseLedger);
  const unreviewedCriterion = explicitUnreviewed.criteria.find(item => item.id === ORTHOGONAL_CRITERION_ID);
  unreviewedCriterion.locallyProven = [
    "review.status=unreviewedで、解剖学的妥当性・境界・採用は未確認である。",
  ];
  unreviewedCriterion.unprovenScope = "解剖学的妥当性・境界・採用は未確認であり、専門家確認は未完了。";
  const explicitResult = audit(explicitUnreviewed);
  assert.equal(explicitResult.ok, true, explicitResult.errors.join("\n"));
});

test("local artifact references are optional, local-only, and never existence-required", () => {
  const localOnly = clone(baseLedger);
  localOnly.criteria[0].localArtifactRefs = [{
    path: "work/not-present-local-artifact.json",
    localOnly: true,
    label: "local-only",
  }];
  const accepted = audit(localOnly);
  assert.equal(accepted.ok, true, accepted.errors.join("\n"));

  const invalid = clone(baseLedger);
  invalid.criteria[0].localArtifactRefs = [{path: "work/not-local-only.json", localOnly: false}];
  const invalidResult = audit(invalid);
  assert.equal(invalidResult.ok, false);
  assert.match(invalidResult.errors.join("\n"), /localOnly must be true/);

  const duplicate = clone(baseLedger);
  duplicate.criteria[2].localArtifactRefs = [
    {path: "work/browser-audit/duplicate.json", localOnly: true, label: "local-only"},
    {path: "work/browser-audit/duplicate.json", localOnly: true, label: "local-only"},
  ];
  const duplicateResult = audit(duplicate);
  assert.equal(duplicateResult.ok, false);
  assert.match(duplicateResult.errors.join("\n"), /path is duplicated/);
});

test("audit rejects an invalid ledger update date", () => {
  const invalidDate = clone(baseLedger);
  invalidDate.updated = "2026-02-30";
  const result = audit(invalidDate);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /updated must be a valid ISO date/);
});

test("audit rejects source-count drift instead of trusting ledger prose", () => {
  const drift = clone(baseLedger);
  drift.sourceCounts.quizTargetCount = 39;
  const result = audit(drift);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /sourceCounts\.quizTargetCount/);
});

test("audit rejects unsupported public/expert/global pass claims", () => {
  const forbidden = clone(baseLedger);
  forbidden.criteria[2].unprovenScope = "公開URLの全世界expert review passed。";
  const result = audit(forbidden);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /unsupported public\/expert\/global pass claim/);

  const betaReady = clone(baseLedger);
  betaReady.criteria[2].criterionText += " β ready";
  const betaReadyResult = audit(betaReady);
  assert.equal(betaReadyResult.ok, false);
  assert.match(betaReadyResult.errors.join("\n"), /unsupported public\/expert\/global pass claim/);
});
