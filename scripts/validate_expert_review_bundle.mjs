import { readFile, readdir, stat } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { expertReviewTargets, validateExpertReviewRecord } from "./expert_review_validation.mjs";

const requested=process.argv.slice(2).filter(argument=>argument!=="--");
if(requested.length===0){console.error("Usage: npm run validate:expert-review-bundle -- <record.json|directory> [...]");process.exit(2)}

const paths=[];
for(const input of requested){
  const path=resolve(process.cwd(),input);
  try{
    const metadata=await stat(path);
    if(metadata.isDirectory())for(const name of (await readdir(path)).filter(name=>name.toLowerCase().endsWith(".json")).sort())paths.push(join(path,name));
    else paths.push(path);
  }catch(error){console.error(`FAIL\tcannot inspect ${input}: ${error instanceof Error?error.message:String(error)}`);process.exit(1)}
}
if(paths.length===0){console.error("FAIL\tno JSON records found");process.exit(1)}

const errors=[],warnings=[],records=[];
for(const path of paths){
  try{
    const record=JSON.parse(await readFile(path,"utf8")),validation=validateExpertReviewRecord(record);
    records.push(record);
    for(const error of validation.errors)errors.push(`${basename(path)}: ${error}`);
    for(const warning of validation.warnings)warnings.push(`${basename(path)}: ${warning}`);
  }catch(error){errors.push(`${basename(path)}: cannot read JSON (${error instanceof Error?error.message:String(error)})`)}
}

const byTarget=new Map();
for(const record of records){const id=record?.target?.id;if(typeof id==="string"){if(byTarget.has(id))errors.push(`duplicate target record: ${id}`);else byTarget.set(id,record)}}
const missing=expertReviewTargets.map(target=>target.id).filter(id=>!byTarget.has(id));
if(missing.length)errors.push(`missing canonical targets: ${missing.join(", ")}`);
const commits=new Set(records.map(record=>record?.targetCommit).filter(Boolean));
if(commits.size!==1)errors.push("all records must review the same full targetCommit");
const reviewers=new Map();
for(const record of records){const reviewer=record?.reviewer;if(reviewer?.name&&reviewer?.affiliation)reviewers.set(`${reviewer.name.trim()}\u0000${reviewer.affiliation.trim()}`,reviewer)}
if(![...reviewers.values()].some(reviewer=>/神経解剖|neuroanatom/i.test(reviewer.expertise??"")))errors.push("at least one named reviewer must identify neuroanatomy expertise");
const unresolved=records.filter(record=>record?.decision==="要修正"||record?.decision==="判定保留").map(record=>`${record.target?.id}:${record.decision}`);
if(unresolved.length)errors.push(`unresolved review decisions keep beta No-Go: ${unresolved.join(", ")}`);

for(const warning of warnings)console.warn(`WARN\t${warning}`);
if(errors.length){for(const error of errors)console.error(`FAIL\t${error}`);process.exitCode=1}
else{
  const cautions=records.filter(record=>record.decision==="注意書き付きで採用可").length;
  console.log(`PASS\t${records.length}/${expertReviewTargets.length} canonical targets reviewed at ${[...commits][0]}`);
  console.log(`PASS\t${reviewers.size} named reviewer(s), including declared neuroanatomy expertise`);
  console.log(`PASS\tall decisions resolved (${cautions} require documented cautions)`);
  console.log("PASS\texpert review bundle is complete; adoption still requires ledger/UI updates and governance review");
}
