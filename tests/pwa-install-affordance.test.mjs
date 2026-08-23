import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  auditPwaInstallAffordance,
  auditPwaInstallAffordanceSource,
  REPOSITORY_ROOT,
} from "../scripts/audit_pwa_install_affordance.mjs";
import {
  createPwaInstallAffordance,
  isPwaStandalone,
} from "../src/pwaInstallAffordance.mjs";
import {
  PWA_INSTALL_BROWSER_SCENARIOS,
  PWA_INSTALL_BROWSER_VIEWPORTS,
  validatePwaInstallBrowserResult,
} from "../scripts/audit_pwa_install_affordance_browser.mjs";

const auditScript = fileURLToPath(new URL("../scripts/audit_pwa_install_affordance.mjs", import.meta.url));

async function readAuditSources() {
  const readSource = relativePath => readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
  const [pageSource, cssSource, indexSource, affordanceSource, affordanceTypes, manifestSource, serviceWorkerSource, pwaBuildSource] = await Promise.all([
    readSource("app/page.tsx"),
    readSource("app/canvas.css"),
    readSource("index.html"),
    readSource("src/pwaInstallAffordance.mjs"),
    readSource("src/pwaInstallAffordance.d.mts"),
    readSource("public/manifest.webmanifest"),
    readSource("src/pwa.ts"),
    readSource("build/pwa-vite-plugin.ts"),
  ]);
  return { pageSource, cssSource, indexSource, affordanceSource, affordanceTypes, manifestSource, serviceWorkerSource, pwaBuildSource };
}

function createWindowLike({ displayModeStandalone = false, iosStandalone = false } = {}) {
  const listeners = new Map();
  const media = { matches: displayModeStandalone };
  const windowLike = {
    navigator: { standalone: iosStandalone },
    matchMedia: query => query === "(display-mode: standalone)" ? media : { matches: false },
    addEventListener(type, listener) {
      const set = listeners.get(type) ?? new Set();
      set.add(listener);
      listeners.set(type, set);
    },
    removeEventListener(type, listener) {
      listeners.get(type)?.delete(listener);
    },
    dispatch(type, event = {}) {
      for (const listener of listeners.get(type) ?? []) listener(event);
    },
    listenerCount(type) {
      return listeners.get(type)?.size ?? 0;
    },
  };
  return windowLike;
}

function createInstallEvent(outcome = "accepted") {
  let promptCalls = 0;
  let preventDefaultCalls = 0;
  const event = {
    preventDefault() {
      preventDefaultCalls += 1;
    },
    prompt() {
      promptCalls += 1;
      return Promise.resolve();
    },
    userChoice: Promise.resolve({ outcome }),
  };
  return {
    event,
    get promptCalls() { return promptCalls; },
    get preventDefaultCalls() { return preventDefaultCalls; },
  };
}

test("captures beforeinstallprompt, prevents automatic prompt, and consumes accepted event", async () => {
  const windowLike = createWindowLike();
  const tracker = createPwaInstallAffordance({ windowLike });
  tracker.mount();
  const install = createInstallEvent("accepted");

  windowLike.dispatch("beforeinstallprompt", install.event);
  assert.equal(install.preventDefaultCalls, 1);
  assert.equal(install.promptCalls, 0);
  assert.equal(tracker.getState().canInstall, true);

  const result = await tracker.requestInstall();
  assert.equal(result.status, "accepted");
  assert.equal(install.promptCalls, 1);
  assert.equal(tracker.getState().eventPending, false);
  assert.equal((await tracker.requestInstall()).status, "unavailable");
});

test("dismissed prompt is single-use and concurrent requests cannot prompt twice", async () => {
  const windowLike = createWindowLike();
  const tracker = createPwaInstallAffordance({ windowLike });
  tracker.mount();
  let resolvePrompt;
  let promptCalls = 0;
  const event = {
    preventDefault() {},
    prompt() {
      promptCalls += 1;
      return new Promise(resolve => { resolvePrompt = resolve; });
    },
    userChoice: Promise.resolve({ outcome: "dismissed" }),
  };
  windowLike.dispatch("beforeinstallprompt", event);

  const first = tracker.requestInstall();
  const second = tracker.requestInstall();
  assert.strictEqual(first, second);
  assert.equal(promptCalls, 1);
  resolvePrompt();
  assert.equal((await first).status, "dismissed");
  assert.equal((await tracker.requestInstall()).status, "unavailable");
});

