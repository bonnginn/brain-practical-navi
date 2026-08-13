import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import test from "node:test";
import { gunzipSync } from "node:zlib";

const root = new URL("../", import.meta.url);

function readVolumeHeader(buffer, expectedMagic) {
  const payload = gunzipSync(buffer);
  assert.equal(payload.subarray(0, 4).toString("ascii"), expectedMagic);
  const dims = [payload.readUInt16LE(4), payload.readUInt16LE(6), payload.readUInt16LE(8)];
  const voxelCount = dims.reduce((total, value) => total * value, 1);
  assert.equal(payload.length, 10 + voxelCount);
  return { payload, dims, voxelCount };
}

test("uses an exact coordinate-matched BigBrain image and manual label grid", async () => {
  const [imageFile, labelFile, metadataFile] = await Promise.all([
    readFile(new URL("public/atlas/bigbrain-icbm500.bin.gz", root)),
    readFile(new URL("public/atlas/bigbrain-manual-subcortical-icbm500.bin.gz", root)),
    readFile(new URL("public/atlas/bigbrain-icbm500-validation.json", root), "utf8"),
  ]);

  const image = readVolumeHeader(imageFile, "BBV1");
  const labels = readVolumeHeader(labelFile, "BBS1");
  assert.deepEqual(image.dims, [394, 466, 378]);
  assert.deepEqual(labels.dims, image.dims);

  const metadata = JSON.parse(metadataFile);
  assert.deepEqual(metadata.shape, image.dims);
  assert.deepEqual(metadata.voxelSizeMm, [0.5, 0.5, 0.5]);
  assert.deepEqual(metadata.labelIds, Array.from({ length: 22 }, (_, index) => index + 1));
  assert.ok(metadata.labelTissueOverlap > 0.99);
  assert.equal(metadata.leftRightPairsValidated, 11);
  assert.match(metadata.coordinatePolicy, /exact shared ICBM2009 symmetric grid/);
});

test("does not load the rejected affine-only label transfer", async () => {
  const [canvas, page, html] = await Promise.all([
    readFile(new URL("app/AtlasVolumeCanvas.tsx", root), "utf8"),
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("dist/index.html", root), "utf8"),
  ]);

  assert.match(canvas, /bigbrain-icbm500\.bin\.gz/);
  assert.match(canvas, /bigbrain-practical-segmentation-\$\{name\}\.bin\.gz/);
  assert.doesNotMatch(canvas, /bigbrain-manual-subcortical-\$\{name\}/);
  assert.doesNotMatch(canvas, /manual-subcortical-(fixed|histology)/);
  assert.match(page, /同一格子で検証済み/);
  assert.match(page, /未検証ラベルを表示しません/);
  assert.match(html, /<title>脳実習ナビ/);
});

test("keeps official labels separate from provisional teaching overlays", async () => {
  const [labelFile, metadataFile] = await Promise.all([
    readFile(new URL("public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz", root)),
    readFile(
      new URL("public/atlas/bigbrain-practical-segmentation-icbm500-validation.json", root),
      "utf8",
    ),
  ]);

  const labels = readVolumeHeader(labelFile, "BBS1");
  assert.deepEqual(labels.dims, [394, 466, 378]);

  const metadata = JSON.parse(metadataFile);
  assert.deepEqual(metadata.shape, labels.dims);
  assert.deepEqual(metadata.officialManualIds, Array.from({ length: 22 }, (_, index) => index + 1));
  assert.equal(metadata.officialLabelsPreserved, true);
  assert.deepEqual(metadata.atlasDerivedIds, [23, 24, 25, 26, 27, 28, 29]);
  assert.deepEqual(metadata.imageGuidedCandidateIds, [30, 31, 32]);
  for (const id of Array.from({ length: 32 }, (_, index) => index + 1)) {
    assert.ok(metadata.labelCounts[id] > 0, `label ${id} must contain voxels`);
  }
  assert.equal(metadata.ventricleLabelsRestrictedToEmptySpace, true);
  assert.equal(metadata.ventricleTissueOverlap, 0);
  assert.match(metadata.coordinatePolicy, /exact BigBrain ICBM2009sym 0\.5 mm output grid/);
  assert.match(metadata.teachingPolicy, /provisional teaching overlays/);
});

