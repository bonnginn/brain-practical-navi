import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  BLOCK_CONTEXT_ROUTES,
  BLOCK_CONTEXT_ROUTE,
  BLOCK_CONTEXT_SCENARIO,
  NETWORK_POLICY,
  PERFORMANCE_SCHEMA_VERSION,
  aggregateHeapMetrics,
  aggregateNetworkMetrics,
  createMeasurementState,
  configurePage,
  mergeScenarioErrors,
  numericOutputMatchesTarget,
  parseArgs,
  peakHeapUsage,
  recordNetworkEvent,
  recordRuntimeEvent,
  rangeStepPassed,
  resolveRoute,
  routeNeedsBlockIntroAction,
  routeSupportsBlockContextScenario,
  resetMeasurementState,
  runBlockContextScenario,
  summarizeRuntimeProbe,
  validateBlockContextMeasurement,
  validateBlockContextProbe,
  validateMeasurementResult,
  validateResultSchema,
  waitForBlockContextQuiet,
  waitForRuntimeProbe,
} from "../scripts/measure_browser_performance.mjs";

test("performance runner parses the required CLI contract without launching Chrome", () => {
  const args = parseArgs([
    "--base-url", "http://localhost:4173",
    "--route", "#workspace/home",
    "--width", "1366",
    "--height", "768",
    "--mode", "cold",
    "--output", "work/performance/home-cold.json",
  ]);
  assert.deepEqual(args, {
    baseUrl: "http://localhost:4173",
    route: "#workspace/home",
    width: 1366,
    height: 768,
    mode: "cold",
    output: "work/performance/home-cold.json",
    scenario: "none",
    help: false,
  });
  assert.equal(resolveRoute(args.baseUrl, args.route), "http://localhost:4173/#workspace/home");
  assert.equal(routeNeedsBlockIntroAction("#workspace/blocks/lateral-ventricle"), true);
  assert.equal(routeNeedsBlockIntroAction("#workspace/home"), false);
  assert.equal(BLOCK_CONTEXT_ROUTES.length, 8);
  assert.ok(Object.isFrozen(BLOCK_CONTEXT_ROUTES));
  assert.ok(BLOCK_CONTEXT_ROUTES.every(route => Object.isFrozen(route)));
  assert.deepEqual(BLOCK_CONTEXT_ROUTES.map(route => route.route), [
    "#workspace/blocks/lateral-ventricle",
    "#workspace/blocks/diencephalon",
    "#workspace/blocks/radiations",
    "#workspace/blocks/commissural-system",
    "#workspace/blocks/choroid-plexus",
    "#workspace/blocks/medial-temporal",
    "#workspace/blocks/midbrain-section",
    "#workspace/blocks/hindbrain",
  ]);
  assert.ok(BLOCK_CONTEXT_ROUTES.every(route => routeSupportsBlockContextScenario(route.route)));
  assert.equal(routeSupportsBlockContextScenario("#workspace/blocks/unknown"), false);
  assert.equal(routeSupportsBlockContextScenario("#workspace/blocks/lateral-ventricle/compare"), false);
  assert.equal(routeSupportsBlockContextScenario("#workspace/home"), false);
  assert.throws(() => parseArgs(["--base-url", "https://example.com"]), /missing required option/);
  assert.throws(() => parseArgs([
    "--base-url", "http://localhost:4173", "--route", "/", "--width", "0",
    "--height", "768", "--mode", "warm", "--output", "x.json",
  ]), /positive integer/);
  assert.throws(() => parseArgs([
    "--base-url", "http://example.com", "--route", "/", "--width", "1",
    "--height", "1", "--mode", "cold", "--output", "x.json",
  ]), /localhost or a loopback/);
  const mobile = parseArgs([
    "--base-url=http://localhost:4173", "--route=#workspace/home", "--width=390", "--height=844",
    "--mode=warm", "--output=work/mobile.json", "--scenario=basic-mobile",
  ]);
  assert.equal(mobile.scenario, "basic-mobile");
  assert.throws(() => parseArgs([
    "--base-url", "http://localhost:4173", "--route", "/", "--width", "1366",
    "--height", "768", "--mode", "cold", "--output", "x.json", "--scenario", "basic-mobile",
  ]), /requires --width 390/);
  const blockContext = parseArgs([
    "--base-url", "http://localhost:4173", "--route", BLOCK_CONTEXT_ROUTE,
    "--width", "390", "--height", "768", "--mode", "warm", "--output", "x.json",
    "--scenario", BLOCK_CONTEXT_SCENARIO,
  ]);
  assert.equal(blockContext.scenario, BLOCK_CONTEXT_SCENARIO);
  for (const route of BLOCK_CONTEXT_ROUTES) {
    const args = parseArgs([
      "--base-url", "http://localhost:4173", "--route", route.route,
      "--width", "1366", "--height", "768", "--mode", "cold", "--output", "x.json",
      "--scenario", BLOCK_CONTEXT_SCENARIO,
    ]);
    assert.equal(args.route, route.route);
  }
  assert.throws(() => parseArgs([
    "--base-url", "http://localhost:4173", "--route", "#workspace/home", "--width", "390",
    "--height", "768", "--mode", "cold", "--output", "x.json", "--scenario", BLOCK_CONTEXT_SCENARIO,
  ]), /requires one of the 8 registered block specimen routes/);
  for (const route of ["#workspace/blocks/unknown", "#workspace/blocks/lateral-ventricle/compare"]) {
    assert.throws(() => parseArgs([
      "--base-url", "http://localhost:4173", "--route", route, "--width", "390",
      "--height", "768", "--mode", "cold", "--output", "x.json", "--scenario", BLOCK_CONTEXT_SCENARIO,
    ]), /requires one of the 8 registered block specimen routes/);
  }
  assert.throws(() => parseArgs([
    "--base-url", "http://localhost:4173", "--route", BLOCK_CONTEXT_ROUTE, "--width", "800",
    "--height", "768", "--mode", "cold", "--output", "x.json", "--scenario", BLOCK_CONTEXT_SCENARIO,
  ]), /requires a 1366, 1024, or 390/);
});

