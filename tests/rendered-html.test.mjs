import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
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
  assert.deepEqual(metadata.imageGuidedReviewedIds, [39, 40]);
  for (const id of Array.from({ length: 35 }, (_, index) => index + 1)) {
    assert.ok(metadata.labelCounts[id] > 0, `label ${id} must contain voxels`);
  }
  const values = labels.payload.subarray(10);
  let leftMammillary=0,rightMammillary=0;
  for(const value of values){if(value===39)leftMammillary++;else if(value===40)rightMammillary++}
  assert.equal(leftMammillary, 561);
  assert.equal(rightMammillary, 729);
  assert.equal(metadata.labelCounts[39], 561);
  assert.equal(metadata.labelCounts[40], 729);
  assert.equal(metadata.reviewedPatchAudit.editCount, 1290);
  assert.equal(metadata.ventricleLabelsRestrictedToEmptySpace, true);
  assert.equal(metadata.ventricleTissueOverlap, 0);
  assert.match(metadata.coordinatePolicy, /exact BigBrain ICBM2009sym 0\.5 mm output grid/);
  assert.match(metadata.teachingPolicy, /provisional teaching overlays/);
});

test("keeps reviewed section structures colourable and withholds the unsplit optic scaffold", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  const expected = [
    "ventricle", "thirdVentricle", "fourthVentricle", "corpusCallosum", "internalCapsule",
    "caudate", "putamen", "pallidumExternal", "pallidumInternal", "pallidum", "thalamus",
    "hippocampus", "amygdala", "accumbens", "redNucleus", "substantiaNigra", "subthalamic",
    "brainstem", "cerebellum", "mammillaryBody", "insula",
  ];
  for (const key of expected) {
    assert.match(page, new RegExp(`\\n  ${key}: \\{[^\\n]+bigbrainIds:\\[[^\\]]+\\]`), `${key} BigBrain labels`);
  }
  assert.match(page, /opticChiasm:[^\n]+bigbrainIds:\[33\]/);
  assert.match(page, /opticChiasm: \{ name:"視交叉〜視索候補"/);
  assert.match(page, /視交叉だけの境界や乳頭体の分節を示すものではありません/);
  assert.match(page, /filter\(key=>key!=="opticChiasm"\)/);
  assert.doesNotMatch(page, /\{target:"opticChiasm",category:/);
  assert.match(page, /insula:[^\n]+bigbrainIds:\[34,35\]/);
  assert.match(page, /mammillaryBody:[^\n]+bigbrainIds:\[39,40\]/);
  assert.match(page, /mammillaryBody:[^\n]+labelSource:"image-guided-reviewed"/);
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

  const homeNotice = page.slice(page.indexOf('className="homeNotice"'), page.indexOf('{workspace==="sections"&&<section'));
  assert.match(homeNotice, /教育目的で教材を開く/);
  assert.match(homeNotice, /教育目的以外での利用はお控えください/);
  assert.doesNotMatch(homeNotice, /home-surface-preview\.png/);
  assert.doesNotMatch(homeNotice, /AtlasVolumeCanvas/);
  assert.doesNotMatch(page, /homeMetrics|日本語で|<i>0[1-4]<\/i>/);
  assert.doesNotMatch(page, /homeActions|脳表観察から始める|断面実習を見る/);
  assert.match(main, /import "\.\.\/app\/globals\.css"/);
  assert.match(main, /import "\.\.\/app\/canvas\.css"/);

  assert.match(canvasCss, /\.homeLead\s*\{[^}]*font-size:\s*clamp\(14px,1\.2vw,17px\)/);
  assert.match(canvasCss, /\.workspaceSwitch button > span\s*\{\s*font-size:\s*14px/);
  assert.match(canvasCss, /\.workspaceSwitch button > i\s*\{\s*font:\s*11px\/1\.2 monospace/);
  assert.match(canvasCss, /\.legalButton, \.feedbackButton, \.helpButton\s*\{\s*font-size:\s*13px/);
  assert.match(page, /aria-label="利用条件・クレジットを表示">利用条件<\/button>/);
  assert.match(globalsCss, /font-family/);
  assert.doesNotMatch(`${canvas}\n${editor}`, /font="(?:7|8|9|10|11|12|13)px/);
});

test("ships the learning workspaces, contributor editor, and public data notice", async () => {
  const [page, canvas, canvasCss, editor, patchMetadata, workflow, readme, licenses, attribution, packageJson, softwareLicense, licenseMap, governance] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/AtlasVolumeCanvas.tsx", root), "utf8"),
    readFile(new URL("app/canvas.css", root), "utf8"),
    readFile(new URL("app/ManualSegmentationWorkbench.tsx", root), "utf8"),
    readFile(new URL("app/segmentationPatchMetadata.ts", root), "utf8"),
    readFile(new URL("SEGMENTATION_WORKFLOW.md", root), "utf8"),
    readFile(new URL("README.md", root), "utf8"),
    readFile(new URL("DATA_AND_LICENSES.md", root), "utf8"),
    readFile(new URL("public/atlas/ATTRIBUTION.txt", root), "utf8"),
    readFile(new URL("package.json", root), "utf8"),
    readFile(new URL("LICENSE", root), "utf8"),
    readFile(new URL("LICENSES.md", root), "utf8"),
    readFile(new URL("GOVERNANCE.md", root), "utf8"),
  ]);

  for (const label of ["Home", "断面実習", "脳表観察", "ブロック標本", "脳底動脈", "脳神経・脳幹", "復習クイズ", "セグメンテーション編集", "利用条件・クレジット", "共同制作"]) {
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
  assert.match(page, /PUBLIC ALPHA · EDUCATIONAL USE ONLY/);
  assert.match(page, /className="homeNotice"/);
  assert.match(page, /教育目的以外での利用はお控えください/);
  assert.match(page, /教科書や検証済み資料と照合して利用してください/);
  assert.doesNotMatch(page, /脳実習を、|切る前から立体で。|className="homeModelStage"/);
  const homeStart = page.indexOf('{workspace==="home"&&<section');
  const homeWorkspace = page.slice(homeStart, page.indexOf('{workspace==="sections"&&<section', homeStart));
  assert.doesNotMatch(homeWorkspace, /稲葉弘哲|稲葉 弘哲|運営上の位置づけ|個人運営・非公式|三重大学/);
  assert.match(homeWorkspace, /神経解剖学の教育・自主学習目的/);
  assert.match(homeWorkspace, /診断、治療、手術計画、定量研究のためには使用できません/);
  assert.match(page, /特定の教育機関・部局の公式教材、公式見解、内容の承認を示すものではありません/);
  assert.match(page, /className="projectIndependence"/);
  assert.match(page, /提供者は死後組織の研究・教育目的の一般利用に書面同意/);
  assert.match(page, /Heinrich Heine University Düsseldorf医学部倫理委員会の承認（#4863）/);
  assert.match(page, /https:\/\/bigbrainproject\.org\/about\.html/);
  assert.match(page, /試作中・解剖学的正確性は未保証/);
  assert.match(page, /ブロック標本（試作中）/);
  assert.match(page, /key:"blocks",label:"ブロック標本",sub:"試作品"/);
  assert.match(page, /blockIntroOpen&&<section className="workArea blockIntroPage"/);
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
  assert.match(canvasCss, /\.quizImageStage\.modelStage\s*\{[^}]*height:\s*auto/);
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
  assert.match(page, /className=\{`insetViews \$\{webglUnavailable\?"webglUnavailable":""\}`\}/);
  assert.match(page, /"90°直交"/);
  assert.match(page, /const sectionSelectionMeshLayers=activeVisibleStructures\.flatMap/);
  assert.match(page, /selectionMeshLayers=\{sectionSelectionMeshLayers\}/);
  assert.doesNotMatch(page, /className="modelFocusTag"/);
  assert.match(page, /accumbens:\["section-accumbens"\]/);
  assert.match(page, /opticChiasm:\["section-optic-chiasm"\],insula:\["section-insula"\]/);
  assert.match(page, /basalLandmarkKeys\.filter\(key=>key!=="olfactory"&&key!=="optic"\)/);
  assert.doesNotMatch(page, /setBlock\("inside"\)\}\}>脳表<\/button>/);
  assert.match(canvas, /selectionMeshLayers=\[\]/);
  assert.match(canvas, /if\(showFocus&&selectionLayers\.length\)/);
  assert.match(canvas, /selectionLayers\.forEach\(layer=>layer\.meshes\.forEach/);
  assert.match(canvasCss, /\.insetViews \{[^}]*grid-template-rows: repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(canvasCss, /\.sliceStage\.layout-model \.insetViews \{ grid-template-columns: repeat\(2,minmax\(0,1fr\)\); grid-template-rows: minmax\(0,1fr\); \}/);
  assert.match(page, /const sectionDeveloperControls=\(import\.meta\.env\.VITE_SECTION_DEVELOPER_CONTROLS as string\|undefined\)==="true"/);
  assert.match(page, /位置 \{position\}・BigBrain公開組織画像 0\.5 mm（表示用再標本化・同一格子で検証済み）・実習標本調/);
  assert.match(page, /BigBrain公開組織画像 0\.5 mm/);
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
  assert.match(canvas, /else if\(!basalOnlySelected&&basalLandmark==="all"\)draw\(deep\[4\],teachingColor\(neutral\),0\)/);
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
  assert.match(editor, />\{planeInfo\.increment\}へ1枚<\/button>/);
  assert.match(editor, />\{planeInfo\.decrement\}へ1枚<\/button>/);
  assert.match(editor, /step=\{data\?100\/\(data\.dims\[2\]-1\):\.25\}/);
  assert.match(editor, /元へ戻す/);
  assert.match(editor, /端末内へ自動保存/);
  assert.match(editor, /segmentationPatchMetadata/);
  assert.match(patchMetadata, /workflowMetadataVersion:1/);
  assert.match(patchMetadata, /targetStructures/);
  assert.match(patchMetadata, /sliceRanges/);
  assert.match(patchMetadata, /changeSummary/);
  assert.match(patchMetadata, /review:\{decision:"unreviewed",reviewer:null,decidedAt:null,reason:"",pullRequest:null\}/);
  assert.doesNotMatch(editor, /reviewer\s*=/);
  assert.match(editor, /対象側/);
  assert.match(editor, /根拠資料・参照箇所/);
  assert.match(editor, /確認状態[\s\S]*未レビュー/);
  assert.match(workflow, /Pull Requestに必要な情報/);
  assert.match(workflow, /`reviewStatus`[\s\S]*`unreviewed`/);
  assert.match(workflow, /apply_segmentation_patch\.py/);
  assert.match(workflow, /workflowMetadataVersion/);
  assert.equal(JSON.parse(packageJson).version, "0.1.0-alpha.1");
  assert.equal(JSON.parse(packageJson).license, "AGPL-3.0-or-later");
  assert.match(softwareLicense, /GNU AFFERO GENERAL PUBLIC LICENSE/);
  assert.match(softwareLicense, /13\. Remote Network Interaction/);
  assert.match(softwareLicense, /END OF TERMS AND CONDITIONS/);
  assert.match(attribution, /BigBrain/);
});

test("documents strict patch metadata and review decisions without reviewer input in the student editor", async () => {
  const [template, workflow, roadmap, editor, patchMetadata] = await Promise.all([
    readFile(new URL(".github/PULL_REQUEST_TEMPLATE.md", root), "utf8"),
    readFile(new URL("SEGMENTATION_WORKFLOW.md", root), "utf8"),
    readFile(new URL("BETA_ROADMAP.md", root), "utf8"),
    readFile(new URL("app/ManualSegmentationWorkbench.tsx", root), "utf8"),
    readFile(new URL("app/segmentationPatchMetadata.ts", root), "utf8"),
  ]);
  assert.match(template, /元ラベルSHA-256/);
  assert.match(template, /targetStructures.*sliceRanges.*changeSummary/s);
  assert.match(template, /review\.decision/);
  assert.match(template, /差戻し理由/);
  assert.match(workflow, /legacy\+missing fields/);
  assert.match(workflow, /approved.*--output/s);
  assert.match(roadmap, /- \[x\] 現在の水平断エディタ/);
  assert.match(roadmap, /workflowMetadataVersion/);
  assert.match(patchMetadata, /CANONICAL_SOURCE_IMAGE="\/atlas\/bigbrain-icbm500\.bin\.gz"/);
  assert.match(patchMetadata, /CANONICAL_SOURCE_LABELS="\/atlas\/bigbrain-practical-segmentation-icbm500\.bin\.gz"/);
  assert.doesNotMatch(editor, /reviewer\s*=/);
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

test("separates private feedback, public discussion, and pull requests", async () => {
  const [page, feedback, contributing] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("ALPHA_FEEDBACK.md", root), "utf8"),
    readFile(new URL("CONTRIBUTING.md", root), "utf8"),
  ]);
  assert.match(page, /非公開・匿名[\s\S]*Google Formを開く/);
  assert.match(page, /公開相談[\s\S]*GitHub Issuesを開く/);
  assert.match(page, /具体的な変更[\s\S]*CONTRIBUTINGを読む/);
  assert.match(page, /解剖監修[\s\S]*教育設計[\s\S]*セグメンテーション[\s\S]*3D制作[\s\S]*Web開発/);
  assert.match(feedback, /ログインしていないブラウザ[\s\S]*3\/3ページの送信ボタン/);
  assert.match(feedback, /Google Forms側にも回答が残る/);
  assert.match(feedback, /回答を実際に作成・削除する一往復試験は/);
  assert.match(contributing, /改善への効果を累積してクレジット/);
});

test("keeps student navigation separate and records only screen-level history", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  const modeList = page.slice(page.indexOf("const workspaceModes"), page.indexOf("const workspaceModeKeys"));
  for (const key of ["home", "surface", "sections", "blocks", "quiz"]) assert.match(modeList, new RegExp(`key:\"${key}\"`));
  assert.doesNotMatch(modeList, /key:"segment"|key:"collaborate"/);
  assert.match(page, /workspaceModeKeys:WorkspaceMode\[\]=\[\.\.\.workspaceModes\.map\(item=>item\.key\),"collaborate","segment"\]/);
  assert.match(page, /function updateScreenHistory\(nextHash:string,mode:"push"\|"replace"\|"none"="push"\)/);
  assert.match(page, /function jump\(nextPlane: Plane, nextPosition\?: number,historyMode:"push"\|"replace"\|"none"="push"\)/);
  assert.match(page, /chooseSurface\(surfaceViewFromHash\(window\.location\.hash\),"none"\)/);
  assert.match(page, /jump\(planeFromHash\(window\.location\.hash\),52,"none"\)/);
  assert.match(page, /chooseBlock\(blockSpecimenFromHash\(window\.location\.hash\),"none"\)/);
  assert.doesNotMatch(page, /setPosition\([^)]*\)[^\n]*pushState/);
  assert.doesNotMatch(page, /setRotation\([^\n]*pushState/);
});

test("normalizes Japanese readings for free-observation partial search", async () => {
  const [page, search] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("src/japaneseSearch.ts", root), "utf8"),
  ]);
  assert.match(search, /KATAKANA_TO_HIRAGANA_OFFSET = 0x60/);
  assert.match(search, /"region:precentral":\s*\["ちゅうしんぜんかい"/);
  assert.match(search, /central-sulcus[^\n]+ちゅうしんこう/);
  assert.match(search, /deep:thalami[^\n]+ししょう/);
  assert.match(search, /normalizeJapaneseSearch\(value \?\? ""\)\.includes\(normalizedQuery\)/);
  assert.match(page, /freeObservationReadings\[item\.key\]/);
  assert.match(page, /item\.name,item\.latin,item\.kind,item\.source/);
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
  assert.equal(audit.workflowMetadataStatus, "legacy+missing fields");
  assert.match(result.stderr, /legacy/i);
});

test("strict patch metadata is independently validated and only approved patches can produce output", async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), "brain-patch-metadata-"));
  const runCheck = (patchPath, extra=[]) => spawnSync(python.command, [...python.prefix,
    localPath("scripts/apply_segmentation_patch.py"), patchPath,
    "--input", localPath("public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz"),
    "--check", ...extra,
  ], {encoding:"utf8"});
  try {
    const strictPath = localPath("tests/fixtures/segmentation-patch-strict.json");
    const strictResult = runCheck(strictPath);
    assert.equal(strictResult.status, 0, strictResult.stderr);
    const strictAudit = JSON.parse(strictResult.stdout);
    assert.equal(strictAudit.workflowMetadataStatus, "strict");
    assert.deepEqual(strictAudit.targetStructures, [{id:1,name:"左赤核"}]);
    assert.deepEqual(strictAudit.sliceRanges, [{plane:"horizontal",axis:"Z",min:0,max:0}]);
    assert.deepEqual(strictAudit.changeSummary, {changedVoxelCount:1,unchangedVoxelCount:0,transitions:[{from:0,to:1,voxels:1}]});

    const base = JSON.parse(await readFile(strictPath, "utf8"));
    for (const [name, mutate] of [
      ["target", patch => {patch.targetStructures[0].name="改ざん";}],
      ["range", patch => {patch.sliceRanges[0].min=1;}],
      ["summary", patch => {patch.changeSummary.changedVoxelCount=2;}],
      ["source-image", patch => {patch.sourceImage="/brain-practical-navi/atlas/bigbrain-icbm500.bin.gz";}],
      ["target-side", patch => {patch.targetSide="diagonal";}],
      ["confidence", patch => {patch.confidence="certain";}],
      ["evidence", patch => {patch.evidence="   ";}],
      ["empty", patch => {patch.runs=[];patch.editCount=0;patch.targetStructures=[];patch.sliceRanges=[];patch.changeSummary={changedVoxelCount:0,unchangedVoxelCount:0,transitions:[]};}],
    ]) {
      const path = join(tempRoot, `${name}.json`);
      const tampered = structuredClone(base);
      mutate(tampered);
      await writeFile(path, JSON.stringify(tampered));
      const result = runCheck(path);
      assert.notEqual(result.status, 0, `${name} metadata tampering must fail`);
    }

    const rejected = structuredClone(JSON.parse(await readFile(new URL("tests/fixtures/segmentation-patch-strict-approved.json", root), "utf8")));
    rejected.review.decision="rejected";
    rejected.review.reason="差戻し理由を記録したfixture";
    rejected.reviewStatus="rejected";
    const rejectedPath = join(tempRoot, "rejected.json");
    await writeFile(rejectedPath, JSON.stringify(rejected));
    const rejectedResult = runCheck(rejectedPath);
    assert.equal(rejectedResult.status, 0, rejectedResult.stderr);
    assert.equal(JSON.parse(rejectedResult.stdout).reviewStatus, "rejected");

    const approvedPath = localPath("tests/fixtures/segmentation-patch-strict-approved.json");
    const outputPath = join(tempRoot, "approved.bin.gz");
    const approvedResult = spawnSync(python.command, [...python.prefix,
      localPath("scripts/apply_segmentation_patch.py"), approvedPath,
      "--input", localPath("public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz"),
      "--output", outputPath,
    ], {encoding:"utf8"});
    assert.equal(approvedResult.status, 0, approvedResult.stderr);
    assert.deepEqual(readVolumeHeader(await readFile(outputPath), "BBS1").dims, [394,466,378]);
    const unreviewedOutput = spawnSync(python.command, [...python.prefix,
      localPath("scripts/apply_segmentation_patch.py"), strictPath,
      "--input", localPath("public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz"),
      "--output", join(tempRoot, "unreviewed.bin.gz"),
    ], {encoding:"utf8"});
    assert.notEqual(unreviewedOutput.status, 0);
    const legacyOutput = spawnSync(python.command, [...python.prefix,
      localPath("scripts/apply_segmentation_patch.py"), localPath("tests/fixtures/segmentation-patch-smoke.json"),
      "--input", localPath("public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz"),
      "--output", join(tempRoot, "legacy.bin.gz"),
    ], {encoding:"utf8"});
    assert.notEqual(legacyOutput.status, 0);
  } finally {
    await rm(tempRoot, {recursive:true, force:true});
  }
});

