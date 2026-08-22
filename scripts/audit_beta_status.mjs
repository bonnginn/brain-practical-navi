import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
export const REPOSITORY_ROOT = path.resolve(SCRIPT_DIR, "..");
export const STATUS_RELATIVE_PATH = "app/beta-status.json";
export const PROVENANCE_RELATIVE_PATH = "public/atlas/structure-provenance.json";
export const STATUS_SCHEMA_VERSION = 1;
export const STATUS_PHASE = "公開α／β候補・公開判断前";
export const REQUIRED_PROVENANCE_REFERENCES = [
  { itemId: "limitation-optic-id33", keys: ["visual-pathway-legacy-optic-label"] },
  { itemId: "limitation-mammillary-39-40", keys: ["section-mammillary-bodies"] },
  {
    itemId: "limitation-unrecorded-items",
    keys: ["section-temporal-lobe", "hindbrain-gracile-cuneate-structures", "vascular-venous-system"],
  },
];

const forbiddenClaims = [
  { name: "unreviewed material presented as expert-verified", pattern: /(?:専門家(?:確認なし|未確認|未レビュー|レビュー未完了)|未確認)[^。！？\n]{0,40}検証済み|検証済み[^。！？\n]{0,40}(?:専門家(?:確認なし|未確認|未レビュー|レビュー未完了)|未確認)/ },
  { name: "beta publication claim", pattern: /(?:β|ベータ)[^。！？\n]{0,20}(?:公開済み|公開しました|公開版|公開中)/ },
  { name: "university official approval claim", pattern: /(?:大学|三重大学|医学部)[^。！？\n]{0,40}(?:公式(?:教材|承認|見解)|承認済み)|公式(?:教材|承認)[^。！？\n]{0,40}(?:大学|三重大学)/i },
];

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function readJson(rootDir, relativePath) {
  const absolutePath = path.join(rootDir, relativePath);
  return JSON.parse(fs.readFileSync(absolutePath, "utf8"));
}

function isIsoDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

function isStableId(value) {
  return typeof value === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)+$/.test(value);
}

function safeRelativePath(value) {
  if (typeof value !== "string" || !value || path.isAbsolute(value)) return false;
  const normalized = value.replaceAll("\\", "/");
  return normalized === value && !normalized.split("/").includes("..") && !normalized.startsWith("./");
}

function validateItem(item, label, rootDir, errors, ids) {
  if (!isPlainObject(item)) {
    errors.push(`${label} must be an object`);
    return;
  }
  if (!isStableId(item.id)) errors.push(`${label}.id must be a stable kebab-case id`);
  if (typeof item.id === "string") {
    if (ids.has(item.id)) errors.push(`duplicate status id: ${item.id}`);
    ids.add(item.id);
  }
  for (const field of ["heading", "body"]) {
    if (typeof item[field] !== "string" || !item[field].trim()) errors.push(`${label}.${field} is required`);
  }
  if (!Array.isArray(item.evidenceRefs) || item.evidenceRefs.length === 0) {
    errors.push(`${label}.evidenceRefs must contain at least one local file`);
  } else {
    const refs = new Set();
    for (const ref of item.evidenceRefs) {
      if (!safeRelativePath(ref)) {
        errors.push(`${label}.evidenceRefs contains an unsafe path: ${String(ref)}`);
        continue;
      }
      if (refs.has(ref)) errors.push(`${label}.evidenceRefs contains a duplicate: ${ref}`);
      refs.add(ref);
      if (!fs.existsSync(path.join(rootDir, ref))) errors.push(`${label}.evidenceRefs file does not exist: ${ref}`);
    }
  }
  if (item.provenanceKeys !== undefined && (!Array.isArray(item.provenanceKeys) || item.provenanceKeys.some(key => typeof key !== "string" || !key))) {
    errors.push(`${label}.provenanceKeys must be an array of non-empty strings`);
  }
  const text = `${item.heading ?? ""}\n${item.body ?? ""}`;
  for (const claim of forbiddenClaims) {
    if (claim.pattern.test(text)) errors.push(`${label} contains a forbidden claim: ${claim.name}`);
  }
  const bodyText = typeof item.body === "string" ? item.body : "";
  if (/(海馬采|鉤|fimbria|uncus)/i.test(bodyText) && /(?:現行|現在|収録|表示|実装|搭載|included|shipped)/i.test(bodyText)
      && !/(除外|未収録|表示しません|収録していません|含めません|使用しません|退役|not included|not shipped)/i.test(bodyText)) {
    errors.push(`${label} describes retired fimbria/uncus content as current`);
  }
}

