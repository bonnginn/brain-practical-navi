import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {questionMetric,readQuizStatistics,sendQuizStatistic} from '../src/quizStatistics.mjs';
import {receiveAnswer} from '../services/quiz-statistics/worker.mjs';

const q={target:'caudate',prompt:'Find it',options:['caudate','putamen','pallidum','thalamus'],plane:'coronal',position:65};
const row=JSON.parse(readFileSync(new URL('../services/quiz-statistics/catalog.json',import.meta.url),'utf8'))[0];
const origin='https://bonnginn.github.io';
function request(path,method='GET',body,from=origin){return new Request(`https://stats.example.org${path}`,{method,headers:{Origin:from,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})})}

test('revision is stable under option shuffle but changes with teaching content or plane',async()=>{
  const metric=await questionMetric(q);
  assert.deepEqual(await questionMetric({...q,options:[...q.options].reverse()}),metric);
  for(const change of [{prompt:'Different'},{position:64},{correctAnswer:'putamen'}])assert.notEqual((await questionMetric({...q,...change})).revision,metric.revision);
});

test('answer sends only the selected option and no learner identifier',async()=>{
  const calls=[],fetcher=async(...args)=>{calls.push(args);return {ok:true}};
  assert.equal(await sendQuizStatistic(q,'wrong','https://example.org/answer',fetcher),false);
  assert.equal(await sendQuizStatistic(q,'caudate','',fetcher),false);
  assert.equal(await sendQuizStatistic(q,'putamen','https://example.org/answer',fetcher),true);
  const options=calls[0][1];
  assert.equal(options.credentials,'omit');assert.equal(options.referrerPolicy,'no-referrer');
  assert.deepEqual(Object.keys(JSON.parse(options.body)).sort(),['choice','question','revision']);
  assert.equal(JSON.parse(options.body).choice,'putamen');
  assert.equal(await sendQuizStatistic(q,'caudate','https://example.org/answer',async()=>{throw Error('offline')}),false);
  assert.equal(calls.length,1);
});

test('receiver counts choices, returns all question totals, and rejects extra fields or unknown choices',async()=>{
  const counts=new Map();let writes=0;
  const env={ALLOWED_ORIGIN:origin,DB:{prepare:statement=>({
    bind:(question,revision,choice)=>({run:async()=>{writes++;const key=`${question}:${revision}:${choice}`;counts.set(key,(counts.get(key)??0)+1)}}),
    all:async()=>({results:[...counts].map(([key,answers])=>{const [question,revision,choice]=key.split(':');return {question,revision,choice,answers}})})
  })}};
  const body={question:row.question,revision:row.revision,choice:row.options[0]};
  assert.equal((await receiveAnswer(request('/answer','POST',body,'https://elsewhere.example'),env)).status,403);
  assert.equal((await receiveAnswer(request('/answer','POST',{...body,email:'test@example.org'}),env)).status,400);
  assert.equal((await receiveAnswer(request('/answer','POST',{...body,revision:'unknown'}),env)).status,400);
  assert.equal((await receiveAnswer(request('/answer','POST',{...body,choice:'unknown'}),env)).status,400);
  assert.equal((await receiveAnswer(request('/answer','POST',{...body,padding:'x'.repeat(600)}),env)).status,413);
  assert.equal(writes,0);
  for(const choice of [row.options[0],row.options[1],row.options[0]])assert.equal((await receiveAnswer(request('/answer','POST',{...body,choice}),env)).status,204);
  assert.equal(writes,3);
  const result=await receiveAnswer(request('/results'),env);
  assert.equal(result.status,200);
  const totals=await result.json();assert.equal(totals.length,2);
  assert.equal(totals.find(item=>item.choice===row.options[0]).answers,2);
  assert.equal(totals.find(item=>item.choice===row.options[1]).answers,1);
  assert.equal((await receiveAnswer(request('/results','GET',undefined,'https://elsewhere.example'),env)).status,403);
});

test('read uses public totals without credentials and handles receiver failure',async()=>{
  const fetcher=async(url,options)=>{assert.equal(url,'https://example.org/results');assert.equal(options.credentials,'omit');return {ok:true,json:async()=>[{question:'q',revision:'r',choice:'a',answers:2}]}};
  assert.equal((await readQuizStatistics('https://example.org/answer',fetcher))[0].answers,2);
  assert.equal(await readQuizStatistics('',fetcher),null);
  assert.equal(await readQuizStatistics('https://example.org/answer',async()=>{throw Error('offline')}),null);
});