test("enforces the complete review decision matrix and rejects non-approved output", async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), "brain-review-matrix-"));
  const inputPath = localPath("public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz");
  const approvedFixture = JSON.parse(await readFile(new URL("tests/fixtures/segmentation-patch-strict-approved.json", root), "utf8"));
  const check = path => spawnSync(python.command, [...python.prefix,
    localPath("scripts/apply_segmentation_patch.py"), path, "--input", inputPath, "--check",
  ], {encoding:"utf8"});
  const write = async (name, mutate) => {
    const path = join(tempRoot, `${name}.json`);
    const patch = structuredClone(approvedFixture);
    mutate(patch);
    await writeFile(path, JSON.stringify(patch));
    return path;
  };
  try {
    for (const [name, mutate] of [
      ["unreviewed-reviewer", patch => {patch.review={decision:"unreviewed",reviewer:{kind:"github",id:"reviewer"},decidedAt:null,reason:"",pullRequest:null};patch.reviewStatus="unreviewed";}],
      ["approved-reviewer", patch => {patch.review.reviewer=null;}],
      ["approved-date", patch => {patch.review.decidedAt=null;}],
      ["approved-reason", patch => {patch.review.reason="";}],
      ["approved-pr", patch => {patch.review.pullRequest=null;}],
      ["rejected-reviewer", patch => {patch.review.decision="rejected";patch.reviewStatus="rejected";patch.review.reviewer=null;}],
      ["rejected-date", patch => {patch.review.decision="rejected";patch.reviewStatus="rejected";patch.review.decidedAt=null;}],
      ["rejected-reason", patch => {patch.review.decision="rejected";patch.reviewStatus="rejected";patch.review.reason="";}],
      ["rejected-pr", patch => {patch.review.decision="rejected";patch.reviewStatus="rejected";patch.review.pullRequest=null;}],
      ["status-mismatch", patch => {patch.reviewStatus="rejected";}],
      ["bad-date", patch => {patch.review.decidedAt="2026-02-30";}],
      ["bad-kind", patch => {patch.review.reviewer.kind="expert";}],
      ["bad-pr-number", patch => {patch.review.pullRequest.number=0;}],
      ["bad-merge-commit", patch => {patch.review.pullRequest.mergeCommit="abc";}],
    ]) {
      const result = check(await write(name, mutate));
      assert.notEqual(result.status, 0, `${name} must be rejected`);
    }
    const validCommit = await write("valid-merge-commit", patch => {patch.review.pullRequest.mergeCommit="0123456789abcdef0123456789abcdef01234567";});
    assert.equal(check(validCommit).status, 0);
    const rejected = await write("rejected-output", patch => {patch.review.decision="rejected";patch.reviewStatus="rejected";patch.review.reason="差戻し理由";});
    const output = spawnSync(python.command, [...python.prefix,
      localPath("scripts/apply_segmentation_patch.py"), rejected, "--input", inputPath,
      "--output", join(tempRoot, "rejected.bin.gz"),
    ], {encoding:"utf8"});
    assert.notEqual(output.status, 0);
  } finally {
    await rm(tempRoot, {recursive:true, force:true});
  }
});

