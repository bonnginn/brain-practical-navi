import {CIRCUIT_TEACHING} from './circuitTeaching.mjs';
const KEY='circuitObservation';
const routeKind=route=>route==='#workspace/surface/free'?'guide':/^#workspace\/sections(?:\/|$)/.test(route)?'section':null;
export function readCircuitHistory(state,route){
  const kind=routeKind(route),value=state?.[KEY],circuit=value&&Object.hasOwn(CIRCUIT_TEACHING,value.circuitKey)?CIRCUIT_TEACHING[value.circuitKey]:null;
  if(!kind||!circuit||!Number.isInteger(value.pathIndex)||!Number.isInteger(value.nodeIndex))return null;
  const path=circuit.paths[value.pathIndex];if(!path||value.nodeIndex<0||value.nodeIndex>=path.nodes.length)return null;
  const result={circuitKey:circuit.key,pathIndex:value.pathIndex,nodeIndex:value.nodeIndex};
  const section=value.section;
  if(kind==='section'&&section&&['coronal','horizontal','sagittal'].includes(section.plane)&&Number.isFinite(section.position)&&section.position>=0&&section.position<=100&&typeof section.structureKey==='string')result.section={plane:section.plane,position:section.position,structureKey:section.structureKey};
  return result;
}
export function circuitHistoryState(state,route,context){
  const next=state&&typeof state==='object'&&!Array.isArray(state)?{...state}:{};
  delete next[KEY];const valid=readCircuitHistory({[KEY]:context},route);if(valid)next[KEY]=valid;return next;
}
