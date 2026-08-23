#!/usr/bin/env node

/**
 * Run the fixed local browser-performance matrix used by the beta audit.
 *
 * This is intentionally a small coordinator around the single-route runner.
 * It never chooses a public URL: the single-route runner validates the
 * loopback-only base URL before opening Chrome for every matrix entry.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { arch, cpus, freemem, platform, release, totalmem, version } from "node:os";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  BLOCK_CONTEXT_ROUTES,
  BLOCK_CONTEXT_SCENARIO,
  measureBrowserPerformance,
  resolveRoute,
} from "./measure_browser_performance.mjs";

export { BLOCK_CONTEXT_SCENARIO };
export { BLOCK_CONTEXT_ROUTES };

export const PERFORMANCE_SUITE_SCHEMA_VERSION = 1;
export const SUITE_MODES = Object.freeze(["cold", "warm"]);

export const SUITE_ROUTES = Object.freeze([
  Object.freeze({ id: "home", route: "#workspace/home" }),
  Object.freeze({ id: "surface-lateral", route: "#workspace/surface/lateral" }),
  Object.freeze({ id: "sections-horizontal", route: "#workspace/sections/horizontal" }),
  Object.freeze({ id: "blocks-lateral-ventricle", route: "#workspace/blocks/lateral-ventricle" }),
  Object.freeze({ id: "quiz", route: "#workspace/quiz" }),
  Object.freeze({ id: "segment", route: "#workspace/segment" }),
]);

export const SUITE_VIEWPORTS = Object.freeze([
  Object.freeze({ id: "pc", label: "PC", width: 1366, height: 768 }),
  Object.freeze({ id: "tablet-landscape", label: "tablet landscape", width: 1024, height: 768 }),
  Object.freeze({ id: "mobile", label: "mobile", width: 390, height: 768 }),
]);

const FULL_MATRIX_VIEWPORT_IDS = Object.freeze(["pc", "tablet-landscape"]);
const MOBILE_MATRIX_ROUTE_IDS = Object.freeze(["home", "sections-horizontal", "quiz"]);
const BLOCK_CONTEXT_MATRIX_VIEWPORT_IDS = Object.freeze(["pc", "tablet-landscape", "mobile"]);

function usage() {
  return [
    "Usage:",
    "  node scripts/measure_browser_performance_suite.mjs \\",
    "    --base-url http://localhost:4173 \\",
    "    --output work/performance/suite.json",
    "",
    "Required options: --base-url, --output",
    "Matrix: 31 base entries plus 48 block-context entries (8 block specimen routes × 3 viewports × cold/warm)",
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

export function parseSuiteArgs(argv) {
  const options = { baseUrl: null, output: null, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--help" || token === "-h") {
      options.help = true;
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
  // resolveRoute performs the same loopback-only validation as the single
  // route runner without opening Chrome or making a network request.
  resolveRoute(options.baseUrl, "/");
  return options;
}

function routeById(id) {
  const route = SUITE_ROUTES.find(candidate => candidate.id === id)
    || BLOCK_CONTEXT_ROUTES.find(candidate => candidate.id === id);
  if (!route) throw new Error(`unknown suite route: ${id}`);
  return route;
}

function viewportById(id) {
  const viewport = SUITE_VIEWPORTS.find(candidate => candidate.id === id);
  if (!viewport) throw new Error(`unknown suite viewport: ${id}`);
  return viewport;
}

function makeEntry({ viewportId, routeId, mode, scenario = "none" }) {
  const viewport = viewportById(viewportId);
  const route = routeById(routeId);
  const scenarioSuffix = scenario === "none" ? "" : `-${scenario}`;
  return {
    key: `${viewport.id}-${route.id}-${mode}${scenarioSuffix}`,
    routeId: route.id,
    route: route.route,
    viewportId: viewport.id,
    width: viewport.width,
    height: viewport.height,
    mode,
    scenario,
  };
}

/**
 * Return the deterministic 79-entry matrix:
 *  - PC and tablet: all six routes, cold and warm (24 entries)
 *  - mobile: home, horizontal sections, and quiz, cold and warm (6 entries)
 *  - one mobile basic interaction scenario (1 entry)
 *  - each of the eight block specimen context windows: all three viewports,
 *    cold and warm (48 entries)
 */
export function buildPerformanceMatrix() {
  const entries = [];
  for (const viewportId of FULL_MATRIX_VIEWPORT_IDS) {
    for (const route of SUITE_ROUTES) {
      for (const mode of SUITE_MODES) entries.push(makeEntry({ viewportId, routeId: route.id, mode }));
    }
  }
  for (const routeId of MOBILE_MATRIX_ROUTE_IDS) {
    for (const mode of SUITE_MODES) entries.push(makeEntry({ viewportId: "mobile", routeId, mode }));
  }
  entries.push(makeEntry({ viewportId: "mobile", routeId: "quiz", mode: "cold", scenario: "basic-mobile" }));
  for (const viewportId of BLOCK_CONTEXT_MATRIX_VIEWPORT_IDS) {
    for (const route of BLOCK_CONTEXT_ROUTES) {
      for (const mode of SUITE_MODES) {
        entries.push(makeEntry({
          viewportId,
          routeId: route.id,
          mode,
          scenario: BLOCK_CONTEXT_SCENARIO,
        }));
      }
    }
  }
  return entries;
}

