import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { anatomyDisplayEnglish } from "../src/anatomyDisplayEnglish.mjs";
import { languageSwitchUrl, localeFromSearch, localizedPublicUrl, publicWorkspaceForLocale } from "../src/locale.mjs";

test("section text and playback action retain their intended meaning",()=>{
  const catalog=JSON.parse(fs.readFileSync(new URL("../app/english-catalog.json",import.meta.url),"utf8"));
  assert.equal(catalog["連続断面を再生"],"Play serial sections");
  assert.match(catalog["側脳室に沿って前後へ連続する核です。断面を移動して頭・体・尾の位置変化を追います。"],/^The caudate nucleus follows/);
});

test("English locale is explicit and Japanese remains the default",()=>{
  assert.equal(localeFromSearch("?lang=en&ui=phone"),"en");
  assert.equal(localeFromSearch("?ui=desktop"),"ja");
  assert.equal(languageSwitchUrl("https://example.test/app/?ui=phone#workspace/quiz","en"),"/app/?ui=phone&lang=en#workspace/quiz");
  assert.equal(languageSwitchUrl("https://example.test/app/?ui=phone&lang=en#workspace/quiz","ja"),"/app/?ui=phone#workspace/quiz");
});

test("English edition excludes contributor-only workspaces",()=>{
  assert.equal(publicWorkspaceForLocale("collaborate","en"),"home");
  assert.equal(publicWorkspaceForLocale("segment","en"),"home");
  assert.equal(publicWorkspaceForLocale("quiz","en"),"quiz");
  assert.equal(publicWorkspaceForLocale("collaborate","ja"),"collaborate");
});

test("English QR destinations retain locale and UI mode",()=>{
  assert.equal(localizedPublicUrl("https://example.test/app/","desktop","en"),"https://example.test/app/?ui=desktop&lang=en#workspace/home");
  assert.equal(localizedPublicUrl("https://example.test/app/","phone","ja"),"https://example.test/app/?ui=phone#workspace/home");
});

test("English catalog contains reviewed anatomy and no Japanese output",()=>{
  const catalog=JSON.parse(fs.readFileSync(new URL("../app/english-catalog.json",import.meta.url),"utf8"));
  assert.ok(Object.keys(catalog).length>1800);
  for(const value of Object.values(catalog))assert.doesNotMatch(value,/[\u3040-\u30ff\u3400-\u9fff]/u);
  assert.match(catalog["視床下核"]??"",/Subthalamic nucleus/i);
});

test("learner anatomy names agree with their English display term",()=>{
  const catalog=JSON.parse(fs.readFileSync(new URL("../app/english-catalog.json",import.meta.url),"utf8"));
  const page=fs.readFileSync(new URL("../app/page.tsx",import.meta.url),"utf8");
  const pairs=[...page.matchAll(/name:"([^"]+)",latin:"([^"]+)"/gu)];
  assert.ok(pairs.length>80);
  const representativeNames=new Set(["III 動眼神経","XII 舌下神経","帯状回","眼窩前頭皮質","頭頂後頭溝","内包","黒質"]);
  for(const [,name,sourceTerm] of pairs.filter(([,name])=>representativeNames.has(name))){
    const expected=anatomyDisplayEnglish(sourceTerm);
    assert.ok(catalog[name]===expected||catalog[name]?.startsWith(`${expected} (`)||catalog[name]?.endsWith(` · ${expected}`),`${name} must use the reviewed English display term for ${sourceTerm}`);
  }
  assert.equal(representativeNames.size,7);
});

test("reviewed English catalog is enabled without the former safety hold",()=>{
  const page=fs.readFileSync(new URL("../app/page.tsx",import.meta.url),"utf8");
  const localization=fs.readFileSync(new URL("../app/EnglishLocalization.tsx",import.meta.url),"utf8");
  assert.doesNotMatch(page,/englishSafetyHold|Translation quality review in progress/);
  assert.match(page,/const EnglishLocalization=lazy\(\(\)=>import\("\.\/EnglishLocalization"\)/);
  assert.match(page,/\{englishEdition&&<Suspense fallback=\{null\}><EnglishLocalization enabled\/><\/Suspense>\}/);
  assert.match(localization,/key\.length>=2/);
  assert.match(localization,/"aria-label","title","placeholder","alt"/);
  const css=fs.readFileSync(new URL("../app/canvas.css",import.meta.url),"utf8");
  assert.match(css,/html\[lang="en"\] \.quizOptions button span small/);
});
