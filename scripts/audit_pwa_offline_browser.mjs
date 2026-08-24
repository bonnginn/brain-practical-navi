/**
 * Local PWA cache/recovery audit.
 *
 * The audit owns the two static servers used by the run.  A stopped server is
 * the boundary under test; Chrome's navigator.onLine flag and an offline badge
 * are observations only and are deliberately not treated as proof of a
 * transport failure.  Cache Storage is preserved while the ordinary HTTP
 * cache is explicitly cleared and disabled.
 */

import { createReadStream } from "node:fs";
import { mkdir, stat, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { createConnection } from "node:net";
import { arch, cpus, freemem, platform, release, totalmem, version } from "node:os";
import { dirname, extname, isAbsolute, relative, resolve } from "node:path";
import { randomUUID } from "node:crypto";
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
  waitForDocumentReady,
  waitForRuntimeProbe,
} from "./measure_browser_performance.mjs";

export const PWA_OFFLINE_SCHEMA_VERSION = 2;
export const PWA_OFFLINE_TOOL = "scripts/audit_pwa_offline_browser.mjs";
export const PWA_AUDIT_VIEWPORT = Object.freeze({ width: 1366, height: 768, deviceScaleFactor: 1, mobile: false, touch: false });
export const PWA_EXPECTED_NODE_MAJOR = "24";
export const PWA_EXPECTED_CHROME_MAJOR = "151";
export const PWA_DEFAULT_HOST = "127.0.0.1";
export const PWA_DEFAULT_NORMAL_PORT = 4240;
export const PWA_DEFAULT_PAGES_PORT = 4241;
export const PWA_SHELL_ENTRY_COUNT = 5;
export const PWA_EXPECTED_UNVISITED_ASSET = "atlas/bigbrain-icbm500.bin.gz";

export const PWA_AUDIT_ROUTES = Object.freeze({
  home: "#workspace/home",
  visitedData: "#workspace/surface/lateral",
  unvisitedData: "#workspace/sections/horizontal",
});

export const PWA_AUDIT_ACTION_NAMES = Object.freeze([
  "online-shell",
  "online-home",
  "online-visited-data",
  "offline-targets",
  "offline-visited-direct",
  "offline-visited-reload",
  "offline-navigation-fallback",
  "offline-unvisited-error",
  "online-restore",
  "retry-unvisited",
]);

export const PWA_AUDIT_BASES = Object.freeze([
  Object.freeze({ id: "normal", basePath: "/", expectedPathname: "/" }),
  Object.freeze({ id: "pages", basePath: "/brain-practical-navi/", expectedPathname: "/brain-practical-navi/" }),
]);

export const PWA_NETWORK_POLICY = Object.freeze({
  serverControlled: true,
  pageNavigatorState: "observed-only",
  offlineBadgeRequired: false,
  ordinaryHttpCache: "clear-and-disable",
  cacheStoragePreserved: true,
  networkEmulation: false,
  serviceWorkerInterception: false,
});

const ISO_RE = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);
const MIME_TYPES = Object.freeze({
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".html": "text/html; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".gz": "application/octet-stream",
  ".bin": "application/octet-stream",
  ".nii": "application/octet-stream",
  ".mesh": "application/octet-stream",
});

function nowIso() { return new Date().toISOString(); }
function isIso(value) { return typeof value === "string" && ISO_RE.test(value) && !Number.isNaN(Date.parse(value)); }
function time(value) { const parsed = Date.parse(value); return Number.isFinite(parsed) ? parsed : NaN; }
function numeric(value) { return typeof value === "number" && Number.isFinite(value); }
function compactText(value) { return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, 300); }
function majorVersion(value) {
  const text = String(value ?? "");
  return text.match(/(?:Chrome|HeadlessChrome|Node)\/(\d+)/i)?.[1] || text.match(/^v?(\d+)/i)?.[1] || null;
}

export function canonicalBaseUrl(baseUrl) {
  const parsed = new URL(baseUrl);
  if (!/^https?:$/.test(parsed.protocol)) throw new Error("PWA audit base URL must use http or https");
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

function parsePort(value, name) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error(`${name} must be an integer from 1024 to 65535`);
  return port;
}

export function parsePwaOfflineArgs(argv) {
  const options = {
    normalBuildRoot: null,
    pagesBuildRoot: null,
    normalPort: PWA_DEFAULT_NORMAL_PORT,
    pagesPort: PWA_DEFAULT_PAGES_PORT,
    host: PWA_DEFAULT_HOST,
    output: null,
    help: false,
  };
  const names = ["--normal-build-root", "--pages-build-root", "--normal-port", "--pages-port", "--host", "--output"];
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--help" || token === "-h") { options.help = true; continue; }
    const name = names.find(candidate => token === candidate || token.startsWith(`${candidate}=`));
    if (!name) throw new Error(`unknown option: ${token}`);
    const parsed = argumentValue(argv, index, name);
    index = parsed.nextIndex;
    if (name === "--normal-build-root") options.normalBuildRoot = resolve(parsed.value);
    else if (name === "--pages-build-root") options.pagesBuildRoot = resolve(parsed.value);
    else if (name === "--normal-port") options.normalPort = parsePort(parsed.value, name);
    else if (name === "--pages-port") options.pagesPort = parsePort(parsed.value, name);
    else if (name === "--host") options.host = parsed.value;
    else options.output = resolve(parsed.value);
  }
  if (options.help) return options;
  const missing = ["normalBuildRoot", "pagesBuildRoot", "output"].filter(key => !options[key]);
  if (missing.length) throw new Error(`missing required option(s): ${missing.map(key => `--${key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}`).join(", ")}`);
  if (!LOOPBACK_HOSTS.has(options.host)) throw new Error("--host must be a loopback host");
  if (options.normalPort === options.pagesPort) throw new Error("normal and Pages ports must be distinct");
  return options;
}

