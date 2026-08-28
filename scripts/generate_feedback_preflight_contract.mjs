import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath, pathToFileURL} from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
export const REPOSITORY_ROOT = path.resolve(SCRIPT_DIR, "..");
const CONTRACT_PATH = path.join(REPOSITORY_ROOT, "feedback-form-contract.json");
const PREFLIGHT_PATH = path.join(REPOSITORY_ROOT, "scripts", "preflight_google_feedback_form.gs");
export const GENERATED_START = "// feedback-contract-generated:start";
export const GENERATED_END = "// feedback-contract-generated:end";

export function feedbackContractSha256(contractBytes) {
  const canonicalBytes = Buffer.from(contractBytes.toString("utf8").replaceAll("\r\n", "\n"), "utf8");
  return crypto.createHash("sha256").update(canonicalBytes).digest("hex");
}

export function deriveFeedbackPreflightDescriptor(contract) {
  return {
    title: contract.form.title,
    description: contract.form.description,
    settings: contract.form.settings,
    confirmationMessage: contract.form.confirmationMessage,
    pageBreaks: contract.form.pages.slice(1).map((page, index) => ({
      key: page.key,
      title: page.title,
      helpText: page.helpText,
      precedingDefaultNavigation: contract.form.pages[index].defaultNavigation,
    })),
    items: contract.form.items,
    operationsSheet: contract.operationsSheet,
  };
}

export function generateExpectedPreflightSource(contractBytes, currentSource) {
  const contract = JSON.parse(contractBytes.toString("utf8"));
  const descriptor = deriveFeedbackPreflightDescriptor(contract);
  const sha256 = feedbackContractSha256(contractBytes);
  const block = `${GENERATED_START}\nvar FEEDBACK_PREFLIGHT_CONTRACT_SHA256 = '${sha256}';\nvar FEEDBACK_PREFLIGHT_EXPECTED = ${JSON.stringify(descriptor, null, 2)};\n${GENERATED_END}`;
  const start = currentSource.indexOf(GENERATED_START);
  const end = currentSource.lastIndexOf(GENERATED_END);
  let source;
  if (start >= 0 && end > start) source = `${currentSource.slice(0, start)}${block}${currentSource.slice(end + GENERATED_END.length)}`;
  else {
    source = currentSource.replace(/var FEEDBACK_PREFLIGHT_CONTRACT_SHA256 = '[a-f0-9]{64}';\s*\n\s*var FEEDBACK_PREFLIGHT_EXPECTED = \{[\s\S]*?\n\};/, block);
    if (source === currentSource) throw new Error("preflight generated contract block not found");
  }
  return source;
}

export function checkFeedbackPreflightGenerated({write = false} = {}) {
  const contractBytes = fs.readFileSync(CONTRACT_PATH);
  const currentSource = fs.readFileSync(PREFLIGHT_PATH, "utf8");
  const expectedSource = generateExpectedPreflightSource(contractBytes, currentSource);
  const currentNormalized = currentSource.replaceAll("\r\n", "\n");
  const expectedNormalized = expectedSource.replaceAll("\r\n", "\n");
  const matches = currentNormalized === expectedNormalized;
  if (write && !matches) fs.writeFileSync(PREFLIGHT_PATH, expectedSource, "utf8");
  return {matches, written: write && !matches};
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const write = process.argv.slice(2).includes("--write");
  const result = checkFeedbackPreflightGenerated({write});
  process.stdout.write(`${JSON.stringify(result)}\n`);
  if (!write && !result.matches) process.exitCode = 1;
}
