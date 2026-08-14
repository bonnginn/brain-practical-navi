import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const atlas = new URL("public/atlas/", root);
const manifest = JSON.parse(await readFile(new URL("specimen-blocks.json", atlas), "utf8"));
const hindbrain = manifest.specimens.hindbrain;
const byPart = new Map(hindbrain.map(entry => [entry.part, entry]));

const reconstructionParts = ["pons-medulla", "cerebellum", "midbrain", "fourth-ventricle"];
const schematicParts = [
  "superior-cerebellar-peduncles", "middle-cerebellar-peduncles", "inferior-cerebellar-peduncles",
  "facial-colliculi", "vestibular-areas", "hypoglossal-trigones", "vagal-trigones", "pyramids", "olives",
];
const reconstructionSources = new Set(["same-grid-segmentation", "teaching-segmentation"]);
const schematicSources = new Set(["schematic-3d", "regional-approximation"]);
const MiB = 1024 * 1024;

const checks = [];
function check(name, pass, detail) { checks.push({ name, pass, detail }); }

check("shared-coordinate-space", manifest.coordinateSpace.includes("shared centred ICBM500"), manifest.coordinateSpace);
check("reconstruction-parts-present", reconstructionParts.every(part => byPart.has(part)), reconstructionParts.join(", "));
check("schematic-parts-present", schematicParts.every(part => byPart.has(part)), schematicParts.join(", "));
check("reconstruction-source-types", reconstructionParts.every(part => reconstructionSources.has(byPart.get(part)?.sourceType)), "same-grid or teaching subdivision only");
check("schematic-source-types", schematicParts.every(part => schematicSources.has(byPart.get(part)?.sourceType)), "schematic-3d or regional-approximation only");
check("comparison-sets-disjoint", reconstructionParts.every(part => !schematicParts.includes(part)), "no part is presented as both data-anchored and schematic");
check("source-types-defined", [...reconstructionSources, ...schematicSources].every(source => manifest.sourceTypeDefinitions[source]), "all displayed classifications have manifest definitions");

const files = [...new Set([...reconstructionParts, ...schematicParts].map(part => byPart.get(part).file))];
const sizes = await Promise.all(files.map(file => stat(new URL(file, atlas))));
const totalBytes = sizes.reduce((sum, entry) => sum + entry.size, 0);
check("comparison-payload-budget", totalBytes < 4 * MiB, `${(totalBytes / MiB).toFixed(2)} MiB / 4.00 MiB`);

export function collectModelComparisonAudit() { return { reconstructionParts, schematicParts, totalBytes, checks }; }

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  for (const result of checks) console.log(`${result.pass ? "PASS" : "FAIL"}\t${result.name}\t${result.detail}`);
  if (checks.some(result => !result.pass)) process.exitCode = 1;
}
