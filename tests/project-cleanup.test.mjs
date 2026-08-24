import assert from "node:assert/strict";
import {access, readFile} from "node:fs/promises";
import {test} from "node:test";

const root = new URL("../", import.meta.url);
const removedStarterPaths = [
  "next.config.ts", "next-env.d.ts", "drizzle.config.ts", "eslint.config.mjs",
  "db/index.ts", "db/schema.ts", "drizzle/meta/_journal.json",
  "examples/d1/app/api/notes/route.ts", "examples/d1/db/schema.ts", "worker/index.ts",
];

test("unused Next, D1, Drizzle, and Vinext starter files stay removed", async () => {
  for (const path of removedStarterPaths) {
    await assert.rejects(access(new URL(path, root)), {code: "ENOENT"}, path);
  }
});

test("cleanup preserves the active Vite, Sites, and PWA configuration", async () => {
  const [pkg, hosting, vite, sitesPlugin, pwaPlugin] = await Promise.all([
    readFile(new URL("package.json", root), "utf8").then(JSON.parse),
    readFile(new URL(".openai/hosting.json", root), "utf8").then(JSON.parse),
    readFile(new URL("vite.config.ts", root), "utf8"),
    readFile(new URL("build/sites-vite-plugin.ts", root), "utf8"),
    readFile(new URL("build/pwa-vite-plugin.ts", root), "utf8"),
  ]);
  assert.equal(pkg.scripts.build, "tsc -b && vite build");
  assert.equal(hosting.d1, null);
  assert.equal(hosting.r2, null);
  assert.match(vite, /sites\(\)/);
  assert.match(vite, /pwa\(/);
  assert.match(sitesPlugin, /hosting\.json/);
  assert.match(sitesPlugin, /serverDirectory/);
  assert.doesNotMatch(sitesPlugin, /drizzle/);
  assert.match(pwaPlugin, /service-worker\.js/);
});