test("performance runner aggregates encoded network bytes and browser errors deterministically", () => {
  const state = createMeasurementState();
  state.collecting = true;
  recordNetworkEvent(state, "Network.requestWillBeSent", {
    requestId: "1",
    request: { url: "http://localhost:4173/index.html", method: "GET" },
    type: "Document",
  });
  recordNetworkEvent(state, "Network.requestWillBeSent", {
    requestId: "2",
    request: { url: "http://localhost:4173/broken.mesh", method: "GET" },
    type: "Fetch",
  });
  recordNetworkEvent(state, "Network.loadingFinished", { requestId: "1", encodedDataLength: 1234 });
  recordNetworkEvent(state, "Network.loadingFinished", { requestId: "1", encodedDataLength: 9999 });
  recordNetworkEvent(state, "Network.loadingFailed", {
    requestId: "2", type: "Fetch", errorText: "net::ERR_FILE_NOT_FOUND", canceled: false,
  });
  recordRuntimeEvent(state, "Runtime.consoleAPICalled", {
    type: "error",
    args: [{ type: "string", value: "atlas failed" }],
    stackTrace: { callFrames: [{ url: "http://localhost:4173/app.js", lineNumber: 12, columnNumber: 4 }] },
  });
  const metrics = aggregateNetworkMetrics(state);
  assert.equal(metrics.encodedBytes, 1234);
  assert.equal(metrics.requestCount, 2);
  assert.equal(metrics.uniqueRequestCount, 2);
  assert.deepEqual(metrics.requestPaths, ["/index.html", "/broken.mesh"]);
  assert.equal(metrics.requestErrors.length, 1);
  assert.equal(metrics.requestErrors[0].url, "http://localhost:4173/broken.mesh");
  assert.equal(metrics.consoleErrors[0].text, "atlas failed");
  assert.equal(state.inFlight.size, 0);
});

test("performance runner scopes completion events to the active window and preserves redirect hops", () => {
  const state = createMeasurementState();
  state.collecting = true;
  recordNetworkEvent(state, "Network.requestWillBeSent", {
    requestId: "redirected",
    request: { url: "http://localhost:4173/old", method: "GET" },
    type: "Document",
  });
  recordNetworkEvent(state, "Network.requestWillBeSent", {
    requestId: "redirected",
    request: { url: "http://localhost:4173/new", method: "GET" },
    redirectResponse: { status: 302 },
    type: "Document",
  });
  recordNetworkEvent(state, "Network.loadingFinished", { requestId: "redirected", encodedDataLength: 23 });
  const redirectedMetrics = aggregateNetworkMetrics(state);
  assert.equal(redirectedMetrics.requestCount, 1);
  assert.equal(redirectedMetrics.uniqueRequestCount, 2);
  assert.deepEqual(redirectedMetrics.requestPaths, ["/old", "/new"]);
  assert.equal(redirectedMetrics.encodedBytes, 23);

  const staleId = "stale-after-reset";
  recordNetworkEvent(state, "Network.requestWillBeSent", {
    requestId: staleId,
    request: { url: "http://localhost:4173/old-asset", method: "GET" },
    type: "Fetch",
  });
  resetMeasurementState(state, { collecting: true });
  recordNetworkEvent(state, "Network.loadingFinished", { requestId: staleId, encodedDataLength: 9999 });
  recordNetworkEvent(state, "Network.loadingFailed", { requestId: staleId, errorText: "late failure" });
  assert.equal(aggregateNetworkMetrics(state).encodedBytes, 0);
  assert.equal(aggregateNetworkMetrics(state).requestErrors.length, 0);
});

