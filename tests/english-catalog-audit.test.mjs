import test from "node:test";
import assert from "node:assert/strict";
import {auditEnglishCatalog,auditEnglishCatalogFile} from "../scripts/audit_english_catalog.mjs";

test("committed English catalog passes the corruption audit",async()=>{
  const result=await auditEnglishCatalogFile();
  assert.deepEqual(result.issues,[]);
  assert.ok(result.entries>1800);
});

test("audit rejects blanks, Japanese leakage, corruption, repetition, and critical-term drift",()=>{
  const fixture=Object.fromEntries(Array.from({length:1801},(_,index)=>[`key-${index}`,`Translation ${index}`]));
  Object.assign(fixture,{
    "視床下核":"Subthalamic nucleus",
    "黒質":"Substantia nigra",
    "視交叉":"Optic chiasm",
    "被殻":"Putamen",
    "脳梁":"Corpus callosum",
    "海馬":"Hippocampus",
    "扁桃体":"Amygdala",
    "側坐核":"Nucleus accumbens",
    "正答":"Correct answer",
    "延髄":"Medulla oblongata",
    "小脳":"Cerebellum",
  });
  assert.deepEqual(auditEnglishCatalog(fixture),[]);
  for(const [key,value] of [["blank",""],["leak","海馬"],["garbage","Contact Us"],["repeat","anterior anterior anterior"],["wrong-home","Home"],["視床下核","Hypothalamic nucleus"]]){
    const mutated={...fixture,[key]:value};
    assert.ok(auditEnglishCatalog(mutated).length>0,`${key} mutation must fail`);
  }
});
