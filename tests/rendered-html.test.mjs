import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, readdir, rm, stat, unlink, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import test from "node:test";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

const root = new URL("../", import.meta.url);
const localPath = (path) => fileURLToPath(new URL(path, root));
const deviceFixtureCommit = "e9b7506fd10ba786119f39cb237963416d3e27c6";

function resolvePython() {
  const configured = process.env.PYTHON?.trim();
  const codexBundledPython = process.platform === "win32" && process.env.USERPROFILE
    ? join(process.env.USERPROFILE, ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "python", "python.exe")
    : null;
  const candidates = configured
    ? [[configured, []]]
    : process.platform === "win32"
      ? [["py", ["-3"]], ...(codexBundledPython ? [[codexBundledPython, []]] : []), ["python", []], ["python3", []]]
      : [["python3", []], ["python", []]];
  for (const [command, prefix] of candidates) {
    const probe = spawnSync(command, [...prefix, "--version"], { encoding: "utf8" });
    if (probe.status === 0) return { command, prefix };
  }
  throw new Error("Python 3 was not found. Set the PYTHON environment variable to the Python executable used for contributor-tool tests.");
}

const python = resolvePython();

function readVolumeHeader(buffer, expectedMagic) {
  const payload = gunzipSync(buffer);
  assert.equal(payload.subarray(0, 4).toString("ascii"), expectedMagic);
  const dims = [payload.readUInt16LE(4), payload.readUInt16LE(6), payload.readUInt16LE(8)];
  const voxelCount = dims.reduce((total, value) => total * value, 1);
  assert.equal(payload.length, 10 + voxelCount);
  return { payload, dims, voxelCount };
}

function readMeshVertices(buffer) {
  const count = buffer.readUInt32LE(4);
  return Array.from({length:count}, (_, index) => {
    const offset = 12 + index * 12;
    return [buffer.readFloatLE(offset), buffer.readFloatLE(offset + 4), buffer.readFloatLE(offset + 8)];
  });
}

function minimumVertexDistance(first, second) {
  let minimumSquared = Infinity;
  for (const a of first) for (const b of second) {
    const dz=a[0]-b[0], dy=a[1]-b[1], dx=a[2]-b[2];
    minimumSquared=Math.min(minimumSquared,dz*dz+dy*dy+dx*dx);
  }
  return Math.sqrt(minimumSquared);
}

async function directoryBytes(url) {
  let total = 0;
  for (const entry of await readdir(url, { withFileTypes: true })) {
    const child = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, url);
    total += entry.isDirectory() ? await directoryBytes(child) : (await stat(child)).size;
  }
  return total;
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

test("publishes complete browser and social metadata", async () => {
  const [html, favicon] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("public/favicon.svg", root), "utf8"),
  ]);
  assert.match(html, /<html lang="ja">/);
  assert.match(html, /<link rel="icon" href="\/favicon\.svg" type="image\/svg\+xml"/);
  assert.match(html, /<meta name="theme-color" content="#f8f7f3"/);
  assert.match(html, /<meta property="og:type" content="website"/);
  assert.match(html, /<meta property="og:locale" content="ja_JP"/);
  assert.match(html, /<meta name="twitter:card" content="summary_large_image"/);
  assert.match(favicon, /<title>脳実習ナビ<\/title>/);
  assert.match(favicon, /stroke="#e36e57"/);
});

test("loads privacy-first analytics only on public production hosts", async () => {
  const [html, analytics, main, env, readme] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("src/analytics.ts", root), "utf8"),
    readFile(new URL("src/main.tsx", root), "utf8"),
    readFile(new URL(".env.example", root), "utf8"),
    readFile(new URL("README.md", root), "utf8"),
  ]);
  assert.doesNotMatch(html, /static\.cloudflareinsights\.com/);
  assert.match(main, /installPublicAnalytics\(\)/);
  assert.match(analytics, /!import\.meta\.env\.PROD/);
  assert.match(analytics, /location\.protocol !== "https:"/);
  assert.match(analytics, /LOCAL_HOSTS\.has\(location\.hostname\)/);
  assert.match(analytics, /localhost/);
  assert.match(analytics, /127\.0\.0\.1/);
  assert.match(analytics, /data-brain-practical-analytics/);
  assert.match(env, /VITE_CLOUDFLARE_ANALYTICS_TOKEN=/);
  assert.match(readme, /公開HTTPSホストの本番版だけ/);
  assert.match(readme, /CookieやlocalStorageを使わず/);
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
  assert.deepEqual(metadata.atlasDerivedIds, [23, 24, 25, 26, 27, 28, 29, 33, 34, 35]);
  assert.deepEqual(metadata.imageGuidedCandidateIds, [30, 31, 32]);
  for (const id of Array.from({ length: 35 }, (_, index) => index + 1)) {
    assert.ok(metadata.labelCounts[id] > 0, `label ${id} must contain voxels`);
  }
  assert.equal(metadata.ventricleLabelsRestrictedToEmptySpace, true);
  assert.equal(metadata.ventricleTissueOverlap, 0);
  assert.match(metadata.coordinatePolicy, /exact BigBrain ICBM2009sym 0\.5 mm output grid/);
  assert.match(metadata.teachingPolicy, /provisional teaching overlays/);
});

test("keeps every section structure colourable in the default BigBrain source", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  const expected = [
    "ventricle", "thirdVentricle", "fourthVentricle", "corpusCallosum", "internalCapsule",
    "caudate", "putamen", "pallidumExternal", "pallidumInternal", "pallidum", "thalamus",
    "hippocampus", "amygdala", "accumbens", "redNucleus", "substantiaNigra", "subthalamic",
    "brainstem", "cerebellum", "opticChiasm", "insula",
  ];
  for (const key of expected) {
    assert.match(page, new RegExp(`\\n  ${key}: \\{[^\\n]+bigbrainIds:\\[[^\\]]+\\]`), `${key} BigBrain labels`);
  }
  assert.match(page, /opticChiasm:[^\n]+bigbrainIds:\[33\]/);
  assert.match(page, /insula:[^\n]+bigbrainIds:\[34,35\]/);
});

