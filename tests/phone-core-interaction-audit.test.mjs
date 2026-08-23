import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  PHONE_CORE_ACTION_NAMES,
  PHONE_CORE_DOCK,
  PHONE_CORE_EMULATION,
  PHONE_CORE_JOURNEY_IDS,
  PHONE_CORE_SCHEMA_VERSION,
  PHONE_CORE_TOOL,
  PHONE_CORE_VIEWPORT,
  dispatchTouchSequence,
  validatePhoneCoreInteractionReport,
} from "../scripts/audit_phone_core_interactions.mjs";

const GENERATED_AT = "2026-08-23T00:00:00.000Z";
const BROWSER = {
  executable: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  product: "Chrome/151.0.0.0",
  userAgent: "Mozilla/5.0 HeadlessChrome/151.0.0.0 Safari/537.36",
};

const root = new URL("../", import.meta.url);
const [page, css, runnerSource] = await Promise.all([
  readFile(new URL("app/page.tsx", root), "utf8"),
  readFile(new URL("app/canvas.css", root), "utf8"),
  readFile(new URL("scripts/audit_phone_core_interactions.mjs", root), "utf8"),
]);

function clone(value) { return structuredClone(value); }

test("touch drag keeps one primary contact from start through move", async () => {
  const calls = [];
  const cdp = { send: async (method, params) => calls.push({ method, params }) };
  const sequence = await dispatchTouchSequence(cdp, [{ x: 10, y: 20 }, { x: 35, y: 44 }], { move: true });
  assert.deepEqual(sequence.map(item => item.type), ["touchStart", "touchMove", "touchEnd"]);
  assert.deepEqual(calls.map(call => call.method), Array(3).fill("Input.dispatchTouchEvent"));
  assert.equal(calls[0].params.touchPoints[0].id, 1);
  assert.equal(calls[1].params.touchPoints[0].id, 1);
  assert.deepEqual(calls[2].params.touchPoints, []);
});

function activeDockKeyForHash(hash) {
  return PHONE_CORE_DOCK.find(item => hash.includes(`#workspace/${item.key}`))?.key || "home";
}

function probe(hash, overrides = {}) {
  const activeDockKey = activeDockKeyForHash(hash);
  const defaults = {
    readyState: "complete",
    hash,
    appRootPresent: true,
    phoneMode: true,
    clientWidth: 390,
    clientHeight: 768,
    innerWidth: 390,
    innerHeight: 768,
    screenWidth: 390,
    screenHeight: 768,
    devicePixelRatio: 1,
    maxTouchPoints: 5,
    hoverNone: true,
    pointerCoarse: true,
    dock: PHONE_CORE_DOCK.map(item => ({ key: item.key, text: item.label, active: item.key === activeDockKey, current: item.key === activeDockKey ? "page" : null, rect: { x: 10, y: 700, width: 70, height: 50 } })),
    activeDockKey,
    dialogOpen: false,
    dialogVisible: false,
    dialogFocus: null,
    activeElement: { tag: "BUTTON", className: "", ariaLabel: null },
    htmlOverflow: "",
    bodyOverflow: "",
    loadingCount: 0,
    uiErrors: [],
    consoleErrors: [],
    requestErrors: [],
    canvasCount: 1,
    webglFallback: false,
    scrollWidth: 390,
    horizontalOverflow: false,
    pageScrollY: 100,
    mainText: "脳実習ナビ",
    rotation: { x: 0, y: -90, z: 0 },
    selectedSurfaceKeys: [],
    selectedStructureKeys: [],
    selectedNeurovascularKeys: [],
    sections: { rangeValue: 52, outputValue: "52", layoutText: "断面＋3D", layoutPressed: true },
    quiz: {
      target: "thalamus",
      plane: "horizontal",
      position: 52,
      view: null,
      queueLength: 5,
      questionIndex: 0,
      questionSignature: "question",
      optionKeys: ["thalamus", "caudate", "putamen", "hippocampus"],
      enabledOptionKeys: ["thalamus", "caudate", "putamen", "hippocampus"],
      feedbackClass: null,
      feedbackText: "",
      reviewVisible: false,
      countFivePressed: false,
    },
    destination: { family: hash.includes("/sections/") ? "sections" : hash.includes("/surface/") ? "surface" : null, hash, plane: hash.includes("/sections/") ? (hash.includes("/sagittal") ? "sagittal" : "horizontal") : null, view: hash.includes("/surface/") ? (hash.includes("/medial") ? "medial" : "lateral") : null, position: hash.includes("/sections/") ? 52 : null, selectedSurfaceKeys: [], selectedStructureKeys: [], selectedNeurovascularKeys: [] },
  };
  return { ...defaults, ...overrides };
}