test("performance runner reports settled and sampled peak heap fields", () => {
  const samples = [
    { usedSize: 10, totalSize: 20, embedderHeapUsedSize: 3, backingStorageSize: 80 },
    { usedSize: 45, totalSize: 70, embedderHeapUsedSize: 9, backingStorageSize: 60 },
    { usedSize: 25, totalSize: 50, embedderHeapUsedSize: 4, backingStorageSize: 120 },
  ];
  assert.deepEqual(peakHeapUsage(samples), {
    usedSize: 45,
    totalSize: 70,
    embedderHeapUsedSize: 9,
    backingStorageSize: 120,
  });
  assert.deepEqual(aggregateHeapMetrics(samples, samples[2]), {
    settled: samples[2],
    sampledPeak: {
      usedSize: 45,
      totalSize: 70,
      embedderHeapUsedSize: 9,
      backingStorageSize: 120,
    },
    samplePeak: {
      usedSize: 45,
      totalSize: 70,
      embedderHeapUsedSize: 9,
      backingStorageSize: 120,
    },
    sampleCount: 3,
  });
});

test("performance page configuration bypasses service workers before navigation", async () => {
  const calls = [];
  await configurePage({
    send: async (method, params) => {
      calls.push({ method, params });
      return {};
    },
  });
  const networkEnableIndex = calls.findIndex(call => call.method === "Network.enable");
  const bypassIndex = calls.findIndex(call => call.method === "Network.setBypassServiceWorker");
  const scriptIndex = calls.findIndex(call => call.method === "Page.addScriptToEvaluateOnNewDocument");
  assert.ok(networkEnableIndex >= 0);
  assert.ok(bypassIndex > networkEnableIndex);
  assert.ok(scriptIndex > bypassIndex);
  assert.deepEqual(calls[bypassIndex], {
    method: "Network.setBypassServiceWorker",
    params: { bypass: true },
  });
});

