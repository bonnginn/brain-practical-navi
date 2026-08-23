import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

import {
  PWA_AUDIT_ACTION_NAMES,
  PWA_AUDIT_ROUTES,
  PWA_AUDIT_VIEWPORT,
  PWA_NETWORK_POLICY,
  PWA_OFFLINE_SCHEMA_VERSION,
  PWA_OFFLINE_TOOL,
  PWA_SHELL_ENTRY_COUNT,
  aggregatePwaOfflineAuditReport,
  buildPwaOfflineMatrix,
  canonicalBaseUrl,
  createStaticServerController,
  parsePwaOfflineArgs,
  validatePwaOfflineAuditReport,
  validatePwaOfflineResult,
} from "../scripts/audit_pwa_offline_browser.mjs";

const NORMAL_ROOT = resolve("work/pwa-offline-builds/normal");
const PAGES_ROOT = resolve("work/pwa-offline-builds/pages");
const ENABLE_TIME = "2026-08-23T00:00:01.000Z";
const STOP_TIME = "2026-08-23T00:00:04.000Z";
const REFUSAL_TIME = "2026-08-23T00:00:04.100Z";
const RELISTEN_TIME = "2026-08-23T00:00:05.000Z";
const RETRY_TIME = "2026-08-23T00:00:06.000Z";

function expectedAsset(base) { return new URL("atlas/bigbrain-icbm500.bin.gz", base.baseUrl).href; }

function probe(base, hash, { error = false, canvasCount = 1 } = {}) {
  return {
    readyState: "complete",
    hash,
    appRootPresent: true,
    controllerUrl: new URL("service-worker.js", base.baseUrl).href,
    navigatorOnLine: true,
    offlineStatusVisible: false,
    loadingCount: 0,
    uiErrors: error ? [{ text: "データを読み込めませんでした", role: "alert", className: "atlasLoading error" }] : [],
    errorVisible: error,
    errorText: error ? "データを読み込めませんでした" : "",
    retryVisible: error,
    retryText: error ? ["再読み込み"] : [],
    canvasCount,
    webglFallback: false,
    clientWidth: PWA_AUDIT_VIEWPORT.width,
    clientHeight: PWA_AUDIT_VIEWPORT.height,
    scrollWidth: PWA_AUDIT_VIEWPORT.width,
    horizontalOverflow: false,
    mainText: "脳実習アプリ",
  };
}

function cache(base, { includeExpected = false } = {}) {
  const names = ["brain-practical-navi-shell-fixture", "brain-practical-navi-data-fixture"];
  const entries = {
    [names[0]]: [new URL("./", base.baseUrl).href, new URL("service-worker.js", base.baseUrl).href, new URL("assets/index.js", base.baseUrl).href, new URL("assets/index.css", base.baseUrl).href, new URL("manifest.webmanifest", base.baseUrl).href],
    [names[1]]: includeExpected ? [expectedAsset(base)] : [new URL("atlas/surface-lateral.mesh", base.baseUrl).href],
  };
  return { names, entries, shellNames: [names[0]], dataNames: [names[1]] };
}

