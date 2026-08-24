import assert from "node:assert/strict";
import test from "node:test";

import {
  CORE_INTERACTION_EMULATION_POLICY,
  CORE_INTERACTION_EXPECTED_CHECKS,
  CORE_INTERACTION_JOURNEYS,
  CORE_INTERACTION_TOOL,
  CORE_INTERACTION_VIEWPORTS,
  aggregateCoreInteractionReport,
  buildCoreInteractionMatrix,
  runCoreInteractionAudit,
  validateCoreInteractionCheck,
  validateCoreInteractionReport,
} from "../scripts/audit_core_interactions.mjs";

const BASE_URL = "http://localhost:4173";
const GENERATED_AT = "2026-08-23T00:00:00.000Z";
const BROWSER = Object.freeze({
  executable: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  product: "Chrome/151.0.0.0",
  userAgent: "Mozilla/5.0 HeadlessChrome/151.0.0.0 Safari/537.36",
});
const ENVIRONMENT = Object.freeze({
  os: { platform: "win32", release: "10.0.26100", version: "Windows 11", arch: "x64" },
  cpuCount: 16,
  memoryBytes: { total: 32 * 1024 ** 3, free: 16 * 1024 ** 3 },
  nodeVersion: "v24.19.0",
});

function deepClone(value) {
  return structuredClone(value);
}

function validProbe(journey, viewport, overrides = {}) {
  const isLateral = journey.id === "surface-lateral";
  const isFree = journey.id === "surface-free";
  const isSections = journey.id === "sections-horizontal";
  const isQuiz = journey.id === "quiz";
  const probe = {
    readyState: "complete",
    hash: journey.hash,
    appRootPresent: true,
    identityText: journey.identity.text,
    loadingCount: 0,
    uiErrors: [],
    canvasCount: journey.canvas[viewport.id],
    webglFallback: false,
    clientWidth: viewport.width,
    clientHeight: viewport.height,
    scrollWidth: viewport.width,
    horizontalOverflow: false,
    rotation: isLateral ? { x: 0, y: -90, z: 0 } : isFree ? { x: -8, y: -28, z: 0 } : { x: null, y: null, z: null },
    zoom: isLateral || isFree ? 1 : null,
    surface: { selectedCount: 0, cerebellumPressed: false },
    sections: {
      rangeValue: isSections ? 50 : null,
      rangeMin: isSections ? 0 : null,
      rangeMax: isSections ? 100 : null,
      outputValue: isSections ? 50 : null,
      layoutText: isSections ? "断面＋3D" : "",
      layoutPressed: isSections,
    },
    free: { pathwayText: "", pathwayPressed: false, selectedCount: 0 },
    destination: {
      family: isSections ? "sections" : isLateral || isFree ? "surface" : null,
      plane: isSections ? "horizontal" : null,
      view: isLateral ? "lateral" : isFree ? "free" : null,
      position: isSections ? 50 : null,
      selectedStructureKeys: [],
      selectedSurfaceRegionKeys: [],
    },
    quiz: {
      optionCount: isQuiz ? 4 : 0,
      enabledOptionCount: isQuiz ? 4 : 0,
      feedbackVisible: false,
      reviewAvailable: false,
      format: isQuiz ? "section" : null,
      provisionalIncluded: false,
      standardCandidateText: isQuiz ? "標準 10問" : "",
      questionIndex: isQuiz ? 0 : null,
      queueLength: isQuiz ? 5 : null,
      questionSignature: isQuiz ? "initial-question\u0001A\u0001B" : null,
      questionPrompt: isQuiz ? "位置関係を確認" : null,
      targetKey: isQuiz ? "thalamus" : null,
      targetPlane: isQuiz ? "horizontal" : null,
      targetPosition: isQuiz ? 50 : null,
      targetView: null,
    },
  };
  return { ...probe, ...overrides };
}