export function buildPwaOfflineMatrix({ normalBuildRoot, pagesBuildRoot, normalPort = PWA_DEFAULT_NORMAL_PORT, pagesPort = PWA_DEFAULT_PAGES_PORT, host = PWA_DEFAULT_HOST } = {}) {
  if (!normalBuildRoot || !pagesBuildRoot) throw new Error("both build roots are required");
  if (!LOOPBACK_HOSTS.has(host)) throw new Error("PWA audit matrix must use a loopback host");
  if (normalPort === pagesPort) throw new Error("normal and Pages ports must be distinct");
  const roots = { normal: resolve(normalBuildRoot), pages: resolve(pagesBuildRoot) };
  const ports = { normal: parsePort(normalPort, "normalPort"), pages: parsePort(pagesPort, "pagesPort") };
  return PWA_AUDIT_BASES.map(base => {
    const baseUrl = canonicalBaseUrl(`http://${host}:${ports[base.id]}${base.basePath}`);
    return Object.freeze({
      ...base,
      key: base.id,
      host,
      port: ports[base.id],
      buildRoot: roots[base.id],
      baseUrl,
      expectedScopePath: base.basePath,
    });
  });
}

function pathInside(root, candidate) {
  const relativePath = relative(root, candidate);
  return relativePath === "" || (!relativePath.startsWith("..") && !isAbsolute(relativePath));
}

function requestPathForBase(urlPath, basePath) {
  if (basePath === "/") return urlPath || "/";
  if (urlPath === basePath.slice(0, -1) || urlPath === basePath) return "/";
  if (!urlPath.startsWith(basePath)) return null;
  return `/${urlPath.slice(basePath.length)}`;
}

/** Owns a static listener, request log, sockets, stop/refusal/relisten evidence. */
export function createStaticServerController({ root, basePath = "/", host = PWA_DEFAULT_HOST, port, runToken = randomUUID() } = {}) {
  if (!root || !port) throw new Error("static server root and port are required");
  const buildRoot = resolve(root);
  const normalizedBase = basePath.endsWith("/") ? basePath : `${basePath}/`;
  if (!normalizedBase.startsWith("/")) throw new Error("basePath must be absolute");
  const requestLog = [];
  const sockets = new Set();
  const starts = [];
  const stops = [];
  const refusals = [];
  const relistens = [];
  let listener = null;
  let listening = false;

  function baseForRequest() { return `http://${host}:${port}${normalizedBase}`; }

  async function serve(request, response) {
    const startedAt = nowIso();
    const parsed = new URL(request.url || "/", baseForRequest());
    const requestedPath = parsed.pathname;
    const relativeUrlPath = requestPathForBase(requestedPath, normalizedBase);
    const entry = {
      runToken,
      host,
      port,
      method: request.method || "GET",
      url: parsed.href,
      path: requestedPath,
      relativePath: relativeUrlPath,
      timestamp: startedAt,
      status: null,
      bytes: 0,
    };
    requestLog.push(entry);
    response.once("finish", () => { entry.status = response.statusCode; });
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.statusCode = 405;
      response.end();
      entry.status = 405;
      return;
    }
    if (!relativeUrlPath) {
      response.statusCode = 404;
      response.end();
      entry.status = 404;
      return;
    }
    let relativeFile = relativeUrlPath.replace(/^\/+/, "");
    if (!relativeFile || relativeFile.endsWith("/")) relativeFile = "index.html";
    let filePath = resolve(buildRoot, relativeFile);
    if (!pathInside(buildRoot, filePath)) {
      response.statusCode = 400;
      response.end();
      entry.status = 400;
      return;
    }
    let fileStats;
    try { fileStats = await stat(filePath); }
    catch {
      // Hash routes are client-side routes; an extensionless missing path is
      // served by the same index document, while missing assets remain 404.
      if (extname(relativeFile)) {
        response.statusCode = 404;
        response.end();
        entry.status = 404;
        return;
      }
      filePath = resolve(buildRoot, "index.html");
      try { fileStats = await stat(filePath); }
      catch {
        response.statusCode = 404;
        response.end();
        entry.status = 404;
        return;
      }
    }
    if (!fileStats.isFile()) {
      response.statusCode = 404;
      response.end();
      entry.status = 404;
      return;
    }
    response.statusCode = 200;
    response.setHeader("Content-Type", MIME_TYPES[extname(filePath).toLowerCase()] || "application/octet-stream");
    response.setHeader("Content-Length", String(fileStats.size));
    response.setHeader("Cache-Control", "no-store");
    entry.file = relative(buildRoot, filePath).replaceAll("\\", "/");
    entry.bytes = fileStats.size;
    if (request.method === "HEAD") { response.end(); return; }
    const stream = createReadStream(filePath);
    stream.on("error", () => {
      if (!response.headersSent) response.statusCode = 500;
      response.end();
      entry.status = 500;
    });
    stream.pipe(response);
  }

  function makeListener() {
    const server = createServer((request, response) => {
      void serve(request, response).catch(() => {
        if (!response.headersSent) response.statusCode = 500;
        response.end();
      });
    });
    server.on("connection", socket => {
      sockets.add(socket);
      socket.once("close", () => sockets.delete(socket));
    });
    return server;
  }

  async function listen(reason = "initial") {
    if (listening) throw new Error("static server is already listening");
    listener = makeListener();
    await new Promise((resolvePromise, reject) => {
      const onError = error => { listener?.off("listening", onListening); reject(error); };
      const onListening = () => { listener?.off("error", onError); resolvePromise(); };
      listener.once("error", onError);
      listener.once("listening", onListening);
      listener.listen(port, host);
    });
    listening = true;
    const evidence = { ack: true, reason, host, port, timestamp: nowIso(), runToken };
    starts.push(evidence);
    return evidence;
  }

  async function stop(reason = "network-stop") {
    const stoppedAt = nowIso();
    const current = listener;
    const tracked = sockets.size;
    if (current && listening) {
      await new Promise(resolvePromise => {
        current.close(() => resolvePromise());
        // A keep-alive connection can otherwise make close wait indefinitely;
        // the sockets are destroyed immediately after close is requested.
        for (const socket of sockets) socket.destroy();
      });
    }
    const destroyed = tracked;
    listener = null;
    listening = false;
    const evidence = { ack: true, reason, host, port, timestamp: stoppedAt, listenerClosed: true, socketsTracked: tracked, socketsDestroyed: destroyed, runToken };
    stops.push(evidence);
    return evidence;
  }

  async function verifyTcpRefused() {
    const checkedAt = nowIso();
    const result = await new Promise(resolvePromise => {
      const socket = createConnection({ host, port });
      let settled = false;
      const settle = value => { if (settled) return; settled = true; socket.destroy(); resolvePromise(value); };
      socket.once("connect", () => settle({ refused: false, code: "CONNECTED" }));
      socket.once("error", error => settle({ refused: error.code === "ECONNREFUSED", code: error.code || error.name || "UNKNOWN" }));
      setTimeout(() => settle({ refused: false, code: "TIMEOUT" }), 2_000).unref?.();
    });
    const evidence = { ...result, host, port, timestamp: checkedAt, runToken };
    refusals.push(evidence);
    return evidence;
  }

  async function relisten() { const refusal = refusals.at(-1); return listen("relisten-after-refusal").then(evidence => ({ ...evidence, afterRefusalAt: refusal?.timestamp || null })); }

  function snapshot() {
    return {
      runToken,
      buildRoot,
      basePath: normalizedBase,
      host,
      port,
      listening,
      starts: starts.map(value => ({ ...value })),
      stops: stops.map(value => ({ ...value })),
      refusals: refusals.map(value => ({ ...value })),
      relistens: relistens.map(value => ({ ...value })),
      requestLog: requestLog.map(value => ({ ...value })),
      socketCount: sockets.size,
    };
  }

  return {
    start: listen,
    stop,
    relisten: async () => { const evidence = await relisten(); relistens.push(evidence); return evidence; },
    verifyTcpRefused,
    async stopAndVerify(reason = "network-stop") { const stopped = await stop(reason); const refusal = await verifyTcpRefused(); return { stopped, refusal }; },
    isListening: () => listening,
    snapshot,
  };
}

