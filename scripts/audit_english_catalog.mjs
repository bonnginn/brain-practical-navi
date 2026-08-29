import {readFile} from "node:fs/promises";
import {resolve} from "node:path";
import {pathToFileURL} from "node:url";

const defaultCatalogUrl=new URL("../app/english-catalog.json",import.meta.url);
const Japanese=/[\u3040-\u30ff\u3400-\u9fff]/u;
const forbidden=[
  /[。；，、]/u,
  /\b(?:Contact Us|optic opticsm|inner packaging|base core|base nuclear|cerebral legs|middle brain|four cerebellum|professional review|correct mask for printing|smart label|brain nerve|boxel|Dairy)\b/iu,
  /\b(?:coronary|arrow) sections?\b/iu,
  /\babdo(?:minal)?\s+(?:side|organ|diencephalon)\b/iu,
  /\b(?:pale sphere|monk muscle|chest chain|brain bow|brain beam|brain table)\b/iu,
  /\b([A-Za-z][A-Za-z'-]*)\s+\1\s+\1\b/iu,
  /\b(?:An y|andntitative|rdrd|anotherb|Unguaranteed|PCTablet|Brain Training ors|Form and ation|W problems|lateral lateralcus)\b/iu,
];
const critical={
  "視床下核":"Subthalamic nucleus",
  "黒質":"Substantia nigra",
  "視交叉":"Optic chiasm",
  "被殻":"Putamen",
  "脳梁":"Corpus callosum",
  "海馬":"Hippocampus",
  "扁桃体":"Amygdala",
  "側坐核":"Nucleus accumbens",
  "正答":"Correct answer",
  "延髄":"Medulla oblongata",
  "小脳":"Cerebellum",
};

export function auditEnglishCatalog(catalog){
  const issues=[];
  if(!catalog||Array.isArray(catalog)||typeof catalog!=="object")return ["catalog must be an object"];
  const entries=Object.entries(catalog);
  if(entries.length<1800)issues.push(`catalog coverage is too small: ${entries.length}`);
  for(const [key,value] of entries){
    if(typeof value!=="string"||!value.trim()){issues.push(`${key}: empty or non-string translation`);continue}
    if(Japanese.test(value))issues.push(`${key}: Japanese script remains in output`);
    if(value==="Home"&&key!=="ホーム")issues.push(`${key}: suspicious generic Home translation`);
    for(const pattern of forbidden)if(pattern.test(value)){issues.push(`${key}: forbidden corruption pattern ${pattern}`);break}
  }
  for(const [key,expected] of Object.entries(critical))if(catalog[key]!==expected)issues.push(`${key}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(catalog[key])}`);
  return issues;
}

export async function auditEnglishCatalogFile(url=defaultCatalogUrl){
  const catalog=JSON.parse(await readFile(url,"utf8"));
  return {entries:Object.keys(catalog).length,issues:auditEnglishCatalog(catalog)};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const result=await auditEnglishCatalogFile();
  if(result.issues.length){console.error(result.issues.join("\n"));process.exitCode=1}
  else console.log(`English catalog audit ok (${result.entries} entries)`);
}
