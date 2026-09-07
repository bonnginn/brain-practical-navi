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

test('callosal boundary caveat is present in sections, medial surface and block descriptions with English counterparts',()=>{
  const notes=[...page.matchAll(/note:"([^"]*帯状回・脳弓[^"]*)"/g)].map(m=>m[1]);
  assert.equal(notes.length,3);
  for(const note of notes){
    assert.match(note,/帯状回・脳弓/);
    assert.match(note,/分離.*(不十分|未修正)/);
    assert.match(catalog[note],/cingulate gyrus and fornix/);
    assert.match(catalog[note],/does not adequately separate|separation.*remains incomplete/i);
  }
  assert.match(page,/corpusCallosum:.*bigbrainIds:\[30\]/);
});