export const PWA_HEALTH_PROBE = `(() => {
  const root = document.documentElement;
  const body = document.body;
  const text = element => (element?.textContent || "").replace(/\\s+/g, " ").trim();
  const alerts = [...document.querySelectorAll(".atlasLoading.error,.segLoading.error,[role=alert]")].map(element => ({ text: text(element).slice(0, 240), role: element.getAttribute("role"), className: typeof element.className === "string" ? element.className : "" }));
  const clientWidth = root?.clientWidth ?? window.innerWidth;
  const clientHeight = root?.clientHeight ?? window.innerHeight;
  const scrollWidth = Math.max(root?.scrollWidth ?? 0, body?.scrollWidth ?? 0);
  return {
    readyState: document.readyState,
    hash: window.location.hash,
    appRootPresent: Boolean(document.querySelector("main.appShell")),
    controllerUrl: navigator.serviceWorker?.controller?.scriptURL || null,
    navigatorOnLine: navigator.onLine,
    offlineStatusVisible: Boolean(document.querySelector("[data-offline],.offlineStatus,.networkOffline")),
    loadingCount: document.querySelectorAll(".atlasLoading:not(.error),.segLoading:not(.error)").length,
    uiErrors: alerts,
    errorVisible: Boolean(document.querySelector(".atlasLoading.error,.segLoading.error")),
    errorText: text(document.querySelector(".atlasLoading.error,.segLoading.error")),
    retryVisible: Boolean([...document.querySelectorAll("button")].find(button => /再読み込み|retry|再試行/i.test(text(button)))),
    retryText: [...document.querySelectorAll("button")].filter(button => /再読み込み|retry|再試行/i.test(text(button))).map(text),
    canvasCount: document.querySelectorAll("canvas").length,
    webglFallback: Boolean(document.querySelector(".atlasWebglFallback")),
    clientWidth,
    clientHeight,
    scrollWidth,
    horizontalOverflow: scrollWidth > clientWidth + 1,
    mainText: text(document.querySelector("main")).slice(0, 400),
  };
})()`;

export const PWA_SERVICE_WORKER_PROBE = `(() => navigator.serviceWorker?.getRegistration().then(registration => ({
  scope: registration?.scope || null,
  active: registration?.active?.state || null,
  scriptURL: registration?.active?.scriptURL || registration?.installing?.scriptURL || null,
  controllerUrl: navigator.serviceWorker?.controller?.scriptURL || null,
})) || Promise.resolve({ scope: null, active: null, scriptURL: null, controllerUrl: null }))()`;

export const PWA_CACHE_PROBE = `(() => caches.keys().then(async names => {
  const entries = {};
  for (const name of names) entries[name] = (await caches.open(name)).keys().then(requests => requests.map(request => request.url));
  const resolved = {};
  for (const [name, promise] of Object.entries(entries)) resolved[name] = await promise;
  return { names, entries: resolved, shellNames: names.filter(name => /shell/i.test(name)), dataNames: names.filter(name => /data/i.test(name)) };
}))()`;

function cacheUrls(cacheProbe) { return Object.values(cacheProbe?.entries || {}).flat(); }
function cacheUrlCount(cacheProbe, url) { return cacheUrls(cacheProbe).filter(candidate => candidate === url).length; }
function expectedAssetUrl(baseUrl) { return new URL(PWA_EXPECTED_UNVISITED_ASSET, canonicalBaseUrl(baseUrl)).href; }

export async function configureHttpCache(cdp) {
  const commands = [];
  const send = async (method, params) => {
    const entry = { method, params, targetType: "page", targetId: "page", sessionId: null, timestamp: nowIso(), ack: false };
    try { await cdp.send(method, params); entry.ack = true; }
    catch (error) { entry.error = error instanceof Error ? error.message : String(error); }
    commands.push(entry);
  };
  await send("Network.clearBrowserCache", {});
  await send("Network.setCacheDisabled", { cacheDisabled: true });
  return { commands, cacheStoragePreserved: true };
}

function healthPass(probe, hash, { minCanvas = 0, allowError = false } = {}) {
  return Boolean(probe && probe.readyState === "complete" && probe.hash === hash && probe.appRootPresent && probe.loadingCount === 0 && (allowError || probe.uiErrors?.length === 0) && probe.webglFallback !== true && probe.horizontalOverflow !== true && Number(probe.canvasCount) >= minCanvas && probe.mainText);
}

async function waitStable(cdp, state, hash, { minCanvas = 0, allowError = false, timeoutMs = 30_000 } = {}) {
  return waitForRuntimeProbe(cdp, PWA_HEALTH_PROBE, probe => healthPass(probe, hash, { minCanvas, allowError }) && state.inFlight.size === 0, timeoutMs);
}

async function waitError(cdp, hash, timeoutMs = 30_000) {
  return waitForRuntimeProbe(cdp, PWA_HEALTH_PROBE, probe => Boolean(probe?.readyState === "complete" && probe.hash === hash && probe.appRootPresent && probe.errorVisible && probe.retryVisible && probe.uiErrors?.length), timeoutMs);
}

