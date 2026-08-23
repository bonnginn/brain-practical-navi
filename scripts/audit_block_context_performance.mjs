#!/usr/bin/env node

/**
 * Audit a saved all-specimen performance-suite report without opening Chrome.
 *
 * The block-context window is deliberately checked against the seven local
 * public assets that the browser requested.  The body-byte sum is read from
 * those files at audit time; it is not copied from a measurement report.
 */

import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  BLOCK_CONTEXT_ROUTES,
  PERFORMANCE_SCHEMA_VERSION,
} from "./measure_browser_performance.mjs";
import {
  buildPerformanceMatrix,
  PERFORMANCE_SUITE_SCHEMA_VERSION,
  SUITE_MODES,
  SUITE_ROUTES,
  SUITE_VIEWPORTS,
} from "./measure_browser_performance_suite.mjs";

export const BLOCK_CONTEXT_PERFORMANCE_AUDIT_SCHEMA_VERSION = 1;
export const EXPECTED_PERFORMANCE_RESULT_COUNT = 79;
export const EXPECTED_BASE_RESULT_COUNT = 31;
export const EXPECTED_BLOCK_CONTEXT_RESULT_COUNT = 48;
export const EXPECTED_CONTEXT_REQUEST_COUNT = 7;
export const BLOCK_CONTEXT_STABLE_TIME_LIMIT_MS = 1_500;
export const BLOCK_CONTEXT_SETTLED_BACKING_LIMIT_BYTES = 80 * 1024 * 1024;
export const BLOCK_CONTEXT_SAMPLED_PEAK_LIMIT_BYTES = 300 * 1024 * 1024;

export const EXPECTED_CONTEXT_REQUEST_PATHS = Object.freeze([
  "/atlas/pial-left.mesh.gz",
  "/atlas/pial-right.mesh.gz",
  "/atlas/segment-cerebellum.mesh",
  "/atlas/segment-pons-medulla.mesh",
  "/atlas/segment-midbrain.mesh",
  "/atlas/bigbrain-icbm500.bin.gz",
  "/atlas/bigbrain-practical-segmentation-icbm500.bin.gz?v=b75a24903ec08526",
]);

const SUITE_TOOL = "scripts/measure_browser_performance_suite.mjs";
const RESULT_TOOL = "scripts/measure_browser_performance.mjs";

const EXPECTED_CONTEXT_VIEWPORT_IDS = Object.freeze(["pc", "tablet-landscape", "mobile"]);
const EXPECTED_CONTEXT_MODES = Object.freeze(["cold", "warm"]);
const EXPECTED_CONTEXT_ROUTES = Object.freeze([
  Object.freeze({ id: "blocks-lateral-ventricle", route: "#workspace/blocks/lateral-ventricle" }),
  Object.freeze({ id: "blocks-diencephalon", route: "#workspace/blocks/diencephalon" }),
  Object.freeze({ id: "blocks-radiations", route: "#workspace/blocks/radiations" }),
  Object.freeze({ id: "blocks-commissural-system", route: "#workspace/blocks/commissural-system" }),
  Object.freeze({ id: "blocks-choroid-plexus", route: "#workspace/blocks/choroid-plexus" }),
  Object.freeze({ id: "blocks-medial-temporal", route: "#workspace/blocks/medial-temporal" }),
  Object.freeze({ id: "blocks-midbrain-section", route: "#workspace/blocks/midbrain-section" }),
  Object.freeze({ id: "blocks-hindbrain", route: "#workspace/blocks/hindbrain" }),
]);
const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function addFailure(failures, code, message, key = null, details = null) {
  failures.push({ code, message, ...(key ? { key } : {}), ...(details ? { details } : {}) });
}

function sameArray(left, right) {
  return Array.isArray(left)
    && Array.isArray(right)
    && left.length === right.length
    && left.every((value, index) => value === right[index]);
}

function sameMembers(left, right) {
  return Array.isArray(left)
    && Array.isArray(right)
    && left.length === right.length
    && new Set(left).size === left.length
    && new Set(right).size === right.length
    && left.every(value => right.includes(value));
}

