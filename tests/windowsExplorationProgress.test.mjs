import test from 'node:test';
import assert from 'node:assert/strict';
import {CIRCUIT_TEACHING} from '../src/circuitTeaching.mjs';
import {findTaskSignature,readFindProgress,readCircuitProgress} from '../src/explorationProgress.mjs';
import {WINDOWS_EXPLORATION_PROGRESS_KEY as KEY,readWindowsExplorationProgress,readWindowsObservationSnapshot,serializeWindowsExplorationProgress,writeWindowsExplorationProgress,preserveAndWriteWindowsExplorationProgress} from '../src/windowsExplorationProgress.mjs';

const task={key:'thalamus',kind:'section',plane:'coronal',position:52,rotation:{x:0,y:0,z:0},hemisphere:'both',medial:false,overlay:'none',highlight:{ids:[3]}};
const registry={revision:'mask-revision',contentRevision:'windows-content',findTasks:[task],circuits:CIRCUIT_TEACHING,freeKeys:['region:precentral'],basalCount:4,papezCount:5,visualCount:5,structureKeys:['thalamus','caudate'],themeKeys:['ventricles'],surfaceViews:['free','lateral','medial'],regionKeys:['precentral'],landmarkKeys:['central-sulcus'],deepLandmarkKeys:['thalami'],basalLandmarkKeys:['pons']};
const section=()=>({workspace:'sections',plane:'coronal',position:52,positions:{coronal:52,horizontal:45,sagittal:49},target:'thalamus',visible:['caudate'],labels:true,layout:'both',views:1,share:40,zoom:1,contrast:'bigbrain',rotation:{x:0,y:5},search:'student query',themeKey:'ventricles',circuitOrigin:null,sliceZoom:1.5,pan:{x:5,y:8},mobilePane:'guide'});
const surface=()=>({workspace:'surface',view:'free',rotation:{x:4,y:8,z:0},regions:['precentral'],landmarks:['central-sulcus'],deepLandmarks:['thalami'],basalLandmarks:['pons'],flags:{cerebellum:false,vessels:false,nerves:false,ghost:true,pons:true},free:{hemisphere:'left',selected:['region:precentral'],focused:'region:precentral',inspector:'circuits',pathway:'papez',node:'hippocampus',visualIndex:null,basalIndex:0,papezIndex:1,circuitSectionsOpen:false},studyOpen:true,search:'query',zoom:1.2,pan:{x:3,y:4},mobilePane:'view'});
const practice=()=>({taskKey:task.key,signature:findTaskSignature(task),start:{plane:'horizontal',position:45},state:{stage:'hint',answerChecked:false,plane:'horizontal',position:46,rotation:{x:1,y:2},zoom:1.5,pan:{x:5,y:8},guess:{x:40,y:60},reading:{scroll:120,openDetails:[0]}},returnTo:section()});
const circuit=()=>({selected:'papez',inspector:'circuits',positions:{papez:{pathKey:'loop',nodeIndex:8,nodeKey:'hippocampus'}},readings:{'papez|loop|8|hippocampus':{scroll:250,openDetails:[0,2]}},view:{rotation:{x:2,y:8},zoom:1,pan:{x:0,y:0},hemisphere:'both',mobilePane:'guide',freeSelections:['region:precentral'],freeFocused:'region:precentral',ghost:true,cerebellum:false,vessels:false,nerves:false,ponsMedulla:true,sectionsOpen:false,basalStep:1,papezStep:2,visualIndex:null},sectionOrigin:null,section:section(),returnTo:null});
const data=()=>({version:1,revision:registry.revision,contentRevision:registry.contentRevision,practice:practice(),circuit:circuit()});
const parse=value=>readWindowsExplorationProgress(JSON.stringify(value),registry);
class Store {
  constructor(entries=[]){this.values=new Map(entries);this.writes=[];}
  getItem(key){return this.values.get(key)??null;}
  setItem(key,value){this.writes.push([key,value]);this.values.set(key,value);}
}