function target(text = "操作", dataKey = null, ariaPressed = null) {
  return { found: true, selector: ".target", text, dataKey, enabled: true, visible: true, onscreen: true, hitTest: true, scrollPrepared: true, rect: { x: 20, y: 100, width: 120, height: 50 }, point: { x: 80, y: 125 }, ariaPressed, ariaLabel: text, activeElementBefore: "" };
}

function tapTarget(text = "操作", dataKey = null, ariaPressed = null) {
  const item = target(text, dataKey, ariaPressed);
  return { target: item, touch: { target: clone(item), primaryTouchId: 1, sequence: [{ type: "touchStart", touchPoints: [{ x: 80, y: 125, id: 1 }] }, { type: "touchEnd", touchPoints: [] }], start: { x: 80, y: 125, id: 1 }, end: { x: 80, y: 125, id: 1 } } };
}

function dragTarget(text = "ドラッグ") {
  const item = target(text);
  return { target: item, touch: { target: clone(item), primaryTouchId: 1, sequence: [{ type: "touchStart", touchPoints: [{ x: 80, y: 125, id: 1 }] }, { type: "touchMove", touchPoints: [{ x: 100, y: 137, id: 1 }] }, { type: "touchEnd", touchPoints: [] }], start: { x: 80, y: 125, id: 1 }, end: { x: 100, y: 137, id: 1 } } };
}

function withDialog(base, open) {
  return { ...base, dialogOpen: open, dialogVisible: open, dialogFocus: open ? "設定を閉じる" : null, htmlOverflow: open ? "hidden" : "", bodyOverflow: open ? "hidden" : "" };
}

function action(name, details) { return { name, details }; }

function buildDockJourney() {
  const destinations = PHONE_CORE_DOCK.map(item => {
    const afterProbe = probe(item.hash, { activeDockKey: item.key, canvasCount: item.canvasCount });
    return { key: item.key, label: item.label, expectedHash: item.hash, ...tapTarget(item.label), afterProbe };
  });
  return { id: "dock", route: "#workspace/home", initialProbe: probe("#workspace/home", { canvasCount: 0 }), finalProbe: probe("#workspace/quiz", { canvasCount: 1 }), actions: [action("dock-destinations", { destinations })] };
}