test("ships the learning workspaces, contributor editor, and public data notice", async () => {
  const [page, canvasCss, editor, workflow, readme, licenses, attribution, packageJson, softwareLicense, licenseMap, governance] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/canvas.css", root), "utf8"),
    readFile(new URL("app/ManualSegmentationWorkbench.tsx", root), "utf8"),
    readFile(new URL("SEGMENTATION_WORKFLOW.md", root), "utf8"),
    readFile(new URL("README.md", root), "utf8"),
    readFile(new URL("DATA_AND_LICENSES.md", root), "utf8"),
    readFile(new URL("public/atlas/ATTRIBUTION.txt", root), "utf8"),
    readFile(new URL("package.json", root), "utf8"),
    readFile(new URL("LICENSE", root), "utf8"),
    readFile(new URL("LICENSES.md", root), "utf8"),
    readFile(new URL("GOVERNANCE.md", root), "utf8"),
  ]);

  for (const label of ["トップ", "断面実習", "脳表観察", "ブロック標本", "脳底動脈", "脳神経・脳幹", "復習クイズ", "編集ツール", "CC・権利", "意見・共同制作"]) {
    assert.match(page, new RegExp(label));
  }
  assert.match(page, /useState<WorkspaceMode>\("home"\)/);
  assert.match(page, /脳実習を、/);
  assert.match(page, /切る前から立体で。/);
  assert.match(page, /OPEN ALPHA/);
  assert.match(page, /α版・非営利教育用/);
  assert.doesNotMatch(page, /OPEN BETA|β版・非営利教育用/);
  assert.doesNotMatch(page, /を連続して追う/);
  assert.match(page, /VITE_FEEDBACK_FORM_URL/);
  assert.match(page, /VITE_SOURCE_REPOSITORY_URL/);
  assert.match(page, /間違った問題のみ/);
  assert.match(page, /間違い履歴を消去/);
  assert.match(page, /quizFinished/);
  assert.match(page, /restoreAllQuiz/);
  assert.match(page, /同じ問題を再挑戦/);
  assert.match(page, /結果を見る/);
  assert.match(canvasCss, /\.homeModelStage\s*\{[^}]*height:\s*auto/);
  assert.match(canvasCss, /\.quizWorkspace\s*\{[^}]*display:\s*grid/);
  assert.match(canvasCss, /\.quizImageStage\s*\{[^}]*position:\s*relative/);
  assert.match(canvasCss, /\.quizTargetTag\s*\{[^}]*position:\s*absolute/);
  assert.match(canvasCss, /\.learningGrid,\.quizWorkspace,\.segWorkbench\{grid-template-columns:minmax\(0,1fr\) minmax\(270px,34vw,310px\)\}/);
  assert.doesNotMatch(canvasCss, /@media\(max-width:900px\)[^\n]*\.learningGrid,\.quizWorkspace,\.segWorkbench\{grid-template-columns:1fr\}/);
  assert.match(page, /小脳を外す/);
  assert.match(page, /橋・延髄を外す/);
  assert.doesNotMatch(page, /中脳を外す/);
  assert.match(page, /0\.5 mm標本組織＋構造レイヤー/);
  for (const specimen of ["側脳室の全景", "視床・視床下部標本", "レンズ核・投射線維", "脳梁・脳弓標本", "脈絡叢を開く", "海馬・扁桃体標本", "中脳核・大脳脚標本"]) assert.match(page, new RegExp(specimen));
  for (const provenance of ["標本分節", "試作分節", "模式補助", "位置目安"]) assert.match(page, new RegExp(provenance));
  assert.match(page, /脳回を色づける/);
  assert.match(page, /複数選択/);
  assert.match(page, /surfaceHighlights/);
  assert.match(page, /脳表を透過/);
  assert.match(page, /脳表・主要脳回/);
  assert.match(page, /\[5,10,15,20\]/);
  assert.match(page, /CC BY-NC-SA 4\.0/);
  assert.match(page, /診断・治療・手術計画・定量研究には使用できません/);
  assert.match(readme, /非営利目的に限られます/);
  assert.match(readme, /主要脳底動脈と脳神経根を重ねる/);
  assert.match(page, /ALIGNED 3D OVERLAY · PILOT/);
  assert.match(page, /neurovascularOverlay/);
  assert.match(page, /neurovascularHighlights/);
  assert.match(page, /個別に同定/);
  assert.match(page, /選択した管・神経根を白色で強調/);
  assert.match(page, /key==="cranialNerves"\)\{setSurfaceVessels\(false\);setSurfaceNerves\(true\)/);
  assert.doesNotMatch(page, /blockSpecimen==="arteries"|blockSpecimen==="cranialNerves"/);
  assert.match(page, /脳底ランドマーク/);
  assert.match(page, /漏斗（下垂体茎）/);
  assert.match(page, /乳頭体/);
  assert.match(page, /showBasalLandmarks/);
  assert.match(page, /血管[\s\S]*脳神経[\s\S]*小脳を外す/);
  assert.doesNotMatch(page, /<svg/);
  assert.match(licenses, /AGPL-3\.0-or-later/);
  assert.match(licenseMap, /自作教材文書[\s\S]*CC BY-NC-SA 4\.0/);
  assert.match(governance, /オーナー確認前ドラフト/);
  assert.match(governance, /フィードバック提供者/);
  assert.match(governance, /GitHubアカウント/);
  assert.match(governance, /運営承継/);
  assert.match(editor, /brain-practical-segmentation-patch/);
  assert.match(editor, /差分JSONを書き出す/);
  assert.match(editor, /元へ戻す/);
  assert.match(editor, /端末内へ自動保存/);
  assert.match(workflow, /Pull Requestに必要な情報/);
  assert.match(workflow, /apply_segmentation_patch\.py/);
  assert.equal(JSON.parse(packageJson).version, "0.1.0-alpha.1");
  assert.equal(JSON.parse(packageJson).license, "AGPL-3.0-or-later");
  assert.match(softwareLicense, /GNU AFFERO GENERAL PUBLIC LICENSE/);
  assert.match(softwareLicense, /13\. Remote Network Interaction/);
  assert.match(softwareLicense, /END OF TERMS AND CONDITIONS/);
  assert.match(attribution, /BigBrain/);
});

