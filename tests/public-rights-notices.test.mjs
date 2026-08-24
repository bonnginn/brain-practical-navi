import assert from "node:assert/strict";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  EXPECTED_NOTICE_MATRIX,
  LEGAL_DISCLOSURE_MARKERS,
  NOTICE_NAMES,
  auditPublicRightsNotices,
  validateDistBundle,
  validateNoticeContents,
  validateProceduralInventory,
  validatePublicRightsNotices,
  validateSourceDisclosures,
} from "../scripts/audit_public_rights_notices.mjs";

const ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const ATLAS = path.join(ROOT, "public", "atlas");
const SOURCE_URL = "https://github.com/bonnginn/brain-practical-navi";
const PRIVACY_TEXT = "localStorage クイズの誤答履歴 分節差分 M2比較の下書き 解剖レビューの下書き 自動送信 サイトデータを消去";
const INDEPENDENCE_TEXT = "原著者やデータ提供機関の推奨・承認を示すものではありません";

function readManifest() {
  return JSON.parse(fs.readFileSync(path.join(ATLAS, "DATA-MANIFEST.json"), "utf8"));
}

async function tempDir(prefix) {
  return fsp.mkdtemp(path.join(os.tmpdir(), prefix));
}

test("source rights audit passes the exact manifest, notices and 21-file procedural inventory", () => {
  const report = auditPublicRightsNotices({ mode: "source", repositoryRoot: ROOT });
  assert.equal(report.ok, true, JSON.stringify(report.errors, null, 2));
  assert.deepEqual(report.summary, {
    assetCount: 110,
    groupCount: 9,
    noticeCount: 5,
    projectAuthoredAssetCount: 21,
    expectedBase: null,
    expectedSourceUrl: null,
  });
  const manifest = readManifest();
  assert.equal(manifest.groups.some(group => "bundledNotice" in group), false);
  for (const group of manifest.groups) assert.deepEqual(group.bundledNotices, EXPECTED_NOTICE_MATRIX[group.id], group.id);
});

test("legacy single notice schema is rejected", () => {
  const manifest = readManifest();
  const group = manifest.groups[0];
  group.bundledNotice = group.bundledNotices[0];
  delete group.bundledNotices;
  const report = validatePublicRightsNotices({ manifest, atlasDir: ATLAS, mode: "source", rootDir: ROOT });
  assert.equal(report.ok, false);
  assert.ok(report.errors.some(error => error.code === "legacy-notice-schema"));
  assert.ok(report.errors.some(error => error.code === "notice-array"));
});

test("missing notice, duplicate owner and unmatched asset mutations are rejected independently", () => {
  const missingNotice = readManifest();
  missingNotice.groups.find(group => group.id === "bigbrain-browser-derivatives").bundledNotices = [];
  const missingReport = validatePublicRightsNotices({ manifest: missingNotice, atlasDir: ATLAS, mode: "source", rootDir: ROOT });
  assert.ok(missingReport.errors.some(error => error.code === "notice-matrix"));

  const duplicateOwner = readManifest();
  duplicateOwner.groups.find(group => group.id === "structure-provenance-audit").pattern = ".*";
  const duplicateReport = validatePublicRightsNotices({ manifest: duplicateOwner, atlasDir: ATLAS, mode: "source", rootDir: ROOT });
  assert.ok(duplicateReport.errors.some(error => error.code === "duplicate-asset"));

  const unmatched = readManifest();
  unmatched.groups.find(group => group.id === "bigbrain-browser-derivatives").pattern = "^never-matches$";
  const unmatchedReport = validatePublicRightsNotices({ manifest: unmatched, atlasDir: ATLAS, mode: "source", rootDir: ROOT });
  assert.ok(unmatchedReport.errors.some(error => error.code === "unmatched-asset"));
});

