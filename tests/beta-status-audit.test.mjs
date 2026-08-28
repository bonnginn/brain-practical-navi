import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { REPOSITORY_ROOT, auditBetaStatus, STATUS_PHASE } from "../scripts/audit_beta_status.mjs";

const statusPath = `${REPOSITORY_ROOT}/app/beta-status.json`;
const baseStatus = JSON.parse(fs.readFileSync(statusPath, "utf8"));
const clone = value => JSON.parse(JSON.stringify(value));
const audit = status => auditBetaStatus({ status, rootDir: REPOSITORY_ROOT });

test("beta status registry is valid and covers the fixed provenance references", () => {
  const result = audit(baseStatus);
  assert.equal(result.ok, true, result.errors.join("\n"));
  assert.equal(STATUS_PHASE, "公開α掲載中／β候補・β公開判断前");
  assert.equal(baseStatus.phase, STATUS_PHASE);
  assert.equal(baseStatus.knownLimitations.length, 6);
  assert.equal(baseStatus.changes.length, 18);
  assert.match(baseStatus.changes.find(item => item.id === "change-beta-readiness-display").body, /専門家確認待ち4/);
  assert.match(baseStatus.changes.find(item => item.id === "change-pwa-install-affordance").body, /実際のホーム画面追加と追加後起動は未確認/);
  assert.match(baseStatus.changes.find(item => item.id === "change-ventricle-cavity-repair").body, /33 voxel/);
  assert.match(baseStatus.changes.find(item => item.id === "change-papez-provenance-stepper").body, /乳頭体は断面ラベルのみ/);
  assert.match(baseStatus.changes.find(item => item.id === "change-block-priority-routing").body, /観察導線/);
  assert.match(baseStatus.changes.find(item => item.id === "change-block-guided-observation").body, /最終段階だけ全layer/);
  assert.match(baseStatus.changes.find(item => item.id === "change-download-progress").body, /総量不明/);
  const contentAccuracyChange = baseStatus.changes.find(item => item.id === "change-content-accuracy-review");
  assert.deepEqual(contentAccuracyChange.evidenceRefs, ["CONTENT_ACCURACY_REVIEW.md", "tests/content-accuracy-review.test.mjs", "public/atlas/structure-provenance.json"]);
  assert.match(contentAccuracyChange.body, /間脳の視床下域.*中脳・視床下域.*中脳核・視床下域/);
  assert.match(contentAccuracyChange.body, /GPe.*基底核内回路の中継・調節.*GPi.*主要な出力部/);
  assert.match(contentAccuracyChange.body, /尾状核頭部.*側脳室前角の外側壁.*体部.*側脳室体部の外側.*尾部.*下角の上方・天井側/);
  assert.match(contentAccuracyChange.body, /第三脳室の側壁上部は視床、下部は視床下部に接する/);
  assert.match(contentAccuracyChange.body, /CORPUS CALLOSUM AND FORNIX/);
  for (const name of ["中前頭回前部", "中前頭回後部", "鳥距溝周囲皮質", "外側後頭皮質", "眼窩前頭皮質"]) {
    assert.match(contentAccuracyChange.body, new RegExp(name));
  }
  assert.match(contentAccuracyChange.body, /CerebrA／Desikan系アトラス区画/);
  assert.match(contentAccuracyChange.body, /構造ID.*分節形状.*座標.*色.*クイズ在庫.*変更していません/);
  assert.match(contentAccuracyChange.body, /参照資料に基づくプロジェクト内レビュー/);
  assert.match(contentAccuracyChange.body, /専門家確認と解剖学的境界の確認は未完了/);
  assert.match(contentAccuracyChange.body, /所属機関による承認を意味しません/);
  assert.match(baseStatus.knownLimitations.find(item => item.id === "limitation-optic-id33").body, /ID33/);
  assert.match(baseStatus.knownLimitations.find(item => item.id === "limitation-mammillary-39-40").body, /ID39・40/);
});

test("audit rejects duplicate IDs, invalid dates, missing body, and missing evidence", () => {
  const duplicate = clone(baseStatus);
  duplicate.changes.push(clone(duplicate.changes[0]));
  assert.equal(audit(duplicate).ok, false);

  const invalidDate = clone(baseStatus);
  invalidDate.updated = "2026-2-22";
  assert.equal(audit(invalidDate).ok, false);

  const missingBody = clone(baseStatus);
  delete missingBody.knownLimitations[0].body;
  assert.equal(audit(missingBody).ok, false);

  const missingEvidence = clone(baseStatus);
  missingEvidence.changes[0].evidenceRefs = ["missing-status-evidence.md"];
  assert.equal(audit(missingEvidence).ok, false);
});

test("audit rejects a wrong schema phase and a missing required provenance key", () => {
  const invalid = clone(baseStatus);
  invalid.phase = "β公開済み";
  assert.equal(audit(invalid).ok, false);

  const missingKey = clone(baseStatus);
  missingKey.knownLimitations.find(item => item.id === "limitation-optic-id33").provenanceKeys = [];
  assert.equal(audit(missingKey).ok, false);
});

test("audit rejects prohibited expert, publication, and university claims", () => {
  for (const body of ["専門家確認なしの検証済み教材です。", "β公開済みです。", "三重大学公式教材として承認済みです。"]) {
    const mutated = clone(baseStatus);
    mutated.changes[0].body = body;
    const result = audit(mutated);
    assert.equal(result.ok, false, body);
  }
});

test("audit rejects retired fimbria and uncus when described as current content", () => {
  const mutated = clone(baseStatus);
  mutated.knownLimitations.find(item => item.id === "limitation-unrecorded-items").body = "海馬采と鉤を現行β候補へ収録しています。";
  const result = audit(mutated);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /retired fimbria\/uncus/);
});

test("audit accepts explicit exclusion of retired fimbria and uncus", () => {
  const mutated = clone(baseStatus);
  mutated.knownLimitations.find(item => item.id === "limitation-unrecorded-items").body = "海馬采・鉤はβ候補から除外し、現行3Dへ収録していません。";
  assert.equal(audit(mutated).ok, true, audit(mutated).errors.join("\n"));
});
