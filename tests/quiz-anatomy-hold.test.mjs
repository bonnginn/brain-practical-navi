import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isQuizAnatomyAvailable,quizAnatomyHoldSummary} from '../src/quizAnatomyHold.mjs';
const page=readFileSync(new URL('../app/page.tsx',import.meta.url),'utf8');
const bank=JSON.parse(readFileSync(new URL('../app/quiz-concept-bank.json',import.meta.url),'utf8'));
const catalog=JSON.parse(readFileSync(new URL('../app/english-catalog.json',import.meta.url),'utf8'));
test('all image-dependent forms of the four misplaced nerves are held',()=>{
  for(const target of ['cn5','cn9','cn10','cn11'])for(const questionKind of ['identification','function-choice','location-choice'])
    assert.equal(isQuizAnatomyAvailable({target,questionKind}),false);
  for(const target of ['cn8','cn12','caudate','ica'])assert.equal(isQuizAnatomyAvailable({target}),true);
});
test('every held nerve retains bilingual scope and hold disclosure while its model is displayed',()=>{
 for(const target of ['cn5','cn9','cn10','cn11']){
  const note=page.match(new RegExp(`${target}:\\{name:[^\\n]+note:"([^"]+)"`))?.[1];
  assert.ok(note,target);
  assert.match(note,/表示上の打ち切り/);
  assert.match(note,/関連クイズは表示確認中のため保留しています/);
  assert.match(catalog[note],/display cutoff/);
  assert.match(catalog[note],/Related quiz(?: questions|zes) remain withheld (?:while display visibility is checked|pending display review)/);
 }
});
test('the eight authored questions remain stored, but the combined runtime pool is filtered',()=>{
  const visualSection=page.slice(page.indexOf('const neurovascularQuizQuestions:'),page.indexOf('const visualQuizQuestions:'));
  const targets=[...visualSection.matchAll(/target:"([^"]+)"/g)].map(match=>({target:match[1]}));
  assert.equal(targets.filter(q=>!isQuizAnatomyAvailable(q)).length,4);
  assert.equal(bank.questions.filter(q=>!isQuizAnatomyAvailable(q)).length,4);
  assert.match(page,/const allQuizQuestions:QuizQuestion\[\]=\[\.\.\.visualQuizQuestions,\.\.\.conceptQuizQuestions\]\.filter\(isQuizAnatomyAvailable\)/);
  assert.match(page,/quizQuestionsForFiltering:QuizQuestionWithGranularity\[\]=allQuizQuestions\.map/);
  assert.match(page,/data-quiz-anatomy-hold="cn5,cn9,cn10,cn11"/);
  assert.match(quizAnatomyHoldSummary(),/8問.*V・IX〜XI.*短い表示区間または一部分.*区別できるか確認中/);
  assert.match(quizAnatomyHoldSummary(true),/Eight questions.*V and IX–XI.*short or partial displayed segments.*visible and distinguishable/);
});