function serverEvidence(base, runToken) {
  const target = expectedAsset(base);
  return {
    runToken,
    buildRoot: base.buildRoot,
    basePath: base.basePath,
    host: base.host,
    port: base.port,
    listening: false,
    starts: [
      { ack: true, reason: "initial", host: base.host, port: base.port, timestamp: ENABLE_TIME, runToken },
      { ack: true, reason: "relisten-after-refusal", host: base.host, port: base.port, timestamp: RELISTEN_TIME, runToken },
    ],
    stops: [
      { ack: true, reason: "network-stop", host: base.host, port: base.port, timestamp: STOP_TIME, listenerClosed: true, socketsTracked: 2, socketsDestroyed: 2, runToken },
      { ack: true, reason: "cleanup", host: base.host, port: base.port, timestamp: "2026-08-23T00:00:07.000Z", listenerClosed: true, socketsTracked: 0, socketsDestroyed: 0, runToken },
    ],
    refusals: [{ refused: true, code: "ECONNREFUSED", host: base.host, port: base.port, timestamp: REFUSAL_TIME, runToken }],
    relistens: [{ ack: true, reason: "relisten-after-refusal", host: base.host, port: base.port, timestamp: RELISTEN_TIME, afterRefusalAt: REFUSAL_TIME, runToken }],
    requestLog: [
      { runToken, host: base.host, port: base.port, method: "GET", url: new URL("/", base.baseUrl).href, path: "/", timestamp: "2026-08-23T00:00:02.000Z", status: 200, bytes: 100 },
      { runToken, host: base.host, port: base.port, method: "GET", url: target, path: "/atlas/bigbrain-icbm500.bin.gz", timestamp: "2026-08-23T00:00:06.100Z", status: 200, bytes: 10 },
    ],
    socketCount: 0,
  };
}

function httpCache() {
  return {
    commands: [
      { method: "Network.clearBrowserCache", params: {}, targetType: "page", targetId: "page", sessionId: null, timestamp: ENABLE_TIME, ack: true },
      { method: "Network.setCacheDisabled", params: { cacheDisabled: true }, targetType: "page", targetId: "page", sessionId: null, timestamp: "2026-08-23T00:00:01.100Z", ack: true },
    ],
    cacheStoragePreserved: true,
  };
}

function stoppedTrace(base, timestamp) {
  return { requests: [], responses: [{ url: base.baseUrl, status: 200, fromServiceWorker: true, timestamp }], failures: [] };
}