test("connects only the public Google Form responder URL", async () => {
  const [page, envExample, readme] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL(".env.example", root), "utf8"),
    readFile(new URL("README.md", root), "utf8"),
  ]);
  const publishedText = `${page}\n${envExample}\n${readme}`;
  assert.match(publishedText, /1FAIpQLSeM5Kge0Zl9Q0lCHMEP1g____uHvDZsfzjSGA0FzeT9Gf75dA\/viewform/);
  assert.doesNotMatch(publishedText, /15c95KrcMeKccBxyBWiotKO3s_5xcF8NNHqkRf6n0Dx4/);
  assert.doesNotMatch(publishedText, /1nW-udpo6EAhG7Fi0D0VCpUTngjQ8ldIKUoECAFwxvv0/);
});

test("validates browser segmentation patches against the bundled BBS1 grid", () => {
  const result = spawnSync("python3", [
    new URL("scripts/apply_segmentation_patch.py", root).pathname,
    new URL("tests/fixtures/segmentation-patch-smoke.json", root).pathname,
    "--input", new URL("public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz", root).pathname,
    "--check",
  ], {encoding:"utf8"});
  assert.equal(result.status, 0, result.stderr);
  const audit = JSON.parse(result.stdout);
  assert.deepEqual(audit.dims, [394, 466, 378]);
  assert.equal(audit.editCount, 1);
  assert.equal(audit.changedVoxelCount + audit.unchangedVoxelCount, 1);
});

test("pins segmentation patches to the exact bundled label revision", async () => {
  const [labels, editor, fixtureText] = await Promise.all([
    readFile(new URL("public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz", root)),
    readFile(new URL("app/ManualSegmentationWorkbench.tsx", root), "utf8"),
    readFile(new URL("tests/fixtures/segmentation-patch-smoke.json", root), "utf8"),
  ]);
  const digest = createHash("sha256").update(labels).digest("hex");
  assert.match(editor, new RegExp(`LABEL_SHA256="${digest}"`));
  assert.equal(JSON.parse(fixtureText).sourceLabelsSha256, digest);
});

test("detects voxel-level conflicts between contributor segmentation patches", () => {
  const result = spawnSync("python3", [
    new URL("scripts/check_segmentation_patch_conflicts.py", root).pathname,
    new URL("tests/fixtures/segmentation-patch-smoke.json", root).pathname,
    new URL("tests/fixtures/segmentation-patch-conflict.json", root).pathname,
    "--input", new URL("public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz", root).pathname,
  ], {encoding:"utf8"});
  assert.equal(result.status, 2, result.stderr);
  const audit = JSON.parse(result.stdout);
  assert.equal(audit.conflictCount, 1);
  assert.equal(audit.conflicts[0].index, 0);
  assert.deepEqual([audit.conflicts[0].firstLabel, audit.conflicts[0].secondLabel], [0, 1]);
});

