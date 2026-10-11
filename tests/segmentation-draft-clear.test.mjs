import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';

const ts=createRequire(import.meta.url)('typescript');
const source=ts.createSourceFile('workbench.tsx',readFileSync(new URL('../app/ManualSegmentationWorkbench.tsx',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let clearSource,autosaveSource;
function visit(node){if(ts.isFunctionDeclaration(node)&&node.name?.text==='clear')clearSource=node.getText(source);if(ts.isExpressionStatement(node)&&node.getText(source).includes('const timer=window.setTimeout')&&node.getText(source).includes('100000'))autosaveSource=node.getText(source);ts.forEachChild(node,visit);}
visit(source);
assert.ok(clearSource);
const code=ts.transpileModule(clearSource+';globalThis.clearDraft=clear;',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;

function harness({denied=false,confirmed=true}={}){
  const ctx={isEditablePlane:true,editsRef:{current:new Map([[7,9]])},undo:['stroke'],redo:['redo'],version:2,status:null,DRAFT_KEY:'synthetic-draft',
    window:{confirm:()=>confirmed,setTimeout(callback){ctx.pendingSave=callback;return 1;},clearTimeout(){}},localStorage:{removeItem(){if(denied)throw new Error('Storage denied');ctx.saved=null;},setItem(_key,value){if(denied)throw new Error('Storage denied');ctx.saved=value;}},saved:'synthetic-original'};
  ctx.setUndo=value=>ctx.undo=value;ctx.setRedo=value=>ctx.redo=value;
  ctx.setVersion=update=>ctx.version=update(ctx.version);ctx.setStatus=value=>ctx.status=value;
  vm.createContext(ctx);vm.runInContext(code,ctx);return ctx;
}

test('denied draft removal preserves edits, saved data and undo/redo',()=>{
  const h=harness({denied:true});h.clearDraft();
  assert.deepEqual([...h.editsRef.current],[[7,9]]);assert.equal(h.saved,'synthetic-original');
  assert.deepEqual(h.undo,['stroke']);assert.deepEqual(h.redo,['redo']);assert.equal(h.version,2);
  assert.match(h.status,/編集は保持/);
});
test('confirmed draft removal clears memory only after stored draft removal succeeds',()=>{
  const h=harness();h.clearDraft();assert.equal(h.saved,null);assert.equal(h.editsRef.current.size,0);
  assert.equal(h.undo.length,0);assert.equal(h.redo.length,0);assert.equal(h.version,3);
});
test('cancelled draft removal preserves both stored and in-memory edits',()=>{
  const h=harness({confirmed:false});h.clearDraft();assert.equal(h.saved,'synthetic-original');
  assert.equal(h.editsRef.current.size,1);assert.equal(h.version,2);assert.equal(h.status,null);
});
test('a pending autosave cannot recreate a cleared draft',()=>{
  const h=harness();Object.assign(h,{data:{},note:'',authorGitHub:'',targetSide:'mixed',evidence:'',confidence:'medium',makePatch:()=>({runs:[]}),useEffect:callback=>callback()});
  vm.runInContext(ts.transpileModule(autosaveSource,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,h);
  assert.equal(typeof h.pendingSave,'function');h.clearDraft();h.pendingSave();assert.equal(h.saved,null);
});
