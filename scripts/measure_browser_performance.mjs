#!/usr/bin/env node

/**
 * Measure one production-preview route through Chrome's DevTools Protocol.
 *
 * The runner deliberately has no npm dependencies.  It uses the WebSocket and
 * fetch implementations bundled with the workspace Node runtime, and starts
 * an isolated headless Chrome profile so that a cold and warm run are
 * reproducible on the same machine.
 */

import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const PERFORMANCE_SCHEMA_VERSION = 1;
export const DEFAULT_TIMEOUT_MS = 60_000;
export const DEFAULT_STABLE_QUIET_MS = 500;
export const DEFAULT_SAMPLE_INTERVAL_MS = 100;
export const DEFAULT_SETTLE_MS = 250;

const HEAP_FIELDS = [
  "usedSize",
  "totalSize",
  "embedderHeapUsedSize",
  "backingStorageSize",
];

const DEFAULT_CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

function usage() {
  return [
    "Usage:",
    "  node scripts/measure_browser_performance.mjs \\",
    "    --base-url http://localhost:4173 \\",
    "    --route '#workspace/home' \\",
    "    --width 1366 --height 768 \\",
    "    --mode cold --output work/performance/home-cold.json",
    "",
    "Required options: --base-url, --route, --width, --height, --mode cold|warm, --output",
    "Optional: --scenario none|basic-mobile (basic-mobile requires --width 390)",
  ].join("\n");
}

function argumentValue(argv, index, name) {
  const token = argv[index];
  const prefix = `${name}=`;
  if (token.startsWith(prefix)) return { value: token.slice(prefix.length), nextIndex: index };
  if (index + 1 >= argv.length || argv[index + 1].startsWith("--")) {
    throw new Error(`${name} requires a value`);
  }
  return { value: argv[index + 1], nextIndex: index + 1 };
}

function positiveInteger(value, name) {
  if (!/^\d+$/.test(value)) throw new Error(`${name} must be a positive integer`);
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1) throw new Error(`${name} must be a positive integer`);
  return number;
}

function validateLoopbackBaseUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`--base-url must be an http(s) URL: ${value}`);
  }
  if (!/^https?:$/.test(url.protocol)) throw new Error("--base-url must use http or https");
  const hostname = url.hostname.toLowerCase();
  const loopback = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]" || hostname === "::1";
  if (!loopback) throw new Error("--base-url must point to localhost or a loopback address");
  return url;
}

export function parseArgs(argv) {
  const options = {
    baseUrl: null,
    route: null,
    width: null,
    height: null,
    mode: null,
    output: null,
    scenario: "none",
    help: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--help" || token === "-h") {
      options.help = true;
      continue;
    }
    const names = ["--base-url", "--route", "--width", "--height", "--mode", "--output", "--scenario"];
    const name = names.find(candidate => token === candidate || token.startsWith(`${candidate}=`));
    if (!name) throw new Error(`unknown option: ${token}`);
    const parsed = argumentValue(argv, index, name);
    index = parsed.nextIndex;
    if (name === "--base-url") options.baseUrl = parsed.value;
    else if (name === "--route") options.route = parsed.value;
    else if (name === "--width") options.width = positiveInteger(parsed.value, "--width");
    else if (name === "--height") options.height = positiveInteger(parsed.value, "--height");
    else if (name === "--mode") options.mode = parsed.value;
    else if (name === "--output") options.output = parsed.value;
    else if (name === "--scenario") options.scenario = parsed.value;
  }
  if (options.help) return options;
  const missing = ["baseUrl", "route", "width", "height", "mode", "output"]
    .filter(key => options[key] === null || options[key] === "");
  if (missing.length) throw new Error(`missing required option(s): ${missing.map(key => `--${key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}`).join(", ")}`);
  validateLoopbackBaseUrl(options.baseUrl);
  if (options.mode !== "cold" && options.mode !== "warm") throw new Error("--mode must be cold or warm");
  if (options.scenario !== "none" && options.scenario !== "basic-mobile") throw new Error("--scenario must be none or basic-mobile");
  if (options.scenario === "basic-mobile" && options.width !== 390) throw new Error("--scenario basic-mobile requires --width 390");
  if (!options.route.trim()) throw new Error("--route must not be empty");
  return options;
}

export function resolveRoute(baseUrl, route) {
  const base = validateLoopbackBaseUrl(baseUrl);
  return new URL(route, base).href;
}

export function routeNeedsBlockIntroAction(route) {
  return /^#workspace\/blocks\//.test(String(route));
}

function finiteNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function normalizeHeapUsage(value) {
  const source = value && typeof value === "object" ? value : {};
  return Object.fromEntries(HEAP_FIELDS.map(field => [field, finiteNumber(source[field])]));
}

export function peakHeapUsage(samples) {
  const values = Array.isArray(samples) ? samples : [];
  return Object.fromEntries(HEAP_FIELDS.map(field => {
    const observed = values.map(sample => finiteNumber(sample?.[field])).filter(value => value !== null);
    return [field, observed.length ? Math.max(...observed) : null];
  }));
}

