import assert from "node:assert/strict";
import test from "node:test";

import {
  BLOCK_CONTEXT_PERFORMANCE_AUDIT_SCHEMA_VERSION,
  BLOCK_CONTEXT_SAMPLED_PEAK_LIMIT_BYTES,
  BLOCK_CONTEXT_SETTLED_BACKING_LIMIT_BYTES,
  BLOCK_CONTEXT_STABLE_TIME_LIMIT_MS,
  EXPECTED_CONTEXT_REQUEST_PATHS,
  auditBlockContextPerformance,
  auditBlockContextPerformanceReport,
  deriveArtifactBodyByteSum,
  parseArgs,
} from "../scripts/audit_block_context_performance.mjs";
import {
  aggregateSuiteResults,
  buildPerformanceMatrix,
} from "../scripts/measure_browser_performance_suite.mjs";

const FIXTURE_ASSET_BYTES = 100;

function heap(backingStorageSize) {
  return {
    usedSize: 1,
    totalSize: 2,
    embedderHeapUsedSize: 3,
    backingStorageSize,
  };
}

function contextOn(bodyBytes) {
  return {
    encodedBytes: bodyBytes,
    requestCount: 7,
    uniqueRequestCount: 7,
    requestPaths: [...EXPECTED_CONTEXT_REQUEST_PATHS],
    stableTimeMs: 500,
    stable: true,
    stabilityReason: "quiet",
    canvasAfterLauncher: 2,
    canvasAfterSection: 2,
    canvasAfterClose: 1,
    loadingCount: 0,
    uiErrors: [],
    consoleErrors: [],
    requestErrors: [],
    webglFallback: false,
    horizontalOverflow: { detected: false, clientWidth: 1000, scrollWidth: 1000 },
    heap: {
      settled: heap(1_000),
      sampledPeak: heap(2_000),
    },
  };
}

function contextBaseline() {
  return {
    encodedBytes: 1,
    requestCount: 1,
    uniqueRequestCount: 1,
    requestPaths: ["/"],
    stableTimeMs: 1,
    canvasCount: 1,
    loadingCount: 0,
    uiErrors: [],
    consoleErrors: [],
    requestErrors: [],
    webglFallback: false,
    horizontalOverflow: { detected: false, clientWidth: 1000, scrollWidth: 1000 },
    heap: {
      settled: heap(10),
      sampledPeak: heap(20),
    },
  };
}

function resultFor(entry, bodyBytes) {
  const result = {
    schemaVersion: 1,
    generatedAt: "2026-08-23T00:00:00.100Z",
    tool: "scripts/measure_browser_performance.mjs",
    baseUrl: "http://127.0.0.1:4173/",
    key: entry.key,
    routeId: entry.routeId,
    route: entry.route,
    url: new URL(entry.route, "http://127.0.0.1:4173/").href,
    viewportId: entry.viewportId,
    viewport: { width: entry.width, height: entry.height },
    mode: entry.mode,
    scenario: entry.scenario,
    browser: {
      executable: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      product: "Chrome/151.0.0.0",
      userAgent: "Mozilla/5.0 HeadlessChrome/151.0.0.0",
    },
    networkPolicy: { serviceWorkerBypass: true },
    encodedBytes: 1,
    requestCount: 1,
    uniqueRequestCount: 1,
    requestPaths: ["/"],
    dclMs: 1,
    stableTimeMs: 1,
    consoleErrors: [],
    requestErrors: [],
    canvasCount: entry.scenario === "block-context" ? 1 : 0,
    loadingCount: 0,
    uiErrors: [],
    appRootPresent: true,
    stable: true,
    stabilityReason: "stable",
    webglFallback: false,
    horizontalOverflow: { detected: false, clientWidth: entry.width, scrollWidth: entry.width },
    heap: { settled: heap(10), sampledPeak: heap(20) },
    interactions: [],
    measurementPassed: true,
    validation: { passed: true, failures: [] },
  };
  if (entry.scenario === "block-context") {
    result.blockContext = {
      enabled: true,
      scenario: "block-context",
      route: entry.route,
      baseline: contextBaseline(),
      on: contextOn(bodyBytes),
      additional: contextOn(bodyBytes),
      interactions: [],
    };
  }
  return result;
}

async function fixture() {
  const artifact = await deriveArtifactBodyByteSum({
    projectRoot: "fixture-project",
    assetStat: async () => ({ isFile: () => true, size: FIXTURE_ASSET_BYTES }),
  });
  const matrix = buildPerformanceMatrix();
  const report = aggregateSuiteResults({
    baseUrl: "http://127.0.0.1:4173/",
    matrix,
    results: matrix.map(entry => resultFor(entry, artifact.bodyBytes)),
    generatedAt: "2026-08-23T00:00:00.000Z",
    environment: {
      os: { platform: "win32", release: "10.0.26200", version: "Windows 11", arch: "x64" },
      cpuCount: 16,
      memoryBytes: { total: 32 * 1024 * 1024 * 1024, free: 16 * 1024 * 1024 * 1024 },
      nodeVersion: "v24.19.0",
    },
  });
  return { report, artifact };
}

