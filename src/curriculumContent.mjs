export function materialIdForFreeKey(key){
  if(typeof key!=='string')return null;
  const [family,...parts]=key.split(':');
  const registry={region:'surfaceRegions',landmark:'surfaceLandmarks',deep:'surfaceDeepLandmarks',basal:'basalLandmarks',neuro:'neurovascularStructures'}[family];
  return registry&&parts.length===1&&parts[0]?registry+'/'+parts[0]:null;
}
export function createCurriculumLookup(map){
  const byId=new Map((map?.materials??[]).map(m=>[m.id,m]));
  return id=>{
    if(typeof id!=='string'||!byId.has(id))return null;
    const material=byId.get(id);
    return {material,source_text_refs:material.source_text_refs??[],evidence:material.evidence??[],topics:(map.topics??[]).filter(t=>t.material_refs?.includes(id)),tasks:(map.tasks??[]).filter(t=>t.material_refs?.includes(id)),gaps:(map.gaps??[]).filter(g=>g.subject_ref===id)};
  };
}