function buildSurfaceJourney() {
  const initialProbe = probe("#workspace/surface/medial", { rotation: { x: 0, y: 90, z: 0 } });
  const opened = withDialog(initialProbe, true);
  const selectedView = withDialog(probe("#workspace/surface/lateral", { rotation: { x: 0, y: -90, z: 0 } }), true);
  const closed = { ...selectedView, dialogOpen: false, dialogVisible: false, dialogFocus: null, htmlOverflow: "", bodyOverflow: "", activeElement: { tag: "BUTTON", className: "phoneRailToggle", ariaLabel: "現在の教材の設定を表示" } };
  const selectedProbe = { ...closed, selectedSurfaceKeys: ["region"] };
  const draggedProbe = { ...selectedProbe, rotation: { x: -5.04, y: -81.6, z: 0 } };
  const resetProbe = { ...selectedProbe, rotation: { x: 0, y: -90, z: 0 } };
  const open = { ...tapTarget("設定"), afterProbe: opened };
  const select = { ...tapTarget("左外側面"), selectedLabel: "左外側面", afterProbe: selectedView };
  const close = { ...tapTarget("設定を閉じる"), focusBeforeClose: { tag: "BUTTON" }, focusAfterClose: closed.activeElement, focusReturned: true, afterProbe: closed };
  const selected = { ...tapTarget("region", "region", "false"), selectedKeys: ["region"], afterProbe: selectedProbe };
  const drag = { ...dragTarget("脳表3Dモデル"), beforeRotation: selectedProbe.rotation, afterRotation: draggedProbe.rotation, pointerDelta: { dx: 20, dy: 12 }, expectedDelta: { x: -5.04, y: 8.4 }, afterProbe: draggedProbe };
  const reset = { ...tapTarget("向きを戻す"), expectedRotation: { x: 0, y: -90, z: 0 }, afterProbe: resetProbe };
  return { id: "surface-lateral", route: "#workspace/surface/lateral", initialProbe, finalProbe: resetProbe, actions: [action("settings-open", open), action("settings-select", select), action("settings-close", close), action("select-structure", selected), action("touch-drag", drag), action("reset-orientation", reset)] };
}

function buildSectionsJourney() {
  const initialProbe = probe("#workspace/sections/sagittal", { sections: { rangeValue: 52, outputValue: "52", layoutText: "断面＋3D", layoutPressed: true } });
  const opened = withDialog(initialProbe, true);
  const selectedPlane = probe("#workspace/sections/horizontal", { sections: { rangeValue: 52, outputValue: "52", layoutText: "断面＋3D", layoutPressed: true }, dialogOpen: true, dialogVisible: true, dialogFocus: "設定を閉じる", htmlOverflow: "hidden", bodyOverflow: "hidden" });
  const closed = { ...selectedPlane, dialogOpen: false, dialogVisible: false, dialogFocus: null, htmlOverflow: "", bodyOverflow: "", activeElement: { tag: "BUTTON", className: "phoneRailToggle", ariaLabel: "現在の教材の設定を表示" } };
  const rangeProbe = { ...closed, sections: { rangeValue: 53, outputValue: "53", layoutText: "断面＋3D", layoutPressed: true }, pageScrollY: 100 };
  const modelProbe = { ...rangeProbe, sections: { ...rangeProbe.sections, layoutText: "3Dのみ" } };
  const sliceProbe = { ...rangeProbe, sections: { ...rangeProbe.sections, layoutText: "断面のみ" } };
  const range = { ...tapTarget("＋"), beforeProbe: { ...closed, pageScrollY: 100 }, before: 52, beforeOutput: "52", after: 53, output: "53", pageScrollBefore: 100, pageScrollAfter: 100, afterProbe: rangeProbe };
  const transition = (text, afterProbe) => ({ ...tapTarget(text), afterProbe });
  return { id: "sections-horizontal", route: "#workspace/sections/horizontal", initialProbe, finalProbe: sliceProbe, actions: [action("settings-open", { ...tapTarget("設定"), afterProbe: opened }), action("settings-select", { ...tapTarget("水平断"), selectedLabel: "水平断", afterProbe: selectedPlane }), action("settings-close", { ...tapTarget("設定を閉じる"), focusBeforeClose: selectedPlane.activeElement, focusAfterClose: closed.activeElement, focusReturned: true, afterProbe: closed }), action("horizontal-range-step", range), action("section-layout-touch", { transitions: [transition("3Dのみ", modelProbe), transition("断面のみ", sliceProbe)], finalLayout: "断面のみ", afterProbe: sliceProbe })] };
}

