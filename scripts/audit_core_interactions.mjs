/**
 * Small, semantic browser audit for the PC/tablet learning journeys.
 *
 * This deliberately measures DOM state and interaction outcomes only. It does
 * not compare pixels or make anatomical claims. Chrome/CDP setup and network
 * observers are shared with the performance runner.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { arch, cpus, freemem, platform, release, totalmem, version } from "node:os";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  attachObservers,
  closeChrome,
  configurePage,
  createMeasurementState,
  evaluate,
  launchChrome,
  navigate,
  resetMeasurementState,
  resolveRoute,
  waitForDocumentReady,
} from "./measure_browser_performance.mjs";

export const CORE_INTERACTION_SCHEMA_VERSION = 1;
export const CORE_INTERACTION_TOOL = "scripts/audit_core_interactions.mjs";
export const CORE_INTERACTION_EMULATION_POLICY = Object.freeze({ mobile: false, touch: false });
export const CORE_INTERACTION_EXPECTED_OS = "win32";
export const CORE_INTERACTION_EXPECTED_NODE_MAJOR = "24";
export const CORE_INTERACTION_EXPECTED_CHROME_MAJOR = "151";
export const CORE_INTERACTION_VIEWPORTS = Object.freeze([
  Object.freeze({ id: "pc", label: "PC", width: 1366, height: 768 }),
  Object.freeze({ id: "tablet-landscape", label: "tablet landscape", width: 1024, height: 768 }),
]);

function journeySpec({ id, routeId, hash, identitySelector, identityText, canvas, actionNames }) {
  return Object.freeze({
    id,
    routeId,
    hash,
    identity: Object.freeze({ selector: identitySelector, text: identityText }),
    canvas: Object.freeze({ ...canvas }),
    actionNames: Object.freeze([...actionNames]),
  });
}

export const CORE_INTERACTION_JOURNEYS = Object.freeze([
  journeySpec({
    id: "surface-lateral",
    routeId: "surface-lateral",
    hash: "#workspace/surface/lateral",
    identitySelector: ".learningGuide h2",
    identityText: "左外側面",
    canvas: { pc: 1, "tablet-landscape": 1 },
    actionNames: ["select-structure", "toggle-cerebellum", "rotate", "zoom", "reset-orientation"],
  }),
  journeySpec({
    id: "sections-horizontal",
    routeId: "sections-horizontal",
    hash: "#workspace/sections/horizontal",
    identitySelector: ".slicePanel .panelHead b",
    identityText: "水平断",
    canvas: { pc: 3, "tablet-landscape": 3 },
    actionNames: ["horizontal-range-step", "horizontal-range-return", "section-layout-toggle", "section-layout-3d", "section-layout-both"],
  }),
  journeySpec({
    id: "surface-free",
    routeId: "surface-free",
    hash: "#workspace/surface/free",
    identitySelector: ".learningGuide h2",
    identityText: "自由観察",
    canvas: { pc: 1, "tablet-landscape": 1 },
    actionNames: ["pathway-preset", "select-structure", "clear-selection", "rotate", "reset-orientation"],
  }),
  journeySpec({
    id: "quiz",
    routeId: "quiz",
    hash: "#workspace/quiz",
    identitySelector: ".quizArea .workHead h1",
    identityText: "復習クイズ",
    canvas: { pc: 1, "tablet-landscape": 1 },
    actionNames: ["configure-standard", "start-quiz", "answer", "feedback", "review-link"],
  }),
]);

export const CORE_INTERACTION_EXPECTED_CHECKS = CORE_INTERACTION_JOURNEYS.length * CORE_INTERACTION_VIEWPORTS.length;

function argumentValue(argv, index, name) {
  const token = argv[index];
  const prefix = `${name}=`;
  if (token.startsWith(prefix)) return { value: token.slice(prefix.length), nextIndex: index };
  if (index + 1 >= argv.length || argv[index + 1].startsWith("--")) throw new Error(`${name} requires a value`);
  return { value: argv[index + 1], nextIndex: index + 1 };
}

export function parseCoreInteractionArgs(argv) {
  const options = { baseUrl: null, output: null, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--help" || token === "-h") { options.help = true; continue; }
    const name = ["--base-url", "--output"].find(candidate => token === candidate || token.startsWith(`${candidate}=`));
    if (!name) throw new Error(`unknown option: ${token}`);
    const parsed = argumentValue(argv, index, name);
    index = parsed.nextIndex;
    if (name === "--base-url") options.baseUrl = parsed.value;
    else options.output = parsed.value;
  }
  if (options.help) return options;
  const missing = ["baseUrl", "output"].filter(key => !options[key]);
  if (missing.length) throw new Error(`missing required option(s): ${missing.map(key => `--${key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}`).join(", ")}`);
  resolveRoute(options.baseUrl, "/");
  return options;
}

export function buildCoreInteractionMatrix({ journeys = CORE_INTERACTION_JOURNEYS, viewports = CORE_INTERACTION_VIEWPORTS } = {}) {
  return viewports.flatMap(viewport => journeys.map(journey => ({
    key: `${journey.id}-${viewport.id}`,
    journeyId: journey.id,
    routeId: journey.routeId,
    hash: journey.hash,
    viewportId: viewport.id,
    width: viewport.width,
    height: viewport.height,
  })));
}

function numberOrNull(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function compactText(value) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, 400);
}

export const CORE_INTERACTION_PROBE = `(() => {
  const root = document.documentElement;
  const body = document.body;
  const clientWidth = root?.clientWidth ?? window.innerWidth;
  const scrollWidth = Math.max(root?.scrollWidth ?? 0, body?.scrollWidth ?? 0);
  const text = element => (element?.textContent || "").replace(/\\s+/g, " ").trim();
  const stage = document.querySelector(".learningModelStage");
  const stageData = stage?.dataset || {};
  const canvas = document.querySelector(".learningModelStage canvas") || document.querySelector(".quizImageStage canvas");
  const canvasData = canvas?.dataset || {};
  const output = document.querySelector(".sliceTimeline output");
  const range = document.querySelector('input[type="range"][aria-label*="水平断"]') || document.querySelector(".sliceTimeline input[type=range]");
  const layout = [...document.querySelectorAll(".sectionLayoutSwitch button")].find(button => button.getAttribute("aria-pressed") === "true");
  const pathway = [...document.querySelectorAll(".pathwayPresets nav button")].find(button => button.getAttribute("aria-pressed") === "true");
  const cerebellum = [...document.querySelectorAll(".learningModelCard .panelActions button")].find(button => text(button).includes("小脳"));
  const quizOptions = [...document.querySelectorAll(".quizOptions > button")];
  const quizCard = document.querySelector(".quizQuestionCard");
  const quizGuide = text(document.querySelector(".quizQuestionCard .guideIndex"));
  const queueMatch = /QUESTION\\s+(\\d+)\\s+\\/\\s+(\\d+)/i.exec(quizGuide);
  const quizQuestionIndex = queueMatch ? Number(queueMatch[1]) - 1 : null;
  const quizQueueLength = queueMatch ? Number(queueMatch[2]) : null;
  const quizSignature = [
    text(document.querySelector(".quizQuestionCard h2")),
    ...quizOptions.map(option => text(option)),
  ].join("\\u0001");
  const hashParts = window.location.hash.replace(/^#workspace\\/?/, "").split("/");
  const selectedStructureKeys = [...document.querySelectorAll('.leftRail .structureBtn[aria-pressed="true"]')]
    .map(button => button.dataset.structureKey || null).filter(Boolean);
  const selectedSurfaceRegionKeys = [...document.querySelectorAll('.surfaceRegionPicker > div button[aria-pressed="true"]')]
    .map(button => button.dataset.surfaceRegionKey || null).filter(Boolean);
  const alerts = [...document.querySelectorAll(".atlasLoading.error,.segLoading.error,[role=alert]")].map(element => ({ text: text(element).slice(0, 240), className: typeof element.className === "string" ? element.className : "" }));
  return {
    readyState: document.readyState,
    hash: window.location.hash,
    appRootPresent: Boolean(document.querySelector("main.appShell")),
    identityText: text(document.querySelector(".learningGuide h2,.slicePanel .panelHead b,.quizArea .workHead h1")),
    loadingCount: document.querySelectorAll(".atlasLoading:not(.error),.segLoading:not(.error)").length,
    uiErrors: alerts,
    canvasCount: document.querySelectorAll("canvas").length,
    webglFallback: Boolean(document.querySelector(".atlasWebglFallback")),
    clientWidth,
    clientHeight: root?.clientHeight ?? window.innerHeight,
    scrollWidth,
    horizontalOverflow: scrollWidth > clientWidth + 1,
    rotation: { x: Number(stageData.rotationX), y: Number(stageData.rotationY), z: Number(stageData.rotationZ) },
    zoom: Number(canvasData.atlasZoom),
    surface: {
      selectedCount: document.querySelectorAll('.surfaceRegionPicker > div button[aria-pressed="true"]').length,
      cerebellumPressed: cerebellum?.getAttribute("aria-pressed") === "true",
    },
    sections: {
      rangeValue: range ? Number(range.value) : null,
      rangeMin: range ? Number(range.min || 0) : null,
      rangeMax: range ? Number(range.max || 100) : null,
      outputValue: output ? Number(text(output)) : null,
      layoutText: text(layout),
      layoutPressed: Boolean(layout),
    },
    free: {
      pathwayText: text(pathway),
      pathwayPressed: Boolean(pathway),
      selectedCount: document.querySelectorAll(".freeSelectedCards article").length,
    },
    destination: {
      family: hashParts[0] === "sections" ? "sections" : hashParts[0] === "surface" ? "surface" : null,
      plane: hashParts[0] === "sections" ? hashParts[1] || null : null,
      view: hashParts[0] === "surface" ? (hashParts[1] === "nerves" ? "cranialNerves" : hashParts[1] || null) : null,
      position: hashParts[0] === "sections" && range ? Number(range.value) : null,
      selectedStructureKeys,
      selectedSurfaceRegionKeys,
    },
    quiz: {
      optionCount: quizOptions.length,
      enabledOptionCount: quizOptions.filter(button => !button.disabled).length,
      feedbackVisible: Boolean(document.querySelector(".quizFeedback")),
      reviewAvailable: Boolean(document.querySelector(".quizFeedback .reviewTarget")),
      format: document.querySelectorAll(".quizSetup select")[1]?.value || null,
      provisionalIncluded: Boolean(document.querySelector(".provisionalQuizToggle input")?.checked),
      standardCandidateText: text(document.querySelector(".quizCandidateSummary")),
      questionIndex: quizQuestionIndex,
      queueLength: quizQueueLength,
      questionSignature: quizSignature || null,
      questionPrompt: text(document.querySelector(".quizQuestionCard h2")) || null,
      targetKey: quizCard?.dataset.quizTarget || null,
      targetPlane: quizCard?.dataset.quizPlane || null,
      targetPosition: quizCard?.dataset.quizPosition ? Number(quizCard.dataset.quizPosition) : null,
      targetView: quizCard?.dataset.quizView || null,
    },
  };
})()`;

function routeIdentityPresent(probe, journey) {
  if (!probe) return false;
  const text = probe.identityText || "";
  return text === journey.identity.text;
}

function commonProbeFailures(probe, journey, viewport, { expectedHash = journey?.hash, expectedCanvas = null, minCanvas = 0 } = {}) {
  const failures = [];
  if (!probe) return ["probe-missing"];
  if (probe.readyState !== "complete") failures.push("document-not-ready");
  if (expectedHash !== null && expectedHash !== undefined && probe.hash !== expectedHash) failures.push("hash-mismatch");
  if (!probe.appRootPresent) failures.push("app-root-missing");
  if (probe.loadingCount !== 0) failures.push("loader-visible");
  if (!Array.isArray(probe.uiErrors)) failures.push("ui-errors-missing");
  else if (probe.uiErrors.length) failures.push("ui-errors");
  if (probe.horizontalOverflow !== false) failures.push("horizontal-overflow");
  if (probe.webglFallback !== false) failures.push("webgl-fallback");
  if (expectedCanvas !== null && probe.canvasCount !== expectedCanvas) failures.push(`canvas-count:${probe.canvasCount}!=${expectedCanvas}`);
  if (probe.canvasCount < minCanvas) failures.push(`canvas-min:${probe.canvasCount}<${minCanvas}`);
  if (journey && expectedHash === journey.hash && !routeIdentityPresent(probe, journey)) failures.push("identity-mismatch");
  return failures;
}

const CORE_RESET_ROTATIONS = Object.freeze({
  "surface-lateral": Object.freeze({ x: 0, y: -90, z: 0 }),
  "surface-free": Object.freeze({ x: -8, y: -28, z: 0 }),
});

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function isBoolean(value) {
  return typeof value === "boolean";
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function approxEqual(left, right, tolerance = 0.01) {
  return isFiniteNumber(left) && isFiniteNumber(right) && Math.abs(left - right) <= tolerance;
}

function validRotation(value) {
  return value && typeof value === "object" && ["x", "y", "z"].every(axis => isFiniteNumber(value[axis]));
}

function validQuizSnapshot(value) {
  return value && typeof value === "object"
    && Number.isSafeInteger(value.queueLength) && value.queueLength > 0
    && Number.isSafeInteger(value.questionIndex) && value.questionIndex >= 0 && value.questionIndex < value.queueLength
    && isNonEmptyString(value.questionSignature)
    && isNonEmptyString(value.targetKey);
}

function reviewDestinationMatches(expected, observed) {
  if (!expected || !observed) return false;
  if (expected.family !== observed.family || expected.hash !== observed.hash || expected.plane !== observed.plane || expected.view !== observed.view) return false;
  if (expected.family === "sections" && !approxEqual(expected.position, observed.position, 0.01)) return false;
  const selected = expected.family === "sections" ? observed.selectedStructureKeys : observed.selectedSurfaceRegionKeys;
  return Array.isArray(selected) && selected.includes(expected.targetKey);
}

/**
 * Validate one interaction from recorded semantic details. The boolean in
 * action.passed is checked against these details; it is never accepted as
 * evidence on its own.
 */
