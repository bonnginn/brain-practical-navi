#!/usr/bin/env node

/**
 * Audit the initial payload of every canonical desktop route.
 *
 * The route list intentionally comes from audit_beta_routes.mjs.  This keeps
 * the payload audit coupled to the current canonical route contract
 * without maintaining a second list that can drift.
 *
 * The browser collector uses the same dependency-free CDP primitives as the
 * performance runner.  The validation and report builders are pure functions
 * so tests can inject measurements and never need to launch Chrome.
 */

import { existsSync, readdirSync, statSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  BETA_AUDIT_ROUTES,
  expectedCanvasCount,
} from "./audit_beta_routes.mjs";
import {
  aggregateNetworkMetrics,
  attachObservers,
  closeChrome,
  configurePage,
  createMeasurementState,
  evaluate,
  launchChrome,
  navigate,
  prepareRoute,
  resetMeasurementState,
  resolveRoute,
  waitForDocumentReady,
} from "./measure_browser_performance.mjs";

export const INITIAL_ROUTE_PAYLOAD_AUDIT_SCHEMA_VERSION = 2;
export const INITIAL_ROUTE_PAYLOAD_VIEWPORT = Object.freeze({
  id: "pc",
  label: "PC",
  width: 1366,
  height: 768,
});
export const INITIAL_ROUTE_PAYLOAD_ROUTES = BETA_AUDIT_ROUTES;
export const INITIAL_ROUTE_PAYLOAD_EXPECTED_ROUTE_COUNT = INITIAL_ROUTE_PAYLOAD_ROUTES.length;
export const INITIAL_ROUTE_PAYLOAD_BUDGET_OVERHEAD_BYTES = 256 * 1024;
export const INITIAL_ROUTE_PAYLOAD_STABLE_QUIET_MS = 500;
export const INITIAL_ROUTE_PAYLOAD_TIMEOUT_MS = 60_000;

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const DEFAULT_PROJECT_ROOT = resolve(SCRIPT_DIRECTORY, "..");
const DEFAULT_BASE_URL = "http://127.0.0.1:4173";

const LARGE_ASSET_PATTERN = /\.(?:mesh(?:\.gz)?|bin\.gz|nii(?:\.gz)?|vol(?:\.gz)?)$/i;
const MESH_PATTERN = /\.mesh(?:\.gz)?$/i;
const BINARY_VOLUME_PATTERN = /\.(?:bin\.gz|nii(?:\.gz)?|vol(?:\.gz)?)$/i;

export const PIAL_MESH_COMPRESSED_ASSETS = Object.freeze(["pial-left.mesh.gz", "pial-right.mesh.gz"]);
export const PIAL_MESH_RAW_ASSETS = Object.freeze(["pial-left.mesh", "pial-right.mesh"]);
const SURFACE_BASE_ASSETS = Object.freeze([
  ...PIAL_MESH_COMPRESSED_ASSETS,
  "segment-cerebellum.mesh",
  "segment-pons-medulla.mesh",
  "segment-midbrain.mesh",
]);
const SURFACE_BASAL_ASSETS = Object.freeze([
  "landmark-olfactory-pathway.mesh",
  "landmark-optic-pathway.mesh",
  "landmark-infundibulum.mesh",
  "landmark-mammillary-bodies.mesh",
  "landmark-anterior-perforated-substance.mesh",
  "block-midbrain-section-cerebral-peduncles.mesh",
  "block-hindbrain-pyramids.mesh",
  "block-hindbrain-olives.mesh",
]);
const SURFACE_HYPOTHALAMUS_ASSET = "block-diencephalon-hypothalamus.mesh";
const SURFACE_NERVE_ASSETS = Object.freeze([
  "overlay-arteries-anterior.mesh",
  "overlay-nerves-anterior.mesh",
  "overlay-nerves-pontine.mesh",
  "overlay-nerves-medullary.mesh",
]);
const SURFACE_VESSEL_ASSETS = Object.freeze([
  "overlay-arteries-anterior.mesh",
  "overlay-arteries-posterior.mesh",
]);
// The route's nerves-only initial view fetches the three nerve meshes.  Keep
// the two artery meshes separate so an artery route cannot silently broaden
// the contract to every neurovascular asset.
const SURFACE_NERVE_ONLY_ASSETS = Object.freeze(SURFACE_NERVE_ASSETS.filter(name => name.startsWith("overlay-nerves-")));
const SECTION_SUPPORT_ASSETS = Object.freeze([
  "ventricle.mesh",
  "caudate.mesh",
]);
const SECTION_INITIAL_ASSETS = Object.freeze([
  "bigbrain-icbm500.bin.gz",
  "bigbrain-practical-segmentation-icbm500.bin.gz",
  ...SURFACE_BASE_ASSETS,
  ...SECTION_SUPPORT_ASSETS,
]);
const MODEL_STRATEGY_ASSETS = Object.freeze([
  "block-commissural-system-lateral-ventricles.mesh",
  "block-diencephalon-third-ventricle.mesh",
  "comparison-schematic-ventricle.mesh",
]);
const SURFACE_ROUTE_ASSETS = Object.freeze({
  "surface-lateral": [...SURFACE_BASE_ASSETS],
  "surface-superior": [...SURFACE_BASE_ASSETS],
  "surface-inferior": [...SURFACE_BASE_ASSETS, ...SURFACE_BASAL_ASSETS, SURFACE_HYPOTHALAMUS_ASSET, ...SURFACE_NERVE_ONLY_ASSETS],
  // The medial route starts with an exposed shell only; deep landmark
  // controls are opt-in and therefore not part of its initial payload.
  "surface-medial": [...SURFACE_BASE_ASSETS],
  "surface-arteries": [...SURFACE_BASE_ASSETS, ...SURFACE_BASAL_ASSETS, SURFACE_HYPOTHALAMUS_ASSET, ...SURFACE_VESSEL_ASSETS, ...SURFACE_NERVE_ONLY_ASSETS],
  "surface-nerves": [...SURFACE_BASE_ASSETS, ...SURFACE_BASAL_ASSETS, SURFACE_HYPOTHALAMUS_ASSET, ...SURFACE_NERVE_ONLY_ASSETS],
  "surface-free": [...SURFACE_BASE_ASSETS, ...SURFACE_BASAL_ASSETS, SURFACE_HYPOTHALAMUS_ASSET, ...SURFACE_NERVE_ONLY_ASSETS],
});

const SUPPORT_BLOCK_ASSETS = new Set([...SURFACE_BASAL_ASSETS, SURFACE_HYPOTHALAMUS_ASSET]);

