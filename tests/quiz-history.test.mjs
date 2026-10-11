import test from 'node:test';
import assert from 'node:assert/strict';
import {restoreQuizHistory,recordQuizAnswer} from '../src/quizHistory.mjs';
import {filterQuizCandidates} from '../src/quizGranularity.mjs';
const questions=[{target:'caudate'},{target:'caudate',id:'caudate-function'},{target:'putamen'}];
test('answering one question never clears a different question about the same structure',()=>{
  const missed=recordQuizAnswer([],questions[1],false);
  assert.deepEqual(recordQuizAnswer(missed,questions[0],true),['caudate-function']);
  assert.deepEqual(recordQuizAnswer(missed,questions[1],true),[]);
  assert.deepEqual(recordQuizAnswer(missed,questions[1],false),missed);
});
test('legacy target history conservatively migrates all variants; explicit empty v2 stays empty',()=>{
  assert.deepEqual(restoreQuizHistory(null,'["caudate","unknown"]',questions),['caudate','caudate-function']);
  assert.deepEqual(restoreQuizHistory('[]','["caudate"]',questions),[]);
  assert.deepEqual(restoreQuizHistory('["caudate-function","unknown","caudate-function"]',null,questions),['caudate-function','unknown']);
  assert.throws(()=>restoreQuizHistory('{',null,questions));
});
test('wrong-only candidates and counts use question identity',()=>{
  const filters={category:'all',format:'all',detail:'all',includeProvisional:true,wrongOnly:true};
  assert.deepEqual(filterQuizCandidates(questions,filters,['caudate-function']),[questions[1]]);
});

test('held question history survives reload, unrelated answers, and hold release',()=>{
 const bank=[{target:'available'},{target:'held'},{target:'held',id:'held-concept'}],eligible=[bank[0]];
 const original=['held','held-concept','available'];
 const reloaded=restoreQuizHistory(JSON.stringify(original),null,eligible);
 assert.deepEqual(reloaded,original);
 const answered=recordQuizAnswer(reloaded,eligible[0],true);
 const released=restoreQuizHistory(JSON.stringify(answered),null,bank);
 assert.deepEqual(released,['held','held-concept']);
 assert.deepEqual(filterQuizCandidates(eligible,{category:'all',format:'all',detail:'all',includeProvisional:true,wrongOnly:true},released),[]);
 assert.deepEqual(filterQuizCandidates(bank,{category:'all',format:'all',detail:'all',includeProvisional:true,wrongOnly:true},released),bank.slice(1));
 assert.deepEqual(restoreQuizHistory(null,'["held"]',bank),['held','held-concept']);
 assert.throws(()=>restoreQuizHistory('{}',null,bank));
});
