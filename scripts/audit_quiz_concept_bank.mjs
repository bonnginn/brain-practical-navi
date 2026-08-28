import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
export const CONCEPT_COUNT=55;
export const BASE_COUNT=45;
export const TOTAL_COUNT=100;
export const KINDS=new Set(["function-to-structure","function-choice","relation-choice","pathway-choice"]);
const expectedMultiplicity={caudate:2,putamen:2,pallidum:2,accumbens:2,hippocampus:2,amygdala:2,mammillaryBody:2,redNucleus:2,substantiaNigra:2,subthalamic:2,ventricle:2,thalamus:2,corpusCallosum:2,internalCapsule:2,insula:2,brainstem:2,cerebellum:2,precentral:1,superiorTemporal:1,superiorFrontal:1,precuneus:1,cuneus:1,fusiform:1,cn1:1,cn2:1,opticChiasm:1,cn3:1,cn4:1,cn5:1,cn6:1,cn7:1,cn8:1,cn9:1,cn10:1,cn11:1,cn12:1,ica:1,basilar:1};

export function validateQuizConceptBank(bank,source=""){
  const errors=[];
  if(bank?.schemaVersion!==1)errors.push("schemaVersion must be 1");
  if(bank?.reviewState!=="project-reviewed-expert-pending")errors.push("reviewState must remain project-reviewed-expert-pending");
  if(!/^\d{4}-\d{2}-\d{2}$/.test(bank?.updated??""))errors.push("updated must be YYYY-MM-DD");
  const sources=new Set(), sourceList=Array.isArray(bank?.sources)?bank.sources:[];
  for(const item of sourceList){if(!item?.id||sources.has(item.id))errors.push(`invalid or duplicate source: ${item?.id??"missing"}`);else sources.add(item.id);if(!item?.label||!item?.ref)errors.push(`${item?.id??"source"}: label/ref required`)}
  const questions=Array.isArray(bank?.questions)?bank.questions:[];
  if(questions.length!==CONCEPT_COUNT)errors.push(`concept question count must be ${CONCEPT_COUNT}, found ${questions.length}`);
  const ids=new Set(), counts={};
  for(const question of questions){
    if(!question?.id||ids.has(question.id))errors.push(`invalid or duplicate question id: ${question?.id??"missing"}`);else ids.add(question.id);
    if(!(question?.target in expectedMultiplicity))errors.push(`${question?.id}: unknown visual target ${question?.target}`);else counts[question.target]=(counts[question.target]??0)+1;
    if(!KINDS.has(question?.kind))errors.push(`${question?.id}: invalid kind ${question?.kind}`);
    if(!question?.prompt?.trim()||!question?.explanation?.trim())errors.push(`${question?.id}: prompt/explanation required`);
    const options=Array.isArray(question?.options)?question.options:[];
    const optionKeys=options.map(option=>option?.key);
    if(options.length!==4||new Set(optionKeys).size!==4)errors.push(`${question?.id}: exactly four unique options required`);
    if(optionKeys.filter(key=>key===question?.correctAnswer).length!==1)errors.push(`${question?.id}: correctAnswer must occur exactly once`);
    if(options.some(option=>!option?.key||!option?.label?.trim()))errors.push(`${question?.id}: option key/label required`);
    if(!Array.isArray(question?.sourceRefs)||question.sourceRefs.length<1)errors.push(`${question?.id}: sourceRefs required`);
    else for(const ref of question.sourceRefs)if(!sources.has(ref))errors.push(`${question?.id}: unknown sourceRef ${ref}`);
  }
  for(const [target,count] of Object.entries(expectedMultiplicity))if((counts[target]??0)!==count)errors.push(`${target}: expected ${count} concept questions, found ${counts[target]??0}`);
  if(source){
    const snippets=["import quizConceptBank from \"./quiz-concept-bank.json\"","const conceptQuizQuestions:QuizQuestion[]=quizConceptData.questions.map","const allQuizQuestions:QuizQuestion[]=[...visualQuizQuestions,...conceptQuizQuestions]","function quizCorrectAnswer(question:QuizQuestion)","key===quizCorrectKey","quizQuestion.explanation??","data-quiz-kind={quizQuestionKind}"];
    for(const snippet of snippets)if(!source.includes(snippet))errors.push(`app source missing concept contract: ${snippet}`);
  }
  return {ok:errors.length===0,errors,summary:{baseQuestionCount:BASE_COUNT,conceptQuestionCount:questions.length,totalQuestionCount:BASE_COUNT+questions.length,uniqueVisualTargetCount:45,conceptVisualTargetCount:Object.keys(counts).length,reviewState:bank?.reviewState??null}};
}

export function auditQuizConceptBank({rootDir=root,bank,source}={}){
  const data=bank??JSON.parse(fs.readFileSync(path.join(rootDir,"app","quiz-concept-bank.json"),"utf8"));
  const appSource=source??fs.readFileSync(path.join(rootDir,"app","page.tsx"),"utf8");
  return validateQuizConceptBank(data,appSource);
}

if(import.meta.url===pathToFileURL(process.argv[1]??"").href){const report=auditQuizConceptBank();console.log(JSON.stringify(report,null,2));process.exitCode=report.ok?0:1}