test("bundles valid WebGL meshes and the required data notices", async () => {
  const meshNames = [
    "brain.mesh",
    "caudate.mesh",
    "hippocampus.mesh",
    "thalamus.mesh",
    "ventricle.mesh",
    "pial-left.mesh",
    "pial-right.mesh",
    "segment-brainstem.mesh",
    "segment-midbrain.mesh",
    "segment-pons-medulla.mesh",
    "segment-cerebellum.mesh",
    "segment-deep.mesh",
    "segment-ventricles.mesh",
    "overlay-arteries-anterior.mesh",
    "overlay-arteries-posterior.mesh",
    "overlay-nerves-anterior.mesh",
    "overlay-nerves-pontine.mesh",
    "overlay-nerves-medullary.mesh",
    "landmark-optic-pathway.mesh",
    "landmark-infundibulum.mesh",
    "landmark-mammillary-bodies.mesh",
  ];

  for (const name of meshNames) {
    const mesh = await readFile(new URL(`public/atlas/${name}`, root));
    assert.ok(["BNM1", "BNM2", "BNM3"].includes(mesh.subarray(0, 4).toString("ascii")), `${name} magic`);
    assert.ok(mesh.readUInt32LE(4) > 100, `${name} vertex count`);
    assert.ok(mesh.readUInt32LE(8) > 100, `${name} face count`);
  }

  const notices = await Promise.all([
    "ATTRIBUTION.txt",
    "BIGBRAIN-DATA-LICENSE.txt",
    "BIGBRAIN-MANUAL-LICENSE.txt",
    "LICENSE.txt",
    "PROCEDURAL-NEUROVASCULAR-NOTICE.txt",
  ].map(name => readFile(new URL(`public/atlas/${name}`, root), "utf8")));
  assert.ok(notices.every(text => text.trim().length > 200));
  assert.match(notices[0], /procedurally generated teaching meshes/);
  assert.match(notices.at(-1), /not\s+extracted from BigBrain histology/);
});

test("bundles the practical ventral-brain landmarks in anatomical order", async () => {
  const metadata = JSON.parse(await readFile(new URL("public/atlas/basal-landmarks.json", root), "utf8"));
  assert.equal(metadata.version, 1);
  assert.match(metadata.coordinateSpace, /manually approximated/);
  assert.deepEqual(metadata.displayShiftMm, [0, 18, -18]);
  assert.match(metadata.alignmentPolicy, /same.*display shift.*pial/i);
  assert.match(metadata.status, /not validated segmentation or morphometry/);
  assert.deepEqual(metadata.anteriorToPosteriorOrder, [
    "optic nerves/chiasm", "infundibulum", "mammillary bodies",
  ]);
  assert.match(metadata.specimenNote, /pituitary gland is not shown/);
  assert.deepEqual(metadata.meshes.map(mesh => mesh.label), [
    "視神経・視交叉・視索", "漏斗（下垂体茎）", "乳頭体",
  ]);
  for (const item of metadata.meshes) {
    assert.ok(item.vertices > 500, `${item.label} vertices`);
    assert.ok(item.faces > 1000, `${item.label} faces`);
    const mesh = await readFile(new URL(`public/atlas/${item.file}`, root));
    assert.equal(mesh.subarray(0, 4).toString("ascii"), "BNM1");
    assert.equal(mesh.readUInt32LE(4), item.vertices);
    assert.equal(mesh.readUInt32LE(8), item.faces);
    assert.equal(mesh.length, 12 + item.vertices * 24 + item.faces * 12);
  }
});

