import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import {anatomyDisplayEnglish} from '../src/anatomyDisplayEnglish.mjs';
const ts=createRequire(import.meta.url)('typescript');
function declaration(file,name){
  const text=readFileSync(new URL('../'+file,import.meta.url),'utf8');
  const ast=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  for(const statement of ast.statements){
    if(ts.isVariableStatement(statement)&&statement.declarationList.declarations.some(item=>item.name.getText(ast)===name))return statement.getText(ast).replace(/^export\s+/,'');
  }
  throw new Error('Missing declaration: '+name);
}
function bank(existing=['precentral','superiorTemporal','superiorFrontal','precuneus','cuneus','fusiform']){
  const names=[['src/surfaceObservationGuides.ts','surfaceObservationGuides'],['src/surfaceRegionLessons.ts','surfaceRegionLessons'],['app/page.tsx','surfaceRegions'],['app/page.tsx','surfaceViews'],['app/page.tsx','additionalSurfaceFindTasks']];
  const source=names.map(([file,name])=>declaration(file,name)).join('\n')+'\n globalThis.data={tasks:additionalSurfaceFindTasks,guides:surfaceObservationGuides,regions:surfaceRegions,views:surfaceViews,lessons:surfaceRegionLessons};';
  const context={anatomyDisplayEnglish,quizFindStructureTasks:existing.map(key=>({key,kind:'surface'}))};
  vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText,context);
  return JSON.parse(JSON.stringify(context.data));
}
test('all existing surface-guide self-check targets have an identification task without duplicate views',()=>{
  const {tasks,guides}=bank();
  assert.deepEqual(tasks.map(task=>task.key),['postcentral','lingual']);
  const covered=new Set(['precentral','cuneus',...tasks.map(task=>task.key)]);
  for(const guide of Object.values(guides))for(const key of guide.regions)assert.ok(covered.has(key),key);
  assert.equal(tasks.filter(task=>task.key==='postcentral').length,1);
});
test('new self-checks reuse exact existing bilingual lessons, hints, colors and views',()=>{
  const {tasks,guides,regions,views,lessons}=bank();
  for(const task of tasks){
    const viewKey=task.key==='lingual'?'medial':'lateral',view=views[viewKey],guide=guides[viewKey],record=regions[task.key];
    assert.equal(task.kind,'surface');assert.equal(task.overlay,'none');
    assert.equal(task.hint,guide.ja.landmark);assert.equal(task.englishHint,guide.en.landmark);
    assert.equal(task.explanation,lessons[task.key].ja);assert.equal(task.englishExplanation,lessons[task.key].en);
    assert.equal(task.englishName,anatomyDisplayEnglish(record.latin));
    assert.deepEqual(task.highlight,{ids:record.ids,color:record.rgb});
    assert.deepEqual(task.rotation,view.rotation);assert.equal(task.hemisphere,view.hemisphere);assert.equal(task.medial,viewKey==='medial');
    assert.equal(task.correctAnswer,undefined);assert.equal(task.score,undefined);
  }
});
test('already collected surface targets are not added again',()=>{
  assert.deepEqual(bank(['precentral','cuneus','postcentral','lingual']).tasks,[]);
});
test('quiz-derived surface tasks reuse canonical English lessons without changing Japanese, IDs or views',()=>{
  const {regions,views,lessons}=bank();
  const source=declaration('app/page.tsx','quizQuestions')+
    '\n const allQuizQuestions=quizQuestions.filter(question=>question.category===\'surface\');\n'+
    declaration('app/page.tsx','quizFindStructureTasks')+
    '\n globalThis.data={tasks:quizFindStructureTasks,questions:allQuizQuestions};';
  const context={
    anatomyDisplayEnglish,surfaceRegions:regions,surfaceViews:views,surfaceRegionLessons:lessons,
    isConceptQuiz:()=>false,isNeurovascularQuiz:()=>false,isSurfaceQuiz:question=>question.category==='surface',
    quizTeachingRegistry:question=>({[question.target]:{relation:regions[question.target].note,note:lessons[question.target].ja}}),
    reviewModelRotation:(_target,rotation)=>rotation,
  };
  vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText,context);
  const {tasks,questions}=JSON.parse(JSON.stringify(context.data));
  assert.deepEqual(tasks.map(task=>task.key),['precentral','superiorTemporal','superiorFrontal','precuneus','cuneus','fusiform']);
  for(const [index,task] of tasks.entries()){
    const question=questions[index],record=regions[question.target],view=views[question.view];
    assert.equal(task.key,question.target);assert.equal(task.kind,'surface');
    assert.equal(task.englishExplanation,lessons[question.target].en);
    assert.equal(task.explanation,lessons[question.target].ja);assert.equal(task.hint,record.note);
    assert.deepEqual(task.highlight,{ids:record.ids,color:record.rgb});
    assert.deepEqual(task.rotation,view.rotation);assert.equal(task.hemisphere,view.hemisphere);
    assert.equal(task.medial,question.view==='medial');assert.equal(task.viewName,view.name);
  }
});
