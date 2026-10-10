import {readWindowsObservationSnapshot} from './windowsExplorationProgress.mjs';
import {readCircuitProgress} from './explorationProgress.mjs';
export const WINDOWS_QUIZ_PROGRESS_KEY='brain-practical-navigator:windows-quiz:v1';
export const quizProgressToken=q=>JSON.stringify([q.id??null,q.target,q.category,q.prompt,[...q.options].sort(),q.correctAnswer??q.target,q.plane??null,q.position??null,q.view??null]);
const obj=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const text=v=>v===null||typeof v==='string'&&v.length<=5000;
export function readWindowsQuizProgress(raw,questions,registry){
 if(raw===null)return {status:'empty',value:null};
 try{
 if(typeof raw!=='string'||raw.length>500000)return {status:'invalid',value:null};
 const s=JSON.parse(raw);if(!obj(s)||s.version!==1)return {status:'version-mismatch',value:null};
 if(s.contentRevision!==registry.contentRevision||s.revision!==registry.revision)return {status:'revision-mismatch',value:null};
 const available=new Map(questions.map(q=>[quizProgressToken(q),q]));
 if(!Array.isArray(s.queue)||!s.queue.length||s.queue.length>questions.length||new Set(s.queue).size!==s.queue.length||!s.queue.every(k=>available.has(k)))return {status:'unrestorable',value:null};
 if(!Array.isArray(s.options)||s.options.length!==s.queue.length||!s.options.every((options,i)=>Array.isArray(options)&&JSON.stringify([...options].sort())===JSON.stringify([...available.get(s.queue[i]).options].sort())))return {status:'invalid',value:null};
 if(!Number.isInteger(s.index)||s.index<0||s.index>=s.queue.length||typeof s.finished!=='boolean'||!Array.isArray(s.answers)||s.answers.length!==s.queue.length)return {status:'invalid',value:null};
 if(s.finished&&s.index!==s.queue.length-1)return {status:'invalid',value:null};
 for(let i=0;i<s.queue.length;i++){const a=s.answers[i];if(!(a===null||available.get(s.queue[i]).options.includes(a))||i<s.index&&a===null||i>s.index&&a!==null||s.finished&&a===null)return {status:'invalid',value:null};}
 const openMissedNumber=s.openMissedNumber??null;
 if(openMissedNumber!==null&&(!s.finished||!Number.isInteger(openMissedNumber)||openMissedNumber<1||openMissedNumber>s.queue.length||s.answers[openMissedNumber-1]===(available.get(s.queue[openMissedNumber-1]).correctAnswer??available.get(s.queue[openMissedNumber-1]).target)))return {status:'invalid',value:null};
 if(!text(s.title))return {status:'invalid',value:null};
 if(!(s.origin===null?s.originKind===null:['theme','related'].includes(s.originKind)))return {status:'invalid',value:null};
 const origin=s.origin===null?null:readWindowsObservationSnapshot(s.origin,registry);if(s.origin!==null&&!origin)return {status:'unrestorable',value:null};
 if(s.originKind==='theme'&&(origin?.workspace!=='sections'||!origin.themeKey))return {status:'unrestorable',value:null};
 if(!(s.circuit===null||Object.hasOwn(registry.circuits,s.circuit)))return {status:'unrestorable',value:null};
 const circuitView=s.circuitView===null?null:readCircuitProgress({selected:null,inspector:'circuits',positions:{},readings:{},view:s.circuitView,sectionOrigin:null},registry)?.view;
 if(s.circuitView!==null&&!circuitView)return {status:'unrestorable',value:null};
 let circuitReturn=null;if(s.circuitReturn!==null){const r=s.circuitReturn;const observation=readWindowsObservationSnapshot(r?.observation,registry);if(!observation||!obj(r.title)||!text(r.title.ja)||!text(r.title.en)||r.title.ja===null||r.title.en===null||!text(r.quizTitle))return {status:'unrestorable',value:null};circuitReturn={observation,title:{ja:r.title.ja,en:r.title.en},quizTitle:r.quizTitle};}
 return {status:'valid',value:{version:1,revision:registry.revision,contentRevision:registry.contentRevision,queue:[...s.queue],options:s.options.map(options=>[...options]),index:s.index,finished:s.finished,openMissedNumber,answers:[...s.answers],title:s.title,origin,originKind:s.originKind,circuit:s.circuit,circuitView,circuitReturn}};
 }catch{return {status:'invalid',value:null};}
}
export function writeWindowsQuizProgress(storage,expected,raw,questions,registry,archivedReplacement=false){
 try{const current=storage.getItem(WINDOWS_QUIZ_PROGRESS_KEY);if(current!==expected)return {status:'conflict',raw:expected};
 if(!archivedReplacement&&!['valid','empty'].includes(readWindowsQuizProgress(current,questions,registry).status))return {status:'blocked',raw:expected};
 const read=readWindowsQuizProgress(raw,questions,registry);if(read.status!=='valid')return {status:read.status,raw:expected};
 const next=JSON.stringify(read.value);storage.setItem(WINDOWS_QUIZ_PROGRESS_KEY,next);if(storage.getItem(WINDOWS_QUIZ_PROGRESS_KEY)!==next)return {status:'unavailable',raw:expected};return {status:'saved',raw:next};
 }catch{return {status:'unavailable',raw:expected};}
}