test("maps major CerebrA cortical regions onto both high-density pial surfaces", async () => {
  const [metadataText, left, right] = await Promise.all([
    readFile(new URL("public/atlas/surface-region-labels.json", root), "utf8"),
    readFile(new URL("public/atlas/pial-left.mesh", root)),
    readFile(new URL("public/atlas/pial-right.mesh", root)),
  ]);
  const metadata = JSON.parse(metadataText);
  assert.equal(metadata.version, 1);
  assert.match(metadata.source, /CerebrA/);
  assert.match(metadata.method, /±3 mm/);
  assert.match(metadata.status, /not a manual pial-surface parcellation/);

  for (const [hemisphere, mesh, expectedIds] of [
    ["left", left, [86, 64, 89, 96, 83, 73, 102, 82, 67, 94, 57, 63, 75]],
    ["right", right, [35, 13, 38, 45, 32, 22, 51, 31, 16, 43, 6, 12, 24]],
  ]) {
    assert.equal(mesh.subarray(0, 4).toString("ascii"), "BNM3");
    const vertexCount = mesh.readUInt32LE(4);
    const faceCount = mesh.readUInt32LE(8);
    assert.equal(vertexCount, 163842);
    assert.equal(mesh.length, 12 + vertexCount * 32 + faceCount * 12);
    const regionOffset = 12 + vertexCount * 28;
    const counts = new Map();
    for (let index = 0; index < vertexCount; index += 1) {
      const id = Math.round(mesh.readFloatLE(regionOffset + index * 4));
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    for (const id of expectedIds) assert.ok(counts.get(id) > 1000, `${hemisphere} region ${id}`);
    assert.ok(metadata.hemispheres[hemisphere].coverage > .93);
    assert.ok(metadata.hemispheres[hemisphere].coverage < .95);
    assert.equal(metadata.hemispheres[hemisphere].vertices, vertexCount);
  }
});

test("bundles simplified neurovascular overlays as separately disclosed teaching meshes", async () => {
  const metadata = JSON.parse(await readFile(new URL("public/atlas/neurovascular-overlays.json", root), "utf8"));
  assert.equal(metadata.version, 1);
  assert.match(metadata.coordinateSpace, /manually approximated/);
  assert.deepEqual(metadata.displayShiftMm, [0, 18, -18]);
  assert.match(metadata.alignmentPolicy, /arteries retain the pial display shift/i);
  assert.match(metadata.alignmentPolicy, /roots are anchored directly.*brainstem segmentation/i);
  assert.match(metadata.cranialNerveRootCalibration, /within 2 mm.*label 27 surface/i);
  assert.match(metadata.status, /not validated morphometry/);
  assert.equal(metadata.groups.length, 5);
  assert.ok(metadata.omissions.includes("small perforators"));
  assert.ok(metadata.omissions.includes("surgical accuracy"));

  const expected = new Set([
    "overlay-arteries-anterior.mesh",
    "overlay-arteries-posterior.mesh",
    "overlay-nerves-anterior.mesh",
    "overlay-nerves-pontine.mesh",
    "overlay-nerves-medullary.mesh",
  ]);
  for (const group of metadata.groups) {
    assert.ok(expected.delete(group.file), `unexpected or duplicate ${group.file}`);
    assert.ok(group.vertices >= 1000);
    assert.ok(group.faces >= 2000);
    assert.ok(group.structures.length >= 8);
    assert.ok(group.structures.every(structure => Number.isInteger(structure.id) && structure.id > 0));
    assert.equal(group.displayShiftApplied, group.file.startsWith("overlay-arteries"));
    assert.equal(new Set(group.structures.map(structure => structure.id)).size, group.structures.length);
    const mesh = await readFile(new URL(`public/atlas/${group.file}`, root));
    assert.equal(mesh.subarray(0, 4).toString("ascii"), "BNM3");
    assert.equal(mesh.readUInt32LE(4), group.vertices);
    assert.equal(mesh.readUInt32LE(8), group.faces);
    assert.equal(mesh.length, 12 + group.vertices * 32 + group.faces * 12);
    const regionOffset = 12 + group.vertices * 28;
    const meshIds = new Set();
    for (let index = 0; index < group.vertices; index += 1) {
      meshIds.add(Math.round(mesh.readFloatLE(regionOffset + index * 4)));
    }
    assert.deepEqual(meshIds, new Set(group.structures.map(structure => structure.id)));
  }
  assert.equal(expected.size, 0);
});

test("bundles structure-focused specimens and distinguishes derived from schematic parts", async () => {
  const metadata = JSON.parse(await readFile(new URL("public/atlas/specimen-blocks.json", root), "utf8"));
  assert.equal(metadata.version, 3);
  assert.equal(metadata.sourceVoxelMm, 0.5);
  assert.equal(metadata.geometrySamplingMm, 1);
  assert.deepEqual(Object.keys(metadata.specimens), ["lateral-ventricle", "diencephalon", "radiations", "commissural-system", "choroid-plexus", "medial-temporal", "midbrain-section", "hindbrain"]);
  assert.match(metadata.sourceTypeDefinitions["specimen-derived"], /histological volume/);
  assert.match(metadata.sourceTypeDefinitions["schematic-3d"], /teaching approximation/);
  assert.equal(metadata.specimens["lateral-ventricle"].find(part => part.part === "caudate").sourceType, "manual-segmentation");
  assert.equal(metadata.specimens.radiations.find(part => part.part === "putamen").sourceType, "manual-segmentation");
  assert.equal(metadata.specimens.radiations.find(part => part.part === "pallidum-external").sourceType, "manual-segmentation");
  assert.equal(metadata.specimens.radiations.find(part => part.part === "pallidum-internal").sourceType, "manual-segmentation");
  assert.equal(metadata.specimens.radiations.some(part => part.part === "lentiform"), false);
  assert.equal(metadata.specimens.radiations.find(part => part.part === "optic-radiation").sourceType, "schematic-surface-guide");
  assert.equal(metadata.specimens["choroid-plexus"].find(part => part.part === "choroid-plexus").sourceType, "schematic-3d");
  assert.equal(metadata.specimens["medial-temporal"].find(part => part.part === "uncus").sourceType, "regional-approximation");
  assert.equal(metadata.specimens.diencephalon.find(part => part.part === "hypothalamus").sourceType, "regional-approximation");
  assert.equal(metadata.specimens["commissural-system"].find(part => part.part === "fornix").sourceType, "schematic-3d");
  assert.equal(metadata.specimens["midbrain-section"].find(part => part.part === "red-nuclei").sourceType, "manual-segmentation");
  assert.equal(metadata.specimens["midbrain-section"].find(part => part.part === "aqueduct").sourceType, "schematic-3d");

  for (const [block, parts] of Object.entries(metadata.specimens)) {
    assert.ok(parts.length >= 3, `${block} parts`);
    for (const part of parts) {
      assert.ok(part.vertices > 100, `${block}/${part.part} vertices`);
      assert.ok(part.faces > 200, `${block}/${part.part} faces`);
      assert.match(part.color, /^#[0-9a-f]{6}$/i);
      assert.ok(["specimen", "model"].includes(part.material));
      const mesh = await readFile(new URL(`public/atlas/${part.file}`, root));
      assert.equal(mesh.subarray(0, 4).toString("ascii"), "BNM2");
      assert.equal(mesh.readUInt32LE(4), part.vertices);
      assert.equal(mesh.readUInt32LE(8), part.faces);
      assert.equal(mesh.length, 12 + part.vertices * 28 + part.faces * 12);
      assert.ok(Number.isFinite(part.shadeMin));
      assert.ok(Number.isFinite(part.shadeMax));
      assert.ok(part.shadeMin >= 0 && part.shadeMax <= 1);
      if (part.material === "specimen") assert.ok(part.shadeMax - part.shadeMin > 0.25, `${block}/${part.part} specimen shade range`);
    }
  }
});

test("covers every cranial nerve without hiding schematic limitations", async () => {
  const [metadataText, page, audit] = await Promise.all([
    readFile(new URL("public/atlas/neurovascular-overlays.json", root), "utf8"),
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("LECTURE_COVERAGE_AUDIT.md", root), "utf8"),
  ]);
  const metadata = JSON.parse(metadataText);
  const nerves = metadata.groups
    .filter(group => group.file.startsWith("overlay-nerves-"))
    .flatMap(group => group.structures);
  assert.deepEqual(nerves.map(item => item.id), Array.from({ length: 25 }, (_, index) => index + 21));
  const normalized = nerves.map(item => item.name.replace(/^[左右]/, ""));
  const expectedCounts = new Map([
    ["I", 2], ["II", 3], ["III", 2], ["IV", 2], ["V", 2], ["VI", 2],
    ["VII", 2], ["VIII", 2], ["IX", 2], ["X", 2], ["XI", 2], ["XII", 2],
  ]);
  for (const [roman, expected] of expectedCounts) {
    assert.equal(normalized.filter(name => name.startsWith(`${roman} `)).length, expected, `cranial nerve ${roman}`);
  }
  for (const key of Array.from({ length: 12 }, (_, index) => `cn${index + 1}`)) {
    assert.match(page, new RegExp(`${key}:\\{name:`), key);
  }
  assert.match(audit, /脳神経I〜XIIは欠番なく収録/);
  assert.match(audit, /Iの嗅球、XIの脊髄根/);
});

test("keeps lecture coverage honest and separates pallidal segments", async () => {
  const [page, audit] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("LECTURE_COVERAGE_AUDIT.md", root), "utf8"),
  ]);
  assert.match(page, /pallidumExternal: \{ name:"淡蒼球外節"[\s\S]*?bigbrainIds:\[11,12\]/);
  assert.match(page, /pallidumInternal: \{ name:"淡蒼球内節"[\s\S]*?bigbrainIds:\[13,14\]/);
  assert.match(page, /members:\["caudate","putamen","pallidumExternal","pallidumInternal","accumbens"\]/);
  for (const status of ["標本分節", "試作分節", "アトラス脳表", "模式3D", "位置目安", "表記のみ", "未収録"]) {
    assert.match(audit, new RegExp(status));
  }
  for (const gap of ["中心溝", "嗅球", "外側膝状体", "上・中・下小脳脚", "顔面神経丘", "脳静脈"]) {
    assert.match(audit, new RegExp(gap));
  }
});