async function probeServiceWorker(cdp) { return evaluate(cdp, PWA_SERVICE_WORKER_PROBE); }
async function probeCache(cdp) { return evaluate(cdp, PWA_CACHE_PROBE); }

async function basicOperation(cdp) {
  return evaluate(cdp, `(() => {
    const canvas = document.querySelector("canvas");
    if (!canvas) return { exercised: false, canvasCount: 0 };
    const rect = canvas.getBoundingClientRect();
    canvas.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2, pointerId: 1, pointerType: "mouse" }));
    canvas.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientX: rect.left + rect.width / 2 + 1, clientY: rect.top + rect.height / 2 + 1, pointerId: 1, pointerType: "mouse" }));
    return { exercised: true, canvasCount: document.querySelectorAll("canvas").length, width: rect.width, height: rect.height };
  })()`);
}

async function clickRetry(cdp) {
  return evaluate(cdp, `(() => {
    const text = element => (element?.textContent || "").replace(/\\s+/g, " ").trim();
    const button = [...document.querySelectorAll("button")].find(candidate => /再読み込み|retry|再試行/i.test(text(candidate)));
    if (!button) return { clicked: false, text: null };
    button.click();
    return { clicked: true, text: text(button) };
  })()`);
}

function traceFor(cdp) {
  const trace = { requests: [], responses: [], failures: [] };
  const remove = [
    cdp.on("Network.requestWillBeSent", params => trace.requests.push({ requestId: params.requestId, url: params.request?.url, method: params.request?.method, timestamp: nowIso() })),
    cdp.on("Network.responseReceived", params => trace.responses.push({ requestId: params.requestId, url: params.response?.url, status: params.response?.status, fromServiceWorker: Boolean(params.response?.fromServiceWorker), timestamp: nowIso() })),
    cdp.on("Network.loadingFailed", params => trace.failures.push({ requestId: params.requestId, url: params.errorText, canceled: params.canceled === true, timestamp: nowIso() })),
  ];
  return { trace, detach: () => remove.forEach(fn => fn()) };
}

function action(name, details) {
  const normalized = details && typeof details === "object" ? { ...details } : { value: details };
  if (name.startsWith("offline-")) normalized.observedAt ||= nowIso();
  return { name, details: normalized };
}

function environmentFor(session) {
  return {
    os: { platform: platform(), release: release(), version: version(), arch: arch() },
    cpuCount: cpus().length,
    memoryBytes: { total: totalmem(), free: freemem() },
    nodeVersion: process.version,
    browser: { executable: session?.executable || null, product: session?.version?.Browser || null, userAgent: session?.version?.["User-Agent"] || null },
  };
}

function freshState() {
  const state = createMeasurementState();
  state.collecting = true;
  return state;
}