test("migrates the three mammillary patches against the recorded pre-mammillary fixture", async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), "brain-mammillary-blob-"));
  try {
    const sourcePath = localPath("tests/fixtures/bigbrain-practical-segmentation-pre-mammillary-de30.bin.gz");
    const sourceBytes = await readFile(sourcePath);
    assert.equal(sourceBytes.length, 256380);
    assert.equal(createHash("sha256").update(sourceBytes).digest("hex"), "de30b5c77f4ed4f2902564a5d238b0e733413c247643ef828fb66aa03d8cc8be");
    const expected = {
      "mammillary-bodies-horizontal-sparse-2026-08-16.json": {editCount:311, reviewStatus:"unreviewed", transitions:[{from:0,to:39,voxels:71},{from:0,to:40,voxels:84},{from:27,to:39,voxels:10},{from:33,to:39,voxels:60},{from:33,to:40,voxels:86}]},
      "mammillary-bodies-horizontal-contiguous-core-candidate-2026-08-16.json": {editCount:1206, reviewStatus:"unreviewed", transitions:[{from:0,to:39,voxels:284},{from:0,to:40,voxels:391},{from:27,to:39,voxels:13},{from:33,to:39,voxels:220},{from:33,to:40,voxels:298}]},
      "mammillary-bodies-horizontal-core-plus-clear-rim-candidate-2026-08-16.json": {editCount:1290, reviewStatus:"approved", transitions:[{from:0,to:39,voxels:316},{from:0,to:40,voxels:426},{from:27,to:39,voxels:17},{from:33,to:39,voxels:228},{from:33,to:40,voxels:303}]},
    };
    for (const [name, expectedPatch] of Object.entries(expected)) {
      const path = localPath(`segmentation-patches/review/${name}`);
      const result = spawnSync(python.command, [...python.prefix,
        localPath("scripts/apply_segmentation_patch.py"), path,
        "--input", sourcePath, "--check",
      ], {encoding:"utf8"});
      assert.equal(result.status, 0, `${name}: ${result.stderr}`);
      const audit = JSON.parse(result.stdout);
      assert.equal(audit.inputSha256, "de30b5c77f4ed4f2902564a5d238b0e733413c247643ef828fb66aa03d8cc8be");
      assert.equal(audit.workflowMetadataStatus, "strict");
      assert.equal(audit.editCount, expectedPatch.editCount);
      assert.equal(audit.reviewStatus, expectedPatch.reviewStatus);
      assert.deepEqual(audit.transitions, expectedPatch.transitions.filter(item => item.voxels));
      assert.deepEqual(audit.targetStructures.map(item => item.id), [27,33,39,40]);
      if (expectedPatch.reviewStatus === "approved") {
        assert.deepEqual(audit.review.reviewer, {kind:"project-role",id:"project-lead"});
        assert.equal(audit.review.decidedAt, "2026-08-16");
        assert.equal(audit.review.pullRequest.number, 10);
        assert.equal(audit.review.pullRequest.mergeCommit, "9daec82bf2135743aa428d2032b4c81b2d76e57d");
      } else {
        assert.deepEqual(audit.review, {decision:"unreviewed",reviewer:null,decidedAt:null,reason:"",pullRequest:null});
      }
    }
  } finally {
    await rm(tempRoot, {recursive:true, force:true});
  }
});

