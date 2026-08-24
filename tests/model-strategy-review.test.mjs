import assert from "node:assert/strict";
import {mkdtemp,readFile,rm,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import test from "node:test";
import {auditModelStrategyReview} from "../scripts/audit_model_strategy_review.mjs";
import {buildModelStrategyReviewExport,countModelStrategyReviewScores,createModelStrategyReviewDraft,MODEL_STRATEGY_REVIEW_STORAGE_KEY,restoreModelStrategyReviewDraft,validateModelStrategyReviewDraft,validateModelStrategyReviewExport} from "../src/modelStrategyReview.mjs";

const definition=JSON.parse(await readFile(new URL("../model-comparison/deep-ventricle-evaluation.json",import.meta.url),"utf8"));
const dimensions=definition.dimensions.map(item=>({key:item.key,labelJa:item.labelJa}));
const fixedNow="2026-08-24T00:00:00.000Z";
const clone=value=>structuredClone(value);

test("local A/B review draft covers the fixed seven dimensions without identity fields",()=>{
  const draft=createModelStrategyReviewDraft(dimensions,fixedNow);
  assert.equal(MODEL_STRATEGY_REVIEW_STORAGE_KEY,"brain-practical-navi:model-strategy-review:deep-ventricle:v1");
  assert.equal(draft.ratings.length,7);
  assert.deepEqual(draft.ratings.map(item=>item.dimensionKey),dimensions.map(item=>item.key));
  assert.equal(draft.status,"local-unsubmitted-draft");
  assert.equal(draft.adoptionDecision,"not-recorded");
  assert.equal(draft.expertReviewStatus,"not-claimed");
  assert.equal(countModelStrategyReviewScores(draft),0);
  assert.equal(validateModelStrategyReviewDraft(draft,dimensions).ok,true);
  assert.equal("name" in draft,false);
  assert.equal("email" in draft,false);
  assert.equal("affiliation" in draft,false);
});

test("review validation rejects PII-shaped extras, adoption claims, and invalid scores",()=>{
  const base=createModelStrategyReviewDraft(dimensions,fixedNow);
  const pii=clone(base);pii.email="reviewer@example.invalid";
  assert.equal(validateModelStrategyReviewDraft(pii,dimensions).ok,false);
  const adopted=clone(base);adopted.adoptionDecision="B";
  assert.equal(validateModelStrategyReviewDraft(adopted,dimensions).ok,false);
  const expert=clone(base);expert.expertReviewStatus="complete";
  assert.equal(validateModelStrategyReviewDraft(expert,dimensions).ok,false);
  const score=clone(base);score.ratings[0].A=6;
  assert.equal(validateModelStrategyReviewDraft(score,dimensions).ok,false);
  const reordered=clone(base);reordered.ratings.reverse();
  assert.equal(validateModelStrategyReviewDraft(reordered,dimensions).ok,false);
});

test("invalid local storage is replaced by a safe empty draft",()=>{
  const restored=restoreModelStrategyReviewDraft('{"schemaVersion":1,"adoptionDecision":"B"}',dimensions,fixedNow);
  assert.equal(validateModelStrategyReviewDraft(restored,dimensions).ok,true);
  assert.equal(restored.createdAt,fixedNow);
  assert.equal(restored.adoptionDecision,"not-recorded");
});

test("JSON export derives completeness but remains unsubmitted and non-adoptive",()=>{
  const draft=createModelStrategyReviewDraft(dimensions,fixedNow);
  draft.reviewerRole="neuroanatomy-expert";
  draft.overallPreference="no-preference";
  for(const rating of draft.ratings){rating.A=4;rating.B=3}
  assert.equal(countModelStrategyReviewScores(draft),14);
  const exported=buildModelStrategyReviewExport(draft,dimensions,"2026-08-24T01:00:00.000Z");
  assert.deepEqual(exported.completeness,{scoreCount:14,scoreTotal:14,ratingsComplete:true,reviewerRoleSelected:true,preferenceRecorded:true});
  assert.equal(exported.submissionStatus,"not-submitted");
  assert.equal(exported.adoptionDecision,"not-recorded");
  assert.equal(exported.expertReviewStatus,"not-claimed");
  assert.equal(validateModelStrategyReviewExport(exported,dimensions).ok,true);
});

test("export validation rejects derived-count drift, submission, identity extras, and review escalation",()=>{
  const draft=createModelStrategyReviewDraft(dimensions,fixedNow);
  draft.ratings[0].A=4;
  const base=buildModelStrategyReviewExport(draft,dimensions,"2026-08-24T01:00:00.000Z");
  const count=clone(base);count.completeness.scoreCount=14;
  assert.equal(validateModelStrategyReviewExport(count,dimensions).ok,false);
  const submitted=clone(base);submitted.submissionStatus="submitted";
  assert.equal(validateModelStrategyReviewExport(submitted,dimensions).ok,false);
  const identity=clone(base);identity.name="Reviewer";
  assert.equal(validateModelStrategyReviewExport(identity,dimensions).ok,false);
  const expert=clone(base);expert.expertReviewStatus="complete";
  assert.equal(validateModelStrategyReviewExport(expert,dimensions).ok,false);
});

test("standalone audit reports validation without claiming submission, adoption, or expert completion",async()=>{
  const folder=await mkdtemp(join(tmpdir(),"brain-navi-model-review-"));
  try{
    const input=join(folder,"review.json"),draft=createModelStrategyReviewDraft(dimensions,fixedNow),exported=buildModelStrategyReviewExport(draft,dimensions,"2026-08-24T01:00:00.000Z");
    await writeFile(input,JSON.stringify(exported),"utf8");
    const report=await auditModelStrategyReview(input);
    assert.equal(report.validation.ok,true);
    assert.deepEqual(report.claims,{submitted:false,adoptionDecided:false,expertReviewCompleted:false});
  }finally{await rm(folder,{recursive:true,force:true})}
});
