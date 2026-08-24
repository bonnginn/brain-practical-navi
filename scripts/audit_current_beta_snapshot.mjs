import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { auditAnatomyReviewQueue } from "./audit_anatomy_review_queue.mjs";
import { auditBetaGoNoGo, STATE_ENUM } from "./audit_beta_go_no_go.mjs";
import { BETA_AUDIT_PHASES, BETA_AUDIT_ROUTES, BETA_AUDIT_VIEWPORTS } from "./audit_beta_routes.mjs";
import { auditLearnerProvenance } from "./audit_learner_provenance.mjs";
import { auditNeurovascularQuiz, parseNeurovascularQuizInventory } from "./audit_neurovascular_quiz.mjs";
import {
  PWA_AUDIT_ACTION_NAMES,
  PWA_AUDIT_BASES,
  PWA_DEFAULT_HOST,
  PWA_NETWORK_POLICY,
} from "./audit_pwa_offline_browser.mjs";
import { auditQuizGranularity, parseQuizGranularity } from "./audit_quiz_granularity.mjs";
import { LEARNER_PROVENANCE_MAPPINGS } from "../src/learnerProvenance.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
export const REPOSITORY_ROOT = path.resolve(SCRIPT_DIR, "..");
export const SNAPSHOT_RELATIVE_PATH = "BETA_CURRENT_SNAPSHOT.json";
export const SNAPSHOT_SCHEMA_VERSION = 1;
export const SNAPSHOT_DATE = "2026-08-24";
export const SNAPSHOT_TOOL = "scripts/audit_current_beta_snapshot.mjs";
export const WINDOWS_HANDOFF_RELATIVE_PATH = "WINDOWS_HANDOFF.md";
export const WINDOWS_HANDOFF_BASELINE = "6f13cd58 public alpha refresh merge";
export const SNAPSHOT_PWA_BLOCKER_COUNT = 0;
export const SNAPSHOT_PWA_RUNNER_BOUNDARY = Object.freeze({
  owner: "pwa-audit-runner",
  host: PWA_DEFAULT_HOST,
  scope: "loopback",
  method: "runner-owned-static-server-stop",
  tcpFailure: "ECONNREFUSED",
  samePortRelisten: true,
});
export const SNAPSHOT_PWA_NON_EVIDENCE = Object.freeze({
  physicalOrOsNetworkDisconnect: Object.freeze({
    status: "unverified",
    boundary: "physical-or-os-network-disconnect",
  }),
  installedPwaAndHomeScreenLaunch: Object.freeze({
    status: "unverified",
    boundary: "installed-pwa-and-home-screen-launch",
  }),
});
export const SNAPSHOT_UNVERIFIED_BOUNDARIES = Object.freeze([
  Object.freeze({
    id: "expert-review",
    criterionId: "criterion-11-expert-required-scope-review",
    expectedState: "expert-blocked",
    status: "unverified",
    authority: "neuroanatomy expert reviewer",
    boundary: "anatomical validity, boundaries, adoption, and expert review records",
  }),
  Object.freeze({
    id: "deployment-public-url",
    criterionId: "criterion-12-publish-known-limitations",
    expectedState: "deployment-blocked",
    status: "unverified",
    authority: "deployment operator / public host maintainer",
    boundary: "public URL reflection and public-environment route behavior",
  }),
  Object.freeze({
    id: "physical-devices",
    status: "unverified",
    authority: "physical-device test operator",
    boundary: "physical PC, tablet, smartphone, touch input, GPU, and browser behavior",
  }),
  Object.freeze({
    id: "administrator-operations",
    criterionId: "criterion-10-feedback-operations",
    expectedState: "administrator-blocked",
    status: "unverified",
    authority: "administrator / feedback-channel maintainer",
    boundary: "rights documents, external feedback operations, and publication-screen operations",
  }),
  Object.freeze({
    id: "physical-os-networking",
    status: "unverified",
    authority: "physical-network/OS test operator",
    boundary: "physical or OS-level network disconnect; runner-owned loopback server stop is not this evidence",
  }),
  Object.freeze({
    id: "installed-pwa",
    status: "unverified",
    authority: "physical-device/PWA test operator",
    boundary: "actual installation, home-screen addition, and post-install launch",
  }),
]);