export function createMeasurementState() {
  return {
    collecting: false,
    requests: new Map(),
    inFlight: new Set(),
    finished: new Set(),
    encodedBytes: 0,
    consoleErrors: [],
    requestErrors: [],
  };
}

function boundedPush(list, value) {
  if (list.length < 200) list.push(value);
}

function requestIsLongLived(type) {
  return type === "WebSocket" || type === "EventSource" || type === "WebTransport";
}

export function recordNetworkEvent(state, method, params) {
  if (!state.collecting) return;
  if (method === "Network.requestWillBeSent") {
    const requestId = String(params.requestId);
    const request = params.request || {};
    const type = params.type || "Other";
    state.requests.set(requestId, {
      url: typeof request.url === "string" ? request.url : "",
      method: typeof request.method === "string" ? request.method : "GET",
      type,
    });
    if (!requestIsLongLived(type)) state.inFlight.add(requestId);
    return;
  }
  if (method === "Network.loadingFinished") {
    const requestId = String(params.requestId);
    state.inFlight.delete(requestId);
    if (state.finished.has(requestId)) return;
    state.finished.add(requestId);
    const bytes = finiteNumber(params.encodedDataLength);
    if (bytes !== null && bytes >= 0) state.encodedBytes += bytes;
    return;
  }
  if (method === "Network.loadingFailed") {
    const requestId = String(params.requestId);
    state.inFlight.delete(requestId);
    const request = state.requests.get(requestId) || {};
    boundedPush(state.requestErrors, {
      requestId,
      url: request.url || null,
      type: request.type || params.type || null,
      errorText: params.errorText || "unknown network error",
      canceled: Boolean(params.canceled),
    });
  }
}

function remoteObjectText(remoteObject) {
  if (!remoteObject || typeof remoteObject !== "object") return "";
  if (typeof remoteObject.description === "string") return remoteObject.description;
  if (Object.prototype.hasOwnProperty.call(remoteObject, "value")) {
    try { return typeof remoteObject.value === "string" ? remoteObject.value : JSON.stringify(remoteObject.value); }
    catch { return String(remoteObject.value); }
  }
  return remoteObject.type || "";
}

export function recordRuntimeEvent(state, method, params) {
  if (!state.collecting) return;
  if (method === "Runtime.consoleAPICalled") {
    if (params.type !== "error" && params.type !== "assert") return;
    boundedPush(state.consoleErrors, {
      type: params.type,
      text: (params.args || []).map(remoteObjectText).join(" ").trim() || "console error",
      url: params.stackTrace?.callFrames?.[0]?.url || null,
      lineNumber: finiteNumber(params.stackTrace?.callFrames?.[0]?.lineNumber),
      columnNumber: finiteNumber(params.stackTrace?.callFrames?.[0]?.columnNumber),
    });
    return;
  }
  if (method === "Runtime.exceptionThrown") {
    const details = params.exceptionDetails || {};
    boundedPush(state.consoleErrors, {
      type: "exception",
      text: details.exception?.description || details.text || "uncaught exception",
      url: details.url || null,
      lineNumber: finiteNumber(details.lineNumber),
      columnNumber: finiteNumber(details.columnNumber),
    });
  }
}

export function aggregateNetworkMetrics(state) {
  return {
    encodedBytes: Math.max(0, Math.round(state.encodedBytes || 0)),
    requestCount: state.requests instanceof Map ? state.requests.size : 0,
    consoleErrors: Array.isArray(state.consoleErrors) ? [...state.consoleErrors] : [],
    requestErrors: Array.isArray(state.requestErrors) ? [...state.requestErrors] : [],
  };
}

export function aggregateHeapMetrics(samples, settled) {
  const normalizedSamples = (Array.isArray(samples) ? samples : []).map(normalizeHeapUsage);
  const normalizedSettled = normalizeHeapUsage(settled);
  return {
    settled: normalizedSettled,
    sampledPeak: peakHeapUsage(normalizedSamples),
    sampleCount: normalizedSamples.length,
  };
}

