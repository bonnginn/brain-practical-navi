import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  PERFORMANCE_SCHEMA_VERSION,
  aggregateHeapMetrics,
  aggregateNetworkMetrics,
  createMeasurementState,
  mergeScenarioErrors,
  numericOutputMatchesTarget,
  parseArgs,
  peakHeapUsage,
  recordNetworkEvent,
  recordRuntimeEvent,
  rangeStepPassed,
  resolveRoute,
  routeNeedsBlockIntroAction,
  validateMeasurementResult,
  validateResultSchema,
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
  assert.equal(metrics.requestErrors.length, 1);
  assert.equal(metrics.requestErrors[0].url, "http://localhost:4173/broken.mesh");
  assert.equal(metrics.consoleErrors[0].text, "atlas failed");
  assert.equal(state.inFlight.size, 0);
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
    sampleCount: 3,
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
    encodedBytes: 100,
    requestCount: 2,
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
  assert.equal(validateResultSchema({ ...result, requestErrors: undefined }), false);
  assert.equal(validateResultSchema({ ...result, heap: null }), false);
  assert.deepEqual(validateMeasurementResult(result, [{ name: "slider", passed: true, details: {} }]), { passed: true, failures: [] });
  assert.deepEqual(validateMeasurementResult(result, [{ name: "slider", passed: false, details: {} }]), { passed: false, failures: ["interaction:slider"] });
  assert.deepEqual(validateMeasurementResult({ ...result, appRootPresent: false }, []), { passed: false, failures: ["app-root-missing"] });
  assert.deepEqual(validateMeasurementResult({ ...result, horizontalOverflow: { ...result.horizontalOverflow, detected: true } }, []), { passed: false, failures: ["horizontal-overflow"] });
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

test("performance readiness covers both atlas and segmentation loaders", async () => {
  const source = await readFile(new URL("../scripts/measure_browser_performance.mjs", import.meta.url), "utf8");
  assert.match(source, /\.atlasLoading:not\(\.error\),\.segLoading:not\(\.error\)/);
  assert.match(source, /\.atlasLoading\.error,\.segLoading\.error,\[role=alert\]/);
  assert.match(source, /learningModelStage canvas/);
  assert.match(source, /await waitForRuntimeProbe\(cdp, `\(\(\) => \(\{[\s\S]*?learningModelStage canvas/);
  assert.match(source, /horizontal-range-step/);
});
