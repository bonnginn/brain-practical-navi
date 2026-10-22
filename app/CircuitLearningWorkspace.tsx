import {circuitTeaching} from '../src/circuitTeaching.mjs';
import {readCircuitWorkspaceState} from '../src/circuitWorkspaceProgress.mjs';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import {CircuitPathOverview} from './CircuitPathOverview';
import {AuditoryOverview} from './AuditoryOverview';
import {ThalamusGuide} from './ThalamusGuide';
import type {CircuitPosition} from './CircuitTeachingPanel';
import './circuit-workspace.css';

const memoryKey='brain-practical-navigator:circuit-workspace:v1';
export type CircuitWorkspaceState={
 key:'papez'|'visual'|'basal-ganglia'|'auditory'|'motor-descending'|'dcml'|'anterolateral';
 sectionPlane?:'coronal'|'sagittal'|'horizontal';sectionPosition?:number;
 positions:Record<string,CircuitPosition>;auditoryStep?:string;zoom?:number;pan?:{x:number;y:number};
 observation:null|{index:number;node:string;mode:'model'|'slice'}|{target:'cn8'|'cortex'|'mgb';mode:'model'|'slice'};
 rotation:{x:number;y:number;z?:number};
 circuitViews?:Record<string,{rotation:CircuitWorkspaceState['rotation'];zoom:number;pan:{x:number;y:number}}>;
};
export type CircuitObservationContext={state:CircuitWorkspaceState;flowPlaying:boolean;flowSeconds:number;mode:'model'|'slice';onRotation:(r:CircuitWorkspaceState['rotation'])=>void;onZoom:(value:number|((previous:number)=>number))=>void;onPan:(value:{x:number;y:number}|((previous:{x:number;y:number})=>{x:number;y:number}))=>void;onSection:(plane:'coronal'|'sagittal'|'horizontal',position:number)=>void;onSelectNode:(key:string)=>void};
function availableObservation(s:CircuitWorkspaceState):CircuitWorkspaceState['observation'] {
 if(s.key==='auditory'&&!['input','mgb','cortex'].includes(s.auditoryStep??'input')&&s.observation)return s.observation;
 if(s.key==='auditory')return {target:s.auditoryStep==='mgb'?'mgb':s.auditoryStep==='cortex'?'cortex':'cn8',mode:s.observation?.mode??'model'};
 const circuit=circuitTeaching(s.key);if(!circuit)return null;const p=s.positions[s.key]??{pathIndex:0,nodeIndex:0};const node=circuit.nodes.find(n=>n.key===circuit.paths[p.pathIndex]?.nodes[p.nodeIndex]);const index=node?.observationIndex??node?.observations?.[0]?.index;
 if(index!==null&&index!==undefined)return {index,node:node!.key,mode:s.observation?.mode??'model'};
 if(s.observation)return s.observation;const first=circuit.nodes.find(n=>n.observationIndex!==null||n.observations?.length);const fallback=first?.observationIndex??first?.observations?.[0]?.index;return first&&fallback!==null&&fallback!==undefined?{index:fallback,node:first.key,mode:'model'}:null;
}
function withObservation(s:CircuitWorkspaceState){return {...s,observation:availableObservation(s)}}
function suggestedView(key:CircuitWorkspaceState['key']) {
 const rotation=['motor-descending','dcml','anterolateral'].includes(key)?{x:15,y:35,z:0}:key==='basal-ganglia'?{x:25,y:35,z:0}:key==='auditory'?{x:25,y:55,z:0}:{x:-7,y:90,z:0};
 return {rotation:key==='visual'?{x:88,y:0,z:0}:rotation,zoom:key==='visual'?1:1.2,pan:{x:0,y:0}};
}
function initial(snapshot?:CircuitWorkspaceState|null):CircuitWorkspaceState{
 try {const saved=snapshot??JSON.parse(localStorage.getItem(memoryKey)??'null');
 const parsed=readCircuitWorkspaceState(saved);if(parsed)return parsed.observation?parsed:withObservation(parsed);}catch{}
 return withObservation({key:'papez',positions:{},auditoryStep:'input',observation:null,...suggestedView('papez')});
}
export function CircuitLearningWorkspace({english,snapshot,onChange,renderObservation,hasSlice}:{english:boolean;snapshot?:CircuitWorkspaceState|null;onChange:(s:CircuitWorkspaceState)=>void;renderObservation:(c:CircuitObservationContext)=>ReactNode;hasSlice:(s:CircuitWorkspaceState)=>boolean}){
 const [state,setState]=useState(()=>initial(snapshot));
 const [flow,setFlow]=useState({playing:false,seconds:2.4});const onFlowChange=(playing:boolean,seconds:number)=>setFlow({playing,seconds});
 const observationRef=useRef<HTMLDivElement>(null),overviewRef=useRef<HTMLDivElement>(null);
 useEffect(()=>{onChange(state);try{localStorage.setItem(memoryKey,JSON.stringify(state))}catch{}},[state]);
 const choose=(key:CircuitWorkspaceState['key'])=>setState(s=>{
  if(key===s.key)return s;
  const circuitViews={...s.circuitViews,[s.key]:{rotation:{...s.rotation},zoom:s.zoom??1,pan:{...s.pan??{x:0,y:0}}}};
  const view=circuitViews[key]??suggestedView(key);
  return withObservation({...s,...view,circuitViews,key,observation:null,sectionPlane:undefined,sectionPosition:undefined});
 });
 const selectPosition=(position:CircuitPosition)=>setState(s=>withObservation({...s,...(['motor-descending','dcml','anterolateral'].includes(s.key)?{sectionPlane:undefined,sectionPosition:undefined}:{}),positions:{...s.positions,[s.key]:position}}));
 const selectAuditory=(auditoryStep:string)=>setState(s=>withObservation({...s,auditoryStep}));
 const selectNode=(key:string)=>{if(state.key==='auditory'){selectAuditory(key);return;}const circuit=circuitTeaching(state.key);if(!circuit)return;let pathIndex=state.positions[state.key]?.pathIndex??0;let nodeIndex=circuit.paths[pathIndex].nodes.indexOf(key);if(nodeIndex<0){pathIndex=circuit.paths.findIndex(p=>p.nodes.includes(key));nodeIndex=circuit.paths[pathIndex]?.nodes.indexOf(key)??-1;}if(pathIndex>=0&&nodeIndex>=0)selectPosition({pathIndex,nodeIndex});};
 const observedNodes=state.key==='auditory'?[{key:'input',label:english?'CN VIII (schematic)':'VIII（模式）'},{key:'mgb',label:english?'MGB (reference)':'MGB（参照）'},{key:'cortex',label:english?'Transverse temporal gyrus':'横側頭回'}]:(circuitTeaching(state.key)?.nodes??[]).filter(n=>n.observationIndex!==null||n.observations?.length).map(n=>({key:n.key,label:n.label[english?'en':'ja']}));
 const displayedKey=state.observation?('target' in state.observation?(state.observation.target==='cn8'?'input':state.observation.target):state.observation.node):null;
 const selectedNodeKey=state.key==='auditory'?state.auditoryStep??'input':circuitTeaching(state.key)?.paths[state.positions[state.key]?.pathIndex??0]?.nodes[state.positions[state.key]?.nodeIndex??0];
 const bodyTarget=circuitTeaching(state.key)?.nodes.find(n=>n.key===displayedKey)?.observationTargets?.[0];
 const bodyLandmark=bodyTarget?({brainstem:english?'Whole brainstem (location landmark)':'脳幹全体（位置の目印）',thalamus:english?'Whole thalamus (not the VPL boundary)':'視床全体（VPLの境界ではありません）',internalCapsule:english?'Whole internal capsule (not the posterior-limb boundary)':'内包全体（後脚の境界ではありません）',precentral:english?'Precentral gyri (bilateral reference)':'中心前回（両側の参考領域）',postcentral:english?'Postcentral gyri (bilateral reference)':'中心後回（両側の参考領域）'} as Record<string,string>)[bodyTarget]:undefined;
 const displayedName=bodyLandmark??(state.key==='auditory'&&displayedKey==='mgb'&&state.observation?.mode==='slice'?(english?'Thalamus landmark (MGB location)':'視床（MGB位置の目安）'):observedNodes.find(n=>n.key===displayedKey)?.label);
 const show=(observation:NonNullable<CircuitWorkspaceState['observation']>)=>{
 setState(s=>({...s,observation}));
 requestAnimationFrame(()=>observationRef.current?.scrollIntoView({block:'nearest'}));
 };
 const pane=<div ref={observationRef} className="circuitObservationPane" data-circuit-observation data-linked-highlight={displayedKey===selectedNodeKey?selectedNodeKey:'none'}>
 <header><b>{english?'Observation within this circuit':'この回路内で観察'}</b></header>
 <p className="circuitDisplayedStructure">{english?'Related observation: ':'関連する観察：'}{state.key==='auditory'&&state.auditoryStep==='colliculus'?(english?'Inferior colliculi (position guide)':'下丘（位置の目安）'):state.key==='auditory'&&state.auditoryStep==='bilateral'?(english?'Brainstem (approximate region)':'脳幹（おおよその領域）'):displayedKey!==selectedNodeKey?(bodyLandmark?(english?'This stage is schematic; landmark: ':'この段階は模式のみ：')+bodyLandmark:(english?'Nearby available structures; this stage has no dedicated model':'近隣の表示可能な構造（この段階の専用モデルはありません）')):displayedName}</p>

 {state.observation?<><div className="circuitObservationModes">
 <button aria-pressed={state.observation.mode==='model'} onClick={()=>setState(s=>({...s,observation:s.observation?{...s.observation,mode:'model'}:null}))}>3D</button>{(state.key==='auditory'||hasSlice(state))&&<button aria-pressed={state.observation.mode==='slice'} onClick={()=>setState(s=>({...s,observation:s.observation?{...s.observation,mode:'slice'}:null}))}>{english?'Specimen section':'標本断面'}</button>}
 {state.observation.mode==='model'&&<button onClick={()=>setState(s=>({...s,...suggestedView(s.key)}))}>{english?'Suggested view':'見やすい向き'}</button>}
 <button onClick={()=>{const detail=overviewRef.current?.querySelector<HTMLDetailsElement>('.circuitOverviewDetail');if(detail)detail.open=true;overviewRef.current?.querySelector<HTMLElement>('.circuitOverviewDetail')?.scrollIntoView({block:'nearest'})}}>{english?'Explanation':'段階の説明'}</button></div>
 {renderObservation({state,flowPlaying:flow.playing,flowSeconds:flow.seconds,mode:state.observation.mode,onRotation:rotation=>setState(s=>({...s,rotation})),onZoom:value=>setState(s=>({...s,zoom:typeof value==='function'?value(s.zoom??1):value})),onPan:value=>setState(s=>({...s,pan:typeof value==='function'?value(s.pan??{x:0,y:0}):value})),onSection:(sectionPlane,sectionPosition)=>setState(s=>({...s,sectionPlane,sectionPosition})),onSelectNode:selectNode})}{state.key==='auditory'&&state.auditoryStep==='mgb'&&<ThalamusGuide english={english} initialRegion="MGB" compact hideReferenceLink summary={english?'MGB reference details':'MGB参照形状の詳細'}/>}
 </>:<p className="circuitObservationPlaceholder">{english?'Choose a stage and its observation button. Unmodelled relays remain available as explanations in the route.':'段階と観察ボタンを選んでください。モデルのない中継も、経路の説明でたどれます。'}</p>}
 <details className="circuitObservationChoices"><summary>{english?'Choose a structure directly':'構造を直接選ぶ'}</summary><div className="circuitObservationStructures" aria-label={english?'Structures to explore':'観察する構造'}>{observedNodes.map(n=><button type="button" key={n.key} onClick={()=>selectNode(n.key)} aria-pressed={state.key==='auditory'?state.auditoryStep===n.key:state.observation!==null&&'node' in state.observation&&state.observation.node===n.key}>{n.label}</button>)}</div></details>
 </div>;
 return <section id="workspace" tabIndex={-1} className="workArea circuitWorkspace" data-circuit-workspace={state.key} data-no-localize>
 <div className="workHead"><div><span className="eyebrow">NEURAL CIRCUITS</span><h1>{english?'Neural circuits':'神経回路'}</h1></div></div>
 <label className="circuitWorkspaceChooser">{english?'Circuit':'回路'} <select aria-label={english?'Choose a circuit':'回路を選択'} value={state.key} onChange={e=>choose(e.target.value as CircuitWorkspaceState['key'])}>
 <option value="papez">{english?'Papez circuit':'Papez回路'}</option><option value="visual">{english?'Visual pathway':'視覚路'}</option><option value="basal-ganglia">{english?'Basal ganglia circuits':'大脳基底核回路'}</option><option value="auditory">{english?'Hearing':'聴覚'}</option><option value="motor-descending">{english?'Descending motor route':'下行運動路'}</option><option value="dcml">{english?'Dorsal column–medial lemniscus':'後索・内側毛帯系'}</option><option value="anterolateral">{english?'Anterolateral system':'前外側系'}</option></select></label>
 <div ref={overviewRef} key={state.key}>
 {state.key==='auditory'?<AuditoryOverview onFlowChange={onFlowChange} english={english} observation={pane} selectedStep={state.auditoryStep??'input'} onSelectStep={selectAuditory} onObserve={target=>show({target,mode:'model'})}/>:<CircuitPathOverview onFlowChange={onFlowChange} circuitKey={state.key} english={english} observation={pane} position={state.positions[state.key]??{pathIndex:0,nodeIndex:0}} onPosition={selectPosition} onObserve={(index,node)=>show({index,node,mode:'model'})}/>}
 </div>
 <p className="circuitWorkspaceReviewNote">{english?'Use the main Review entry for questions and score history. Returning restores this circuit, stage and observation.':'問題・回答・得点履歴はメインの「復習」から開きます。戻ると、この回路・段階・観察を復元します。'}</p>
 </section>;
}