export async function runPwaOfflineScenario(base, { timeoutMs = 30_000 } = {}) {
  const server = createStaticServerController({
    root: base.buildRoot,
    basePath: base.basePath,
    host: base.host,
    port: base.port,
  });
  const actions = [];
  const blockers = [];
  let session = null;
  let detachObservers = () => {};
  let traceListener = null;
  let state = null;
  let cacheBeforeStop = null;
  let cacheAfterRetry = null;
  let expected = expectedAssetUrl(base.baseUrl);
  let environment = null;
  try {
    await server.start("initial");
    session = await launchChrome();
    environment = environmentFor(session);
    await configurePage(session.cdp, { bypassServiceWorker: false });
    await session.cdp.send("Emulation.setDeviceMetricsOverride", { ...PWA_AUDIT_VIEWPORT });
    const httpCachePolicy = await configureHttpCache(session.cdp);
    state = freshState();
    detachObservers = attachObservers(session.cdp, state);
    traceListener = traceFor(session.cdp);
    const homeUrl = `${base.baseUrl}${PWA_AUDIT_ROUTES.home}`;
    const visitedUrl = `${base.baseUrl}${PWA_AUDIT_ROUTES.visitedData}`;
    const unvisitedUrl = `${base.baseUrl}${PWA_AUDIT_ROUTES.unvisitedData}`;

    await navigate(session.cdp, homeUrl);
    await waitStable(session.cdp, state, PWA_AUDIT_ROUTES.home, { minCanvas: 0, timeoutMs });
    const shellProbe = await evaluate(session.cdp, PWA_HEALTH_PROBE);
    const sw = await probeServiceWorker(session.cdp);
    const shellCache = await probeCache(session.cdp);
    actions.push(action("online-shell", { probe: shellProbe, serviceWorker: sw, cache: shellCache, shellEntryCount: PWA_SHELL_ENTRY_COUNT }));
    actions.push(action("online-home", { probe: shellProbe, url: homeUrl }));

    // Leave the online document before the stopped-server direct visit so
    // this is a real cached navigation, not a same-URL no-op.
    await navigate(session.cdp, "about:blank");
    await waitForDocumentReady(session.cdp, timeoutMs);
    await navigate(session.cdp, visitedUrl);
    await waitStable(session.cdp, state, PWA_AUDIT_ROUTES.visitedData, { minCanvas: 1, timeoutMs });
    const basic = await basicOperation(session.cdp);
    const visitedProbe = await evaluate(session.cdp, PWA_HEALTH_PROBE);
    const visitedCache = await probeCache(session.cdp);
    if (cacheUrls(visitedCache).includes(expected)) blockers.push("expected unvisited asset was cached before server stop");
    actions.push(action("online-visited-data", { probe: visitedProbe, basicOperation: basic, cache: visitedCache, expectedAsset: expected, expectedAssetAbsentBeforeStop: !cacheUrls(visitedCache).includes(expected), url: visitedUrl }));
    cacheBeforeStop = visitedCache;

    const stopEvidence = await server.stopAndVerify("network-stop");
    actions.push(action("offline-targets", { serverStop: stopEvidence.stopped, tcpRefusal: stopEvidence.refusal, httpCache: httpCachePolicy, cacheBeforeStop }));

    const offlineTrace = traceFor(session.cdp);
    await navigate(session.cdp, "about:blank");
    await waitForDocumentReady(session.cdp, timeoutMs);
    await navigate(session.cdp, visitedUrl);
    await waitStable(session.cdp, state, PWA_AUDIT_ROUTES.visitedData, { minCanvas: 1, timeoutMs });
    const offlineDirectProbe = await evaluate(session.cdp, PWA_HEALTH_PROBE);
    actions.push(action("offline-visited-direct", { probe: offlineDirectProbe, basicOperation: await basicOperation(session.cdp), serverPhase: { state: "stopped", unavailableAt: stopEvidence.refusal.timestamp }, network: offlineTrace.trace }));
    offlineTrace.detach();

    const reloadTrace = traceFor(session.cdp);
    await session.cdp.send("Page.reload", { ignoreCache: false });
    await waitForDocumentReady(session.cdp, timeoutMs);
    await waitStable(session.cdp, state, PWA_AUDIT_ROUTES.visitedData, { minCanvas: 1, timeoutMs });
    actions.push(action("offline-visited-reload", { probe: await evaluate(session.cdp, PWA_HEALTH_PROBE), serverPhase: { state: "stopped", unavailableAt: stopEvidence.refusal.timestamp }, network: reloadTrace.trace }));
    reloadTrace.detach();

    const fallbackTrace = traceFor(session.cdp);
    await navigate(session.cdp, "about:blank");
    await waitForDocumentReady(session.cdp, timeoutMs);
    await navigate(session.cdp, visitedUrl);
    await waitStable(session.cdp, state, PWA_AUDIT_ROUTES.visitedData, { minCanvas: 1, timeoutMs });
    actions.push(action("offline-navigation-fallback", { probe: await evaluate(session.cdp, PWA_HEALTH_PROBE), serverPhase: { state: "stopped", unavailableAt: stopEvidence.refusal.timestamp }, network: fallbackTrace.trace }));
    fallbackTrace.detach();

    const errorTrace = traceFor(session.cdp);
    await navigate(session.cdp, unvisitedUrl);
    const errorProbe = await waitError(session.cdp, PWA_AUDIT_ROUTES.unvisitedData, timeoutMs);
    const cacheAtError = await probeCache(session.cdp);
    const expectedEntriesBeforeRetry = cacheUrls(cacheAtError).filter(url => url === expected).length;
    const stoppedRequests = server.snapshot().requestLog.filter(entry => time(entry.timestamp) >= time(stopEvidence.stopped.timestamp));
    const targetSuccessDuringStop = stoppedRequests.filter(entry => entry.url === expected && entry.status >= 200 && entry.status < 400);
    if (expectedEntriesBeforeRetry > 0) blockers.push("expected unvisited asset was already in Cache Storage at offline error");
    if (targetSuccessDuringStop.length) blockers.push("expected unvisited asset succeeded while listener was stopped");
    actions.push(action("offline-unvisited-error", { probe: errorProbe, cacheBeforeRetry: cacheAtError, expectedAsset: expected, expectedAssetAbsent: expectedEntriesBeforeRetry === 0, serverPhase: { state: "stopped", unavailableAt: stopEvidence.refusal.timestamp }, requestLog: server.snapshot().requestLog, network: errorTrace.trace }));
    errorTrace.detach();

    const relistenEvidence = await server.relisten();
    actions.push(action("online-restore", { serverRelisten: relistenEvidence, probe: await evaluate(session.cdp, PWA_HEALTH_PROBE) }));
    const retryTrace = traceFor(session.cdp);
    const retryClickedAt = nowIso();
    const retry = await clickRetry(session.cdp);
    await waitStable(session.cdp, state, PWA_AUDIT_ROUTES.unvisitedData, { minCanvas: 1, timeoutMs });
    cacheAfterRetry = await probeCache(session.cdp);
    const targetRequestsAfterRetry = server.snapshot().requestLog.filter(entry => entry.url === expected && entry.method === "GET" && entry.status === 200 && time(entry.timestamp) >= time(relistenEvidence.timestamp) && time(entry.timestamp) >= time(retryClickedAt));
    const cacheGrowth = cacheUrls(cacheAfterRetry).filter(url => url === expected).length - expectedEntriesBeforeRetry;
    actions.push(action("retry-unvisited", { retry, clicked: retry?.clicked === true, retryClickedAt, probe: await evaluate(session.cdp, PWA_HEALTH_PROBE), cacheBefore: cacheAtError, cacheAfter: cacheAfterRetry, cacheGrowth, expectedAsset: expected, targetRequestsAfterRetry, requestLog: server.snapshot().requestLog, network: retryTrace.trace, serverRelisten: relistenEvidence }));
    retryTrace.detach();
  } catch (error) {
    blockers.push(error instanceof Error ? error.message : String(error));
  } finally {
    state && (state.collecting = false);
    detachObservers();
    if (session) await closeChrome(session);
    if (server.isListening()) await server.stop("cleanup");
  }
  const result = {
    schemaVersion: PWA_OFFLINE_SCHEMA_VERSION,
    generatedAt: nowIso(),
    tool: PWA_OFFLINE_TOOL,
    key: base.key,
    baseId: base.id,
    baseUrl: base.baseUrl,
    buildRoot: base.buildRoot,
    expectedScopePath: base.expectedScopePath,
    host: base.host,
    port: base.port,
    viewport: { ...PWA_AUDIT_VIEWPORT },
    environment,
    browser: environment?.browser || null,
    networkPolicy: { ...PWA_NETWORK_POLICY },
    server: server.snapshot(),
    httpCachePolicy: actions.find(item => item.name === "offline-targets")?.details?.httpCache || null,
    cacheBeforeStop,
    cacheAfterRetry,
    actions,
    blockers,
  };
  result.validation = validatePwaOfflineResult(result, base);
  result.passed = result.validation.passed && blockers.length === 0;
  return result;
}

function actionByName(result, name) { return result?.actions?.find(item => item?.name === name) || null; }
function fail(failures, message) { failures.push(message); }

function validTimestampSequence(values, failures, label) {
  let last = -Infinity;
  for (const value of values) {
    if (!isIso(value)) { fail(failures, `${label}: invalid timestamp`); continue; }
    const current = time(value);
    if (current < last) fail(failures, `${label}: timestamps are out of order`);
    last = current;
  }
}