test('separate key cannot collide with quiz history or Mac whole-learning records',()=>{
  assert.equal(KEY,'brain-practical-navigator:windows-exploration:v1');
  const legacy='brain-practical-learning-progress-v1',store=new Store([[legacy,'old raw'],['quizHistory','answers']]);
  const raw=serializeWindowsExplorationProgress(data(),registry);
  assert.equal(writeWindowsExplorationProgress(store,null,raw,registry).status,'saved');
  assert.equal(store.getItem(legacy),'old raw');assert.equal(store.getItem('quizHistory'),'answers');
  assert.deepEqual(store.writes.map(([key])=>key),[KEY]);
});
test('hint, marker, pose, independent circuit occurrence and section origin roundtrip',()=>{
  const raw=serializeWindowsExplorationProgress(data(),registry),got=readWindowsExplorationProgress(raw,registry);
  assert.equal(got.status,'valid');assert.equal(got.value.practice.state.stage,'hint');assert.equal(got.value.practice.state.answerChecked,false);
  assert.deepEqual(got.value.practice.state.guess,{x:40,y:60});assert.equal(got.value.practice.state.position,46);
  assert.equal(got.value.circuit.positions.papez.nodeIndex,8);assert.equal(got.value.circuit.section.position,52);
  assert.equal(got.value.practice.returnTo.themeKey,'ventricles');assert.deepEqual(got.value.practice.returnTo.visible,['caudate']);
  assert.equal(got.value.practice.returnTo.sliceZoom,1.5);assert.deepEqual(got.value.practice.returnTo.pan,{x:5,y:8});
  assert.equal(got.value.circuit.section.sliceZoom,1.5);assert.deepEqual(got.value.circuit.section.pan,{x:5,y:8});
});
test('surface return uses current stable IDs and independent selected structures',()=>{
  const value=data();value.practice.returnTo=surface();const got=parse(value);
  assert.equal(got.status,'valid');assert.equal(got.value.practice.returnTo.view,'free');
  assert.equal(got.value.practice.returnTo.free.node,'hippocampus');assert.deepEqual(got.value.practice.returnTo.free.selected,['region:precentral']);
  assert.equal(got.value.practice.returnTo.zoom,1.2);assert.deepEqual(got.value.practice.returnTo.pan,{x:3,y:4});
});
test('authored prose, stored answer scores and arbitrary extra objects are omitted',()=>{
  const value=data();value.practice.state.score=999;value.practice.state.rotation.medicalProse='bad';value.circuit.view.prose='bad';value.practice.returnTo.theme={name:'Injected'};value.practice.returnTo.answer='bad';value.extra={score:999};
  const raw=serializeWindowsExplorationProgress(value,registry),saved=JSON.parse(raw);
  assert.equal(saved.practice.returnTo.search,'student query');assert.ok(!Object.hasOwn(saved.practice.returnTo,'theme'));assert.ok(!Object.hasOwn(saved.practice.returnTo,'answer'));
  assert.ok(!Object.hasOwn(saved.practice.state,'score'));assert.ok(!Object.hasOwn(saved.practice.state.rotation,'medicalProse'));assert.ok(!Object.hasOwn(saved.circuit.view,'prose'));assert.ok(!Object.hasOwn(saved,'extra'));
});
test('deep copies protect canonical saved state from caller mutations',()=>{
  const value=data(),got=parse(value).value;
  value.practice.state.reading.openDetails.push(1);value.practice.returnTo.positions.coronal=20;value.circuit.positions.papez.nodeIndex=0;value.circuit.readings['papez|loop|8|hippocampus'].openDetails.push(3);value.circuit.view.freeSelections.push('other');
  assert.deepEqual(got.practice.state.reading.openDetails,[0]);assert.equal(got.practice.returnTo.positions.coronal,52);assert.equal(got.circuit.positions.papez.nodeIndex,8);assert.deepEqual(got.circuit.readings['papez|loop|8|hippocampus'].openDetails,[0,2]);assert.deepEqual(got.circuit.view.freeSelections,['region:precentral']);
});
test('writer stores only normalized IDs and pose even when directly given extra prose',()=>{
  const value=data();value.practice.answer='Injected answer';value.circuit.medicalProse='Injected medical text';value.practice.returnTo.theme={name:'Injected name'};
  const store=new Store(),result=writeWindowsExplorationProgress(store,null,JSON.stringify(value),registry);
  assert.equal(result.status,'saved');assert.equal(result.raw,store.getItem(KEY));
  const saved=JSON.parse(result.raw);assert.ok(!Object.hasOwn(saved.practice,'answer'));assert.ok(!Object.hasOwn(saved.circuit,'medicalProse'));assert.ok(!Object.hasOwn(saved.practice.returnTo,'theme'));assert.equal(saved.practice.returnTo.search,'student query');
});
test('search and hint states cannot silently gain a revealed answer',()=>{
  for(const stage of ['search','hint','answer'])for(const checked of [false,true]){const value=data();value.practice.state.stage=stage;value.practice.state.answerChecked=checked;assert.equal(parse(value).status,(stage==='answer')===checked?'valid':'unrestorable');}
});
test('unknown task and changed authored signature reject whole envelope',()=>{
  for(const change of [value=>value.practice.taskKey='deleted',value=>value.practice.signature='old']){const value=data();change(value);assert.equal(parse(value).status,'unrestorable');assert.equal(serializeWindowsExplorationProgress(value,registry),null);}
  const changed={...registry,findTasks:[{...task,highlight:{ids:[9]}}]};assert.equal(readWindowsExplorationProgress(JSON.stringify(data()),changed).status,'unrestorable');
});
test('all required envelopes and explicit return/null snapshots must be present',()=>{
  for(const change of [value=>delete value.practice,value=>delete value.circuit,value=>delete value.practice.returnTo,value=>delete value.circuit.section,value=>delete value.circuit.returnTo]){const value=data();change(value);assert.equal(parse(value).status,'unrestorable');}
  const value=data();value.practice.returnTo=null;value.circuit.section=null;assert.equal(parse(value).status,'valid');
  value.practice=null;value.circuit=null;assert.equal(parse(value).status,'valid');
});
test('original task observation and later circuit section remain separate across restoration',()=>{
  const value=data();value.circuit.returnTo=section();value.circuit.returnTo.themeKey='ventricles';value.circuit.returnTo.target='thalamus';value.circuit.returnTo.search='CSF task search';
  value.circuit.section=section();value.circuit.section.themeKey=null;value.circuit.section.target='caudate';value.circuit.section.position=61;value.circuit.section.positions.coronal=61;value.circuit.section.circuitOrigin='papez';value.circuit.sectionOrigin='papez';
  const got=parse(value);assert.equal(got.status,'valid');assert.equal(got.value.circuit.returnTo.target,'thalamus');assert.equal(got.value.circuit.returnTo.themeKey,'ventricles');assert.equal(got.value.circuit.returnTo.search,'CSF task search');assert.equal(got.value.circuit.returnTo.position,52);
  assert.equal(got.value.circuit.section.target,'caudate');assert.equal(got.value.circuit.section.themeKey,null);assert.equal(got.value.circuit.section.position,61);
  value.circuit.returnTo.visible.push('thalamus');assert.deepEqual(got.value.circuit.returnTo.visible,['caudate']);assert.deepEqual(got.value.circuit.section.visible,['caudate']);
});
test('circuit return may be a surface observation while opened section remains independent',()=>{
  const value=data();value.circuit.returnTo=surface();value.circuit.sectionOrigin='papez';const got=parse(value);
  assert.equal(got.status,'valid');assert.equal(got.value.circuit.returnTo.workspace,'surface');assert.equal(got.value.circuit.section.workspace,'sections');
  value.circuit.returnTo.free.node='removed';assert.equal(parse(value).status,'unrestorable');
});
test('bounded local search restores but excessive or non-string values cannot be stored',()=>{
  const value=data();value.practice.returnTo.search='x'.repeat(5000);assert.equal(parse(value).status,'valid');
  value.practice.returnTo.search+='x';assert.equal(parse(value).status,'unrestorable');value.practice.returnTo.search={prose:'invalid'};assert.equal(parse(value).status,'unrestorable');
});
test('section circuit return must belong to selected circuit and have a section snapshot',()=>{
  const value=data();value.circuit.sectionOrigin='papez';assert.equal(parse(value).status,'valid');
  value.circuit.section=null;assert.equal(parse(value).status,'unrestorable');value.circuit.section=surface();assert.equal(parse(value).status,'unrestorable');
  value.circuit.section=section();value.circuit.sectionOrigin='visual';assert.equal(parse(value).status,'unrestorable');
});
test('old structure/theme/view/selection IDs never reach renderer state',()=>{
  for(const change of [snapshot=>snapshot.target='deleted',snapshot=>snapshot.visible=['deleted'],snapshot=>snapshot.visible=['caudate','caudate'],snapshot=>snapshot.themeKey='deleted',snapshot=>snapshot.circuitOrigin='deleted']){const value=data();change(value.practice.returnTo);assert.equal(parse(value).status,'unrestorable');}
  for(const change of [snapshot=>snapshot.view='deleted',snapshot=>snapshot.regions=['deleted'],snapshot=>snapshot.landmarks=['deleted'],snapshot=>snapshot.deepLandmarks=['deleted'],snapshot=>snapshot.basalLandmarks=['deleted'],snapshot=>snapshot.free.selected=['deleted'],snapshot=>snapshot.free.focused='deleted',snapshot=>snapshot.free.pathway='deleted',snapshot=>snapshot.free.node='deleted',snapshot=>snapshot.free.pathway=null]){const value=data();value.practice.returnTo=surface();change(value.practice.returnTo);assert.equal(parse(value).status,'unrestorable');}
});
test('finite values, matching plane positions and renderer bounds are enforced',()=>{
  for(const change of [snapshot=>snapshot.position=101,snapshot=>snapshot.positions.coronal=51,snapshot=>snapshot.rotation.x=Infinity,snapshot=>snapshot.zoom=2.401,snapshot=>snapshot.sliceZoom=.7,snapshot=>snapshot.share=76,snapshot=>snapshot.pan.y=1e7,snapshot=>snapshot.mobilePane='old',snapshot=>snapshot.labels='true']){const value=data();change(value.practice.returnTo);assert.equal(parse(value).status,'unrestorable');}
  for(const change of [snapshot=>snapshot.free.basalIndex=4,snapshot=>snapshot.free.papezIndex=5,snapshot=>snapshot.free.visualIndex=5,snapshot=>snapshot.zoom=.69,snapshot=>snapshot.flags.ghost=1]){const value=data();value.practice.returnTo=surface();change(value.practice.returnTo);assert.equal(parse(value).status,'unrestorable');}
  for(const zoom of [.7,2.4]){const snapshot=section();snapshot.zoom=zoom;assert.ok(readWindowsObservationSnapshot(snapshot,registry));}
});
test('corrupt, oversize, wrong version and revision records preserve exact raw bytes',()=>{
  const cases=[['{bad','invalid'],['x'.repeat(250001),'invalid'],[JSON.stringify({...data(),version:99}),'version-mismatch'],[JSON.stringify({...data(),revision:'old'}),'revision-mismatch'],[JSON.stringify({...data(),contentRevision:'Mac-content'}),'revision-mismatch'],[JSON.stringify({...data(),practice:{...practice(),taskKey:'old'}}),'unrestorable']];
  const next=serializeWindowsExplorationProgress(data(),registry);
  for(const [raw,status] of cases){const store=new Store([[KEY,raw]]);assert.equal(readWindowsExplorationProgress(raw,registry).status,status);assert.equal(writeWindowsExplorationProgress(store,raw,next,registry).status,status);assert.equal(store.getItem(KEY),raw);assert.equal(store.writes.length,0);}
});
test('compare-and-swap protects another tab and rejects malformed new records',()=>{
  const raw=serializeWindowsExplorationProgress(data(),registry),store=new Store([[KEY,raw]]);
  assert.equal(writeWindowsExplorationProgress(store,'stale',raw,registry).status,'conflict');assert.equal(store.writes.length,0);
  assert.equal(writeWindowsExplorationProgress(store,raw,'{bad',registry).status,'invalid');assert.equal(store.getItem(KEY),raw);assert.equal(store.writes.length,0);
  const next=data();next.practice.state.stage='search';const encoded=serializeWindowsExplorationProgress(next,registry);assert.equal(writeWindowsExplorationProgress(store,raw,encoded,registry).status,'saved');assert.equal(store.getItem(KEY),encoded);
});
test('quota, unavailable and write-verification failures are visible without erasing originals',()=>{
  const raw=serializeWindowsExplorationProgress(data(),registry),store=new Store([[KEY,raw]]);
  store.setItem=()=>{throw Error('QuotaExceededError');};assert.equal(writeWindowsExplorationProgress(store,raw,raw,registry).status,'unavailable');assert.equal(store.getItem(KEY),raw);
  const unavailable={getItem(){throw Error('Unavailable');},setItem(){throw Error('No');}};assert.equal(writeWindowsExplorationProgress(unavailable,null,raw,registry).status,'unavailable');
  const dropped=new Store();dropped.setItem=()=>{};assert.equal(writeWindowsExplorationProgress(dropped,null,raw,registry).status,'unavailable');assert.equal(dropped.getItem(KEY),null);
});
test('canonical occurrence indices distinguish repeated hippocampus and reject numeric aliases',()=>{
  const value=data();value.circuit.readings['papez|loop|0|hippocampus']={scroll:10,openDetails:[]};const got=parse(value);assert.equal(got.status,'valid');assert.equal(got.value.circuit.positions.papez.nodeIndex,8);assert.equal(got.value.circuit.readings['papez|loop|0|hippocampus'].scroll,10);assert.equal(got.value.circuit.readings['papez|loop|8|hippocampus'].scroll,250);
  value.circuit.readings['papez|loop|08|hippocampus']={scroll:50,openDetails:[]};assert.equal(parse(value).status,'unrestorable');
});
test('every authored circuit/path/node occurrence roundtrips through Windows envelope',()=>{
  let occurrences=0;
  for(const [key,c] of Object.entries(CIRCUIT_TEACHING))for(const path of c.paths)for(let index=0;index<path.nodes.length;index++){
    const saved={selected:key,inspector:'circuits',positions:{[key]:{pathKey:path.key,nodeIndex:index,nodeKey:path.nodes[index]}},readings:{[`${key}|${path.key}|${index}|${path.nodes[index]}`]:{scroll:index*10,openDetails:[]}},view:null,sectionOrigin:null,section:null,returnTo:null};
    const raw=serializeWindowsExplorationProgress({practice:null,circuit:saved},registry),got=readWindowsExplorationProgress(raw,registry);
    assert.equal(got.status,'valid',`${key}/${path.key}/${index}`);assert.deepEqual(got.value.circuit.positions,saved.positions);occurrences++;
  }
  assert.ok(occurrences>30);
});
test('standalone malformed inputs return null rather than invoking renderer paths',()=>{
  for(const value of [undefined,null,[],5,'string',{}, {selected:'papez',inspector:'circuits',positions:{toString:{pathKey:'x',nodeIndex:0,nodeKey:'x'}}}]){assert.equal(readFindProgress(value,[task]),null);assert.equal(readCircuitProgress(value,registry),null);}
  assert.equal(readFindProgress(practice(),undefined),null);assert.equal(readCircuitProgress(circuit(),undefined),null);assert.equal(findTaskSignature(undefined),'');
  for(const key of ['basalCount','papezCount']){const missing={...registry};delete missing[key];assert.equal(readCircuitProgress(circuit(),missing),null);}
});

