import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  BETA_AUDIT_PHASES,
  BETA_AUDIT_ROUTES,
  BETA_AUDIT_VIEWPORTS,
  BETA_AUDIT_EXPECTED_CHECKS,
  aggregateBetaAuditReport,
  buildBetaAuditMatrix,
  collectBrowserAuditCheck,
  expectedCanvasCount,
  parseAuditArgs,
  runBetaRouteAudit,
  validateAuditCheck,
  waitForAuditStable,
} from "../scripts/audit_beta_routes.mjs";
import { createMeasurementState } from "../scripts/measure_browser_performance.mjs";

function validProbe(route, viewport) {
  return {
    readyState: "complete",
    hash: route.hash,
    title: "脳実習ナビ",
    identityPresent: true,
    identityText: route.identity.text,
    appRootPresent: true,
    loadingCount: 0,
    uiErrors: [],
    canvasCount: expectedCanvasCount(route, viewport),
    webglFallback: false,
    clientWidth: viewport.width,
    scrollWidth: viewport.width,
    horizontalOverflow: false,
  };
}

function validCheck(entry, route, viewport) {
  const probe = validProbe(route, viewport);
  const validation = validateAuditCheck({ route, viewport, probe, consoleErrors: [], requestErrors: [] });
  return { ...entry, route, viewport, probe, consoleErrors: [], requestErrors: [], error: null, validation, passed: validation.passed };
}

test("beta route audit fixes the canonical 27 × 3 × 2 matrix", () => {
  assert.equal(BETA_AUDIT_ROUTES.length, 27);
  assert.deepEqual(BETA_AUDIT_ROUTES.map(route => route.hash), [
    "#workspace/home",
    "#workspace/surface/lateral",
    "#workspace/surface/superior",
    "#workspace/surface/inferior",
    "#workspace/surface/medial",
    "#workspace/surface/arteries",
    "#workspace/surface/nerves",
    "#workspace/surface/free",
    "#workspace/sections/coronal",
    "#workspace/sections/horizontal",
    "#workspace/sections/sagittal",
    "#workspace/blocks/lateral-ventricle",
    "#workspace/blocks/diencephalon",
    "#workspace/blocks/radiations",
    "#workspace/blocks/commissural-system",
    "#workspace/blocks/choroid-plexus",
    "#workspace/blocks/medial-temporal",
    "#workspace/blocks/midbrain-section",
    "#workspace/blocks/hindbrain",
    "#workspace/quiz",
    "#workspace/collaborate",
    "#workspace/collaborate/model-strategy",
    "#workspace/segment",
    "#workspace/status",
    "#workspace/help",
    "#workspace/feedback",
    "#workspace/legal",
  ]);
  assert.equal(BETA_AUDIT_VIEWPORTS.length, 3);
  assert.deepEqual(BETA_AUDIT_PHASES, ["direct", "reload"]);
  const matrix = buildBetaAuditMatrix();
  assert.equal(BETA_AUDIT_EXPECTED_CHECKS, 162);
  assert.equal(matrix.length, 162);
  assert.equal(new Set(matrix.map(entry => entry.key)).size, 162);
  assert.equal(new Set(matrix.map(entry => entry.routeId)).size, 27);
  assert.equal(new Set(matrix.map(entry => entry.viewportId)).size, 3);
  assert.equal(new Set(matrix.map(entry => entry.phase)).size, 2);
  assert.equal(BETA_AUDIT_ROUTES.filter(route => route.prepare === "block").length, 8);
  assert.equal(BETA_AUDIT_ROUTES.filter(route => route.hash.startsWith("#workspace/surface/")).length, 7);
  assert.equal(BETA_AUDIT_ROUTES.filter(route => route.hash.startsWith("#workspace/sections/")).length, 3);
  assert.equal(BETA_AUDIT_ROUTES.filter(route => route.hash.startsWith("#workspace/blocks/")).length, 8);
});

test("beta route audit rejects missing, duplicate, and non-passing matrix results", () => {
  const matrix = buildBetaAuditMatrix();
  const results = matrix.map(entry => {
    const route = BETA_AUDIT_ROUTES.find(candidate => candidate.id === entry.routeId);
    const viewport = BETA_AUDIT_VIEWPORTS.find(candidate => candidate.id === entry.viewportId);
    return validCheck(entry, route, viewport);
  });
  const passed = aggregateBetaAuditReport({ baseUrl: "http://localhost:4173", results, generatedAt: "2026-08-22T00:00:00.000Z", environment: {} });
  assert.equal(passed.allPassed, true);
  assert.deepEqual(passed.matrix.missingKeys, []);
  assert.deepEqual(passed.matrix.duplicateKeys, []);

  const missing = aggregateBetaAuditReport({ baseUrl: "http://localhost:4173", results: results.slice(0, -1), environment: {} });
  assert.equal(missing.allPassed, false);
  assert.equal(missing.matrix.missingKeys.length, 1);
  const duplicate = aggregateBetaAuditReport({ baseUrl: "http://localhost:4173", results: [...results.slice(0, -1), results[0]], environment: {} });
  assert.equal(duplicate.allPassed, false);
  assert.ok(duplicate.matrix.duplicateKeys.includes(results[0].key));
  const failed = [...results];
  failed[0] = { ...failed[0], passed: false };
  assert.equal(aggregateBetaAuditReport({ baseUrl: "http://localhost:4173", results: failed, environment: {} }).allPassed, false);
  const contradictory = [...results];
  contradictory[0] = { ...contradictory[0], validation: { passed: false, failures: ["injected"] } };
  assert.equal(aggregateBetaAuditReport({ baseUrl: "http://localhost:4173", results: contradictory, environment: {} }).allPassed, false);
});

