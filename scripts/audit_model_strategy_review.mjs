#!/usr/bin/env node

import {readFile,writeFile,mkdir} from "node:fs/promises";
import {dirname,resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {validateModelStrategyReviewExport} from "../src/modelStrategyReview.mjs";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");

function usage(){return ["Usage:","  node scripts/audit_model_strategy_review.mjs --input path/to/model-strategy-review.json [--output work/model-strategy-review-audit.json]","","The input remains an unsubmitted, non-adoptive review record. Validation never marks expert review complete."].join("\n")}

function parseArgs(argv){
  const options={input:"",output:""};
  for(let index=0;index<argv.length;index+=1){const token=argv[index];if(token==="--help"||token==="-h")return{help:true,...options};if(token!=="--input"&&token!=="--output")throw new Error(`unknown option: ${token}`);const value=argv[index+1];if(!value||value.startsWith("--"))throw new Error(`${token} requires a value`);options[token.slice(2)]=value;index+=1}
  if(!options.input)throw new Error("--input is required");
  return{help:false,...options};
}

export async function auditModelStrategyReview(inputPath){
  const definition=JSON.parse(await readFile(resolve(root,"model-comparison/deep-ventricle-evaluation.json"),"utf8"));
  const dimensions=definition.dimensions.map(item=>({key:item.key,labelJa:item.labelJa}));
  const review=JSON.parse(await readFile(resolve(inputPath),"utf8"));
  const validation=validateModelStrategyReviewExport(review,dimensions);
  return{schemaVersion:1,auditedAt:new Date().toISOString(),tool:"scripts/audit_model_strategy_review.mjs",input:resolve(inputPath),comparisonId:review?.comparisonId??null,validation,claims:{submitted:false,adoptionDecided:false,expertReviewCompleted:false}};
}

async function main(){
  let options;try{options=parseArgs(process.argv.slice(2))}catch(error){console.error(error.message);console.error(usage());process.exitCode=2;return}
  if(options.help){console.log(usage());return}
  let report;try{report=await auditModelStrategyReview(options.input)}catch(error){console.error(error.message);process.exitCode=1;return}
  if(options.output){const output=resolve(options.output);await mkdir(dirname(output),{recursive:true});await writeFile(output,`${JSON.stringify(report,null,2)}\n`,"utf8")}
  console.log(JSON.stringify(report,null,2));if(!report.validation.ok)process.exitCode=1;
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
