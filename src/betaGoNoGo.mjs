/**
 * Read-only learner-facing projection of the beta Go/No-Go ledger.
 *
 * The ledger remains the single source of truth.  This module deliberately
 * copies only the fields that are safe to show inside the app status panel;
 * evidence paths, especially ignored work artifacts, never enter the
 * projection.
 */

export const BETA_GO_NO_GO_STATE_ENUM = Object.freeze([
  "proven-local",
  "partial-local",
  "expert-blocked",
  "administrator-blocked",
  "deployment-blocked",
]);

export const BETA_GO_NO_GO_STATE_LABELS = Object.freeze({
  "proven-local": "ローカル証拠あり",
  "partial-local": "ローカル部分確認",
  "expert-blocked": "専門家確認待ち",
  "administrator-blocked": "管理者確認待ち",
  "deployment-blocked": "公開反映待ち",
});

/** Stable learner-facing headings.  These are intentionally not derived from
 * the long ledger prose, which can contain audit paths and implementation
 * details that do not belong in the status panel. */
export const BETA_GO_NO_GO_HEADINGS = Object.freeze({
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

const REQUIRED_CRITERION_FIELDS = Object.freeze([
  "id",
  "criterionText",
  "state",
  "locallyProven",
  "unprovenScope",
  "nextAction",
]);

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function freezeDeep(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value).forEach(freezeDeep);
    Object.freeze(value);
  }
  return value;
}

function nonEmptyString(value, label) {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${label} must be a non-empty string`);
  return value.trim();
}

function shortHeading(text) {
  const plain = text
    .replaceAll(/[`*_]/g, "")
    .split(/[。（]/, 1)[0]
    .trim();
  if (plain.length <= 42) return plain;
  return `${plain.slice(0, 41)}…`;
}

function exactKeys(value, expected) {
  if (!isRecord(value)) return false;
  const actual = Object.keys(value).sort();
  const sorted = [...expected].sort();
  return actual.length === sorted.length && actual.every((key, index) => key === sorted[index]);
}

/**
 * Convert BETA_GO_NO_GO.json to a frozen display projection.
 *
 * No state is inferred or changed here.  In particular, "proven-local" is a
 * ledger label and is not converted to a public-release or expert approval
 * decision.
 */
export function createBetaGoNoGoProjection(ledger) {
  if (!isRecord(ledger)) throw new Error("Go/No-Go ledger must be an object");
  if (!Array.isArray(ledger.criteria) || ledger.criteria.length !== 12) throw new Error("Go/No-Go ledger must contain exactly 12 criteria");
  const seen = new Set();
  const stateCounts = Object.fromEntries(BETA_GO_NO_GO_STATE_ENUM.map(state => [state, 0]));
  const items = ledger.criteria.map((criterion, index) => {
    if (!isRecord(criterion)) throw new Error(`criteria[${index}] must be an object`);
    if (!exactKeys(criterion, [
      ...REQUIRED_CRITERION_FIELDS,
      "blockingAuthority",
      "committedEvidenceRefs",
      "localArtifactRefs",
    ])) throw new Error(`criteria[${index}] has unexpected fields`);
    const id = nonEmptyString(criterion.id, `criteria[${index}].id`);
    if (seen.has(id)) throw new Error(`duplicate criterion id: ${id}`);
    seen.add(id);
    const state = nonEmptyString(criterion.state, `criteria[${index}].state`);
    if (!BETA_GO_NO_GO_STATE_ENUM.includes(state)) throw new Error(`criteria[${index}].state is not a stable Go/No-Go state`);
    nonEmptyString(criterion.criterionText, `criteria[${index}].criterionText`);
    if (!BETA_GO_NO_GO_HEADINGS[id]) throw new Error(`criteria[${index}] has no stable learner-facing heading`);
    if (!Array.isArray(criterion.locallyProven) || criterion.locallyProven.length === 0 || criterion.locallyProven.some(value => typeof value !== "string" || value.trim() === "")) {
      throw new Error(`criteria[${index}].locallyProven must be a non-empty array of strings`);
    }
    const unprovenScope = nonEmptyString(criterion.unprovenScope, `criteria[${index}].unprovenScope`);
    const nextAction = nonEmptyString(criterion.nextAction, `criteria[${index}].nextAction`);
    stateCounts[state] += 1;
    return {
      id,
      heading: BETA_GO_NO_GO_HEADINGS[id],
      state,
      stateLabel: BETA_GO_NO_GO_STATE_LABELS[state],
      locallyProven: criterion.locallyProven.map(value => value.trim()),
      unprovenScope,
      nextAction,
    };
  });
  if (seen.size !== 12) throw new Error("Go/No-Go criterion ids must be unique");
  const groups = BETA_GO_NO_GO_STATE_ENUM.map(state => ({
    state,
    stateLabel: BETA_GO_NO_GO_STATE_LABELS[state],
    items: items.filter(item => item.state === state),
  }));
  return freezeDeep({
    ledgerId: typeof ledger.ledgerId === "string" ? ledger.ledgerId : "beta-go-no-go",
    updated: typeof ledger.updated === "string" ? ledger.updated : "",
    itemCount: items.length,
    stateCounts,
    items,
    groups,
  });
}

export { REQUIRED_CRITERION_FIELDS, shortHeading };
