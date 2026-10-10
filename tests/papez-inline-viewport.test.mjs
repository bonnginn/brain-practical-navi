import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {CIRCUIT_TEACHING} from '../src/circuitTeaching.mjs';
import {PAPEZ_STEPS} from '../src/pathwayStepper.mjs';
import {readCircuitProgress} from '../src/explorationProgress.mjs';
import {papezInlineViewportForContext,updatePapezInlineViewport} from '../src/papezInlineViewport.mjs';

const registry={circuits:CIRCUIT_TEACHING,freeKeys:[],basalCount:7,papezCount:PAPEZ_STEPS.length,papezSectionPlanes:PAPEZ_STEPS.map(step=>step.plane??null),visualCount:6};
const progress=()=>({selected:'papez',inspector:'circuits',positions:{papez:{pathKey:'loop',nodeIndex:8,nodeKey:'hippocampus'}},readings:{'papez|loop|8|hippocampus':{scroll:250,openDetails:[0]}},view:{rotation:{x:2,y:8},zoom:1.2,pan:{x:-17,y:24},hemisphere:'both',mobilePane:'guide',freeSelections:[],freeFocused:null,ghost:true,cerebellum:false,vessels:false,nerves:false,ponsMedulla:true,sectionsOpen:true,basalStep:0,papezStep:0,visualIndex:null},sectionOrigin:null});
const framing=()=>({step:0,plane:PAPEZ_STEPS[0].plane,zoom:1.44,pan:{x:28.8,y:-14.4}});

test('same Papez observation restores inline framing independently of the circuit 3D view',()=>{
  const saved=progress();saved.view.papezSlice=framing();
  const got=readCircuitProgress(saved,registry);
  assert.ok(got);assert.equal(got.positions.papez.nodeIndex,8);assert.equal(got.view.sectionsOpen,true);
  assert.deepEqual(papezInlineViewportForContext(got.view.papezSlice,0,PAPEZ_STEPS[0].plane),framing());
  assert.equal(got.view.zoom,1.2);assert.deepEqual(got.view.pan,{x:-17,y:24});
  saved.view.papezSlice.pan.x=900;assert.equal(got.view.papezSlice.pan.x,28.8);
  const displayed=papezInlineViewportForContext(got.view.papezSlice,0,PAPEZ_STEPS[0].plane);
  displayed.pan.y=800;assert.equal(got.view.papezSlice.pan.y,-14.4);
});

test('functional zoom and pan updates use the inline framing and copy caller coordinates',()=>{
  const saved=framing(),nextPan={x:31,y:-19};
  const zoomed=updatePapezInlineViewport(saved,0,PAPEZ_STEPS[0].plane,{zoom:previous=>previous*1.2});
  assert.ok(Math.abs(zoomed.zoom-1.728)<1e-12);assert.deepEqual(zoomed.pan,saved.pan);
  const moved=updatePapezInlineViewport(zoomed,0,PAPEZ_STEPS[0].plane,{pan:previous=>({x:previous.x+2,y:previous.y-3})});
  assert.deepEqual(moved.pan,{x:30.8,y:-17.4});assert.deepEqual(saved,framing());
  const assigned=updatePapezInlineViewport(moved,0,PAPEZ_STEPS[0].plane,{pan:nextPan});
  nextPan.x=999;assert.deepEqual(assigned.pan,{x:31,y:-19});
});

test('a different observation resets framing even on the same plane and on return to an old step',()=>{
  const saved=framing();
  assert.equal(PAPEZ_STEPS[1].plane,PAPEZ_STEPS[0].plane);
  assert.deepEqual(papezInlineViewportForContext(saved,1,PAPEZ_STEPS[1].plane),{step:1,plane:PAPEZ_STEPS[1].plane,zoom:1,pan:{x:0,y:0}});
  assert.notEqual(PAPEZ_STEPS[2].plane,PAPEZ_STEPS[0].plane);
  const switched=updatePapezInlineViewport(saved,2,PAPEZ_STEPS[2].plane,{zoom:previous=>previous*1.2});
  assert.deepEqual(switched,{step:2,plane:PAPEZ_STEPS[2].plane,zoom:1.2,pan:{x:0,y:0}});
  assert.deepEqual(papezInlineViewportForContext(switched,0,PAPEZ_STEPS[0].plane),{step:0,plane:PAPEZ_STEPS[0].plane,zoom:1,pan:{x:0,y:0}});
});

