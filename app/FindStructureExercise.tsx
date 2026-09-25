import {useState,type PointerEvent} from 'react';
import {AtlasVolumeCanvas,type HighlightLayer} from './AtlasVolumeCanvas';
import {BIGBRAIN_SECTION_DIMS} from './SectionSliceStepper';
import {stepPlanePosition,planeSliceIndex,segmentationPlaneNames} from './segmentationGeometry';
import './find-structure.css';

export type FindTask={key:string;name:string;englishName:string;kind:'section'|'surface'|'neurovascular';plane:'coronal'|'horizontal'|'sagittal';position:number;rotation:{x:number;y:number;z?:number};hemisphere:'both'|'left'|'right';medial:boolean;overlay:'none'|'vessels'|'nerves';focus:'ventricle'|'caudate'|'hippocampus'|'thalamus';highlight:HighlightLayer;hint:string;explanation:string};
export function FindStructureExercise({tasks,english}:{tasks:FindTask[];english:boolean}){
  const [key,setKey]=useState(tasks[0]?.key);
  const task=tasks.find(task=>task.key===key)??tasks[0];
  if(!task)return <p>{english?'No observation tasks available.':'観察課題がありません。'}</p>;
  return <div className="findExercise">
    <label>{english?'Structure to find':'探す構造'}<select aria-label={english?"Structure to find":"探す構造"} value={task.key} onChange={event=>setKey(event.target.value)}>{(['section','surface','neurovascular'] as const).map(kind=><optgroup key={kind} label={english?{section:'Sections',surface:'Brain surface',neurovascular:'Nerves and vessels'}[kind]:{section:'断面',surface:'脳表',neurovascular:'神経・血管'}[kind]}>{tasks.filter(task=>task.kind===kind).map(task=><option key={task.key} value={task.key}>{english?task.englishName:task.name}</option>)}</optgroup>)}</select></label>
    <FindTaskView key={task.key} task={task} english={english} onNext={()=>setKey(tasks[(tasks.indexOf(task)+1)%tasks.length].key)}/>
  </div>;
}
function FindTaskView({task,english,onNext}:{task:FindTask;english:boolean;onNext:()=>void}){
  const [stage,setStage]=useState<'search'|'hint'|'answer'>('search');
  const [position,setPosition]=useState(task.position);
  const [rotation,setRotation]=useState(task.rotation);
  const [unavailable,setUnavailable]=useState(false);
  const [drag,setDrag]=useState<{x:number;y:number}|null>(null);
  const model=task.kind!=='section',revealed=stage==='answer';
  const planeInfo=segmentationPlaneNames[task.plane];
  const planeTitle=english?{coronal:'Coronal section',horizontal:'Horizontal section',sagittal:'Sagittal section'}[task.plane]:planeInfo.label;
  const highlights=revealed?[task.highlight]:[];
  function rotate(event:PointerEvent<HTMLDivElement>){if(!drag)return;setRotation(old=>({...old,x:old.x+(event.clientY-drag.y)*.4,y:old.y+(event.clientX-drag.x)*.4}));setDrag({x:event.clientX,y:event.clientY})}
  return <div className="quizWorkspace findTask" data-find-stage={stage} data-find-kind={task.kind}>
    <section className="quizImageCard">
      <div className="panelHead"><div><b>{english?task.englishName:task.name}</b>{!model&&<small data-no-localize>{planeTitle} · {planeInfo.axis}{planeSliceIndex(position,task.plane,BIGBRAIN_SECTION_DIMS)}</small>}</div><span>{english?(revealed?'Answer highlighted':'No answer highlight'):(revealed?'答えを着色中':'答えの着色なし')}</span></div>
      <div className={'quizImageStage '+(model?'modelStage':'')} tabIndex={model?0:undefined} aria-label={english?'Observation image; arrow keys rotate the 3D model':'観察画像・3Dは矢印キーで回転'} onPointerDown={model?event=>{if((event.target as HTMLElement).closest('button'))return;event.currentTarget.setPointerCapture(event.pointerId);setDrag({x:event.clientX,y:event.clientY})}:undefined} onPointerMove={model?rotate:undefined} onPointerUp={()=>setDrag(null)} onPointerCancel={()=>setDrag(null)} onKeyDown={model?event=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();setRotation(old=>({...old,x:old.x+(event.key==='ArrowUp'?-5:event.key==='ArrowDown'?5:0),y:old.y+(event.key==='ArrowLeft'?-5:event.key==='ArrowRight'?5:0)}))}}:undefined}>
        <AtlasVolumeCanvas kind={model?'surface':'slice'} plane={task.plane} position={position} focus={task.focus} display="specimen" rotation={rotation} contrast="bigbrain" view={task.kind==='neurovascular'?'ghost':'inside'} showFocus={false} showCutPlane={false} hemisphere={task.hemisphere} showCerebellum={task.kind==='surface'&&!task.medial} showPonsMedulla={!task.medial} showMidbrain={!task.medial} keepBrainstemOpaqueInGhost={task.overlay==='nerves'} highlights={task.kind==='section'?highlights:[]} surfaceHighlights={task.kind==='surface'?highlights:[]} neurovascularOverlay={task.overlay} neurovascularHighlights={task.kind==='neurovascular'?highlights:[]} showBrainstemNerves={task.overlay==='nerves'} onWebGLUnavailableChange={setUnavailable}/>
      </div>
      {!model&&<div className="quizSliceNavigator"><div className="findSliceEnds" data-no-localize><span>{english?{coronal:'Posterior',horizontal:'Superior',sagittal:'Left'}[task.plane]:planeInfo.rangeStart}</span><span>{english?{coronal:'Anterior',horizontal:'Inferior',sagittal:'Right'}[task.plane]:planeInfo.rangeEnd}</span></div><label>{english?'Move through nearby sections':'近くの断面へ動かす'}<input type="range" min="0" max="100" step="any" value={position} onChange={event=>setPosition(Number(event.target.value))} onKeyDown={event=>{if(['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();setPosition(old=>stepPlanePosition(old,task.plane,BIGBRAIN_SECTION_DIMS,event.key==='ArrowLeft'?-1:1))}}}/></label></div>}
      <button onClick={()=>{setRotation(task.rotation);setPosition(task.position)}}>{english?'Return to starting view':'開始位置・向きに戻す'}</button>
    </section>
    <aside className="quizQuestionCard findTaskGuide">
      <h2>{english?`Find ${task.englishName}`:`${task.name}を探してください`}</h2>
      <p>{english?'Point out the structure before revealing its colour. Rotate the model or move through nearby sections. This is self-check practice; clicking the image does not score your answer.':'着色を見る前に、どこにあるか指し示してみましょう。回転や隣接断面も使えます。画像のクリックによる採点は行いません。'}</p>
      {!model&&<div className="findPlaneGuide" data-no-localize><b>{planeTitle}</b><p>{english?{coronal:'A front–back series: screen left/right = specimen L/R, top/bottom = superior/inferior.',horizontal:'A top–bottom series: screen left/right = specimen L/R, top/bottom = anterior/posterior.',sagittal:'A left–right series: screen left/right = anterior/posterior, top/bottom = superior/inferior.'}[task.plane]:{coronal:'前後に切り進める断面です。画面の左右は標本のL/R、上が上方、下が下方です。',horizontal:'上下に切り進める断面です。画面の左右は標本のL/R、上が前方、下が後方です。',sagittal:'左右に切り進める断面です。画面の左が前方、右が後方、上が上方です。'}[task.plane]}</p><p>{english?'The same structure changes shape and may disappear as the cut moves. Compare neighbouring slices; return to the starting view if it is no longer visible.':'同じ構造でも切る位置により形や大きさが変わり、断面に現れなくなることがあります。隣接断面と見比べ、見失ったら開始位置に戻してください。'}</p></div>}
      <div className="findActions">
        <button disabled={stage!=='search'} onClick={()=>setStage('hint')}>{english?'1. Show a hint':'1. ヒントを見る'}</button>
        <button disabled={revealed||(model&&unavailable)} onClick={()=>setStage('answer')}>{english?'2. Reveal the answer':'2. 着色して答え合わせ'}</button>
      </div>
      <div aria-live="polite">{stage!=='search'&&<section><h3>{english?'Location hint':'位置のヒント'}</h3><p>{task.hint}</p></section>}{revealed&&<section><h3>{english?'Check the structure and its role':'位置と働きを確認'}</h3><p>{task.explanation}</p><p>{english?'Compare the highlighted area with the location you chose.':'自分が示した場所と、着色された範囲を見比べてください。'}</p></section>}</div>
      {model&&unavailable&&<p>{english?'3D is unavailable. Choose a section task to continue.':'3Dを表示できません。断面の課題を選んで続けられます。'}</p>}
      <div className="findActions"><button disabled={stage==='search'} onClick={()=>setStage('search')}>{english?'Try again without colour':'色を消してもう一度'}</button><button onClick={onNext}>{english?'Next structure':'次の構造へ'}</button></div>
    </aside>
  </div>;
}