function buildQuizJourney() {
  const initialProbe = probe("#workspace/quiz", { quiz: { target: null, plane: null, position: null, view: null, queueLength: 0, questionIndex: null, questionSignature: "empty", optionKeys: [], enabledOptionKeys: [], feedbackClass: null, feedbackText: "", reviewVisible: false, countFivePressed: false } });
  const opened = withDialog(initialProbe, true);
  const countProbe = { ...opened, quiz: { ...opened.quiz, countFivePressed: true, queueLength: 0, questionSignature: "configured" } };
  const question = { target: "thalamus", plane: "horizontal", position: 53, view: null, queueLength: 5, questionIndex: 0, questionSignature: "new-question", optionKeys: ["thalamus", "caudate", "putamen", "hippocampus"], enabledOptionKeys: ["thalamus", "caudate", "putamen", "hippocampus"], feedbackClass: null, feedbackText: "", reviewVisible: false, countFivePressed: true };
  const startProbe = { ...opened, quiz: question };
  const closed = { ...startProbe, dialogOpen: false, dialogVisible: false, htmlOverflow: "", bodyOverflow: "", activeElement: { tag: "BUTTON", className: "phoneRailToggle", ariaLabel: "現在の教材の設定を表示" } };
  const wrongProbe = { ...closed, quiz: { ...question, feedbackClass: "quizFeedback wrong", feedbackText: "もう一度位置関係を確認", reviewVisible: true } };
  const destinationProbe = probe("#workspace/sections/horizontal", { sections: { rangeValue: 53, outputValue: "53", layoutText: "断面のみ", layoutPressed: true }, selectedStructureKeys: ["thalamus"], destination: { family: "sections", hash: "#workspace/sections/horizontal", plane: "horizontal", view: null, position: 53, selectedSurfaceKeys: [], selectedStructureKeys: ["thalamus"], selectedNeurovascularKeys: [] } });
  const expectedReview = { family: "sections", hash: "#workspace/sections/horizontal", plane: "horizontal", position: 53, target: "thalamus" };
  return { id: "quiz", route: "#workspace/quiz", initialProbe, finalProbe: destinationProbe, actions: [
    action("settings-open", { ...tapTarget("設定"), afterProbe: opened }),
    action("quiz-count-5", { ...tapTarget("5問"), beforeQueueLength: 0, afterProbe: countProbe, selected: true }),
    action("quiz-start", { ...tapTarget("この条件で出題"), before: countProbe.quiz, after: startProbe.quiz, queueCreated: true, signatureChanged: true, afterProbe: startProbe }),
    action("settings-close", { ...tapTarget("設定を閉じる"), focusBeforeClose: startProbe.activeElement, focusAfterClose: closed.activeElement, focusReturned: true, afterProbe: closed }),
    action("wrong-answer", { ...tapTarget("caudate", "caudate"), questionBeforeAnswer: question, selectedOption: "caudate", attempts: 1, feedbackClass: "quizFeedback wrong", feedbackText: "もう一度位置関係を確認", afterProbe: wrongProbe }),
    action("review-link", { ...tapTarget("観察画面で位置を確認"), questionBeforeAnswer: question, expectedReview, observedReview: { family: "sections", hash: "#workspace/sections/horizontal", plane: "horizontal", view: null, position: 53, selectedSurfaceKeys: [], selectedStructureKeys: ["thalamus"], selectedNeurovascularKeys: [] }, afterProbe: destinationProbe }),
  ] };
}

function validReport() {
  return {
    schemaVersion: PHONE_CORE_SCHEMA_VERSION,
    generatedAt: GENERATED_AT,
    tool: PHONE_CORE_TOOL,
    baseUrl: "http://127.0.0.1:4173/",
    viewport: { ...PHONE_CORE_VIEWPORT },
    emulation: { ...PHONE_CORE_EMULATION },
    environment: { os: { platform: "win32", release: "10.0.26100", version: "Windows 11", arch: "x64" }, cpuCount: 16, memoryBytes: { total: 32 * 1024 ** 3, free: 16 * 1024 ** 3 }, nodeVersion: "v24.19.0", browser: { ...BROWSER } },
    journeys: [buildDockJourney(), buildSurfaceJourney(), buildSectionsJourney(), buildQuizJourney()],
    allPassed: true,
  };
}