const PROVENANCE_RELATIVE_PATH = "public/atlas/structure-provenance.json";
const PAGE_RELATIVE_PATH = "app/page.tsx";
const PWA_AUDIT_RELATIVE_PATH = "PWA_OFFLINE_AUDIT.md";
const OPTIC_AUDIT_RELATIVE_PATH = "OPTIC_PATHWAY_AUDIT.md";
const PROVENANCE_NOTES_RELATIVE_PATH = "STRUCTURE_PROVENANCE.md";
export const SNAPSHOT_MARKER_DOCUMENTS = Object.freeze([
  "BETA_OBSERVATION_NOTES.md",
  "PRESENTATION_AUDIT.md",
  "PERFORMANCE_AUDIT.md",
  "WINDOWS_HANDOFF.md",
  PROVENANCE_NOTES_RELATIVE_PATH,
]);
export const SNAPSHOT_MARKER_BLOCK = "<!-- beta-current-snapshot:start -->\nCurrent machine-readable values: [BETA_CURRENT_SNAPSHOT.json](BETA_CURRENT_SNAPSHOT.json). All other counts in this document are dated historical evidence, not current inventory or approval.\n<!-- beta-current-snapshot:end -->";

const AUTHORITATIVE_SOURCES = Object.freeze([
  PROVENANCE_RELATIVE_PATH,
  "src/learnerProvenance.mjs",
  "scripts/audit_anatomy_review_queue.mjs",
  "scripts/audit_learner_provenance.mjs",
  PAGE_RELATIVE_PATH,
  "scripts/audit_beta_routes.mjs",
  "BETA_GO_NO_GO.json",
  "BETA_GO_NO_GO_AUDIT.md",
  "scripts/audit_pwa_offline_browser.mjs",
  PWA_AUDIT_RELATIVE_PATH,
  "PWA_INSTALL_AFFORDANCE_AUDIT.md",
  "BETA_READINESS_DISPLAY_AUDIT.md",
  OPTIC_AUDIT_RELATIVE_PATH,
  PROVENANCE_NOTES_RELATIVE_PATH,
  ...SNAPSHOT_MARKER_DOCUMENTS.filter(document => document !== PROVENANCE_NOTES_RELATIVE_PATH),
]);