function audited(report, artifact) {
  return auditBlockContextPerformance(report, { artifact });
}

function mutateContextReport(report, mutate) {
  const copy = structuredClone(report);
  const context = copy.matrix.results.find(result => result.scenario === "block-context");
  assert.ok(context);
  mutate(context.blockContext.on, context);
  return copy;
}

test("audit accepts the complete 79-entry report and derives seven asset sizes with stat", async () => {
  const { report, artifact } = await fixture();
  const result = audited(report, artifact);

  assert.equal(result.schemaVersion, BLOCK_CONTEXT_PERFORMANCE_AUDIT_SCHEMA_VERSION);
  assert.equal(result.passed, true);
  assert.deepEqual(result.counts, {
    expected: 79,
    observed: 79,
    base: 31,
    context: 48,
    contextRoutes: 8,
    contextViewports: 3,
    contextModes: 2,
  });
  assert.equal(artifact.bodyBytes, EXPECTED_CONTEXT_REQUEST_PATHS.length * FIXTURE_ASSET_BYTES);
  assert.equal(artifact.assets.length, 7);
  assert.deepEqual(artifact.assets.map(asset => asset.path), EXPECTED_CONTEXT_REQUEST_PATHS);

  const reorderedArtifact = await deriveArtifactBodyByteSum({
    projectRoot: "fixture-project",
    requestPaths: [...EXPECTED_CONTEXT_REQUEST_PATHS].reverse(),
    assetStat: async () => ({ isFile: () => true, size: FIXTURE_ASSET_BYTES }),
  });
  assert.equal(reorderedArtifact.failures.length, 0);
  assert.equal(reorderedArtifact.bodyBytes, artifact.bodyBytes);

  const statBacked = await auditBlockContextPerformanceReport(report, {
    projectRoot: "fixture-project",
    assetStat: async () => ({ isFile: () => true, size: FIXTURE_ASSET_BYTES }),
  });
  assert.equal(statBacked.passed, true);
});

test("audit requires exact unique coverage and all result pass markers", async () => {
  const { report, artifact } = await fixture();

  const missing = structuredClone(report);
  missing.matrix.results.pop();
  assert.equal(audited(missing, artifact).passed, false);

  const duplicate = structuredClone(report);
  duplicate.matrix.results[78].key = duplicate.matrix.results[0].key;
  assert.equal(audited(duplicate, artifact).passed, false);

  const failed = structuredClone(report);
  failed.matrix.results[0].measurementPassed = false;
  assert.equal(audited(failed, artifact).passed, false);

  const invalidNetworkPolicy = structuredClone(report);
  invalidNetworkPolicy.matrix.results[0].networkPolicy.serviceWorkerBypass = false;
  assert.equal(audited(invalidNetworkPolicy, artifact).passed, false);
});

test("audit rejects missing, duplicate, and wrong ON request paths", async () => {
  const { report, artifact } = await fixture();

  const reordered = mutateContextReport(report, on => {
    on.requestPaths.reverse();
  });
  assert.equal(audited(reordered, artifact).passed, true);

  const missing = mutateContextReport(report, on => {
    on.requestPaths.pop();
  });
  assert.equal(audited(missing, artifact).passed, false);

  const duplicate = mutateContextReport(report, on => {
    on.requestPaths[0] = on.requestPaths[1];
  });
  assert.equal(audited(duplicate, artifact).passed, false);

  const wrong = mutateContextReport(report, on => {
    on.requestPaths[0] = "/atlas/not-a-public-context-asset.mesh";
  });
  assert.equal(audited(wrong, artifact).passed, false);
});