test("phone audit exposes a fixed five-destination dock, coarse-touch policy, and non-visual hooks", () => {
  assert.deepEqual(PHONE_CORE_DOCK.map(item => item.key), ["home", "surface", "sections", "blocks", "quiz"]);
  assert.deepEqual(PHONE_CORE_DOCK.map(item => item.canvasCount), [0, 1, 1, 0, 1]);
  assert.deepEqual(PHONE_CORE_JOURNEY_IDS, ["dock", "surface-lateral", "sections-horizontal", "quiz"]);
  assert.equal(PHONE_CORE_VIEWPORT.width, 390);
  assert.equal(PHONE_CORE_VIEWPORT.height, 768);
  assert.equal(PHONE_CORE_EMULATION.mobile, true);
  assert.equal(PHONE_CORE_EMULATION.touch, true);
  assert.equal(PHONE_CORE_EMULATION.maxTouchPoints, 5);
  assert.match(page, /data-workspace-key=\{item\.key\}/);
  assert.match(page, /data-quiz-option=\{key\}/);
  assert.match(page, /data-neurovascular-key=\{key\}/);
  assert.match(css, /\.phone-mode \.sectionLayoutSwitch button\{min-height:44px\}/);
  assert.match(css, /\.phone-mode \.panelActions button\{min-height:44px\}/);
  assert.match(css, /\.phone-mode \.sliceTimeline input\[type=range\]\{min-height:44px\}/);
  assert.match(css, /\.phone-mode \.quizFeedback button\{min-height:44px\}/);
  assert.match(runnerSource, /Input\.dispatchTouchEvent/);
  assert.doesNotMatch(runnerSource, /\.click\(/);
  assert.deepEqual(PHONE_CORE_ACTION_NAMES["surface-lateral"], ["settings-open", "settings-select", "settings-close", "select-structure", "touch-drag", "reset-orientation"]);
});

test("independent phone report validator accepts the complete fixture", () => {
  const report = validReport();
  const validation = validatePhoneCoreInteractionReport(report);
  assert.equal(validation.passed, true, validation.failures.join("\n"));
});

test("independent phone report validator rejects provenance, touch, state, and destination mutations", () => {
  const mutations = [
    ["schema", report => { report.schemaVersion = 99; }],
    ["tool", report => { report.tool = "wrong-tool"; }],
    ["timestamp", report => { report.generatedAt = "nope"; }],
    ["base", report => { report.baseUrl = "https://example.invalid/"; }],
    ["emulation", report => { report.emulation.mobile = false; }],
    ["screen width", report => { report.journeys[0].initialProbe.screenWidth = 375; }],
    ["provenance", report => { report.environment.os.platform = "linux"; }],
    ["mixed browser", report => { report.environment.browser.product = "Chrome/150.0.0.0"; }],
    ["missing dock", report => { report.journeys[0].actions[0].details.destinations.pop(); }],
    ["wrong dock label", report => { report.journeys[0].initialProbe.dock[1].text = "別表示"; }],
    ["wrong active dock", report => { report.journeys[1].initialProbe.activeDockKey = "quiz"; }],
    ["wrong route canvas", report => { report.journeys[0].actions[0].details.destinations[3].afterProbe.canvasCount = 1; }],
    ["small target", report => { report.journeys[1].actions[3].details.target.rect.width = 20; }],
    ["offscreen target", report => { report.journeys[1].actions[3].details.target.onscreen = false; }],
    ["rect claims onscreen outside viewport", report => { report.journeys[1].actions[3].details.target.rect.x = 380; }],
    ["touch point copy", report => { report.journeys[1].actions[3].details.touch.start.x = 81; }],
    ["touch primary id", report => { report.journeys[1].actions[4].details.touch.sequence[1].touchPoints[0].id = 2; }],
    ["extra tap contact", report => { report.journeys[1].actions[3].details.touch.sequence[0].touchPoints.push({ x: 81, y: 125, id: 1 }); }],
    ["extra drag contact", report => { report.journeys[1].actions[4].details.touch.sequence[1].touchPoints.push({ x: 101, y: 137, id: 1 }); }],
    ["mismatched touch target", report => { report.journeys[1].actions[3].details.touch.target.text = "別対象"; }],
    ["missing dialog focus", report => { report.journeys[2].actions[0].details.afterProbe.dialogFocus = null; }],
    ["missing focus return", report => { report.journeys[2].actions[2].details.focusReturned = false; }],
    ["surface selected copy", report => { report.journeys[1].actions[3].details.selectedKeys = ["other"]; }],
    ["surface missing target key", report => { report.journeys[1].actions[3].details.target.dataKey = null; }],
    ["surface target pressed", report => { report.journeys[1].actions[3].details.target.ariaPressed = "true"; }],
    ["surface prior selection", report => { report.journeys[1].actions[2].details.afterProbe.selectedSurfaceKeys = ["region"]; }],
    ["surface after selection key", report => { report.journeys[1].actions[3].details.afterProbe.selectedSurfaceKeys = ["other"]; }],
    ["surface no-op view selection", report => { report.journeys[1].actions[1].details.afterProbe.hash = report.journeys[1].actions[0].details.afterProbe.hash; }],
    ["bad touch sequence", report => { report.journeys[1].actions[4].details.touch.sequence = [{ type: "touchStart", touchPoints: [] }, { type: "touchEnd", touchPoints: [] }]; }],
    ["rotation delta", report => { report.journeys[1].actions[4].details.afterRotation.y = -70; }],
    ["range output", report => { report.journeys[2].actions[3].details.output = "52"; }],
    ["range before output copy", report => { report.journeys[2].actions[3].details.beforeOutput = "51"; }],
    ["scroll change", report => { report.journeys[2].actions[3].details.pageScrollAfter = 101; }],
    ["sections no-op plane selection", report => { report.journeys[2].actions[1].details.afterProbe.hash = report.journeys[2].actions[0].details.afterProbe.hash; }],
    ["layout final copy", report => { report.journeys[2].actions[4].details.finalLayout = "3Dのみ"; }],
    ["queue no-op", report => { report.journeys[3].actions[2].details.before.queueLength = 5; }],
    ["queue after copy", report => { report.journeys[3].actions[2].details.after.queueLength = 4; }],
    ["wrong option key", report => { report.journeys[3].actions[4].details.selectedOption = "not-an-option"; }],
    ["quiz feedback copy", report => { report.journeys[3].actions[4].details.feedbackText = "改ざん"; }],
    ["quiz review visibility", report => { report.journeys[3].actions[4].details.afterProbe.quiz.reviewVisible = false; }],
    ["quiz question copy", report => { report.journeys[3].actions[5].details.questionBeforeAnswer.target = "other"; }],
    ["wrong review", report => { report.journeys[3].actions[5].details.expectedReview.hash = "#workspace/surface/lateral"; }],
    ["wrong destination", report => { report.journeys[3].actions[5].details.observedReview.hash = "#workspace/quiz"; }],
    ["destination afterProbe copy", report => { report.journeys[3].actions[5].details.afterProbe.destination.position = 54; }],
    ["ui error", report => { report.journeys[0].initialProbe.uiErrors = [{ text: "error" }]; }],
    ["overflow", report => { report.journeys[2].finalProbe.horizontalOverflow = true; }],
    ["allPassed contradiction", report => { report.allPassed = false; }],
  ];
  for (const [name, mutate] of mutations) {
    const report = validReport();
    mutate(report);
    assert.equal(validatePhoneCoreInteractionReport(report).passed, false, name);
  }
});