test("appinstalled consumes a pending event and marks the app installed", async () => {
  const windowLike = createWindowLike();
  const tracker = createPwaInstallAffordance({ windowLike });
  tracker.mount();
  const install = createInstallEvent();
  windowLike.dispatch("beforeinstallprompt", install.event);
  windowLike.dispatch("appinstalled");
  assert.equal(tracker.getState().installed, true);
  assert.equal(tracker.getState().canInstall, false);
  assert.equal((await tracker.requestInstall()).status, "already-installed");
  assert.equal(install.promptCalls, 0);
});

test("standalone detection supports display mode, iOS, and SSR/unsupported environments", async () => {
  assert.equal(isPwaStandalone(createWindowLike({ displayModeStandalone: true })), true);
  assert.equal(isPwaStandalone(createWindowLike({ iosStandalone: true })), true);
  assert.equal(isPwaStandalone(null), false);
  const tracker = createPwaInstallAffordance({ windowLike: null });
  assert.doesNotThrow(() => tracker.mount());
  assert.equal(tracker.getState().supported, false);
  assert.equal((await tracker.requestInstall()).status, "unavailable");
});

test("cleanup/remount is idempotent and does not duplicate listeners", async () => {
  const windowLike = createWindowLike();
  const tracker = createPwaInstallAffordance({ windowLike });
  tracker.mount();
  tracker.mount();
  assert.equal(windowLike.listenerCount("beforeinstallprompt"), 1);
  assert.equal(windowLike.listenerCount("appinstalled"), 1);
  tracker.cleanup();
  assert.equal(windowLike.listenerCount("beforeinstallprompt"), 0);
  tracker.mount();
  assert.equal(windowLike.listenerCount("beforeinstallprompt"), 1);

  const install = createInstallEvent();
  windowLike.dispatch("beforeinstallprompt", install.event);
  assert.equal(install.preventDefaultCalls, 1);
  assert.equal((await tracker.requestInstall()).status, "accepted");
  assert.equal(install.promptCalls, 1);
});