export function validateResultSchema(result) {
  if (!result || result.schemaVersion !== PERFORMANCE_SCHEMA_VERSION) return false;
  const required = [
    "generatedAt", "tool", "baseUrl", "route", "url", "mode", "scenario", "viewport",
    "encodedBytes", "requestCount", "dclMs", "stableTimeMs", "consoleErrors",
    "requestErrors", "canvasCount", "loadingCount", "uiErrors", "appRootPresent", "stable", "stabilityReason", "horizontalOverflow", "heap",
    "interactions", "measurementPassed", "validation",
  ];
  if (required.some(key => !(key in result))) return false;
  if (!Number.isSafeInteger(result.encodedBytes) || result.encodedBytes < 0) return false;
  if (!Number.isSafeInteger(result.requestCount) || result.requestCount < 0) return false;
  if (!Number.isSafeInteger(result.canvasCount) || result.canvasCount < 0) return false;
  if (!Array.isArray(result.consoleErrors) || !Array.isArray(result.requestErrors) || !Array.isArray(result.uiErrors)) return false;
  if (!Number.isSafeInteger(result.loadingCount) || result.loadingCount < 0) return false;
  if (typeof result.appRootPresent !== "boolean") return false;
  if (typeof result.stable !== "boolean" || typeof result.stabilityReason !== "string") return false;
  if (!Array.isArray(result.interactions) || typeof result.measurementPassed !== "boolean") return false;
  if (!result.validation || typeof result.validation.passed !== "boolean" || !Array.isArray(result.validation.failures)) return false;
  if (!result.viewport || !Number.isSafeInteger(result.viewport.width) || !Number.isSafeInteger(result.viewport.height)) return false;
  if (!result.horizontalOverflow || typeof result.horizontalOverflow.detected !== "boolean") return false;
  if (!result.heap || !result.heap.settled || !result.heap.sampledPeak) return false;
  return true;
}

export function validateMeasurementResult(result, interactions = []) {
  const failures = [];
  if (!result.stable) failures.push(`stability:${result.stabilityReason || "unknown"}`);
  if (!result.appRootPresent) failures.push("app-root-missing");
  if (result.loadingCount !== 0) failures.push("loading-indicator-visible");
  if (result.horizontalOverflow?.detected) failures.push("horizontal-overflow");
  if (result.consoleErrors.length) failures.push("console-errors");
  if (result.requestErrors.length) failures.push("request-errors");
  if (result.uiErrors.length) failures.push("ui-errors");
  for (const interaction of interactions) {
    if (!interaction.passed) failures.push(`interaction:${interaction.name}`);
  }
  return { passed: failures.length === 0, failures };
}

export function numericOutputMatchesTarget(output, target) {
  if (output === null || output === undefined) return false;
  const trimmed = String(output).trim();
  if (!trimmed) return false;
  const numeric = Number(trimmed);
  return Number.isFinite(numeric) && Number.isFinite(target) && numeric === target;
}

export function rangeStepPassed(before, changed, after) {
  const beforeValue = finiteNumber(before?.value);
  const target = finiteNumber(changed?.target);
  const afterValue = finiteNumber(after?.value);
  return before?.found === true
    && changed?.changed === true
    && beforeValue !== null
    && target !== null
    && afterValue !== null
    && afterValue === target
    && afterValue !== beforeValue
    && numericOutputMatchesTarget(after?.output, target);
}

export function mergeScenarioErrors(result, scenarioMetrics = {}) {
  const initialConsoleErrors = Array.isArray(result?.consoleErrors) ? result.consoleErrors : [];
  const initialRequestErrors = Array.isArray(result?.requestErrors) ? result.requestErrors : [];
  const scenarioConsoleErrors = Array.isArray(scenarioMetrics?.consoleErrors) ? scenarioMetrics.consoleErrors : [];
  const scenarioRequestErrors = Array.isArray(scenarioMetrics?.requestErrors) ? scenarioMetrics.requestErrors : [];
  return {
    ...result,
    consoleErrors: [...initialConsoleErrors, ...scenarioConsoleErrors],
    requestErrors: [...initialRequestErrors, ...scenarioRequestErrors],
  };
}

function sleep(milliseconds) {
  return new Promise(resolvePromise => setTimeout(resolvePromise, milliseconds));
}

async function freePort() {
  const server = createServer();
  await new Promise((resolvePromise, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolvePromise);
  });
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : null;
  await new Promise(resolvePromise => server.close(resolvePromise));
  if (!port) throw new Error("could not allocate a local debugging port");
  return port;
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status} from ${url}`);
  return response.json();
}

async function waitForDebugJson(port, resource, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      const value = await fetchJson(`http://127.0.0.1:${port}${resource}`);
      if (value) return value;
    } catch (error) {
      lastError = error;
    }
    await sleep(100);
  }
  throw new Error(`Chrome DevTools endpoint did not become ready${lastError ? `: ${lastError.message}` : ""}`);
}

function decodeWebSocketData(data) {
  if (typeof data === "string") return data;
  if (data instanceof ArrayBuffer) return new TextDecoder().decode(new Uint8Array(data));
  if (ArrayBuffer.isView(data)) return new TextDecoder().decode(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
  return String(data);
}

async function connectWebSocket(url, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const websocket = new WebSocket(url);
  await new Promise((resolvePromise, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      try { websocket.close(); } catch { /* best effort */ }
      reject(new Error(`timed out connecting to Chrome DevTools at ${url}`));
    }, timeoutMs);
    websocket.addEventListener("open", () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolvePromise();
    }, { once: true });
    websocket.addEventListener("error", event => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(new Error(`Chrome DevTools WebSocket error: ${event.message || "unknown error"}`));
    }, { once: true });
  });
  return websocket;
}