test("beta route audit rejects hash, identity, canvas, loader, error, overflow, and WebGL fallback regressions", () => {
  const route = BETA_AUDIT_ROUTES.find(candidate => candidate.id === "sections-horizontal");
  const viewport = BETA_AUDIT_VIEWPORTS.find(candidate => candidate.id === "mobile");
  const entry = buildBetaAuditMatrix({ routes: [route], viewports: [viewport], phases: ["direct"] })[0];
  const base = validProbe(route, viewport);
  const cases = [
    ["hash", { ...base, hash: "#workspace/home" }, [], [], "hash-mismatch"],
    ["title", { ...base, identityText: "別の見出し" }, [], [], "identity-mismatch"],
    ["canvas", { ...base, canvasCount: 3 }, [], [], "canvas-count"],
    ["loader", { ...base, loadingCount: 1 }, [], [], "loader-visible"],
    ["ui error", { ...base, uiErrors: ["表示エラー"] }, [], [], "ui-errors"],
    ["console error", base, [{ text: "console" }], [], "console-errors"],
    ["request error", base, [], [{ url: "http://localhost:4173/broken" }], "request-errors"],
    ["overflow", { ...base, horizontalOverflow: true }, [], [], "horizontal-overflow"],
    ["WebGL fallback", { ...base, webglFallback: true }, [], [], "webgl-fallback"],
  ];
  for (const [name, probe, consoleErrors, requestErrors, failure] of cases) {
    const validation = validateAuditCheck({ route, viewport, probe, consoleErrors, requestErrors });
    assert.equal(validation.passed, false, name);
    assert.ok(validation.failures.some(value => value.startsWith(failure)), `${name}: ${validation.failures.join(",")}`);
  }
});

test("beta route audit coordinator supports a fake injected check without launching Chrome", async () => {
  const calls = [];
  const results = await runBetaRouteAudit("http://localhost:4173", {
    runCheck: async ({ entry, route, viewport }) => {
      calls.push(entry.key);
      return validCheck(entry, route, viewport);
    },
  });
  assert.equal(calls.length, 162);
  assert.equal(new Set(calls).size, 162);
  assert.equal(results.length, 162);
  assert.equal(aggregateBetaAuditReport({ baseUrl: "http://localhost:4173", results, environment: {} }).allPassed, true);
});

