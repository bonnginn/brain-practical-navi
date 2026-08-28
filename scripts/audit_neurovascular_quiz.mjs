import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { filterQuizCandidates } from "../src/quizGranularity.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
export const REPOSITORY_ROOT = path.resolve(SCRIPT_DIR, "..");
export const APP_SOURCE_RELATIVE_PATH = "app/page.tsx";
export const OVERLAY_METADATA_RELATIVE_PATH = "public/atlas/neurovascular-overlays.json";
export const QUIZ_INVENTORY_RELATIVE_PATH = "NEUROVASCULAR_QUIZ_AUDIT.md";

export const PILOT_TARGETS = Object.freeze([
  "ica", "aca", "acomm", "mca", "pcomm", "vertebral", "basilar", "pca", "cerebellarArteries",
  "cn1", "cn2", "opticChiasm", "cn3", "cn4", "cn5", "cn6", "cn7", "cn8", "cn9", "cn10", "cn11", "cn12",
]);
export const PILOT_ARTERY_TARGETS = Object.freeze(["ica", "aca", "acomm", "mca", "pcomm", "vertebral", "basilar", "pca", "cerebellarArteries"]);
export const PILOT_NERVE_TARGETS = Object.freeze(["cn1", "cn2", "opticChiasm", "cn3", "cn4", "cn5", "cn6", "cn7", "cn8", "cn9", "cn10", "cn11", "cn12"]);
export const CN2_OVERLAY_REGION_IDS = Object.freeze([23, 24]);
export const CN2_FORBIDDEN_REGION_IDS = Object.freeze([25, 33, 36, 37, 38]);
export const OPTIC_CHIASM_OVERLAY_REGION_IDS = Object.freeze([25]);
export const OPTIC_CHIASM_FORBIDDEN_REGION_IDS = Object.freeze([23, 24, 33, 36, 37, 38]);
export const PILOT_PROMPT = "白色で強調された模式3Dの名称はどれですか？";

// Updated after the 22-question inventory is intentionally frozen. This hash
// covers only the new pilot fields, never the separate 23-question snapshot.
export const EXPECTED_NEUROVASCULAR_QUIZ_SHA256 = "d5cfdee13e96bcb90f0c5d7e8396c0f613c18a049d01787bc20f204f8b53719d";

