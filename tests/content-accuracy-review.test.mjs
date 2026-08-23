import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const [page, provenanceText, review] = await Promise.all([
  readFile(resolve(root, "app/page.tsx"), "utf8"),
  readFile(resolve(root, "public/atlas/structure-provenance.json"), "utf8"),
  readFile(resolve(root, "CONTENT_ACCURACY_REVIEW.md"), "utf8"),
]);
const provenance = JSON.parse(provenanceText);

test("視床下核の分類は間脳の視床下域として表示し、内部キーは維持する", () => {
  assert.match(page, /\{key:"midbrain",label:"中脳・視床下域"\}/);
  assert.match(page, /\{key:"midbrain",name:"中脳核・視床下域"/);
  assert.doesNotMatch(page, /\{key:"midbrain",label:"中脳・視床下部"\}/);
  assert.doesNotMatch(page, /\{key:"midbrain",name:"中脳核",/);
  assert.match(page, /間脳の視床下域にある視床下核（STN）/);
  assert.match(page, /視床下部や中脳そのものとは区別/);
  assert.match(page, /target:"subthalamic",category:"midbrain"/);
  assert.match(page, /間脳の視床下域にあり、視床の腹側・黒質の背側/);
});

test("淡蒼球全体・外節・内節の機能差を表示する", () => {
  assert.match(page, /pallidumExternal:"淡蒼球外節（GPe）は大脳基底核内の中継・調節部/);
  assert.match(page, /pallidumInternal:"淡蒼球内節（GPi）は大脳基底核から視床などへ向かう主要な出力部/);
  assert.match(page, /pallidum:"淡蒼球は外節（GPe）の内部中継・調節部と、内節（GPi）の主要出力部/);
});

test("脳室・尾状核・交連標本の説明を根拠に沿って表示する", () => {
  assert.match(page, /頭部は側脳室前角の外側壁を形成し、体部は側脳室体部の外側に位置し、尾部は下角の上方・天井側/);
  assert.match(page, /間脳・視床下域にある視床下核を一つの切り出し/);
  assert.match(page, /淡蒼球内節の外側に位置する、内部の中継・調節部/);
  assert.match(page, /淡蒼球から視床などへ向かう主要な出力部/);
  assert.match(page, /左右の視床・視床下部に囲まれる正中の細い腔/);
  assert.match(page, /上方：視床、下方：視床下部/);
  assert.match(page, /en:"CORPUS CALLOSUM AND FORNIX"/);
});

test("脳表5領域のアトラス由来注記は利用者向けにも表示する", () => {
  assert.match(page, /data-surface-nomenclature-note="cerebra-desikan-five"/);
  for (const name of ["中前頭回前部", "中前頭回後部", "鳥距溝周囲皮質", "外側後頭皮質", "眼窩前頭皮質"]) {
    assert.match(page, new RegExp(name));
  }
  assert.match(page, /国際標準Terminologia Neuroanatomica（FIPAT／TNA）の確定用語だとは主張しません/);
  assert.match(page, /標準ラテン語への置換は行っていません/);
});

test("来歴台帳の該当項目にも分類・機能・命名の注意を残す", () => {
  const byKey = new Map(provenance.entries.map((entry) => [entry.key, entry]));
  assert.match(byKey.get("section-subthalamic-nucleus").knownLimitations.join(" "), /間脳の視床下域/);
  assert.match(byKey.get("section-pallidum-external-internal").knownLimitations.join(" "), /GPe.*中継・調節.*GPi.*主要出力/);
  assert.match(byKey.get("section-ventricular-system").knownLimitations.join(" "), /上方は視床、下方（底側）は視床下部/);
  for (const key of [
    "app-surface-rostral-middle-frontal",
    "app-surface-caudal-middle-frontal",
    "app-surface-pericalcarine",
    "app-surface-orbitofrontal",
    "app-surface-lateral-occipital",
  ]) {
    const note = byKey.get(key).knownLimitations.join(" ");
    assert.match(note, /CerebrA／Desikan-style/);
    assert.match(note, /FIPAT／TNAの国際標準用語とは主張せず/);
  }
});

test("コンテンツレビューは根拠URLと未完了の専門家レビューを明示する", () => {
  for (const url of [
    "https://cdn.dal.ca/content/dam/dalhousie/pdf/library/FIPAT/TNA/FIPAT-TNA-Ch1.pdf",
    "https://www.ncbi.nlm.nih.gov/books/NBK557755/",
    "https://www.ncbi.nlm.nih.gov/books/NBK557407/",
    "https://www.ncbi.nlm.nih.gov/books/NBK575732/",
    "https://www.ncbi.nlm.nih.gov/books/NBK532932/",
  ]) assert.match(review, new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(review, /source-backed review/);
  assert.match(review, /専門家による最終確認/);
  assert.match(review, /`expertReview` は既存の来歴台帳どおり pending/);
});
