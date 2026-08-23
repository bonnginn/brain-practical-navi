import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  BETA_GO_NO_GO_STATE_LABELS,
  createBetaGoNoGoProjection,
} from "../src/betaGoNoGo.mjs";
import {
  EXPECTED_HEADINGS,
  EXPECTED_STATE_COUNTS,
  REPOSITORY_ROOT,
  auditBetaGoNoGoProjection,
} from "../scripts/audit_beta_go_no_go_projection.mjs";

const ledger = JSON.parse(fs.readFileSync(path.join(REPOSITORY_ROOT, "BETA_GO_NO_GO.json"), "utf8"));
const clone = value => structuredClone(value);
const projection = createBetaGoNoGoProjection(ledger);
const audit = candidate => auditBetaGoNoGoProjection({ledger, projection: candidate, rootDir: REPOSITORY_ROOT});

test("read-only projection exposes the exact five groups and fixed counts", () => {
  const result = audit(projection);
  assert.equal(result.ok, true, result.errors.join("\n"));
  assert.deepEqual(projection.stateCounts, EXPECTED_STATE_COUNTS);
  assert.equal(projection.groups.length, 5);
  assert.equal(projection.items.length, 12);
  assert.deepEqual(projection.groups.map(group => group.items.length), [3, 1, 4, 1, 3]);
  assert.deepEqual(projection.items.map(item => item.heading), Object.keys(EXPECTED_HEADINGS).map(id => EXPECTED_HEADINGS[id]));
  assert.deepEqual(projection.groups.map(group => group.stateLabel), Object.values(BETA_GO_NO_GO_STATE_LABELS));
  assert.deepEqual(Object.values(BETA_GO_NO_GO_STATE_LABELS), ["ローカル証拠あり", "ローカル部分確認", "専門家確認待ち", "管理者確認待ち", "公開反映待ち"]);
  assert.equal(JSON.stringify(projection).includes("work/"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(projection.items[0], "criterionText"), false);
});

test("projection creation rejects unknown ids and states, boolean state, and empty next action", () => {
  const unknownId = clone(ledger);
  unknownId.criteria[0].id = "criterion-unknown";
  assert.throws(() => createBetaGoNoGoProjection(unknownId), /no stable learner-facing heading/);

  const unknownState = clone(ledger);
  unknownState.criteria[0].state = "ready";
  assert.throws(() => createBetaGoNoGoProjection(unknownState), /not a stable Go\/No-Go state/);

  const booleanState = clone(ledger);
  booleanState.criteria[0].state = true;
  assert.throws(() => createBetaGoNoGoProjection(booleanState), /non-empty string/);

  const emptyNextAction = clone(ledger);
  emptyNextAction.criteria[0].nextAction = "   ";
  assert.throws(() => createBetaGoNoGoProjection(emptyNextAction), /nextAction must be a non-empty string/);
});

test("projection audit rejects a forbidden evidence field or ledger prose leak", () => {
  const forbidden = clone(projection);
  forbidden.items[0].localArtifactRefs = [];
  const result = audit(forbidden);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /unexpected or missing fields|local\/work evidence/);

  const prose = clone(projection);
  prose.items[1].heading = "work/not-committed.json";
  const proseResult = audit(prose);
  assert.equal(proseResult.ok, false);
  assert.match(proseResult.errors.join("\n"), /fixed|local\/work/);
});

test("projection audit independently rejects wrong state counts, headings, and group membership", () => {
  const wrongCounts = clone(projection);
  wrongCounts.stateCounts["proven-local"] = 4;
  const countResult = audit(wrongCounts);
  assert.equal(countResult.ok, false);
  assert.match(countResult.errors.join("\n"), /state counts/);

  const wrongHeading = clone(projection);
  wrongHeading.items[0].heading = "必修構造";
  const headingResult = audit(wrongHeading);
  assert.equal(headingResult.ok, false);
  assert.match(headingResult.errors.join("\n"), /fixed/);

  const wrongGroup = clone(projection);
  wrongGroup.groups[0].items.push(clone(wrongGroup.groups[1].items[0]));
  const groupResult = audit(wrongGroup);
  assert.equal(groupResult.ok, false);
  assert.match(groupResult.errors.join("\n"), /membership|more than one|cover/);
});

test("projection audit rejects missing learner fields and altered state labels", () => {
  const missing = clone(projection);
  delete missing.items[0].nextAction;
  const missingResult = audit(missing);
  assert.equal(missingResult.ok, false);
  assert.match(missingResult.errors.join("\n"), /unexpected or missing fields|next action/);

  const label = clone(projection);
  label.items[0].stateLabel = "公開済み";
  const labelResult = audit(label);
  assert.equal(labelResult.ok, false);
  assert.match(labelResult.errors.join("\n"), /state label/);
});

test("independent UI audit rejects a panel that renders criterion prose", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "beta-go-no-go-ui-"));
  try {
    fs.mkdirSync(path.join(tempRoot, "app"), {recursive: true});
    fs.copyFileSync(path.join(REPOSITORY_ROOT, "app", "page.tsx"), path.join(tempRoot, "app", "page.tsx"));
    fs.copyFileSync(path.join(REPOSITORY_ROOT, "app", "canvas.css"), path.join(tempRoot, "app", "canvas.css"));
    const pagePath = path.join(tempRoot, "app", "page.tsx");
    const page = fs.readFileSync(pagePath, "utf8");
    const mutated = page.replace('data-beta-go-no-go-field="nextAction"', 'criterionText data-beta-go-no-go-field="nextAction"');
    fs.writeFileSync(pagePath, mutated, "utf8");
    const result = auditBetaGoNoGoProjection({ledger, projection, rootDir: tempRoot});
    assert.equal(result.ok, false);
    assert.match(result.errors.join("\n"), /panel must not render/);
  } finally {
    fs.rmSync(tempRoot, {recursive: true, force: true});
  }
});

test("independent UI audit rejects an overall pass or publication claim", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "beta-go-no-go-claim-"));
  try {
    fs.mkdirSync(path.join(tempRoot, "app"), {recursive: true});
    fs.copyFileSync(path.join(REPOSITORY_ROOT, "app", "page.tsx"), path.join(tempRoot, "app", "page.tsx"));
    fs.copyFileSync(path.join(REPOSITORY_ROOT, "app", "canvas.css"), path.join(tempRoot, "app", "canvas.css"));
    const pagePath = path.join(tempRoot, "app", "page.tsx");
    const page = fs.readFileSync(pagePath, "utf8");
    fs.writeFileSync(pagePath, page.replace("台帳更新 {data.updated}", "3/12合格・公開可 台帳更新 {data.updated}"), "utf8");
    const result = auditBetaGoNoGoProjection({ledger, projection, rootDir: tempRoot});
    assert.equal(result.ok, false);
    assert.match(result.errors.join("\n"), /overall readiness/);
  } finally {
    fs.rmSync(tempRoot, {recursive: true, force: true});
  }
});