function validResult(base) {
  const runToken = `fixture-${base.id}`;
  const stopPhase = { state: "stopped", since: STOP_TIME };
  const visited = probe(base, PWA_AUDIT_ROUTES.visitedData);
  const actions = [
    { name: "online-shell", details: { probe: probe(base, PWA_AUDIT_ROUTES.home, { canvasCount: 0 }), serviceWorker: { active: "activated", scope: new URL(base.basePath, base.baseUrl).href, controllerUrl: new URL("service-worker.js", base.baseUrl).href }, cache: cache(base), shellEntryCount: PWA_SHELL_ENTRY_COUNT } },
    { name: "online-home", details: { probe: probe(base, PWA_AUDIT_ROUTES.home, { canvasCount: 0 }), url: `${base.baseUrl}${PWA_AUDIT_ROUTES.home}` } },
    { name: "online-visited-data", details: { probe: visited, basicOperation: { exercised: true, canvasCount: 1 }, cache: cache(base), expectedAsset: expectedAsset(base), expectedAssetAbsentBeforeStop: true, url: `${base.baseUrl}${PWA_AUDIT_ROUTES.visitedData}` } },
    { name: "offline-targets", details: { serverStop: serverEvidence(base, runToken).stops[0], tcpRefusal: serverEvidence(base, runToken).refusals[0], httpCache: httpCache(), cacheBeforeStop: cache(base) } },
    { name: "offline-visited-direct", details: { probe: visited, basicOperation: { exercised: true }, serverPhase: { state: "stopped", unavailableAt: REFUSAL_TIME }, observedAt: "2026-08-23T00:00:04.200Z", network: stoppedTrace(base, "2026-08-23T00:00:04.200Z") } },
    { name: "offline-visited-reload", details: { probe: visited, serverPhase: { state: "stopped", unavailableAt: REFUSAL_TIME }, observedAt: "2026-08-23T00:00:04.300Z", network: stoppedTrace(base, "2026-08-23T00:00:04.300Z") } },
    { name: "offline-navigation-fallback", details: { probe: visited, serverPhase: { state: "stopped", unavailableAt: REFUSAL_TIME }, observedAt: "2026-08-23T00:00:04.400Z", network: stoppedTrace(base, "2026-08-23T00:00:04.400Z") } },
    { name: "offline-unvisited-error", details: { probe: probe(base, PWA_AUDIT_ROUTES.unvisitedData, { error: true, canvasCount: 0 }), cacheBeforeRetry: cache(base), expectedAsset: expectedAsset(base), expectedAssetAbsent: true, serverPhase: { state: "stopped", unavailableAt: REFUSAL_TIME }, observedAt: "2026-08-23T00:00:04.800Z", requestLog: serverEvidence(base, runToken).requestLog, network: { requests: [], responses: [], failures: [] } } },
    { name: "online-restore", details: { serverRelisten: serverEvidence(base, runToken).relistens[0], probe: probe(base, PWA_AUDIT_ROUTES.unvisitedData, { error: true, canvasCount: 0 }) } },
    { name: "retry-unvisited", details: { retry: { clicked: true }, clicked: true, retryClickedAt: RETRY_TIME, probe: probe(base, PWA_AUDIT_ROUTES.unvisitedData), cacheBefore: cache(base), cacheAfter: cache(base, { includeExpected: true }), cacheGrowth: 1, expectedAsset: expectedAsset(base), targetRequestsAfterRetry: [{ method: "GET", url: expectedAsset(base), status: 200, timestamp: "2026-08-23T00:00:06.100Z" }], requestLog: serverEvidence(base, runToken).requestLog, network: { requests: [], responses: [], failures: [] }, serverRelisten: serverEvidence(base, runToken).relistens[0] } },
  ];
  const result = {
    schemaVersion: PWA_OFFLINE_SCHEMA_VERSION,
    generatedAt: "2026-08-23T00:00:07.000Z",
    tool: PWA_OFFLINE_TOOL,
    key: base.id,
    baseId: base.id,
    baseUrl: base.baseUrl,
    buildRoot: base.buildRoot,
    expectedScopePath: base.expectedScopePath,
    host: base.host,
    port: base.port,
    viewport: { ...PWA_AUDIT_VIEWPORT },
    environment: { os: { platform: "win32", release: "10.0.26100", version: "Windows 11", arch: "x64" }, cpuCount: 16, memoryBytes: { total: 32 * 1024 ** 3, free: 16 * 1024 ** 3 }, nodeVersion: "v24.19.0", browser: { executable: "chrome.exe", product: "Chrome/151.0.0.0", userAgent: "HeadlessChrome/151.0.0.0" } },
    browser: { executable: "chrome.exe", product: "Chrome/151.0.0.0", userAgent: "HeadlessChrome/151.0.0.0" },
    networkPolicy: { ...PWA_NETWORK_POLICY },
    server: serverEvidence(base, runToken),
    httpCachePolicy: httpCache(),
    cacheBeforeStop: cache(base),
    cacheAfterRetry: cache(base, { includeExpected: true }),
    actions,
    blockers: [],
    passed: true,
  };
  result.validation = validatePwaOfflineResult(result, base);
  return result;
}

function fixtureReport() {
  const matrix = buildPwaOfflineMatrix({ normalBuildRoot: NORMAL_ROOT, pagesBuildRoot: PAGES_ROOT, normalPort: 4420, pagesPort: 4421 });
  const results = matrix.map(validResult);
  return aggregatePwaOfflineAuditReport({ matrix, results, environment: results[0].environment, generatedAt: "2026-08-23T00:00:08.000Z" });
}

test("PWA audit fixes the exact two-base build-root and same-port matrix", () => {
  const matrix = buildPwaOfflineMatrix({ normalBuildRoot: NORMAL_ROOT, pagesBuildRoot: PAGES_ROOT, normalPort: 4420, pagesPort: 4421 });
  assert.deepEqual(matrix.map(item => [item.id, item.basePath, item.port]), [["normal", "/", 4420], ["pages", "/brain-practical-navi/", 4421]]);
  assert.deepEqual(matrix.map(item => item.buildRoot), [NORMAL_ROOT, PAGES_ROOT]);
  assert.equal(canonicalBaseUrl("http://127.0.0.1:4420"), "http://127.0.0.1:4420/");
  assert.equal(PWA_AUDIT_ACTION_NAMES.length, 10);
});