test("reviewed manifest contract rejects field, pattern and notice-matrix mutations", () => {
  const fieldMutation = readManifest();
  fieldMutation.groups.find(group => group.id === "bigbrain-browser-derivatives").source = "unreviewed source";
  const fieldReport = validatePublicRightsNotices({ manifest: fieldMutation, atlasDir: ATLAS, mode: "source", rootDir: ROOT });
  assert.ok(fieldReport.errors.some(error => error.code === "manifest-contract"));

  const patternMutation = readManifest();
  const patternGroup = patternMutation.groups.find(group => group.id === "bigbrain-browser-derivatives");
  patternGroup.pattern = patternGroup.pattern.slice(1);
  const patternReport = validatePublicRightsNotices({ manifest: patternMutation, atlasDir: ATLAS, mode: "source", rootDir: ROOT });
  assert.ok(patternReport.errors.some(error => error.code === "manifest-contract"));
  assert.ok(patternReport.errors.some(error => error.code === "unanchored-pattern"));

  const noticeMutation = readManifest();
  noticeMutation.groups.find(group => group.id === "bigbrain-browser-derivatives").bundledNotices = [];
  const noticeReport = validatePublicRightsNotices({ manifest: noticeMutation, atlasDir: ATLAS, mode: "source", rootDir: ROOT });
  assert.ok(noticeReport.errors.some(error => error.code === "notice-matrix"));
});

test("notice files must exist and be non-empty", async () => {
  const dir = await tempDir("public-rights-notices-");
  for (const notice of NOTICE_NAMES) await fsp.writeFile(path.join(dir, notice), notice === "LICENSE.txt" ? "" : "notice", "utf8");
  const errors = [];
  validateNoticeContents(dir, errors);
  assert.ok(errors.some(error => error.code === "empty-notice" && error.message.includes("LICENSE.txt")));
});

test("procedural notice inventory mutations are rejected against the manifest pattern", async () => {
  const dir = await tempDir("public-rights-procedural-");
  await fsp.writeFile(path.join(dir, "overlay-a.mesh"), "mesh", "utf8");
  await fsp.writeFile(path.join(dir, "overlay-b.mesh"), "mesh", "utf8");
  await fsp.writeFile(path.join(dir, "PROCEDURAL-NEUROVASCULAR-NOTICE.txt"), "Files:\n- overlay-a.mesh\n", "utf8");
  const errors = [];
  validateProceduralInventory([{ id: "project-authored-teaching-overlays", pattern: "^overlay-[^.]+\\.mesh$" }], dir, errors);
  assert.ok(errors.some(error => error.code === "procedural-inventory"));
});

test("source privacy and independence disclosure mutations are rejected", async () => {
  const dir = await tempDir("public-rights-source-");
  await fsp.mkdir(path.join(dir, "app"));
  const source = `<section className="legalDialog" role="dialog" aria-modal="true" aria-labelledby="legal-title"><div data-legal-disclosure="license-boundaries">AGPL-3.0-or-later CC BY-NC-SA 4.0</div><article data-legal-disclosure="source-credit">BigBrain source credit</article><p data-legal-disclosure="modifications">再標本化 and modifications</p><p data-legal-disclosure="no-endorsement">${INDEPENDENCE_TEXT}</p><p data-legal-disclosure="educational-nonclinical">診断・治療・手術計画・定量研究</p><p data-legal-disclosure="privacy-analytics">Cloudflare Web Analytics 公開HTTPSホスト</p><p data-legal-disclosure="privacy-local-storage">${PRIVACY_TEXT} サイトデータを消去すると失われます</p><a data-legal-disclosure="corresponding-source" href={sourceRepositoryUrl}>対応ソース</a> const sourceRepositoryUrl=(import.meta.env.VITE_SOURCE_REPOSITORY_URL as string|undefined); VITE_SOURCE_REPOSITORY_URL</section>`;
  await fsp.writeFile(path.join(dir, "app", "page.tsx"), source, "utf8");
  const validErrors = [];
  validateSourceDisclosures(dir, validErrors);
  assert.deepEqual(validErrors, []);

  await fsp.writeFile(path.join(dir, "app", "page.tsx"), source.replace("自動送信", "送信"), "utf8");
  const privacyErrors = [];
  validateSourceDisclosures(dir, privacyErrors);
  assert.ok(privacyErrors.some(error => error.code === "source-privacy-marker"));

  await fsp.writeFile(path.join(dir, "app", "page.tsx"), source.replace(INDEPENDENCE_TEXT, "プロジェクト方針"), "utf8");
  const independenceErrors = [];
  validateSourceDisclosures(dir, independenceErrors);
  assert.ok(independenceErrors.some(error => error.code === "source-independence-marker"));

  await fsp.writeFile(path.join(dir, "app", "page.tsx"), source.replace('data-legal-disclosure="modifications">再標本化 and modifications', 'data-legal-disclosure="modifications">converted</p><p>再標本化'), "utf8");
  const boundedErrors = [];
  validateSourceDisclosures(dir, boundedErrors);
  assert.ok(boundedErrors.some(error => error.code === "legal-marker-content" && error.message.includes("modifications")));
});