test("audit rejects missing or wrong suite, timestamp, environment, and browser metadata", async () => {
  const { report, artifact } = await fixture();

  const missingSchema = structuredClone(report);
  delete missingSchema.schemaVersion;
  assert.equal(audited(missingSchema, artifact).passed, false);

  const wrongSchema = structuredClone(report);
  wrongSchema.schemaVersion = 99;
  assert.equal(audited(wrongSchema, artifact).passed, false);

  const missingTool = structuredClone(report);
  delete missingTool.tool;
  assert.equal(audited(missingTool, artifact).passed, false);

  const wrongTimestamp = structuredClone(report);
  wrongTimestamp.generatedAt = "not-a-timestamp";
  assert.equal(audited(wrongTimestamp, artifact).passed, false);

  const missingEnvironment = structuredClone(report);
  delete missingEnvironment.environment;
  assert.equal(audited(missingEnvironment, artifact).passed, false);

  const wrongEnvironment = structuredClone(report);
  wrongEnvironment.environment.memoryBytes.free = wrongEnvironment.environment.memoryBytes.total + 1;
  assert.equal(audited(wrongEnvironment, artifact).passed, false);

  const wrongOperatingSystem = structuredClone(report);
  wrongOperatingSystem.environment.os.platform = "linux";
  assert.equal(audited(wrongOperatingSystem, artifact).passed, false);

  const wrongNodeMajor = structuredClone(report);
  wrongNodeMajor.environment.nodeVersion = "v22.19.0";
  assert.equal(audited(wrongNodeMajor, artifact).passed, false);

  const missingBrowser = structuredClone(report);
  delete missingBrowser.matrix.results[0].browser;
  assert.equal(audited(missingBrowser, artifact).passed, false);

  const wrongBrowser = structuredClone(report);
  wrongBrowser.matrix.results[1].browser.product = 151;
  assert.equal(audited(wrongBrowser, artifact).passed, false);

  const wrongBrowserIdentity = structuredClone(report);
  wrongBrowserIdentity.matrix.results[1].browser.product = "Firefox/151.0";
  wrongBrowserIdentity.matrix.results[1].browser.userAgent = "Mozilla/5.0 Firefox/151.0";
  assert.equal(audited(wrongBrowserIdentity, artifact).passed, false);

  const wrongChromeMajor = structuredClone(report);
  wrongChromeMajor.matrix.results[1].browser.product = "Chrome/150.0.0.0";
  wrongChromeMajor.matrix.results[1].browser.userAgent = "Mozilla/5.0 HeadlessChrome/150.0.0.0";
  assert.equal(audited(wrongChromeMajor, artifact).passed, false);

  const mixedBrowserIdentity = structuredClone(report);
  mixedBrowserIdentity.matrix.results[1].browser.product = "Chrome/151.0.7922.171";
  mixedBrowserIdentity.matrix.results[1].browser.userAgent = "Mozilla/5.0 HeadlessChrome/151.0.0.1";
  assert.equal(audited(mixedBrowserIdentity, artifact).passed, false);

  const missingResultSchema = structuredClone(report);
  delete missingResultSchema.matrix.results[2].schemaVersion;
  assert.equal(audited(missingResultSchema, artifact).passed, false);
});

test("audit rejects missing and zero-byte public assets discovered by stat", async () => {
  const { report } = await fixture();
  const missing = await auditBlockContextPerformanceReport(report, {
    projectRoot: "fixture-project",
    assetStat: async filePath => {
      if (filePath.endsWith("segment-midbrain.mesh")) throw new Error("ENOENT");
      return { isFile: () => true, size: FIXTURE_ASSET_BYTES };
    },
  });
  assert.equal(missing.passed, false);
  assert.ok(missing.failures.some(failure => failure.code === "artifact-missing"));

  const zero = await auditBlockContextPerformanceReport(report, {
    projectRoot: "fixture-project",
    assetStat: async filePath => ({
      isFile: () => true,
      size: filePath.endsWith("segment-midbrain.mesh") ? 0 : FIXTURE_ASSET_BYTES,
    }),
  });
  assert.equal(zero.passed, false);
  assert.ok(zero.failures.some(failure => failure.code === "artifact-zero-byte"));
});

test("audit rejects encoded-byte, stability, heap, and health threshold mutations", async () => {
  const { report, artifact } = await fixture();

  const below = mutateContextReport(report, on => {
    on.encodedBytes = artifact.bodyBytes - 1;
  });
  assert.equal(audited(below, artifact).passed, false);

  const above = mutateContextReport(report, on => {
    on.encodedBytes = artifact.bodyBytes + 8_193;
  });
  assert.equal(audited(above, artifact).passed, false);

  const stableTooSlow = mutateContextReport(report, on => {
    on.stableTimeMs = BLOCK_CONTEXT_STABLE_TIME_LIMIT_MS + 1;
  });
  assert.equal(audited(stableTooSlow, artifact).passed, false);

  const settledTooLarge = mutateContextReport(report, on => {
    on.heap.settled.backingStorageSize = BLOCK_CONTEXT_SETTLED_BACKING_LIMIT_BYTES + 1;
  });
  assert.equal(audited(settledTooLarge, artifact).passed, false);

  const peakTooLarge = mutateContextReport(report, on => {
    on.heap.sampledPeak.backingStorageSize = BLOCK_CONTEXT_SAMPLED_PEAK_LIMIT_BYTES + 1;
  });
  assert.equal(audited(peakTooLarge, artifact).passed, false);

  for (const mutate of [
    on => { on.loadingCount = 1; },
    on => { on.uiErrors = [{ message: "error" }]; },
    on => { on.consoleErrors = [{ message: "error" }]; },
    on => { on.requestErrors = [{ message: "error" }]; },
    on => { on.horizontalOverflow.detected = true; },
    on => { on.webglFallback = true; },
  ]) {
    assert.equal(audited(mutateContextReport(report, mutate), artifact).passed, false);
  }
});

test("audit CLI contract requires a local report and accepts optional output", () => {
  assert.deepEqual(parseArgs([
    "--report", "work/performance/suite.json",
    "--output=work/performance/audit.json",
  ]), {
    report: "work/performance/suite.json",
    output: "work/performance/audit.json",
    help: false,
  });
  assert.throws(() => parseArgs(["--output", "audit.json"]), /missing required option/);
  assert.throws(() => parseArgs(["--report", "https://example.com/report.json"]), /local file path/);
});
