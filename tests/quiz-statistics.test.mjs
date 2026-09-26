import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {questionMetric,sendQuizStatistic,setStatisticsConsent,statisticsConsent} from '../src/quizStatistics.mjs';
import {receiveAnswer} from '../services/quiz-statistics/worker.mjs';
const q={target:'caudate',prompt:'Find it',options:['caudate','putamen','pallidum','thalamus'],plane:'coronal',position:65};
function storage(){const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)}}
test('revision is stable under option shuffle but changes with teaching content or plane',async()=>{
  const metric=await questionMetric(q);
  assert.deepEqual(await questionMetric({...q,options:[...q.options].reverse()}),metric);
  for(const change of [{prompt:'Different'},{position:64},{correctAnswer:'putamen'}])assert.notEqual((await questionMetric({...q,...change})).revision,metric.revision);
});
test('opt-in only, no identifiers, cookies, referrer, or retries',async()=>{
  const store=storage(),calls=[];const fetcher=async(...args)=>{calls.push(args);return {ok:true}};
  assert.equal(await sendQuizStatistic(q,true,'https://example.org/answer',store,fetcher),false);
  setStatisticsConsent(store,true,'https://example.org/answer');
  assert.equal(statisticsConsent(store,'https://other.example.org/answer'),false);
  assert.equal(await sendQuizStatistic(q,true,'',store,fetcher),false);
  assert.equal(await sendQuizStatistic(q,true,'https://example.org/answer',store,fetcher),true);
  const options=calls[0][1];assert.equal(options.credentials,'omit');assert.equal(options.referrerPolicy,'no-referrer');
  assert.deepEqual(Object.keys(JSON.parse(options.body)).sort(),['correct','question','revision']);
  assert.equal(await sendQuizStatistic(q,false,'https://example.org/answer',store,async()=>{throw Error('offline')}),false);
  setStatisticsConsent(store,false,'https://example.org/answer');assert.equal(statisticsConsent(store,'https://example.org/answer'),false);assert.equal(calls.length,1);
  assert.equal(await sendQuizStatistic(q,true,'https://example.org/answer',store,fetcher),false);
});
test('withdrawal while revision is computed prevents transmission',async()=>{
  const store=storage();setStatisticsConsent(store,true,'https://example.org/answer');
  let sent=false;const pending=sendQuizStatistic(q,true,'https://example.org/answer',store,async()=>{sent=true;return {ok:true}});
  setStatisticsConsent(store,false,'https://example.org/answer');await pending;assert.equal(sent,false);
});
const row=JSON.parse(readFileSync(new URL('../services/quiz-statistics/catalog.json',import.meta.url),'utf8'))[0];
test('receiver rejects foreign origins, extra personal fields and unknown revisions before writing',async()=>{
  let writes=0;const env={ALLOWED_ORIGIN:'https://bonnginn.github.io',DB:{prepare:()=>({bind:()=>({run:async()=>{writes++}})})}};
  const send=(body,origin=env.ALLOWED_ORIGIN)=>receiveAnswer(new Request('https://example.org/answer',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)}),env);
  const body={question:row.question,revision:row.revision,correct:true};
  assert.equal((await send(body,'https://elsewhere.example')).status,403);
  assert.equal((await send({...body,email:'test@example.org'})).status,400);
  assert.equal((await send({...body,revision:'unknown'})).status,400);
  assert.equal((await send({...body,correct:'true'})).status,400);
  assert.equal((await send({...body,question:[row.question]})).status,400);
  assert.equal((await send({...body,padding:'x'.repeat(600)})).status,413);
  assert.equal(writes,0);assert.equal((await send(body)).status,204);assert.equal(writes,1);
});
test('receiver database failure is not recorded as success',async()=>{
  const env={ALLOWED_ORIGIN:'https://bonnginn.github.io',DB:{prepare:()=>{throw Error('unavailable')}}};
  const request=new Request('https://example.org/answer',{method:'POST',headers:{Origin:env.ALLOWED_ORIGIN,'Content-Type':'application/json'},body:JSON.stringify({question:row.question,revision:row.revision,correct:false})});
  assert.equal((await receiveAnswer(request,env)).status,503);
});
