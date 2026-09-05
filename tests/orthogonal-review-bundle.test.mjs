import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rename, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const pythonScript = join(root, "scripts", "build_orthogonal_review_bundle.py");
const image = join(root, "public", "atlas", "bigbrain-icbm500.bin.gz");
const labels = join(root, "public", "atlas", "bigbrain-practical-segmentation-icbm500.bin.gz");

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
const work = await mkdtemp(join(tmpdir(), "orthogonal-review-bundle-"));
const bundle = join(work, "orthogonal-review-bundle-v3");
const manifestPath = join(bundle, "manifest.json");
const scriptSource = await readFile(pythonScript, "utf8");

function runBuilder(args) {
  return spawnSync(python.command, [...python.prefix, pythonScript, ...args], {
    encoding: "utf8",
    cwd: root,
    maxBuffer: 10 * 1024 * 1024,
  });
}

function runValidator(manifestPath) {
  return runBuilder(["--validate", manifestPath]);
}

function cloneManifest(manifest) {
  return JSON.parse(JSON.stringify(manifest));
}

async function runManifestMutation(name, mutate, expectedError) {
  const baseline = await readFile(manifestPath);
  const manifest = cloneManifest(JSON.parse(baseline.toString("utf8")));
  mutate(manifest);
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  try {
    const result = runValidator(manifestPath);
    assert.notEqual(result.status, 0, `${name} unexpectedly passed`);
    assert.match(`${result.stdout}\n${result.stderr}`, expectedError, `${name} error reason`);
  } finally {
    await writeFile(manifestPath, baseline);
  }
}

const initialBuild = runBuilder(["--image", image, "--labels", labels, "--output-dir", bundle]);
assert.equal(initialBuild.status, 0, `${initialBuild.stdout}\n${initialBuild.stderr}`);
const firstManifestBytes = await readFile(manifestPath);
const firstManifest = JSON.parse(firstManifestBytes.toString("utf8"));
const firstFrameBytes = await readFile(join(bundle, "frames", firstManifest.frames[0].path));

test.after(async () => {
  await rm(work, { recursive: true, force: true });
});

