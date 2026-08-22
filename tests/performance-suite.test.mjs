import assert from "node:assert/strict";
import test from "node:test";

import {
  BLOCK_CONTEXT_SCENARIO,
  PERFORMANCE_SUITE_SCHEMA_VERSION,
  SUITE_ROUTES,
  SUITE_VIEWPORTS,
  aggregateSuiteResults,
  buildPerformanceMatrix,
  parseSuiteArgs,
  runPerformanceSuite,
  suiteMatrixDefinition,
} from "../scripts/measure_browser_performance_suite.mjs";

test("performance suite preserves the 31-entry base coverage and adds six block-context ON entries", () => {
  const matrix = buildPerformanceMatrix();
  assert.equal(matrix.length, 37);
  assert.equal(new Set(matrix.map(entry => entry.key)).size, 37);

  const full = matrix.filter(entry => (entry.viewportId === "pc" || entry.viewportId === "tablet-landscape") && entry.scenario === "none");
  assert.equal(full.length, 24);
  assert.deepEqual(new Set(full.map(entry => entry.viewportId)), new Set(["pc", "tablet-landscape"]));
  assert.deepEqual(new Set(full.map(entry => entry.routeId)), new Set(SUITE_ROUTES.map(route => route.id)));
  assert.deepEqual(new Set(full.map(entry => entry.mode)), new Set(["cold", "warm"]));
  assert.ok(full.every(entry => entry.scenario === "none"));

  const mobile = matrix.filter(entry => entry.viewportId === "mobile" && entry.scenario === "none");
  assert.equal(mobile.length, 6);
  assert.deepEqual(new Set(mobile.map(entry => entry.routeId)), new Set(["home", "sections-horizontal", "quiz"]));
  assert.deepEqual(new Set(mobile.map(entry => entry.mode)), new Set(["cold", "warm"]));
  assert.ok(mobile.every(entry => entry.width === 390 && entry.height === 768));

  const context = matrix.filter(entry => entry.scenario === BLOCK_CONTEXT_SCENARIO);
  assert.equal(context.length, 6);
  assert.deepEqual(new Set(context.map(entry => entry.viewportId)), new Set(["pc", "tablet-landscape", "mobile"]));
  assert.deepEqual(new Set(context.map(entry => entry.mode)), new Set(["cold", "warm"]));
  assert.ok(context.every(entry => entry.routeId === "blocks-lateral-ventricle"));
  assert.deepEqual(context.map(entry => entry.key), [
    "pc-blocks-lateral-ventricle-cold-block-context",
    "pc-blocks-lateral-ventricle-warm-block-context",
    "tablet-landscape-blocks-lateral-ventricle-cold-block-context",
    "tablet-landscape-blocks-lateral-ventricle-warm-block-context",
    "mobile-blocks-lateral-ventricle-cold-block-context",
    "mobile-blocks-lateral-ventricle-warm-block-context",
  ]);

  const basic = matrix.filter(entry => entry.scenario === "basic-mobile");
  assert.equal(basic.length, 1);
  assert.deepEqual(basic[0], {
    key: "mobile-quiz-cold-basic-mobile",
    routeId: "quiz",
    route: "#workspace/quiz",
    viewportId: "mobile",
    width: 390,
    height: 768,
    mode: "cold",
    scenario: "basic-mobile",
  });

  const definition = suiteMatrixDefinition(matrix);
  assert.equal(definition.entryCount, 37);
  assert.equal(definition.routes.length, 6);
  assert.equal(definition.viewports.length, 3);
  assert.deepEqual(definition.modes, ["cold", "warm"]);
  assert.deepEqual(definition.blockContextScenario, {
    routeId: "blocks-lateral-ventricle",
    viewportIds: ["pc", "tablet-landscape", "mobile"],
    modes: ["cold", "warm"],
    scenario: BLOCK_CONTEXT_SCENARIO,
  });
});

test("performance suite CLI accepts only local base URL and output", () => {
  assert.deepEqual(parseSuiteArgs([
    "--base-url", "http://localhost:4173",
    "--output", "work/performance/suite.json",
  ]), {
    baseUrl: "http://localhost:4173",
    output: "work/performance/suite.json",
    help: false,
  });
  assert.throws(() => parseSuiteArgs(["--base-url", "https://example.com", "--output", "x.json"]), /localhost or a loopback/);
  assert.throws(() => parseSuiteArgs(["--base-url", "http://localhost:4173"]), /missing required option/);
});

test("performance suite allPassed aggregates every result and rejects missing or failed entries", () => {
  const matrix = buildPerformanceMatrix();
  const results = matrix.map(entry => ({ key: entry.key, measurementPassed: true }));
  const report = aggregateSuiteResults({
    baseUrl: "http://localhost:4173",
    matrix,
    results,
    generatedAt: "2026-08-22T00:00:00.000Z",
    environment: { cpuCount: 1, memoryBytes: { total: 2, free: 1 } },
  });
  assert.equal(report.schemaVersion, PERFORMANCE_SUITE_SCHEMA_VERSION);
  assert.equal(report.allPassed, true);
  assert.equal(report.matrix.results.length, 37);
  assert.equal(report.matrix.definition.entryCount, 37);

  const failed = [...results];
  failed[10] = { ...failed[10], measurementPassed: false };
  assert.equal(aggregateSuiteResults({ baseUrl: "http://localhost:4173", matrix, results: failed }).allPassed, false);
  assert.equal(aggregateSuiteResults({ baseUrl: "http://localhost:4173", matrix, results: results.slice(0, -1) }).allPassed, false);
  assert.equal(aggregateSuiteResults({
    baseUrl: "http://localhost:4173",
    matrix,
    results: [...results.slice(0, -1), { key: results[0].key, measurementPassed: true }],
  }).allPassed, false);
});

test("performance suite coordinator can be covered with an injected fake measurement", async () => {
  const matrix = buildPerformanceMatrix().slice(0, 2);
  const calls = [];
  const results = await runPerformanceSuite("http://localhost:4173", {
    matrix,
    measure: async args => {
      calls.push(args);
      return { measurementPassed: true, mode: args.mode, scenario: args.scenario };
    },
  });
  assert.equal(results.length, 2);
  assert.deepEqual(calls.map(call => [call.route, call.width, call.height, call.mode, call.scenario]), [
    ["#workspace/home", 1366, 768, "cold", "none"],
    ["#workspace/home", 1366, 768, "warm", "none"],
  ]);
  assert.ok(results.every(result => result.measurementPassed && typeof result.key === "string"));
  assert.equal(SUITE_VIEWPORTS.length, 3);
});

test("performance suite injected block-context failures remain visible in the report", async () => {
  const matrix = buildPerformanceMatrix().filter(entry => entry.scenario === BLOCK_CONTEXT_SCENARIO).slice(0, 2);
  const results = await runPerformanceSuite("http://localhost:4173", {
    matrix,
    measure: async entry => ({
      measurementPassed: entry.scenario === BLOCK_CONTEXT_SCENARIO && entry.mode === "cold",
      blockContext: entry.mode === "cold" ? { on: { uniqueRequestCount: 1 } } : { on: { webglFallback: true } },
    }),
  });
  assert.equal(results.length, 2);
  assert.equal(results[0].measurementPassed, true);
  assert.equal(results[1].measurementPassed, false);
  assert.equal(aggregateSuiteResults({ baseUrl: "http://localhost:4173", matrix, results }).allPassed, false);
});