function readText(rootDir, relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function readJson(rootDir, relativePath) {
  return JSON.parse(readText(rootDir, relativePath));
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function deepEqual(left, right) {
  if (Object.is(left, right)) return true;
  if (typeof left !== typeof right || left === null || right === null) return false;
  if (Array.isArray(left)) return Array.isArray(right)
    && left.length === right.length
    && left.every((value, index) => deepEqual(value, right[index]));
  if (!isRecord(left) || !isRecord(right)) return false;
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  return deepEqual(leftKeys, rightKeys) && leftKeys.every(key => deepEqual(left[key], right[key]));
}

function addDifference(errors, expected, actual, prefix = "snapshot") {
  if (deepEqual(expected, actual)) return;
  if (isRecord(expected) && isRecord(actual)) {
    const keys = new Set([...Object.keys(expected), ...Object.keys(actual)]);
    for (const key of [...keys].sort()) addDifference(errors, expected[key], actual[key], `${prefix}.${key}`);
    return;
  }
  if (Array.isArray(expected) && Array.isArray(actual)) {
    const length = Math.max(expected.length, actual.length);
    for (let index = 0; index < length; index += 1) addDifference(errors, expected[index], actual[index], `${prefix}[${index}]`);
    return;
  }
  errors.push(`${prefix} differs: expected ${JSON.stringify(expected)}, found ${JSON.stringify(actual)}`);
}

function occurrenceCount(text, needle) {
  return typeof text === "string" && needle.length > 0 ? text.split(needle).length - 1 : 0;
}

function markdownSection(markdown, heading) {
  const start = markdown.indexOf(heading);
  if (start < 0) return "";
  const contentStart = start + heading.length;
  const rest = markdown.slice(contentStart);
  const nextHeading = rest.search(/^##\s+/m);
  return nextHeading < 0 ? rest : rest.slice(0, nextHeading);
}

const WINDOWS_HANDOFF_REQUIRED_PATTERNS = Object.freeze([
  ["current handoff baseline", `引き継ぎ基準コミット: \`${WINDOWS_HANDOFF_BASELINE}\``],
  ["merged alpha refresh identity", /PR #14は[\s\S]{0,100}mainへ統合済み/],
  ["published alpha merge", /6f13cd58e3e6450049e02be04c320a4e9abc1fc3/],
  ["no merge or public-site update guard", /ユーザーの明示承認なしにmainへマージせず、公開サイトも更新しません/],
  ["audit implementation goal", /自律的に監査・実装・検証し、解剖学的監修が必要な残課題/],
  ["section 9 current heading", /## 9\. 残る確認・承認事項/],
  ["local orthogonal groundwork", /冠状断・矢状断の同一ラベル照合表示は[\s\S]{0,180}ORTHOGONAL_REVIEW_BUNDLE_AUDIT\.md[\s\S]{0,100}整備済みです/],
  ["local model-comparison groundwork", /現行再構成モデルと知識ベース模式モデルの比較pilotは[\s\S]{0,180}MODEL_STRATEGY_COMPARISON_AUDIT\.md[\s\S]{0,100}整備済みです/],
  ["main and new branch continuation", /git fetch origin[\s\S]{0,100}git switch main[\s\S]{0,100}git pull --ff-only[\s\S]{0,100}git status[\s\S]{0,100}git log -5 --oneline[\s\S]{0,180}mainから新しい作業ブランチ/],
]);

const WINDOWS_HANDOFF_FORBIDDEN_PATTERNS = Object.freeze([
  ["stale handoff baseline", /引き継ぎ基準コミット:\s*`7d6a811\b/],
  ["stale pre-refresh handoff baseline", /引き継ぎ基準コミット:\s*`dd17284\b/],
  ["stale interruption wording", /Mac側では、この基準コミット以降の実装作業を中断/],
  ["local alpha-publication wording", /公開α版の現在地/],
  ["local publication directive", /専門家監修を必要としないP0・P1項目を自律的に監査・実装・検証・(?:公開|デプロイ)/],
  ["stale Draft PR workflow", /Draft PR #14の現行ブランチを継続/],
]);

export function validateWindowsHandoffFreshness({rootDir = REPOSITORY_ROOT, documentText} = {}) {
  const errors = [];
  let text = documentText;
  if (typeof text !== "string") {
    try {
      text = readText(rootDir, WINDOWS_HANDOFF_RELATIVE_PATH);
    } catch (error) {
      return {ok: false, errors: [`${WINDOWS_HANDOFF_RELATIVE_PATH}: could not read handoff: ${error.message}`]};
    }
  }
  for (const [label, pattern] of WINDOWS_HANDOFF_REQUIRED_PATTERNS) {
    const present = typeof pattern === "string" ? text.includes(pattern) : pattern.test(text);
    if (!present) errors.push(`${WINDOWS_HANDOFF_RELATIVE_PATH}: missing ${label} marker`);
  }
  for (const [label, pattern] of WINDOWS_HANDOFF_FORBIDDEN_PATTERNS) {
    if (pattern.test(text)) errors.push(`${WINDOWS_HANDOFF_RELATIVE_PATH}: stale ${label} wording is present`);
  }
  const currentSection = markdownSection(text, "## 9. 残る確認・承認事項");
  if (/^## 9\..*未着手/m.test(text)) {
    errors.push(`${WINDOWS_HANDOFF_RELATIVE_PATH}: section 9 must not be an unstarted-items section`);
  }
  if (/^-\s*冠状断・矢状断のセグメンテーション照合表示。/m.test(currentSection)) {
    errors.push(`${WINDOWS_HANDOFF_RELATIVE_PATH}: section 9 must not relist orthogonal display as unstarted`);
  }
  if (/^-\s*現行再構成モデルと知識ベースモデルの比較試作。/m.test(currentSection)) {
    errors.push(`${WINDOWS_HANDOFF_RELATIVE_PATH}: section 9 must not relist model comparison as unstarted`);
  }
  for (const [label, pattern] of [
    ["expert blocker", /専門家による構造位置・範囲・連続性の確認/],
    ["physical-device blocker", /公開回線の性能、物理端末、別GPU・別ブラウザの性能計測は未確認/],
    ["administrator blocker", /管理者による権利文書、Google Form、公開画面[\s\S]{0,40}未完了/],
    ["deployment boundary", /公開環境のroute表示[\s\S]{0,180}β版としての公開判断へは拡張しません/],
  ]) {
    if (!pattern.test(currentSection)) errors.push(`${WINDOWS_HANDOFF_RELATIVE_PATH}: section 9 is missing ${label}`);
  }
  if (!/成果はmainから作る新しい作業ブランチとPRへ記録します。/.test(text)) {
    errors.push(`${WINDOWS_HANDOFF_RELATIVE_PATH}: work handoff must direct results to a new branch and PR`);
  }
  if (!/main統合・公開サイト更新・公開環境の確認は、管理者の明示承認なしに行わない/.test(text)) {
    errors.push(`${WINDOWS_HANDOFF_RELATIVE_PATH}: deployment guard must remain explicit`);
  }
  return {ok: errors.length === 0, errors};
}

export function validateSnapshotDocumentMarkers({rootDir = REPOSITORY_ROOT, documentTexts = {}} = {}) {
  const errors = [];
  for (const document of SNAPSHOT_MARKER_DOCUMENTS) {
    let text;
    try {
      text = Object.hasOwn(documentTexts, document) ? documentTexts[document] : readText(rootDir, document);
    } catch (error) {
      errors.push(`${document}: could not read snapshot marker document: ${error.message}`);
      continue;
    }
    const exactCount = occurrenceCount(text, SNAPSHOT_MARKER_BLOCK);
    const startCount = occurrenceCount(text, "<!-- beta-current-snapshot:start -->");
    const endCount = occurrenceCount(text, "<!-- beta-current-snapshot:end -->");
    if (exactCount !== 1 || startCount !== 1 || endCount !== 1) {
      errors.push(`${document}: exact beta current snapshot marker block must appear once (exact=${exactCount}, start=${startCount}, end=${endCount})`);
    }
  }
  return {ok: errors.length === 0, errors};
}

function derivePwaFacts(rootDir) {
  const auditText = readText(rootDir, PWA_AUDIT_RELATIVE_PATH);
  const baseCount = PWA_AUDIT_BASES.length;
  const actionsPerBase = PWA_AUDIT_ACTION_NAMES.length;
  const expectedChecks = baseCount * actionsPerBase;
  const baseIdentities = PWA_AUDIT_BASES.map(base => ({
    id: base.id,
    basePath: base.basePath,
    expectedPathname: base.expectedPathname,
  }));
  const actionNames = [...PWA_AUDIT_ACTION_NAMES];
  if (PWA_DEFAULT_HOST !== "127.0.0.1") throw new Error("PWA audit default host must remain the loopback address 127.0.0.1");
  if (baseIdentities.length !== baseCount || actionNames.length !== actionsPerBase) {
    throw new Error("PWA audit base/action constants disagree with their matrix counts");
  }
  const currentSection = markdownSection(auditText, "## 2026-08-24 コミット63e6974再監査");
  const currentEvidenceDocumented = /通常[／/]Pagesの本番生成物/.test(currentSection)
    && /各base\s*10 action、合計20\/20、blocker\s*0/.test(currentSection)
    && /runner所有HTTP server停止/.test(currentSection)
    && /`ECONNREFUSED`/.test(currentSection)
    && /同じhost／portへのTCP接続/.test(currentSection)
    && /物理／OSネットワーク断、公開URL、物理端末/.test(currentSection)
    && /インストール済みPWA、ホーム画面追加と追加後起動/.test(currentSection);
  if (!currentEvidenceDocumented) throw new Error("PWA_OFFLINE_AUDIT.md lacks the current local-runner evidence marker");
  if (!PWA_NETWORK_POLICY.serverControlled || PWA_NETWORK_POLICY.networkEmulation !== false || PWA_NETWORK_POLICY.serviceWorkerInterception !== false) {
    throw new Error("PWA audit network policy drifted from runner-owned server control");
  }
  const blockerMatch = currentSection.match(/合計\s*\d+\/\d+、blocker\s*(\d+)/);
  const blockerCount = Number(blockerMatch?.[1]);
  if (!Number.isInteger(blockerCount) || blockerCount !== SNAPSHOT_PWA_BLOCKER_COUNT) {
    throw new Error(`PWA current blockerCount must be ${SNAPSHOT_PWA_BLOCKER_COUNT}`);
  }
  const physicalNetworkUnverified = currentSection.includes("物理／OSネットワーク断、公開URL、物理端末")
    && currentSection.includes("確認したものではない");
  const installedPwaUnverified = currentSection.includes("インストール済みPWA、ホーム画面追加と追加後起動")
    && currentSection.includes("確認したものではない");
  if (!physicalNetworkUnverified || !installedPwaUnverified) {
    throw new Error("PWA current evidence must explicitly exclude physical/OS networking and installed-PWA evidence");
  }
  const scopeText = `${auditText}\n${readText(rootDir, "PWA_INSTALL_AFFORDANCE_AUDIT.md")}`;
  return {
    matrix: {
      baseCount,
      actionsPerBase,
      expectedChecks,
      baseIdentities,
      actionNames,
    },
    host: PWA_DEFAULT_HOST,
    blockerCount,
    runnerBoundary: {...SNAPSHOT_PWA_RUNNER_BOUNDARY},
    networkPolicy: {...PWA_NETWORK_POLICY},
    reportedEvidence: {
      document: PWA_AUDIT_RELATIVE_PATH,
      date: "2026-08-24",
      scope: "local-runner",
      status: "documented-not-recomputed",
    },
    unverifiedScope: {
      physicalNetworkOrOsOffline: /物理的なネットワーク[／/]OSオフライン/.test(scopeText),
      publicUrl: /公開URL/.test(scopeText),
      physicalDevice: /物理端末/.test(scopeText),
      installedPwaAndHomeScreenLaunch: /インストール済みPWA/.test(scopeText) && /ホーム画面追加/.test(scopeText),
      safariOrOtherBrowser: /Safari/.test(scopeText) && /別ブラウザ/.test(scopeText),
    },
    nonEvidence: {
      physicalOrOsNetworkDisconnect: {...SNAPSHOT_PWA_NON_EVIDENCE.physicalOrOsNetworkDisconnect},
      installedPwaAndHomeScreenLaunch: {...SNAPSHOT_PWA_NON_EVIDENCE.installedPwaAndHomeScreenLaunch},
    },
  };
}

export function deriveUnverifiedBoundaries(rootDir = REPOSITORY_ROOT) {
  const ledger = readJson(rootDir, "BETA_GO_NO_GO.json");
  const criteria = Array.isArray(ledger.criteria) ? ledger.criteria : [];
  const criterionById = id => criteria.find(criterion => criterion?.id === id);
  const currentPwaSection = markdownSection(readText(rootDir, PWA_AUDIT_RELATIVE_PATH), "## 2026-08-24 コミット63e6974再監査");
  const currentHandoffSection = markdownSection(readText(rootDir, WINDOWS_HANDOFF_RELATIVE_PATH), "## 9. 残る確認・承認事項");
  const criterionBoundaries = new Map(SNAPSHOT_UNVERIFIED_BOUNDARIES
    .filter(boundary => boundary.criterionId)
    .map(boundary => {
      const criterion = criterionById(boundary.criterionId);
      if (!criterion) throw new Error(`unverified boundary criterion is missing: ${boundary.criterionId}`);
      if (criterion.state !== boundary.expectedState) {
        throw new Error(`unverified boundary ${boundary.id} state drifted: expected ${boundary.expectedState}, found ${criterion.state}`);
      }
      if (criterion.blockingAuthority !== boundary.authority) {
        throw new Error(`unverified boundary ${boundary.id} blockingAuthority drifted from the Go/No-Go criterion`);
      }
      if (typeof criterion.unprovenScope !== "string" || criterion.unprovenScope.trim() === "") {
        throw new Error(`unverified boundary ${boundary.id} requires the criterion unprovenScope`);
      }
      return [boundary.id, {
        id: boundary.id,
        criterionId: boundary.criterionId,
        status: boundary.status,
        state: criterion.state,
        authority: boundary.authority,
        blockingAuthority: criterion.blockingAuthority,
        boundary: boundary.boundary,
        unprovenScope: criterion.unprovenScope,
      }];
    }));
  const physicalDevicesBoundary = SNAPSHOT_UNVERIFIED_BOUNDARIES.find(boundary => boundary.id === "physical-devices");
  const physicalNetworkBoundary = SNAPSHOT_UNVERIFIED_BOUNDARIES.find(boundary => boundary.id === "physical-os-networking");
  const installedPwaBoundary = SNAPSHOT_UNVERIFIED_BOUNDARIES.find(boundary => boundary.id === "installed-pwa");
  if (!currentHandoffSection.includes("公開回線の性能、物理端末、別GPU・別ブラウザの性能計測は未確認です")) {
    throw new Error("unverified boundary physical-devices is missing from current handoff section 9");
  }
  if (!currentPwaSection.includes("物理／OSネットワーク断、公開URL、物理端末")
      || !currentPwaSection.includes("確認したものではない")) {
    throw new Error("unverified boundary physical-os-networking is missing from the current PWA section");
  }
  if (!currentPwaSection.includes("インストール済みPWA、ホーム画面追加と追加後起動")
      || !currentPwaSection.includes("確認したものではない")) {
    throw new Error("unverified boundary installed-pwa is missing from the current PWA section");
  }
  if (!physicalDevicesBoundary || !physicalNetworkBoundary || !installedPwaBoundary) {
    throw new Error("unverified physical boundary constants are incomplete");
  }
  return SNAPSHOT_UNVERIFIED_BOUNDARIES.map(boundary => criterionBoundaries.get(boundary.id) ?? ({...boundary}));
}

function deriveOpticFacts(rootDir, registry, standardQuestions) {
  const auditText = `${readText(rootDir, OPTIC_AUDIT_RELATIVE_PATH)}\n${readText(rootDir, PROVENANCE_NOTES_RELATIVE_PATH)}`;
  const legacy = registry.entries.find(entry => entry?.legacyIds?.includes(33));
  const mammillary = registry.entries.find(entry => entry?.labelIds?.includes(39) && entry?.labelIds?.includes(40));
  const legacyEntryLearnerMappingCount = legacy
    ? LEARNER_PROVENANCE_MAPPINGS.filter(mapping => mapping.entryKeys?.includes(legacy.key)).length
    : -1;
  const perId = Object.fromEntries([36, 37, 38].map(id => [String(id), {
    adopted: registry.entries.some(entry => entry?.labelIds?.includes(id)),
  }]));
  const anyAdopted = Object.values(perId).some(value => value.adopted);
  const allAdopted = Object.values(perId).every(value => value.adopted);
  const id36To38AreUnsegmented = !anyAdopted
    && /ID 36–38[\s\S]{0,220}(?:機械分割せず|機械分割しません|未完了|分節待ち|未分節)/.test(auditText)
    && /専門家確認待ち|専門家レビュー待ち/.test(auditText);
  return {
    legacyId33: {
      legacyVolumeId33TargetExcluded: legacy?.excludedFromSectionAndQuizTargets === true
        && !legacy?.learnerSurfaces?.includes("sections")
        && !legacy?.learnerSurfaces?.includes("quiz")
        && legacyEntryLearnerMappingCount === 0,
      semanticOpticChiasmWrongOptionPresent: standardQuestions.some(question => question.options?.includes("opticChiasm")),
      legacyEntryLearnerMappingCount,
    },
    ids36To38: {
      status: allAdopted ? "adopted" : anyAdopted ? "partially-adopted" : id36To38AreUnsegmented ? "unsegmented" : "unknown",
      perId,
      anyAdopted,
      allAdopted,
      expertReviewPending: !allAdopted && /専門家確認待ち|専門家レビュー待ち/.test(auditText),
    },
    ids39To40: {
      status: mammillary?.projectReview === "reviewed-by-project" ? "adopted-project-reviewed" : "unknown",
      adopted: mammillary?.projectReview === "reviewed-by-project",
      projectReview: mammillary?.projectReview ?? null,
      expertReview: mammillary?.expertReview ?? null,
      orthogonalBoundaryReviewPending: mammillary?.expertReview === "pending"
        && /直交断[\s\S]{0,100}(?:継続|未完了|確認待ち)/.test(auditText),
    },
  };
}

function deriveGoNoGoFacts(rootDir) {
  const report = auditBetaGoNoGo({rootDir});
  if (!report.ok) throw new Error(`Go/No-Go audit failed: ${report.errors.join("; ")}`);
  return {
    criterionCount: report.summary.criterionCount,
    stateCounts: Object.fromEntries(STATE_ENUM.map(state => [state, report.summary.stateCounts[state]])),
  };
}

/** Collect only facts recomputed from the checked-in authoritative sources. */
export function deriveCurrentBetaSnapshot({rootDir = REPOSITORY_ROOT} = {}) {
  const markerAudit = validateSnapshotDocumentMarkers({rootDir});
  if (!markerAudit.ok) throw new Error(`snapshot document marker audit failed: ${markerAudit.errors.join("; ")}`);
  const registry = readJson(rootDir, PROVENANCE_RELATIVE_PATH);
  const learnerAudit = auditLearnerProvenance({rootDir});
  const reviewAudit = auditAnatomyReviewQueue({registry, rootDir, checkPage: false});
  const standardQuizAudit = auditQuizGranularity(rootDir);
  const pageSource = readText(rootDir, PAGE_RELATIVE_PATH);
  const neurovascularQuizAudit = auditNeurovascularQuiz({rootDir, source: pageSource});
  for (const [label, report] of [
    ["learner provenance", learnerAudit],
    ["anatomy review queue", reviewAudit],
    ["quiz granularity", standardQuizAudit],
    ["neurovascular quiz", neurovascularQuizAudit],
  ]) {
    if (!report?.ok) throw new Error(`${label} audit failed: ${(report?.errors ?? ["unknown failure"]).join("; ")}`);
  }
  const sourceCounts = {
    registryEntryCount: learnerAudit.summary?.entryCount ?? 0,
    expertPendingCount: reviewAudit.summary?.pendingCount ?? 0,
    reviewFilterCounts: {
      surface: reviewAudit.summary?.surfaceCount ?? 0,
      sections: reviewAudit.summary?.sectionsCount ?? 0,
      blocks: reviewAudit.summary?.blocksCount ?? 0,
      quiz: reviewAudit.summary?.quizCount ?? 0,
    },
    learnerMappings: {
      total: learnerAudit.summary?.mappingCount ?? 0,
      resolved: learnerAudit.summary?.resolvedCount ?? 0,
    },
  };
  const standardQuestionCount = standardQuizAudit.summary?.questionCount ?? 0;
  const neurovascularPilotCount = neurovascularQuizAudit.summary?.questionCount ?? 0;
  const standardQuestions = parseQuizGranularity(pageSource);
  const neurovascularQuestions = parseNeurovascularQuizInventory(pageSource);
  if (standardQuestions.length !== standardQuestionCount || neurovascularQuestions.length !== neurovascularPilotCount) {
    throw new Error("quiz parser counts disagree with successful quiz audits");
  }
  const standardTargets = new Set(standardQuestions.map(question => question.target));
  const overlappingTargets = neurovascularQuestions.map(question => question.target).filter(target => standardTargets.has(target));
  if (overlappingTargets.length > 0) throw new Error(`quiz inventories overlap: ${overlappingTargets.join(", ")}`);
  const routeCount = BETA_AUDIT_ROUTES.length;
  const viewportCount = BETA_AUDIT_VIEWPORTS.length;
  const phaseCount = BETA_AUDIT_PHASES.length;
  const goNoGo = deriveGoNoGoFacts(rootDir);
  return {
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    updated: SNAPSHOT_DATE,
    description: "Current beta-candidate snapshot. Values are checked against the provenance registry, learner mapping source, quiz inventories, canonical route contract, Go/No-Go ledger, PWA audit contract, and optic-pathway restrictions; this file is not an anatomical or expert approval record.",
    authoritativeSources: [...AUTHORITATIVE_SOURCES],
    provenance: sourceCounts,
    quiz: {
      existingQuestionCount: standardQuestionCount,
      neurovascularPilotCount,
      totalQuestionCount: standardQuestionCount + neurovascularPilotCount,
    },
    routes: {
      canonicalRouteCount: routeCount,
      viewportCount,
      phaseCount,
      expectedChecks: routeCount * viewportCount * phaseCount,
    },
    goNoGo,
    pwa: derivePwaFacts(rootDir),
    unverifiedBoundaries: deriveUnverifiedBoundaries(rootDir),
    opticPathway: deriveOpticFacts(rootDir, registry, standardQuestions),
  };
}

export function validateCurrentBetaSnapshot(snapshot, {rootDir = REPOSITORY_ROOT} = {}) {
  const errors = [];
  if (!isRecord(snapshot)) errors.push("snapshot must be an object");
  if (errors.length > 0) return {ok: false, errors, expected: null};
  let expected;
  try {
    expected = deriveCurrentBetaSnapshot({rootDir});
  } catch (error) {
    return {ok: false, errors: [`could not derive authoritative snapshot: ${error.message}`], expected: null};
  }
  addDifference(errors, expected, snapshot);
  if (snapshot.goNoGo?.stateCounts && JSON.stringify(Object.keys(snapshot.goNoGo.stateCounts)) !== JSON.stringify(STATE_ENUM)) {
    errors.push("goNoGo.stateCounts must use the existing state enum order");
  }
  return {
    ok: errors.length === 0,
    errors,
    expected,
    summary: {
      registryEntryCount: expected?.provenance?.registryEntryCount ?? null,
      mappingCount: expected?.provenance?.learnerMappings?.total ?? null,
      routeChecks: expected?.routes?.expectedChecks ?? null,
      pwaChecks: expected?.pwa?.matrix?.expectedChecks ?? null,
      pwaBlockerCount: expected?.pwa?.blockerCount ?? null,
      unverifiedBoundaryCount: expected?.unverifiedBoundaries?.length ?? null,
    },
  };
}

export function auditCurrentBetaSnapshot({snapshot, rootDir = REPOSITORY_ROOT, documentTexts = {}} = {}) {
  let loaded = snapshot;
  const errors = [];
  try {
    if (!loaded) loaded = readJson(rootDir, SNAPSHOT_RELATIVE_PATH);
  } catch (error) {
    return {ok: false, errors: [`could not read current beta snapshot: ${error.message}`], summary: {}};
  }
  const validation = validateCurrentBetaSnapshot(loaded, {rootDir});
  errors.push(...validation.errors);
  const handoffAudit = validateWindowsHandoffFreshness({
    rootDir,
    documentText: documentTexts[WINDOWS_HANDOFF_RELATIVE_PATH],
  });
  errors.push(...handoffAudit.errors);
  return {ok: errors.length === 0, errors, summary: validation.summary ?? {}};
}

function parseArgs(argv) {
  const args = {output: null};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--output") {
      args.output = argv[++index];
      if (!args.output) throw new Error("--output requires a path");
    } else if (arg === "--help" || arg === "-h") args.help = true;
    else throw new Error(`unknown option: ${arg}`);
  }
  return args;
}

export function main(argv = process.argv.slice(2)) {
  let args;
  try { args = parseArgs(argv); }
  catch (error) { console.error(error.message); process.exitCode = 1; return; }
  if (args.help) {
    console.log("Usage: node scripts/audit_current_beta_snapshot.mjs [--output path]");
    return;
  }
  const report = auditCurrentBetaSnapshot();
  const output = JSON.stringify({generatedAt: new Date().toISOString(), ...report}, null, 2);
  console.log(output);
  if (args.output) {
    const outputPath = path.resolve(REPOSITORY_ROOT, args.output);
    fs.mkdirSync(path.dirname(outputPath), {recursive: true});
    fs.writeFileSync(outputPath, `${output}\n`, "utf8");
  }
  if (!report.ok) process.exitCode = 1;
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : "";
if (import.meta.url === invokedPath) main();