class CdpClient {
  constructor(websocket) {
    this.websocket = websocket;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
    this.closed = false;
    this.onMessage = event => this.#handleMessage(event);
    this.onClose = () => this.#handleClose(new Error("Chrome DevTools WebSocket closed"));
    websocket.addEventListener("message", this.onMessage);
    websocket.addEventListener("close", this.onClose, { once: true });
  }

  #handleMessage(event) {
    let message;
    try { message = JSON.parse(decodeWebSocketData(event.data)); }
    catch { return; }
    if (message.id !== undefined) {
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      clearTimeout(pending.timer);
      if (message.error) pending.reject(new Error(`${message.error.message || "CDP command failed"} (${pending.method})`));
      else pending.resolve(message.result || {});
      return;
    }
    const callbacks = this.listeners.get(message.method) || [];
    for (const callback of [...callbacks]) {
      try { callback(message.params || {}); }
      catch { /* observers must not break the CDP command loop */ }
    }
  }

  #handleClose(error) {
    if (this.closed) return;
    this.closed = true;
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.pending.clear();
  }

  on(method, callback) {
    const callbacks = this.listeners.get(method) || [];
    callbacks.push(callback);
    this.listeners.set(method, callbacks);
    return () => {
      const remaining = (this.listeners.get(method) || []).filter(item => item !== callback);
      if (remaining.length) this.listeners.set(method, remaining);
      else this.listeners.delete(method);
    };
  }

  send(method, params = {}, timeoutMs = 15_000) {
    if (this.closed) return Promise.reject(new Error("Chrome DevTools connection is closed"));
    const id = this.nextId++;
    return new Promise((resolvePromise, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`timed out waiting for CDP ${method}`));
      }, timeoutMs);
      this.pending.set(id, { resolve: resolvePromise, reject, timer, method });
      try { this.websocket.send(JSON.stringify({ id, method, params })); }
      catch (error) {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(error);
      }
    });
  }

  async close() {
    if (this.closed) return;
    this.#handleClose(new Error("CDP client closed"));
    try { this.websocket.close(); } catch { /* best effort */ }
  }
}

async function findPageTarget(port, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const targets = await fetchJson(`http://127.0.0.1:${port}/json/list`);
      const page = targets.find(target => target.type === "page" && target.webSocketDebuggerUrl);
      if (page) return page;
    } catch { /* Chrome may still be starting */ }
    await sleep(100);
  }
  throw new Error("Chrome did not expose a page target");
}

async function launchChrome() {
  const executable = process.env.CHROME_PATH?.trim() || process.env.CHROME_BIN?.trim() || DEFAULT_CHROME_PATH;
  const profile = await mkdtemp(join(tmpdir(), "brain-practical-performance-"));
  const port = await freePort();
  const args = [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--remote-debugging-address=127.0.0.1",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-background-networking",
    "--disable-component-update",
    "--disable-features=Translate,MediaRouter",
    "--disable-sync",
    "--metrics-recording-only",
    "--mute-audio",
    "about:blank",
  ];
  let child;
  try {
    child = spawn(executable, args, { stdio: ["ignore", "ignore", "ignore"], windowsHide: true });
  } catch (error) {
    await rm(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    throw new Error(`could not start Chrome at ${executable}: ${error.message}`);
  }
  const exited = new Promise((_, reject) => child.once("error", error => reject(new Error(`could not start Chrome at ${executable}: ${error.message}`))));
  try {
    const version = await Promise.race([waitForDebugJson(port, "/json/version"), exited]);
    const target = await Promise.race([findPageTarget(port), exited]);
    const websocket = await connectWebSocket(target.webSocketDebuggerUrl);
    return { executable, profile, port, child, version, target, cdp: new CdpClient(websocket) };
  } catch (error) {
    try { child.kill(); } catch { /* best effort */ }
    await rm(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    throw error;
  }
}

async function closeChrome(session) {
  if (!session) return;
  await session.cdp?.close();
  try { session.child?.kill(); } catch { /* best effort */ }
  await rm(session.profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 150 });
}

async function evaluate(cdp, expression) {
  const response = await cdp.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
    userGesture: false,
  });
  if (response.exceptionDetails) {
    throw new Error(response.exceptionDetails.text || "page evaluation failed");
  }
  return response.result?.value;
}

const READY_PROBE = `(() => {
  const documentElement = document.documentElement;
  const body = document.body;
  const navigation = performance.getEntriesByType("navigation")[0];
  const clientWidth = documentElement?.clientWidth ?? window.innerWidth;
  const scrollWidth = Math.max(documentElement?.scrollWidth ?? 0, body?.scrollWidth ?? 0);
  return {
    readyState: document.readyState,
    now: performance.now(),
    dclMs: navigation ? navigation.domContentLoadedEventEnd : null,
    canvasCount: document.querySelectorAll("canvas").length,
    loadingCount: document.querySelectorAll(".atlasLoading:not(.error),.segLoading:not(.error)").length,
    appRootPresent: Boolean(document.querySelector("main.appShell")),
    uiErrors: [...document.querySelectorAll(".atlasLoading.error,.segLoading.error,[role=alert]")].map(element => ({
      text: (element.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 240),
      role: element.getAttribute("role"),
      className: typeof element.className === "string" ? element.className : "",
    })),
    clientWidth,
    scrollWidth,
    horizontalOverflow: scrollWidth > clientWidth + 1,
  };
})()`;

