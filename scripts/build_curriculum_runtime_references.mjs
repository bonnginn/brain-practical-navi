import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateContentMap} from './validate_curriculum_content_map.mjs';
export function runtimeReferences(map){
  for(const gap of map.gaps)if(!['missing-provenance-link','no-dedicated-observation-lesson'].includes(gap.kind))throw Error('Unsupported displayed gap kind: '+gap.kind);
  for(const material of map.materials){
    if(material.evidence_state.medical_judgment!=='医学判断待ち')throw Error('Unsupported displayed medical state: '+material.id);
    if(material.provenance_mapping&&typeof material.provenance_mapping.mapping?.composite!=='boolean')throw Error('Invalid composite mapping: '+material.id);
    for(const evidence of material.evidence)for(const field of ['limitations','source_refs'])if(!Array.isArray(evidence[field])||evidence[field].some(value=>typeof value!=='string'))throw Error('Invalid evidence '+field+': '+material.id);
  }
  for(const task of map.tasks)if(task.availability!=='definition-only-runtime-filtered')throw Error('Unsupported task availability: '+task.id);
  return {materials:map.materials.map(m=>({id:m.id,name:m.name,evidence_state:{medical_judgment:m.evidence_state.medical_judgment,image_position:m.evidence_state.image_position},provenance_mapping:m.provenance_mapping?{mapping:{composite:m.provenance_mapping.mapping.composite}}:undefined,source_text_refs:m.source_text_refs.filter(r=>r.symbol==='surfaceObservationGuides').map(r=>({symbol:r.symbol,key:r.key})),evidence:m.evidence.map(e=>({entry_key:e.entry_key,limitations:e.limitations,source_refs:e.source_refs}))})),tasks:map.tasks.map(t=>({id:t.id,material_refs:t.material_refs,availability:t.availability})),gaps:map.gaps.map(g=>({kind:g.kind,subject_ref:g.subject_ref}))};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const source=JSON.parse(await fs.readFile(new URL('../data/curriculum/content-map.json',import.meta.url),'utf8'));
 const validation=await validateContentMap(source);
 if(validation.errors.length)throw Error('Invalid curriculum source: '+validation.errors.join('; '));
 const text=JSON.stringify(runtimeReferences(source))+'\n';
 const target=new URL('../data/curriculum/runtime-reference-map.json',import.meta.url);
 if(process.argv.includes('--check')){if((await fs.readFile(target,'utf8')).replaceAll('\r\n','\n')!==text)throw Error('Runtime references differ from the source inventory');}else await fs.writeFile(target,text);
}