function validateHttpCachePolicy(policy, failures) {
  if (!policy || policy.cacheStoragePreserved !== true) fail(failures, "http cache policy does not preserve Cache Storage");
  const commands = policy?.commands;
  if (!Array.isArray(commands) || commands.length !== 2) { fail(failures, "http cache policy must contain clear and disable ACKs"); return; }
  const [clear, disable] = commands;
  if (clear.method !== "Network.clearBrowserCache" || JSON.stringify(clear.params) !== "{}" || clear.ack !== true) fail(failures, "ordinary HTTP cache clear ACK is missing");
  if (disable.method !== "Network.setCacheDisabled" || disable.params?.cacheDisabled !== true || disable.ack !== true) fail(failures, "ordinary HTTP cache disable ACK is missing");
  if (clear.targetType !== "page" || disable.targetType !== "page" || clear.sessionId !== null || disable.sessionId !== null) fail(failures, "HTTP cache commands must target the page");
  validTimestampSequence(commands.map(command => command.timestamp), failures, "http cache commands");
}

function validateServerEvidence(server, base, result, failures) {
  if (!server || server.runToken !== result.server?.runToken || server.buildRoot !== resolve(base.buildRoot) || server.basePath !== base.basePath || server.host !== base.host || server.port !== base.port) fail(failures, "server identity/build root/base/port mismatch");
  if (!Array.isArray(server.starts) || server.starts.length !== 2 || !server.starts.every(item => item.ack === true && item.runToken === server.runToken && item.host === base.host && item.port === base.port && isIso(item.timestamp))) fail(failures, "server start/relisten evidence is incomplete");
  const initialStart = server.starts[0];
  const stop = server.stops?.find(item => item.reason === "network-stop");
  const refusal = server.refusals?.[0];
  const relisten = server.relistens?.[0] || server.starts.find(item => item.reason === "relisten-after-refusal");
  if (server.refusals?.length !== 1 || server.relistens?.length !== 1 || !Array.isArray(server.stops) || server.stops.filter(item => item.reason === "network-stop").length !== 1 || server.stops.filter(item => item.reason === "cleanup").length !== 1) fail(failures, "server primary evidence cardinality is not exact");
  if (!stop || stop.ack !== true || stop.listenerClosed !== true || stop.socketsDestroyed !== stop.socketsTracked || stop.runToken !== server.runToken || !isIso(stop.timestamp)) fail(failures, "server stop/listener/socket evidence is incomplete");
  if (!refusal || refusal.refused !== true || refusal.code !== "ECONNREFUSED" || !isIso(refusal.timestamp) || time(refusal.timestamp) < time(stop?.timestamp)) fail(failures, "TCP ECONNREFUSED evidence is missing or mistimed");
  if (!relisten || relisten.ack !== true || relisten.host !== base.host || relisten.port !== base.port || !isIso(relisten.timestamp) || time(relisten.timestamp) < time(refusal?.timestamp)) fail(failures, "same-port relisten evidence is missing or mistimed");
  if (server.listening !== false || server.socketCount !== 0) fail(failures, "server cleanup must leave no listener or tracked sockets");
  const stopTime = time(stop?.timestamp);
  const refusalTime = time(refusal?.timestamp);
  const relistenTime = time(relisten?.timestamp);
  const targetUrl = expectedAssetUrl(base.baseUrl);
  for (const entry of server.requestLog || []) {
    if (entry.runToken !== server.runToken || entry.host !== base.host || entry.port !== base.port || !isIso(entry.timestamp)) fail(failures, "server request log identity/timestamp is invalid");
    if (time(entry.timestamp) >= refusalTime && time(entry.timestamp) < relistenTime) fail(failures, "server request log is not empty during unavailable window");
    if (entry.url === targetUrl && time(entry.timestamp) >= stopTime && time(entry.timestamp) < relistenTime && entry.status >= 200 && entry.status < 400) fail(failures, "expected unvisited asset succeeded during server-stop window");
  }
  if (time(initialStart?.timestamp) > stopTime) fail(failures, "server stop precedes initial listener");
}

function validateProbe(probe, hash, { minCanvas = 0, allowError = false } = {}, failures, label) {
  if (!probe || !healthPass(probe, hash, { minCanvas, allowError })) fail(failures, `${label}: probe health contract failed`);
  if (probe?.horizontalOverflow === true || probe?.webglFallback === true) fail(failures, `${label}: overflow or WebGL fallback`);
  if (probe && (probe.clientWidth !== PWA_AUDIT_VIEWPORT.width || probe.clientHeight !== PWA_AUDIT_VIEWPORT.height)) fail(failures, `${label}: probe dimensions do not equal the requested desktop viewport`);
}

function validateStoppedDocumentTrace(details, result, base, failures, label) {
  const trace = details?.network;
  const responses = trace?.responses;
  if (!Array.isArray(responses)) { fail(failures, `${label}: response trace is missing`); return; }
  const refusalAt = time(result.server?.refusals?.[0]?.timestamp);
  const relistenAt = time(result.server?.relistens?.[0]?.timestamp);
  const documentResponses = responses.filter(response => response?.url === base.baseUrl);
  const valid = documentResponses.filter(response => response.status === 200 && response.fromServiceWorker === true && isIso(response.timestamp) && time(response.timestamp) >= refusalAt && time(response.timestamp) < relistenAt);
  if (documentResponses.length !== 1 || valid.length !== 1) fail(failures, `${label}: exact cached document response (200/fromServiceWorker) is missing or duplicated`);
  for (const response of responses) {
    if (!response || typeof response.url !== "string" || !numeric(response.status) || !isIso(response.timestamp) || typeof response.fromServiceWorker !== "boolean") fail(failures, `${label}: malformed response trace entry`);
  }
}

