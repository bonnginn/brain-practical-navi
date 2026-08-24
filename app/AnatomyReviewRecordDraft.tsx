"use client";

import {useEffect, useRef, useState} from "react";
import type {AnatomyReviewRecordDraft, AnatomyReviewRecordOutcome, AnatomyReviewRecordConcernCode} from "../src/anatomyReviewRecordDraft.mjs";
import {ANATOMY_REVIEW_RECORD_CHECK_KEYS, ANATOMY_REVIEW_RECORD_CHECK_LABELS, ANATOMY_REVIEW_RECORD_CONCERN_CODES, ANATOMY_REVIEW_RECORD_CONCERN_LABELS, ANATOMY_REVIEW_RECORD_OUTCOME_LABELS, anatomyReviewRecordStorageKey, anatomyReviewStorageSnapshotMatches, buildAnatomyReviewRecordExport, createAnatomyReviewRecordDraft, inspectAnatomyReviewRecordStorage, nextAnatomyReviewDraftRevision, shouldApplyAnatomyReviewDraftRevision, updateAnatomyReviewRecordCheck, updateAnatomyReviewRecordScope, validateAnatomyReviewRecordDraft} from "../src/anatomyReviewRecordDraft.mjs";

type Registry=Record<string,unknown>;
type Entry={key:string;learnerSurfaces:readonly string[];representations:readonly string[]};
type DraftState={state:"loading"|"ready"|"locked";draft:AnatomyReviewRecordDraft|null;reason?:string;errors:string[];message:string};
type StorageLockManager={request:<T>(name:string,callback:()=>Promise<T>|T)=>Promise<T>};
type StorageOperationResult={kind:"written"|"removed"|"conflict"|"read-failed"|"write-failed"|"remove-failed"|"cancelled"};

const LOCK_LABELS:Record<string,string>={
  "malformed-storage":"保存データを読み取れないためロックしています。元データは上書きしません。",
  "stale-source":"台帳または項目の内容が保存時から変わったためロックしています。別の項目へ結び直しません。",
  "source-entry-missing":"現在の台帳に対象項目がないためロックしています。",
  "source-entry-not-pending":"この項目は現在 expert pending ではないためロックしています。",
  "storage-conflict":"別のタブまたは画面で保存データが変わったためロックしています。削除または再読み込みが必要です。",
  "storage-read-failed":"端末内保存を読み取れないためロックしています。保存データを空として扱いません。",
  "storage-write-failed":"端末内保存に失敗したためロックしています。未保存の変更を自動で上書きしません。",
  "storage-remove-failed":"端末内記録の消去を確認できないためロックしています。",
  "invalid-record":"記録形式または保護された台帳条件に合わないためロックしています。",
};

function initialDraftState():DraftState{return{state:"loading",draft:null,errors:[],message:"確認記録を準備しています…"}}
function errorMessage(error:unknown){return error instanceof Error?error.message:String(error)}
function userValidationMessage(errors:string[]){if(errors.some(error=>error.includes("concernCodes are required for concern-observed")))return "懸念ありを選んだ項目では、懸念コードを1つ以上選んでください。";return errors[0]??""}
function storageLocks():StorageLockManager|null{if(typeof navigator==="undefined")return null;const candidate=(navigator as Navigator&{locks?:StorageLockManager}).locks;return candidate&&typeof candidate.request==="function"?candidate:null}
function downloadJson(record:Record<string,unknown>){const source=record.sourceRegistry&&typeof record.sourceRegistry==="object"?record.sourceRegistry as {entryKey?:string}:{};const entryKey=(source.entryKey??"item").replace(/[^a-zA-Z0-9._-]+/g,"_")||"item";const date=typeof record.exportedAt==="string"?record.exportedAt.slice(0,10):new Date().toISOString().slice(0,10);const blob=new Blob([`${JSON.stringify(record,null,2)}\n`],{type:"application/json"});const url=URL.createObjectURL(blob),anchor=document.createElement("a");anchor.href=url;anchor.download=`anatomy-review-record-draft-${entryKey}-${date}.json`;document.body.appendChild(anchor);anchor.click();anchor.remove();window.setTimeout(()=>URL.revokeObjectURL(url),0)}

