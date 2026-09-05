import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {quizAnswerComparison} from '../src/quizComparison.mjs';
const registry={a:{name:'A',note:'A note',relation:'A relation'},b:{name:'B',note:'B note',relation:'B relation'}};
const question={target:'a',options:['a','b']};
test('comparison and feedback use reviewed English labels',()=>{
  const catalog=JSON.parse(readFileSync(new URL('../app/english-catalog.json',import.meta.url),'utf8'));
  assert.equal(catalog['選択'],'Selected');
  assert.equal(catalog['解説と観察画面で確認'],'Review the explanation and explore the structure');
  assert.equal(catalog['あなたの選択'],'Your choice');
  assert.equal(catalog['淡蒼球の外側、島皮質の内側'],'Lateral to the globus pallidus and medial to the insular cortex');
});
test('comparison is hidden before answering, after a correct answer, and for invalid choices',()=>{
  for(const choice of [null,'','a','unknown'])assert.equal(quizAnswerComparison(question,choice,registry),null);
  assert.equal(quizAnswerComparison({...question,correctAnswer:'unknown'},'b',registry),null);
});
test('a wrong named choice reuses both existing descriptions without mutation',()=>{
  const result=quizAnswerComparison(question,'b',registry);
  assert.deepEqual(result,{expected:{key:'a',...registry.a},selected:{key:'b',...registry.b}});
  assert.equal(quizAnswerComparison({...question,questionKind:'function-to-structure'},'b',registry).selected.note,'B note');
  assert.deepEqual(registry.a,{name:'A',note:'A note',relation:'A relation'});
});
test('concept answers use correctAnswer, not the visual target, and never infer a description',()=>{
  const q={target:'visual',correctAnswer:'b',questionKind:'function-choice',options:['a','b'],optionLabels:{a:'wrong function',b:'correct function'}};
  assert.deepEqual(quizAnswerComparison(q,'a',registry),{expected:{key:'b',name:'correct function',note:null,relation:null},selected:{key:'a',name:'wrong function',note:null,relation:null}});
});
test('missing option names and prototype properties fail closed',()=>{
  assert.equal(quizAnswerComparison(question,'b',{}),null);
  assert.equal(quizAnswerComparison({target:'a',options:['a','toString']},'toString',registry),null);
});
