import assert from "node:assert/strict";
import test from "node:test";
import {readFile} from "node:fs/promises";
import {auditQuizConceptBank,validateQuizConceptBank} from "../scripts/audit_quiz_concept_bank.mjs";

const root=new URL("..",import.meta.url);
const bank=JSON.parse(await readFile(new URL("app/quiz-concept-bank.json",root),"utf8"));
const page=await readFile(new URL("app/page.tsx",root),"utf8");
const clone=()=>structuredClone(bank);

test("quiz bank retains visual coverage and excludes held anatomy after expansion",()=>{
  const report=auditQuizConceptBank();
  assert.equal(report.ok,true,report.errors.join("\n"));
  assert.ok(report.summary.totalQuestionCount>=100);
  assert.equal(report.summary.uniqueVisualTargetCount,45);
  assert.ok(report.summary.conceptVisualTargetCount>=38);
  assert.equal(report.eligibility.heldVisualQuestionCount,4);
  assert.equal(report.eligibility.heldConceptQuestionCount,4);
  assert.equal(report.eligibility.eligibleQuestionCount,report.summary.totalQuestionCount-8);
});

test("audit rejects dropping the runtime anatomy hold even when authored bank is unchanged",()=>{
  const report=auditQuizConceptBank({source:page.replace('.filter(isQuizAnatomyAvailable)','')});
  assert.equal(report.ok,false);
  assert.match(report.errors.join('\n'),/runtime pool must apply anatomy hold/);
});

test("eligibility reporting preserves validation failures for malformed concept collections",()=>{
  for(const questions of [null,{},[null]]){
    const malformed=clone();malformed.questions=questions;
    assert.equal(auditQuizConceptBank({bank:malformed}).ok,false);
  }
});

test("concept questions use independent answer keys, labels, explanations, and provisional gating",()=>{
  assert.match(page,/function quizCorrectAnswer\(question:QuizQuestion\)/);
  assert.match(page,/const correct=key===quizCorrectKey/);
  assert.match(page,/quizQuestion\.optionLabels\?\.\[key\]/);
  assert.match(page,/if\(isConceptQuiz\(question\)\)return true/);
});

test("concept audit rejects malformed evidence and answers",()=>{
  const duplicate=clone();duplicate.questions[1].id=duplicate.questions[0].id;assert.equal(validateQuizConceptBank(duplicate,page).ok,false);
  const absent=clone();absent.questions[0].correctAnswer="absent";assert.match(validateQuizConceptBank(absent,page).errors.join("\n"),/correctAnswer/);
  const source=clone();source.questions[0].sourceRefs=["missing"];assert.match(validateQuizConceptBank(source,page).errors.join("\n"),/unknown sourceRef/);
  const target=clone();target.questions[0].target="missing";assert.match(validateQuizConceptBank(target,page).errors.join("\n"),/unknown visual target/);
  const review=clone();review.reviewState="expert-verified";assert.match(validateQuizConceptBank(review,page).errors.join("\n"),/reviewState/);
  const guidance=clone();const expanded=guidance.questions.find(q=>q.choiceGuidance);expanded.choiceGuidance[expanded.correctAnswer]=["答え","Answer"];
  assert.match(validateQuizConceptBank(guidance,page).errors.join("\n"),/exactly the three distractors/);
});