function validActions(journey) {
  if (journey.id === "surface-lateral") {
    return [
      { name: "select-structure", passed: true, details: { selected: { clicked: true }, selectedCount: 1 } },
      { name: "toggle-cerebellum", passed: true, details: { cerebellum: { clicked: true }, before: false, after: true } },
      { name: "rotate", passed: true, details: { rotate: { dispatched: true }, rotation: { x: 0, y: -80, z: 0 } } },
      { name: "zoom", passed: true, details: { zoom: { clicked: true }, before: 1, after: 1.15 } },
      { name: "reset-orientation", passed: true, details: { reset: { clicked: true }, zoomResetControl: { clicked: true }, rotation: { x: 0, y: -90, z: 0 }, zoom: 1 } },
    ];
  }
  if (journey.id === "sections-horizontal") {
    return [
      { name: "horizontal-range-step", passed: true, details: { plus: { changed: true }, before: 50, target: 51, after: 51, output: 51, viewport: "pc" } },
      { name: "horizontal-range-return", passed: true, details: { minus: { changed: true }, target: 50, after: 50, output: 50 } },
      { name: "section-layout-toggle", passed: true, details: { section: { clicked: true, text: "断面のみ" }, canvasCount: 1 } },
      { name: "section-layout-3d", passed: true, details: { model: { clicked: true, text: "3Dのみ" }, canvasCount: 2 } },
      { name: "section-layout-both", passed: true, details: { both: { clicked: true, text: "断面＋3D" }, canvasCount: 3 } },
    ];
  }
  if (journey.id === "surface-free") {
    return [
      { name: "pathway-preset", passed: true, details: { preset: { clicked: true }, selectedCount: 1 } },
      { name: "select-structure", passed: true, details: { selected: { changed: true }, before: 1, after: 2 } },
      { name: "clear-selection", passed: true, details: { clear: { clicked: true }, selectedCount: 0, pathwayPressed: false } },
      { name: "rotate", passed: true, details: { rotate: { dispatched: true }, rotation: { x: -8, y: -18, z: 0 } } },
      { name: "reset-orientation", passed: true, details: { reset: { clicked: true }, rotation: { x: -8, y: -28, z: 0 } } },
    ];
  }
  const setupBefore = { queueLength: 10, questionIndex: 0, questionSignature: "old-question", questionPrompt: "old", targetKey: "thalamus", targetPlane: "horizontal", targetPosition: 48, targetView: null, format: "section", provisionalIncluded: false };
  const setupAfter = { queueLength: 10, questionIndex: 0, questionSignature: "setup-question", questionPrompt: "setup", targetKey: "thalamus", targetPlane: "horizontal", targetPosition: 50, targetView: null, format: "section", provisionalIncluded: false };
  const after = { queueLength: 5, questionIndex: 0, questionSignature: "new-question", questionPrompt: "new", targetKey: "thalamus", targetPlane: "horizontal", targetPosition: 50, targetView: null, format: "section", provisionalIncluded: false };
  const expectedReview = { family: "sections", hash: "#workspace/sections/horizontal", plane: "horizontal", view: null, position: 50, targetKey: "thalamus" };
  const observedReview = { family: "sections", hash: "#workspace/sections/horizontal", plane: "horizontal", view: null, position: 50, selectedStructureKeys: ["thalamus"], selectedSurfaceRegionKeys: [] };
  return [
    { name: "configure-standard", passed: true, details: { configured: { provisionalUnchecked: true, format: "section" }, setupBefore, setupAfter, standardCandidateText: "標準 10問" } },
    { name: "start-quiz", passed: true, details: { started: { clicked: true }, requestedCount: 5, setupBefore, setupAfter, after, queueChanged: true, generationObserved: true } },
    { name: "answer", passed: true, details: { answered: { clicked: true }, feedbackVisible: true, attempt: 0, questionBeforeAnswer: after, expectedReview } },
    { name: "feedback", passed: true, details: { feedbackVisible: true } },
    { name: "review-link", passed: true, details: { review: { clicked: true }, expectedReview, observedReview } },
  ];
}

