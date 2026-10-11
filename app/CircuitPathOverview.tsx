import {CircuitPathGraph} from './CircuitConnectedRoutes';
import type {ReactNode} from 'react';
import {circuitTeaching} from '../src/circuitTeaching.mjs';
import {CircuitOverview} from './CircuitOverview';
import type {CircuitPosition} from './CircuitTeachingPanel';

// Short versions of the existing role explanations; detailed qualifications remain below.
const briefRoles:Record<string,[string,string]>={
 papez:['記憶に関わる海馬・間脳・帯状回のつながりを示す、古典的な回路モデルです。','A classical model of hippocampal, diencephalic and cingulate connections involved in memory.'],
 visual:['網膜から一次視覚野へ、視覚情報を伝える経路です。','Carries visual information from the retina to primary visual cortex.'],
 'basal-ganglia':['視床と大脳皮質の活動を調節し、行動の選択に関わる回路です。','Regulates thalamocortical activity and contributes to action selection.'],
 'motor-descending':['大脳皮質から脊髄へ、体幹・四肢の運動に関わる出力を伝える経路です。','Carries cortical output to the spinal cord for trunk and limb movement.'],
 dcml:['体幹・四肢の細かな触覚、振動覚、位置感覚を大脳へ伝える経路です。','Carries discriminative touch, vibration and conscious position sense from the body to cortex.'],
 anterolateral:['体幹・四肢の痛みや温度の情報を大脳へ伝える代表的な経路です。','A representative pathway carrying body pain and temperature information to cortex.'],
};

export function CircuitPathOverview({circuitKey,english,position,onPosition,onObserve,observation,onFlowChange}:{circuitKey:string;english:boolean;position:CircuitPosition;onPosition:(p:CircuitPosition)=>void;onObserve:(index:number,key:string)=>void;observation?:ReactNode;onFlowChange?:(playing:boolean,seconds:number)=>void}){
 const circuit=circuitTeaching(circuitKey);if(!circuit)return null;
 const lang=english?'en':'ja', pathIndex=Math.min(position.pathIndex,circuit.paths.length-1),path=circuit.paths[pathIndex];
 const briefPurpose=briefRoles[circuitKey]?.[english?1:0];
 const stages=path.nodes.map((key,index)=>{const node=circuit.nodes.find(n=>n.key===key)!;return {key:String(index),name:path.labels?.[index]?.[lang]??node.label[lang],detail:node.detail[lang]+(path.signs?.[index]?` · ${english?'Next connection':'次の接続'}: ${path.signs[index]}`:''),representation:node.specimen[lang]+' '+node.limitation[lang],canObserve:node.observationIndex!==null||!!node.observations?.length};});
 const laterality=['motor-descending','dcml','anterolateral'].includes(circuitKey)?circuit.displayLimit[lang]:circuitKey==='visual'?path.label[lang]:english?'The schematic explains connections; it does not reconstruct individual bilateral fibres. Specimen colour shows structures, not projections.':'模式図はつながりを説明し、左右の個々の線維を再構成しません。標本の着色は構造を示し、投射を示しません。';
 return <div data-circuit-path-overview data-no-localize>
  {circuit.paths.length>1&&<label className="circuitOverviewPath">{english?'Choose the flow to follow':'たどる流れを選択'} <select value={pathIndex} onChange={e=>onPosition({pathIndex:Number(e.target.value),nodeIndex:0})}>{circuit.paths.map((p,i)=><option key={p.key} value={i}>{p.label[lang]}</option>)}</select></label>}
  <CircuitOverview onFlowChange={onFlowChange} connectionGraph={<CircuitPathGraph circuitKey={circuitKey} english={english} position={position} onPosition={onPosition}/>} observation={observation} english={english} title={circuit.name[lang]} purpose={circuit.role[lang]} briefPurpose={briefPurpose} laterality={laterality} stages={stages} selectedKey={String(Math.min(position.nodeIndex,stages.length-1))} onSelect={key=>onPosition({pathIndex,nodeIndex:Number(key)})} onObserve={()=>{const node=circuit.nodes.find(n=>n.key===path.nodes[position.nodeIndex]);const index=node?.observationIndex??node?.observations?.[0]?.index;if(node&&index!==undefined&&index!==null)onObserve(index,node.key)}}/>
 {circuit.quizIds&&<details className="accuracyNote"><summary>{english?'Sources and related review':'出典と関連する復習'}</summary><p>{english?'Open the main Review entry to use existing questions for this route and return to your observation.':'メインの「復習」で、この経路に関連する収録済みの問題から観察へ戻れます。'}</p><ul>{circuit.sources.map(s=><li key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.label}</a></li>)}</ul></details>}
 </div>;
}