test("builds deterministic local evidence and passes independent validation", async () => {
  const result = runValidator(manifestPath);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /"passed": true/);
  assert.equal(firstManifest.format, "brain-practical-orthogonal-review-bundle");
  assert.equal(firstManifest.version, 3);
  assert.deepEqual(firstManifest.review, {
    status: "unreviewed",
    purpose: "Local orthogonal raw-image evidence for later human review; not an anatomical validation or expert-approved segmentation.",
    textOverlay: false,
    labelMutation: false,
    proposedIdsEmitted: [],
    contextOnlyLabelIds: [27],
  });
  assert.deepEqual(firstManifest.crop, {
    sourceLabelIds: [33, 39, 40],
    overlayLabelIds: [27, 33, 39, 40],
    contextOnlyLabelIds: [27],
    contextOnlyScope: "within-crop-only",
    marginVoxels: 4,
    min: [159, 242, 82],
    max: [232, 306, 126],
    size: [74, 65, 45],
  });
  assert.deepEqual(firstManifest.coverage.reviewLabels, [33, 39, 40]);
  assert.deepEqual(firstManifest.coverage.contextOnlyLabels, [27]);
  assert.equal(firstManifest.labels["27"].role, "context-only-within-crop");
  assert.equal(firstManifest.labels["33"].role, "review-label");
  assert.deepEqual(firstManifest.geometry.anchorSliceIndices, { x: 163, y: 246, z: 86 });
  assert.deepEqual(firstManifest.geometry.fourCornerVoxelAnchors.x.corners.map(({ voxel }) => voxel), [
    [163, 242, 126], [163, 306, 126], [163, 242, 82], [163, 306, 82],
  ]);
  assert.deepEqual(firstManifest.definitions, {
    rawPixelSha256: "SHA-256 of the oriented uint8 raw-image crop pixels in row-major order before color outlines.",
    outputPixelSha256: "SHA-256 of the oriented RGB uint8 output pixels in row-major order; PNG metadata/text are not used.",
    pngFileSha256: "SHA-256 of the complete deterministic PNG file bytes.",
    outline: "Only 2-D boundary pixels of the listed stored labels are colored; interior pixels remain the raw image.",
    canonicalSections: "IDs 39/40 include every occupied X/Y/Z index plus the immediately outside endpoint where in bounds; ID 33 includes every occupied X/Y/Z index and no inferred section.",
    coordinates: "Array coordinates are x,y,z in the exact BBS1/BBV1 Fortran grid; plane orientation follows the existing canvas convention.",
    limitations: "This bundle does not identify ID 33 anatomy, split ID 33, generate IDs 36-38, or establish expert/ground-truth boundaries.",
  });
  assert.deepEqual(firstManifest.inputs.image, {
    path: "public/atlas/bigbrain-icbm500.bin.gz",
    magic: "BBV1",
    sha256: "c4b69975f0dece2512adf3bcae690226492cfa66ded38380b3b94aa8dba52746",
    dims: [394, 466, 378],
    voxelSizeMm: [0.5, 0.5, 0.5],
  });
  assert.deepEqual(firstManifest.inputs.labels, {
    path: "public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz",
    magic: "BBS1",
    sha256: "5348b7650a3ba28c95a00407d62cf4054fb0c670a62de717f2c572f66a51c9a3",
    dims: [394, 466, 378],
    voxelSizeMm: [0.5, 0.5, 0.5],
  });
  assert.deepEqual(Object.fromEntries([27, 33, 39, 40].map(id => [id, firstManifest.labels[String(id)].voxelCount])), {
    27: 254786,
    33: 8482,
    39: 561,
    40: 729,
  });
  assert.deepEqual(firstManifest.labels["39"].sections.x.outsideEndpointSliceIndices, [186, 197]);
  assert.deepEqual(firstManifest.labels["39"].sections.y.outsideEndpointSliceIndices, [245, 257]);
  assert.deepEqual(firstManifest.labels["39"].sections.z.outsideEndpointSliceIndices, [106, 122]);
  assert.deepEqual(firstManifest.labels["40"].sections.x.outsideEndpointSliceIndices, [196, 205]);
  assert.deepEqual(firstManifest.labels["40"].sections.y.outsideEndpointSliceIndices, [246, 259]);
  assert.deepEqual(firstManifest.labels["40"].sections.z.outsideEndpointSliceIndices, [107, 122]);
  for (const id of [33, 39, 40]) for (const axis of ["x", "y", "z"]) {
    const section = firstManifest.labels[String(id)].sections[axis];
    assert.ok(section.occupiedSliceIndices.length > 0);
    assert.deepEqual([...section.canonicalSliceIndices].sort((a, b) => a - b), section.canonicalSliceIndices);
    for (const slice of section.occupiedSliceIndices) assert.ok(section.canonicalSliceIndices.includes(slice));
  }
  assert.equal(firstManifest.review.proposedIdsEmitted.length, 0);
  assert.deepEqual(Object.keys(firstManifest.labels).sort((a, b) => Number(a) - Number(b)), ["27", "33", "39", "40"]);
  for (const frame of firstManifest.frames) {
    assert.deepEqual(Object.keys(frame.cropVoxelCounts).sort((a, b) => Number(a) - Number(b)), ["27", "33", "39", "40"]);
    assert.equal(typeof frame.pngFileSha256, "string");
  }
  assert.equal(firstManifest.coverage.frameCount, firstManifest.frames.length);
  assert.equal(firstManifest.frames.length, 161);
  assert.equal(createHash("sha256").update(firstFrameBytes).digest("hex").length, 64);
  assert.equal(firstManifest.frames.every(frame => frame.textOverlay === false), true);
});

test("rebuild is byte-deterministic and leaves the source labels unchanged", async () => {
  const beforeLabels = await readFile(labels);
  const result = runBuilder(["--image", image, "--labels", labels, "--output-dir", bundle]);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.deepEqual(await readFile(manifestPath), firstManifestBytes);
  assert.deepEqual(await readFile(join(bundle, "frames", firstManifest.frames[0].path)), firstFrameBytes);
  assert.deepEqual(await readFile(labels), beforeLabels);
  assert.equal(createHash("sha256").update(await readFile(labels)).digest("hex"), "5348b7650a3ba28c95a00407d62cf4054fb0c670a62de717f2c572f66a51c9a3");
});

