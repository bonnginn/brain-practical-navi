import assert from "node:assert/strict";
import {copyFile, mkdtemp, readFile, rm, writeFile} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import {
  auditCurrentBetaSnapshot,
  deriveCurrentBetaSnapshot,
  deriveUnverifiedBoundaries,
  SNAPSHOT_MARKER_BLOCK,
  SNAPSHOT_MARKER_DOCUMENTS,
  validateCurrentBetaSnapshot,
  validateWindowsHandoffFreshness,
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
    pwaBlockerCount: 0,
    unverifiedBoundaryCount: 6,
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
    baseIdentities: [
      {id: "normal", basePath: "/", expectedPathname: "/"},
      {id: "pages", basePath: "/brain-practical-navi/", expectedPathname: "/brain-practical-navi/"},
    ],
    actionNames: [
      "online-shell",
      "online-home",
      "online-visited-data",
      "offline-targets",
      "offline-visited-direct",
      "offline-visited-reload",
      "offline-navigation-fallback",
      "offline-unvisited-error",
      "online-restore",
      "retry-unvisited",
    ],
  });
  assert.equal(snapshot.pwa.host, "127.0.0.1");
  assert.equal(snapshot.pwa.blockerCount, 0);
  assert.deepEqual(snapshot.pwa.runnerBoundary, {
    owner: "pwa-audit-runner",
    host: "127.0.0.1",
    scope: "loopback",
    method: "runner-owned-static-server-stop",
    tcpFailure: "ECONNREFUSED",
    samePortRelisten: true,
  });
  assert.deepEqual(snapshot.pwa.networkPolicy, {
    serverControlled: true,
    pageNavigatorState: "observed-only",
    offlineBadgeRequired: false,
    ordinaryHttpCache: "clear-and-disable",
    cacheStoragePreserved: true,
    networkEmulation: false,
    serviceWorkerInterception: false,
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
  assert.deepEqual(snapshot.pwa.nonEvidence, {
    physicalOrOsNetworkDisconnect: {
      status: "unverified",
      boundary: "physical-or-os-network-disconnect",
    },
    installedPwaAndHomeScreenLaunch: {
      status: "unverified",
      boundary: "installed-pwa-and-home-screen-launch",
    },
  });
});

test("snapshot records the fixed unverified boundary set without implying completion", () => {
  assert.deepEqual(snapshot.unverifiedBoundaries, [
    {
      id: "expert-review",
      criterionId: "criterion-11-expert-required-scope-review",
      status: "unverified",
      state: "expert-blocked",
      authority: "neuroanatomy expert reviewer",
      blockingAuthority: "neuroanatomy expert reviewer",
      boundary: "anatomical validity, boundaries, adoption, and expert review records",
      unprovenScope: "神経解剖学の専門家による必修範囲のレビュー記録は未取得。",
    },
    {
      id: "deployment-public-url",
      criterionId: "criterion-12-publish-known-limitations",
      status: "unverified",
      state: "deployment-blocked",
      authority: "deployment operator / public host maintainer",
      blockingAuthority: "deployment operator / public host maintainer",
      boundary: "public URL reflection and public-environment route behavior",
      unprovenScope: "公開URLへの反映と専門家・管理者による既知の制限の確認は未完了。",
    },
    {
      id: "physical-devices",
      status: "unverified",
      authority: "physical-device test operator",
      boundary: "physical PC, tablet, smartphone, touch input, GPU, and browser behavior",
    },
    {
      id: "administrator-operations",
      criterionId: "criterion-10-feedback-operations",
      status: "unverified",
      state: "administrator-blocked",
      authority: "administrator / feedback-channel maintainer",
      blockingAuthority: "administrator / feedback-channel maintainer",
      boundary: "rights documents, external feedback operations, and publication-screen operations",
      unprovenScope: "現行外部フォームはα版表記のまま。版名非依存表記の適用、ログアウト状態の全3ページ、テスト回答、Google Formsと回答シート双方からの削除、管理者による運用確認は未完了。",
    },
    {
      id: "physical-os-networking",
      status: "unverified",
      authority: "physical-network/OS test operator",
      boundary: "physical or OS-level network disconnect; runner-owned loopback server stop is not this evidence",
    },
    {
      id: "installed-pwa",
      status: "unverified",
      authority: "physical-device/PWA test operator",
      boundary: "actual installation, home-screen addition, and post-install launch",
    },
  ]);
});