export function validateCoreInteractionAction({ action: currentAction, journey, probe, finalProbe, actions = [], destination = null } = {}) {
  const name = currentAction?.name || "unknown";
  const details = currentAction?.details;
  const failures = [];
  let passed = false;
  if (!currentAction || typeof currentAction !== "object") failures.push(`action-details:${name}`);
  if (!details || typeof details !== "object" || Array.isArray(details)) failures.push(`action-details:${name}`);
  const d = details && typeof details === "object" ? details : {};
  if (journey?.id === "surface-lateral") {
    if (name === "select-structure") passed = d.selected?.clicked === true && Number.isSafeInteger(d.selectedCount) && d.selectedCount > 0;
    else if (name === "toggle-cerebellum") passed = d.cerebellum?.clicked === true && isBoolean(d.before) && isBoolean(d.after) && d.before !== d.after;
    else if (name === "rotate") passed = d.rotate?.dispatched === true && validRotation(d.rotation) && rotationChanged(probe?.rotation, d.rotation);
    else if (name === "zoom") passed = d.zoom?.clicked === true && isFiniteNumber(d.before) && isFiniteNumber(d.after) && d.after > d.before + 0.01;
    else if (name === "reset-orientation") {
      const expected = CORE_RESET_ROTATIONS[journey.id];
      passed = d.reset?.clicked === true && d.zoomResetControl?.clicked === true && validRotation(d.rotation) && expected && sameRotation(expected, d.rotation) && approxEqual(d.zoom, 1);
    }
  } else if (journey?.id === "sections-horizontal") {
    if (name === "horizontal-range-step") passed = d.plus?.changed === true && isFiniteNumber(d.before) && isFiniteNumber(d.target) && isFiniteNumber(d.after) && isFiniteNumber(d.output) && Math.abs(d.target - d.before) === 1 && d.after === d.target && d.output === d.target;
    else if (name === "horizontal-range-return") {
      const step = actions.find(item => item?.name === "horizontal-range-step")?.details;
      passed = d.minus?.changed === true && isFiniteNumber(d.target) && isFiniteNumber(d.after) && isFiniteNumber(d.output) && d.after === d.target && d.output === d.target && isFiniteNumber(step?.before) && d.target === step.before;
    } else if (name === "section-layout-toggle") passed = d.section?.clicked === true && compactText(d.section.text).includes("断面のみ") && d.canvasCount === 1;
    else if (name === "section-layout-3d") passed = d.model?.clicked === true && compactText(d.model.text).includes("3Dのみ") && d.canvasCount === 2;
    else if (name === "section-layout-both") passed = d.both?.clicked === true && compactText(d.both.text).includes("断面＋3D") && d.canvasCount === 3;
  } else if (journey?.id === "surface-free") {
    if (name === "pathway-preset") passed = d.preset?.clicked === true && Number.isSafeInteger(d.selectedCount) && d.selectedCount > 0;
    else if (name === "select-structure") passed = d.selected?.changed === true && Number.isSafeInteger(d.before) && Number.isSafeInteger(d.after) && d.after > d.before;
    else if (name === "clear-selection") passed = d.clear?.clicked === true && d.selectedCount === 0 && d.pathwayPressed === false;
    else if (name === "rotate") passed = d.rotate?.dispatched === true && validRotation(d.rotation) && rotationChanged(probe?.rotation, d.rotation);
    else if (name === "reset-orientation") {
      const expected = CORE_RESET_ROTATIONS[journey.id];
      passed = d.reset?.clicked === true && validRotation(d.rotation) && expected && sameRotation(expected, d.rotation);
    }
  } else if (journey?.id === "quiz") {
    if (name === "configure-standard") {
      passed = d.configured?.provisionalUnchecked === true && d.configured?.format === "section" && d.setupAfter?.provisionalIncluded === false && d.setupAfter?.format === "section" && isNonEmptyString(d.standardCandidateText) && /標準\s+[1-9]/.test(d.standardCandidateText);
    } else if (name === "start-quiz") {
      passed = d.started?.clicked === true && d.requestedCount === 5 && validQuizSnapshot(d.setupAfter) && validQuizSnapshot(d.after) && d.after.queueLength === 5 && d.after.questionIndex === 0 && d.queueChanged === true && d.generationObserved === true && (d.setupAfter.queueLength !== d.after.queueLength || d.setupAfter.questionIndex !== d.after.questionIndex || d.setupAfter.questionSignature !== d.after.questionSignature);
    } else if (name === "answer") {
      const expected = expectedQuizReviewDestination(d.questionBeforeAnswer);
      passed = d.answered?.clicked === true && d.feedbackVisible === true && Number.isSafeInteger(d.attempt) && validQuizSnapshot(d.questionBeforeAnswer) && expected !== null && sameJson(d.expectedReview, expected);
    } else if (name === "feedback") passed = d.feedbackVisible === true;
    else if (name === "review-link") {
      const answer = actions.find(item => item?.name === "answer")?.details;
      const expected = expectedQuizReviewDestination(answer?.questionBeforeAnswer);
      const observed = observedQuizReviewDestination(finalProbe);
      const expectedCopiesMatch = expected !== null
        && sameJson(answer?.expectedReview, expected)
        && sameJson(d.expectedReview, expected)
        && sameJson(destination?.expectedReview, expected);
      const observedCopiesMatch = sameJson(d.observedReview, observed) && sameJson(destination?.observedReview, observed);
      passed = d.review?.clicked === true && expectedCopiesMatch && observedCopiesMatch && reviewDestinationMatches(expected, observed);
    }
  }
  if (currentAction?.passed !== passed) failures.push(`action-detail-contradiction:${name}`);
  if (!passed) failures.push(`action-details:${name}`);
  return { passed: failures.length === 0, failures };
}