function isIsoTimestamp(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return false;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString() === value;
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isNonNegativeSafeInteger(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function validateEnvironment(environment, failures) {
  if (!environment || typeof environment !== "object") {
    addFailure(failures, "environment-missing", "report.environment must be an object");
    return;
  }
  const os = environment.os;
  if (!os || typeof os !== "object") {
    addFailure(failures, "environment-os-missing", "report.environment.os must be an object");
  } else {
    for (const field of ["platform", "release", "version", "arch"]) {
      if (!isNonEmptyString(os[field])) addFailure(failures, `environment-os-${field}`, `report.environment.os.${field} must be a non-empty string`);
    }
    if (os.platform !== "win32") addFailure(failures, "environment-os-platform-value", "report.environment.os.platform must be win32");
  }
  if (!Number.isSafeInteger(environment.cpuCount) || environment.cpuCount < 1) {
    addFailure(failures, "environment-cpu-count", "report.environment.cpuCount must be a positive integer");
  }
  const memory = environment.memoryBytes;
  if (!memory || typeof memory !== "object") {
    addFailure(failures, "environment-memory-missing", "report.environment.memoryBytes must be an object");
  } else {
    if (!Number.isSafeInteger(memory.total) || memory.total < 1) addFailure(failures, "environment-memory-total", "report.environment.memoryBytes.total must be a positive integer");
    if (!Number.isSafeInteger(memory.free) || memory.free < 0) addFailure(failures, "environment-memory-free", "report.environment.memoryBytes.free must be a non-negative integer");
    if (Number.isSafeInteger(memory.total) && Number.isSafeInteger(memory.free) && memory.free > memory.total) addFailure(failures, "environment-memory-order", "report.environment.memoryBytes.free cannot exceed total");
  }
  const nodeVersion = String(environment.nodeVersion || "");
  if (!/^v\d+\.\d+\.\d+(?:[-+].*)?$/.test(nodeVersion)) {
    addFailure(failures, "environment-node-version", "report.environment.nodeVersion must be a Node version string");
  }
  const nodeMajor = /^v(\d+)\./.exec(nodeVersion)?.[1];
  if (nodeMajor !== "24") addFailure(failures, "environment-node-major", "report.environment.nodeVersion must be Node major 24");
}

function validateBrowserMetadata(browser, failures, key) {
  if (!browser || typeof browser !== "object") {
    addFailure(failures, "result-browser-missing", "result.browser must be an object", key);
    return;
  }
  for (const field of ["executable", "product", "userAgent"]) {
    if (!isNonEmptyString(browser[field])) addFailure(failures, `result-browser-${field}`, `result.browser.${field} must be a non-empty string`, key);
  }
  const productMatch = /^(Chrome|Chromium)\/(\d+)(?:\.|$)/i.exec(String(browser.product || ""));
  if (isNonEmptyString(browser.product) && !productMatch) addFailure(failures, "result-browser-product-value", "result.browser.product must identify Chrome or Chromium", key);
  const userAgentMatch = /(?:HeadlessChrome|Chrome|Chromium)\/(\d+)(?:\.|$)/i.exec(String(browser.userAgent || ""));
  if (isNonEmptyString(browser.userAgent) && !userAgentMatch) addFailure(failures, "result-browser-user-agent-value", "result.browser.userAgent must identify Chrome or Chromium", key);
  if (productMatch?.[2] !== "151") addFailure(failures, "result-browser-product-major", "result.browser.product must be Chrome/Chromium major 151", key);
  if (userAgentMatch?.[1] !== "151") addFailure(failures, "result-browser-user-agent-major", "result.browser.userAgent must be Chrome/Chromium major 151", key);
  if (isNonEmptyString(browser.executable) && !/(?:chrome|chromium)(?:\.exe)?$/i.test(browser.executable.replace(/[\\/]$/, ""))) addFailure(failures, "result-browser-executable-value", "result.browser.executable must identify a Chrome or Chromium executable", key);
}

function validateHeapShape(heapValue, failures, codePrefix, key) {
  if (!heapValue || typeof heapValue !== "object") {
    addFailure(failures, `${codePrefix}-missing`, `${codePrefix} heap metrics are required`, key);
    return;
  }
  if (!heapValue.settled || typeof heapValue.settled !== "object") addFailure(failures, `${codePrefix}-settled`, `${codePrefix}.settled heap metrics are required`, key);
  if (!(heapValue.sampledPeak || heapValue.samplePeak) || typeof (heapValue.sampledPeak || heapValue.samplePeak) !== "object") addFailure(failures, `${codePrefix}-sampled-peak`, `${codePrefix}.sampledPeak heap metrics are required`, key);
  if (heapValue.sampleCount !== undefined && !isNonNegativeSafeInteger(heapValue.sampleCount)) addFailure(failures, `${codePrefix}-sample-count`, `${codePrefix}.sampleCount must be a non-negative integer`, key);
}

function validateInteractionArray(interactions, failures, codePrefix, key) {
  if (!Array.isArray(interactions)) {
    addFailure(failures, `${codePrefix}-interactions`, `${codePrefix}.interactions must be an array`, key);
    return;
  }
  interactions.forEach((interaction, index) => {
    if (!interaction || typeof interaction !== "object" || !isNonEmptyString(interaction.name) || typeof interaction.passed !== "boolean") {
      addFailure(failures, `${codePrefix}-interaction-${index}`, `${codePrefix}.interactions entries must have name and passed`, key);
    }
  });
}

function isNullableNonNegativeNumber(value) {
  return value === null || (typeof value === "number" && Number.isFinite(value) && value >= 0);
}

function validateContextMetricsSchema(metrics, failures, codePrefix, key, { on = false } = {}) {
  if (!metrics || typeof metrics !== "object") {
    addFailure(failures, `${codePrefix}-missing`, `${codePrefix} metrics must be an object`, key);
    return;
  }
  for (const field of ["encodedBytes", "requestCount", "uniqueRequestCount"]) {
    if (!isNonNegativeSafeInteger(metrics[field])) addFailure(failures, `${codePrefix}-${field}`, `${codePrefix}.${field} must be a non-negative integer`, key);
  }
  if (!Array.isArray(metrics.requestPaths) || metrics.requestPaths.some(path => !isNonEmptyString(path) || !path.startsWith("/"))) addFailure(failures, `${codePrefix}-request-paths`, `${codePrefix}.requestPaths must contain local paths`, key);
  for (const field of ["uiErrors", "consoleErrors", "requestErrors"]) {
    if (!Array.isArray(metrics[field])) addFailure(failures, `${codePrefix}-${field}`, `${codePrefix}.${field} must be an array`, key);
  }
  if (typeof metrics.loadingCount !== "number" || !Number.isFinite(metrics.loadingCount) || metrics.loadingCount < 0) addFailure(failures, `${codePrefix}-loading-count`, `${codePrefix}.loadingCount must be a non-negative number`, key);
  if (typeof metrics.webglFallback !== "boolean") addFailure(failures, `${codePrefix}-webgl-fallback`, `${codePrefix}.webglFallback must be boolean`, key);
  if (!metrics.horizontalOverflow || typeof metrics.horizontalOverflow !== "object" || typeof metrics.horizontalOverflow.detected !== "boolean") addFailure(failures, `${codePrefix}-overflow`, `${codePrefix}.horizontalOverflow.detected must be boolean`, key);
  validateHeapShape(metrics.heap, failures, `${codePrefix}-heap`, key);
  if (on) {
    if (!isNullableNonNegativeNumber(metrics.stableTimeMs)) addFailure(failures, `${codePrefix}-stable-time`, `${codePrefix}.stableTimeMs must be a non-negative number or null`, key);
    if (typeof metrics.stable !== "boolean") addFailure(failures, `${codePrefix}-stable`, `${codePrefix}.stable must be boolean`, key);
    if (!isNonEmptyString(metrics.stabilityReason)) addFailure(failures, `${codePrefix}-stability-reason`, `${codePrefix}.stabilityReason must be a non-empty string`, key);
    for (const field of ["canvasAfterLauncher", "canvasAfterSection", "canvasAfterClose"]) {
      if (!isNullableNonNegativeNumber(metrics[field])) addFailure(failures, `${codePrefix}-${field}`, `${codePrefix}.${field} must be a non-negative number or null`, key);
    }
  } else if (!isNullableNonNegativeNumber(metrics.stableTimeMs) || !isNullableNonNegativeNumber(metrics.canvasCount)) {
    addFailure(failures, `${codePrefix}-probe-values`, `${codePrefix} stableTimeMs and canvasCount must be non-negative numbers or null`, key);
  }
}

function validateBlockContextSchema(context, result, failures, key) {
  if (!context || typeof context !== "object") {
    addFailure(failures, "result-block-context-missing", "block-context result requires blockContext", key);
    return;
  }
  if (context.enabled !== true) addFailure(failures, "result-block-context-enabled", "blockContext.enabled must be true", key);
  if (context.scenario !== "block-context") addFailure(failures, "result-block-context-scenario", "blockContext.scenario must be block-context", key);
  if (context.route !== result.route) addFailure(failures, "result-block-context-route", "blockContext.route must match result.route", key);
  validateContextMetricsSchema(context.baseline, failures, "result-block-context-baseline", key);
  validateContextMetricsSchema(context.on, failures, "result-block-context-on", key, { on: true });
  if (context.additional !== undefined && (!context.additional || typeof context.additional !== "object")) addFailure(failures, "result-block-context-additional", "blockContext.additional must be an object", key);
  validateInteractionArray(context.interactions, failures, "result-block-context", key);
}

function validateResultSchema(result, expected, reportBaseUrl, failures) {
  const key = result?.key || expected?.key || null;
  if (!result || typeof result !== "object") {
    addFailure(failures, "result-missing", "matrix result must be an object", key);
    return;
  }
  if (result.schemaVersion !== PERFORMANCE_SCHEMA_VERSION) addFailure(failures, "result-schema-version", `result.schemaVersion must be ${PERFORMANCE_SCHEMA_VERSION}`, key);
  if (!isIsoTimestamp(result.generatedAt)) addFailure(failures, "result-generated-at", "result.generatedAt must be an ISO timestamp", key);
  if (result.tool !== RESULT_TOOL) addFailure(failures, "result-tool", `result.tool must be ${RESULT_TOOL}`, key);
  if (result.baseUrl !== reportBaseUrl) addFailure(failures, "result-base-url", "result.baseUrl must match report.baseUrl", key);
  if (!isNonEmptyString(result.route) || !isNonEmptyString(result.url)) addFailure(failures, "result-route-url", "result.route and result.url must be non-empty strings", key);
  else {
    try {
      if (new URL(result.route, reportBaseUrl).href !== result.url) addFailure(failures, "result-url-mismatch", "result.url must resolve from result.route and report.baseUrl", key);
    } catch {
      addFailure(failures, "result-url-invalid", "result.url must be a valid local route URL", key);
    }
  }
  if (result.mode !== "cold" && result.mode !== "warm") addFailure(failures, "result-mode", "result.mode must be cold or warm", key);
  if (result.scenario !== expected?.scenario) addFailure(failures, "result-scenario", "result.scenario must match the suite matrix", key);
  if (!result.viewport || result.viewport.width !== expected?.width || result.viewport.height !== expected?.height) addFailure(failures, "result-viewport", "result.viewport must match the suite matrix", key);
  validateBrowserMetadata(result.browser, failures, key);
  if (!result.networkPolicy || result.networkPolicy.serviceWorkerBypass !== true) addFailure(failures, "result-network-policy", "result.networkPolicy.serviceWorkerBypass must be true", key);
  for (const field of ["encodedBytes", "requestCount", "uniqueRequestCount", "canvasCount", "loadingCount"]) {
    if (!isNonNegativeSafeInteger(result[field])) addFailure(failures, `result-${field}`, `result.${field} must be a non-negative integer`, key);
  }
  if (!Array.isArray(result.requestPaths) || result.requestPaths.some(path => !isNonEmptyString(path) || !path.startsWith("/") || path.includes("\\"))) addFailure(failures, "result-request-paths", "result.requestPaths must contain local URL paths", key);
  else if (new Set(result.requestPaths).size !== result.requestPaths.length) addFailure(failures, "result-request-path-duplicates", "result.requestPaths must be unique", key);
  for (const field of ["consoleErrors", "requestErrors", "uiErrors"]) {
    if (!Array.isArray(result[field])) addFailure(failures, `result-${field}`, `result.${field} must be an array`, key);
  }
  if (!isNullableNonNegativeNumber(result.dclMs) || !isNullableNonNegativeNumber(result.stableTimeMs)) addFailure(failures, "result-timing", "result timing fields must be non-negative numbers or null", key);
  if (typeof result.appRootPresent !== "boolean" || typeof result.stable !== "boolean" || !isNonEmptyString(result.stabilityReason)) addFailure(failures, "result-health-shape", "result health fields have invalid types", key);
  if (result.webglFallback !== undefined && typeof result.webglFallback !== "boolean") addFailure(failures, "result-webgl-fallback", "result.webglFallback must be boolean", key);
  if (!result.horizontalOverflow || typeof result.horizontalOverflow !== "object" || typeof result.horizontalOverflow.detected !== "boolean") addFailure(failures, "result-overflow", "result.horizontalOverflow.detected must be boolean", key);
  validateHeapShape(result.heap, failures, "result", key);
  validateInteractionArray(result.interactions, failures, "result", key);
  if (typeof result.measurementPassed !== "boolean" || !result.validation || typeof result.validation !== "object" || typeof result.validation.passed !== "boolean" || !Array.isArray(result.validation.failures)) addFailure(failures, "result-validation", "result validation fields have invalid types", key);
  if (result.scenario === "block-context") validateBlockContextSchema(result.blockContext, result, failures, key);
}

function validateSuiteDefinition(definition, expectedMatrix, failures) {
  if (!definition || typeof definition !== "object") {
    addFailure(failures, "definition-missing", "matrix.definition must be an object");
    return;
  }
  const expected = {
    routes: SUITE_ROUTES,
    viewports: SUITE_VIEWPORTS,
    modes: SUITE_MODES,
    fullViewportIds: ["pc", "tablet-landscape"],
    mobileRouteIds: ["home", "sections-horizontal", "quiz"],
    basicMobileScenario: {
      viewportId: "mobile",
      routeId: "quiz",
      mode: "cold",
      scenario: "basic-mobile",
    },
    blockContextScenario: {
      routeIds: BLOCK_CONTEXT_ROUTES.map(route => route.id),
      routes: BLOCK_CONTEXT_ROUTES,
      viewportIds: [...EXPECTED_CONTEXT_VIEWPORT_IDS],
      modes: [...EXPECTED_CONTEXT_MODES],
      scenario: "block-context",
    },
  };
  for (const [field, expectedValue] of Object.entries(expected)) {
    if (JSON.stringify(definition[field]) !== JSON.stringify(expectedValue)) addFailure(failures, `definition-${field}`, `matrix.definition.${field} does not match the suite contract`);
  }
  if (definition.entryCount !== EXPECTED_PERFORMANCE_RESULT_COUNT) addFailure(failures, "definition-entry-count", "matrix.definition.entryCount must be 79");
  if (!Array.isArray(definition.entries) || definition.entries.length !== expectedMatrix.length) {
    addFailure(failures, "definition-entries", "matrix.definition.entries must contain all suite entries");
    return;
  }
  expectedMatrix.forEach((expectedEntry, index) => {
    if (JSON.stringify(definition.entries[index]) !== JSON.stringify(expectedEntry)) addFailure(failures, "definition-entry-mismatch", "matrix.definition.entries must match the suite matrix", expectedEntry.key);
  });
}

function isLoopbackBaseUrl(value) {
  if (typeof value !== "string") return false;
  let url;
  try { url = new URL(value); } catch { return false; }
  if (!/^https?:$/.test(url.protocol)) return false;
  const hostname = url.hostname.toLowerCase();
  return hostname === "localhost"
    || hostname === "127.0.0.1"
    || hostname === "::1"
    || hostname === "[::1]";
}

function localPathValue(value, name) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${name} requires a local file path`);
  if (/^(?:[a-z][a-z\d+.-]*:)?\/\//i.test(value) || /^(?:https?|file):/i.test(value)) {
    throw new Error(`${name} must be a local file path`);
  }
  return value;
}

export function parseArgs(argv) {
  const options = { report: null, output: null, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--help" || token === "-h") {
      options.help = true;
      continue;
    }
    const name = ["--report", "--output"].find(candidate => token === candidate || token.startsWith(`${candidate}=`));
    if (!name) throw new Error(`unknown option: ${token}`);
    const prefix = `${name}=`;
    let value;
    if (token.startsWith(prefix)) {
      value = token.slice(prefix.length);
    } else {
      if (index + 1 >= argv.length || argv[index + 1].startsWith("--")) throw new Error(`${name} requires a value`);
      value = argv[++index];
    }
    if (name === "--report") options.report = localPathValue(value, "--report");
    else options.output = localPathValue(value, "--output");
  }
  if (options.help) return options;
  if (!options.report) throw new Error("missing required option: --report");
  return options;
}

async function defaultAssetStat(filePath) {
  return stat(filePath);
}

function assetFilePath(projectRoot, requestPath) {
  const pathname = requestPath.split("?", 1)[0];
  const publicRoot = resolve(projectRoot, "public");
  const filePath = resolve(publicRoot, pathname.replace(/^\/+/, ""));
  const escaped = relative(publicRoot, filePath);
  if (escaped.startsWith("..") || isAbsolute(escaped)) return null;
  return filePath;
}

/**
 * Resolve the seven expected request paths to local public assets and sum
 * their actual body bytes.  `assetStat` is injectable for mutation tests.
 */
export async function deriveArtifactBodyByteSum({
  projectRoot = PROJECT_ROOT,
  requestPaths = EXPECTED_CONTEXT_REQUEST_PATHS,
  assetStat = defaultAssetStat,
} = {}) {
  const failures = [];
  const assets = [];
  const seen = new Set();
  let bodyBytes = 0;
  if (!Array.isArray(requestPaths)) {
    addFailure(failures, "artifact-request-paths-missing", "artifact derivation requires an array of request paths");
    return { bodyBytes, assets, failures };
  }
  if (!sameMembers(requestPaths, EXPECTED_CONTEXT_REQUEST_PATHS)) {
    addFailure(failures, "artifact-request-paths-mismatch", "artifact derivation requires the exact seven expected request paths");
  }
  for (const requestPath of requestPaths) {
    if (seen.has(requestPath)) {
      addFailure(failures, "artifact-request-path-duplicate", `duplicate artifact request path: ${requestPath}`);
      continue;
    }
    seen.add(requestPath);
    const filePath = typeof requestPath === "string" ? assetFilePath(projectRoot, requestPath) : null;
    if (!filePath) {
      addFailure(failures, "artifact-request-path-invalid", `request path is not a safe local public path: ${requestPath}`);
      continue;
    }
    let info;
    try {
      info = await assetStat(filePath);
    } catch (error) {
      addFailure(failures, "artifact-missing", `public artifact is missing: ${requestPath}`, null, { path: requestPath, error: error instanceof Error ? error.message : String(error) });
      continue;
    }
    const isFile = typeof info?.isFile === "function" ? info.isFile() : info?.isFile === true;
    const bytes = info?.size;
    assets.push({ path: requestPath, file: filePath, bytes: Number.isSafeInteger(bytes) ? bytes : null });
    if (!isFile) addFailure(failures, "artifact-not-file", `public artifact is not a file: ${requestPath}`);
    if (!Number.isSafeInteger(bytes) || bytes < 0) {
      addFailure(failures, "artifact-size-invalid", `public artifact has an invalid byte size: ${requestPath}`);
    } else if (bytes === 0) {
      addFailure(failures, "artifact-zero-byte", `public artifact is zero bytes: ${requestPath}`);
    } else {
      bodyBytes += bytes;
    }
  }
  return { bodyBytes, assets, failures };
}

function validateExactCoverage(report, failures) {
  const expectedMatrix = buildPerformanceMatrix();
  const expectedKeys = expectedMatrix.map(entry => entry.key);
  const results = report?.matrix?.results;
  validateSuiteDefinition(report?.matrix?.definition, expectedMatrix, failures);
  if (!Array.isArray(results)) {
    addFailure(failures, "results-missing", "matrix.results must be an array");
    return { expectedMatrix, expectedKeys, results: [], resultByKey: new Map(), contextResults: [], baseResults: [] };
  }
  const browserIdentityKeys = results
    .map(result => [result?.browser?.product, result?.browser?.userAgent])
    .filter(([product, userAgent]) => isNonEmptyString(product) && isNonEmptyString(userAgent))
    .map(([product, userAgent]) => `${product}\u0000${userAgent}`);
  if (new Set(browserIdentityKeys).size > 1) {
    addFailure(failures, "result-browser-identity-mismatch", "all results must share one browser product and userAgent identity", null, {
      identities: [...new Set(browserIdentityKeys)].map(identity => identity.split("\u0000")),
    });
  }
  if (results.length !== EXPECTED_PERFORMANCE_RESULT_COUNT) {
    addFailure(failures, "result-count", `expected exactly ${EXPECTED_PERFORMANCE_RESULT_COUNT} results, observed ${results.length}`);
  }
  const actualKeys = results.map(result => result?.key);
  const uniqueKeys = new Set(actualKeys);
  if (uniqueKeys.size !== actualKeys.length) addFailure(failures, "duplicate-result-keys", "matrix.results contains duplicate keys");
  if (!sameArray(actualKeys, expectedKeys)) {
    const expectedSet = new Set(expectedKeys);
    const actualSet = new Set(actualKeys);
    addFailure(failures, "result-keys-mismatch", "matrix.results keys do not exactly match the 79-entry suite matrix", null, {
      missing: expectedKeys.filter(key => !actualSet.has(key)),
      unexpected: actualKeys.filter(key => !expectedSet.has(key)),
    });
  }
  if (report?.matrix?.definition?.entryCount !== EXPECTED_PERFORMANCE_RESULT_COUNT) {
    addFailure(failures, "definition-entry-count", "matrix.definition.entryCount must be 79");
  }
  const definitionKeys = Array.isArray(report?.matrix?.definition?.entries)
    ? report.matrix.definition.entries.map(entry => entry?.key)
    : null;
  if (!definitionKeys || !sameArray(definitionKeys, expectedKeys)) {
    addFailure(failures, "definition-keys-mismatch", "matrix.definition.entries must contain the exact suite keys");
  }
  const resultByKey = new Map();
  for (const result of results) {
    if (result?.key && !resultByKey.has(result.key)) resultByKey.set(result.key, result);
  }
  for (const expected of expectedMatrix) {
    const result = resultByKey.get(expected.key);
    if (!result) {
      addFailure(failures, "missing-result", `missing result for ${expected.key}`, expected.key);
      continue;
    }
    validateResultSchema(result, expected, report?.baseUrl, failures);
    for (const field of ["routeId", "route", "viewportId", "mode", "scenario"]) {
      if (result[field] !== expected[field]) addFailure(failures, `result-${field}-mismatch`, `${field} does not match the suite matrix`, expected.key);
    }
    if (result.viewport?.width !== expected.width || result.viewport?.height !== expected.height) {
      addFailure(failures, "result-viewport-mismatch", "viewport dimensions do not match the suite matrix", expected.key);
    }
    if (result.measurementPassed !== true) addFailure(failures, "measurement-failed", "measurementPassed must be true", expected.key);
    if (result.validation?.passed !== true) addFailure(failures, "validation-failed", "validation.passed must be true", expected.key);
    if (result.networkPolicy?.serviceWorkerBypass !== true) addFailure(failures, "service-worker-bypass-missing", "networkPolicy.serviceWorkerBypass must be true", expected.key);
  }
  const contextResults = results.filter(result => result?.scenario === "block-context");
  const baseResults = results.filter(result => result?.scenario !== "block-context");
  if (baseResults.length !== EXPECTED_BASE_RESULT_COUNT) addFailure(failures, "base-result-count", `expected ${EXPECTED_BASE_RESULT_COUNT} base results, observed ${baseResults.length}`);
  if (contextResults.length !== EXPECTED_BLOCK_CONTEXT_RESULT_COUNT) addFailure(failures, "context-result-count", `expected ${EXPECTED_BLOCK_CONTEXT_RESULT_COUNT} block-context results, observed ${contextResults.length}`);
  const expectedContextKeys = expectedMatrix.filter(entry => entry.scenario === "block-context").map(entry => entry.key);
  if (!sameArray(contextResults.map(result => result?.key), expectedContextKeys)) addFailure(failures, "context-keys-mismatch", "block-context results do not cover the exact route/viewport/mode matrix");
  const observedRoutes = new Set(contextResults.map(result => result?.routeId));
  const expectedRoutes = BLOCK_CONTEXT_ROUTES.map(route => route.id);
  if (observedRoutes.size !== expectedRoutes.length || expectedRoutes.some(route => !observedRoutes.has(route))) addFailure(failures, "context-route-coverage", "block-context results must cover exactly the eight registered specimen routes");
  return { expectedMatrix, expectedKeys, results, resultByKey, contextResults, baseResults };
}

function validateContextResult(result, bodyBytes, failures) {
  const key = result?.key || null;
  if (result?.blockContext?.enabled !== true) addFailure(failures, "context-enabled", "blockContext.enabled must be true", key);
  if (result?.blockContext?.scenario !== "block-context") addFailure(failures, "context-scenario", "blockContext.scenario must be block-context", key);
  if (result?.blockContext?.route !== result?.route) addFailure(failures, "context-route", "blockContext.route must match the measured route", key);
  const on = result?.blockContext?.on;
  if (!on || typeof on !== "object") {
    addFailure(failures, "context-on-missing", "blockContext.on is required", key);
    return;
  }
  if (!Array.isArray(on.requestPaths)) {
    addFailure(failures, "context-request-paths-missing", "blockContext.on.requestPaths must be an array", key);
  } else {
    if (on.requestPaths.length !== EXPECTED_CONTEXT_REQUEST_COUNT) addFailure(failures, "context-request-path-count", "blockContext.on.requestPaths must contain exactly seven paths", key);
    if (new Set(on.requestPaths).size !== on.requestPaths.length) addFailure(failures, "context-request-path-duplicate", "blockContext.on.requestPaths must not contain duplicates", key);
    if (!sameMembers(on.requestPaths, EXPECTED_CONTEXT_REQUEST_PATHS)) addFailure(failures, "context-request-path-wrong", "blockContext.on.requestPaths do not match the seven public assets", key);
  }
  if (on.requestCount !== EXPECTED_CONTEXT_REQUEST_COUNT) addFailure(failures, "context-request-count", "blockContext.on.requestCount must be seven", key);
  if (on.uniqueRequestCount !== EXPECTED_CONTEXT_REQUEST_COUNT) addFailure(failures, "context-unique-request-count", "blockContext.on.uniqueRequestCount must be seven", key);
  if (!Number.isSafeInteger(on.encodedBytes)) {
    addFailure(failures, "context-encoded-bytes-invalid", "blockContext.on.encodedBytes must be a safe integer", key);
  } else {
    if (on.encodedBytes < bodyBytes) addFailure(failures, "context-encoded-bytes-below-artifact", "blockContext.on.encodedBytes is below the derived public-artifact body sum", key);
    if (on.encodedBytes > bodyBytes + 8192) addFailure(failures, "context-encoded-bytes-above-artifact", "blockContext.on.encodedBytes exceeds the derived public-artifact body sum plus 8192 bytes", key);
  }
  const canvas = [on.canvasAfterLauncher, on.canvasAfterSection, on.canvasAfterClose];
  if (!sameArray(canvas, [2, 2, 1])) addFailure(failures, "context-canvas-contract", "blockContext.on canvas contract must be 2→2→1", key, { observed: canvas });
  if (on.loadingCount !== 0) addFailure(failures, "context-loaders", "blockContext.on.loadingCount must be zero", key);
  for (const field of ["uiErrors", "consoleErrors", "requestErrors"]) {
    if (!Array.isArray(on[field]) || on[field].length !== 0) addFailure(failures, `context-${field}`, `blockContext.on.${field} must be empty`, key);
  }
  if (on.horizontalOverflow?.detected !== false) addFailure(failures, "context-overflow", "blockContext.on.horizontalOverflow.detected must be false", key);
  if (on.webglFallback !== false) addFailure(failures, "context-webgl-fallback", "blockContext.on.webglFallback must be false", key);
  if (on.stable !== true) addFailure(failures, "context-not-stable", "blockContext.on.stable must be true", key);
  if (!Number.isFinite(on.stableTimeMs) || on.stableTimeMs < 0) addFailure(failures, "context-stable-time-invalid", "blockContext.on.stableTimeMs must be a non-negative number", key);
  else if (on.stableTimeMs > BLOCK_CONTEXT_STABLE_TIME_LIMIT_MS) addFailure(failures, "context-stable-time-threshold", "blockContext.on.stableTimeMs exceeds 1500 ms", key);
  const settledBacking = on.heap?.settled?.backingStorageSize;
  const sampledPeakBacking = (on.heap?.sampledPeak || on.heap?.samplePeak)?.backingStorageSize;
  if (!Number.isFinite(settledBacking) || settledBacking < 0) addFailure(failures, "context-settled-backing-invalid", "settled backingStorageSize must be a non-negative number", key);
  else if (settledBacking > BLOCK_CONTEXT_SETTLED_BACKING_LIMIT_BYTES) addFailure(failures, "context-settled-backing-threshold", "settled backingStorageSize exceeds 80 MiB", key);
  if (!Number.isFinite(sampledPeakBacking) || sampledPeakBacking < 0) addFailure(failures, "context-sampled-peak-invalid", "sampled peak backingStorageSize must be a non-negative number", key);
  else if (sampledPeakBacking > BLOCK_CONTEXT_SAMPLED_PEAK_LIMIT_BYTES) addFailure(failures, "context-sampled-peak-threshold", "sampled peak backingStorageSize exceeds 300 MiB", key);
}

/**
 * Purely audit an in-memory report against already-derived artifact evidence.
 *
 * The CLI wrapper below is responsible for reading the JSON report and using
 * stat() to derive the public-artifact byte sum.  Keeping this core function
 * free of file I/O makes report mutations straightforward to unit-test.
 */
export function auditBlockContextPerformance(report, {
  artifact = { bodyBytes: null, assets: [], failures: [] },
} = {}) {
  const failures = [];
  if (!report || typeof report !== "object") addFailure(failures, "report-invalid", "report must be a JSON object");
  if (report?.schemaVersion !== PERFORMANCE_SUITE_SCHEMA_VERSION) addFailure(failures, "report-schema-version", `report.schemaVersion must be ${PERFORMANCE_SUITE_SCHEMA_VERSION}`);
  if (report?.tool !== SUITE_TOOL) addFailure(failures, "report-tool", `report.tool must be ${SUITE_TOOL}`);
  if (!isIsoTimestamp(report?.generatedAt)) addFailure(failures, "report-generated-at", "report.generatedAt must be an ISO timestamp");
  if (report?.allPassed !== true) addFailure(failures, "suite-not-all-passed", "report.allPassed must be true");
  if (!isLoopbackBaseUrl(report?.baseUrl)) addFailure(failures, "base-url-not-loopback", "report.baseUrl must be an http(s) loopback URL");
  validateEnvironment(report?.environment, failures);
  if (BLOCK_CONTEXT_ROUTES.length !== 8) addFailure(failures, "registered-route-count", "the block-context registry must contain exactly eight routes");
  if (!sameArray(BLOCK_CONTEXT_ROUTES.map(route => `${route.id}|${route.route}`), EXPECTED_CONTEXT_ROUTES.map(route => `${route.id}|${route.route}`))) {
    addFailure(failures, "registered-route-set", "the block-context registry does not match the exact eight registered routes");
  }
  if (!sameArray(SUITE_VIEWPORTS.map(viewport => viewport.id), EXPECTED_CONTEXT_VIEWPORT_IDS)) addFailure(failures, "viewport-registry-mismatch", "the suite viewport registry must be PC, tablet landscape, and mobile");
  const coverage = validateExactCoverage(report, failures);
  if (!artifact || typeof artifact !== "object" || !Number.isSafeInteger(artifact.bodyBytes) || artifact.bodyBytes <= 0) {
    addFailure(failures, "artifact-byte-sum-invalid", "a positive stat-derived artifact byte sum is required");
  } else {
    failures.push(...(Array.isArray(artifact.failures) ? artifact.failures : []));
  }
  const bodyBytes = Number.isSafeInteger(artifact?.bodyBytes) ? artifact.bodyBytes : 0;
  for (const result of coverage.contextResults) validateContextResult(result, bodyBytes, failures);
  return {
    schemaVersion: BLOCK_CONTEXT_PERFORMANCE_AUDIT_SCHEMA_VERSION,
    tool: "scripts/audit_block_context_performance.mjs",
    generatedAt: new Date().toISOString(),
    passed: failures.length === 0,
    reportAllPassed: report?.allPassed === true,
    counts: {
      expected: EXPECTED_PERFORMANCE_RESULT_COUNT,
      observed: coverage.results.length,
      base: coverage.baseResults.length,
      context: coverage.contextResults.length,
      contextRoutes: BLOCK_CONTEXT_ROUTES.length,
      contextViewports: EXPECTED_CONTEXT_VIEWPORT_IDS.length,
      contextModes: EXPECTED_CONTEXT_MODES.length,
    },
    artifact: {
      bodyBytes: Number.isSafeInteger(artifact?.bodyBytes) ? artifact.bodyBytes : null,
      assets: Array.isArray(artifact?.assets) ? artifact.assets : [],
      requestPaths: [...EXPECTED_CONTEXT_REQUEST_PATHS],
    },
    thresholds: {
      contextStableTimeMs: BLOCK_CONTEXT_STABLE_TIME_LIMIT_MS,
      settledBackingStorageBytes: BLOCK_CONTEXT_SETTLED_BACKING_LIMIT_BYTES,
      sampledPeakBackingStorageBytes: BLOCK_CONTEXT_SAMPLED_PEAK_LIMIT_BYTES,
      encodedBytesSlack: 8192,
    },
    failures,
  };
}

/**
 * Read a local suite report, stat its seven expected public assets, and run
 * the pure report audit.  This is the programmatic equivalent of the CLI.
 */
export async function auditBlockContextPerformanceReport(report, {
  projectRoot = PROJECT_ROOT,
  assetStat = defaultAssetStat,
} = {}) {
  const artifact = await deriveArtifactBodyByteSum({ projectRoot, assetStat });
  return auditBlockContextPerformance(report, { artifact });
}

export const auditPerformanceReport = auditBlockContextPerformance;

function usage() {
  return [
    "Usage:",
    "  node scripts/audit_block_context_performance.mjs \\",
    "    --report work/performance/performance-suite-block-context-all-specimens-2026-08-23.json \\",
    "    --output work/performance/block-context-performance-audit.json",
    "",
    "Required: --report <local JSON report>",
    "Optional: --output <local JSON audit result>",
  ].join("\n");
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    console.log(usage());
    return null;
  }
  const reportPath = isAbsolute(args.report) ? args.report : resolve(args.report);
  let report;
  try {
    report = JSON.parse(await readFile(reportPath, "utf8"));
  } catch (error) {
    throw new Error(`could not read --report ${reportPath}: ${error instanceof Error ? error.message : String(error)}`);
  }
  const audit = await auditBlockContextPerformanceReport(report);
  if (args.output) {
    const outputPath = isAbsolute(args.output) ? args.output : resolve(args.output);
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(audit, null, 2)}\n`, "utf8");
  }
  console.log(JSON.stringify(audit, null, 2));
  if (!audit.passed) process.exitCode = 1;
  return audit;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch(error => {
    console.error(`block-context performance audit failed: ${error.message}`);
    process.exitCode = 1;
  });
}
