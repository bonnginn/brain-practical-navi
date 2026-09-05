import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

const root = new URL("../", import.meta.url);
const localPath = (path) => fileURLToPath(new URL(path, root));
const patchPath = localPath("segmentation-patches/review/ventricles-orthogonally-bracketed-candidate-2026-08-23.json");
const preVentricleLabels = localPath("tests/fixtures/bigbrain-practical-segmentation-pre-ventricle-6744.bin.gz");
const publishedLabels = localPath("public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz");

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
    if (spawnSync(command, [...prefix, "--version"], { encoding: "utf8" }).status === 0) return { command, prefix };
  }
  throw new Error("Python 3 was not found");
}

const python = resolvePython();

function runPatchCheck(input = preVentricleLabels) {
  return spawnSync(
    python.command,
    [...python.prefix, localPath("scripts/apply_segmentation_patch.py"), patchPath, "--input", input, "--check"],
    { encoding: "utf8", cwd: localPath("") },
  );
}

test("adopted ventricle patch is strict approved and remains pinned to the pre-ventricle artifact", async () => {
  const patch = JSON.parse(await readFile(patchPath, "utf8"));
  assert.equal(patch.reviewStatus, "approved");
  assert.equal(patch.workflowMetadataVersion, 1);
  assert.deepEqual(patch.review, {
    decision: "approved",
    reviewer: { kind: "project-role", id: "project-maintainer-directed-automatic-repair" },
    decidedAt: "2026-08-24",
    reason: patch.review.reason,
    pullRequest: { number: 14, mergeCommit: null },
  });
  assert.match(patch.review.reason, /ユーザーから示された自動修正方針/);
  assert.match(patch.review.reason, /33 voxel/);
  assert.match(patch.review.reason, /三軸|局所プレビュー/);
  assert.doesNotMatch(patch.authorNote, /未適用|unapplied|unreviewed/i);
  assert.doesNotMatch(patch.evidence, /未適用|unapplied|unreviewed/i);
  assert.equal(patch.changeSummary.changedVoxelCount, 33);
  assert.deepEqual(patch.changeSummary.transitions, [
    { from: 0, to: 23, voxels: 14 },
    { from: 0, to: 24, voxels: 15 },
    { from: 0, to: 25, voxels: 4 },
  ]);
  const result = runPatchCheck();
  assert.equal(result.status, 0, result.stderr);
  const audit = JSON.parse(result.stdout);
  assert.equal(audit.inputSha256, "6744e7c0184436789f42c7107d05ead93cf36703bb36372df5f63b82a38f7b56");
  assert.equal(audit.workflowMetadataStatus, "strict");
  assert.equal(audit.editCount, 33);
  assert.deepEqual(Object.fromEntries(audit.transitions.map(({ from, to, voxels }) => [`${from}->${to}`, voxels])), {
    "0->23": 14,
    "0->24": 15,
    "0->25": 4,
  });
});

test("official build patch stage applies only the three approved zero transitions", async () => {
  const harness = [
    "import sys, numpy as np",
    "from pathlib import Path",
    "sys.path.insert(0, 'scripts')",
    "from apply_segmentation_patch import read_volume",
    "from build_bigbrain_practical_seg import apply_approved_ventricle_patch",
    "dims, labels = read_volume(Path(sys.argv[2]))",
    "volume = np.frombuffer(bytes(labels), dtype=np.uint8).reshape(dims, order='F').copy()",
    "audit = apply_approved_ventricle_patch(volume, Path(sys.argv[1]).resolve())",
    "assert audit['editCount'] == 33",
    "assert audit['transitions'] == {'0->23': 14, '0->24': 15, '0->25': 4}",
  ].join("; ");
  const result = spawnSync(python.command, [...python.prefix, "-c", harness, patchPath, preVentricleLabels], {
    encoding: "utf8",
    cwd: localPath(""),
  });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
});

test("published validation metadata records the approved ventricle repair and the new asset digest", async () => {
  const [labels, validation] = await Promise.all([
    readFile(publishedLabels),
    readFile(localPath("public/atlas/bigbrain-practical-segmentation-icbm500-validation.json"), "utf8"),
  ]);
  const metadata = JSON.parse(validation);
  const digest = createHash("sha256").update(labels).digest("hex");
assert.equal(digest, "8cc65edf36e1e3a420168bfb663d6440418dd67189808263d11c180c4b403d16");
  assert.equal(metadata.ventriclePatchAudit.editCount, 33);
  assert.deepEqual(metadata.ventriclePatchAudit.transitions, { "0->25": 4, "0->23": 14, "0->24": 15 });
  assert.deepEqual(metadata.ventriclePatchAudit.review.pullRequest, { number: 14, mergeCommit: null });
  assert.equal(metadata.preVentricleCompressedSha256, "6744e7c0184436789f42c7107d05ead93cf36703bb36372df5f63b82a38f7b56");
  assert.equal(metadata.preVentricleRawVoxelSha256, "088fafcdf6afcea74a7a60075bf3b8a481e1a7aa6379a7c58fb9b9c17f5e731d");
  assert.equal(metadata.labelCounts["23"], 63847);
  assert.equal(metadata.labelCounts["24"], 62869);
  assert.equal(metadata.labelCounts["25"], 10420);
  assert.match(metadata.teachingPolicy, /not expert-reviewed or research ground truth/);
});
