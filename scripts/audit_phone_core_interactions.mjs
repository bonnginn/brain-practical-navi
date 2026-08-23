/**
 * Coarse-touch phone interaction audit.
 *
 * The browser is a 390x768 portrait desktop emulation.  Every learner-facing
 * interaction is sent through CDP Input.dispatchTouchEvent; Runtime.evaluate
 * is used only for observation and for reading deterministic DOM geometry.
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
  waitForDocumentReady,
  waitForRuntimeProbe,
} from "./measure_browser_performance.mjs";

export const PHONE_CORE_SCHEMA_VERSION = 1;
export const PHONE_CORE_TOOL = "scripts/audit_phone_core_interactions.mjs";
export const PHONE_CORE_VIEWPORT = Object.freeze({ id: "phone-390", width: 390, height: 768, deviceScaleFactor: 1, mobile: true, touch: true, maxTouchPoints: 5, orientation: "portraitPrimary" });
export const PHONE_CORE_EMULATION = Object.freeze({ mobile: true, touch: true, maxTouchPoints: 5, deviceScaleFactor: 1, orientation: "portraitPrimary" });
export const PHONE_CORE_EXPECTED_NODE_MAJOR = "24";
export const PHONE_CORE_EXPECTED_CHROME_MAJOR = "151";
export const PHONE_CORE_DOCK = Object.freeze([
  Object.freeze({ key: "home", label: "Home", hash: "#workspace/home", canvasCount: 0 }),
  Object.freeze({ key: "surface", label: "脳表", hash: "#workspace/surface/lateral", canvasCount: 1 }),
  Object.freeze({ key: "sections", label: "断面", hash: "#workspace/sections/coronal", canvasCount: 1 }),
  Object.freeze({ key: "blocks", label: "ブロック標本", hash: "#workspace/blocks/lateral-ventricle", canvasCount: 0 }),
  Object.freeze({ key: "quiz", label: "復習", hash: "#workspace/quiz", canvasCount: 1 }),
]);
export const PHONE_CORE_JOURNEY_IDS = Object.freeze(["dock", "surface-lateral", "sections-horizontal", "quiz"]);
export const PHONE_CORE_ACTION_NAMES = Object.freeze({
  dock: Object.freeze(["dock-destinations"]),
  "surface-lateral": Object.freeze(["settings-open", "settings-select", "settings-close", "select-structure", "touch-drag", "reset-orientation"]),
  "sections-horizontal": Object.freeze(["settings-open", "settings-select", "settings-close", "horizontal-range-step", "section-layout-touch"]),
  quiz: Object.freeze(["settings-open", "quiz-count-5", "quiz-start", "settings-close", "wrong-answer", "review-link"]),
});

const ISO_RE = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);

function nowIso() { return new Date().toISOString(); }
function isIso(value) { return typeof value === "string" && ISO_RE.test(value) && !Number.isNaN(Date.parse(value)); }
function num(value) { return typeof value === "number" && Number.isFinite(value); }
function compact(value) { return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, 400); }
function majorVersion(value) {
  const text = String(value ?? "");
  return text.match(/(?:Chrome|HeadlessChrome|Node)\/(\d+)/i)?.[1] || text.match(/^v?(\d+)/i)?.[1] || null;
}
function time(value) { const parsed = Date.parse(value); return Number.isFinite(parsed) ? parsed : NaN; }
function sameJson(left, right) { return JSON.stringify(left) === JSON.stringify(right); }
function addFailure(failures, message) { failures.push(message); }

export function canonicalPhoneBaseUrl(baseUrl) {
  const parsed = new URL(baseUrl);
  if (!/^https?:$/.test(parsed.protocol)) throw new Error("phone audit base URL must use http or https");
  if (!LOOPBACK_HOSTS.has(parsed.hostname)) throw new Error("phone audit requires a loopback base URL");
  parsed.hash = "";
  parsed.search = "";
  parsed.pathname = parsed.pathname.endsWith("/") ? parsed.pathname : `${parsed.pathname}/`;
  return parsed.href;
}

function argumentValue(argv, index, name) {
  const token = argv[index];
  const prefix = `${name}=`;
  if (token.startsWith(prefix)) return { value: token.slice(prefix.length), nextIndex: index };
  if (index + 1 >= argv.length || argv[index + 1].startsWith("--")) throw new Error(`${name} requires a value`);
  return { value: argv[index + 1], nextIndex: index + 1 };
}

export function parsePhoneCoreArgs(argv) {
  const options = { baseUrl: null, output: null, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--help" || token === "-h") { options.help = true; continue; }
    const name = ["--base-url", "--output"].find(candidate => token === candidate || token.startsWith(`${candidate}=`));
    if (!name) throw new Error(`unknown option: ${token}`);
    const parsed = argumentValue(argv, index, name);
    index = parsed.nextIndex;
    if (name === "--base-url") options.baseUrl = canonicalPhoneBaseUrl(parsed.value);
    else options.output = resolve(parsed.value);
  }
  if (options.help) return options;
  if (!options.baseUrl || !options.output) throw new Error("missing required option(s): --base-url, --output");
  return options;
}

export const PHONE_CORE_PROBE = `(() => {
  const root = document.documentElement;
  const body = document.body;
  const text = element => (element?.textContent || "").replace(/\\s+/g, " ").trim();
  const rect = element => { const value = element?.getBoundingClientRect?.(); return value ? { x: value.x, y: value.y, width: value.width, height: value.height } : null; };
  const stage = document.querySelector(".learningModelStage");
  const stageData = stage?.dataset || {};
  const range = document.querySelector('input[type="range"][aria-label*="上下位置"],input[type="range"][aria-label*="水平断"]');
  const layout = [...document.querySelectorAll(".sectionLayoutSwitch button")].find(button => button.getAttribute("aria-pressed") === "true");
  const quizCard = document.querySelector(".quizQuestionCard");
  const guide = text(document.querySelector(".quizQuestionCard .guideIndex"));
  const queueMatch = /QUESTION\\s+(\\d+)\\s+\\/\\s+(\\d+)/i.exec(guide);
  const quizOptions = [...document.querySelectorAll(".quizOptions > button")];
  const selectedSurface = [...document.querySelectorAll('.surfaceRegionPicker button[data-surface-region-key][aria-pressed="true"]')].map(button => button.dataset.surfaceRegionKey).filter(Boolean);
  const selectedStructures = [...document.querySelectorAll('.leftRail .structureBtn[aria-pressed="true"]')].map(button => button.dataset.structureKey).filter(Boolean);
  const selectedNeurovascular = [...document.querySelectorAll('.neurovascularPicker button[data-neurovascular-key][aria-pressed="true"]')].map(button => button.dataset.neurovascularKey).filter(Boolean);
  const alerts = [...document.querySelectorAll(".atlasLoading.error,.segLoading.error,[role=alert]")].map(element => ({ text: text(element).slice(0, 240), className: typeof element.className === "string" ? element.className : "" }));
  const hashParts = window.location.hash.replace(/^#workspace\\/?/, "").split("/");
  return {
    readyState: document.readyState,
    hash: window.location.hash,
    appRootPresent: Boolean(document.querySelector("main.appShell")),
    phoneMode: Boolean(document.querySelector("main.appShell.phone-mode")),
    clientWidth: root?.clientWidth ?? window.innerWidth,
    clientHeight: root?.clientHeight ?? window.innerHeight,
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    devicePixelRatio: window.devicePixelRatio,
    maxTouchPoints: navigator.maxTouchPoints,
    hoverNone: window.matchMedia("(hover: none)").matches,
    pointerCoarse: window.matchMedia("(pointer: coarse)").matches,
    dock: [...document.querySelectorAll(".phoneDock button")].map(button => ({ key: button.dataset.workspaceKey || null, text: text(button), active: button.classList.contains("active"), current: button.getAttribute("aria-current") || null, rect: rect(button) })),
    activeDockKey: [...document.querySelectorAll(".phoneDock button.active")][0]?.dataset.workspaceKey || null,
    dialogOpen: Boolean(document.querySelector(".phoneSettingsSheet[open]")),
    dialogVisible: Boolean(document.querySelector(".phoneSettingsSheet[open]")) && document.querySelector(".phoneSettingsSheet[open]")?.getClientRects().length > 0,
    dialogFocus: document.activeElement?.closest?.(".phoneSettingsSheet") ? text(document.activeElement).slice(0, 400) : null,
    activeElement: document.activeElement ? { tag: document.activeElement.tagName, className: typeof document.activeElement.className === "string" ? document.activeElement.className : "", ariaLabel: document.activeElement.getAttribute?.("aria-label") || null } : null,
    htmlOverflow: document.documentElement.style.overflow,
    bodyOverflow: document.body.style.overflow,
    loadingCount: document.querySelectorAll(".atlasLoading:not(.error),.segLoading:not(.error)").length,
    uiErrors: alerts,
    canvasCount: document.querySelectorAll("canvas").length,
    webglFallback: Boolean(document.querySelector(".atlasWebglFallback")),
    scrollWidth: Math.max(root?.scrollWidth ?? 0, body?.scrollWidth ?? 0),
    horizontalOverflow: Math.max(root?.scrollWidth ?? 0, body?.scrollWidth ?? 0) > (root?.clientWidth ?? window.innerWidth) + 1,
    pageScrollY: window.scrollY,
    mainText: text(document.querySelector("main")).slice(0, 400),
    rotation: { x: Number(stageData.rotationX), y: Number(stageData.rotationY), z: Number(stageData.rotationZ) },
    selectedSurfaceKeys: selectedSurface,
    selectedStructureKeys: selectedStructures,
    selectedNeurovascularKeys: selectedNeurovascular,
    sections: { rangeValue: range ? Number(range.value) : null, outputValue: text(document.querySelector(".sliceTimeline output")), layoutText: text(layout), layoutPressed: Boolean(layout) },
    quiz: {
      target: quizCard?.dataset.quizTarget || null,
      plane: quizCard?.dataset.quizPlane || null,
      position: quizCard?.dataset.quizPosition ? Number(quizCard.dataset.quizPosition) : null,
      view: quizCard?.dataset.quizView || null,
      queueLength: queueMatch ? Number(queueMatch[2]) : null,
      questionIndex: queueMatch ? Number(queueMatch[1]) - 1 : null,
      questionSignature: [text(quizCard?.querySelector("h2")), ...quizOptions.map(option => (option.dataset.quizOption || "") + ":" + text(option))].join("\\u0001"),
      optionKeys: quizOptions.map(option => option.dataset.quizOption || null),
      enabledOptionKeys: quizOptions.filter(option => !option.disabled).map(option => option.dataset.quizOption || null),
      feedbackClass: document.querySelector(".quizFeedback")?.className || null,
      feedbackText: text(document.querySelector(".quizFeedback")),
      reviewVisible: Boolean(document.querySelector(".quizFeedback .reviewTarget")),
      countFivePressed: Boolean(document.querySelector('.quizCountButtons button[aria-pressed="true"][aria-label^="5問"]')),
    },
    destination: { family: hashParts[0] === "sections" ? "sections" : hashParts[0] === "surface" ? "surface" : null, hash: window.location.hash, plane: hashParts[0] === "sections" ? hashParts[1] || null : null, view: hashParts[0] === "surface" ? (hashParts[1] === "nerves" ? "cranialNerves" : hashParts[1] || null) : null, position: hashParts[0] === "sections" && range ? Number(range.value) : null, selectedSurfaceKeys: selectedSurface, selectedStructureKeys: selectedStructures, selectedNeurovascularKeys: selectedNeurovascular },
  };
})()`;

function phoneProbePass(probe, expectedHash, { minCanvas = 0, allowDialog = null } = {}) {
  if (!probe || probe.readyState !== "complete" || probe.hash !== expectedHash || !probe.appRootPresent || !probe.phoneMode) return false;
  if (probe.clientWidth !== PHONE_CORE_VIEWPORT.width || probe.clientHeight !== PHONE_CORE_VIEWPORT.height || probe.innerWidth !== PHONE_CORE_VIEWPORT.width || probe.innerHeight !== PHONE_CORE_VIEWPORT.height || probe.screenWidth !== PHONE_CORE_VIEWPORT.width || probe.screenHeight !== PHONE_CORE_VIEWPORT.height || probe.devicePixelRatio !== 1 || probe.maxTouchPoints !== 5 || probe.hoverNone !== true || probe.pointerCoarse !== true) return false;
  if (probe.loadingCount !== 0 || probe.uiErrors?.length !== 0 || probe.horizontalOverflow || probe.webglFallback || probe.canvasCount < minCanvas || !probe.mainText) return false;
  if (allowDialog !== null && probe.dialogOpen !== allowDialog) return false;
  if (allowDialog === true && (probe.dialogVisible !== true || !probe.dialogFocus || probe.htmlOverflow !== "hidden" || probe.bodyOverflow !== "hidden")) return false;
  return true;
}

export async function dispatchTouchSequence(cdp, points, { move = false } = {}) {
  const primaryTouchId = points[0]?.id ?? 1;
  const normalized = points.map(point => ({ x: point.x, y: point.y, id: point.id ?? primaryTouchId, radiusX: 1, radiusY: 1, force: 1 }));
  if (normalized.length < 2 && move) throw new Error("touch drag requires start and end points");
  const start = normalized[0];
  const end = normalized.at(-1);
  const sequence = [{ type: "touchStart", touchPoints: [start] }];
  if (move) sequence.push({ type: "touchMove", touchPoints: [end] });
  sequence.push({ type: "touchEnd", touchPoints: [] });
  for (const [index, event] of sequence.entries()) {
    await cdp.send("Input.dispatchTouchEvent", event);
    if (index < sequence.length - 1) await new Promise(resolvePromise => setTimeout(resolvePromise, 60));
  }
  return sequence;
}

export async function inspectTouchTarget(cdp, selector, textIncludes = null, { pointFractionX = 0.5 } = {}) {
  return evaluate(cdp, `(() => {
    const text = element => (element?.textContent || "").replace(/\\s+/g, " ").trim();
    const candidates = [...document.querySelectorAll(${JSON.stringify(selector)})];
    const element = candidates.find(candidate => !candidate.disabled && (!${JSON.stringify(textIncludes)} || text(candidate).includes(${JSON.stringify(textIncludes)})));
    if (!element) return { found: false, selector: ${JSON.stringify(selector)}, textIncludes: ${JSON.stringify(textIncludes)} };
    element.scrollIntoView({ block: "center", inline: "center" });
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    const point = { x: rect.left + rect.width * ${JSON.stringify(pointFractionX)}, y: rect.top + rect.height / 2 };
    const hit = document.elementFromPoint(point.x, point.y);
    const semanticKey = element.dataset.quizOption || element.dataset.workspaceKey || element.dataset.surfaceRegionKey || element.dataset.structureKey || element.querySelector("small")?.textContent?.trim()?.toLowerCase()?.replace(/\s+/g, "-") || null;
    const ariaPressed = element.getAttribute("aria-pressed") || (element.matches(".lessonRailBtn,.planeBtn") ? (element.classList.contains("active") ? "true" : "false") : null);
    return { found: true, selector: ${JSON.stringify(selector)}, textIncludes: ${JSON.stringify(textIncludes)}, text: text(element), dataKey: semanticKey, enabled: !element.disabled && element.getAttribute("aria-disabled") !== "true", visible: Boolean(element.getClientRects().length) && style.display !== "none" && style.visibility !== "hidden", onscreen: rect.left >= 0 && rect.top >= 0 && rect.right <= window.innerWidth && rect.bottom <= window.innerHeight, hitTest: Boolean(hit && (hit === element || element.contains(hit))), scrollPrepared: true, rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }, point, ariaPressed, ariaLabel: element.getAttribute("aria-label"), activeElementBefore: document.activeElement?.className || "" };
  })()`);
}

async function touchTarget(cdp, target, { dragTo = null } = {}) {
  if (!target?.found || !target.visible || !target.enabled || !target.point) throw new Error(`touch target unavailable: ${JSON.stringify(target)}`);
  const primaryTouchId = 1;
  const start = { ...target.point, id: primaryTouchId };
  const end = { ...(dragTo || target.point), id: primaryTouchId };
  const sequence = await dispatchTouchSequence(cdp, [start, end], { move: Boolean(dragTo) });
  return { target, primaryTouchId, sequence, start, end };
}

function pointMatches(left, right) {
  return num(left?.x) && num(left?.y) && num(right?.x) && num(right?.y) && Math.abs(left.x - right.x) <= 0.01 && Math.abs(left.y - right.y) <= 0.01;
}

function rectOnscreen(rect) {
  return num(rect?.x) && num(rect?.y) && num(rect?.width) && num(rect?.height) && rect.width > 0 && rect.height > 0 && rect.x >= 0 && rect.y >= 0 && rect.x + rect.width <= PHONE_CORE_VIEWPORT.width && rect.y + rect.height <= PHONE_CORE_VIEWPORT.height;
}

function touchTargetValid(target, failures, label) {
  if (!target?.found || target.visible !== true || target.enabled !== true || target.onscreen !== true || target.hitTest !== true || target.scrollPrepared !== true) addFailure(failures, `${label}: target is not visible/enabled/on-screen`);
  const recomputedOnscreen = rectOnscreen(target?.rect);
  if (target?.onscreen !== recomputedOnscreen) addFailure(failures, `${label}: onscreen flag does not match the 390x768 rect calculation`);
  if (!target?.rect || ![target.rect.x, target.rect.y, target.rect.width, target.rect.height].every(num) || target.rect.width < 44 || target.rect.height < 44) { addFailure(failures, `${label}: target is smaller than 44x44 or has an invalid rect`); return; }
  const point = target?.point;
  if (!point || ![point.x, point.y].every(num) || point.x < target.rect.x || point.x > target.rect.x + target.rect.width || point.y < target.rect.y || point.y > target.rect.y + target.rect.height || point.x < 0 || point.y < 0 || point.x > PHONE_CORE_VIEWPORT.width || point.y > PHONE_CORE_VIEWPORT.height) addFailure(failures, `${label}: touch point is outside target rect/viewport`);
}

function sequenceValid(sequence, type, failures, label) {
  const types = Array.isArray(sequence) ? sequence.map(item => item?.type) : [];
  const expected = type === "drag" ? ["touchStart", "touchMove", "touchEnd"] : ["touchStart", "touchEnd"];
  const expectedCardinality = type === "drag" ? [1, 1, 0] : [1, 0];
  if (!sameJson(types, expected)) addFailure(failures, `${label}: touch sequence is not ${expected.join("/")}`);
  if (sequence?.some(item => !Array.isArray(item.touchPoints))) addFailure(failures, `${label}: touch points are malformed`);
  if (!sameJson(sequence?.map(item => item?.touchPoints?.length), expectedCardinality)) addFailure(failures, `${label}: touch point cardinality is not ${expectedCardinality.join("/")}`);
}

async function waitPhoneStable(cdp, state, expectedHash, options = {}) {
  const { predicate = () => true, timeoutMs = 30_000, ...probeOptions } = options;
  const probe = await waitForRuntimeProbe(cdp, PHONE_CORE_PROBE, value => phoneProbePass(value, expectedHash, probeOptions) && predicate(value) && state.inFlight.size === 0 && state.consoleErrors.length === 0 && state.requestErrors.length === 0, timeoutMs);
  return { ...probe, consoleErrors: [...state.consoleErrors], requestErrors: [...state.requestErrors] };
}

async function tap(cdp, selector, textIncludes = null) {
  const target = await inspectTouchTarget(cdp, selector, textIncludes);
  return touchTarget(cdp, target);
}

async function navigatePhoneRoute(cdp, baseUrl, hash) {
  await navigate(cdp, `${baseUrl}${hash}`);
  await waitForDocumentReady(cdp);
}

function routeHashFromProbe(probe) { return probe?.hash || ""; }
function expectedReviewFromQuestion(question) {
  if (question?.plane) return { family: "sections", hash: `#workspace/sections/${question.plane}`, plane: question.plane, position: question.position, target: question.target };
  if (question?.view) return { family: "surface", hash: `#workspace/surface/${question.view === "cranialNerves" ? "nerves" : question.view}`, view: question.view, target: question.target };
  return null;
}

function baseEnvironment(session) {
  return { os: { platform: platform(), release: release(), version: version(), arch: arch() }, cpuCount: cpus().length, memoryBytes: { total: totalmem(), free: freemem() }, nodeVersion: process.version, browser: { executable: session?.executable || null, product: session?.version?.Browser || null, userAgent: session?.version?.["User-Agent"] || null } };
}

function interaction(name, details) { return { name, details: details && typeof details === "object" ? details : { value: details } }; }

async function dockJourney(cdp, state, baseUrl) {
  await navigatePhoneRoute(cdp, baseUrl, PHONE_CORE_DOCK[0].hash);
  let probe = await waitPhoneStable(cdp, state, PHONE_CORE_DOCK[0].hash, { minCanvas: 0 });
  const initialProbe = probe;
  const destinations = [];
  for (const destination of PHONE_CORE_DOCK) {
    const target = await inspectTouchTarget(cdp, ".phoneDock button", destination.label);
    const touch = await touchTarget(cdp, target);
    probe = await waitPhoneStable(cdp, state, destination.hash, { minCanvas: destination.canvasCount, predicate: value => value.canvasCount === destination.canvasCount });
    destinations.push({ key: destination.key, label: destination.label, expectedHash: destination.hash, target, touch, afterProbe: probe });
  }
  return { id: "dock", route: PHONE_CORE_DOCK[0].hash, initialProbe, finalProbe: probe, actions: [interaction("dock-destinations", { destinations })] };
}

async function surfaceJourney(cdp, state, baseUrl) {
  await navigatePhoneRoute(cdp, baseUrl, "#workspace/surface/medial");
  let probe = await waitPhoneStable(cdp, state, "#workspace/surface/medial", { minCanvas: 1 });
  const initialProbe = probe;
  const actions = [];
  const open = await tap(cdp, ".phoneRailToggle", null);
  probe = await waitPhoneStable(cdp, state, "#workspace/surface/medial", { minCanvas: 1, allowDialog: true });
  actions.push(interaction("settings-open", { target: open.target, touch: open, afterProbe: probe }));
  const select = await tap(cdp, ".phoneSettingsSheet .lessonRailBtn", "左外側面");
  probe = await waitPhoneStable(cdp, state, "#workspace/surface/lateral", { minCanvas: 1, allowDialog: true });
  actions.push(interaction("settings-select", { target: select.target, touch: select, selectedLabel: select.target.text, afterProbe: probe }));
  const focusBeforeClose = probe.activeElement;
  const close = await tap(cdp, ".phoneSettingsClose");
  probe = await waitPhoneStable(cdp, state, "#workspace/surface/lateral", { minCanvas: 1, allowDialog: false, predicate: value => value.activeElement?.ariaLabel === "現在の教材の設定を表示" });
  actions.push(interaction("settings-close", { target: close.target, touch: close, focusBeforeClose, focusAfterClose: probe.activeElement, focusReturned: probe.activeElement?.ariaLabel === "現在の教材の設定を表示", afterProbe: probe }));
  const selected = await tap(cdp, '.surfaceRegionPicker button[data-surface-region-key][aria-pressed="false"]');
  probe = await waitPhoneStable(cdp, state, "#workspace/surface/lateral", { minCanvas: 1, predicate: value => value.selectedSurfaceKeys.length > 0 });
  actions.push(interaction("select-structure", { target: selected.target, touch: selected, selectedKeys: probe.selectedSurfaceKeys, afterProbe: probe }));
  const stageTarget = await inspectTouchTarget(cdp, ".learningModelStage");
  const beforeDrag = probe.rotation;
  const dx = 20;
  const dy = 12;
  const drag = await touchTarget(cdp, stageTarget, { dragTo: { x: stageTarget.point.x + dx, y: stageTarget.point.y + dy } });
  probe = await waitPhoneStable(cdp, state, "#workspace/surface/lateral", { minCanvas: 1, predicate: value => Number.isFinite(value.rotation.x) && Number.isFinite(value.rotation.y) && (Math.abs(value.rotation.x - beforeDrag.x) > 0.1 || Math.abs(value.rotation.y - beforeDrag.y) > 0.1) });
  actions.push(interaction("touch-drag", { target: stageTarget, touch: drag, beforeRotation: beforeDrag, afterRotation: probe.rotation, pointerDelta: { dx, dy }, expectedDelta: { x: -dy * 0.42, y: dx * 0.42 }, afterProbe: probe }));
  const reset = await tap(cdp, ".learningModelCard .panelActions button", "向きを戻す");
  probe = await waitPhoneStable(cdp, state, "#workspace/surface/lateral", { minCanvas: 1, predicate: value => Math.abs(value.rotation.x) < 0.01 && Math.abs(value.rotation.y + 90) < 0.01 && Math.abs(value.rotation.z) < 0.01 });
  actions.push(interaction("reset-orientation", { target: reset.target, touch: reset, expectedRotation: { x: 0, y: -90, z: 0 }, afterProbe: probe }));
  return { id: "surface-lateral", route: "#workspace/surface/lateral", initialProbe, finalProbe: probe, actions };
}

async function sectionsJourney(cdp, state, baseUrl) {
  await navigatePhoneRoute(cdp, baseUrl, "#workspace/sections/sagittal");
  let probe = await waitPhoneStable(cdp, state, "#workspace/sections/sagittal", { minCanvas: 1 });
  const initialProbe = probe;
  const actions = [];
  const open = await tap(cdp, ".phoneRailToggle");
  probe = await waitPhoneStable(cdp, state, "#workspace/sections/sagittal", { minCanvas: 1, allowDialog: true });
  actions.push(interaction("settings-open", { target: open.target, touch: open, afterProbe: probe }));
  const select = await tap(cdp, ".phoneSettingsSheet .planeBtn", "水平断");
  probe = await waitPhoneStable(cdp, state, "#workspace/sections/horizontal", { minCanvas: 1, allowDialog: true });
  actions.push(interaction("settings-select", { target: select.target, touch: select, selectedLabel: select.target.text, afterProbe: probe }));
  const close = await tap(cdp, ".phoneSettingsClose");
  probe = await waitPhoneStable(cdp, state, "#workspace/sections/horizontal", { minCanvas: 1, allowDialog: false, predicate: value => value.activeElement?.ariaLabel === "現在の教材の設定を表示" });
  actions.push(interaction("settings-close", { target: close.target, touch: close, focusAfterClose: probe.activeElement, focusReturned: probe.activeElement?.ariaLabel === "現在の教材の設定を表示", afterProbe: probe }));
  const rangeTarget = await inspectTouchTarget(cdp, '.rangeWrap input[type="range"]', null, { pointFractionX: 0.53 });
  probe = await waitPhoneStable(cdp, state, "#workspace/sections/horizontal", { minCanvas: 1 });
  const beforeProbe = probe;
  const beforeRange = probe.sections.rangeValue;
  const beforeOutput = probe.sections.outputValue;
  const beforeScroll = probe.pageScrollY;
  const rangeTouch = await touchTarget(cdp, rangeTarget);
  probe = await waitPhoneStable(cdp, state, "#workspace/sections/horizontal", { minCanvas: 1, predicate: value => value.sections.rangeValue === 53 && String(value.sections.outputValue) === "53" });
  actions.push(interaction("horizontal-range-step", { target: rangeTarget, touch: rangeTouch, beforeProbe, before: beforeRange, beforeOutput, after: probe.sections.rangeValue, output: probe.sections.outputValue, pageScrollBefore: beforeScroll, pageScrollAfter: probe.pageScrollY, afterProbe: probe }));
  const layoutModel = await tap(cdp, ".sectionLayoutSwitch button", "3Dのみ");
  probe = await waitPhoneStable(cdp, state, "#workspace/sections/horizontal", { minCanvas: 1, predicate: value => value.sections.layoutText === "3Dのみ" });
  const layoutSlice = await tap(cdp, ".sectionLayoutSwitch button", "断面のみ");
  const finalProbe = await waitPhoneStable(cdp, state, "#workspace/sections/horizontal", { minCanvas: 1, predicate: value => value.sections.layoutText === "断面のみ" });
  actions.push(interaction("section-layout-touch", { transitions: [{ target: layoutModel.target, touch: layoutModel, afterProbe: probe }, { target: layoutSlice.target, touch: layoutSlice, afterProbe: finalProbe }], finalLayout: finalProbe.sections.layoutText, afterProbe: finalProbe }));
  return { id: "sections-horizontal", route: "#workspace/sections/horizontal", initialProbe, finalProbe, actions };
}

async function quizJourney(cdp, state, baseUrl) {
  await navigatePhoneRoute(cdp, baseUrl, "#workspace/quiz");
  let probe = await waitPhoneStable(cdp, state, "#workspace/quiz", { minCanvas: 1 });
  const initialProbe = probe;
  const actions = [];
  const open = await tap(cdp, ".phoneRailToggle");
  probe = await waitPhoneStable(cdp, state, "#workspace/quiz", { minCanvas: 1, allowDialog: true });
  actions.push(interaction("settings-open", { target: open.target, touch: open, afterProbe: probe }));
  const count = await tap(cdp, '.quizCountButtons button[aria-label^="5問"]');
  probe = await waitPhoneStable(cdp, state, "#workspace/quiz", { minCanvas: 1, allowDialog: true, predicate: value => value.quiz.countFivePressed });
  actions.push(interaction("quiz-count-5", { target: count.target, touch: count, beforeQueueLength: actions[0].details.afterProbe.quiz.queueLength, afterProbe: probe, selected: probe.quiz.countFivePressed }));
  const beforeStart = probe.quiz;
  const start = await tap(cdp, ".quizStart");
  probe = await waitPhoneStable(cdp, state, "#workspace/quiz", { minCanvas: 1, allowDialog: true, predicate: value => value.quiz.queueLength === 5 && value.quiz.questionSignature !== beforeStart.questionSignature });
  actions.push(interaction("quiz-start", { target: start.target, touch: start, before: beforeStart, after: probe.quiz, queueCreated: probe.quiz.queueLength === 5, signatureChanged: probe.quiz.questionSignature !== beforeStart.questionSignature, afterProbe: probe }));
  const close = await tap(cdp, ".phoneSettingsClose");
  probe = await waitPhoneStable(cdp, state, "#workspace/quiz", { minCanvas: 1, allowDialog: false, predicate: value => value.activeElement?.ariaLabel === "現在の教材の設定を表示" });
  actions.push(interaction("settings-close", { target: close.target, touch: close, focusAfterClose: probe.activeElement, focusReturned: probe.activeElement?.ariaLabel === "現在の教材の設定を表示", afterProbe: probe }));
  const questionBeforeAnswer = { ...probe.quiz };
  const wrongTarget = await inspectTouchTarget(cdp, `button[data-quiz-option]:not([data-quiz-option="${questionBeforeAnswer.target}"])`);
  const wrongTouch = await touchTarget(cdp, wrongTarget);
  probe = await waitPhoneStable(cdp, state, "#workspace/quiz", { minCanvas: 1, predicate: value => value.quiz.feedbackClass?.includes("wrong") === true && value.quiz.reviewVisible });
  actions.push(interaction("wrong-answer", { target: wrongTarget, touch: wrongTouch, questionBeforeAnswer, selectedOption: wrongTarget.dataKey, attempts: 1, feedbackClass: probe.quiz.feedbackClass, feedbackText: probe.quiz.feedbackText, afterProbe: probe }));
  const expectedReview = expectedReviewFromQuestion(questionBeforeAnswer);
  const review = await tap(cdp, ".quizFeedback .reviewTarget");
  probe = await waitPhoneStable(cdp, state, expectedReview?.hash || "#workspace/quiz", { minCanvas: 1 });
  const observedReview = { family: probe.destination.family, hash: probe.hash, plane: probe.destination.plane, view: probe.destination.view, position: probe.destination.position, selectedSurfaceKeys: probe.destination.selectedSurfaceKeys, selectedStructureKeys: probe.destination.selectedStructureKeys, selectedNeurovascularKeys: probe.destination.selectedNeurovascularKeys };
  actions.push(interaction("review-link", { target: review.target, touch: review, questionBeforeAnswer, expectedReview, observedReview, afterProbe: probe }));
  return { id: "quiz", route: "#workspace/quiz", initialProbe, finalProbe: probe, actions };
}

export async function runPhoneCoreInteractions({ baseUrl, timeoutMs = 30_000 } = {}) {
  const canonicalBase = canonicalPhoneBaseUrl(baseUrl);
  const session = await launchChrome();
  const state = createMeasurementState();
  const detach = attachObservers(session.cdp, state);
  const environment = baseEnvironment(session);
  try {
    await configurePage(session.cdp);
    await session.cdp.send("Emulation.setDeviceMetricsOverride", { width: PHONE_CORE_VIEWPORT.width, height: PHONE_CORE_VIEWPORT.height, deviceScaleFactor: 1, mobile: true, screenOrientation: { type: "portraitPrimary", angle: 0 } });
    await session.cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
    const journeys = [];
    state.collecting = true;
    journeys.push(await dockJourney(session.cdp, state, canonicalBase));
    journeys.push(await surfaceJourney(session.cdp, state, canonicalBase));
    journeys.push(await sectionsJourney(session.cdp, state, canonicalBase));
    journeys.push(await quizJourney(session.cdp, state, canonicalBase));
    const report = { schemaVersion: PHONE_CORE_SCHEMA_VERSION, generatedAt: nowIso(), tool: PHONE_CORE_TOOL, baseUrl: canonicalBase, viewport: { ...PHONE_CORE_VIEWPORT }, emulation: { ...PHONE_CORE_EMULATION }, environment, journeys, allPassed: true };
    const validation = validatePhoneCoreInteractionReport(report);
    report.allPassed = validation.passed;
    report.validation = validation;
    return report;
  } finally {
    state.collecting = false;
    detach();
    await closeChrome(session);
  }
}

function validateCommonProbe(probe, expectedHash, failures, label, { minCanvas = 0, allowDialog = null } = {}) {
  if (!phoneProbePass(probe, expectedHash, { minCanvas, allowDialog })) addFailure(failures, `${label}: common phone probe contract failed`);
  if (!Array.isArray(probe?.consoleErrors) || probe.consoleErrors.length !== 0) addFailure(failures, `${label}: console errors are present or unrecorded`);
  if (!Array.isArray(probe?.requestErrors) || probe.requestErrors.length !== 0) addFailure(failures, `${label}: request errors are present or unrecorded`);
  if (probe?.clientWidth !== PHONE_CORE_VIEWPORT.width || probe?.clientHeight !== PHONE_CORE_VIEWPORT.height || probe?.screenWidth !== PHONE_CORE_VIEWPORT.width || probe?.screenHeight !== PHONE_CORE_VIEWPORT.height || probe?.devicePixelRatio !== 1 || probe?.maxTouchPoints !== 5) addFailure(failures, `${label}: viewport/touch metrics mismatch`);
  const dockLabelsMatch = PHONE_CORE_DOCK.every((item, index) => compact(probe?.dock?.[index]?.text).includes(item.label));
  if (probe?.dock?.length !== PHONE_CORE_DOCK.length || !sameJson(probe?.dock?.map(item => item.key), PHONE_CORE_DOCK.map(item => item.key)) || !dockLabelsMatch) addFailure(failures, `${label}: exact five-destination dock missing`);
  const expectedDockKey = PHONE_CORE_DOCK.find(item => expectedHash.includes(`#workspace/${item.key}`))?.key || null;
  if (expectedDockKey && (probe?.activeDockKey !== expectedDockKey || probe?.dock?.filter(item => item.active).length !== 1)) addFailure(failures, `${label}: active dock does not match route`);
  if (allowDialog === true && (probe?.dialogVisible !== true || !probe?.dialogFocus || probe?.htmlOverflow !== "hidden" || probe?.bodyOverflow !== "hidden")) addFailure(failures, `${label}: dialog focus/scroll lock missing`);
  if (allowDialog === false && probe?.dialogVisible === true) addFailure(failures, `${label}: dialog remains visible`);
}

function validateTargetAndTouch(details, failures, label, type = "tap") {
  touchTargetValid(details?.target, failures, label);
  sequenceValid(details?.touch?.sequence, type, failures, label);
  if (!sameJson(details?.target, details?.touch?.target)) addFailure(failures, `${label}: touch target evidence does not match inspected target`);
  const touch = details?.touch;
  const sequence = touch?.sequence;
  const startEvent = sequence?.[0]?.touchPoints?.[0];
  const moveEvent = type === "drag" ? sequence?.[1]?.touchPoints?.[0] : null;
  const primaryId = touch?.primaryTouchId;
  if (!Number.isInteger(primaryId) || primaryId < 0) addFailure(failures, `${label}: primary touch id is missing`);
  const allContactIds = (sequence || []).flatMap(event => Array.isArray(event?.touchPoints) ? event.touchPoints.map(point => point?.id) : []);
  if (allContactIds.some(id => id !== primaryId) || touch?.start?.id !== primaryId || touch?.end?.id !== primaryId) addFailure(failures, `${label}: touch contact ids are not one consistent primary id`);
  if (!startEvent || startEvent.id !== primaryId || !pointMatches(startEvent, touch?.start) || !pointMatches(startEvent, details?.target?.point)) addFailure(failures, `${label}: touch start does not match target point and primary id`);
  if (type === "drag") {
    if (!moveEvent || moveEvent.id !== primaryId || !pointMatches(moveEvent, touch?.end)) addFailure(failures, `${label}: touch move/end does not preserve the primary id and coordinates`);
    const expectedDelta = { dx: Number(touch?.end?.x) - Number(touch?.start?.x), dy: Number(touch?.end?.y) - Number(touch?.start?.y) };
    if (!num(details?.pointerDelta?.dx) || !num(details?.pointerDelta?.dy) || !sameJson(details.pointerDelta, expectedDelta)) addFailure(failures, `${label}: pointerDelta is not independently derived from touch start/end`);
  } else if (!pointMatches(touch?.start, touch?.end)) addFailure(failures, `${label}: tap start/end coordinates differ`);
}

function validateActionProbe(details, expectedHash, failures, label, options = {}) {
  validateCommonProbe(details?.afterProbe, expectedHash, failures, `${label} probe`, options);
}

function validateSurfaceJourney(journey, failures) {
  const actions = journey.actions || [];
  if (actions.map(action => action.name).join("|") !== PHONE_CORE_ACTION_NAMES["surface-lateral"].join("|")) addFailure(failures, "surface-lateral: action order mismatch");
  validateCommonProbe(journey.initialProbe, "#workspace/surface/medial", failures, "surface initial", { minCanvas: 1 });
  const open = actions[0]?.details; validateTargetAndTouch(open, failures, "surface settings open"); validateActionProbe(open, "#workspace/surface/medial", failures, "surface settings open", { minCanvas: 1, allowDialog: true }); if (open?.afterProbe?.dialogOpen !== true || open.afterProbe.htmlOverflow !== "hidden" || open.afterProbe.bodyOverflow !== "hidden") addFailure(failures, "surface settings open: dialog/scroll lock missing");
  const select = actions[1]?.details; validateTargetAndTouch(select, failures, "surface settings select"); validateActionProbe(select, "#workspace/surface/lateral", failures, "surface settings select", { minCanvas: 1, allowDialog: true }); if (!select?.afterProbe?.dialogOpen || !select.selectedLabel?.includes("左外側面") || open?.afterProbe?.hash === select?.afterProbe?.hash) addFailure(failures, "surface settings select: lateral transition was a no-op or was not observed");
  const close = actions[2]?.details; validateTargetAndTouch(close, failures, "surface settings close"); validateActionProbe(close, "#workspace/surface/lateral", failures, "surface settings close", { minCanvas: 1, allowDialog: false }); if (close?.afterProbe?.dialogOpen !== false || close.focusReturned !== true) addFailure(failures, "surface settings close: focus return missing");
  if (!sameJson(close?.focusAfterClose, close?.afterProbe?.activeElement) || close?.focusReturned !== (close?.afterProbe?.activeElement?.ariaLabel === "現在の教材の設定を表示")) addFailure(failures, "surface settings close: focus summary is not derived from afterProbe");
  const selected = actions[3]?.details; validateTargetAndTouch(selected, failures, "surface structure select"); validateActionProbe(selected, "#workspace/surface/lateral", failures, "surface structure select", { minCanvas: 1 }); if (!selected?.target?.dataKey || selected.target.ariaPressed !== "false" || !sameJson(close?.afterProbe?.selectedSurfaceKeys, []) || !selected?.selectedKeys?.length || !selected.afterProbe.selectedSurfaceKeys?.includes(selected.target.dataKey) || !sameJson(selected.selectedKeys, selected?.afterProbe?.selectedSurfaceKeys)) addFailure(failures, "surface structure selection target/state is missing or not copied from afterProbe");
  const drag = actions[4]?.details; validateTargetAndTouch(drag, failures, "surface touch drag", "drag"); validateActionProbe(drag, "#workspace/surface/lateral", failures, "surface touch drag", { minCanvas: 1 });
  const dx = drag?.pointerDelta?.dx, dy = drag?.pointerDelta?.dy;
  const before = drag?.beforeRotation, after = drag?.afterRotation;
  if (!sameJson(before, selected?.afterProbe?.rotation) || !sameJson(after, drag?.afterProbe?.rotation) || ![dx, dy].every(num) || !before || !after || Math.abs((after.x - before.x) - (-dy * 0.42)) > 0.75 || Math.abs((after.y - before.y) - (dx * 0.42)) > 0.75) addFailure(failures, "surface touch drag: rotation summary is not copied from probes or does not match touch delta");
  const reset = actions[5]?.details; validateTargetAndTouch(reset, failures, "surface reset"); validateActionProbe(reset, "#workspace/surface/lateral", failures, "surface reset", { minCanvas: 1 }); if (!sameJson(reset?.expectedRotation, reset?.afterProbe?.rotation) || !sameJson(reset?.afterProbe?.rotation, { x: 0, y: -90, z: 0 })) addFailure(failures, "surface reset: exact data-rotation reset missing");
  validateCommonProbe(journey.finalProbe, "#workspace/surface/lateral", failures, "surface final", { minCanvas: 1 });
  if (!sameJson(journey.finalProbe, reset?.afterProbe)) addFailure(failures, "surface final: finalProbe is not the reset afterProbe");
}

function validateSectionsJourney(journey, failures) {
  const actions = journey.actions || [];
  if (actions.map(action => action.name).join("|") !== PHONE_CORE_ACTION_NAMES["sections-horizontal"].join("|")) addFailure(failures, "sections-horizontal: action order mismatch");
  validateCommonProbe(journey.initialProbe, "#workspace/sections/sagittal", failures, "sections initial", { minCanvas: 1 });
  validateTargetAndTouch(actions[0]?.details, failures, "sections settings open"); validateActionProbe(actions[0]?.details, "#workspace/sections/sagittal", failures, "sections settings open", { minCanvas: 1, allowDialog: true });
  validateTargetAndTouch(actions[1]?.details, failures, "sections settings select"); validateActionProbe(actions[1]?.details, "#workspace/sections/horizontal", failures, "sections settings select", { minCanvas: 1, allowDialog: true });
  validateTargetAndTouch(actions[2]?.details, failures, "sections settings close"); validateActionProbe(actions[2]?.details, "#workspace/sections/horizontal", failures, "sections settings close", { minCanvas: 1, allowDialog: false });
  if (actions[0]?.details.afterProbe?.dialogOpen !== true || actions[1]?.details.afterProbe?.hash === actions[0]?.details.afterProbe?.hash || actions[2]?.details.afterProbe?.dialogOpen !== false || actions[2]?.details.focusReturned !== true) addFailure(failures, "sections settings dialog/plane transition/focus state mismatch");
  if (!sameJson(actions[2]?.details.focusAfterClose, actions[2]?.details.afterProbe?.activeElement) || actions[2]?.details.focusReturned !== (actions[2]?.details.afterProbe?.activeElement?.ariaLabel === "現在の教材の設定を表示")) addFailure(failures, "sections settings close: focus summary is not derived from afterProbe");
  const range = actions[3]?.details; validateTargetAndTouch(range, failures, "sections range"); validateCommonProbe(range?.beforeProbe, "#workspace/sections/horizontal", failures, "sections range before", { minCanvas: 1 }); validateActionProbe(range, "#workspace/sections/horizontal", failures, "sections range", { minCanvas: 1 }); if (range?.before !== range?.beforeProbe?.sections?.rangeValue || String(range?.beforeOutput) !== String(range?.beforeProbe?.sections?.outputValue) || range?.after !== range?.afterProbe?.sections?.rangeValue || String(range?.output) !== String(range?.afterProbe?.sections?.outputValue) || range?.pageScrollBefore !== range?.beforeProbe?.pageScrollY || range?.pageScrollAfter !== range?.afterProbe?.pageScrollY || range?.before !== 52 || range?.after !== 53 || String(range?.output) !== "53" || range?.pageScrollBefore !== range?.pageScrollAfter) addFailure(failures, "sections range: before/after/output/scroll copies failed");
  const layout = actions[4]?.details; for (const transition of layout?.transitions || []) { validateTargetAndTouch(transition, failures, "sections layout", "tap"); validateActionProbe(transition, "#workspace/sections/horizontal", failures, "sections layout", { minCanvas: 1 }); } if (!sameJson((layout?.transitions || []).map(item => item.afterProbe?.sections?.layoutText), ["3Dのみ", "断面のみ"]) || layout?.finalLayout !== layout?.afterProbe?.sections?.layoutText || !sameJson(layout?.afterProbe, layout?.transitions?.at(-1)?.afterProbe)) addFailure(failures, "sections layout: touch switch states or final copies are incomplete");
  validateCommonProbe(journey.finalProbe, "#workspace/sections/horizontal", failures, "sections final", { minCanvas: 1 });
  if (!sameJson(journey.finalProbe, layout?.afterProbe)) addFailure(failures, "sections final: finalProbe is not the layout afterProbe");
}

function validateQuizJourney(journey, failures) {
  const actions = journey.actions || [];
  if (actions.map(action => action.name).join("|") !== PHONE_CORE_ACTION_NAMES.quiz.join("|")) addFailure(failures, "quiz: action order mismatch");
  validateCommonProbe(journey.initialProbe, "#workspace/quiz", failures, "quiz initial", { minCanvas: 1 });
  validateTargetAndTouch(actions[0]?.details, failures, "quiz settings open"); validateActionProbe(actions[0]?.details, "#workspace/quiz", failures, "quiz settings open", { minCanvas: 1, allowDialog: true });
  const count = actions[1]?.details; validateTargetAndTouch(count, failures, "quiz count 5"); validateActionProbe(count, "#workspace/quiz", failures, "quiz count 5", { minCanvas: 1, allowDialog: true }); if (count?.selected !== true || count?.afterProbe?.quiz?.countFivePressed !== true) addFailure(failures, "quiz count 5 was not observed");
  const start = actions[2]?.details; validateTargetAndTouch(start, failures, "quiz start"); validateActionProbe(start, "#workspace/quiz", failures, "quiz start", { minCanvas: 1, allowDialog: true }); if (!sameJson(start?.before, count?.afterProbe?.quiz) || !sameJson(start?.after, start?.afterProbe?.quiz) || start?.before?.queueLength === start?.after?.queueLength || start?.after?.queueLength !== 5 || start?.signatureChanged !== (start?.before?.questionSignature !== start?.after?.questionSignature) || start?.queueCreated !== (start?.after?.queueLength === 5)) addFailure(failures, "quiz start did not create a new five-question queue or copies are inconsistent");
  validateTargetAndTouch(actions[3]?.details, failures, "quiz settings close"); validateActionProbe(actions[3]?.details, "#workspace/quiz", failures, "quiz settings close", { minCanvas: 1, allowDialog: false }); if (actions[3]?.details.focusReturned !== (actions[3]?.details.afterProbe?.activeElement?.ariaLabel === "現在の教材の設定を表示") || !sameJson(actions[3]?.details.focusAfterClose, actions[3]?.details.afterProbe?.activeElement)) addFailure(failures, "quiz settings close: focus return summary is not derived from afterProbe");
  const wrong = actions[4]?.details; validateTargetAndTouch(wrong, failures, "quiz wrong answer"); validateActionProbe(wrong, "#workspace/quiz", failures, "quiz wrong answer", { minCanvas: 1 }); if (!sameJson(wrong?.questionBeforeAnswer, actions[3]?.details?.afterProbe?.quiz) || wrong?.attempts !== 1 || !wrong?.selectedOption || !wrong?.questionBeforeAnswer?.optionKeys?.includes(wrong.selectedOption) || !wrong.questionBeforeAnswer.enabledOptionKeys?.includes(wrong.selectedOption) || wrong.questionBeforeAnswer.target === wrong.selectedOption || wrong.target?.dataKey !== wrong.selectedOption || wrong?.feedbackClass !== wrong?.afterProbe?.quiz?.feedbackClass || wrong?.feedbackText !== wrong?.afterProbe?.quiz?.feedbackText || wrong?.afterProbe?.quiz?.reviewVisible !== true || !wrong?.feedbackClass?.includes("wrong") || !wrong?.feedbackText) addFailure(failures, "quiz wrong feedback was not bounded/observed or copies are inconsistent");
  const review = actions[5]?.details; validateTargetAndTouch(review, failures, "quiz review link");
  if (!sameJson(review?.questionBeforeAnswer, wrong?.questionBeforeAnswer)) addFailure(failures, "quiz review: questionBeforeAnswer copy differs from wrong-answer evidence");
  const derived = expectedReviewFromQuestion(review?.questionBeforeAnswer);
  if (!derived || !sameJson({ family: derived.family, hash: derived.hash, plane: derived.plane, position: derived.position, view: derived.view, target: derived.target }, { family: review?.expectedReview?.family, hash: review?.expectedReview?.hash, plane: review?.expectedReview?.plane, position: review?.expectedReview?.position, view: review?.expectedReview?.view, target: review?.expectedReview?.target })) addFailure(failures, "quiz review: expected destination is not independently derived from data hooks");
  const neurovascularReview = derived?.family === "surface" && ["arteries", "cranialNerves"].includes(derived.view);
  if (!sameJson(review?.observedReview, review?.afterProbe?.destination) || review?.observedReview?.hash !== derived?.hash || review?.observedReview?.family !== derived?.family || (derived.family === "sections" && (review.observedReview.position !== derived.position || !review.observedReview.selectedStructureKeys?.includes(derived.target))) || (derived.family === "surface" && !(neurovascularReview ? review.observedReview.selectedNeurovascularKeys : review.observedReview.selectedSurfaceKeys)?.includes(derived.target))) addFailure(failures, "quiz review: observed destination does not match the question data hooks or afterProbe copy");
  validateActionProbe(review, derived?.hash || "#workspace/quiz", failures, "quiz review link", { minCanvas: 1 });
  validateCommonProbe(journey.finalProbe, derived?.hash || "#workspace/quiz", failures, "quiz final", { minCanvas: 1 });
  if (!sameJson(journey.finalProbe, review?.afterProbe)) addFailure(failures, "quiz final: finalProbe is not the review afterProbe");
}

export function validatePhoneCoreJourney(journey, failures = []) {
  if (!PHONE_CORE_JOURNEY_IDS.includes(journey?.id)) { addFailure(failures, `unknown phone journey: ${journey?.id}`); return { passed: false, failures }; }
  if (!Array.isArray(journey.actions) || journey.actions.length !== PHONE_CORE_ACTION_NAMES[journey.id].length) addFailure(failures, `${journey.id}: incomplete action list`);
  if (journey.id === "dock") {
    const details = journey.actions?.[0]?.details;
    if (journey.actions?.[0]?.name !== "dock-destinations" || !Array.isArray(details?.destinations) || details.destinations.length !== PHONE_CORE_DOCK.length) addFailure(failures, "dock: exact five destinations are incomplete");
    for (const [index, destination] of (details?.destinations || []).entries()) {
      const expected = PHONE_CORE_DOCK[index];
      if (!destination || destination.key !== expected.key || destination.expectedHash !== expected.hash || destination.afterProbe?.hash !== expected.hash || destination.afterProbe?.activeDockKey !== expected.key || destination.afterProbe?.dock?.filter(item => item.active).length !== 1 || destination.afterProbe?.canvasCount !== expected.canvasCount) addFailure(failures, `dock: destination ${index} identity/canvas mismatch`);
      validateTargetAndTouch(destination, failures, `dock destination ${index}`);
      validateCommonProbe(destination?.afterProbe, expected.hash, failures, `dock destination ${index} probe`, { minCanvas: expected.canvasCount });
    }
    validateCommonProbe(journey.initialProbe, PHONE_CORE_DOCK[0].hash, failures, "dock initial", { minCanvas: PHONE_CORE_DOCK[0].canvasCount });
    validateCommonProbe(journey.finalProbe, PHONE_CORE_DOCK.at(-1).hash, failures, "dock final", { minCanvas: PHONE_CORE_DOCK.at(-1).canvasCount });
  } else if (journey.id === "surface-lateral") validateSurfaceJourney(journey, failures);
  else if (journey.id === "sections-horizontal") validateSectionsJourney(journey, failures);
  else validateQuizJourney(journey, failures);
  return { passed: failures.length === 0, failures };
}

export function validatePhoneCoreInteractionReport(report) {
  const failures = [];
  if (!report || report.schemaVersion !== PHONE_CORE_SCHEMA_VERSION || report.tool !== PHONE_CORE_TOOL) addFailure(failures, "schema/tool mismatch");
  if (!isIso(report?.generatedAt)) addFailure(failures, "generatedAt must be an ISO timestamp");
  let parsedBase = null;
  try { parsedBase = report?.baseUrl ? new URL(report.baseUrl) : null; } catch { /* malformed URLs are reported below */ }
  if (!parsedBase || !/^https?:$/.test(parsedBase.protocol) || !LOOPBACK_HOSTS.has(parsedBase.hostname) || parsedBase.hash || parsedBase.search) addFailure(failures, "base URL must be loopback");
  if (!sameJson(report?.viewport, PHONE_CORE_VIEWPORT) || !sameJson(report?.emulation, PHONE_CORE_EMULATION)) addFailure(failures, "phone emulation policy mismatch");
  if (report?.environment?.os?.platform !== "win32" || majorVersion(report?.environment?.nodeVersion) !== PHONE_CORE_EXPECTED_NODE_MAJOR || majorVersion(report?.environment?.browser?.product) !== PHONE_CORE_EXPECTED_CHROME_MAJOR || !/HeadlessChrome\//i.test(report?.environment?.browser?.userAgent || "")) addFailure(failures, "Windows/Node24/HeadlessChrome151 provenance mismatch");
  if (JSON.stringify(report?.browser || report?.environment?.browser) !== JSON.stringify(report?.environment?.browser)) addFailure(failures, "browser identity mismatch");
  if (!Array.isArray(report?.journeys) || report.journeys.length !== PHONE_CORE_JOURNEY_IDS.length || !sameJson(report.journeys.map(journey => journey.id), PHONE_CORE_JOURNEY_IDS)) addFailure(failures, "journey order/coverage mismatch");
  if (Array.isArray(report?.blockers) && report.blockers.length) addFailure(failures, `reported blockers: ${report.blockers.join(" | ")}`);
  for (const journey of report?.journeys || []) validatePhoneCoreJourney(journey, failures);
  const computed = failures.length === 0;
  if (report?.allPassed !== computed) addFailure(failures, "allPassed is not the independent aggregate");
  return { passed: failures.length === 0, failures };
}

export function usage() { return "Usage: node scripts/audit_phone_core_interactions.mjs --base-url http://127.0.0.1:PORT/ --output FILE"; }

export async function main(argv = process.argv.slice(2)) {
  const options = parsePhoneCoreArgs(argv);
  if (options.help) { console.log(usage()); return null; }
  let report;
  try { report = await runPhoneCoreInteractions(options); }
  catch (error) { report = { schemaVersion: PHONE_CORE_SCHEMA_VERSION, generatedAt: nowIso(), tool: PHONE_CORE_TOOL, baseUrl: options.baseUrl, viewport: { ...PHONE_CORE_VIEWPORT }, emulation: { ...PHONE_CORE_EMULATION }, environment: null, journeys: [], allPassed: false, blockers: [error instanceof Error ? error.message : String(error)] }; }
  await mkdir(dirname(options.output), { recursive: true });
  await writeFile(options.output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (!report.allPassed) process.exitCode = 1;
  return report;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
