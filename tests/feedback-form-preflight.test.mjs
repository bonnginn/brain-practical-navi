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
import {checkFeedbackPreflightGenerated, deriveFeedbackPreflightDescriptor} from "../scripts/generate_feedback_preflight_contract.mjs";

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
  assert.equal(contract.form.pages[1].defaultNavigation, "SUBMIT");
  assert.equal(contract.form.items.every(item => typeof item.helpText === "string"), true);
  assert.equal(contract.form.items.filter(item => item.choices).every(item => typeof item.showOtherOption === "boolean"), true);
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

test("contract validator rejects incomplete help, other-option, and page navigation fields", () => {
  const mutated = structuredClone(contract);
  delete mutated.form.items[1].helpText;
  delete mutated.form.items[2].showOtherOption;
  mutated.form.pages[1].defaultNavigation = "CONTINUE";
  const result = validateFeedbackFormContract(mutated);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /helpText|showOtherOption|branching and feedback submission/);
});

test("preflight source is read-only and emits sanitized mismatch evidence", () => {
  const result = validatePreflightSource(preflight);
  assert.equal(result.ok, true, result.errors.join("; "));
  assert.match(preflight, /mismatchCodes/);
  assert.doesNotMatch(preflight, /getResponses\(|deleteResponse\(|setTitle\(|getEditUrl\(|getPublishedUrl\(/);
  assert.match(preflight, /catch \(error\)[\s\S]*STORED_TARGET_UNAVAILABLE/);
  assert.match(preflight, /actualType === expected\.type/);
  assert.match(preflight, /expectedChoice === undefined[\s\S]*ITEM_CHOICE_EXTRA_/);
});

test("embedded full preflight descriptor is derived from the machine-readable contract", () => {
  assert.equal(validateEmbeddedPreflightSubset(contract, preflight).ok, true);
  assert.equal(checkFeedbackPreflightGenerated().matches, true);
  const mutations = [
    ["\"問題点・提案内容\"", "\"別の問題点\""],
    ["\"どこが、どのように見える／動くかを記載してください。\"", "\"help drift\""],
    ["\"改善すると分かりやすくなる\"", "\"choice drift\""],
    ["\"showOtherOption\": true", "\"showOtherOption\": false"],
    ["\"precedingDefaultNavigation\": \"SUBMIT\"", "\"precedingDefaultNavigation\": \"CONTINUE\""],
    ["\"confirmationMessage\": \"送信ありがとうございました。", "\"confirmationMessage\": \"変更しました。"],
  ];
  for (const [from, to] of mutations) {
    const mutated = preflight.replace(from, to);
    const result = validateEmbeddedPreflightSubset(contract, mutated);
    assert.equal(result.ok, false, from);
    assert.match(result.errors.join("\n"), /full descriptor differs/);
  }
});

test("derived full descriptor covers every exact comparison surface", () => {
  const descriptor = deriveFeedbackPreflightDescriptor(contract);
  assert.equal(descriptor.items.length, 20);
  assert.equal(descriptor.pageBreaks.length, 2);
  assert.equal(descriptor.items.flatMap(item => item.choices ?? []).length > 40, true);
  assert.equal(descriptor.items.filter(item => item.showOtherOption).length, 2);
  assert.equal(descriptor.description, contract.form.description);
  assert.equal(descriptor.operationsSheet.spreadsheetTitle, "脳実習ナビ｜フォーム回答・運用管理");
  for (const token of ["getConfirmationMessage(", "getHelpText(", "hasOtherOption(", "getPageNavigationType(", "getGotoPage(", "getName("]) assert.match(preflight, new RegExp(token.replace("(", "\\(")));
  assert.match(preflight, /expected\.type === 'MULTIPLE_CHOICE'[\s\S]*ITEM_NAVIGATION_[\s\S]*ITEM_DESTINATION_/);
});

test("preflight validator rejects response access, mutations, and private URL output", () => {
  for (const injection of ["form.getResponses();", "form.setTitle('changed');", "item.setHelpText('changed');", "sheet.getRange('A1').setValue('changed');", "item.showOtherOption(true);"]) {
    const result = validatePreflightSource(`${preflight}\n${injection}`);
    assert.equal(result.ok, false, injection);
  }
  const privateResult = validatePreflightSource(`${preflight}\nconsole.log('https://docs.google.com/spreadsheets/d/private/edit');`);
  assert.equal(privateResult.ok, false);
  assert.match(privateResult.errors.join("\n"), /private URL or identifier/);
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
