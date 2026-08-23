import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { QUIZ_GRANULARITY_BY_TARGET, validateQuizGranularity } from "../src/quizGranularity.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = path.resolve(SCRIPT_DIR, "..");
const EXPECTED_QUESTION_COUNT = 23;
export const EXPECTED_QUIZ_CONTENT_SHA256 = "2f775d7c0dbbb5bc89922f32efc3bbe8f88ea7c1850707321d1f0481e5a47583";
const TOPICS = new Set(["basal", "limbic", "midbrain", "ventricles", "connections", "hindbrain", "surface"]);
const STANDARD_LABEL_SOURCES = new Set(["manual", "image-guided-reviewed"]);
const PROVISIONAL_LABEL_SOURCES = new Set(["atlas-provisional", "image-guided"]);

function field(line, name) {
  return line.match(new RegExp(`${name}:"([^"]+)"`))?.[1] ?? null;
}

function numberField(line, name) {
  const value = line.match(new RegExp(`${name}:(\\d+)`))?.[1];
  return value === undefined ? null : Number(value);
}

function optionsField(line) {
  const raw = line.match(/options:\[([^\]]*)\]/)?.[1] ?? "";
  return [...raw.matchAll(/"([^"]+)"/g)].map(match => match[1]);
}

export function parseQuizGranularity(source) {
  const block = source.match(/const quizQuestions:QuizQuestion\[\]=\[(?<body>[\s\S]*?)\n\];/);
  if (!block) throw new Error("Could not locate quizQuestions in app/page.tsx");
  const questions = block.groups.body
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.startsWith("{target:"))
    .map(line => ({
      target: field(line, "target"),
      category: field(line, "category"),
      format: field(line, "format"),
      detail: field(line, "detail"),
      origin: field(line, "origin"),
      plane: field(line, "plane"),
      view: field(line, "view"),
      position: numberField(line, "position"),
      prompt: field(line, "prompt"),
      options: optionsField(line),
    }));
  return questions.map(question => {
    const registry = QUIZ_GRANULARITY_BY_TARGET[question.target] ?? {};
    // Keep any fields declared in the question object so the audit can reject
    // duplicated or stale classifications instead of silently overwriting them
    // with the registry below. The registry remains the effective source used
    // by the application; explicit fields are only accepted when they agree.
    return {
      ...question,
      ...registry,
      declaredFormat: question.format,
      declaredDetail: question.detail,
      declaredOrigin: question.origin,
    };
  });
}

export function quizContentHash(questions) {
  const snapshot = questions.map(question => ({
    target: question.target,
    category: question.category,
    plane: question.plane,
    position: question.position,
    view: question.view,
    prompt: question.prompt,
    options: question.options,
  }));
  return createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
}