test("audits every section label for three-plane continuity regressions", () => {
  const result = spawnSync(process.execPath, [localPath("scripts/audit_section_continuity.mjs")], {
    cwd: localPath("."),
    encoding: "utf8",
    maxBuffer: 4 * 1024 * 1024,
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /PASS\t35 labels; 17 require visual review; 0 below source-specific largest-component thresholds/);
  assert.match(result.stdout, /WARN\t22\tmanual\tright amygdala[\s\S]*secondary=1@x168-168\/y285-285\/z124-124/);
  assert.match(result.stdout, /WARN\t24\tatlas-derived\tright lateral ventricle[\s\S]*largest=96\.388%/);
  assert.match(result.stdout, /WARN\t30\timage-guided\tcorpus callosum candidate[\s\S]*components=2[\s\S]*largest=98\.573%/);
});

test("audits deep-structure anatomical direction relations", async () => {
  const result = spawnSync(process.execPath, [localPath("scripts/audit_deep_relations.mjs")], {
    cwd: localPath("."),
    encoding: "utf8",
    maxBuffer: 4 * 1024 * 1024,
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /PASS\t18 deep-structure relations; 0 failures/);
  assert.match(result.stdout, /PASS\tthird ventricle remains on the midline between the thalami/);
  assert.match(result.stdout, /PASS\tleft internal capsule stays between caudate\/thalamus and lentiform nucleus/);
  assert.match(result.stdout, /PASS\toptic chiasm candidate remains midline, inferior to the third ventricle, and anterior to brainstem/);
  const [audit, packageText] = await Promise.all([
    readFile(new URL("DEEP_RELATIONS_AUDIT.md", root), "utf8"),
    readFile(new URL("package.json", root), "utf8"),
  ]);
  assert.match(audit, /18\/18の大きな方向関係が合格/);
  assert.match(audit, /専門家レビューを代替しません/);
  assert.match(packageText, /"audit:deep": "node scripts\/audit_deep_relations\.mjs"/);
});

test("keeps provisional structure provenance consistent across data and UI", () => {
  const result = spawnSync(process.execPath, [localPath("scripts/audit_structure_provenance.mjs")], {
    cwd: localPath("."),
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /PASS\t13 provisional IDs; 9 UI structures; 7 specimen parts; manual labels preserved; ventricle tissue overlap 0/);
});

test("audits hindbrain and midbrain teaching-landmark relations", async () => {
  const result = spawnSync(process.execPath, [localPath("scripts/audit_specimen_relations.mjs")], {
    cwd: localPath("."),
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /PASS\t12 landmark relations; 0 failures/);
  const [page, canvas] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/AtlasVolumeCanvas.tsx", root), "utf8"),
  ]);
  assert.match(page, /橋・延髄を外した時も小脳脚と菱形窩の位置ガイドは元の座標に残し/);
  assert.match(page, /残るガイドは元の位置を示す比較用/);
  assert.match(canvas, /showPonsMedulla\|\|part\.definition\.key!=="pons-medulla"/);
  assert.doesNotMatch(canvas, /part\.definition\.attachment!=="pons-medulla"/);
  assert.match(canvas, /part\.definition\.key==="pyramids"\|\|part\.definition\.key==="olives"[\s\S]*if\(ponsSurface\)draw/);
});

test("audits basal landmarks, cranial nerves, and major arteries", async () => {
  const result = spawnSync(process.execPath, [localPath("scripts/audit_basal_neurovascular_relations.mjs")], {
    cwd: localPath("."),
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /PASS\t14 basal\/neurovascular relations; 0 failures/);
  const [basal, neurovascular, audit, packageText] = await Promise.all([
    readFile(new URL("public/atlas/basal-landmarks.json", root), "utf8").then(JSON.parse),
    readFile(new URL("public/atlas/neurovascular-overlays.json", root), "utf8").then(JSON.parse),
    readFile(new URL("BASAL_NEUROVASCULAR_AUDIT.md", root), "utf8"),
    readFile(new URL("package.json", root), "utf8"),
  ]);
  assert.equal(basal.anatomyReferences.length, 3);
  assert.equal(neurovascular.anatomyReferences.length, 3);
  assert.match(audit, /14\/14の大きな位置関係が合格/);
  assert.match(audit, /専門家レビューを代替しません/);
  assert.match(packageText, /"audit:basal": "node scripts\/audit_basal_neurovascular_relations\.mjs"/);
});

test("audits cortical surface landmark relations", async () => {
  const result = spawnSync(process.execPath, [localPath("scripts/audit_surface_relations.mjs")], {
    cwd: localPath("."),
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /PASS\t17 surface relations; 0 failures/);
  const [metadata, audit, packageText] = await Promise.all([
    readFile(new URL("public/atlas/surface-landmarks.json", root), "utf8").then(JSON.parse),
    readFile(new URL("SURFACE_RELATIONS_AUDIT.md", root), "utf8"),
    readFile(new URL("package.json", root), "utf8"),
  ]);
  assert.equal(metadata.anatomyReferences.length, 4);
  assert.match(metadata.displayPolicy, /narrowed to 22 percent.*recessed 0\.8 mm/);
  assert.match(audit, /17\/17の位置関係が合格/);
  assert.match(audit, /個体脳の溝を追跡した曲線でも/);
  assert.match(packageText, /"audit:surface": "node scripts\/audit_surface_relations\.mjs"/);
});

test("presents the practical flow clearly and keeps interface text readable", async () => {
  const [page, main, globalsCss, canvasCss, canvas, editor] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("src/main.tsx", root), "utf8"),
    readFile(new URL("app/globals.css", root), "utf8"),
    readFile(new URL("app/canvas.css", root), "utf8"),
    readFile(new URL("app/AtlasVolumeCanvas.tsx", root), "utf8"),
    readFile(new URL("app/ManualSegmentationWorkbench.tsx", root), "utf8"),
  ]);

  const modeList = page.slice(page.indexOf("const workspaceModes"), page.indexOf("const homeRotation"));
  assert.ok(modeList.indexOf('{key:"surface"') < modeList.indexOf('{key:"sections"'));
  assert.ok(modeList.indexOf('{key:"sections"') < modeList.indexOf('{key:"blocks"'));

  const homeMenu = page.slice(page.indexOf('<div className="homeModeGrid"'), page.indexOf('<footer className="homeFooter"'));
  assert.ok(homeMenu.indexOf('openWorkspace("surface")') < homeMenu.indexOf('openWorkspace("sections")'));
  assert.ok(homeMenu.indexOf('openWorkspace("sections")') < homeMenu.indexOf('openWorkspace("blocks")'));
  assert.doesNotMatch(page, /homeMetrics|日本語で|<i>0[1-4]<\/i>/);
  assert.doesNotMatch(page, /homeActions|脳表観察から始める|断面実習を見る/);
  assert.match(main, /import "\.\.\/app\/globals\.css"/);
  assert.match(main, /import "\.\.\/app\/canvas\.css"/);

  assert.match(canvasCss, /\.homeLead\s*\{[^}]*font-size:\s*clamp\(14px,1\.2vw,17px\)/);
  assert.match(canvasCss, /\.workspaceSwitch button > span\s*\{\s*font-size:\s*14px/);
  assert.match(canvasCss, /\.workspaceSwitch button > i\s*\{\s*font:\s*11px\/1\.2 monospace/);
  assert.match(canvasCss, /\.legalButton, \.feedbackButton, \.helpButton, \.offlineButton\s*\{\s*font-size:\s*13px/);
  assert.match(canvasCss, /@media\(min-width:761px\) and \(max-width:1199px\)\{[\s\S]*\.appShell\{grid-template-rows:126px minmax\(0,1fr\)\}[\s\S]*\.topbar\{display:grid;grid-template-columns:auto minmax\(0,1fr\);grid-template-rows:58px 68px/);
  assert.match(canvasCss, /@media\(min-width:761px\) and \(max-width:1199px\)\{[\s\S]*\.workspaceSwitch\{grid-column:1\/3;grid-row:2;width:100%;display:grid;grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/);
  assert.match(page, /aria-label="利用条件・クレジットを表示">利用条件<\/button>/);
  assert.match(globalsCss, /font-family/);
  assert.doesNotMatch(`${canvas}\n${editor}`, /font="(?:7|8|9|10|11|12|13)px/);
});

test("ships the learning workspaces, contributor editor, and public data notice", async () => {
  const [page, canvas, canvasCss, editor, workflow, readme, licenses, attribution, packageJson, softwareLicense, licenseMap, governance] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/AtlasVolumeCanvas.tsx", root), "utf8"),
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

  for (const label of ["トップ", "断面実習", "脳表観察", "ブロック標本", "脳底動脈", "脳神経・脳幹", "復習クイズ", "編集ツール", "利用条件・クレジット", "意見・共同制作"]) {
    assert.match(page, new RegExp(label));
  }
  assert.match(page, /useState<WorkspaceMode>\(\(\)=>typeof window==="undefined"\?"home":workspaceFromHash\(window.location.hash\)\)/);
  assert.match(page, /window\.addEventListener\("hashchange",restore\)/);
  assert.match(page, /window\.addEventListener\("popstate",restore\)/);
  assert.match(page, /setLegalOpen\(overlay==="legal"\);if\(overlay\)return;const nextWorkspace/);
  assert.match(page, /window\.history\.pushState\(null,"",nextHash\)/);
  assert.match(page, /surfaceViewFromHash\(window\.location\.hash\)/);
  assert.match(page, /workspaceHash\("surface",key\)/);
  assert.match(page, /if\(candidate==="nerves"\)return "cranialNerves"/);
  assert.match(page, /surfaceView==="cranialNerves"\?"nerves":surfaceView/);
  assert.match(page, /workspaceSwitch button\.active/);
  assert.match(page, /leftRail \.planeBtn\.active/);
  assert.match(page, /scrollIntoView\(\{block:"nearest",inline:"center"\}\)/);
  assert.match(page, /脳実習を、/);
  assert.match(page, /切る前から立体で。/);
  assert.match(page, /className="homeModelStage[\s\S]{0,700}view="inside"/);
  assert.match(page, /OPEN ALPHA/);
  assert.match(page, /公開α版・非営利教育用/);
  assert.match(page, /className="homeAccuracyWarning"/);
  assert.match(page, /解剖学的正確性は保証できません。学習時は教科書・実標本・検証済み資料と照合してください/);
  assert.match(page, /試作中・解剖学的正確性は未保証/);
  assert.match(page, /ブロック標本（試作中）/);
  assert.match(page, /key:"blocks",label:"ブロック標本",sub:"試作品"/);
  assert.match(page, /blockIntroOpen&&!m2Comparison&&<section className="workArea blockIntroPage"/);
  assert.match(page, /ブロック標本は試作中です/);
  assert.match(page, /形状・範囲・接続関係の完全性や解剖学的正確性は保証しません/);
  assert.match(page, /Cloudflare Web Analytics/);
  assert.match(page, /CookieやlocalStorageを使わず、訪問者の個人データを収集・利用しません/);
  assert.match(readme, /Cloudflare Web Analytics/);
  assert.match(licenses, /Data origin and collection/);
  assert.doesNotMatch(page, /OPEN BETA|β版・非営利教育用/);
  assert.doesNotMatch(page, /を連続して追う/);
  assert.match(page, /VITE_FEEDBACK_FORM_URL/);
  assert.match(page, /BigBrain（Amunts et al\., 2013）/);
  assert.doesNotMatch(page, /BigBrain 2015/);
  assert.match(page, /単一固定脳 MRI 0\.444 mm/);
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
  for (const structure of ["上小脳脚", "中小脳脚", "下小脳脚", "顔面神経丘", "前庭野", "舌下神経三角", "迷走神経三角", "錐体", "オリーブ"]) assert.match(page, new RegExp(structure));
  assert.match(page, /標本組織/);
  assert.match(page, /選択だけ/);
  assert.match(page, /setBlockTissueMode\(next\.layers\.length\?"ghost":"solid"\)/);
  assert.match(page, /setSurfaceGhost\(key==="cranialNerves"\|\|key==="arteries"\)/);
  assert.match(canvas, /specimenTissueMode/);
  assert.match(canvas, /gl\.depthMask\(false\)/);
  assert.match(canvasCss, /\.specimenTissueControls/);
  for (const specimen of ["側脳室の全景", "視床・視床下部標本", "レンズ核・投射線維", "脳梁・脳弓標本", "脈絡叢を開く", "海馬・扁桃体標本", "中脳核・大脳脚標本"]) assert.match(page, new RegExp(specimen));
  for (const provenance of ["標本分節", "試作分節", "模式補助", "位置目安"]) assert.match(page, new RegExp(provenance));
  assert.match(page, /同定する構造/);
  assert.match(page, /無着色の標本から、確認する構造だけを追加/);
  assert.match(page, /両岸の間を仮想的な色面で埋めており/);
  assert.match(page, /setSurfaceVisibleRegions\(surfaceViewRegions\[surfaceView\]\)/);
  assert.match(page, /setSurfaceVisibleLandmarks\(surfaceViewLandmarks\[surfaceView\]\)/);
  assert.match(page, /medial:\{name:"左半球・内側面"/);
  assert.match(page, /medial:\{name:"左半球・内側面"[^\n]+rotation:\{x:0,y:90,z:0\}/);
  assert.match(page, /lateral:\{name:"左外側面"[^\n]+rotation:\{x:0,y:-90,z:0\}/);
  assert.match(page, /useState<SurfaceViewKey>\(\(\)=>typeof window==="undefined"\?"lateral":surfaceViewFromHash\(window\.location\.hash\)\)/);
  assert.match(page, /function planeFromHash/);
  assert.match(page, /function blockSpecimenFromHash/);
  assert.match(page, /key==="sections"\?plane:key==="blocks"\?blockSpecimen/);
  assert.match(page, /useState<SurfaceRegionKey\[]>\(\[\]\)/);
  assert.match(page, /useState<SurfaceLandmarkKey\[]>\(\[\]\)/);
  assert.doesNotMatch(page, /hemisphere:\{name:"左大脳半球"/);
  assert.doesNotMatch(page, /CerebrA対応・試作表面ラベル|CerebAアトラス対応/);
  assert.doesNotMatch(page, /脳表モデル・試作ラベル|講義資料の課題スケッチ/);
  assert.doesNotMatch(page, /REGIONS ·|GUIDES/);
  assert.match(page, /surfaceVisibleLandmarks/);
  assert.match(page, /function resetSurfaceView\(\)\{setRotation\(\{\.\.\.surfaceViews\[surfaceView\]\.rotation\}\)\}/);
  assert.match(page, />向きを戻す<\/button>/);
  assert.match(page, /内側面に追加する深部構造/);
  assert.match(page, /surfaceVisibleDeepLandmarks/);
  assert.match(page, /透明中隔/);
  assert.match(page, /defaultMedialDeepLandmarks:SurfaceDeepLandmarkKey\[]\=\[]/);
  assert.match(page, /初期状態は非表示・左側だけを描画/);
  assert.match(canvas, /conservativeSeptumMesh/);
  assert.match(page, /surfaceView!=="cranialNerves"&&surfaceView!=="arteries"&&surfaceView!=="medial"/);
  assert.match(page, /setSurfaceCerebellum\(key!=="medial"&&key!=="inferior"\)/);
  assert.match(page, /useState\(surfaceView!=="cranialNerves"&&surfaceView!=="arteries"&&surfaceView!=="medial"&&surfaceView!=="inferior"\)/);
  assert.match(page, /medial:\["cingulate","paracentral","precuneus","cuneus","lingual"\]/);
  assert.doesNotMatch(page, /medial:\[[^\n]+"pericalcarine"/);
  assert.match(page, /key==="cuneus"\?\{ids:surfaceRegions\.pericalcarine\.ids,axis:0,min:-14\}/);
  assert.match(page, /key==="lingual"\?\{ids:surfaceRegions\.pericalcarine\.ids,axis:0,max:-14\}/);
  assert.match(page, /複数選択/);
  assert.match(page, /useState<"inside" \| "ghost" \| "extracted" \| "segmented">\("ghost"\)/);
  assert.match(page, /useState<"both"\|"slice"\|"model">\(\(\)=>typeof window/);
  assert.match(page, /className="sectionLayoutSwitch" aria-label="断面と全脳3Dの表示"/);
  assert.match(page, /断面＋3D/);
  assert.match(page, /断面のみ/);
  assert.match(page, /3Dのみ/);
  assert.match(page, /sectionLayout!=="model"&&<div className="sliceViewport">/);
  assert.match(page, /sectionLayout!=="slice"&&<aside className="modelInset"/);
  assert.match(page, /const sectionModelRotations:Rotation\[]=\[rotation,\{\.\.\.rotation,y:wrapAngle\(rotation\.y\+90\)\}\]/);
  assert.match(page, /className="insetViews"/);
  assert.match(page, /"90°直交"/);
  assert.match(page, /const sectionSelectionMeshLayers=activeVisibleStructures\.flatMap/);
  assert.match(page, /selectionMeshLayers=\{sectionSelectionMeshLayers\}/);
  assert.doesNotMatch(page, /className="modelFocusTag"/);
  assert.match(page, /accumbens:\["section-accumbens"\]/);
  assert.match(page, /opticChiasm:\["section-optic-chiasm"\],insula:\["section-insula"\]/);
  assert.doesNotMatch(page, /setBlock\("inside"\)\}\}>脳表<\/button>/);
  assert.match(canvas, /selectionMeshLayers=\[\]/);
  assert.match(canvas, /if\(showFocus&&selectionLayers\.length\)/);
  assert.match(canvas, /selectionLayers\.forEach\(layer=>layer\.meshes\.forEach/);
  assert.match(canvasCss, /\.insetViews \{[^}]*grid-template-rows: repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(canvasCss, /\.sliceStage\.layout-model \.insetViews \{ grid-template-columns: repeat\(2,minmax\(0,1fr\)\); grid-template-rows: minmax\(0,1fr\); \}/);
  assert.match(page, /const sectionDeveloperControls=\(import\.meta\.env\.VITE_SECTION_DEVELOPER_CONTROLS as string\|undefined\)==="true"/);
  assert.match(page, /位置 \{position\}・単一標本脳 0\.5 mm（同一格子で検証済み）・実習標本調/);
  assert.match(page, /\{sectionDeveloperControls&&<><div className="contrastSwitch" aria-label="開発者用・断面画像ソース"/);
  assert.match(page, /className="displaySwitch" aria-label="開発者用・断面表示調"/);
  assert.match(page, /structureAvailable/);
  assert.match(page, /現在の画像ソースには対応ラベルがありません/);
  assert.match(page, /現在の画像ソースでは未分節・着色できません/);
  assert.match(canvasCss, /\.structureBtn\.unavailable/);
  assert.doesNotMatch(page, /active&&<small>\{item\.note\}/);
  assert.match(page, /className="selectedStructureList" aria-label="選択中の構造と解説"/);
  assert.match(page, /activeVisibleStructures\.map\(key=>/);
  assert.match(page, /item\.note\).*item\.relation/);
  assert.doesNotMatch(page, /landmarks\.map\(mark/);
  assert.doesNotMatch(page, /目印をクリックすると/);
  assert.match(canvasCss, /\.workspace-sections \.workArea \{ overflow-y: auto/);
  assert.match(canvasCss, /\.workspace-sections \.slicePanel \{ height: auto; grid-template-rows: auto clamp\(520px,65vh,760px\) auto auto; \}/);
  assert.match(page, /sectionDeveloperControls&&key===selectedStructure\?currentSourceNote:item\.note/);
  assert.match(page, /sectionDeveloperControls&&<small>\{identified\.certainty/);
  assert.match(page, /sectionDeveloperControls&&quizSource&&<small>/);
  assert.match(page, /const \[quizSlicePosition,setQuizSlicePosition\]=useState\(52\)/);
  assert.match(page, /position=\{quizSlicePosition\}/);
  assert.match(page, /className="quizSliceNavigator"/);
  assert.match(page, /出題位置へ戻す/);
  assert.match(canvasCss, /\.quizSliceNavigator/);
  assert.match(page, /\{sectionDeveloperControls&&<p className="atlasCredit">/);
  assert.match(canvasCss, /\.selectedStructureList/);
  assert.match(page, /surfaceHighlights/);
  assert.match(page, /脳表を透過/);
  assert.match(page, /脳表・主要脳回/);
  assert.match(page, /\[5,10,15,20\]/);
  assert.match(page, /CC BY-NC-SA 4\.0/);
  assert.match(page, /診断・治療・手術計画・定量研究には使用できません/);
  assert.match(readme, /非営利目的に限られます/);
  assert.match(readme, /主要脳底動脈と脳神経根を重ねる/);
  assert.match(page, /3D OVERLAY · PILOT/);
  assert.match(page, /neurovascularOverlay/);
  assert.match(page, /neurovascularHighlights/);
  assert.match(page, /個別に同定/);
  assert.match(page, /選択した管・神経根を白色で強調/);
  assert.match(page, /arteries:\{name:"脳底の主要動脈"[^\n]+rotation:\{x:110,y:2,z:180\}/);
  assert.match(page, /surfaceView==="cranialNerves"\?"brainstem-only":surfaceView==="arteries"\?"without-brainstem-patches":"all"/);
  assert.match(canvas, /hideBrainstemPatches=basalLandmark==="without-brainstem-patches"/);
  assert.match(canvas, /brainstemOnly=basalLandmark==="brainstem-only"/);
  assert.match(canvas, /nerveOverlayVisible=neurovascularOverlay==="nerves"\|\|neurovascularOverlay==="both"/);
  assert.match(canvas, /nerveOverlayVisible&&\(\["olfactory","optic"\]/);
  assert.match(page, /renderedSurfaceNerves=surfaceView==="inferior"\|\|surfaceView==="free"\?true:surfaceNerves/);
  assert.match(page, /view=\{\(surfaceNeurovascular\|\|surfaceView==="free"\)&&surfaceGhost\?"ghost":"inside"\}/);
  assert.match(page, /surfaceView==="free"&&<div className="freeObservationControls"[\s\S]*?脳表を透過/);
  assert.match(page, /showBrainstemNerves=\{surfaceView==="inferior"\|\|surfaceView==="free"\?surfacePonsMedulla:surfaceNerves\}/);
  assert.match(page, /function toggleInferiorHindbrain\(\)/);
  assert.match(page, />橋・延髄<\/button>/);
  assert.doesNotMatch(page, /橋・延髄＋V–XII/);
  assert.match(page, /arteries:\{name:"脳底の主要動脈"[^\n]+rotation:\{x:110,y:2,z:180\}/);
  assert.match(page, /脳底構造は常時表示し、選択した構造を着色/);
  assert.match(page, /inferiorCanonicalNerveHighlights/);
  assert.match(page, /neurovascularStructures\.cn1\.ids/);
  assert.match(page, /neurovascularStructures\.cn2\.ids,\.\.\.neurovascularStructures\.opticChiasm\.ids/);
  assert.match(canvas, /if\(showBrainstemNerves\)\{draw\(overlays\[3\]/);
  assert.doesNotMatch(canvas, /neurovascularOnTop/);
  assert.match(page, /useState\(surfaceView==="cranialNerves"\|\|surfaceView==="arteries"\)/);
  assert.match(page, /useState\(surfaceView==="cranialNerves"\|\|surfaceView==="inferior"\)/);
  assert.match(page, /if\(key==="arteries"\)\{setSurfaceVessels\(true\);setSurfaceNerves\(false\);setSurfaceCerebellum\(false\)/);
  assert.doesNotMatch(page, /active\?"表示中":"表示"/);
  const neurovascularControls = page.match(/\{surfaceNeurovascular&&<div className="neurovascularControls specimenPartControls"[^\n]+<\/div>\}/)?.[0] ?? "";
  assert.ok(neurovascularControls);
  assert.doesNotMatch(neurovascularControls, /surfacePonsMedulla|橋・延髄/);
  assert.match(page, /key==="cranialNerves"\)\{setSurfaceVessels\(false\);setSurfaceNerves\(true\)/);
  assert.match(page, /cranialNerves:\{name:"脳神経・脳幹"[^\n]+rotation:\{x:-42,y:2,z:0\}/);
  assert.match(page, /const cranialNerveBrainstemKeys:BasalLandmarkPartKey\[]=\["midbrain","pons","medulla","peduncles","pyramids","olives","superior-colliculi","inferior-colliculi"\]/);
  assert.match(page, /脳幹の位置関係/);
  assert.match(page, /上丘・下丘とIVは背側から観察します/);
  assert.doesNotMatch(page, /blockSpecimen==="arteries"|blockSpecimen==="cranialNerves"/);
  assert.match(page, /surfaceView==="inferior"&&<div className="basalLandmarkPicker surfaceRegionPicker"/);
  assert.match(page, /surfaceVisibleBasalLandmarks/);
  assert.match(page, /toggleBasalLandmark/);
  assert.match(page, /setSurfaceVisibleBasalLandmarks\(basalLandmarkKeys\)/);
  for (const target of ["視床下部領域","中脳","上丘","下丘","橋","延髄"]) assert.match(page, new RegExp(`name:\"${target}\"`));
  assert.match(canvas, /basalHighlights\.includes\("hypothalamus"\)\)draw\(deep\[4\]/);
  assert.match(page, /上丘・下丘は中脳背側の構造です/);
  assert.match(canvas, /brainstemLevelMesh\(surface\[3\],"pons"\)/);
  assert.match(canvas, /brainstemLevelMesh\(surface\[3\],"medulla"\)/);
  assert.match(canvas, /basalHighlights\.includes\("midbrain"\)\)draw\(surface\[4\]/);
  assert.match(canvas, /basalHighlights\.includes\("superior-colliculi"\)\)draw\(midbrainDorsalPatchMesh\(surface\[4\],"superior-colliculi"\)/);
  assert.match(canvas, /basalHighlights\.includes\("inferior-colliculi"\)\)draw\(midbrainDorsalPatchMesh\(surface\[4\],"inferior-colliculi"\)/);
  assert.match(canvas, /positions\.push\(mesh\.vertices\[offset\],mesh\.vertices\[offset\+1\],mesh\.vertices\[offset\+2\]\)/);
  assert.doesNotMatch(canvas, /draw\(brainstemLandmarks/);
  for (const color of ["#c45783","#4fa5a0","#4f79b7","#7667af","#d95365","#e38a42","#369a9a","#659b68"]) assert.match(page, new RegExp(color));
  assert.match(page, /setSurfaceVisibleRegions\(\[\]\)/);
  assert.match(page, /setSurfaceVisibleLandmarks\(\[\]\)/);
  assert.match(page, /setSurfaceVisibleBasalLandmarks\(\[\]\)/);
  assert.match(page, /basalHighlights/);
  assert.match(page, /aria-label="下面の補助レイヤー"/);
  assert.match(page, /surfaceNeurovascular\|\|surfaceView==="inferior"\|\|surfaceView==="free"\?surfaceOverlay:"none"/);
  assert.match(page, /showBasalLandmarks=\{surfaceView==="inferior"\|\|surfaceView==="arteries"\|\|surfaceView==="cranialNerves"\|\|surfaceView==="free"\}/);
  assert.match(page, /basalOnlySelected=\{false\}/);
  assert.match(page, /const detachableBrainstemNerveKeys:NeurovascularStructureKey\[]=\["cn5","cn6","cn7","cn8","cn9","cn10","cn11","cn12"\]/);
  assert.match(page, /function toggleFreeHindbrain\(\)/);
  assert.match(page, /aria-label="自由観察の表示レイヤー"[^\n]+>橋・延髄<\/button>/);
  assert.doesNotMatch(page, /aria-label="自由観察の表示レイヤー"[^\n]+>脳神経<\/button>/);
  assert.match(canvas, /else if\(!basalOnlySelected&&basalLandmark==="all"\)draw\(deep\[4\],neutral,0\)/);
  assert.match(page, /free:\{name:"自由観察"/);
  assert.match(page, /文字検索または分類別索引から追加/);
  assert.match(page, /構造索引/);
  assert.match(page, /freeSelectedCards/);
  assert.doesNotMatch(page, /selectAllFreeObservation/);
  assert.match(page, /clearFreeObservation/);
  assert.match(page, /freeHemisphere===side/);
  assert.match(page, /onSurfaceIdentify=\{surfaceView==="free"\?identifyFreeSurface:undefined\}/);
  assert.match(canvas, /function identifySurface/);
  assert.match(canvas, /source:"neurovascular"/);
  assert.match(page, /point\.source==="surface"/);
  assert.match(canvas, /クリックで構造を選択/);
  assert.match(page, /漏斗（下垂体茎）/);
  assert.match(page, /乳頭体/);
  assert.match(page, /showBasalLandmarks/);
  assert.match(canvas, /neutral=\[\.78,\.82,\.83,1\]/);
  assert.match(canvas, /function ventralSurfacePatchMesh/);
  assert.match(canvas, /frontByBin/);
  assert.match(canvas, /frontY-5/);
  assert.match(canvas, /component\.length>largest\.length/);
  assert.match(canvas, /ventralSurfacePatchMesh\(surface\[3\],key\)/);
  assert.match(canvas, /if\(active&&showPonsMedulla\)draw\(ventralSurfacePatchMesh\(surface\[3\],key\)/);
  assert.match(canvas, /ventralSurfacePatchMesh\(ponsSurface,part\.definition\.key\)/);
  assert.match(canvas, /const ponsSurface=showPonsMedulla\?/);
  assert.match(canvas, /if\(part\.definition\.key==="pyramids"\|\|part\.definition\.key==="olives"\)\{if\(ponsSurface\)draw/);
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
  assert.match(editor, /targetSide,evidence:evidence\.trim\(\),confidence,reviewStatus:"unreviewed"/);
  assert.match(editor, /対象側/);
  assert.match(editor, /根拠資料・参照箇所/);
  assert.match(editor, /確認状態[\s\S]*未レビュー/);
  assert.match(workflow, /Pull Requestに必要な情報/);
  assert.match(workflow, /`reviewStatus`[\s\S]*`unreviewed`/);
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

test("publishes a local smartphone QR entry without a runtime tracking service", async () => {
  const [page,css,qr]=await Promise.all([
    readFile(new URL("app/page.tsx",root),"utf8"),
    readFile(new URL("app/canvas.css",root),"utf8"),
    readFile(new URL("public/phone-home-qr.svg",root),"utf8"),
  ]);
  assert.match(page,/const publicAppHome="https:\/\/bonnginn\.github\.io\/brain-practical-navi\/#workspace\/home"/);
  assert.match(page,/className="homePhoneInstall"/);
  assert.match(page,/phone-home-qr\.svg/);
  assert.match(page,/QRコードのホームURLを開く/);
  assert.match(page,/closest\("button,a"\)/);
  assert.doesNotMatch(page,/api\.qrserver|chart\.googleapis|quickchart/);
  assert.match(css,/\.homePhoneInstall\s*\{/);
  assert.match(qr,/data:image\/png;base64,iVBORw0KGgo/);
  assert.match(qr,/https:\/\/bonnginn\.github\.io\/brain-practical-navi\/#workspace\/home/);
});

test("separates private feedback, public discussion, and pull requests", async () => {
  const [page, feedback, contributing] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("ALPHA_FEEDBACK.md", root), "utf8"),
    readFile(new URL("CONTRIBUTING.md", root), "utf8"),
  ]);
  assert.match(page, /匿名で報告・参加相談[\s\S]*Google Formを開く/);
  assert.match(page, /公開して相談・追跡[\s\S]*GitHub Issuesを開く/);
  assert.match(page, /変更を提案[\s\S]*共同制作ガイドを読む/);
  assert.match(page, /解剖監修・セグメンテーション・3D造形・Web実装/);
  assert.match(feedback, /ログインしていないブラウザ[\s\S]*3\/3ページの送信ボタン/);
  assert.match(feedback, /Google Forms側にも回答が残る/);
  assert.match(feedback, /回答を実際に作成・削除する一往復試験は/);
  assert.match(contributing, /改善への効果を累積してクレジット/);
});

test("validates browser segmentation patches against the bundled BBS1 grid", () => {
  const result = spawnSync(python.command, [...python.prefix,
    localPath("scripts/apply_segmentation_patch.py"),
    localPath("tests/fixtures/segmentation-patch-smoke.json"),
    "--input", localPath("public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz"),
    "--check",
  ], {encoding:"utf8"});
  assert.equal(result.status, 0, result.stderr);
  const audit = JSON.parse(result.stdout);
  assert.deepEqual(audit.dims, [394, 466, 378]);
  assert.equal(audit.editCount, 1);
  assert.equal(audit.changedVoxelCount + audit.unchangedVoxelCount, 1);
  assert.deepEqual(audit.affectedHorizontalSlices, {min: 0, max: 0, indices: [0]});
  assert.deepEqual(audit.proposedLabels, []);
  assert.equal(audit.reviewStatus, "unreviewed");
  assert.equal(audit.reviewer, "");
});

test("tracks segmentation scope and review decisions from export through pull request", async () => {
  const [editor, workflow, pullRequest, issueTemplate, roadmap] = await Promise.all([
    readFile(new URL("app/ManualSegmentationWorkbench.tsx", root), "utf8"),
    readFile(new URL("SEGMENTATION_WORKFLOW.md", root), "utf8"),
    readFile(new URL(".github/PULL_REQUEST_TEMPLATE.md", root), "utf8"),
    readFile(new URL(".github/ISSUE_TEMPLATE/segmentation.yml", root), "utf8"),
    readFile(new URL("BETA_ROADMAP.md", root), "utf8"),
  ]);
  assert.match(editor, /reviewStatus:"unreviewed",reviewer:"",reviewedAt:""/);
  assert.match(editor, /proposedLabels:ids\.map/);
  assert.match(editor, /affectedHorizontalSlices:slices\.length/);
  assert.match(workflow, /`proposedLabels`[\s\S]*`affectedHorizontalSlices`/);
  assert.match(pullRequest, /変更前スクリーンショット[\s\S]*変更後スクリーンショット/);
  assert.match(pullRequest, /レビュー判断（確認者が記入）[\s\S]*差し戻し[\s\S]*判断理由/);
  assert.match(issueTemplate, /id: comparison[\s\S]*required: true/);
  assert.match(roadmap, /\[x\] 構造、左右、断面範囲、根拠資料、確認者、確度/);
  assert.match(roadmap, /\[x\] 採用前後の比較と、差し戻し理由/);
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
  const result = spawnSync(python.command, [...python.prefix,
    localPath("scripts/check_segmentation_patch_conflicts.py"),
    localPath("tests/fixtures/segmentation-patch-smoke.json"),
    localPath("tests/fixtures/segmentation-patch-conflict.json"),
    "--input", localPath("public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz"),
  ], {encoding:"utf8"});
  assert.equal(result.status, 2, result.stderr);
  const audit = JSON.parse(result.stdout);
  assert.equal(audit.conflictCount, 1);
  assert.equal(audit.conflicts[0].index, 0);
  assert.deepEqual([audit.conflicts[0].firstLabel, audit.conflicts[0].secondLabel], [0, 1]);
});

test("bundles valid WebGL meshes and the required data notices", async () => {
  const meshNames = [
    "caudate.mesh",
    "hippocampus.mesh",
    "thalamus.mesh",
    "ventricle.mesh",
    "pial-left.mesh.gz",
    "pial-right.mesh.gz",
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
    "landmark-olfactory-pathway.mesh",
    "landmark-infundibulum.mesh",
    "landmark-mammillary-bodies.mesh",
    "landmark-anterior-perforated-substance.mesh",
  ];

  for (const name of meshNames) {
    const stored = await readFile(new URL(`public/atlas/${name}`, root));
    const mesh = name.endsWith(".gz") ? gunzipSync(stored) : stored;
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

test("maps every distributed atlas file to source, changes, license, and display duties", async () => {
  const atlasUrl = new URL("public/atlas/", root);
  const manifest = JSON.parse(await readFile(new URL("DATA-MANIFEST.json", atlasUrl), "utf8"));
  const files = (await readdir(atlasUrl)).filter(name => name !== "DATA-MANIFEST.json").sort();
  assert.ok(manifest.groups.length >= 7);
  for (const group of manifest.groups) {
    assert.ok(group.id && group.pattern && group.source && group.license && group.modifications && group.displayObligation && group.bundledNotice, group.id);
    await stat(new URL(group.bundledNotice, atlasUrl));
  }
  for (const file of files) {
    const matches = manifest.groups.filter(group => new RegExp(group.pattern).test(file));
    assert.equal(matches.length, 1, `${file} provenance groups: ${matches.map(group => group.id).join(", ")}`);
  }

  const specimen = JSON.parse(await readFile(new URL("specimen-blocks.json", atlasUrl), "utf8"));
  const recordedBlockFiles = new Set(Object.values(specimen.specimens).flat().map(part => part.file));
  const distributedBlockFiles = new Set(files.filter(name => name.startsWith("block-") && name.endsWith(".mesh")));
  assert.deepEqual(recordedBlockFiles, distributedBlockFiles);
  for (const part of Object.values(specimen.specimens).flat()) assert.ok(part.sourceType, part.file);

  const [surface, basal, neurovascular] = await Promise.all([
    readFile(new URL("surface-landmarks.json", atlasUrl), "utf8").then(JSON.parse),
    readFile(new URL("basal-landmarks.json", atlasUrl), "utf8").then(JSON.parse),
    readFile(new URL("neurovascular-overlays.json", atlasUrl), "utf8").then(JSON.parse),
  ]);
  const recordedProjectMeshes = new Set([
    ...surface.landmarks.map(item => item.file),
    ...basal.meshes.map(item => item.file),
    ...neurovascular.groups.map(item => item.file),
  ]);
  const distributedProjectMeshes = new Set(files.filter(name => /^(surface-landmark-|landmark-|overlay-).+\.mesh$/.test(name)));
  assert.deepEqual(recordedProjectMeshes, distributedProjectMeshes);
});

test("does not distribute third-party lecture or specimen imagery", async () => {
  const [publicEntries, notice] = await Promise.all([
    readdir(new URL("public/", root), { recursive: true }),
    readFile(new URL("public/ASSET-NOTICE.txt", root), "utf8"),
  ]);
  const rasterOrDocuments = publicEntries
    .map(path => String(path).replaceAll("\\", "/"))
    .filter(path => /\.(png|jpe?g|webp|gif|tiff?|pdf|pptx?|docx?)$/i.test(path));
  assert.deepEqual(rasterOrDocuments, ["og.png"]);
  assert.match(notice, /not a scan, photograph, or reproduction/);
  assert.match(notice, /not used as anatomical evidence/);
  assert.match(notice, /No lecture slides, textbook figures, web specimen photographs/);
});

test("keeps the browser distribution below the beta asset budget", async () => {
  const publicBytes = await directoryBytes(new URL("public/", root));
  assert.ok(publicBytes < 100 * 1024 * 1024, `public assets are ${(publicBytes / 1024 / 1024).toFixed(1)} MiB`);

  for (const obsolete of [
    "mni-cerebra-1mm.bin",
    "bigbrain-400um.bin.gz",
    "brain.mesh",
    "segment-cortex.mesh",
    "brain-practical-segmented-v2.glb",
  ]) {
    await assert.rejects(readFile(new URL(`public/atlas/${obsolete}`, root)), { code: "ENOENT" });
  }
});

test("keeps representative first-view atlas payloads within measured M1 budgets", async () => {
  const { collectAssetAudit } = await import(new URL("scripts/audit_asset_budgets.mjs", root));
  const audit = await collectAssetAudit();
  for (const [name, result] of [["public", audit.public], ...Object.entries(audit.routes)]) {
    assert.ok(result.bytes < result.limit, `${name} is ${(result.bytes / 1024 / 1024).toFixed(1)} MiB`);
  }
});

test("ships the labelled high-density pial meshes with lossless gzip delivery", async () => {
  const [leftStored, rightStored, canvas] = await Promise.all([
    readFile(new URL("public/atlas/pial-left.mesh.gz", root)),
    readFile(new URL("public/atlas/pial-right.mesh.gz", root)),
    readFile(new URL("app/AtlasVolumeCanvas.tsx", root), "utf8"),
  ]);
  for (const [side, stored] of [["left", leftStored], ["right", rightStored]]) {
    const mesh = gunzipSync(stored);
    assert.equal(mesh.subarray(0, 4).toString("ascii"), "BNM3", `${side} pial magic`);
    assert.equal(mesh.readUInt32LE(4), 163842, `${side} pial vertices`);
    assert.ok(stored.length / mesh.length < .57, `${side} pial gzip ratio`);
    await assert.rejects(readFile(new URL(`public/atlas/pial-${side}.mesh`, root)), {code:"ENOENT"});
  }
  assert.match(canvas, /`\$\{name\}\.mesh\.gz`/);
  assert.match(canvas, /new DecompressionStream\("gzip"\)/);
});

test("keeps beta gates evidence-based without claiming release readiness", async () => {
  const [gate, roadmap, performance, pkg] = await Promise.all([
    readFile(new URL("BETA_GATE_AUDIT.md", root), "utf8"),
    readFile(new URL("BETA_ROADMAP.md", root), "utf8"),
    readFile(new URL("PERFORMANCE_AUDIT.md", root), "utf8"),
    readFile(new URL("package.json", root), "utf8"),
  ]);
  assert.match(gate, /No-Go（β候補のローカル検証中）/);
  assert.equal((gate.match(/\| (ローカル合格|実機待ち|公開待ち|管理者待ち|専門家待ち) \|/g) ?? []).length, 10);
  assert.match(gate, /実スマートフォン[\s\S]*公開URL[\s\S]*Google Form[\s\S]*専門家レビュー/);
  assert.match(roadmap, /BETA_GATE_AUDIT\.md/);
  assert.match(performance, /小画面水平断（画像・ラベル、3D遅延） \| 11\.6 MiB/);
  assert.equal(JSON.parse(pkg).scripts["audit:assets"], "node scripts/audit_asset_budgets.mjs");
});

test("shows load progress and retries every failed atlas canvas together", async () => {
  const canvas = await readFile(new URL("app/AtlasVolumeCanvas.tsx", root), "utf8");
  assert.match(canvas, /<progress aria-label="データ読込の進捗" \/>/);
  assert.match(canvas, /window\.dispatchEvent\(new Event\(ATLAS_RETRY_EVENT\)\)/);
  assert.match(canvas, /window\.addEventListener\(ATLAS_RETRY_EVENT,retry\)/);
});

test("draws toggleable sulci from cortical region boundaries", async () => {
  const [metadataText, page, canvas] = await Promise.all([
    readFile(new URL("public/atlas/surface-landmarks.json", root), "utf8"),
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/AtlasVolumeCanvas.tsx", root), "utf8"),
  ]);
  const metadata = JSON.parse(metadataText);
  const expectedKeys = [
    "central-sulcus", "precentral-sulcus", "lateral-sulcus", "superior-frontal-sulcus",
    "parieto-occipital-sulcus", "calcarine-sulcus", "olfactory-sulcus", "longitudinal-fissure",
  ];
  assert.equal(metadata.version, 1);
  assert.match(metadata.source, /project-authored seed curves/);
  assert.match(metadata.status, /not donor-traced or validated/);
  assert.match(metadata.method, /longitudinal fissure uses an anterior-posterior extended midpoint filler recessed/);
  assert.deepEqual(metadata.landmarks.map(item => item.key), expectedKeys);
  for (const item of metadata.landmarks) {
    assert.equal(item.sourceType, "schematic-surface-guide");
    assert.ok(item.vertices >= 176, `${item.key} vertices`);
    assert.ok(item.faces >= 320, `${item.key} faces`);
    const mesh = await readFile(new URL(`public/atlas/${item.file}`, root));
    assert.equal(mesh.subarray(0, 4).toString("ascii"), "BNM1");
    assert.equal(mesh.readUInt32LE(4), item.vertices);
    assert.equal(mesh.readUInt32LE(8), item.faces);
  }
  for (const name of ["中心溝", "中心前溝", "外側溝", "上前頭溝", "頭頂後頭溝", "鳥距溝", "嗅溝", "大脳縦裂"]) {
    assert.match(page, new RegExp(name));
  }
  assert.match(page, /両岸の間を仮想的な色面で埋めており/);
  assert.match(canvas, /SURFACE_LANDMARKS/);
  assert.match(canvas, /surface-landmark-\$\{item\.key\}/);
  assert.match(canvas, /SURFACE_BOUNDARY_LABELS/);
  assert.match(canvas, /surfaceBoundaryMesh/);
  assert.match(canvas, /surfaceLevelMesh/);
  assert.match(canvas, /surfaceRegionUpperRimMesh/);
  assert.match(canvas, /surfaceRegionUpperRimMesh\(part,\[96,45\],2\.05,\.9\)/);
  assert.match(canvas, /for\(let anteriorPosterior=36;anteriorPosterior>=-24;anteriorPosterior-=2\)/);
  assert.match(canvas, /anteriorExpansion=Math\.max\(0,Math\.min\(1,\(midAnteriorPosterior\+4\)\/32\)\)/);
  assert.match(canvas, /function longitudinalFissureGuideMesh/);
  assert.match(canvas, /vertices\[offset\]=center\[axis\]\+\(vertices\[offset\]-center\[axis\]\)\*\.22/);
  assert.match(canvas, /vertices\[\(ring\+side\)\*3\]-=\.8/);
  assert.match(canvas, /definition\.key==="longitudinal-fissure"\)draw\(longitudinalFissureGuideMesh\(landmarks\[index\]\)/);
  assert.match(page, /大脳縦裂[^\n]+実在する棒状構造ではありません/);
  assert.doesNotMatch(canvas, /definition\.key==="longitudinal-fissure"\|\|definition\.key==="lateral-sulcus"/);
  assert.doesNotMatch(canvas, /definition\.key==="longitudinal-fissure"\|\|definition\.key==="central-sulcus"/);
  assert.match(canvas, /surfaceLevelMesh\(part,\[57,6\],0,-14,\.9\)/);
  assert.doesNotMatch(canvas, /surfaceDeepLandmarks\.length&&blockMeshes===null\)\{\s*if\(hemisphere!=="both"\)gl\.clear/);
  assert.match(canvas, /locallyFilledSurfacePoint/);
  assert.doesNotMatch(canvas, /\[\.035,\.045,\.05,1\]/);
});

test("bundles the practical ventral-brain landmarks in anatomical order", async () => {
  const metadata = JSON.parse(await readFile(new URL("public/atlas/basal-landmarks.json", root), "utf8"));
  assert.equal(metadata.version, 2);
  assert.match(metadata.coordinateSpace, /manually approximated/);
  assert.deepEqual(metadata.displayShiftMm, [0, 18, -18]);
  assert.match(metadata.alignmentPolicy, /same.*display shift.*pial/i);
  assert.match(metadata.status, /not validated segmentation or morphometry/);
  assert.deepEqual(metadata.anteriorToPosteriorOrder, [
    "olfactory bulbs/tracts", "anterior perforated substance", "optic nerves/chiasm", "infundibulum", "mammillary bodies",
  ]);
  assert.match(metadata.specimenNote, /pituitary gland is not shown/);
  assert.match(metadata.attachmentPolicy, /overlap the inferior hypothalamic teaching surface/);
  assert.deepEqual(metadata.meshes.map(mesh => mesh.label), [
    "嗅球・嗅索", "視神経・視交叉・視索", "漏斗（下垂体茎）", "乳頭体", "前有孔質（位置目安）",
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
  const [hypothalamus, infundibulum, mammillaryBodies] = await Promise.all([
    readFile(new URL("public/atlas/block-diencephalon-hypothalamus.mesh", root)),
    readFile(new URL("public/atlas/landmark-infundibulum.mesh", root)),
    readFile(new URL("public/atlas/landmark-mammillary-bodies.mesh", root)),
  ]).then(files=>files.map(readMeshVertices));
  assert.ok(minimumVertexDistance(hypothalamus,infundibulum)<1, "infundibulum must meet the hypothalamic surface");
  assert.ok(minimumVertexDistance(hypothalamus,mammillaryBodies)<1, "mammillary bodies must meet the hypothalamic surface");
});

test("maps major CerebrA cortical regions onto both high-density pial surfaces", async () => {
  const [metadataText, left, right, page] = await Promise.all([
    readFile(new URL("public/atlas/surface-region-labels.json", root), "utf8"),
    readFile(new URL("public/atlas/pial-left.mesh.gz", root)).then(gunzipSync),
    readFile(new URL("public/atlas/pial-right.mesh.gz", root)).then(gunzipSync),
    readFile(new URL("app/page.tsx", root), "utf8"),
  ]);
  const metadata = JSON.parse(metadataText);
  assert.equal(metadata.version, 1);
  assert.match(metadata.source, /CerebrA/);
  assert.match(metadata.method, /±3 mm/);
  assert.match(metadata.status, /not a manual pial-surface parcellation/);
  const regionSource=page.slice(page.indexOf("const surfaceRegions:"),page.indexOf("const surfaceRegionKeys="));
  const configuredIds=new Set([...regionSource.matchAll(/ids:\[([0-9,]+)\]/g)].flatMap(match=>match[1].split(",").map(Number)));
  for(const hemisphere of ["left","right"])for(const id of Object.keys(metadata.hemispheres[hemisphere].labels).map(Number))assert.ok(configuredIds.has(id),`${hemisphere} surface label ${id} is available to free observation`);

  for (const [hemisphere, mesh, expectedIds] of [
    ["left", left, [86, 64, 89, 96, 83, 73, 102, 82, 67, 94, 57, 63, 75, 81, 59, 98, 84]],
    ["right", right, [35, 13, 38, 45, 32, 22, 51, 31, 16, 43, 6, 12, 24, 30, 8, 47, 33]],
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

test("connects medial-surface study targets to visible surface or deep components", async () => {
  const [page, canvas] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/AtlasVolumeCanvas.tsx", root), "utf8"),
  ]);
  assert.match(page, /cingulate:\{name:"帯状回"/);
  assert.match(page, /ids:\[81,30,59,8,98,47,84,33\]/);
  assert.match(page, /const medialDeepLandmarkKeys:SurfaceDeepLandmarkKey\[\]=\["corpus-callosum","thalami","hypothalamus"\]/);
  assert.match(page, /この標本では脳弓と透明中隔を表示しません/);
  assert.match(page, /尾状核は側脳室に沿うため/);
  for (const key of ["corpus-callosum", "septum-pellucidum", "fornix", "thalami", "hypothalamus"]) {
    assert.match(page, new RegExp(key));
    assert.match(canvas, new RegExp(`key:\"${key}\"`));
  }
  for (const mesh of [
    "block-commissural-system-corpus-callosum", "block-commissural-system-septum-pellucidum", "block-commissural-system-fornix",
    "block-diencephalon-thalami", "block-diencephalon-hypothalamus",
  ]) assert.match(canvas, new RegExp(mesh));
  assert.match(canvas, /deep:rest\.slice\(13,18\)/);
  assert.match(canvas, /landmarks:rest\.slice\(18\)/);
});

test("bundles simplified neurovascular overlays as separately disclosed teaching meshes", async () => {
  const metadata = JSON.parse(await readFile(new URL("public/atlas/neurovascular-overlays.json", root), "utf8"));
  assert.equal(metadata.version, 2);
  assert.match(metadata.coordinateSpace, /manually approximated/);
  assert.deepEqual(metadata.displayShiftMm, [0, 18, -18]);
  assert.match(metadata.alignmentPolicy, /anterior arteries and forebrain-associated cranial nerves I-II retain the pial display shift/i);
  assert.match(metadata.alignmentPolicy, /vertebrobasilar arteries and cranial-nerve roots III-XII are anchored directly.*brainstem segmentation/i);
  assert.match(metadata.vertebrobasilarCalibration, /ventrolateral medulla.*pontomedullary junction.*ventral pons/i);
  assert.match(metadata.forebrainNerveCalibration, /olfactory bulbs and tracts.*optic nerves and chiasm.*exposed on the inferior surface/i);
  assert.match(metadata.cranialNerveRootCalibration, /within 2 mm.*label 27 surface/i);
  assert.match(metadata.cranialNerveRootTopography.III, /interpeduncular fossa/i);
  assert.match(metadata.cranialNerveRootTopography.IV, /inferior colliculi/i);
  assert.match(metadata.cranialNerveRootTopography["IX-XI"], /post-olivary sulcus/i);
  assert.match(metadata.cranialNerveRootTopography.XII, /between pyramid and olive/i);
  assert.equal(metadata.anatomyReferences.length, 3);
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
    assert.equal(group.displayShiftApplied, group.file === "overlay-arteries-anterior.mesh");
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
  const anteriorNerves = metadata.groups.find(group => group.file === "overlay-nerves-anterior.mesh");
  assert.ok(anteriorNerves);
  assert.ok(anteriorNerves.structures.filter(structure => structure.id >= 21 && structure.id <= 25).every(structure => structure.displayShiftApplied));
  assert.ok(anteriorNerves.structures.filter(structure => structure.id >= 26).every(structure => !structure.displayShiftApplied));
});

test("bundles structure-focused specimens and distinguishes derived from schematic parts", async () => {
  const metadata = JSON.parse(await readFile(new URL("public/atlas/specimen-blocks.json", root), "utf8"));
  assert.equal(metadata.version, 3);
  assert.equal(metadata.sourceVoxelMm, 0.5);
  assert.equal(metadata.geometrySamplingMm, 1);
  assert.match(metadata.coordinateSpace, /x right, y anterior, z superior/);
  assert.equal(Object.values(metadata.specimens).reduce((total, parts) => total + parts.length, 0), 55);
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
  assert.deepEqual(metadata.specimens["medial-temporal"].map(part => part.part), ["tissue", "hippocampus", "amygdala", "inferior-horn"]);
  assert.equal(metadata.specimens["medial-temporal"].some(part => ["fimbria", "uncus"].includes(part.part)), false);
  await assert.rejects(readFile(new URL("public/atlas/block-medial-temporal-fimbria.mesh", root)), { code: "ENOENT" });
  await assert.rejects(readFile(new URL("public/atlas/block-medial-temporal-uncus.mesh", root)), { code: "ENOENT" });
  assert.equal(metadata.specimens.diencephalon.find(part => part.part === "hypothalamus").sourceType, "regional-approximation");
  assert.equal(metadata.specimens["commissural-system"].find(part => part.part === "fornix").sourceType, "schematic-3d");
  assert.equal(metadata.specimens["midbrain-section"].find(part => part.part === "red-nuclei").sourceType, "manual-segmentation");
  assert.equal(metadata.specimens["midbrain-section"].find(part => part.part === "aqueduct").sourceType, "schematic-3d");
  for (const part of ["superior-cerebellar-peduncles", "middle-cerebellar-peduncles", "inferior-cerebellar-peduncles"]) {
    assert.equal(metadata.specimens.hindbrain.find(item => item.part === part).sourceType, "schematic-3d");
  }
  for (const part of ["facial-colliculi", "vestibular-areas", "hypoglossal-trigones", "vagal-trigones", "pyramids", "olives"]) {
    assert.equal(metadata.specimens.hindbrain.find(item => item.part === part).sourceType, "regional-approximation");
  }
  assert.ok(metadata.specimens.hindbrain.find(item => item.part === "pyramids").vertices > 1000);
  assert.ok(metadata.specimens.hindbrain.find(item => item.part === "olives").vertices > 1000);
  for (const part of ["superior-colliculi", "inferior-colliculi", "lateral-geniculate-bodies", "medial-geniculate-bodies", "interpeduncular-fossa"]) {
    assert.equal(metadata.specimens["midbrain-section"].find(item => item.part === part).sourceType, "regional-approximation");
  }

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

test("keeps medial deep structures on the shared grid and in anatomical order", async () => {
  const names = [
    "thalamus",
    "block-diencephalon-thalami",
    "block-diencephalon-hypothalamus",
    "block-commissural-system-corpus-callosum",
    "block-commissural-system-septum-pellucidum",
    "block-commissural-system-fornix",
  ];
  const files = await Promise.all(names.map(name => readFile(new URL(`public/atlas/${name}.mesh`, root))));
  const bounds = new Map(files.map((mesh, fileIndex) => {
    const count = mesh.readUInt32LE(4);
    const low = [Infinity, Infinity, Infinity];
    const high = [-Infinity, -Infinity, -Infinity];
    const sum = [0, 0, 0];
    for (let index = 0; index < count; index += 1) {
      const offset = 12 + index * 12;
      const xyz = [mesh.readFloatLE(offset + 8), mesh.readFloatLE(offset + 4), mesh.readFloatLE(offset)];
      xyz.forEach((value, axis) => {
        low[axis] = Math.min(low[axis], value);
        high[axis] = Math.max(high[axis], value);
        sum[axis] += value;
      });
    }
    return [names[fileIndex], { low, high, center: sum.map(value => value / count) }];
  }));
  const atlasThalamus = bounds.get("thalamus");
  const specimenThalamus = bounds.get("block-diencephalon-thalami");
  atlasThalamus.center.forEach((value, axis) => {
    assert.ok(Math.abs(value - specimenThalamus.center[axis]) < 1, `thalamus grid alignment axis ${axis}`);
  });
  const corpusCallosum = bounds.get("block-commissural-system-corpus-callosum");
  const fornix = bounds.get("block-commissural-system-fornix");
  const hypothalamus = bounds.get("block-diencephalon-hypothalamus");
  assert.ok(corpusCallosum.center[2] > fornix.center[2], "fornix remains below corpus callosum");
  assert.ok(fornix.low[2] < -27, "fornix columns descend toward the mammillary region");
  assert.ok(specimenThalamus.center[2] > hypothalamus.center[2], "hypothalamic marker remains ventral to thalamus");
  assert.ok(hypothalamus.high[1] - hypothalamus.low[1] < 34, "hypothalamic marker does not spread across the basal forebrain");
});

test("left medial view clips every paired deep overlay to the displayed side", async () => {
  const [canvas, page] = await Promise.all([
    readFile(new URL("app/AtlasVolumeCanvas.tsx", root), "utf8"),
    readFile(new URL("app/page.tsx", root), "utf8"),
  ]);
  assert.match(canvas, /if\(hemiMode<-\.5&&anatomy\.x>0\.\)discard/);
  assert.match(canvas, /gl\.uniform1f\(gl\.getUniformLocation\(prog,"hemiMode"\),hemisphere==="left"\?-1/);
  assert.match(page, /hemisphere:"left"/);
  assert.match(page, /初期状態は非表示・左側だけを描画/);
  assert.match(page, /右側成分は表示しません/);

  for (const name of [
    "block-commissural-system-corpus-callosum",
    "block-commissural-system-septum-pellucidum",
    "block-commissural-system-fornix",
    "block-diencephalon-thalami",
    "block-diencephalon-hypothalamus",
  ]) {
    const mesh = await readFile(new URL(`public/atlas/${name}.mesh`, root));
    const count = mesh.readUInt32LE(4);
    let negative = 0;
    let positive = 0;
    for (let index = 0; index < count; index += 1) {
      const anatomicalX = mesh.readFloatLE(12 + index * 12 + 8);
      if (anatomicalX < 0) negative += 1;
      if (anatomicalX > 0) positive += 1;
    }
    assert.ok(negative > 100, `${name} has a left component to retain`);
    assert.ok(positive > 100, `${name} has a right component to remove`);
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
  assert.equal(nerves.filter(item => item.name.includes("I 嗅球・嗅索")).length, 2);
  for (const [roman, expected] of expectedCounts) {
    assert.equal(normalized.filter(name => name.startsWith(`${roman} `)).length, expected, `cranial nerve ${roman}`);
  }
  for (const key of Array.from({ length: 12 }, (_, index) => `cn${index + 1}`)) {
    assert.match(page, new RegExp(`${key}:\\{name:`), key);
  }
  assert.match(audit, /脳神経I〜XIIは欠番なく収録/);
  assert.match(audit, /Iの嗅球は概形のみ、XIの脊髄根/);
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
  near(21, [-14, 80, -41]); // I, left olfactory bulb seated in the olfactory sulcus
  near(23, [-23, 43, -42]); // II, short left prechiasmatic nerve directed anteriorly
  near(25, [-9, 22, -42]);  // transverse body of the optic chiasm
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

test("keeps the vertebrobasilar trunk on the ventral brainstem surface", async () => {
  const [mesh, brainstem] = await Promise.all([
    readFile(new URL("public/atlas/overlay-arteries-posterior.mesh", root)),
    readFile(new URL("public/atlas/segment-brainstem.mesh", root)),
  ]);
  const vertices = mesh.readUInt32LE(4);
  const regionOffset = 12 + vertices * 28;
  const firstRingById = new Map();
  for (let index = 0; index < vertices; index += 1) {
    const id = Math.round(mesh.readFloatLE(regionOffset + index * 4));
    if (firstRingById.has(id)) continue;
    const ring = [];
    for (let side = 0; side < 10; side += 1) {
      const offset = 12 + (index + side) * 12;
      ring.push([
        mesh.readFloatLE(offset + 8),
        mesh.readFloatLE(offset + 4),
        mesh.readFloatLE(offset),
      ]);
    }
    firstRingById.set(id, ring.reduce(
      (sum, point) => sum.map((value, axis) => value + point[axis]),
      [0, 0, 0],
    ).map(value => value / ring.length));
  }
  const near = (id, expected, tolerance = 0.8) => {
    const actual = firstRingById.get(id);
    assert.ok(actual, `artery ${id}`);
    expected.forEach((value, axis) => assert.ok(
      Math.abs(actual[axis] - value) < tolerance,
      `artery ${id} axis ${axis}: ${actual[axis]}`,
    ));
  };
  near(11, [7, -12, -82]); // right vertebral artery on caudal ventrolateral medulla
  near(12, [0, 7, -58]);   // basilar origin at the pontomedullary junction

  const brainstemVertices = brainstem.readUInt32LE(4);
  const surface = Array.from({ length: brainstemVertices }, (_, index) => {
    const offset = 12 + index * 12;
    return [
      brainstem.readFloatLE(offset + 8),
      brainstem.readFloatLE(offset + 4),
      brainstem.readFloatLE(offset),
    ];
  });
  for (let index = 0; index < vertices; index += 10) {
    const id = Math.round(mesh.readFloatLE(regionOffset + index * 4));
    if (![10, 11, 12].includes(id)) continue;
    const center = [0, 0, 0];
    for (let side = 0; side < 10; side += 1) {
      const offset = 12 + (index + side) * 12;
      center[0] += mesh.readFloatLE(offset + 8) / 10;
      center[1] += mesh.readFloatLE(offset + 4) / 10;
      center[2] += mesh.readFloatLE(offset) / 10;
    }
    const localSurface = surface.filter(point => (
      Math.abs(point[0] - center[0]) < 2.5
      && Math.abs(point[2] - center[2]) < 1.5
    ));
    assert.ok(localSurface.length > 0, `brainstem surface near artery ${id}`);
    const ventralY = Math.max(...localSurface.map(point => point[1]));
    assert.ok(center[1] > ventralY + 0.5, `artery ${id} remains ventral: ${center[1]} > ${ventralY}`);
  }
});

test("block specimens support continuous rotation and reuse the shared WebGL renderer", async () => {
  const [page, canvas] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/AtlasVolumeCanvas.tsx", root), "utf8"),
  ]);
  assert.doesNotMatch(page, /Math\.max\(-88/);
  assert.match(page, /mode:"orbit"\|"roll"/);
  assert.match(page, /e\.button===2\|\|e\.shiftKey\?"roll":"orbit"/);
  assert.match(page, /blockViewLabels:Record<BlockViewPreset,string>=\{initial:"初期",opposite:"反対側",superior:"上面",inferior:"下面"\}/);
  assert.match(page, /setRotation\(\{\.\.\.blockInitialRotations\[key\]\}\)/);
  assert.doesNotMatch(page, /<AtlasVolumeCanvas[^>]*key=\{blockSpecimen\}/);
  assert.match(canvas, /let sharedAtlasRenderCanvas:HTMLCanvasElement\|null=null/);
  assert.match(canvas, /target\.drawImage\(canvas,0,0\)/);
  assert.match(canvas, /gl\.deleteShader\(vertexShader\);gl\.deleteShader\(fragmentShader\)/);
  assert.match(canvas, /if\(!ext\)\{gl\.deleteProgram\(prog\);return\}/);
  assert.match(canvas, /gl\.deleteProgram\(prog\)/);
  assert.doesNotMatch(canvas, /Promise\.all\(\["brain",focus/);
  assert.doesNotMatch(canvas, /focus:Mesh/);
  assert.match(canvas, /const loadOptional=\(needed:boolean,name:string\)=>needed\?loadMesh\(name\):Promise\.resolve\(EMPTY_MESH\)/);
  assert.match(canvas, /loadOptional\(wantVessels,"overlay-arteries-anterior"\)/);
  assert.match(canvas, /loadOptional\(surfaceLandmarks\.includes\(item\.key\),`surface-landmark-\$\{item\.key\}`\)/);
  assert.match(canvas, /\[kind,specimenBlock,effectiveSurfaceView,effectiveNeurovascularOverlay,showBasalLandmarks,surfaceLandmarkKey,surfaceDeepLandmarkKey,surfaceHighlightKey,retryVersion\]/);
  assert.match(canvas, /let active=true;setBlockMeshes\(null\);setError\(""\)/);
  assert.match(canvas, /return\(\)=>\{active=false\}/);
  assert.match(canvas, /az=\(rot\.z\?\?0\)\*Math\.PI\/180/);
  assert.match(canvas, /cz\*cy-sz\*sx\*sy/);
});

test("the shipped septum pellucidum mesh stays a thin, conservative midline guide", async () => {
  const [mesh, metadataText] = await Promise.all([
    readFile(new URL("public/atlas/block-commissural-system-septum-pellucidum.mesh", root)),
    readFile(new URL("public/atlas/specimen-blocks.json", root), "utf8"),
  ]);
  assert.equal(mesh.subarray(0, 4).toString("ascii"), "BNM2");
  const vertexCount = mesh.readUInt32LE(4);
  const faceCount = mesh.readUInt32LE(8);
  assert.ok(vertexCount >= 500 && vertexCount <= 1200, `unexpected septum vertex count: ${vertexCount}`);
  assert.equal(mesh.length, 12 + vertexCount * 28 + faceCount * 12);

  const bounds = [[Infinity, -Infinity], [Infinity, -Infinity], [Infinity, -Infinity]];
  for (let index = 0; index < vertexCount; index += 1) {
    for (let axis = 0; axis < 3; axis += 1) {
      const value = mesh.readFloatLE(12 + index * 12 + axis * 4);
      bounds[axis][0] = Math.min(bounds[axis][0], value);
      bounds[axis][1] = Math.max(bounds[axis][1], value);
    }
  }
  // Stored axis order is z, y, x. These limits reject the former broad plate
  // while leaving a little tolerance for marching-cubes implementation detail.
  assert.ok(bounds[0][0] > -6 && bounds[0][1] < 12, `septum z bounds: ${bounds[0]}`);
  assert.ok(bounds[1][0] > -10 && bounds[1][1] < 28, `septum y bounds: ${bounds[1]}`);
  assert.ok(bounds[2][0] > -1 && bounds[2][1] < 1, `septum x bounds: ${bounds[2]}`);

  const septum = JSON.parse(metadataText).specimens["commissural-system"]
    .find(part => part.part === "septum-pellucidum");
  assert.equal(septum.vertices, vertexCount);
  assert.equal(septum.faces, faceCount);
  assert.equal(septum.sourceType, "regional-approximation");
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
    opticChiasm: [33], insula: [34, 35],
  };
  const pattern = /\{target:"([^"]+)",category:"[^"]+",plane:"([^"]+)",position:(\d+),prompt:/g;
  const questions = [...page.matchAll(pattern)];
  assert.equal(questions.length, 17);

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
  assert.match(page, /function shuffledItems<T>\(items:readonly T\[\]\)/);
  assert.match(page, /options:shuffledItems\(question\.options\)/);
  assert.match(page, /useState<QuizQuestion\[\]>\(\(\)=>shuffledQuestions\(standardQuizQuestions\)\.slice\(0,10\)\)/);
});

test("neurovascular quiz stays opt-in and highlights decoded overlay structures", async () => {
  const [page, canvas] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/AtlasVolumeCanvas.tsx", root), "utf8"),
  ]);
  const pattern = /\{target:"(quiz[^"]+)",category:"neurovascular",view:"(arteries|cranialNerves)",prompt:"[^"]+",options:\[([^\]]+)\]\}/g;
  const questions = [...page.matchAll(pattern)];
  assert.equal(questions.length, 9);
  for (const [, target, view, rawOptions] of questions) {
    const options = [...rawOptions.matchAll(/"([^"]+)"/g)].map(match => match[1]);
    assert.equal(options.length, 4);
    assert.ok(options.includes(target), `${target} must be an option`);
    assert.ok(options.every(option => option.startsWith("quiz")));
    assert.equal(view, target.startsWith("quizCn") ? "cranialNerves" : "arteries");
  }
  assert.match(page, /surfaceRegionKeys=.*filter\(key=>!key\.startsWith\("quiz"\)\)/);
  assert.match(page, /function hasProvisionalQuizSource\(question:QuizQuestion\)\{return isSurfaceQuiz\(question\)/);
  assert.match(page, /function isProvisionalQuiz\(question:QuizQuestion\)\{return hasProvisionalQuizSource\(question\)&&!quizReviewApprovalFor\(question\.target\)\}/);
  assert.match(page, /isNeurovascularQuizTarget\(question\.target\)[\s\S]*setSelectedNeurovascularStructure\(neurovascularQuizTargets\[question\.target\]\)/);
  assert.match(canvas, /QUIZ_VESSEL_ID_OFFSET=1000,QUIZ_NERVE_ID_OFFSET=2000/);
  assert.match(canvas, /effectiveNeurovascularOverlay=neurovascularOverlay!=="none"\?neurovascularOverlay:quizNeurovascularOverlay/);
  assert.match(canvas, /effectiveSurfaceView=quizNeurovascularOverlay!=="none"\?"ghost":view/);
  assert.match(canvas, /effectiveShowCerebellum=quizNeurovascularOverlay!=="none"\?false:showCerebellum/);
  assert.match(canvas, /id>=QUIZ_NERVE_ID_OFFSET\?id-QUIZ_NERVE_ID_OFFSET:id-QUIZ_VESSEL_ID_OFFSET/);
  assert.match(canvas, /effectiveSurfaceHighlights=surfaceHighlights[\s\S]*id<QUIZ_VESSEL_ID_OFFSET/);
});

test("medial surface quiz keeps the same isolated-hemisphere anatomy as study mode", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  assert.match(page, /showCerebellum=\{quizQuestion\.view!=="medial"\}/);
  assert.match(page, /showPonsMedulla=\{quizQuestion\.view!=="medial"\}/);
  assert.match(page, /showMidbrain=\{quizQuestion\.view!=="medial"\}/);
});

test("help, diagnostics, feedback, and credit dialogs have durable shareable URLs", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  assert.match(page, /type OverlayMode = "help" \| "offline" \| "device-check" \| "feedback" \| "legal"/);
  assert.match(page, /function overlayFromHash\(hash:string\):OverlayMode\|null/);
  assert.match(page, /overlayFromHash\(window\.location\.hash\)==="help"/);
  assert.match(page, /overlayFromHash\(window\.location\.hash\)==="offline"/);
  assert.match(page, /overlayFromHash\(window\.location\.hash\)==="device-check"/);
  assert.match(page, /overlayFromHash\(window\.location\.hash\)==="feedback"/);
  assert.match(page, /overlayFromHash\(window\.location\.hash\)==="legal"/);
  assert.match(page, /window\.history\.pushState\(null,"",`#workspace\/\$\{key\}`\)/);
  assert.match(page, /onClick=\{\(\)=>openOverlay\("feedback"\)\}/);
  assert.match(page, /onClick=\{\(\)=>openOverlay\("legal"\)\}/);
  assert.match(page, /onClick=\{\(\)=>openOverlay\("help"\)\}/);
  assert.match(page, /onClick=\{\(\)=>openOverlay\("offline"\)\}/);
  assert.match(page, /document\.body\.style\.overflow="hidden"/);
  assert.match(page, /document\.querySelector<HTMLButtonElement>\('\.legalDialog header button'\)\?\.focus\(\)/);
  assert.match(page, /overlayReturnFocus\.current\?\.focus\(\)/);
  assert.match(page, /event\.shiftKey&&document\.activeElement===first/);
  assert.match(page, /!event\.shiftKey&&document\.activeElement===last/);
  assert.match(page, /onClick=\{closeOverlay\} aria-label="意見募集を閉じる"/);
  assert.match(page, /onClick=\{closeOverlay\} aria-label="利用条件とクレジット表示を閉じる"/);
  assert.match(page, /onClick=\{closeOverlay\} aria-label="操作ガイドを閉じる"/);
  assert.match(page, /onClick=\{closeOverlay\} aria-label="オフライン教材を閉じる"/);
});

test("PWA manager reports install, connectivity, persistence, and pack freshness", async () => {
  const [manager, capacity, registration, workerBuilder, css] = await Promise.all([
    readFile(new URL("app/OfflineManager.tsx", root), "utf8"),
    import(new URL("app/offlineCapacity.ts", root)),
    readFile(new URL("src/pwa.ts", root), "utf8"),
    readFile(new URL("scripts/build_service_worker.mjs", root), "utf8"),
    readFile(new URL("app/canvas.css", root), "utf8"),
  ]);
  assert.match(registration, /beforeinstallprompt/);
  assert.match(registration, /pendingInstallPrompt=null;\s*notifyInstallPrompt\(\);\s*await prompt\.prompt\(\)/);
  assert.match(manager, /X-Brain-Practical-Pack-Version/);
  assert.match(manager, /markerVersion===pack\.version/);
  assert.match(manager, /controllerchange/);
  assert.match(workerBuilder, /url\.pathname\.endsWith\("\/offline-packs\.json"\)/);
  assert.match(workerBuilder, /const ATLAS_BYTES=/);
  assert.match(workerBuilder, /function healthyAtlasResponse\(request,response\)/);
  assert.match(workerBuilder, /contentType\.includes\("text\/html"\)/);
  assert.match(workerBuilder, /Content-Encoding/);
  assert.match(workerBuilder, /Number\(contentLength\)===expected/);
  assert.match(workerBuilder, /response=>healthyAtlasResponse\(request,response\)/);
  assert.match(workerBuilder, /hit&&healthyAtlasResponse\(request,hit\)\?hit:networkThenCache/);
  assert.match(workerBuilder, /builderSource=await readFile\(fileURLToPath\(import\.meta\.url\)/);
  assert.match(manager, /X-Brain-Practical-Pack-Complete/);
  assert.match(manager, /state==="stale"\?"更新が必要"/);
  assert.match(manager, /protectedPaths/);
  assert.match(manager, /otherComplete/);
  assert.match(manager, /busy=Object\.values\(states\)\.includes\("working"\)/);
  assert.match(manager, /navigator\.onLine/);
  assert.match(manager, /永続保存が許可済み/);
  assert.match(manager, />インストール<\/button>/);
  assert.match(manager, /requiredDownloadBytes/);
  assert.match(manager, /storageCapacityRisk\(downloadBytes,availableBytes\)/);
  assert.match(manager, /不足の可能性を了承して保存/);
  assert.match(manager, /QuotaExceededError/);
  assert.match(manager, /保存領域が不足しました/);
  assert.match(css, /\.offlineState\.stale/);
  assert.match(css, /\.offlineCapacityWarning/);
  assert.equal(capacity.storageCapacityRisk(20*1048576,30*1048576),null);
  assert.deepEqual(capacity.storageCapacityRisk(20*1048576,24*1048576),{downloadBytes:20*1048576,reserveBytes:5*1048576,availableBytes:24*1048576});
  assert.equal(capacity.storageCapacityRisk(0,0),null);
  assert.equal(capacity.staleReplacementBytes([{bytes:3},{bytes:12},{bytes:7}]),12);
  assert.equal(capacity.offlineResourceResponseError(3,new Response("abc",{headers:{"Content-Type":"application/octet-stream","Content-Length":"3"}})),null);
  assert.match(capacity.offlineResourceResponseError(3,new Response("abc",{headers:{"Content-Type":"text/html","Content-Length":"3"}})),/HTML fallback/);
  assert.match(capacity.offlineResourceResponseError(4,new Response("abc",{headers:{"Content-Type":"application/octet-stream","Content-Length":"3"}})),/size 3, expected 4/);
  assert.equal(capacity.offlineResourceResponseError(4,new Response("abc",{headers:{"Content-Type":"application/octet-stream","Content-Encoding":"gzip","Content-Length":"3"}})),null);
  assert.match(capacity.offlineResourceResponseError(3,new Response("",{status:404})),/HTTP 404/);
});

test("records reproducible real-device diagnostics without treating them as a gate pass", async () => {
  const [page, manager, diagnostics, performanceRecorder, buildInfo, viteConfig, validator, packageJson, html, css] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/OfflineManager.tsx", root), "utf8"),
    readFile(new URL("app/DeviceDiagnostics.tsx", root), "utf8"),
    readFile(new URL("app/devicePerformance.ts", root), "utf8"),
    readFile(new URL("app/buildInfo.ts", root), "utf8"),
    readFile(new URL("vite.config.ts", root), "utf8"),
    readFile(new URL("scripts/validate_device_check_record.mjs", root), "utf8"),
    readFile(new URL("package.json", root), "utf8"),
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("app/canvas.css", root), "utf8"),
  ]);
  assert.match(page, /deviceCheckOpen&&/);
  assert.match(page, /<DeviceDiagnostics\/>/);
  assert.match(manager, /href="#workspace\/device-check"/);
  assert.match(diagnostics, /format:"brain-practical-device-check"/);
  assert.match(diagnostics, /schemaVersion:5/);
  assert.match(diagnostics, /application:\{\.\.\.appBuildInfo,runtimeBaseUrl:currentAppBaseUrl\(\)\}/);
  assert.match(diagnostics, /event\.pointerType!=="touch"/);
  assert.match(diagnostics, /navigator\.storage\?\.estimate/);
  assert.match(diagnostics, /navigator\.serviceWorker\?\.controller/);
  assert.match(diagnostics, /WEBGL_debug_renderer_info/);
  assert.match(diagnostics, /safe-area-inset-top/);
  assert.match(diagnostics, /requestAnimationFrame\(tick\)/);
  assert.match(diagnostics, /JSON\.stringify/);
  assert.match(diagnostics, /gateDisclaimer:disclaimer/);
  assert.match(diagnostics, /walkthrough:\{\.\.\.walkthrough\}/);
  assert.match(diagnostics, /problemNotes:problemNotes\.trim\(\)/);
  assert.match(diagnostics, /walkthroughItems\.map/);
  assert.match(diagnostics, /brain-practical-device-check-draft-v5/);
  assert.match(diagnostics, /localStorage\.setItem\(DRAFT_KEY/);
  assert.match(diagnostics, /capturePwaCheckpoint/);
  assert.match(diagnostics, /cachedResources===pack\.resources\.length/);
  assert.match(diagnostics, /recordDevicePerformanceObservation/);
  assert.match(page, /startDevicePerformanceSampler\(\)/);
  assert.match(performanceRecorder, /brain-practical-device-performance-v2/);
  assert.match(performanceRecorder, /value\?\.application\?\.commit===appBuildInfo\.commit/);
  assert.match(performanceRecorder, /performance\.clearResourceTimings\(\)/);
  assert.match(performanceRecorder, /horizontalOverflowPx/);
  assert.match(performanceRecorder, /peakJsHeapBytes/);
  assert.match(performanceRecorder, /coldStart:DeviceColdStartObservation/);
  assert.match(diagnostics, /next\.coldStart\.routeHash!=="#workspace\/home"/);
  assert.match(diagnostics, /this record alone|\u3053\u306e\u8a18\u9332\u3060\u3051/);
  assert.match(validator, /walkthroughKeys=\["home","surface","sections","blocks","quiz","segment","offlineSurface","offlineSections","offlineBlocks","offlineQuiz"\]/);
  assert.match(validator, /PWA checkpoints must be ordered online, offline, restored/);
  assert.match(buildInfo, /https:\/\/bonnginn\.github\.io\/brain-practical-navi\//);
  assert.match(viteConfig, /gitOutput\(\["rev-parse","HEAD"\]\)/);
  assert.match(viteConfig, /__APP_BUILD_COMMIT__/);
  assert.match(validator, /application\.commit must match --commit/);
  assert.match(validator, /performanceSession\.origin must be https:\/\/bonnginn\.github\.io/);
  assert.match(validator, /performance observations must follow the documented route order/);
  assert.match(validator, /pointerType!=="touch"/);
  assert.match(validator, /this is not beta gate approval/);
  assert.match(packageJson, /"validate:device-check": "node scripts\/validate_device_check_record\.mjs"/);
  assert.match(html, /viewport-fit=cover/);
  assert.match(css, /\.deviceTouchState\.confirmed/);
  const valid=spawnSync(process.execPath,[localPath("scripts/validate_device_check_record.mjs"),localPath("tests/fixtures/device-check-valid.json"),"--commit",deviceFixtureCommit],{encoding:"utf8"});
  assert.equal(valid.status,0,valid.stderr);
  assert.match(valid.stdout,/confirmed touch, 10\/10 route\/performance observations, and 3\/3 PWA checkpoints/);
  const incomplete=spawnSync(process.execPath,[localPath("scripts/validate_device_check_record.mjs"),localPath("tests/fixtures/device-check-incomplete.json"),"--commit",deviceFixtureCommit],{encoding:"utf8"});
  assert.equal(incomplete.status,1);
  assert.match(incomplete.stderr,/touch must contain a confirmed touch pointer/);
  assert.match(incomplete.stderr,/walkthrough\.surface is not confirmed/);
  assert.match(incomplete.stderr,/PWA checkpoints must be ordered online, offline, restored/);
  assert.match(incomplete.stderr,/pwaEvidence\.offline\.packs must contain one surface pack/);
  assert.match(incomplete.stderr,/application\.commit must match --commit/);
  assert.match(incomplete.stderr,/application\.dirty must be false/);
  assert.match(incomplete.stderr,/performanceSession\.origin must be https:\/\/bonnginn\.github\.io/);
  assert.match(incomplete.stderr,/performanceSession\.observations\.home is required/);
  assert.match(incomplete.stderr,/performanceSession\.coldStart is required/);
  const missingCommit=spawnSync(process.execPath,[localPath("scripts/validate_device_check_record.mjs"),localPath("tests/fixtures/device-check-valid.json")],{encoding:"utf8"});
  assert.equal(missingCommit.status,2);
  assert.match(missingCommit.stderr,/--commit <40-char-SHA>/);
});

test("rejects stale or polluted GitHub Pages deployment artifacts", async () => {
  const artifact=await mkdtemp(join(tmpdir(),"brain-practical-pages-"));
  const commit="1234567890abcdef1234567890abcdef12345678",base="/brain-practical-navi/";
  try{
    await mkdir(join(artifact,"assets"),{recursive:true});
    await Promise.all([
      writeFile(join(artifact,"index.html"),`<link rel="icon" href="${base}favicon.svg"><link rel="manifest" href="${base}manifest.webmanifest"><script src="${base}assets/app.js"></script><link rel="stylesheet" href="${base}assets/app.css">`),
      writeFile(join(artifact,"manifest.webmanifest"),JSON.stringify({start_url:"./#workspace/home",scope:"./",display:"standalone"})),
      writeFile(join(artifact,"build-info.json"),JSON.stringify({format:"brain-practical-build-info",schemaVersion:1,commit,dirty:false,basePath:base,publicBaseUrl:"https://bonnginn.github.io/brain-practical-navi/"})),
      writeFile(join(artifact,"sw.js"),'const CORE_PATHS=["","assets/app.css","assets/app.js","build-info.json","favicon.svg","index.html","manifest.webmanifest","offline-packs.json","phone-home-qr.svg"];const scoped=path=>new URL(path,self.registration.scope).href;'),
      writeFile(join(artifact,"phone-home-qr.svg"),'<svg><desc>https://bonnginn.github.io/brain-practical-navi/#workspace/home</desc></svg>'),
      writeFile(join(artifact,"offline-packs.json"),"{}"),writeFile(join(artifact,"favicon.svg"),"<svg/>"),writeFile(join(artifact,"assets","app.js"),"export{}"),writeFile(join(artifact,"assets","app.css"),"body{}"),
    ]);
    const valid=spawnSync(process.execPath,[localPath("scripts/validate_pages_build.mjs"),"--commit",commit,"--dir",artifact],{encoding:"utf8"});
    assert.equal(valid.status,0,valid.stderr);
    assert.match(valid.stdout,/Pages artifact excludes Sites-only runtime files/);
    await mkdir(join(artifact,"server"));
    const polluted=spawnSync(process.execPath,[localPath("scripts/validate_pages_build.mjs"),"--commit",commit,"--dir",artifact],{encoding:"utf8"});
    assert.equal(polluted.status,1);
    assert.match(polluted.stderr,/must not contain the Sites worker entry/);
    const stale=spawnSync(process.execPath,[localPath("scripts/validate_pages_build.mjs"),"--commit","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","--dir",artifact],{encoding:"utf8"});
    assert.equal(stale.status,1);
    assert.match(stale.stderr,/commit must match --commit/);
  }finally{await rm(artifact,{recursive:true,force:true})}
});

test("keeps simultaneously selectable surface colours distinct on the dark model", async () => {
  const [page, audit] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("VISUAL_CONTRAST_AUDIT.md", root), "utf8"),
  ]);
  const block = page.split("const surfaceRegions")[1].split("const surfaceRegionKeys")[0];
  const entries = [...block.matchAll(/\s([A-Za-z]+):\{name:"([^"]+)"[^\n]+rgb:\[(\d+),(\d+),(\d+)\]/g)].map(match=>[match[1],[Number(match[3]),Number(match[4]),Number(match[5])]]);
  const colours = new Map(entries);
  const views = [
    ["precentral","postcentral","inferiorFrontal","superiorTemporal","supramarginal","lateralOccipital"],
    ["superiorFrontal","precentral","postcentral","superiorParietal","paracentral"],
    ["orbitofrontal","superiorTemporal","middleTemporal","fusiform","lingual","lateralOccipital"],
    ["cingulate","paracentral","precuneus","cuneus","lingual"],
  ];
  const luminance = colour=>colour.map(value=>value/255).map(value=>value<=.04045?value/12.92:((value+.055)/1.055)**2.4).reduce((sum,value,index)=>sum+value*[.2126,.7152,.0722][index],0);
  const background = luminance([26,31,33]);
  for(const keys of views)for(let left=0;left<keys.length;left++)for(let right=left+1;right<keys.length;right++)assert.ok(Math.hypot(...colours.get(keys[left]).map((value,index)=>value-colours.get(keys[right])[index]))>=35,`${keys[left]} and ${keys[right]} are too similar`);
  for(const [key,colour] of colours){const value=luminance(colour),ratio=(Math.max(value,background)+.05)/(Math.min(value,background)+.05);assert.ok(ratio>=3,`${key} is too dark on the model background`)}
  assert.match(page, /aria-pressed=\{active\}/);
  assert.match(audit, /色だけに依存せず/);
});

test("smooths cerebellar shading without moving the atlas boundary", async () => {
  const atlasCanvas = await readFile(new URL("app/AtlasVolumeCanvas.tsx", root), "utf8");
  assert.match(atlasCanvas,/name==="segment-cerebellum"\|\|name==="block-hindbrain-cerebellum"\?smoothCerebellarDisplayNormals\(mesh\):mesh/);
  assert.match(atlasCanvas,/only display normals are[\s\S]*crease threshold/);
  assert.match(atlasCanvas,/creaseDot=\.18/);
  assert.match(atlasCanvas,/pass<4/);
  assert.match(atlasCanvas,/const mesh=\{vertices,normals,shade,regions,faces\}/);
  assert.match(atlasCanvas,/\[\.78,\.80,\.79,alpha\][\s\S]*\[\.62,\.54,\.42,alpha\]/);
});

test("presents sulci as teaching guides rather than segmentation boundaries", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  const guides = page.split("const surfaceLandmarks")[1].split("const surfaceLandmarkKeys")[0];
  assert.equal((guides.match(/note:"[^"]*位置目安です。"/g)??[]).length,7);
  assert.match(guides,/longitudinal-fissure[\s\S]*正中の裂を、細い低彩度ガイドで示します。[\s\S]*実在する棒状構造ではありません/);
  assert.match(page,/source:"模式ガイド"/);
  assert.match(page,/脳回間の位置関係を読む教材ガイドです。[\s\S]*厳密な溝の輪郭や分節境界ではありません/);
});

test("prioritizes beta specimen work without implying anatomical validation", async () => {
  const [page, roadmap, css] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("BETA_ROADMAP.md", root), "utf8"),
    readFile(new URL("app/canvas.css", root), "utf8"),
  ]);
  assert.match(page, /const blockPriorities:Record<BlockSpecimenKey/);
  assert.match(page, /radiations:\["putamen","pallidum-external","pallidum-internal","internal-capsule","corona-radiata"\]/);
  assert.match(page, /"medial-temporal":\["hippocampus","amygdala","inferior-horn"\]/);
  assert.doesNotMatch(page.split('"medial-temporal":{name:"海馬・扁桃体標本"')[1].split('"midbrain-section"')[0], /key:"(?:fimbria|uncus)"/);
  assert.match(page, /海馬采・鉤は信頼できる境界データがなく3D未収録/);
  assert.doesNotMatch(page, /放線群、脈絡叢、海馬采、脳弓/);
  assert.match(page, /旧海馬采・鉤メッシュは位置と連続性の根拠が不足するため、β候補の配布物から除外/);
  assert.match(page, /useState<string\[]>\(initialBlockLayers\(initialBlockSpecimen\)\)/);
  assert.match(page, /setBlockLayers\(initialBlockLayers\(key\)\)/);
  assert.match(css, /@media\(max-width:760px\)\{\.specimenViewControls\{right:8px;bottom:8px\}\.specimenAttachmentControls\{bottom:66px\}/);
  const priorities = page.split("const blockPriorities")[1].split("const blockInitialRotations")[0];
  assert.equal((priorities.match(/label:"β重点"/g)??[]).length, 4);
  assert.equal((priorities.match(/label:"発展枠"/g)??[]).length, 4);
  assert.match(page, /試作中・解剖学的正確性は未保証/);
  assert.match(page, /const blockSpecimenDisclaimer="褐色組織は位置関係を読むための表示で[\s\S]*見た目の実在感を形状や境界の正確性の根拠にせず/);
  assert.match(page, /caution:`\$\{blockSpecimenDisclaimer\} \$\{blockSpecimens\[blockSpecimen\]\.caution\}`/);
  assert.match(roadmap, /\[x\] 8標本を一律に磨くのではなく[\s\S]*側脳室全景[\s\S]*レンズ核・投射線維[\s\S]*脈絡叢[\s\S]*内側側頭葉/);
  assert.match(roadmap, /\[x\] 脳室全景、レンズ核と投射線維、脈絡叢、内側側頭葉[\s\S]*5\/7[\s\S]*3\/3/);
  assert.match(roadmap, /\[x\] 正当に利用できる資料と監修がない限り/);
  assert.match(roadmap, /\[x\] βでも検証が不足する標本/);
});

test("keeps provisional and expert-unreviewed structures out of the default quiz", async () => {
  const [page,ledgerModule,ledger,css] = await Promise.all([readFile(new URL("app/page.tsx", root), "utf8"),readFile(new URL("app/quizReviewLedger.ts",root),"utf8"),readFile(new URL("app/quiz-review-ledger.json",root),"utf8").then(JSON.parse),readFile(new URL("app/canvas.css",root),"utf8")]);
  assert.match(page, /function hasProvisionalQuizSource\(question:QuizQuestion\)\{return isSurfaceQuiz\(question\)\|\|structures\[question\.target\]\.labelSource!=="manual"\}/);
  assert.match(page, /function isProvisionalQuiz\(question:QuizQuestion\)\{return hasProvisionalQuizSource\(question\)&&!quizReviewApprovalFor\(question\.target\)\}/);
  assert.match(page, /standardQuizQuestions=quizQuestions\.filter\(question=>!isProvisionalQuiz\(question\)\)/);
  assert.match(page, /useState<QuizQuestion\[]>\(\(\)=>shuffledQuestions\(standardQuizQuestions\)/);
  assert.match(page, /quizIncludeProvisional\|\|!isProvisionalQuiz\(question\)/);
  assert.match(page, /標準問題[\s\S]*手動分節＋監修台帳承認/);
  assert.match(page, /試作問題を含む[\s\S]*監修台帳未承認・位置照合ラベル/);
  assert.match(page, /試作・監修台帳未承認/);
  assert.match(page, /監修台帳・標準問題/);
  assert.match(ledgerModule,/approvalsByTarget[\s\S]*quizReviewApprovalFor/);
  assert.equal(ledger.format,"brain-practical-quiz-review-ledger");
  assert.equal(ledger.schemaVersion,1);
  assert.deepEqual(ledger.approvals,[]);
  assert.match(css,/\.quizStandardScope/);
  assert.match(css,/\.reviewedQuizFlag/);
});

test("requires complete expert and governance evidence before promoting a trial quiz", async () => {
  const packageData=JSON.parse(await readFile(new URL("package.json",root),"utf8"));
  assert.match(packageData.scripts.build,/^node scripts\/audit_quiz_review_ledger\.mjs &&/);
  const real=spawnSync(process.execPath,[localPath("scripts/audit_quiz_review_ledger.mjs")],{encoding:"utf8",cwd:localPath(".")});
  assert.equal(real.status,0,real.stderr);
  assert.match(real.stdout,/0 approved trial target\(s\), 22 remain evidence-gated/);
  const directory=await mkdtemp(join(tmpdir(),"brain-practical-quiz-ledger-")),ledgerPath=join(directory,"invalid.json");
  try{
    await writeFile(ledgerPath,JSON.stringify({format:"brain-practical-quiz-review-ledger",schemaVersion:1,approvals:[{target:"ventricle",reviewedCommit:"short",evidenceTargetIds:["C1"],bundleDirectory:"tests/fixtures",adoptedAt:"invalid",adoptedBy:"",reason:"too short",caution:""}]}));
    const invalid=spawnSync(process.execPath,[localPath("scripts/audit_quiz_review_ledger.mjs"),ledgerPath],{encoding:"utf8",cwd:localPath(".")});
    assert.equal(invalid.status,1);
    assert.match(invalid.stderr,/reviewedCommit must be a full 40-character SHA/);
    assert.match(invalid.stderr,/adoptedBy is required/);
    assert.match(invalid.stderr,/bundleDirectory must be expert-review-records/);
  }finally{await rm(directory,{recursive:true,force:true})}
});

test("publishes a durable keyboard and pointer operation guide", async () => {
  const [page, css] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/canvas.css", root), "utf8"),
  ]);
  assert.match(page, /type OverlayMode = "help" \| "offline" \| "device-check" \| "feedback" \| "legal"/);
  assert.match(page, /#workspace\/\$\{key\}/);
  assert.match(page, /操作ガイドを表示/);
  assert.match(page, /<kbd>Ctrl<\/kbd>／<kbd>⌘<\/kbd>＋<kbd>Z<\/kbd>/);
  assert.match(page, /<kbd>Tab<\/kbd>で項目移動・<kbd>Esc<\/kbd>で閉じる/);
  assert.match(css, /\.helpGrid\s*\{[^}]*grid-template-columns:\s*1fr 1fr/);
  assert.match(css, /@media\(max-width:760px\)[\s\S]*\.helpGrid\{grid-template-columns:1fr/);
});

test("complex workspaces expose visible keyboard focus and a main-content shortcut", async () => {
  const [page, css, editor] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/canvas.css", root), "utf8"),
    readFile(new URL("app/ManualSegmentationWorkbench.tsx", root), "utf8"),
  ]);
  assert.match(page, /className="skipLink" onClick=\{\(\)=>document\.getElementById\("workspace"\)\?\.focus\(\)\}/);
  assert.equal((page.match(/id="workspace" tabIndex=\{-1\}/g) ?? []).length, 8);
  assert.match(page, /workspace==="blocks"&&blockIntroOpen/);
  assert.match(page, /workspace==="blocks"&&!blockIntroOpen/);
  assert.ok((page.match(/aria-current=\{/g) ?? []).length >= 4);
  assert.match(page, /role="group" aria-label="構造グループの一括表示"/);
  assert.match(css, /:focus-visible \{ outline: 3px solid #e36e57/);
  assert.match(css, /\.skipLink:focus-visible \{ top: 8px; \}/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(editor, /aria-label="差分JSONファイルを選択"/);
});

test("phone layouts use a bottom workspace dock and a complete context sheet", async () => {
  const [page, css] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/canvas.css", root), "utf8"),
  ]);
  assert.match(page, /appShell workspace-\$\{workspace\}/);
  assert.match(page, /aria-label="意見・共同制作を表示"/);
  assert.match(css, /html\{-webkit-text-size-adjust:100%;text-size-adjust:100%\}/);
  assert.match(page, /className=\{`mobileRailBackdrop \$\{mobileRailOpen\?"visible":""\}`\}/);
  assert.match(page, /className="mobileContextToggle" aria-expanded=\{mobileRailOpen\}/);
  assert.match(page, /matchMedia\("\(max-width: 760px\) and \(hover: none\) and \(pointer: coarse\)"\)/);
  assert.match(page, /id="mobile-context-panel" className=\{`leftRail rail-\$\{workspace\} \$\{mobileRailOpen\?"mobileOpen":""\}`\} role=\{phoneViewport\?"dialog":undefined\}/);
  assert.match(page, /aria-modal=\{phoneViewport&&mobileRailOpen\?true:undefined\}/);
  assert.match(page, /断面と表示構造[\s\S]*復習クイズの設定[\s\S]*編集ツールの手順/);
  assert.match(page, /document\.body\.style\.overflow="hidden"/);
  assert.match(page, /\.mobileRailSheetHead button[\s\S]*focus\(\{preventScroll:true\}\)/);
  assert.match(page, /if\(event\.shiftKey&&document\.activeElement===first\)[\s\S]*last\.focus\(\)/);
  assert.match(css, /@media\(max-width:760px\) and \(hover:none\) and \(pointer:coarse\)\{[\s\S]*\.workspaceSwitch\{position:fixed;z-index:50;left:0;right:0;bottom:0;height:calc\(66px \+ env\(safe-area-inset-bottom,0px\)\)/);
  assert.match(css, /\.mobileContextToggle\{position:fixed;z-index:43;right:12px;bottom:calc\(76px \+ env\(safe-area-inset-bottom,0px\)\)/);
  assert.match(css, /\.appShell \.leftRail\{position:fixed;z-index:45;[\s\S]*bottom:calc\(66px \+ env\(safe-area-inset-bottom,0px\)\);[\s\S]*max-height:min\(72dvh,620px\)/);
  assert.match(css, /\.appShell \.leftRail\.mobileOpen\{transform:translateY\(0\);visibility:visible;pointer-events:auto\}/);
  assert.match(css, /\.leftRail \.sectionStructureButtons\{display:grid;grid-template-columns:1fr 1fr/);
  assert.match(css, /\.mobileSectionStructurePicker\{display:none\}/);
  assert.doesNotMatch(page, /landmarks\.map\(mark/);
  assert.match(css, /@media\(max-width:380px\)\{\.learningModelCard \.panelHead\{min-width:0;flex-wrap:wrap/);
  assert.match(css, /\.helpButton::after\{content:"操作";font-size:12px\}/);
  assert.match(css, /\.feedbackButton::after\{content:"共同";font-size:12px\}/);
  assert.match(css, /\.legalButton::after\{content:"条件";font-size:12px\}/);
  assert.match(css, /@media\(max-width:380px\)[\s\S]*\.specimenAttachmentControls\{left:8px;right:64px;max-width:none\}/);
});

test("M2 compares data-anchored and schematic hindbrain models without conflating provenance", async () => {
  const [page, css, pkg, audit, record] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/canvas.css", root), "utf8"),
    readFile(new URL("package.json", root), "utf8"),
    readFile(new URL("scripts/audit_model_comparison.mjs", root), "utf8"),
    readFile(new URL("MODEL_COMPARISON_AUDIT.md", root), "utf8"),
  ]);
  assert.match(page, /new URLSearchParams\(window\.location\.search\)\.get\("m2"\)==="compare"/);
  assert.match(page, /DATA-ANCHORED[\s\S]*PROJECT-AUTHORED/);
  assert.match(page, /showComparisonReconstruction=!compactViewport\|\|comparisonMobileMode==="reconstruction"/);
  assert.match(page, /showComparisonSchematic=!compactViewport\|\|comparisonMobileMode==="schematic"/);
  assert.match(page, /role="group" aria-label="スマートフォンで比較するモデル"/);
  assert.match(page, /\{showComparisonReconstruction&&<section className="modelComparisonCard"/);
  assert.match(page, /\{showComparisonSchematic&&<section className="modelComparisonCard"/);
  assert.match(page, /specimenLayers=\{hindbrainReconstructionComparisonLayers\}[\s\S]*specimenLayers=\{hindbrainSchematicComparisonLayers\}/);
  assert.match(page, /specimenTissueMode="solid"[\s\S]*specimenTissueMode="hidden"/);
  assert.match(css, /\.modelComparisonGrid\{[\s\S]*grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)/);
  assert.match(css, /@media\(max-width:760px\)\{\.modelComparisonNotice[\s\S]*\.modelComparisonGrid\{display:block\}/);
  assert.match(css, /\.modelComparisonMobileSwitch\{display:grid;grid-template-columns:1fr 1fr/);
  assert.match(pkg, /"audit:models": "node scripts\/audit_model_comparison\.mjs"/);
  assert.match(audit, /comparison-sets-disjoint/);
  assert.match(record, /β本体はAの標本再構成を基盤にし/);
  assert.match(record, /専門家による形状承認ではありません/);
});

test("ships a reproducible Google Form generator for feedback and collaborators", async () => {
  const [script, guide, audit] = await Promise.all([
    readFile(new URL("scripts/create_google_feedback_form.gs", root), "utf8"),
    readFile(new URL("ALPHA_FEEDBACK.md", root), "utf8"),
    readFile(new URL("FORM_OPERATION_AUDIT.md", root), "utf8"),
  ]);
  assert.match(script, /function createBrainPracticalFeedbackForm\(\)/);
  assert.match(script, /FormApp\.create\(CONFIG\.FORM_TITLE, true\)/);
  assert.match(script, /FormApp\.DestinationType\.SPREADSHEET/);
  assert.match(script, /routeItem\.createChoice\('修正提案・不具合・使いにくさを送る', feedbackPage\)/);
  assert.match(script, /routeItem\.createChoice\('共同制作者として参加したい', collaborationPage\)/);
  assert.match(script, /FormApp\.PageNavigationType\.SUBMIT/);
  assert.match(script, /RETENTION_TEXT: '保存期間：β版の改善と共同制作の連絡に必要な期間。不要になった連絡先は削除します。'/);
  assert.match(script, /refreshExistingForm_\(existingForm, existingSheet\)/);
  assert.match(script, /form\.setTitle\(CONFIG\.FORM_TITLE\)\.setDescription\(buildDescription_\(\)\)/);
  assert.match(script, /spreadsheet\.rename\(CONFIG\.RESPONSE_SHEET_TITLE\)/);
  assert.match(script, /VITE_FEEDBACK_FORM_URL/);
  assert.doesNotMatch(script, /addFileUploadItem/);
  assert.match(guide, /リンクを知っている全員/);
  assert.match(guide, /CONTACT_TEXT/);
  assert.match(guide, /\[BETA FORM DELETE TEST YYYY-MM-DD\]/);
  assert.match(audit, /未ログインのWindows Chromium/);
  assert.match(audit, /回答シートとGoogle Forms個別回答の双方から同じ回答を削除/);
});

test("research-backed anatomy cautions distinguish source data from teaching schematics", async () => {
  const [page, research] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("ACCURACY_AND_VIEWER_RESEARCH.md", root), "utf8"),
  ]);
  assert.match(page, /完全な輪が常に存在するわけではありません/);
  assert.match(page, /I・IIは脳幹から出る神経根ではありません/);
  assert.match(page, /脳梁下面と脳弓上面を結ぶ両葉性の薄い隔壁/);
  assert.match(page, /BigBrainは単一個体の20 µm組織再構成/);
  assert.match(research, /Neuroglancer/);
  assert.match(research, /BrainBrowser/);
  assert.match(research, /NiiVue/);
});

test("3D viewers expose orientation, keyboard rotation, reset, and visible zoom controls", async () => {
  const [page, canvas, css] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/AtlasVolumeCanvas.tsx", root), "utf8"),
    readFile(new URL("app/globals.css", root), "utf8"),
  ]);
  assert.match(page, /function OrientationCompass/);
  assert.match(page, /R 右、L 左、A 前、P 後、S 上、I 下/);
  assert.ok((page.match(/onKeyDown=\{handleModelKey\}/g) ?? []).length >= 4);
  assert.match(page, /event\.key\.toLowerCase\(\)==="r"/);
  assert.match(canvas, /className="modelZoomControls"/);
  assert.match(canvas, /aria-label="拡大率を100パーセントに戻す"/);
  assert.match(canvas, /showZoomControls=true/);
  assert.match(page, /showZoomControls=\{false\}/);
  assert.match(page, /<OrientationCompass rotation=\{modelRotation\} compact\/>/);
  assert.match(page, /復習問題の脳表3Dモデル。ドラッグまたは矢印キーで回転/);
  assert.match(page, /surfaceQuiz\?<><AtlasVolumeCanvas[^>]+rotation=\{rotation\}[^>]+surfaceHighlights=\{quizSurfaceHighlight\}/);
  assert.match(page, /workspace==="quiz"&&isSurfaceQuiz\(quizQuestion\)/);
  assert.match(css, /\.modelStage:focus-visible/);
  assert.match(css, /\.orientationCompass/);
  assert.match(css, /\.orientationCompass\.compact/);
  assert.match(css, /\.modelZoomControls/);
});

test("ordinary study views disclose structure provenance without claiming expert validation", async () => {
  const [page, css, audit] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/canvas.css", root), "utf8"),
    readFile(new URL("STRUCTURE_PROVENANCE.md", root), "utf8"),
  ]);
  assert.match(page, /manual:\{label:"標本同一格子・手動分節"/);
  assert.match(page, /"atlas-provisional":\{label:"アトラス照合・試作"/);
  assert.match(page, /"image-guided":\{label:"画像誘導・試作"/);
  assert.match(page, /className=\{`provenanceBadge \$\{source\.className\}`\}/);
  assert.match(page, /item\.kind\} · \{item\.source/);
  assert.match(css, /\.provenanceBadge\.provisional/);
  assert.match(audit, /位置合わせや手動分節が済んでいることと、神経解剖学の専門家による最終確認は同義ではありません/);
  assert.match(audit, /監修待ち/);
});

test("failed atlas requests can clear rejected caches and retry in place", async () => {
  const [canvas, css] = await Promise.all([
    readFile(new URL("app/AtlasVolumeCanvas.tsx", root), "utf8"),
    readFile(new URL("app/canvas.css", root), "utf8"),
  ]);
  assert.match(canvas, /function retryLoad\(\)/);
  assert.match(canvas, /manualSegCache\.delete\("icbm500"\)/);
  assert.match(canvas, /meshCache\.clear\(\)/);
  assert.match(canvas, /role="alert"/);
  assert.match(canvas, />再読み込み<\/button>/);
  assert.match(css, /\.atlasLoading\.error button/);
});

test("defers the optional section 3D comparison on narrow screens", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  assert.match(page, /matchMedia\("\(max-width: 760px\)"\)\.matches\?"slice":"both"/);
  assert.match(page, /sectionLayout!=="slice"&&<aside className="modelInset"/);
  assert.match(page, /断面＋3D[\s\S]*断面のみ[\s\S]*3Dのみ/);
});

test("releases expanded atlas volumes after the last consuming canvas unmounts", async () => {
  const [canvas, editor, performanceAudit] = await Promise.all([
    readFile(new URL("app/AtlasVolumeCanvas.tsx", root), "utf8"),
    readFile(new URL("app/ManualSegmentationWorkbench.tsx", root), "utf8"),
    readFile(new URL("PERFORMANCE_AUDIT.md", root), "utf8"),
  ]);
  assert.match(canvas, /function clearLargeVolumeCaches\(\)\{volumeCache=null;bigBrainCache=null;fixedBrainCache=null;manualSegCache\.clear\(\)\}/);
  assert.match(canvas, /largeVolumeConsumers>0[\s\S]*setTimeout\(\(\)=>\{if\(largeVolumeConsumers===0\)clearLargeVolumeCaches\(\)/);
  assert.match(canvas, /if\(kind!=="slice"\)return;retainLargeVolumeCaches\(\);return releaseLargeVolumeCaches/);
  assert.match(editor, /return\(\)=>\{active=false;dataCache=null\}/);
  assert.match(performanceAudit, /ブラウザのHTTPキャッシュは消さない/);
});

test("releases decoded 3D mesh caches after the last surface canvas unmounts", async () => {
  const canvas = await readFile(new URL("app/AtlasVolumeCanvas.tsx", root), "utf8");
  assert.match(canvas,/surfaceMeshConsumers=0,surfaceMeshReleaseTimer:number\|null=null/);
  assert.match(canvas,/function retainSurfaceMeshCaches\(\)\{surfaceMeshConsumers\+\+/);
  assert.match(canvas,/function releaseSurfaceMeshCaches\(\)[\s\S]*if\(surfaceMeshConsumers===0\)meshCache\.clear\(\)/);
  assert.match(canvas,/if\(kind!=="surface"\)return;retainSurfaceMeshCaches\(\);return releaseSurfaceMeshCaches/);
});

test("cross-checks segmentation edits in coronal and sagittal planes", async () => {
  const [editor, css] = await Promise.all([
    readFile(new URL("app/ManualSegmentationWorkbench.tsx", root), "utf8"),
    readFile(new URL("app/canvas.css", root), "utf8"),
  ]);
  assert.match(editor, /coronalRef=useRef<HTMLCanvasElement>/);
  assert.match(editor, /sagittalRef=useRef<HTMLCanvasElement>/);
  assert.match(editor, /plane:"coronal"\|"sagittal"/);
  assert.match(editor, /effective=editsRef\.current\.get\(index\)\?\?data\.labels\[index\]/);
  assert.match(editor, /setReviewPoint\(\{x:selected\.x,y:data\.dims\[1\]-1-selected\.b\}\)/);
  assert.match(editor, /3方向照合/);
  assert.match(editor, /未保存の差分も選択ラベルの色で反映/);
  assert.match(css, /\.segOrthogonalReview canvas/);
});

test("skips canvas drawing while a responsive panel has zero size", async () => {
  const canvas = await readFile(new URL("app/AtlasVolumeCanvas.tsx", root), "utf8");
  assert.match(canvas, /w=el\.clientWidth,h=el\.clientHeight;if\(w<1\|\|h<1\)return;el\.width=/);
});

test("accepts legacy meshes whose header stores triangle index count", async () => {
  const [canvas, mesh] = await Promise.all([
    readFile(new URL("app/AtlasVolumeCanvas.tsx", root), "utf8"),
    readFile(new URL("public/atlas/section-accumbens.mesh", root)),
  ]);
  const vertices = mesh.readUInt32LE(4);
  const declaredFaces = mesh.readUInt32LE(8);
  const faceOffset = 12 + vertices * 28;
  const storedFaces = (mesh.length - faceOffset) / 12;
  assert.equal(declaredFaces, storedFaces * 3);
  assert.match(canvas, /declaredFaces===storedFaces\*3\?storedFaces/);
  assert.match(canvas, /face count does not match mesh length/);
});

test("free observation offers schematic pathway presets instead of textbook chapters", async () => {
  const [page, css] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/canvas.css", root), "utf8"),
  ]);
  assert.match(page, /visual:\{name:"視覚路"/);
  assert.match(page, /papez:\{name:"Papez回路"/);
  assert.match(page, /"basal-ganglia":\{name:"大脳基底核回路"/);
  assert.match(page, /経路観察（試作）/);
  assert.match(page, /線維の全経路、核内結合、興奮性／抑制性、個体差は再現していません/);
  assert.match(page, /selectionMeshLayers=\{surfaceView==="free"\?freePathwayMeshLayers:\[\]\}/);
  assert.match(css, /\.pathwayPresets/);
});

test("quiz mistakes link back to the exact study view", async () => {
  const [page, css] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/canvas.css", root), "utf8"),
  ]);
  assert.match(page, /const \[quizMisses,setQuizMisses\]=useState<QuizTargetKey\[]>\(\[\]\)/);
  assert.match(page, /function reviewQuizQuestion\(question:QuizQuestion\)/);
  assert.match(page, /setPlane\(question\.plane\);setPosition\(question\.position\);setVisibleStructures\(\[question\.target\]\)/);
  assert.match(page, /className="quizReviewTargets" aria-label="今回間違えた構造"/);
  assert.match(page, /観察画面で復習/);
  assert.match(page, /labelSourceDisplay\[sectionQuizTarget\.labelSource\]\.label/);
  assert.match(css, /\.quizReviewTargets/);
});

test("section quiz slices can be stepped without dragging the range control", async () => {
  const [page, css] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/canvas.css", root), "utf8"),
  ]);
  assert.match(page, /aria-label="1断面戻る"/);
  assert.match(page, /Math\.max\(0,value-1\)/);
  assert.match(page, /aria-label="1断面進む"/);
  assert.match(page, /Math\.min\(100,value\+1\)/);
  assert.match(css, /\.quizSliceControl\s*\{[^}]*grid-template-columns:\s*32px minmax\(0,1fr\) 32px/);
});

test("publishes beta-candidate changes and known limitations", async () => {
  const [readme, limitations, changelog] = await Promise.all([
    readFile(new URL("README.md", root), "utf8"),
    readFile(new URL("KNOWN_LIMITATIONS.md", root), "utf8"),
    readFile(new URL("CHANGELOG.md", root), "utf8"),
  ]);
  assert.match(readme, /\[KNOWN_LIMITATIONS\.md\]\(KNOWN_LIMITATIONS\.md\)/);
  assert.match(readme, /\[CHANGELOG\.md\]\(CHANGELOG\.md\)/);
  assert.match(limitations, /専門家による確認を意味しません/);
  assert.match(limitations, /実機スマートフォン/);
  assert.match(limitations, /診断、治療、手術計画、研究用の定量解析には使用できません/);
  assert.match(changelog, /Unreleased — β候補/);
  assert.match(changelog, /大脳基底核の一括選択/);
  assert.doesNotMatch(limitations, /冠状断・矢状断は同じラベルを照合する編集表示をまだ備えていません/);
  assert.match(limitations, /冠状断・矢状断には同じ交点、選択ラベル、未保存差分を同期表示できます/);
});

test("classifies every lecture target without treating schematic content as validated", async () => {
  const [roadmap, coverage] = await Promise.all([
    readFile(new URL("BETA_ROADMAP.md", root), "utf8"),
    readFile(new URL("LECTURE_COVERAGE_AUDIT.md", root), "utf8"),
  ]);
  for(const classification of ["標本分節","試作分節","アトラス脳表","模式3D","位置目安","表記のみ","未収録"])assert.match(coverage,new RegExp(`\\| ${classification} \\|`));
  assert.match(coverage,/2021年神経解剖学講義・課題スケッチ全6ファイル/);
  assert.match(coverage,/構造境界の専門家確認を完了した記録ではありません/);
  assert.match(roadmap,/\[x\] 講義資料の必修構造を再照合し、未収録と模式表示を区別する/);
});

test("packages expert anatomy review as reproducible screen-level decisions", async () => {
  const [review, provenance, readme, page, css, targets] = await Promise.all([
    readFile(new URL("EXPERT_REVIEW_CHECKLIST.md", root), "utf8"),
    readFile(new URL("STRUCTURE_PROVENANCE.md", root), "utf8"),
    readFile(new URL("README.md", root), "utf8"),
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/canvas.css", root), "utf8"),
    readFile(new URL("app/expert-review-targets.json", root), "utf8").then(JSON.parse),
  ]);
  for (const route of [
    "#workspace/surface/lateral", "#workspace/surface/superior", "#workspace/surface/inferior",
    "#workspace/surface/medial", "#workspace/surface/arteries", "#workspace/surface/nerves",
    "#workspace/sections/coronal", "#workspace/sections/horizontal", "#workspace/sections/sagittal",
    "#workspace/blocks/lateral-ventricle", "#workspace/blocks/radiations",
    "#workspace/blocks/choroid-plexus", "#workspace/blocks/medial-temporal",
  ]) assert.ok(review.includes(route), route);
  assert.match(review, /採用可.*注意書き付きで採用可.*要修正.*判定保留/);
  assert.match(review, /位置、範囲、左右、連続性、表面からの可視性/);
  assert.match(review, /第三者の教科書・講義・標本画像を含めず/);
  assert.match(provenance, /EXPERT_REVIEW_CHECKLIST\.md/);
  assert.match(readme, /EXPERT_REVIEW_CHECKLIST\.md/);
  assert.equal(targets.length,19);
  assert.equal(new Set(targets.map(target=>target.id)).size,19);
  assert.match(page,/get\("review"\)/);
  assert.match(page,/format:"brain-practical-expert-review"/);
  assert.match(page,/version:2/);
  assert.match(page,/正式記録は公開候補HTTPS/);
  assert.match(page,/\^\[0-9a-f\]\{40\}\$/);
  assert.match(page,/根拠URL <b>必須/);
  assert.match(page,/スクリーンショット名 <b>必須/);
  assert.match(page,/入力はこの端末の画面内だけで保持され、自動保存・送信されません/);
  assert.match(page,/検証用JSONを書き出す/);
  assert.match(page,/未書き出しの入力があります/);
  assert.match(page,/入力を続ける/);
  assert.match(page,/破棄して移動/);
  assert.match(page,/レビュー票へ戻る/);
  assert.match(page,/reviewCollapseMobile">観察へ/);
  assert.match(css,/\.expertReviewPanel\{position:fixed/);
  assert.match(css,/@media\(max-width:760px\)[\s\S]*\.expertReviewPanel\{top:auto;left:8px/);
  assert.match(css,/\.reviewCollapseMobile\{display:none\}[\s\S]*@media\(max-width:760px\)[\s\S]*\.reviewCollapseMobile\{display:inline\}/);
  const audit=spawnSync(process.execPath,[localPath("scripts/audit_expert_review_targets.mjs")],{encoding:"utf8",cwd:localPath(".")});
  assert.equal(audit.status,0,audit.stderr);
  assert.match(audit.stdout,/PASS\texpert review target audit complete/);
  const validation=spawnSync(process.execPath,[localPath("scripts/validate_expert_review_record.mjs"),localPath("tests/fixtures/expert-review-record-smoke.json")],{encoding:"utf8",cwd:localPath(".")});
  assert.equal(validation.status,0,validation.stderr);
  assert.match(validation.stdout,/PASS\texpert review record v2 is structurally valid/);
  const incomplete=spawnSync(process.execPath,[localPath("scripts/validate_expert_review_record.mjs"),localPath("tests/fixtures/expert-review-record-incomplete.json")],{encoding:"utf8",cwd:localPath(".")});
  assert.notEqual(incomplete.status,0);
  assert.match(incomplete.stderr,/expected version 2/);
  assert.match(incomplete.stderr,/complete canonical registry entry/);
  assert.match(incomplete.stderr,/full 40-digit Git SHA/);
  assert.match(incomplete.stderr,/at least one public HTTPS URL/);
  assert.match(incomplete.stderr,/public review base/);
  assert.match(incomplete.stderr,/bind the target ID, full commit, and canonical route/);
  assert.match(incomplete.stderr,/image filename without directories/);
});

test("requires complete, single-commit expert review coverage before Gate 9 evidence can pass", async () => {
  const targets=JSON.parse(await readFile(new URL("app/expert-review-targets.json",root),"utf8"));
  const fixture=JSON.parse(await readFile(new URL("tests/fixtures/expert-review-record-smoke.json",root),"utf8"));
  const directory=await mkdtemp(join(tmpdir(),"brain-practical-expert-review-"));
  try{
    for(const target of targets){
      const record={...fixture,target,decision:"採用可",reviewer:{name:"Bundle Fixture",affiliation:"Automated test only",expertise:"神経解剖学 schema fixture"},reason:`${target.id} automated bundle fixture only; not an anatomical decision.`,screenshotName:`${target.id}-app-only.png`,appUrl:`https://bonnginn.github.io/brain-practical-navi/?review=${target.id}&commit=${fixture.targetCommit}${target.route}`};
      await writeFile(join(directory,`${target.id}.json`),`${JSON.stringify(record,null,2)}\n`);
    }
    const complete=spawnSync(process.execPath,[localPath("scripts/validate_expert_review_bundle.mjs"),directory],{encoding:"utf8",cwd:localPath(".")});
    assert.equal(complete.status,0,complete.stderr);
    assert.match(complete.stdout,/PASS\t19\/19 canonical targets reviewed/);
    assert.match(complete.stdout,/declared neuroanatomy expertise/);
    await unlink(join(directory,"D5.json"));
    const missing=spawnSync(process.execPath,[localPath("scripts/validate_expert_review_bundle.mjs"),directory],{encoding:"utf8",cwd:localPath(".")});
    assert.notEqual(missing.status,0);
    assert.match(missing.stderr,/missing canonical targets: D5/);
  }finally{await rm(directory,{recursive:true,force:true})}
});

test("keeps the internal capsule distinct from adjacent basal nuclei", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  const colour = key => {
    const match = page.match(new RegExp(`${key}: \\{[^\\n]+color:\\s*\"(#[0-9a-f]{6})\"`));
    assert.ok(match, `${key} colour`);
    return match[1];
  };
  const rgb = hex => [1, 3, 5].map(index => Number.parseInt(hex.slice(index, index + 2), 16));
  const distance = (left, right) => Math.hypot(...rgb(left).map((value, index) => value - rgb(right)[index]));
  const internalCapsule = colour("internalCapsule");
  for (const neighbour of ["caudate", "putamen", "pallidumExternal", "pallidumInternal", "thalamus"]) {
    assert.ok(distance(internalCapsule, colour(neighbour)) >= 60, `internal capsule versus ${neighbour}`);
  }
  assert.match(page, /key:"internal-capsule"[^\n]+color:"#e3d8b0"/);
});

test("aggregates every local beta audit without converting external waits into passes", async () => {
  const script=await readFile(new URL("scripts/audit_beta_candidate.mjs",root),"utf8");
  for(const audit of ["audit_asset_budgets","audit_section_continuity","audit_deep_relations","audit_structure_provenance","audit_specimen_relations","audit_basal_neurovascular_relations","audit_surface_relations","audit_model_comparison","audit_expert_review_targets","audit_quiz_review_ledger"])assert.match(script,new RegExp(audit));
  assert.match(script,/release remains No-Go/);
  assert.match(script,/WAIT \$\{row\.status\}/);
  const result=spawnSync(process.execPath,[localPath("scripts/audit_beta_candidate.mjs")],{encoding:"utf8",cwd:localPath("."),maxBuffer:10*1024*1024});
  assert.equal(result.status,0,result.stderr);
  assert.match(result.stdout,/SUMMARY\t3 local gates passed; 7 external-evidence gates remain/);
  assert.match(result.stdout,/PASS\tbeta-candidate local audits complete; release remains No-Go/);
});

test("keeps the Windows handoff at the current beta-candidate gate instead of historical milestones", async () => {
  const handoff=await readFile(new URL("WINDOWS_HANDOFF.md",root),"utf8");
  assert.match(handoff,/対象ブランチ: `codex\/beta-candidate`/);
  assert.match(handoff,/自動テスト: 82件全件合格/);
  assert.match(handoff,/`npm run audit:beta`/);
  assert.match(handoff,/ローカル合格3条件、外部証拠待ち7条件/);
  assert.match(handoff,/No-Go（β候補のローカル検証中）/);
  assert.match(handoff,/未pushならremoteの同名ブランチだけでは現在状態を再現できません/);
  assert.match(handoff,/実スマートフォン1台以上/);
  assert.match(handoff,/少なくとも1名の専門家を含む19\/19のv2記名JSON/);
  assert.doesNotMatch(handoff,/9c1a962|自動テスト \*\*40件\*\*|Mac側で残した未着手事項|現在の検証基準は\d+\/\d+/);
});
