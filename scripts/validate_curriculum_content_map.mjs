import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {root,readConstant,learnerMappingFor} from './build_curriculum_content_map.mjs';
import {CIRCUIT_TEACHING} from '../src/circuitTeaching.mjs';

// Deliberately limited to the schema keywords used in this project's schema.
export function validateSchema(value,schema,where='$',errors=[]){
  const type=Array.isArray(value)?'array':value===null?'null':typeof value;
  if(schema.type&&!([schema.type].flat().includes(type)))errors.push(`${where}: expected ${schema.type}`);
  if(schema.const!==undefined&&value!==schema.const)errors.push(`${where}: incorrect constant`);
  if(schema.enum&&!schema.enum.includes(value))errors.push(`${where}: invalid enum`);
  if(type==='string'&&schema.minLength&&value.length<schema.minLength)errors.push(`${where}: empty string`);
  if(type==='string'&&schema.pattern&&!new RegExp(schema.pattern).test(value))errors.push(`${where}: invalid pattern`);
  if(type==='array'){
    if(schema.minItems&&value.length<schema.minItems)errors.push(`${where}: too few items`);
    value.forEach((item,index)=>validateSchema(item,schema.items??{},`${where}[${index}]`,errors));
  }
  if(type==='object'){
    for(const key of schema.required??[])if(!(key in value))errors.push(`${where}.${key}: missing`);
    for(const [key,item]of Object.entries(value)){
      if(schema.additionalProperties===false&&!(key in (schema.properties??{})))errors.push(`${where}.${key}: unexpected`);
      if(schema.properties?.[key])validateSchema(item,schema.properties[key],`${where}.${key}`,errors);
    }
  }
  return errors;
}
export async function validateContentMap(map,{verifySources=true}={}){
  const schema=JSON.parse(await fs.readFile(path.join(root,'data/curriculum/content-map.schema.json'),'utf8'));
  const errors=validateSchema(map,schema);
  if(errors.length)return {errors,warnings:[]};
  const ids=new Set(),materialIds=new Set(map.materials.map(m=>m.id)),circuitIds=new Set(map.circuits.map(c=>c.id));
  for(const group of ['materials','topics','tasks','circuits','gaps'])for(const item of map[group]){
    if(ids.has(item.id))errors.push(`duplicate id: ${item.id}`);ids.add(item.id);
    for(const field of ['material_refs','target_refs','option_refs'])for(const ref of item[field]??[])if(!materialIds.has(ref))errors.push(`${item.id}: orphan ${field} ${ref}`);
    for(const ref of item.circuit_refs??[])if(!circuitIds.has(ref))errors.push(`${item.id}: orphan circuit ${ref}`);
    if(item.subject_ref&&!materialIds.has(item.subject_ref))errors.push(`${item.id}: orphan gap ${item.subject_ref}`);
  }
  const sourcePaths=new Set(map.sources.map(s=>s.file));
  if(sourcePaths.size!==map.sources.length)errors.push('duplicate source file');
  const csf=map.topics.find(t=>t.existing_key==='csf-route');
  if(!csf||csf.kind!=='observation-theme'||csf.circuit_refs.length)errors.push('CSF must remain a separate observation theme');
  if(circuitIds.has('csf-route'))errors.push('CSF is not a neural circuit');
  for(const task of map.tasks)if(!task.material_refs.length)errors.push(`${task.id}: missing identification target`);
  const provenance=JSON.parse(await fs.readFile(path.join(root,'public/atlas/structure-provenance.json'),'utf8'));
  const entryKeys=new Set(provenance.entries.map(e=>e.key));
  const observationGuides=await readConstant('src/surfaceObservationGuides.ts','surfaceObservationGuides');
  const concepts=JSON.parse(await fs.readFile(path.join(root,'app/quiz-concept-bank.json'),'utf8'));
  const conceptSources=new Set(concepts.sources.map(s=>s.id));
  const conceptIds=new Set();
  for(const c of map.concept_inventory){
    if(conceptIds.has(c.id))errors.push(`duplicate concept id: ${c.id}`);conceptIds.add(c.id);
    if(c.target&&!c.material_refs.some(ref=>map.materials.find(m=>m.id===ref)?.existing_key===c.target))errors.push(`${c.id}: unresolved concept target ${c.target}`);
    for(const ref of c.material_refs)if(!materialIds.has(ref))errors.push(`${c.id}: orphan concept material ${ref}`);
    for(const ref of c.source_refs)if(!conceptSources.has(ref))errors.push(`${c.id}: orphan concept source ${ref}`);
    const original=concepts.questions.find(q=>q.id===c.source_text_ref.key);
    if(c.source_text_ref.file!=='app/quiz-concept-bank.json'||!original||original.id!==c.id)errors.push(`${c.id}: missing concept source locator`);
    else if(original.target!==c.target||JSON.stringify(original.sourceRefs)!==JSON.stringify(c.source_refs))errors.push(`${c.id}: altered concept source mapping`);
  }
  for(const m of map.materials){
    const [symbol,key]=m.id.split('/');
    const directKeys=provenance.entries.filter(e=>e.appKeys?.includes(key)).map(e=>e.key);
    const expectedMapping=directKeys.length?null:learnerMappingFor(symbol,key);
    if(JSON.stringify(m.provenance_mapping?.mapping??null)!==JSON.stringify(expectedMapping))errors.push(m.id+': altered learner mapping');
    if(m.provenance_mapping&&!sourcePaths.has(m.provenance_mapping.file))errors.push(m.id+': unregistered learner mapping source');
    const expectedKeys=directKeys.length?directKeys:provenance.entries.filter(e=>expectedMapping?.entryKeys.includes(e.key)).map(e=>e.key);
    if(JSON.stringify(m.evidence.map(e=>e.entry_key))!==JSON.stringify(expectedKeys))errors.push(m.id+': altered provenance linkage');
    if(Boolean(m.evidence_gap)!==!m.evidence.length)errors.push(m.id+': inconsistent evidence gap');
    for(const ref of m.source_text_refs.filter(r=>r.file==='src/surfaceObservationGuides.ts')){
      const guide=observationGuides[ref.key];
      const members=symbol==='surfaceRegions'?guide?.regions:symbol==='surfaceLandmarks'?guide?.landmarks:[];
      if(!members?.includes(key))errors.push(m.id+': unsupported observation guide linkage');
    }
    const hasLesson=m.source_text_refs.some(r=>['src/surfaceRegionLessons.ts','src/sectionObservationGuides.ts','src/surfaceObservationGuides.ts'].includes(r.file));
    if(map.gaps.some(g=>g.subject_ref===m.id&&g.kind==='no-dedicated-observation-lesson')===hasLesson)errors.push(m.id+': inconsistent observation lesson gap');
    for(const evidence of m.evidence){
      if(!entryKeys.has(evidence.entry_key)){errors.push(`${m.id}: orphan provenance ${evidence.entry_key}`);continue;}
      const original=provenance.entries.find(e=>e.key===evidence.entry_key);
      for(const [field,source]of [['representations','representations'],['project_review','projectReview'],['expert_review','expertReview'],['quiz_eligibility','quizEligibility'],['source_refs','sourceRefs'],['limitations','knownLimitations']])if(JSON.stringify(evidence[field])!==JSON.stringify(original[source]))errors.push(`${m.id}: altered provenance ${field}`);
    }
    if(m.evidence_state.medical_judgment!==(m.evidence.length&&m.evidence.every(e=>e.expert_review==='expert-reviewed')?'既存専門家確認あり':'医学判断待ち'))errors.push(`${m.id}: unsupported medical judgment state`);
    if(m.evidence_state.image_position!==(m.label_ids.length?'既存ラベル対応あり・画像位置未検証':'画像位置対応不足'))errors.push(`${m.id}: unsupported image position state`);
    if(!m.evidence.length&&!map.gaps.some(g=>g.subject_ref===m.id&&g.kind==='missing-provenance-link'))errors.push(`${m.id}: undocumented evidence inadequacy`);
  }
  for(const group of ['materials','topics','tasks','circuits'])for(const item of map[group])for(const ref of item.source_text_refs){
    if(!sourcePaths.has(ref.file))errors.push(`${item.id}: unregistered source ${ref.file}`);
    if(ref.file==='src/circuitTeaching.mjs'){
      const circuit=ref.symbol==='CIRCUIT_TEACHING'?CIRCUIT_TEACHING[ref.key]:null;
      if(!circuit)errors.push(`${item.id}: missing circuit source key ${ref.key}`);
      else for(const field of ref.fields)if(!(field in circuit))errors.push(`${item.id}: missing circuit source field ${field}`);
    }
    if(verifySources&&ref.key===null){
      const source=await fs.readFile(path.join(root,ref.file),'utf8');
      if(!source.includes(`const ${ref.symbol}:`)&&!source.includes(`const ${ref.symbol}=`))errors.push(`${item.id}: missing declared source symbol ${ref.symbol}`);
    }
    if(verifySources&&ref.key!==null&&ref.file!=='src/circuitTeaching.mjs'){
      try{
        const registry=await readConstant(ref.file,ref.symbol);
        const value=ref.key===null?registry:Array.isArray(registry)?registry.find(v=>v?.key===ref.key)??registry[Number(ref.key)]:registry[ref.key];
        if(value===undefined)errors.push(`${item.id}: missing source key ${ref.key}`);
        for(const field of ref.fields)if(value===null||!(field in Object(value)))errors.push(`${item.id}: missing source field ${field}`);
      }catch(error){errors.push(`${item.id}: ${error.message}`);}
    }
  }
  if(verifySources)for(const source of map.sources){
    const resolved=path.resolve(root,source.file);
    if(!resolved.startsWith(root+path.sep)){errors.push(`outside source root: ${source.file}`);continue;}
    try{if(createHash('sha256').update(await fs.readFile(resolved)).digest('hex')!==source.sha256)errors.push(`source drift: ${source.file}`);}catch{errors.push(`missing file: ${source.file}`);}
  }
  return {errors,warnings:map.gaps.map(g=>`${g.kind}: ${g.subject_ref}`)};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const file=process.argv[2]??path.join(root,'data/curriculum/content-map.json');
  const map=JSON.parse(await fs.readFile(file,'utf8'));
  const result=await validateContentMap(map);
  console.log(JSON.stringify({errors:result.errors,gap_count:result.warnings.length,counts:Object.fromEntries(['materials','topics','tasks','circuits','concept_inventory'].map(k=>[k,map[k].length]))},null,2));
  if(result.errors.length)process.exitCode=1;
}