test('Papez inline framing roundtrips in the Windows record independently of other viewports',()=>{
  const extended={...registry,papezSectionPlanes:['coronal','coronal','horizontal','coronal',null]},value=data();
  value.circuit.view.papezSlice={step:2,plane:'horizontal',zoom:1.44,pan:{x:28.8,y:-14.4}};
  const raw=serializeWindowsExplorationProgress(value,extended),got=readWindowsExplorationProgress(raw,extended);
  assert.equal(got.status,'valid');assert.deepEqual(got.value.circuit.view.papezSlice,value.circuit.view.papezSlice);
  assert.equal(got.value.circuit.view.zoom,1);assert.deepEqual(got.value.circuit.view.pan,{x:0,y:0});
  assert.equal(got.value.circuit.section.sliceZoom,1.5);assert.deepEqual(got.value.circuit.section.pan,{x:5,y:8});
  value.circuit.view.papezSlice.pan.x=999;assert.equal(got.value.circuit.view.papezSlice.pan.x,28.8);
});

test('invalid Papez inline framing preserves the old raw record without a storage write',()=>{
  const extended={...registry,papezSectionPlanes:['coronal','coronal','horizontal','coronal',null]},valid=data();
  valid.circuit.view.papezSlice={step:2,plane:'horizontal',zoom:1.44,pan:{x:28.8,y:-14.4}};
  const next=serializeWindowsExplorationProgress(valid,extended);
  for(const change of [slice=>slice.step=1,slice=>slice.plane='coronal',slice=>slice.zoom=5.01,slice=>slice.pan.x=1000001]){
    const value=data();value.circuit.view.papezSlice={step:2,plane:'horizontal',zoom:1.44,pan:{x:28.8,y:-14.4}};change(value.circuit.view.papezSlice);
    const raw=JSON.stringify(value),store=new Store([[KEY,raw]]);
    assert.equal(readWindowsExplorationProgress(raw,extended).status,'unrestorable');
    assert.equal(writeWindowsExplorationProgress(store,raw,next,extended).status,'unrestorable');
    assert.equal(store.getItem(KEY),raw);assert.equal(store.writes.length,0);
  }
});