test("anchors cranial nerve roots at the intended brainstem levels", async () => {
  const files = [
    "overlay-nerves-anterior.mesh",
    "overlay-nerves-pontine.mesh",
    "overlay-nerves-medullary.mesh",
  ];
  const meshes = await Promise.all(files.map(name => readFile(new URL(`public/atlas/${name}`, root))));
  const roots = new Map();
  for (const mesh of meshes) {
    const vertices = mesh.readUInt32LE(4);
    const regionOffset = 12 + vertices * 28;
    for (let index = 0; index < vertices; index += 1) {
      const id = Math.round(mesh.readFloatLE(regionOffset + index * 4));
      if (roots.has(id)) continue;
      const ring = [];
      for (let side = 0; side < 10; side += 1) {
        const offset = 12 + (index + side) * 12;
        ring.push([
          mesh.readFloatLE(offset + 8), // anatomical x
          mesh.readFloatLE(offset + 4), // anatomical y
          mesh.readFloatLE(offset),     // anatomical z
        ]);
      }
      roots.set(id, ring.reduce((sum, point) => sum.map((value, axis) => value + point[axis]), [0, 0, 0]).map(value => value / ring.length));
    }
  }
  const near = (id, expected, tolerance = 0.8) => {
    const actual = roots.get(id);
    assert.ok(actual, `root ${id}`);
    expected.forEach((value, axis) => assert.ok(Math.abs(actual[axis] - value) < tolerance, `root ${id} axis ${axis}: ${actual[axis]}`));
  };
  near(27, [4, -6, -30]);   // III, interpeduncular fossa
  near(29, [7, -20, -35]);  // IV, dorsal caudal midbrain
  near(31, [17, -6, -46]);  // V, anterolateral pons
  near(33, [3, 3, -58]);    // VI, medial pontomedullary sulcus
  near(35, [13, -1, -57]);  // VII
  near(37, [17, -6, -57]);  // VIII, lateral to VII
  near(39, [13, -26, -62]); // IX, upper post-olivary sulcus
  near(41, [10.5, -25, -68]); // X, post-olivary rootlets below IX
  near(43, [9, -25, -76]);  // XI, caudal rootlets
  near(45, [7, -8, -66]);   // XII, pre-olivary sulcus
});

