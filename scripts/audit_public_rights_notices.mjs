import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * This is an integrity audit, not a legal opinion.  The manifest contract is
 * deliberately pinned here so that a changed field cannot silently weaken the
 * relationship between an asset and the notice shipped with it.
 */
const REVIEWED_GROUPS = [
  ["bigbrain-browser-derivatives", "^(bigbrain-icbm500\\.bin\\.gz|bigbrain-fixed-mri-0444\\.bin\\.gz|bigbrain-icbm500-validation\\.json)$", "BigBrain, McGill University", "https://bigbrainproject.org/", "CC BY-NC-SA 4.0", "https://creativecommons.org/licenses/by-nc-sa/4.0/", "Grid selection or resampling, 8-bit conversion, compression, background masking, validation metadata and display tone mapping.", "Credit BigBrain and Amunts et al.; link the license; identify modifications; retain non-commercial and share-alike terms; imply no endorsement.", ["BIGBRAIN-DATA-LICENSE.txt"]],
  ["bigbrain-manual-labels", "^(bigbrain-manual-subcortical-icbm500\\.bin\\.gz|section-accumbens\\.mesh)$", "BigBrain co-registration/manual subcortical segmentation, Xiao et al.", "https://nist.mni.mcgill.ca/multi-contrast-pd25-atlas/", "CC BY 4.0 for the co-registration labels; underlying BigBrain terms remain applicable where BigBrain material is present", "https://creativecommons.org/licenses/by/4.0/", "Label-number conversion, storage on the exact 0.5 mm ICBM500 grid, compression, and 1 mm display-mesh extraction.", "Credit Xiao and collaborators; link CC BY 4.0; retain the separate BigBrain notice and do not imply expert validation.", ["BIGBRAIN-MANUAL-LICENSE.txt", "BIGBRAIN-DATA-LICENSE.txt"]],
  ["combined-practical-segmentation", "^bigbrain-practical-segmentation-icbm500(?:\\.bin\\.gz|-validation\\.json)$", "Combined exact-grid teaching labels: Xiao manual labels, CerebrA-derived provisional masks, project-authored image-guided candidates, and reviewed image-guided mammillary bodies", "https://github.com/bonnginn/brain-practical-navi/blob/main/DATA_AND_LICENSES.md", "Mixed by label source; distributed with the non-commercial BigBrain teaching package", "https://github.com/bonnginn/brain-practical-navi/blob/main/LICENSES.md", "Merge into unused label IDs, apply approved exact-grid segmentation patches, validate and compress, and record provenance and confidence metadata.", "Show manual, atlas-provisional, image-guided candidate and image-guided reviewed status separately; retain all BigBrain, Xiao, MNI and project notices; never describe the combined file as anatomical ground truth.", ["ATTRIBUTION.txt", "BIGBRAIN-DATA-LICENSE.txt", "BIGBRAIN-MANUAL-LICENSE.txt", "LICENSE.txt", "PROCEDURAL-NEUROVASCULAR-NOTICE.txt"]],
  ["mni-cerebra-browser-assets", "^(mni-cerebra-1mm\\.bin\\.gz|labels\\.json|pial-(left|right)\\.mesh(?:\\.gz)?|(?:caudate|hippocampus|thalamus|ventricle)\\.mesh|segment-[^.]+\\.mesh|surface-region-labels\\.json|section-(optic-chiasm|insula)\\.mesh)$", "MNI152NLin2009cSym, CerebrA and MNI152 high-density white surfaces via TemplateFlow/BigBrainWarp", "https://github.com/templateflow/tpl-MNI152NLin2009cSym", "MNI data license", "https://github.com/templateflow/tpl-MNI152NLin2009cSym/blob/master/License.txt", "1 mm browser volume, label lookup, pial-like normal expansion, sulcal shading, volumetric mesh extraction, surface-region sampling, provisional exact-grid mesh extraction, and deterministic lossless gzip sidecars for the two pial meshes.", "Retain the MNI copyright notice in every copy; identify CerebrA and derived/provisional transformations; do not imply endorsement or validated morphometry.", ["LICENSE.txt", "ATTRIBUTION.txt"]],
  ["specimen-block-assets", "^(specimen-blocks\\.json|block-[^.]+\\.mesh)$", "Mixed per-file sources recorded in specimen-blocks.json: BigBrain-derived tissue, manual labels, provisional same-grid labels, and project-authored schematic parts", "https://github.com/bonnginn/brain-practical-navi/blob/main/public/atlas/specimen-blocks.json", "Per sourceType; the distributed specimen package retains CC BY-NC-SA 4.0 for BigBrain derivatives and project teaching parts, CC BY 4.0 attribution for Xiao labels, and MNI terms where applicable", "https://github.com/bonnginn/brain-practical-navi/blob/main/DATA_AND_LICENSES.md", "BigBrain tissue reduced to 1 mm geometry with shade values; labelled and schematic structures separated into detachable parts.", "Use each file's sourceType; show specimen-derived, manual/provisional segmentation and schematic parts separately; retain non-commercial teaching-package notice and no-ground-truth disclaimer.", ["ATTRIBUTION.txt", "BIGBRAIN-DATA-LICENSE.txt", "BIGBRAIN-MANUAL-LICENSE.txt", "LICENSE.txt", "PROCEDURAL-NEUROVASCULAR-NOTICE.txt"]],
  ["project-authored-teaching-overlays", "^(surface-landmarks\\.json|surface-landmark-[^.]+\\.mesh|basal-landmarks\\.json|landmark-[^.]+\\.mesh|neurovascular-overlays\\.json|overlay-[^.]+\\.mesh)$", "Brain Practical Navigator contributors; manually placed or procedurally generated teaching paths and shapes", "https://github.com/bonnginn/brain-practical-navi", "CC BY-NC-SA 4.0 for generated teaching data; generator source is AGPL-3.0-or-later", "https://creativecommons.org/licenses/by-nc-sa/4.0/", "Projection to the application display space and conversion into lightweight WebGL meshes with selectable IDs where applicable.", "Identify as schematic or position guide; state major omissions; prohibit clinical or quantitative interpretation; imply no validation or endorsement.", ["PROCEDURAL-NEUROVASCULAR-NOTICE.txt", "ATTRIBUTION.txt"]],
  ["contributor-comparison-prototype-assets", "^comparison-schematic-ventricle\\.mesh$", "Brain Practical Navigator contributors", "https://github.com/bonnginn/brain-practical-navi", "CC BY-NC-SA 4.0 for the project-authored teaching mesh; generator source is AGPL-3.0-or-later", "https://creativecommons.org/licenses/by-nc-sa/4.0/", "Deterministic low-resolution schematic tube geometry authored for an opt-in contributor comparison prototype; no specimen or atlas vertices are sampled.", "Keep contributor-only scope; label as schematic and expert-unreviewed; state that it is not specimen-derived, not an anatomical ground-truth segmentation, and not a learner-facing replacement.", ["PROCEDURAL-NEUROVASCULAR-NOTICE.txt", "ATTRIBUTION.txt"]],
  ["structure-provenance-audit", "^structure-provenance\\.json$", "Brain Practical Navigator contributors", "https://github.com/bonnginn/brain-practical-navi", "CC BY-NC-SA 4.0 for project-authored educational audit metadata", "https://creativecommons.org/licenses/by-nc-sa/4.0/", "Project-maintained machine-readable index of lecture coverage, learner surfaces, provenance states, quiz eligibility and known limitations; it does not alter the underlying atlas assets.", "Retain the distinction between source data, provisional teaching representations, project review and expert review; do not describe the registry as anatomical ground truth or institutional approval.", ["ATTRIBUTION.txt"]],
  ["notices-and-attribution", "^(ATTRIBUTION\\.txt|BIGBRAIN-DATA-LICENSE\\.txt|BIGBRAIN-MANUAL-LICENSE\\.txt|LICENSE\\.txt|PROCEDURAL-NEUROVASCULAR-NOTICE\\.txt)$", "License, attribution and disclosure texts accompanying the distributed data", "https://github.com/bonnginn/brain-practical-navi/blob/main/DATA_AND_LICENSES.md", "Informational notices; underlying terms are named in each file", "https://github.com/bonnginn/brain-practical-navi/blob/main/LICENSES.md", "Project-maintained distribution notices.", "Ship these notices unchanged with every copy of the corresponding browser assets.", []],
];