function validCheck(entry, journey, viewport) {
  const probe = validProbe(journey, viewport);
  const actions = validActions(journey);
  let finalProbe = probe;
  let destination = { hash: journey.hash, canvas: journey.canvas[viewport.id] };
  if (journey.id === "quiz") {
    finalProbe = validProbe(journey, viewport, {
      hash: "#workspace/sections/horizontal",
      identityText: "水平断",
      canvasCount: 1,
      destination: {
        family: "sections",
        plane: "horizontal",
        view: null,
        position: 50,
        selectedStructureKeys: ["thalamus"],
        selectedSurfaceRegionKeys: [],
      },
      sections: { rangeValue: 50, rangeMin: 0, rangeMax: 100, outputValue: 50, layoutText: "断面のみ", layoutPressed: true },
    });
    destination = {
      hash: "#workspace/sections/horizontal",
      minCanvas: 1,
      identityText: "水平断",
      expectedReview: { family: "sections", hash: "#workspace/sections/horizontal", plane: "horizontal", view: null, position: 50, targetKey: "thalamus" },
      observedReview: { family: "sections", hash: "#workspace/sections/horizontal", plane: "horizontal", view: null, position: 50, selectedStructureKeys: ["thalamus"], selectedSurfaceRegionKeys: [] },
    };
  }
  const validation = validateCoreInteractionCheck({ journey, viewport, probe, finalProbe, destination, actions, consoleErrors: [], requestErrors: [], error: null });
  return {
    ...entry,
    journey,
    viewport,
    baseUrl: BASE_URL,
    browser: { ...BROWSER },
    emulation: { ...CORE_INTERACTION_EMULATION_POLICY },
    probe,
    finalProbe,
    destination,
    actions,
    consoleErrors: [],
    requestErrors: [],
    error: null,
    validation,
    passed: validation.passed,
  };
}

function validResults() {
  return buildCoreInteractionMatrix().map(entry => {
    const journey = CORE_INTERACTION_JOURNEYS.find(candidate => candidate.id === entry.journeyId);
    const viewport = CORE_INTERACTION_VIEWPORTS.find(candidate => candidate.id === entry.viewportId);
    return validCheck(entry, journey, viewport);
  });
}

function validReport(results = validResults()) {
  return aggregateCoreInteractionReport({
    baseUrl: BASE_URL,
    results,
    generatedAt: GENERATED_AT,
    environment: deepClone(ENVIRONMENT),
  });
}

test("core interaction audit fixes the exact four-journey × two-viewport matrix", () => {
  assert.equal(CORE_INTERACTION_JOURNEYS.length, 4);
  assert.deepEqual(CORE_INTERACTION_JOURNEYS.map(journey => journey.id), ["surface-lateral", "sections-horizontal", "surface-free", "quiz"]);
  assert.deepEqual(CORE_INTERACTION_VIEWPORTS.map(viewport => [viewport.id, viewport.width, viewport.height]), [["pc", 1366, 768], ["tablet-landscape", 1024, 768]]);
  const matrix = buildCoreInteractionMatrix();
  assert.equal(CORE_INTERACTION_EXPECTED_CHECKS, 8);
  assert.equal(matrix.length, 8);
  assert.equal(new Set(matrix.map(entry => entry.key)).size, 8);
  assert.deepEqual(matrix.map(entry => entry.key), [
    "surface-lateral-pc", "sections-horizontal-pc", "surface-free-pc", "quiz-pc",
    "surface-lateral-tablet-landscape", "sections-horizontal-tablet-landscape", "surface-free-tablet-landscape", "quiz-tablet-landscape",
  ]);
});

test("injected coordinator covers every check with explicit desktop/non-touch emulation", async () => {
  const calls = [];
  const results = await runCoreInteractionAudit(BASE_URL, {
    runCheck: async ({ entry, journey, viewport, emulation }) => {
      calls.push({ key: entry.key, emulation });
      return validCheck(entry, journey, viewport);
    },
  });
  assert.equal(results.length, 8);
  assert.deepEqual(calls.map(call => call.key), buildCoreInteractionMatrix().map(entry => entry.key));
  assert.ok(calls.every(call => call.emulation.mobile === false && call.emulation.touch === false));
  const report = validReport(results);
  assert.equal(report.allPassed, true);
  assert.equal(validateCoreInteractionReport(report).passed, true);
  assert.equal(report.tool, CORE_INTERACTION_TOOL);
  assert.deepEqual(report.emulation, { mobile: false, touch: false });
});