test("rejects dimensions, axis, slice, and exact-key mutations with specific reasons", async () => {
  await runManifestMutation("wrong-dims", manifest => { manifest.inputs.image.dims[0] = 393; }, /input image dims mismatch/);
  await runManifestMutation("wrong-axis", manifest => { manifest.frames[0].axis = "q"; }, /frame: exact keys mismatch|frame axis\/slice invalid/);
  await runManifestMutation("wrong-slice", manifest => { manifest.frames[0].sliceIndex = 999; }, /non-canonical frame/);
  await runManifestMutation("extra-candidate-key", manifest => { manifest.labels["33"].candidateVoxelIds = []; }, /label 33: exact keys mismatch/);
  await runManifestMutation("extra-boundary-key", manifest => { manifest.frames[0].boundary = "candidate"; }, /frame: exact keys mismatch/);
  await runManifestMutation("extra-recommendation-key", manifest => { manifest.review.recommendation = "split"; }, /review fixed values mismatch/);
});

test("rejects string, float, and boolean values in integer fields", async () => {
  await runManifestMutation("string-width", manifest => { manifest.frames[0].width = "65"; }, /frame.width: expected integer/);
  await runManifestMutation("float-slice", manifest => { manifest.frames[0].sliceIndex = 163.5; }, /frame.sliceIndex: expected integer/);
  await runManifestMutation("boolean-margin", manifest => { manifest.crop.marginVoxels = true; }, /crop.marginVoxels: expected integer/);
  await runManifestMutation("string-count", manifest => { manifest.labels["39"].voxelCount = "561"; }, /label 39.voxelCount: expected integer/);
  await runManifestMutation("boolean-anchor-row", manifest => { manifest.geometry.fourCornerVoxelAnchors.x.corners[0].row = false; }, /geometry\.fourCornerVoxelAnchors\.x\.corners\[0\]\.row: expected integer/);
  await runManifestMutation("float-coverage-index", manifest => { manifest.coverage.axes.x[0] = 163.25; }, /coverage\.axes\.x\[0\]: expected integer/);
});

test("rejects source hash, output pixel hash, and PNG file hash tampering", async () => {
  await runManifestMutation("wrong-hash", manifest => { manifest.inputs.labels.sha256 = "0".repeat(64); }, /input labels SHA mismatch/);
  await runManifestMutation("wrong-pixel-hash", manifest => { manifest.frames[0].outputPixelSha256 = "0".repeat(64); }, /output pixel SHA mismatch/);
  await runManifestMutation("wrong-png-file-hash", manifest => { manifest.frames[0].pngFileSha256 = "0".repeat(64); }, /PNG file SHA mismatch/);
});

