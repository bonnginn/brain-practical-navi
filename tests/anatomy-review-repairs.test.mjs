import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const page=fs.readFileSync(new URL('../app/page.tsx',import.meta.url),'utf8');
const catalog=JSON.parse(fs.readFileSync(new URL('../app/english-catalog.json',import.meta.url),'utf8'));

test('inferior parietal parcel distinguishes its painted scope from the separately labelled supramarginal gyrus',()=>{
  const line=page.split(/\r?\n/).find(l=>l.trimStart().startsWith('inferiorParietal:{'));
  assert.match(line,/ids:\[61,10\]/);
  const note=line.match(/note:"([^"]+)"/)[1];
  assert.match(note,/下頭頂小葉全体の着色ではなく、縁上回は別項目/);
  assert.match(catalog[note],/does not cover the whole anatomical inferior parietal lobule/);
  assert.match(catalog[note],/supramarginal gyrus is displayed separately/);
  assert.doesNotMatch(line,/縁上回・角回周辺を含む/);
});

test('callosal descriptions distinguish neighbouring cingulate cortex and fornix without claiming exact boundaries',()=>{
  const notes=[...page.matchAll(/note:"([^"]*輪郭は教材用の近似です。[^"]*)"/g)].map(m=>m[1]);
  assert.equal(notes.length,3);
  for(const note of notes){
    assert.match(note,/帯状回/);
    assert.match(note,/脳弓/);
    assert.match(catalog[note],/cingulate/i);
    assert.match(catalog[note],/fornix/i);
    assert.match(catalog[note],/approximation/i);
  }
  assert.match(page,/corpusCallosum:.*bigbrainIds:\[30\]/);
});
