import assert from "node:assert/strict";
import test from "node:test";
import {createDownloadProgressTracker,formatDownloadBytes} from "../src/downloadProgress.mjs";

test("reports measured bytes and integer percent only when every total is known",()=>{
  const tracker=createDownloadProgressTracker();
  const a=tracker.begin("a"),b=tracker.begin("b");
  tracker.setTotal("a",100,a);tracker.update("a",30,a);
  assert.equal(tracker.snapshot().percent,null);
  tracker.setTotal("b",300,b);tracker.update("b",70,b);
  assert.deepEqual(tracker.snapshot(),{phase:"downloading",loaded:100,total:400,percent:25,resourceCount:2});
});

test("keeps unknown-length downloads indeterminate without inventing a total",()=>{
  const tracker=createDownloadProgressTracker();
  const token=tracker.begin("unknown");tracker.setTotal("unknown",NaN,token);tracker.update("unknown",8192,token);
  assert.deepEqual(tracker.snapshot(),{phase:"downloading",loaded:8192,total:null,percent:null,resourceCount:1});
});

test("never lets a resource move backwards and distinguishes processing",()=>{
  const tracker=createDownloadProgressTracker();
  const token=tracker.begin("asset");tracker.setTotal("asset",100,token);tracker.update("asset",80,token);tracker.update("asset",20,token);
  assert.equal(tracker.snapshot().loaded,80);
  tracker.processing("asset",token);
  assert.deepEqual(tracker.snapshot(),{phase:"processing",loaded:100,total:100,percent:100,resourceCount:1});
  tracker.complete("asset",token);
  assert.equal(tracker.snapshot().phase,"idle");
});

test("reset starts a retry attempt without stale bytes",()=>{
  const tracker=createDownloadProgressTracker();
  const first=tracker.begin("asset");tracker.setTotal("asset",100,first);tracker.update("asset",60,first);tracker.fail("asset",first);
  tracker.reset();
  assert.deepEqual(tracker.snapshot(),{phase:"idle",loaded:0,total:null,percent:null,resourceCount:0});
  const second=tracker.begin("asset");tracker.setTotal("asset",200,second);tracker.update("asset",10,second);
  assert.equal(tracker.snapshot().percent,5);
  tracker.update("asset",190,first);
  assert.equal(tracker.snapshot().percent,5,"stale attempt cannot overwrite retry progress");
});

test("subscribers receive the current state immediately and can unsubscribe",()=>{
  const tracker=createDownloadProgressTracker(),seen=[];
  const unsubscribe=tracker.subscribe(value=>seen.push(value.phase));
  const token=tracker.begin("asset");unsubscribe();tracker.processing("asset",token);
  assert.deepEqual(seen,["idle","downloading"]);
});

test("formats compact byte counts for the loading overlay",()=>{
  assert.equal(formatDownloadBytes(512),"512 B");
  assert.equal(formatDownloadBytes(2048),"2.0 KB");
  assert.equal(formatDownloadBytes(12*1024),"12 KB");
  assert.equal(formatDownloadBytes(3*1024*1024),"3.0 MB");
  assert.equal(formatDownloadBytes(12*1024*1024),"12 MB");
});
