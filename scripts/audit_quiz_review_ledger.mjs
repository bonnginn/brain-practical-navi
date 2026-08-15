import { readFile, readdir, stat } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { expertReviewTargets, validateExpertReviewRecord } from "./expert_review_validation.mjs";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const requested=process.argv.slice(2).filter(argument=>argument!=="--");
const ledgerPath=resolve(process.cwd(),requested[0]??resolve(root,"app","quiz-review-ledger.json"));
const errors=[],warnings=[];
let ledger;
try{ledger=JSON.parse(await readFile(ledgerPath,"utf8"))}catch(error){console.error(`FAIL\tcannot read quiz review ledger: ${error instanceof Error?error.message:String(error)}`);process.exit(1)}
const page=await readFile(resolve(root,"app","page.tsx"),"utf8");
const quizEntries=[...page.matchAll(/\{target:"([^"]+)",category:"([^"]+)"/g)].map(match=>({target:match[1],category:match[2]}));
const quizTargets=new Set(quizEntries.map(entry=>entry.target));
const manualTargets=new Set([...page.matchAll(/^\s{2}(\w+):\s*\{[^\n]*labelSource:"manual"/gm)].map(match=>match[1]));
const promotableTargets=new Set(quizEntries.filter(entry=>entry.category==="surface"||entry.category==="neurovascular"||!manualTargets.has(entry.target)).map(entry=>entry.target));
const canonicalIds=new Set(expertReviewTargets.map(target=>target.id));
const adoptionDecisions=new Set(["採用可","注意書き付きで採用可"]);
const cautionDecision="注意書き付きで採用可";
const shaPattern=/^[0-9a-f]{40}$/i;
const validDate=value=>typeof value==="string"&&!Number.isNaN(Date.parse(value));

if(ledger?.format!=="brain-practical-quiz-review-ledger"||ledger?.schemaVersion!==1||!Array.isArray(ledger?.approvals))errors.push("unsupported quiz review ledger format/schemaVersion");
const approvals=Array.isArray(ledger?.approvals)?ledger.approvals:[];
const seenTargets=new Set();
for(const approval of approvals){
  const prefix=typeof approval?.target==="string"?approval.target:"unknown";
  if(!quizTargets.has(approval?.target))errors.push(`${prefix}: target is not a quiz question`);
  else if(!promotableTargets.has(approval.target))errors.push(`${prefix}: target is not a trial question and cannot be promoted`);
  if(seenTargets.has(approval?.target))errors.push(`${prefix}: duplicate ledger approval`);else seenTargets.add(approval?.target);
  if(!shaPattern.test(approval?.reviewedCommit??""))errors.push(`${prefix}: reviewedCommit must be a full 40-character SHA`);
  if(!Array.isArray(approval?.evidenceTargetIds)||approval.evidenceTargetIds.length===0||approval.evidenceTargetIds.some(id=>!canonicalIds.has(id)))errors.push(`${prefix}: evidenceTargetIds must name canonical review targets`);
  if(typeof approval?.adoptedBy!=="string"||!approval.adoptedBy.trim())errors.push(`${prefix}: adoptedBy is required`);
  if(!validDate(approval?.adoptedAt))errors.push(`${prefix}: adoptedAt must be an ISO date`);
  if(typeof approval?.reason!=="string"||approval.reason.trim().length<20)errors.push(`${prefix}: governance adoption reason must contain at least 20 characters`);
  if(typeof approval?.caution!=="string")errors.push(`${prefix}: caution must be a string, even when empty`);
  if(typeof approval?.bundleDirectory!=="string"||!/^expert-review-records\/[0-9a-f]{40}$/i.test(approval.bundleDirectory)){errors.push(`${prefix}: bundleDirectory must be expert-review-records/<40-char-SHA>`);continue}
  const bundlePath=resolve(root,approval.bundleDirectory),relativePath=relative(root,bundlePath);
  if(relativePath.startsWith(".."+sep)||relativePath===".."){errors.push(`${prefix}: bundleDirectory escapes the repository`);continue}
  let files=[];
  try{if(!(await stat(bundlePath)).isDirectory())throw new Error("not a directory");files=(await readdir(bundlePath)).filter(name=>name.toLowerCase().endsWith(".json")).sort()}catch(error){errors.push(`${prefix}: cannot inspect review bundle (${error instanceof Error?error.message:String(error)})`);continue}
  const records=[];
  for(const file of files)try{const record=JSON.parse(await readFile(resolve(bundlePath,file),"utf8")),validation=validateExpertReviewRecord(record);records.push(record);for(const error of validation.errors)errors.push(`${prefix}:${file}: ${error}`)}catch(error){errors.push(`${prefix}:${file}: cannot read review record (${error instanceof Error?error.message:String(error)})`)}
  const byId=new Map(records.map(record=>[record?.target?.id,record]));
  const missing=expertReviewTargets.map(target=>target.id).filter(id=>!byId.has(id));
  if(records.length!==expertReviewTargets.length||missing.length)errors.push(`${prefix}: review bundle must contain all 19 canonical targets${missing.length?` (missing ${missing.join(", ")})`:""}`);
  if(new Set(records.map(record=>record?.target?.id)).size!==records.length)errors.push(`${prefix}: review bundle has duplicate target records`);
  if(records.some(record=>record?.targetCommit!==approval.reviewedCommit))errors.push(`${prefix}: every review record must match reviewedCommit`);
  if(!records.some(record=>/神経解剖|neuroanatom/i.test(record?.reviewer?.expertise??"")))errors.push(`${prefix}: review bundle needs declared neuroanatomy expertise`);
  if(records.some(record=>!adoptionDecisions.has(record?.decision)))errors.push(`${prefix}: unresolved review decisions prohibit quiz promotion`);
  const evidenceRecords=approval.evidenceTargetIds.map(id=>byId.get(id)).filter(Boolean);
  if(evidenceRecords.length!==approval.evidenceTargetIds.length)errors.push(`${prefix}: cited evidence records are missing`);
  if(evidenceRecords.some(record=>record.decision===cautionDecision)&&approval.caution.trim().length<20)errors.push(`${prefix}: caution text is required for a caution-qualified review`);
  const latestReview=Math.max(...records.map(record=>Date.parse(record?.reviewedAt)).filter(Number.isFinite));
  if(validDate(approval?.adoptedAt)&&Number.isFinite(latestReview)&&Date.parse(approval.adoptedAt)<latestReview)errors.push(`${prefix}: adoptedAt must follow the cited expert review`);
}

if(approvals.length===0)warnings.push("no trial quiz questions are promoted; standard quiz remains limited to manual segmentation");
for(const warning of warnings)console.warn(`WARN\t${warning}`);
if(errors.length){for(const error of errors)console.error(`FAIL\t${error}`);process.exitCode=1}else{
  console.log(`PASS\tquiz review ledger: ${approvals.length} approved trial target(s), ${promotableTargets.size} remain evidence-gated`);
  console.log("PASS\ttrial quiz promotion requires a complete expert bundle and explicit governance adoption");
}
