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
    "本文へ移動":"Skip to main content",
    "すべて解除":"Deselect all",
    "向きを戻す":"Reset orientation",
    "出題位置へ戻す":"Return to question position",
    "側頭葉・後頭葉下面で内外側の溝間にある脳回はどれですか？":"Which gyrus lies between the medial and lateral occipitotemporal sulci on the inferior temporal and occipital surfaces?",
    "尾状核・視床とレンズ核の間を通る白質路はどれですか？":"Which white-matter pathway runs between the caudate nucleus and thalamus medially and the lentiform nucleus laterally?",
    "内包には皮質へ向かう線維と皮質から下行する線維が高密度に通ります。":"The internal capsule contains densely packed fibres ascending toward the cerebral cortex and descending from it.",
    "脳表・局所標本":"Brain surface and local specimens",
    "III 動眼神経":"III · Oculomotor nerve",
    "XII 舌下神経":"XII · Hypoglossal nerve",
  });
  assert.deepEqual(auditEnglishCatalog(fixture),[]);
  for(const [key,value] of [["blank",""],["leak","海馬"],["garbage","Contact Us"],["reported-corruption","Orbital Orbital Scalp"],["repeat","anterior anterior anterior"],["wrong-home","Home"],["視床下核","Hypothalamic nucleus"]]){
    const mutated={...fixture,[key]:value};
    assert.ok(auditEnglishCatalog(mutated).length>0,`${key} mutation must fail`);
  }
});