test('optional section reader restores only bounded UI state and deep-copies opened details',()=>{
const value=section();value.reading={inspectorOpen:false,inspectorScroll:320,inspectorDetails:[0,2],themeOpen:true,themeOffset:80};const read=readWindowsObservationSnapshot(value,registry);assert.deepEqual(read.reading,value.reading);value.reading.inspectorDetails.push(3);assert.deepEqual(read.reading.inspectorDetails,[0,2]);for(const invalid of [{...read.reading,inspectorScroll:-1},{...read.reading,inspectorDetails:[0,0]},{...read.reading,inspectorOpen:'yes'},{...read.reading,themeOffset:Infinity}])assert.equal(readWindowsObservationSnapshot({...value,reading:invalid},registry),null);
});

test('standalone observation survives next practice/circuit save without invented content',()=>{const value=data();value.observation={...section(),reading:{inspectorOpen:true,inspectorScroll:120,inspectorDetails:[0],themeOpen:true,themeOffset:null},prose:'not stored'};const saved=JSON.parse(serializeWindowsExplorationProgress(value,registry));assert.equal(saved.observation.reading.inspectorScroll,120);assert.ok(!Object.hasOwn(saved.observation,'prose'));assert.equal(saved.practice.taskKey,task.key);assert.equal(saved.circuit.selected,'papez');assert.equal(parse({...value,observation:surface()}).status,'unrestorable');});

