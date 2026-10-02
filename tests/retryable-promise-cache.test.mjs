import {test} from 'node:test';
import assert from 'node:assert/strict';
import {retryableCachedLoad} from '../src/retryablePromiseCache.mjs';

test('concurrent views share a request and successful data remain available',async()=>{
  const cache=new Map();let calls=0;
  const load=async()=>{calls++;return {mesh:true}};
  const first=retryableCachedLoad(cache,'thalamus',load);
  assert.equal(retryableCachedLoad(cache,'thalamus',load),first);
  const result=await first;
  assert.equal(await retryableCachedLoad(cache,'thalamus',load),result);
  assert.equal(calls,1);
});

test('a failed request is fetched again without deleting successful neighbours',async()=>{
  const cache=new Map();let calls=0;
  const neighbour=retryableCachedLoad(cache,'lgn',async()=>({lgn:true}));
  const load=async()=>{if(++calls===1)throw new Error('temporary failure');return {thalamus:true}};
  await assert.rejects(retryableCachedLoad(cache,'thalamus',load),/temporary failure/);
  assert.ok(await retryableCachedLoad(cache,'thalamus',load));
  assert.equal(calls,2);assert.equal(cache.get('lgn'),neighbour);
});

test('an old failure cannot remove a replacement installed after a reset',async()=>{
  const cache=new Map();let rejectOld;
  const old=retryableCachedLoad(cache,'mesh',()=>new Promise((_,reject)=>{rejectOld=reject}));
  await Promise.resolve();cache.clear();
  const replacement=retryableCachedLoad(cache,'mesh',async()=>({new:true}));
  rejectOld(new Error('old failure'));await assert.rejects(old,/old failure/);
  assert.equal(cache.get('mesh'),replacement);assert.ok(await replacement);
});
