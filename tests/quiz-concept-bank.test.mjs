import assert from "node:assert/strict";
import test from "node:test";
import {readFile} from "node:fs/promises";
import {auditQuizConceptBank,validateQuizConceptBank} from "../scripts/audit_quiz_concept_bank.mjs";

const root=new URL("..",import.meta.url);
const bank=JSON.parse(await readFile(new URL("app/quiz-concept-bank.json",root),"utf8"));
const page=await readFile(new URL("app/page.tsx",root),"utf8");
const clone=()=>structuredClone(bank);

test("quiz bank expands 45 visual targets to 100 varied questions",()=>{
  const report=auditQuizConceptBank();
  assert.equal(report.ok,true,report.errors.join("\n"));
  assert.deepEqual(report.summary,{baseQuestionCount:45,conceptQuestionCount:55,totalQuestionCount:100,uniqueVisualTargetCount:45,conceptVisualTargetCount:38,reviewState:"project-reviewed-expert-pending"});
});

test("concept questions use independent answer keys, labels, explanations, and provisional gating",()=>{
  assert.match(page,/function quizCorrectAnswer\(question:QuizQuestion\)/);
  assert.match(page,/const correct=key===quizCorrectKey/);
  assert.match(page,/quizQuestion\.optionLabels\?\.\[key\]/);
  assert.match(page,/quizQuestion\.explanation\?\?/);
  assert.match(page,/if\(isConceptQuiz\(question\)\)return true/);
});

test("concept audit rejects malformed evidence and answers",()=>{
  const duplicate=clone();duplicate.questions[1].id=duplicate.questions[0].id;assert.equal(validateQuizConceptBank(duplicate,page).ok,false);
  const absent=clone();absent.questions[0].correctAnswer="absent";assert.match(validateQuizConceptBank(absent,page).errors.join("\n"),/correctAnswer/);
  const source=clone();source.questions[0].sourceRefs=["missing"];assert.match(validateQuizConceptBank(source,page).errors.join("\n"),/unknown sourceRef/);
  const target=clone();target.questions[0].target="missing";assert.match(validateQuizConceptBank(target,page).errors.join("\n"),/unknown visual target/);
  const review=clone();review.reviewState="expert-verified";assert.match(validateQuizConceptBank(review,page).errors.join("\n"),/reviewState/);
});
