import {circuitTeaching} from './circuitTeaching.mjs';
import {PAPEZ_STEPS,BASAL_GANGLIA_STEPS} from './pathwayStepper.mjs';
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const steps=['input','bilateral','colliculus','mgb','cortex'];
export function readCircuitWorkspaceState(s){
 if(!object(s)||!['papez','visual','basal-ganglia','auditory','motor-descending','dcml','anterolateral'].includes(s.key)||!object(s.positions)||!object(s.rotation)||!['x','y'].every(k=>Number.isFinite(s.rotation[k])&&Math.abs(s.rotation[k])<=1e9)||s.rotation.z!==undefined&&(!Number.isFinite(s.rotation.z)||Math.abs(s.rotation.z)>1e9))return null;
 for(const [key,p] of Object.entries(s.positions)){const circuit=circuitTeaching(key);if(!circuit||!object(p)||!Number.isInteger(p.pathIndex)||!circuit.paths[p.pathIndex]||!Number.isInteger(p.nodeIndex)||!circuit.paths[p.pathIndex].nodes[p.nodeIndex])return null;}
 if(s.zoom!==undefined&&(!Number.isFinite(s.zoom)||s.zoom<.7||s.zoom>5)||s.pan!==undefined&&(!object(s.pan)||!['x','y'].every(k=>Number.isFinite(s.pan[k])&&Math.abs(s.pan[k])<=1e6)))return null;
 if(!steps.includes(s.auditoryStep??'input'))return null;
 if(s.sectionPlane!==undefined&&!['coronal','sagittal','horizontal'].includes(s.sectionPlane)||s.sectionPosition!==undefined&&(!Number.isFinite(s.sectionPosition)||s.sectionPosition<0||s.sectionPosition>100))return null;
 if(s.observation!==null){const o=s.observation;if(!object(o)||!['model','slice'].includes(o.mode))return null;
 if(s.key==='auditory'){if(!['cn8','cortex','mgb'].includes(o.target))return null;}
 else {const circuit=circuitTeaching(s.key);if(!circuit)return null;const node=circuit.nodes.find(n=>n.key===o.node);if(!node)return null;const indices=[node.observationIndex,...(node.observations??[]).map(n=>n.index)];if(!circuit.paths.some(p=>p.nodes.includes(o.node))||!Number.isInteger(o.index)||!indices.includes(o.index)||o.index<0||o.index>=(s.key==='papez'?PAPEZ_STEPS.length:s.key==='basal-ganglia'?BASAL_GANGLIA_STEPS.length:s.key==='visual'?6:circuit.nodes.length))return null;}
 }
 const circuitViews={};
 if(object(s.circuitViews))for(const [key,v] of Object.entries(s.circuitViews)){
  if(!['papez','visual','basal-ganglia','auditory','motor-descending','dcml','anterolateral'].includes(key)||!object(v))continue;
  const parsed=readCircuitWorkspaceState({key,positions:{},auditoryStep:'input',observation:null,rotation:v.rotation,zoom:v.zoom,pan:v.pan});
  if(parsed)circuitViews[key]={rotation:parsed.rotation,zoom:parsed.zoom??1,pan:parsed.pan??{x:0,y:0}};
 }
 return {...(Object.keys(circuitViews).length?{circuitViews}:{}),...(s.sectionPlane===undefined?{}:{sectionPlane:s.sectionPlane}),...(s.sectionPosition===undefined?{}:{sectionPosition:s.sectionPosition}),...(s.zoom===undefined?{}:{zoom:s.zoom}),...(s.pan===undefined?{}:{pan:{x:s.pan.x,y:s.pan.y}}),key:s.key,positions:Object.fromEntries(Object.entries(s.positions).map(([key,p])=>[key,{pathIndex:p.pathIndex,nodeIndex:p.nodeIndex}])),auditoryStep:s.auditoryStep??'input',rotation:{x:s.rotation.x,y:s.rotation.y,...(s.rotation.z===undefined?{}:{z:s.rotation.z})},observation:s.observation===null?null:s.key==='auditory'?{target:s.observation.target,mode:s.observation.mode}:{index:s.observation.index,node:s.observation.node,mode:s.observation.mode}};
}
