import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {test} from "node:test";

const root = new URL("../", import.meta.url);
const page = await readFile(new URL("app/page.tsx", root), "utf8");
const envExample = await readFile(new URL(".env.example", root), "utf8");
const generator = await readFile(new URL("scripts/create_google_feedback_form_en.gs", root), "utf8");
const readme = await readFile(new URL("README.md", root), "utf8");

test("English feedback uses a separate responder URL and never falls back to Japanese", () => {
  assert.match(envExample, /^VITE_FEEDBACK_FORM_URL_EN=$/m);
  assert.match(page, /VITE_FEEDBACK_FORM_URL_EN/);
  assert.match(page, /englishEdition\?feedbackFormUrlEn:feedbackFormUrlJa/);
  assert.doesNotMatch(page, /feedbackFormUrlEn\s*\|\|\s*feedbackFormUrlJa/);
});

test("English form is anonymous, feedback-only, and contains no upload or collaboration route", () => {
  assert.match(generator, /setCollectEmail\(false\)/);
  assert.match(generator, /setLimitOneResponsePerUser\(false\)/);
  assert.match(generator, /Reply contact \(optional\)/);
  assert.match(generator, /identifying information, specimen photographs/);
  assert.doesNotMatch(generator, /addFileUploadItem|addPageBreakItem|createChoice\(/);
  assert.doesNotMatch(generator, /collaborator recruitment|GitHub username|affiliation/i);
});

test("English generator stores distinct targets and exposes only responder URL to the app", () => {
  assert.match(generator, /BRAIN_PRACTICAL_EN_FORM_ID/);
  assert.match(generator, /BRAIN_PRACTICAL_EN_SHEET_ID/);
  assert.match(generator, /RESPONDER_URL=/);
  assert.match(generator, /VITE_FEEDBACK_FORM_URL_EN/);
});

test("README stays synchronized with the English safety hold, quiz total, and form split", () => {
  assert.match(readme, /English edition safety notice/);
  assert.match(readme, /全100問/);
  assert.match(readme, /VITE_FEEDBACK_FORM_URL_EN/);
  assert.match(readme, /create_google_feedback_form_en\.gs/);
});
