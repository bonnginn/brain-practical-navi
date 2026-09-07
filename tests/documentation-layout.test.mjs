import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { documentPath } from "../scripts/document_path.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
test("README remains a concise bilingual entry with current status and working document links", () => {
  const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");
  assert.ok(readme.split(/\r?\n/).length < 100);
  for (const marker of ["公開α版", "public alpha", "92問", "docs/README.md", "docs/RESUME_SUMMARY.md"]) assert.ok(readme.includes(marker), marker);
  const index = fs.readFileSync(path.join(root, "docs/README.md"), "utf8");
  for (const name of fs.readdirSync(path.join(root, "docs")).filter(n => n.endsWith(".md") && n !== "README.md")) assert.ok(index.includes(`](${name})`), name);
  for (const relative of ["README.md", "docs/README.md", "docs/DEVELOPMENT.md", "docs/RESUME_SUMMARY.md"]) {
    const file = path.join(root, relative);
    for (const match of fs.readFileSync(file, "utf8").matchAll(/\]\(([^\s)]+)\)/g)) {
      if (/^(?:[a-z]+:|#)/i.test(match[1])) continue;
      assert.ok(fs.existsSync(path.resolve(path.dirname(file), match[1].split("#")[0])), `${relative}: ${match[1]}`);
    }
  }
});

test("historical document lookup prefers root and limits fallback to bare Markdown names", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "brain-doc-path-"));
  try {
    fs.mkdirSync(path.join(dir, "docs"));
    fs.writeFileSync(path.join(dir, "docs", "AUDIT.md"), "moved");
    assert.equal(documentPath(dir, "AUDIT.md"), path.join(dir, "docs", "AUDIT.md"));
    assert.equal(documentPath(dir, "MISSING.md"), path.join(dir, "MISSING.md"));
    assert.equal(documentPath(dir, "nested/AUDIT.md"), path.join(dir, "nested", "AUDIT.md"));
    assert.equal(documentPath(dir, "AUDIT.json"), path.join(dir, "AUDIT.json"));
    fs.writeFileSync(path.join(dir, "AUDIT.md"), "original");
    assert.equal(documentPath(dir, "AUDIT.md"), path.join(dir, "AUDIT.md"));
  } finally {
    fs.unlinkSync(path.join(dir, "AUDIT.md"));
    fs.unlinkSync(path.join(dir, "docs", "AUDIT.md"));
    fs.rmdirSync(path.join(dir, "docs"));
    fs.rmdirSync(dir);
  }
});
