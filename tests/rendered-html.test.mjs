import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import test from "node:test";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

const root = new URL("../", import.meta.url);
const localPath = (path) => fileURLToPath(new URL(path, root));

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
  assert.match(canvasCss, /\.legalButton, \.feedbackButton\s*\{\s*font-size:\s*13px/);
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
  assert.match(page, /blockIntroOpen&&<section className="workArea blockIntroPage"/);
  assert.match(page, /ブロック標本は試作中です/);
  assert.match(page, /形状・範囲・接続関係の完全性や解剖学的正確性は保証しません/);
  assert.match(page, /Cloudflare Web Analytics/);
  assert.match(page, /Cookieを使用せず、訪問者の個人データを収集・利用しません/);
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
  assert.match(page, /両岸の間を仮想的な色面で埋めて表示しています/);
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
  assert.match(page, /useState<"both"\|"slice"\|"model">\("both"\)/);
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
  assert.match(page, /if\(key==="arteries"\)\{setSurfaceVessels\(true\);setSurfaceNerves\(true\);setSurfaceCerebellum\(false\)/);
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
    "landmark-olfactory-pathway.mesh",
    "landmark-infundibulum.mesh",
    "landmark-mammillary-bodies.mesh",
    "landmark-anterior-perforated-substance.mesh",
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
  assert.match(page, /両岸の間を仮想的な色面で埋めて表示しています/);
  assert.match(canvas, /SURFACE_LANDMARKS/);
  assert.match(canvas, /surface-landmark-\$\{item\.key\}/);
  assert.match(canvas, /SURFACE_BOUNDARY_LABELS/);
  assert.match(canvas, /surfaceBoundaryMesh/);
  assert.match(canvas, /surfaceLevelMesh/);
  assert.match(canvas, /surfaceRegionUpperRimMesh/);
  assert.match(canvas, /surfaceRegionUpperRimMesh\(part,\[96,45\],2\.05,\.9\)/);
  assert.match(canvas, /for\(let anteriorPosterior=36;anteriorPosterior>=-24;anteriorPosterior-=2\)/);
  assert.match(canvas, /anteriorExpansion=Math\.max\(0,Math\.min\(1,\(midAnteriorPosterior\+4\)\/32\)\)/);
  assert.match(canvas, /definition\.key==="longitudinal-fissure"\)draw\(landmarks\[index\]/);
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
    readFile(new URL("public/atlas/pial-left.mesh", root)),
    readFile(new URL("public/atlas/pial-right.mesh", root)),
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
  assert.equal(Object.values(metadata.specimens).reduce((total, parts) => total + parts.length, 0), 57);
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
  assert.match(canvas, /\[kind,specimenBlock,view,neurovascularOverlay,showBasalLandmarks,surfaceLandmarkKey,surfaceDeepLandmarkKey,retryVersion\]/);
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
  assert.match(page, /useState<QuizQuestion\[\]>\(\(\)=>shuffledQuestions\(quizQuestions\)\.slice\(0,10\)\)/);
});

test("medial surface quiz keeps the same isolated-hemisphere anatomy as study mode", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  assert.match(page, /showCerebellum=\{quizQuestion\.view!=="medial"\}/);
  assert.match(page, /showPonsMedulla=\{quizQuestion\.view!=="medial"\}/);
  assert.match(page, /showMidbrain=\{quizQuestion\.view!=="medial"\}/);
});

test("feedback and credit dialogs have durable shareable URLs", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  assert.match(page, /type OverlayMode = "feedback" \| "legal"/);
  assert.match(page, /function overlayFromHash\(hash:string\):OverlayMode\|null/);
  assert.match(page, /overlayFromHash\(window\.location\.hash\)==="feedback"/);
  assert.match(page, /overlayFromHash\(window\.location\.hash\)==="legal"/);
  assert.match(page, /window\.history\.pushState\(null,"",`#workspace\/\$\{key\}`\)/);
  assert.match(page, /onClick=\{\(\)=>openOverlay\("feedback"\)\}/);
  assert.match(page, /onClick=\{\(\)=>openOverlay\("legal"\)\}/);
  assert.match(page, /document\.body\.style\.overflow="hidden"/);
  assert.match(page, /document\.querySelector<HTMLButtonElement>\('\.legalDialog header button'\)\?\.focus\(\)/);
  assert.match(page, /overlayReturnFocus\.current\?\.focus\(\)/);
  assert.match(page, /event\.shiftKey&&document\.activeElement===first/);
  assert.match(page, /!event\.shiftKey&&document\.activeElement===last/);
  assert.match(page, /onClick=\{closeOverlay\} aria-label="意見募集を閉じる"/);
  assert.match(page, /onClick=\{closeOverlay\} aria-label="利用条件とクレジット表示を閉じる"/);
});

test("complex workspaces expose visible keyboard focus and a main-content shortcut", async () => {
  const [page, css, editor] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/canvas.css", root), "utf8"),
    readFile(new URL("app/ManualSegmentationWorkbench.tsx", root), "utf8"),
  ]);
  assert.match(page, /className="skipLink" onClick=\{\(\)=>document\.getElementById\("workspace"\)\?\.focus\(\)\}/);
  assert.equal((page.match(/id="workspace" tabIndex=\{-1\}/g) ?? []).length, 7);
  assert.match(page, /workspace==="blocks"&&blockIntroOpen/);
  assert.match(page, /workspace==="blocks"&&!blockIntroOpen/);
  assert.ok((page.match(/aria-current=\{/g) ?? []).length >= 4);
  assert.match(page, /role="group" aria-label="構造グループの一括表示"/);
  assert.match(css, /:focus-visible \{ outline: 3px solid #e36e57/);
  assert.match(css, /\.skipLink:focus-visible \{ top: 8px; \}/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(editor, /aria-label="差分JSONファイルを選択"/);
});

test("narrow layouts keep destination rails and full workflow panels distinct", async () => {
  const [page, css] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/canvas.css", root), "utf8"),
  ]);
  assert.match(page, /appShell workspace-\$\{workspace\}/);
  assert.match(page, /aria-label="意見・共同制作を表示"/);
  assert.match(css, /\.leftRail \.lessonRailBtn\{min-width:136px;display:grid/);
  assert.match(css, /\.leftRail \.planeBtn small\{display:none\}/);
  assert.doesNotMatch(page, /landmarks\.map\(mark/);
  assert.match(css, /\.workspace-quiz \.leftRail,/);
  assert.match(css, /\.workspace-segment \.leftRail\{position:static/);
  assert.match(css, /\.workspace-quiz \.quizSetup\{margin:10px 0 0\}/);
  assert.match(css, /@media\(max-width:380px\)\{\.learningModelCard \.panelHead\{min-width:0;flex-wrap:wrap/);
});

test("ships a reproducible Google Form generator for feedback and collaborators", async () => {
  const [script, guide] = await Promise.all([
    readFile(new URL("scripts/create_google_feedback_form.gs", root), "utf8"),
    readFile(new URL("ALPHA_FEEDBACK.md", root), "utf8"),
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
