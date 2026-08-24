import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
export const REPOSITORY_ROOT = path.resolve(SCRIPT_DIR, "..");
export const REGISTRY_RELATIVE_PATH = "public/atlas/structure-provenance.json";
export const LECTURE_AUDIT_RELATIVE_PATH = "LECTURE_COVERAGE_AUDIT.md";
export const APP_SOURCE_RELATIVE_PATH = "app/page.tsx";
export const MANIFEST_RELATIVE_PATH = "public/atlas/DATA-MANIFEST.json";

export const REPRESENTATIONS = [
  "manual-same-grid",
  "atlas-provisional",
  "image-guided-provisional",
  "image-guided-reviewed",
  "atlas-surface",
  "schematic-3d",
  "position-guide",
  "text-only",
  "not-recorded",
];
export const LEARNER_SURFACES = ["surface", "sections", "blocks", "quiz"];
export const EXPERT_REVIEW_STATES = ["pending", "expert-reviewed"];
export const PROJECT_REVIEW_STATES = ["pending", "reviewed-by-project"];
export const QUIZ_ELIGIBILITY = ["standard", "pilot", "none"];

function arraysEqual(left, right) {
  return Array.isArray(left) && left.length === right.length && left.every((value, index) => value === right[index]);
}

function validateTopLevelEnums(registry, errors) {
  const expected = [
    ["representationEnum", REPRESENTATIONS],
    ["learnerSurfaceEnum", LEARNER_SURFACES],
    ["expertReviewEnum", EXPERT_REVIEW_STATES],
    ["projectReviewEnum", PROJECT_REVIEW_STATES],
    ["quizEligibilityEnum", QUIZ_ELIGIBILITY],
  ];
  for (const [field, values] of expected) {
    if (!arraysEqual(registry[field], values)) errors.push(`${field} must exactly match the audit script enum`);
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readRepositoryFile(rootDir, relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function lectureLabels(markdown) {
  return markdown
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.startsWith("|") && line.endsWith("|"))
    .filter(line => !line.startsWith("| ---"))
    .map(line => line.split("|").slice(1, -1).map(cell => cell.trim()))
    .filter(cells => cells.length >= 4 && cells[0] !== "構造")
    .map(cells => cells[0]);
}

function appQuizTargets(source) {
  const blockMatch = source.match(/const quizQuestions:QuizQuestion\[\]=\[(?<body>[\s\S]*?)\n\];/);
  if (!blockMatch) throw new Error("Could not locate quizQuestions in app/page.tsx");
  const questions = [...blockMatch.groups.body.matchAll(/\{target:"(?<target>[^"]+)",category:"(?<category>[^"]+)"/g)]
    .map(match => ({ target: match.groups.target, category: match.groups.category }));
  if (questions.length === 0) throw new Error("No quiz targets found in app/page.tsx");

  // The neurovascular pilot is intentionally kept in a separate inventory so
  // the reviewed 23-question snapshot above remains independently auditable.
  // It uses an overlay registry rather than the section `structures` map.
  const neurovascularBlockMatch = source.match(/const neurovascularQuizQuestions:NeurovascularQuizQuestion\[\]=\[(?<body>[\s\S]*?)\n\];/);
  if (!neurovascularBlockMatch) throw new Error("Could not locate neurovascularQuizQuestions in app/page.tsx");
  const neurovascularQuestions = [...neurovascularBlockMatch.groups.body.matchAll(/\{target:"(?<target>[^"]+)",category:"(?<category>[^"]+)"/g)]
    .map(match => ({ target: match.groups.target, category: match.groups.category, neurovascular: true }));

  const structureMatch = source.match(/const structures: Record<StructureKey, StructureInfo> = \{(?<body>[\s\S]*?)\n\};/);
  if (!structureMatch) throw new Error("Could not locate structures in app/page.tsx");
  const labelSources = new Map();
  for (const match of structureMatch.groups.body.matchAll(/^\s*(?<key>[A-Za-z][A-Za-z0-9]*):\s*\{[^\n]*?labelSource:"(?<labelSource>[^"]+)"/gm)) {
    labelSources.set(match.groups.key, match.groups.labelSource);
  }

  return [...questions, ...neurovascularQuestions].map(question => {
    if (question.neurovascular) return { ...question, expectedEligibility: "pilot" };
    if (question.category === "surface") return { ...question, expectedEligibility: "pilot" };
    const labelSource = labelSources.get(question.target);
    if (!labelSource) throw new Error(`Could not resolve labelSource for quiz target ${question.target}`);
    const expectedEligibility = ["atlas-provisional", "image-guided"].includes(labelSource) ? "pilot" : "standard";
    return { ...question, labelSource, expectedEligibility };
  });
}

function resolveSourceRefs(registry, rootDir, errors) {
  const manifest = readJson(path.join(rootDir, MANIFEST_RELATIVE_PATH));
  const groupIds = new Set((manifest.groups ?? []).map(group => group.id));
  const atlasDir = path.join(rootDir, "public/atlas");
  const allEntries = registry.entries ?? [];
  for (const entry of allEntries) {
    for (const ref of entry.sourceRefs ?? []) {
      if (groupIds.has(ref)) continue;
      const relativeFile = ref.startsWith("public/atlas/") ? ref : `public/atlas/${ref}`;
      if (!fs.existsSync(path.join(rootDir, relativeFile))) {
        errors.push(`${entry.key}: sourceRef does not resolve to a DATA-MANIFEST group or public/atlas file: ${ref}`);
      }
    }
    for (const asset of entry.hiddenAssets ?? []) {
      if (!fs.existsSync(path.join(atlasDir, asset))) {
        errors.push(`${entry.key}: hidden asset does not exist under public/atlas: ${asset}`);
      }
    }
  }
}

function isIsoDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function validateReviewEvidence(entry, reviewField, evidenceField, prefix, rootDir, errors) {
  if (entry[reviewField] !== "expert-reviewed" && entry[reviewField] !== "reviewed-by-project") return;
  const evidence = entry[evidenceField];
  if (!isPlainObject(evidence)) {
    errors.push(`${prefix}: ${evidenceField} is required when ${reviewField} is ${entry[reviewField]}`);
    return;
  }
  if (typeof evidence.reviewerRole !== "string" || evidence.reviewerRole.trim() === "") {
    errors.push(`${prefix}: ${evidenceField}.reviewerRole must be a non-empty string`);
  }
  if (!isIsoDate(evidence.date)) {
    errors.push(`${prefix}: ${evidenceField}.date must be YYYY-MM-DD`);
  }
  if (typeof evidence.documentRef !== "string" || evidence.documentRef.trim() === "") {
    errors.push(`${prefix}: ${evidenceField}.documentRef must be a non-empty string`);
    return;
  }
  const resolved = path.resolve(rootDir, evidence.documentRef);
  const relative = path.relative(rootDir, resolved);
  if (path.isAbsolute(evidence.documentRef) || relative.startsWith("..") || path.isAbsolute(relative) || !fs.existsSync(resolved)) {
    errors.push(`${prefix}: ${evidenceField}.documentRef must resolve to an existing repository file: ${evidence.documentRef}`);
  }
}

function validateEntryShape(entry, index, errors, rootDir) {
  const prefix = `entries[${index}]`;
  for (const field of ["key", "expertReview", "projectReview", "quizEligibility"]) {
    if (typeof entry[field] !== "string" || entry[field].length === 0) errors.push(`${prefix}: required string ${field} is missing`);
  }
  for (const field of ["representations", "learnerSurfaces", "sourceRefs", "knownLimitations"]) {
    if (!Array.isArray(entry[field])) errors.push(`${prefix}: required array ${field} is missing`);
  }
  if (Array.isArray(entry.representations)) {
    if (entry.representations.length === 0) errors.push(`${prefix}: representations must not be empty`);
    for (const representation of entry.representations) {
      if (!REPRESENTATIONS.includes(representation)) errors.push(`${prefix}: unknown representation ${representation}`);
    }
  }
  if (Array.isArray(entry.learnerSurfaces)) {
    for (const surface of entry.learnerSurfaces) {
      if (!LEARNER_SURFACES.includes(surface)) errors.push(`${prefix}: unknown learnerSurface ${surface}`);
    }
  }
  if (!EXPERT_REVIEW_STATES.includes(entry.expertReview)) errors.push(`${prefix}: expertReview must be pending or expert-reviewed`);
  if (!PROJECT_REVIEW_STATES.includes(entry.projectReview)) errors.push(`${prefix}: projectReview must be pending or reviewed-by-project`);
  validateReviewEvidence(entry, "expertReview", "expertReviewEvidence", prefix, rootDir, errors);
  validateReviewEvidence(entry, "projectReview", "projectReviewEvidence", prefix, rootDir, errors);
  if (!QUIZ_ELIGIBILITY.includes(entry.quizEligibility)) errors.push(`${prefix}: unknown quizEligibility ${entry.quizEligibility}`);
  if (Array.isArray(entry.knownLimitations) && (entry.knownLimitations.length === 0 || entry.knownLimitations.some(item => typeof item !== "string" || item.trim() === ""))) {
    errors.push(`${prefix}: knownLimitations must contain explanatory text`);
  }
  if (Array.isArray(entry.representations) && ["schematic-3d", "position-guide", "not-recorded"].some(item => entry.representations.includes(item)) && entry.quizEligibility === "standard") {
    errors.push(`${prefix}: schematic/position/not-recorded representation cannot be standard quiz material`);
  }
  if (entry.representations?.includes("not-recorded")) {
    if (entry.representations.length !== 1) errors.push(`${prefix}: not-recorded cannot be combined with an asset representation`);
    if ((entry.sourceRefs ?? []).length !== 0) errors.push(`${prefix}: not-recorded entry cannot have sourceRefs/assets`);
    if ((entry.learnerSurfaces ?? []).length !== 0) errors.push(`${prefix}: not-recorded entry cannot have learner surfaces`);
    if (entry.quizEligibility !== "none") errors.push(`${prefix}: not-recorded entry cannot be quiz material`);
    if ((entry.appKeys ?? []).length !== 0) errors.push(`${prefix}: not-recorded entry cannot expose app keys`);
    if ((entry.hiddenAssets ?? []).length !== 0) errors.push(`${prefix}: not-recorded entry cannot have hidden assets`);
  }
}

function validateQuizTargets(registry, source, errors) {
  const expectedTargets = appQuizTargets(source);
  const mappings = Array.isArray(registry.quizTargets) ? registry.quizTargets : [];
  const mappingByTarget = new Map();
  for (const mapping of mappings) {
    if (!isPlainObject(mapping) || typeof mapping.target !== "string") {
      errors.push("quizTargets contains an invalid mapping");
      continue;
    }
    if (mappingByTarget.has(mapping.target)) errors.push(`quizTargets duplicates app target ${mapping.target}`);
    mappingByTarget.set(mapping.target, mapping);
  }
  const entriesByKey = new Map((registry.entries ?? []).map(entry => [entry.key, entry]));
  const mappedKeys = new Set();
  for (const expected of expectedTargets) {
    const mapping = mappingByTarget.get(expected.target);
    if (!mapping) {
      errors.push(`app quiz target is not mapped in provenance registry: ${expected.target}`);
      continue;
    }
    mappedKeys.add(expected.target);
    if (mapping.eligibility !== expected.expectedEligibility) {
      errors.push(`quiz target ${expected.target}: expected ${expected.expectedEligibility}, got ${mapping.eligibility}`);
    }
    const entry = entriesByKey.get(mapping.entryKey);
    if (!entry) {
      errors.push(`quiz target ${expected.target}: entryKey does not exist: ${mapping.entryKey}`);
      continue;
    }
    if (!Array.isArray(entry.appKeys) || !entry.appKeys.includes(expected.target)) {
      errors.push(`quiz target ${expected.target}: referenced entry does not list appKeys target`);
    }
    if (entry.quizEligibility !== expected.expectedEligibility) {
      errors.push(`quiz target ${expected.target}: entry quizEligibility disagrees with app source (${entry.quizEligibility} vs ${expected.expectedEligibility})`);
    }
  }
  for (const mapping of mappings) {
    if (typeof mapping?.target === "string" && !mappedKeys.has(mapping.target)) errors.push(`registry quiz target is not present in app quizQuestions: ${mapping.target}`);
    if (!QUIZ_ELIGIBILITY.includes(mapping?.eligibility)) errors.push(`quiz target ${mapping?.target ?? "?"}: unknown eligibility ${mapping?.eligibility}`);
  }
}

function validateQuizSurfaceReferences(registry, errors) {
  const mappings = Array.isArray(registry.quizTargets) ? registry.quizTargets : [];
  const mappedEntryKeys = new Set(mappings.map(mapping => mapping?.entryKey).filter(key => typeof key === "string"));
  for (const entry of registry.entries ?? []) {
    const hasQuizSurface = Array.isArray(entry.learnerSurfaces) && entry.learnerSurfaces.includes("quiz");
    const isQuizEligible = entry.quizEligibility !== "none";
    if ((hasQuizSurface || isQuizEligible) && !mappedEntryKeys.has(entry.key)) {
      errors.push(`${entry.key}: quiz-eligible or quiz learner surface entry must be referenced by quizTargets`);
    }
    if (mappedEntryKeys.has(entry.key) && (!hasQuizSurface || entry.quizEligibility === "none")) {
      errors.push(`${entry.key}: quizTargets reference requires quiz learner surface and non-none quizEligibility`);
    }
  }
}

function validateDuplicateLectureAppKeys(registry, errors) {
  const owners = new Map();
  for (const entry of registry.entries ?? []) {
    if (typeof entry.lectureLabel !== "string" || !Array.isArray(entry.appKeys)) continue;
    for (const appKey of entry.appKeys) {
      if (!owners.has(appKey)) owners.set(appKey, []);
      owners.get(appKey).push(entry.key);
    }
  }
  for (const [appKey, entryKeys] of owners) {
    if (entryKeys.length > 1) errors.push(`duplicate appKey across lecture entries: ${appKey} (${entryKeys.join(", ")})`);
  }
}

export function auditStructureProvenance({ registry, rootDir = REPOSITORY_ROOT } = {}) {
  const errors = [];
  let loadedRegistry = registry;
  try {
    if (!loadedRegistry) loadedRegistry = readJson(path.join(rootDir, REGISTRY_RELATIVE_PATH));
  } catch (error) {
    return { ok: false, errors: [`could not read registry: ${error.message}`], summary: {} };
  }
  if (!isPlainObject(loadedRegistry)) return { ok: false, errors: ["registry root must be an object"], summary: {} };
  if (loadedRegistry.schemaVersion !== 1) errors.push("registry schemaVersion must be 1");
  validateTopLevelEnums(loadedRegistry, errors);
  if (!Array.isArray(loadedRegistry.entries)) errors.push("registry entries must be an array");
  const entries = Array.isArray(loadedRegistry.entries) ? loadedRegistry.entries : [];
  const keys = new Set();
  for (const [index, entry] of entries.entries()) {
    if (keys.has(entry?.key)) errors.push(`duplicate entry key: ${entry.key}`);
    if (typeof entry?.key === "string") keys.add(entry.key);
    validateEntryShape(entry ?? {}, index, errors, rootDir);
  }
  try {
    const labels = lectureLabels(readRepositoryFile(rootDir, LECTURE_AUDIT_RELATIVE_PATH));
    const actualLabels = new Set(labels);
    const entryLabels = new Set(entries.filter(entry => typeof entry.lectureLabel === "string").map(entry => entry.lectureLabel));
    for (const label of labels) if (!entryLabels.has(label)) errors.push(`lecture audit row is not covered by registry: ${label}`);
    for (const label of entryLabels) if (!actualLabels.has(label)) errors.push(`registry lectureLabel is not present in lecture audit: ${label}`);
  } catch (error) {
    errors.push(`could not read lecture audit: ${error.message}`);
  }
  try {
    resolveSourceRefs(loadedRegistry, rootDir, errors);
  } catch (error) {
    errors.push(`could not resolve sourceRefs: ${error.message}`);
  }
  const oldId33 = entries.filter(entry => (entry.legacyIds ?? []).includes(33) || (entry.labelIds ?? []).includes(33));
  if (oldId33.length !== 1) errors.push(`old ID33 must have exactly one legacy provenance entry, found ${oldId33.length}`);
  else {
    const entry = oldId33[0];
    if (entry.quizEligibility === "standard") errors.push("old ID33 cannot be standard quiz material");
    if (entry.learnerSurfaces?.includes("sections")) errors.push("old ID33 cannot be learner-facing section material");
    if (entry.appKeys?.includes("opticChiasm")) errors.push("old ID33 cannot be mapped to the app opticChiasm section key");
    if (entry.excludedFromSectionAndQuizTargets !== true) errors.push("old ID33 must be marked excludedFromSectionAndQuizTargets");
    if (Object.prototype.hasOwnProperty.call(entry, "excludedFromSectionQuiz")) errors.push("old ID33 must use excludedFromSectionAndQuizTargets, not excludedFromSectionQuiz");
  }
  const mammillary = entries.find(entry => (entry.labelIds ?? []).includes(39) && (entry.labelIds ?? []).includes(40));
  if (!mammillary) errors.push("mammillary IDs 39 and 40 need a single provenance entry");
  else {
    if (!mammillary.representations?.includes("image-guided-reviewed")) errors.push("mammillary IDs 39/40 must be image-guided-reviewed");
    if (mammillary.expertReview !== "pending") errors.push("mammillary IDs 39/40 expertReview must remain pending");
    if (mammillary.projectReview !== "reviewed-by-project") errors.push("mammillary IDs 39/40 projectReview must be reviewed-by-project");
    if (mammillary.quizEligibility !== "standard") errors.push("mammillary IDs 39/40 must remain standard quiz material");
    if (JSON.stringify(mammillary.labelIds) !== "[39,40]") errors.push("mammillary IDs 39/40 labelIds must be exactly [39,40]");
    if (JSON.stringify(mammillary.hiddenAssets) !== JSON.stringify(["block-diencephalon-mammillary-bodies.mesh", "landmark-mammillary-bodies.mesh"])) errors.push("mammillary IDs 39/40 must record both hidden schematic assets");
    if (JSON.stringify(mammillary.learnerSurfaces) !== JSON.stringify(["sections", "quiz"])) errors.push("mammillary IDs 39/40 learnerSurfaces must be exactly [sections,quiz]");
    if (JSON.stringify(mammillary.projectReviewEvidence) !== JSON.stringify({ reviewerRole: "project lead", date: "2026-08-16", documentRef: "OPTIC_PATHWAY_AUDIT.md" })) errors.push("mammillary IDs 39/40 must record the required projectReviewEvidence");
  }
  try {
    validateQuizTargets(loadedRegistry, readRepositoryFile(rootDir, APP_SOURCE_RELATIVE_PATH), errors);
  } catch (error) {
    errors.push(`could not validate app quiz targets: ${error.message}`);
  }
  validateQuizSurfaceReferences(loadedRegistry, errors);
  validateDuplicateLectureAppKeys(loadedRegistry, errors);
  return {
    ok: errors.length === 0,
    errors,
    summary: {
      entryCount: entries.length,
      lectureRowCount: (() => {
        try { return lectureLabels(readRepositoryFile(rootDir, LECTURE_AUDIT_RELATIVE_PATH)).length; } catch { return 0; }
      })(),
      quizTargetCount: (() => {
        try { return appQuizTargets(readRepositoryFile(rootDir, APP_SOURCE_RELATIVE_PATH)).length; } catch { return 0; }
      })(),
    },
  };
}

function parseArgs(argv) {
  const args = { output: null };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--output") {
      args.output = argv[++index];
      if (!args.output) throw new Error("--output requires a path");
    } else if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else {
      throw new Error(`unknown option: ${arg}`);
    }
  }
  return args;
}

export function main(argv = process.argv.slice(2)) {
  let args;
  try {
    args = parseArgs(argv);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
    return;
  }
  if (args.help) {
    console.log("Usage: node scripts/audit_structure_provenance.mjs [--output path]");
    return;
  }
  const report = auditStructureProvenance();
  const output = JSON.stringify({ generatedAt: new Date().toISOString(), ...report }, null, 2);
  console.log(output);
  if (args.output) {
    const outputPath = path.resolve(REPOSITORY_ROOT, args.output);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, `${output}\n`, "utf8");
  }
  if (!report.ok) process.exitCode = 1;
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : "";
if (import.meta.url === invokedPath) main();
