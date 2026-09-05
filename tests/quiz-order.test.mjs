import test from 'node:test';
import assert from 'node:assert/strict';
import {balancedQuizOrder} from '../src/quizOrder.mjs';
import {filterQuizCandidates} from '../src/quizGranularity.mjs';
test('mixes topics and defers repeated structures without losing or mutating questions',()=>{
  const source=[{target:'a',category:'x'},{target:'a',category:'x',id:'a2'},{target:'b',category:'x'},{target:'c',category:'y'},{target:'d',category:'z'}];
  const original=JSON.stringify(source),ordered=balancedQuizOrder(source);
  assert.equal(JSON.stringify(source),original);
  assert.equal(new Set(ordered).size,source.length);
  assert.deepEqual(ordered.slice(0,3).map(q=>q.category),['x','y','z']);
  assert.equal(new Set(ordered.slice(0,4).map(q=>q.target)).size,4);
  for(let i=1;i<ordered.length;i++)assert.notEqual(ordered[i].target,ordered[i-1].target);
  assert.deepEqual(balancedQuizOrder([]),[]);
  assert.equal(balancedQuizOrder([source[0],source[1]]).length,2);
});
test('question-kind selection composes with topic and wrong-only filters',()=>{
  const a={target:'a',category:'x'},b={...a,id:'function-a',questionKind:'function-choice'};
  const filters={category:'all',format:'all',detail:'all',includeProvisional:true,wrongOnly:false};
  assert.deepEqual(filterQuizCandidates([a,b],{...filters,kind:'identification'},[]),[a]);
  assert.deepEqual(filterQuizCandidates([a,b],{...filters,kind:'function-choice',wrongOnly:true},['function-a']),[b]);
  assert.deepEqual(filterQuizCandidates([a,b],{...filters,kind:'function-choice',category:'y'},[]),[]);
});