test("rejects a Y/Z row reversal by rendered-pixel verification", async () => {
  assert.match(scriptSource, /def _flat_fortran_pixel_value/);
  assert.match(scriptSource, /source_flat\[flat_index\]/);
  assert.match(scriptSource, /ravel\(order="F"\)/);
  assert.equal(firstManifest.geometry.pixelToVoxel.planes.y.row, "z=crop.max[2]-row");
  assert.equal(firstManifest.geometry.pixelToVoxel.planes.z.row, "y=crop.max[1]-row");
  const framePath = join(bundle, "frames", "y-246.png");
  const original = await readFile(framePath);
  const code = [
    "from PIL import Image,ImageOps",
    "import sys",
    "path=sys.argv[1]",
    "image=Image.open(path).convert('RGB')",
    "ImageOps.flip(image).save(path,format='PNG',optimize=False,compress_level=9)",
  ].join(";");
  const reversed = spawnSync(python.command, [...python.prefix, "-c", code, framePath], { encoding: "utf8", cwd: root });
  assert.equal(reversed.status, 0, `${reversed.stdout}\n${reversed.stderr}`);
  try {
    const result = runValidator(manifestPath);
    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}\n${result.stderr}`, /output pixels differ|flat Fortran crop mismatch/);
  } finally {
    await writeFile(framePath, original);
  }
});

test("directly proves the independent flat anchor verifier catches a shared Y/Z regression", async () => {
  const validatorStart = scriptSource.indexOf("def validate_bundle");
  const validatorEnd = scriptSource.indexOf("def main", validatorStart);
  assert.ok(validatorStart >= 0 && validatorEnd > validatorStart);
  assert.match(scriptSource.slice(validatorStart, validatorEnd), /_validate_flat_anchor_pixels\(image, crop\)/);
  const code = `
import importlib.util, json, sys
from pathlib import Path
spec = importlib.util.spec_from_file_location("bundle", sys.argv[1])
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
_, _, image = module.read_browser_volume(Path(sys.argv[2]), module.MAGIC_IMAGE, module.EXPECTED_IMAGE_SHA256)
crop = json.loads(Path(sys.argv[3]).read_text(encoding="utf-8"))["crop"]
original = module._oriented_crop
def flipped(values, axis, slice_index, crop):
    result = original(values, axis, slice_index, crop)
    return result[::-1, :] if axis in ("y", "z") else result
module._oriented_crop = flipped
try:
    module._validate_flat_anchor_pixels(image, crop)
except module.BundleError as error:
    if "flat Fortran anchor mismatch" not in str(error):
        raise
else:
    raise AssertionError("the monkeypatched Y/Z orientation unexpectedly passed")
`;
  const result = spawnSync(python.command, [...python.prefix, "-c", code, pythonScript, image, manifestPath], { encoding: "utf8", cwd: root });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
});

test("rejects incomplete coverage, canonicalSection/geometry mutations, and proposed IDs", async () => {
  await runManifestMutation("missing-coverage", manifest => { manifest.coverage.axes.x.pop(); }, /coverage axis indices mismatch/);
  await runManifestMutation("canonical-mutation", manifest => { manifest.canonicalSections.mammillaryIds["39"].x.canonicalSliceIndices.shift(); }, /canonicalSections volume recomputation mismatch/);
  await runManifestMutation("formula-mutation", manifest => { manifest.geometry.pixelToVoxel.planes.x.row = "x=bad"; }, /pixel-to-voxel formulas mismatch/);
  await runManifestMutation("anchor-mutation", manifest => { manifest.geometry.fourCornerVoxelAnchors.x.corners[0].voxel[0] += 1; }, /four-corner voxel anchors mismatch/);
  await runManifestMutation("proposed-id", manifest => { manifest.review.proposedIdsEmitted = [36]; }, /review fixed values mismatch/);
  await runManifestMutation("review-label-27", manifest => { manifest.coverage.reviewLabels = [27, 33, 39, 40]; }, /coverage review labels mismatch/);
  await runManifestMutation("id36-label", manifest => { manifest.labels["36"] = { voxelCount: 1 }; }, /labels: exact keys mismatch/);
});

test("rejects extra, missing, and nested bundle files before frame reads", async () => {
  const extraRoot = join(bundle, "extra.json");
  await writeFile(extraRoot, "{}", "utf8");
  try {
    const result = runValidator(manifestPath);
    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}\n${result.stderr}`, /bundle root file set/);
  } finally {
    await rm(extraRoot, { force: true });
  }
  const extraFrame = join(bundle, "frames", "extra.png");
  await writeFile(extraFrame, firstFrameBytes);
  try {
    const result = runValidator(manifestPath);
    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}\n${result.stderr}`, /bundle frames file set/);
  } finally {
    await rm(extraFrame, { force: true });
  }
  const missingFrame = join(bundle, "frames", firstManifest.frames[0].path);
  const missingBytes = await readFile(missingFrame);
  await rm(missingFrame);
  try {
    const result = runValidator(manifestPath);
    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}\n${result.stderr}`, /bundle frames file set/);
    assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, /cannot read frame/);
  } finally {
    await writeFile(missingFrame, missingBytes);
  }
  const nested = join(bundle, "frames", "nested");
  await mkdir(nested);
  try {
    const result = runValidator(manifestPath);
    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}\n${result.stderr}`, /unexpected file or subdirectory/);
  } finally {
    await rm(nested, { recursive: true, force: true });
  }
});

test("rejects root, frames, manifest, and PNG symlink/junction paths", async t => {
  const linkType = process.platform === "win32" ? "junction" : "dir";
  const linkUnavailable = error => ["EPERM", "EACCES", "ENOTSUP"].includes(error?.code);
  const linkParent = join(work, "link-parent");
  await mkdir(linkParent);
  const linkedRoot = join(linkParent, "orthogonal-review-bundle-v3");
  try {
    await symlink(bundle, linkedRoot, linkType);
  } catch (error) {
    if (["EPERM", "EACCES", "ENOTSUP"].includes(error?.code)) {
      await rm(linkParent, { recursive: true, force: true });
      t.skip(`filesystem links unavailable: ${error.code}`);
      return;
    }
    throw error;
  }
  try {
    const result = runBuilder(["--image", image, "--labels", labels, "--output-dir", linkedRoot]);
    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}\n${result.stderr}`, /symlink\/junction\/reparse/);
  } finally {
    await rm(linkedRoot, { recursive: true, force: true });
  }
  await rm(linkParent, { recursive: true, force: true });

  const externalManifest = join(work, "manifest-target.json");
  await writeFile(externalManifest, await readFile(manifestPath));
  await rm(manifestPath);
  let manifestLinked = false;
  try {
    try {
      await symlink(externalManifest, manifestPath, "file");
      manifestLinked = true;
    } catch (error) {
      if (!linkUnavailable(error)) throw error;
    }
    if (manifestLinked) {
      const result = runValidator(manifestPath);
      assert.notEqual(result.status, 0);
      assert.match(`${result.stdout}\n${result.stderr}`, /symlink\/junction\/reparse/);
    }
  } finally {
    await rm(manifestPath, { force: true });
    await writeFile(manifestPath, await readFile(externalManifest));
    await rm(externalManifest, { force: true });
  }

  const framesPath = join(bundle, "frames");
  const externalFrames = join(work, "frames-target");
  await rename(framesPath, externalFrames);
  let framesLinked = false;
  try {
    try {
      await symlink(externalFrames, framesPath, linkType);
      framesLinked = true;
    } catch (error) {
      if (!linkUnavailable(error)) throw error;
    }
    if (framesLinked) {
      const result = runValidator(manifestPath);
      assert.notEqual(result.status, 0);
      assert.match(`${result.stdout}\n${result.stderr}`, /symlink\/junction\/reparse/);
    }
  } finally {
    await rm(framesPath, { recursive: true, force: true });
    await rename(externalFrames, framesPath);
  }

  const pngPath = join(framesPath, firstManifest.frames[0].path);
  const externalPng = join(work, "frame-target.png");
  await rename(pngPath, externalPng);
  let pngLinked = false;
  try {
    try {
      await symlink(externalPng, pngPath, "file");
      pngLinked = true;
    } catch (error) {
      if (!linkUnavailable(error)) throw error;
    }
    if (pngLinked) {
      const result = runValidator(manifestPath);
      assert.notEqual(result.status, 0);
      assert.match(`${result.stdout}\n${result.stderr}`, /symlink\/junction\/reparse/);
    }
  } finally {
    await rm(pngPath, { force: true });
    await rename(externalPng, pngPath);
  }
});