test("dist audit requires base/source inputs and exact source href", async () => {
  const dir = await tempDir("public-rights-dist-");
  await fsp.mkdir(path.join(dir, "assets"));
  const bundle = `${PRIVACY_TEXT} ${INDEPENDENCE_TEXT} sourceRepositoryUrl:"${SOURCE_URL}" href:"${SOURCE_URL}"`;
  await fsp.writeFile(path.join(dir, "index.html"), `<!doctype html><head><meta name="brain-practical-corresponding-source" content="${SOURCE_URL}"></head><script type="module" src="/brain-practical-navi/assets/app.js"></script>`, "utf8");
  await fsp.writeFile(path.join(dir, "assets", "app.js"), `${bundle} data-legal-disclosure="source-credit" data-legal-disclosure="license-boundaries" data-legal-disclosure="modifications" data-legal-disclosure="no-endorsement" data-legal-disclosure="educational-nonclinical" data-legal-disclosure="privacy-analytics" data-legal-disclosure="privacy-local-storage" data-legal-disclosure="corresponding-source"`, "utf8");

  const validErrors = [];
  validateDistBundle(dir, "/brain-practical-navi/", SOURCE_URL, validErrors);
  assert.deepEqual(validErrors, []);

  const missingArguments = [];
  validateDistBundle(dir, undefined, undefined, missingArguments);
  assert.ok(missingArguments.some(error => error.code === "dist-base-required"));
  assert.ok(missingArguments.some(error => error.code === "dist-source-required"));

  const wrongBase = [];
  validateDistBundle(dir, "/wrong/", SOURCE_URL, wrongBase);
  assert.ok(wrongBase.some(error => error.code === "dist-base-reference"));

  await fsp.writeFile(path.join(dir, "index.html"), `<!doctype html><head><meta name="brain-practical-corresponding-source" content="${SOURCE_URL}"></head><script type="module" src="/other/assets/app.js"></script>`, "utf8");
  const wrongArbitraryPrefix = [];
  validateDistBundle(dir, "/", SOURCE_URL, wrongArbitraryPrefix);
  assert.ok(wrongArbitraryPrefix.some(error => error.code === "dist-local-ref-missing"));

  await fsp.writeFile(path.join(dir, "index.html"), '<!doctype html><head><meta name="brain-practical-corresponding-source" content="https://github.com/other/project"></head><script type="module" src="/brain-practical-navi/assets/app.js"></script>', "utf8");
  const wrongSource = [];
  validateDistBundle(dir, "/brain-practical-navi/", SOURCE_URL, wrongSource);
  assert.ok(wrongSource.some(error => error.code === "dist-source-url"));
});

test("dist fixture rejects missing disclosure markers even when atlas files are valid", async () => {
  const dir = await tempDir("public-rights-dist-disclosure-");
  await fsp.mkdir(path.join(dir, "assets"));
  await fsp.writeFile(path.join(dir, "index.html"), '<script type="module" src="/assets/app.js"></script>', "utf8");
  await fsp.writeFile(path.join(dir, "assets", "app.js"), `sourceRepositoryUrl:"${SOURCE_URL}"`, "utf8");
  const errors = [];
  validateDistBundle(dir, "/", SOURCE_URL, errors);
  assert.ok(errors.some(error => error.code === "dist-privacy-marker"));
  assert.ok(errors.some(error => error.code === "dist-independence-marker"));
});

