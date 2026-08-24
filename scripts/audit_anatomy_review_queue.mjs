import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { deriveAnatomyReviewQueue, filterAnatomyReviewQueue, isLegacyOpticEntry, isMammillaryEntry, observationHashForEntry, observationWorkspaceForEntry } from "../src/anatomyReviewQueue.mjs";

export const REPOSITORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const REGISTRY_RELATIVE_PATH = "public/atlas/structure-provenance.json";
export const MANIFEST_RELATIVE_PATH = "public/atlas/DATA-MANIFEST.json";
export const PAGE_RELATIVE_PATH = "app/page.tsx";
export const REVIEW_REPRESENTATIONS = Object.freeze([
  "manual-same-grid",
  "atlas-provisional",
  "image-guided-provisional",
  "image-guided-reviewed",
  "atlas-surface",
  "schematic-3d",
  "position-guide",
  "text-only",
  "not-recorded",
]);
export const REVIEW_SURFACES = Object.freeze(["surface", "sections", "blocks", "quiz"]);
export const REVIEW_STATES = Object.freeze(["pending", "expert-reviewed"]);
export const PROJECT_REVIEW_STATES = Object.freeze(["pending", "reviewed-by-project"]);
export const QUIZ_STATES = Object.freeze(["standard", "pilot", "none"]);
export const OBSERVATION_HASHES = Object.freeze(["#workspace/surface", "#workspace/sections", "#workspace/blocks", "#workspace/quiz"]);

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function readJson(rootDir, relativePath) {
  return JSON.parse(fs.readFileSync(path.join(rootDir, relativePath), "utf8"));
}

function resolveSourceRef(ref, rootDir, groupIds) {
  if (groupIds.has(ref)) return true;
  const relative = ref.startsWith("public/atlas/") ? ref : `public/atlas/${ref}`;
  return fs.existsSync(path.join(rootDir, relative));
}

function validateEntry(entry, index, rootDir, groupIds, errors) {
  const prefix = `entries[${index}]`;
  if (!isRecord(entry)) {
    errors.push(`${prefix} must be an object`);
    return;
  }
  if (typeof entry.key !== "string" || entry.key.trim() === "") errors.push(`${prefix}.key must be a non-empty stable key`);
  if (!REVIEW_STATES.includes(entry.expertReview)) errors.push(`${prefix}.expertReview must be pending or expert-reviewed`);
  if (!PROJECT_REVIEW_STATES.includes(entry.projectReview)) errors.push(`${prefix}.projectReview must be pending or reviewed-by-project`);
  if (!QUIZ_STATES.includes(entry.quizEligibility)) errors.push(`${prefix}.quizEligibility is invalid`);
  if (!Array.isArray(entry.representations) || entry.representations.length === 0) errors.push(`${prefix}.representations must be a non-empty array`);
  else for (const value of entry.representations) if (!REVIEW_REPRESENTATIONS.includes(value)) errors.push(`${prefix}.representations contains an unknown value: ${value}`);
  if (!Array.isArray(entry.learnerSurfaces)) errors.push(`${prefix}.learnerSurfaces must be an array`);
  else for (const value of entry.learnerSurfaces) if (!REVIEW_SURFACES.includes(value)) errors.push(`${prefix}.learnerSurfaces contains an unknown value: ${value}`);
  if (!Array.isArray(entry.sourceRefs)) errors.push(`${prefix}.sourceRefs must be an array`);
  else for (const ref of entry.sourceRefs) {
    if (typeof ref !== "string" || ref.trim() === "") errors.push(`${prefix}.sourceRefs contains an invalid reference`);
    else if (!resolveSourceRef(ref, rootDir, groupIds)) errors.push(`${prefix}.sourceRefs does not resolve: ${ref}`);
  }
  if (!Array.isArray(entry.knownLimitations) || entry.knownLimitations.length === 0 || entry.knownLimitations.some(value => typeof value !== "string" || value.trim() === "")) {
    errors.push(`${prefix}.knownLimitations must contain non-empty text`);
  }
}

function validateTopLevelEnums(registry, errors) {
  if (JSON.stringify(registry.representationEnum) !== JSON.stringify(REVIEW_REPRESENTATIONS)) errors.push("representationEnum drifted from the review queue contract");
  if (JSON.stringify(registry.learnerSurfaceEnum) !== JSON.stringify(REVIEW_SURFACES)) errors.push("learnerSurfaceEnum drifted from the review queue contract");
  if (JSON.stringify(registry.expertReviewEnum) !== JSON.stringify(REVIEW_STATES)) errors.push("expertReviewEnum drifted from the review queue contract");
  if (JSON.stringify(registry.projectReviewEnum) !== JSON.stringify(PROJECT_REVIEW_STATES)) errors.push("projectReviewEnum drifted from the review queue contract");
  if (JSON.stringify(registry.quizEligibilityEnum) !== JSON.stringify(QUIZ_STATES)) errors.push("quizEligibilityEnum drifted from the review queue contract");
}

function validateReadOnlyPage(rootDir, errors) {
  let page;
  try { page = fs.readFileSync(path.join(rootDir, PAGE_RELATIVE_PATH), "utf8"); }
  catch (error) { errors.push(`could not read page source: ${error.message}`); return; }
  if (!page.includes("deriveAnatomyReviewQueue")) errors.push("page does not derive the anatomy review queue");
  if (!page.includes("anatomyReviewReadOnly")) errors.push("page does not expose the read-only review panel marker");
  if (!page.includes("専門家レビュー準備")) errors.push("page does not label the review preparation panel");
  if (!page.includes("一般の{observationLabel}画面を開く") || !page.includes("自動選択されません")) errors.push("page does not expose a generic observation link");
  if (page.includes("anatomyReviewApprove") || page.includes("anatomyReviewSave") || page.includes("anatomyReviewReviewerName")) {
    errors.push("review queue must not expose approval, save, or reviewer-name state");
  }
}