export function validateCoreInteractionCheck({ journey, viewport, probe = null, finalProbe = null, destination = null, actions = [], consoleErrors = [], requestErrors = [], error = null } = {}) {
  const failures = [];
  if (!journey) failures.push("journey-missing");
  if (!viewport) failures.push("viewport-missing");
  if (error) failures.push("runtime-error");
  if (journey && viewport) failures.push(...commonProbeFailures(probe, journey, viewport, { expectedCanvas: journey.canvas[viewport.id] }));
  const finalExpectedHash = destination?.hash ?? journey?.hash;
  const finalIdentityJourney = destination?.identityText ? null : journey;
  if (finalProbe) failures.push(...commonProbeFailures(finalProbe, finalIdentityJourney, viewport, {
    expectedHash: finalExpectedHash,
    expectedCanvas: destination?.canvas ?? null,
    minCanvas: destination?.minCanvas ?? 0,
  }).map(failure => `final-${failure}`));
  else failures.push("final-probe-missing");
  if (destination?.identityText && finalProbe?.identityText !== destination.identityText) failures.push("final-identity-mismatch");
  if (!Array.isArray(consoleErrors) || consoleErrors.length) failures.push("console-errors");
  if (!Array.isArray(requestErrors) || requestErrors.length) failures.push("request-errors");
  const expectedNames = journey?.actionNames || [];
  const seen = new Set();
  for (const action of Array.isArray(actions) ? actions : []) {
    if (seen.has(action?.name)) failures.push(`duplicate-action:${action.name}`);
    seen.add(action?.name);
    if (action?.passed !== true) failures.push(`action-failed:${action?.name || "unknown"}`);
    failures.push(...validateCoreInteractionAction({ action, journey, probe, finalProbe, actions, destination }).failures);
  }
  for (const name of expectedNames) if (!seen.has(name)) failures.push(`action-missing:${name}`);
  return { passed: failures.length === 0, failures };
}

function action(name, passed, details = {}) {
  return { name, passed: Boolean(passed), details: details && typeof details === "object" ? details : { value: details } };
}

async function pause(milliseconds) {
  await new Promise(resolvePromise => setTimeout(resolvePromise, milliseconds));
}

export async function waitForCoreInteractionStable(cdp, state, {
  expectedHash = null,
  expectedCanvas = null,
  minCanvas = 0,
  predicate = () => true,
  timeoutMs = 30_000,
  quietMs = 400,
  evaluateFn = evaluate,
  sleepFn = pause,
} = {}) {
  const deadline = Date.now() + timeoutMs;
  let latest = null;
  let quietSince = null;
  while (Date.now() < deadline) {
    try {
      latest = await evaluateFn(cdp, CORE_INTERACTION_PROBE);
      const healthy = commonProbeFailures(latest, null, null, { expectedHash, expectedCanvas, minCanvas }).length === 0;
      if (healthy && state?.inFlight?.size === 0 && predicate(latest)) {
        if (quietSince === null) quietSince = Date.now();
        if (Date.now() - quietSince >= quietMs) return latest;
      } else quietSince = null;
    } catch {
      quietSince = null;
    }
    await sleepFn(50);
  }
  const details = latest ? JSON.stringify({
    hash: latest.hash,
    loadingCount: latest.loadingCount,
    uiErrors: latest.uiErrors?.length,
    canvasCount: latest.canvasCount,
    rotation: latest.rotation,
    zoom: latest.zoom,
    surface: latest.surface,
    sections: latest.sections,
    free: latest.free,
    quiz: latest.quiz,
  }) : "missing";
  throw new Error(`core interaction did not become stable (${details})`);
}

export async function click(cdp, selector, textIncludes = null) {
  return evaluate(cdp, `(() => {
    const candidates = [...document.querySelectorAll(${JSON.stringify(selector)})].filter(element => !element.disabled);
    const element = ${textIncludes ? `candidates.find(candidate => (candidate.textContent || "").includes(${JSON.stringify(textIncludes)}))` : "candidates[0]"};
    if (!element) return { clicked: false, selector: ${JSON.stringify(selector)}, reason: "control-missing" };
    element.click();
    return { clicked: true, selector: ${JSON.stringify(selector)}, text: (element.textContent || "").replace(/\\s+/g, " ").trim(), pressed: element.getAttribute("aria-pressed") };
  })()`);
}

function rotationChanged(before, after) {
  return before && after && ["x", "y", "z"].some(axis => Number.isFinite(before[axis]) && Number.isFinite(after[axis]) && Math.abs(before[axis] - after[axis]) > 0.01);
}

function sameRotation(left, right) {
  return left && right && ["x", "y", "z"].every(axis => Number.isFinite(left[axis]) && Number.isFinite(right[axis]) && Math.abs(left[axis] - right[axis]) < 0.01);
}

