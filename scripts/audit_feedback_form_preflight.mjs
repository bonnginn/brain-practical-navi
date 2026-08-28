import fs from "node:fs";
import path from "node:path";
import {fileURLToPath, pathToFileURL} from "node:url";
import {deriveFeedbackPreflightDescriptor, feedbackContractSha256, generateExpectedPreflightSource, GENERATED_END, GENERATED_START} from "./generate_feedback_preflight_contract.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
export const REPOSITORY_ROOT = path.resolve(SCRIPT_DIR, "..");
export const CONTRACT_PATH = "feedback-form-contract.json";
export const GENERATOR_PATH = "scripts/create_google_feedback_form.gs";
export const PREFLIGHT_PATH = "scripts/preflight_google_feedback_form.gs";

const ITEM_TYPES = new Set(["MULTIPLE_CHOICE", "CHECKBOX", "TEXT", "PARAGRAPH_TEXT"]);
const REQUIRED_PAGES = ["route", "feedback", "collaboration"];
const PRIVATE_VALUE_PATTERNS = [
  /https:\/\/docs\.google\.com\/(?:forms|spreadsheets)\/d\//i,
  /(?:FORM|SHEET|SPREADSHEET)_(?:ID|URL)\s*[=:]\s*["'][^"']+/i,
  /\/edit(?:\?|["'])/i,
];
const FORBIDDEN_PREFLIGHT_CALLS = [
  "createResponse(", "getResponses(", "deleteResponse(", "deleteAllResponses(",
  "FormApp.create(", "SpreadsheetApp.create(", "setDestination(", "setPublished(",
  "setAcceptingResponses(", "setCollectEmail(", "setLimitOneResponsePerUser(",
  "setTitle(", "setDescription(", "setHelpText(", "setConfirmationMessage(",
  "setChoiceValues(", "setChoices(", "setRequired(", "setGoToPage(", "showOtherOption(",
  "setValue(", "setValues(", "clear(", "clearContent(", "deleteItem(", "deleteSheet(",
  "getEditUrl(", "getPublishedUrl(", "getUrl(", "getId(",
];

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function duplicates(values) {
  return [...new Set(values.filter((value, index) => values.indexOf(value) !== index))];
}

export function validateEmbeddedPreflightContract(contract, source) {
  const errors = [];
  const start = source.indexOf(GENERATED_START);
  const end = source.indexOf(GENERATED_END, start);
  if (start < 0 || end < start) return {ok: false, errors: ["generated full contract block is missing"]};
  const block = source.slice(start, end);
  const match = block.match(/var FEEDBACK_PREFLIGHT_EXPECTED = (\{[\s\S]*\});\s*$/);
  if (!match) return {ok: false, errors: ["embedded full contract JSON is missing"]};
  let embedded;
  try { embedded = JSON.parse(match[1]); } catch (error) { return {ok: false, errors: [`embedded full contract JSON is invalid: ${error.message}`]}; }
  const expected = deriveFeedbackPreflightDescriptor(contract);
  if (JSON.stringify(embedded) !== JSON.stringify(expected)) errors.push("embedded full descriptor differs from feedback-form-contract.json");
  return {ok: errors.length === 0, errors};
}

export const validateEmbeddedPreflightSubset = validateEmbeddedPreflightContract;

export function validateFeedbackFormContract(contract) {
  const errors = [];
  if (!isObject(contract)) return {ok: false, errors: ["contract must be an object"]};
  if (contract.schemaVersion !== 1) errors.push("schemaVersion must equal 1");
  if (contract.copyPolicy !== "release-neutral-educational-prototype") errors.push("copyPolicy must remain release-neutral");
  const privacy = contract.privacy ?? {};
  if (privacy.anonymousFeedbackSupported !== true) errors.push("anonymous feedback must be supported");
  if (privacy.collectEmail !== false || privacy.limitOneResponsePerUser !== false) errors.push("email collection and one-response login restriction must be disabled");
  if (privacy.fileUploadAllowed !== false) errors.push("file uploads must remain disabled");
  if (!privacy.retention || !privacy.deletionProcedureDocument) errors.push("retention and deletion guidance are required");

  const form = contract.form ?? {};
  const settings = form.settings ?? {};
  for (const [key, expected] of Object.entries({isQuiz: false, collectEmail: false, limitOneResponsePerUser: false, progressBar: true, shuffleQuestions: false, respondAgainLink: true, acceptingResponses: true, published: true})) {
    if (settings[key] !== expected) errors.push(`form.settings.${key} must equal ${expected}`);
  }
  if (!form.title || /(?:^|[^A-Za-z])(?:alpha|beta|α|β)(?:[^A-Za-z]|$)/i.test(form.title)) errors.push("form title must be nonempty and release-neutral");
  if (typeof form.description !== "string" || !form.description) errors.push("form.description is required");
  if (!form.confirmationMessage) errors.push("confirmationMessage is required");

  const pages = Array.isArray(form.pages) ? form.pages : [];
  if (JSON.stringify(pages.map(page => page.key)) !== JSON.stringify(REQUIRED_PAGES)) errors.push("pages must be ordered route, feedback, collaboration");
  if (pages.find(page => page.key === "route")?.choiceOverride !== true || pages.find(page => page.key === "feedback")?.defaultNavigation !== "SUBMIT") errors.push("route branching and feedback submission must remain explicit");
  if (pages.some(page => typeof page.helpText !== "string" || !["CONTINUE", "SUBMIT"].includes(page.defaultNavigation) || typeof page.choiceOverride !== "boolean")) errors.push("each page requires exact helpText, defaultNavigation, and choiceOverride fields");
  const items = Array.isArray(form.items) ? form.items : [];
  if (items.length !== 20) errors.push(`form.items must contain 20 questions, found ${items.length}`);
  for (const duplicate of duplicates(items.map(item => item.key))) errors.push(`duplicate item key: ${duplicate}`);
  for (const [index, item] of items.entries()) {
    if (!item.key || !item.title || !ITEM_TYPES.has(item.type)) errors.push(`item ${index} has invalid key/title/type`);
    if (!REQUIRED_PAGES.includes(item.page)) errors.push(`${item.key ?? index}: unknown page`);
    if (typeof item.required !== "boolean") errors.push(`${item.key ?? index}: required must be boolean`);
    if (typeof item.helpText !== "string") errors.push(`${item.key ?? index}: helpText must be an explicit string`);
    if (item.type === "MULTIPLE_CHOICE" || item.type === "CHECKBOX") {
      if (!Array.isArray(item.choices)) errors.push(`${item.key}: choices are required`);
      if (typeof item.showOtherOption !== "boolean") errors.push(`${item.key}: showOtherOption must be explicit`);
    }
  }
  const route = items.find(item => item.key === "route.kind");
  const destinations = route?.choices?.map(choice => choice.goToPage) ?? [];
  if (JSON.stringify(destinations) !== JSON.stringify(["feedback", "collaboration", "collaboration"])) errors.push("route.kind branching differs from the approved contract");
  for (const key of ["feedback.replyTo", "collaboration.name", "collaboration.affiliation", "collaboration.contact"]) {
    if (items.find(item => item.key === key)?.required !== false) errors.push(`${key} must remain optional`);
  }
  if (items.some(item => item.type === "FILE_UPLOAD")) errors.push("FILE_UPLOAD is prohibited");
  if ((contract.administratorOnlyChecks ?? []).length !== 3) errors.push("administrator-only checks must remain explicit");
  const serialized = JSON.stringify(contract);
  for (const pattern of PRIVATE_VALUE_PATTERNS) if (pattern.test(serialized)) errors.push(`contract contains a private URL or identifier matching ${pattern}`);
  return {ok: errors.length === 0, errors};
}

export function validatePreflightSource(source) {
  const errors = [];
  if (typeof source !== "string" || !source.includes("function preflightBrainPracticalFeedbackForm")) errors.push("read-only preflight entry function is missing");
  for (const call of FORBIDDEN_PREFLIGHT_CALLS) if (source.includes(call)) errors.push(`preflight contains forbidden call: ${call}`);
  for (const required of ["STORED_TARGET_UNAVAILABLE", "PREFLIGHT_READ_FAILED", "FormApp.openById(", "SpreadsheetApp.openById(", "getItems(", "getTitle(", "getDescription(", "getConfirmationMessage(", "getHelpText(", "getPageNavigationType(", "getGotoPage(", "hasOtherOption(", "ITEM_CHOICE_EXTRA_", "ITEM_NAVIGATION_", "ITEM_DESTINATION_", "getValues(", "getName(", "mismatchCodes", "contractSha256"] ) {
    if (!source.includes(required)) errors.push(`preflight lacks required read-only evidence: ${required}`);
  }
  for (const pattern of PRIVATE_VALUE_PATTERNS) if (pattern.test(source)) errors.push(`preflight source embeds a private URL or identifier matching ${pattern}`);
  return {ok: errors.length === 0, errors};
}

export function validateExistingReuseSource(source) {
  const errors = [];
  const start = source.indexOf("if (savedFormId && savedSheetId)");
  const end = source.indexOf("var form = FormApp.create(", start);
  if (start < 0 || end < start) return {ok: false, errors: ["could not isolate existing-form reuse path"]};
  const partialGuard = source.indexOf("if (!!savedFormId !== !!savedSheetId)");
  const partialThrow = source.indexOf("throw new Error('STORED_TARGET_PARTIAL", partialGuard);
  if (partialGuard < 0 || partialGuard > start || partialThrow < partialGuard || partialThrow > start) errors.push("partial stored target must fail closed before existing reuse and new creation");
  const reuse = source.slice(start, end);
  for (const required of ["preflightBrainPracticalFeedbackForm()", "if (!preflightReport.ok)", "throw new Error(", "logResult_(existingForm, existingSheet, true)", "return;"]) {
    if (!reuse.includes(required)) errors.push(`existing-form reuse path lacks ${required}`);
  }
  for (const forbidden of ["refreshExistingForm_", ".set", ".rename(", ".delete", "createResponse(", "getResponses("]) {
    if (reuse.includes(forbidden)) errors.push(`existing-form reuse path contains forbidden mutation/response access: ${forbidden}`);
  }
  return {ok: errors.length === 0, errors};
}

export function auditFeedbackFormPreflight({rootDir = REPOSITORY_ROOT, contract, preflightSource} = {}) {
  const contractBytes = fs.readFileSync(path.join(rootDir, CONTRACT_PATH));
  const loadedContract = contract ?? JSON.parse(contractBytes.toString("utf8"));
  const source = preflightSource ?? fs.readFileSync(path.join(rootDir, PREFLIGHT_PATH), "utf8");
  const contractResult = validateFeedbackFormContract(loadedContract);
  const preflightResult = validatePreflightSource(source);
  const embeddedResult = validateEmbeddedPreflightContract(loadedContract, source);
  const generator = fs.readFileSync(path.join(rootDir, GENERATOR_PATH), "utf8");
  const generatorErrors = [];
  if (generator.includes("addFileUploadItem(")) generatorErrors.push("generator must not add file uploads");
  if (!generator.includes("setCollectEmail(false)") || !generator.includes("setLimitOneResponsePerUser(false)")) generatorErrors.push("generator privacy settings differ from contract");
  if (!generator.includes("PageNavigationType.SUBMIT")) generatorErrors.push("generator lacks feedback-page SUBMIT navigation");
  if (!generator.includes("setDescription(CONFIG.FORM_DESCRIPTION)")) generatorErrors.push("generator lacks the exact contract description");
  const descriptionBlock = generator.match(/FORM_DESCRIPTION: \[([\s\S]*?)\]\.join\('\\n'\),/);
  const descriptionLines = descriptionBlock ? [...descriptionBlock[1].matchAll(/'([^']*)'/g)].map(match => match[1]) : [];
  if (descriptionLines.join("\n") !== loadedContract.form.description) generatorErrors.push("generator form description differs from contract");
  if (!generator.includes(`RESPONSE_SHEET_TITLE: '${loadedContract.operationsSheet.spreadsheetTitle}'`)) generatorErrors.push("generator response spreadsheet title differs from contract");
  const requiredCount = loadedContract.form.items.filter(item => item.required).length;
  const generatorRequiredCount = (generator.match(/\.setRequired\(true\)/g) ?? []).length;
  if (generatorRequiredCount !== requiredCount) generatorErrors.push(`generator required-item count differs: expected ${requiredCount}, found ${generatorRequiredCount}`);
  const otherCount = loadedContract.form.items.filter(item => item.showOtherOption).length;
  const generatorOtherCount = (generator.match(/\.showOtherOption\(true\)/g) ?? []).length;
  if (generatorOtherCount !== otherCount) generatorErrors.push(`generator other-option count differs: expected ${otherCount}, found ${generatorOtherCount}`);
  for (const page of loadedContract.form.pages.filter(page => page.key !== "route")) {
    if (!generator.includes(`.setTitle('${page.title}')`) || !generator.includes(`.setHelpText('${page.helpText}')`)) generatorErrors.push(`generator lacks contract page copy: ${page.key}`);
  }
  for (const item of loadedContract.form.items) {
    if (!generator.includes(`.setTitle('${item.title}')`)) generatorErrors.push(`generator lacks contract item title: ${item.key}`);
    if (item.helpText && !generator.includes(`.setHelpText('${item.helpText}')`)) generatorErrors.push(`generator lacks contract item helpText: ${item.key}`);
    for (const choice of item.choices ?? []) {
      const value = typeof choice === "string" ? choice : choice.value;
      if (!generator.includes(`'${value}'`)) generatorErrors.push(`generator lacks contract choice: ${item.key}`);
    }
  }
  generatorErrors.push(...validateExistingReuseSource(generator).errors);
  if (generator.includes("function refreshExistingForm_")) generatorErrors.push("automatic existing-form refresh must remain absent until the full contract is compared");
  const contractSha256 = feedbackContractSha256(contractBytes);
  if (!source.includes(`FEEDBACK_PREFLIGHT_CONTRACT_SHA256 = '${contractSha256}'`)) generatorErrors.push("preflight contractSha256 does not match feedback-form-contract.json");
  const regenerated = generateExpectedPreflightSource(contractBytes, source).replaceAll("\r\n", "\n");
  if (regenerated !== source.replaceAll("\r\n", "\n")) generatorErrors.push("preflight generated contract block is stale; run generate_feedback_preflight_contract.mjs --write");
  const errors = [...contractResult.errors, ...preflightResult.errors, ...embeddedResult.errors, ...generatorErrors];
  return {schemaVersion: 1, tool: "scripts/audit_feedback_form_preflight.mjs", ok: errors.length === 0, mismatchCount: errors.length, mismatchCodes: errors};
}

function parseArgs(argv) {
  const outputIndex = argv.indexOf("--output");
  return {output: outputIndex >= 0 ? argv[outputIndex + 1] : null};
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const {output} = parseArgs(process.argv.slice(2));
  const report = auditFeedbackFormPreflight();
  const json = `${JSON.stringify(report, null, 2)}\n`;
  if (output) fs.writeFileSync(path.resolve(output), json, "utf8");
  process.stdout.write(json);
  if (!report.ok) process.exitCode = 1;
}
