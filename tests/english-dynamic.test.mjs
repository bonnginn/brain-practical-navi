import test from 'node:test';
import assert from 'node:assert/strict';
import {englishDynamic} from '../src/englishDynamic.mjs';

test('dynamic question and structure counts distinguish zero, one and many',()=>{
  for(const n of [0,1,2,100]){
    const suffix=n===1?'':'s';
    assert.equal(englishDynamic(`全項目（${n}問）`,{'全項目':'All topics'}),`All topics (${n} question${suffix})`);
    assert.equal(englishDynamic(`${n}構造を同時表示中`,{}),`${n} structure${suffix} displayed`);
    assert.equal(englishDynamic(`${n}問`,{}),`${n} question${suffix}`);
  }
  assert.equal(englishDynamic('5問を上限に1問（候補1）',{}),'Up to 5 questions; 1 selected from 1 candidate');
});

test('all surface-label combinations are complete, correctly spaced instructions',()=>{
  for(const model of ['MNI高密度皮質表面モデル','0.5 mm標本から構成した局所3D標本'])for(const context of [false,true])for(const neuro of [false,true])for(const zoom of [false,true])for(const pick of [false,true]){
    const source=model+(context?'と収録済み標本の位置目安':'')+(neuro?'と模式3D神経血管レイヤー':'')+'。ホイールで拡大縮小'+(zoom?'、画面ボタンでも操作可能':'')+(pick?'、クリックで構造を選択':'');
    const result=englishDynamic(source,{});
    assert.ok(result?.includes('. Use the wheel to zoom.'));
    assert.equal(result.includes('neurovascular layer'),neuro);
    assert.equal(result.includes('On-screen zoom controls'),zoom);
    assert.equal(result.includes('Click to select'),pick);
    assert.equal(result.includes('specimen location guide'),context);
    assert.doesNotMatch(result,/[\u3040-\u30ff\u3400-\u9fff]|Modeland|zoom.Can/);
  }
});

test('slice templates retain direction and position and unknown anatomy is not guessed',()=>{
  assert.equal(englishDynamic('coronal断面 53。ホイールで拡大縮小、Shiftドラッグで移動',{}),'coronal slice 53. Use the wheel to zoom and Shift-drag to pan.');
  assert.equal(englishDynamic('復習問題の前後位置',{}),'Quiz slice position (anteroposterior)');
  assert.equal(englishDynamic('位置：未知の構造',{}),null);
  assert.equal(englishDynamic('未知の分類（1問）',{}),null);
  assert.equal(englishDynamic('標本分節。説明',{'説明':'Description.'}),'Specimen segmentation. Description.');
});
