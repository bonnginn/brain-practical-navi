import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
export const expertReviewTargets=JSON.parse(await readFile(resolve(root,"app/expert-review-targets.json"),"utf8"));
export const expertReviewDecisions=new Set(["採用可","注意書き付きで採用可","要修正","判定保留"]);
export const publicReviewBase="https://bonnginn.github.io/brain-practical-navi/";

const shaPattern=/^[0-9a-f]{40}$/i;
const screenshotPattern=/^[^\\/]+\.(?:png|jpe?g|webp)$/i;
const privateHosts=new Set(["localhost","127.0.0.1","::1","example.invalid"]);
const requireText=(errors,value,label,minLength=1)=>{
  if(typeof value!=="string"||value.trim().length<minLength)errors.push(`${label} is required${minLength>1?` and must contain at least ${minLength} characters`:""}`);
};

export function validateExpertReviewRecord(record,{now=Date.now()}={}){
  const errors=[],warnings=[];
  const canonical=expertReviewTargets.find(target=>target.id===record?.target?.id);
  if(record?.format!=="brain-practical-expert-review"||record?.version!==2)errors.push("unsupported format or version (expected version 2)");
  if(!canonical)errors.push("unknown target ID");
  else if(typeof record.target!=="object"||Object.keys(record.target).length!==Object.keys(canonical).length||Object.keys(canonical).some(field=>JSON.stringify(record.target[field])!==JSON.stringify(canonical[field])))errors.push("target snapshot does not match the complete canonical registry entry");
  if(!shaPattern.test(record?.targetCommit??""))errors.push("targetCommit must be a full 40-digit Git SHA");
  requireText(errors,record?.reviewer?.name,"reviewer.name");
  requireText(errors,record?.reviewer?.affiliation,"reviewer.affiliation");
  requireText(errors,record?.reviewer?.expertise,"reviewer.expertise");
  if(!expertReviewDecisions.has(record?.decision))errors.push("decision is not allowed");
  requireText(errors,record?.reason,"reason",20);
  const reviewedAt=Date.parse(record?.reviewedAt);
  if(typeof record?.reviewedAt!=="string"||Number.isNaN(reviewedAt))errors.push("reviewedAt must be an ISO date");
  else if(reviewedAt>now+5*60*1000)errors.push("reviewedAt must not be in the future");
  if(!Array.isArray(record?.evidenceUrls)||record.evidenceUrls.length===0)errors.push("evidenceUrls must contain at least one public HTTPS URL");
  else for(const value of record.evidenceUrls){
    try{const url=new URL(value);if(url.protocol!=="https:"||privateHosts.has(url.hostname)||url.username||url.password)throw new Error();}
    catch{errors.push(`invalid public HTTPS evidence URL: ${value}`)}
  }
  if(typeof record?.screenshotName!=="string"||!screenshotPattern.test(record.screenshotName))errors.push("screenshotName must be an image filename without directories");
  try{
    const appUrl=new URL(record?.appUrl),base=new URL(publicReviewBase);
    if(appUrl.origin!==base.origin||appUrl.pathname!==base.pathname)errors.push(`appUrl must use the public review base ${publicReviewBase}`);
    if(appUrl.searchParams.get("review")!==record.target?.id||appUrl.searchParams.get("commit")!==record.targetCommit||appUrl.hash!==record.target?.route)errors.push("appUrl must bind the target ID, full commit, and canonical route");
  }catch{errors.push("appUrl is invalid")}
  requireText(errors,record?.environment?.userAgent,"environment.userAgent");
  if(!Number.isFinite(record?.environment?.viewport?.width)||record.environment.viewport.width<=0||!Number.isFinite(record?.environment?.viewport?.height)||record.environment.viewport.height<=0)errors.push("viewport must contain positive width and height");
  if(!Number.isFinite(record?.environment?.devicePixelRatio)||record.environment.devicePixelRatio<=0)errors.push("devicePixelRatio must be positive");
  if(record?.decision==="注意書き付きで採用可")warnings.push("confirm that the required caution is reflected in the UI and provenance ledger");
  return {canonical,errors,warnings};
}