async function surfaceLateralJourney(cdp, state, viewport) {
  const actions = [];
  let probe = await waitForCoreInteractionStable(cdp, state, { expectedHash: "#workspace/surface/lateral", expectedCanvas: 1, minCanvas: 1 });
  const initialRotation = probe.rotation;
  const resetRotation = { x: 0, y: -90, z: 0 };
  const initialZoom = probe.zoom;
  const selected = await click(cdp, ".surfaceRegionPicker > div button[aria-pressed=\"false\"]");
  let after = await waitForCoreInteractionStable(cdp, state, { expectedHash: "#workspace/surface/lateral", expectedCanvas: 1, minCanvas: 1, predicate: value => value.surface.selectedCount > 0 });
  actions.push(action("select-structure", selected?.clicked === true && after.surface.selectedCount > 0, { selected, selectedCount: after.surface.selectedCount }));
  const cerebellumBefore = after.surface.cerebellumPressed;
  const cerebellum = await click(cdp, ".learningModelCard .panelActions button", "小脳");
  after = await waitForCoreInteractionStable(cdp, state, { expectedHash: "#workspace/surface/lateral", expectedCanvas: 1, minCanvas: 1, predicate: value => value.surface.cerebellumPressed !== cerebellumBefore });
  actions.push(action("toggle-cerebellum", cerebellum?.clicked === true && after.surface.cerebellumPressed !== cerebellumBefore, { cerebellum, before: cerebellumBefore, after: after.surface.cerebellumPressed }));
  const rotate = await evaluate(cdp, `(() => { const stage = document.querySelector(".learningModelStage"); if (!stage) return { dispatched: false }; stage.focus(); stage.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })); return { dispatched: true }; })()`);
  after = await waitForCoreInteractionStable(cdp, state, { expectedHash: "#workspace/surface/lateral", expectedCanvas: 1, minCanvas: 1, predicate: value => rotationChanged(initialRotation, value.rotation) });
  actions.push(action("rotate", rotate?.dispatched === true && rotationChanged(initialRotation, after.rotation), { rotate, rotation: after.rotation }));
  const zoom = await click(cdp, ".modelZoomControls button", "＋");
  after = await waitForCoreInteractionStable(cdp, state, { expectedHash: "#workspace/surface/lateral", expectedCanvas: 1, minCanvas: 1, predicate: value => Number.isFinite(value.zoom) && Number.isFinite(initialZoom) && value.zoom > initialZoom + 0.01 });
  actions.push(action("zoom", zoom?.clicked === true && after.zoom > initialZoom + 0.01, { zoom, before: initialZoom, after: after.zoom }));
  const reset = await click(cdp, ".learningModelCard .panelActions button", "向きを戻す");
  after = await waitForCoreInteractionStable(cdp, state, { expectedHash: "#workspace/surface/lateral", expectedCanvas: 1, minCanvas: 1, predicate: value => sameRotation(resetRotation, value.rotation) });
  const zoomResetControl = await click(cdp, ".modelZoomControls button", "%");
  if (zoomResetControl?.clicked !== true) throw new Error(`zoom reset control failed: ${JSON.stringify(zoomResetControl)}`);
  after = await waitForCoreInteractionStable(cdp, state, { expectedHash: "#workspace/surface/lateral", expectedCanvas: 1, minCanvas: 1, predicate: value => sameRotation(resetRotation, value.rotation) && Number.isFinite(value.zoom) && Math.abs(value.zoom - 1) < 0.01 });
  const zoomReset = Number.isFinite(after.zoom) && Math.abs(after.zoom - 1) < 0.01;
  actions.push(action("reset-orientation", reset?.clicked === true && zoomResetControl?.clicked === true && sameRotation(resetRotation, after.rotation) && zoomReset, { reset, zoomResetControl, rotation: after.rotation, zoom: after.zoom }));
  return { probe, finalProbe: after, actions, destination: { hash: "#workspace/surface/lateral", canvas: 1 } };
}

async function setHorizontalValue(cdp, target) {
  return evaluate(cdp, `(() => {
    const input = document.querySelector('input[type="range"][aria-label*="水平断"]');
    if (!input) return { changed: false, reason: "range-missing" };
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    if (!setter) return { changed: false, reason: "range-setter-missing" };
    setter.call(input, ${JSON.stringify(String(target))});
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    return { changed: true, target: Number(input.value) };
  })()`);
}

async function sectionsHorizontalJourney(cdp, state, viewport) {
  const actions = [];
  const initial = await waitForCoreInteractionStable(cdp, state, { expectedHash: "#workspace/sections/horizontal", expectedCanvas: 3, minCanvas: 1 });
  const before = initial.sections.rangeValue;
  const min = initial.sections.rangeMin ?? 0;
  const max = initial.sections.rangeMax ?? 100;
  const plusTarget = before < max ? before + 1 : before - 1;
  const plus = await setHorizontalValue(cdp, plusTarget);
  let after = await waitForCoreInteractionStable(cdp, state, { expectedHash: "#workspace/sections/horizontal", expectedCanvas: 3, minCanvas: 1, predicate: value => value.sections.rangeValue === plusTarget && value.sections.outputValue === plusTarget });
  actions.push(action("horizontal-range-step", plus?.changed === true && after.sections.rangeValue === plusTarget && after.sections.outputValue === plusTarget, { plus, before, target: plusTarget, after: after.sections.rangeValue, output: after.sections.outputValue, viewport: viewport.id }));
  const minusTarget = before < max ? before : Math.max(min, before + 1);
  const minus = await setHorizontalValue(cdp, minusTarget);
  after = await waitForCoreInteractionStable(cdp, state, { expectedHash: "#workspace/sections/horizontal", expectedCanvas: 3, minCanvas: 1, predicate: value => value.sections.rangeValue === minusTarget && value.sections.outputValue === minusTarget });
  actions.push(action("horizontal-range-return", minus?.changed === true && after.sections.rangeValue === minusTarget && after.sections.outputValue === minusTarget, { minus, target: minusTarget, after: after.sections.rangeValue, output: after.sections.outputValue }));
  const section = await click(cdp, ".sectionLayoutSwitch button", "断面のみ");
  after = await waitForCoreInteractionStable(cdp, state, { expectedHash: "#workspace/sections/horizontal", expectedCanvas: 1, minCanvas: 1, predicate: value => value.sections.layoutText === "断面のみ" && value.sections.layoutPressed });
  actions.push(action("section-layout-toggle", section?.clicked === true && after.sections.layoutText === "断面のみ" && after.canvasCount === 1, { section, canvasCount: after.canvasCount }));
  const model = await click(cdp, ".sectionLayoutSwitch button", "3Dのみ");
  after = await waitForCoreInteractionStable(cdp, state, { expectedHash: "#workspace/sections/horizontal", expectedCanvas: 2, minCanvas: 1, predicate: value => value.sections.layoutText === "3Dのみ" && value.sections.layoutPressed });
  actions.push(action("section-layout-3d", model?.clicked === true && after.sections.layoutText === "3Dのみ" && after.canvasCount === 2, { model, canvasCount: after.canvasCount }));
  const both = await click(cdp, ".sectionLayoutSwitch button", "断面＋3D");
  after = await waitForCoreInteractionStable(cdp, state, { expectedHash: "#workspace/sections/horizontal", expectedCanvas: 3, minCanvas: 1, predicate: value => value.sections.layoutText === "断面＋3D" && value.sections.layoutPressed });
  actions.push(action("section-layout-both", both?.clicked === true && after.sections.layoutText === "断面＋3D" && after.canvasCount === 3, { both, canvasCount: after.canvasCount }));
  return { probe: initial, finalProbe: after, actions, destination: { hash: "#workspace/sections/horizontal", canvas: 3 } };
}

