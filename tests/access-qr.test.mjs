import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import test from "node:test";

const page = fs.readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../app/canvas.css", import.meta.url), "utf8");
const audit = fs.readFileSync(new URL("../docs/QR_ACCESS_AUDIT.md", import.meta.url), "utf8");

const assets = [
  ["access-pc-tablet.png", "aa0d084c2697cf91e72420315edbfc5799c361d6951825c6f01e88cee59ad24c"],
  ["access-smartphone.png", "20653adbe795fb545e40d23fcb2ca16dd94b7f71e5dfdc9657dafbef7d1b8791"],
];

test("Home exposes distinct direct desktop and phone access links", () => {
  assert.match(page, /https:\/\/bonnginn\.github\.io\/brain-practical-navi\//);
  assert.match(page, /\?ui=desktop#workspace\/entrance/);
  assert.match(page, /\?ui=phone#workspace\/entrance/);
  assert.match(page, /data-access-ui="desktop"/);
  assert.match(page, /data-access-ui="phone"/);
  assert.match(page, /PC・タブレット用ページを開くQRコード/);
  assert.match(page, /スマートフォン用ページを開くQRコード/);
});

test("QR layout is two columns on wide screens and one on small screens", () => {
  assert.match(css, /\.accessQrGrid\s*\{[^}]*grid-template-columns:\s*repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /@media\(max-width:760px\)\{[^}]*\.homeArea[^}]*\}[^@]*\.accessQrGrid\{grid-template-columns:1fr\}/s);
});

for (const [name, expectedHash] of assets) {
  test(`${name} is the audited 270px PNG`, () => {
    const bytes = fs.readFileSync(new URL(`../public/${name}`, import.meta.url));
    assert.equal(bytes.subarray(1, 4).toString("ascii"), "PNG");
    assert.equal(bytes.readUInt32BE(16), 270);
    assert.equal(bytes.readUInt32BE(20), 270);
    assert.equal(crypto.createHash("sha256").update(bytes).digest("hex"), expectedHash);
    assert.match(audit, new RegExp(expectedHash));
  });
}
