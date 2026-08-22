import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { REPOSITORY_ROOT, auditStructureProvenance } from "../scripts/audit_structure_provenance.mjs";

const registryPath = `${REPOSITORY_ROOT}/public/atlas/structure-provenance.json`;
const baseRegistry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
const clone = value => JSON.parse(JSON.stringify(value));
const audit = registry => auditStructureProvenance({ registry, rootDir: REPOSITORY_ROOT });

test("structure provenance registry covers the lecture rows and app quiz targets", () => {
  const result = audit(baseRegistry);
  assert.equal(result.ok, true, result.errors.join("\n"));
  assert.equal(result.summary.lectureRowCount, 51);
  assert.equal(result.summary.quizTargetCount, 23);
  assert.equal(result.summary.entryCount, 56);
  const mammillary = baseRegistry.entries.find(entry => entry.key === "section-mammillary-bodies");
  assert.deepEqual(mammillary.learnerSurfaces, ["sections", "quiz"]);
  assert.deepEqual(mammillary.hiddenAssets, ["block-diencephalon-mammillary-bodies.mesh", "landmark-mammillary-bodies.mesh"]);
  assert.equal(mammillary.expertReview, "pending");
  assert.equal(mammillary.projectReview, "reviewed-by-project");
  assert.deepEqual(mammillary.projectReviewEvidence, { reviewerRole: "project lead", date: "2026-08-16", documentRef: "OPTIC_PATHWAY_AUDIT.md" });
  assert.deepEqual(baseRegistry.learnerSurfaceEnum, ["surface", "sections", "blocks", "quiz"]);
});

test("audit rejects a missing lecture-row entry", () => {
  const registry = clone(baseRegistry);
  registry.entries = registry.entries.filter(entry => entry.key !== "surface-cingulate");
  const result = audit(registry);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /lecture audit row is not covered.*帯状回/);
});

test("audit rejects duplicate stable keys", () => {
  const registry = clone(baseRegistry);
  registry.entries.push(clone(registry.entries[0]));
  const result = audit(registry);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /duplicate entry key/);
});

test("audit rejects an unknown representation enum", () => {
  const registry = clone(baseRegistry);
  registry.entries.find(entry => entry.key === "section-thalamus").representations = ["expert-verified"];
  const result = audit(registry);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /unknown representation expert-verified/);
});

test("audit rejects schematic material as standard quiz material", () => {
  const registry = clone(baseRegistry);
  registry.entries.find(entry => entry.key === "section-fornix").quizEligibility = "standard";
  const result = audit(registry);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /schematic\/position\/not-recorded representation cannot be standard/);
});

test("audit rejects expert-verified wording outside the allowed review states", () => {
  const registry = clone(baseRegistry);
  registry.entries.find(entry => entry.key === "section-mammillary-bodies").expertReview = "expert-verified";
  const result = audit(registry);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /expertReview must be pending or expert-reviewed/);
});

test("audit requires review evidence for expert-reviewed entries", () => {
  const missing = clone(baseRegistry);
  const mammillary = missing.entries.find(entry => entry.key === "section-mammillary-bodies");
  mammillary.expertReview = "expert-reviewed";
  const missingEvidence = audit(missing);
  assert.equal(missingEvidence.ok, false);
  assert.match(missingEvidence.errors.join("\n"), /expertReviewEvidence is required/);

  const invalidDate = clone(baseRegistry);
  const reviewed = invalidDate.entries.find(entry => entry.key === "section-mammillary-bodies");
  reviewed.expertReview = "expert-reviewed";
  reviewed.expertReviewEvidence = { reviewerRole: "anatomy reviewer", date: "2026-2-1", documentRef: "OPTIC_PATHWAY_AUDIT.md" };
  const invalidDateResult = audit(invalidDate);
  assert.equal(invalidDateResult.ok, false);
  assert.match(invalidDateResult.errors.join("\n"), /expertReviewEvidence\.date must be YYYY-MM-DD/);

  const missingDocument = clone(baseRegistry);
  const reviewedWithMissingDocument = missingDocument.entries.find(entry => entry.key === "section-mammillary-bodies");
  reviewedWithMissingDocument.expertReview = "expert-reviewed";
  reviewedWithMissingDocument.expertReviewEvidence = { reviewerRole: "anatomy reviewer", date: "2026-08-22", documentRef: "missing-expert-review.md" };
  const missingDocumentResult = audit(missingDocument);
  assert.equal(missingDocumentResult.ok, false);
  assert.match(missingDocumentResult.errors.join("\n"), /expertReviewEvidence\.documentRef must resolve/);
});

