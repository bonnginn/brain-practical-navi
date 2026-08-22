import test from "node:test";
import assert from "node:assert/strict";

import { BETA_AUDIT_ROUTES } from "../scripts/audit_beta_routes.mjs";
import {
  INITIAL_ROUTE_PAYLOAD_VIEWPORT,
  INITIAL_ROUTE_PAYLOAD_ROUTES,
  aggregateInitialRoutePayloadReport,
  assetFamilyForPath,
  buildInitialRouteArtifactInventory,
  buildInitialRoutePayloadContracts,
  initialRouteFamily,
  normalizeRequestPath,
  runInitialRoutePayloadAudit,
  waitForInitialRouteStable,
  validateInitialRoutePayloadReport,
  validateInitialRoutePayloadResult,
} from "../scripts/audit_initial_route_payloads.mjs";
import { createMeasurementState } from "../scripts/measure_browser_performance.mjs";

function healthyObservation(route, contract) {
  const required = contract.requiredAssets.length
    ? contract.requiredAssets
    : (contract.alternatives?.[0]?.requiredAssets || []);
  const requestPaths = ["/index.html", "/assets/index.js", ...required.map(name => `/atlas/${name}`)];
  return {
    routeKey: route.id,
    key: route.id,
    requestPaths,
    encodedBytes: Math.max(0, contract.budget.bytes - 1),
    requestCount: requestPaths.length,
    uniqueRequestCount: new Set(requestPaths).size,
    stable: true,
    probe: {
      readyState: "complete",
      hash: route.hash,
      identityPresent: true,
      identityText: route.identity.text,
      appRootPresent: true,
      canvasCount: route.canvas.pc,
      loadingCount: 0,
      uiErrors: [],
      horizontalOverflow: false,
      webglFallback: false,
    },
    consoleErrors: [],
    requestErrors: [],
  };
}

test("initial payload audit reuses exactly the canonical 26 routes", () => {
  assert.strictEqual(INITIAL_ROUTE_PAYLOAD_ROUTES, BETA_AUDIT_ROUTES);
  assert.equal(INITIAL_ROUTE_PAYLOAD_ROUTES.length, 26);
  assert.equal(new Set(INITIAL_ROUTE_PAYLOAD_ROUTES.map(route => route.id)).size, 26);
  assert.deepEqual(INITIAL_ROUTE_PAYLOAD_VIEWPORT, { id: "pc", label: "PC", width: 1366, height: 768 });
});

test("contracts are artifact-derived, explicit, and family-specific", () => {
  const inventory = buildInitialRouteArtifactInventory();
  const contracts = buildInitialRoutePayloadContracts({ inventory });
  assert.equal(contracts.home.family, "home");
  assert.equal(contracts["surface-lateral"].family, "surface");
  assert.equal(contracts["sections-coronal"].family, "sections");
  assert.equal(contracts["blocks-lateral-ventricle"].family, "blocks");
  assert.equal(contracts.segment.family, "segment");
  for (const route of BETA_AUDIT_ROUTES) {
    const contract = contracts[route.id];
    assert.ok(contract, route.id);
    assert.ok(contract.budget.bytes > 0, route.id);
    assert.match(contract.budget.rationale, /artifact-derived/);
    assert.ok(Array.isArray(contract.budget.artifactBasis));
  }
  assert.ok(contracts.home.forbiddenAssetFamilies.includes("surface"));
  assert.ok(contracts.home.forbiddenAssetFamilies.includes("volume"));
  assert.ok(contracts["blocks-lateral-ventricle"].forbiddenAssetFamilies.includes("surface"));
  assert.ok(contracts.segment.allowedAssetFamilies.includes("volume"));
  assert.deepEqual(contracts["sections-coronal"].requiredAssets, [
    "bigbrain-icbm500.bin.gz",
    "bigbrain-practical-segmentation-icbm500.bin.gz",
    "pial-left.mesh",
    "pial-right.mesh",
    "segment-cerebellum.mesh",
    "segment-pons-medulla.mesh",
    "segment-midbrain.mesh",
    "ventricle.mesh",
    "caudate.mesh",
  ]);
});

test("request paths normalize absolute URLs and classify atlas families", () => {
  assert.equal(normalizeRequestPath("http://127.0.0.1:4173/atlas/pial-left.mesh?v=1"), "/atlas/pial-left.mesh?v=1");
  assert.equal(normalizeRequestPath("/brain-practical-navi/atlas/mni-cerebra-1mm.bin.gz"), "/brain-practical-navi/atlas/mni-cerebra-1mm.bin.gz");
  assert.equal(assetFamilyForPath("/atlas/pial-left.mesh"), "surface");
  assert.equal(assetFamilyForPath("/atlas/mni-cerebra-1mm.bin.gz"), "volume");
  assert.equal(assetFamilyForPath("/atlas/block-lateral-ventricle-tissue.mesh"), "blocks");
  assert.equal(assetFamilyForPath("/atlas/block-hindbrain-pyramids.mesh"), "teaching-overlays");
  assert.equal(assetFamilyForPath("/assets/index.js"), "application");
  assert.equal(initialRouteFamily("#workspace/sections/coronal"), "sections");
});

