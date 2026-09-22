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

function worker(options={}){
  const cachesByName=new Map(),events={},requests=[];
  const key=request=>typeof request==="string"?request:request.url;
  const cacheStorage={
    async open(name){
      if(!cachesByName.has(name))cachesByName.set(name,new Map());
      const map=cachesByName.get(name);
      return {
        match:async request=>map.get(key(request))?.clone(),put:async(request,response)=>map.set(key(request),response.clone()),
        addAll:async requestList=>{for(const request of requestList){requests.push(key(request));map.set(key(request),await options.respond(request))}},
      };
    },
    async match(request){for(const map of cachesByName.values())if(map.has(key(request)))return map.get(key(request)).clone()},
  };
  vm.runInNewContext(exports.createServiceWorkerSource("current",options.shellFiles??["./"],options.entryFiles??[]),{
    URL,Response,Request,caches:cacheStorage,
    self:{registration:{scope:"https://example.test/brain/"},addEventListener:(name,handler)=>{events[name]=handler}},
    fetch:async request=>{requests.push(key(request));return options.respond?options.respond(request):new Response("network-new")},
  });
  return {
    requests,
    cachesByName,
    install(){let result;events.install({waitUntil:promise=>{result=promise}});return result},
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

function installFixture({badModule=false,oldHtml=false}={}){
  const shellFiles=["./","./assets/main-12345678.js","./assets/english-12345678.js","./assets/main-12345678.css"];
  return worker({shellFiles,entryFiles:[shellFiles[1]],respond:request=>{
    assert.equal(request.cache,"reload");
    const path=new URL(request.url).pathname;
    if(path.endsWith("/"))return new Response(`<script src="/brain/assets/${oldHtml?"old-12345678":"main-12345678"}.js"></script>`,{headers:{"content-type":"text/html"}});
    if(path.endsWith(".css"))return new Response("body{}",{headers:{"content-type":"text/css"}});
    if(badModule&&path.includes("english"))return new Response("<html>fallback</html>",{headers:{"content-type":"text/html"}});
    return new Response("export const ready=true",{headers:{"content-type":"text/javascript"}});
  }});
}

test("install rejects HTML fallback responses in lazy modules without replacing the active shell",async()=>{
  const sw=installFixture({badModule:true});
  await sw.seed("shell-old","","old-shell");
  await assert.rejects(sw.install(),/Incomplete app release/);
  assert.ok(sw.cachesByName.has("brain-practical-navi-shell-current"));
  assert.equal(sw.cachesByName.get("brain-practical-navi-shell-old").size,1);
});

test("install rejects HTML pointing at a different entry and caches a complete valid release",async()=>{
  const old=installFixture({oldHtml:true});
  await assert.rejects(old.install(),/App shell version mismatch/);
  const valid=installFixture();
  await valid.install();
  assert.equal(valid.cachesByName.get("brain-practical-navi-shell-current").size,4);
  assert.match(await valid.fetch("assets/english-12345678.js"),/ready=true/);
  assert.equal(valid.requests.length,4);
});

test("runtime asset requests do not cache a successful HTML fallback as JavaScript",async()=>{
  const sw=worker({respond:()=>new Response("<html>fallback</html>",{headers:{"content-type":"text/html"}})});
  assert.equal(await sw.fetch("assets/uncached-12345678.js"),"");
  assert.equal(sw.cachesByName.get("brain-practical-navi-shell-current").size,0);
});
