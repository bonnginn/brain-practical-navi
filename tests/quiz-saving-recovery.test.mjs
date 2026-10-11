import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source=ts.createSourceFile('hook.ts',fs.readFileSync(new URL('../app/useWindowsQuizProgress.ts',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
let recovery;
function visit(node){if(ts.isFunctionDeclaration(node)&&node.name?.text==='preserveAndRestart')recovery=node.getText(source);ts.forEachChild(node,visit);}
visit(source);assert.ok(recovery);
const code=ts.transpileModule(recovery,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
function harness({deny=false,concurrent=false}={}){
 const key='synthetic-current',original='synthetic-original',map=new Map([[key,original]]);
 const h={WINDOWS_QUIZ_PROGRESS_KEY:key,preserved:{current:[original]},expected:{current:original},archivedReplacement:{current:false},blocked:{current:true},record:{answers:['synthetic-answer']},status:'conflict',recoveryVersion:0};
 h.preserve=raw=>{if(raw!==null&&!h.preserved.current.includes(raw))h.preserved.current.push(raw);};
 h.localStorage={getItem(k){return map.get(k)??null;},setItem(k,value){if(deny)throw Error('Synthetic storage denied');map.set(k,value);if(concurrent)map.set(key,'synthetic-newer-original');}};
 h.setRecord=value=>h.record=value;h.setStatus=value=>h.status=value;h.setRecoveryVersion=update=>h.recoveryVersion=update(h.recoveryVersion);
 vm.createContext(h);vm.runInContext(code,h);return {h,map,key,original};
}
test('only verified preservation wakes current quiz saving, while retaining the exact original',()=>{
 const {h,map,key,original}=harness();h.preserveAndRestart();
 assert.equal(h.blocked.current,false);assert.equal(h.recoveryVersion,1);assert.equal(h.archivedReplacement.current,true);assert.equal(map.get(key),original);
 const archive=[...map].find(([k])=>k!==key)[1];assert.deepEqual(JSON.parse(archive).records,[{key,raw:original}]);
});
test('preservation storage denial leaves the original and active answers intact and never wakes writing',()=>{
 const {h,map,key,original}=harness({deny:true});h.preserveAndRestart();assert.equal(map.get(key),original);assert.equal(h.blocked.current,true);assert.equal(h.recoveryVersion,0);assert.deepEqual(h.record,{answers:['synthetic-answer']});assert.equal(h.status,'unavailable');
});
test('a concurrent change during archive readback stays blocked and cannot replace newer data',()=>{
 const {h,map,key}=harness({concurrent:true});h.preserveAndRestart();assert.equal(map.get(key),'synthetic-newer-original');assert.equal(h.blocked.current,true);assert.equal(h.recoveryVersion,0);assert.equal(h.archivedReplacement.current,false);
});