async function waitForDocumentReady(cdp, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const probe = await evaluate(cdp, READY_PROBE);
      if (probe?.readyState === "complete") return probe;
    } catch { /* navigation can briefly invalidate the execution context */ }
    await sleep(100);
  }
  throw new Error("document did not reach readyState=complete");
}

async function navigate(cdp, url) {
  const response = await cdp.send("Page.navigate", { url });
  if (response.errorText) throw new Error(`navigation failed: ${response.errorText}`);
}

async function prepareRoute(cdp, route) {
  if (!routeNeedsBlockIntroAction(route)) return;
  const prepared = await waitForRuntimeProbe(cdp, `(() => {
    const model = document.querySelector(".learningModelStage canvas");
    if (model) return { ready: true, action: "already-open" };
    const button = [...document.querySelectorAll(".blockIntroCard button")]
      .find(candidate => (candidate.textContent || "").includes("試作品を確認する"));
    if (!button) return { ready: false, action: "intro-button-missing" };
    button.click();
    return { ready: false, clicked: true, action: "opened-prototype" };
  })()`, value => value?.ready === true || value?.clicked === true, 15_000);
  if (prepared?.clicked) {
    await waitForRuntimeProbe(cdp, `(() => ({
      ready: Boolean(document.querySelector(".learningModelStage canvas")),
      canvasCount: document.querySelectorAll(".learningModelStage canvas").length,
    }))()`, value => value?.ready === true, 15_000);
  }
}

async function collectMeasurement(cdp, state, { timeoutMs = DEFAULT_TIMEOUT_MS, stableQuietMs = DEFAULT_STABLE_QUIET_MS, sampleIntervalMs = DEFAULT_SAMPLE_INTERVAL_MS, settleMs = DEFAULT_SETTLE_MS } = {}) {
  const samples = [];
  let sampleChain = Promise.resolve();
  const sample = () => {
    sampleChain = sampleChain.then(async () => {
      try {
        const usage = await cdp.send("Runtime.getHeapUsage");
        samples.push(normalizeHeapUsage(usage));
      } catch { /* some Chrome versions expose no heap usage for a page target */ }
    });
    return sampleChain;
  };
  await sample();
  const sampler = setInterval(() => { void sample(); }, sampleIntervalMs);
  const deadline = Date.now() + timeoutMs;
  let quietSince = null;
  let stableProbe = null;
  let stabilityReason = "timeout";
  let latestProbe = null;
  try {
    while (Date.now() < deadline) {
      let probe;
      try { probe = await evaluate(cdp, READY_PROBE); }
      catch { probe = null; }
      if (probe) latestProbe = probe;
      const idle = state.inFlight.size === 0;
      if (probe?.readyState === "complete" && probe.loadingCount === 0 && idle) {
        if (quietSince === null) quietSince = Date.now();
        if (Date.now() - quietSince >= stableQuietMs) {
          stableProbe = probe;
          stabilityReason = probe.appRootPresent ? "stable" : "app-root-missing";
          break;
        }
      } else {
        quietSince = null;
      }
      await sleep(100);
    }
    if (!stableProbe) {
      stableProbe = latestProbe || {
        now: null,
        dclMs: null,
        canvasCount: 0,
        loadingCount: state.inFlight.size ? 1 : 0,
        uiErrors: [],
        appRootPresent: false,
        clientWidth: null,
        scrollWidth: null,
        horizontalOverflow: false,
      };
    }
    await sleep(settleMs);
    await sample();
    await sampleChain;
  } finally {
    clearInterval(sampler);
    await sampleChain;
  }
  return { stableProbe, stable: stabilityReason === "stable", stabilityReason, heap: aggregateHeapMetrics(samples, samples.at(-1)) };
}

async function waitForUiReady(cdp, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const deadline = Date.now() + timeoutMs;
  let latest = null;
  while (Date.now() < deadline) {
    try {
      latest = await evaluate(cdp, READY_PROBE);
      if (latest?.readyState === "complete" && latest.loadingCount === 0 && latest.appRootPresent && latest.uiErrors.length === 0) return latest;
    } catch { /* route changes briefly invalidate the execution context */ }
    await sleep(100);
  }
  throw new Error(`mobile interaction route did not become ready${latest ? ` (loading=${latest.loadingCount}, uiErrors=${latest.uiErrors?.length ?? "?"}, appRoot=${latest.appRootPresent})` : ""}`);
}

async function waitForRuntimeProbe(cdp, expression, predicate, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const deadline = Date.now() + timeoutMs;
  let latest = null;
  while (Date.now() < deadline) {
    try {
      latest = await evaluate(cdp, expression);
      if (predicate(latest)) return latest;
    } catch { /* React may be committing a new route */ }
    await sleep(50);
  }
  throw new Error("runtime interaction state did not settle");
}