test("does not auto-approve an unrelated legacy approved patch", async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), "brain-upgrade-allowlist-"));
  try {
    const patch = JSON.parse(await readFile(new URL("tests/fixtures/segmentation-patch-strict-approved.json", root), "utf8"));
    delete patch.workflowMetadataVersion;
    delete patch.targetStructures;
    delete patch.sliceRanges;
    delete patch.changeSummary;
    delete patch.review;
    patch.reviewStatus = "approved";
    const legacyPath = join(tempRoot, "general-approved.json");
    await writeFile(legacyPath, JSON.stringify(patch));
    const result = spawnSync(python.command, [...python.prefix,
      localPath("scripts/upgrade_segmentation_patch_metadata.py"), legacyPath,
      "--input", localPath("public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz"),
      "--output-dir", join(tempRoot, "out"),
    ], {encoding:"utf8"});
    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}\n${result.stderr}`, /allowlisted|explicit.*review/i);
  } finally {
    await rm(tempRoot, {recursive:true, force:true});
  }
});

test("official build path rejects a tampered approved patch before applying it", async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), "brain-build-patch-validation-"));
  try {
    const buildScript = await readFile(new URL("scripts/build_bigbrain_practical_seg.py", root), "utf8");
    assert.match(buildScript, /from apply_segmentation_patch import validate_patch/);
    const sourcePath = localPath("tests/fixtures/bigbrain-practical-segmentation-pre-mammillary-de30.bin.gz");
    const base = JSON.parse(await readFile(new URL("segmentation-patches/review/mammillary-bodies-horizontal-core-plus-clear-rim-candidate-2026-08-16.json", root), "utf8"));
    const harness = [
      "import sys, numpy as np",
      "from pathlib import Path",
      "sys.path.insert(0, 'scripts')",
      "from apply_segmentation_patch import read_volume",
      "from build_bigbrain_practical_seg import apply_approved_patch",
      "dims, labels = read_volume(Path(sys.argv[2]))",
      "volume = np.frombuffer(bytes(labels), dtype=np.uint8).reshape(dims, order='F').copy()",
      "apply_approved_patch(volume, Path(sys.argv[1]))",
    ].join("; ");
    for (const [name, mutate] of [
      ["review", patch => {delete patch.review;}],
      ["summary", patch => {patch.changeSummary.changedVoxelCount += 1;}],
    ]) {
      const patch = structuredClone(base);
      mutate(patch);
      const patchPath = join(tempRoot, `${name}.json`);
      await writeFile(patchPath, JSON.stringify(patch));
      const result = spawnSync(python.command, [...python.prefix, "-c", harness, patchPath, sourcePath], {encoding:"utf8", cwd:localPath("")});
      assert.notEqual(result.status, 0, `${name} tampering must stop official build`);
    }
    const baselineHarness = harness.replace(
      "apply_approved_patch(volume, Path(sys.argv[1]))",
      "volume[0, 0, 0] = (int(volume[0, 0, 0]) + 1) % 256; apply_approved_patch(volume, Path(sys.argv[1]))",
    );
    const baselineResult = spawnSync(python.command, [...python.prefix, "-c", baselineHarness,
      localPath("segmentation-patches/review/mammillary-bodies-horizontal-core-plus-clear-rim-candidate-2026-08-16.json"), sourcePath,
    ], {encoding:"utf8", cwd:localPath("")});
    assert.notEqual(baselineResult.status, 0, "baseline label tampering must stop official build");
  } finally {
    await rm(tempRoot, {recursive:true, force:true});
  }
});

test("pins segmentation patches to the exact bundled label revision", async () => {
  const [labels, editor, canvas, revisionSource, fixtureText] = await Promise.all([
    readFile(new URL("public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz", root)),
    readFile(new URL("app/ManualSegmentationWorkbench.tsx", root), "utf8"),
    readFile(new URL("app/AtlasVolumeCanvas.tsx", root), "utf8"),
    readFile(new URL("app/segmentationLabelRevision.ts", root), "utf8"),
    readFile(new URL("tests/fixtures/segmentation-patch-smoke.json", root), "utf8"),
  ]);
  const digest = createHash("sha256").update(labels).digest("hex");
  assert.match(revisionSource, new RegExp(`SEGMENTATION_LABEL_SHA256="${digest}"`));
  assert.match(revisionSource, /SEGMENTATION_LABEL_REVISION=SEGMENTATION_LABEL_SHA256\.slice\(0,16\)/);
  assert.match(editor, /const LABEL_SHA256=SEGMENTATION_LABEL_SHA256/);
  assert.match(editor, /LABEL_FETCH_URL=`\$\{LABEL_URL\}\?v=\$\{SEGMENTATION_LABEL_REVISION\}`/);
  assert.match(canvas, /\?v=\$\{SEGMENTATION_LABEL_REVISION\}/);
  assert.equal(JSON.parse(fixtureText).sourceLabelsSha256, digest);
});

test("builds a multi-slice multi-transition patch in the browser helper that Python accepts", async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), "brain-cross-language-patch-"));
  try {
    const labelBytes = await readFile(new URL("public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz", root));
    const volume = readVolumeHeader(labelBytes, "BBS1");
    const labels = new Uint8Array(volume.payload.subarray(10));
    const [dx, dy] = volume.dims;
    const area = dx * dy;
    const indexAt = (label, z) => {
      const start = z * area;
      const index = labels.findIndex((value, offset) => offset >= start && offset < start + area && value === label);
      assert.notEqual(index, -1, `fixture must contain label ${label} at z ${z}`);
      return index;
    };
    const edits = new Map([
      [indexAt(0, 1), 39],
      [indexAt(27, 50), 40],
      [indexAt(33, 100), 39],
      [indexAt(39, 110), 0],
      [indexAt(40, 115), 33],
    ]);
    const helper = await import(new URL("app/segmentationPatchMetadata.ts", root));
    const patch = helper.buildSegmentationPatch({
      edits,labels,dims:volume.dims,
      sourceLabelsSha256:createHash("sha256").update(labelBytes).digest("hex"),
      createdAt:"2026-08-22T00:00:00.000Z",authorNote:"cross-language fixture",authorGitHub:"",
      targetSide:"mixed",evidence:"BigBrain fixture",confidence:"medium",
    });
    assert.equal(patch.sourceImage, "/atlas/bigbrain-icbm500.bin.gz");
    assert.equal(patch.sourceLabels, "/atlas/bigbrain-practical-segmentation-icbm500.bin.gz");
    assert.deepEqual(patch.sliceRanges, [{plane:"horizontal",axis:"Z",min:1,max:115}]);
    assert.deepEqual(patch.changeSummary.transitions, [
      {from:0,to:39,voxels:1},{from:27,to:40,voxels:1},{from:33,to:39,voxels:1},
      {from:39,to:0,voxels:1},{from:40,to:33,voxels:1},
    ]);
    const patchPath = join(tempRoot, "cross-language.json");
    await writeFile(patchPath, JSON.stringify(patch));
    const result = spawnSync(python.command, [...python.prefix,
      localPath("scripts/apply_segmentation_patch.py"), patchPath,
      "--input", localPath("public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz"), "--check",
    ], {encoding:"utf8"});
    assert.equal(result.status, 0, result.stderr);
    const audit = JSON.parse(result.stdout);
    assert.equal(audit.workflowMetadataStatus, "strict");
    assert.equal(audit.changedVoxelCount, 5);
  } finally {
    await rm(tempRoot, {recursive:true, force:true});
  }
});

test("keeps patch source paths canonical in a GitHub Pages-base build", async () => {
  const result = spawnSync(process.execPath, ["node_modules/vite/bin/vite.js", "build", "--configLoader", "runner"], {
    cwd:localPath(""),
    env:{...process.env,DEPLOY_GITHUB_PAGES:"true"},
    encoding:"utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  const assetName = (await readdir(new URL("dist/assets/", root))).find(name => /^index-.*\.js$/.test(name));
  assert.ok(assetName);
  const bundle = await readFile(new URL(`dist/assets/${assetName}`, root), "utf8");
  assert.match(bundle, /\/atlas\/bigbrain-icbm500\.bin\.gz/);
  assert.match(bundle, /\/atlas\/bigbrain-practical-segmentation-icbm500\.bin\.gz/);
  assert.doesNotMatch(bundle, /\/brain-practical-navi\/atlas\/bigbrain-icbm500\.bin\.gz/);
});

test("adds orthogonal read-only audit planes without changing the horizontal patch contract", async () => {
  const [editor, patchMetadata, geometry, css] = await Promise.all([
    readFile(new URL("app/ManualSegmentationWorkbench.tsx", root), "utf8"),
    readFile(new URL("app/segmentationPatchMetadata.ts", root), "utf8"),
    readFile(new URL("app/segmentationGeometry.ts", root), "utf8"),
    readFile(new URL("app/canvas.css", root), "utf8"),
  ]);
  assert.match(geometry, /type SegmentationPlane="horizontal"\|"coronal"\|"sagittal"/);
  assert.match(editor, /照合する断面方向/);
  assert.match(editor, /segmentationPlaneNames\[key\]\.label/);
  assert.match(editor, /setPlane\(next\)/);
  assert.match(editor, /格子座標/);
  assert.match(editor, /X \{cursorVoxel\?\.\[0\]/);
  assert.match(editor, /aria-label=\{`\$\{planeInfo\.increment\}へ1 voxel移動`\}/);
  assert.match(geometry, /coronal:\{label:"冠状断",axis:"Y",rangeStart:"後方",rangeEnd:"前方",increment:"前方",decrement:"後方",top:"S",bottom:"I",left:"L",right:"R"\}/);
  assert.match(geometry, /sagittal:\{label:"矢状断",axis:"X",rangeStart:"左",rangeEnd:"右",increment:"右",decrement:"左",top:"S",bottom:"I",left:"P",right:"A"\}/);
  assert.match(editor, /role="tab" aria-selected=\{plane===key\}/);
  assert.match(editor, /role="status"><b>照合専用<\/b>/);
  assert.match(editor, /disabled=\{!isEditablePlane\}/);
  assert.match(editor, /function paintAt\(event:React\.PointerEvent<HTMLCanvasElement>\)\{if\(!isEditablePlane\)return/);
  assert.match(editor, /function applyHistory\(changes:StrokeChange\[],direction:"undo"\|"redo"\)\{if\(!isEditablePlane\)return/);
  assert.match(patchMetadata, /primaryPlane:"horizontal"/);
  assert.match(editor, /inflate\(LABEL_FETCH_URL,0x42425331\)/);
  for (const id of [39, 40, 33, 27]) assert.match(editor, new RegExp(`\\b${id}\\b`));
  assert.match(editor, /36–38は自動生成しません/);
  assert.match(css, /\.segPlaneTabs/);
  assert.match(css, /\.segReadOnlyPanel/);
  assert.match(css, /\.segCoordinateReadout/);
  assert.match(css, /@media\(max-width:760px\)[\s\S]*\.segCoordinateReadout\{grid-template-columns:1fr/);
});

test("maps every orthogonal audit slice and display corner to the shared voxel grid", async () => {
  const { planeAxisSize, planePositionForSlice, planeShape, planeSliceIndex, planeVoxel, segmentationPlaneNames } = await import(new URL("app/segmentationGeometry.ts", root));
  const dims = [394, 466, 378];
  const expectations = {
    horizontal: { shape:[394,466], corners:[[0,465,113],[393,465,113],[0,0,113],[393,0,113]], increment:"上方", decrement:"下方", orientation:["A","P","L","R"] },
    coronal: { shape:[394,378], corners:[[0,251,377],[393,251,377],[0,251,0],[393,251,0]], increment:"前方", decrement:"後方", orientation:["S","I","L","R"] },
    sagittal: { shape:[466,378], corners:[[194,0,377],[194,465,377],[194,0,0],[194,465,0]], increment:"右", decrement:"左", orientation:["S","I","P","A"] },
  };
  for (const [plane, expected] of Object.entries(expectations)) {
    assert.deepEqual(planeShape(dims, plane), expected.shape);
    const slice = plane === "horizontal" ? 113 : plane === "coronal" ? 251 : 194;
    assert.deepEqual([
      planeVoxel(0, 0, slice, plane, dims),
      planeVoxel(expected.shape[0]-1, 0, slice, plane, dims),
      planeVoxel(0, expected.shape[1]-1, slice, plane, dims),
      planeVoxel(expected.shape[0]-1, expected.shape[1]-1, slice, plane, dims),
    ], expected.corners);
    assert.equal(segmentationPlaneNames[plane].increment, expected.increment);
    assert.equal(segmentationPlaneNames[plane].decrement, expected.decrement);
    assert.deepEqual([
      segmentationPlaneNames[plane].top,
      segmentationPlaneNames[plane].bottom,
      segmentationPlaneNames[plane].left,
      segmentationPlaneNames[plane].right,
    ], expected.orientation);
    const size = planeAxisSize(dims, plane);
    for (let index=0; index<size; index++) {
      const position = planePositionForSlice(index, plane, dims);
      assert.equal(planeSliceIndex(position, plane, dims), index);
      if (index<size-1) assert.equal(planeSliceIndex(planePositionForSlice(index+1, plane, dims), plane, dims)-index, 1);
    }
  }
});

test("reproduces the objective orthogonal mammillary audit and rejects a wrong volume", async () => {
  const result = spawnSync(python.command, [...python.prefix,
    localPath("scripts/audit_mammillary_orthogonal.py"),
    "--input", "public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz",
  ], {encoding:"utf8", cwd:localPath("")});
  assert.equal(result.status, 0, result.stderr);
  const audit = JSON.parse(result.stdout);
  const saved = JSON.parse(await readFile(new URL("segmentation-patches/review/mammillary-bodies-orthogonal-objective-audit-2026-08-22.json", root), "utf8"));
  assert.deepEqual(audit, saved);
  assert.equal(audit.magic, "BBS1");
  assert.equal(audit.inputSha256, "6744e7c0184436789f42c7107d05ead93cf36703bb36372df5f63b82a38f7b56");
  assert.deepEqual(audit.dims, [394, 466, 378]);
  assert.deepEqual(audit.voxelSizeMm, [0.5, 0.5, 0.5]);
  assert.equal(audit.validation.passed, true);
  assert.equal(audit.labels["39"].voxelCount, 561);
  assert.equal(audit.labels["40"].voxelCount, 729);
  assert.deepEqual(audit.labels["39"].bbox.min, [187, 246, 107]);
  assert.deepEqual(audit.labels["39"].bbox.max, [196, 256, 121]);
  assert.deepEqual(audit.labels["40"].bbox.min, [197, 247, 108]);
  assert.deepEqual(audit.labels["40"].bbox.max, [204, 258, 121]);
  assert.equal(audit.labels["39"].connectedComponentCount6, 1);
  assert.equal(audit.labels["40"].connectedComponentCount6, 1);
  assert.deepEqual(audit.validation.expectedMammillaryBboxes, {
    "39": {min:[187,246,107], max:[196,256,121]},
    "40": {min:[197,247,108], max:[204,258,121]},
  });
  assert.deepEqual(audit.faceContacts6, {"27-33":32,"27-39":69,"27-40":38,"33-39":171,"33-40":162,"39-40":1});
  assert.deepEqual(Object.keys(audit.contactInterfaces), ["27-39", "33-39", "27-40", "33-40"]);
  const axisCoordinate = {x:0, y:1, z:2};
  for (const [pair, contact] of Object.entries(audit.contactInterfaces)) {
    assert.equal(contact.faceCount, audit.faceContacts6[pair]);
    const orientationCounts = Object.fromEntries(Object.keys(contact.faceOrientationCounts).map((orientation) => [orientation, 0]));
    for (const face of contact.faces) orientationCounts[face.orientation]++;
    assert.deepEqual(contact.faceOrientationCounts, orientationCounts);
    assert.equal(Object.values(contact.faceOrientationCounts).reduce((sum, count) => sum + count, 0), contact.faceCount);
    const allMammillaryVoxels = new Set(contact.faces.map((face) => face.mammillaryVoxel.join(",")));
    assert.equal(contact.uniqueMammillaryVoxelCount, allMammillaryVoxels.size);
    for (const axis of ["x", "y", "z"]) {
      const slices = contact.slices[axis].slices;
      const bySlice = new Map();
      for (const face of contact.faces) {
        const sliceIndex = face.mammillaryVoxel[axisCoordinate[axis]];
        const record = bySlice.get(sliceIndex) ?? {inPlane:0, outOfPlane:0, inPlaneVoxels:new Set(), outOfPlaneVoxels:new Set()};
        const voxel = face.mammillaryVoxel.join(",");
        if (face.orientation.slice(1).toLowerCase() === axis) {
          record.outOfPlane++;
          record.outOfPlaneVoxels.add(voxel);
        } else {
          record.inPlane++;
          record.inPlaneVoxels.add(voxel);
        }
        bySlice.set(sliceIndex, record);
      }
      let total = 0;
      let occupied = 0;
      for (const slice of slices) {
        const record = bySlice.get(slice.index) ?? {inPlane:0, outOfPlane:0, inPlaneVoxels:new Set(), outOfPlaneVoxels:new Set()};
        const allVoxels = new Set([...record.inPlaneVoxels, ...record.outOfPlaneVoxels]);
        total += record.inPlane + record.outOfPlane;
        if (record.inPlane || record.outOfPlane) occupied++;
        assert.equal(slice.inPlaneFaceCount, record.inPlane, `${pair} ${axis}${slice.index} in-plane faces`);
        assert.equal(slice.outOfPlaneFaceCount, record.outOfPlane, `${pair} ${axis}${slice.index} out-of-plane faces`);
        assert.equal(slice.inPlaneUniqueMammillaryVoxelCount, record.inPlaneVoxels.size);
        assert.equal(slice.outOfPlaneUniqueMammillaryVoxelCount, record.outOfPlaneVoxels.size);
        assert.equal(slice.allUniqueMammillaryVoxelCount, allVoxels.size);
        assert.equal(slice.uniqueMammillaryVoxelCount, allVoxels.size);
      }
      assert.equal(total, contact.faceCount, `${pair} ${axis} slice faces must reconcile`);
      assert.equal(contact.slices[axis].occupiedSliceCount, occupied);
    }
  }
  for (const [label, expected] of Object.entries({
    "39": {sliceIndex:251, pairInPlaneFaceCounts:{"27":12,"33":12}, pairUniqueMammillaryVoxelCounts:{"27":10,"33":9}},
    "40": {sliceIndex:253, pairInPlaneFaceCounts:{"27":8,"33":6}, pairUniqueMammillaryVoxelCounts:{"27":8,"33":5}},
  })) {
    const representative = audit.representativeSlices[label];
    assert.equal(representative.plane, "coronal");
    assert.equal(representative.sliceIndex, expected.sliceIndex);
    assert.deepEqual(representative.pairInPlaneFaceCounts, expected.pairInPlaneFaceCounts);
    assert.deepEqual(representative.pairUniqueMammillaryVoxelCounts, expected.pairUniqueMammillaryVoxelCounts);
    const contactVoxelUnion = new Set();
    for (const referenceLabel of ["27", "33"]) {
      const contact = audit.contactInterfaces[`${referenceLabel}-${label}`];
      const inPlaneFaces = contact.faces.filter((face) => (
        face.mammillaryVoxel[1] === representative.sliceIndex
        && face.orientation.slice(1).toLowerCase() !== representative.axis
      ));
      const inPlaneVoxels = new Set(inPlaneFaces.map((face) => face.mammillaryVoxel.join(",")));
      assert.equal(inPlaneFaces.length, expected.pairInPlaneFaceCounts[referenceLabel]);
      assert.equal(inPlaneVoxels.size, expected.pairUniqueMammillaryVoxelCounts[referenceLabel]);
      for (const voxel of inPlaneVoxels) contactVoxelUnion.add(voxel);
    }
    const points = [...contactVoxelUnion].map((voxel) => voxel.split(",").map(Number));
    const minimum = [0,1,2].map((axis) => Math.min(...points.map((point) => point[axis])));
    const maximum = [0,1,2].map((axis) => Math.max(...points.map((point) => point[axis])));
    assert.deepEqual(representative.contactBbox, {
      min: minimum,
      max: maximum,
      size: maximum.map((value, axis) => value - minimum[axis] + 1),
      x: [minimum[0], maximum[0]],
      y: [minimum[1], maximum[1]],
      z: [minimum[2], maximum[2]],
    });
    const mammillaryBbox = audit.labels[label].bbox;
    const mammillaryCenter = [0,1,2].map((axis) => (mammillaryBbox.min[axis] + mammillaryBbox.max[axis]) / 2);
    const contactCenter = [0,1,2].map((axis) => (minimum[axis] + maximum[axis]) / 2);
    const centerDistance = Math.sqrt([0,1,2].reduce((sum, axis) => sum + (contactCenter[axis] - mammillaryCenter[axis]) ** 2, 0));
    assert.equal(representative.contactBboxCenterDistanceVoxels, centerDistance);
  }
  assert.match(audit.definitions.representativeSliceSelection, /boundary correctness/i);
  for (const distance of Object.values(audit.shortestVoxelDistances6)) {
    assert.equal(distance.voxelDistance6, 1);
    assert.equal(distance.distanceMm, 0.5);
  }
  assert.match(audit.definitions.anatomicalStatus, /not anatomical validation/i);

  const wrongInput = spawnSync(python.command, [...python.prefix,
    localPath("scripts/audit_mammillary_orthogonal.py"),
    "--input", "public/atlas/bigbrain-icbm500.bin.gz",
  ], {encoding:"utf8", cwd:localPath("")});
  assert.notEqual(wrongInput.status, 0);
  assert.match(`${wrongInput.stdout}\n${wrongInput.stderr}`, /SHA-256|expected BBS1/);
});

test("keeps the reviewed sparse mammillary-body patch separate from the published labels", async () => {
  const patch = JSON.parse(await readFile(new URL("segmentation-patches/review/mammillary-bodies-horizontal-sparse-2026-08-16.json", root), "utf8"));
  assert.equal(patch.reviewStatus, "unreviewed");
  assert.equal(patch.editCount, 311);
  assert.deepEqual([...new Set(patch.runs.map(run => run.label))].sort((a,b)=>a-b), [39, 40]);
  const area = patch.dims[0] * patch.dims[1];
  assert.deepEqual([...new Set(patch.runs.map(run => Math.floor(run.start / area)))].sort((a,b)=>a-b), [109, 113, 117, 121]);
  assert.match(patch.authorNote, /旧.*脳幹|脳幹試作ラベル/);
});

test("keeps the approved mammillary patch nested over its core candidate", async () => {
  const [core, rim] = await Promise.all([
    readFile(new URL("segmentation-patches/review/mammillary-bodies-horizontal-contiguous-core-candidate-2026-08-16.json", root), "utf8").then(JSON.parse),
    readFile(new URL("segmentation-patches/review/mammillary-bodies-horizontal-core-plus-clear-rim-candidate-2026-08-16.json", root), "utf8").then(JSON.parse),
  ]);
  const expand = patch => {
    const voxels = new Map();
    for (const run of patch.runs) for (let offset=0; offset<run.length; offset++) voxels.set(run.start+offset, run.label);
    return voxels;
  };
  const coreVoxels = expand(core), rimVoxels = expand(rim);
  assert.equal(core.reviewStatus, "unreviewed");
  assert.equal(rim.reviewStatus, "approved");
  assert.equal(coreVoxels.size, 1206);
  assert.equal(rimVoxels.size, 1290);
  assert.deepEqual([...new Set(rimVoxels.values())].sort((a,b)=>a-b), [39, 40]);
  for (const [index, label] of coreVoxels) assert.equal(rimVoxels.get(index), label, `core voxel ${index} must remain unchanged`);
  const area = rim.dims[0] * rim.dims[1];
  assert.deepEqual([...new Set([...rimVoxels.keys()].map(index => Math.floor(index/area)))].sort((a,b)=>a-b), Array.from({length:15},(_,index)=>107+index));
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
  assert.deepEqual(audit.patches.map(patch => patch.workflowMetadataStatus), ["legacy+missing fields", "legacy+missing fields"]);
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
  assert.deepEqual(rasterOrDocuments, ["home-surface-preview.png", "icon-192.png", "icon-512.png", "og.png"]);
  assert.match(notice, /home-surface-preview\.png is a screenshot of the application’s own/);
  assert.match(notice, /icon-192\.png and icon-512\.png[\s\S]*rasterized size variants/);
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

test("shows load progress and retries every failed atlas canvas together", async () => {
  const canvas = await readFile(new URL("app/AtlasVolumeCanvas.tsx", root), "utf8");
  assert.match(canvas, /response\.body\.pipeThrough\(new TransformStream/);
  assert.match(canvas, /response\.headers\.get\("content-length"\)/);
  assert.match(canvas, /measuredProgress\?downloadProgress\.loaded:undefined/);
  assert.match(canvas, /受信済み（総量不明）/);
  assert.match(canvas, /受信完了・展開中/);
  assert.match(canvas, /aria-live="polite"/);
  assert.match(canvas, /window\.dispatchEvent\(new Event\(ATLAS_RETRY_EVENT\)\)/);
  assert.match(canvas, /window\.addEventListener\(ATLAS_RETRY_EVENT,retry\)/);
  assert.match(canvas, /atlasDownloadProgress\.reset\(\)/);
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
  assert.match(canvas, /if\(!ext\)\{gl\.deleteProgram\(prog\);return false\}/);
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
    opticChiasm: [33], mammillaryBody: [39, 40], insula: [34, 35],
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
    const minimumVisible = target === "mammillaryBody" ? 100 : 200;
    assert.ok(count >= minimumVisible, `${target} must show at least ${minimumVisible} highlighted voxels, got ${count}`);
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
  assert.match(page, /useState<QuizQuestion\[\]>\(\(\)=>shuffledQuestions\(allQuizQuestions\)\.slice\(0,10\)\)/);
});

test("medial surface quiz keeps the same isolated-hemisphere anatomy as study mode", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  assert.match(page, /showCerebellum=\{neurovascularQuiz\?false:quizQuestion\.view!=="medial"\}/);
  assert.match(page, /showPonsMedulla=\{quizQuestion\.view!=="medial"\}/);
  assert.match(page, /showMidbrain=\{quizQuestion\.view!=="medial"\}/);
});

test("help, feedback, and credit dialogs have durable shareable URLs", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  assert.match(page, /type OverlayMode = "help" \| "feedback" \| "legal" \| "status"/);
  assert.match(page, /function overlayFromHash\(hash:string\):OverlayMode\|null/);
  assert.match(page, /overlayFromHash\(window\.location\.hash\)==="help"/);
  assert.match(page, /overlayFromHash\(window\.location\.hash\)==="feedback"/);
  assert.match(page, /overlayFromHash\(window\.location\.hash\)==="legal"/);
  assert.match(page, /overlayFromHash\(window\.location\.hash\)==="status"/);
  assert.match(page, /window\.history\.pushState\(null,"",`#workspace\/\$\{key\}`\)/);
  assert.match(page, /onClick=\{\(\)=>openOverlay\("feedback"\)\}/);
  assert.match(page, /onClick=\{\(\)=>openOverlay\("legal"\)\}/);
  assert.match(page, /onClick=\{\(\)=>openOverlay\("help"\)\}/);
  assert.match(page, /onClick=\{\(\)=>openOverlay\("status"\)\}/);
  assert.match(page, /document\.body\.style\.overflow="hidden"/);
  assert.match(page, /document\.querySelector<HTMLButtonElement>\('\.legalDialog header button'\)\?\.focus\(\)/);
  assert.match(page, /overlayReturnFocus\.current\?\.focus\(\)/);
  assert.match(page, /event\.shiftKey&&document\.activeElement===first/);
  assert.match(page, /!event\.shiftKey&&document\.activeElement===last/);
  assert.match(page, /onClick=\{closeOverlay\} aria-label="意見・誤り報告を閉じる"/);
  assert.match(page, /onClick=\{closeOverlay\} aria-label="利用条件とクレジット表示を閉じる"/);
  assert.match(page, /onClick=\{closeOverlay\} aria-label="操作ガイドを閉じる"/);
});

