import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { deriveAnatomyReviewQueue, filterAnatomyReviewQueue, isLegacyOpticEntry, isMammillaryEntry, observationHashForEntry, observationWorkspaceForEntry } from "../src/anatomyReviewQueue.mjs";
import { auditAnatomyReviewQueue } from "../scripts/audit_anatomy_review_queue.mjs";

const root = new URL("../", import.meta.url);
const registry = JSON.parse(await readFile(new URL("public/atlas/structure-provenance.json", root), "utf8"));
const [page, css] = await Promise.all([
  readFile(new URL("app/page.tsx", root), "utf8"),
  readFile(new URL("app/canvas.css", root), "utf8"),
]);

function cloneRegistry() {
  return structuredClone(registry);
}

test("derivation includes every pending entry once and keeps the original entry reference", () => {
  const queue = deriveAnatomyReviewQueue(registry);
  const pending = registry.entries.filter(entry => entry.expertReview === "pending");
  assert.equal(queue.length, pending.length);
  assert.deepEqual(queue.map(item => item.key), pending.map(entry => entry.key));
  assert.equal(new Set(queue.map(item => item.key)).size, queue.length);
  for (const item of queue) assert.equal(item.entry, registry.entries.find(entry => entry.key === item.key));
  assert.ok(queue.every(item => item.entry.expertReview === "pending"));
});

test("surface and representation filters preserve queue references", () => {
  const queue = deriveAnatomyReviewQueue(registry);
  assert.equal(filterAnatomyReviewQueue(queue, {surface: "surface"}).length, 54);
  assert.equal(filterAnatomyReviewQueue(queue, {surface: "sections"}).length, 16);
  assert.equal(filterAnatomyReviewQueue(queue, {surface: "blocks"}).length, 30);
  assert.equal(filterAnatomyReviewQueue(queue, {surface: "quiz"}).length, 22);
  const schematic = filterAnatomyReviewQueue(queue, {representation: "schematic-3d"});
  assert.ok(schematic.length > 0);
  assert.ok(schematic.every(item => item.entry.representations.includes("schematic-3d")));
  assert.ok(schematic.every(item => queue.includes(item)));
});

test("audit accepts the complete read-only review queue and exposes the expected UI contract", () => {
  const report = auditAnatomyReviewQueue();
  assert.equal(report.ok, true, report.errors.join("; "));
  assert.deepEqual(report.summary, {entryCount: 75, pendingCount: 75, expertReviewedCount: 0, surfaceCount: 54, sectionsCount: 16, blocksCount: 30, quizCount: 22});
  assert.match(page, /anatomyReviewReadOnly/);
  assert.match(page, /専門家レビュー準備/);
  assert.match(page, /一般の\{observationLabel\}画面を開く/);
  assert.match(page, /<details className="anatomyReviewPanel anatomyReviewReadOnly">/);
  assert.match(page, /expert pending \{total\}件・フィルタ後 \{items\.length\}件/);
  assert.match(page, /entry\.lectureLabel\?\?entry\.appLabel\?\?item\.key/);
  assert.ok(page.indexOf('<div className="collaborationGrid">') < page.indexOf('<AnatomyReviewQueuePanel '), "review preparation panel should follow the general collaboration entrances");
  assert.match(page, /この項目・構造・位置は自動選択されません/);
  assert.doesNotMatch(page, /anatomyReviewApprove|anatomyReviewSave|anatomyReviewReviewerName/);
  assert.match(css, /\.anatomyReviewFilters select \{[^}]*min-height: 44px/);
  assert.match(css, /\.anatomyReviewObserve \{[^}]*display: inline-flex[^}]*min-height: 44px/);
  assert.match(css, /\.anatomyReviewPanel\[open\] \.anatomyReviewList \{[^}]*max-height/);
  assert.match(css, /\.anatomyReviewPanel\[open\] \.anatomyReviewList\{max-height:none;overflow:visible\}/);
});

test("observation links remain generic workspace-only entries", () => {
  const allowed = new Set(["#workspace/surface", "#workspace/sections", "#workspace/blocks", "#workspace/quiz"]);
  for (const item of deriveAnatomyReviewQueue(registry)) {
    const hash = observationHashForEntry(item.entry);
    assert.ok(hash === null || allowed.has(hash), `${item.key}: unexpected observation hash ${hash}`);
    if (hash) assert.doesNotMatch(hash, /segment|[?&]/);
  }
  assert.ok(page.includes("一般の{observationLabel}画面を開く（この項目・構造・位置は自動選択されません）"));
});

