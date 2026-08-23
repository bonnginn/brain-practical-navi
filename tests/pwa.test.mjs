import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { auditPwaBuild } from "../scripts/audit_pwa_build.mjs";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("manifest declares base-path-relative launch data and required icon sizes", async () => {
  const manifest = JSON.parse(await read("public/manifest.webmanifest"));
  assert.equal(manifest.start_url, ".");
  assert.equal(manifest.scope, ".");
  assert.equal(manifest.display, "standalone");
  assert.ok(manifest.icons.some(icon => icon.src === "icon-192.png" && icon.sizes === "192x192" && icon.type === "image/png"));
  assert.ok(manifest.icons.some(icon => icon.src === "icon-512.png" && icon.sizes === "512x512" && icon.type === "image/png"));
  const icon192 = await readFile(new URL("../public/icon-192.png", import.meta.url));
  const icon512 = await readFile(new URL("../public/icon-512.png", import.meta.url));
  assert.deepEqual([icon192.readUInt32BE(16), icon192.readUInt32BE(20)], [192, 192]);
  assert.deepEqual([icon512.readUInt32BE(16), icon512.readUInt32BE(20)], [512, 512]);
  assert.match(await read("index.html"), /rel="manifest" href="%BASE_URL%manifest\.webmanifest"/);
});

test("service worker registration is production-only, scoped, and non-fatal", async () => {
  const source = await read("src/pwa.ts");
  assert.match(source, /import\.meta\.env\.PROD/);
  assert.match(source, /import\.meta\.env\.BASE_URL/);
  assert.match(source, /serviceWorker\.register\(`\$\{baseUrl\}service-worker\.js`, \{ scope: baseUrl \}\)/);
  assert.match(source, /\.catch\(\(\) =>/);
  assert.doesNotMatch(source, /skipWaiting/);
});

test("generated worker keeps initial install small and runtime caching bounded", async () => {
  const source = await read("build/pwa-vite-plugin.ts");
  assert.match(source, /createHash\("sha256"\)/);
  assert.match(source, /hashPublicDirectory\(revisionHash, publicDirectory\)/);
  assert.match(source, /output\.isEntry/);
  assert.match(source, /\.css\$\/i/);
  assert.match(source, /"\.\/favicon\.svg", "\.\/manifest\.webmanifest"/);
  assert.doesNotMatch(source, /SHELL_FILES[^;]*(?:atlas|\.mesh|\.nii|\.gz)/si);
  assert.match(source, /request\.method!==\"GET\"/);
  assert.match(source, /request\.headers\.has\(\"range\"\)/);
  assert.match(source, /url\.origin!==scope\.origin/);
  assert.match(source, /url\.pathname\.includes\(\"\/cdn-cgi\/\"\)/);
  assert.match(source, /response\.ok&&response\.type!==\"opaque\"/);
  assert.match(source, /request\.mode===\"navigate\"/);
  assert.match(source, /caches\.match\(scopeUrl\(\"\.\/\"\)\)/);
  assert.doesNotMatch(source, /skipWaiting/);
});

test("current production build has a bounded, complete PWA shell", () => {
  const result = auditPwaBuild(fileURLToPath(new URL("../dist", import.meta.url)));
  assert.equal(result.ok, true, result.errors.join("\n"));
  assert.ok(result.shellBytes < 1_000_000);
  assert.ok(result.shellFiles.some(file => /assets\/index-.+\.js$/.test(file)));
  assert.ok(result.shellFiles.some(file => /assets\/index-.+\.css$/.test(file)));
});
