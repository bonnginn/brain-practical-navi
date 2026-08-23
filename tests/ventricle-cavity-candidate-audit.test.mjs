import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const localPath = path => fileURLToPath(new URL(path, root));

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
const script = localPath("scripts/audit_ventricle_cavity_candidates.py");
const previewBuilder = localPath("scripts/build_ventricle_candidate_preview.py");
const validator = localPath("scripts/apply_segmentation_patch.py");
const labels = localPath("public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz");
const savedPatch = localPath("segmentation-patches/review/ventricles-orthogonally-bracketed-candidate-2026-08-23.json");
const digest = bytes => createHash("sha256").update(bytes).digest("hex");

test("finds only the pinned orthogonally bracketed ventricle repair candidate", async () => {
  const temporary = await mkdtemp(join(tmpdir(), "ventricle-cavity-audit-"));
  try {
    const reportPath = join(temporary, "report.json");
    const patchPath = join(temporary, "candidate.json");
    const before = digest(await readFile(labels));
    const result = spawnSync(python.command, [...python.prefix, script, "--output", reportPath, "--patch-output", patchPath], {
      cwd: localPath(""), encoding: "utf8", maxBuffer: 1024 * 1024,
    });
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(await readFile(reportPath, "utf8"));
    assert.equal(report.source.imageSha256, "c4b69975f0dece2512adf3bcae690226492cfa66ded38380b3b94aa8dba52746");
    assert.equal(report.source.labelsSha256, before);
    assert.deepEqual(report.entries.map(entry => entry.publishedVoxelCount), [63833,62854,10416,8567]);
    assert.ok(report.entries.every(entry => entry.automaticCandidateEligible === false));
    assert.ok(report.entries.every(entry => entry.locallyEnclosedRepairAudit.candidateVoxelCount === 0));
    assert.deepEqual(report.entries.map(entry => entry.orthogonallyBracketedRepairAudit.candidateVoxelCount), [14,15,4,0]);
    assert.deepEqual(report.summary.crossLabelCandidateOverlaps, []);
    assert.equal(report.summary.publishedLabelsModified, false);

    const generatedPatch = JSON.parse(await readFile(patchPath, "utf8"));
    const committedPatch = JSON.parse(await readFile(savedPatch, "utf8"));
    assert.deepEqual(generatedPatch, committedPatch);
    assert.equal(generatedPatch.review.decision, "unreviewed");
    assert.equal(generatedPatch.editCount, 33);
    assert.deepEqual(generatedPatch.changeSummary.transitions, [
      {from:0,to:23,voxels:14}, {from:0,to:24,voxels:15}, {from:0,to:25,voxels:4},
    ]);
    const checked = spawnSync(python.command, [...python.prefix, validator, patchPath, "--check"], {
      cwd: localPath(""), encoding: "utf8", maxBuffer: 1024 * 1024,
    });
    assert.equal(checked.status, 0, checked.stderr);
    const validation = JSON.parse(checked.stdout);
    assert.equal(validation.workflowMetadataStatus, "strict");
    assert.equal(validation.reviewStatus, "unreviewed");
    assert.equal(validation.changedVoxelCount, 33);
    assert.equal(digest(await readFile(labels)), before, "read-only audit must not modify the published label volume");
  } finally {
    await rm(temporary, {recursive:true, force:true});
  }
});

test("source keeps broad connected background and narrow repair evidence separate", async () => {
  const source = await readFile(script, "utf8");
  assert.match(source, /touchesCropBoundary/);
  assert.match(source, /requiresSameLabelOnBothSidesOfAllThreeAxes/);
  assert.match(source, /forbidsOtherLabelFaceNeighbor/);
  assert.match(source, /publishedLabelsModified/);
  assert.doesNotMatch(source, /write_browser_volume|reviewStatus["']:\s*["']approved/);
});

test("renders pinned local-only orthogonal evidence without changing published labels", async () => {
  const temporary = await mkdtemp(join(tmpdir(), "ventricle-cavity-preview-"));
  try {
    const before = digest(await readFile(labels));
    const result = spawnSync(python.command, [...python.prefix, previewBuilder, "--output", temporary], {
      cwd: localPath(""), encoding: "utf8", maxBuffer: 1024 * 1024,
    });
    assert.equal(result.status, 0, result.stderr);
    const manifest = JSON.parse(await readFile(join(temporary, "manifest.json"), "utf8"));
    assert.equal(manifest.status, "unreviewed");
    assert.equal(manifest.candidateVoxelCount, 33);
    assert.equal(manifest.publishedLabelsModified, false);
    assert.equal(manifest.source.labelsSha256, before);
    assert.deepEqual(manifest.frames.map(frame => frame.plane), ["sagittal", "coronal", "horizontal"]);
    assert.deepEqual(manifest.frames.map(frame => frame.sliceIndices), [
      [165,166,167,168,170,198,221,222,223,224,225,226],
      [203,204,205,206,207,253,254],
      [139,140,175,176],
    ]);
    for (const frame of manifest.frames) {
      const bytes = await readFile(join(temporary, frame.file));
      assert.ok(bytes.length > 1000);
      assert.equal(digest(bytes), frame.sha256);
    }
    assert.equal(digest(await readFile(labels)), before);
  } finally {
    await rm(temporary, {recursive:true, force:true});
  }
});