test("audit rejects a missing or invalid project review state", () => {
  const missing = clone(baseRegistry);
  delete missing.entries.find(entry => entry.key === "section-thalamus").projectReview;
  const missingResult = audit(missing);
  assert.equal(missingResult.ok, false);
  assert.match(missingResult.errors.join("\n"), /required string projectReview is missing/);

  const invalid = clone(baseRegistry);
  invalid.entries.find(entry => entry.key === "section-thalamus").projectReview = "expert-reviewed";
  const invalidResult = audit(invalid);
  assert.equal(invalidResult.ok, false);
  assert.match(invalidResult.errors.join("\n"), /projectReview must be pending or reviewed-by-project/);

  const missingEvidence = clone(baseRegistry);
  missingEvidence.entries.find(entry => entry.key === "section-thalamus").projectReview = "reviewed-by-project";
  const missingEvidenceResult = audit(missingEvidence);
  assert.equal(missingEvidenceResult.ok, false);
  assert.match(missingEvidenceResult.errors.join("\n"), /projectReviewEvidence is required/);

  const missingDocument = clone(baseRegistry);
  const reviewed = missingDocument.entries.find(entry => entry.key === "section-thalamus");
  reviewed.projectReview = "reviewed-by-project";
  reviewed.projectReviewEvidence = { reviewerRole: "project reviewer", date: "2026-08-22", documentRef: "missing-review.md" };
  const missingDocumentResult = audit(missingDocument);
  assert.equal(missingDocumentResult.ok, false);
  assert.match(missingDocumentResult.errors.join("\n"), /projectReviewEvidence\.documentRef must resolve/);
});

test("audit rejects an unknown learner surface, including the removed free enum", () => {
  const registry = clone(baseRegistry);
  registry.entries.find(entry => entry.key === "section-thalamus").learnerSurfaces = ["sections", "tablet"];
  const result = audit(registry);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /unknown learnerSurface tablet/);

  const nested = clone(baseRegistry);
  nested.entries.find(entry => entry.key === "surface-central-sulci").learnerSurfaces = ["surface", "free"];
  const nestedResult = audit(nested);
  assert.equal(nestedResult.ok, false);
  assert.match(nestedResult.errors.join("\n"), /unknown learnerSurface free/);
});

test("pallidum lecture rows are separated from the combined standard quiz target", () => {
  const lecture = baseRegistry.entries.find(entry => entry.key === "section-pallidum-external-internal");
  const quiz = baseRegistry.entries.find(entry => entry.key === "app-quiz-pallidum-combined");
  assert.deepEqual(lecture.learnerSurfaces, ["sections", "blocks"]);
  assert.equal(lecture.quizEligibility, "none");
  assert.deepEqual(quiz.learnerSurfaces, ["sections", "blocks", "quiz"]);
  assert.equal(quiz.quizEligibility, "standard");

  const orphan = clone(baseRegistry);
  const orphanEntry = orphan.entries.find(entry => entry.key === "section-pallidum-external-internal");
  orphanEntry.learnerSurfaces.push("quiz");
  orphanEntry.quizEligibility = "standard";
  const result = audit(orphan);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /quiz-eligible or quiz learner surface entry must be referenced by quizTargets/);
});

test("audit rejects duplicate lecture app keys and the old optic exclusion property", () => {
  const duplicate = clone(baseRegistry);
  duplicate.entries.find(entry => entry.key === "surface-deep-thalamus").appKeys = ["thalamus"];
  const duplicateResult = audit(duplicate);
  assert.equal(duplicateResult.ok, false);
  assert.match(duplicateResult.errors.join("\n"), /duplicate appKey across lecture entries: thalamus/);

  const renamed = clone(baseRegistry);
  const optic = renamed.entries.find(entry => entry.key === "visual-pathway-legacy-optic-label");
  delete optic.excludedFromSectionAndQuizTargets;
  optic.excludedFromSectionQuiz = true;
  const renamedResult = audit(renamed);
  assert.equal(renamedResult.ok, false);
  assert.match(renamedResult.errors.join("\n"), /must use excludedFromSectionAndQuizTargets/);
});

test("audit rejects a registry lecture label that is not an actual lecture row", () => {
  const registry = clone(baseRegistry);
  registry.entries.find(entry => entry.key === "surface-cingulate").lectureLabel = "存在しない行";
  const result = audit(registry);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /registry lectureLabel is not present in lecture audit/);
  assert.match(result.errors.join("\n"), /lecture audit row is not covered.*帯状回/);
});

test("audit rejects a mammillary hidden-asset omission", () => {
  const registry = clone(baseRegistry);
  registry.entries.find(entry => entry.key === "section-mammillary-bodies").hiddenAssets = ["block-diencephalon-mammillary-bodies.mesh"];
  const result = audit(registry);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /mammillary IDs 39\/40 must record both hidden schematic assets/);
});

test("audit rejects top-level enum drift", () => {
  const registry = clone(baseRegistry);
  registry.learnerSurfaceEnum = ["surface", "sections", "blocks", "quiz", "tablet"];
  const result = audit(registry);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /learnerSurfaceEnum must exactly match the audit script enum/);
});

test("audit rejects an asset or quiz assignment on not-recorded material", () => {
  const registry = clone(baseRegistry);
  const entry = registry.entries.find(item => item.key === "section-temporal-lobe");
  entry.sourceRefs = ["mni-cerebra-browser-assets"];
  entry.quizEligibility = "pilot";
  const result = audit(registry);
  assert.equal(result.ok, false);
  const errors = result.errors.join("\n");
  assert.match(errors, /not-recorded entry cannot have sourceRefs\/assets/);
  assert.match(errors, /not-recorded entry cannot be quiz material/);
});