test("healthy injected observations validate without starting Chrome", () => {
  const contracts = buildInitialRoutePayloadContracts();
  for (const route of BETA_AUDIT_ROUTES) {
    const result = healthyObservation(route, contracts[route.id]);
    const validation = validateInitialRoutePayloadResult({
      route,
      viewport: INITIAL_ROUTE_PAYLOAD_VIEWPORT,
      result,
      contract: contracts[route.id],
    });
    assert.equal(validation.passed, true, `${route.id}: ${validation.failures.join(", ")}`);
  }
});

test("home rejects an eager atlas mesh and route-family validation rejects unrelated assets", () => {
  const contracts = buildInitialRoutePayloadContracts();
  const route = BETA_AUDIT_ROUTES.find(candidate => candidate.id === "home");
  const result = healthyObservation(route, contracts.home);
  result.requestPaths.push("/atlas/pial-left.mesh");
  const validation = validateInitialRoutePayloadResult({ route, result, contract: contracts.home });
  assert.equal(validation.passed, false);
  assert.ok(validation.failures.some(failure => failure.startsWith("forbidden-eager-assets:")));
});

test("duplicate and missing assets fail a route even when the UI is healthy", () => {
  const contracts = buildInitialRoutePayloadContracts();
  const route = BETA_AUDIT_ROUTES.find(candidate => candidate.id === "surface-lateral");
  const result = healthyObservation(route, contracts[route.id]);
  result.requestPaths = result.requestPaths.filter(path => !path.endsWith("segment-midbrain.mesh"));
  result.requestPaths.push("/atlas/pial-left.mesh");
  const validation = validateInitialRoutePayloadResult({ route, result, contract: contracts[route.id] });
  assert.equal(validation.passed, false);
  assert.ok(validation.failures.some(failure => failure.startsWith("missing-assets:")));
  assert.ok(validation.failures.some(failure => failure.startsWith("duplicate-assets:")));
});

test("affected surface routes have exact initial mesh contracts and exact artifact budgets", () => {
  const inventory = buildInitialRouteArtifactInventory();
  const contracts = buildInitialRoutePayloadContracts({ inventory });
  const base = [
    "pial-left.mesh", "pial-right.mesh", "segment-cerebellum.mesh",
    "segment-pons-medulla.mesh", "segment-midbrain.mesh",
  ];
  const basal = [
    "landmark-olfactory-pathway.mesh", "landmark-optic-pathway.mesh",
    "landmark-infundibulum.mesh", "landmark-mammillary-bodies.mesh",
    "landmark-anterior-perforated-substance.mesh",
    "block-midbrain-section-cerebral-peduncles.mesh",
    "block-hindbrain-pyramids.mesh", "block-hindbrain-olives.mesh",
  ];
  const nerves = ["overlay-nerves-anterior.mesh", "overlay-nerves-pontine.mesh", "overlay-nerves-medullary.mesh"];
  const vessels = ["overlay-arteries-anterior.mesh", "overlay-arteries-posterior.mesh"];
  assert.deepEqual(contracts["surface-inferior"].requiredAssets, [...base, ...basal, "block-diencephalon-hypothalamus.mesh", ...nerves]);
  assert.deepEqual(contracts["surface-nerves"].requiredAssets, [...base, ...basal, "block-diencephalon-hypothalamus.mesh", ...nerves]);
  assert.deepEqual(contracts["surface-free"].requiredAssets, [...base, ...basal, "block-diencephalon-hypothalamus.mesh", ...nerves]);
  assert.deepEqual(contracts["surface-arteries"].requiredAssets, [...base, ...basal, "block-diencephalon-hypothalamus.mesh", ...vessels, ...nerves]);
  for (const route of ["surface-inferior", "surface-arteries", "surface-nerves", "surface-free"]) {
    const contract = contracts[route];
    assert.deepEqual(contract.allowedAssetPaths.map(path => path.replace("/atlas/", "")), contract.requiredAssets);
    const expectedAssetBytes = contract.requiredAssets.reduce((sum, name) => sum + inventory.files.find(file => file.name === name).bytes, 0);
    assert.equal(contract.budget.bytes, inventory.staticBytes + expectedAssetBytes + contract.budget.overheadBytes);
    assert.match(contract.budget.rationale, /exact allowed atlas artifacts/);
  }
});