export function CircuitObservationFrame({rotation,onRotation,children,english}:{rotation:CircuitWorkspaceState['rotation'];onRotation:(r:CircuitWorkspaceState['rotation'])=>void;children:ReactNode;english:boolean}){
 const drag=useRef<{x:number;y:number}|null>(null);
 return <div className="circuitObservationStage" tabIndex={0} aria-label={english?'Selected circuit representation; drag or arrow keys to rotate':'選択段階の回路内観察。ドラッグ・矢印キーで回転'} data-rotation-x={rotation.x} data-rotation-y={rotation.y}
 onPointerDown={e=>{if((e.target as HTMLElement).closest('button'))return;e.currentTarget.setPointerCapture(e.pointerId);drag.current={x:e.clientX,y:e.clientY}}}
 onPointerMove={e=>{if(!drag.current)return;const dx=e.clientX-drag.current.x,dy=e.clientY-drag.current.y;drag.current={x:e.clientX,y:e.clientY};onRotation({...rotation,x:rotation.x-dy*.42,y:rotation.y+dx*.42})}}
 onPointerUp={()=>{drag.current=null}} onPointerCancel={()=>{drag.current=null}}
 onKeyDown={e=>{if(e.target!==e.currentTarget)return;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();onRotation({...rotation,x:rotation.x+(e.key==='ArrowUp'?-8:e.key==='ArrowDown'?8:0),y:rotation.y+(e.key==='ArrowLeft'?-8:e.key==='ArrowRight'?8:0)})}}}>{children}</div>;
}