export function pwaActionPassed(item, result, base, failures = []) {
  const details = item?.details || {};
  const name = item?.name;
  const expected = expectedAssetUrl(base.baseUrl);
  if (!PWA_AUDIT_ACTION_NAMES.includes(name)) { fail(failures, `unknown action: ${name}`); return false; }
  if (name === "online-shell" || name === "online-home") validateProbe(details.probe, PWA_AUDIT_ROUTES.home, { minCanvas: 0 }, failures, name);
  if (name === "online-shell") {
    const expectedScope = new URL(base.basePath || "/", base.baseUrl).href;
    const shellEntries = (details.cache?.shellNames || []).flatMap(name => details.cache?.entries?.[name] || []);
    if (details.serviceWorker?.active !== "activated" || !details.serviceWorker?.controllerUrl || details.serviceWorker?.scope !== expectedScope || !Array.isArray(details.cache?.names) || shellEntries.length !== PWA_SHELL_ENTRY_COUNT || details.shellEntryCount !== PWA_SHELL_ENTRY_COUNT) fail(failures, "online-shell: service worker/cache shell evidence incomplete");
  }
  if (name === "online-home" && details.url !== `${base.baseUrl}${PWA_AUDIT_ROUTES.home}`) fail(failures, "online-home: route identity mismatch");
  if (name === "online-visited-data") {
    validateProbe(details.probe, PWA_AUDIT_ROUTES.visitedData, { minCanvas: 1 }, failures, name);
    if (details.basicOperation?.exercised !== true) fail(failures, "online-visited-data: basic operation missing");
    if (details.url !== `${base.baseUrl}${PWA_AUDIT_ROUTES.visitedData}` || details.expectedAssetAbsentBeforeStop !== true || cacheUrls(details.cache).includes(expected)) fail(failures, "online-visited-data: expected route/cache contract failed");
  }
  if (["offline-visited-direct", "offline-visited-reload", "offline-navigation-fallback"].includes(name)) {
    validateProbe(details.probe, PWA_AUDIT_ROUTES.visitedData, { minCanvas: 1 }, failures, name);
    if (details.serverPhase?.state !== "stopped" || details.serverPhase?.unavailableAt !== result.server?.refusals?.[0]?.timestamp || !isIso(details.observedAt) || time(details.observedAt) < time(result.server?.refusals?.[0]?.timestamp) || time(details.observedAt) >= time(result.server?.relistens?.[0]?.timestamp)) fail(failures, `${name}: stopped server phase/timing is missing`);
    validateStoppedDocumentTrace(details, result, base, failures, name);
    if (name === "offline-visited-direct" && details.basicOperation?.exercised !== true) fail(failures, `${name}: basic operation missing`);
  }
  if (name === "offline-targets") {
    const stop = result.server?.stops?.find(item => item.reason === "network-stop");
    const refusal = result.server?.refusals?.[0];
    if (!details.serverStop?.listenerClosed || details.serverStop?.runToken !== result.server?.runToken || details.serverStop?.port !== result.server?.port || !details.tcpRefusal?.refused || details.tcpRefusal.code !== "ECONNREFUSED" || details.tcpRefusal.runToken !== result.server?.runToken || details.tcpRefusal.port !== result.server?.port || details.serverStop?.timestamp !== stop?.timestamp || details.tcpRefusal?.timestamp !== refusal?.timestamp) fail(failures, "offline-targets: stop/refusal evidence missing");
    validateHttpCachePolicy(details.httpCache, failures);
  }
  if (name === "offline-unvisited-error") {
    validateProbe(details.probe, PWA_AUDIT_ROUTES.unvisitedData, { minCanvas: 0, allowError: true }, failures, name);
    if (!details.probe?.errorVisible || !details.probe?.retryVisible || !details.probe?.errorText || !details.probe?.retryText?.length || !details.probe?.uiErrors?.length || !details.expectedAssetAbsent || cacheUrls(details.cacheBeforeRetry).includes(expected)) fail(failures, "offline-unvisited-error: existing error/retry or absent-cache contract failed");
    const refusalAt = time(result.server?.refusals?.[0]?.timestamp);
    const relistenAt = time(result.server?.relistens?.[0]?.timestamp);
    if (details.serverPhase?.state !== "stopped" || details.serverPhase?.unavailableAt !== result.server?.refusals?.[0]?.timestamp || !isIso(details.observedAt) || time(details.observedAt) < refusalAt || time(details.observedAt) >= relistenAt || (details.requestLog || []).some(entry => time(entry.timestamp) >= refusalAt && time(entry.timestamp) < relistenAt)) fail(failures, "offline-unvisited-error: unavailable phase/timing or request evidence failed");
  }
  if (name === "online-restore") {
    if (!details.serverRelisten?.ack || details.serverRelisten.host !== base.host || details.serverRelisten.port !== base.port || !isIso(details.serverRelisten.timestamp)) fail(failures, "online-restore: same-server relisten evidence missing");
    validateProbe(details.probe, PWA_AUDIT_ROUTES.unvisitedData, { minCanvas: 0, allowError: true }, failures, name);
  }
  if (name === "retry-unvisited") {
    const relisten = details.serverRelisten;
    const retryAt = time(details.retryClickedAt);
    if (details.clicked !== true || !relisten?.ack || retryAt < time(relisten.timestamp)) fail(failures, "retry-unvisited: retry occurred before relisten or was not clicked");
    validateProbe(details.probe, PWA_AUDIT_ROUTES.unvisitedData, { minCanvas: 1 }, failures, "retry-unvisited");
    const derivedGrowth = cacheUrlCount(details.cacheAfter, expected) - cacheUrlCount(details.cacheBefore, expected);
    if (Number(details.cacheGrowth) !== derivedGrowth || !(derivedGrowth > 0) || !cacheUrls(details.cacheAfter).includes(expected)) fail(failures, "retry-unvisited: Cache Storage did not grow with expected asset");
    const success = (details.requestLog || []).filter(entry => entry.url === expected && entry.method === "GET" && entry.status === 200 && entry.runToken === result.server?.runToken && entry.host === result.server?.host && entry.port === result.server?.port && time(entry.timestamp) >= time(relisten.timestamp) && time(entry.timestamp) >= retryAt);
    if (!success.length) fail(failures, "retry-unvisited: exact target GET success after relisten/retry is missing");
  }
  return failures.length === 0;
}

