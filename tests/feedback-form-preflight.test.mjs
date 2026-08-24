import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {test} from "node:test";

import {
  auditFeedbackFormPreflight,
  validateFeedbackFormContract,
  validateExistingReuseSource,
  validateEmbeddedPreflightSubset,
  validatePreflightSource,
} from "../scripts/audit_feedback_form_preflight.mjs";

const root = new URL("../", import.meta.url);
const contract = JSON.parse(await readFile(new URL("feedback-form-contract.json", root), "utf8"));
const preflight = await readFile(new URL("scripts/preflight_google_feedback_form.gs", root), "utf8");

test("feedback form contract and read-only preflight pass the repository audit", () => {
  const report = auditFeedbackFormPreflight();
  assert.equal(report.ok, true, report.mismatchCodes.join("; "));
  assert.equal(report.mismatchCount, 0);
});

test("contract preserves anonymous feedback and approved branching", () => {
  assert.equal(validateFeedbackFormContract(contract).ok, true);
  assert.equal(contract.form.items.length, 20);
  assert.deepEqual(contract.form.pages.map(page => page.key), ["route", "feedback", "collaboration"]);
  assert.deepEqual(contract.form.items[0].choices.map(choice => choice.goToPage), ["feedback", "collaboration", "collaboration"]);
  assert.equal(contract.form.pages[1].navigationAfterPage, "SUBMIT");
});

test("contract validator rejects privacy, identity, upload, route, and release-label drift", () => {
  const mutated = structuredClone(contract);
  mutated.form.title = "脳実習ナビ β版フォーム";
  mutated.form.settings.collectEmail = true;
  mutated.privacy.fileUploadAllowed = true;
  mutated.form.items.find(item => item.key === "feedback.replyTo").required = true;
  mutated.form.items[0].choices[0].goToPage = "collaboration";
  const result = validateFeedbackFormContract(mutated);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /release-neutral|collectEmail|file uploads|feedback\.replyTo|branching/);
});

test("contract validator rejects private Google targets", () => {
  const mutated = structuredClone(contract);
  mutated.privateTarget = "https://docs.google.com/forms/d/example-private-id/edit";
  const result = validateFeedbackFormContract(mutated);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /private URL or identifier/);
});

test("preflight source is read-only and emits sanitized mismatch evidence", () => {
  const result = validatePreflightSource(preflight);
  assert.equal(result.ok, true, result.errors.join("; "));
  assert.match(preflight, /mismatchCodes/);
  assert.doesNotMatch(preflight, /getResponses\(|deleteResponse\(|setTitle\(|getEditUrl\(|getPublishedUrl\(/);
});

test("embedded preflight subset is derived from the machine-readable contract", () => {
  assert.equal(validateEmbeddedPreflightSubset(contract, preflight).ok, true);
  const mutated = preflight.replace("'問題点・提案内容'", "'別の問題点'");
  const result = validateEmbeddedPreflightSubset(contract, mutated);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /itemTitles differs/);
});

test("preflight validator rejects response access, mutation, and private URL output", () => {
  const unsafe = `${preflight}\nform.getResponses();\nform.setTitle('changed');\nconsole.log('https://docs.google.com/spreadsheets/d/private/edit');`;
  const result = validatePreflightSource(unsafe);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /getResponses|setTitle|private URL or identifier/);
});

test("existing-form reuse is read-only and gated by the preflight", async () => {
  const generator = await readFile(new URL("scripts/create_google_feedback_form.gs", root), "utf8");
  const result = validateExistingReuseSource(generator);
  assert.equal(result.ok, true, result.errors.join("; "));
  assert.doesNotMatch(generator, /function refreshExistingForm_/);
});

test("existing-form reuse validator rejects a hidden mutation or response read", async () => {
  const generator = await readFile(new URL("scripts/create_google_feedback_form.gs", root), "utf8");
  for (const injection of ["existingForm.setTitle('changed');", "existingForm.getResponses();"]) {
    const mutated = generator.replace("logResult_(existingForm, existingSheet, true);", `${injection}\n    logResult_(existingForm, existingSheet, true);`);
    const result = validateExistingReuseSource(mutated);
    assert.equal(result.ok, false);
  }
});

test("a partial stored target fails closed before any new form is created", async () => {
  const generator = await readFile(new URL("scripts/create_google_feedback_form.gs", root), "utf8");
  assert.equal(validateExistingReuseSource(generator).ok, true);
  for (const mutation of [
    generator.replace("if (!!savedFormId !== !!savedSheetId)", "if (false)"),
    generator.replace("throw new Error('STORED_TARGET_PARTIAL", "console.log('STORED_TARGET_PARTIAL"),
  ]) {
    const result = validateExistingReuseSource(mutation);
    assert.equal(result.ok, false);
    assert.match(result.errors.join("\n"), /partial stored target/);
  }
});
