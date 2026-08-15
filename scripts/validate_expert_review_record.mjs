import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { validateExpertReviewRecord } from "./expert_review_validation.mjs";

const recordPath=process.argv.slice(2).find(argument=>argument!=="--");
if(!recordPath){console.error("Usage: npm run validate:expert-review -- <record.json>");process.exit(2)}

let record;
try{record=JSON.parse(await readFile(resolve(process.cwd(),recordPath),"utf8"))}
catch(error){console.error(`FAIL\tcannot read expert review JSON: ${error instanceof Error?error.message:String(error)}`);process.exit(1)}

const {errors,warnings}=validateExpertReviewRecord(record);
for(const warning of warnings)console.warn(`WARN\t${warning}`);
if(errors.length){for(const error of errors)console.error(`FAIL\t${error}`);process.exitCode=1}
else{
  console.log(`PASS\t${record.target.id} complete canonical target at ${record.targetCommit}`);
  console.log(`PASS\t${record.decision} decision with public evidence`);
  console.log("PASS\texpert review record v2 is structurally valid; anatomical acceptance remains a governance decision");
}
