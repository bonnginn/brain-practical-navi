#!/usr/bin/env node

import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const readText = path => readFile(new URL(path, root), "utf8");
const [validation, page, builder, atlasLabelAdder, provenance, licenses, specimens] = await Promise.all([
  readText("public/atlas/bigbrain-practical-segmentation-icbm500-validation.json").then(JSON.parse),
  readText("app/page.tsx"),
  readText("scripts/build_bigbrain_practical_seg.py"),
  readText("scripts/add_practical_atlas_labels.py"),
  readText("STRUCTURE_PROVENANCE.md"),
  readText("DATA_AND_LICENSES.md"),
  readText("public/atlas/specimen-blocks.json").then(JSON.parse),
]);

const expectedAtlasIds = [23, 24, 25, 26, 27, 28, 29, 33, 34, 35];
const expectedImageGuidedIds = [30, 31, 32];
const expectedUi = {
  ventricle: { ids: [23, 24], source: "atlas-provisional" },
  thirdVentricle: { ids: [25], source: "atlas-provisional" },
  fourthVentricle: { ids: [26], source: "atlas-provisional" },
  corpusCallosum: { ids: [30], source: "image-guided" },
  internalCapsule: { ids: [31, 32], source: "image-guided" },
  brainstem: { ids: [27], source: "atlas-provisional" },
  cerebellum: { ids: [28, 29], source: "atlas-provisional" },
  opticChiasm: { ids: [33], source: "atlas-provisional" },
  insula: { ids: [34, 35], source: "atlas-provisional" },
};

function fail(message) {
  throw new Error(message);
}

function sameArray(actual, expected, label) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) fail(`${label}: ${JSON.stringify(actual)} != ${JSON.stringify(expected)}`);
}

sameArray(validation.atlasDerivedIds, expectedAtlasIds, "atlas-derived IDs");
sameArray(validation.imageGuidedCandidateIds, expectedImageGuidedIds, "image-guided IDs");
if (validation.officialLabelsPreserved !== true) fail("official manual labels are not recorded as preserved");
if (validation.ventricleLabelsRestrictedToEmptySpace !== true || validation.ventricleTissueOverlap !== 0) {
  fail("ventricle empty-space restriction is missing or reports tissue overlap");
}
if (!/IDs 23-35 are provisional teaching overlays/.test(validation.teachingPolicy)) fail("provisional teaching policy is missing");
if (Math.min(validation.atlasToManualDiceAudit.caudate, validation.atlasToManualDiceAudit.putamen, validation.atlasToManualDiceAudit.thalamus) < 0.75) {
  fail("recorded atlas alignment audit is below the build threshold");
}

for (const [key, expected] of Object.entries(expectedUi)) {
  const line = page.split("\n").find(candidate => candidate.trimStart().startsWith(`${key}: {`));
  if (!line) fail(`UI structure ${key} is missing`);
  const ids = line.match(/bigbrainIds:\[([^\]]+)\]/)?.[1].split(",").map(Number);
  const source = line.match(/labelSource:"([^"]+)"/)?.[1];
  sameArray(ids, expected.ids, `${key} UI IDs`);
  if (source !== expected.source) fail(`${key} UI source ${source} != ${expected.source}`);
  if (!/sourceDetail:"[^"]{40,}"/.test(line)) fail(`${key} has no structure-specific provenance detail`);
}

for (const pattern of [
  /mask = mask & empty_space/,
  /practical\[mask & empty\] = label_id/,
  /practical\[mask & empty & ~empty_space\] = label_id/,
  /if not np\.array_equal\(practical\[manual > 0\], manual\[manual > 0\]\)/,
  /CerebrA white-matter probability map and neighbouring nuclei\/ventricles/,
]) {
  if (!pattern.test(builder)) fail(`generation constraint is missing: ${pattern}`);
}
for (const pattern of [
  /if any\(\(practical == label_id\)\.any\(\) for label_id in LABELS\)/,
  /add = np\.isin\(atlas, atlas_ids\) & tissue & empty/,
  /practical\[add\] = label_id/,
  /target = nib\.Nifti1Image\(np\.zeros\(dims, dtype=np\.uint8\), np\.asarray\(grid_validation\["affine"\]/,
]) {
  if (!pattern.test(atlasLabelAdder)) fail(`maintenance generation constraint is missing: ${pattern}`);
}

for (const phrase of ["アトラス照合・試作", "画像誘導・試作", "脳梁、内包", "側脳室、第三脳室、第四脳室、脳幹、小脳、視交叉、島皮質"]) {
  if (!provenance.includes(phrase)) fail(`provenance ledger is missing: ${phrase}`);
}
for (const phrase of ["IDs 23–29、33–35", "ID 30: 脳梁候補", "ID 31: 左内包候補", "ID 32: 右内包候補"]) {
  if (!licenses.includes(phrase)) fail(`data notice is missing: ${phrase}`);
}

const expectedSpecimens = {
  "lateral-ventricle/ventricular-cavity": "same-grid-segmentation",
  "diencephalon/third-ventricle": "same-grid-segmentation",
  "radiations/internal-capsule": "image-guided-segmentation",
  "commissural-system/corpus-callosum": "image-guided-segmentation",
  "commissural-system/lateral-ventricles": "same-grid-segmentation",
  "hindbrain/cerebellum": "same-grid-segmentation",
  "hindbrain/fourth-ventricle": "same-grid-segmentation",
};
for (const [path, expectedSource] of Object.entries(expectedSpecimens)) {
  const [specimen, partName] = path.split("/");
  const part = specimens.specimens[specimen]?.find(candidate => candidate.part === partName);
  if (!part) fail(`specimen part is missing: ${path}`);
  if (part.sourceType !== expectedSource) fail(`${path} source ${part.sourceType} != ${expectedSource}`);
}

const result = {
  idsAudited: expectedAtlasIds.length + expectedImageGuidedIds.length,
  uiStructuresAudited: Object.keys(expectedUi).length,
  specimenPartsAudited: Object.keys(expectedSpecimens).length,
  manualLabelsPreserved: validation.officialLabelsPreserved,
  ventricleTissueOverlap: validation.ventricleTissueOverlap,
};
if (process.argv.includes("--json")) console.log(JSON.stringify(result, null, 2));
else console.log(`PASS\t${result.idsAudited} provisional IDs; ${result.uiStructuresAudited} UI structures; ${result.specimenPartsAudited} specimen parts; manual labels preserved; ventricle tissue overlap ${result.ventricleTissueOverlap}`);
