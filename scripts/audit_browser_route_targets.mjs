import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const [catalog,page]=await Promise.all([
  readFile(resolve(root,"app","browser-route-targets.json"),"utf8").then(JSON.parse),
  readFile(resolve(root,"app","page.tsx"),"utf8"),
]);
const errors=[];
const extractArray=name=>{
  const match=page.match(new RegExp(`const ${name}:[^=]+\\=\\[([^\\]]+)\\]`));
  return match?[...match[1].matchAll(/"([^"]+)"/g)].map(item=>item[1]):[];
};
const surface=extractArray("surfaceViewKeys").map(key=>key==="cranialNerves"?"nerves":key);
const sections=extractArray("planeKeys");
const blocks=extractArray("blockSpecimenKeys");
const overlayType=page.match(/type OverlayMode = ([^;]+);/)?.[1]??"";
const overlays=[...overlayType.matchAll(/"([^"]+)"/g)].map(item=>item[1]);
const expectedHashes=new Set([
  "#workspace/home",
  ...surface.map(key=>`#workspace/surface/${key}`),
  ...sections.map(key=>`#workspace/sections/${key}`),
  ...blocks.map(key=>`#workspace/blocks/${key}`),
  "#workspace/quiz",
  "#workspace/segment",
  ...overlays.map(key=>`#workspace/${key}`),
]);

if(catalog?.format!=="brain-practical-browser-route-targets"||catalog?.schemaVersion!==1||!Array.isArray(catalog?.routes)||!Array.isArray(catalog?.extendedProtocols))errors.push("unsupported browser route catalog format/schemaVersion");
const routes=Array.isArray(catalog?.routes)?catalog.routes:[];
const ids=routes.map(route=>route?.id),hashes=routes.map(route=>route?.hash);
if(new Set(ids).size!==ids.length)errors.push("route ids must be unique");
if(new Set(hashes).size!==hashes.length)errors.push("route hashes must be unique");
const actualHashes=new Set(hashes);
for(const hash of expectedHashes)if(!actualHashes.has(hash))errors.push(`missing route target: ${hash}`);
for(const hash of actualHashes)if(!expectedHashes.has(hash))errors.push(`unknown route target: ${hash}`);
const expectedGroups={home:1,surface:7,sections:3,blocks:8,quiz:1,segment:1,overlay:5};
for(const [group,count] of Object.entries(expectedGroups)){
  const actual=routes.filter(route=>route?.group===group).length;
  if(actual!==count)errors.push(`${group}: expected ${count} routes, found ${actual}`);
}
for(const route of routes){
  if(typeof route?.id!=="string"||!route.id)errors.push("every route needs an id");
  if(typeof route?.title!=="string"||!route.title)errors.push(`${route?.id??"unknown"}: title is required`);
  if(!/^#workspace\/[a-z-]+(?:\/[a-z-]+)?$/.test(route?.hash??""))errors.push(`${route?.id??"unknown"}: invalid hash`);
  const range=route?.expectedCanvas;
  if(!Number.isInteger(range?.min)||!Number.isInteger(range?.max)||range.min<0||range.max<range.min)errors.push(`${route?.id??"unknown"}: invalid expectedCanvas range`);
  if(route?.group==="blocks"&&route?.prerequisite!=="prototype-warning")errors.push(`${route.id}: block routes must record the prototype warning prerequisite`);
  if(route?.group!=="blocks"&&route?.prerequisite!==undefined)errors.push(`${route.id}: only block routes may declare a prerequisite`);
}
if(routes.length!==26)errors.push(`expected 26 core browser routes, found ${routes.length}`);
if(catalog.extendedProtocols.length!==2)errors.push("expected M2 and expert-review extended protocols");
if(!catalog.extendedProtocols.some(protocol=>protocol?.query==="?m2=compare"&&protocol?.hash==="#workspace/blocks/hindbrain"))errors.push("M2 comparison protocol is missing");
if(!catalog.extendedProtocols.some(protocol=>protocol?.query?.includes("<40-char-SHA>")&&protocol?.hash==="<target-route>"))errors.push("expert-review protocol is missing its commit-pinned template");

if(errors.length){for(const error of errors)console.error(`FAIL\t${error}`);process.exitCode=1}else{
  console.log(`PASS\textended browser protocols: ${catalog.extendedProtocols.map(protocol=>protocol.id).join(", ")}`);
  console.log(`PASS\tbrowser routes: ${routes.length} core routes; ${surface.length} surface, ${sections.length} section, ${blocks.length} gated specimen, ${overlays.length} overlay; extended ${catalog.extendedProtocols.length}`);
}
