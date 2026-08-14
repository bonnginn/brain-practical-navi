import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const recordPath=process.argv[2];
if(!recordPath){console.error("Usage: npm run validate:expert-review -- <record.json>");process.exit(2)}
const record=JSON.parse(await readFile(resolve(process.cwd(),recordPath),"utf8"));
const targets=JSON.parse(await readFile(resolve(root,"app/expert-review-targets.json"),"utf8"));
const canonical=targets.find(target=>target.id===record?.target?.id);
const decisions=new Set(["採用可","注意書き付きで採用可","要修正","判定保留"]);
const errors=[];
const requireText=(value,label)=>{if(typeof value!=="string"||!value.trim())errors.push(`${label} is required`)};

if(record?.format!=="brain-practical-expert-review"||record?.version!==1)errors.push("unsupported format or version");
if(!canonical)errors.push("unknown target ID");
else if(record.target.route!==canonical.route||record.target.title!==canonical.title||record.target.criterion!==canonical.criterion)errors.push("target snapshot does not match the canonical registry");
if(!/^[0-9a-f]{7,40}$/i.test(record?.targetCommit??""))errors.push("targetCommit must be a 7-40 digit Git SHA");
requireText(record?.reviewer?.name,"reviewer.name");
requireText(record?.reviewer?.affiliation,"reviewer.affiliation");
requireText(record?.reviewer?.expertise,"reviewer.expertise");
if(!decisions.has(record?.decision))errors.push("decision is not allowed");
requireText(record?.reason,"reason");
if(typeof record?.reviewedAt!=="string"||Number.isNaN(Date.parse(record.reviewedAt)))errors.push("reviewedAt must be an ISO date");
if(!Array.isArray(record?.evidenceUrls))errors.push("evidenceUrls must be an array");
else for(const value of record.evidenceUrls){try{const url=new URL(value);if(url.protocol!=="http:"&&url.protocol!=="https:")throw new Error()}catch{errors.push(`invalid evidence URL: ${value}`)}}
if(typeof record?.screenshotName!=="string"||/[\\/]/.test(record.screenshotName))errors.push("screenshotName must be a filename without directories");
try{const appUrl=new URL(record?.appUrl);if(appUrl.searchParams.get("review")!==record.target.id||appUrl.hash!==record.target.route)errors.push("appUrl must identify the target review query and route")}catch{errors.push("appUrl is invalid")}
if(!Number.isFinite(record?.environment?.viewport?.width)||record.environment.viewport.width<=0||!Number.isFinite(record?.environment?.viewport?.height)||record.environment.viewport.height<=0)errors.push("viewport must contain positive width and height");

if(errors.length){for(const error of errors)console.error(`FAIL\t${error}`);process.exitCode=1}else{
  console.log(`PASS\t${record.target.id} canonical target`);
  console.log(`PASS\t${record.decision} decision at ${record.targetCommit}`);
  console.log("PASS\texpert review record is structurally valid");
}
