import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {readFile} from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("public og asset has a project creation record and a current hash", async () => {
  const [asset, record, licenses] = await Promise.all([
    readFile(new URL("public/og.png", root)),
    readFile(new URL("PUBLIC_ASSET_CREATION_RECORD.md", root), "utf8"),
    readFile(new URL("LICENSES.md", root), "utf8"),
  ]);
  const hash = createHash("sha256").update(asset).digest("hex");
  assert.match(record, /public\/og\.png/);
  assert.match(record, /8bcd96b/);
  assert.match(record, /ed89e37/);
  assert.match(record, /SNS共有リンクのプレビュー専用/);
  assert.match(record, /第三者の画像、講義資料、教科書、アトラス画像、献体写真、患者画像、研究データを素材としていません/);
  assert.match(record, /解剖学的な位置・形状の根拠/);
  assert.match(record, /CC BY-NC-SA 4\.0/);
  assert.equal(asset.byteLength, 2_099_728);
  const recordedHash = record.match(/SHA-256:\s*`([0-9a-f]{64})`/i)?.[1];
  assert.equal(recordedHash, hash);
  assert.match(licenses, /public\/ASSET-NOTICE\.txt/);
  assert.match(licenses, /公開視覚素材/);
  assert.match(licenses, /CC BY-NC-SA 4\.0/);
});