const CONTRACT_KEYS = ["id", "pattern", "source", "sourceUrl", "license", "licenseUrl", "modifications", "displayObligation", "bundledNotices"];
export const REVIEWED_MANIFEST_GROUPS = Object.freeze(REVIEWED_GROUPS.map(([id, pattern, source, sourceUrl, license, licenseUrl, modifications, displayObligation, bundledNotices]) => Object.freeze({ id, pattern, source, sourceUrl, license, licenseUrl, modifications, displayObligation, bundledNotices: Object.freeze([...bundledNotices]) })));
export const EXPECTED_NOTICE_MATRIX = Object.freeze(Object.fromEntries(REVIEWED_MANIFEST_GROUPS.map(group => [group.id, group.bundledNotices])));
export const NOTICE_NAMES = Object.freeze(["ATTRIBUTION.txt", "BIGBRAIN-DATA-LICENSE.txt", "BIGBRAIN-MANUAL-LICENSE.txt", "LICENSE.txt", "PROCEDURAL-NEUROVASCULAR-NOTICE.txt"]);
export const PROJECT_AUTHORED_GROUP_ID = "project-authored-teaching-overlays";
export const LEGAL_DISCLOSURE_MARKERS = Object.freeze(["source-credit", "license-boundaries", "modifications", "no-endorsement", "educational-nonclinical", "privacy-analytics", "privacy-local-storage", "corresponding-source"]);
export const DEFAULT_SOURCE_URL = "https://github.com/bonnginn/brain-practical-navi";
export const REQUIRED_DISCLOSURE_PHRASES = Object.freeze({
  "source-credit": ["BigBrain"],
  "license-boundaries": ["AGPL-3.0-or-later", "CC BY-NC-SA 4.0"],
  modifications: ["再標本化"],
  "no-endorsement": ["原著者やデータ提供機関の推奨・承認を示すものではありません"],
  "educational-nonclinical": ["診断・治療・手術計画・定量研究"],
  "privacy-analytics": ["Cloudflare Web Analytics", "公開HTTPSホスト"],
  "privacy-local-storage": ["localStorage", "自動送信", "サイトデータを消去すると失われます"],
  "corresponding-source": ["対応ソース"],
});