test("boundary derivation rejects exact ledger and current-document drift", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "beta-snapshot-boundaries-"));
  const sourceFiles = ["BETA_GO_NO_GO.json", "PWA_OFFLINE_AUDIT.md", "WINDOWS_HANDOFF.md"];
  try {
    for (const file of sourceFiles) await copyFile(new URL(file, root), path.join(tempRoot, file));
    const ledgerPath = path.join(tempRoot, "BETA_GO_NO_GO.json");
    const pwaPath = path.join(tempRoot, "PWA_OFFLINE_AUDIT.md");
    const handoffPath = path.join(tempRoot, "WINDOWS_HANDOFF.md");
    const readLedger = async () => JSON.parse(await readFile(ledgerPath, "utf8"));
    const writeLedger = ledger => writeFile(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`, "utf8");

    const expertState = await readLedger();
    expertState.criteria.find(item => item.id === "criterion-11-expert-required-scope-review").state = "proven-local";
    await writeLedger(expertState);
    assert.throws(() => deriveUnverifiedBoundaries(tempRoot), /expert-review state drifted/);

    await copyFile(new URL("BETA_GO_NO_GO.json", root), ledgerPath);
    const administratorAuthority = await readLedger();
    administratorAuthority.criteria.find(item => item.id === "criterion-10-feedback-operations").blockingAuthority = "project administrator";
    await writeLedger(administratorAuthority);
    assert.throws(() => deriveUnverifiedBoundaries(tempRoot), /administrator-operations blockingAuthority drifted/);

    await copyFile(new URL("BETA_GO_NO_GO.json", root), ledgerPath);
    const deploymentScope = await readLedger();
    deploymentScope.criteria.find(item => item.id === "criterion-12-publish-known-limitations").unprovenScope = "";
    await writeLedger(deploymentScope);
    assert.throws(() => deriveUnverifiedBoundaries(tempRoot), /deployment-public-url requires the criterion unprovenScope/);

    await copyFile(new URL("BETA_GO_NO_GO.json", root), ledgerPath);
    const pwa = await readFile(pwaPath, "utf8");
    await writeFile(pwaPath, pwa.replace("物理／OSネットワーク断、公開URL、物理端末", "公開URL、物理端末"), "utf8");
    assert.throws(() => deriveUnverifiedBoundaries(tempRoot), /physical-os-networking is missing/);

    await copyFile(new URL("PWA_OFFLINE_AUDIT.md", root), pwaPath);
    const handoff = await readFile(handoffPath, "utf8");
    await writeFile(handoffPath, handoff.replace("公開URL・物理端末・別GPU・別ブラウザの性能計測は未確認です", "公開URLの性能計測は未確認です"), "utf8");
    assert.throws(() => deriveUnverifiedBoundaries(tempRoot), /physical-devices is missing/);
  } finally {
    await rm(tempRoot, {recursive: true, force: true});
  }
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

test("Windows handoff is synchronized to the current Draft PR and local groundwork", async () => {
  const handoff = await readFile(new URL("WINDOWS_HANDOFF.md", root), "utf8");
  const result = validateWindowsHandoffFreshness({documentText: handoff});
  assert.equal(result.ok, true, result.errors.join("; "));
});

test("handoff validator rejects stale baselines, interruption, local publication, and unstarted section-9 claims", async () => {
  const handoff = await readFile(new URL("WINDOWS_HANDOFF.md", root), "utf8");
  const mutations = [
    [
      "baseline",
      handoff.replace("dd17284 Make feedback preflight contract exact", "7d6a811 Audit public rights and notices"),
      /stale handoff baseline/,
    ],
    [
      "interruption",
      handoff.replace("ここでいう確認は監査・実装・Draft PR更新の範囲に限り", "Mac側では、この基準コミット以降の実装作業を中断しています。ここでいう確認は監査・実装・Draft PR更新の範囲に限り"),
      /stale interruption wording/,
    ],
    [
      "local publication",
      handoff.replace("専門家監修を必要としないP0・P1項目を自律的に監査・実装・検証し", "専門家監修を必要としないP0・P1項目を自律的に監査・実装・検証・公開し"),
      /local publication directive/,
    ],
    [
      "main and new branch",
      handoff.replace("開始時に `git fetch origin`、`git switch codex/optic-orthogonal-review`、`git pull --ff-only`、`git status`、`git log -5 --oneline` を実行し、Draft PR #14の現行ブランチを継続してください。", "開始時に main をgit pull --ff-onlyし、新しい codex/ ブランチを作ってください。"),
      /stale main\/new-branch workflow/,
    ],
    [
      "section-9 unstarted heading",
      handoff.replace("## 9. 残る確認・承認事項", "## 9. Mac側で残した未着手事項"),
      /section 9 must not be an unstarted-items section/,
    ],
    [
      "orthogonal unstarted claim",
      handoff.replace("### 残る外部確認・承認", "- 冠状断・矢状断のセグメンテーション照合表示。\n\n### 残る外部確認・承認"),
      /relist orthogonal display as unstarted/,
    ],
    [
      "model comparison unstarted claim",
      handoff.replace("### 残る外部確認・承認", "- 現行再構成モデルと知識ベースモデルの比較試作。\n\n### 残る外部確認・承認"),
      /relist model comparison as unstarted/,
    ],
  ];
  for (const [label, mutatedText, expectedError] of mutations) {
    const result = validateWindowsHandoffFreshness({documentText: mutatedText});
    assert.equal(result.ok, false, `${label} mutation should fail`);
    assert.match(result.errors.join("\n"), expectedError, `${label} mutation error`);
  }

  for (const [label, phrase, expectedError] of [
    ["expert blocker", "- 専門家による構造位置・範囲・連続性の確認。\n", /section 9 is missing expert blocker/],
    ["physical blocker", "- 公開URL・物理端末・別GPU・別ブラウザの性能計測は未確認です（ローカルWindows Chromeの基礎31件＋全8標本context ON 48件＝79\/79件は完了）。\n", /section 9 is missing physical-device blocker/],
    ["administrator blocker", "- 管理者による権利文書、Google Form、公開画面をまたぐ最終実ブラウザ巡回は未完了です。\n", /section 9 is missing administrator blocker/],
    ["deployment blocker", "Codex内蔵ブラウザの管理ポリシーにより公開URL操作が拒否された経路は、上記のローカル実画面計測とは区別します。そのため、公開環境の実画面計測を推測で完了扱いにはしていません。", /section 9 is missing deployment blocker/],
  ]) {
    const result = validateWindowsHandoffFreshness({documentText: handoff.replace(phrase, "")});
    assert.equal(result.ok, false, `${label} removal should fail`);
    assert.match(result.errors.join("\n"), expectedError, `${label} removal error`);
  }

  const integratedMutation = handoff.replace("### 残る外部確認・承認", "- 冠状断・矢状断のセグメンテーション照合表示。\n\n### 残る外部確認・承認");
  const integrated = auditCurrentBetaSnapshot({
    snapshot,
    documentTexts: {"WINDOWS_HANDOFF.md": integratedMutation},
  });
  assert.equal(integrated.ok, false);
  assert.match(integrated.errors.join("\n"), /WINDOWS_HANDOFF\.md: section 9 must not relist orthogonal display as unstarted/);
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

test("validator rejects PWA boundary, blocker, non-evidence, and unverified-boundary mutations", () => {
  const mutations = [
    ["blocker count", snapshot => { snapshot.pwa.blockerCount = 1; }, /pwa\.blockerCount/],
    ["base id", snapshot => { snapshot.pwa.matrix.baseIdentities[0].id = "pages"; }, /pwa\.matrix\.baseIdentities\[0\]\.id/],
    ["base path", snapshot => { snapshot.pwa.matrix.baseIdentities[1].basePath = "/"; }, /pwa\.matrix\.baseIdentities\[1\]\.basePath/],
    ["action order", snapshot => { [snapshot.pwa.matrix.actionNames[0], snapshot.pwa.matrix.actionNames[1]] = [snapshot.pwa.matrix.actionNames[1], snapshot.pwa.matrix.actionNames[0]]; }, /pwa\.matrix\.actionNames\[0\]/],
    ["action identity", snapshot => { snapshot.pwa.matrix.actionNames[9] = "retry-other"; }, /pwa\.matrix\.actionNames\[9\]/],
    ["host", snapshot => { snapshot.pwa.host = "localhost"; }, /pwa\.host/],
    ["runner owner", snapshot => { snapshot.pwa.runnerBoundary.owner = "browser"; }, /pwa\.runnerBoundary\.owner/],
    ["server stop method", snapshot => { snapshot.pwa.runnerBoundary.method = "physical-network-disconnect"; }, /pwa\.runnerBoundary\.method/],
    ["ordinary cache policy", snapshot => { snapshot.pwa.networkPolicy.ordinaryHttpCache = "preserve"; }, /pwa\.networkPolicy\.ordinaryHttpCache/],
    ["cache storage policy", snapshot => { snapshot.pwa.networkPolicy.cacheStoragePreserved = false; }, /pwa\.networkPolicy\.cacheStoragePreserved/],
    ["network emulation policy", snapshot => { snapshot.pwa.networkPolicy.networkEmulation = true; }, /pwa\.networkPolicy\.networkEmulation/],
    ["worker interception policy", snapshot => { snapshot.pwa.networkPolicy.serviceWorkerInterception = true; }, /pwa\.networkPolicy\.serviceWorkerInterception/],
    ["non-evidence status", snapshot => { snapshot.pwa.nonEvidence.installedPwaAndHomeScreenLaunch.status = "proven"; }, /pwa\.nonEvidence\.installedPwaAndHomeScreenLaunch\.status/],
    ["boundary status", snapshot => { snapshot.unverifiedBoundaries[0].status = "verified"; }, /unverifiedBoundaries\[0\]\.status/],
    ["boundary state", snapshot => { snapshot.unverifiedBoundaries[0].state = "proven-local"; }, /unverifiedBoundaries\[0\]\.state/],
    ["boundary ledger authority", snapshot => { snapshot.unverifiedBoundaries[1].blockingAuthority = "project administrator"; }, /unverifiedBoundaries\[1\]\.blockingAuthority/],
    ["boundary unproven scope", snapshot => { snapshot.unverifiedBoundaries[2].unprovenScope = "complete"; }, /unverifiedBoundaries\[2\]\.unprovenScope/],
    ["boundary authority", snapshot => { snapshot.unverifiedBoundaries[4].authority = "browser automation"; }, /unverifiedBoundaries\[4\]\.authority/],
    ["boundary removal", snapshot => { snapshot.unverifiedBoundaries.pop(); }, /unverifiedBoundaries/],
  ];
  for (const [label, mutate, expectedError] of mutations) {
    const mutated = structuredClone(snapshot);
    mutate(mutated);
    const result = validateCurrentBetaSnapshot(mutated);
    assert.equal(result.ok, false, `${label} mutation should fail`);
    assert.match(result.errors.join("\n"), expectedError, `${label} mutation error`);
  }
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
