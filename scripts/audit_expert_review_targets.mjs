import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const targets=JSON.parse(await readFile(resolve(root,"app/expert-review-targets.json"),"utf8"));
const checklist=await readFile(resolve(root,"EXPERT_REVIEW_CHECKLIST.md"),"utf8");
const page=await readFile(resolve(root,"app/page.tsx"),"utf8");
const errors=[];
const pass=(message)=>console.log(`PASS\t${message}`);

if(targets.length!==19)errors.push(`expected 19 targets, found ${targets.length}`);else pass("19 canonical review targets");
const ids=targets.map(target=>target.id);
if(new Set(ids).size!==ids.length||ids.some(id=>!/^([A-D])\d+$/.test(id)))errors.push("target IDs must be unique A1-D5 identifiers");else pass("unique review IDs");

const required=["group","title","route","direction","criterion","audit"];
for(const target of targets){
  for(const field of required)if(typeof target[field]!=="string"||!target[field].trim())errors.push(`${target.id}: missing ${field}`);
  if(!Array.isArray(target.structures)||!target.structures.length||target.structures.some(value=>typeof value!=="string"||!value.trim()))errors.push(`${target.id}: structures must be non-empty strings`);
  if(!/^#workspace\/(surface|sections|blocks)\/[a-z-]+$/.test(target.route))errors.push(`${target.id}: invalid route ${target.route}`);
  if(!checklist.includes(`| ${target.id} |`)||!checklist.includes(`\`${target.route}\``))errors.push(`${target.id}: checklist mapping is missing`);
  try{await access(resolve(root,target.audit))}catch{errors.push(`${target.id}: audit document not found: ${target.audit}`)}
}
if(!errors.some(error=>error.includes("missing")||error.includes("structures")||error.includes("invalid route")))pass("complete target fields and application routes");
if(!errors.some(error=>error.includes("checklist mapping")))pass("checklist ID and route coverage");
if(!errors.some(error=>error.includes("audit document")))pass("referenced audit documents exist");
if(!page.includes('new URLSearchParams(window.location.search).get("review")')||!page.includes('format:"brain-practical-expert-review"'))errors.push("application review mode or export format is missing");else pass("application review route and JSON export contract");
if(!page.includes("入力はこの端末の画面内だけで保持され、自動保存・送信されません"))errors.push("local-only privacy notice is missing");else pass("local-only privacy disclosure");
if(!page.includes("未書き出しの入力があります")||!page.includes("prepareReviewNavigation")||!page.includes("破棄して移動"))errors.push("unsaved review navigation guard is missing");else pass("unsaved review navigation guard");
if(!page.includes("レビュー票へ戻る")||!page.includes("観察へ"))errors.push("compact observe/review switch is missing");else pass("compact observe/review switch");

if(errors.length){for(const error of errors)console.error(`FAIL\t${error}`);process.exitCode=1}else console.log("PASS\texpert review target audit complete");
