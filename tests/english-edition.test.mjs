import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { languageSwitchUrl, localeFromSearch, localizedPublicUrl, publicWorkspaceForLocale } from "../src/locale.mjs";

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

test("reviewed English catalog is enabled without the former safety hold",()=>{
  const page=fs.readFileSync(new URL("../app/page.tsx",import.meta.url),"utf8");
  const localization=fs.readFileSync(new URL("../app/EnglishLocalization.tsx",import.meta.url),"utf8");
  assert.doesNotMatch(page,/englishSafetyHold|Translation quality review in progress/);
  assert.match(page,/const EnglishLocalization=lazy\(\(\)=>import\("\.\/EnglishLocalization"\)/);
  assert.match(page,/<Suspense fallback=\{null\}><EnglishLocalization enabled=\{englishEdition\}\/><\/Suspense>/);
  assert.match(localization,/key\.length>=2/);
});
