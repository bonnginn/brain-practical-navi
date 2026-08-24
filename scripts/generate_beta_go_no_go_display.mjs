import fs from "node:fs";
import path from "node:path";
import {fileURLToPath, pathToFileURL} from "node:url";

import {createBetaGoNoGoProjection} from "../src/betaGoNoGo.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
export const REPOSITORY_ROOT = path.resolve(SCRIPT_DIR, "..");

export function generateBetaGoNoGoDisplay({
  ledgerPath = path.join(REPOSITORY_ROOT, "BETA_GO_NO_GO.json"),
  outputPath = path.join(REPOSITORY_ROOT, "app", "beta-go-no-go-display.json"),
} = {}) {
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, "utf8"));
  const projection = createBetaGoNoGoProjection(ledger);
  fs.mkdirSync(path.dirname(outputPath), {recursive: true});
  fs.writeFileSync(outputPath, `${JSON.stringify(projection, null, 2)}\n`, "utf8");
  return {outputPath, criterionCount: projection.itemCount, stateCounts: projection.stateCounts};
}

function main(argv = process.argv.slice(2)) {
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log("Usage: node scripts/generate_beta_go_no_go_display.mjs [--output path]");
    return 0;
  }
  let outputPath;
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] !== "--output" || !argv[index + 1]) throw new Error(`unknown or incomplete option: ${argv[index]}`);
    outputPath = path.resolve(REPOSITORY_ROOT, argv[++index]);
  }
  console.log(JSON.stringify(generateBetaGoNoGoDisplay({outputPath})));
  return 0;
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : "";
if (import.meta.url === invokedPath) {
  try { process.exitCode = main(); }
  catch (error) { console.error(error.stack || error.message); process.exitCode = 1; }
}