function issue(code, message, details = undefined) {
  return details === undefined ? { code, message } : { code, message, details };
}

function sorted(values) { return [...values].sort((a, b) => a.localeCompare(b)); }
function arrayEqual(a, b) { return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((value, index) => value === b[index]); }
function escapeRegExp(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function readText(file) { return fs.readFileSync(file, "utf8"); }
function listFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? listFiles(path.join(dir, entry.name)).map(file => path.join(entry.name, file)) : [entry.name]);
}
function readManifest(atlasDir) {
  const file = path.join(atlasDir, "DATA-MANIFEST.json");
  return JSON.parse(readText(file));
}

function validateManifestContract(manifest, errors) {
  const groups = Array.isArray(manifest?.groups) ? manifest.groups : [];
  if (groups.length !== REVIEWED_MANIFEST_GROUPS.length) errors.push(issue("manifest-group-count", `Expected ${REVIEWED_MANIFEST_GROUPS.length} reviewed groups, got ${groups.length}.`));
  const seen = new Set();
  for (const group of groups) {
    if (!group || typeof group !== "object") { errors.push(issue("manifest-group-shape", "Manifest group is not an object.")); continue; }
    if (seen.has(group.id)) errors.push(issue("duplicate-group", `Duplicate manifest group: ${group.id}.`));
    if (Object.prototype.hasOwnProperty.call(group, "bundledNotice")) errors.push(issue("legacy-notice-schema", `${group.id} uses the retired bundledNotice field.`));
    if (!Array.isArray(group.bundledNotices)) errors.push(issue("notice-array", `${group.id}.bundledNotices must be an array.`));
    seen.add(group.id);
    const expected = REVIEWED_MANIFEST_GROUPS.find(item => item.id === group.id);
    if (!expected) { errors.push(issue("unknown-group", `Unexpected manifest group: ${String(group.id)}.`)); continue; }
    for (const key of CONTRACT_KEYS) {
      const same = key === "bundledNotices" ? arrayEqual(group[key], expected[key]) : group[key] === expected[key];
      if (!same) errors.push(issue("manifest-contract", `${group.id}.${key} differs from the reviewed contract.`));
    }
    const keys = Object.keys(group).sort();
    if (!arrayEqual(keys, [...CONTRACT_KEYS].sort())) errors.push(issue("manifest-fields", `${group.id} has unexpected or missing manifest fields.`));
    if (typeof group.pattern !== "string" || !group.pattern.startsWith("^") || !group.pattern.endsWith("$")) errors.push(issue("unanchored-pattern", `${group.id} pattern must be anchored with ^ and $.`));
    for (const key of ["sourceUrl", "licenseUrl"]) if (typeof group[key] !== "string" || !/^https:\/\//.test(group[key])) errors.push(issue("manifest-url", `${group.id}.${key} must be an HTTPS URL.`));
  }
  for (const expected of REVIEWED_MANIFEST_GROUPS) if (!seen.has(expected.id)) errors.push(issue("missing-group", `Missing reviewed manifest group: ${expected.id}.`));
}

export function validateNoticeContents(atlasDir, errors) {
  const names = new Set(listFiles(atlasDir));
  for (const notice of NOTICE_NAMES) {
    const file = path.join(atlasDir, notice);
    if (!names.has(notice)) { errors.push(issue("missing-notice", `Missing bundled notice: ${notice}.`)); continue; }
    let text = "";
    try { text = readText(file); } catch { /* handled as empty below */ }
    if (!text.trim()) errors.push(issue("empty-notice", `Bundled notice is empty: ${notice}.`));
  }
}

export function validateProceduralInventory(groups, atlasDir, errors) {
  const group = groups.find(item => item.id === PROJECT_AUTHORED_GROUP_ID);
  const noticeFile = path.join(atlasDir, "PROCEDURAL-NEUROVASCULAR-NOTICE.txt");
  if (!group || !fs.existsSync(noticeFile)) return;
  let expected = [];
  try { expected = listFiles(atlasDir).filter(name => name !== "DATA-MANIFEST.json" && !NOTICE_NAMES.includes(name) && new RegExp(group.pattern).test(name)); } catch { errors.push(issue("procedural-pattern", "Project-authored manifest pattern is invalid.")); return; }
  const noticeFiles = readText(noticeFile).split(/\r?\n/).map(line => line.match(/^[-*]\s+(.+?)\s*$/)?.[1]).filter(Boolean);
  if (!arrayEqual(sorted(noticeFiles), sorted(expected)) || new Set(noticeFiles).size !== noticeFiles.length) errors.push(issue("procedural-inventory", "Procedural notice file inventory differs from the manifest project-authored group."));
}

function validateNoticeReferences(manifest, atlasDir, errors) {
  const groups = Array.isArray(manifest?.groups) ? manifest.groups : [];
  const files = listFiles(atlasDir).filter(name => name !== "DATA-MANIFEST.json");
  const noticeGroup = groups.find(group => group.id === "notices-and-attribution");
  let noticeMatched = [];
  try { noticeMatched = files.filter(file => noticeGroup && new RegExp(noticeGroup.pattern).test(file)); } catch { /* contract error already reported */ }
  if (!arrayEqual(sorted(noticeMatched), sorted(NOTICE_NAMES))) errors.push(issue("notice-group", "The notices-and-attribution group does not match exactly the five notice files."));
  const refs = new Map(NOTICE_NAMES.map(name => [name, 0]));
  for (const group of groups) {
    if (Array.isArray(group.bundledNotices) && group.bundledNotices.length !== (EXPECTED_NOTICE_MATRIX[group.id]?.length ?? group.bundledNotices.length)) errors.push(issue("notice-matrix", `${group.id} bundledNotices differs from the reviewed notice matrix.`));
    for (const notice of Array.isArray(group.bundledNotices) ? group.bundledNotices : []) {
      if (!refs.has(notice)) errors.push(issue("unknown-notice-reference", `${group.id} references unknown notice ${notice}.`));
      else refs.set(notice, refs.get(notice) + (group.id === "notices-and-attribution" ? 0 : 1));
      if (!fs.existsSync(path.join(atlasDir, notice))) errors.push(issue("missing-notice-reference", `${group.id} references missing notice ${notice}.`));
    }
  }
  for (const [notice, count] of refs) if (count < 1) errors.push(issue("unreferenced-notice", `${notice} is not referenced by a non-notice group.`));
}

function validateAssetCoverage(manifest, atlasDir, errors) {
  const groups = Array.isArray(manifest?.groups) ? manifest.groups : [];
  const files = listFiles(atlasDir).filter(name => name !== "DATA-MANIFEST.json");
  for (const file of files) {
    const matches = groups.flatMap(group => {
      try { return new RegExp(group.pattern).test(file) ? [group.id] : []; } catch { return []; }
    });
    if (matches.length === 0) errors.push(issue("unmatched-asset", `${file} matches no manifest group.`));
    if (matches.length > 1) errors.push(issue("duplicate-asset", `${file} matches multiple manifest groups: ${matches.join(", ")}.`));
  }
}

export function validateSourceDisclosures(rootDir, errors, options = {}) {
  const source = path.join(rootDir, "app", "page.tsx");
  if (!fs.existsSync(source)) { errors.push(issue("source-page-missing", "app/page.tsx is missing.")); return; }
  const text = readText(source);
  const privacyParts = ["localStorage", "自動送信", "サイトデータを消去"];
  for (const part of privacyParts) if (!text.includes(part)) errors.push(issue("source-privacy-marker", `Missing privacy disclosure text: ${part}.`));
  if (!text.includes("原著者やデータ提供機関の推奨・承認を示すものではありません")) errors.push(issue("source-independence-marker", "Missing no-endorsement disclosure text."));
  const markerMatches = [...text.matchAll(/data-legal-disclosure\s*=\s*["']([^"']+)["']/g)].map(match => match[1]);
  if (options.requireMarkers !== false || markerMatches.length) {
    const legalDialogStart = text.indexOf('<section className="legalDialog" role="dialog" aria-modal="true" aria-labelledby="legal-title">');
    const legalDialogEnd = legalDialogStart >= 0 ? text.indexOf('</section>', legalDialogStart) : -1;
    if (legalDialogStart < 0 || legalDialogEnd < 0) errors.push(issue("legal-dialog-missing", "Legal disclosure markers require a bounded legal dialog."));
    for (const marker of LEGAL_DISCLOSURE_MARKERS) {
      const count = markerMatches.filter(value => value === marker).length;
      if (count !== 1) errors.push(issue("legal-marker", `Expected one data-legal-disclosure marker ${marker}, got ${count}.`));
      const markerPattern = new RegExp(`<([A-Za-z][A-Za-z0-9.]*)\\b[^>]*data-legal-disclosure=["']${escapeRegExp(marker)}["'][^>]*>`);
      const markedElement = text.match(markerPattern);
      const index = markedElement ? markedElement.index : -1;
      if (index >= 0 && (index < legalDialogStart || index > legalDialogEnd)) errors.push(issue("legal-marker-containment", `Legal marker ${marker} is outside the legal dialog.`));
      if (!markedElement) continue;
      const tagName = markedElement[1];
      const contentStart = index + markedElement[0].length;
      const closeIndex = text.indexOf(`</${tagName}>`, contentStart);
      if (closeIndex < 0 || closeIndex > legalDialogEnd) { errors.push(issue("legal-marker-boundary", `Legal marker ${marker} has no bounded closing ${tagName} element.`)); continue; }
      const content = text.slice(contentStart, closeIndex).replace(/<[^>]+>/g, "");
      if (!content.trim()) errors.push(issue("legal-marker-empty", `Legal marker ${marker} has no disclosure text in its own element.`));
      for (const phrase of REQUIRED_DISCLOSURE_PHRASES[marker] ?? []) if (!content.includes(phrase)) errors.push(issue("legal-marker-content", `Legal marker ${marker} is missing required phrase: ${phrase}.`));
    }
    const unknown = markerMatches.filter(marker => !LEGAL_DISCLOSURE_MARKERS.includes(marker));
    if (unknown.length) errors.push(issue("legal-marker-unknown", `Unknown legal disclosure markers: ${unknown.join(", ")}.`));
    const sourceMarker = text.match(/<a[^>]*data-legal-disclosure=["']corresponding-source["'][^>]*>/);
    if (!sourceMarker || !/href=\{sourceRepositoryUrl\}/.test(sourceMarker[0])) errors.push(issue("source-anchor", "The corresponding-source marker must be the sourceRepositoryUrl anchor."));
    if (!/const\s+sourceRepositoryUrl\s*=/.test(text) || !/VITE_SOURCE_REPOSITORY_URL/.test(text)) errors.push(issue("source-build-env", "Source URL must be derived from VITE_SOURCE_REPOSITORY_URL."));
    const viteConfig = path.join(rootDir, "vite.config.ts");
    if (fs.existsSync(viteConfig)) {
      const viteText = readText(viteConfig);
      if (!/process\.env\.VITE_SOURCE_REPOSITORY_URL/.test(viteText) || !/brain-practical-corresponding-source/.test(viteText)) errors.push(issue("source-meta-build-env", "Build-time corresponding-source meta must use the same VITE_SOURCE_REPOSITORY_URL environment variable."));
    }
  }
}

export function validatePublicRightsNotices({ manifest, atlasDir, mode = "source", rootDir = process.cwd(), expectedBase = null, expectedSourceUrl = null } = {}) {
  const errors = [];
  let actualManifest = manifest;
  try { actualManifest ??= readManifest(atlasDir); } catch (error) { errors.push(issue("manifest-read", `Unable to read DATA-MANIFEST.json: ${error.message}`)); actualManifest = { groups: [] }; }
  validateManifestContract(actualManifest, errors);
  validateNoticeContents(atlasDir, errors);
  validateNoticeReferences(actualManifest, atlasDir, errors);
  validateAssetCoverage(actualManifest, atlasDir, errors);
  validateProceduralInventory(actualManifest.groups ?? [], atlasDir, errors);
  validateSourceDisclosures(rootDir, errors, { requireMarkers: mode === "source" });
  const files = listFiles(atlasDir).filter(name => name !== "DATA-MANIFEST.json");
  let projectCount = 0;
  try { const pattern = new RegExp(REVIEWED_MANIFEST_GROUPS.find(group => group.id === PROJECT_AUTHORED_GROUP_ID).pattern); projectCount = files.filter(file => !NOTICE_NAMES.includes(file) && pattern.test(file)).length; } catch { /* contract errors already present */ }
  return { ok: errors.length === 0, mode, errors, summary: { assetCount: files.length, groupCount: Array.isArray(actualManifest.groups) ? actualManifest.groups.length : 0, noticeCount: NOTICE_NAMES.length, projectAuthoredAssetCount: projectCount, expectedBase: mode === "dist" ? expectedBase : null, expectedSourceUrl: mode === "dist" ? expectedSourceUrl : null } };
}

function htmlAttribute(value) { return value.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;/g, "'"); }
function collectTextFiles(root) {
  return listFiles(root).filter(file => /\.(?:html?|js|css|json|txt)$/i.test(file)).map(file => ({ file, text: readText(path.join(root, file)) }));
}
function validateDistBase(index, expectedBase, distRoot, errors) {
  if (!expectedBase) { errors.push(issue("dist-base-required", "Dist audit requires an exact expected base path.")); return; }
  if (expectedBase !== "/" && !/^\/[A-Za-z0-9._-]+\/$/.test(expectedBase)) errors.push(issue("dist-base-shape", `Invalid expected base path: ${expectedBase}.`));
  const refs = [...index.matchAll(/(?:src|href)=["']([^"']+)["']/g)].map(match => match[1]).filter(value => value.startsWith("/"));
  for (const ref of refs) {
    if (!ref.startsWith(expectedBase)) { errors.push(issue("dist-base-reference", `Dist index reference ${ref} does not use ${expectedBase}.`)); continue; }
    const relative = ref.slice(expectedBase.length).split(/[?#]/, 1)[0];
    if (relative.includes("..") || relative.startsWith("/")) { errors.push(issue("dist-base-reference", `Dist index reference ${ref} cannot be resolved beneath ${expectedBase}.`)); continue; }
    if (distRoot && !fs.existsSync(path.join(distRoot, relative))) errors.push(issue("dist-local-ref-missing", `Dist index reference ${ref} does not resolve to a file under dist.`));
  }
  if (expectedBase === "/" && refs.some(ref => ref.startsWith("/brain-practical-navi/"))) errors.push(issue("dist-base-cross-mode", "Normal dist contains GitHub Pages base references."));
  if (expectedBase === "/brain-practical-navi/" && refs.some(ref => ref.startsWith("/assets/"))) errors.push(issue("dist-base-cross-mode", "Pages dist contains normal-root asset references."));
}

function validateExactAtlasTree(sourceAtlas, distAtlas, errors) {
  if (!sourceAtlas) return;
  if (!fs.existsSync(sourceAtlas)) { errors.push(issue("dist-source-root", `Source atlas does not exist: ${sourceAtlas}.`)); return; }
  const sourceFiles = listFiles(sourceAtlas);
  const distFiles = listFiles(distAtlas);
  for (const file of sourceFiles) if (!distFiles.includes(file)) errors.push(issue("dist-atlas-missing", `Dist atlas is missing ${file}.`));
  for (const file of distFiles) if (!sourceFiles.includes(file)) errors.push(issue("dist-atlas-extra", `Dist atlas has an extra file ${file}.`));
  for (const file of sourceFiles) {
    if (!distFiles.includes(file)) continue;
    const source = fs.readFileSync(path.join(sourceAtlas, file));
    const dist = fs.readFileSync(path.join(distAtlas, file));
    if (!source.equals(dist)) errors.push(issue("dist-atlas-byte-mismatch", `Dist atlas differs byte-for-byte from source for ${file}.`));
  }
}

export function validateDistBundle(distRoot, expectedBase, expectedSourceUrl, errors = [], sourceRoot = undefined) {
  if (!expectedBase) errors.push(issue("dist-base-required", "Dist audit requires expected base."));
  if (!expectedSourceUrl) errors.push(issue("dist-source-required", "Dist audit requires expected source URL."));
  const indexPath = path.join(distRoot, "index.html");
  if (!fs.existsSync(indexPath)) { errors.push(issue("dist-index-missing", "Dist index.html is missing.")); return errors; }
  const index = readText(indexPath);
  validateDistBase(index, expectedBase, distRoot, errors);
  const meta = [...index.matchAll(/<meta\s+name=["']brain-practical-corresponding-source["']\s+content=["']([^"']*)["']\s*\/?>(?:\s*)/gi)].map(match => htmlAttribute(match[1]));
  if (meta.length !== 1) errors.push(issue("dist-source-meta-cardinality", `Expected exactly one corresponding-source meta, got ${meta.length}.`));
  else if (expectedSourceUrl && meta[0] !== expectedSourceUrl) {
    errors.push(issue("dist-source-meta", `Corresponding-source meta is ${meta[0]}, expected ${expectedSourceUrl}.`));
    errors.push(issue("dist-source-url", `Dist corresponding-source URL is ${meta[0]}, expected ${expectedSourceUrl}.`));
  }
  const textFiles = collectTextFiles(distRoot);
  const bundle = textFiles.map(item => item.text).join("\n");
  const requiredDistMarkers = [...LEGAL_DISCLOSURE_MARKERS];
  const markerCounts = Object.fromEntries(requiredDistMarkers.map(marker => [marker, bundle.match(new RegExp(`data-legal-disclosure.{0,48}${escapeRegExp(marker)}`, "g"))?.length ?? 0]));
  const missingDistMarkers = requiredDistMarkers.filter(marker => markerCounts[marker] === 0);
  for (const marker of missingDistMarkers) errors.push(issue(`dist-${marker}-marker`, `Dist bundle is missing legal disclosure marker ${marker}.`));
  for (const marker of requiredDistMarkers) if (markerCounts[marker] !== 1) errors.push(issue("dist-marker-cardinality", `Dist bundle contains ${markerCounts[marker]} copies of legal disclosure marker ${marker}; expected one.`));
  if (missingDistMarkers.includes("privacy-analytics") || missingDistMarkers.includes("privacy-local-storage")) errors.push(issue("dist-privacy-marker", "Dist bundle is missing privacy disclosure markers."));
  if (missingDistMarkers.includes("no-endorsement")) errors.push(issue("dist-independence-marker", "Dist bundle is missing no-endorsement disclosure marker."));
  if (sourceRoot) validateExactAtlasTree(path.join(sourceRoot, "public", "atlas"), path.join(distRoot, "atlas"), errors);
  return errors;
}

export function auditPublicRightsNotices({ mode = "source", repositoryRoot = process.cwd(), distRoot = path.join(repositoryRoot, "dist"), expectedBase = mode === "dist" ? "/" : null, expectedSourceUrl = mode === "dist" ? DEFAULT_SOURCE_URL : null } = {}) {
  const root = path.resolve(repositoryRoot);
  const atlasDir = path.join(root, "public", "atlas");
  if (mode === "source") return validatePublicRightsNotices({ atlasDir, rootDir: root, mode });
  const errors = [];
  const sourceReport = validatePublicRightsNotices({ atlasDir, rootDir: root, mode: "source" });
  errors.push(...sourceReport.errors.map(error => ({ ...error, phase: "source" })));
  validateDistBundle(path.resolve(distRoot), expectedBase, expectedSourceUrl, errors, root);
  return { ok: errors.length === 0, mode, errors, summary: { assetCount: sourceReport.summary.assetCount, groupCount: sourceReport.summary.groupCount, noticeCount: sourceReport.summary.noticeCount, projectAuthoredAssetCount: sourceReport.summary.projectAuthoredAssetCount, expectedBase, expectedSourceUrl } };
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2).replaceAll("-", "_");
    args[key] = argv[index + 1]?.startsWith("--") ? true : argv[++index];
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { console.log("Usage: node scripts/audit_public_rights_notices.mjs --mode source|dist --root . [--dist-root dist --expected-base / --expected-source-url URL --output report.json]"); return; }
  const mode = args.mode ?? "source";
  const root = path.resolve(args.root ?? process.cwd());
  const report = await auditPublicRightsNotices({ mode, repositoryRoot: root, distRoot: path.resolve(args.dist_root ?? path.join(root, "dist")), expectedBase: args.expected_base ?? (mode === "dist" ? "/" : null), expectedSourceUrl: args.expected_source_url ?? (mode === "dist" ? DEFAULT_SOURCE_URL : null) });
  if (args.output) { await fsp.mkdir(path.dirname(path.resolve(args.output)), { recursive: true }); await fsp.writeFile(path.resolve(args.output), `${JSON.stringify(report, null, 2)}\n`, "utf8"); }
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exitCode = 1;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) await main();