export function auditAnatomyReviewQueue({registry, rootDir = REPOSITORY_ROOT, checkPage = true} = {}) {
  const errors = [];
  let loaded = registry;
  try { if (!loaded) loaded = readJson(rootDir, REGISTRY_RELATIVE_PATH); }
  catch (error) { return {ok: false, errors: [`could not read provenance registry: ${error.message}`], summary: {}}; }
  if (!isRecord(loaded)) return {ok: false, errors: ["provenance registry root must be an object"], summary: {}};
  validateTopLevelEnums(loaded, errors);
  let groupIds = new Set();
  try { groupIds = new Set((readJson(rootDir, MANIFEST_RELATIVE_PATH).groups ?? []).map(group => group?.id).filter(value => typeof value === "string")); }
  catch (error) { errors.push(`could not read data manifest: ${error.message}`); }
  const entries = Array.isArray(loaded.entries) ? loaded.entries : [];
  if (!Array.isArray(loaded.entries)) errors.push("provenance registry entries must be an array");
  const allKeys = new Set();
  entries.forEach((entry, index) => {
    if (typeof entry?.key === "string" && allKeys.has(entry.key)) errors.push(`duplicate provenance key: ${entry.key}`);
    if (typeof entry?.key === "string") allKeys.add(entry.key);
    validateEntry(entry, index, rootDir, groupIds, errors);
  });
  let queue = [];
  try { queue = deriveAnatomyReviewQueue(loaded); }
  catch (error) { errors.push(error.message); }
  const expectedPending = entries.filter(entry => entry?.expertReview === "pending").map(entry => entry.key);
  const queueKeys = queue.map(item => item.key);
  if (new Set(queueKeys).size !== queueKeys.length) errors.push("derived review queue contains duplicate stable keys");
  if (JSON.stringify([...queueKeys].sort()) !== JSON.stringify([...expectedPending].sort())) errors.push("derived review queue is missing or adding pending entries");
  for (const item of queue) {
    const hash = observationHashForEntry(item.entry);
    if (hash !== null && !OBSERVATION_HASHES.includes(hash)) errors.push(`queue observation hash must be a generic workspace hash: ${item.key} -> ${hash}`);
  }
  const legacyEntries = entries.filter(isLegacyOpticEntry);
  if (legacyEntries.length !== 1) errors.push(`legacy ID33 entry count must be 1, got ${legacyEntries.length}`);
  else {
    const legacy = legacyEntries[0];
    if (legacy.excludedFromSectionAndQuizTargets !== true) errors.push("legacy ID33 entry must be explicitly excluded from section and quiz targets");
    if (legacy.learnerSurfaces?.includes("sections") || legacy.learnerSurfaces?.includes("quiz")) errors.push("legacy ID33 entry cannot expose section or quiz learner surfaces");
    if (legacy.appKeys?.includes("opticChiasm")) errors.push("legacy ID33 entry cannot expose the opticChiasm app key");
    if (observationWorkspaceForEntry(legacy) !== "surface") errors.push("legacy ID33 may only expose the generic surface observation entry");
  }
  const mammillaryEntries = entries.filter(isMammillaryEntry);
  if (mammillaryEntries.length !== 1) errors.push(`mammillary ID39/40 entry count must be 1, got ${mammillaryEntries.length}`);
  else {
    const mammillary = mammillaryEntries[0];
    if (mammillary.expertReview !== "pending") errors.push("mammillary ID39/40 expertReview must remain pending");
    if (mammillary.projectReview !== "reviewed-by-project") errors.push("mammillary ID39/40 projectReview must be reviewed-by-project");
  }
  if (checkPage) validateReadOnlyPage(rootDir, errors);
  return {
    ok: errors.length === 0,
    errors,
    summary: {
      entryCount: entries.length,
      pendingCount: queue.length,
      expertReviewedCount: entries.filter(entry => entry?.expertReview === "expert-reviewed").length,
      surfaceCount: filterAnatomyReviewQueue(queue, {surface: "surface"}).length,
      sectionsCount: filterAnatomyReviewQueue(queue, {surface: "sections"}).length,
      blocksCount: filterAnatomyReviewQueue(queue, {surface: "blocks"}).length,
      quizCount: filterAnatomyReviewQueue(queue, {surface: "quiz"}).length,
    },
  };
}

function parseArgs(argv) {
  const args = {output: null};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--output") { args.output = argv[++index]; if (!args.output) throw new Error("--output requires a path"); }
    else if (arg === "--no-page") args.checkPage = false;
    else if (arg === "--help" || arg === "-h") args.help = true;
    else throw new Error(`unknown option: ${arg}`);
  }
  return args;
}

export function main(argv = process.argv.slice(2)) {
  let args;
  try { args = parseArgs(argv); }
  catch (error) { console.error(error.message); process.exitCode = 1; return; }
  if (args.help) { console.log("Usage: node scripts/audit_anatomy_review_queue.mjs [--output path] [--no-page]"); return; }
  const report = auditAnatomyReviewQueue({checkPage: args.checkPage !== false});
  const output = JSON.stringify({generatedAt: new Date().toISOString(), ...report}, null, 2);
  console.log(output);
  if (args.output) {
    const outputPath = path.resolve(REPOSITORY_ROOT, args.output);
    fs.mkdirSync(path.dirname(outputPath), {recursive: true});
    fs.writeFileSync(outputPath, `${output}\n`, "utf8");
  }
  if (!report.ok) process.exitCode = 1;
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : "";
if (import.meta.url === invokedPath) main();
