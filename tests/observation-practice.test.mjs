import test from 'node:test';
import assert from 'node:assert/strict';
import {sectionIdentificationAvailability,identificationUnavailableMessage,identificationReviewQuestions,hasSurfaceIdentificationQuestions} from '../src/observationPractice.mjs';
const sectionTask={key:'caudate',kind:'section',highlight:{ids:[1]}};
const tasks=[{key:'caudate',kind:'surface'},sectionTask,{key:'cn1',kind:'neurovascular'}];
const options={tasks,target:'caudate',source:'bigbrain',revisionMatches:true,findSlice:()=>0};
test('an observed structure resolves only its own section exercise, including slice zero',()=>{
  const result=sectionIdentificationAvailability(options);
  assert.equal(result.status,'available');
  assert.equal(result.task,sectionTask);
});
test('unrecorded, missing or other-family targets never borrow another exercise',()=>{
  for(const target of ['aqueductPartial','unknown','cn1',undefined]){
    const result=sectionIdentificationAvailability({...options,target});
    assert.deepEqual(result,{status:'not-recorded',task:null});
  }
});
test('a missing exercise is not presented as solvable by switching image sources',()=>{
  assert.equal(sectionIdentificationAvailability({...options,target:'aqueductPartial',source:'t1'}).status,'not-recorded');
});
test('source, data version and plane coverage gate the same available task',()=>{
  for(const [changes,status] of [
    [{source:'t1'},'wrong-source'],
    [{revisionMatches:false},'unavailable-data'],
    [{findSlice:()=>null},'unavailable-plane'],
  ]){
    const result=sectionIdentificationAvailability({...options,...changes});
    assert.equal(result.status,status);
    assert.equal(result.task,sectionTask);
  }
  assert.equal(sectionIdentificationAvailability({...options,findSlice:()=>42}).status,'available');
});
test('each unavailable state has a bilingual next step without an enabled exercise claim',()=>{
  for(const status of ['not-recorded','wrong-source','unavailable-data','unavailable-plane']){
    const ja=identificationUnavailableMessage(status),en=identificationUnavailableMessage(status,true);
    assert.ok(ja.trim()&&en.trim());
    assert.notEqual(ja,en);
  }
  assert.equal(identificationUnavailableMessage('available'),'');
});


test('identification review keeps only the exact section target and preserves the authored questions',()=>{
  const questions=[
    {target:'thalamus',category:'thalamus',questionKind:'function-choice'},
    {target:'thalamus',category:'thalamus',format:'section'},
    {target:'hippocampus',category:'limbic'},
    {target:'thalamus',category:'surface'},
    {target:'thalamus',category:'neurovascular'},
    {target:'thalamus',category:'thalamus',format:'surface'},
  ];
  const original=structuredClone(questions);
  const result=identificationReviewQuestions(questions,{kind:'section',key:'thalamus'});
  assert.deepEqual(result,[questions[0],questions[1]]);
  assert.equal(result[0],questions[0]);assert.deepEqual(questions,original);
});

test('an unrecorded section target never borrows questions from a neighbouring structure',()=>{
  const questions=[{target:'thalamus',category:'thalamus'}];
  assert.deepEqual(identificationReviewQuestions(questions,{kind:'section',key:'aqueductPartial'}),[]);
  assert.deepEqual(identificationReviewQuestions([],{kind:'section',key:'thalamus'}),[]);
});

test('surface and nerve identification do not claim this section-only review connection',()=>{
  const questions=[{target:'thalamus',category:'thalamus'}];
  for(const kind of ['surface','neurovascular'])assert.deepEqual(identificationReviewQuestions(questions,{kind,key:'thalamus'}),[]);
});

test('an existing surface question prevents an incorrect unrecorded notice without enabling section review',()=>{
  const task={kind:'surface',key:'precentral'};
  for(const question of [
    {target:'precentral',category:'surface'},
    {target:'precentral',category:'surface',format:'surface',questionKind:'function-choice'},
  ]){
    assert.equal(hasSurfaceIdentificationQuestions([question],task),true);
    assert.deepEqual(identificationReviewQuestions([question],task),[]);
  }
});

test('additional surface tasks do not borrow a neighbour question or a matching option label',()=>{
  const questions=[
    {target:'precentral',category:'surface',options:['precentral','postcentral']},
    {target:'cuneus',category:'surface',format:'surface',options:['cuneus','lingual']},
  ];
  for(const key of ['lingual','postcentral']){
    assert.equal(hasSurfaceIdentificationQuestions(questions,{kind:'surface',key}),false);
    assert.equal(hasSurfaceIdentificationQuestions([],{kind:'surface',key}),false);
  }
});

test('a same-target question in another namespace or format cannot hide a missing surface quiz',()=>{
  const task={kind:'surface',key:'postcentral'};
  const mismatches=[
    {target:'postcentral',category:'thalamus'},
    {target:'postcentral',category:'neurovascular',format:'surface'},
    {target:'postcentral',category:'surface',format:'section'},
    {target:'postcentral',category:'surface',format:'neurovascular'},
    {target:'precentral',category:'surface',format:'surface'},
  ];
  assert.equal(hasSurfaceIdentificationQuestions(mismatches,task),false);
  const recorded={target:'postcentral',category:'surface',format:'surface'};
  assert.equal(hasSurfaceIdentificationQuestions([...mismatches,recorded],task),true);
  for(const kind of ['section','neurovascular']){
    assert.equal(hasSurfaceIdentificationQuestions([recorded],{kind,key:'postcentral'}),false);
  }
});

test('surface availability respects an already filtered bank and leaves authored questions unchanged',()=>{
  const withheld=Object.freeze({id:'withheld',target:'precentral',category:'surface',format:'surface'});
  const available=Object.freeze({id:'available',target:'cuneus',category:'surface'});
  const authored=Object.freeze([withheld,available]);
  const filtered=Object.freeze(authored.filter(question=>question.id!=='withheld'));
  const original=JSON.stringify(authored),filteredOriginal=JSON.stringify(filtered);
  assert.equal(hasSurfaceIdentificationQuestions(authored,{kind:'surface',key:'precentral'}),true);
  assert.equal(hasSurfaceIdentificationQuestions(filtered,{kind:'surface',key:'precentral'}),false);
  assert.equal(hasSurfaceIdentificationQuestions(filtered,{kind:'surface',key:'cuneus'}),true);
  assert.equal(JSON.stringify(authored),original);
  assert.equal(JSON.stringify(filtered),filteredOriginal);
  assert.equal(filtered[0],available);
});