async function surfaceFreeJourney(cdp, state) {
  const actions = [];
  const initial = await waitForCoreInteractionStable(cdp, state, { expectedHash: "#workspace/surface/free", expectedCanvas: 1, minCanvas: 1 });
  const preset = await click(cdp, ".pathwayPresets nav button");
  let after = await waitForCoreInteractionStable(cdp, state, { expectedHash: "#workspace/surface/free", expectedCanvas: 1, minCanvas: 1, predicate: value => value.free.pathwayPressed && value.free.selectedCount > 0 });
  actions.push(action("pathway-preset", preset?.clicked === true && after.free.pathwayPressed && after.free.selectedCount > 0, { preset, selectedCount: after.free.selectedCount }));
  const selected = await evaluate(cdp, `(() => { const select = document.querySelector(".freeStructureIndex select"); const option = [...(select?.options || [])].find(candidate => candidate.value); if (!select || !option) return { changed: false, reason: "structure-option-missing" }; const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set; if (!setter) return { changed: false, reason: "select-setter-missing" }; setter.call(select, option.value); select.dispatchEvent(new Event("change", { bubbles: true })); return { changed: true, value: option.value, label: option.textContent }; })()`);
  const previousSelected = after.free.selectedCount;
  after = await waitForCoreInteractionStable(cdp, state, { expectedHash: "#workspace/surface/free", expectedCanvas: 1, minCanvas: 1, predicate: value => value.free.selectedCount > previousSelected });
  actions.push(action("select-structure", selected?.changed === true && after.free.selectedCount > previousSelected, { selected, before: previousSelected, after: after.free.selectedCount }));
  const clear = await click(cdp, ".freeExplorer > header button", "すべて解除");
  after = await waitForCoreInteractionStable(cdp, state, { expectedHash: "#workspace/surface/free", expectedCanvas: 1, minCanvas: 1, predicate: value => !value.free.pathwayPressed && value.free.selectedCount === 0 });
  actions.push(action("clear-selection", clear?.clicked === true && !after.free.pathwayPressed && after.free.selectedCount === 0, { clear, selectedCount: after.free.selectedCount, pathwayPressed: after.free.pathwayPressed }));
  const initialRotation = initial.rotation;
  const resetRotation = { x: -8, y: -28, z: 0 };
  const rotate = await evaluate(cdp, `(() => { const stage = document.querySelector(".learningModelStage"); if (!stage) return { dispatched: false }; stage.focus(); stage.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })); return { dispatched: true }; })()`);
  after = await waitForCoreInteractionStable(cdp, state, { expectedHash: "#workspace/surface/free", expectedCanvas: 1, minCanvas: 1, predicate: value => rotationChanged(initialRotation, value.rotation) });
  actions.push(action("rotate", rotate?.dispatched === true && rotationChanged(initialRotation, after.rotation), { rotate, rotation: after.rotation }));
  const reset = await click(cdp, ".learningModelCard .panelActions button", "向きを戻す");
  after = await waitForCoreInteractionStable(cdp, state, { expectedHash: "#workspace/surface/free", expectedCanvas: 1, minCanvas: 1, predicate: value => sameRotation(resetRotation, value.rotation) });
  actions.push(action("reset-orientation", reset?.clicked === true && sameRotation(resetRotation, after.rotation), { reset, rotation: after.rotation }));
  return { probe: initial, finalProbe: after, actions, destination: { hash: "#workspace/surface/free", canvas: 1 } };
}

function quizSnapshot(probe) {
  const quiz = probe?.quiz || {};
  return {
    queueLength: quiz.queueLength ?? null,
    questionIndex: quiz.questionIndex ?? null,
    questionSignature: quiz.questionSignature ?? null,
    questionPrompt: quiz.questionPrompt ?? null,
    targetKey: quiz.targetKey ?? null,
    targetPlane: quiz.targetPlane ?? null,
    targetPosition: quiz.targetPosition ?? null,
    targetView: quiz.targetView ?? null,
    format: quiz.format ?? null,
    provisionalIncluded: quiz.provisionalIncluded ?? null,
  };
}

function expectedQuizReviewDestination(snapshot) {
  if (!snapshot?.targetKey) return null;
  if (snapshot.targetPlane) {
    return {
      family: "sections",
      hash: `#workspace/sections/${snapshot.targetPlane}`,
      plane: snapshot.targetPlane,
      view: null,
      position: snapshot.targetPosition,
      targetKey: snapshot.targetKey,
    };
  }
  if (snapshot.targetView) {
    const hashView = snapshot.targetView === "cranialNerves" ? "nerves" : snapshot.targetView;
    return {
      family: "surface",
      hash: `#workspace/surface/${hashView}`,
      plane: null,
      view: snapshot.targetView,
      position: null,
      targetKey: snapshot.targetKey,
    };
  }
  return null;
}

function observedQuizReviewDestination(probe) {
  return {
    family: probe?.destination?.family ?? null,
    hash: probe?.hash ?? null,
    plane: probe?.destination?.plane ?? null,
    view: probe?.destination?.view ?? null,
    position: probe?.destination?.position ?? null,
    selectedStructureKeys: Array.isArray(probe?.destination?.selectedStructureKeys) ? [...probe.destination.selectedStructureKeys] : [],
    selectedSurfaceRegionKeys: Array.isArray(probe?.destination?.selectedSurfaceRegionKeys) ? [...probe.destination.selectedSurfaceRegionKeys] : [],
  };
}

