import { createHash } from "node:crypto";
import { readdir, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const atlas=resolve(root,"public","atlas");
const entries=await readdir(atlas,{withFileTypes:true});
const files=[];
for(const entry of entries){
  if(!entry.isFile())continue;
  const info=await stat(resolve(atlas,entry.name));
  files.push({name:entry.name,url:`atlas/${entry.name}`,bytes:info.size});
}

const isDocumentation=name=>/LICENSE|NOTICE|ATTRIBUTION|DATA-MANIFEST/.test(name);
const pick=predicate=>files.filter(file=>!isDocumentation(file.name)&&predicate(file.name));
const surface=pick(name=>/^(pial-|segment-|surface-|overlay-|neurovascular-|basal-|landmark-|ventricle\.mesh|thalamus\.mesh|hippocampus\.mesh|caudate\.mesh)/.test(name));
const sections=pick(name=>/^(bigbrain-|mni-|labels\.json|section-|segment-|ventricle\.mesh|thalamus\.mesh|hippocampus\.mesh|caudate\.mesh)/.test(name));
const blocks=pick(name=>/^(block-|specimen-blocks\.json)/.test(name));

const pack=(id,name,description,items)=>({
  id,name,description,
  bytes:items.reduce((sum,item)=>sum+item.bytes,0),
  urls:items.map(item=>item.url).sort(),
});
const packs=[
  pack("surface","脳表・3D観察","左右半球、主要な溝・領域、深部構造、脳底の血管・脳神経を保存します。",surface),
  pack("sections","連続断面・構造同定","BigBrain連続断面、固定脳MRI、分節ラベルと断面用3D構造を保存します。",sections),
  pack("blocks","局所ブロック標本","8種類の局所標本と分離表示する構造部品を保存します。",blocks),
];
const version=createHash("sha256").update(JSON.stringify(packs.map(({id,bytes,urls})=>({id,bytes,urls})))).digest("hex").slice(0,12);
const catalog={format:"brain-practical-offline-packs",version,packs};
await writeFile(resolve(root,"public","offline-packs.json"),`${JSON.stringify(catalog,null,2)}\n`,"utf8");
console.log(`Generated offline-packs.json ${version}: ${packs.map(item=>`${item.id} ${(item.bytes/1048576).toFixed(1)} MiB`).join(", ")}`);