function readRepositoryFile(rootDir, relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function parseQuotedList(value) {
  return [...value.matchAll(/"([^"]+)"/g)].map(match => match[1]);
}

export function parseNeurovascularQuizInventory(source) {
  const blockMatch = source.match(/const neurovascularQuizQuestions:NeurovascularQuizQuestion\[\]=\[(?<body>[\s\S]*?)\n\];/);
  if (!blockMatch) throw new Error("Could not locate neurovascularQuizQuestions in app/page.tsx");
  return [...blockMatch.groups.body.matchAll(/\{target:"(?<target>[^"]+)",category:"(?<category>[^"]+)",view:"(?<view>[^"]+)",format:"(?<format>[^"]+)",detail:"(?<detail>[^"]+)",origin:"(?<origin>[^"]+)",prompt:"(?<prompt>[^"]+)",options:\[(?<options>[^\]]*)\]\}/g)]
    .map(match => ({
      target: match.groups.target,
      category: match.groups.category,
      view: match.groups.view,
      format: match.groups.format,
      detail: match.groups.detail,
      origin: match.groups.origin,
      prompt: match.groups.prompt,
      options: parseQuotedList(match.groups.options),
    }));
}

export function parseNeurovascularRegistry(source) {
  const blockMatch = source.match(/const neurovascularStructures:Record<NeurovascularStructureKey,\{[\s\S]*?\}>=\{(?<body>[\s\S]*?)\n\};/);
  if (!blockMatch) throw new Error("Could not locate neurovascularStructures in app/page.tsx");
  const registry = new Map();
  for (const match of blockMatch.groups.body.matchAll(/^\s*(?<key>[A-Za-z][A-Za-z0-9]*):\s*\{\s*name:"(?<name>[^"]+)",latin:"(?<latin>[^"]+)",kind:"(?<kind>arteries|nerves)",ids:\[(?<ids>[^\]]*)\]/gm)) {
    const ids = match.groups.ids.split(",").map(value => Number(value.trim())).filter(Number.isFinite);
    registry.set(match.groups.key, { key: match.groups.key, name: match.groups.name, latin: match.groups.latin, kind: match.groups.kind, ids });
  }
  return registry;
}

function inventoryHash(questions) {
  const normalized = questions.map(question => ({
    target: question.target,
    category: question.category,
    view: question.view,
    format: question.format,
    detail: question.detail,
    origin: question.origin,
    prompt: question.prompt,
    options: question.options,
  }));
  return crypto.createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
}

function readBnm3Mesh(rootDir, file) {
  const relativePath = path.join("public", "atlas", file);
  const bytes = fs.readFileSync(path.join(rootDir, relativePath));
  if (bytes.subarray(0, 4).toString("ascii") !== "BNM3") throw new Error(`${file}: overlay must be labelled BNM3`);
  const vertices = bytes.readUInt32LE(4);
  const declaredFaces = bytes.readUInt32LE(8);
  const faceOffset = 12 + vertices * 32;
  if (faceOffset > bytes.length || (bytes.length - faceOffset) % 12 !== 0) throw new Error(`${file}: malformed BNM3 length`);
  const storedFaces = (bytes.length - faceOffset) / 12;
  if (declaredFaces !== storedFaces && declaredFaces !== storedFaces * 3) throw new Error(`${file}: declared face count does not match payload`);
  const regions = new Set();
  const low = [Infinity, Infinity, Infinity];
  const high = [-Infinity, -Infinity, -Infinity];
  for (let index = 0; index < vertices; index += 1) {
    const offset = 12 + index * 32;
    const point = [bytes.readFloatLE(offset), bytes.readFloatLE(offset + 4), bytes.readFloatLE(offset + 8)];
    const region = bytes.readFloatLE(offset + 28);
    if (!point.every(Number.isFinite) || !Number.isFinite(region)) throw new Error(`${file}: non-finite vertex or region`);
    point.forEach((value, axis) => { low[axis] = Math.min(low[axis], value); high[axis] = Math.max(high[axis], value); });
    if (Math.round(region) > 0) regions.add(Math.round(region));
  }
  if (!low.every(Number.isFinite) || !high.every(Number.isFinite) || low.some((value, axis) => value > high[axis])) throw new Error(`${file}: invalid finite bounding box`);
  return { file, vertices, faces: storedFaces, regions, low, high };
}

function overlayMetadata(metadata) {
  const byId = new Map();
  for (const group of metadata.groups ?? []) {
    for (const structure of group.structures ?? []) byId.set(structure.id, { ...structure, file: group.file });
  }
  return byId;
}

function assertSourceContract(source, errors) {
  const requiredSnippets = [
    "const allQuizQuestions:QuizQuestion[]=[...quizQuestions,...neurovascularQuizQuestions]",
    "shuffledQuestions(allQuizQuestions).slice(0,10)",
    "key in structures||key in surfaceRegions||key in neurovascularStructures",
    "neurovascularOverlay={neurovascularQuiz?(quizQuestion.detail===\"arteries\"?\"vessels\":\"nerves\"):\"none\"}",
    "neurovascularHighlights={neurovascularQuiz?quizNeurovascularHighlight:[]}",
    "view={neurovascularQuiz?\"ghost\":\"inside\"}",
    "showCerebellum={neurovascularQuiz?false:quizQuestion.view!==\"medial\"}",
    "keepBrainstemOpaqueInGhost={neurovascularQuiz&&quizQuestion.detail===\"cranialNerves\"}",
    "脳幹は起始位置の目安として不透明表示",
    "color:[255,255,255]",
    "function reviewQuizQuestion(question:QuizQuestion)",
  ];
  for (const snippet of requiredSnippets) if (!source.includes(snippet)) errors.push(`app source missing pilot contract: ${snippet}`);
  if (/isNeurovascularQuiz\(question\)[\s\S]{0,500}setSurfaceGhost\(false\)/.test(source)) errors.push("neurovascular review link must preserve the transparent surface policy");
}

export function auditNeurovascularQuiz({ rootDir = REPOSITORY_ROOT, source, metadata } = {}) {
  const errors = [];
  let appSource = source;
  let overlayMetadata = metadata;
  try { if (!appSource) appSource = readRepositoryFile(rootDir, APP_SOURCE_RELATIVE_PATH); } catch (error) { return { ok: false, errors: [`could not read app source: ${error.message}`], summary: {} }; }
  try { if (!overlayMetadata) overlayMetadata = JSON.parse(readRepositoryFile(rootDir, OVERLAY_METADATA_RELATIVE_PATH)); } catch (error) { return { ok: false, errors: [`could not read overlay metadata: ${error.message}`], summary: {} }; }
  let questions = [];
  let registry = new Map();
  try { questions = parseNeurovascularQuizInventory(appSource); registry = parseNeurovascularRegistry(appSource); } catch (error) { errors.push(error.message); }

  if (questions.length !== PILOT_TARGETS.length) errors.push(`pilot question count must be ${PILOT_TARGETS.length}, found ${questions.length}`);
  const expectedTargets = new Set(PILOT_TARGETS);
  const seenTargets = new Set();
  for (const question of questions) {
    if (seenTargets.has(question.target)) errors.push(`duplicate pilot target: ${question.target}`);
    seenTargets.add(question.target);
    if (!expectedTargets.has(question.target)) errors.push(`unexpected pilot target: ${question.target}`);
    const item = registry.get(question.target);
    if (!item) errors.push(`pilot target is missing from neurovascular registry: ${question.target}`);
    if (question.category !== "neurovascular" || question.format !== "neurovascular" || question.origin !== "provisional") errors.push(`${question.target}: category/format/origin must be neurovascular/provisional`);
    if (question.prompt !== PILOT_PROMPT) errors.push(`${question.target}: pilot prompt must remain identification-only`);
    if (question.options.length !== 4 || !question.options.includes(question.target)) errors.push(`${question.target}: target must appear in exactly four options`);
    if (item) {
      const expectedDetail = item.kind === "arteries" ? "arteries" : "cranialNerves";
      const expectedView = item.kind === "arteries" ? "arteries" : "cranialNerves";
      if (question.detail !== expectedDetail || question.view !== expectedView) errors.push(`${question.target}: detail/view disagrees with registry kind`);
      for (const option of question.options) {
        const optionItem = registry.get(option);
        if (!optionItem) errors.push(`${question.target}: option is missing from neurovascular registry: ${option}`);
        else if (optionItem.kind !== item.kind) errors.push(`${question.target}: option ${option} crosses registry kind`);
      }
      if (question.target === "cn2") {
        if (JSON.stringify(item.ids) !== JSON.stringify(CN2_OVERLAY_REGION_IDS)) errors.push("cn2: registry IDs must be exactly [23,24]");
        if (item.ids.some(id => CN2_FORBIDDEN_REGION_IDS.includes(id))) errors.push("cn2: forbidden optic/legacy/unsegmented region ID is present");
        if (question.options.some(option => option === "opticChiasm")) errors.push("cn2: opticChiasm cannot be a quiz option");
      }
      if (question.target === "opticChiasm") {
        if (JSON.stringify(item.ids) !== JSON.stringify(OPTIC_CHIASM_OVERLAY_REGION_IDS)) errors.push("opticChiasm: registry IDs must be exactly [25]");
        if (item.ids.some(id => OPTIC_CHIASM_FORBIDDEN_REGION_IDS.includes(id))) errors.push("opticChiasm: forbidden optic-nerve/legacy/unsegmented region ID is present");
      }
    }
  }
  for (const target of PILOT_TARGETS) if (!seenTargets.has(target)) errors.push(`missing pilot target: ${target}`);
  const contentSha256 = inventoryHash(questions);
  if (contentSha256 !== EXPECTED_NEUROVASCULAR_QUIZ_SHA256) errors.push(`neurovascular pilot inventory hash changed: expected ${EXPECTED_NEUROVASCULAR_QUIZ_SHA256}, got ${contentSha256}`);

  const metadataById = overlayMetadataById(overlayMetadata, errors);
  const meshes = new Map();
  for (const group of overlayMetadata.groups ?? []) {
    try { meshes.set(group.file, readBnm3Mesh(rootDir, group.file)); } catch (error) { errors.push(error.message); }
  }
  for (const target of PILOT_TARGETS) {
    const item = registry.get(target);
    if (!item) continue;
    if (item.ids.length === 0) errors.push(`${target}: registry IDs must be non-empty`);
    for (const id of item.ids) {
      const metadataEntry = metadataById.get(id);
      if (!metadataEntry) errors.push(`${target}: overlay metadata lacks region ID ${id}`);
      const mesh = metadataEntry ? meshes.get(metadataEntry.file) : null;
      if (!mesh) continue;
      if (!mesh.regions.has(id)) errors.push(`${target}: BNM3 mesh ${metadataEntry.file} lacks region ID ${id}`);
    }
  }
  assertSourceContract(appSource, errors);
  const arteries = questions.filter(question => question.detail === "arteries");
  const nerves = questions.filter(question => question.detail === "cranialNerves");
  const filters = { category: "all", format: "neurovascular", detail: "all", includeProvisional: true, wrongOnly: false };
  const filterQuestions = questions.map(question => ({ target: question.target, category: question.category, format: question.format, detail: question.detail, origin: question.origin }));
  if (filterQuizCandidates(filterQuestions, { ...filters, includeProvisional: false }, []).length !== 0) errors.push("provisional OFF must hide every pilot question");
  if (filterQuizCandidates(filterQuestions, filters, []).length !== PILOT_TARGETS.length) errors.push("neurovascular ON candidate count must be 22");
  if (filterQuizCandidates(filterQuestions, { ...filters, detail: "arteries" }, []).length !== PILOT_ARTERY_TARGETS.length) errors.push("arteries candidate count must be 9");
  if (filterQuizCandidates(filterQuestions, { ...filters, detail: "cranialNerves" }, []).length !== PILOT_NERVE_TARGETS.length) errors.push("cranialNerves candidate count must be 13");
  if (filterQuizCandidates(filterQuestions, { ...filters, wrongOnly: true }, ["cn6"]).length !== 1) errors.push("wrong-only pilot candidate count must follow target history");

  return {
    ok: errors.length === 0,
    errors,
    contentSha256,
    summary: {
      questionCount: questions.length,
      arteryCount: arteries.length,
      nerveCount: nerves.length,
      uniqueTargetCount: seenTargets.size,
      overlayRegionCount: metadataById.size,
      bnm3FileCount: meshes.size,
      oldSectionId33Excluded: true,
    },
  };
}

function overlayMetadataById(metadata, errors) {
  if (!metadata || metadata.version !== 2 || !Array.isArray(metadata.groups)) errors.push("overlay metadata version/groups are invalid");
  const byId = new Map();
  for (const group of metadata.groups ?? []) {
    if (typeof group.file !== "string" || group.file.length === 0) errors.push("overlay group file must be non-empty");
    for (const structure of group.structures ?? []) {
      if (!Number.isInteger(structure.id) || structure.id <= 0 || typeof structure.name !== "string" || structure.name.trim() === "") errors.push("overlay structure IDs and names must be non-empty");
      if (byId.has(structure.id)) errors.push(`overlay metadata duplicates region ID ${structure.id}`);
      byId.set(structure.id, { ...structure, file: group.file });
    }
  }
  return byId;
}

function parseArgs(argv) {
  const args = { output: null };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--output") { args.output = argv[++index]; if (!args.output) throw new Error("--output requires a path"); }
    else if (argv[index] === "--help" || argv[index] === "-h") args.help = true;
    else throw new Error(`unknown option: ${argv[index]}`);
  }
  return args;
}

export function main(argv = process.argv.slice(2)) {
  let args;
  try { args = parseArgs(argv); } catch (error) { console.error(error.message); process.exitCode = 1; return; }
  if (args.help) { console.log("Usage: node scripts/audit_neurovascular_quiz.mjs [--output path]"); return; }
  const report = auditNeurovascularQuiz();
  const output = JSON.stringify({ generatedAt: new Date().toISOString(), ...report }, null, 2);
  console.log(output);
  if (args.output) { const outputPath = path.resolve(REPOSITORY_ROOT, args.output); fs.mkdirSync(path.dirname(outputPath), { recursive: true }); fs.writeFileSync(outputPath, `${output}\n`, "utf8"); }
  if (!report.ok) process.exitCode = 1;
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : "";
if (import.meta.url === invokedPath) main();
