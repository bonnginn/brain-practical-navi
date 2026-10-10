import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import {copyReviewObservation} from '../src/reviewObservation.mjs';
import {identificationReviewQuestions} from '../src/observationPractice.mjs';
import {PAPEZ_STEPS} from '../src/pathwayStepper.mjs';
import {papezInlineViewportForContext} from '../src/papezInlineViewport.mjs';
const require=createRequire(import.meta.url);
const ts=require('typescript');
const page=ts.createSourceFile('page.tsx',readFileSync(new URL('../app/page.tsx',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const names=new Set(['restoreSurfaceObservation','openMainReview','captureRelatedObservation','startRelatedReview','returnFromRelatedReview','reviewQuizQuestion','startQuiz','returnFromThemeReview','isSurfaceQuiz','isNeurovascularQuiz','restoreRelatedObservation','openRelatedCircuit','returnFromRelatedCircuit','openWorkspace','startCircuitReview','returnFromCircuitReview','returnFromCircuitSection','returnToQuiz','observeCircuitStage','captureSectionObservation','startIdentificationReview','captureCircuitView','restoreCircuitView','storedObservation','restoredObservation','resumeCircuit']);
const functions=new Map(),selectors=new Map();
function visit(node){
  if(ts.isFunctionDeclaration(node)&&names.has(node.name?.text))functions.set(node.name.text,node.getText(page));
  if(ts.isVariableDeclaration(node)&&['sectionRelatedQuestions','surfaceRelatedQuestions'].includes(node.name.getText(page)))selectors.set(node.name.getText(page),node.initializer.getText(page));
  ts.forEachChild(node,visit);
}
visit(page);
assert.equal(functions.size,names.size);
const executable=ts.transpileModule([...functions.values()].join('\n')+'\nglobalThis.api={'+[...names].join(',')+'};',{
  compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS},
}).outputText;

function harness(overrides={}){
  const actions=[],ctx={
    copyReviewObservation,identificationReviewQuestions,papezInlineViewportForContext,
    surfaceInspectionOrigin:{current:null},quizSaveActive:{current:false},quizSaveContextPending:{current:false},captureCurrentSectionReader:()=>null,scheduleReadingRestore(){},sectionObservationSaveActive:{current:false},sectionStructureReaders:{current:{}},

    workspace:'sections',plane:'sagittal',position:61,
    sectionPositions:{current:{coronal:42,horizontal:55,sagittal:61}},
    selectedStructure:'hippocampus',visibleStructures:['hippocampus','ventricle'],labels:false,
    sectionLayout:'both',sectionModelViews:2,sectionModelShare:45,sectionModelZoom:1.6,
    sectionAtlasZoom:1,sectionAtlasPan:{x:0,y:0},
    contrast:'bigbrain',rotation:{x:8,y:32,z:5},sectionSearch:'海馬',activeStudyTheme:null,circuitSectionOrigin:'papez',
    surfaceView:'lateral',surfaceVisibleRegions:['precentral','postcentral'],surfaceVisibleLandmarks:['central-sulcus'],
    surfaceVisibleDeepLandmarks:[],surfaceVisibleBasalLandmarks:[],surfaceCerebellum:true,surfaceVessels:false,
    surfaceNerves:false,surfaceGhost:false,surfacePonsMedulla:true,freeHemisphere:'both',
    freeSelections:['region:precentral'],freeFocusedKey:'region:precentral',freeInspector:'structures',
    selectedPathway:null,circuitNodeKey:null,visualObservationIndex:null,basalStepperIndex:0,papezStepperIndex:0,
    circuitViewZoom:1,circuitViewPan:{x:0,y:0},circuitPulse:false,papezSliceViewport:null,
    circuitSurfaceSnapshot:{current:null},circuitSectionSnapshot:{current:null},circuitReadingMemory:{current:{}},
    findReturnSnapshot:{current:null},findCircuitReturn:{current:null},freeWorkspaceSnapshot:{current:null},freeSectionSnapshot:{current:null},lastCircuitKey:{current:'papez'},
    exploration:{record:{current:{circuit:null}}},sectionStudyThemes:[],
    circuitSectionsOpen:false,surfaceStudyOpen:true,freeSearch:'中心',compactSectionLayout:false,phoneMode:false,webglUnavailable:false,
    quizStudyLabel:null,relatedReviewOrigin:null,quizQueue:[],quizChoice:null,quizIndex:0,quizScore:0,
    sectionViewVersion:0,quizCandidates:[],quizActualCount:10,englishEdition:false,themeReviewQuestions:[],
    relatedCircuitOrigin:null,quizCircuit:null,quizObservationTitle:null,brodmannActive:false,blockSpecimen:'ventricle',
    overlayOriginRef:{current:null},homeRotation:{x:0,y:0},blockInitialRotations:{ventricle:{x:0,y:0}},
    stopBlockGuided(){},transitionBlockContextState(){},updateScreenHistory(){},workspaceHash:key=>'#workspace/'+key,
    sectionInitialRotationForPlane:()=>({x:0,y:0}),circuitGuideRef:{current:null},circuitReturnFocus:{current:null},HTMLElement:class {},
    PAPEZ_STEPS,visualSections:[null,null,null,{key:'thalamus',position:46}],
    circuitReviewQuestions:[{target:'hippocampus',category:'limbic',plane:'coronal',position:45}],
    window:{location:{hash:''},history:{pushState(){}},requestAnimationFrame(){}},
    structures:{hippocampus:{name:'海馬',latin:'Hippocampus'},thalamus:{name:'視床',latin:'Thalamus'}},
    surfaceRegions:{precentral:{name:'中心前回',latin:'Precentral gyrus'}},
    surfaceViews:{lateral:{rotation:{x:0,y:0,z:0}},free:{rotation:{x:0,y:0,z:0}}},
    anatomyDisplayEnglish:value=>value,shuffledQuestions:questions=>[...questions],
    requestAnimationFrame(){actions.push('schedule-focus')},
    document:{getElementById:()=>null,querySelector:()=>null},
    sectionStageRef:{current:null},
    ...overrides,
  };
  const mapping={
    setSurfaceInspectionKey:'surfaceInspectionKey',setSurfaceInspectionOrigin:'surfaceInspectionOrigin',setReadingRestoreActive:'readingRestoreActive',setFindStartTask:'findStartTask',setFindObservationRotation:'findObservationRotation',setRelatedReviewOrigin:'relatedReviewOrigin',setRelatedCircuitOrigin:'relatedCircuitOrigin',setQuizStudyLabel:'quizStudyLabel',setQuizQueue:'quizQueue',
    setReviewMenu:'reviewMenu',setFindMode:'findMode',setQuizThemeOrigin:'quizThemeOrigin',setQuizCircuit:'quizCircuit',
    setQuizObservationTitle:'quizObservationTitle',setPlaying:'playing',setIdentified:'identified',setContrast:'contrast',
    setLabels:'labels',setVisibleStructures:'visibleStructures',setActiveStudyTheme:'activeStudyTheme',
    setSectionLayout:'sectionLayout',setSectionModelViews:'sectionModelViews',setSectionModelShare:'sectionModelShare',
    setSectionModelZoom:'sectionModelZoom',setSectionSearch:'sectionSearch',setCircuitSectionOrigin:'circuitSectionOrigin',
    setSectionAtlasZoom:'sectionAtlasZoom',setSectionAtlasPan:'sectionAtlasPan',
    setRotation:'rotation',setSurfaceVisibleRegions:'surfaceVisibleRegions',setSurfaceVisibleLandmarks:'surfaceVisibleLandmarks',
    setSurfaceVisibleDeepLandmarks:'surfaceVisibleDeepLandmarks',setSurfaceVisibleBasalLandmarks:'surfaceVisibleBasalLandmarks',
    setSurfaceCerebellum:'surfaceCerebellum',setSurfaceVessels:'surfaceVessels',setSurfaceNerves:'surfaceNerves',
    setSurfaceGhost:'surfaceGhost',setSurfacePonsMedulla:'surfacePonsMedulla',setFreeHemisphere:'freeHemisphere',
    setFreeSelections:'freeSelections',setFreeFocusedKey:'freeFocusedKey',setFreeInspector:'freeInspector',
    setSelectedPathway:'selectedPathway',setCircuitNodeKey:'circuitNodeKey',setVisualObservationIndex:'visualObservationIndex',
    setBasalStepperIndex:'basalStepperIndex',setPapezStepperIndex:'papezStepperIndex',setPapezSliceViewport:'papezSliceViewport',
    setCircuitSectionsOpen:'circuitSectionsOpen',setSurfaceStudyOpen:'surfaceStudyOpen',setFreeSearch:'freeSearch',
    setSectionViewVersion:'sectionViewVersion',setQuizStatsOpen:'quizStatsOpen',
    setDetailsOpen:'detailsOpen',setSurfaceLessonKey:'surfaceLessonKey',setPhoneSettingsOpen:'phoneSettingsOpen',
    setHelpOpen:'helpOpen',setFeedbackOpen:'feedbackOpen',setLegalOpen:'legalOpen',setSourcesOpen:'sourcesOpen',
    setStatusOpen:'statusOpen',setModelStrategyComparisonOpen:'modelStrategyComparisonOpen',setBlockContextDrag:'blockContextDrag',
    setBlockViewPreset:'blockViewPreset',setWorkspace:'workspace',setBrodmannActive:'brodmannActive',
    setCircuitViewZoom:'circuitViewZoom',setCircuitViewPan:'circuitViewPan',setCircuitPulse:'circuitPulse',
  };
  for(const [setter,key] of Object.entries(mapping))ctx[setter]=value=>{actions.push(setter);ctx[key]=typeof value==='function'?value(ctx[key]):value};
  ctx.applyPathwayPreset=key=>{actions.push('pathway:'+key);ctx.selectedPathway=key;ctx.freeInspector='circuits';ctx.freeSelections=[...ctx.freeSelections,'deep:thalami'];ctx.surfaceGhost=true};
  ctx.chooseSurface=view=>{actions.push('surface:'+view);ctx.surfaceView=view;ctx.rotation={x:0,y:0};ctx.surfaceVisibleRegions=[];ctx.surfaceVisibleLandmarks=[]};
  ctx.jump=(plane,position)=>{actions.push('jump');ctx.plane=plane;ctx.position=position;ctx.rotation={x:0,y:0}};
  ctx.focusStructure=target=>{actions.push('focus:'+target);ctx.selectedStructure=target};
  ctx.resetQuiz=()=>{actions.push('reset-quiz');ctx.quizIndex=0;ctx.quizChoice=null;ctx.quizScore=0};
  vm.createContext(ctx);vm.runInContext(executable,ctx);
  return {ctx,actions,api:ctx.api};
}

test('section explanation -> related question observation -> original observation keeps quiz progress',()=>{
  const h=harness(),original=h.api.captureRelatedObservation();
  const question={target:'hippocampus',category:'limbic',plane:'coronal',position:45};
  h.api.startRelatedReview([question],'海馬',original);
  h.ctx.quizChoice='hippocampus';h.ctx.quizScore=1;h.ctx.quizIndex=2;
  h.api.reviewQuizQuestion(question);
  assert.equal(h.ctx.plane,'coronal');assert.equal(h.ctx.position,45);
  h.api.returnFromRelatedReview();
  const restored=h.api.captureRelatedObservation();
  assert.deepEqual(restored,original);
  assert.equal(h.ctx.quizChoice,'hippocampus');assert.equal(h.ctx.quizScore,1);assert.equal(h.ctx.quizIndex,2);
  assert.equal(h.ctx.quizQueue[0],question);
  assert.equal(h.actions.filter(action=>action==='reset-quiz').length,1);
});
test('surface explanation -> answer observation -> original view restores comparisons and rotation',()=>{
  const h=harness({workspace:'surface',rotation:{x:12,y:-45,z:3}});
  const original=h.api.captureRelatedObservation();
  const question={target:'precentral',category:'surface',view:'lateral'};
  h.api.startRelatedReview([question],'中心前回',original);
  h.api.reviewQuizQuestion(question);
  assert.deepEqual(Array.from(h.ctx.surfaceVisibleRegions),['precentral']);
  h.api.returnFromRelatedReview();
  assert.deepEqual(h.api.captureRelatedObservation(),original);
});
test('a narrow-display return keeps target and slice while choosing the slice layout',()=>{
  const h=harness(),original=h.api.captureRelatedObservation();
  h.api.startRelatedReview([{target:'hippocampus'}],'海馬',original);
  h.ctx.compactSectionLayout=true;h.ctx.plane='coronal';h.ctx.position=30;h.ctx.selectedStructure='thalamus';
  h.api.returnFromRelatedReview();
  assert.equal(h.ctx.selectedStructure,'hippocampus');assert.equal(h.ctx.plane,'sagittal');assert.equal(h.ctx.position,61);
  assert.equal(h.ctx.sectionLayout,'slice');
});
test('empty related-question data leaves observation usable without switching into an empty quiz',()=>{
  const h=harness(),original=h.api.captureRelatedObservation();
  h.api.startRelatedReview([],'未収録',original);
  assert.equal(h.ctx.workspace,'sections');assert.equal(h.ctx.relatedReviewOrigin,null);
  assert.equal(h.actions.length,0);
});
test('new generic review clears an earlier structure-specific return context',()=>{const h=harness();h.api.startRelatedReview([{target:'hippocampus'}],'海馬',h.api.captureRelatedObservation());h.api.startQuiz();assert.equal(h.ctx.relatedReviewOrigin,null);});
for(const mode of ['desktop','narrow','english'])test('stored legacy CSF theme review '+mode+' restores the full observation without resetting answers',()=>{
  const theme={key:'csf-route',ja:{name:'第三脳室から第四脳室への通路'},en:{name:'Third-to-fourth ventricular route'},members:['ventricle','thirdVentricle','aqueductPartial','fourthVentricle']};
  const question={target:'ventricle',category:'ventricles',plane:'horizontal',position:51};
  const h=harness({activeStudyTheme:theme,themeReviewQuestions:[question],circuitSectionOrigin:null,
    plane:'sagittal',position:50,sectionPositions:{current:{coronal:42,horizontal:55,sagittal:50}},
    selectedStructure:'thirdVentricle',visibleStructures:[...theme.members],sectionSearch:'脳室',
    rotation:{x:-7,y:37,z:0},sectionAtlasZoom:1.44,sectionAtlasPan:{x:24,y:-19},
    sectionModelViews:2,sectionModelShare:55,sectionModelZoom:1.8,englishEdition:mode==='english',
    structures:{ventricle:{name:'側脳室',latin:'Lateral ventricle'},thirdVentricle:{name:'第三脳室',latin:'Third ventricle'}}});
  const original=h.api.captureSectionObservation();
  h.ctx.quizThemeOrigin=original;h.ctx.relatedReviewOrigin=null;h.ctx.quizStudyLabel=theme[mode==='english'?'en':'ja'].name;h.ctx.quizQueue=[question];
  assert.deepEqual(JSON.parse(JSON.stringify(h.ctx.quizThemeOrigin)),JSON.parse(JSON.stringify(original)));
  assert.equal(h.ctx.relatedReviewOrigin,null,'theme has its own single return action');
  assert.equal(h.ctx.quizStudyLabel,theme[mode==='english'?'en':'ja'].name);
  assert.deepEqual(Array.from(h.ctx.quizQueue),[question]);
  h.ctx.visibleStructures.push('hippocampus');h.ctx.sectionPositions.current.coronal=19;
  h.ctx.quizChoice='ventricle';h.ctx.quizScore=1;h.ctx.quizIndex=0;
  h.api.reviewQuizQuestion(question);
  h.ctx.sectionAtlasZoom=.9;h.ctx.sectionAtlasPan={x:-90,y:200};h.ctx.sectionModelViews=1;
  h.ctx.sectionModelShare=35;h.ctx.sectionModelZoom=.8;h.ctx.sectionSearch='';
  if(mode==='narrow')h.ctx.compactSectionLayout=true;
  h.api.returnFromThemeReview();
  assert.deepEqual(h.api.captureSectionObservation(),mode==='narrow'?{...original,layout:'slice'}:original);
  assert.equal(h.ctx.quizObservationTitle,theme[mode==='english'?'en':'ja'].name);
  assert.equal(h.ctx.quizChoice,'ventricle');assert.equal(h.ctx.quizScore,1);assert.equal(h.ctx.quizIndex,0);
  assert.deepEqual(Array.from(h.ctx.quizQueue),[question]);
  assert.equal(h.actions.filter(action=>action==='reset-quiz').length,0);
});
test('actual explanation selectors keep the observed target and teaching surface distinct',()=>{
  const h=harness({allQuizQuestions:[
    {target:'hippocampus',category:'limbic'},{target:'caudate',category:'basal'},
    {target:'precentral',category:'surface'},{target:'cn3',category:'neurovascular'},
  ],surfaceLessonKey:'precentral'});
  for(const [name,expression] of selectors){
    const code=ts.transpileModule('globalThis.selectedQuestions='+expression+';',{
      compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS},
    }).outputText;
    vm.runInContext(code,h.ctx);
    assert.deepEqual(Array.from(h.ctx.selectedQuestions,question=>question.target),[name==='sectionRelatedQuestions'?'hippocampus':'precentral']);
  }
});


test('section explanation -> related circuit -> original observation restores the teaching context',()=>{
  const h=harness({circuitSectionOrigin:null,quizObservationTitle:'海馬の問題'});
  const original=h.api.captureRelatedObservation();
  h.api.openRelatedCircuit('papez');
  assert.equal(h.ctx.workspace,'circuits');assert.equal(h.ctx.selectedPathway,'papez');
  assert.equal(h.ctx.quizObservationTitle,null);
  assert.equal(h.ctx.relatedCircuitOrigin.title.ja,'海馬');
  h.ctx.rotation={x:40,y:100};h.ctx.visibleStructures=['thalamus'];
  h.api.returnFromRelatedCircuit();
  assert.deepEqual(h.api.captureRelatedObservation(),original);
  assert.equal(h.ctx.quizObservationTitle,'海馬の問題');
  assert.equal(h.ctx.relatedCircuitOrigin,null);
  assert.equal(h.actions.filter(action=>action==='reset-quiz').length,0);
});

test('surface -> circuit review -> answer observation -> circuit -> original preserves comparisons and answers',()=>{
  const h=harness({workspace:'surface',surfaceLessonKey:'precentral',circuitSectionOrigin:null});
  const original=h.api.captureRelatedObservation();
  h.api.openRelatedCircuit('basal-ganglia');
  h.api.startCircuitReview();
  h.ctx.quizChoice='hippocampus';h.ctx.quizScore=1;h.ctx.quizIndex=2;
  h.api.reviewQuizQuestion(h.ctx.quizQueue[0]);
  assert.equal(h.ctx.workspace,'sections');assert.ok(h.ctx.relatedCircuitOrigin);
  h.api.returnToQuiz();
  assert.equal(h.ctx.workspace,'quiz');assert.ok(h.ctx.relatedCircuitOrigin);
  h.api.returnFromCircuitReview();
  assert.equal(h.ctx.selectedPathway,'basal-ganglia');assert.ok(h.ctx.relatedCircuitOrigin);
  h.api.returnFromRelatedCircuit();
  assert.deepEqual(h.api.captureRelatedObservation(),original);
  assert.equal(h.ctx.quizChoice,'hippocampus');assert.equal(h.ctx.quizScore,1);assert.equal(h.ctx.quizIndex,2);
  assert.equal(h.actions.filter(action=>action==='reset-quiz').length,1);
});

test('circuit specimen and another related link keep the first observation rather than an intermediate slice',()=>{
  const h=harness({circuitSectionOrigin:null}),original=h.api.captureRelatedObservation();
  h.api.openRelatedCircuit('visual');
  h.api.observeCircuitStage(3);
  assert.equal(h.ctx.workspace,'sections');assert.equal(h.ctx.circuitSectionOrigin,'visual');
  assert.equal(h.ctx.selectedStructure,'thalamus');assert.equal(h.ctx.position,46);
  h.api.openRelatedCircuit('basal-ganglia');
  assert.deepEqual(h.ctx.relatedCircuitOrigin.observation,original);
  h.api.openWorkspace('sections',true);h.ctx.circuitSectionOrigin='basal-ganglia';
  h.api.returnFromCircuitSection();
  assert.equal(h.ctx.selectedPathway,'basal-ganglia');
  h.api.returnFromRelatedCircuit();
  assert.deepEqual(h.api.captureRelatedObservation(),original);
});

test('independent workspace or a new generic quiz discards a previous circuit return',()=>{
  const h=harness();
  h.api.openRelatedCircuit('papez');h.api.openWorkspace('home');
  assert.equal(h.ctx.relatedCircuitOrigin,null);
  h.ctx.workspace='sections';h.api.openRelatedCircuit('papez');h.api.startQuiz();
  assert.equal(h.ctx.relatedCircuitOrigin,null);
});

test('circuit return without an origin is inert, and narrow display keeps the original target and slice',()=>{
  const h=harness();
  h.api.returnFromRelatedCircuit();assert.equal(h.actions.length,0);
  h.api.openRelatedCircuit('papez');h.ctx.phoneMode=true;
  h.api.returnFromRelatedCircuit();
  assert.equal(h.ctx.workspace,'sections');assert.equal(h.ctx.selectedStructure,'hippocampus');
  assert.equal(h.ctx.plane,'sagittal');assert.equal(h.ctx.position,61);assert.equal(h.ctx.sectionLayout,'slice');
});


test('a structure review within circuit observation returns through the circuit to the original observation',()=>{
  const h=harness({circuitSectionOrigin:null}),original=h.api.captureRelatedObservation();
  h.api.openRelatedCircuit('visual');h.api.observeCircuitStage(3);
  const intermediate=h.api.captureRelatedObservation();
  h.api.startRelatedReview([{target:'thalamus',category:'thalamus',plane:'horizontal',position:49}],'視床',intermediate);
  h.ctx.quizChoice='thalamus';h.ctx.quizScore=1;
  h.api.reviewQuizQuestion(h.ctx.quizQueue[0]);
  h.api.returnFromRelatedReview();
  assert.deepEqual(h.api.captureRelatedObservation(),intermediate);
  h.api.returnFromCircuitSection();h.api.returnFromRelatedCircuit();
  assert.deepEqual(h.api.captureRelatedObservation(),original);
  assert.equal(h.ctx.quizChoice,'thalamus');assert.equal(h.ctx.quizScore,1);
});


test('identification -> exact target quiz -> question observation -> actual identification slice keeps answers',()=>{
  const question={target:'thalamus',category:'thalamus',plane:'coronal',position:45};
  const h=harness({workspace:'quiz',allQuizQuestions:[question,{target:'hippocampus',category:'limbic'}],
    findMode:true,findStartTask:{key:'hippocampus'},findObservationRotation:{x:12,y:40},
    quizThemeOrigin:{old:true},quizCircuit:'papez',quizObservationTitle:'別の問題',
    relatedCircuitOrigin:{observation:{workspace:'surface'},title:{ja:'以前',en:'Earlier'},quizTitle:null},
  });
  const task={kind:'section',key:'thalamus',name:'視床',englishName:'Thalamus'};
  const view={plane:'horizontal',position:72,rotation:{x:11,y:20,z:2}};
  h.api.startIdentificationReview(task,view);
  assert.deepEqual(Array.from(h.ctx.quizQueue),[question]);
  assert.equal(h.ctx.quizStudyLabel,'視床');assert.equal(h.ctx.findMode,false);
  for(const field of ['quizThemeOrigin','quizCircuit','quizObservationTitle','relatedCircuitOrigin','findStartTask','findObservationRotation'])assert.equal(h.ctx[field],null,field);
  view.rotation.y=99;
  h.ctx.quizChoice='thalamus';h.ctx.quizScore=1;h.ctx.quizIndex=1;
  h.api.reviewQuizQuestion(question);h.api.returnFromRelatedReview();
  assert.equal(h.ctx.workspace,'sections');assert.equal(h.ctx.selectedStructure,'thalamus');
  assert.equal(h.ctx.plane,'horizontal');assert.equal(h.ctx.position,72);
  assert.equal(h.ctx.rotation.y,20);assert.deepEqual(Array.from(h.ctx.visibleStructures),['thalamus']);
  assert.equal(h.ctx.labels,true);assert.equal(h.ctx.activeStudyTheme,null);assert.equal(h.ctx.circuitSectionOrigin,null);
  assert.equal(h.ctx.quizChoice,'thalamus');assert.equal(h.ctx.quizScore,1);assert.equal(h.ctx.quizIndex,1);
  assert.equal(h.actions.filter(action=>action==='reset-quiz').length,1);
  for(const mismatch of ['target','circuit']){
    const other=harness({circuitSectionOrigin:null,allQuizQuestions:[question]});
    other.api.openRelatedCircuit('visual');other.api.observeCircuitStage(3,true,'lgn');
    const specimen=other.api.captureSectionObservation();
    if(mismatch==='target')specimen.target='hippocampus';
    other.ctx.findReturnSnapshot.current=specimen;
    other.ctx.findCircuitReturn.current={key:mismatch==='circuit'?'papez':'visual',origin:other.ctx.relatedCircuitOrigin};
    other.ctx.workspace='quiz';other.ctx.findMode=true;
    other.api.startIdentificationReview(task,{plane:'horizontal',position:72,rotation:{x:11,y:20,z:2}});
    assert.equal(other.ctx.relatedCircuitOrigin,null,mismatch);
    other.api.returnFromRelatedReview();
    assert.equal(other.ctx.selectedStructure,'thalamus',mismatch);
    assert.equal(other.ctx.circuitSectionOrigin,null,mismatch);
  }
});

for(const reloaded of [false,true])test('identification review '+(reloaded?'with reconstructed return references':'from a live circuit section')+' returns through its circuit to the original observation',()=>{
  const question={target:'thalamus',category:'thalamus',plane:'coronal',position:45};
  const task={kind:'section',key:'thalamus',name:'Thalamus',englishName:'Thalamus'};
  const live=harness({circuitSectionOrigin:null,allQuizQuestions:[question],
    sectionAtlasZoom:1.8,sectionAtlasPan:{x:31,y:-19}});
  const original=live.api.captureRelatedObservation();
  live.api.openRelatedCircuit('visual');
  live.ctx.rotation={x:20,y:-30,z:2};live.ctx.circuitViewZoom=1.75;live.ctx.circuitViewPan={x:-16,y:22};
  const model=live.api.captureCircuitView();
  live.api.observeCircuitStage(3,true,'lgn');
  live.ctx.sectionAtlasZoom=2.2;live.ctx.sectionAtlasPan={x:-42,y:18};
  const specimen=live.api.captureSectionObservation();
  const linked={key:'visual',origin:structuredClone(live.ctx.relatedCircuitOrigin)};
  const h=reloaded?harness({workspace:'quiz',allQuizQuestions:[question],findMode:true,
    findReturnSnapshot:{current:structuredClone(specimen)},findCircuitReturn:{current:linked},
    circuitSurfaceSnapshot:{current:structuredClone(model)},relatedCircuitOrigin:null}):live;
  if(!reloaded){
    h.ctx.findReturnSnapshot.current=specimen;h.ctx.findCircuitReturn.current=linked;
    h.ctx.workspace='quiz';h.ctx.findMode=true;
  }
  const view={plane:'horizontal',position:72,rotation:{x:11,y:20,z:2},zoom:2.6,pan:{x:-17,y:24}};
  h.api.startIdentificationReview(task,view);
  assert.deepEqual(h.ctx.relatedCircuitOrigin.observation,original);
  assert.equal(h.ctx.relatedReviewOrigin.circuitOrigin,'visual');
  view.rotation.y=99;view.pan.x=999;
  h.ctx.quizChoice='thalamus';h.ctx.quizScore=1;h.ctx.quizIndex=1;
  h.api.reviewQuizQuestion(question);
  h.ctx.sectionAtlasZoom=.9;h.ctx.sectionAtlasPan={x:200,y:-100};
  h.api.returnFromRelatedReview();
  assert.equal(h.ctx.workspace,'sections');assert.equal(h.ctx.selectedStructure,'thalamus');
  assert.equal(h.ctx.plane,'horizontal');assert.equal(h.ctx.position,72);assert.equal(h.ctx.rotation.y,20);
  assert.equal(h.ctx.circuitSectionOrigin,'visual');
  assert.equal(h.ctx.sectionAtlasZoom,2.6);
  assert.deepEqual(JSON.parse(JSON.stringify(h.ctx.sectionAtlasPan)),{x:-17,y:24});
  assert.deepEqual(h.ctx.relatedCircuitOrigin.observation,original);
  h.api.returnFromCircuitSection();
  assert.deepEqual(JSON.parse(JSON.stringify(h.api.captureCircuitView())),JSON.parse(JSON.stringify(model)));
  h.api.returnFromRelatedCircuit();
  assert.deepEqual(h.api.captureRelatedObservation(),original);
  assert.equal(h.ctx.sectionAtlasZoom,1.8);assert.deepEqual(JSON.parse(JSON.stringify(h.ctx.sectionAtlasPan)),{x:31,y:-19});
  assert.equal(h.ctx.quizChoice,'thalamus');assert.equal(h.ctx.quizScore,1);assert.equal(h.ctx.quizIndex,1);
  assert.equal(h.actions.filter(action=>action==='reset-quiz').length,1);
});

test('a legacy section return without optional slice viewport fields restores a fresh viewport',()=>{
  const h=harness({sectionAtlasZoom:1.8,sectionAtlasPan:{x:31,y:-19}});
  const legacy=h.api.captureRelatedObservation();delete legacy.sliceZoom;delete legacy.pan;
  h.api.restoreRelatedObservation(legacy,null);
  const {sliceZoom,pan,...restored}=h.api.captureRelatedObservation();
  assert.equal(sliceZoom,1);assert.deepEqual(pan,{x:0,y:0});
  assert.deepEqual(restored,legacy);
});

test('unrecorded or unsupported identification leaves the exercise and previous state usable',()=>{
  const h=harness({workspace:'quiz',findMode:true,quizChoice:'previous',allQuizQuestions:[{target:'thalamus',category:'thalamus'}]});
  const view={plane:'coronal',position:40,rotation:{x:0,y:0}};
  for(const task of [
    {kind:'section',key:'aqueductPartial'},{kind:'surface',key:'thalamus'},{kind:'neurovascular',key:'thalamus'},
  ])h.api.startIdentificationReview(task,view);
  assert.equal(h.actions.length,0);assert.equal(h.ctx.findMode,true);assert.equal(h.ctx.quizChoice,'previous');
});

test('English identification review returns to its current slice in a narrow display',()=>{
  const h=harness({workspace:'quiz',englishEdition:true,phoneMode:true,allQuizQuestions:[{target:'thalamus',category:'thalamus'}]});
  h.api.startIdentificationReview({kind:'section',key:'thalamus',name:'視床',englishName:'Thalamus'},{plane:'sagittal',position:0,rotation:{x:0,y:10}});
  assert.equal(h.ctx.quizStudyLabel,'Thalamus');
  h.api.returnFromRelatedReview();
  assert.equal(h.ctx.position,0);assert.equal(h.ctx.plane,'sagittal');assert.equal(h.ctx.sectionLayout,'slice');
});

test('the identification review action is confined to an answered section and passes the actual observation',()=>{
  const file=ts.createSourceFile('FindStructureExercise.tsx',readFileSync(new URL('../app/FindStructureExercise.tsx',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  assert.equal(file.parseDiagnostics.length,0);
  const buttons=[];
  function walk(node){
    if(ts.isJsxElement(node)&&node.openingElement.tagName.getText(file)==='button'){
      const click=node.openingElement.attributes.properties.find(p=>ts.isJsxAttribute(p)&&p.name.getText(file)==='onClick');
      if(click?.initializer?.getText(file).includes('onReview'))buttons.push(node);
    }
    ts.forEachChild(node,walk);
  }
  walk(file);assert.equal(buttons.length,1);
  let answered=false,section=false,recorded=false;
  for(let node=buttons[0].parent;node;node=node.parent){
    if(ts.isBinaryExpression(node)&&node.operatorToken.kind===ts.SyntaxKind.AmpersandAmpersandToken){
      answered||=node.left.getText(file)==='revealed';
      section||=node.left.getText(file).includes("task.kind==='section'");
    }
    if(ts.isConditionalExpression(node))recorded||=node.condition.getText(file)==='reviewCount>0';
  }
  assert.ok(answered&&section&&recorded,'only the answered section with recorded questions exposes the action');
  const click=buttons[0].openingElement.attributes.properties.find(p=>ts.isJsxAttribute(p)&&p.name.getText(file)==='onClick');
  const observation={plane:'horizontal',position:72,rotation:{x:11,y:20,z:2},zoom:2.6,pan:{x:-17,y:24}},calls=[];
  const invoke=vm.runInNewContext('('+click.initializer.expression.getText(file)+')',{...observation,onReview:value=>calls.push(value)});
  invoke();assert.equal(calls.length,1);assert.deepEqual(JSON.parse(JSON.stringify(calls[0])),observation);
  assert.ok(buttons[0].getText(file).includes('disabled={answerAbsentFromSlice}'));
});

test('circuit specimen return keeps its captured pose and zoom separate from the first observation',()=>{
  const h=harness({circuitSectionOrigin:null}),original=h.api.captureRelatedObservation();
  h.api.openRelatedCircuit('visual');
  const rotation={x:26,y:87,z:-4},pan={x:31,y:-19};
  h.ctx.rotation=rotation;h.ctx.circuitViewZoom=2.15;h.ctx.circuitViewPan=pan;
  h.ctx.freeHemisphere='left';h.ctx.freeSelections=['deep:thalami','region:precentral'];
  h.ctx.freeFocusedKey='deep:thalami';h.ctx.surfaceGhost=false;
  const model=h.api.captureCircuitView();
  h.api.observeCircuitStage(3,true,'lgn');
  assert.equal(h.ctx.workspace,'sections');assert.equal(h.ctx.circuitSectionOrigin,'visual');
  assert.deepEqual(h.ctx.circuitSurfaceSnapshot.current,model);
  assert.notEqual(h.ctx.circuitSurfaceSnapshot.current.rotation,rotation);
  assert.notEqual(h.ctx.circuitSurfaceSnapshot.current.pan,pan);
  rotation.y=170;pan.x=300;
  h.ctx.rotation={x:-45,y:-60};h.ctx.circuitViewZoom=.8;h.ctx.circuitViewPan={x:-90,y:20};
  h.ctx.playing=true;h.ctx.circuitPulse=true;
  h.api.returnFromCircuitSection();
  assert.equal(h.ctx.workspace,'circuits');assert.equal(h.ctx.surfaceView,'free');
  assert.equal(h.ctx.rotation.y,87);assert.equal(h.ctx.circuitViewZoom,2.15);assert.equal(h.ctx.circuitViewPan.x,31);
  assert.deepEqual(h.api.captureCircuitView(),model);
  assert.equal(h.ctx.playing,false);assert.equal(h.ctx.circuitPulse,false);
  assert.deepEqual(h.ctx.relatedCircuitOrigin.observation,original);
  h.api.returnFromRelatedCircuit();
  assert.deepEqual(h.api.captureRelatedObservation(),original);
  assert.equal(h.actions.filter(action=>action==='reset-quiz').length,0);
});

test('circuit review returns to its saved model pose without resetting answers or the original return',()=>{
  const h=harness({circuitSectionOrigin:null}),original=h.api.captureRelatedObservation();
  h.api.openRelatedCircuit('visual');
  h.ctx.rotation={x:18,y:-73,z:6};h.ctx.circuitViewZoom=1.95;h.ctx.circuitViewPan={x:-24,y:42};
  const model=h.api.captureCircuitView();
  h.api.observeCircuitStage(3,true,'lgn');h.api.returnFromCircuitSection();
  h.api.startCircuitReview();
  h.ctx.quizChoice='hippocampus';h.ctx.quizScore=1;h.ctx.quizIndex=2;
  h.api.reviewQuizQuestion(h.ctx.quizQueue[0]);
  h.ctx.circuitViewZoom=.75;h.ctx.circuitViewPan={x:100,y:200};h.ctx.rotation={x:0,y:0};
  h.api.returnFromCircuitReview();
  assert.deepEqual(h.api.captureCircuitView(),model);
  assert.deepEqual(h.ctx.relatedCircuitOrigin.observation,original);
  assert.equal(h.ctx.quizChoice,'hippocampus');assert.equal(h.ctx.quizScore,1);assert.equal(h.ctx.quizIndex,2);
  h.api.returnFromRelatedCircuit();
  assert.deepEqual(h.api.captureRelatedObservation(),original);
  assert.equal(h.actions.filter(action=>action==='reset-quiz').length,1);
});

for(const section of [false,true])test('saved circuit '+(section?'section':'model')+' resume keeps its earlier observation and distinct model view',()=>{
  const h=harness({circuitSectionOrigin:null}),original=h.api.captureRelatedObservation();
  h.api.openRelatedCircuit('visual');
  h.ctx.rotation={x:-21,y:112,z:7};h.ctx.circuitViewZoom=2.05;h.ctx.circuitViewPan={x:48,y:-27};
  const model=h.api.captureCircuitView();
  h.api.observeCircuitStage(3,true,'lgn');
  const specimen=h.api.captureRelatedObservation();
  const readings={'visual|right-field-left-eye|3|lgn':{scroll:94,openDetails:[0,2]}};
  h.ctx.exploration.record.current.circuit={
    selected:'visual',readings,view:model,section:h.api.storedObservation(specimen),returnTo:h.api.storedObservation(original),
  };
  h.ctx.workspace='home';h.ctx.relatedCircuitOrigin=null;h.ctx.rotation={x:0,y:0};
  h.ctx.circuitViewZoom=1;h.ctx.circuitViewPan={x:0,y:0};
  h.api.resumeCircuit(section);
  assert.deepEqual(h.api.storedObservation(h.ctx.relatedCircuitOrigin.observation),h.api.storedObservation(original));
  assert.equal(h.ctx.selectedPathway,'visual');assert.equal(h.ctx.freeInspector,'circuits');
  assert.equal(h.ctx.circuitReadingMemory.current,readings);
  assert.deepEqual(h.ctx.circuitSurfaceSnapshot.current,model);
  if(section){
    assert.deepEqual(h.api.captureRelatedObservation(),specimen);
    assert.equal(h.ctx.circuitSectionOrigin,'visual');
    h.api.returnFromCircuitSection();
  }else{
    assert.equal(h.ctx.workspace,'circuits');assert.equal(h.ctx.surfaceView,'free');
  }
  assert.deepEqual(h.api.captureCircuitView(),model);
  h.api.returnFromRelatedCircuit();
  assert.deepEqual(h.api.captureRelatedObservation(),original);
  assert.equal(h.actions.filter(action=>action==='reset-quiz').length,0);
});

test('main review captures the current observation and returns without clearing answers',()=>{const h=harness({circuitSectionOrigin:null,reviewMenu:true});const original=h.api.captureRelatedObservation();h.api.openMainReview();assert.equal(h.ctx.workspace,'quiz');h.ctx.quizChoice='hippocampus';h.ctx.quizScore=1;h.api.returnFromRelatedReview();assert.deepEqual(h.api.captureRelatedObservation(),original);assert.equal(h.ctx.quizChoice,'hippocampus');assert.equal(h.ctx.quizScore,1);assert.equal(h.actions.filter(x=>x==='reset-quiz').length,0)});
