#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import {fileURLToPath, pathToFileURL} from "node:url";
import {auditAnatomyReviewQueue, REPOSITORY_ROOT, REGISTRY_RELATIVE_PATH} from "./audit_anatomy_review_queue.mjs";
import {validateAnatomyReviewRecordExport} from "../src/anatomyReviewRecordDraft.mjs";

export const ANATOMY_REVIEW_RECORD_DRAFT_AUDIT_TOOL = "scripts/audit_anatomy_review_record_draft.mjs";
export const ANATOMY_REVIEW_DRAFT_AUDIT_TOOL = ANATOMY_REVIEW_RECORD_DRAFT_AUDIT_TOOL;

function usage() {
  return [
    "Usage:",
    "  node scripts/audit_anatomy_review_record_draft.mjs --input path/to/anatomy-review-record.json [--output path]",
    "",
    "The input is one local, structured, unsubmitted record. The audit never marks expert review complete or adopts a label.",
  ].join("\n");
}

function parseArgs(argv) {
  const options = {input: "", output: ""};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--help" || token === "-h") return {help: true, ...options};
    if (token !== "--input" && token !== "--output") throw new Error(`unknown option: ${token}`);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`${token} requires a value`);
    options[token.slice(2)] = value;
    index += 1;
  }
  if (!options.input) throw new Error("--input is required");
  return {help: false, ...options};
}

export async function auditAnatomyReviewDraft({inputPath, rootDir = REPOSITORY_ROOT, registry = null, now = new Date().toISOString()} = {}) {
  const queueReport = auditAnatomyReviewQueue({registry, rootDir, checkPage: false});
  let loadedRegistry = registry;
  const errors = [...queueReport.errors];
  try { if (!loadedRegistry) loadedRegistry = JSON.parse(fs.readFileSync(path.join(rootDir, REGISTRY_RELATIVE_PATH), "utf8")); }
  catch (error) { errors.push(`could not read provenance registry: ${error.message}`); }
  let input = null;
  try { input = JSON.parse(fs.readFileSync(path.resolve(rootDir, inputPath), "utf8")); }
  catch (error) { errors.push(`could not read review record: ${error.message}`); }
  const validation = input && loadedRegistry
    ? await validateAnatomyReviewRecordExport(input, loadedRegistry)
    : {ok: false, errors: ["review record could not be validated"], summary: {scopeSelected: false, assessedCheckCount: 0, checkTotal: 3, concernsRecorded: false}};
  errors.push(...validation.errors);
  return {
    schemaVersion: 1,
    auditedAt: now,
    tool: ANATOMY_REVIEW_DRAFT_AUDIT_TOOL,
    input: inputPath ? path.resolve(rootDir, inputPath) : null,
    source: {registry: REGISTRY_RELATIVE_PATH, entryKey: input?.sourceRegistry?.entryKey ?? null},
    validation: {ok: errors.length === 0 && validation.ok, errors, summary: validation.summary, lockReason: validation.lockReason ?? null},
    claims: {submitted: false, adoptionDecided: false, expertReviewCompleted: false, provenanceMutated: false},
  };
}
export const auditAnatomyReviewRecordDraft = auditAnatomyReviewDraft;

async function main() {
  let options;
  try { options = parseArgs(process.argv.slice(2)); }
  catch (error) { console.error(error.message); console.error(usage()); process.exitCode = 2; return; }
  if (options.help) { console.log(usage()); return; }
  const report = await auditAnatomyReviewDraft({inputPath: options.input});
  const output = JSON.stringify(report, null, 2);
  if (options.output) {
    const outputPath = path.resolve(REPOSITORY_ROOT, options.output);
    fs.mkdirSync(path.dirname(outputPath), {recursive: true});
    fs.writeFileSync(outputPath, `${output}\n`, "utf8");
  }
  console.log(output);
  if (!report.validation.ok) process.exitCode = 1;
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : "";
if (import.meta.url === invokedPath) await main();