test("rejects PNG metadata injection and keeps all generated PNG metadata empty", async () => {
  const framePath = join(bundle, "frames", firstManifest.frames[0].path);
  const original = await readFile(framePath);
  const code = [
    "from PIL import Image,PngImagePlugin",
    "import sys",
    "path=sys.argv[1]",
    "image=Image.open(path).convert('RGB')",
    "info=PngImagePlugin.PngInfo(); info.add_text('tampered','1')",
    "image.save(path,format='PNG',pnginfo=info,optimize=False,compress_level=9)",
  ].join(";");
  const injected = spawnSync(python.command, [...python.prefix, "-c", code, framePath], { encoding: "utf8", cwd: root });
  assert.equal(injected.status, 0, `${injected.stdout}\n${injected.stderr}`);
  try {
    const result = runValidator(manifestPath);
    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}\n${result.stderr}`, /PNG metadata must be empty/);
  } finally {
    await writeFile(framePath, original);
  }
  const result = runValidator(manifestPath);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
});

test("requires the dedicated output directory contract", async () => {
  const unsafe = join(work, "unsafe-output");
  const result = runBuilder(["--image", image, "--labels", labels, "--output-dir", unsafe]);
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}\n${result.stderr}`, /dedicated orthogonal-review-bundle-v3 directory/);
});
