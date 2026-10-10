import {useEffect,useRef,useState} from 'react';
import {WINDOWS_QUIZ_PROGRESS_KEY,readWindowsQuizProgress,writeWindowsQuizProgress,type WindowsQuizProgress,type QuizProgressQuestion} from '../src/windowsQuizProgress.mjs';
import type {WindowsExplorationRegistry} from '../src/windowsExplorationProgress.mjs';
export function useWindowsQuizProgress(questions:readonly QuizProgressQuestion[],registry:WindowsExplorationRegistry){
 const [loaded]=useState(()=>{try{const raw=localStorage.getItem(WINDOWS_QUIZ_PROGRESS_KEY);return {...readWindowsQuizProgress(raw,questions,registry),raw};}catch{return {status:'unavailable',value:null,raw:null};}});
 const expected=useRef(loaded.raw),preserved=useRef<string[]>(loaded.raw===null?[]:[loaded.raw]);
 const archivedReplacement=useRef(false);
 const blocked=useRef(!['empty','valid'].includes(loaded.status));
 const [status,setStatus]=useState(loaded.status),[record,setRecord]=useState(loaded.value);
 const preserve=(raw:string|null)=>{if(raw!==null&&!preserved.current.includes(raw)&&preserved.current.length<2)preserved.current.push(raw);};
 function update(value:WindowsQuizProgress){
  if(blocked.current)return;
  const raw=JSON.stringify(value);if(raw===expected.current)return;
  let result;try{result=writeWindowsQuizProgress(localStorage,expected.current,raw,questions,registry,archivedReplacement.current);}catch{result={status:'unavailable',raw:expected.current};}
  if(result.status==='saved'){archivedReplacement.current=false;expected.current=result.raw;preserved.current=[];setRecord(value);setStatus('saved');return;}
  blocked.current=true;preserve(expected.current);try{preserve(localStorage.getItem(WINDOWS_QUIZ_PROGRESS_KEY));}catch{/* Keep the loaded raw. */}setStatus(result.status);
 }
 useEffect(()=>{const conflict=(e:StorageEvent)=>{if(e.key!==WINDOWS_QUIZ_PROGRESS_KEY||e.newValue===expected.current||blocked.current)return;blocked.current=true;preserve(expected.current);preserve(e.newValue);setStatus('conflict');};window.addEventListener('storage',conflict);return()=>window.removeEventListener('storage',conflict);},[]);
 function preserveAndRestart(){
  try{
   const current=localStorage.getItem(WINDOWS_QUIZ_PROGRESS_KEY);preserve(current);
   const archiveKey=WINDOWS_QUIZ_PROGRESS_KEY+':preserved:'+Date.now()+':'+Math.random().toString(36).slice(2);
   const archive=JSON.stringify({records:[...new Set([...preserved.current,...(current===null?[]:[current])])].map(raw=>({key:WINDOWS_QUIZ_PROGRESS_KEY,raw}))});
   localStorage.setItem(archiveKey,archive);
   if(localStorage.getItem(archiveKey)!==archive||localStorage.getItem(WINDOWS_QUIZ_PROGRESS_KEY)!==current)throw Error('Archive readback or concurrent change');
   expected.current=current;archivedReplacement.current=true;blocked.current=false;setRecord(null);setStatus('empty');
  }catch{blocked.current=true;setStatus('unavailable');}
 }
 function exportOriginal(){if(!preserved.current.length)return;const url=URL.createObjectURL(new Blob([JSON.stringify({records:preserved.current.map(raw=>({key:WINDOWS_QUIZ_PROGRESS_KEY,raw}))},null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='brain-quiz-preserved-records.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),0);}
 return {record,status,preserveAndRestart,blocked:blocked.current,update,exportOriginal,hasOriginal:preserved.current.length>0};
}
