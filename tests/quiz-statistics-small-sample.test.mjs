import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import {renderToStaticMarkup} from 'react-dom/server';
const require=createRequire(import.meta.url),React=require('react');
test('two submitted answers display their denominator beside the percentages in both languages',()=>{
 const q={id:'fixture',target:'a',prompt:'Fixture',options:['a','b'],correctAnswer:'a'};
 const source=readFileSync(new URL('../app/QuizOptionResults.tsx',import.meta.url),'utf8').replace("import.meta.env.VITE_QUIZ_STATISTICS_URL??''","'fixture-endpoint'");
 const compiled=ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 for(const english of [false,true]){
  const states=[[{question:q,revision:'fixture',counts:[1,1],total:2}],0,false,'','original',{},[],false];let index=0;
  const exports={};
  vm.runInNewContext(compiled,{exports,require:name=>name==='react'?{...React,useState:()=>[states[index++],()=>{}],useRef:()=>({current:null}),useMemo:fn=>fn(),useEffect:()=>{}}:name.endsWith('.css')?{}:name.includes('quizStatistics.mjs')?{statisticsEndpoint:()=> 'fixture-endpoint'}:require(name)});
  const html=renderToStaticMarkup(React.createElement(exports.default,{questions:[q],currentQuestion:q,english,labelFor:(_,key)=>key}));
  assert.equal((html.match(/50%/g)??[]).length,4); // two widths and two visible shares
  assert.ok(html.includes(english?'these 2 submitted answers only':'この延べ2回答だけの値'));
  assert.ok(html.includes(english?'do not represent all learners':'学習者全体の傾向を示すものではありません'));
 }
});
