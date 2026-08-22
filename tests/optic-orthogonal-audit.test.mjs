import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { gzipSync, gunzipSync } from "node:zlib";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const localPath = (path) => fileURLToPath(new URL(path, root));

function resolvePython() {
  const configured = process.env.PYTHON?.trim();
  const bundled = process.platform === "win32" && process.env.USERPROFILE
    ? join(process.env.USERPROFILE, ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "python", "python.exe")
    : null;
  const candidates = configured
    ? [[configured, []]]
    : process.platform === "win32"
      ? [["py", ["-3"]], ...(bundled ? [[bundled, []]] : []), ["python", []], ["python3", []]]
      : [["python3", []], ["python", []]];
  for (const [command, prefix] of candidates) {
    if (spawnSync(command, [...prefix, "--version"], {encoding:"utf8"}).status === 0) return {command, prefix};
  }
  throw new Error("Python 3 was not found");
}

const python = resolvePython();
const script = localPath("scripts/audit_optic_orthogonal.py");
const input = localPath("public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz");

function runAudit(path = input) {
  return spawnSync(python.command, [...python.prefix, script, "--input", path], {encoding:"utf8", cwd:localPath("")});
}

test("reproduces the objective orthogonal inventory for legacy optic label 33", async () => {
  const result = runAudit();
  assert.equal(result.status, 0, result.stderr);
  const audit = JSON.parse(result.stdout);
  const savedText = await readFile(new URL("segmentation-patches/review/optic-pathway-orthogonal-objective-audit-2026-08-23.json", root), "utf8");
  assert.equal(result.stdout, savedText);
  const saved = JSON.parse(savedText);
  assert.deepEqual(audit, saved);
  assert.equal(audit.inputSha256, "6744e7c0184436789f42c7107d05ead93cf36703bb36372df5f63b82a38f7b56");
  assert.deepEqual(audit.dims, [394, 466, 378]);
  assert.deepEqual(audit.voxelSizeMm, [0.5, 0.5, 0.5]);
  assert.equal(audit.auditedLabelId, 33);
  assert.equal(audit.label.voxelCount, 8482);
  assert.deepEqual(audit.label.bbox, {min:[163,246,86], max:[228,302,122], size:[66,57,37]});
  assert.equal(audit.label.connectedComponentCount6, 12);
  assert.deepEqual(audit.label.connectedComponents6.map(component => component.voxelCount), [8099,285,55,18,5,4,4,3,3,2,2,2]);
  assert.deepEqual(audit.faceContacts6ByNeighbourLabel, {"0":7569,"21":6,"25":54,"27":32,"39":171,"40":162});
  assert.deepEqual(Object.fromEntries(Object.entries(audit.representativeSlices).map(([axis, value]) => [axis, value.sliceIndex])), {x:187,y:262,z:114});
  for (const axis of ["x", "y", "z"]) {
    const occupancy = audit.label.sliceOccupancy[axis];
    assert.equal(occupancy.slices.reduce((sum, slice) => sum + slice.count, 0), audit.label.voxelCount);
    const representative = audit.representativeSlices[axis];
    assert.equal(representative.voxelCountOnSlice, Math.max(...occupancy.slices.map(slice => slice.count)));
  }
  for (const [label, count] of Object.entries(audit.faceContacts6ByNeighbourLabel)) {
    assert.equal(Object.values(audit.faceContactDirections6ByNeighbourLabel[label]).reduce((sum, value) => sum + value, 0), count);
  }
  assert.equal(audit.validation.passed, true);
  assert.match(audit.definitions.anatomicalStatus, /not anatomical validation/i);
  assert.match(audit.definitions.anatomicalStatus, /not.*mechanically splitting ID 33/i);
});

test("rejects a content-tampered label volume by its pinned digest", async () => {
  const directory = await mkdtemp(join(tmpdir(), "optic-audit-tamper-"));
  try {
    const payload = gunzipSync(await readFile(input));
    payload[10] = payload[10] === 33 ? 0 : 33;
    const altered = join(directory, "altered.bin.gz");
    await writeFile(altered, gzipSync(payload, {mtime:0}));
    const result = runAudit(altered);
    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}\n${result.stderr}`, /SHA-256/);
  } finally {
    await rm(directory, {recursive:true, force:true});
  }
});

test("validates BBS1 dimensions independently after digest verification", async () => {
  const directory = await mkdtemp(join(tmpdir(), "optic-audit-dims-"));
  try {
    const payload = gunzipSync(await readFile(input));
    payload.writeUInt16LE(393, 4);
    const compressed = gzipSync(payload, {mtime:0});
    const altered = join(directory, "wrong-dims.bin.gz");
    await writeFile(altered, compressed);
    const digest = createHash("sha256").update(compressed).digest("hex");
    const probe = [
      "import importlib.util,pathlib,sys",
      "spec=importlib.util.spec_from_file_location('optic_audit',sys.argv[1])",
      "module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)",
      "data=pathlib.Path(sys.argv[2]).read_bytes()",
      "module.decode_bbs1(data,sys.argv[3])",
    ].join(";");
    const result = spawnSync(python.command, [...python.prefix, "-c", probe, script, altered, digest], {encoding:"utf8", cwd:localPath("")});
    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}\n${result.stderr}`, /dims \(393, 466, 378\) do not match expected/);
  } finally {
    await rm(directory, {recursive:true, force:true});
  }
});