test("audit rejects duplicate and missing stable keys", () => {
  const duplicate = cloneRegistry();
  duplicate.entries[1].key = duplicate.entries[0].key;
  const duplicateReport = auditAnatomyReviewQueue({registry: duplicate, checkPage: false});
  assert.equal(duplicateReport.ok, false);
  assert.match(duplicateReport.errors.join("\n"), /duplicate provenance key/);

  const missing = cloneRegistry();
  delete missing.entries[0].key;
  const missingReport = auditAnatomyReviewQueue({registry: missing, checkPage: false});
  assert.equal(missingReport.ok, false);
  assert.match(missingReport.errors.join("\n"), /non-empty stable key/);
});

test("audit rejects representation, learner-surface, sourceRef, and review-state drift", () => {
  const representation = cloneRegistry();
  representation.entries[0].representations = ["invented-representation"];
  const representationReport = auditAnatomyReviewQueue({registry: representation, checkPage: false});
  assert.match(representationReport.errors.join("\n"), /unknown value/);

  const surface = cloneRegistry();
  surface.entries[0].learnerSurfaces = ["free"];
  const surfaceReport = auditAnatomyReviewQueue({registry: surface, checkPage: false});
  assert.match(surfaceReport.errors.join("\n"), /unknown value/);

  const source = cloneRegistry();
  source.entries[0].sourceRefs = ["missing-review-source"];
  const sourceReport = auditAnatomyReviewQueue({registry: source, checkPage: false});
  assert.match(sourceReport.errors.join("\n"), /does not resolve/);

  const review = cloneRegistry();
  review.entries[0].expertReview = "approved";
  const reviewReport = auditAnatomyReviewQueue({registry: review, checkPage: false});
  assert.match(reviewReport.errors.join("\n"), /expertReview must be pending/);
});

test("legacy ID33 remains explicitly excluded and cannot gain section or quiz entry points", () => {
  const legacy = registry.entries.find(entry => isLegacyOpticEntry(entry));
  assert.ok(legacy);
  assert.equal(legacy.excludedFromSectionAndQuizTargets, true);
  assert.equal(observationWorkspaceForEntry(legacy), "surface");
  assert.equal(observationHashForEntry(legacy), "#workspace/surface");
  assert.ok(!legacy.learnerSurfaces.includes("sections"));
  assert.ok(!legacy.learnerSurfaces.includes("quiz"));

  const invalid = cloneRegistry();
  const invalidEntry = invalid.entries.find(entry => isLegacyOpticEntry(entry));
  invalidEntry.learnerSurfaces.push("sections");
  const invalidReport = auditAnatomyReviewQueue({registry: invalid, checkPage: false});
  assert.match(invalidReport.errors.join("\n"), /legacy ID33 entry cannot expose section or quiz/);
});

test("mammillary IDs 39 and 40 remain project-reviewed but expert-pending", () => {
  const mammillary = registry.entries.find(entry => isMammillaryEntry(entry));
  assert.ok(mammillary);
  assert.deepEqual(mammillary.labelIds, [39, 40]);
  assert.equal(mammillary.expertReview, "pending");
  assert.equal(mammillary.projectReview, "reviewed-by-project");

  const invalidExpert = cloneRegistry();
  invalidExpert.entries.find(entry => isMammillaryEntry(entry)).expertReview = "expert-reviewed";
  const invalidExpertReport = auditAnatomyReviewQueue({registry: invalidExpert, checkPage: false});
  assert.match(invalidExpertReport.errors.join("\n"), /mammillary ID39\/40 expertReview must remain pending/);

  const invalidProject = cloneRegistry();
  invalidProject.entries.find(entry => isMammillaryEntry(entry)).projectReview = "pending";
  const invalidProjectReport = auditAnatomyReviewQueue({registry: invalidProject, checkPage: false});
  assert.match(invalidProjectReport.errors.join("\n"), /mammillary ID39\/40 projectReview must be reviewed-by-project/);
});

test("entries without a safe learner surface do not receive a fabricated observation link", () => {
  const entry = {learnerSurfaces: [], legacyIds: [], key: "not-recorded", representations: ["not-recorded"]};
  assert.equal(observationWorkspaceForEntry(entry), null);
  assert.equal(observationHashForEntry(entry), null);
});