async function quizJourney(cdp, state) {
  const actions = [];
  const initialProbe = await waitForCoreInteractionStable(cdp, state, { expectedHash: "#workspace/quiz", expectedCanvas: 1, minCanvas: 1 });
  const setupBefore = quizSnapshot(initialProbe);
  const configured = await evaluate(cdp, `(() => {
    const provisional = document.querySelector(".provisionalQuizToggle input");
    if (provisional?.checked) provisional.click();
    const selects = [...document.querySelectorAll(".quizSetup select")];
    const format = selects[1];
    const option = [...(format?.options || [])].find(candidate => candidate.value === "section");
    const setter = format ? Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set : null;
    if (format && option && setter) { setter.call(format, "section"); format.dispatchEvent(new Event("change", { bubbles: true })); }
    const count = [...document.querySelectorAll(".quizCountButtons button")].find(button => (button.textContent || "").includes("5"));
    count?.click();
    return { provisionalUnchecked: provisional ? provisional.checked === false : false, format: format?.value || null, formatChanged: Boolean(format && option && setter), countClicked: Boolean(count) };
  })()`);
  const setupProbe = await waitForCoreInteractionStable(cdp, state, { expectedHash: "#workspace/quiz", expectedCanvas: 1, minCanvas: 1, predicate: value => value.quiz.provisionalIncluded === false && value.quiz.format === "section" && /標準\s+[1-9]/.test(value.quiz.standardCandidateText) });
  const setupAfter = quizSnapshot(setupProbe);
  actions.push(action("configure-standard", configured?.provisionalUnchecked === true && configured?.format === "section" && setupAfter.provisionalIncluded === false, { configured, setupBefore, setupAfter, standardCandidateText: setupProbe.quiz.standardCandidateText }));
  const started = await click(cdp, ".quizStart");
  let after = await waitForCoreInteractionStable(cdp, state, { expectedHash: "#workspace/quiz", expectedCanvas: 1, minCanvas: 1, predicate: value => value.quiz.optionCount > 1 && value.quiz.enabledOptionCount > 1 });
  const startedSnapshot = quizSnapshot(after);
  const queueChanged = setupAfter.queueLength !== startedSnapshot.queueLength
    || setupAfter.questionIndex !== startedSnapshot.questionIndex
    || setupAfter.questionSignature !== startedSnapshot.questionSignature;
  const generationObserved = startedSnapshot.queueLength === 5 && startedSnapshot.questionIndex === 0 && queueChanged;
  actions.push(action("start-quiz", started?.clicked === true && generationObserved, { started, requestedCount: 5, setupBefore, setupAfter, after: startedSnapshot, queueChanged, generationObserved }));

  let answerDetails = null;
  let review = null;
  for (let attempt = 0; attempt < 6 && !review; attempt += 1) {
    const questionBeforeAnswer = quizSnapshot(after);
    const expectedReview = expectedQuizReviewDestination(questionBeforeAnswer);
    const answered = await evaluate(cdp, `(() => { const buttons = [...document.querySelectorAll(".quizOptions > button")].filter(button => !button.disabled); if (!buttons.length) return { clicked: false, reason: "answer-missing" }; const button = buttons[${attempt} % buttons.length]; button.click(); return { clicked: true, label: (button.textContent || "").replace(/\\s+/g, " ").trim() }; })()`);
    after = await waitForCoreInteractionStable(cdp, state, { expectedHash: "#workspace/quiz", expectedCanvas: 1, minCanvas: 1, predicate: value => value.quiz.feedbackVisible });
    answerDetails = { answered, feedbackVisible: after.quiz.feedbackVisible, attempt, questionBeforeAnswer, expectedReview };
    if (after.quiz.reviewAvailable) {
      actions.push(action("answer", answered?.clicked === true, answerDetails));
      const clickedReview = await click(cdp, ".quizFeedback .reviewTarget");
      const destinationProbe = await waitForCoreInteractionStable(cdp, state, { expectedHash: null, minCanvas: 1, predicate: value => /^#workspace\/(sections|surface)\//.test(value.hash) && value.canvasCount > 0 });
      const observedReview = observedQuizReviewDestination(destinationProbe);
      review = { clickedReview, probe: destinationProbe, expectedReview, observedReview };
      break;
    }
    const next = await click(cdp, ".quizFeedback .quizNextPrimary");
    if (!next?.clicked) break;
    await waitForCoreInteractionStable(cdp, state, { expectedHash: "#workspace/quiz", expectedCanvas: 1, minCanvas: 1, predicate: value => value.quiz.optionCount > 1 && !value.quiz.feedbackVisible });
  }
  if (!answerDetails) actions.push(action("answer", false, { reason: "answer-not-attempted" }));
  else if (!actions.some(item => item.name === "answer")) actions.push(action("answer", false, answerDetails));
  actions.push(action("feedback", Boolean(answerDetails?.feedbackVisible), { feedbackVisible: Boolean(answerDetails?.feedbackVisible), attempt: answerDetails?.attempt ?? null }));
  actions.push(action("review-link", Boolean(review?.clickedReview?.clicked), { review: review?.clickedReview || null, expectedReview: review?.expectedReview || null, observedReview: review?.observedReview || null }));
  const destination = review?.probe
    ? { hash: review.probe.hash, minCanvas: 1, identityText: review.probe.identityText, expectedReview: review.expectedReview, observedReview: review.observedReview }
    : { hash: null, minCanvas: 1, expectedReview: answerDetails?.expectedReview || null, observedReview: null };
  return { probe: setupProbe, finalProbe: review?.probe || after, actions, destination };
}

async function runJourney(cdp, state, journey, viewport) {
  if (journey.id === "surface-lateral") return surfaceLateralJourney(cdp, state, viewport);
  if (journey.id === "sections-horizontal") return sectionsHorizontalJourney(cdp, state, viewport);
  if (journey.id === "surface-free") return surfaceFreeJourney(cdp, state);
  if (journey.id === "quiz") return quizJourney(cdp, state);
  throw new Error(`unknown core journey: ${journey.id}`);
}

function browserInfo(session) {
  return { executable: session?.executable || null, product: session?.version?.Browser || null, userAgent: session?.version?.["User-Agent"] || null };
}

export async function collectCoreInteractionCheck(cdp, state, { baseUrl, entry, journey, viewport, browser = null, emulation = CORE_INTERACTION_EMULATION_POLICY, dependencies = {} } = {}) {
  const navigateFn = dependencies.navigate || navigate;
  const waitForDocumentReadyFn = dependencies.waitForDocumentReady || waitForDocumentReady;
  const runJourneyFn = dependencies.runJourney || runJourney;
  const actions = [];
  let probe = null;
  let finalProbe = null;
  let destination = null;
  let error = null;
  let journeyActions = [];
  let journeyDestination = null;
  try {
    await navigateFn(cdp, "about:blank");
    await waitForDocumentReadyFn(cdp);
    resetMeasurementState(state, { collecting: true });
    await navigateFn(cdp, resolveRoute(baseUrl, journey.hash));
    await waitForDocumentReadyFn(cdp);
    const journeyResult = await runJourneyFn(cdp, state, journey, viewport);
    ({ probe, finalProbe, actions: journeyActions = [], destination: journeyDestination = null } = journeyResult || {});
    actions.push(...journeyActions);
    destination = journeyDestination;
  } catch (caught) {
    error = caught instanceof Error ? caught.message : String(caught);
    if (caught?.probe) probe = caught.probe;
    actions.push(action("runtime", false, { error }));
  } finally {
    state.collecting = false;
  }
  const validation = validateCoreInteractionCheck({ journey, viewport, probe, finalProbe, destination, actions, consoleErrors: state.consoleErrors, requestErrors: state.requestErrors, error });
  return {
    ...entry,
    journey,
    viewport,
    baseUrl,
    browser,
    emulation: { ...emulation },
    probe,
    finalProbe,
    destination,
    actions,
    consoleErrors: [...state.consoleErrors],
    requestErrors: [...state.requestErrors],
    error,
    validation,
    passed: validation.passed,
  };
}

function failedCoreCheck(entry, journey, viewport, error, browser = null, emulation = CORE_INTERACTION_EMULATION_POLICY, baseUrl = null) {
  const message = error instanceof Error ? error.message : String(error);
  const validation = validateCoreInteractionCheck({ journey, viewport, error: message, actions: [] });
  return { ...entry, journey, viewport, baseUrl, browser, emulation: { ...emulation }, probe: null, finalProbe: null, destination: null, actions: [], consoleErrors: [], requestErrors: [], error: message, validation, passed: false };
}

function auditEnvironment() {
  return { os: { platform: platform(), release: release(), version: version(), arch: arch() }, cpuCount: cpus().length, memoryBytes: { total: totalmem(), free: freemem() }, nodeVersion: process.version };
}

function isIsoTimestamp(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return false;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString() === value;
}

function isLoopbackBaseUrl(value) {
  if (typeof value !== "string") return false;
  let parsed;
  try { parsed = new URL(value); } catch { return false; }
  if (!/^https?:$/.test(parsed.protocol)) return false;
  const host = parsed.hostname.toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]";
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function addReportFailure(failures, code) {
  if (!failures.includes(code)) failures.push(code);
}

function validateProbeSchema(probe, expected, failures, prefix, { destination = false } = {}) {
  if (!probe || typeof probe !== "object" || Array.isArray(probe)) {
    addReportFailure(failures, `${prefix}-missing`);
    return;
  }
  if (probe.readyState !== "complete") addReportFailure(failures, `${prefix}-ready-state`);
  if (typeof probe.hash !== "string") addReportFailure(failures, `${prefix}-hash-type`);
  if (expected.hash !== null && probe.hash !== expected.hash) addReportFailure(failures, `${prefix}-hash`);
  if (typeof probe.appRootPresent !== "boolean") addReportFailure(failures, `${prefix}-app-root-type`);
  if (probe.appRootPresent !== true) addReportFailure(failures, `${prefix}-app-root`);
  if (!isNonEmptyString(probe.identityText)) addReportFailure(failures, `${prefix}-identity-type`);
  if (expected.identityText && probe.identityText !== expected.identityText) addReportFailure(failures, `${prefix}-identity`);
  if (!Number.isSafeInteger(probe.loadingCount) || probe.loadingCount !== 0) addReportFailure(failures, `${prefix}-loading`);
  if (!Array.isArray(probe.uiErrors) || probe.uiErrors.length) addReportFailure(failures, `${prefix}-ui-errors`);
  if (!Number.isSafeInteger(probe.canvasCount) || probe.canvasCount < 0) addReportFailure(failures, `${prefix}-canvas-type`);
  if (expected.canvas !== null && probe.canvasCount !== expected.canvas) addReportFailure(failures, `${prefix}-canvas`);
  if (expected.minCanvas !== null && probe.canvasCount < expected.minCanvas) addReportFailure(failures, `${prefix}-canvas-min`);
  if (probe.webglFallback !== false) addReportFailure(failures, `${prefix}-webgl-fallback`);
  if (!isFiniteNumber(probe.clientWidth) || !isFiniteNumber(probe.clientHeight) || !isFiniteNumber(probe.scrollWidth)) addReportFailure(failures, `${prefix}-dimensions`);
  if (isFiniteNumber(expected.width) && probe.clientWidth !== expected.width) addReportFailure(failures, `${prefix}-viewport-width`);
  if (isFiniteNumber(expected.height) && probe.clientHeight !== expected.height) addReportFailure(failures, `${prefix}-viewport-height`);
  if (probe.horizontalOverflow !== false) addReportFailure(failures, `${prefix}-overflow`);
  if (!probe.rotation || typeof probe.rotation !== "object" || ["x", "y", "z"].some(axis => probe.rotation[axis] !== null && !isFiniteNumber(probe.rotation[axis]))) addReportFailure(failures, `${prefix}-rotation`);
  if (probe.zoom !== null && !isFiniteNumber(probe.zoom)) addReportFailure(failures, `${prefix}-zoom`);
  const surface = probe.surface;
  if (!surface || typeof surface !== "object" || !Number.isSafeInteger(surface.selectedCount) || surface.selectedCount < 0 || !isBoolean(surface.cerebellumPressed)) addReportFailure(failures, `${prefix}-surface`);
  const sections = probe.sections;
  if (!sections || typeof sections !== "object" || !["rangeValue", "rangeMin", "rangeMax", "outputValue"].every(field => sections[field] === null || isFiniteNumber(sections[field])) || typeof sections.layoutText !== "string" || !isBoolean(sections.layoutPressed)) addReportFailure(failures, `${prefix}-sections`);
  const free = probe.free;
  if (!free || typeof free !== "object" || typeof free.pathwayText !== "string" || !isBoolean(free.pathwayPressed) || !Number.isSafeInteger(free.selectedCount)) addReportFailure(failures, `${prefix}-free`);
  const destinationState = probe.destination;
  if (!destinationState || typeof destinationState !== "object" || ![null, "sections", "surface"].includes(destinationState.family) || !Array.isArray(destinationState.selectedStructureKeys) || !Array.isArray(destinationState.selectedSurfaceRegionKeys) || !destinationState.selectedStructureKeys.every(isNonEmptyString) || !destinationState.selectedSurfaceRegionKeys.every(isNonEmptyString)) addReportFailure(failures, `${prefix}-destination`);
  const quiz = probe.quiz;
  if (!quiz || typeof quiz !== "object" || !Number.isSafeInteger(quiz.optionCount) || quiz.optionCount < 0 || !Number.isSafeInteger(quiz.enabledOptionCount) || quiz.enabledOptionCount < 0 || quiz.enabledOptionCount > quiz.optionCount || !isBoolean(quiz.feedbackVisible) || !isBoolean(quiz.reviewAvailable) || (quiz.format !== null && !isNonEmptyString(quiz.format)) || !isBoolean(quiz.provisionalIncluded) || typeof quiz.standardCandidateText !== "string") addReportFailure(failures, `${prefix}-quiz`);
  for (const field of ["questionIndex", "queueLength"]) if (quiz[field] !== null && !Number.isSafeInteger(quiz[field])) addReportFailure(failures, `${prefix}-quiz-${field}`);
  if (quiz.targetPosition !== null && !isFiniteNumber(quiz.targetPosition)) addReportFailure(failures, `${prefix}-quiz-targetPosition`);
  for (const field of ["questionSignature", "questionPrompt", "targetKey", "targetPlane", "targetView"]) if (quiz[field] !== null && !isNonEmptyString(quiz[field])) addReportFailure(failures, `${prefix}-quiz-${field}-type`);
  if (destination && expected.identityText && probe.identityText !== expected.identityText) addReportFailure(failures, `${prefix}-destination-identity`);
}

function validateBrowserIdentity(browser, failures, key) {
  if (!browser || typeof browser !== "object") { addReportFailure(failures, `result-browser-${key}-missing`); return null; }
  if (!isNonEmptyString(browser.executable) || !/(?:chrome|chromium)(?:\.exe)?$/i.test(browser.executable.replace(/[\\/]$/, ""))) addReportFailure(failures, `result-browser-${key}-executable`);
  if (!isNonEmptyString(browser.product) || !/^Chrome\/151(?:\.|$)/.test(browser.product)) addReportFailure(failures, `result-browser-${key}-product`);
  if (!isNonEmptyString(browser.userAgent) || !/(?:HeadlessChrome|Chrome)\/151(?:\.|$)/.test(browser.userAgent)) addReportFailure(failures, `result-browser-${key}-user-agent`);
  return isNonEmptyString(browser.product) && isNonEmptyString(browser.userAgent) ? `${browser.product}\u0000${browser.userAgent}` : null;
}

function validateCoreResultSchema(result, expected, journey, viewport, reportBaseUrl, failures) {
  const key = expected.key;
  if (!result || typeof result !== "object") { addReportFailure(failures, `result-${key}-missing`); return null; }
  if (result.key !== expected.key) addReportFailure(failures, `result-${key}-key`);
  for (const field of ["journeyId", "routeId", "viewportId", "hash"]) if (result[field] !== expected[field]) addReportFailure(failures, `result-${key}-${field}`);
  if (!result.journey || result.journey.id !== journey.id || result.journey.routeId !== journey.routeId || result.journey.hash !== journey.hash || !sameJson(result.journey.identity, journey.identity)) addReportFailure(failures, `result-${key}-journey`);
  if (!result.viewport || result.viewport.id !== viewport.id || result.viewport.width !== viewport.width || result.viewport.height !== viewport.height) addReportFailure(failures, `result-${key}-viewport`);
  if (result.baseUrl !== reportBaseUrl) addReportFailure(failures, `result-${key}-base-url`);
  if (result.emulation?.mobile !== false || result.emulation?.touch !== false || !sameJson(result.emulation, CORE_INTERACTION_EMULATION_POLICY)) addReportFailure(failures, `result-${key}-emulation`);
  const browserIdentity = validateBrowserIdentity(result.browser, failures, key);
  const destination = result.destination;
  if (!destination || typeof destination !== "object" || typeof destination.hash !== "string") addReportFailure(failures, `result-${key}-destination`);
  else if (journey.id !== "quiz") {
    if (destination.hash !== journey.hash) addReportFailure(failures, `result-${key}-destination-hash`);
    if (!Number.isSafeInteger(destination.canvas) || destination.canvas !== journey.canvas[viewport.id]) addReportFailure(failures, `result-${key}-destination-canvas`);
  } else {
    if (!Number.isSafeInteger(destination.minCanvas) || destination.minCanvas < 1) addReportFailure(failures, `result-${key}-destination-canvas`);
    if (!isNonEmptyString(destination.identityText)) addReportFailure(failures, `result-${key}-destination-identity`);
    if (!destination.expectedReview || !destination.observedReview) addReportFailure(failures, `result-${key}-destination-review`);
  }
  const initialExpected = { hash: journey.hash, identityText: journey.identity.text, canvas: journey.canvas[viewport.id], minCanvas: null, width: viewport.width, height: viewport.height };
  validateProbeSchema(result.probe, initialExpected, failures, `result-${key}-probe`);
  const finalExpected = { hash: destination?.hash ?? journey.hash, identityText: destination?.identityText ?? journey.identity.text, canvas: destination?.canvas ?? null, minCanvas: destination?.minCanvas ?? 0, width: viewport.width, height: viewport.height };
  validateProbeSchema(result.finalProbe, finalExpected, failures, `result-${key}-final-probe`, { destination: Boolean(destination?.expectedReview) });
  if (!Array.isArray(result.consoleErrors) || result.consoleErrors.length) addReportFailure(failures, `result-${key}-console-errors`);
  if (!Array.isArray(result.requestErrors) || result.requestErrors.length) addReportFailure(failures, `result-${key}-request-errors`);
  if (result.error !== null) addReportFailure(failures, `result-${key}-error`);
  if (!Array.isArray(result.actions)) addReportFailure(failures, `result-${key}-actions`);
  const recomputed = validateCoreInteractionCheck({ journey, viewport, probe: result.probe, finalProbe: result.finalProbe, destination, actions: result.actions, consoleErrors: result.consoleErrors, requestErrors: result.requestErrors, error: result.error });
  if (!recomputed.passed) for (const failure of recomputed.failures) addReportFailure(failures, `result-${key}-${failure}`);
  if (!result.validation || !sameJson(result.validation, recomputed)) addReportFailure(failures, `result-${key}-validation-recomputed`);
  if (result.passed !== recomputed.passed || result.validation?.passed !== recomputed.passed) addReportFailure(failures, `result-${key}-passed-contradiction`);
  return browserIdentity;
}

/** Independently audit a saved eight-check core-interaction report. */
export function validateCoreInteractionReport(report) {
  const failures = [];
  if (!report || typeof report !== "object") return { passed: false, failures: ["report-missing"] };
  if (report.schemaVersion !== CORE_INTERACTION_SCHEMA_VERSION) addReportFailure(failures, "report-schema-version");
  if (report.tool !== CORE_INTERACTION_TOOL) addReportFailure(failures, "report-tool");
  if (!isIsoTimestamp(report.generatedAt)) addReportFailure(failures, "report-generated-at");
  if (!isLoopbackBaseUrl(report.baseUrl)) addReportFailure(failures, "report-base-url");
  if (!sameJson(report.emulation, CORE_INTERACTION_EMULATION_POLICY)) addReportFailure(failures, "report-emulation");
  const environment = report.environment;
  if (!environment || typeof environment !== "object") addReportFailure(failures, "report-environment");
  else {
    if (environment.os?.platform !== CORE_INTERACTION_EXPECTED_OS) addReportFailure(failures, "report-environment-os");
    if (!/^v24\./.test(String(environment.nodeVersion || ""))) addReportFailure(failures, "report-environment-node");
  }
  const matrix = report.matrix;
  const expectedMatrix = buildCoreInteractionMatrix();
  if (!matrix || typeof matrix !== "object") { addReportFailure(failures, "report-matrix"); return { passed: failures.length === 0, failures }; }
  if (!sameJson(matrix.journeys, CORE_INTERACTION_JOURNEYS.map(journey => ({ ...journey, identity: { ...journey.identity }, canvas: { ...journey.canvas }, actionNames: [...journey.actionNames] })))) addReportFailure(failures, "matrix-journeys");
  if (!sameJson(matrix.viewports, CORE_INTERACTION_VIEWPORTS.map(viewport => ({ ...viewport })))) addReportFailure(failures, "matrix-viewports");
  if (matrix.expectedChecks !== CORE_INTERACTION_EXPECTED_CHECKS) addReportFailure(failures, "matrix-expected-checks");
  if (!Array.isArray(matrix.results) || matrix.results.length !== CORE_INTERACTION_EXPECTED_CHECKS) addReportFailure(failures, "matrix-result-count");
  if (!sameJson(matrix.missingKeys, []) || !sameJson(matrix.duplicateKeys, []) || !sameJson(matrix.unknownKeys, [])) addReportFailure(failures, "matrix-coverage-summary");
  const results = Array.isArray(matrix.results) ? matrix.results : [];
  const actualKeys = results.map(result => result?.key);
  if (!sameJson(actualKeys, expectedMatrix.map(entry => entry.key))) addReportFailure(failures, "matrix-result-keys");
  const browserIdentities = [];
  for (const expected of expectedMatrix) {
    const result = results.find(candidate => candidate?.key === expected.key);
    const journey = CORE_INTERACTION_JOURNEYS.find(candidate => candidate.id === expected.journeyId);
    const viewport = CORE_INTERACTION_VIEWPORTS.find(candidate => candidate.id === expected.viewportId);
    if (!journey || !viewport) { addReportFailure(failures, `matrix-entry-${expected.key}`); continue; }
    const identity = validateCoreResultSchema(result, expected, journey, viewport, report.baseUrl, failures);
    if (identity) browserIdentities.push(identity);
  }
  if (browserIdentities.length !== CORE_INTERACTION_EXPECTED_CHECKS || new Set(browserIdentities).size !== 1) addReportFailure(failures, "result-browser-identity-mismatch");
  const expectedAllPassed = failures.length === 0;
  if (report.allPassed !== expectedAllPassed) addReportFailure(failures, "report-all-passed-contradiction");
  return { passed: failures.length === 0, failures };
}

export async function runCoreInteractionAudit(baseUrl, { journeys = CORE_INTERACTION_JOURNEYS, viewports = CORE_INTERACTION_VIEWPORTS, runCheck = null, onResult = null } = {}) {
  const matrix = buildCoreInteractionMatrix({ journeys, viewports });
  const results = [];
  for (const entry of matrix) {
    const journey = journeys.find(candidate => candidate.id === entry.journeyId);
    const viewport = viewports.find(candidate => candidate.id === entry.viewportId);
    let result;
    if (typeof runCheck === "function") {
      try { result = await runCheck({ baseUrl, entry, journey, viewport, emulation: CORE_INTERACTION_EMULATION_POLICY }); }
      catch (error) { result = failedCoreCheck(entry, journey, viewport, error, null, CORE_INTERACTION_EMULATION_POLICY, baseUrl); }
      result = { ...result, ...entry, journey, viewport };
      results.push(result);
      if (typeof onResult === "function") await onResult(result, entry);
      continue;
    }
    let session = null;
    let detachObservers = () => {};
    const state = createMeasurementState();
    try {
      session = await launchChrome();
      detachObservers = attachObservers(session.cdp, state);
      await configurePage(session.cdp);
      await session.cdp.send("Emulation.setDeviceMetricsOverride", { width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: false });
      await session.cdp.send("Emulation.setTouchEmulationEnabled", { enabled: false });
      await session.cdp.send("Network.setCacheDisabled", { cacheDisabled: false });
      result = await collectCoreInteractionCheck(session.cdp, state, { baseUrl, entry, journey, viewport, browser: browserInfo(session), emulation: CORE_INTERACTION_EMULATION_POLICY });
    } catch (error) {
      result = failedCoreCheck(entry, journey, viewport, error, browserInfo(session), CORE_INTERACTION_EMULATION_POLICY, baseUrl);
    } finally {
      detachObservers();
      await closeChrome(session);
    }
    results.push(result);
    if (typeof onResult === "function") await onResult(result, entry);
  }
  return results;
}

export function aggregateCoreInteractionReport({ baseUrl, journeys = CORE_INTERACTION_JOURNEYS, viewports = CORE_INTERACTION_VIEWPORTS, results = [], generatedAt = new Date().toISOString(), environment = auditEnvironment() } = {}) {
  const matrix = buildCoreInteractionMatrix({ journeys, viewports });
  const expectedKeys = matrix.map(entry => entry.key);
  const expectedSet = new Set(expectedKeys);
  const counts = new Map();
  for (const result of results) counts.set(result?.key, (counts.get(result?.key) || 0) + 1);
  const duplicateKeys = [...counts.entries()].filter(([, count]) => count > 1).map(([key]) => key);
  const missingKeys = expectedKeys.filter(key => !counts.has(key));
  const unknownKeys = [...counts.keys()].filter(key => !expectedSet.has(key));
  const report = {
    schemaVersion: CORE_INTERACTION_SCHEMA_VERSION,
    generatedAt,
    tool: CORE_INTERACTION_TOOL,
    baseUrl,
    environment,
    emulation: { ...CORE_INTERACTION_EMULATION_POLICY },
    matrix: {
      journeys: journeys.map(journey => ({ ...journey, identity: { ...journey.identity }, canvas: { ...journey.canvas }, actionNames: [...journey.actionNames] })),
      viewports: viewports.map(viewport => ({ ...viewport })),
      expectedChecks: matrix.length,
      missingKeys,
      duplicateKeys,
      unknownKeys,
      results,
    },
  };
  // Start optimistic so the independent validator can recompute the final
  // decision from the saved evidence, including the exact matrix contract.
  report.allPassed = true;
  report.allPassed = validateCoreInteractionReport(report).passed;
  return report;
}

function usage() {
  return ["Usage:", "  node scripts/audit_core_interactions.mjs --base-url http://localhost:4173 --output work/browser-audit/core-interactions.json", "", "Required options: --base-url, --output"].join("\n");
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseCoreInteractionArgs(argv);
  if (args.help) { console.log(usage()); return null; }
  const results = await runCoreInteractionAudit(args.baseUrl, { onResult: result => console.log(`${result.key}: ${result.passed ? "passed" : "failed"}`) });
  const report = aggregateCoreInteractionReport({ baseUrl: args.baseUrl, results });
  const outputPath = isAbsolute(args.output) ? args.output : resolve(args.output);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(outputPath);
  if (!report.allPassed) process.exitCode = 1;
  return report;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
}
