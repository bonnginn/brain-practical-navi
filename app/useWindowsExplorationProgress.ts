import {useEffect,useRef,useState} from "react";
import {WINDOWS_EXPLORATION_PROGRESS_KEY,readWindowsExplorationProgress,serializeWindowsExplorationProgress,writeWindowsExplorationProgress,preserveAndWriteWindowsExplorationProgress} from "../src/windowsExplorationProgress.mjs";

type Registry=Parameters<typeof readWindowsExplorationProgress>[1];
type Progress=NonNullable<ReturnType<typeof readWindowsExplorationProgress>["value"]>;

// This adapter owns only Windows identification/circuit/observation records. Existing quiz,
// section and Mac whole-learning keys are never imported, reset or written.
export function useWindowsExplorationProgress(registry:Registry){
  const [load]=useState(()=>{
    try{const raw=localStorage.getItem(WINDOWS_EXPLORATION_PROGRESS_KEY);return {...readWindowsExplorationProgress(raw,registry),raw};}
    catch{return {status:"unavailable",value:null,raw:null};}
  });
  const record=useRef<Progress>(load.value??{version:1,revision:registry.revision,contentRevision:registry.contentRevision,practice:null,circuit:null,observation:null});
  const expected=useRef<string|null>(load.raw);
  const blocked=useRef(load.status!=="empty"&&load.status!=="valid");
  const dirty=useRef(false);
  const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const originalRecords=useRef<{key:string;raw:string}[]>(load.raw!==null&&blocked.current?[{key:WINDOWS_EXPLORATION_PROGRESS_KEY,raw:load.raw}]:[]);
  const [recoveryAttempt,setRecoveryAttempt]=useState(0);
  const [recoveryError,setRecoveryError]=useState<string|null>(null);
  const [hasPreserved,setHasPreserved]=useState(false);
  const [status,setStatus]=useState<string>(load.status);
  function preserveRecords(records:{key:string;raw:string}[]){
    for(const record of records){
      if(originalRecords.current.length>=2)break;
      if(!originalRecords.current.some(saved=>saved.key===record.key&&saved.raw===record.raw))originalRecords.current.push(record);
    }
  }
  const saveNow=useRef<()=>void>(()=>{});
  saveNow.current=()=>{
    if(timer.current!==null){clearTimeout(timer.current);timer.current=null;}
    if(!dirty.current||blocked.current)return;
    const raw=serializeWindowsExplorationProgress(record.current,registry);
    if(raw===null){
      blocked.current=true;
      if(expected.current!==null)preserveRecords([{key:WINDOWS_EXPLORATION_PROGRESS_KEY,raw:expected.current}]);
      setStatus("unrestorable");return;
    }
    let result:ReturnType<typeof writeWindowsExplorationProgress>;
    try{result=writeWindowsExplorationProgress(localStorage,expected.current,raw,registry);}
    catch{result={status:"unavailable",raw:expected.current};}
    if(result.status==="saved"){expected.current=result.raw;dirty.current=false;setStatus("saved");return;}
    blocked.current=true;
    preserveRecords([...(expected.current===null?[]:[{key:WINDOWS_EXPLORATION_PROGRESS_KEY,raw:expected.current}]),...(result.raw===null?[]:[{key:WINDOWS_EXPLORATION_PROGRESS_KEY,raw:result.raw}])]);
    if(result.status==="conflict"){
      try{const current=localStorage.getItem(WINDOWS_EXPLORATION_PROGRESS_KEY);if(current!==null)preserveRecords([{key:WINDOWS_EXPLORATION_PROGRESS_KEY,raw:current}]);}catch{/* Original data remains in its storage. */}
    }
    setStatus(result.status);
  };
  function scheduleSave(){
    if(blocked.current)return;
    dirty.current=true;
    if(timer.current!==null)clearTimeout(timer.current);
    timer.current=setTimeout(()=>saveNow.current(),200);
  }
  function updatePractice(practice:Progress["practice"]){record.current={...record.current,practice};scheduleSave();}
  function updateObservation(observation:Progress["observation"]){record.current={...record.current,observation};scheduleSave();}
  function updateCircuit(circuit:Progress["circuit"]){record.current={...record.current,circuit};scheduleSave();}
  useEffect(()=>{
    const flush=()=>saveNow.current();
    const visibility=()=>{if(document.visibilityState==="hidden")flush();};
    const conflict=(event:StorageEvent)=>{
      if(blocked.current||event.key!==WINDOWS_EXPLORATION_PROGRESS_KEY||event.newValue===expected.current)return;
      blocked.current=true;
      preserveRecords([...(expected.current===null?[]:[{key:WINDOWS_EXPLORATION_PROGRESS_KEY,raw:expected.current}]),...(event.newValue===null?[]:[{key:WINDOWS_EXPLORATION_PROGRESS_KEY,raw:event.newValue}])]);
      setStatus("conflict");
    };
    window.addEventListener("pagehide",flush);
    document.addEventListener("visibilitychange",visibility);
    window.addEventListener("storage",conflict);
    return()=>{saveNow.current();window.removeEventListener("pagehide",flush);document.removeEventListener("visibilitychange",visibility);window.removeEventListener("storage",conflict);};
  },[]);
  function preserveAndRestart(){
    setRecoveryAttempt(attempt=>attempt+1);setRecoveryError(null);
    const raw=serializeWindowsExplorationProgress(record.current,registry);
    if(raw===null){blocked.current=true;setStatus("unrestorable");setRecoveryError("unrestorable");return;}
    let result;
    try{result=preserveAndWriteWindowsExplorationProgress(localStorage,raw,registry,originalRecords.current.map(item=>item.raw));}
    catch{result={status:"unavailable",raw:expected.current};}
    if(result.status==="saved"){originalRecords.current=result.records??originalRecords.current;expected.current=result.raw;blocked.current=false;dirty.current=false;setHasPreserved(originalRecords.current.length>0||Boolean(result.archiveKey));setStatus("saved");}
    else{blocked.current=true;setRecoveryError(result.status);setStatus(result.status);try{const current=localStorage.getItem(WINDOWS_EXPLORATION_PROGRESS_KEY);if(current!==null)preserveRecords([{key:WINDOWS_EXPLORATION_PROGRESS_KEY,raw:current}]);}catch{/* Retain loaded originals. */}}
  }
  function exportOriginal(){
    const records=originalRecords.current;
    if(!records.length)return;
    const url=URL.createObjectURL(new Blob([JSON.stringify({records},null,2)],{type:"application/json"}));
    const a=document.createElement("a");a.href=url;a.download="brain-exploration-preserved-records.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);
  }
  return {record,status,recoveryAttempt,recoveryError,hasPreserved,blocked:blocked.current,updatePractice,updateCircuit,updateObservation,flush:()=>saveNow.current(),hasOriginal:originalRecords.current.length>0,exportOriginal,preserveAndRestart};
}