test("implementation has no persistence, analytics, or personal-data side effects", async () => {
  const source = await readFile(new URL("../src/pwaInstallAffordance.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB|fetch\s*\(|sendBeacon|analytics/i);
});

test("independent PWA install audit succeeds and CLI emits a passing JSON report", async () => {
  const report = auditPwaInstallAffordance(REPOSITORY_ROOT);
  assert.equal(report.ok, true, report.errors.map(error => `${error.code}: ${error.message}`).join("\n"));
  assert.deepEqual(report.summary.stateKeys, ["supported", "mounted", "installed", "eventPending", "canInstall", "promptInFlight"]);
  assert.deepEqual(report.summary.resultStatuses, ["accepted", "dismissed", "error"]);
  assert.equal(report.summary.browserVerification, "この静的監査コマンドは実ブラウザを実行しない");

  const cli = spawnSync(process.execPath, [auditScript], { cwd: REPOSITORY_ROOT, encoding: "utf8" });
  assert.equal(cli.status, 0, cli.stderr);
  const cliReport = JSON.parse(cli.stdout);
  assert.equal(cliReport.ok, true);
  assert.equal(cliReport.schemaVersion, 1);
});

test("independent PWA audit rejects prompt, UI, privacy, and existing-cache contract mutations", async () => {
  const sources = await readAuditSources();
  const auditMutation = (field, from, to) => {
    assert.ok(sources[field].includes(from), `${field} mutation anchor is present`);
    return auditPwaInstallAffordanceSource({ ...sources, [field]: sources[field].replace(from, to) });
  };
  const autoPrompt = auditMutation("affordanceSource", "const handleAppInstalled", "event.prompt();\n\n  const handleAppInstalled");
  assert.equal(autoPrompt.ok, false);
  assert.ok(autoPrompt.errors.some(error => error.code === "auto-prompt"));

  const missingFocusGuard = auditMutation("pageSource", "pwaInstallState.canInstall&&<button", "pwaInstallState.installed&&<button");
  assert.equal(missingFocusGuard.ok, false);
  assert.ok(missingFocusGuard.errors.some(error => error.code === "ui-explicit-click-state"));

  const missingBoundaryCopy = auditMutation("pageSource", "約92MB一括保存するものではありません", "教材を一括保存するものではありません");
  assert.equal(missingBoundaryCopy.ok, false);
  assert.ok(missingBoundaryCopy.errors.some(error => error.code === "ui-boundary-copy"));

  const undersizedButton = auditMutation("cssSource", ".pwaInstallButton { width: fit-content; min-height: 44px", ".pwaInstallButton { width: fit-content; min-height: 36px");
  assert.equal(undersizedButton.ok, false);
  assert.ok(undersizedButton.errors.some(error => error.code === "ui-44px"));

  const nonBaseIcon = auditMutation("indexSource", "%BASE_URL%icon-192.png", "/icon-192.png");
  assert.equal(nonBaseIcon.ok, false);
  assert.ok(nonBaseIcon.errors.some(error => error.code === "base-path-icon"));

  const privateSideEffect = auditPwaInstallAffordanceSource({ ...sources, affordanceSource: `${sources.affordanceSource}\nlocalStorage.getItem("pwa");\n` });
  assert.equal(privateSideEffect.ok, false);
  assert.ok(privateSideEffect.errors.some(error => error.code === "adapter-side-effect"));

  const serviceWorkerDrift = auditMutation("serviceWorkerSource", "import.meta.env.PROD", "import.meta.env.DEV");
  assert.equal(serviceWorkerDrift.ok, false);
  assert.ok(serviceWorkerDrift.errors.some(error => error.code === "sw-production"));

  const cacheDrift = auditMutation("pwaBuildSource", "hashPublicDirectory(revisionHash, publicDirectory)", "hashPublicAsset(revisionHash, publicDirectory)");
  assert.equal(cacheDrift.ok, false);
  assert.ok(cacheDrift.errors.some(error => error.code === "cache-revision"));
});

function createBrowserProbe(overrides = {}) {
  return {
    readyState: "complete",
    cardCount: 1,
    state: "unavailable",
    buttonCount: 0,
    buttonHeight: null,
    feedbackStatus: null,
    feedbackText: null,
    installedBadge: [],
    promptCalls: 0,
    prevented: false,
    clientWidth: 1366,
    clientHeight: 768,
    innerWidth: 1366,
    innerHeight: 768,
    horizontalOverflow: false,
    loadingCount: 0,
    uiErrors: [],
    manifestHref: "/manifest.webmanifest",
    appleTouchIconHref: "/icon-192.png",
    ...overrides,
  };
}

function createBrowserResult(scenario = "accepted") {
  const viewport = { id: "pc", width: 1366, height: 768 };
  const before = createBrowserProbe();
  const available = createBrowserProbe({ state: "available", buttonCount: 1, buttonHeight: 44, prevented: true });
  const after = scenario === "appinstalled"
    ? createBrowserProbe({ state: "installed", installedBadge: ["アプリとして起動中"] })
    : createBrowserProbe({ feedbackStatus: scenario, promptCalls: 1 });
  return { key: `pc-${scenario}`, viewport, scenario, before, available, after };
}

test("browser install audit has a fixed 2x3 matrix and independently rejects evidence drift", () => {
  assert.deepEqual(PWA_INSTALL_BROWSER_VIEWPORTS.map(({ id, width, height }) => [id, width, height]), [["pc", 1366, 768], ["mobile", 390, 768]]);
  assert.deepEqual(PWA_INSTALL_BROWSER_SCENARIOS, ["accepted", "dismissed", "appinstalled"]);
  for (const scenario of PWA_INSTALL_BROWSER_SCENARIOS) {
    assert.deepEqual(validatePwaInstallBrowserResult(createBrowserResult(scenario)), []);
  }

  const autoPrompt = createBrowserResult("accepted");
  autoPrompt.available.promptCalls = 1;
  assert.ok(validatePwaInstallBrowserResult(autoPrompt).some(failure => failure.includes("unprompted")));

  const undersized = createBrowserResult("dismissed");
  undersized.available.buttonHeight = 43;
  assert.ok(validatePwaInstallBrowserResult(undersized).some(failure => failure.includes("44px")));

  const falseInstall = createBrowserResult("appinstalled");
  falseInstall.after.promptCalls = 1;
  assert.ok(validatePwaInstallBrowserResult(falseInstall).some(failure => failure.includes("without prompting")));

  const wrongViewport = createBrowserResult("accepted");
  wrongViewport.after.innerWidth = 390;
  assert.ok(validatePwaInstallBrowserResult(wrongViewport).some(failure => failure.includes("viewport")));

  const pathDrift = createBrowserResult("accepted");
  pathDrift.before.appleTouchIconHref = "/wrong.png";
  assert.ok(validatePwaInstallBrowserResult(pathDrift).some(failure => failure.includes("paths drifted")));
});
