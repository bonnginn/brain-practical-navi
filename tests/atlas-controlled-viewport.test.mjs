import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
const require=createRequire(import.meta.url),ts=require('typescript');
const file=ts.createSourceFile('AtlasVolumeCanvas.tsx',readFileSync(new URL('../app/AtlasVolumeCanvas.tsx',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
assert.equal(file.parseDiagnostics.length,0);
const refs=[],effects=[];
function visit(node){
  if(ts.isVariableDeclaration(node)&&['sliceResetContext','viewResetContext'].includes(node.name.getText(file)))refs.push(node.getText(file));
  if(ts.isCallExpression(node)&&node.expression.getText(file)==='useEffect'&&node.arguments[0]&&/ResetContext\.current/.test(node.arguments[0].getText(file)))effects.push(node.arguments[0].getText(file));
  ts.forEachChild(node,visit);
}
visit(file);assert.equal(refs.length,2);assert.equal(effects.length,2);
const executable=ts.transpileModule(refs.map(value=>'const '+value+';').join('\n')+'\nglobalThis.effects=['+effects.join(',')+'];', {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
function harness(overrides={}){
  const calls=[],ctx={kind:'slice',plane:'coronal',contrast:'bigbrain',preserveSliceView:false,preserveControlledViewOnMount:true,sharedZoom:1.2,sharedPan:{x:24,y:-12},viewResetKey:'section:4',useRef:value=>({current:value}),...overrides};
  ctx.setZoom=value=>{calls.push('zoom');ctx.sharedZoom=value};
  ctx.setPan=value=>{calls.push('pan');ctx.sharedPan={x:value.x,y:value.y}};
  vm.createContext(ctx);vm.runInContext(executable,ctx);
  return {ctx,calls,run:()=>ctx.effects.forEach(effect=>effect())};
}
test('opt-in controlled observation remount retains framing, including repeated mount effect setup',()=>{
  const h=harness();h.run();h.run();
  assert.equal(h.ctx.sharedZoom,1.2);assert.deepEqual(h.ctx.sharedPan,{x:24,y:-12});assert.equal(h.calls.length,0);
});
test('ordinary views and incomplete controlled values still reset on mount',()=>{
  for(const overrides of [{preserveControlledViewOnMount:false},{sharedPan:undefined},{sharedZoom:undefined}]){
    const h=harness(overrides);h.run();
    assert.equal(h.ctx.sharedZoom,1);assert.deepEqual(h.ctx.sharedPan,{x:0,y:0});assert.ok(h.calls.length>0);
  }
});
test('opt-in mounting does not suppress later plane, contrast or explicit reset changes',()=>{
  const h=harness();h.run();
  for(const change of [()=>h.ctx.plane='horizontal',()=>h.ctx.contrast='t1',()=>h.ctx.viewResetKey='section:5']){
    h.ctx.sharedZoom=1.5;h.ctx.sharedPan={x:-30,y:44};change();h.run();
    assert.equal(h.ctx.sharedZoom,1);assert.deepEqual(h.ctx.sharedPan,{x:0,y:0});
  }
});
test('existing resumable exercises preserve slice context while honoring an explicit reset',()=>{
  const h=harness({preserveSliceView:true,preserveControlledViewOnMount:false,viewResetKey:undefined});h.run();h.ctx.plane='sagittal';h.ctx.contrast='t1';h.run();
  assert.equal(h.ctx.sharedZoom,1.2);assert.deepEqual(h.ctx.sharedPan,{x:24,y:-12});
  h.ctx.viewResetKey='exercise:1';h.run();assert.equal(h.ctx.sharedZoom,1);assert.deepEqual(h.ctx.sharedPan,{x:0,y:0});
});
