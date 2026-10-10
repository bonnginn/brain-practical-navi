import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import ts from 'typescript';
import {LEARNER_PROVENANCE_MAPPINGS} from '../src/learnerProvenance.mjs';
import {CIRCUIT_TEACHING} from '../src/circuitTeaching.mjs';

export const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
// Evaluate only a named, checked-in data initializer, never the application module.
export async function readConstant(file,symbol){
  const source=await fs.readFile(path.join(root,file),'utf8');
  const ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  for(const statement of ast.statements)if(ts.isVariableStatement(statement))for(const declaration of statement.declarationList.declarations){
    if(declaration.name.getText(ast)!==symbol)continue;
    const expression=declaration.initializer?.getText(ast);
    if(!expression)throw new Error(`Missing initializer: ${file}:${symbol}`);
    const js=ts.transpile(`const value=${expression}; value;`,{target:ts.ScriptTarget.ES2022});
    const context={};
    for(let attempt=0;attempt<50;attempt++){
      try{return JSON.parse(JSON.stringify(vm.runInNewContext(js,{...context}, {timeout:1000})));}
      catch(error){
        const missing=error.message.match(/^([A-Za-z_$][\w$]*) is not defined$/)?.[1];
        if(!missing||missing===symbol)throw error;
        context[missing]=await readConstant(file,missing);
      }
    }
    throw new Error(`Too many initializer dependencies: ${symbol}`);
  }
  throw new Error(`Missing constant: ${file}:${symbol}`);
}
export function learnerMappingFor(symbol,key){
  const prefixes={surfaceRegions:'surface:region:',surfaceLandmarks:'surface:landmark:',surfaceDeepLandmarks:'surface:deep:',basalLandmarks:'surface:basal:',neurovascularStructures:'neurovascular:',structures:'sections:'};
  return LEARNER_PROVENANCE_MAPPINGS.find(m=>m.target===prefixes[symbol]+key)??null;
}
export async function buildContentMap(){
  const provenance=JSON.parse(await fs.readFile(path.join(root,'public/atlas/structure-provenance.json'),'utf8'));
  const files=new Set(['public/atlas/structure-provenance.json','src/circuitTeaching.mjs','app/quiz-concept-bank.json','src/learnerProvenance.mjs']);
  const get=async(file,symbol)=>{files.add(file);return readConstant(file,symbol);};
  const materials=[];
  for(const [symbol,kind]of [['surfaceRegions','surface'],['surfaceLandmarks','surface'],['surfaceDeepLandmarks','surface'],['basalLandmarks','surface'],['neurovascularStructures','surface'],['structures','sections']]){
    const records=await get('app/page.tsx',symbol);
    for(const [key,record]of Object.entries(records)){
      const directEntries=provenance.entries.filter(entry=>entry.appKeys?.includes(key));
      // Use the checked-in display mapping only where appKeys did not resolve.
      // Composite and partial rows retain their original limitations.
      const mapping=directEntries.length?null:learnerMappingFor(symbol,key);
      const entries=directEntries.length?directEntries:provenance.entries.filter(e=>mapping?.entryKeys.includes(e.key));
      materials.push({id:`${symbol}/${key}`,existing_key:key,material:kind,name:record.name,provenance_mapping:mapping?{file:'src/learnerProvenance.mjs',symbol:'LEARNER_PROVENANCE_MAPPINGS',mapping}:null,source_text_refs:[{file:'app/page.tsx',symbol,key,fields:Object.keys(record).filter(k=>['note','relation','source','latin'].includes(k))}],label_ids:record.bigbrainIds??record.ids??[],label_id_namespace:record.bigbrainIds?'bigbrain-section':record.ids?'registry-local':'none',evidence:entries.map(entry=>({entry_key:entry.key,representations:entry.representations,project_review:entry.projectReview,expert_review:entry.expertReview,quiz_eligibility:entry.quizEligibility,source_refs:entry.sourceRefs,limitations:entry.knownLimitations})),evidence_gap:entries.length?null:'no-linked-provenance-entry',circuit_refs:[]});
    }
  }
  for(const m of materials)m.evidence_state={existing_basis:'既存根拠あり',medical_judgment:m.evidence.length&&m.evidence.every(e=>e.expert_review==='expert-reviewed')?'既存専門家確認あり':'医学判断待ち',image_position:m.label_ids.length?'既存ラベル対応あり・画像位置未検証':'画像位置対応不足'};
  const resolve=(key,material)=>{
    const refs=materials.filter(m=>m.existing_key===key&&(!material||m.material===material)).map(m=>m.id);
    if(!refs.length)throw new Error(`Unresolved existing key: ${material??'any'}/${key}`);
    return refs;
  };
  const surfaceLinks=await get('src/learningConnections.ts','surfaceCircuitLinks');
  const sectionLinks=await get('src/learningConnections.ts','sectionCircuitLinks');
  for(const m of materials)m.circuit_refs=(m.material==='sections'?sectionLinks:surfaceLinks)[m.existing_key]??[];
  const topics=[];
  const themes=await get('src/sectionStudyThemes.ts','sectionStudyThemes');
  for(const theme of themes)topics.push({id:`sectionStudyThemes/${theme.key}`,existing_key:theme.key,kind:'observation-theme',material:'sections',name:theme.ja.name,goal:theme.ja.goal,material_refs:[...new Set(theme.members.flatMap(k=>resolve(k,'sections')))],target_refs:resolve(theme.target,'sections'),circuit_refs:theme.key==='csf-route'?[]:[...new Set(theme.members.flatMap(k=>sectionLinks[k]??[]))],source_text_refs:[{file:'src/sectionStudyThemes.ts',symbol:'sectionStudyThemes',key:theme.key,fields:['ja','en']}],existing_entry:{plane:theme.plane,position:theme.position},evidence_note:'Entry positions are existing exploration starting points, not anatomical boundaries.'});
  const guides=await get('src/surfaceObservationGuides.ts','surfaceObservationGuides');
  for(const [key,guide]of Object.entries(guides))topics.push({id:`surfaceObservationGuides/${key}`,existing_key:key,kind:'observation-guide',material:'surface',name:guide.ja.title,goal:guide.ja.landmark,material_refs:[...new Set([...guide.regions,...guide.landmarks].flatMap(k=>resolve(k,'surface')))],target_refs:guide.regions.flatMap(k=>resolve(k,'surface')),circuit_refs:[...new Set(guide.regions.flatMap(k=>surfaceLinks[k]??[]))],source_text_refs:[{file:'src/surfaceObservationGuides.ts',symbol:'surfaceObservationGuides',key,fields:['ja','en']}],existing_entry:null,evidence_note:'Existing surface prompts; not a new circuit or segmentation.'});
  const sectionGuides=await get('src/sectionObservationGuides.ts','sectionObservationGuides');
  const lessons=await get('src/surfaceRegionLessons.ts','surfaceRegionLessons');
  for(const m of materials){
    for(const [guideKey,guide]of Object.entries(guides))if(m.material==='surface'&&((m.id.startsWith('surfaceRegions/')&&guide.regions.includes(m.existing_key))||(m.id.startsWith('surfaceLandmarks/')&&guide.landmarks.includes(m.existing_key))))m.source_text_refs.push({file:'src/surfaceObservationGuides.ts',symbol:'surfaceObservationGuides',key:guideKey,fields:['ja','en']});
    if(m.material==='sections'&&sectionGuides[m.existing_key])m.source_text_refs.push({file:'src/sectionObservationGuides.ts',symbol:'sectionObservationGuides',key:m.existing_key,fields:['observe','compare','reference']});
    if(m.id.startsWith('surfaceRegions/')&&lessons[m.existing_key])m.source_text_refs.push({file:'src/surfaceRegionLessons.ts',symbol:'surfaceRegionLessons',key:m.existing_key,fields:['ja','en']});
  }
  const tasks=[];
  for(const symbol of ['quizQuestions','neurovascularQuizQuestions']){
    const questions=await get('app/page.tsx',symbol);
    for(const [index,q]of questions.entries())tasks.push({id:`${symbol}/${index}`,existing_key:q.target,kind:'quiz-identification-definition',material_refs:resolve(q.target,q.category==='surface'||q.category==='neurovascular'?'surface':'sections'),option_refs:q.options.flatMap(key=>resolve(key,q.category==='surface'||q.category==='neurovascular'?'surface':'sections')),source_text_refs:[{file:'app/page.tsx',symbol,key:String(index),fields:['prompt','target','options']}],availability:'definition-only-runtime-filtered',availability_note:'Existing allQuizQuestions filters, anatomy holds and runtime specimen visibility remain authoritative.'});
  }
  const additions=await get('src/identificationSectionLessons.ts','additionalIdentificationSections');
  for(const lesson of additions)tasks.push({id:`additionalIdentificationSections/${lesson.key}`,existing_key:lesson.key,kind:'unscored-identification-definition',material_refs:resolve(lesson.key,'sections'),option_refs:[],source_text_refs:[{file:'src/identificationSectionLessons.ts',symbol:'additionalIdentificationSections',key:lesson.key,fields:['roleEn',...('scope'in lesson?['scope']:[])]}],availability:'definition-only-runtime-filtered',availability_note:'May be omitted when quiz target already exists, guide is absent, label revision differs, or no representative labelled slice exists.'});
  // Additional surface identification tasks are defined by these guide regions.
  for(const key of new Set(Object.values(guides).flatMap(g=>g.regions)))tasks.push({id:`additionalSurfaceFindTasks/${key}`,existing_key:key,kind:'unscored-surface-guide-candidate',material_refs:resolve(key,'surface'),option_refs:[],source_text_refs:[{file:'app/page.tsx',symbol:'additionalSurfaceFindTasks',key:null,fields:[]}],availability:'definition-only-runtime-filtered',availability_note:'Existing code excludes regions already represented by quiz identification; this is a candidate inventory, not an extra active task.'});
  const concepts=JSON.parse(await fs.readFile(path.join(root,'app/quiz-concept-bank.json'),'utf8'));
  const conceptInventory=concepts.questions.map(q=>({id:q.id,target:q.target??null,material_refs:q.target?resolve(q.target):[],source_refs:q.sourceRefs??[],source_text_ref:{file:'app/quiz-concept-bank.json',key:q.id},scope:'existing-concept-quiz-not-image-identification'}));
  const circuits=Object.values(CIRCUIT_TEACHING).map(c=>({id:c.key,name:c.name,goal:c.goal,material_refs:materials.filter(m=>m.circuit_refs.includes(c.key)).map(m=>m.id),source_text_refs:[{file:'src/circuitTeaching.mjs',symbol:'CIRCUIT_TEACHING',key:c.key,fields:['goal','role','nodes','paths']}],evidence_note:'Existing schematic circuit teaching. Individual node limitations remain authoritative; links do not prove specimen-derived fibre connectivity.'}));
  const sources=[];
  for(const file of [...files].sort())sources.push({file,sha256:createHash('sha256').update(await fs.readFile(path.join(root,file))).digest('hex')});
  const gaps=materials.filter(m=>m.evidence_gap).map(m=>({id:`provenance/${m.id}`,kind:'missing-provenance-link',subject_ref:m.id,status:'unresolved',detail:'Source definition exists; no matching appKeys or explicit learner display mapping in current provenance registry. Do not infer expert/project approval.'}));
  for(const m of materials)if(!m.source_text_refs.some(r=>r.file!=='app/page.tsx'))gaps.push({id:`lesson/${m.id}`,kind:'no-dedicated-observation-lesson',subject_ref:m.id,status:'unresolved',detail:'Registry note/source remains available; no dedicated surface/section lesson was linked by this inventory.'});
  return {schema_version:1,job_id:'BRAIN-WIN-20261008-CONTENT-MAP-02',baseline_commit:'2b713f78d817d16b796d0394b95a8d40d69ddf5c',scope:'Existing source inventory only; no application wiring, clinical validation, new anatomy, or new image positions.',sources,materials,topics,tasks,circuits,concept_inventory:conceptInventory,gaps};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const result=await buildContentMap();
  await fs.mkdir(path.join(root,'data/curriculum'),{recursive:true});
  await fs.writeFile(path.join(root,'data/curriculum/content-map.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(Object.fromEntries(['materials','topics','tasks','circuits','concept_inventory','gaps'].map(k=>[k,result[k].length]))));
}
