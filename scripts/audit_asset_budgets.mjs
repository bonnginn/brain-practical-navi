import { readdir, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const atlas = new URL("public/atlas/", root);
const MiB = 1024 * 1024;

const surfaceCore = [
  "pial-left.mesh.gz", "pial-right.mesh.gz", "segment-cerebellum.mesh",
  "segment-pons-medulla.mesh", "segment-midbrain.mesh",
];
const sectionImages = ["bigbrain-icbm500.bin.gz", "bigbrain-practical-segmentation-icbm500.bin.gz"];
const lateralVentricle = [
  "block-lateral-ventricle-tissue.mesh", "block-lateral-ventricle-ventricular-cavity.mesh",
  "block-lateral-ventricle-caudate.mesh", "block-lateral-ventricle-thalamus.mesh",
  "block-lateral-ventricle-hippocampus.mesh",
];
const neurovascularOverlays = [
  "overlay-arteries-anterior.mesh", "overlay-arteries-posterior.mesh",
  "overlay-nerves-anterior.mesh", "overlay-nerves-pontine.mesh", "overlay-nerves-medullary.mesh",
];

async function bytesFor(names) {
  const entries = await Promise.all(names.map(name => stat(new URL(name, atlas))));
  return entries.reduce((sum, entry) => sum + entry.size, 0);
}

async function directoryBytes(directory) {
  let total = 0;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, directory);
    total += entry.isDirectory() ? await directoryBytes(target) : (await stat(target)).size;
  }
  return total;
}

export async function collectAssetAudit() {
  const [surface, section, specimen, neurovascular, publicTotal] = await Promise.all([
    bytesFor(surfaceCore), bytesFor(sectionImages), bytesFor(lateralVentricle),
    bytesFor(neurovascularOverlays), directoryBytes(new URL("public/", root)),
  ]);
  return {
    public: { bytes: publicTotal, limit: 100 * MiB },
    routes: {
      surface: { bytes: surface, limit: 14 * MiB },
      sectionDesktop: { bytes: surface + section, limit: 26 * MiB },
      sectionCompact: { bytes: section, limit: 13 * MiB },
      lateralVentricle: { bytes: specimen, limit: 3 * MiB },
      neurovascular: { bytes: surface + neurovascular, limit: 15 * MiB },
    },
  };
}

function formatMiB(bytes) { return `${(bytes / MiB).toFixed(1)} MiB`; }

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  const audit = await collectAssetAudit();
  const rows = [["public", audit.public], ...Object.entries(audit.routes)];
  let failed = false;
  for (const [name, result] of rows) {
    const ok = result.bytes < result.limit;
    failed ||= !ok;
    console.log(`${ok ? "PASS" : "FAIL"}\t${name}\t${formatMiB(result.bytes)} / ${formatMiB(result.limit)}`);
  }
  if (failed) process.exitCode = 1;
}
