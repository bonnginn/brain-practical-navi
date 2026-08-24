import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function relativeShellPath(value) {
  if (value === "./") return "index.html";
  return value.replace(/^\.\//, "");
}

export function auditPwaBuild(distDirectory = path.join(root, "dist")) {
  const errors = [];
  const indexPath = path.join(distDirectory, "index.html");
  const workerPath = path.join(distDirectory, "service-worker.js");
  const manifestPath = path.join(distDirectory, "manifest.webmanifest");
  for (const file of [indexPath, workerPath, manifestPath]) {
    if (!fs.existsSync(file)) errors.push(`missing build artifact: ${path.basename(file)}`);
  }
  if (errors.length) return { ok: false, errors };

  const html = fs.readFileSync(indexPath, "utf8");
  const worker = fs.readFileSync(workerPath, "utf8");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const manifestLink = html.match(/<link[^>]+rel="manifest"[^>]+href="([^"]+)"/)?.[1];
  if (!manifestLink?.endsWith("/manifest.webmanifest")) errors.push("manifest link is not base-path resolved");
  if (manifest.start_url !== "." || manifest.scope !== ".") errors.push("manifest start_url and scope must stay relative");
  for (const [source, sizes] of [["icon-192.png", "192x192"], ["icon-512.png", "512x512"]]) {
    const icon = manifest.icons?.find(value => value.src === source && value.sizes === sizes && value.type === "image/png");
    if (!icon) errors.push(`manifest icon is missing: ${source} ${sizes}`);
    if (!fs.existsSync(path.join(distDirectory, source))) errors.push(`manifest icon file is missing: ${source}`);
  }

  const shellMatch = worker.match(/const SHELL_FILES=(\[[^;]+\]);/);
  let shellFiles = [];
  if (!shellMatch) {
    errors.push("generated worker has no shell file list");
  } else {
    shellFiles = JSON.parse(shellMatch[1]);
  }
  let shellBytes = 0;
  for (const value of shellFiles) {
    const relativePath = relativeShellPath(value);
    const absolutePath = path.join(distDirectory, relativePath);
    if (!fs.existsSync(absolutePath)) {
      errors.push(`shell file is missing: ${value}`);
      continue;
    }
    shellBytes += fs.statSync(absolutePath).size;
    if (relativePath.startsWith("atlas/") || /\.(?:mesh|nii|gz|bin)$/i.test(relativePath)) {
      errors.push(`large data must not be pre-cached: ${value}`);
    }
  }
  if (shellBytes > 1_000_000) errors.push(`shell exceeds 1,000,000 bytes: ${shellBytes}`);
  for (const pattern of ["request.method!==\"GET\"", "request.headers.has(\"range\")", "url.origin!==scope.origin", "response.ok", "request.mode===\"navigate\""]) {
    if (!worker.includes(pattern)) errors.push(`worker invariant missing: ${pattern}`);
  }
  if (worker.includes("skipWaiting")) errors.push("worker must not force an update while clients are open");

  return { ok: errors.length === 0, errors, manifestLink, shellFiles, shellBytes };
}

function main(argv) {
  let dist = path.join(root, "dist");
  let output = null;
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--dist") dist = path.resolve(argv[++index]);
    else if (argv[index] === "--output") output = path.resolve(argv[++index]);
    else throw new Error(`unknown option: ${argv[index]}`);
  }
  const result = auditPwaBuild(dist);
  const json = `${JSON.stringify(result, null, 2)}\n`;
  process.stdout.write(json);
  if (output) {
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, json, "utf8");
  }
  return result.ok ? 0 : 1;
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  try { process.exitCode = main(process.argv.slice(2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
