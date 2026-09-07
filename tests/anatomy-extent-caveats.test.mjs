import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const page=readFileSync(new URL('../app/page.tsx',import.meta.url),'utf8');
const catalog=JSON.parse(readFileSync(new URL('../app/english-catalog.json',import.meta.url),'utf8'));
test('specimen tissue denotes biological tissue, not an organization',()=>{
  assert.equal(catalog['標本組織'],'Specimen tissue');
});
function notesContaining(text){return [...page.matchAll(/(?:note|intro|caution):\s*"([^"]+)"/g)].map(m=>m[1]).filter(n=>n.includes(text));}
test('caudate scope distinguishes real tail anatomy from incomplete model coverage in sections and blocks',()=>{
  const notes=notesContaining('尾部全長を収録していません');
  assert.equal(notes.length,2);
  for(const note of notes)assert.match(catalog[note],/not.*full tail/);
  assert.match(page,/bigbrainIds:\[7,8\]/);
  assert.match(page,/尾部は下角の上方・天井側を走ります/);
});
test('fourth ventricle caveat describes the limited repair without claiming complete boundaries',()=>{
  const notes=notesContaining('上方の微小片');
  assert.equal(notes.length,2);
  for(const note of notes)assert.match(catalog[note],/remain unresolved/);
  assert.match(page,/fourthVentricle:.*bigbrainIds:\[26\]/);
  assert.doesNotMatch(page,/矢状断で中脳水道から中心管への連続を追います/);
});
test('midbrain specimen and hidden oculomotor course are not presented as anatomical reference geometry',()=>{
  const intro=notesContaining('完全な横断標本ではありません');
  assert.equal(intro.length,1);
  assert.match(catalog[intro[0]],/not a complete cross-section/);
  const caution=notesContaining('元ラベルの欠け');
  assert.equal(caution.length,1);
  assert.match(catalog[caution[0]],/Do not learn.*as real anatomy/);
  const nerve=notesContaining('出現位置の正解図');
  assert.equal(nerve.length,1);
  assert.match(catalog[nerve[0]],/do not use.*exact emergence point/);
  assert.match(page,/cn3:.*ids:\[26,27\]/);
});