test("same-family extras and one-file alternatives cannot pass", () => {
  const contracts = buildInitialRoutePayloadContracts();
  const route = BETA_AUDIT_ROUTES.find(candidate => candidate.id === "surface-lateral");
  const extra = healthyObservation(route, contracts[route.id]);
  extra.requestPaths.push("/atlas/segment-brainstem.mesh");
  const extraValidation = validateInitialRoutePayloadResult({ route, result: extra, contract: contracts[route.id] });
  assert.equal(extraValidation.passed, false);
  assert.ok(extraValidation.failures.some(failure => failure.startsWith("forbidden-eager-assets:")));

  const quizRoute = BETA_AUDIT_ROUTES.find(candidate => candidate.id === "quiz");
  const quizContract = {
    ...contracts.quiz,
    alternatives: [...contracts.quiz.alternatives, {
      id: "forged-single-file",
      requiredAssets: ["one.mesh"],
      allowedAssets: ["one.mesh"],
      budget: contracts.quiz.budget,
    }],
  };
  const validation = validateInitialRoutePayloadResult({
    route: quizRoute,
    result: healthyObservation(quizRoute, quizContract),
    contract: quizContract,
  });
  assert.equal(validation.passed, false);
  assert.ok(validation.failures.includes("alternative-contract-single-file"));
});

test("over-budget and report topology anomalies fail allPassed", () => {
  const contracts = buildInitialRoutePayloadContracts();
  const route = BETA_AUDIT_ROUTES.find(candidate => candidate.id === "home");
  const result = healthyObservation(route, contracts.home);
  result.encodedBytes = contracts.home.budget.bytes + 1;
  const failed = validateInitialRoutePayloadResult({ route, result, contract: contracts.home });
  assert.ok(failed.failures.some(failure => failure.startsWith("over-budget:")));

  const report = aggregateInitialRoutePayloadReport({
    baseUrl: "http://127.0.0.1:4173",
    routes: BETA_AUDIT_ROUTES,
    contracts,
    results: [healthyObservation(route, contracts.home), healthyObservation(route, contracts.home)],
  });
  assert.equal(report.allPassed, false);
  assert.deepEqual(report.duplicateKeys, ["home"]);
  assert.equal(report.missingKeys.length, 25);
  assert.equal(validateInitialRoutePayloadReport(report), false);
});

test("full canonical report validation recomputes topology, contracts, route health, and allPassed", () => {
  const contracts = buildInitialRoutePayloadContracts();
  const results = BETA_AUDIT_ROUTES.map(route => healthyObservation(route, contracts[route.id]));
  const report = aggregateInitialRoutePayloadReport({
    baseUrl: "http://127.0.0.1:4173",
    routes: BETA_AUDIT_ROUTES,
    contracts,
    results,
  });
  assert.equal(report.allPassed, true);
  assert.equal(validateInitialRoutePayloadReport(report), true);
  assert.equal(validateInitialRoutePayloadReport({ ...report, allPassed: false }), false);
  const forgedContract = structuredClone(report);
  forgedContract.contracts.home.budget.bytes += 1;
  assert.equal(validateInitialRoutePayloadReport(forgedContract), false);
  const forgedResult = structuredClone(report);
  forgedResult.results[0].passed = true;
  forgedResult.results[0].validation = { passed: true, failures: [] };
  forgedResult.results[0].requestPaths = ["/atlas/pial-left.mesh"];
  assert.equal(validateInitialRoutePayloadReport(forgedResult), false);
});

test("initial route timeout retains stage, reason, latest probe, elapsed time, and in-flight requests", async () => {
  const route = BETA_AUDIT_ROUTES.find(candidate => candidate.id === "home");
  const state = createMeasurementState();
  state.collecting = true;
  state.inFlight.add("pending");
  state.requests.set("pending", { url: "http://127.0.0.1:4173/atlas/pial-left.mesh", method: "GET", type: "Fetch" });
  const latestProbe = {
    readyState: "complete",
    hash: route.hash,
    identityPresent: true,
    identityText: route.identity.text,
    appRootPresent: true,
    canvasCount: 0,
    loadingCount: 0,
    uiErrors: [],
    horizontalOverflow: false,
    webglFallback: false,
  };
  const timeout = await waitForInitialRouteStable({}, state, route, INITIAL_ROUTE_PAYLOAD_VIEWPORT, {
    timeoutMs: 25,
    quietMs: 0,
    evaluateFn: async () => latestProbe,
    sleepFn: async () => new Promise(resolve => setTimeout(resolve, 5)),
  });
  assert.equal(timeout.stable, false);
  assert.equal(timeout.stage, "initial-route");
  assert.equal(timeout.reason, "network-not-quiet");
  assert.strictEqual(timeout.latestProbe, latestProbe);
  assert.ok(timeout.elapsedMs >= 0);
  assert.equal(timeout.inFlightCount, 1);
  assert.equal(timeout.inFlightRequests[0].requestId, "pending");
});

test("runner dependency injection exercises route orchestration without Chrome", async () => {
  const routes = BETA_AUDIT_ROUTES.slice(0, 2);
  const contracts = buildInitialRoutePayloadContracts({ routes });
  const seen = [];
  const results = await runInitialRoutePayloadAudit("http://127.0.0.1:4173", {
    routes,
    contracts,
    runCheck: async ({ route, contract }) => {
      seen.push(route.id);
      return healthyObservation(route, contract);
    },
  });
  assert.deepEqual(seen, ["home", "surface-lateral"]);
  assert.equal(results.length, 2);
  assert.ok(results.every(result => result.passed));
});