test("performance result schema requires all browser-observable metrics", () => {
  const result = {
    schemaVersion: PERFORMANCE_SCHEMA_VERSION,
    generatedAt: "2026-08-22T00:00:00.000Z",
    tool: "scripts/measure_browser_performance.mjs",
    baseUrl: "http://localhost:4173",
    route: "#workspace/home",
    url: "http://localhost:4173/#workspace/home",
    mode: "cold",
    scenario: "none",
    viewport: { width: 1366, height: 768 },
    networkPolicy: { ...NETWORK_POLICY },
    encodedBytes: 100,
    requestCount: 2,
    requestPaths: ["/index.html", "/assets/index.js"],
    dclMs: 42,
    stableTimeMs: 500,
    consoleErrors: [],
    requestErrors: [],
    canvasCount: 0,
    loadingCount: 0,
    uiErrors: [],
    appRootPresent: true,
    stable: true,
    stabilityReason: "stable",
    horizontalOverflow: { detected: false, clientWidth: 1366, scrollWidth: 1366 },
    heap: {
      settled: { usedSize: 1, totalSize: 2, embedderHeapUsedSize: 3, backingStorageSize: 4 },
      sampledPeak: { usedSize: 5, totalSize: 6, embedderHeapUsedSize: 7, backingStorageSize: 8 },
      sampleCount: 3,
    },
    interactions: [],
    measurementPassed: true,
    validation: { passed: true, failures: [] },
  };
  assert.equal(validateResultSchema(result), true);
  assert.equal(validateResultSchema({ ...result, networkPolicy: undefined }), false);
  assert.equal(validateResultSchema({ ...result, networkPolicy: { serviceWorkerBypass: false } }), false);
  assert.equal(validateResultSchema({ ...result, networkPolicy: { serviceWorkerBypass: "true" } }), false);
  assert.equal(validateResultSchema({ ...result, requestErrors: undefined }), false);
  assert.equal(validateResultSchema({ ...result, requestPaths: undefined }), false);
  assert.equal(validateResultSchema({ ...result, requestPaths: ["http://localhost:4173/index.html"] }), false);
  assert.equal(validateResultSchema({ ...result, heap: null }), false);
  assert.deepEqual(validateMeasurementResult(result, [{ name: "slider", passed: true, details: {} }]), { passed: true, failures: [] });
  assert.deepEqual(validateMeasurementResult(result, [{ name: "slider", passed: false, details: {} }]), { passed: false, failures: ["interaction:slider"] });
  assert.deepEqual(validateMeasurementResult({ ...result, appRootPresent: false }, []), { passed: false, failures: ["app-root-missing"] });
  assert.deepEqual(validateMeasurementResult({ ...result, horizontalOverflow: { ...result.horizontalOverflow, detected: true } }, []), { passed: false, failures: ["horizontal-overflow"] });
  const semanticFailure = {
    ...result,
    scenario: BLOCK_CONTEXT_SCENARIO,
    uniqueRequestCount: 0,
    measurementPassed: false,
    validation: { passed: false, failures: ["block-context:canvas-after-launcher"] },
    blockContext: {
      enabled: true,
      baseline: {
        canvasCount: 0,
        encodedBytes: 0,
        requestCount: 0,
        uniqueRequestCount: 0,
        requestPaths: [],
        loadingCount: 0,
        uiErrors: [],
        consoleErrors: [],
        requestErrors: [],
        webglFallback: false,
        horizontalOverflow: { detected: false },
        heap: { settled: {}, sampledPeak: {} },
      },
      on: {
        canvasAfterLauncher: 0,
        canvasAfterSection: 0,
        canvasAfterClose: 0,
        loadingCount: 0,
        uiErrors: [],
        consoleErrors: [],
        requestErrors: [],
        webglFallback: false,
        horizontalOverflow: { detected: false },
        stable: false,
        stabilityReason: "timeout",
        stableTimeMs: null,
        encodedBytes: 0,
        requestCount: 0,
        uniqueRequestCount: 0,
        requestPaths: [],
        heap: { settled: {}, sampledPeak: {} },
      },
      interactions: [],
    },
  };
  // Shape is valid even though semantic health is intentionally failed and
  // represented in validation/measurementPassed for JSON diagnostics.
  assert.equal(validateResultSchema(semanticFailure), true);
  assert.equal(validateResultSchema({
    ...semanticFailure,
    blockContext: {
      ...semanticFailure.blockContext,
      on: { ...semanticFailure.blockContext.on, requestPaths: undefined },
    },
  }), false);
  assert.equal(validateResultSchema({
    ...semanticFailure,
    blockContext: {
      ...semanticFailure.blockContext,
      on: { ...semanticFailure.blockContext.on, requestPaths: ["https://example.com/context.mesh"] },
    },
  }), false);
});

test("performance runner requires the range output to match the moved input", () => {
  const before = { found: true, value: 52 };
  const changed = { changed: true, target: 53 };
  assert.equal(numericOutputMatchesTarget(" 53 ", 53), true);
  assert.equal(numericOutputMatchesTarget("53.0", 53), true);
  assert.equal(numericOutputMatchesTarget("", 53), false);
  assert.equal(numericOutputMatchesTarget("52", 53), false);
  assert.equal(rangeStepPassed(before, changed, { found: true, value: 53, output: " 53 " }), true);
  assert.equal(rangeStepPassed(before, changed, { found: true, value: 53, output: "52" }), false);
  assert.equal(rangeStepPassed(before, changed, { found: true, value: 53, output: "" }), false);
  assert.equal(rangeStepPassed(before, changed, { found: true, value: 52, output: "52" }), false);
});

test("basic-mobile scenario errors merge without changing initial transfer metrics", () => {
  const initial = {
    encodedBytes: 1234,
    requestCount: 4,
    consoleErrors: [{ text: "initial" }],
    requestErrors: [],
    measurementPassed: true,
  };
  const merged = mergeScenarioErrors(initial, {
    encodedBytes: 987654,
    requestCount: 12,
    consoleErrors: [{ text: "scenario console" }],
    requestErrors: [{ url: "http://localhost:4173/scenario.mesh" }],
  });
  assert.equal(merged.encodedBytes, 1234);
  assert.equal(merged.requestCount, 4);
  assert.deepEqual(merged.consoleErrors.map(error => error.text), ["initial", "scenario console"]);
  assert.deepEqual(merged.requestErrors, [{ url: "http://localhost:4173/scenario.mesh" }]);
  assert.deepEqual(initial.consoleErrors, [{ text: "initial" }]);
});