test("CLI requires both owned build roots and rejects a caller-supplied base URL", () => {
  const parsed = parsePwaOfflineArgs(["--normal-build-root", NORMAL_ROOT, "--pages-build-root", PAGES_ROOT, "--output", "work/pwa/report.json"]);
  assert.equal(parsed.normalBuildRoot, NORMAL_ROOT);
  assert.throws(() => parsePwaOfflineArgs(["--base-url", "http://127.0.0.1:4173/", "--output", "out.json"]), /unknown option/);
});

test("static server controller exposes same-port stop/refusal/relisten and socket evidence without launching Chrome", async () => {
  const controller = createStaticServerController({ root: NORMAL_ROOT, basePath: "/", host: "127.0.0.1", port: 4422, runToken: "unit-server" });
  const start = await controller.start();
  assert.equal(start.ack, true);
  const stop = await controller.stopAndVerify();
  assert.equal(stop.stopped.listenerClosed, true);
  assert.deepEqual(stop.refusal, { refused: true, code: "ECONNREFUSED", host: "127.0.0.1", port: 4422, timestamp: stop.refusal.timestamp, runToken: "unit-server" });
  const relisten = await controller.relisten();
  assert.equal(relisten.port, 4422);
  await controller.stop("cleanup");
});

test("independent PWA report validation accepts the complete fixture", () => {
  const report = fixtureReport();
  assert.equal(report.allPassed, true);
  assert.equal(validatePwaOfflineAuditReport(report).passed, true);
});

test("validator rejects self-reported pass, wrong identity, cache policy, refusal, timing, and retry evidence", () => {
  const mutations = [
    ["false self-report", report => { report.matrix.results[0].passed = false; }, /result\.passed/],
    ["wrong build root", report => { report.matrix.results[0].server.buildRoot = "C:\\wrong"; }, /build root/],
    ["wrong base", report => { report.matrix.results[0].baseUrl = "http://127.0.0.1:9999/"; }, /base\/port identity/],
    ["missing clear ACK", report => { report.matrix.results[0].httpCachePolicy.commands[0].ack = false; }, /clear ACK/],
    ["cache storage cleared claim", report => { report.matrix.results[0].httpCachePolicy.cacheStoragePreserved = false; }, /preserve Cache/],
    ["missing refusal", report => { report.matrix.results[0].server.refusals = []; }, /ECONNREFUSED/],
    ["wrong refusal code", report => { report.matrix.results[0].server.refusals[0].code = "TIMEOUT"; }, /ECONNREFUSED/],
    ["relisten before refusal", report => { report.matrix.results[0].server.relistens[0].timestamp = ENABLE_TIME; }, /relisten/],
    ["successful target during stop", report => { report.matrix.results[0].server.requestLog[1].timestamp = "2026-08-23T00:00:04.500Z"; }, /unavailable window/],
    ["missing action", report => { report.matrix.results[0].actions.pop(); }, /actions are incomplete/],
    ["retry before relisten", report => { report.matrix.results[0].actions.at(-1).details.retryClickedAt = STOP_TIME; }, /before relisten/],
    ["no cache growth", report => { report.matrix.results[0].actions.at(-1).details.cacheGrowth = 0; }, /Cache Storage did not grow/],
    ["missing target GET", report => { report.matrix.results[0].actions.at(-1).details.requestLog = report.matrix.results[0].actions.at(-1).details.requestLog.filter(entry => entry.status !== 200 || !entry.url.includes("bigbrain-icbm500")); }, /target GET success/],
  ];
  for (const [label, mutate, matcher] of mutations) {
    const report = fixtureReport();
    mutate(report);
    const validation = validatePwaOfflineAuditReport(report);
    assert.equal(validation.passed, false, label);
    assert.match(validation.failures.join("\n"), matcher, label);
  }
});

