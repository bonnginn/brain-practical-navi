import test from 'node:test';
import assert from 'node:assert/strict';
import {observationQuestionsForEntry} from '../src/anatomyReviewQueue.mjs';
const q=[{target:'caudate',plane:'coronal',position:65},{target:'caudate',plane:'coronal',position:65,id:'function'},{target:'precentral',format:'surface',view:'lateral'},{target:'cn3',format:'neurovascular',view:'cranialNerves'}];
test('declared targets lead to existing positions once, retaining source questions',()=>{
  const result=observationQuestionsForEntry({appKeys:['caudate','precentral','caudate','unknown'],learnerSurfaces:['sections','surface']},q);
  assert.deepEqual(result,[q[0],q[2]]);assert.equal(result[0],q[0]);
  assert.deepEqual(observationQuestionsForEntry({appKeys:['cn3'],learnerSurfaces:['surface']},q),[q[3]]);
  const legacySurface={target:'precentral',category:'surface',view:'lateral'};
  assert.deepEqual(observationQuestionsForEntry({appKeys:['precentral'],learnerSurfaces:['surface']},[legacySurface]),[legacySurface]);
});
test('no invented or forbidden target and no undeclared teaching surface',()=>{
  for(const entry of [{legacyIds:[33],appKeys:['caudate'],learnerSurfaces:['sections']},{excludedFromSectionAndQuizTargets:true,appKeys:['caudate'],learnerSurfaces:['sections']},{appKeys:['caudate'],learnerSurfaces:['surface']},{learnerSurfaces:['sections']}])assert.deepEqual(observationQuestionsForEntry(entry,q),[]);
});
