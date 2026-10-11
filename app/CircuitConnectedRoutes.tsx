import {circuitTeaching} from '../src/circuitTeaching.mjs';
import {CircuitConnectionGraph,type CircuitConnectionNode,type CircuitConnectionEdge} from './CircuitConnectionGraph';
import type {CircuitPosition} from './CircuitTeachingPanel';

// Coordinates below are diagram layout units only, never anatomical coordinates.
export function CircuitPathGraph({circuitKey,english,position,onPosition,fullVisual=false}:{circuitKey:string;english:boolean;position:CircuitPosition;onPosition:(p:CircuitPosition)=>void;fullVisual?:boolean}){
 const circuit=circuitTeaching(circuitKey);if(!circuit)return null;const lang=english?'en':'ja';
 const nodes:CircuitConnectionNode[]=[],edges:CircuitConnectionEdge[]=[];
 const kind=(key:string):CircuitConnectionNode['kind']=>['anterior-thalamus','cingulate','entorhinal','thalamus','cortex','gpi-snr','v1'].includes(key)?'reference':['retina','optic-nerve','optic-radiation','mammillothalamic','cingulum'].includes(key)?'schematic':'model';
 if(circuitKey==='visual'&&!fullVisual){
  const p=circuit.paths[position.pathIndex]??circuit.paths[0],coords=[[100,70],[300,70],[500,70],[500,210],[300,210],[100,210],[100,350]];
  p.nodes.forEach((key,n)=>{nodes.push({key:position.pathIndex+':'+n,selectKey:position.pathIndex+':'+n,label:p.labels?.[n]?.[lang]??circuit.nodes.find(v=>v.key===key)!.label[lang],x:coords[n][0],y:coords[n][1],kind:kind(key)});if(n)edges.push({from:position.pathIndex+':'+(n-1),to:position.pathIndex+':'+n,label:n===2?(p.kind==='crossed'?(english?'crossed':'交叉'):(english?'uncrossed':'非交叉')):undefined});});
 }else if(circuitKey==='visual'){
  const xs=[350,1070,830,110],targets=[830,1070,350,110];
  circuit.paths.forEach((p,i)=>{for(let n=0;n<3;n++){const key=p.nodes[n];nodes.push({key:i+':'+n,selectKey:i+':'+n,label:p.labels![n][lang],x:n===2?targets[i]:xs[i],y:[80,220,420][n],kind:kind(key)});if(n)edges.push({from:i+':'+(n-1),to:i+':'+n,label:n===2?(p.kind==='crossed'?(english?'crossed':'交叉'):(english?'uncrossed':'非交叉')):undefined});}edges.push({from:i+':2',to:(i<2?'right':'left')+':3'});});
  for(const side of ['left','right']){const p=circuit.paths[side==='right'?0:2];for(let n=3;n<7;n++){const key=p.nodes[n];const candidate=(position.pathIndex<2?'right':'left')===side?position.pathIndex:side==='right'?0:2;nodes.push({key:side+':'+n,selectKey:candidate+':'+n,label:p.labels![n][lang],x:side==='right'?950:230,y:600+(n-3)*160,kind:kind(key)});if(n>3)edges.push({from:side+':'+(n-1),to:side+':'+n});}}
 }else if(['motor-descending','dcml','anterolateral'].includes(circuitKey)){
  const p=circuit.paths[0],coords=[[100,70],[300,70],[500,70],[500,210],[300,210],[100,210],[100,350],[300,350]];
  p.nodes.forEach((key,i)=>{const n=circuit.nodes.find(n=>n.key===key)!;nodes.push({key,selectKey:key,label:english?n.label.en.split(' ').reduce((lines,word)=>{const last=lines.at(-1);if(last&&(last+' '+word).length<=17)lines[lines.length-1]=last+' '+word;else lines.push(word);return lines;},[] as string[]).join('\n'):n.label.ja,x:coords[i][0],y:coords[i][1],kind:n.observationIndex===null?'schematic':'reference'});if(i)edges.push({from:p.nodes[i-1],to:key,label:key.endsWith('cross')?(english?'crosses':'交叉'):undefined});});
 }else{
  const coords:Record<string,[number,number]>=circuitKey==='papez'?{hippocampus:[100,70],fornix:[300,70],mammillary:[500,70],mammillothalamic:[500,210],'anterior-thalamus':[500,350],cingulate:[300,350],cingulum:[100,350],entorhinal:[100,210]}:{cortex:[140,100],striatum:[380,100],gpe:[620,100],stn:[620,360],'gpi-snr':[380,360],thalamus:[140,360]};
  circuit.nodes.forEach(n=>{const coord=coords[n.key];if(!coord)return;const [x,y]=coord;nodes.push({key:n.key,label:n.label[lang],x,y,selectKey:n.key,kind:kind(n.key)});});
  const seen=new Set<string>();circuit.paths.forEach(p=>p.nodes.slice(1).forEach((to,i)=>{const from=p.nodes[i],id=from+'>'+to;if(!seen.has(id)){seen.add(id);edges.push({from,to,label:p.signs?.[i],...(from==='cortex'&&to==='stn'?{via:[{x:0,y:100},{x:0,y:480},{x:620,y:480}],label:english?'Hyperdirect +':'ハイパー直接路 ＋'}:{})});}}));
 }
 nodes.forEach(node=>{const key=circuitKey==='visual'?circuit.paths[Number(node.selectKey?.split(':')[0])]?.nodes[Number(node.selectKey?.split(':')[1])]:node.key;const detail=circuit.nodes.find(n=>n.key===key)?.detail[lang];if(detail)node.explanation=key==='fornix'?detail.split(/(?<=。|\. )/).at(-1)?.trim():detail.split(/(?<=。|\. )/)[0].trim();});
 const selected=circuit.paths[position.pathIndex]?.nodes[position.nodeIndex];
 const active=circuit.paths[position.pathIndex]??circuit.paths[0];
 edges.forEach(edge=>{edge.active=circuitKey==='visual'?(edge.from.startsWith(position.pathIndex+':')||edge.from.startsWith((position.pathIndex<2?'right':'left')+':')):active.nodes.slice(1).some((to,i)=>active.nodes[i]===edge.from&&to===edge.to);});
 const visualNode=(n:number)=>fullVisual&&n>=3?(position.pathIndex<2?'right':'left')+':'+n:position.pathIndex+':'+n;
 edges.forEach(edge=>{const next=active.nodes[position.nodeIndex+1];edge.current=!!next&&(circuitKey==='visual'?edge.from===visualNode(position.nodeIndex)&&edge.to===visualNode(position.nodeIndex+1):edge.from===selected&&edge.to===next);});
 return <><CircuitConnectionGraph english={english} nodes={nodes} edges={edges} selectedKey={circuitKey==='visual'?position.pathIndex+':'+position.nodeIndex:selected??''} onSelect={key=>{if(circuitKey==='visual'){const [pathIndex,nodeIndex]=key.split(':').map(Number);onPosition({pathIndex,nodeIndex});return;}let pathIndex=position.pathIndex,nodeIndex=circuit.paths[pathIndex]?.nodes.indexOf(key)??-1;if(nodeIndex<0){pathIndex=circuit.paths.findIndex(p=>p.nodes.includes(key));nodeIndex=circuit.paths[pathIndex]?.nodes.indexOf(key)??-1;}if(pathIndex<0||nodeIndex<0)return;onPosition({pathIndex,nodeIndex});}}/>{circuitKey==='visual'&&!fullVisual&&<details className="circuitVisualComparison"><summary>{english?'Compare all four visual flows':'両側・4つの流れを比較'}</summary><CircuitPathGraph circuitKey={circuitKey} english={english} position={position} onPosition={onPosition} fullVisual/></details>}</>;
}