function validateRequiredProvenance(status, provenance, errors) {
  if (!isPlainObject(provenance) || !Array.isArray(provenance.entries)) {
    errors.push("structure provenance entries are unavailable");
    return;
  }
  const byKey = new Map(provenance.entries.map(entry => [entry?.key, entry]));
  for (const requirement of REQUIRED_PROVENANCE_REFERENCES) {
    const item = status.knownLimitations?.find(entry => entry?.id === requirement.itemId);
    if (!item) {
      errors.push(`required status item is missing: ${requirement.itemId}`);
      continue;
    }
    if (!item.evidenceRefs.includes(PROVENANCE_RELATIVE_PATH)) {
      errors.push(`${requirement.itemId} must cite ${PROVENANCE_RELATIVE_PATH}`);
    }
    if (!Array.isArray(item.provenanceKeys)) {
      errors.push(`${requirement.itemId}.provenanceKeys is required`);
      continue;
    }
    for (const key of requirement.keys) {
      if (!item.provenanceKeys.includes(key)) errors.push(`${requirement.itemId} must cite provenance key ${key}`);
      const entry = byKey.get(key);
      if (!entry) {
        errors.push(`provenance key does not exist: ${key}`);
        continue;
      }
      if (key === "visual-pathway-legacy-optic-label" && !(Array.isArray(entry.legacyIds) && entry.legacyIds.includes(33))) {
        errors.push(`${key} must retain legacy ID33`);
      }
      if (key === "section-mammillary-bodies" && !(Array.isArray(entry.labelIds) && entry.labelIds.includes(39) && entry.labelIds.includes(40))) {
        errors.push(`${key} must retain label IDs 39 and 40`);
      }
      if (["section-temporal-lobe", "hindbrain-gracile-cuneate-structures", "vascular-venous-system"].includes(key)
          && !(Array.isArray(entry.representations) && entry.representations.includes("not-recorded"))) {
        errors.push(`${key} must remain not-recorded`);
      }
    }
  }
}

export function auditBetaStatus({ status, rootDir = REPOSITORY_ROOT } = {}) {
  const errors = [];
  let data = status;
  if (data === undefined) {
    try {
      data = readJson(rootDir, STATUS_RELATIVE_PATH);
    } catch (error) {
      return { ok: false, errors: [`could not read ${STATUS_RELATIVE_PATH}: ${error.message}`] };
    }
  }
  if (!isPlainObject(data)) return { ok: false, errors: ["status data must be an object"] };
  if (data.schemaVersion !== STATUS_SCHEMA_VERSION) errors.push(`schemaVersion must be ${STATUS_SCHEMA_VERSION}`);
  if (data.phase !== STATUS_PHASE) errors.push(`phase must be ${STATUS_PHASE}`);
  if (!isIsoDate(data.updated)) errors.push("updated must be a valid ISO date (YYYY-MM-DD)");
  for (const collection of ["knownLimitations", "changes"]) {
    if (!Array.isArray(data[collection])) errors.push(`${collection} must be an array`);
  }
  const ids = new Set();
  for (const [collection, items] of [["knownLimitations", data.knownLimitations], ["changes", data.changes]]) {
    if (Array.isArray(items)) items.forEach((item, index) => validateItem(item, `${collection}[${index}]`, rootDir, errors, ids));
  }
  let provenance;
  try {
    provenance = readJson(rootDir, PROVENANCE_RELATIVE_PATH);
  } catch (error) {
    errors.push(`could not read ${PROVENANCE_RELATIVE_PATH}: ${error.message}`);
  }
  if (provenance) validateRequiredProvenance(data, provenance, errors);
  return { ok: errors.length === 0, errors, status: data };
}

function parseArgs(argv) {
  const args = { output: null, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help" || argument === "-h") {
      args.help = true;
    } else if (argument === "--output") {
      args.output = argv[++index];
      if (!args.output) throw new Error("--output requires a path");
    } else {
      throw new Error(`unknown option: ${argument}`);
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
    return 1;
  }
  if (args.help) {
    console.log("Usage: node scripts/audit_beta_status.mjs [--output path]");
    return 0;
  }
  const result = auditBetaStatus();
  const json = JSON.stringify({ generatedAt: new Date().toISOString(), ...result }, null, 2);
  console.log(json);
  if (args.output) {
    const outputPath = path.resolve(REPOSITORY_ROOT, args.output);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, `${json}\n`, "utf8");
  }
  return result.ok ? 0 : 1;
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : "";
if (import.meta.url === invokedPath) process.exitCode = main();
