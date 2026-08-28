import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import test from "node:test";

const page = fs.readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../app/canvas.css", import.meta.url), "utf8");
const audit = fs.readFileSync(new URL("../QR_ACCESS_AUDIT.md", import.meta.url), "utf8");

const assets = [
  ["access-pc-tablet.png", "3a3b6a19627a61b8a6f8097f70f622a320952c210d145e9262a5169fd1fe839b"],
  ["access-smartphone.png", "dd885305d565f82873baed47a9de47701e6569bea25a58259d5b3ea0b7bd2200"],
];

test("Home exposes distinct direct desktop and phone access links", () => {
  assert.match(page, /https:\/\/bonnginn\.github\.io\/brain-practical-navi\//);
  assert.match(page, /\?ui=desktop#workspace\/home/);
  assert.match(page, /\?ui=phone#workspace\/home/);
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
  test(`${name} is the audited 342px PNG`, () => {
    const bytes = fs.readFileSync(new URL(`../public/${name}`, import.meta.url));
    assert.equal(bytes.subarray(1, 4).toString("ascii"), "PNG");
    assert.equal(bytes.readUInt32BE(16), 342);
    assert.equal(bytes.readUInt32BE(20), 342);
    assert.equal(crypto.createHash("sha256").update(bytes).digest("hex"), expectedHash);
    assert.match(audit, new RegExp(expectedHash));
  });
}