export function AuditoryConnectionGraph({english,selectedKey,onSelect,explanations}:{english:boolean;selectedKey:string;onSelect:(key:string)=>void;explanations?:Record<string,string>}){
 const stages=['input','input','bilateral','colliculus','mgb','cortex'];
 const labels=english?['Cochlea → CN VIII','Cochlear nuclei','Ascending brainstem\n(bilateral input)','Inferior colliculus','MGB → radiation','Auditory cortex']:['蝸牛 → VIII','蝸牛神経核','脳幹上行路\n（両耳からの入力）','下丘','MGB → 聴放線','聴覚皮質'];
 const nodes:CircuitConnectionNode[]=[],edges:CircuitConnectionEdge[]=[];
 for(const [row,side]of ['left','right'].entries()){for(let i=0;i<6;i++){nodes.push({key:side+':'+i,selectKey:stages[i],label:(i===0?(english?(row?'Right ear\n':'Left ear\n'):(row?'右耳\n':'左耳\n')):(english?(row?'Right\n':'Left\n'):(row?'右\n':'左\n')))+labels[i],x:110+(i%3)*210,y:70+(Math.floor(i/3)*2+row)*130,kind:i>=4?'reference':'schematic'});if(i&&i!==2)edges.push({from:side+':'+(i-1),to:side+':'+i});}}
 for(const from of ['left','right'])for(const to of ['left','right'])edges.push({from:from+':1',to:to+':2',label:undefined});
 nodes.forEach(node=>{node.explanation=explanations?.[node.selectKey??node.key];});
 edges.forEach(edge=>{const from=Number(edge.from.split(':')[1]);edge.current=selectedKey==='input'?from<=1:selectedKey==='bilateral'?from===2:selectedKey==='colliculus'?from===3:selectedKey==='mgb'?from===4:false;if(selectedKey==='input'&&from<=1)edge.flowPart=from===0?'first':'second';});
 return <><CircuitConnectionGraph english={english} nodes={nodes} edges={edges} selectedKey={selectedKey} onSelect={onSelect}/><p className="circuitGraphQualification">{english?'Grouped ascending routes: not every fibre traverses every named relay. The crossing arrows show bilateral relationships, not an exact crossing site.':'上行路をまとめた関係図です。全線維が全中継を順通過するわけではありません。交差する矢印は両側への関係を示し、正確な交叉位置ではありません。'}</p></>;
}
