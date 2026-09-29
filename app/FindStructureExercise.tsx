import {useRef,useState,type PointerEvent} from 'react';
import {AtlasVolumeCanvas,type HighlightLayer} from './AtlasVolumeCanvas';
import {OrientationCompass} from './OrientationCompass';
import {reviewNerveDisplay} from '../src/reviewNerveDisplay';
import {BIGBRAIN_SECTION_DIMS} from './SectionSliceStepper';
import {stepPlanePosition,planeSliceIndex,nearestLabeledSection,segmentationPlaneNames} from './segmentationGeometry';
import {SEGMENTATION_LABEL_SHA256} from './segmentationLabelRevision';
import sectionLabelPresence from './sectionLabelPresence.json';
import './find-structure.css';

export type FindTask={key:string;name:string;englishName:string;kind:'section'|'surface'|'neurovascular';viewName:string;englishViewName:string;plane:'coronal'|'horizontal'|'sagittal';position:number;rotation:{x:number;y:number;z?:number};hemisphere:'both'|'left'|'right';medial:boolean;overlay:'none'|'vessels'|'nerves';focus:'ventricle'|'caudate'|'hippocampus'|'thalamus';highlight:HighlightLayer;hint:string;explanation:string};
export function FindStructureExercise({tasks,english,onBack}:{tasks:FindTask[];english:boolean;onBack:()=>void}){
  const [key,setKey]=useState(tasks[0]?.key);
  const task=tasks.find(task=>task.key===key)??tasks[0];
  if(!task)return <p>{english?'No observation tasks available.':'観察課題がありません。'}</p>;
  return <div className="findExercise">
    <header className="findReviewHeader" data-no-localize><button type="button" onClick={onBack}>{english?"← Practice menu":"← 復習の入口"}</button><strong>{english?"Structure identification":"構造同定"}</strong><label><span>{english?'Structure to find':'探す構造'}</span><select aria-label={english?"Structure to find":"探す構造"} value={task.key} onChange={event=>setKey(event.target.value)}>{(['section','surface','neurovascular'] as const).map(kind=><optgroup key={kind} label={english?{section:'Sections',surface:'Brain surface',neurovascular:'Nerves and vessels'}[kind]:{section:'断面',surface:'脳表',neurovascular:'神経・血管'}[kind]}>{tasks.filter(task=>task.kind===kind).map(task=><option key={task.key} value={task.key}>{english?task.englishName:task.name}</option>)}</optgroup>)}</select></label></header>
    <FindTaskView key={task.key} task={task} english={english} onNext={()=>setKey(tasks[(tasks.indexOf(task)+1)%tasks.length].key)}/>
  </div>;
}
function FindTaskView({task,english,onNext}:{task:FindTask;english:boolean;onNext:()=>void}){
  const [stage,setStage]=useState<'search'|'hint'|'answer'>('search');
  const [position,setPosition]=useState(task.position);
  const [viewReset,setViewReset]=useState(0);
  const [rotation,setRotation]=useState(task.rotation);
  const [unavailable,setUnavailable]=useState(false);
  const [drag,setDrag]=useState<{x:number;y:number}|null>(null);
  const [guess,setGuess]=useState<{x:number;y:number}|null>(null);
  const [answerReturnedToStart,setAnswerReturnedToStart]=useState(false);
  const press=useRef<{x:number;y:number;moved:boolean}|null>(null);
  const model=task.kind!=='section',revealed=stage==='answer';
  const planeInfo=segmentationPlaneNames[task.plane];
  const planeTitle=english?{coronal:'Coronal section',horizontal:'Horizontal section',sagittal:'Sagittal section'}[task.plane]:planeInfo.label;
  const rangeStartLabel=english?{coronal:'Posterior',horizontal:'Superior',sagittal:'Left'}[task.plane]:planeInfo.rangeStart;
  const rangeEndLabel=english?{coronal:'Anterior',horizontal:'Inferior',sagittal:'Right'}[task.plane]:planeInfo.rangeEnd;
  const highlights=revealed?[task.highlight]:[];
  const answerAbsentFromSlice=!model&&sectionLabelPresence.revision===SEGMENTATION_LABEL_SHA256&&nearestLabeledSection(sectionLabelPresence.labels,task.highlight.ids,task.plane,planeSliceIndex(position,task.plane,BIGBRAIN_SECTION_DIMS))!==null;
  function revealAnswer(){
    if(answerAbsentFromSlice){setPosition(task.position);setGuess(null)}
    setAnswerReturnedToStart(answerAbsentFromSlice);
    setStage('answer');
  }
  const retryLabel=stage==='hint'?(english?'Hide hint and try again':'ヒントを閉じてもう一度'):stage==='search'?(english?'Clear your marker':'印を消す'):(english?'Try again without colour':'色を消してもう一度');
  function rotate(event:PointerEvent<HTMLDivElement>){if(press.current&&Math.hypot(event.clientX-press.current.x,event.clientY-press.current.y)>5)press.current.moved=true;if(!drag)return;const dx=event.clientX-drag.x,dy=event.clientY-drag.y;if(dx||dy){setGuess(null);setRotation(old=>({...old,x:old.x+dy*.4,y:old.y+dx*.4}));setDrag({x:event.clientX,y:event.clientY})}}
  function markGuess(event:PointerEvent<HTMLDivElement>){const start=press.current;press.current=null;setDrag(null);if(!start||start.moved||Math.hypot(event.clientX-start.x,event.clientY-start.y)>5||stage==='answer')return;const rect=event.currentTarget.getBoundingClientRect();setGuess({x:Math.max(0,Math.min(100,(event.clientX-rect.left)/rect.width*100)),y:Math.max(0,Math.min(100,(event.clientY-rect.top)/rect.height*100))})}
  return <div className="quizWorkspace findTask" data-find-stage={stage} data-find-kind={task.kind}>
    <section className="quizImageCard">
      <div className="panelHead"><div><b>{english?task.englishName:task.name}</b><small data-no-localize>{model?(english?task.englishViewName:task.viewName):`${planeTitle} · ${planeInfo.axis}${planeSliceIndex(position,task.plane,BIGBRAIN_SECTION_DIMS)}`}</small></div><span>{english?(revealed?'Answer highlighted':'No answer highlight'):(revealed?'答えを着色中':'答えの着色なし')}</span></div>
      <div className="findImageActions" data-no-localize aria-label={english?'Structure identification actions':'構造同定の操作'}>
        {revealed?<><button type="button" onClick={()=>{setGuess(null);setAnswerReturnedToStart(false);setStage('search')}}>{retryLabel}</button><button type="button" onClick={onNext}>{english?'Next structure':'次の構造へ'}</button></>:<>{stage==='search'?<button type="button" onClick={()=>setStage('hint')}>{english?'Need a hint?':'迷ったらヒント'}</button>:<button type="button" onClick={()=>setStage('search')}>{retryLabel}</button>}<button type="button" className="findRevealAnswer" disabled={model&&unavailable} onClick={revealAnswer}>{english?'Reveal colour to check':'着色して答え合わせ'}</button></>}
      </div>
      <div className={'quizImageStage '+(model?'modelStage':'')} tabIndex={model?0:undefined} aria-label={model?(english?'Observation image; arrow keys rotate the 3D model':'観察画像・3Dは矢印キーで回転'):undefined} onPointerDown={event=>{if(event.button!==0||!(event.target instanceof HTMLCanvasElement))return;press.current={x:event.clientX,y:event.clientY,moved:false};if(model){event.currentTarget.setPointerCapture(event.pointerId);setDrag({x:event.clientX,y:event.clientY})}}} onPointerMove={rotate} onPointerUp={markGuess} onPointerCancel={()=>{press.current=null;setDrag(null)}} onKeyDown={model?event=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();setGuess(null);setRotation(old=>({...old,x:old.x+(event.key==='ArrowUp'?-5:event.key==='ArrowDown'?5:0),y:old.y+(event.key==='ArrowLeft'?-5:event.key==='ArrowRight'?5:0)}))}}:undefined}>
        <AtlasVolumeCanvas key={viewReset} kind={model?'surface':'slice'} plane={task.plane} position={position} focus={task.focus} display="specimen" rotation={rotation} contrast="bigbrain" view={task.overlay==='vessels'?'ghost':'inside'} dimContextOverlays={task.kind==='neurovascular'&&revealed} showFocus={false} showCutPlane={false} hemisphere={task.hemisphere} showCerebralHemispheres={task.overlay!=='nerves'||reviewNerveDisplay(task.key).showCerebralHemispheres} hiddenNeurovascularIds={task.overlay==='nerves'?reviewNerveDisplay(task.key).hiddenNerveIds:[]} showCerebellum={task.kind==='surface'&&!task.medial} surfaceAriaLabel={task.overlay==='nerves'&&!reviewNerveDisplay(task.key).showCerebralHemispheres?(english?'Opaque brainstem with schematic proximal cranial-nerve segments':'不透明な脳幹と近位部の模式脳神経モデル'):undefined} showPonsMedulla={!task.medial} showMidbrain={!task.medial} keepBrainstemOpaqueInGhost={task.overlay==='nerves'} highlights={task.kind==='section'?highlights:[]} surfaceHighlights={task.kind==='surface'?highlights:[]} neurovascularOverlay={task.overlay} neurovascularHighlights={task.kind==='neurovascular'?highlights:[]} showBrainstemNerves={task.overlay==='nerves'} onWebGLUnavailableChange={setUnavailable} onViewChange={()=>setGuess(null)}/>
        {model&&!unavailable&&<OrientationCompass rotation={rotation} compact english={english}/>}
        {guess&&<span className="findGuessMarker" style={{left:`${guess.x}%`,top:`${guess.y}%`}} aria-hidden="true"/>}
      </div>
      {!model&&<div className="quizSliceNavigator findSliceNavigator" data-no-localize>
        <span className="findSliceEnd"><strong>{{coronal:'P',horizontal:'S',sagittal:'L'}[task.plane]}</strong>{rangeStartLabel}</span>
        <label><span className="srOnly">{english?`Move through nearby sections: ${rangeStartLabel} on the left, ${rangeEndLabel} on the right`:`近くの断面へ動かす。左が${rangeStartLabel}、右が${rangeEndLabel}`}</span><input type="range" min="0" max="100" step="any" value={position} onChange={event=>{setGuess(null);setAnswerReturnedToStart(false);setPosition(Number(event.target.value))}} onKeyDown={event=>{if(['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();setGuess(null);setAnswerReturnedToStart(false);setPosition(old=>stepPlanePosition(old,task.plane,BIGBRAIN_SECTION_DIMS,event.key==='ArrowLeft'?-1:1))}}}/></label>
        <span className="findSliceEnd"><strong>{{coronal:'A',horizontal:'I',sagittal:'R'}[task.plane]}</strong>{rangeEndLabel}</span>
      </div>}
      <button onClick={()=>{setGuess(null);setAnswerReturnedToStart(false);setRotation(task.rotation);setPosition(task.position);setViewReset(value=>value+1)}}>{english?'Return to starting view':'開始位置・向きに戻す'}</button>
    </section>
    <aside className="quizQuestionCard findTaskGuide">
      <div className="findTaskGuideBody">
      <h2>{english?`Find ${task.englishName}`:`${task.name}を探してください`}</h2>
      {stage==='search'&&<><p className="findInstruction" data-no-localize>{english?<>First, locate the structure yourself. Tap or click your predicted location to leave a marker, then press <strong>“Reveal colour to check”</strong>.</>:<>まず、自分で構造を探します。予想した場所をタップ・クリックすると印を付けられます。その後、<strong>「着色して答え合わせ」</strong>を押してください。</>}</p><p className="findClickNote" data-no-localize>{english?(model?'The marker is optional and not scored. Drag to rotate the 3D model.':'The marker is optional and not scored. Drag to move the section image.'):(model?'印は任意で、採点はしません。ドラッグで3Dモデルを回転できます。':'印は任意で、採点はしません。ドラッグで断面画像を移動できます。')}</p></>}
      {guess&&<p className="findGuessStatus" role="status">{english?'Your predicted location is marked in amber.':'予想した位置に琥珀色の印を付けました。'}</p>}
      {!revealed&&<div className="findActions">
        {stage==='search'&&<button onClick={()=>setStage('hint')}>{english?'Need a hint?':'迷ったらヒント'}</button>}
        <button className="findRevealAnswer" disabled={model&&unavailable} onClick={revealAnswer}>{english?'Reveal colour to check':'着色して答え合わせ'}</button>
      </div>}

      <div aria-live="polite">{answerReturnedToStart&&revealed&&<p>{english?'This structure was absent from the chosen slice, so the answer is shown at the starting slice.':'選んだ断面にはこの構造がないため、開始断面に戻して答えを表示しました。'}</p>}{revealed&&answerAbsentFromSlice&&<p>{english?'This structure is not present in the current slice. Return to the starting view to check the colour.':'現在の断面にはこの構造がありません。開始位置に戻して着色を確認してください。'}</p>}{stage!=='search'&&<section><h3>{english?'Location hint':'位置のヒント'}</h3><p>{task.hint}</p></section>}{revealed&&<section><h3>{english?'Check the structure and its role':'位置と働きを確認'}</h3><p>{task.explanation}</p>{!answerAbsentFromSlice&&<p>{answerReturnedToStart?(english?'Locate the highlighted structure and its neighbours in the starting slice.':'開始断面で、着色された構造と周囲の位置関係を確認してください。'):(english?'Compare the highlighted area with the location you chose.':'自分が探した位置と、着色された範囲を見比べてください。')}</p>}</section>}</div>
      {!model&&!revealed&&<details className="findPlaneGuide" data-no-localize><summary>{english?`How to read the ${planeTitle.toLowerCase()}`:`${planeTitle}の見方`}</summary><p>{english?{coronal:'A front–back series: screen left/right = specimen L/R, top/bottom = superior/inferior.',horizontal:'A top–bottom series: screen left/right = specimen L/R, top/bottom = anterior/posterior.',sagittal:'A left–right series: screen left/right = anterior/posterior, top/bottom = superior/inferior.'}[task.plane]:{coronal:'前後に切り進める断面です。画面の左右は標本のL/R、上が上方、下が下方です。',horizontal:'上下に切り進める断面です。画面の左右は標本のL/R、上が前方、下が後方です。',sagittal:'左右に切り進める断面です。画面の左が前方、右が後方、上が上方です。'}[task.plane]}</p><p>{english?'The same structure changes shape and may disappear as the cut moves. Compare neighbouring slices; return to the starting view if it is no longer visible.':'同じ構造でも切る位置により形や大きさが変わり、断面に現れなくなることがあります。隣接断面と見比べ、見失ったら開始位置に戻してください。'}</p></details>}
      {model&&unavailable&&<p>{english?'3D is unavailable. Choose a section task to continue.':'3Dを表示できません。断面の課題を選んで続けられます。'}</p>}
      </div>
      <div className="findActions"><button disabled={stage==='search'&&!guess} onClick={()=>{setGuess(null);setAnswerReturnedToStart(false);setStage('search')}}>{retryLabel}</button><button onClick={onNext}>{english?'Next structure':'次の構造へ'}</button></div>
    </aside>
  </div>;
}