function structureLabelSources(source) {
  const match = source.match(/const structures: Record<StructureKey, StructureInfo> = \{(?<body>[\s\S]*?)\n\};/);
  if (!match) throw new Error("Could not locate structures in app/page.tsx");
  return new Map([...match.groups.body.matchAll(/^\s*(?<key>[A-Za-z][A-Za-z0-9]*):\s*\{[^\n]*?labelSource:"(?<source>[^"]+)"/gm)]
    .map(item => [item.groups.key, item.groups.source]));
}

function surfaceRegionKeys(source) {
  const match = source.match(/const surfaceRegions:[^{]+\{(?<body>[\s\S]*?)\n\};/);
  if (!match) throw new Error("Could not locate surfaceRegions in app/page.tsx");
  return new Set([...match.groups.body.matchAll(/^\s*(?<key>[A-Za-z][A-Za-z0-9]*):\{/gm)].map(item => item.groups.key));
}

function provenanceForKey(key, question, labelSources, surfaceKeys) {
  if (question.format === "surface") {
    if (!surfaceKeys.has(key)) return "unknown";
    return "provisional";
  }
  const source = labelSources.get(key);
  if (!source) return "unknown";
  if (STANDARD_LABEL_SOURCES.has(source)) return "standard";
  if (PROVISIONAL_LABEL_SOURCES.has(source)) return "provisional";
  return "unknown";
}

function expectedOrigin(question, labelSources, surfaceKeys) {
  const keys = [question.target, ...question.options];
  return keys.every(key => provenanceForKey(key, question, labelSources, surfaceKeys) === "standard")
    ? "standard"
    : "provisional";
}

function optionProvenanceErrors(question, labelSources, surfaceKeys) {
  const errors = [];
  const keys = [{kind: "target", key: question.target}, ...question.options.map(key => ({kind: "option", key}))];
  for (const {kind, key} of keys) {
    const provenance = provenanceForKey(key, question, labelSources, surfaceKeys);
    if (provenance === "unknown") {
      errors.push(`quiz target ${question.target ?? "?"}: ${kind} ${key ?? "?"} has unknown or unresolved provenance`);
    } else if (question.origin === "standard" && provenance !== "standard") {
      errors.push(`quiz target ${question.target ?? "?"}: standard answer set ${kind} ${key} has ${provenance} provenance`);
    }
  }
  return errors;
}

export function auditQuizGranularitySource(source) {
  const questions = parseQuizGranularity(source);
  const errors = validateQuizGranularity(questions);
  const contentSha256 = quizContentHash(questions);
  const labelSources = structureLabelSources(source);
  const surfaceKeys = surfaceRegionKeys(source);
  const targets = new Set();
  const registryTargets = new Set(Object.keys(QUIZ_GRANULARITY_BY_TARGET));

  if (questions.length !== EXPECTED_QUESTION_COUNT) errors.push(`expected ${EXPECTED_QUESTION_COUNT} questions, found ${questions.length}`);
  if (contentSha256 !== EXPECTED_QUIZ_CONTENT_SHA256) errors.push(`quiz prompt/options/position/view snapshot changed: ${contentSha256}`);
  for (const target of registryTargets) if (!questions.some(question => question.target === target)) errors.push(`granularity registry has no question target ${target}`);
  for (const question of questions) {
    const prefix = `quiz target ${question.target ?? "?"}`;
    const registry = QUIZ_GRANULARITY_BY_TARGET[question.target];
    if (targets.has(question.target)) errors.push(`${prefix}: duplicate target`);
    targets.add(question.target);
    if (!TOPICS.has(question.category)) errors.push(`${prefix}: unknown topic ${question.category}`);
    if (question.target === "opticChiasm") errors.push("old ID33 opticChiasm cannot return as a quiz target");
    if (question.format === "section" && question.detail !== question.plane) errors.push(`${prefix}: section detail must match plane`);
    if (question.format === "surface" && question.detail !== question.view) errors.push(`${prefix}: surface detail must match view`);
    errors.push(...optionProvenanceErrors(question, labelSources, surfaceKeys));
    const expected = expectedOrigin(question, labelSources, surfaceKeys);
    if (question.origin !== expected) errors.push(`${prefix}: origin ${question.origin} disagrees with existing ${expected} provenance rule`);
    if (question.declaredFormat && question.declaredFormat !== registry?.format) errors.push(`${prefix}: declared format ${question.declaredFormat} disagrees with registry ${registry?.format ?? "missing"}`);
    if (question.declaredDetail && question.declaredDetail !== registry?.detail) errors.push(`${prefix}: declared detail ${question.declaredDetail} disagrees with registry ${registry?.detail ?? "missing"}`);
    if (question.declaredOrigin && question.declaredOrigin !== registry?.origin) errors.push(`${prefix}: declared origin ${question.declaredOrigin} disagrees with registry ${registry?.origin ?? "missing"}`);
    if (question.category === "surface" && question.format !== "surface") errors.push(`${prefix}: surface topic must remain surface format`);
    if (question.category !== "surface" && question.format !== "section") errors.push(`${prefix}: non-surface topic must remain section format`);
  }
  for (const target of targets) if (!registryTargets.has(target)) errors.push(`question target ${target} has no granularity registry entry`);

  const formatCounts = Object.groupBy?.(questions, question => question.format) ?? {};
  return {
    ok: errors.length === 0,
    errors,
    contentSha256,
    summary: {
      questionCount: questions.length,
      uniqueTargetCount: targets.size,
      sectionCount: questions.filter(question => question.format === "section").length,
      surfaceCount: questions.filter(question => question.format === "surface").length,
      standardCount: questions.filter(question => question.origin === "standard").length,
      provisionalCount: questions.filter(question => question.origin === "provisional").length,
      formatCounts: Object.fromEntries(Object.entries(formatCounts).map(([key, value]) => [key, value.length])),
    },
  };
}

export function auditQuizGranularity(rootDir = DEFAULT_ROOT) {
  return auditQuizGranularitySource(fs.readFileSync(path.join(rootDir, "app/page.tsx"), "utf8"));
}

function main() {
  const outputIndex = process.argv.indexOf("--output");
  const outputPath = outputIndex >= 0 ? process.argv[outputIndex + 1] : null;
  const result = auditQuizGranularity();
  const serialized = `${JSON.stringify(result, null, 2)}\n`;
  if (outputPath) fs.writeFileSync(path.resolve(outputPath), serialized, "utf8");
  process.stdout.write(serialized);
  if (!result.ok) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