test("block-context probe and ON validation reject fallback, overflow, loader, and canvas regressions", () => {
  const healthyProbe = {
    readyState: "complete",
    contextVisible: true,
    contextCanvasCount: 1,
    contextView: "全脳＋切断面",
    canvasCount: 2,
    loadingCount: 0,
    appRootPresent: true,
    uiErrors: [],
    horizontalOverflow: false,
    webglFallback: false,
  };
  assert.equal(validateBlockContextProbe(healthyProbe, { expectedCanvasCount: 2, expectedView: "全脳" }).passed, true);
  assert.equal(validateBlockContextProbe({ ...healthyProbe, webglFallback: true }, { expectedCanvasCount: 2, expectedView: "全脳" }).passed, false);
  assert.equal(validateBlockContextProbe({ ...healthyProbe, horizontalOverflow: true }, { expectedCanvasCount: 2, expectedView: "全脳" }).passed, false);
  assert.equal(validateBlockContextProbe({ ...healthyProbe, loadingCount: 1 }, { expectedCanvasCount: 2, expectedView: "全脳" }).passed, false);

  const context = {
    enabled: true,
    baseline: {
      canvasCount: 1,
      encodedBytes: 100,
      requestCount: 4,
      uniqueRequestCount: 4,
      requestPaths: ["/index.html", "/assets/base.js"],
      loadingCount: 0,
      webglFallback: false,
      horizontalOverflow: { detected: false },
      uiErrors: [],
      heap: { settled: { usedSize: 1 }, sampledPeak: { usedSize: 2 } },
    },
    on: {
      canvasAfterLauncher: 2,
      canvasAfterSection: 2,
      canvasAfterClose: 1,
      loadingCount: 0,
      webglFallback: false,
      horizontalOverflow: { detected: false },
      uiErrors: [],
      consoleErrors: [],
      requestErrors: [],
      stable: true,
      stabilityReason: "stable",
      stableTimeMs: 250,
      encodedBytes: 40,
      requestCount: 2,
      uniqueRequestCount: 2,
      requestPaths: ["/assets/context.mesh", "/assets/context.png"],
      heap: {
        settled: { usedSize: 1 },
        sampledPeak: { usedSize: 2 },
      },
    },
    interactions: [
      { name: "block-context-launcher", passed: true },
      { name: "block-context-representative-section", passed: true },
      { name: "block-context-close", passed: true },
    ],
  };
  assert.equal(validateBlockContextMeasurement(context).passed, true);
  assert.equal(validateBlockContextMeasurement({
    ...context,
    on: { ...context.on, requestPaths: undefined },
  }).passed, false);
  assert.equal(validateBlockContextMeasurement({
    ...context,
    on: { ...context.on, requestPaths: ["http://localhost:4173/context.mesh"] },
  }).passed, false);
  const zeroOnEvidence = validateBlockContextMeasurement({
    ...context,
    on: { ...context.on, uniqueRequestCount: 0 },
  });
  assert.ok(zeroOnEvidence.failures.includes("context-unique-request-count-zero"));
  const emptyOnPaths = validateBlockContextMeasurement({
    ...context,
    on: { ...context.on, requestPaths: [], requestCount: 2 },
  });
  assert.ok(emptyOnPaths.failures.includes("context-request-paths-empty"));
  const zeroOnBytes = validateBlockContextMeasurement({
    ...context,
    on: { ...context.on, encodedBytes: 0 },
  });
  assert.ok(zeroOnBytes.failures.includes("context-encoded-bytes-zero"));
  assert.deepEqual(validateBlockContextMeasurement({
    ...context,
    on: { ...context.on, canvasAfterSection: 1, webglFallback: true },
  }), {
    passed: false,
    failures: ["canvas-after-section", "context-webgl-fallback"],
  });
  const healthFailure = validateBlockContextMeasurement({
    ...context,
    on: {
      ...context.on,
      loadingCount: 1,
      uiErrors: [{ text: "atlas failed" }],
      horizontalOverflow: { detected: true },
      webglFallback: true,
      interactions: undefined,
    },
    interactions: [{ name: "block-context-final-drain", passed: false }],
  });
  assert.ok(healthFailure.failures.includes("context-loading-indicator-visible"));
  assert.ok(healthFailure.failures.includes("context-ui-errors"));
  assert.ok(healthFailure.failures.includes("context-horizontal-overflow"));
  assert.ok(healthFailure.failures.includes("context-webgl-fallback"));
  assert.ok(healthFailure.failures.includes("context-interaction:block-context-final-drain"));
});

