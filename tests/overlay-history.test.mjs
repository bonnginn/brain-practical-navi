import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const ast=ts.createSourceFile('page.tsx',fs.readFileSync(new URL('../app/page.tsx',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const names=new Set(['openOverlay','closeOverlay','overlayOriginFromHistory','overlayFromHash','workspaceHash']);
const snippets=[];
function visit(node){if(ts.isFunctionDeclaration(node)&&names.has(node.name?.text))snippets.push(node.getText(ast));ts.forEachChild(node,visit);}
visit(ast);assert.equal(snippets.length,names.size);
const code=ts.transpileModule(snippets.join('\n'),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
function harness(route='#workspace/sections/horizontal'){
 const entries=[{hash:'#workspace/home',state:null},{hash:route,state:null}];let index=1,pendingBack=false,backCalls=0;
 const state={workspace:'sections',surfaceView:'lateral',plane:'horizontal',blockSpecimen:'lateral-ventricle',overlayOpen:!!route.match(/help|legal|sources/),overlayOriginRef:{current:null},overlayClosingRef:{current:false},overlayReturnFocus:{current:null},document:{activeElement:null},HTMLElement:class{},window:{location:{hash:route}},flags:{}};
 for(const key of ['Help','Feedback','Legal','Sources','Status'])state['set'+key+'Open']=value=>{state.flags[key]=value;state.overlayOpen=Object.values(state.flags).some(Boolean);};
 const sync=()=>{state.window.location.hash=entries[index].hash;};
 state.window.history={get length(){return entries.length;},get state(){return entries[index].state;},pushState(value,_title,hash){entries.splice(index+1);entries.push({hash,state:value});index++;sync();},replaceState(value,_title,hash){entries[index]={hash,state:value};sync();},back(){backCalls++;pendingBack=true;}};
 vm.createContext(state);vm.runInContext(code,state);
 return {state,entries,get index(){return index;},get backCalls(){return backCalls;},flush(){if(pendingBack){index--;pendingBack=false;sync();state.overlayClosingRef.current=false;state.overlayOpen=false;}},back(){index--;sync();},forward(){index++;sync();state.overlayOpen=true;}};
}
test('explicit close consumes only the pushed overlay entry and ignores repeated close while traversal is pending',()=>{
 const h=harness();h.state.openOverlay('help');h.state.closeOverlay();h.state.closeOverlay();assert.equal(h.backCalls,1);h.flush();assert.equal(h.state.window.location.hash,'#workspace/sections/horizontal');h.back();assert.equal(h.state.window.location.hash,'#workspace/home');
});
test('switching supplemental panels replaces the overlay entry and retains its observation origin',()=>{
 const h=harness();h.state.openOverlay('legal');h.state.openOverlay('sources');assert.equal(h.entries.length,3);assert.equal(h.state.window.history.state.learningOrigin,'#workspace/sections/horizontal');h.state.closeOverlay();h.flush();assert.equal(h.index,1);h.forward();assert.equal(h.state.window.location.hash,'#workspace/sources');h.state.closeOverlay();h.flush();assert.equal(h.index,1);
});
test('direct overlay links and older unmarked entries close locally without traversing unknown history',()=>{
 for(const marked of [false,true]){const h=harness('#workspace/help');if(marked)h.state.window.history.replaceState({learningOrigin:'#workspace/quiz'},'','#workspace/help');h.state.closeOverlay();assert.equal(h.backCalls,0);assert.equal(h.state.window.location.hash,marked?'#workspace/quiz':'#workspace/sections/horizontal');}
});
