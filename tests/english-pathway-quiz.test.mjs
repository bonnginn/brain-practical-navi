import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PAPEZ_STEPS,BASAL_GANGLIA_STEPS} from '../src/pathwayStepper.mjs';
const catalog=JSON.parse(readFileSync(new URL('../app/english-catalog.json',import.meta.url),'utf8'));
const bank=JSON.parse(readFileSync(new URL('../app/quiz-concept-bank.json',import.meta.url),'utf8'));
test('all concept prompts, explanations and options have complete catalog entries',()=>{
  assert.equal(bank.questions.length,55);
  for(const q of bank.questions)for(const text of [q.prompt,q.explanation,...q.options.map(o=>o.label)]){
    assert.ok(catalog[text]?.trim(),`${q.id}: ${text}`);
    assert.doesNotMatch(catalog[text],/[\u3040-\u30ff\u3400-\u9fff]/u);
  }
});
test('pathway labels preserve structures and unsegmented nuclei',()=>{
  const source=readFileSync(new URL('../app/EnglishLocalization.tsx',import.meta.url),'utf8');
  assert.ok(source.includes('["aria-label","title","placeholder","alt","label"]'),'optgroup label attributes must be localized too');
  assert.equal(catalog['前の段階'],'Previous step');
  assert.equal(catalog['次の段階'],'Next step');
  for(const s of PAPEZ_STEPS)for(const key of ['label','note','provenance'])assert.ok(catalog[s[key]],s[key]);
  for(const s of BASAL_GANGLIA_STEPS)assert.ok(catalog[s.label],s.label);
  assert.equal(catalog['視床（前部核は未分節）'],'Thalamus (anterior nuclei not segmented)');
  assert.equal(catalog['海馬傍回・嗅内野'],'Parahippocampal gyrus and entorhinal cortex');
  assert.equal(catalog['淡蒼球外節・内節'],'External and internal globus pallidus (GPe and GPi)');
  assert.match(catalog['対応する標本断面ラベルはありません。'],/no corresponding specimen-derived section label/i);
  assert.match(catalog['この試作は既存の断面ラベル、プロジェクト内で採用した脳弓の部分ラベル、模式補助、アトラス領域を由来別に表示します。ID46は体部・脚・柱と両側海馬采を部分収録しています。交連後の下行部は乳頭体に接する概略表示です。海馬采全長と精密な終端境界は未収録で、全脳弓の完成分節ではありません。帯状回・海馬傍回・嗅内野の3Dはアトラス対応であり、同一標本の断面分節ではありません。新たな結合、投射方向、興奮／抑制は示しません。'],/not section labels from the same specimen/);
});
test('reviewed quiz explanations retain omitted anatomical information',()=>{
  assert.match(catalog[bank.questions.find(q=>q.id==='callosum-classification-choice').explanation],/hippocampal commissure/);
  assert.match(catalog[bank.questions.find(q=>q.id==='superior-temporal-function').explanation],/transverse temporal gyri/);
  assert.match(catalog['舌咽神経は咽頭、舌後方、耳下腺などに関わる混合神経です。'],/parotid gland/);
  assert.match(catalog['側脳室前角の外側壁をつくる'],/lateral wall of the anterior horn/);
});