test('explicit recovery preserves exact old/current bytes and keeps unrelated keys',()=>{
 const old='{"old":"unrestorable"}',loaded='loaded older raw',store=new Store([[KEY,old],['quizHistory','untouched']]),raw=serializeWindowsExplorationProgress(data(),registry),archiveKey=KEY+':preserved:test';
 assert.equal(writeWindowsExplorationProgress(store,old,raw,registry).status,'version-mismatch');
 const result=preserveAndWriteWindowsExplorationProgress(store,raw,registry,[loaded],archiveKey);assert.equal(result.status,'saved');assert.equal(readWindowsExplorationProgress(store.getItem(KEY),registry).status,'valid');assert.deepEqual(JSON.parse(store.getItem(archiveKey)).records.map(x=>x.raw),[loaded,old]);assert.equal(store.getItem('quizHistory'),'untouched');assert.equal(writeWindowsExplorationProgress(store,result.raw,raw,registry).status,'saved');
});
test('failed archive readback or quota never replaces original',()=>{
 for(const failure of ['quota','readback']){const store=new Store([[KEY,'original']]);store.setItem=function(key,value){if(key!==KEY){if(failure==='quota')throw Error('quota');this.values.set(key,'refused');}else throw Error('must not write primary');};assert.equal(preserveAndWriteWindowsExplorationProgress(store,serializeWindowsExplorationProgress(data(),registry),registry,[],KEY+':preserved:test').status,'unavailable');assert.equal(store.getItem(KEY),'original');}
});
test('concurrent change after archival is retained instead of overwritten',()=>{
 const store=new Store([[KEY,'old']]);store.setItem=function(key,value){this.values.set(key,value);if(key!==KEY)this.values.set(KEY,'another-tab');};const result=preserveAndWriteWindowsExplorationProgress(store,serializeWindowsExplorationProgress(data(),registry),registry,[],KEY+':preserved:test');assert.equal(result.status,'conflict');assert.equal(store.getItem(KEY),'another-tab');assert.equal(JSON.parse(store.getItem(KEY+':preserved:test')).records[0].raw,'old');
});
test('invalid new snapshot or existing archive key cannot destroy stored records',()=>{
 const store=new Store([[KEY,'old'],[KEY+':preserved:test','existing']]);assert.equal(preserveAndWriteWindowsExplorationProgress(store,'bad',registry).status,'unrestorable');assert.equal(preserveAndWriteWindowsExplorationProgress(store,serializeWindowsExplorationProgress(data(),registry),registry,[],KEY+':preserved:test').status,'unavailable');assert.equal(store.getItem(KEY),'old');assert.equal(store.getItem(KEY+':preserved:test'),'existing');assert.equal(store.writes.length,0);
});