test('old circuit records retain their exact normalized shape and default inline framing',()=>{
  const saved=progress(),legacyRegistry={...registry};delete legacyRegistry.papezSectionPlanes;
  const got=readCircuitProgress(saved,legacyRegistry);
  assert.deepEqual(got,saved);assert.equal(Object.hasOwn(got.view,'papezSlice'),false);
  assert.deepEqual(papezInlineViewportForContext(got.view.papezSlice,0,PAPEZ_STEPS[0].plane),{step:0,plane:PAPEZ_STEPS[0].plane,zoom:1,pan:{x:0,y:0}});
});

test('stored inline framing must match the authored current observation and renderer bounds',()=>{
  const mutations=[slice=>slice.step=1,slice=>slice.plane='horizontal',slice=>slice.zoom=.74,slice=>slice.zoom=5.01,slice=>slice.zoom=Infinity,slice=>slice.pan.x=1000001,slice=>slice.pan.y=NaN];
  for(const mutate of mutations){const saved=progress();saved.view.papezSlice=framing();mutate(saved.view.papezSlice);assert.equal(readCircuitProgress(saved,registry),null);}
  const atlasStep=PAPEZ_STEPS.findIndex(step=>!step.plane),saved=progress();
  assert.ok(atlasStep>=0);saved.view.papezStep=atlasStep;saved.view.papezSlice={...framing(),step:atlasStep};
  assert.equal(readCircuitProgress(saved,registry),null);
  const missing={...registry};delete missing.papezSectionPlanes;const current=progress();current.view.papezSlice=framing();
  assert.equal(readCircuitProgress(current,missing),null);
  for(const zoom of [.75,5]){current.view.papezSlice.zoom=zoom;assert.ok(readCircuitProgress(current,registry));}
});

test('actual Papez zoom callback evaluates anchored-pan updates before its state merge',()=>{
  const source=ts.createSourceFile('page.tsx',fs.readFileSync(new URL('../app/page.tsx',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  let inline;
  function visit(node){
    if(ts.isJsxSelfClosingElement(node)&&node.tagName.getText(source)==='AtlasVolumeCanvas'&&node.attributes.properties.some(prop=>ts.isJsxAttribute(prop)&&prop.name.getText(source)==='viewResetKey'&&prop.initializer?.getText(source).includes('papez-slice:')))inline=node;
    ts.forEachChild(node,visit);
  }
  visit(source);assert.ok(inline,'authored Papez inline canvas must exist');
  let current=framing(),insideUpdater=false;
  const context={papezInlineView:framing(),papezStepperIndex:0,papezStepperStep:PAPEZ_STEPS[0],updatePapezInlineViewport,setPapezSliceViewport(update){assert.equal(insideUpdater,false,'canvas callbacks must not nest an update of the same state');insideUpdater=true;try{current=typeof update==='function'?update(current):update;}finally{insideUpdater=false;}}};
  function callback(name){
    const prop=inline.attributes.properties.find(prop=>ts.isJsxAttribute(prop)&&prop.name.getText(source)===name);
    assert.ok(prop&&ts.isJsxExpression(prop.initializer)&&prop.initializer.expression);
    const js=ts.transpileModule(`const callback=${prop.initializer.expression.getText(source)};`,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText;
    return vm.runInNewContext(`(function(){${js}\nreturn callback;})()`,context);
  }
  const onZoom=callback('onZoomChange'),onPan=callback('onPanChange');
  onZoom(previous=>{onPan({x:31,y:-19});return previous*1.2;});
  assert.ok(Math.abs(current.zoom-1.728)<1e-12);assert.deepEqual(current.pan,{x:31,y:-19});
  assert.equal(current.step,0);assert.equal(current.plane,PAPEZ_STEPS[0].plane);
});
