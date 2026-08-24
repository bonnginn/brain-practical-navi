import assert from "node:assert/strict";
import {access, readFile} from "node:fs/promises";
import {test} from "node:test";

const root = new URL("../", import.meta.url);
const removedStarterPaths = [
  "next.config.ts", "next-env.d.ts", "drizzle.config.ts", "eslint.config.mjs",
  "db/index.ts", "db/schema.ts", "drizzle/meta/_journal.json",
  "examples/d1/app/api/notes/route.ts", "examples/d1/db/schema.ts", "worker/index.ts",
];

function pagesBaseCiJob(source) {
  const normalized = source.replace(/\r\n?/g, "\n");
  const start = normalized.indexOf("  verify-pages-base:\n");
  assert.notEqual(start, -1, "CI must define the independent Pages-base verification job");
  const rest = normalized.slice(start);
  const nextJob = rest.search(/\n  [A-Za-z0-9_-]+:\n/);
  return nextJob < 0 ? rest : rest.slice(0, nextJob);
}

function assertPagesBaseCiContract(source) {
  const job = pagesBaseCiJob(source);
  assert.match(job, /actions\/checkout@v7/, "Pages-base verification must use its own checkout");
  assert.match(job, /actions\/setup-node@v7/, "Pages-base verification must use its own Node setup");
  assert.match(job, /package-manager-cache:\s*false/);
  assert.match(job, /run: npm ci --no-audit --no-fund/, "Pages-base verification must install from the lockfile");
  assert.match(job, /run: npm run build/, "Pages-base verification must build the Pages variant");
  assert.match(job, /DEPLOY_GITHUB_PAGES:\s*[\"']?true[\"']?/, "Pages-base build must enable the Pages base");
  assert.match(job, /VITE_SOURCE_REPOSITORY_URL:\s*https:\/\/github\.com\/bonnginn\/brain-practical-navi/);
  assert.match(job, /scripts\/audit_public_rights_notices\.mjs/);
  assert.match(job, /--mode dist/);
  assert.match(job, /--dist-root dist/);
  assert.match(job, /--expected-base \/brain-practical-navi\//, "Pages audit must pin the repository base path");
  assert.match(job, /--expected-source-url https:\/\/github\.com\/bonnginn\/brain-practical-navi/);
  assert.doesNotMatch(job, /(?:configure-pages|upload-pages-artifact|deploy-pages)/, "The verification job must not deploy");
}

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

test("active workflows use the current Node 24 action generation", async () => {
  const [ci, pages] = await Promise.all([
    readFile(new URL(".github/workflows/ci.yml", root), "utf8"),
    readFile(new URL(".github/workflows/pages.yml", root), "utf8"),
  ]);
  assert.match(ci, /actions\/checkout@v7/);
  assert.match(ci, /actions\/setup-node@v7/);
  assert.match(ci, /actions\/setup-python@v7/);
  assert.match(ci, /package-manager-cache: false/);
  assert.match(pages, /actions\/checkout@v7/);
  assert.match(pages, /actions\/setup-node@v7/);
  assert.match(pages, /actions\/configure-pages@v6/);
  assert.match(pages, /actions\/upload-pages-artifact@v5/);
  assert.match(pages, /actions\/deploy-pages@v5/);
  assert.match(pages, /permissions:\s+actions: read/);
  assert.match(pages, /package-manager-cache: false/);
  assert.doesNotMatch(`${ci}\n${pages}`, /actions\/(?:checkout|setup-node)@v4|actions\/setup-python@v5/);
});

test("active workflows install the exact npm lockfile graph", async () => {
  const [pkg, lock, ci, pages] = await Promise.all([
    readFile(new URL("package.json", root), "utf8").then(JSON.parse),
    readFile(new URL("package-lock.json", root), "utf8").then(JSON.parse),
    readFile(new URL(".github/workflows/ci.yml", root), "utf8"),
    readFile(new URL(".github/workflows/pages.yml", root), "utf8"),
  ]);
  assert.equal(lock.lockfileVersion, 3);
  assert.equal(lock.requires, true);
  assert.equal(lock.name, pkg.name);
  assert.equal(lock.version, pkg.version);
  assert.equal(lock.packages[""].name, pkg.name);
  assert.equal(lock.packages[""].version, pkg.version);
  assert.equal(lock.packages[""].license, pkg.license);
  assert.deepEqual(lock.packages[""].dependencies, pkg.dependencies);
  assert.deepEqual(lock.packages[""].devDependencies, pkg.devDependencies);
  assert.ok(Object.keys(lock.packages).length > 1);
  for (const [path, entry] of Object.entries(lock.packages).filter(([path]) => path)) {
    assert.equal(typeof entry.version, "string", `${path} must pin a version`);
    assert.match(entry.resolved, /^https:\/\/registry\.npmjs\.org\//, `${path} must use the npm registry`);
    assert.match(entry.integrity, /^sha512-/, `${path} must pin SHA-512 integrity`);
  }
  for (const [workflow, source] of [["ci", ci], ["pages", pages]]) {
    assert.match(source, /run: npm ci --no-audit --no-fund/, `${workflow} must install from package-lock.json`);
    assert.doesNotMatch(source, /run:\s*npm install\b/, `${workflow} must not resolve a new dependency graph`);
  }
});

test("CI independently verifies the Pages base-path rights contract without deploying", async () => {
  const ci = await readFile(new URL(".github/workflows/ci.yml", root), "utf8");
  assertPagesBaseCiContract(ci);

  const missingPagesEnv = ci.replace('          DEPLOY_GITHUB_PAGES: "true"\n', "");
  assert.throws(() => assertPagesBaseCiContract(missingPagesEnv), /Pages-base build must enable the Pages base/);

  const wrongPagesBase = ci.replace("--expected-base /brain-practical-navi/", "--expected-base /");
  assert.throws(() => assertPagesBaseCiContract(wrongPagesBase), /Pages audit must pin the repository base path/);
});
