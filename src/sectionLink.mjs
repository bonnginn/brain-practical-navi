import {readSectionSession} from './sectionSession.mjs';
const planes=['coronal','horizontal','sagittal'];
export function observationUrl(currentUrl,hash){
  const current=new URL(currentUrl);
  const result=new URL(current.origin+current.pathname);
  if(current.searchParams.get('lang')==='en')result.searchParams.set('lang','en');
  if(['phone','desktop'].includes(current.searchParams.get('ui')))result.searchParams.set('ui',current.searchParams.get('ui'));
  result.hash=hash;
  return result.href;
}
export function readSectionLink(hash,allowedKeys,revision){
  const match=hash.match(/^#workspace\/sections\/(coronal|horizontal|sagittal)\/observe\?(.*)$/);
  if(!match)return {status:'absent'};
  const p=new URLSearchParams(match[2]);
  const keys=['v','revision','position','visible','selected','layout','views','share'];
  if([...p.keys()].some(k=>!keys.includes(k))||keys.some(k=>p.getAll(k).length!==1)||p.get('v')!=='1')return {status:'invalid'};
  if(p.get('revision')!==revision)return {status:'revision-mismatch'};
  for(const key of ['position','views','share'])if(!/^\d+(?:\.\d+)?$/.test(p.get(key)))return {status:'invalid'};
  const positions={coronal:52,horizontal:52,sagittal:52};
  positions[match[1]]=Number(p.get('position'));
  const state=readSectionSession(JSON.stringify({version:1,positions,visible:p.get('visible')?p.get('visible').split(','):[],selected:p.get('selected'),layout:p.get('layout'),views:Number(p.get('views')),share:Number(p.get('share'))}),allowedKeys);
  return state?{status:'valid',plane:match[1],state}:{status:'invalid'};
}
export function sectionLinkHash(plane,state,allowedKeys,revision){
  if(!planes.includes(plane)||!readSectionSession(JSON.stringify(state),allowedKeys))return null;
  const p=new URLSearchParams({v:'1',revision,position:String(state.positions[plane]),visible:state.visible.join(','),selected:state.selected,layout:state.layout,views:String(state.views),share:String(state.share)});
  return `#workspace/sections/${plane}/observe?${p}`;
}
