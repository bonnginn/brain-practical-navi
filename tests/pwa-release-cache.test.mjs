import assert from "node:assert/strict";
import fs from "node:fs";
import {createRequire} from "node:module";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

const source=fs.readFileSync(new URL("../build/pwa-vite-plugin.ts",import.meta.url),"utf8");
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const exports={};
vm.runInNewContext(compiled,{exports,require:createRequire(import.meta.url)});

function worker(){
  const cachesByName=new Map(),events={},requests=[];
  const key=request=>typeof request==="string"?request:request.url;
  const cacheStorage={
    async open(name){
      if(!cachesByName.has(name))cachesByName.set(name,new Map());
      const map=cachesByName.get(name);
      return {match:async request=>map.get(key(request))?.clone(),put:async(request,response)=>map.set(key(request),response.clone())};
    },
    async match(request){for(const map of cachesByName.values())if(map.has(key(request)))return map.get(key(request)).clone()},
  };
  vm.runInNewContext(exports.createServiceWorkerSource("current",["./"]),{
    URL,Response,caches:cacheStorage,
    self:{registration:{scope:"https://example.test/brain/"},addEventListener:(name,handler)=>{events[name]=handler}},
    fetch:async request=>{requests.push(key(request));return new Response("network-new")},
  });
  return {
    requests,
    seed:async(name,path,body)=>{await(await cacheStorage.open(`brain-practical-navi-${name}`)).put(`https://example.test/brain/${path}`,new Response(body))},
    async fetch(path,mode="cors"){
      let result;
      events.fetch({request:{url:`https://example.test/brain/${path}`,method:"GET",mode,headers:new Headers()},respondWith:p=>{result=p}});
      return (await result).text();
    },
  };
}

test("navigation keeps the active shell instead of combining new HTML with cached labels",async()=>{
  const sw=worker();
  await sw.seed("shell-current","","current-shell");
  assert.equal(await sw.fetch("?lang=en","navigate"),"current-shell");
  assert.equal(await sw.fetch("index.html","navigate"),"current-shell");
  assert.deepEqual(sw.requests,[]);
});

test("data reads only the active release cache, ignoring old and waiting-worker caches",async()=>{
  const sw=worker();
  await sw.seed("data-old","atlas/labels.json","old-labels");
  await sw.seed("data-waiting","atlas/labels.json","future-labels");
  await sw.seed("data-current","atlas/labels.json","current-labels");
  assert.equal(await sw.fetch("atlas/labels.json"),"current-labels");
  await sw.seed("data-old","atlas/not-yet-cached.json","old-only");
  assert.equal(await sw.fetch("atlas/not-yet-cached.json"),"network-new");
  assert.equal(await sw.fetch("atlas/not-yet-cached.json"),"network-new");
  assert.equal(sw.requests.length,1);
});

test("separate review pages are not replaced by the app shell",async()=>{
  const sw=worker();
  await sw.seed("shell-current","","app-shell");
  assert.equal(await sw.fetch("review/optic-layers/","navigate"),"network-new");
  assert.equal(sw.requests.length,1);
});