function interaction(name, passed, details) {
  return { name, passed: Boolean(passed), details: details && typeof details === "object" ? details : { value: details } };
}

async function runBasicMobileScenario(cdp, args) {
  const interactions = [];
  try {
    await navigate(cdp, resolveRoute(args.baseUrl, "#workspace/quiz"));
    await waitForUiReady(cdp);
    const clickedQuiz = await evaluate(cdp, `(() => {
      const selector = ".quizOptions > button:not([disabled])";
      const button = document.querySelector(selector);
      if (!button) return { clicked: false, selector, reason: "no enabled answer button" };
      const label = (button.textContent || "").replace(/\\s+/g, " ").trim();
      button.click();
      return { clicked: true, selector, label };
    })()`);
    const quizAfter = await waitForRuntimeProbe(cdp, `(() => {
      const feedback = document.querySelector(".quizFeedback");
      const options = [...document.querySelectorAll(".quizOptions > button")];
      return {
        feedback: Boolean(feedback),
        feedbackText: (feedback?.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 240),
      disabledCount: options.filter(button => button.disabled).length,
      optionCount: options.length,
      };
    })()`, value => value?.feedback || value?.disabledCount === value?.optionCount, 15_000);
    const quizHealth = await waitForUiReady(cdp);
    const quizHealthy = quizHealth?.loadingCount === 0 && quizHealth?.uiErrors?.length === 0 && !quizHealth?.horizontalOverflow;
    interactions.push(interaction("quiz-answer", clickedQuiz?.clicked === true && quizAfter?.feedback === true && quizHealthy, {
      selector: clickedQuiz?.selector || ".quizOptions > button:not([disabled])",
      buttonLabel: clickedQuiz?.label || null,
      feedbackVisible: Boolean(quizAfter?.feedback),
      feedbackText: quizAfter?.feedbackText || "",
      disabledCount: quizAfter?.disabledCount ?? null,
      optionCount: quizAfter?.optionCount ?? null,
      loadingCount: quizHealth?.loadingCount ?? null,
      uiErrorCount: quizHealth?.uiErrors?.length ?? null,
      horizontalOverflow: Boolean(quizHealth?.horizontalOverflow),
    }));
  } catch (error) {
    interactions.push(interaction("quiz-answer", false, { error: error.message }));
  }

  try {
    await navigate(cdp, resolveRoute(args.baseUrl, "#workspace/sections/horizontal"));
    await waitForUiReady(cdp);
    const before = await evaluate(cdp, `(() => {
      const selector = 'input[type="range"][aria-label*="水平断"]';
      const input = document.querySelector(selector);
      return input ? { found: true, selector, value: Number(input.value), output: document.querySelector(".sliceTimeline output")?.textContent || "" } : { found: false, selector };
    })()`);
    const changed = await evaluate(cdp, `(() => {
      const selector = 'input[type="range"][aria-label*="水平断"]';
      const input = document.querySelector(selector);
      if (!input) return { changed: false, selector, reason: "horizontal range not found" };
      const before = Number(input.value);
      const min = Number(input.min || 0);
      const max = Number(input.max || 100);
      const target = Math.min(max, Math.max(min, before + 1));
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      if (!setter) return { changed: false, selector, reason: "native range setter unavailable", before, target };
      setter.call(input, String(target));
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
      return { changed: true, selector, before, target };
    })()`);
    const after = await waitForRuntimeProbe(cdp, `(() => {
      const input = document.querySelector('input[type="range"][aria-label*="水平断"]');
      return input ? { value: Number(input.value), output: document.querySelector(".sliceTimeline output")?.textContent || "" } : { value: null, output: "" };
    })()`, value => rangeStepPassed(before, changed, { ...value, found: value?.value !== null }), 15_000);
    const horizontalHealth = await waitForUiReady(cdp);
    const horizontalHealthy = horizontalHealth?.loadingCount === 0 && horizontalHealth?.uiErrors?.length === 0 && !horizontalHealth?.horizontalOverflow;
    interactions.push(interaction("horizontal-range-step", rangeStepPassed(before, changed, after) && horizontalHealthy, {
      selector: changed?.selector || before?.selector || 'input[type="range"][aria-label*="水平断"]',
      beforeValue: before?.value ?? null,
      targetValue: changed?.target ?? null,
      afterValue: after?.value ?? null,
      output: after?.output || "",
      loadingCount: horizontalHealth?.loadingCount ?? null,
      uiErrorCount: horizontalHealth?.uiErrors?.length ?? null,
      horizontalOverflow: Boolean(horizontalHealth?.horizontalOverflow),
    }));
  } catch (error) {
    interactions.push(interaction("horizontal-range-step", false, { error: error.message }));
  }

  try {
    const before = await evaluate(cdp, `(() => {
      const buttons = [...document.querySelectorAll(".sectionLayoutSwitch button")];
      return { canvasCount: document.querySelectorAll("canvas").length, buttons: buttons.map(button => ({ text: (button.textContent || "").trim(), disabled: button.disabled, pressed: button.getAttribute("aria-pressed") })) };
    })()`);
    const clicked = await evaluate(cdp, `(() => {
      const selector = ".sectionLayoutSwitch button";
      const buttons = [...document.querySelectorAll(selector)].filter(button => !button.disabled);
      const button = buttons.find(candidate => (candidate.textContent || "").includes("断面＋3D")) || buttons.find(candidate => (candidate.textContent || "").includes("断面のみ"));
      if (!button) return { clicked: false, selector, reason: "no enabled section layout button" };
      const text = (button.textContent || "").trim();
      button.click();
      return { clicked: true, selector, text };
    })()`);
    const selectedBoth = clicked?.text?.includes("断面＋3D");
    const after = await waitForRuntimeProbe(cdp, `(() => {
      const selected = [...document.querySelectorAll(".sectionLayoutSwitch button")].find(button => button.getAttribute("aria-pressed") === "true");
      const documentElement = document.documentElement;
      const body = document.body;
      const clientWidth = documentElement?.clientWidth ?? window.innerWidth;
      const scrollWidth = Math.max(documentElement?.scrollWidth ?? 0, body?.scrollWidth ?? 0);
      return {
        canvasCount: document.querySelectorAll("canvas").length,
        selectedText: (selected?.textContent || "").trim(),
        selectedPressed: selected?.getAttribute("aria-pressed") === "true",
        loadingCount: document.querySelectorAll(".atlasLoading:not(.error),.segLoading:not(.error)").length,
        uiErrors: [...document.querySelectorAll(".atlasLoading.error,.segLoading.error,[role=alert]")].map(element => (element.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 240)),
        horizontalOverflow: Math.max(documentElement?.scrollWidth ?? 0, body?.scrollWidth ?? 0) > clientWidth + 1,
        clientWidth,
        scrollWidth,
      };
    })()`, value => Boolean(value?.selectedPressed)
      && value.loadingCount === 0
      && value.uiErrors.length === 0
      && !value.horizontalOverflow
      && (selectedBoth ? value.selectedText.includes("断面＋3D") && value.canvasCount > 0 : value.selectedText.includes("断面のみ") && value.canvasCount === 0), 15_000);
    const selectedStateOk = clicked?.clicked === true && after?.selectedPressed === true && (selectedBoth ? after.selectedText.includes("断面＋3D") : after.selectedText.includes("断面のみ"));
    const canvasStateOk = selectedBoth ? after?.canvasCount > 0 : after?.canvasCount === 0;
    const passed = selectedStateOk && canvasStateOk && after?.loadingCount === 0 && after?.uiErrors?.length === 0 && !after?.horizontalOverflow;
    interactions.push(interaction("mobile-display-toggle", passed, {
      selector: clicked?.selector || ".sectionLayoutSwitch button",
      clickedText: clicked?.text || null,
      canvasBefore: before?.canvasCount ?? null,
      canvasAfter: after?.canvasCount ?? null,
      selectedText: after?.selectedText || "",
      selectedPressed: Boolean(after?.selectedPressed),
      loadingCount: after?.loadingCount ?? null,
      uiErrorCount: after?.uiErrors?.length ?? null,
      horizontalOverflow: Boolean(after?.horizontalOverflow),
      canvasStateOk,
      webglFallbackUsed: !selectedBoth,
    }));
  } catch (error) {
    interactions.push(interaction("mobile-display-toggle", false, { error: error.message }));
  }
  return interactions;
}

