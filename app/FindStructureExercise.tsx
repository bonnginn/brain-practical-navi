import type {FindProgress,FindViewProgress} from '../src/explorationProgress.mjs';
import {useEffect,useLayoutEffect,useRef,useState,type PointerEvent} from 'react';
import {scheduleReadingRestore} from '../src/scheduleReadingRestore.mjs';
import {AtlasVolumeCanvas,type HighlightLayer} from './AtlasVolumeCanvas';
import {OrientationCompass} from './OrientationCompass';
import {ThalamusGuide} from './ThalamusGuide';
import {ExternalSpecimenVideo} from './ExternalSpecimenVideo';
import {reviewNerveDisplay} from '../src/reviewNerveDisplay';
import {BIGBRAIN_SECTION_DIMS} from './SectionSliceStepper';
import {stepSectionSliderPosition,representativeLabeledSection,planePositionForSlice,sectionSliderDirections,sectionSliderValue,sectionPositionFromSlider,planeSliceIndex,nearestLabeledSection,segmentationPlaneNames} from './segmentationGeometry';
import {SEGMENTATION_LABEL_SHA256} from './segmentationLabelRevision';
import sectionLabelPresence from './sectionLabelPresence.json';
import './find-structure.css';

export type FindTask={key:string;name:string;englishName:string;kind:'section'|'surface'|'neurovascular';viewName:string;englishViewName:string;plane:'coronal'|'horizontal'|'sagittal';position:number;rotation:{x:number;y:number;z?:number};hemisphere:'both'|'left'|'right';medial:boolean;overlay:'none'|'vessels'|'nerves';focus:'ventricle'|'caudate'|'hippocampus'|'thalamus';highlight:HighlightLayer;hint:string;explanation:string;englishHint?:string;englishExplanation?:string;scope?:{ja:string;en:string};reference?:{title:string;url:string};startingNote?:{ja:string;en:string}};
export type FindSectionObservation={plane:FindTask['plane'];position:number;rotation:FindTask['rotation'];zoom?:number;pan?:{x:number;y:number}};
export function FindStructureExercise({tasks,english,onBack,initialKey,initialProgress,onProgressChange,onTaskChange,returnToObservation=false,hideReviewEntry=false,reviewCountFor,hasSurfaceQuestionsFor,onReview}:{tasks:FindTask[];english:boolean;onBack:()=>void;initialKey?:string;initialProgress?:FindProgress|null;onProgressChange?:(key:string,state:FindViewProgress)=>void;onTaskChange?:(key:string)=>void;returnToObservation?:boolean;hideReviewEntry?:boolean;reviewCountFor:(task:FindTask)=>number;hasSurfaceQuestionsFor:(task:FindTask)=>boolean;onReview:(task:FindTask,view:FindSectionObservation)=>void}){
  const resumeProgressRef=useRef(initialProgress);
  const [key,setKey]=useState(resumeProgressRef.current?.taskKey??initialKey??tasks[0]?.key);
  const task=tasks.find(task=>task.key===key)??tasks[0];
  const headerRef=useRef<HTMLElement>(null);
  useEffect(()=>{
    if(!task)return;
    const frame=requestAnimationFrame(()=>{
      const header=headerRef.current;
      header?.querySelector('select')?.focus({preventScroll:true});
      if(window.innerWidth<=760)header?.scrollIntoView({block:'start'});
    });
    return()=>cancelAnimationFrame(frame);
  },[task?.key]);
  if(!task)return <p>{english?'No observation tasks available.':'観察課題がありません。'}</p>;
  const selectTask=(nextKey:string)=>{resumeProgressRef.current=null;setKey(nextKey);onTaskChange?.(nextKey);};
  const taskIndex=tasks.indexOf(task);
  const taskGroups=[
    {key:'section',label:english?'Sections':'断面',tasks:tasks.filter(item=>item.kind==='section')},
    {key:'surface',label:english?'Brain surface':'脳表',tasks:tasks.filter(item=>item.kind==='surface')},
    {key:'vessels',label:english?'Arteries':'主要血管',tasks:tasks.filter(item=>item.kind==='neurovascular'&&item.overlay==='vessels')},
    {key:'nerves',label:english?'Cranial nerves':'脳神経',tasks:tasks.filter(item=>item.kind==='neurovascular'&&item.overlay==='nerves')},
  ].filter(group=>group.tasks.length>0);
  return <div className="findExercise">
    <header ref={headerRef} className="findReviewHeader" data-no-localize><button type="button" onClick={onBack}>{returnToObservation?(english?'← Back to observation':'← 観察に戻る'):(english?"← Practice menu":"← 復習の入口")}</button><strong>{english?"Structure identification":"構造同定"}</strong><label><span>{english?'Structure to find':'探す構造'}</span><select aria-label={english?"Structure to find":"探す構造"} value={task.key} onChange={event=>selectTask(event.target.value)}>{taskGroups.map(group=><optgroup key={group.key} label={`${group.label} (${group.tasks.length})`}>{group.tasks.map(task=><option key={task.key} value={task.key}>{english?task.englishName:task.name}</option>)}</optgroup>)}</select></label></header>
    <FindTaskView key={task.key} task={task} initialProgress={resumeProgressRef.current?.taskKey===task.key?resumeProgressRef.current.state:undefined} onProgressChange={state=>onProgressChange?.(task.key,state)} english={english} number={taskIndex+1} total={tasks.length} onPrevious={()=>selectTask(tasks[(taskIndex-1+tasks.length)%tasks.length].key)} onNext={()=>selectTask(tasks[(taskIndex+1)%tasks.length].key)} reviewCount={reviewCountFor(task)} surfaceQuestionsRecorded={hasSurfaceQuestionsFor(task)} hideReviewEntry={hideReviewEntry} onReview={view=>onReview(task,view)}/>
  </div>;
}
function FindTaskView({hideReviewEntry=false,task,english,number,total,onPrevious,onNext,initialProgress,onProgressChange,reviewCount,surfaceQuestionsRecorded,onReview}:{hideReviewEntry?:boolean;initialProgress?:FindViewProgress;onProgressChange?:(state:FindViewProgress)=>void;task:FindTask;english:boolean;number:number;total:number;onPrevious:()=>void;onNext:()=>void;reviewCount:number;surfaceQuestionsRecorded:boolean;onReview:(view:FindSectionObservation)=>void}){
  const [stage,setStage]=useState<'search'|'hint'|'answer'>(initialProgress?.stage??'search');
  const taskViewRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    if(!initialProgress||initialProgress.stage==='search'||initialProgress.reading.scroll>0||window.innerWidth>760)return;
    // Explicit resume restores the saved phase. After the parent's task-header
    // focus, bring its explanation into view without replacing a saved reading offset.
    return scheduleReadingRestore(requestAnimationFrame,cancelAnimationFrame,()=>{
      const selector=initialProgress.stage==='hint'?'.findHintHeading':'.findAnswerHeading';
      const target=taskViewRef.current?.querySelector<HTMLElement>(selector);
      target?.focus({preventScroll:true});target?.scrollIntoView({block:'center'});
    });
  },[]);
  const previousStage=useRef(stage);
  useEffect(()=>{
    if(previousStage.current===stage)return;
    previousStage.current=stage;
    const frame=requestAnimationFrame(()=>{
      const view=taskViewRef.current;
      const selector=stage==='hint'?'.findHintHeading':stage==='answer'?'.findAnswerHeading':'.quizImageStage canvas[tabindex], .quizImageStage[tabindex]';
      const target=view?.querySelector<HTMLElement>(selector);
      target?.focus({preventScroll:true});
      // On narrow screens the guide follows the image in document flow.
      // Reveal the explanation as well as moving keyboard focus to it.
      if(stage!=='search'&&window.innerWidth<=760)target?.scrollIntoView({block:'center'});
    });
    return()=>cancelAnimationFrame(frame);
  },[stage]);
  const [plane,setPlane]=useState(initialProgress?.plane??task.plane);
  const [position,setPosition]=useState(initialProgress?.position??task.position);
  const [viewReset,setViewReset]=useState(0);
  const [rotation,setRotation]=useState(initialProgress?.rotation??task.rotation);
  const [unavailable,setUnavailable]=useState(false);
  const [drag,setDrag]=useState<{x:number;y:number}|null>(null);
  const [guess,setGuess]=useState<{x:number;y:number}|null>(initialProgress?.guess??null);
  const [answerReturnedToStart,setAnswerReturnedToStart]=useState(false);
  const [zoom,setZoom]=useState(initialProgress?.zoom??1),[pan,setPan]=useState(initialProgress?.pan??{x:0,y:0});
  const guideRef=useRef<HTMLDivElement|null>(null),readingRef=useRef(initialProgress?.reading??{scroll:0,openDetails:[] as number[]});
  const progressCallback=useRef(onProgressChange);progressCallback.current=onProgressChange;
  const viewRef=useRef<FindViewProgress|null>(null);
  function currentReading(){const body=guideRef.current;if(body&&body.clientHeight>0)readingRef.current={scroll:body.scrollTop,openDetails:[...body.querySelectorAll('details')].flatMap((d,i)=>d.open?[i]:[])};return readingRef.current;}
  function reportReading(){const current=viewRef.current;if(current)progressCallback.current?.({...current,reading:currentReading()});}
  useEffect(()=>{const current={stage,answerChecked:stage==='answer',plane,position,rotation,zoom,pan,guess,reading:currentReading()};viewRef.current=current;progressCallback.current?.(current);},[stage,plane,position,rotation,zoom,pan,guess]);
  useLayoutEffect(()=>{const body=guideRef.current;if(!body)return;const saved=readingRef.current;let restored=false;
    const restore=()=>{if(restored||body.clientHeight===0)return;body.querySelectorAll('details').forEach((d,i)=>d.open=saved.openDetails.includes(i));body.scrollTop=saved.scroll;restored=true;};
    restore();const observer=new ResizeObserver(restore);observer.observe(body);body.addEventListener('toggle',reportReading,true);
    return()=>{observer.disconnect();body.removeEventListener('toggle',reportReading,true);};
  },[]);
  const press=useRef<{x:number;y:number;moved:boolean}|null>(null);
  const model=task.kind!=='section',revealed=stage==='answer';
  const indexed=sectionLabelPresence.revision===SEGMENTATION_LABEL_SHA256;
  const startingSlice=indexed?representativeLabeledSection(sectionLabelPresence.labels,task.highlight.ids,plane):null;
  const startingPosition=plane===task.plane?task.position:startingSlice===null?50:planePositionForSlice(startingSlice,plane,BIGBRAIN_SECTION_DIMS);
  function changePlane(nextPlane:FindTask['plane']){
    if(nextPlane===plane)return;
    const slice=indexed?representativeLabeledSection(sectionLabelPresence.labels,task.highlight.ids,nextPlane):null;
    if(slice===null)return;
    setPlane(nextPlane);
    setPosition(nextPlane===task.plane?task.position:planePositionForSlice(slice,nextPlane,BIGBRAIN_SECTION_DIMS));
    press.current=null;setDrag(null);setStage('search');setGuess(null);setZoom(1);setPan({x:0,y:0});setAnswerReturnedToStart(false);setViewReset(value=>value+1);
  }
  const planeInfo=segmentationPlaneNames[plane];
  const sliderDirections=sectionSliderDirections[plane];
  const planeTitle=english?{coronal:'Coronal section',horizontal:'Horizontal section',sagittal:'Sagittal section'}[plane]:planeInfo.label;
  const rangeStartLabel=english?sliderDirections.start.en:sliderDirections.start.ja;
  const rangeEndLabel=english?sliderDirections.end.en:sliderDirections.end.ja;
  const highlights=revealed?[task.highlight]:[];
  const answerAbsentFromSlice=!model&&sectionLabelPresence.revision===SEGMENTATION_LABEL_SHA256&&nearestLabeledSection(sectionLabelPresence.labels,task.highlight.ids,plane,planeSliceIndex(position,plane,BIGBRAIN_SECTION_DIMS))!==null;
  function revealAnswer(){
    if(answerAbsentFromSlice){setPosition(startingPosition);setGuess(null);setZoom(1);setPan({x:0,y:0});setViewReset(value=>value+1)}
    setAnswerReturnedToStart(answerAbsentFromSlice);
    setStage('answer');
  }
  const missingReviewMessage=english?'There are no multiple-choice questions for this structure. Read its location and role above, then try finding it again without colour.':'この構造の四択問題は未収録です。位置・働きの解説を読み、色を消してもう一度確かめられます。';
  const retryLabel=stage==='hint'?(english?'Hide hint and try again':'ヒントを閉じてもう一度'):stage==='search'?(english?'Clear your marker':'印を消す'):(english?'Try again without colour':'色を消してもう一度');
  function retrySearch(){
    if(stage==='search')taskViewRef.current?.querySelector<HTMLElement>('.quizImageStage canvas[tabindex], .quizImageStage[tabindex]')?.focus({preventScroll:true});
    setGuess(null);setAnswerReturnedToStart(false);setStage('search');
  }
  function rotate(event:PointerEvent<HTMLDivElement>){if(press.current&&Math.hypot(event.clientX-press.current.x,event.clientY-press.current.y)>5)press.current.moved=true;if(!drag)return;const dx=event.clientX-drag.x,dy=event.clientY-drag.y;if(dx||dy){setGuess(null);setRotation(old=>({...old,x:old.x-dy*.4,y:old.y+dx*.4}));setDrag({x:event.clientX,y:event.clientY})}}
  function markGuess(event:PointerEvent<HTMLDivElement>){const start=press.current;press.current=null;setDrag(null);if(!start||start.moved||Math.hypot(event.clientX-start.x,event.clientY-start.y)>5||stage==='answer')return;const rect=event.currentTarget.getBoundingClientRect();setGuess({x:Math.max(0,Math.min(100,(event.clientX-rect.left)/rect.width*100)),y:Math.max(0,Math.min(100,(event.clientY-rect.top)/rect.height*100))})}
  return <div ref={taskViewRef} className="quizWorkspace findTask" data-find-stage={stage} data-find-kind={task.kind}>
    <section className="quizImageCard">
      <div className="panelHead"><div><b>{english?task.englishName:task.name}</b><small data-no-localize>{model?(english?task.englishViewName:task.viewName):`${english?{coronal:"Coronal",horizontal:"Horizontal",sagittal:"Sagittal"}[plane]:planeTitle} · ${planeInfo.axis}${planeSliceIndex(position,plane,BIGBRAIN_SECTION_DIMS)}`}</small></div><span>{english?(revealed?'Answer coloured':'Answer hidden'):(revealed?'答えを着色中':'答えの着色なし')}</span>{!model&&<nav className="findPlaneTabs" data-no-localize aria-label={english?'Choose section plane':'切断方向を選ぶ'}>{(['coronal','horizontal','sagittal'] as const).map(item=><button key={item} type="button" aria-pressed={plane===item} disabled={item!==task.plane&&(!indexed||representativeLabeledSection(sectionLabelPresence.labels,task.highlight.ids,item)===null)} onClick={()=>changePlane(item)}>{english?{coronal:'Coronal',horizontal:'Horizontal',sagittal:'Sagittal'}[item]:segmentationPlaneNames[item].label}</button>)}</nav>}</div>
      <div className="findImageActions" data-no-localize aria-label={english?'Structure identification actions':'構造同定の操作'}>
        {revealed?<><button type="button" onClick={retrySearch}>{retryLabel}</button><button type="button" onClick={onNext}>{english?'Next structure':'次の構造へ'}</button></>:<>{stage==='search'?<button type="button" onClick={()=>setStage('hint')}>{english?'Need a hint?':'迷ったらヒント'}</button>:<button type="button" onClick={retrySearch}>{retryLabel}</button>}<button type="button" className="findRevealAnswer" disabled={model&&unavailable} onClick={revealAnswer}>{english?'Reveal colour to check':'着色して答え合わせ'}</button></>}
      </div>
      <div className={'quizImageStage '+(model?'modelStage':'')} aria-describedby="find-marker-keyboard-help" onKeyDownCapture={event=>{if(!(event.target instanceof HTMLCanvasElement)&&event.target!==event.currentTarget)return;if(stage==='answer'||!event.shiftKey||event.altKey||event.ctrlKey||event.metaKey||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;event.preventDefault();event.stopPropagation();const key=event.key;setGuess(previous=>{const point=previous??{x:50,y:50};return {x:Math.max(0,Math.min(100,point.x+(key==='ArrowLeft'?-2:key==='ArrowRight'?2:0))),y:Math.max(0,Math.min(100,point.y+(key==='ArrowUp'?-2:key==='ArrowDown'?2:0)))}})}} tabIndex={model?0:undefined} aria-label={model?(english?'Observation image; arrow keys rotate the 3D model, R resets orientation':'観察画像・3Dは矢印キーで回転、Rで向きを戻す'):undefined} onPointerDown={event=>{if(event.button!==0||!(event.target instanceof HTMLCanvasElement))return;press.current={x:event.clientX,y:event.clientY,moved:false};if(model){event.currentTarget.setPointerCapture(event.pointerId);setDrag({x:event.clientX,y:event.clientY})}}} onPointerMove={rotate} onPointerUp={markGuess} onPointerCancel={()=>{press.current=null;setDrag(null)}} onKeyDown={model?event=>{if(event.defaultPrevented||event.altKey||event.ctrlKey||event.metaKey||(!(event.target instanceof HTMLCanvasElement)&&event.target!==event.currentTarget))return;if(event.key.toLowerCase()==='r'){event.preventDefault();setGuess(null);setRotation(task.rotation);return}if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();setGuess(null);setRotation(old=>({...old,x:old.x+(event.key==='ArrowUp'?-5:event.key==='ArrowDown'?5:0),y:old.y+(event.key==='ArrowLeft'?-5:event.key==='ArrowRight'?5:0)}))}}:undefined}>
        <AtlasVolumeCanvas key={viewReset} kind={model?'surface':'slice'} preserveSliceView sharedZoom={zoom} onZoomChange={setZoom} sharedPan={pan} onPanChange={setPan} plane={plane} position={position} focus={task.focus} display="specimen" rotation={rotation} contrast="bigbrain" view={task.overlay==='vessels'?'ghost':'inside'} dimContextOverlays={task.kind==='neurovascular'&&revealed} showFocus={false} showCutPlane={false} hemisphere={task.hemisphere} showCerebralHemispheres={task.overlay!=='nerves'||reviewNerveDisplay(task.key).showCerebralHemispheres} hiddenNeurovascularIds={task.overlay==='nerves'?reviewNerveDisplay(task.key).hiddenNerveIds:[]} showCerebellum={task.kind==='surface'&&!task.medial} surfaceAriaLabel={task.overlay==='nerves'&&!reviewNerveDisplay(task.key).showCerebralHemispheres?(english?'Opaque brainstem with schematic proximal cranial-nerve segments':'不透明な脳幹と近位部の模式脳神経モデル'):undefined} showPonsMedulla={!task.medial} showMidbrain={!task.medial} keepBrainstemOpaqueInGhost={task.overlay==='nerves'} highlights={task.kind==='section'?highlights:[]} surfaceHighlights={task.kind==='surface'?highlights:[]} neurovascularOverlay={task.overlay} neurovascularHighlights={task.kind==='neurovascular'?highlights:[]} showBrainstemNerves={task.overlay==='nerves'} onWebGLUnavailableChange={setUnavailable} onViewChange={()=>setGuess(null)}/>
        {model&&!unavailable&&<OrientationCompass rotation={rotation} compact english={english}/>}
        {guess&&<span className="findGuessMarker" style={{left:`${guess.x}%`,top:`${guess.y}%`}} aria-hidden="true"/>}
      </div>
      {!model&&<div className="quizSliceNavigator findSliceNavigator" data-no-localize>
        <span className="findSliceEnd"><strong>{sliderDirections.start.compass}</strong>{rangeStartLabel}</span>
        <label><span className="srOnly">{english?`Move through nearby sections: ${rangeStartLabel} on the left, ${rangeEndLabel} on the right`:`近くの断面へ動かす。左が${rangeStartLabel}、右が${rangeEndLabel}`}</span><input type="range" min="0" max="100" step="any" value={sectionSliderValue(position,plane)} onChange={event=>{setGuess(null);setAnswerReturnedToStart(false);setPosition(sectionPositionFromSlider(Number(event.target.value),plane))}} onKeyDown={event=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();setGuess(null);setAnswerReturnedToStart(false);setPosition(old=>stepSectionSliderPosition(old,plane,BIGBRAIN_SECTION_DIMS,event.key==='ArrowLeft'||event.key==='ArrowDown'?-1:1))}}}/></label>
        <span className="findSliceEnd"><strong>{sliderDirections.end.compass}</strong>{rangeEndLabel}</span>
      </div>}
      <button onClick={()=>{setGuess(null);setAnswerReturnedToStart(false);setRotation(task.rotation);setZoom(1);setPan({x:0,y:0});setPosition(startingPosition);setViewReset(value=>value+1)}}>{english?'Return to starting view':'開始位置・向きに戻す'}</button>
    </section>
    <aside className="quizQuestionCard findTaskGuide">
      <div ref={guideRef} className="findTaskGuideBody" onScroll={reportReading}>
      <h2>{english?`Find ${task.englishName}`:`${task.name}を探してください`}</h2>{stage!=="answer"&&plane===task.plane&&task.startingNote&&<p className="findClickNote" data-no-localize>{task.startingNote[english?"en":"ja"]}</p>}
      {stage==='search'&&<><p className="findInstruction" data-no-localize>{english?<>First, locate the structure yourself. Tap or click your predicted location to leave a marker, then press <strong>“Reveal colour to check”</strong>.</>:<>まず、自分で構造を探します。予想した場所をタップ・クリックすると印を付けられます。その後、<strong>「着色して答え合わせ」</strong>を押してください。</>}</p><p className="findClickNote" data-no-localize>{english?(model?'The marker is optional and not scored. Drag to rotate. Shift + arrow keys also place or move a marker.':'The marker is optional and not scored. Drag to move the image. Shift + arrow keys also place or move a marker.'):(model?'印は任意で、採点はしません。ドラッグで回転、Shift＋矢印キーでも印を付けて動かせます。':'印は任意で、採点はしません。ドラッグで断面を移動、Shift＋矢印キーでも印を付けて動かせます。')}</p></>}
      <p id="find-marker-keyboard-help" className="srOnly" data-no-localize>{english?"Focus the image, then Shift plus an arrow key places or moves your marker. Plain arrow keys move the section or rotate the 3D model.":"画像にフォーカスし、Shift＋矢印キーで印を付けたり動かしたりできます。矢印キーだけなら断面の移動・3Dの回転です。"}</p>
      {guess&&<p className="findGuessStatus" role="status">{english?'Your predicted location is marked in amber.':'予想した位置に琥珀色の印を付けました。'}</p>}
      {!revealed&&<div className="findActions">
        {stage==='search'&&<button onClick={()=>setStage('hint')}>{english?'Need a hint?':'迷ったらヒント'}</button>}
        <button className="findRevealAnswer" disabled={model&&unavailable} onClick={revealAnswer}>{english?'Reveal colour to check':'着色して答え合わせ'}</button>
      </div>}

      <div aria-live="polite">{answerReturnedToStart&&revealed&&<p>{english?'This structure was absent from the chosen slice, so the answer is shown at the starting slice.':'選んだ断面にはこの構造がないため、開始断面に戻して答えを表示しました。'}</p>}{revealed&&answerAbsentFromSlice&&<p>{english?'This structure is not present in the current slice. Return to the starting view to check the colour.':'現在の断面にはこの構造がありません。開始位置に戻して着色を確認してください。'}</p>}{stage!=='search'&&<section><h3 className="findHintHeading" tabIndex={-1}>{english?'Location hint':'位置のヒント'}</h3><p data-no-localize={english&&task.englishHint?true:undefined}>{english&&task.englishHint?task.englishHint:task.hint}</p></section>}{revealed&&<section><h3 className="findAnswerHeading" tabIndex={-1}>{english?'Check the structure and its role':'位置と働きを確認'}</h3><p data-no-localize={english&&task.englishExplanation?true:undefined}>{english&&task.englishExplanation?task.englishExplanation:task.explanation}</p>{task.scope&&<p className="findScope" data-no-localize>{task.scope[english?'en':'ja']}</p>}{task.reference&&<p><a href={task.reference.url} target="_blank" rel="noreferrer">{task.reference.title} ↗</a></p>}{!answerAbsentFromSlice&&<p>{answerReturnedToStart?(english?'Locate the highlighted structure and its neighbours in the starting slice.':'開始断面で、着色された構造と周囲の位置関係を確認してください。'):guess?(english?'Compare the highlighted area with your marker and nearby structures.':'着色された範囲と自分の印、周囲の構造を見比べてください。'):(english?'Use the highlighted area and nearby structures to check its position.':'着色された範囲と周囲の構造を見比べ、位置を確認してください。')}</p>}
        {task.kind==='section'&&(!hideReviewEntry||reviewCount===0)&&<div className="findActions" data-no-localize>{reviewCount>0?<button type="button" disabled={answerAbsentFromSlice} onClick={()=>onReview({plane,position,rotation,zoom,pan})}>{english?'Review '+task.englishName+' ('+reviewCount+' questions)':task.name+'の四択で確認（'+reviewCount+'問）'}</button>:<p>{missingReviewMessage}</p>}</div>}
        {task.kind==='surface'&&!surfaceQuestionsRecorded&&<div className="findActions" data-no-localize><p>{missingReviewMessage}</p></div>}
      </section>}</div>
      {revealed&&task.kind==='section'&&['thalamus','lateralGeniculateBodies'].includes(task.key)&&<div data-no-localize><p>{english?'After finding the whole structure, compare the relay regions and their roles.':'構造全体の位置を確かめたら、中継する領域と働きも見比べましょう。'}</p><ThalamusGuide compact keepExerciseOpen english={english} initialRegion={task.key==='lateralGeniculateBodies'?'LGN':'A'}/></div>}
      {revealed&&task.kind==='section'&&['ventricle','hippocampus','fornixBodyPartial'].includes(task.key)&&<ExternalSpecimenVideo context="limbic" english={english}/>}
      {!model&&!revealed&&<details className="findPlaneGuide" data-no-localize><summary>{english?`How to read the ${planeTitle.toLowerCase()}`:`${planeTitle}の見方`}</summary><p>{english?{coronal:'A front–back series: screen left/right = specimen L/R, top/bottom = superior/inferior.',horizontal:'A top–bottom series: screen left/right = specimen L/R, top/bottom = anterior/posterior.',sagittal:'A left–right series: screen left/right = anterior/posterior, top/bottom = superior/inferior.'}[plane]:{coronal:'前後に切り進める断面です。画面の左右は標本のL/R、上が上方、下が下方です。',horizontal:'上下に切り進める断面です。画面の左右は標本のL/R、上が前方、下が後方です。',sagittal:'左右に切り進める断面です。画面の左が前方、右が後方、上が上方です。'}[plane]}</p><p>{english?'Changing the plane starts a fresh, uncoloured search at a slice containing the structure. The same structure changes shape and may disappear as the cut moves. Compare neighbouring slices; return to the starting view if it is no longer visible.':'切断方向を変えると、構造が見える断面から無着色で探し直します。同じ構造でも切る位置により形や大きさが変わり、断面に現れなくなることがあります。隣接断面と見比べ、見失ったら開始位置に戻してください。'}</p></details>}
      {model&&unavailable&&<p>{english?'3D is unavailable. Choose a section task to continue.':'3Dを表示できません。断面の課題を選んで続けられます。'}</p>}
      </div>
      <div className="findTaskNavigation" data-no-localize aria-label={english?'Move between identification tasks':'構造同定の対象を切り替える'}><button type="button" onClick={onPrevious} aria-label={english?'Previous structure':'前の構造へ'}>←</button>{(stage!=='search'||guess)&&<button type="button" onClick={retrySearch}>{retryLabel}</button>}<span>{number} / {total}</span><button type="button" onClick={onNext}>{english?'Next structure':'次の構造へ'} →</button></div>
    </aside>
  </div>;
}
