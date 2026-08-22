import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import {fileURLToPath, pathToFileURL} from "node:url";
import {parseQuizGranularity} from "./audit_quiz_granularity.mjs";
import {BASAL_GANGLIA_TARGETS, auditBasalGangliaStepper} from "../src/pathwayStepper.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, "..");

function readSegmentation(root = ROOT) {
  const compressed = fs.readFileSync(path.join(root, "public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz"));
  const buffer = zlib.gunzipSync(compressed);
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  if (view.getUint32(0, false) !== 0x42425331) throw new Error("invalid practical segmentation header");
  const dims = [view.getUint16(4, true), view.getUint16(6, true), view.getUint16(8, true)];
  const count = dims[0] * dims[1] * dims[2];
  return {dims, labels: new Uint8Array(buffer.buffer, buffer.byteOffset + 10, count)};
}

export function parseAppStructureLabelIds(source) {
  const structures = source.match(/const structures: Record<StructureKey, StructureInfo> = \{(?<body>[\s\S]*?)\n\};/)?.groups?.body ?? "";
  return Object.fromEntries(BASAL_GANGLIA_TARGETS.map(target => {
    const match = structures.match(new RegExp(`(?:^|\\n)\\s*${target}:\\s*\\{[^\\n]*?bigbrainIds:\\[([^\\]]+)\\]`));
    return [target, match ? match[1].split(",").map(value => Number(value.trim())).filter(Number.isInteger) : []];
  }));
}

export function auditPathwayStepper(root = ROOT) {
  const source = fs.readFileSync(path.join(root, "app/page.tsx"), "utf8");
  const quizQuestions = parseQuizGranularity(source);
  const labelIdsByTarget = parseAppStructureLabelIds(source);
  return auditBasalGangliaStepper({...readSegmentation(root), quizQuestions, labelIdsByTarget});
}

function main() {
  const outputIndex = process.argv.indexOf("--output");
  const output = outputIndex >= 0 ? process.argv[outputIndex + 1] : null;
  const result = auditPathwayStepper();
  const serialized = `${JSON.stringify(result, null, 2)}\n`;
  if (output) fs.writeFileSync(path.resolve(output), serialized, "utf8");
  process.stdout.write(serialized);
  if (!result.ok) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
