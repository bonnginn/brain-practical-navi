import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

import {
  deterministicGzip,
  generatePialMeshSidecars,
  PIAL_MESH_LOGICAL_NAMES,
} from "../scripts/generate_pial_mesh_sidecars.mjs";
import {
  assetFamilyForPath,
  buildInitialRoutePayloadContracts,
  INITIAL_ROUTE_PAYLOAD_VIEWPORT,
  INITIAL_ROUTE_PAYLOAD_ROUTES,
  PIAL_MESH_COMPRESSED_ASSETS,
  PIAL_MESH_RAW_ASSETS,
  validateInitialRoutePayloadResult,
} from "../scripts/audit_initial_route_payloads.mjs";

const root = new URL("../", import.meta.url);
const atlasRoot = new URL("public/atlas/", root);
const atlasPath = name => new URL(name, atlasRoot);
const sha256 = value => createHash("sha256").update(value).digest("hex");

const EXPECTED = {
  "pial-left": {
    rawBytes: 9_175_116,
    compressedBytes: 4_996_611,
    rawSha256: "3c0085b960053118180931c2fd33283af76da1c664097dbeedcc36699195aa12",
    compressedSha256: "d8112512d0bd930a44d3dc49a63c6a5caeb2342f850ba8f859ad8c26cbb29e5e",
  },
  "pial-right": {
    rawBytes: 9_175_116,
    compressedBytes: 5_106_478,
    rawSha256: "8b0542227334b7e312956b01cc633602d631359fe74db57e1fb40e15f0c276ff",
    compressedSha256: "1b41e9d74fed63f6e60aa3f05a7de8a0fad435725e0d3524e0df9ec5f04342dd",
  },
};

test("pial gzip sidecars are deterministic and gunzip to the exact raw bytes", async () => {
  const generated = generatePialMeshSidecars({ atlasRoot: fileURLToPath(atlasRoot), write: false });
  assert.deepEqual(generated.map(result => result.logicalName), [...PIAL_MESH_LOGICAL_NAMES]);
  for (const result of generated) {
    const expected = EXPECTED[result.logicalName];
    const raw = await readFile(atlasPath(result.sourceName));
    const sidecar = await readFile(atlasPath(result.sidecarName));
    assert.equal(raw.byteLength, expected.rawBytes, `${result.logicalName} raw byte count`);
    assert.equal(sidecar.byteLength, expected.compressedBytes, `${result.logicalName} sidecar byte count`);
    assert.equal(sha256(raw), expected.rawSha256, `${result.logicalName} raw SHA-256`);
    assert.equal(sha256(sidecar), expected.compressedSha256, `${result.logicalName} sidecar SHA-256`);
    assert.equal(sidecar.readUInt16LE(0), 0x8b1f, `${result.logicalName} gzip magic`);
    assert.deepEqual(gunzipSync(sidecar), raw, `${result.logicalName} gunzip equality`);
    assert.deepEqual(sidecar, deterministicGzip(raw), `${result.logicalName} deterministic regeneration`);
    assert.equal(result.rawSha256, expected.rawSha256);
    assert.equal(result.compressedSha256, expected.compressedSha256);
  }
});

test("mesh loader source maps only the two pial logical names and inflates only gzip payloads", () => {
  const source = readFileSync(new URL("app/AtlasVolumeCanvas.tsx", root), "utf8");
  assert.match(source, /const COMPRESSED_MESH_ASSETS:[^=]+=Object\.freeze\(\{"pial-left":"pial-left\.mesh\.gz","pial-right":"pial-right\.mesh\.gz"\}\)/);
  assert.match(source, /function meshAssetFileName\(name:string\)\{return COMPRESSED_MESH_ASSETS\[name\]\|\|`\$\{name\}\.mesh`\}/);
  assert.match(source, /const fileName=meshAssetFileName\(name\),id=`mesh:\$\{fileName\}`/);
  assert.match(source, /fetchAtlasBuffer\(`\$\{ASSET_BASE\}atlas\/\$\{fileName\}`,id,name,token\)/);
  assert.match(source, /if\(hasGzipMagic\(buf\)\)\{const stream=new Blob\(\[buf\]\)\.stream\(\)\.pipeThrough\(new DecompressionStream\("gzip"\)\)/);
  assert.match(source, /magic!==0x424e4d31&&magic!==0x424e4d32&&magic!==0x424e4d33/);
  assert.doesNotMatch(source, /atlas\/\$\{name\}\.mesh`/);
});

function healthySurfaceObservation(route, contract) {
  const requestPaths = ["/index.html", "/assets/index.js", ...contract.requiredAssets.map(name => `/atlas/${name}`)];
  return {
    routeKey: route.id,
    key: route.id,
    requestPaths,
    encodedBytes: contract.budget.bytes - 1,
    uniqueRequestCount: requestPaths.length,
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

test("initial-route surface contracts require compressed pial paths and reject raw requests", () => {
  const contracts = buildInitialRoutePayloadContracts();
  const route = INITIAL_ROUTE_PAYLOAD_ROUTES.find(candidate => candidate.id === "surface-lateral");
  const contract = contracts[route.id];
  assert.deepEqual(PIAL_MESH_COMPRESSED_ASSETS, ["pial-left.mesh.gz", "pial-right.mesh.gz"]);
  assert.deepEqual(PIAL_MESH_RAW_ASSETS, ["pial-left.mesh", "pial-right.mesh"]);
  assert.equal(assetFamilyForPath("/atlas/pial-left.mesh.gz"), "surface");
  assert.equal(assetFamilyForPath("/atlas/pial-right.mesh.gz"), "surface");
  for (const compressed of PIAL_MESH_COMPRESSED_ASSETS) {
    assert.ok(contract.requiredAssets.includes(compressed), `${compressed} required`);
    assert.ok(contract.allowedAssetPaths.includes(`/atlas/${compressed}`), `${compressed} allowed`);
  }
  for (const raw of PIAL_MESH_RAW_ASSETS) {
    assert.ok(!contract.requiredAssets.includes(raw), `${raw} is not required`);
    assert.ok(!contract.allowedAssetPaths.includes(`/atlas/${raw}`), `${raw} is not allowed`);
    assert.ok(contract.forbiddenAssetPaths.includes(`/atlas/${raw}`), `${raw} explicitly forbidden`);
  }

  const healthy = healthySurfaceObservation(route, contract);
  const healthyValidation = validateInitialRoutePayloadResult({ route, viewport: INITIAL_ROUTE_PAYLOAD_VIEWPORT, result: healthy, contract });
  assert.equal(healthyValidation.passed, true, healthyValidation.failures.join(", "));

  const raw = structuredClone(healthy);
  raw.requestPaths = raw.requestPaths.map(path => path.replace(/\.mesh\.gz$/, ".mesh"));
  const rawValidation = validateInitialRoutePayloadResult({ route, viewport: INITIAL_ROUTE_PAYLOAD_VIEWPORT, result: raw, contract });
  assert.equal(rawValidation.passed, false);
  assert.ok(rawValidation.failures.some(failure => failure.startsWith("missing-assets:")));
  assert.ok(rawValidation.failures.some(failure => failure.startsWith("forbidden-eager-assets:")));
  assert.match(rawValidation.failures.find(failure => failure.startsWith("forbidden-eager-assets:")), /pial-(left|right)\.mesh/);
});