test("status dialog renders the JSON registry through a durable direct route", async () => {
  const [page, status] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/beta-status.json", root), "utf8"),
  ]);
  const data = JSON.parse(status);
  assert.equal(data.phase, "公開α／β候補・公開判断前");
  assert.ok(data.knownLimitations.some(item => item.body.includes("ID33")));
  assert.ok(data.changes.some(item => item.body.includes("156/156")));
  assert.ok(data.knownLimitations.some(item => item.body.includes("156/156")));
  assert.doesNotMatch(status, /親作業での実施前|26経路版は[^。]*未実施/);
  assert.match(page, /import betaStatus from "\.\/beta-status\.json"/);
  assert.match(page, /const betaStatusData=betaStatus as BetaStatusData/);
  assert.match(page, /candidate==="status"/);
  assert.match(page, /setStatusOpen\(overlay==="status"\)/);
  assert.match(page, /className="legalDialog betaStatusDialog"/);
  assert.match(page, /更新履歴・既知の制限/);
  assert.match(page, /betaStatusData\.knownLimitations\.map/);
  assert.match(page, /betaStatusData\.changes\.map/);
  assert.match(page, /data-status-id=\{item\.id\}/);
  assert.match(page, /className="betaStatusEvidence"/);
  assert.match(page, /className="homeEnter"[\s\S]*openOverlay\("status"\)/);
  assert.match(page, /TemplateFlow<\/a><button onClick=\{\(\)=>openOverlay\("status"\)\}>更新履歴・既知の制限/);
  assert.match(page, /document\.querySelector<HTMLButtonElement>\('\.legalDialog header button'\)\?\.focus\(\)/);
  assert.match(page, /overlayReturnFocus\.current\?\.focus\(\)/);
  assert.match(page, /\},\[helpOpen,feedbackOpen,legalOpen,statusOpen\]\);/);
  assert.match(page, /if\(!overlayOpen\)overlayReturnFocus\.current\?\.focus\(\)\},\[overlayOpen\]\);/);
  assert.match(page, /function openOverlay\(key:OverlayMode\)\{if\(!overlayOpen\)overlayReturnFocus\.current=document\.activeElement instanceof HTMLElement\?document\.activeElement:null;/);
  assert.match(page, /海馬采・鉤はβ候補から除外し、現行3Dには収録していません/);
  assert.match(page, /旧模式乳頭体2資産は配布されても学習画面の代用表示には使用しません/);
  assert.match(page, /学習画面に表示する形状は「模式補助」「位置目安」と明示します/);
  assert.doesNotMatch(page, /画面上でも「模式補助」「位置目安」と表示します/);
  assert.match(page, /更新 2026-08-22・AGPL-3\.0-or-later・無保証/);
  assert.doesNotMatch(page, /主要な溝・裂の線状ガイド、放線群、脈絡叢、海馬采、脳弓/);
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

test("keeps ghost-surface teaching layers depth-tested and opacity-consistent", async () => {
  const [atlasCanvas, page, audit] = await Promise.all([
    readFile(new URL("app/AtlasVolumeCanvas.tsx", root), "utf8"),
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("TRANSPARENCY_VISIBILITY_AUDIT.md", root), "utf8"),
  ]);
  assert.match(atlasCanvas, /const SURFACE_GHOST_OPACITY=\.18/);
  assert.match(atlasCanvas, /const TEACHING_OVERLAY_OPACITY=\.78/);
  assert.match(atlasCanvas, /const TEACHING_OVERLAY_SELECTED_OPACITY=\.98/);
  assert.match(atlasCanvas, /function teachingColor\(color:number\[],opacity=TEACHING_OVERLAY_OPACITY\)/);
  assert.match(atlasCanvas, /function selectionColor\(color:\[number,number,number\],opacity=TEACHING_OVERLAY_SELECTED_OPACITY\)\{return \[color\[0\]\/255,color\[1\]\/255,color\[2\]\/255,opacity\]\}/);
  assert.match(atlasCanvas, /uniform float clipOn,clipAxis,clipValue,material,hemiMode,selectedOpacity/);
  assert.match(atlasCanvas, /float outputAlpha=mix\(color\.a,selectedOpacity,clamp\(highlight\.a,0\.,1\.\)\)/);
  assert.match(atlasCanvas, /const ghostSurface=view==="ghost"&&blockMeshes===null/);
  assert.match(atlasCanvas, /else if\(!ghostSurface\)drawSurfaceShell\(\)/);
  assert.match(atlasCanvas, /if\(showFocus&&selectionLayers\.length\)\{if\(!ghostSurface\)gl\.clear\(gl\.DEPTH_BUFFER_BIT\)/);
  assert.match(atlasCanvas, /selectionLayers\.forEach\(layer=>layer\.meshes\.forEach\(part=>draw\(part,selectionColor\(layer\.color\),1\)\)\)/);
  assert.match(atlasCanvas, /if\(ghostSurface\)\{[\s\S]*?gl\.depthFunc\(gl\.LESS\)[\s\S]*?drawSurfaceShell\(\)/);
  assert.doesNotMatch(atlasCanvas, /if\(view==="ghost"\)gl\.clear\(gl\.DEPTH_BUFFER_BIT\)/);
  assert.match(atlasCanvas, /draw\(overlays\[0\],teachingColor\(\[\.86,\.18,\.14\]\)/);
  assert.match(atlasCanvas, /draw\(overlays\[2\],teachingColor\(\[\.96,\.83,\.42\]\)/);
  assert.match(page, /透過時も補助レイヤーはモデルの奥行きを保って描画します/);
  assert.match(page, /通常は半透明、選択中の神経・血管は白色と高い不透明度で追跡しやすくします/);
  assert.match(audit, /実ブラウザ確認: 最終ビルド/);
  assert.match(audit, /26経路×direct\/reload＝156\/156件/);
  assert.match(audit, /形状・メッシュ・分節は変更しない/);
});

test("presents sulci as teaching guides rather than segmentation boundaries", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  const guides = page.split("const surfaceLandmarks")[1].split("const surfaceLandmarkKeys")[0];
  assert.equal((guides.match(/note:"[^"]*位置目安です。"/g)??[]).length,7);
  assert.match(guides,/longitudinal-fissure[\s\S]*正中の裂を示します/);
  assert.match(page,/source:"模式ガイド"/);
  assert.match(page,/脳回間の位置関係を読む教材ガイドです。[\s\S]*厳密な溝の輪郭や分節境界ではありません/);
});

test("describes specimen fidelity limits without implying anatomical validation", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  assert.doesNotMatch(page.split('"medial-temporal":{name:"海馬・扁桃体標本"')[1].split('"midbrain-section"')[0], /key:"(?:fimbria|uncus)"/);
  assert.match(page, /海馬采・鉤は信頼できる境界データがなく3D未収録/);
  assert.match(page, /const blockSpecimenDisclaimer="褐色組織は位置関係を読むための表示で[\s\S]*見た目の実在感を形状や境界の正確性の根拠にせず/);
  assert.match(page, /caution:`\$\{blockSpecimenDisclaimer\} \$\{blockSpecimens\[blockSpecimen\]\.caution\}`/);
});
test("labels provisional questions and includes them in the default quiz setup", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  assert.match(page, /function isStandardQuizStructure\(key:string\)\{const source=structures\[key as StructureKey\]\?\.labelSource;return source==="manual"\|\|source==="image-guided-reviewed"\}/);
  assert.match(page, /function isProvisionalQuiz\(question:QuizQuestion\)\{[\s\S]*?question\.options\.some\(option=>!isStandardQuizStructure\(option\)\);\n\}/);
  assert.match(page, /standardQuizQuestions=quizQuestions\.filter\(question=>!isProvisionalQuiz\(question\)\)/);
  assert.match(page, /useState<QuizQuestion\[]>\(\(\)=>shuffledQuestions\(allQuizQuestions\)/);
  assert.match(page, /quizIncludeProvisional,setQuizIncludeProvisional\]=useState\(true\)/);
  assert.match(page, /const quizFilters:QuizFilters=\{category:quizCategory,format:quizFormat,detail:quizDetail,includeProvisional:quizIncludeProvisional,wrongOnly:quizWrongOnly\}/);
  assert.match(page, /filterQuizCandidates\(quizQuestionsForFiltering,quizFilters,wrongTargets\)/);
  assert.match(page, /function startQuiz\(\)\{let candidates=quizCandidates;/);
  assert.doesNotMatch(page, /quizIncludeProvisional\|\|!isProvisionalQuiz\(question\)/);
  assert.match(page, /試作問題を含む[\s\S]*専門家未確認・位置照合ラベル/);
  assert.match(page, /試作・専門家未確認/);
  assert.match(page, /\{target:"mammillaryBody",category:"limbic",plane:"horizontal",position:69/);
  assert.match(page, /className="quizCountButtons" role="group" aria-label="次回の問題数（上限）"/);
  assert.match(page, /aria-pressed=\{quizCount===count\}/);
  assert.match(page, /この条件で出題（\{quizActualCount\}問）/);
  assert.doesNotMatch(page, /\(quizEmpty\|\|quizCandidateCount===0\)\?/);
});

test("publishes a durable keyboard and pointer operation guide", async () => {
  const [page, css] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/canvas.css", root), "utf8"),
  ]);
  assert.match(page, /type OverlayMode = "help" \| "feedback" \| "legal" \| "status"/);
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

test("narrow layouts keep destination rails and full workflow panels distinct", async () => {
  const [page, css] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/canvas.css", root), "utf8"),
  ]);
  assert.match(page, /appShell workspace-\$\{workspace\}/);
  assert.match(page, /aria-label="匿名の意見・誤り報告を表示"/);
  assert.match(page, /aria-label="共同制作ページを表示"/);
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
  assert.ok((page.match(/onKeyDown=\{(?:webglUnavailable\?undefined:|surfaceQuiz&&!webglUnavailable\?)handleModelKey/g) ?? []).length >= 3);
  assert.match(page, /event\.key\.toLowerCase\(\)==="r"/);
  assert.match(canvas, /className="modelZoomControls"/);
  assert.match(canvas, /aria-label="拡大率を100パーセントに戻す"/);
  assert.match(canvas, /showZoomControls=true/);
  assert.match(page, /showZoomControls=\{false\}/);
  assert.match(page, /<OrientationCompass rotation=\{modelRotation\} compact\/>/);
  assert.match(page, /復習問題の脳表3Dモデル。ドラッグまたは矢印キーで回転/);
  assert.match(page, /quizModelQuestion\?<><AtlasVolumeCanvas[^>]+rotation=\{rotation\}[^>]+surfaceHighlights=\{neurovascularQuiz\?\[\]:quizSurfaceHighlight\}/);
  assert.match(page, /workspace==="quiz"&&\(isSurfaceQuiz\(quizQuestion\)\|\|isNeurovascularQuiz\(quizQuestion\)\)/);
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
  assert.match(page, /"image-guided-reviewed":\{label:"画像誘導・確認済み"/);
  assert.match(page, /className=\{`provenanceBadge \$\{source\.className\}`\}/);
  assert.match(page, /learnerSourceLabel\(item\.source\)/);
  assert.match(page, /<details className="provenanceDetails">/);
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

test("free observation distinguishes the medial and basal hypothalamus entries", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  assert.match(page, /key===\"hypothalamus\"\?\"視床下部領域（内側面）\":surfaceDeepLandmarks\[key\]\.name/);
  assert.match(page, /key===\"hypothalamus\"\?\"視床下部領域（脳底面）\":basalLandmarks\[key\]\.name/);
  assert.match(page, /<option key=\{item\.key\} value=\{item\.key\}>\{item\.name\} — \{item\.latin\}<\/option>/);
  assert.match(page, /aria-label=\{`\$\{item\.name\}の表示を解除`\}/);
});

test("surface canvases expose an accessible WebGL fallback without retrying", async () => {
  const [page, canvas, css] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/AtlasVolumeCanvas.tsx", root), "utf8"),
    readFile(new URL("app/canvas.css", root), "utf8"),
  ]);
  assert.match(canvas, /if\(!gl\)return false/);
  assert.match(canvas, /mockUnavailable=\(import\.meta\.env\.DEV\|\|localHost\)&&new URLSearchParams\(location\.search\)\.has\("mock-webgl-unavailable"\)/);
  assert.match(canvas, /className="atlasWebglFallback" role="alert" aria-live="assertive"/);
  assert.match(canvas, /この環境では3Dを表示できません。WebGL対応ブラウザ、PCまたは横向きタブレットでお試しください。/);
  assert.doesNotMatch(canvas, /WebGL context unavailable for atlas canvas/);
  assert.match(page, /disabled=\{webglUnavailable\}>断面＋3D<\/button>/);
  assert.match(page, /disabled=\{webglUnavailable\}>3Dのみ<\/button>/);
  assert.match(page, /onWebGLUnavailableChange=\{setWebglUnavailable\}/);
  assert.match(css, /\.atlasWebglFallback/);
});

test("quiz mistakes link back to the exact study view", async () => {
  const [page, css] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/canvas.css", root), "utf8"),
  ]);
  assert.match(page, /const \[quizMisses,setQuizMisses\]=useState<QuizTargetKey\[]>\(\[\]\)/);
  assert.match(page, /function reviewQuizQuestion\(question:QuizQuestion\)/);
  assert.match(page, /jump\(question\.plane,question\.position,"replace"\);setVisibleStructures\(\[question\.target\]\)/);
  assert.match(page, /className="quizReviewTargets" aria-label="今回間違えた構造"/);
  assert.match(page, /観察画面で位置を確認/);
  assert.doesNotMatch(page, /観察画面で復習/);
  assert.match(page, /learnerLabelSourceDisplay\[sectionQuizTarget\.labelSource\]\.label/);
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