test("beta route audit preserves reload and block preparation contracts", async () => {
  const runnerSource = await readFile(new URL("../scripts/measure_browser_performance.mjs", import.meta.url), "utf8");
  const auditSource = await readFile(new URL("../scripts/audit_beta_routes.mjs", import.meta.url), "utf8");
  assert.match(auditSource, /Page\.reload/);
  assert.match(auditSource, /about:blank/);
  assert.match(auditSource, /waitForAuditStable/);
  assert.ok(BETA_AUDIT_ROUTES.filter(route => route.prepare === "block").every(route => route.hash.startsWith("#workspace/blocks/")));
  assert.match(runnerSource, /learningModelStage canvas/);
  assert.match(runnerSource, /await waitForRuntimeProbe\(cdp, `\(\(\) => \(\{[\s\S]*?learningModelStage canvas/);
});

test("collectBrowserAuditCheck isolates direct and reload phases with injectable navigation", async () => {
  const route = BETA_AUDIT_ROUTES.find(candidate => candidate.id === "blocks-lateral-ventricle");
  const viewport = BETA_AUDIT_VIEWPORTS.find(candidate => candidate.id === "pc");
  const directEntry = buildBetaAuditMatrix({ routes: [route], viewports: [viewport], phases: ["direct"] })[0];
  const reloadEntry = buildBetaAuditMatrix({ routes: [route], viewports: [viewport], phases: ["reload"] })[0];
  const cdp = {};
  const state = createMeasurementState();
  state.collecting = true;
  state.consoleErrors.push({ text: "stale" });
  state.requestErrors.push({ url: "stale" });
  const calls = [];
  const dependencies = {
    navigate: async (_cdp, url) => calls.push({ type: "navigate", url }),
    waitForDocumentReady: async () => calls.push({ type: "document-ready" }),
    prepareRoute: async (_cdp, hash) => calls.push({ type: "prepare", hash }),
    waitForAuditStable: async (_cdp, stableState, stableRoute, stableViewport, options) => {
      if (options.phase === "setup") {
        stableState.consoleErrors.push({ text: "setup-only" });
        stableState.requestErrors.push({ url: "setup-only" });
      }
      calls.push({
        type: "stable",
        phase: options.phase,
        collecting: stableState.collecting,
        consoleErrorCount: stableState.consoleErrors.length,
        requestErrorCount: stableState.requestErrors.length,
      });
      return validProbe(stableRoute, stableViewport);
    },
    reload: async () => calls.push({ type: "reload" }),
  };
  const direct = await collectBrowserAuditCheck(cdp, state, {
    baseUrl: "http://localhost:4173",
    entry: directEntry,
    route,
    viewport,
    dependencies,
  });
  assert.equal(direct.passed, true);
  assert.deepEqual(calls.map(call => call.type), ["navigate", "document-ready", "navigate", "document-ready", "prepare", "stable"]);
  assert.equal(calls[0].url, "about:blank");
  assert.equal(calls[2].url, "http://localhost:4173/#workspace/blocks/lateral-ventricle");
  assert.equal(calls.at(-1).collecting, true);
  assert.deepEqual(direct.consoleErrors, []);
  assert.deepEqual(direct.requestErrors, []);

  calls.length = 0;
  const reload = await collectBrowserAuditCheck(cdp, state, {
    baseUrl: "http://localhost:4173",
    entry: reloadEntry,
    route,
    viewport,
    dependencies,
  });
  assert.equal(reload.passed, true);
  assert.deepEqual(calls.map(call => call.type), [
    "navigate", "document-ready", "navigate", "document-ready", "prepare", "stable",
    "reload", "document-ready", "prepare", "stable",
  ]);
  assert.equal(calls[5].collecting, true);
  assert.equal(calls[5].consoleErrorCount, 1);
  assert.equal(calls[5].requestErrorCount, 1);
  assert.equal(calls.at(-1).collecting, true);
  assert.equal(calls.at(-1).consoleErrorCount, 0);
  assert.equal(calls.at(-1).requestErrorCount, 0);
  assert.deepEqual(reload.consoleErrors, []);
  assert.deepEqual(reload.requestErrors, []);
});

test("collectBrowserAuditCheck records phase errors as failed results", async () => {
  const route = BETA_AUDIT_ROUTES[0];
  const viewport = BETA_AUDIT_VIEWPORTS[0];
  const entry = buildBetaAuditMatrix({ routes: [route], viewports: [viewport], phases: ["direct"] })[0];
  const state = createMeasurementState();
  const failed = await collectBrowserAuditCheck({}, state, {
    baseUrl: "http://localhost:4173",
    entry,
    route,
    viewport,
    dependencies: {
      navigate: async (_cdp, url) => { if (url !== "about:blank") throw new Error("route navigation failed"); },
      waitForDocumentReady: async () => {},
    },
  });
  assert.equal(failed.passed, false);
  assert.equal(failed.validation.passed, false);
  assert.ok(failed.validation.failures.includes("runtime-error"));
});

test("audit stability requires a quiet in-flight window and rejects fallback contracts", async () => {
  const route = BETA_AUDIT_ROUTES[0];
  const viewport = BETA_AUDIT_VIEWPORTS[0];
  const state = createMeasurementState();
  state.inFlight.add("pending");
  let evaluations = 0;
  const stable = await waitForAuditStable({}, state, route, viewport, {
    quietMs: 0,
    evaluateFn: async () => {
      evaluations += 1;
      if (evaluations > 1) state.inFlight.clear();
      return validProbe(route, viewport);
    },
    sleepFn: async () => {},
  });
  assert.equal(stable.hash, route.hash);
  assert.ok(evaluations >= 2);

  await assert.rejects(
    waitForAuditStable({}, createMeasurementState(), route, viewport, {
      quietMs: 0,
      evaluateFn: async () => ({ ...validProbe(route, viewport), webglFallback: true }),
      sleepFn: async () => {},
      timeoutMs: 10,
    }),
    error => error.probe?.webglFallback === true && /webgl-fallback/.test(error.message),
  );
});

test("beta route audit CLI accepts a loopback base URL", () => {
  assert.deepEqual(parseAuditArgs([
    "--base-url", "http://localhost:4173",
    "--output", "work/browser-audit/beta-route-audit.json",
  ]), {
    baseUrl: "http://localhost:4173",
    output: "work/browser-audit/beta-route-audit.json",
    help: false,
  });
  assert.throws(() => parseAuditArgs(["--base-url", "https://example.com", "--output", "x.json"]), /localhost or a loopback/);
});
