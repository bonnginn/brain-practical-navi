import {AuditoryConnectionGraph} from './CircuitConnectedRoutes';
import {useState,type ReactNode} from 'react';
import {CircuitOverview} from './CircuitOverview';
const memoryKey='brain-practical-navigator:auditory-overview:v1';
export function AuditoryOverview({english,onObserve,observation,onSelectStep,selectedStep,onFlowChange}:{english:boolean;onObserve:(target:'cortex'|'cn8'|'mgb')=>void;observation?:ReactNode;onSelectStep?:(key:string)=>void;selectedStep?:string;onFlowChange?:(playing:boolean,seconds:number)=>void}){
 const [storedSelected,setSelected]=useState(()=>{try{return localStorage.getItem(memoryKey)??'input'}catch{return 'input'}});
 const selected=selectedStep??storedSelected;
 const choose=(key:string)=>{setSelected(key);onSelectStep?.(key);try{localStorage.setItem(memoryKey,key)}catch{/* Selection remains usable without storage. */}};
 const unavailable=english?'Explanation only; no individual specimen label or 3D relay.':'説明のみ。個別の標本ラベル・3D中継モデルはありません。';
 const stages=english?[
  {key:'input',name:'Cochlea → CN VIII → cochlear nuclei',detail:'The cochlear part of CN VIII first reaches the cochlear nuclei on the same side.',representation:'CN VIII is a schematic. The cochlea and cochlear nuclei are not modelled here; this is not the full auditory tract.',canObserve:true},
  {key:'bilateral',name:'Brainstem: inputs from both ears',detail:'Left ear ↗ both sides ↖ right ear. The superior olivary complex receives bilateral input; ascending routes include the lateral lemniscus. Not every fibre passes through every relay.',representation:unavailable,canObserve:false},
  {key:'colliculus',name:'Inferior colliculus',detail:'A major midbrain relay in the ascending auditory pathways, before the MGB.',representation:unavailable,canObserve:false},
  {key:'mgb',name:'MGB → auditory radiation',detail:'The medial geniculate body relays toward auditory cortex through the auditory radiation.',representation:'Existing published MGB reference shape below; whole-thalamus colour is not an MGB label. Auditory radiation is not reconstructed.',canObserve:true},
  {key:'cortex',name:'Auditory cortex',detail:'Auditory information reaches cortex mainly in the transverse temporal gyri. Above cochlear nuclei, each side carries information from both ears.',representation:'Existing transverse-temporal atlas parcel; it is not the whole route or a strict boundary of primary auditory cortex.',canObserve:true},
 ]:[
  {key:'input',name:'蝸牛 → VIII → 蝸牛神経核',detail:'内耳神経VIIIの蝸牛部は、まず同側の蝸牛神経核へ向かいます。',representation:'VIIIは模式表示です。蝸牛・蝸牛神経核のモデルはなく、聴覚路全体の3Dではありません。',canObserve:true},
  {key:'bilateral',name:'脳幹：両耳から両側へ',detail:'左耳 ↗ 両側 ↖ 右耳。上オリーブ複合体は両耳から入力を受け、上行路には外側毛帯が含まれます。すべての線維が全中継を順に通るわけではありません。',representation:unavailable,canObserve:false},
  {key:'colliculus',name:'下丘',detail:'上行性聴覚路の中脳の主要中継で、MGBへ向かう経路に位置します。',representation:unavailable,canObserve:false},
  {key:'mgb',name:'MGB → 聴放線',detail:'内側膝状体から聴放線を通じて聴覚皮質へ向かいます。',representation:'下の既存公表MGB参照形状で確認できます。視床全体の着色はMGBではなく、聴放線の3D再構成もありません。',canObserve:true},
  {key:'cortex',name:'聴覚皮質',detail:'主に横側頭回の聴覚皮質へ情報が伝わります。蝸牛神経核より上では、各側に両耳からの情報が伝わります。',representation:'既存アトラスの横側頭回parcelです。全経路や一次聴覚皮質の厳密な境界ではありません。',canObserve:true},
 ];
 return <div data-auditory-overview><CircuitOverview onFlowChange={onFlowChange} connectionGraph={<AuditoryConnectionGraph english={english} selectedKey={selected} onSelect={choose} explanations={Object.fromEntries(stages.map(stage=>[stage.key,stage.detail.split(/(?<=。|\. )/)[0].trim()]))}/>} observation={observation} english={english} title={english?'Hearing: from both ears to cortex':'聴覚：両耳から皮質まで'} briefPurpose={english?'Carries sound information from both ears through brainstem and thalamic relays to auditory cortex.':'両耳からの音の情報を、脳幹・視床の中継を経て聴覚皮質へ伝える経路です。'} purpose={english?'Follow the main relays before inspecting available structures. A single cortical parcel is only one endpoint.':'観察する前に、主要中継の全体をたどります。単体の皮質parcelは、その終点の一部です。'} laterality={english?'Cochlea → same-side cochlear nuclei; above them, both ears contribute to both sides. These grouped stages are not a mandatory single-file route through all relays.':'蝸牛 → 同側の蝸牛神経核。その上では両耳から両側へ。以下は中継をまとめた説明で、全線維がすべてを順通過する一本道ではありません。'} observeLabel={selected==='mgb'?(english?'Open MGB reference shape':'MGBの参照形状を開く'):selected==='cortex'?(english?'Observe transverse-temporal parcel':'横側頭回parcelを観察する'):(english?'Observe CN VIII schematic only':'VIIIの模式表示だけを観察する')} stages={stages} selectedKey={stages.some(s=>s.key===selected)?selected:'input'} onSelect={choose} onObserve={()=>onObserve(selected==='mgb'?'mgb':selected==='cortex'?'cortex':'cn8')}/></div>;
}