test("block-context quiet timeout exposes stage, latest probe, failures, and in-flight count", async () => {
  const state = createMeasurementState();
  state.collecting = true;
  state.inFlight.add("context-asset");
  const latestProbe = {
    readyState: "complete",
    contextVisible: true,
    contextCanvasCount: 1,
    contextView: "全脳＋切断面",
    canvasCount: 2,
    loadingCount: 1,
    appRootPresent: true,
    uiErrors: [{ text: "loading" }],
    horizontalOverflow: true,
    webglFallback: true,
  };
  await assert.rejects(
    waitForBlockContextQuiet({ send: async () => ({ result: { value: latestProbe } }) }, state, {
      expectedCanvasCount: 2,
      expectedView: "全脳＋切断面",
      timeoutMs: 70,
      pollMs: 10,
      label: "block-context launcher",
    }),
    error => error.stage === "block-context launcher"
      && error.latestProbe?.loadingCount === 1
      && error.inFlightCount === 1
      && error.failures.includes("loading-indicator-visible")
      && error.failures.includes("ui-errors")
      && error.failures.includes("horizontal-overflow")
      && error.failures.includes("webgl-fallback"),
  );
});

test("block-context launcher network-only timeout is not reported as stable", async () => {
  const state = createMeasurementState();
  state.collecting = true;
  state.inFlight.add("context-asset");
  const latestProbe = {
    readyState: "complete",
    contextVisible: true,
    contextCanvasCount: 1,
    contextView: "全脳＋切断面",
    canvasCount: 2,
    loadingCount: 0,
    appRootPresent: true,
    uiErrors: [],
    horizontalOverflow: false,
    webglFallback: false,
    now: 160,
  };
  const cdp = {
    send: async (method, params = {}) => {
      if (method === "Runtime.getHeapUsage") return {};
      if (method !== "Runtime.evaluate") return {};
      const expression = params.expression || "";
      if (expression.includes("contextCanvasCount")) {
        return { result: { value: latestProbe } };
      }
      if (expression.includes("blockContextLauncher")) {
        return { result: { value: { clicked: true, onStartedAt: 100, selector: ".blockContextLauncher button" } } };
      }
      if (expression.includes("blockContextSwitch")) {
        return { result: { value: { clicked: false, reason: "not reached" } } };
      }
      if (expression.includes("blockContextClose")) {
        return { result: { value: { clicked: false, reason: "not reached" } } };
      }
      return { result: { value: latestProbe } };
    },
  };

  const result = await runBlockContextScenario(cdp, state, {}, {
    baselineProbe: { canvasCount: 1 },
    timeoutMs: 25,
    sampleIntervalMs: 1000,
    settleMs: 0,
  });
  assert.equal(result.wholeQuietPassed, false);
  assert.equal(result.stable, false);
  assert.equal(result.stabilityReason, "network-not-quiet");
  assert.equal(result.stableTimeMs, null);
  assert.equal(result.stableHeap, null);
});

test("performance readiness covers both atlas and segmentation loaders", async () => {
  const source = await readFile(new URL("../scripts/measure_browser_performance.mjs", import.meta.url), "utf8");
  assert.match(source, /\.atlasLoading:not\(\.error\),\.segLoading:not\(\.error\)/);
  assert.match(source, /\.atlasLoading\.error,\.segLoading\.error,\[role=alert\]/);
  assert.match(source, /learningModelStage canvas/);
  assert.match(source, /await waitForRuntimeProbe\(cdp, `\(\(\) => \(\{[\s\S]*?learningModelStage canvas/);
  assert.match(source, /horizontal-range-step/);
});

test("runtime probe summaries remain safe and prepare-route diagnostics retain the latest probe", async () => {
  const circular = {};
  circular.self = circular;
  assert.match(summarizeRuntimeProbe({ readyState: "complete", circular }), /\[Circular\]/);
  await assert.rejects(
    waitForRuntimeProbe({
      send: async () => ({ result: { value: { ready: false, canvasCount: 0 } } }),
    },
    "(() => ({ ready: false, canvasCount: 0 }))()",
    () => false,
    70,
  ),
    error => /runtime interaction state did not settle/.test(error.message)
      && /latestProbe=/.test(error.message)
      && /canvasCount/.test(error.message),
  );
});