export function suiteMatrixDefinition(matrix = buildPerformanceMatrix()) {
  return {
    routes: SUITE_ROUTES.map(route => ({ ...route })),
    viewports: SUITE_VIEWPORTS.map(viewport => ({ ...viewport })),
    modes: [...SUITE_MODES],
    fullViewportIds: [...FULL_MATRIX_VIEWPORT_IDS],
    mobileRouteIds: [...MOBILE_MATRIX_ROUTE_IDS],
    basicMobileScenario: {
      viewportId: "mobile",
      routeId: "quiz",
      mode: "cold",
      scenario: "basic-mobile",
    },
    blockContextScenario: {
      routeIds: BLOCK_CONTEXT_ROUTES.map(route => route.id),
      routes: BLOCK_CONTEXT_ROUTES.map(route => ({ ...route })),
      viewportIds: [...BLOCK_CONTEXT_MATRIX_VIEWPORT_IDS],
      modes: [...SUITE_MODES],
      scenario: BLOCK_CONTEXT_SCENARIO,
    },
    entryCount: matrix.length,
    entries: matrix.map(entry => ({ ...entry })),
  };
}

export function collectSuiteEnvironment() {
  const cpuCount = cpus().length;
  return {
    os: {
      platform: platform(),
      release: release(),
      version: version(),
      arch: arch(),
    },
    cpuCount,
    memoryBytes: {
      total: totalmem(),
      free: freemem(),
    },
    nodeVersion: process.version,
  };
}

function failedResult(entry, error) {
  const message = error instanceof Error ? error.message : String(error);
  return {
    key: entry.key,
    routeId: entry.routeId,
    route: entry.route,
    viewportId: entry.viewportId,
    viewport: { width: entry.width, height: entry.height },
    mode: entry.mode,
    scenario: entry.scenario,
    status: "error",
    measurementPassed: false,
    validation: { passed: false, failures: [`runner:${message}`] },
    error: { name: error instanceof Error ? error.name : "Error", message },
  };
}

/**
 * Run each entry serially so the output is reproducible and Chrome profiles
 * cannot compete for memory. A thrown entry is recorded and does not prevent
 * later entries from being written to the same report.
 */
export async function runPerformanceSuite(baseUrl, {
  matrix = buildPerformanceMatrix(),
  measure = measureBrowserPerformance,
  onResult = null,
} = {}) {
  const results = [];
  for (const entry of matrix) {
    let result;
    try {
      result = await measure({
        baseUrl,
        route: entry.route,
        width: entry.width,
        height: entry.height,
        mode: entry.mode,
        scenario: entry.scenario,
      });
      result = {
        ...result,
        key: entry.key,
        routeId: entry.routeId,
        viewportId: entry.viewportId,
      };
    } catch (error) {
      result = failedResult(entry, error);
    }
    results.push(result);
    if (typeof onResult === "function") await onResult(result, entry);
  }
  return results;
}

export function aggregateSuiteResults({
  baseUrl,
  matrix = buildPerformanceMatrix(),
  results = [],
  generatedAt = new Date().toISOString(),
  environment = collectSuiteEnvironment(),
} = {}) {
  const expectedKeys = new Set(matrix.map(entry => entry.key));
  const uniqueResultKeys = new Set(results.map(result => result?.key));
  const allPassed = results.length === matrix.length
    && uniqueResultKeys.size === matrix.length
    && matrix.every(entry => expectedKeys.has(entry.key) && results.find(result => result?.key === entry.key)?.measurementPassed === true);
  return {
    schemaVersion: PERFORMANCE_SUITE_SCHEMA_VERSION,
    generatedAt,
    tool: "scripts/measure_browser_performance_suite.mjs",
    baseUrl,
    environment,
    matrix: {
      definition: suiteMatrixDefinition(matrix),
      results,
    },
    allPassed,
  };
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseSuiteArgs(argv);
  if (args.help) {
    console.log(usage());
    return null;
  }
  const matrix = buildPerformanceMatrix();
  const results = await runPerformanceSuite(args.baseUrl, {
    matrix,
    onResult: result => console.log(`${result.key}: ${result.measurementPassed ? "passed" : "failed"}`),
  });
  const report = aggregateSuiteResults({ baseUrl: args.baseUrl, matrix, results });
  const outputPath = isAbsolute(args.output) ? args.output : resolve(args.output);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(outputPath);
  if (!report.allPassed) {
    const failed = report.matrix.results.filter(result => result?.measurementPassed !== true).map(result => result?.key || "unknown");
    console.error(`browser performance suite validation failed: ${failed.join(", ")}`);
    process.exitCode = 1;
  }
  return report;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch(error => {
    console.error(`browser performance suite failed: ${error.message}`);
    process.exitCode = 1;
  });
}