test('identical failed primary retries reuse one verified archive and return every original',()=>{
 const store=new Store([[KEY,'current']]),raw=serializeWindowsExplorationProgress(data(),registry),base=store.setItem.bind(store);store.setItem=(key,value)=>{if(key===KEY)throw Error('primary quota');base(key,value);};
 for(let i=0;i<3;i++)assert.equal(preserveAndWriteWindowsExplorationProgress(store,raw,registry,['loaded','previous']).status,'unavailable');
 assert.equal([...store.values.keys()].filter(k=>k.includes(':preserved:')).length,1);assert.equal(store.writes.length,1);assert.equal(store.getItem(KEY),'current');
 store.setItem=base;const result=preserveAndWriteWindowsExplorationProgress(store,raw,registry,['loaded','previous']);assert.equal(result.status,'saved');assert.deepEqual(result.records.map(r=>r.raw),['loaded','previous','current']);assert.equal([...store.values.keys()].filter(k=>k.includes(':preserved:')).length,1);
});
test('recovery with no originals saves without creating an empty archive',()=>{const store=new Store(),result=preserveAndWriteWindowsExplorationProgress(store,serializeWindowsExplorationProgress(data(),registry),registry);assert.equal(result.status,'saved');assert.equal(result.archiveKey,undefined);assert.deepEqual(result.records,[]);assert.equal(store.writes.length,1);});
