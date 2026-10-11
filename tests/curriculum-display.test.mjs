import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {curriculumDisplayMap} from '../build/curriculum-display.mjs';
import {createCurriculumLookup} from '../src/curriculumContent.mjs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import {readConstant} from '../scripts/build_curriculum_content_map.mjs';

test('runtime curriculum projection preserves every field rendered by the reference card',()=>{
  const original=JSON.parse(readFileSync(new URL('../data/curriculum/content-map.json',import.meta.url),'utf8'));
  const projected=curriculumDisplayMap(original),lookup=createCurriculumLookup(projected);
  for(const m of original.materials){
    const p=lookup(m.id);assert.equal(p.material.name,m.name);
    assert.equal(p.material.evidence_state.image_position,m.evidence_state.image_position);
    assert.equal(p.material.provenance_mapping.mapping.composite,!!m.provenance_mapping?.mapping.composite);
    assert.deepEqual(p.evidence,(m.evidence??[]).map(e=>({entry_key:e.entry_key,limitations:e.limitations,source_refs:e.source_refs})));
    assert.deepEqual(p.source_text_refs,(m.source_text_refs??[]).filter(r=>r.symbol==='surfaceObservationGuides').map(r=>({symbol:r.symbol,key:r.key})));
    assert.deepEqual(p.tasks.map(t=>t.id),original.tasks.filter(t=>t.material_refs?.includes(m.id)).map(t=>t.id));
    assert.deepEqual(p.gaps,original.gaps.filter(g=>g.subject_ref===m.id).map(g=>({subject_ref:g.subject_ref,kind:g.kind})));
  }
});

test('actual reference cards render identically from full and display inventories in both languages',async()=>{
  const require=createRequire(import.meta.url),ts=require('typescript'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
  const original=JSON.parse(readFileSync(new URL('../data/curriculum/content-map.json',import.meta.url),'utf8'));
  const registry=JSON.parse(readFileSync(new URL('../public/atlas/structure-provenance.json',import.meta.url),'utf8'));
  const guides=await readConstant('src/surfaceObservationGuides.ts','surfaceObservationGuides');
  const code=ts.transpileModule(readFileSync(new URL('../src/CurriculumReferences.tsx',import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
  function card(map){
    const exports={},ctx={exports,require:id=>{
      if(id==='../data/curriculum/content-map.json')return map;
      if(id==='../public/atlas/structure-provenance.json')return registry;
      if(id==='./surfaceObservationGuides')return {surfaceObservationGuides:guides};
      if(id==='./curriculumContent.mjs')return {createCurriculumLookup};
      return require(id);
    }};vm.createContext(ctx);vm.runInContext(code,ctx);return exports.CurriculumReferences;
  }
  const fullCard=card(original),displayCard=card(curriculumDisplayMap(original));
  for(const m of original.materials)for(const english of [false,true])assert.equal(renderToStaticMarkup(React.createElement(displayCard,{materialId:m.id,english})),renderToStaticMarkup(React.createElement(fullCard,{materialId:m.id,english})),m.id+' '+english);
});
