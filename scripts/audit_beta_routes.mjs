#!/usr/bin/env node

/**
 * Audit every canonical local beta route through one isolated Chrome profile
 * per viewport. The CDP client, navigation, readiness probes, and block
 * specimen preparation are shared with measure_browser_performance.mjs.
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
  prepareRoute,
  waitForDocumentReady,
} from "./measure_browser_performance.mjs";

export const BETA_ROUTE_AUDIT_SCHEMA_VERSION = 1;
export const BETA_PUBLIC_READONLY_BASE_URL = "https://bonnginn.github.io/brain-practical-navi/";
export const BETA_AUDIT_MODES = Object.freeze(["loopback", "public-readonly"]);
export const BETA_AUDIT_PHASES = Object.freeze(["direct", "reload"]);
export const BETA_AUDIT_VIEWPORTS = Object.freeze([
  Object.freeze({ id: "pc", label: "PC", width: 1366, height: 768 }),
  Object.freeze({ id: "tablet-landscape", label: "tablet landscape", width: 1024, height: 768 }),
  Object.freeze({ id: "mobile", label: "mobile", width: 390, height: 768 }),
]);

const NO_CANVAS = Object.freeze({ pc: 0, "tablet-landscape": 0, mobile: 0 });
const ONE_CANVAS = Object.freeze({ pc: 1, "tablet-landscape": 1, mobile: 1 });
const TWO_CANVAS = Object.freeze({ pc: 2, "tablet-landscape": 2, mobile: 2 });
const SECTION_CANVAS = Object.freeze({ pc: 3, "tablet-landscape": 3, mobile: 1 });
const CANONICAL_ROUTE_FRAGMENT_PATTERN = /^#workspace\/[a-z0-9-]+(?:\/[a-z0-9-]+)*$/;

export function validateRouteFragment(route) {
  if (typeof route !== "string" || !CANONICAL_ROUTE_FRAGMENT_PATTERN.test(route)) {
    throw new Error(`route must be a canonical #workspace/... fragment without a scheme, //, query, or external path: ${String(route)}`);
  }
  return route;
}

export function validateAuditBaseUrl(baseUrl, { publicReadonly = false } = {}) {
  let url;
  try {
    url = new URL(String(baseUrl));
  } catch {
    throw new Error(`--base-url must be an absolute URL: ${String(baseUrl)}`);
  }
  if (!/^https?:$/.test(url.protocol)) throw new Error("--base-url must use http or https");
  if (publicReadonly) {
    const exactPublicBase = url.protocol === "https:"
      && url.hostname === "bonnginn.github.io"
      && url.port === ""
      && url.username === ""
      && url.password === ""
      && url.pathname === "/brain-practical-navi/"
      && url.search === ""
      && url.hash === ""
      && url.href === BETA_PUBLIC_READONLY_BASE_URL;
    if (!exactPublicBase) throw new Error(`--base-url must exactly equal ${BETA_PUBLIC_READONLY_BASE_URL} when --public-readonly is set`);
    return url;
  }
  const hostname = url.hostname.toLowerCase();
  const loopback = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]" || hostname === "::1";
  if (!loopback) throw new Error("--base-url must point to localhost or a loopback address; use --public-readonly only for the exact public base");
  return url;
}

export function createAuditRouteResolver(baseUrl, { publicReadonly = false } = {}) {
  const validatedBase = validateAuditBaseUrl(baseUrl, { publicReadonly });
  return route => {
    const fragment = validateRouteFragment(route);
    const resolved = new URL(fragment, validatedBase);
    if (resolved.origin !== validatedBase.origin
      || resolved.pathname !== validatedBase.pathname
      || resolved.search !== ""
      || resolved.hash !== fragment) {
      throw new Error(`resolved route escaped the validated base or changed its hash: ${fragment}`);
    }
    return resolved.href;
  };
}

export function resolveAuditRoute(baseUrl, route, options = {}) {
  return createAuditRouteResolver(baseUrl, options)(route);
}

function isSuccessfulMainDocumentStatus(status) {
  return Number.isInteger(status) && status >= 200 && status < 300;
}

function expectedMainDocumentUrl(routeUrl) {
  if (typeof routeUrl !== "string") return null;
  try {
    const url = new URL(routeUrl);
    url.hash = "";
    return url.href;
  } catch {
    return null;
  }
}

function isExpectedMainDocumentResponse(response, routeUrl) {
  return isSuccessfulMainDocumentStatus(response?.status)
    && response?.url === expectedMainDocumentUrl(routeUrl);
}

export function attachMainDocumentStatusObserver(cdp, state) {
  const requestRemover = cdp.on("Network.requestWillBeSent", params => {
    if (!state.collecting || params?.type !== "Document") return;
    // The first Document request in a collection window is the top-level
    // navigation. Keeping its request id prevents an iframe document from
    // replacing the main-document status evidence.
    if (state.mainDocumentRequestId === null || state.mainDocumentRequestId === undefined) {
      state.mainDocumentRequestId = String(params.requestId);
    }
  });
  const responseRemover = cdp.on("Network.responseReceived", params => {
    if (!state.collecting || params?.type !== "Document") return;
    const requestId = String(params.requestId);
    if (state.mainDocumentRequestId !== requestId) return;
    const response = params.response || {};
    const numericStatus = Number(response.status);
    state.mainDocumentResponse = {
      requestId,
      type: "Document",
      url: typeof response.url === "string" ? response.url : null,
      status: Number.isInteger(numericStatus) ? numericStatus : null,
      statusText: typeof response.statusText === "string" ? response.statusText : null,
    };
  });
  return () => {
    requestRemover();
    responseRemover();
  };
}

function routeSpec({ id, hash, identitySelector, identityText, canvas, prepare = "none" }) {
  return Object.freeze({
    id,
    hash,
    identity: Object.freeze({ selector: identitySelector, text: identityText }),
    canvas,
    prepare,
  });
}

export const BETA_AUDIT_ROUTES = Object.freeze([
  routeSpec({ id: "home", hash: "#workspace/home", identitySelector: ".homeNotice h1", identityText: "脳実習ナビ", canvas: NO_CANVAS }),
  routeSpec({ id: "surface-lateral", hash: "#workspace/surface/lateral", identitySelector: ".learningGuide h2", identityText: "左外側面", canvas: ONE_CANVAS }),
  routeSpec({ id: "surface-superior", hash: "#workspace/surface/superior", identitySelector: ".learningGuide h2", identityText: "上面", canvas: ONE_CANVAS }),
  routeSpec({ id: "surface-inferior", hash: "#workspace/surface/inferior", identitySelector: ".learningGuide h2", identityText: "下面", canvas: ONE_CANVAS }),
  routeSpec({ id: "surface-medial", hash: "#workspace/surface/medial", identitySelector: ".learningGuide h2", identityText: "左半球・内側面", canvas: ONE_CANVAS }),
  routeSpec({ id: "surface-arteries", hash: "#workspace/surface/arteries", identitySelector: ".learningGuide h2", identityText: "脳底の主要動脈", canvas: ONE_CANVAS }),
  routeSpec({ id: "surface-nerves", hash: "#workspace/surface/nerves", identitySelector: ".learningGuide h2", identityText: "脳神経・脳幹", canvas: ONE_CANVAS }),
  routeSpec({ id: "surface-free", hash: "#workspace/surface/free", identitySelector: ".learningGuide h2", identityText: "自由観察", canvas: ONE_CANVAS }),
  routeSpec({ id: "sections-coronal", hash: "#workspace/sections/coronal", identitySelector: ".slicePanel .panelHead b", identityText: "冠状断", canvas: SECTION_CANVAS }),
  routeSpec({ id: "sections-horizontal", hash: "#workspace/sections/horizontal", identitySelector: ".slicePanel .panelHead b", identityText: "水平断", canvas: SECTION_CANVAS }),
  routeSpec({ id: "sections-sagittal", hash: "#workspace/sections/sagittal", identitySelector: ".slicePanel .panelHead b", identityText: "矢状断", canvas: SECTION_CANVAS }),
  routeSpec({ id: "blocks-lateral-ventricle", hash: "#workspace/blocks/lateral-ventricle", identitySelector: ".learningModelCard .panelHead b", identityText: "側脳室の全景", canvas: ONE_CANVAS, prepare: "block" }),
  routeSpec({ id: "blocks-diencephalon", hash: "#workspace/blocks/diencephalon", identitySelector: ".learningModelCard .panelHead b", identityText: "視床・視床下部標本", canvas: ONE_CANVAS, prepare: "block" }),
  routeSpec({ id: "blocks-radiations", hash: "#workspace/blocks/radiations", identitySelector: ".learningModelCard .panelHead b", identityText: "レンズ核・投射線維", canvas: ONE_CANVAS, prepare: "block" }),
  routeSpec({ id: "blocks-commissural-system", hash: "#workspace/blocks/commissural-system", identitySelector: ".learningModelCard .panelHead b", identityText: "脳梁・脳弓標本", canvas: ONE_CANVAS, prepare: "block" }),
  routeSpec({ id: "blocks-choroid-plexus", hash: "#workspace/blocks/choroid-plexus", identitySelector: ".learningModelCard .panelHead b", identityText: "脈絡叢を開く", canvas: ONE_CANVAS, prepare: "block" }),
  routeSpec({ id: "blocks-medial-temporal", hash: "#workspace/blocks/medial-temporal", identitySelector: ".learningModelCard .panelHead b", identityText: "海馬・扁桃体標本", canvas: ONE_CANVAS, prepare: "block" }),
  routeSpec({ id: "blocks-midbrain-section", hash: "#workspace/blocks/midbrain-section", identitySelector: ".learningModelCard .panelHead b", identityText: "中脳核・大脳脚標本", canvas: ONE_CANVAS, prepare: "block" }),
  routeSpec({ id: "blocks-hindbrain", hash: "#workspace/blocks/hindbrain", identitySelector: ".learningModelCard .panelHead b", identityText: "脳幹・小脳の脱着", canvas: ONE_CANVAS, prepare: "block" }),
  routeSpec({ id: "quiz", hash: "#workspace/quiz", identitySelector: ".quizArea .workHead h1", identityText: "復習クイズ", canvas: ONE_CANVAS }),
  routeSpec({ id: "collaborate", hash: "#workspace/collaborate", identitySelector: ".collaborationArea .workHead h1", identityText: "共同制作", canvas: NO_CANVAS }),
  routeSpec({ id: "collaborate-model-strategy", hash: "#workspace/collaborate/model-strategy", identitySelector: ".modelStrategyHead h2", identityText: "3Dモデル方針 A/B比較", canvas: TWO_CANVAS }),
  routeSpec({ id: "segment", hash: "#workspace/segment", identitySelector: ".segmentationArea .workHead h1", identityText: "セグメンテーション編集", canvas: ONE_CANVAS }),
  routeSpec({ id: "status", hash: "#workspace/status", identitySelector: ".betaStatusDialog h2", identityText: "更新履歴・既知の制限", canvas: NO_CANVAS }),
  routeSpec({ id: "help", hash: "#workspace/help", identitySelector: ".helpDialog h2", identityText: "操作ガイド", canvas: NO_CANVAS }),
  routeSpec({ id: "feedback", hash: "#workspace/feedback", identitySelector: ".feedbackDialog h2", identityText: "匿名の意見・誤り報告", canvas: NO_CANVAS }),
  routeSpec({ id: "legal", hash: "#workspace/legal", identitySelector: ".legalDialog h2", identityText: "利用条件・データ・クレジット", canvas: NO_CANVAS }),
]);

export const BETA_AUDIT_EXPECTED_CHECKS = BETA_AUDIT_ROUTES.length * BETA_AUDIT_VIEWPORTS.length * BETA_AUDIT_PHASES.length;

function usage() {
  return [
    "Usage:",
    "  node scripts/audit_beta_routes.mjs \\",
    "    --base-url http://localhost:4173 \\",
    "    --output work/browser-audit/beta-route-audit.json",
    "",
    "  # Explicit read-only public-host audit (no writes or form interactions)",
    "  node scripts/audit_beta_routes.mjs \\",
    `    --base-url ${BETA_PUBLIC_READONLY_BASE_URL} \\`,
    "    --public-readonly \\",
    "    --output work/browser-audit/beta-route-audit-public.json",
    "",
    "Required options: --base-url, --output",
    `Optional: --public-readonly (only with exact ${BETA_PUBLIC_READONLY_BASE_URL}; default is loopback-only)`,
  ].join("\n");
}

function argumentValue(argv, index, name) {
  const token = argv[index];
  const prefix = `${name}=`;
  if (token.startsWith(prefix)) return { value: token.slice(prefix.length), nextIndex: index };
  if (index + 1 >= argv.length || argv[index + 1].startsWith("--")) throw new Error(`${name} requires a value`);
  return { value: argv[index + 1], nextIndex: index + 1 };
}

export function parseAuditArgs(argv) {
  const options = { baseUrl: null, output: null, publicReadonly: false, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--help" || token === "-h") {
      options.help = true;
      continue;
    }
    if (token === "--public-readonly") {
      options.publicReadonly = true;
      continue;
    }
    const name = ["--base-url", "--output"].find(candidate => token === candidate || token.startsWith(`${candidate}=`));
    if (!name) throw new Error(`unknown option: ${token}`);
    const parsed = argumentValue(argv, index, name);
    index = parsed.nextIndex;
    if (name === "--base-url") options.baseUrl = parsed.value;
    else options.output = parsed.value;
  }
  if (options.help) return options;
  const missing = ["baseUrl", "output"].filter(key => options[key] === null || options[key] === "");
  if (missing.length) throw new Error(`missing required option(s): ${missing.map(key => `--${key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}`).join(", ")}`);
  validateAuditBaseUrl(options.baseUrl, { publicReadonly: options.publicReadonly });
  return options;
}

export function buildBetaAuditMatrix({ routes = BETA_AUDIT_ROUTES, viewports = BETA_AUDIT_VIEWPORTS, phases = BETA_AUDIT_PHASES } = {}) {
  const matrix = [];
  for (const viewport of viewports) {
    for (const route of routes) {
      for (const phase of phases) {
        matrix.push({
          key: `${route.id}-${viewport.id}-${phase}`,
          routeId: route.id,
          hash: route.hash,
          viewportId: viewport.id,
          width: viewport.width,
          height: viewport.height,
          phase,
        });
      }
    }
  }
  return matrix;
}

export function expectedCanvasCount(route, viewport) {
  return route.canvas?.[viewport.id] ?? 0;
}

export function auditProbeExpression(route) {
  const selector = JSON.stringify(route.identity.selector);
  return `(() => {
    const documentElement = document.documentElement;
    const body = document.body;
    const identityElement = document.querySelector(${selector});
    const clientWidth = documentElement?.clientWidth ?? window.innerWidth;
    const scrollWidth = Math.max(documentElement?.scrollWidth ?? 0, body?.scrollWidth ?? 0);
    const uiErrors = [...document.querySelectorAll(".atlasLoading.error,.segLoading.error,[role=alert]")].map(element => (element.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 240));
    return {
      readyState: document.readyState,
      hash: window.location.hash,
      title: document.title,
      identityPresent: Boolean(identityElement),
      identityText: (identityElement?.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 400),
      appRootPresent: Boolean(document.querySelector("main.appShell")),
      loadingCount: document.querySelectorAll(".atlasLoading:not(.error),.segLoading:not(.error)").length,
      uiErrors,
      canvasCount: document.querySelectorAll("canvas").length,
      webglFallback: Boolean(document.querySelector(".atlasWebglFallback")),
      clientWidth,
      scrollWidth,
      horizontalOverflow: scrollWidth > clientWidth + 1,
    };
  })()`;
}

function probeCoreReady(probe, route, viewport) {
  return probe?.readyState === "complete"
    && probe.hash === route.hash
    && probe.appRootPresent === true
    && probe.loadingCount === 0
    && probe.identityPresent === true
    && probe.identityText === route.identity.text
    && probe.canvasCount === expectedCanvasCount(route, viewport);
}

export function probeReadyForContract(probe, route, viewport) {
  return probeCoreReady(probe, route, viewport)
    && probe?.readyState === "complete"
    && Array.isArray(probe.uiErrors)
    && probe.uiErrors.length === 0
    && probe.horizontalOverflow === false
    && probe.webglFallback === false;
}

const AUDIT_STABLE_QUIET_MS = 500;
const AUDIT_STABLE_TIMEOUT_MS = 60_000;

class AuditStabilityError extends Error {
  constructor(message, probe = null) {
    super(message);
    this.name = "AuditStabilityError";
    this.probe = probe;
  }
}

function auditProbeFailureNames(probe, route, viewport, mainDocumentResponse = undefined) {
  const failures = [];
  if (!probe) return ["probe-missing"];
  if (probe.readyState !== "complete") failures.push("document-not-ready");
  if (probe.hash !== route.hash) failures.push("hash-mismatch");
  if (!probe.appRootPresent) failures.push("app-root-missing");
  if (!probe.identityPresent) failures.push("identity-missing");
  if (probe.identityPresent && probe.identityText !== route.identity.text) failures.push("identity-mismatch");
  if (probe.loadingCount !== 0) failures.push("loader-visible");
  if (!Array.isArray(probe.uiErrors)) failures.push("ui-errors-missing");
  else if (probe.uiErrors.length) failures.push("ui-errors");
  if (probe.horizontalOverflow !== false) failures.push("horizontal-overflow");
  if (probe.webglFallback !== false) failures.push("webgl-fallback");
  if (probe.canvasCount !== expectedCanvasCount(route, viewport)) failures.push(`canvas-count:${probe.canvasCount}!=${expectedCanvasCount(route, viewport)}`);
  if (mainDocumentResponse !== undefined && !isSuccessfulMainDocumentStatus(mainDocumentResponse?.status)) failures.push("main-document-status");
  return failures;
}

async function auditSleep(milliseconds) {
  await new Promise(resolvePromise => setTimeout(resolvePromise, milliseconds));
}

export async function waitForAuditStable(cdp, state, route, viewport, {
  timeoutMs = AUDIT_STABLE_TIMEOUT_MS,
  quietMs = AUDIT_STABLE_QUIET_MS,
  evaluateFn = evaluate,
  sleepFn = auditSleep,
} = {}) {
  const deadline = Date.now() + timeoutMs;
  let latest = null;
  let quietSince = null;
  let failedQuietSince = null;
  while (Date.now() < deadline) {
    try {
      latest = await evaluateFn(cdp, auditProbeExpression(route));
    } catch {
      quietSince = null;
      failedQuietSince = null;
      await sleepFn(50);
      continue;
    }
    const noInFlight = state?.inFlight?.size === 0;
    const statusEvidenceRequired = Object.prototype.hasOwnProperty.call(state || {}, "mainDocumentResponse");
    const mainDocumentReady = !statusEvidenceRequired || isSuccessfulMainDocumentStatus(state.mainDocumentResponse?.status);
    if (probeReadyForContract(latest, route, viewport) && noInFlight && mainDocumentReady) {
      if (quietSince === null) quietSince = Date.now();
      failedQuietSince = null;
      if (Date.now() - quietSince >= quietMs) return latest;
    } else {
      quietSince = null;
      // A fully rendered route with a persistent UI/overflow/WebGL contract
      // failure should be recorded promptly instead of burning the full timeout.
      if (probeCoreReady(latest, route, viewport) && noInFlight) {
        if (failedQuietSince === null) failedQuietSince = Date.now();
        if (Date.now() - failedQuietSince >= quietMs) {
          throw new AuditStabilityError(`audit contract failed: ${auditProbeFailureNames(latest, route, viewport, statusEvidenceRequired ? state.mainDocumentResponse : undefined).join(", ")}`, latest);
        }
      } else {
        failedQuietSince = null;
      }
    }
    await sleepFn(50);
  }
  const statusEvidenceRequired = Object.prototype.hasOwnProperty.call(state || {}, "mainDocumentResponse");
  throw new AuditStabilityError(`audit route did not become stable${latest ? ` (${auditProbeFailureNames(latest, route, viewport, statusEvidenceRequired ? state.mainDocumentResponse : undefined).join(", ")})` : ""}`, latest);
}

export function validateAuditCheck({ route, viewport, probe = null, consoleErrors = [], requestErrors = [], error = null, mainDocumentResponse = null, expectedUrl = null } = {}) {
  const failures = [];
  if (!route) failures.push("route-missing");
  if (!viewport) failures.push("viewport-missing");
  const expectedCanvas = route && viewport ? expectedCanvasCount(route, viewport) : null;
  const uiErrors = Array.isArray(probe?.uiErrors) ? probe.uiErrors : [];
  if (error) failures.push("runtime-error");
  if (!probe) failures.push("probe-missing");
  if (probe && probe.readyState !== "complete") failures.push("document-not-ready");
  if (probe && route && probe.hash !== route.hash) failures.push("hash-mismatch");
  if (probe && !probe.appRootPresent) failures.push("app-root-missing");
  if (probe && !probe.identityPresent) failures.push("identity-missing");
  if (probe && route && probe.identityPresent && probe.identityText !== route.identity.text) failures.push("identity-mismatch");
  if (probe && probe.loadingCount !== 0) failures.push("loader-visible");
  if (probe && !Array.isArray(probe.uiErrors)) failures.push("ui-errors-missing");
  if (probe && uiErrors.length) failures.push("ui-errors");
  if (consoleErrors.length) failures.push("console-errors");
  if (requestErrors.length) failures.push("request-errors");
  if (probe && probe.horizontalOverflow !== false) failures.push("horizontal-overflow");
  if (probe && probe.webglFallback !== false) failures.push("webgl-fallback");
  if (probe && expectedCanvas !== null && probe.canvasCount !== expectedCanvas) failures.push(`canvas-count:${probe.canvasCount}!=${expectedCanvas}`);
  if (!isSuccessfulMainDocumentStatus(mainDocumentResponse?.status)) failures.push("main-document-status");
  if (expectedUrl !== null && mainDocumentResponse?.url !== expectedMainDocumentUrl(expectedUrl)) failures.push("main-document-url");
  return { passed: failures.length === 0, failures };
}

export function resetMeasurementState(state) {
  state.collecting = false;
  state.requests.clear();
  state.inFlight.clear();
  state.finished.clear();
  state.encodedBytes = 0;
  state.consoleErrors.length = 0;
  state.requestErrors.length = 0;
  if (Object.prototype.hasOwnProperty.call(state, "mainDocumentRequestId")) state.mainDocumentRequestId = null;
  if (Object.prototype.hasOwnProperty.call(state, "mainDocumentResponse")) state.mainDocumentResponse = null;
}

function browserInfo(session) {
  return {
    executable: session?.executable || null,
    product: session?.version?.Browser || null,
    userAgent: session?.version?.["User-Agent"] || null,
  };
}

function failedAuditCheck(entry, route, viewport, error, browser = null) {
  const message = error instanceof Error ? error.message : String(error);
  const validation = validateAuditCheck({ route, viewport, error: message, mainDocumentResponse: null });
  return {
    ...entry,
    route,
    viewport,
    browser,
    url: null,
    probe: null,
    mainDocumentResponse: null,
    consoleErrors: [],
    requestErrors: [],
    error: message,
    validation,
    passed: false,
  };
}

export async function collectBrowserAuditCheck(cdp, state, {
  baseUrl,
  publicReadonly = false,
  resolveRouteFn = null,
  entry,
  route,
  viewport,
  browser,
  dependencies = {},
} = {}) {
  const routeResolver = resolveRouteFn || createAuditRouteResolver(baseUrl, { publicReadonly });
  const url = routeResolver(route.hash);
  let probe = null;
  let error = null;
  const navigateFn = dependencies.navigate || navigate;
  const waitForDocumentReadyFn = dependencies.waitForDocumentReady || waitForDocumentReady;
  const prepareRouteFn = dependencies.prepareRoute || prepareRoute;
  const waitForAuditStableFn = dependencies.waitForAuditStable || waitForAuditStable;
  const reloadFn = dependencies.reload || (target => target.send("Page.reload", { ignoreCache: false }));
  resetMeasurementState(state);
  try {
    // Always leave the previous route through a completed about:blank
    // document. This makes direct and reload phases real document loads and
    // prevents a same-URL navigation from becoming a no-op.
    await navigateFn(cdp, "about:blank");
    await waitForDocumentReadyFn(cdp);
    resetMeasurementState(state);

    if (entry.phase === "reload") {
      // Prime the exact route while collecting setup activity into the
      // observer-attached state. The activity is discarded after the route
      // contract settles, before the measured Page.reload begins.
      state.collecting = true;
      await navigateFn(cdp, url);
      await waitForDocumentReadyFn(cdp);
      await prepareRouteFn(cdp, route.hash);
      await waitForAuditStableFn(cdp, state, route, viewport, { phase: "setup", entry });
      // Setup requests, console errors, and byte counts are intentionally
      // discarded. The observer-attached state was still used so the setup
      // stability loop observed real in-flight network activity.
      state.collecting = false;
      resetMeasurementState(state);
      state.collecting = true;
      await reloadFn(cdp);
      await waitForDocumentReadyFn(cdp);
      await prepareRouteFn(cdp, route.hash);
    } else {
      state.collecting = true;
      await navigateFn(cdp, url);
      await waitForDocumentReadyFn(cdp);
      await prepareRouteFn(cdp, route.hash);
    }
    probe = await waitForAuditStableFn(cdp, state, route, viewport, { phase: entry.phase, entry });
  } catch (caught) {
    if (caught?.probe) probe = caught.probe;
    error = caught instanceof Error ? caught.message : String(caught);
  } finally {
    state.collecting = false;
  }
  const mainDocumentResponse = state.mainDocumentResponse ? { ...state.mainDocumentResponse } : null;
  const validation = validateAuditCheck({
    route,
    viewport,
    probe,
    consoleErrors: [...state.consoleErrors],
    requestErrors: [...state.requestErrors],
    error,
    mainDocumentResponse,
    expectedUrl: url,
  });
  return {
    ...entry,
    route,
    viewport,
    url,
    browser,
    probe,
    mainDocumentResponse,
    consoleErrors: [...state.consoleErrors],
    requestErrors: [...state.requestErrors],
    error,
    validation,
    passed: validation.passed,
  };
}

function collectAuditEnvironment() {
  return {
    os: { platform: platform(), release: release(), version: version(), arch: arch() },
    cpuCount: cpus().length,
    memoryBytes: { total: totalmem(), free: freemem() },
    nodeVersion: process.version,
  };
}

export async function runBetaRouteAudit(baseUrl, {
  publicReadonly = false,
  routes = BETA_AUDIT_ROUTES,
  viewports = BETA_AUDIT_VIEWPORTS,
  phases = BETA_AUDIT_PHASES,
  runCheck = null,
  onResult = null,
} = {}) {
  const resolveRouteFn = createAuditRouteResolver(baseUrl, { publicReadonly });
  const matrix = buildBetaAuditMatrix({ routes, viewports, phases });
  const results = [];
  if (typeof runCheck === "function") {
    for (const entry of matrix) {
      const route = routes.find(candidate => candidate.id === entry.routeId);
      const viewport = viewports.find(candidate => candidate.id === entry.viewportId);
      let result;
      try {
        result = await runCheck({ baseUrl, publicReadonly, resolveRoute: resolveRouteFn, entry, route, viewport });
      } catch (error) {
        result = failedAuditCheck(entry, route, viewport, error);
      }
      result = { ...result, ...entry, route, viewport };
      results.push(result);
      if (typeof onResult === "function") await onResult(result, entry);
    }
    return results;
  }

  for (const viewport of viewports) {
    const viewportEntries = matrix.filter(entry => entry.viewportId === viewport.id);
    let session = null;
    let detachObservers = () => {};
    let detachMainDocumentStatus = () => {};
    const state = createMeasurementState();
    state.mainDocumentRequestId = null;
    state.mainDocumentResponse = null;
    try {
      session = await launchChrome();
      detachObservers = attachObservers(session.cdp, state);
      detachMainDocumentStatus = attachMainDocumentStatusObserver(session.cdp, state);
      await configurePage(session.cdp);
      await session.cdp.send("Emulation.setDeviceMetricsOverride", {
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: 1,
        mobile: false,
      });
      await session.cdp.send("Network.setCacheDisabled", { cacheDisabled: false });
      try { await session.cdp.send("Network.clearBrowserCache"); } catch { /* best effort */ }
      const browser = browserInfo(session);
      for (const entry of viewportEntries) {
        const route = routes.find(candidate => candidate.id === entry.routeId);
        const result = await collectBrowserAuditCheck(session.cdp, state, { baseUrl, publicReadonly, resolveRouteFn, entry, route, viewport, browser });
        results.push(result);
        if (typeof onResult === "function") await onResult(result, entry);
      }
    } catch (error) {
      const browser = browserInfo(session);
      const completed = new Set(results.filter(result => result.viewportId === viewport.id).map(result => result.key));
      for (const entry of viewportEntries) {
        if (completed.has(entry.key)) continue;
        const route = routes.find(candidate => candidate.id === entry.routeId);
        const result = failedAuditCheck(entry, route, viewport, error, browser);
        results.push(result);
        if (typeof onResult === "function") await onResult(result, entry);
      }
    } finally {
      detachMainDocumentStatus();
      detachObservers();
      await closeChrome(session);
    }
  }
  return results;
}