export function validatePwaOfflineResult(result, base) {
  const failures = [];
  if (!result || result.schemaVersion !== PWA_OFFLINE_SCHEMA_VERSION || result.tool !== PWA_OFFLINE_TOOL) fail(failures, "result schema/tool mismatch");
  if (!base) fail(failures, "missing matrix base definition");
  else {
    if (result.baseId !== base.id || result.key !== base.id || result.baseUrl !== base.baseUrl || result.buildRoot !== resolve(base.buildRoot) || result.expectedScopePath !== base.basePath || result.host !== base.host || result.port !== base.port) fail(failures, "result base/port identity mismatch (build root or scope)");
    if (JSON.stringify(result.viewport) !== JSON.stringify(PWA_AUDIT_VIEWPORT)) fail(failures, "result viewport/emulation mismatch");
  }
  if (JSON.stringify(result.networkPolicy) !== JSON.stringify(PWA_NETWORK_POLICY)) fail(failures, "network policy is not the server-controlled policy");
  const environment = result.environment;
  const browser = result.browser;
  if (environment?.os?.platform !== "win32") fail(failures, "PWA audit requires Windows (win32) provenance");
  if (majorVersion(environment?.nodeVersion) !== PWA_EXPECTED_NODE_MAJOR) fail(failures, "PWA audit requires Node major 24 provenance");
  if (majorVersion(browser?.product) !== PWA_EXPECTED_CHROME_MAJOR || !/HeadlessChrome\//i.test(browser?.userAgent || "")) fail(failures, "PWA audit requires HeadlessChrome major 151 provenance");
  if (JSON.stringify(browser) !== JSON.stringify(environment?.browser)) fail(failures, "result browser identity does not match environment provenance");
  validateHttpCachePolicy(result.httpCachePolicy, failures);
  validateServerEvidence(result.server, base || {}, result, failures);
  const actions = Array.isArray(result.actions) ? result.actions : [];
  if (actions.length !== PWA_AUDIT_ACTION_NAMES.length || actions.map(item => item?.name).join("|") !== PWA_AUDIT_ACTION_NAMES.join("|")) fail(failures, "actions are incomplete, duplicated, or out of order");
  const actionFailures = [];
  for (const item of actions) pwaActionPassed(item, result, base || { baseUrl: result.baseUrl }, actionFailures);
  failures.push(...actionFailures);
  if (result.blockers?.length) failures.push(...result.blockers.map(value => `blocker:${value}`));
  const computed = failures.length === 0;
  if (result.passed === false && computed) failures.push("result.passed self-report contradicts valid evidence");
  return { passed: failures.length === 0, failures };
}

export function validatePwaOfflineAuditReport(report) {
  const failures = [];
  if (!report || report.schemaVersion !== PWA_OFFLINE_SCHEMA_VERSION || report.tool !== PWA_OFFLINE_TOOL) fail(failures, "report schema/tool mismatch");
  if (!report.generatedAt || !isIso(report.generatedAt)) fail(failures, "report generatedAt is not an ISO timestamp");
  if (JSON.stringify(report.networkPolicy) !== JSON.stringify(PWA_NETWORK_POLICY)) fail(failures, "report network policy mismatch");
  const matrix = report?.matrix;
  const definitions = matrix?.definition;
  const results = matrix?.results;
  if (!Array.isArray(definitions) || definitions.length !== 2 || JSON.stringify(definitions.map(item => item.id)) !== JSON.stringify(["normal", "pages"]) || definitions[0]?.basePath !== "/" || definitions[1]?.basePath !== "/brain-practical-navi/") fail(failures, "fixed two-base matrix definition is missing");
  if (!Array.isArray(results) || results.length !== 2 || new Set(results.map(item => item.key)).size !== 2) fail(failures, "fixed two-base matrix results are incomplete or duplicated");
  if (report.environment?.os?.platform !== "win32" || majorVersion(report.environment?.nodeVersion) !== PWA_EXPECTED_NODE_MAJOR) fail(failures, "report environment is not Windows/Node24 provenance");
  const byId = new Map(definitions.map(item => [item.id, item]));
  let browserIdentity = null;
  for (const result of results) {
    const base = byId.get(result.baseId || result.key);
    if (!base) { fail(failures, `unknown result base: ${result.baseId || result.key}`); continue; }
    const validation = validatePwaOfflineResult(result, base);
    failures.push(...validation.failures.map(value => `${result.key}:${value}`));
    if (result.passed !== validation.passed) failures.push(`${result.key}: result.passed is not recomputed evidence`);
    if (browserIdentity === null) browserIdentity = JSON.stringify(result.browser);
    else if (browserIdentity !== JSON.stringify(result.browser)) failures.push(`${result.key}: browser identity differs across bases`);
    if (JSON.stringify(report.environment?.browser) !== JSON.stringify(result.browser)) failures.push(`${result.key}: browser identity differs from report provenance`);
  }
  const passed = failures.length === 0;
  if (report.allPassed !== passed) failures.push("allPassed is not the aggregate of independent validations");
  return { passed: failures.length === 0, failures };
}

export function aggregatePwaOfflineAuditReport({ matrix, results, environment, generatedAt = nowIso() } = {}) {
  const report = {
    schemaVersion: PWA_OFFLINE_SCHEMA_VERSION,
    generatedAt,
    tool: PWA_OFFLINE_TOOL,
    environment,
    viewport: { ...PWA_AUDIT_VIEWPORT },
    networkPolicy: { ...PWA_NETWORK_POLICY },
    matrix: { definition: matrix, results },
    allPassed: true,
  };
  const validation = validatePwaOfflineAuditReport(report);
  report.allPassed = validation.passed;
  report.validation = validation;
  return report;
}

export function usage() {
  return [
    "Usage: node scripts/audit_pwa_offline_browser.mjs --normal-build-root DIR --pages-build-root DIR --output FILE [options]",
    "Options: --normal-port 4240 --pages-port 4241 --host 127.0.0.1",
    "The runner owns both loopback static servers and writes results even when a check fails.",
  ].join("\n");
}

export async function runPwaOfflineAudit(options) {
  const matrix = buildPwaOfflineMatrix(options);
  for (const base of matrix) {
    const rootStats = await stat(base.buildRoot).catch(() => null);
    if (!rootStats?.isDirectory()) throw new Error(`build root is not a directory: ${base.buildRoot}`);
  }
  const results = [];
  let environment = null;
  for (const base of matrix) {
    const result = await runPwaOfflineScenario(base);
    results.push(result);
    environment ||= result.environment;
  }
  return aggregatePwaOfflineAuditReport({ matrix, results, environment });
}

export async function main(argv = process.argv.slice(2)) {
  const options = parsePwaOfflineArgs(argv);
  if (options.help) { console.log(usage()); return null; }
  let report;
  try { report = await runPwaOfflineAudit(options); }
  catch (error) {
    report = { schemaVersion: PWA_OFFLINE_SCHEMA_VERSION, generatedAt: nowIso(), tool: PWA_OFFLINE_TOOL, environment: null, matrix: { definition: [], results: [] }, allPassed: false, blockers: [error instanceof Error ? error.message : String(error)] };
  }
  await mkdir(dirname(options.output), { recursive: true });
  const json = `${JSON.stringify(report, null, 2)}\n`;
  await writeFile(options.output, json, "utf8");
  process.stdout.write(json);
  if (!report.allPassed) process.exitCode = 1;
  return report;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
