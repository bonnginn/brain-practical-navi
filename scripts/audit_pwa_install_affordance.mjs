#!/usr/bin/env node

/**
 * Independent static audit for the optional PWA install affordance.
 *
 * This audit checks the browser-boundary state contract and the learner-facing
 * copy. It intentionally does not install an app, open a browser, collect
 * telemetry, or inspect personal data.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
export const REPOSITORY_ROOT = path.resolve(SCRIPT_DIRECTORY, "..");
export const PWA_INSTALL_AFFORDANCE_AUDIT_SCHEMA_VERSION = 1;

const STATE_KEYS = Object.freeze([
  "supported",
  "mounted",
  "installed",
  "eventPending",
  "canInstall",
  "promptInFlight",
]);
const RESULT_STATUSES = Object.freeze(["accepted", "dismissed", "error"]);
const FORBIDDEN_SIDE_EFFECTS = /localStorage|sessionStorage|indexedDB|fetch\s*\(|sendBeacon|navigator\.userAgent|document\.cookie|personal.?data|analytics/i;

function addFailure(errors, code, message) {
  errors.push({ code, message });
}

function requirePattern(source, errors, code, pattern, message) {
  if (!(pattern instanceof RegExp ? pattern.test(source) : source.includes(pattern))) addFailure(errors, code, message);
}

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|\s)\/\/.*$/gm, "$1");
}

function readText(root, relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function auditAffordanceModule(source, typesSource, errors) {
  const code = stripComments(source);
  for (const key of STATE_KEYS) requirePattern(code, errors, "state-contract", new RegExp(`\\b${key}\\b`), `install state must expose ${key}`);
  for (const method of ["mount", "cleanup", "requestInstall", "getState"]) requirePattern(code, errors, "adapter-method", new RegExp(`\\b${method}\\b`), `install adapter must expose ${method}`);
  requirePattern(code, errors, "result-contract", /choice\?\.outcome === "accepted"/, "install adapter result must include accepted");
  requirePattern(code, errors, "result-contract", "\"dismissed\"", "install adapter result must include dismissed");
  for (const status of ["error", "already-installed", "unavailable"]) requirePattern(code, errors, "result-contract", "status: \"" + status + "\"", "install adapter result must include " + status);
  requirePattern(code, errors, "beforeinstallprompt-listener", /addEventListener\("beforeinstallprompt",\s*handleBeforeInstallPrompt\)/, "beforeinstallprompt must be captured by the adapter");
  requirePattern(code, errors, "beforeinstallprompt-prevent", /event\?\.preventDefault\?\.\(\)/, "beforeinstallprompt must be cancelled before explicit prompting");
  requirePattern(code, errors, "appinstalled-listener", /addEventListener\("appinstalled",\s*handleAppInstalled\)/, "appinstalled must be observed");
  requirePattern(code, errors, "standalone-media", /DEFAULT_MEDIA_QUERY\s*=\s*["']\(display-mode: standalone\)["']/, "display-mode standalone media query must be defined");
  requirePattern(code, errors, "standalone-media-call", /matchMedia\?\.\(DEFAULT_MEDIA_QUERY\)/, "display-mode standalone media query must be checked");
  requirePattern(code, errors, "standalone-ios", /navigator\?\.standalone\s*===\s*true/, "iOS navigator.standalone must be detected");
  requirePattern(code, errors, "ssr-safe", /typeof globalThis !== "undefined"/, "default window lookup must be SSR-safe");
  requirePattern(code, errors, "unsupported-safe", /if \(!windowLike\) return false/, "standalone detection must tolerate an unavailable window");
  requirePattern(source, errors, "cleanup-listener", /removeEventListener\("beforeinstallprompt"[\s\S]*?removeEventListener\("appinstalled"/, "cleanup must remove both install listeners");
  requirePattern(code, errors, "mount-idempotent", /if \(mounted \|\| !supported\) return state\(\)/, "mount must be idempotent and unsupported-safe");
  requirePattern(code, errors, "prompt-single-flight", /if \(activeRequest\) return activeRequest/, "concurrent install requests must share one prompt promise");
  requirePattern(code, errors, "prompt-event-required", /if \(!deferredEvent\) return Promise\.resolve/, "prompt must be unavailable until an event has been captured");
  requirePattern(code, errors, "event-consumed", /const event = deferredEvent;\s*deferredEvent = null;/, "the captured install event must be consumed before prompt");
  requirePattern(code, errors, "request-user-choice", /await event\.userChoice/, "accepted/dismissed must come from the browser userChoice result");
  requirePattern(code, errors, "request-cleanup", /finally \{[\s\S]*?activeRequest = null;/, "prompt state must be cleared after accepted, dismissed, or error");
  requirePattern(code, errors, "installed-consumes-event", /installed = true;\s*deferredEvent = null;/, "appinstalled must consume any pending event");
  const requestStart = code.indexOf("function requestInstall()");
  if (requestStart < 0) addFailure(errors, "explicit-prompt-function", "requestInstall function is missing");
  else {
    const beforeRequest = code.slice(0, requestStart);
    const requestBody = code.slice(requestStart);
    if (/\.prompt\s*\(/.test(beforeRequest)) addFailure(errors, "auto-prompt", "event.prompt must not be called during capture or mount");
    const promptCalls = requestBody.match(/\.prompt\s*\(/g) ?? [];
    if (promptCalls.length !== 1) addFailure(errors, "explicit-prompt-count", "requestInstall must call the browser prompt exactly once");
  }
  if (FORBIDDEN_SIDE_EFFECTS.test(code)) addFailure(errors, "adapter-side-effect", "install adapter must not use storage, analytics, network, user-agent, or personal-data APIs");
  for (const key of ["PwaInstallState", "PwaInstallResult", "PwaInstallAffordance", "createPwaInstallAffordance"]) requirePattern(typesSource, errors, "type-contract", new RegExp(`\\b${key}\\b`), `type declaration must include ${key}`);
}

function auditHomeUi(pageSource, cssSource, indexSource, errors) {
  requirePattern(pageSource, errors, "ui-import", /createPwaInstallAffordance/, "Home must use the install state adapter");
  requirePattern(pageSource, errors, "ui-ref", /pwaInstallAffordanceRef\s*=\s*useRef/, "Home must retain one adapter instance in a ref");
  requirePattern(pageSource, errors, "ui-mount-cleanup", /affordance\.mount\(\)[\s\S]*?affordance\.cleanup\(\)/, "Home must mount and cleanup the adapter in an effect");
  requirePattern(pageSource, errors, "ui-card", /className="pwaInstallCard"/, "Home must render the install card");
  requirePattern(pageSource, errors, "ui-card-state", /data-pwa-install-state={pwaInstallState\.installed\?"installed":pwaInstallState\.canInstall\?"available":"unavailable"}/, "Home card must expose installed/available/unavailable state");
  requirePattern(pageSource, errors, "ui-explicit-click-state", "pwaInstallState.canInstall&&<button", "the install button must be available only after beforeinstallprompt");
  requirePattern(pageSource, errors, "ui-explicit-click-marker", "data-pwa-install-button=\"true\"", "the install button must have a stable audit marker");
  requirePattern(pageSource, errors, "ui-explicit-click-handler", "onClick={()=>void requestPwaInstall()}", "the install button must use an explicit click handler");
  if (/data-pwa-install-button="true"[^>]*disabled=/.test(pageSource)) addFailure(errors, "ui-button-disabled-contract", "the explicit install button must not be repurposed as an always-disabled affordance");
  requirePattern(pageSource, errors, "ui-installed-copy", /アプリとして起動中/, "installed/standalone state must be disclosed");
  requirePattern(pageSource, errors, "ui-unsupported-copy", /共有メニューやブラウザメニューから追加できる場合があります/, "unsupported or uncaptured state needs a quiet browser-menu instruction");
  requirePattern(pageSource, errors, "ui-boundary-copy", /一度開いた同一サイトの教材を利用時に保存します[。。]教材画像を約92MB一括保存するものではありません[。。]未訪問の教材や保存を削除した後は通信が必要です/, "offline boundary copy must explain per-site use, no 92MB bulk save, and retry network needs");
  requirePattern(pageSource, errors, "ui-feedback-state", /pwaInstallFeedback.*status.*accepted|pwaInstallFeedback.*status.*dismissed|pwaInstallFeedback.*status.*error/, "accepted/dismissed/error must be represented as transient UI state");
  for (const status of RESULT_STATUSES) requirePattern(pageSource, errors, "ui-feedback-copy", new RegExp(`${status}:`), `UI must handle ${status} install result`);
  requirePattern(pageSource, errors, "ui-feedback-timeout", "setTimeout(()=>setPwaInstallFeedback(null),5000)", "install result feedback must be transient");
  const requestStart = pageSource.indexOf("async function requestPwaInstall()");
  const requestEnd = pageSource.indexOf("function openPhoneSettings", requestStart);
  if (requestStart >= 0 && requestEnd > requestStart && FORBIDDEN_SIDE_EFFECTS.test(pageSource.slice(requestStart, requestEnd))) addFailure(errors, "ui-handler-side-effect", "install click handler must not add storage, analytics, network, user-agent, or personal-data APIs");
  requirePattern(cssSource, errors, "ui-44px", /\.pwaInstallButton \{[^}]*min-height:\s*44px/, "install button must be at least 44px high");
  requirePattern(cssSource, errors, "ui-mobile-44px", /@media\(max-width:760px\)[\s\S]*?\.pwaInstallButton\{[^}]*min-height:44px/, "small-screen install button must retain a 44px target");
  requirePattern(indexSource, errors, "base-path-icon", /<link rel="apple-touch-icon" sizes="192x192" href="%BASE_URL%icon-192\.png" \/>/, "apple touch icon must use Vite's base-path placeholder");
}

function auditExistingPwaContracts(manifestSource, serviceWorkerSource, pwaBuildSource, errors) {
  let manifest;
  try {
    manifest = JSON.parse(manifestSource);
  } catch {
    addFailure(errors, "manifest-json", "manifest must remain valid JSON");
    manifest = {};
  }
  if (manifest.start_url !== ".") addFailure(errors, "manifest-start", "existing manifest start_url must remain base-path-relative '.'");
  if (manifest.scope !== ".") addFailure(errors, "manifest-scope", "existing manifest scope must remain base-path-relative '.'");
  if (manifest.display !== "standalone") addFailure(errors, "manifest-display", "existing manifest display mode must remain standalone");
  if (!Array.isArray(manifest.icons) || !manifest.icons.some(icon => icon?.src === "icon-192.png" && icon?.sizes === "192x192" && icon?.type === "image/png")) addFailure(errors, "manifest-icon", "existing manifest must retain the 192x192 PNG icon");

  requirePattern(serviceWorkerSource, errors, "sw-production", /import\.meta\.env\.PROD/, "service worker registration must remain production-only");
  requirePattern(serviceWorkerSource, errors, "sw-base", /import\.meta\.env\.BASE_URL/, "service worker registration must retain BASE_URL");
  requirePattern(serviceWorkerSource, errors, "sw-register", /service-worker\.js`, \{ scope: baseUrl \}/, "service worker registration path and scope must remain unchanged");
  requirePattern(serviceWorkerSource, errors, "sw-nonfatal", /\.catch\(\(\) =>/, "service worker registration failure must remain non-fatal");
  if (/skipWaiting/.test(serviceWorkerSource)) addFailure(errors, "sw-update-policy", "install affordance must not introduce skipWaiting/update-policy changes");

  requirePattern(pwaBuildSource, errors, "cache-shell", /const shellFiles = \["\.\/", "\.\/favicon\.svg", "\.\/manifest\.webmanifest", \.\.\.generatedShellFiles\];/, "existing shell cache set must remain bounded and unchanged");
  requirePattern(pwaBuildSource, errors, "cache-revision", /hashPublicDirectory\(revisionHash, publicDirectory\)/, "public assets must remain part of the release revision hash");
  requirePattern(pwaBuildSource, errors, "cache-install", /await cache\.addAll\(SHELL_FILES\.map\(scopeUrl\)\)/, "shell cache installation contract must remain unchanged");
  requirePattern(pwaBuildSource, errors, "cache-activate", /names\.filter\(name\s*=>\s*name\.startsWith\(CACHE_PREFIX\)&&name!==SHELL_CACHE&&name!==DATA_CACHE\)\.map\(name\s*=>\s*caches\.delete\(name\)\)/, "old cache cleanup/update policy must remain unchanged");
  requirePattern(pwaBuildSource, errors, "cache-request-policy", /request\.method!=="GET"|request\.headers\.has\("range"\)|url\.origin!==scope\.origin|url\.pathname\.includes\("\/cdn-cgi\/"\)/, "existing request/cache boundary must remain in the service worker");
  requirePattern(pwaBuildSource, errors, "cache-runtime", /cacheFirst\(request,SHELL_CACHE\)[\s\S]*?cacheFirst\(request,DATA_CACHE\)/, "existing shell/data runtime cache split must remain unchanged");
  if (/beforeinstallprompt|appinstalled|event\.prompt/.test(pwaBuildSource)) addFailure(errors, "worker-install-leak", "install prompt handling must remain outside the service worker/cache generator");
}

export function auditPwaInstallAffordanceSource({
  pageSource,
  cssSource,
  indexSource,
  affordanceSource,
  affordanceTypes,
  manifestSource,
  serviceWorkerSource,
  pwaBuildSource,
}) {
  const errors = [];
  for (const [name, source] of Object.entries({ pageSource, cssSource, indexSource, affordanceSource, affordanceTypes, manifestSource, serviceWorkerSource, pwaBuildSource })) {
    if (typeof source !== "string") addFailure(errors, "missing-source", `${name} must be supplied to the independent audit`);
  }
  if (errors.length) return { schemaVersion: PWA_INSTALL_AFFORDANCE_AUDIT_SCHEMA_VERSION, ok: false, errors, summary: {} };
  auditAffordanceModule(affordanceSource, affordanceTypes, errors);
  auditHomeUi(pageSource, cssSource, indexSource, errors);
  auditExistingPwaContracts(manifestSource, serviceWorkerSource, pwaBuildSource, errors);
  return {
    schemaVersion: PWA_INSTALL_AFFORDANCE_AUDIT_SCHEMA_VERSION,
    ok: errors.length === 0,
    errors,
    summary: {
      stateKeys: [...STATE_KEYS],
      resultStatuses: [...RESULT_STATUSES],
      promptPolicy: "capture and preventDefault; prompt only from explicit requestInstall click; consume accepted/dismissed/error event",
      installStateCopy: "installed/standalone, uncaptured/unsupported browser-menu guidance",
      offlineBoundary: "same-site visited resources may be cached by the existing service worker; no 92MB bulk save; unvisited or deleted resources need network",
      cachePolicy: "existing manifest/service-worker/runtime-cache/revision/update contracts retained",
      privacy: "no new storage, analytics, network, user-agent, or personal-data handling",
      browserVerification: "この静的監査コマンドは実ブラウザを実行しない",
    },
  };
}

export function auditPwaInstallAffordance(root = REPOSITORY_ROOT) {
  return auditPwaInstallAffordanceSource({
    pageSource: readText(root, "app/page.tsx"),
    cssSource: readText(root, "app/canvas.css"),
    indexSource: readText(root, "index.html"),
    affordanceSource: readText(root, "src/pwaInstallAffordance.mjs"),
    affordanceTypes: readText(root, "src/pwaInstallAffordance.d.mts"),
    manifestSource: readText(root, "public/manifest.webmanifest"),
    serviceWorkerSource: readText(root, "src/pwa.ts"),
    pwaBuildSource: readText(root, "build/pwa-vite-plugin.ts"),
  });
}

function usage() {
  return [
    "Usage:",
    "  node scripts/audit_pwa_install_affordance.mjs [--output path]",
    "",
    "Audits the explicit PWA install affordance and preserves existing PWA cache/update contracts.",
  ].join("\n");
}

function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(usage());
    return;
  }
  const outputIndex = process.argv.indexOf("--output");
  const output = outputIndex >= 0 ? process.argv[outputIndex + 1] : null;
  if (outputIndex >= 0 && (!output || output.startsWith("--"))) {
    console.error("--output requires a file path");
    process.exitCode = 2;
    return;
  }
  const report = auditPwaInstallAffordance();
  const serialized = `${JSON.stringify(report, null, 2)}\n`;
  if (output) fs.writeFileSync(path.resolve(output), serialized, "utf8");
  process.stdout.write(serialized);
  if (!report.ok) process.exitCode = 1;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) main();
