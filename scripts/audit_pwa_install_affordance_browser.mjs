#!/usr/bin/env node

/**
 * Browser check for the learner-facing PWA install affordance.
 *
 * The check injects a synthetic beforeinstallprompt-compatible event. It
 * proves the UI/state contract only; it never claims or performs a real app
 * installation.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  closeChrome,
  configurePage,
  evaluate,
  launchChrome,
  navigate,
  waitForDocumentReady,
} from "./measure_browser_performance.mjs";

export const PWA_INSTALL_BROWSER_AUDIT_SCHEMA_VERSION = 1;
export const PWA_INSTALL_BROWSER_VIEWPORTS = Object.freeze([
  Object.freeze({ id: "pc", width: 1366, height: 768 }),
  Object.freeze({ id: "mobile", width: 390, height: 768 }),
]);
export const PWA_INSTALL_BROWSER_SCENARIOS = Object.freeze(["accepted", "dismissed", "appinstalled"]);

const INJECT_INSTALL_HOOK = `(() => {
  window.__pwaInstallAudit = {promptCalls: 0, prevented: false, dispatched: null};
  window.addEventListener("beforeinstallprompt", event => {
    if (event.__pwaInstallAuditSynthetic === true) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
  window.__dispatchPwaInstallAudit = outcome => {
    const event = new Event("beforeinstallprompt", {cancelable: true});
    Object.defineProperty(event, "__pwaInstallAuditSynthetic", {value: true});
    Object.defineProperty(event, "prompt", {value: async () => { window.__pwaInstallAudit.promptCalls += 1; }});
    Object.defineProperty(event, "userChoice", {value: Promise.resolve({outcome})});
    window.__pwaInstallAudit.dispatched = outcome;
    window.dispatchEvent(event);
    window.__pwaInstallAudit.prevented = event.defaultPrevented;
  };
  window.__dispatchAppInstalledAudit = () => window.dispatchEvent(new Event("appinstalled"));
})()`;

const delayExpression = milliseconds => `new Promise(resolve => setTimeout(resolve, ${milliseconds}))`;

const PROBE = `(() => {
  const root = document.documentElement;
  const body = document.body;
  const card = document.querySelector("[data-pwa-install-card]");
  const button = document.querySelector("[data-pwa-install-button]");
  const feedback = document.querySelector("[data-pwa-install-result]");
  return {
    readyState: document.readyState,
    cardCount: document.querySelectorAll("[data-pwa-install-card]").length,
    state: card?.getAttribute("data-pwa-install-state") ?? null,
    buttonCount: document.querySelectorAll("[data-pwa-install-button]").length,
    buttonHeight: button ? button.getBoundingClientRect().height : null,
    feedbackStatus: feedback?.getAttribute("data-pwa-install-result") ?? null,
    feedbackText: feedback?.textContent?.replace(/\\s+/g, " ").trim() ?? null,
    installedBadge: [...(card?.querySelectorAll(".pwaInstallBadge") ?? [])].map(node => node.textContent?.trim()),
    promptCalls: window.__pwaInstallAudit?.promptCalls ?? null,
    prevented: window.__pwaInstallAudit?.prevented ?? null,
    clientWidth: root.clientWidth,
    clientHeight: root.clientHeight,
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    horizontalOverflow: Math.max(root.scrollWidth, body?.scrollWidth ?? 0) > root.clientWidth + 1,
    loadingCount: document.querySelectorAll(".atlasLoading:not(.error),.segLoading:not(.error)").length,
    uiErrors: [...document.querySelectorAll(".atlasLoading.error,.segLoading.error,[role=alert]")].map(node => node.textContent?.replace(/\\s+/g, " ").trim()),
    manifestHref: document.querySelector('link[rel="manifest"]')?.getAttribute("href") ?? null,
    appleTouchIconHref: document.querySelector('link[rel="apple-touch-icon"]')?.getAttribute("href") ?? null,
  };
})()`;

function parseArguments(argv) {
  const options = { baseUrl: null, output: null };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--help" || token === "-h") return { help: true };
    if (token === "--base-url" || token === "--output") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`${token} requires a value`);
      options[token === "--base-url" ? "baseUrl" : "output"] = value;
      index += 1;
      continue;
    }
    throw new Error(`unknown option: ${token}`);
  }
  if (!options.baseUrl || !options.output) throw new Error("--base-url and --output are required");
  const url = new URL(options.baseUrl);
  if (url.protocol !== "http:" || !["127.0.0.1", "localhost", "::1"].includes(url.hostname) || url.search || url.hash) {
    throw new Error("base URL must be clean loopback HTTP");
  }
  return {...options, baseUrl: url.href};
}

export function validatePwaInstallBrowserResult(result) {
  const failures = [];
  const { scenario, viewport, before, available, after } = result;
  if (before.cardCount !== 1 || before.state !== "unavailable" || before.buttonCount !== 0) failures.push("initial card state must be unavailable without a prompt event");
  if (available.cardCount !== 1 || available.state !== "available" || available.buttonCount !== 1 || available.prevented !== true || available.promptCalls !== 0) failures.push("synthetic event must be prevented and expose one unprompted button");
  if (!(available.buttonHeight >= 44)) failures.push("install button must be at least 44px high");
  if (scenario === "appinstalled") {
    if (after.state !== "installed" || after.buttonCount !== 0 || !after.installedBadge.includes("アプリとして起動中") || after.promptCalls !== 0) failures.push("appinstalled must show installed state without prompting");
  } else {
    if (after.state !== "unavailable" || after.buttonCount !== 0 || after.feedbackStatus !== scenario || after.promptCalls !== 1) failures.push(`${scenario} must consume one explicit prompt and show matching transient feedback`);
  }
  for (const [phase, probe] of Object.entries({ before, available, after })) {
    if (probe.innerWidth !== viewport.width || probe.innerHeight !== viewport.height) failures.push(`${phase} viewport does not match requested dimensions`);
    if (probe.horizontalOverflow || probe.loadingCount !== 0 || probe.uiErrors.length !== 0) failures.push(`${phase} has overflow, loading, or UI errors`);
    if (probe.manifestHref !== "/manifest.webmanifest" || probe.appleTouchIconHref !== "/icon-192.png") failures.push(`${phase} manifest/apple icon paths drifted`);
  }
  return failures;
}

async function collectScenario({ cdp, baseUrl, viewport, scenario }) {
  await cdp.send("Emulation.setDeviceMetricsOverride", {width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: false});
  await navigate(cdp, "about:blank");
  await navigate(cdp, `${baseUrl}?pwaInstallAudit=${viewport.id}-${scenario}#workspace/home`);
  await waitForDocumentReady(cdp);
  await evaluate(cdp, delayExpression(150));
  const before = await evaluate(cdp, PROBE);
  await evaluate(cdp, `window.__dispatchPwaInstallAudit(${JSON.stringify(scenario === "appinstalled" ? "accepted" : scenario)})`);
  await evaluate(cdp, delayExpression(100));
  const available = await evaluate(cdp, PROBE);
  if (scenario === "appinstalled") await evaluate(cdp, "window.__dispatchAppInstalledAudit()");
  else await evaluate(cdp, "document.querySelector('[data-pwa-install-button]')?.click()");
  await evaluate(cdp, delayExpression(150));
  const after = await evaluate(cdp, PROBE);
  const result = {key: `${viewport.id}-${scenario}`, viewport, scenario, before, available, after};
  const failures = validatePwaInstallBrowserResult(result);
  return {...result, passed: failures.length === 0, failures};
}

export async function runPwaInstallAffordanceBrowserAudit({baseUrl, dependencies = {}} = {}) {
  const launch = dependencies.launchChrome ?? launchChrome;
  const close = dependencies.closeChrome ?? closeChrome;
  const session = await launch();
  try {
    await configurePage(session.cdp);
    await session.cdp.send("Page.addScriptToEvaluateOnNewDocument", {source: INJECT_INSTALL_HOOK});
    const results = [];
    for (const viewport of PWA_INSTALL_BROWSER_VIEWPORTS) {
      for (const scenario of PWA_INSTALL_BROWSER_SCENARIOS) results.push(await collectScenario({cdp: session.cdp, baseUrl, viewport, scenario}));
    }
    const version = await session.cdp.send("Browser.getVersion");
    const report = {
      schemaVersion: PWA_INSTALL_BROWSER_AUDIT_SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      tool: "scripts/audit_pwa_install_affordance_browser.mjs",
      evidenceScope: "synthetic-beforeinstallprompt-ui-contract-only-not-a-real-install",
      baseUrl,
      browser: {product: version.product, userAgent: version.userAgent},
      results,
      allPassed: results.every(result => result.passed),
    };
    return report;
  } finally {
    await close(session);
  }
}

function usage() {
  return "Usage: node scripts/audit_pwa_install_affordance_browser.mjs --base-url http://127.0.0.1:4173/ --output FILE";
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) { console.log(usage()); return; }
  const report = await runPwaInstallAffordanceBrowserAudit({baseUrl: options.baseUrl});
  const output = resolve(options.output);
  await mkdir(dirname(output), {recursive: true});
  await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({output, checkCount: report.results.length, allPassed: report.allPassed}));
  if (!report.allPassed) process.exitCode = 1;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
}