export function expectedAuditResultUrl(result, routes, baseUrl, { publicReadonly = false } = {}) {
  const route = routes.find(candidate => candidate.id === result?.routeId);
  if (!route || result?.hash !== route.hash) return null;
  try {
    return resolveAuditRoute(baseUrl, route.hash, { publicReadonly });
  } catch {
    return null;
  }
}

export function aggregateBetaAuditReport({ baseUrl, publicReadonly = false, routes = BETA_AUDIT_ROUTES, viewports = BETA_AUDIT_VIEWPORTS, phases = BETA_AUDIT_PHASES, results = [], generatedAt = new Date().toISOString(), environment = collectAuditEnvironment() } = {}) {
  let baseUrlError = null;
  try {
    validateAuditBaseUrl(baseUrl, { publicReadonly });
  } catch (error) {
    baseUrlError = error instanceof Error ? error.message : String(error);
  }
  const matrix = buildBetaAuditMatrix({ routes, viewports, phases });
  const expectedKeys = matrix.map(entry => entry.key);
  const expectedSet = new Set(expectedKeys);
  const resultKeys = results.map(result => result?.key);
  const counts = new Map();
  for (const key of resultKeys) counts.set(key, (counts.get(key) || 0) + 1);
  const duplicateKeys = [...counts.entries()].filter(([, count]) => count > 1).map(([key]) => key);
  const missingKeys = expectedKeys.filter(key => !counts.has(key));
  const invalidUrlKeys = results
    .filter(result => result?.url !== expectedAuditResultUrl(result, routes, baseUrl, { publicReadonly }))
    .map(result => result?.key || "unknown");
  const invalidMainDocumentKeys = results
    .filter(result => !isExpectedMainDocumentResponse(result?.mainDocumentResponse, expectedAuditResultUrl(result, routes, baseUrl, { publicReadonly })))
    .map(result => result?.key || "unknown");
  const allPassed = results.length === matrix.length
    && baseUrlError === null
    && resultKeys.every(key => expectedSet.has(key))
    && duplicateKeys.length === 0
    && missingKeys.length === 0
    && invalidUrlKeys.length === 0
    && invalidMainDocumentKeys.length === 0
    && results.every(result => result?.passed === true && result?.validation?.passed === true);
  return {
    schemaVersion: BETA_ROUTE_AUDIT_SCHEMA_VERSION,
    generatedAt,
    tool: "scripts/audit_beta_routes.mjs",
    baseUrl,
    mode: publicReadonly ? "public-readonly" : "loopback",
    publicBoundary: publicReadonly ? BETA_PUBLIC_READONLY_BASE_URL : "loopback-only",
    baseValidation: { valid: baseUrlError === null, error: baseUrlError },
    environment,
    matrix: {
      routes: routes.map(route => ({ ...route, identity: { ...route.identity }, canvas: { ...route.canvas } })),
      viewports: viewports.map(viewport => ({ ...viewport })),
      phases: [...phases],
      expectedChecks: matrix.length,
      missingKeys,
      duplicateKeys,
      invalidUrlKeys,
      invalidMainDocumentKeys,
      results,
    },
    allPassed,
  };
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseAuditArgs(argv);
  if (args.help) {
    console.log(usage());
    return null;
  }
  const matrix = buildBetaAuditMatrix();
  const results = await runBetaRouteAudit(args.baseUrl, {
    publicReadonly: args.publicReadonly,
    onResult: result => console.log(`${result.key}: ${result.passed ? "passed" : "failed"}`),
  });
  const report = aggregateBetaAuditReport({ baseUrl: args.baseUrl, publicReadonly: args.publicReadonly, results });
  const outputPath = isAbsolute(args.output) ? args.output : resolve(args.output);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(outputPath);
  if (!report.allPassed) {
    const failed = report.matrix.results.filter(result => result?.passed !== true).map(result => result?.key || "unknown");
    console.error(`beta route audit failed: ${failed.join(", ")}`);
    process.exitCode = 1;
  }
  return report;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch(error => {
    console.error(`beta route audit failed: ${error.message}`);
    process.exitCode = 1;
  });
}