const ALL_LARGE_FAMILIES = Object.freeze([
  "surface",
  "volume",
  "segmentation",
  "blocks",
  "teaching-overlays",
  "section-support",
  "other-large",
]);

function routeKeyOf(routeOrKey) {
  if (typeof routeOrKey === "string") return routeOrKey.replace(/^#/, "").replace(/^workspace\//, "");
  return routeOrKey?.id || routeOrKey?.routeKey || routeOrKey?.key || "";
}

/** Return the stable broad family used by the payload contract. */
export function initialRouteFamily(routeOrKey) {
  const key = routeKeyOf(routeOrKey).replaceAll("/", "-");
  if (key === "home") return "home";
  if (key.startsWith("surface-")) return "surface";
  if (key.startsWith("sections-")) return "sections";
  if (key.startsWith("blocks-")) return "blocks";
  if (key === "quiz") return "quiz";
  if (key === "collaborate") return "collaborate";
  if (key === "collaborate-model-strategy") return "model-comparison";
  if (key === "segment") return "segment";
  if (["status", "help", "feedback", "legal"].includes(key)) return "static-overlay";
  return "unknown";
}

// Short alias for callers that use the noun rather than the audit-specific
// name.  Both names are intentionally exported for small downstream tools.
export const routeFamily = initialRouteFamily;

function fileNameFromPath(value) {
  const normalized = normalizeRequestPath(value) || String(value || "");
  const withoutQuery = normalized.split("?", 1)[0].split("#", 1)[0];
  return withoutQuery.split("/").filter(Boolean).at(-1) || "";
}

/** Convert a browser URL to a stable request path while preserving queries. */
export function normalizeRequestPath(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  const input = value.trim().replaceAll("\\", "/");
  try {
    const url = new URL(input, DEFAULT_BASE_URL);
    if (url.protocol === "data:" || url.protocol === "blob:") return url.protocol;
    return `${url.pathname || "/"}${url.search || ""}`;
  } catch {
    const queryless = input.split("#", 1)[0];
    return queryless.startsWith("/") ? queryless : `/${queryless}`;
  }
}

function pathNameWithoutQuery(value) {
  return (normalizeRequestPath(value) || String(value || "")).split("?", 1)[0];
}

function requestPathIdentity(value) {
  // A cache-busting query must not hide a duplicate large asset request.
  return pathNameWithoutQuery(value).replace(/\/{2,}/g, "/");
}

export function isLargeAssetPath(value) {
  return LARGE_ASSET_PATTERN.test(fileNameFromPath(value));
}

/** Classify only payload-sized atlas files; app JS/CSS and metadata are app. */
export function assetFamilyForPath(value) {
  const name = fileNameFromPath(value).toLowerCase();
  if (!isLargeAssetPath(value)) return "application";
  if (name.startsWith("block-") && SUPPORT_BLOCK_ASSETS.has(name)) return "teaching-overlays";
  if (name.startsWith("block-")) return "blocks";
  if (name.startsWith("pial-") || name.startsWith("segment-")) return "surface";
  if (name.startsWith("overlay-") || name.startsWith("landmark-") || name.startsWith("surface-landmark-")) return "teaching-overlays";
  if (name === "mni-cerebra-1mm.bin.gz" || name === "bigbrain-icbm500.bin.gz" || name === "bigbrain-fixed-mri-0444.bin.gz") return "volume";
  if (name.startsWith("bigbrain-practical-segmentation-") || name.startsWith("bigbrain-manual-subcortical-")) return "segmentation";
  if (SECTION_SUPPORT_ASSETS.some(asset => asset.toLowerCase() === name) || name.startsWith("section-")) return "section-support";
  return "other-large";
}

function inventoryFileRecord(file, atlasRoot) {
  const name = typeof file === "string" ? file : file?.name;
  if (!name || name === "DATA-MANIFEST.json") return null;
  const bytes = typeof file === "object" && Number.isFinite(file.bytes)
    ? Math.max(0, Math.round(file.bytes))
    : (() => {
      try { return Math.max(0, statSync(join(atlasRoot, name)).size); }
      catch { return null; }
    })();
  if (bytes === null) return null;
  const path = `/atlas/${name}`;
  return { name, path, bytes, family: assetFamilyForPath(path) };
}

function staticArtifactBytes(projectRoot) {
  const candidates = [
    join(projectRoot, "dist", "index.html"),
    join(projectRoot, "public", "home-surface-preview.png"),
    join(projectRoot, "public", "favicon.svg"),
  ];
  const assetDirectory = join(projectRoot, "dist", "assets");
  if (existsSync(assetDirectory)) {
    for (const name of readdirSync(assetDirectory)) candidates.push(join(assetDirectory, name));
  }
  return candidates.reduce((sum, path) => {
    try { return sum + statSync(path).size; }
    catch { return sum; }
  }, 0);
}

/** Read the current distributed atlas artifact sizes used to set budgets. */
export function buildInitialRouteArtifactInventory({ projectRoot = DEFAULT_PROJECT_ROOT, files = null } = {}) {
  const atlasRoot = join(projectRoot, "public", "atlas");
  const sourceFiles = Array.isArray(files)
    ? files
    : existsSync(atlasRoot) ? readdirSync(atlasRoot).filter(name => statSync(join(atlasRoot, name)).isFile()) : [];
  const inventoryFiles = sourceFiles.map(file => inventoryFileRecord(file, atlasRoot)).filter(Boolean);
  return {
    projectRoot,
    atlasRoot,
    staticBytes: staticArtifactBytes(projectRoot),
    files: inventoryFiles,
    generatedFrom: "public/atlas plus dist application artifacts",
  };
}

function cloneAssetList(value) {
  return [...new Set((Array.isArray(value) ? value : []).filter(item => typeof item === "string"))];
}

function blockAssetNames(route, inventory) {
  const key = routeKeyOf(route);
  const specimen = key.replace(/^blocks-/, "");
  const prefix = `block-${specimen}-`;
  return inventory.files.filter(file => file.name.startsWith(prefix) && MESH_PATTERN.test(file.name)).map(file => file.name);
}

function requiredAssetsForRoute(route, inventory) {
  const key = routeKeyOf(route);
  const family = initialRouteFamily(route);
  if (family === "surface") return cloneAssetList(SURFACE_ROUTE_ASSETS[key] || SURFACE_BASE_ASSETS);
  if (family === "sections") return [...SECTION_INITIAL_ASSETS];
  if (family === "blocks") return blockAssetNames(route, inventory);
  if (family === "model-comparison") return [...MODEL_STRATEGY_ASSETS];
  if (family === "segment") return ["bigbrain-icbm500.bin.gz", "bigbrain-practical-segmentation-icbm500.bin.gz"];
  return [];
}

function allowedAssetFamiliesForRoute(route) {
  switch (initialRouteFamily(route)) {
    case "surface": return ["surface", "teaching-overlays"];
    case "sections": return ["surface", "volume", "segmentation", "section-support"];
    case "blocks": return ["blocks"];
    case "model-comparison": return ["blocks", "other-large"];
    case "quiz": return ["surface", "volume", "teaching-overlays", "section-support"];
    // The editor intentionally reads the source BigBrain volume alongside
    // the practical label volume; both are part of its declared payload.
    case "segment": return ["volume", "segmentation"];
    default: return [];
  }
}

function assetFilesForBudget(route, inventory, allowedFamilies) {
  const names = new Set(requiredAssetsForRoute(route, inventory));
  return inventory.files.filter(file => names.has(file.name));
}

function budgetForAssets(assetNames, inventory) {
  const names = cloneAssetList(assetNames);
  const files = inventory.files.filter(file => names.includes(file.name));
  const assetBytes = files.reduce((sum, file) => sum + file.bytes, 0);
  return {
    bytes: inventory.staticBytes + assetBytes + INITIAL_ROUTE_PAYLOAD_BUDGET_OVERHEAD_BYTES,
    baselineBytes: inventory.staticBytes,
    allowedArtifactBytes: assetBytes,
    overheadBytes: INITIAL_ROUTE_PAYLOAD_BUDGET_OVERHEAD_BYTES,
    artifactBasis: files.map(file => ({ name: file.name, bytes: file.bytes, family: file.family })),
  };
}

function quizAlternatives(inventory) {
  const alternatives = [
    {
      id: "surface-neurovascular-nerves",
      requiredAssets: [...SURFACE_BASE_ASSETS, ...SURFACE_NERVE_ONLY_ASSETS],
    },
    {
      id: "surface-neurovascular-vessels",
      requiredAssets: [...SURFACE_BASE_ASSETS, ...SURFACE_VESSEL_ASSETS],
    },
    {
      id: "surface",
      requiredAssets: [...SURFACE_BASE_ASSETS],
    },
    {
      id: "section",
      requiredAssets: [...SECTION_INITIAL_ASSETS.slice(0, 2)],
    },
  ];
  return alternatives.map(alternative => ({
    ...alternative,
    allowedAssets: [...alternative.requiredAssets],
    budget: budgetForAssets(alternative.requiredAssets, inventory),
  }));
}

function contractForRoute(route, inventory) {
  const family = initialRouteFamily(route);
  const allowedAssetFamilies = allowedAssetFamiliesForRoute(route);
  const forbiddenAssetFamilies = ALL_LARGE_FAMILIES.filter(candidate => !allowedAssetFamilies.includes(candidate));
  const requiredAssets = requiredAssetsForRoute(route, inventory);
  const alternatives = family === "quiz" ? quizAlternatives(inventory) : [];
  const budget = budgetForAssets(requiredAssets, inventory);
  const budgetBytes = budget.bytes;
  const exactAllowedAssets = family === "quiz"
    ? [...new Set(alternatives.flatMap(alternative => alternative.allowedAssets))]
    : [...requiredAssets];
  const forbiddenAssetPaths = PIAL_MESH_RAW_ASSETS.map(name => `/atlas/${name}`);
  const teachingOverlayAssets = exactAllowedAssets.filter(name => assetFamilyForPath(`/atlas/${name}`) === "teaching-overlays");
  const missingArtifactAssets = [...requiredAssets, ...alternatives.flatMap(alternative => alternative.requiredAssets)]
    .filter(name => !inventory.files.some(file => file.name === name));
  const rationale = [
    `baseline ${inventory.staticBytes} B from current dist/index.html, dist/assets, home preview and favicon`,
    `exact allowed atlas artifacts ${budget.allowedArtifactBytes} B from the route's required asset list`,
    `fixed ${INITIAL_ROUTE_PAYLOAD_BUDGET_OVERHEAD_BYTES} B allowance for document/request framing and non-atlas metadata`,
    "budget is artifact-derived and is not fitted to measured route bytes",
  ].join("; ");
  return {
    routeKey: routeKeyOf(route),
    family,
    allowedAssetFamilies,
    forbiddenAssetFamilies,
    requiredAssets: cloneAssetList(requiredAssets),
    // Exact path allowlists make same-family eager additions fail too.
    allowedAssetPaths: exactAllowedAssets.map(name => `/atlas/${name}`),
    forbiddenAssetPaths,
    teachingOverlayAssets,
    requiredAssetGroups: [],
    alternatives,
    budget: { ...budget, bytes: budgetBytes, rationale },
    missingArtifactAssets: cloneAssetList(missingArtifactAssets),
  };
}

/** Build explicit route contracts from the checked-in artifact inventory. */
export function buildInitialRoutePayloadContracts({ routes = INITIAL_ROUTE_PAYLOAD_ROUTES, inventory = buildInitialRouteArtifactInventory() } = {}) {
  const contracts = Object.fromEntries(routes.map(route => [routeKeyOf(route), contractForRoute(route, inventory)]));
  return Object.assign(contracts, { inventory, policy: {
    overheadBytes: INITIAL_ROUTE_PAYLOAD_BUDGET_OVERHEAD_BYTES,
    rationale: "Budgets are calculated from current public/atlas and dist artifacts with a fixed transparent overhead; observed bytes never set a budget.",
  } });
}

function getContract(contractSource, route) {
  if (!contractSource) return null;
  if (contractSource instanceof Map) return contractSource.get(routeKeyOf(route)) || null;
  if (contractSource.contracts) return getContract(contractSource.contracts, route);
  return contractSource[routeKeyOf(route)] || null;
}

function requestPathMatches(path, expected) {
  const normalized = pathNameWithoutQuery(path).toLowerCase();
  const candidate = String(expected || "").replaceAll("\\", "/").toLowerCase();
  return normalized === candidate || normalized.endsWith(`/${candidate}`);
}

function collectRequestRecords(source) {
  if (!source) return [];
  if (Array.isArray(source)) return source;
  if (source.requestHops instanceof Map) return [...source.requestHops.values()].flat();
  if (source.requests instanceof Map) return [...source.requests.values()];
  if (Array.isArray(source.requestPaths)) return source.requestPaths.map(path => ({ url: path }));
  return [];
}

/** Return every observed request path, including duplicate requests. */
export function extractInitialRouteRequestPaths(source) {
  return collectRequestRecords(source).map(record => normalizeRequestPath(record?.url || record)).filter(Boolean);
}

export const extractRequestPaths = extractInitialRouteRequestPaths;

function duplicateLargeAssetPaths(paths) {
  const counts = new Map();
  for (const path of paths) {
    if (!isLargeAssetPath(path)) continue;
    const identity = requestPathIdentity(path);
    counts.set(identity, (counts.get(identity) || 0) + 1);
  }
  return [...counts.entries()].filter(([, count]) => count > 1).map(([path]) => path);
}

function assetNamesFromPaths(paths) {
  return [...new Set(paths.filter(isLargeAssetPath).map(path => fileNameFromPath(path).toLowerCase()))];
}

function alternativeMatches(alternative, requestPaths) {
  const requiredAssets = Array.isArray(alternative?.requiredAssets) ? alternative.requiredAssets : [];
  const allowedAssets = Array.isArray(alternative?.allowedAssets) ? alternative.allowedAssets : requiredAssets;
  // A one-file alternative is not a meaningful route contract: it can pass
  // simply because one request happened to be observed.  Keep this explicit
  // so a forged or accidentally weakened quiz contract cannot pass.
  if (requiredAssets.length < 2 || allowedAssets.length < 2) return false;
  const required = requiredAssets.every(expected => requestPaths.some(path => requestPathMatches(path, expected)));
  const observedWithinAlternative = requestPaths
    .filter(isLargeAssetPath)
    .every(path => allowedAssets.some(expected => requestPathMatches(path, expected)));
  return required && observedWithinAlternative;
}

function probeDefaults() {
  return {
    readyState: null,
    hash: null,
    identityPresent: false,
    identityText: "",
    appRootPresent: false,
    canvasCount: null,
    loadingCount: null,
    uiErrors: [],
    consoleErrors: [],
    requestErrors: [],
    stable: false,
    now: null,
    clientWidth: null,
    scrollWidth: null,
    horizontalOverflow: true,
    webglFallback: false,
  };
}

function normalizedErrorList(value) {
  return Array.isArray(value) ? value : [];
}

/**
 * Validate one route's browser observation and its payload contract.
 *
 * This is deliberately pure.  A caller can pass synthetic request paths and
 * probes to exercise missing, duplicate, forbidden, and budget anomalies.
 */
export function validateInitialRoutePayloadResult({ route, viewport = INITIAL_ROUTE_PAYLOAD_VIEWPORT, result = {}, contract = null, contracts = null } = {}) {
  const routeKey = routeKeyOf(route);
  const selectedContract = contract || getContract(contracts, route);
  const measurement = result || {};
  const probe = measurement.probe || measurement;
  const requestPaths = Array.isArray(measurement.requestPaths)
    ? measurement.requestPaths.map(path => normalizeRequestPath(path)).filter(Boolean)
    : extractInitialRouteRequestPaths(measurement);
  const failures = [];
  if (!route || !routeKey) failures.push("route-missing");
  if (measurement.routeKey && measurement.routeKey !== routeKey) failures.push("route-key-mismatch");
  if (measurement.key && measurement.key !== routeKey) failures.push("route-key-mismatch");
  if (!selectedContract) failures.push("contract-missing");
  if (measurement.error) failures.push("runtime-error");
  if (probe.readyState !== "complete") failures.push("document-not-ready");
  if (probe.hash !== route?.hash) failures.push("hash-mismatch");
  if (probe.appRootPresent !== true) failures.push("app-root-missing");
  if (probe.identityPresent !== true) failures.push("identity-missing");
  if (probe.identityPresent && probe.identityText !== route?.identity?.text) failures.push("identity-mismatch");
  if (probe.loadingCount !== 0) failures.push("loader-visible");
  if (normalizedErrorList(probe.uiErrors).length) failures.push("ui-errors");
  if (normalizedErrorList(measurement.consoleErrors).length) failures.push("console-errors");
  if (normalizedErrorList(measurement.requestErrors).length) failures.push("request-errors");
  if (probe.horizontalOverflow !== false) failures.push("horizontal-overflow");
  if (probe.webglFallback === true) failures.push("webgl-fallback");
  const expectedCanvas = route && viewport ? expectedCanvasCount(route, { ...viewport, id: viewport.id || "pc" }) : null;
  if (expectedCanvas !== null && probe.canvasCount !== expectedCanvas) failures.push(`canvas-count:${probe.canvasCount}!=${expectedCanvas}`);
  if (measurement.stable !== true) failures.push("not-stable");
  if (!Array.isArray(measurement.requestPaths) && !measurement.requests && !measurement.requestHops) failures.push("request-paths-missing");

  const duplicateAssets = duplicateLargeAssetPaths(requestPaths);
  if (duplicateAssets.length) failures.push(`duplicate-assets:${duplicateAssets.join(",")}`);
  const forbiddenAssets = [];
  let matchedAlternative = null;
  let appliedBudget = selectedContract?.budget || null;
  if (selectedContract) {
    const alternatives = Array.isArray(selectedContract.alternatives) ? selectedContract.alternatives : [];
    if (alternatives.length) {
      const invalidAlternatives = alternatives.filter(alternative => !Array.isArray(alternative.requiredAssets) || alternative.requiredAssets.length < 2 || !Array.isArray(alternative.allowedAssets) || alternative.allowedAssets.length < 2);
      if (invalidAlternatives.length) failures.push("alternative-contract-single-file");
      const matches = alternatives.filter(alternative => alternativeMatches(alternative, requestPaths));
      if (matches.length === 1) {
        [matchedAlternative] = matches;
        appliedBudget = matchedAlternative.budget;
      } else if (matches.length > 1) {
        failures.push(`alternative-ambiguous:${matches.map(alternative => alternative.id).join(",")}`);
      } else {
        failures.push(`alternative-mismatch:${alternatives.map(alternative => alternative.id).join(",")}`);
      }
      for (const path of requestPaths.filter(isLargeAssetPath)) {
        const isAllowedByAnyAlternative = alternatives.some(alternative => (alternative.allowedAssets || alternative.requiredAssets || []).some(expected => requestPathMatches(path, expected)));
        const isExplicitlyForbidden = (selectedContract.forbiddenAssetPaths || []).some(expected => requestPathMatches(path, expected));
        if (!isAllowedByAnyAlternative || isExplicitlyForbidden) forbiddenAssets.push(pathNameWithoutQuery(path));
      }
    } else {
      const allowedAssetPaths = selectedContract.allowedAssetPaths || selectedContract.requiredAssets || [];
      for (const path of requestPaths.filter(isLargeAssetPath)) {
        const assetFamily = assetFamilyForPath(path);
        const exactAllowed = allowedAssetPaths.some(expected => requestPathMatches(path, expected));
        const isExplicitlyForbidden = (selectedContract.forbiddenAssetPaths || []).some(expected => requestPathMatches(path, expected));
        if (!exactAllowed || isExplicitlyForbidden || selectedContract.forbiddenAssetFamilies.includes(assetFamily) && !selectedContract.requiredAssets.some(expected => requestPathMatches(path, expected))) {
          forbiddenAssets.push(pathNameWithoutQuery(path));
        }
      }
      const missingAssets = selectedContract.requiredAssets.filter(expected => !requestPaths.some(path => requestPathMatches(path, expected)));
      if (missingAssets.length) failures.push(`missing-assets:${missingAssets.join(",")}`);
    }
    if (forbiddenAssets.length) failures.push(`forbidden-eager-assets:${[...new Set(forbiddenAssets)].join(",")}`);
    if (selectedContract.missingArtifactAssets?.length) failures.push(`contract-artifact-missing:${selectedContract.missingArtifactAssets.join(",")}`);
    const encodedBytes = Number(measurement.encodedBytes);
    if (!Number.isFinite(encodedBytes)) failures.push("encoded-bytes-missing");
    else if (appliedBudget && encodedBytes > appliedBudget.bytes) failures.push(`over-budget:${Math.round(encodedBytes)}>${appliedBudget.bytes}`);
  }
  return {
    passed: failures.length === 0,
    failures,
    requestPaths,
    duplicateAssets: [...new Set(duplicateAssets)],
    forbiddenAssets: [...new Set(forbiddenAssets)],
    matchedAlternative: matchedAlternative?.id || null,
    appliedBudget,
  };
}

export const validateInitialRoutePayload = validateInitialRoutePayloadResult;

function browserInfo(session) {
  return {
    executable: session?.executable || null,
    product: session?.version?.Browser || null,
    userAgent: session?.version?.["User-Agent"] || null,
  };
}

function horizontalOverflowFromProbe(probe) {
  return {
    detected: Boolean(probe?.horizontalOverflow),
    clientWidth: Number.isFinite(probe?.clientWidth) ? probe.clientWidth : null,
    scrollWidth: Number.isFinite(probe?.scrollWidth) ? probe.scrollWidth : null,
  };
}

function initialRouteProbeExpression(route) {
  const selector = JSON.stringify(route.identity.selector);
  return `(() => {
    const documentElement = document.documentElement;
    const body = document.body;
    const navigation = performance.getEntriesByType("navigation")[0];
    const identity = document.querySelector(${selector});
    const clientWidth = documentElement?.clientWidth ?? window.innerWidth;
    const scrollWidth = Math.max(documentElement?.scrollWidth ?? 0, body?.scrollWidth ?? 0);
    return {
      readyState: document.readyState,
      now: Number.isFinite(navigation?.duration) ? performance.now() : performance.now(),
      dclMs: navigation ? navigation.domContentLoadedEventEnd : null,
      hash: window.location.hash,
      identityPresent: Boolean(identity),
      identityText: (identity?.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 400),
      appRootPresent: Boolean(document.querySelector("main.appShell")),
      canvasCount: document.querySelectorAll("canvas").length,
      loadingCount: document.querySelectorAll(".atlasLoading:not(.error),.segLoading:not(.error)").length,
      uiErrors: [...document.querySelectorAll(".atlasLoading.error,.segLoading.error,[role=alert]")].map(element => ({
        text: (element.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 240),
        role: element.getAttribute("role"),
        className: typeof element.className === "string" ? element.className : "",
      })),
      clientWidth,
      scrollWidth,
      horizontalOverflow: scrollWidth > clientWidth + 1,
      webglFallback: Boolean(document.querySelector(".atlasWebglFallback")),
    };
  })()`;
}

async function auditSleep(milliseconds) {
  await new Promise(resolvePromise => setTimeout(resolvePromise, milliseconds));
}

function inFlightRequestDetails(state) {
  return [...(state?.inFlight || [])].map(requestId => {
    const request = state?.requests?.get?.(requestId) || {};
    return {
      requestId: String(requestId),
      url: request.url || null,
      path: request.url ? normalizeRequestPath(request.url) : null,
      method: request.method || null,
      type: request.type || null,
    };
  });
}

function initialRouteStabilityReason(latest, state) {
  if ((state?.inFlight?.size || 0) > 0) return "network-not-quiet";
  if (!latest) return "probe-unavailable";
  return "dom-not-healthy";
}

/** Wait for the route UI and its initial network window to become quiet. */
export async function waitForInitialRouteStable(cdp, state, route, viewport = INITIAL_ROUTE_PAYLOAD_VIEWPORT, {
  timeoutMs = INITIAL_ROUTE_PAYLOAD_TIMEOUT_MS,
  quietMs = INITIAL_ROUTE_PAYLOAD_STABLE_QUIET_MS,
  evaluateFn = evaluate,
  sleepFn = auditSleep,
} = {}) {
  const startedAt = Date.now();
  const stage = "initial-route";
  const deadline = Date.now() + timeoutMs;
  let latest = null;
  let quietSince = null;
  while (Date.now() < deadline) {
    try { latest = await evaluateFn(cdp, initialRouteProbeExpression(route)); }
    catch { latest = null; }
    const expectedCanvas = expectedCanvasCount(route, { ...viewport, id: viewport.id || "pc" });
    const ready = latest?.readyState === "complete"
      && latest.hash === route.hash
      && latest.appRootPresent === true
      && latest.identityPresent === true
      && latest.identityText === route.identity.text
      && latest.loadingCount === 0
      && latest.canvasCount === expectedCanvas
      && latest.uiErrors?.length === 0
      && latest.horizontalOverflow === false
      && latest.webglFallback === false
      && state?.inFlight?.size === 0;
    if (ready) {
      if (quietSince === null) quietSince = Date.now();
      if (Date.now() - quietSince >= quietMs) {
        const elapsedMs = Date.now() - startedAt;
        return {
          probe: latest,
          latestProbe: latest,
          stable: true,
          elapsedMs,
          stage,
          reason: "stable",
          stabilityReason: "stable",
          inFlightCount: 0,
          inFlightRequests: [],
        };
      }
    } else quietSince = null;
    await sleepFn(50);
  }
  const latestProbe = latest || probeDefaults();
  const inFlightRequests = inFlightRequestDetails(state);
  return {
    probe: latestProbe,
    latestProbe,
    stable: false,
    elapsedMs: Date.now() - startedAt,
    stage,
    reason: initialRouteStabilityReason(latest, state),
    stabilityReason: initialRouteStabilityReason(latest, state),
    inFlightCount: inFlightRequests.length,
    inFlightRequests,
  };
}

function failedInitialRouteResult(route, viewport, contract, error, browser = null) {
  const message = error instanceof Error ? error.message : String(error);
  const probe = probeDefaults();
  const result = {
    routeKey: routeKeyOf(route),
    key: routeKeyOf(route),
    routeId: routeKeyOf(route),
    hash: route?.hash || null,
    url: null,
    viewport: { ...viewport },
    family: initialRouteFamily(route),
    browser,
    encodedBytes: 0,
    requestCount: 0,
    uniqueRequestCount: 0,
    requestPaths: [],
    stableTimeMs: null,
    stage: "initial-route",
    reason: "runtime-error",
    stabilityReason: "runtime-error",
    latestProbe: probe,
    elapsedMs: null,
    inFlightCount: 0,
    inFlightRequests: [],
    stability: {
      stage: "initial-route",
      reason: "runtime-error",
      stabilityReason: "runtime-error",
      latestProbe: probe,
      elapsedMs: null,
      inFlightCount: 0,
      inFlightRequests: [],
    },
    canvasCount: probe.canvasCount,
    loadingCount: probe.loadingCount,
    uiErrors: [],
    consoleErrors: [],
    requestErrors: [],
    horizontalOverflow: horizontalOverflowFromProbe(probe),
    webglFallback: false,
    error: message,
    contract,
    validation: { passed: false, failures: ["runtime-error", message] },
    passed: false,
  };
  return result;
}

function makeInitialRouteResult({ route, viewport, contract, url, browser, network, requestPaths, measured, error = null, probe = null } = {}) {
  const stableProbe = probe || measured?.probe || probeDefaults();
  const result = {
    routeKey: routeKeyOf(route),
    key: routeKeyOf(route),
    routeId: routeKeyOf(route),
    hash: route.hash,
    url,
    viewport: { ...viewport },
    family: initialRouteFamily(route),
    browser,
    encodedBytes: network.encodedBytes,
    requestCount: network.requestCount,
    uniqueRequestCount: network.uniqueRequestCount,
    requestPaths,
    uniqueRequestPaths: [...new Set(requestPaths.map(requestPathIdentity))],
    stableTimeMs: Number.isFinite(stableProbe?.now) ? stableProbe.now : null,
    stage: measured?.stage || "initial-route",
    reason: measured?.reason || (measured?.stable ? "stable" : "not-stable"),
    stabilityReason: measured?.stabilityReason || measured?.reason || (measured?.stable ? "stable" : "not-stable"),
    latestProbe: measured?.latestProbe || stableProbe,
    elapsedMs: Number.isFinite(measured?.elapsedMs) ? measured.elapsedMs : null,
    inFlightCount: Number.isFinite(measured?.inFlightCount) ? measured.inFlightCount : 0,
    inFlightRequests: Array.isArray(measured?.inFlightRequests) ? measured.inFlightRequests : [],
    stable: Boolean(measured?.stable),
    dclMs: Number.isFinite(stableProbe?.dclMs) ? stableProbe.dclMs : null,
    canvasCount: Number.isFinite(stableProbe?.canvasCount) ? stableProbe.canvasCount : null,
    loadingCount: Number.isFinite(stableProbe?.loadingCount) ? stableProbe.loadingCount : null,
    uiErrors: normalizedErrorList(stableProbe?.uiErrors),
    consoleErrors: network.consoleErrors,
    requestErrors: network.requestErrors,
    horizontalOverflow: horizontalOverflowFromProbe(stableProbe),
    webglFallback: Boolean(stableProbe?.webglFallback),
    error,
    probe: stableProbe,
    stability: {
      stage: measured?.stage || "initial-route",
      reason: measured?.reason || (measured?.stable ? "stable" : "not-stable"),
      stabilityReason: measured?.stabilityReason || measured?.reason || (measured?.stable ? "stable" : "not-stable"),
      latestProbe: measured?.latestProbe || stableProbe,
      elapsedMs: Number.isFinite(measured?.elapsedMs) ? measured.elapsedMs : null,
      inFlightCount: Number.isFinite(measured?.inFlightCount) ? measured.inFlightCount : 0,
      inFlightRequests: Array.isArray(measured?.inFlightRequests) ? measured.inFlightRequests : [],
    },
    contract,
  };
  result.validation = validateInitialRoutePayloadResult({ route, viewport, result, contract });
  result.passed = result.validation.passed;
  return result;
}

/** Collect one route with injected CDP helpers; tests can inject every call. */
export async function collectInitialRoutePayload(cdp, state, {
  baseUrl,
  route,
  viewport = INITIAL_ROUTE_PAYLOAD_VIEWPORT,
  contract,
  browser = null,
  dependencies = {},
} = {}) {
  const url = resolveRoute(baseUrl, route.hash);
  const navigateFn = dependencies.navigate || navigate;
  const waitForDocumentReadyFn = dependencies.waitForDocumentReady || waitForDocumentReady;
  const prepareRouteFn = dependencies.prepareRoute || prepareRoute;
  const waitForStableFn = dependencies.waitForInitialRouteStable || waitForInitialRouteStable;
  const evaluateFn = dependencies.evaluate || evaluate;
  let measured = null;
  let probe = null;
  let error = null;
  resetMeasurementState(state, { collecting: false });
  try {
    await navigateFn(cdp, "about:blank");
    await waitForDocumentReadyFn(cdp);
    resetMeasurementState(state, { collecting: true });
    await navigateFn(cdp, url);
    await prepareRouteFn(cdp, route.hash);
    measured = await waitForStableFn(cdp, state, route, viewport, { evaluateFn });
    probe = measured?.probe || null;
  } catch (caught) {
    error = caught instanceof Error ? caught.message : String(caught);
    probe = caught?.probe || probe;
  } finally {
    state.collecting = false;
  }
  const network = aggregateNetworkMetrics(state);
  const requestPaths = extractInitialRouteRequestPaths(state);
  return makeInitialRouteResult({ route, viewport, contract, url, browser, network, requestPaths, measured, error, probe });
}

function resultFromInjectedCheck({ route, viewport, contract, value, baseUrl }) {
  if (value && typeof value === "object" && value.validation && value.routeKey) {
    const normalized = { ...value, routeKey: value.routeKey || routeKeyOf(route), key: value.key || routeKeyOf(route), family: value.family || initialRouteFamily(route), contract: value.contract || contract };
    normalized.validation = validateInitialRoutePayloadResult({ route, viewport, result: normalized, contract: normalized.contract });
    normalized.passed = normalized.validation.passed;
    return normalized;
  }
  const raw = value && typeof value === "object" ? value : {};
  const requestPaths = Array.isArray(raw.requestPaths) ? raw.requestPaths : extractInitialRouteRequestPaths(raw);
  const probe = raw.probe || raw;
  const network = {
    encodedBytes: Number.isFinite(raw.encodedBytes) ? raw.encodedBytes : 0,
    requestCount: Number.isFinite(raw.requestCount) ? raw.requestCount : requestPaths.length,
    uniqueRequestCount: Number.isFinite(raw.uniqueRequestCount) ? raw.uniqueRequestCount : new Set(requestPaths.map(requestPathIdentity)).size,
    consoleErrors: normalizedErrorList(raw.consoleErrors),
    requestErrors: normalizedErrorList(raw.requestErrors),
  };
  return makeInitialRouteResult({
    route,
    viewport,
    contract,
    url: raw.url || resolveRoute(baseUrl, route.hash),
    browser: raw.browser || null,
    network,
    requestPaths,
    measured: { probe, stable: raw.stable === true },
    error: raw.error || null,
  });
}

/** Run all canonical routes, or a dependency-injected check in unit tests. */
export async function runInitialRoutePayloadAudit(baseUrl, {
  routes = INITIAL_ROUTE_PAYLOAD_ROUTES,
  viewport = INITIAL_ROUTE_PAYLOAD_VIEWPORT,
  contracts = null,
  runCheck = null,
  onResult = null,
  dependencies = {},
} = {}) {
  const contractSource = contracts || buildInitialRoutePayloadContracts({ routes });
  const results = [];
  if (typeof runCheck === "function") {
    for (const route of routes) {
      const contract = getContract(contractSource, route);
      let result;
      try {
        const value = await runCheck({ baseUrl, route, viewport, contract, routeKey: routeKeyOf(route) });
        result = resultFromInjectedCheck({ route, viewport, contract, value, baseUrl });
      } catch (error) {
        result = failedInitialRouteResult(route, viewport, contract, error);
      }
      results.push(result);
      if (typeof onResult === "function") await onResult(result, route);
    }
    return results;
  }

  const launchFn = dependencies.launchChrome || launchChrome;
  const closeFn = dependencies.closeChrome || closeChrome;
  const attachObserversFn = dependencies.attachObservers || attachObservers;
  const configurePageFn = dependencies.configurePage || configurePage;
  const session = await launchFn();
  const state = (dependencies.createMeasurementState || createMeasurementState)();
  const detachObservers = attachObserversFn(session.cdp, state);
  try {
    await configurePageFn(session.cdp);
    await session.cdp.send("Emulation.setDeviceMetricsOverride", {
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await session.cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
    for (const route of routes) {
      const contract = getContract(contractSource, route);
      let result;
      try {
        try { await session.cdp.send("Network.clearBrowserCache"); } catch { /* best effort */ }
        result = await collectInitialRoutePayload(session.cdp, state, {
          baseUrl,
          route,
          viewport,
          contract,
          browser: browserInfo(session),
          dependencies,
        });
      } catch (error) {
        result = failedInitialRouteResult(route, viewport, contract, error, browserInfo(session));
      }
      results.push(result);
      if (typeof onResult === "function") await onResult(result, route);
    }
  } finally {
    state.collecting = false;
    detachObservers();
    await closeFn(session);
  }
  return results;
}

function serializableContract(contract) {
  if (!contract) return null;
  return {
    routeKey: contract.routeKey,
    family: contract.family,
    allowedAssetFamilies: [...contract.allowedAssetFamilies],
    forbiddenAssetFamilies: [...contract.forbiddenAssetFamilies],
    allowedAssetPaths: [...(contract.allowedAssetPaths || [])],
    forbiddenAssetPaths: [...(contract.forbiddenAssetPaths || [])],
    teachingOverlayAssets: [...(contract.teachingOverlayAssets || [])],
    requiredAssets: [...contract.requiredAssets],
    requiredAssetGroups: contract.requiredAssetGroups.map(group => [...group]),
    alternatives: (contract.alternatives || []).map(alternative => ({
      id: alternative.id,
      requiredAssets: [...alternative.requiredAssets],
      allowedAssets: [...alternative.allowedAssets],
      budget: alternative.budget,
    })),
    budget: contract.budget,
    missingArtifactAssets: [...(contract.missingArtifactAssets || [])],
  };
}

/** Aggregate route results and enforce exactly one result per canonical key. */
export function aggregateInitialRoutePayloadReport({
  baseUrl,
  routes = INITIAL_ROUTE_PAYLOAD_ROUTES,
  viewport = INITIAL_ROUTE_PAYLOAD_VIEWPORT,
  contracts = null,
  results = [],
  generatedAt = new Date().toISOString(),
} = {}) {
  const contractSource = contracts || buildInitialRoutePayloadContracts({ routes });
  const expectedKeys = routes.map(route => routeKeyOf(route));
  const expectedSet = new Set(expectedKeys);
  const resultKeys = results.map(result => result?.routeKey || result?.key || result?.routeId || null);
  const counts = new Map();
  for (const key of resultKeys) counts.set(key, (counts.get(key) || 0) + 1);
  const duplicateKeys = [...counts.entries()].filter(([, count]) => count > 1).map(([key]) => key);
  const missingKeys = expectedKeys.filter(key => !counts.has(key));
  const unexpectedKeys = [...new Set(resultKeys.filter(key => !expectedSet.has(key)))];
  const routeResults = results.map(result => {
    const key = result?.routeKey || result?.key || result?.routeId;
    const route = routes.find(candidate => routeKeyOf(candidate) === key);
    const contract = getContract(contractSource, route || key);
    if (!route) return { ...result, routeKey: key || null, passed: false, validation: { passed: false, failures: ["route-missing"] } };
    const validation = validateInitialRoutePayloadResult({ route, viewport, result, contract });
    return { ...result, routeKey: key, key: result?.key || key, family: result?.family || initialRouteFamily(route), contract, validation, passed: validation.passed };
  });
  const allPassed = expectedKeys.length === INITIAL_ROUTE_PAYLOAD_EXPECTED_ROUTE_COUNT
    && results.length === expectedKeys.length
    && duplicateKeys.length === 0
    && missingKeys.length === 0
    && unexpectedKeys.length === 0
    && routeResults.every(result => result?.passed === true && result?.validation?.passed === true);
  const contractEntries = Object.fromEntries(expectedKeys.map(key => [key, serializableContract(getContract(contractSource, key))]));
  return {
    schemaVersion: INITIAL_ROUTE_PAYLOAD_AUDIT_SCHEMA_VERSION,
    generatedAt,
    tool: "scripts/audit_initial_route_payloads.mjs",
    baseUrl,
    viewport: { ...viewport },
    routeCount: expectedKeys.length,
    expectedRouteKeys: expectedKeys,
    missingKeys,
    duplicateKeys,
    unexpectedKeys,
    contracts: contractEntries,
    results: routeResults,
    allPassed,
  };
}

export const buildInitialRoutePayloadAuditReport = aggregateInitialRoutePayloadReport;

/** Lightweight schema gate used by tests and CI before consuming a report. */
export function validateInitialRoutePayloadReport(report) {
  if (!report || report.schemaVersion !== INITIAL_ROUTE_PAYLOAD_AUDIT_SCHEMA_VERSION) return false;
  if (report.tool !== "scripts/audit_initial_route_payloads.mjs") return false;
  if (!report.viewport || report.viewport.id !== "pc" || report.viewport.label !== "PC" || report.viewport.width !== 1366 || report.viewport.height !== 768) return false;
  const canonicalKeys = INITIAL_ROUTE_PAYLOAD_ROUTES.map(route => route.id);
  const canonicalSet = new Set(canonicalKeys);
  if (report.routeCount !== INITIAL_ROUTE_PAYLOAD_EXPECTED_ROUTE_COUNT) return false;
  if (!Array.isArray(report.expectedRouteKeys) || JSON.stringify(report.expectedRouteKeys) !== JSON.stringify(canonicalKeys)) return false;
  if (!Array.isArray(report.results) || report.results.length !== canonicalKeys.length) return false;
  if (!Array.isArray(report.missingKeys) || report.missingKeys.length) return false;
  if (!Array.isArray(report.duplicateKeys) || report.duplicateKeys.length) return false;
  if (!Array.isArray(report.unexpectedKeys) || report.unexpectedKeys.length) return false;
  if (!report.contracts || typeof report.contracts !== "object") return false;

  const currentContracts = buildInitialRoutePayloadContracts();
  const reportContractKeys = Object.keys(report.contracts).sort();
  if (JSON.stringify(reportContractKeys) !== JSON.stringify([...canonicalKeys].sort())) return false;
  for (const key of canonicalKeys) {
    // Contract coverage is checked against the current artifact-derived
    // contracts, so a report cannot forge a relaxed budget or allowlist.
    if (JSON.stringify(report.contracts[key]) !== JSON.stringify(serializableContract(currentContracts[key]))) return false;
  }

  const resultKeys = report.results.map(result => result?.routeKey);
  if (resultKeys.some(key => !canonicalSet.has(key)) || new Set(resultKeys).size !== canonicalKeys.length) return false;
  const recomputedResults = new Map();
  for (const result of report.results) {
    const route = INITIAL_ROUTE_PAYLOAD_ROUTES.find(candidate => candidate.id === result.routeKey);
    if (!route || !Number.isFinite(result.encodedBytes) || !Number.isFinite(result.uniqueRequestCount) || !Array.isArray(result.requestPaths)) return false;
    const recomputed = validateInitialRoutePayloadResult({ route, viewport: INITIAL_ROUTE_PAYLOAD_VIEWPORT, result, contract: currentContracts[route.id] });
    if (!result.validation || result.validation.passed !== recomputed.passed || result.passed !== recomputed.passed) return false;
    if (JSON.stringify(result.validation.failures || []) !== JSON.stringify(recomputed.failures)) return false;
    recomputedResults.set(route.id, recomputed);
  }
  const recomputedAllPassed = canonicalKeys.every(key => recomputedResults.get(key)?.passed === true);
  return typeof report.allPassed === "boolean" && report.allPassed === recomputedAllPassed;
}

function usage() {
  return [
    "Usage:",
    "  node scripts/audit_initial_route_payloads.mjs \\",
    "    --base-url http://localhost:4173 \\",
    "    --output work/browser-audit/initial-route-payload-audit.json",
    "",
    "Required options: --base-url, --output",
    `The audit always uses the canonical ${BETA_AUDIT_ROUTES.length} routes at 1366x768 with a cold browser cache.`,
  ].join("\n");
}

function argumentValue(argv, index, name) {
  const token = argv[index];
  const prefix = `${name}=`;
  if (token.startsWith(prefix)) return { value: token.slice(prefix.length), nextIndex: index };
  if (index + 1 >= argv.length || argv[index + 1].startsWith("--")) throw new Error(`${name} requires a value`);
  return { value: argv[index + 1], nextIndex: index + 1 };
}

export function parseInitialRoutePayloadAuditArgs(argv) {
  const options = { baseUrl: null, output: null, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--help" || token === "-h") { options.help = true; continue; }
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
  resolveRoute(options.baseUrl, "/");
  return options;
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseInitialRoutePayloadAuditArgs(argv);
  if (args.help) { console.log(usage()); return null; }
  const routes = INITIAL_ROUTE_PAYLOAD_ROUTES;
  const contracts = buildInitialRoutePayloadContracts({ routes });
  const results = await runInitialRoutePayloadAudit(args.baseUrl, {
    routes,
    contracts,
    viewport: INITIAL_ROUTE_PAYLOAD_VIEWPORT,
    onResult: result => console.log(`${result.routeKey}: ${result.passed ? "passed" : "failed"}`),
  });
  const report = aggregateInitialRoutePayloadReport({
    baseUrl: args.baseUrl,
    routes,
    viewport: INITIAL_ROUTE_PAYLOAD_VIEWPORT,
    contracts,
    results,
  });
  const outputPath = isAbsolute(args.output) ? args.output : resolve(args.output);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(outputPath);
  if (!report.allPassed) {
    const failed = report.results.filter(result => result?.passed !== true).map(result => result?.routeKey || "unknown");
    console.error(`initial route payload audit failed: ${failed.join(", ")}`);
    process.exitCode = 1;
  }
  return report;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch(error => {
    console.error(`initial route payload audit failed: ${error.message}`);
    process.exitCode = 1;
  });
}