test("stopped cached operation does not require navigator.onLine=false or an offline badge", () => {
  const report = fixtureReport();
  for (const item of report.matrix.results[0].actions) {
    if (item.name.startsWith("offline-visited")) {
      item.details.probe.navigatorOnLine = true;
      item.details.probe.offlineStatusVisible = false;
    }
  }
  const validation = validatePwaOfflineAuditReport(report);
  assert.equal(validation.passed, true, validation.failures.join("\n"));
});

test("hardening rejects stale document traces, malformed error probes, wrong provenance, dimensions, and cleanup cardinality", () => {
  const mutations = [
    ["missing cached document response", report => { report.matrix.results[0].actions[4].details.network.responses = []; }, /cached document response/],
    ["wrong cached document status", report => { report.matrix.results[0].actions[5].details.network.responses[0].status = 304; }, /cached document response/],
    ["document response outside unavailable interval", report => { report.matrix.results[0].actions[6].details.network.responses[0].timestamp = RELISTEN_TIME; }, /cached document response/],
    ["wrong error hash", report => { report.matrix.results[0].actions[7].details.probe.hash = PWA_AUDIT_ROUTES.visitedData; }, /probe health/],
    ["loading during error", report => { report.matrix.results[0].actions[7].details.probe.loadingCount = 1; }, /probe health/],
    ["missing retry text", report => { report.matrix.results[0].actions[7].details.probe.retryText = []; }, /error\/retry/],
    ["wrong unavailable boundary", report => { report.matrix.results[0].actions[4].details.serverPhase.unavailableAt = STOP_TIME; }, /stopped server phase/],
    ["wrong probe width", report => { report.matrix.results[0].actions[4].details.probe.clientWidth = 375; }, /dimensions/],
    ["wrong probe height", report => { report.matrix.results[0].actions[5].details.probe.clientHeight = 800; }, /dimensions/],
    ["wrong retry probe width", report => { report.matrix.results[0].actions[9].details.probe.clientWidth = 390; }, /dimensions/],
    ["wrong operating system", report => { report.environment.os.platform = "linux"; }, /Windows/],
    ["wrong node major", report => { report.environment.nodeVersion = "v22.0.0"; }, /Node major 24/],
    ["wrong browser major", report => { report.matrix.results[0].browser.product = "Chrome/150.0.0.0"; }, /HeadlessChrome/],
    ["different browser identity", report => { report.matrix.results[1].browser.userAgent = "HeadlessChrome/152.0.0.0"; }, /browser identity/],
    ["listener remains", report => { report.matrix.results[0].server.listening = true; }, /no listener/],
    ["extra primary start", report => { report.matrix.results[0].server.starts.push({ ...report.matrix.results[0].server.starts[1] }); }, /start\/relisten evidence/],
    ["request during unavailable interval", report => { report.matrix.results[0].server.requestLog.push({ ...report.matrix.results[0].server.requestLog[0], timestamp: "2026-08-23T00:00:04.500Z" }); }, /request log is not empty/],
  ];
  for (const [label, mutate, matcher] of mutations) {
    const report = fixtureReport();
    mutate(report);
    const validation = validatePwaOfflineAuditReport(report);
    assert.equal(validation.passed, false, label);
    assert.match(validation.failures.join("\n"), matcher, label);
  }
});

test("audit source contains no worker request interception or deprecated network emulation", async () => {
  const source = await readFile(new URL("../scripts/audit_pwa_offline_browser.mjs", import.meta.url), "utf8");
  const interceptionWord = ["Fe", "tch"].join("");
  const deprecatedWorkerFlag = ["emulateOffline", "ServiceWorker"].join("");
  assert.doesNotMatch(source, new RegExp(`${interceptionWord}\\.(enable|requestPaused|failRequest|disable)`));
  assert.doesNotMatch(source, new RegExp(`Network\\.emulateNetworkConditions|${deprecatedWorkerFlag}`));
  assert.match(source, /root:\s*base\.buildRoot[\s\S]*basePath:\s*base\.basePath[\s\S]*port:\s*base\.port/);
});