test("dist audit rejects each missing legal disclosure marker independently", async () => {
  const dir = await tempDir("public-rights-dist-marker-mutations-");
  await fsp.mkdir(path.join(dir, "assets"));
  const index = `<!doctype html><head><meta name="brain-practical-corresponding-source" content="${SOURCE_URL}"></head><script type="module" src="/assets/app.js"></script>`;
  const markers = LEGAL_DISCLOSURE_MARKERS.map(marker => `data-legal-disclosure="${marker}"`).join(" ");
  const app = `${markers} ${SOURCE_URL}`;
  await fsp.writeFile(path.join(dir, "index.html"), index, "utf8");
  for (const marker of LEGAL_DISCLOSURE_MARKERS) {
    await fsp.writeFile(path.join(dir, "assets", "app.js"), app.replace(`data-legal-disclosure="${marker}"`, ""), "utf8");
    const errors = [];
    validateDistBundle(dir, "/", SOURCE_URL, errors);
    assert.ok(errors.some(error => error.code === `dist-${marker}-marker`), marker);
    assert.ok(errors.some(error => error.code === "dist-marker-cardinality"), marker);
  }
});

test("dist audit compares source and built atlas byte-for-byte and rejects missing/extra files", async () => {
  const root = await tempDir("public-rights-dist-atlas-");
  const sourceRoot = path.join(root, "source");
  const distRoot = path.join(root, "dist");
  await fsp.mkdir(path.join(sourceRoot, "public", "atlas"), { recursive: true });
  await fsp.mkdir(path.join(distRoot, "atlas", "nested"), { recursive: true });
  await fsp.mkdir(path.join(distRoot, "assets"), { recursive: true });
  const sourceAtlas = path.join(sourceRoot, "public", "atlas");
  const distAtlas = path.join(distRoot, "atlas");
  await fsp.writeFile(path.join(sourceAtlas, "one.bin"), Buffer.from([1, 2, 3]));
  await fsp.writeFile(path.join(distAtlas, "one.bin"), Buffer.from([1, 2, 3]));
  await fsp.writeFile(path.join(distAtlas, "nested", "extra.bin"), Buffer.from([4]));
  const markers = "data-legal-disclosure=\"source-credit\" data-legal-disclosure=\"license-boundaries\" data-legal-disclosure=\"modifications\" data-legal-disclosure=\"no-endorsement\" data-legal-disclosure=\"educational-nonclinical\" data-legal-disclosure=\"privacy-analytics\" data-legal-disclosure=\"privacy-local-storage\" data-legal-disclosure=\"corresponding-source\"";
  await fsp.writeFile(path.join(distRoot, "index.html"), `<!doctype html><meta name="brain-practical-corresponding-source" content="${SOURCE_URL}"><script type="module" src="/assets/app.js"></script>`, "utf8");
  await fsp.writeFile(path.join(distRoot, "assets", "app.js"), `${markers} ${SOURCE_URL}`, "utf8");
  const extraErrors = [];
  validateDistBundle(distRoot, "/", SOURCE_URL, extraErrors, sourceRoot);
  assert.ok(extraErrors.some(error => error.code === "dist-atlas-extra"));

  await fsp.rm(path.join(distAtlas, "nested"), { recursive: true });
  await fsp.writeFile(path.join(distAtlas, "one.bin"), Buffer.from([1, 2, 4]));
  const byteErrors = [];
  validateDistBundle(distRoot, "/", SOURCE_URL, byteErrors, sourceRoot);
  assert.ok(byteErrors.some(error => error.code === "dist-atlas-byte-mismatch"));

  await fsp.rm(path.join(distAtlas, "one.bin"));
  const missingErrors = [];
  validateDistBundle(distRoot, "/", SOURCE_URL, missingErrors, sourceRoot);
  assert.ok(missingErrors.some(error => error.code === "dist-atlas-missing"));
});