function attachObservers(cdp, state) {
  const eventMethods = [
    "Network.requestWillBeSent",
    "Network.loadingFinished",
    "Network.loadingFailed",
  ];
  const removers = eventMethods.map(method => cdp.on(method, params => recordNetworkEvent(state, method, params)));
  const runtimeMethods = ["Runtime.consoleAPICalled", "Runtime.exceptionThrown"];
  removers.push(...runtimeMethods.map(method => cdp.on(method, params => recordRuntimeEvent(state, method, params))));
  return () => removers.forEach(remove => remove());
}

async function configurePage(cdp) {
  await cdp.send("Page.enable");
  await cdp.send("Network.enable");
  await cdp.send("Runtime.enable");
  try { await cdp.send("Log.enable"); } catch { /* optional on older Chrome */ }
  try { await cdp.send("Performance.enable"); } catch { /* optional on older Chrome */ }
  try { await cdp.send("Page.setLifecycleEventsEnabled", { enabled: true }); } catch { /* optional */ }
  // Keep quiz ordering identical between the prime and measured navigation.
  // This only affects the isolated measurement profile, never the application.
  await cdp.send("Page.addScriptToEvaluateOnNewDocument", {
    source: `(() => { let state = 0x6d2b79f5; Math.random = () => { state = Math.imul(state ^ (state >>> 15), state | 1); state ^= state + Math.imul(state ^ (state >>> 7), state | 61); return ((state ^ (state >>> 14)) >>> 0) / 4294967296; }; })();`,
  });
}

