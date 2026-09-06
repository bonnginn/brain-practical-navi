import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { isPhoneCapability, phoneCapabilityFromMedia, phoneUiOverride } from "../src/mobileUi.mjs";

const root = new URL("../", import.meta.url);
const [page, css, globals] = await Promise.all([
  readFile(new URL("app/page.tsx", root), "utf8"),
  readFile(new URL("app/canvas.css", root), "utf8"),
  readFile(new URL("app/globals.css", root), "utf8"),
]);

test("phone capability requires narrow width and touch-first media", () => {
  assert.equal(isPhoneCapability({width: 760, hover: "none", pointer: "coarse"}), true);
  assert.equal(isPhoneCapability({width: 761, hover: "none", pointer: "coarse"}), false);
  assert.equal(isPhoneCapability({width: 760, hover: "hover", pointer: "coarse"}), false);
  assert.equal(isPhoneCapability({width: 760, hover: "none", pointer: "fine"}), false);
  assert.equal(isPhoneCapability({width: 390, hover: "none", pointer: "coarse"}), true);
  assert.equal(phoneCapabilityFromMedia({width: 390, hoverMatches: true, pointerMatches: true}), true);
  assert.equal(phoneCapabilityFromMedia({width: 390, hoverMatches: false, pointerMatches: true}), false);
});

test("QR entry can explicitly select phone or desktop learner UI", () => {
  assert.equal(phoneUiOverride("?ui=phone"), true);
  assert.equal(phoneUiOverride("?ui=desktop"), false);
  assert.equal(phoneUiOverride("?ui=unknown"), null);
  assert.equal(phoneUiOverride(""), null);
  assert.match(page, /const override=phoneUiOverride\(window\.location\.search\)/);
  assert.match(page, /override\?\?phoneCapabilityFromMedia/);
});

test("phone navigation is a five-destination student dock and hides editing entry", () => {
  assert.match(page, /phoneDock/);
  assert.match(page, /workspaceModes\.map\(item=>.*phoneDock/s);
  assert.match(page, /className="phoneRailToggle"/);
  assert.match(page, /phoneMode\?"phone-mode":""/);
  assert.match(page, /phoneSegmentGuard/);
  assert.match(page, /編集ツールはPCで利用/);
  assert.match(page, /phoneMode\?<div className="phoneSegmentGuard"/);
  assert.match(page, /<ManualSegmentationWorkbench\/>/);
  assert.match(page, /const ManualSegmentationWorkbench=lazy\(\(\)=>import\("\.\/ManualSegmentationWorkbench"\)/);
  assert.match(page, /編集ツールを読み込み中…[\s\S]*<ManualSegmentationWorkbench\/>/);
  assert.match(page, /className="segmentationEntry"/);
  assert.match(css, /\.phone-mode \.segmentationEntry\{display:none\}/);
});

test("the settings sheet keeps one existing rail subtree and restores interaction state", () => {
  assert.equal((page.match(/className=\{`leftRail rail-/g) ?? []).length, 1);
  assert.match(page, /<dialog ref=\{phoneSettingsDialogRef\} id="phone-settings-panel"/);
  assert.match(page, /aria-controls="phone-settings-panel"/);
  assert.match(page, /setPhoneSettingsOpen\(false\)/);
  assert.match(page, /dialog\.showModal\(\)/);
  assert.match(page, /dialog\.close\(\)/);
  assert.match(page, /onCancel=\{event=>/);
  assert.match(page, /role=\{phoneMode\?"dialog":"presentation"\}/);
  assert.doesNotMatch(page, /<dialog[^>]*aria-modal="true"/);
  assert.match(page, /document\.documentElement\.style\.overflow="hidden"/);
  assert.match(page, /document\.body\.style\.overflow="hidden"/);
  assert.match(page, /document\.documentElement\.style\.overflow=previousHtmlOverflow/);
  assert.match(page, /document\.body\.style\.overflow=previousBodyOverflow/);
  assert.match(page, /phoneSettingsReturnFocus\.current/);
  assert.match(page, /event\.target===event\.currentTarget.*closePhoneSettings/s);
  assert.match(page, /window\.addEventListener\("popstate",restore\)/);
  assert.match(css, /\.phoneSettingsSheet \.leftRail>\.eyebrow\{display:block\}/);
  assert.match(css, /\.phoneSettingsSheet \.leftRail \.railLine\{display:block\}/);
  assert.match(css, /\.phoneSettingsSheet \.leftRail \.structureGroupGrid\{display:grid\}/);
  assert.match(css, /\.phoneSettingsSheet \.leftRail \.structureBtn\{display:flex\}/);
  assert.match(css, /\.phoneSettingsSheet \.leftRail \.clearStructures\{display:block\}/);
  assert.match(css, /\.phoneSettingsSheet \.leftRail \.bookNotice\{display:block\}/);
});

test("phone CSS provides safe-area dock, 44px controls, and touch-friendly scrolling", () => {
  assert.match(css, /@media screen\{[\s\S]*\.phone-mode \.phoneDock\{/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /top:calc\(58px \+ env\(safe-area-inset-top\)\)/);
  assert.match(css, /\.phoneDock>div\{display:grid;grid-template-columns:repeat\(5/);
  assert.match(css, /\.phoneDock button\{[^}]*min-height:44px/);
  assert.match(css, /\.phoneSettingsSheet \.leftRail\{[^}]*overflow-y:auto/);
  assert.match(css, /\.phone-mode \.phoneSettingsSheet \.leftRail button,\.phone-mode \.phoneSettingsSheet \.leftRail select\{min-height:44px/);
  assert.match(css, /\.phone-mode \.quizImageCard\{height:clamp/);
  assert.match(css, /\.phone-mode \.sliceStage\{min-height:610px/);
  assert.match(css, /\.phoneSettingsSheet:not\(\[open\]\)\{display:none\}/);
});

test("automatic phone detection stays touch-gated; explicit UI mode owns all phone chrome", () => {
  assert.match(css, /@media\(max-width:760px\)\{/);
  assert.match(globals, /@media\(max-width:760px\)\{/);
  assert.doesNotMatch(css, /@media\(max-width:760px\) and \(hover:none\) and \(pointer:coarse\)/);
  const phoneRules=css.slice(css.indexOf("@media screen{"));
  for(const line of phoneRules.split(/\r?\n/)){
    if(!line.trimStart().startsWith(".phone"))continue;
    for(const selector of line.slice(0,line.indexOf("{")).split(","))assert.match(selector.trim(),/^\.phone-mode(?:[ .]|$)/);
  }
  assert.match(page, /phoneCapabilityFromMedia/);
  assert.match(page, /pointer: coarse/);
  assert.match(page, /hover: none/);
  assert.match(page, /const widthQuery=window\.matchMedia\("\(max-width: 760px\)"\)/);
  assert.match(page, /const hoverQuery=window\.matchMedia\("\(hover: none\)"\)/);
  assert.match(page, /const pointerQuery=window\.matchMedia\("\(pointer: coarse\)"\)/);
  assert.match(page, /addEventListener\("change",update\)/);
  assert.match(page, /removeEventListener\("change",update\)/);
  assert.match(page, /workspace==="segment"[\s\S]*ManualSegmentationWorkbench/);
});