test("independent report validation rejects provenance, coverage, probe, and action mutations", () => {
  const base = validReport();
  assert.equal(validateCoreInteractionReport(base).passed, true);
  const mutations = [
    ["schema", report => { report.schemaVersion = 99; }, "report-schema-version"],
    ["tool", report => { report.tool = "wrong-tool.mjs"; }, "report-tool"],
    ["timestamp", report => { report.generatedAt = "not-an-iso-time"; }, "report-generated-at"],
    ["base URL", report => { report.baseUrl = "https://example.invalid"; }, "report-base-url"],
    ["environment", report => { report.environment.os.platform = "linux"; }, "report-environment-os"],
    ["node", report => { report.environment.nodeVersion = "v22.0.0"; }, "report-environment-node"],
    ["browser", report => { report.matrix.results[0].browser.product = "Chrome/150.0.0.0"; }, "result-browser-surface-lateral-pc-product"],
    ["mixed browser", report => { report.matrix.results[1].browser.userAgent = "Mozilla/5.0 HeadlessChrome/150.0.0.0"; }, "result-browser-identity-mismatch"],
    ["journey swap", report => { report.matrix.results[0].journeyId = "quiz"; }, "result-surface-lateral-pc-journeyId"],
    ["viewport swap", report => { report.matrix.results[0].viewportId = "tablet-landscape"; }, "result-surface-lateral-pc-viewportId"],
    ["malformed probe", report => { report.matrix.results[0].probe.uiErrors = null; }, "result-surface-lateral-pc-probe-ui-errors"],
    ["wrong width", report => { report.matrix.results[0].probe.clientWidth = 1280; }, "result-surface-lateral-pc-probe-viewport-width"],
    ["wrong height", report => { report.matrix.results[0].finalProbe.clientHeight = 700; }, "result-surface-lateral-pc-final-probe-viewport-height"],
    ["contradictory action detail", report => { report.matrix.results[0].actions[0].details.selected.clicked = false; }, "result-surface-lateral-pc-action-details:select-structure"],
  ];
  for (const [name, mutate, expectedFailure] of mutations) {
    const mutation = deepClone(base);
    mutate(mutation);
    const validation = validateCoreInteractionReport(mutation);
    assert.equal(validation.passed, false, name);
    assert.ok(validation.failures.includes(expectedFailure), `${name}: ${validation.failures.join(",")}`);
  }
});

test("aggregate and report validator reject missing, duplicate, unknown, failed, and contradictory results", () => {
  const results = validResults();
  assert.equal(validReport(results).allPassed, true);
  const missing = validReport(results.slice(0, -1));
  assert.equal(missing.allPassed, false);
  assert.equal(missing.matrix.missingKeys.length, 1);
  const duplicate = validReport([...results, results[0]]);
  assert.equal(duplicate.allPassed, false);
  assert.ok(duplicate.matrix.duplicateKeys.includes(results[0].key));
  const unknown = validReport([...results.slice(0, -1), { ...results[0], key: "injected-unknown" }]);
  assert.equal(unknown.allPassed, false);
  assert.deepEqual(unknown.matrix.unknownKeys, ["injected-unknown"]);
  const failed = [...results];
  failed[0] = { ...failed[0], passed: false };
  assert.equal(validReport(failed).allPassed, false);
  const contradictory = [...results];
  contradictory[0] = { ...contradictory[0], validation: { passed: false, failures: ["injected"] } };
  assert.equal(validReport(contradictory).allPassed, false);
});

