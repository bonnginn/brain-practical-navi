import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {quizChoiceGuidance} from '../src/quizChoiceGuidance.mjs';

const bank=JSON.parse(readFileSync(new URL('../app/quiz-concept-bank.json',import.meta.url),'utf8'));
const ids=['putamen-relation-choice','hippocampus-pathway-choice','mammillary-pathway-choice','thalamus-relation-choice','capsule-relation-choice','callosum-classification-choice','optic-chiasm-function','ventricle-relation-choice','amygdala-relation-choice'];

test('each selected distractor in the priority questions explains the relevant contrast in both languages',()=>{
  for(const id of ids){
    const seed=bank.questions.find(question=>question.id===id);
    assert.ok(seed,`${id}: question exists`);
    const question={...seed,options:seed.options.map(option=>option.key)};
    assert.equal(quizChoiceGuidance(question,question.correctAnswer),null);
    for(const choice of question.options.filter(option=>option!==question.correctAnswer)){
      assert.match(quizChoiceGuidance(question,choice),/[。]/u,`${id}/${choice}: Japanese contrast`);
      assert.match(quizChoiceGuidance(question,choice,true),/[.]/u,`${id}/${choice}: English contrast`);
    }
  }
});

test('guidance never appears before answering or for an unrelated option',()=>{
  const seed=bank.questions.find(question=>question.id==='mammillary-pathway-choice');
  const question={...seed,options:seed.options.map(option=>option.key)};
  assert.equal(quizChoiceGuidance(question,null),null);
  assert.equal(quizChoiceGuidance(question,'not-an-option'),null);
  assert.equal(quizChoiceGuidance({...question,id:'other-question'},'mammillary-fornix'),null);
});