test("block specimens support continuous three-axis rotation and anatomical view presets", async () => {
  const [page, canvas] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/AtlasVolumeCanvas.tsx", root), "utf8"),
  ]);
  assert.doesNotMatch(page, /Math\.max\(-88/);
  assert.match(page, /mode:"orbit"\|"roll"/);
  assert.match(page, /e\.button===2\|\|e\.shiftKey\?"roll":"orbit"/);
  assert.match(page, /blockViewLabels:Record<BlockViewPreset,string>=\{initial:"初期",opposite:"反対側",superior:"上面",inferior:"下面"\}/);
  assert.match(page, /setRotation\(\{\.\.\.blockInitialRotations\[key\]\}\)/);
  assert.match(page, /key=\{blockSpecimen\}/);
  assert.match(canvas, /az=\(rot\.z\?\?0\)\*Math\.PI\/180/);
  assert.match(canvas, /cz\*cy-sz\*sx\*sy/);
});

test("every section quiz shows a visible amount of its target label", async () => {
  const [page, labelFile] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz", root)),
  ]);
  const { payload, dims } = readVolumeHeader(labelFile, "BBS1");
  const labels = payload.subarray(10);
  const labelIds = {
    caudate: [7, 8], putamen: [9, 10], pallidum: [11, 12, 13, 14],
    accumbens: [19, 20], hippocampus: [17, 18], amygdala: [21, 22],
    redNucleus: [1, 2], substantiaNigra: [3, 4], subthalamic: [5, 6],
    ventricle: [23, 24], thalamus: [15, 16], corpusCallosum: [30],
    internalCapsule: [31, 32], brainstem: [27], cerebellum: [28, 29],
  };
  const pattern = /\{target:"([^"]+)",category:"[^"]+",plane:"([^"]+)",position:(\d+),prompt:/g;
  const questions = [...page.matchAll(pattern)];
  assert.equal(questions.length, 15);

  for (const [, target, plane, rawPosition] of questions) {
    const ids = new Set(labelIds[target]);
    assert.ok(ids.size > 0, `${target} IDs`);
    const position = Number(rawPosition) / 100;
    const section = plane === "sagittal"
      ? Math.round(position * (dims[0] - 1))
      : plane === "horizontal"
        ? Math.round((1 - position) * (dims[2] - 1))
        : Math.round(position * (dims[1] - 1));
    let count = 0;
    for (let index = 0; index < labels.length; index += 1) {
      if (!ids.has(labels[index])) continue;
      const x = index % dims[0];
      const yz = (index - x) / dims[0];
      const y = yz % dims[1];
      const z = (yz - y) / dims[1];
      const coordinate = plane === "sagittal" ? x : plane === "horizontal" ? z : y;
      if (coordinate === section) count += 1;
    }
    assert.ok(count >= 200, `${target} must show at least 200 highlighted voxels, got ${count}`);
  }
});