export function AnatomyReviewRecordDraftCard({registry,entry}:{registry:Registry;entry:Entry}){
  const [recordOpen,setRecordOpen]=useState(false);
  const [record,setRecord]=useState<DraftState>(initialDraftState);
  const [storageMessage,setStorageMessage]=useState("");
  const draftRef=useRef<AnatomyReviewRecordDraft|null>(null);
  const conflictRef=useRef(false);
  const operationRef=useRef(Promise.resolve());
  const generationRef=useRef(0);
  const revisionRef=useRef(0);
  const lastSerializedRef=useRef<string|null>(null);
  const storageSnapshotKnownRef=useRef(false);
  const storageKey=anatomyReviewRecordStorageKey(entry.key);
  function lock(reason:string,message=LOCK_LABELS[reason]??"確認記録をロックしています。"){generationRef.current+=1;conflictRef.current=reason==="storage-conflict";draftRef.current=null;setRecord({state:"locked",draft:null,reason,errors:[message],message})}
  useEffect(()=>{
    if(!recordOpen)return;
    function onStorage(event:StorageEvent){if(event.key===storageKey||event.key===null)lock("storage-conflict")}
    window.addEventListener("storage",onStorage);
    return()=>window.removeEventListener("storage",onStorage);
  },[recordOpen,storageKey]);
  useEffect(()=>{
    if(!recordOpen)return;
    let cancelled=false;
    const loadGeneration=generationRef.current;
    (async()=>{
      let serialized:string|undefined;
      try{serialized=window.localStorage.getItem(storageKey)??undefined;lastSerializedRef.current=serialized??null;storageSnapshotKnownRef.current=true}catch{storageSnapshotKnownRef.current=false;if(!cancelled)lock("storage-read-failed");return}
      const inspected=await inspectAnatomyReviewRecordStorage(serialized,registry,entry.key);
      if(cancelled||loadGeneration!==generationRef.current||conflictRef.current)return;
      if(inspected.state==="ready"){draftRef.current=inspected.draft;setRecord({state:"ready",draft:inspected.draft,errors:[],message:"端末内の確認記録を準備しました"})}
      else lock(inspected.reason??"invalid-record",LOCK_LABELS[inspected.reason??"invalid-record"]??"確認記録をロックしています。");
    })().catch(error=>{if(!cancelled&&loadGeneration===generationRef.current&&!conflictRef.current)lock("invalid-record",errorMessage(error))});
    return()=>{cancelled=true;generationRef.current+=1;revisionRef.current+=1};
  },[recordOpen,entry.key,registry,storageKey]);
  function currentGeneration(generation:number){return generation===generationRef.current&&!conflictRef.current}
  async function persist(next:AnatomyReviewRecordDraft,generation:number,revision:number){
    if(!currentGeneration(generation)||!draftRef.current)return;
    const validation=await validateAnatomyReviewRecordDraft(next,registry);
    if(!currentGeneration(generation))return;
    if(!validation.ok){if(shouldApplyAnatomyReviewDraftRevision(revision,revisionRef.current)){draftRef.current=next;setRecord(current=>({...current,draft:next,errors:validation.errors,message:"固定項目を確認してから保存してください。"}))}return}
    const serialized=JSON.stringify(next),locks=storageLocks();
    if(!locks){if(currentGeneration(generation))lock("storage-write-failed");return}
    let result:StorageOperationResult;
    try{result=await locks.request(storageKey,async()=>{
      if(!currentGeneration(generation))return{kind:"cancelled"};
      if(!storageSnapshotKnownRef.current)return{kind:"read-failed"};
      let current:string|null;
      try{current=window.localStorage.getItem(storageKey)}catch{storageSnapshotKnownRef.current=false;return{kind:"read-failed"}}
      if(!anatomyReviewStorageSnapshotMatches(current,lastSerializedRef.current))return{kind:"conflict"};
      if(!currentGeneration(generation))return{kind:"cancelled"};
      try{window.localStorage.setItem(storageKey,serialized)}catch{return{kind:"write-failed"}}
      let stored:string|null;
      try{stored=window.localStorage.getItem(storageKey)}catch{storageSnapshotKnownRef.current=false;return{kind:"read-failed"}}
      if(stored!==serialized)return{kind:"write-failed"};
      lastSerializedRef.current=serialized;storageSnapshotKnownRef.current=true;return{kind:"written"};
    })}catch{result={kind:"write-failed"}}
    if(result.kind==="cancelled"||!currentGeneration(generation))return;
    if(result.kind!=="written"){if(result.kind==="conflict")lock("storage-conflict");else if(result.kind==="read-failed")lock("storage-read-failed");else lock("storage-write-failed");return}
    if(!shouldApplyAnatomyReviewDraftRevision(revision,revisionRef.current))return;
    draftRef.current=next;setRecord({state:"ready",draft:next,errors:[],message:"端末内に自動保存しました"});
  }
  function queueUpdate(next:AnatomyReviewRecordDraft){if(!draftRef.current||conflictRef.current)return;const generation=generationRef.current,revision=nextAnatomyReviewDraftRevision(revisionRef.current);revisionRef.current=revision;draftRef.current=next;setRecord(current=>({...current,draft:next}));operationRef.current=operationRef.current.then(()=>persist(next,generation,revision)).catch(()=>{})}
  function updateScope(learnerSurface:string,representation:string){const current=draftRef.current;if(!current)return;queueUpdate(updateAnatomyReviewRecordScope(current,learnerSurface,representation,new Date().toISOString()))}
  function updateCheck(key:string,outcome:AnatomyReviewRecordOutcome,codes:AnatomyReviewRecordConcernCode[]){const current=draftRef.current;if(!current)return;queueUpdate(updateAnatomyReviewRecordCheck(current,key as AnatomyReviewRecordDraft["checks"][number]["key"],outcome,codes,new Date().toISOString()))}
  async function exportRecord(){
    const generation=generationRef.current,revision=revisionRef.current;
    try{await operationRef.current;if(!currentGeneration(generation)||!shouldApplyAnatomyReviewDraftRevision(revision,revisionRef.current))return;if(!storageSnapshotKnownRef.current){lock("storage-read-failed");return}let currentStored:string|null;try{currentStored=window.localStorage.getItem(storageKey)}catch{storageSnapshotKnownRef.current=false;lock("storage-read-failed");return}if(!anatomyReviewStorageSnapshotMatches(currentStored,lastSerializedRef.current)){lock("storage-conflict");return}const current=draftRef.current;if(!current)return;const exported=await buildAnatomyReviewRecordExport(current,registry);if(!currentGeneration(generation)||!shouldApplyAnatomyReviewDraftRevision(revision,revisionRef.current))return;downloadJson(exported);setStorageMessage("JSONを書き出しました（送信・採用ではありません）")}catch(error){const current=draftRef.current;if(!current)return;const validation=await validateAnatomyReviewRecordDraft(current,registry);if(!validation.ok&&validation.lockReason)lock(validation.lockReason);else setStorageMessage(`書き出せません: ${errorMessage(error)}`)}}
  async function deleteStoredRecord(){
    if(!window.confirm("この項目の端末内記録を消去しますか？"))return;
    const allowConflictRecovery=conflictRef.current,deleteGeneration=generationRef.current+1;generationRef.current=deleteGeneration;revisionRef.current=nextAnatomyReviewDraftRevision(revisionRef.current);draftRef.current=null;
    if(!storageSnapshotKnownRef.current){lock("storage-read-failed");return}
    const locks=storageLocks();if(!locks){lock("storage-remove-failed");return}
    const expectedSerialized=lastSerializedRef.current;let result:StorageOperationResult;
    try{result=await locks.request(storageKey,async()=>{
      if(deleteGeneration!==generationRef.current)return{kind:"cancelled"};
      let current:string|null;
      try{current=window.localStorage.getItem(storageKey)}catch{storageSnapshotKnownRef.current=false;return{kind:"read-failed"}}
      if(!allowConflictRecovery&&!anatomyReviewStorageSnapshotMatches(current,expectedSerialized))return{kind:"conflict"};
      if(deleteGeneration!==generationRef.current)return{kind:"cancelled"};
      try{window.localStorage.removeItem(storageKey)}catch{return{kind:"remove-failed"}}
      let after:string|null;
      try{after=window.localStorage.getItem(storageKey)}catch{storageSnapshotKnownRef.current=false;return{kind:"read-failed"}}
      if(after!==null)return{kind:"remove-failed"};
      lastSerializedRef.current=null;storageSnapshotKnownRef.current=true;return{kind:"removed"};
    })}catch{result={kind:"remove-failed"}}
    if(result.kind==="cancelled")return;
    if(result.kind!=="removed"){if(result.kind==="conflict")lock("storage-conflict");else if(result.kind==="read-failed")lock("storage-read-failed");else lock("storage-remove-failed");return}
    conflictRef.current=false;
    try{const fresh=await createAnatomyReviewRecordDraft(registry,entry.key);if(deleteGeneration!==generationRef.current||conflictRef.current)return;draftRef.current=fresh;setRecord({state:"ready",draft:fresh,errors:[],message:"端末内記録を消去しました。新しい未評価記録を準備しました"})}catch(error){if(deleteGeneration===generationRef.current&&!conflictRef.current)lock("invalid-record",errorMessage(error))}
  }
  if(!recordOpen)return <button type="button" className="anatomyReviewRecordLaunch" data-anatomy-review-record-entry={entry.key} onClick={()=>setRecordOpen(true)}>下書きを開く</button>;
  if(record.state==="loading")return <div className="anatomyReviewRecordDraft anatomyReviewRecordLoading" data-anatomy-review-record-entry={entry.key} role="status">{record.message}</div>;
  if(record.state==="locked"||!record.draft)return <div className="anatomyReviewRecordDraft anatomyReviewRecordLocked" data-anatomy-review-record-entry={entry.key}><b>確認記録をロック中</b><p>{record.message}</p><small>元の保存データは変更せず、この項目へ自動的に結び直しません。</small><button type="button" onClick={deleteStoredRecord}>端末内記録を消去して再開</button></div>;
  const draft=record.draft;
  const validationMessage=userValidationMessage(record.errors);
  return <section className="anatomyReviewRecordDraft" data-anatomy-review-record-entry={entry.key} aria-labelledby={`anatomy-review-record-${entry.key}`}>
    <header className="anatomyReviewRecordHeader"><div><span>LOCAL STRUCTURED RECORD · V1</span><h3 id={`anatomy-review-record-${entry.key}`}>この項目の確認記録</h3><p>固定の選択肢だけを端末内に保存します。氏名・連絡先・所属などは記録しません。</p><p>独立した教材開発の準備記録であり、専門家レビュー、公式承認、採用、妥当性確認、公開可否にはなりません。</p></div><output aria-live="polite">{record.message}</output></header>
    <div className="anatomyReviewRecordScope"><b>観察範囲（任意）</b><label><span>表示面</span><select value={draft.scope.learnerSurface} onChange={event=>updateScope(event.currentTarget.value,draft.scope.representation)}><option value="not-selected">選択しない</option>{entry.learnerSurfaces.map(value=><option key={value} value={value}>{value}</option>)}</select></label><label><span>表示区分</span><select value={draft.scope.representation} onChange={event=>updateScope(draft.scope.learnerSurface,event.currentTarget.value)}><option value="not-selected">選択しない</option>{entry.representations.map(value=><option key={value} value={value}>{value}</option>)}</select></label></div>
    <div className="anatomyReviewRecordChecks">{ANATOMY_REVIEW_RECORD_CHECK_KEYS.map(checkKey=>{const check=draft.checks.find(item=>item.key===checkKey)!;return <fieldset key={checkKey}><legend>{ANATOMY_REVIEW_RECORD_CHECK_LABELS[checkKey]}</legend><label><span>観察結果</span><select value={check.outcome} onChange={event=>updateCheck(checkKey,event.currentTarget.value as AnatomyReviewRecordOutcome,check.concernCodes)}>{Object.entries(ANATOMY_REVIEW_RECORD_OUTCOME_LABELS).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>{check.outcome==="concern-observed"&&<div className="anatomyReviewRecordConcerns" role="group" aria-label={`${ANATOMY_REVIEW_RECORD_CHECK_LABELS[checkKey]}の懸念コード`}><b>懸念コード（1つ以上）</b>{ANATOMY_REVIEW_RECORD_CONCERN_CODES.map(code=><label key={code}><input type="checkbox" checked={check.concernCodes.includes(code)} onChange={event=>updateCheck(checkKey,check.outcome,event.currentTarget.checked?[...check.concernCodes,code]:check.concernCodes.filter(value=>value!==code))}/><span>{ANATOMY_REVIEW_RECORD_CONCERN_LABELS[code]}</span></label>)}</div>}</fieldset>})}</div>
    {validationMessage&&<p className="anatomyReviewRecordError" role="alert">{validationMessage}</p>}
    <div className="anatomyReviewRecordActions"><button type="button" onClick={exportRecord} disabled={record.errors.length>0}>JSONを書き出す（未提出）</button><button type="button" className="secondary" onClick={deleteStoredRecord}>端末内記録を消去</button><span role="status" aria-live="polite">{storageMessage}</span></div>
  </section>;
}
