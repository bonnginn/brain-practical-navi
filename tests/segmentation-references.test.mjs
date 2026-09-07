import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import {renderToStaticMarkup} from 'react-dom/server';

const source=await readFile(new URL('../app/SegmentationReferences.tsx',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS}}).outputText;
const exported={};
vm.runInNewContext(compiled,{exports:exported,require:createRequire(import.meta.url)});
for(const english of [false,true])test(`browser references render source roles and eight links (${english?'en':'ja'})`,async()=>{
  const html=renderToStaticMarkup(exported.SegmentationReferences({english}));
  assert.equal((html.match(/<a /g)||[]).length,8);
  assert.equal((html.match(/target="_blank" rel="noreferrer"/g)||[]).length,8);
  assert.match(html,/s41597-019-0217-0/);
  assert.match(html,/3394010/);
  assert.match(html,english?/not adopted boundary data/:/採用境界データではありません/);
  assert.match(html,english?/expert review/:/専門家レビュー/);
  if(english)assert.doesNotMatch(html,/[ぁ-んァ-ヶ一-龠]/);
  const page=await readFile(new URL('../app/page.tsx',import.meta.url),'utf8');
  assert.match(page,/<SegmentationReferences english=\{englishEdition\}\/>/);
});