test("surface quiz questions use labelled high-density pial regions", async () => {
  const [page, metadataText] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("public/atlas/surface-region-labels.json", root), "utf8"),
  ]);
  const metadata = JSON.parse(metadataText);
  const pattern = /\{target:"([^"]+)",category:"surface",view:"([^"]+)",prompt:"[^"]+",options:\[([^\]]+)\]\}/g;
  const questions = [...page.matchAll(pattern)];
  assert.equal(questions.length, 6);
  const allowedViews = new Set(["lateral", "superior", "inferior", "medial"]);
  const targetIds = {
    precentral: [86, 35], superiorTemporal: [96, 45], superiorFrontal: [89, 38],
    precuneus: [82, 31], cuneus: [94, 43], fusiform: [75, 24],
  };
  for (const [, target, view, rawOptions] of questions) {
    assert.ok(allowedViews.has(view), view);
    const options = [...rawOptions.matchAll(/"([^"]+)"/g)].map(match => match[1]);
    assert.equal(options.length, 4);
    assert.ok(options.includes(target), `${target} must be an option`);
    const [leftId, rightId] = targetIds[target];
    assert.ok(metadata.hemispheres.left.labels[leftId].count > 1000, `${target} left visibility`);
    assert.ok(metadata.hemispheres.right.labels[rightId].count > 1000, `${target} right visibility`);
  }
});

test("ships a reproducible Google Form generator for feedback and collaborators", async () => {
  const [script, guide] = await Promise.all([
    readFile(new URL("scripts/create_google_feedback_form.gs", root), "utf8"),
    readFile(new URL("BETA_FEEDBACK.md", root), "utf8"),
  ]);
  assert.match(script, /function createBrainPracticalFeedbackForm\(\)/);
  assert.match(script, /FormApp\.create\(CONFIG\.FORM_TITLE, true\)/);
  assert.match(script, /FormApp\.DestinationType\.SPREADSHEET/);
  assert.match(script, /routeItem\.createChoice\('修正提案・不具合・使いにくさを送る', feedbackPage\)/);
  assert.match(script, /routeItem\.createChoice\('共同制作者として参加したい', collaborationPage\)/);
  assert.match(script, /FormApp\.PageNavigationType\.SUBMIT/);
  assert.match(script, /refreshExistingForm_\(existingForm, existingSheet\)/);
  assert.match(script, /form\.setTitle\(CONFIG\.FORM_TITLE\)\.setDescription\(buildDescription_\(\)\)/);
  assert.match(script, /spreadsheet\.rename\(CONFIG\.RESPONSE_SHEET_TITLE\)/);
  assert.match(script, /VITE_FEEDBACK_FORM_URL/);
  assert.doesNotMatch(script, /addFileUploadItem/);
  assert.match(guide, /リンクを知っている全員/);
  assert.match(guide, /CONTACT_TEXT/);
});