function resultFromMeasurement(args, url, state, stableProbe, heap, session, stable, stabilityReason) {
  const network = aggregateNetworkMetrics(state);
  const result = {
    schemaVersion: PERFORMANCE_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    tool: "scripts/measure_browser_performance.mjs",
    baseUrl: args.baseUrl,
    route: args.route,
    url,
    mode: args.mode,
    scenario: args.scenario,
    viewport: { width: args.width, height: args.height },
    browser: {
      executable: session.executable,
      product: session.version?.Browser || null,
      userAgent: session.version?.["User-Agent"] || null,
    },
    encodedBytes: network.encodedBytes,
    requestCount: network.requestCount,
    dclMs: finiteNumber(stableProbe.dclMs),
    stableTimeMs: finiteNumber(stableProbe.now),
    consoleErrors: network.consoleErrors,
    requestErrors: network.requestErrors,
    canvasCount: Math.max(0, Math.round(stableProbe.canvasCount || 0)),
    loadingCount: Math.max(0, Math.round(stableProbe.loadingCount || 0)),
    uiErrors: Array.isArray(stableProbe.uiErrors) ? stableProbe.uiErrors : [],
    appRootPresent: Boolean(stableProbe.appRootPresent),
    stable: Boolean(stable),
    stabilityReason,
    horizontalOverflow: {
      detected: Boolean(stableProbe.horizontalOverflow),
      clientWidth: finiteNumber(stableProbe.clientWidth),
      scrollWidth: finiteNumber(stableProbe.scrollWidth),
    },
    heap,
    interactions: [],
  };
  const validation = validateMeasurementResult(result);
  result.measurementPassed = validation.passed;
  result.validation = validation;
  if (!validateResultSchema(result)) throw new Error("internal performance result failed schema validation");
  return result;
}

export async function measureBrowserPerformance(args) {
  const url = resolveRoute(args.baseUrl, args.route);
  const session = await launchChrome();
  const state = createMeasurementState();
  const detachObservers = attachObservers(session.cdp, state);
  try {
    await configurePage(session.cdp);
    await session.cdp.send("Emulation.setDeviceMetricsOverride", {
      width: args.width,
      height: args.height,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await session.cdp.send("Network.setCacheDisabled", { cacheDisabled: args.mode === "cold" });
    if (args.mode === "warm") {
      state.collecting = false;
      await navigate(session.cdp, url);
      await prepareRoute(session.cdp, args.route);
      await waitForUiReady(session.cdp);
      // Leave the primed document before the measured navigation.  This keeps
      // the warm run a real second navigation rather than a same-URL no-op,
      // while preserving the profile's HTTP cache.
      await navigate(session.cdp, "about:blank");
      await waitForDocumentReady(session.cdp);
    } else {
      try { await session.cdp.send("Network.clearBrowserCache"); } catch { /* best effort */ }
    }
    state.collecting = false;
    state.requests.clear();
    state.inFlight.clear();
    state.finished.clear();
    state.encodedBytes = 0;
    state.consoleErrors.length = 0;
    state.requestErrors.length = 0;
    state.collecting = true;
    await navigate(session.cdp, url);
    await prepareRoute(session.cdp, args.route);
    const measured = await collectMeasurement(session.cdp, state);
    state.collecting = false;
    let result = resultFromMeasurement(args, url, state, measured.stableProbe, measured.heap, session, measured.stable, measured.stabilityReason);
    if (args.scenario === "basic-mobile") {
      // Start a fresh error-only collection window for the interaction pass.
      // Its request bytes and request count deliberately do not enter the
      // initial navigation metrics in `result`.
      state.requests.clear();
      state.inFlight.clear();
      state.finished.clear();
      state.encodedBytes = 0;
      state.consoleErrors.length = 0;
      state.requestErrors.length = 0;
      state.collecting = true;
      result.interactions = await runBasicMobileScenario(session.cdp, args);
      state.collecting = false;
      result = mergeScenarioErrors(result, aggregateNetworkMetrics(state));
      result.validation = validateMeasurementResult(result, result.interactions);
      result.measurementPassed = result.validation.passed;
    }
    if (!validateResultSchema(result)) throw new Error("internal performance result failed scenario schema validation");
    return result;
  } finally {
    state.collecting = false;
    detachObservers();
    await closeChrome(session);
  }
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    console.log(usage());
    return null;
  }
  const result = await measureBrowserPerformance(args);
  const outputPath = isAbsolute(args.output) ? args.output : resolve(args.output);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  console.log(outputPath);
  if (!result.measurementPassed) {
    console.error(`browser performance validation failed: ${result.validation.failures.join(", ")}`);
    process.exitCode = 1;
  }
  return result;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch(error => {
    console.error(`browser performance measurement failed: ${error.message}`);
    process.exitCode = 1;
  });
}