test("quiz validation rejects a no-op Start and a wrong review destination", () => {
  const base = validReport();
  const quiz = base.matrix.results.find(result => result.journeyId === "quiz");
  const noOp = deepClone(base);
  const noOpQuiz = noOp.matrix.results.find(result => result.journeyId === "quiz");
  noOpQuiz.actions.find(action => action.name === "start-quiz").details.queueChanged = false;
  let validation = validateCoreInteractionReport(noOp);
  assert.equal(validation.passed, false);
  assert.ok(validation.failures.some(failure => failure.includes("action-details:start-quiz")));
  const wrongDestination = deepClone(base);
  const wrongQuiz = wrongDestination.matrix.results.find(result => result.journeyId === "quiz");
  const review = wrongQuiz.actions.find(action => action.name === "review-link");
  review.details.observedReview.hash = "#workspace/surface/free";
  validation = validateCoreInteractionReport(wrongDestination);
  assert.equal(validation.passed, false);
  assert.ok(validation.failures.some(failure => failure.includes("action-details:review-link")));
  assert.equal(quiz.journeyId, "quiz");

  const pairedCopies = deepClone(base);
  const pairedQuiz = pairedCopies.matrix.results.find(result => result.journeyId === "quiz");
  const answer = pairedQuiz.actions.find(action => action.name === "answer");
  const pairedReview = pairedQuiz.actions.find(action => action.name === "review-link");
  const wrongExpected = { ...pairedReview.details.expectedReview, hash: "#workspace/sections/sagittal" };
  const wrongObserved = { ...pairedReview.details.observedReview, hash: "#workspace/sections/sagittal", plane: "sagittal" };
  answer.details.expectedReview = wrongExpected;
  pairedReview.details.expectedReview = wrongExpected;
  pairedQuiz.destination.expectedReview = wrongExpected;
  pairedReview.details.observedReview = wrongObserved;
  pairedQuiz.destination.observedReview = wrongObserved;
  validation = validateCoreInteractionReport(pairedCopies);
  assert.equal(validation.passed, false);
  assert.ok(validation.failures.some(failure => failure.includes("action-details:answer")) || validation.failures.some(failure => failure.includes("action-details:review-link")));

  const crossLinked = deepClone(base);
  const crossQuiz = crossLinked.matrix.results.find(result => result.journeyId === "quiz");
  const crossAnswer = crossQuiz.actions.find(action => action.name === "answer");
  const crossReview = crossQuiz.actions.find(action => action.name === "review-link");
  crossReview.details.expectedReview = { ...crossAnswer.details.expectedReview, position: 51 };
  validation = validateCoreInteractionReport(crossLinked);
  assert.equal(validation.passed, false);
  assert.ok(validation.failures.some(failure => failure.includes("action-details:review-link")));
});

test("semantic contract rejects failed actions and health regressions", () => {
  const journey = CORE_INTERACTION_JOURNEYS.find(candidate => candidate.id === "surface-lateral");
  const viewport = CORE_INTERACTION_VIEWPORTS[0];
  const base = validProbe(journey, viewport);
  const actions = validActions(journey);
  const cases = [
    ["action", { actions: actions.map((item, index) => index === 0 ? { ...item, passed: false } : item) }, "action-failed"],
    ["console", { consoleErrors: [{ text: "console" }] }, "console-errors"],
    ["request", { requestErrors: [{ url: "/missing" }] }, "request-errors"],
    ["overflow", { probe: { ...base, horizontalOverflow: true } }, "horizontal-overflow"],
    ["fallback", { finalProbe: { ...base, webglFallback: true } }, "final-webgl-fallback"],
    ["missing action", { actions: actions.slice(1) }, "action-missing"],
  ];
  for (const [name, mutation, failure] of cases) {
    const validation = validateCoreInteractionCheck({ journey, viewport, probe: base, finalProbe: base, destination: { hash: journey.hash, canvas: 1 }, actions, consoleErrors: [], requestErrors: [], error: null, ...mutation });
    assert.equal(validation.passed, false, name);
    assert.ok(validation.failures.some(value => value.startsWith(failure)), `${name}: ${validation.failures.join(",")}`);
  }
});

test("source exposes semantic model and quiz state hooks used by the audit", async () => {
  const { readFile } = await import("node:fs/promises");
  const [page, canvas] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/AtlasVolumeCanvas.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(page, /data-rotation-x=\{rotation\.x\}/);
  assert.match(page, /data-rotation-y=\{rotation\.y\}/);
  assert.match(page, /data-quiz-target=\{quizQuestion\.target\}/);
  assert.match(canvas, /data-atlas-zoom=\{zoom\}/);
  assert.match(canvas, /data-atlas-rotation-x=\{rotation\.x\}/);
});
