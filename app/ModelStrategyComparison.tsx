"use client";

import { KeyboardEvent, PointerEvent, useEffect, useRef, useState } from "react";
import { AtlasVolumeCanvas } from "./AtlasVolumeCanvas";
import evaluationDefinition from "../model-comparison/deep-ventricle-evaluation.json";
import {buildModelStrategyReviewExport,countModelStrategyReviewScores,createModelStrategyReviewDraft,MODEL_STRATEGY_REVIEW_STORAGE_KEY,restoreModelStrategyReviewDraft} from "../src/modelStrategyReview.mjs";
import type {ModelStrategyPreference,ModelStrategyReviewDraft,ModelStrategyReviewerRole} from "../src/modelStrategyReview.mjs";

type Rotation={x:number;y:number;z:number};
type ViewPreset="initial"|"opposite"|"superior"|"inferior";

const INITIAL_ROTATION:Rotation={x:-18,y:-58,z:4};
const PRESET_ROTATIONS:Record<ViewPreset,Rotation>={
  initial:INITIAL_ROTATION,
  opposite:{x:-18,y:122,z:4},
  superior:{x:-82,y:0,z:0},
  inferior:{x:82,y:0,z:0},
};
const PRESET_LABELS:Record<ViewPreset,string>={initial:"初期",opposite:"反対側",superior:"上面",inferior:"下面"};
const REVIEW_DIMENSIONS=evaluationDefinition.dimensions.map(item=>({key:item.key,labelJa:item.labelJa}));
const REVIEW_ROLE_LABELS:Record<ModelStrategyReviewerRole,string>={"not-selected":"選択してください","neuroanatomy-expert":"神経解剖学の専門家","anatomy-educator":"解剖学・医学教育の担当者",learner:"学習者","other-contributor":"その他の寄稿者"};
const REVIEW_PREFERENCE_LABELS:Record<ModelStrategyPreference,string>={undecided:"未選択",A:"A 現行再構成",B:"B 知識ベース模式","no-preference":"優劣なし／用途で異なる"};

function wrapAngle(value:number){return((value+180)%360+360)%360-180}

export default function ModelStrategyComparison({onClose}:{onClose:()=>void}){
  const [rotation,setRotation]=useState<Rotation>(INITIAL_ROTATION);
  const [viewPreset,setViewPreset]=useState<ViewPreset|"custom">("initial");
  const [cavityVisible,setCavityVisible]=useState(true);
  const [webglUnavailable,setWebglUnavailable]=useState({current:false,schematic:false});
  const [reviewDraft,setReviewDraft]=useState<ModelStrategyReviewDraft>(()=>{
    const now=new Date().toISOString();
    try{const saved=window.localStorage.getItem(MODEL_STRATEGY_REVIEW_STORAGE_KEY);return saved?restoreModelStrategyReviewDraft(saved,REVIEW_DIMENSIONS,now):createModelStrategyReviewDraft(REVIEW_DIMENSIONS,now)}catch{return createModelStrategyReviewDraft(REVIEW_DIMENSIONS,now)}
  });
  const [reviewStorageState,setReviewStorageState]=useState("端末内ドラフトを準備しました");
  const drag=useRef<{x:number;y:number;mode:"orbit"|"roll"}|null>(null);

  useEffect(()=>{try{window.localStorage.setItem(MODEL_STRATEGY_REVIEW_STORAGE_KEY,JSON.stringify(reviewDraft));setReviewStorageState("この端末内に自動保存しました")}catch{setReviewStorageState("この環境では端末内保存を利用できません")}},[reviewDraft]);

  function chooseView(next:ViewPreset){setViewPreset(next);setRotation({...PRESET_ROTATIONS[next]})}
  function beginRotation(event:PointerEvent<HTMLDivElement>){
    if(event.button!==0&&event.button!==2)return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    drag.current={x:event.clientX,y:event.clientY,mode:event.button===2||event.shiftKey?"roll":"orbit"};
  }
  function moveRotation(event:PointerEvent<HTMLDivElement>){
    const active=drag.current;if(!active)return;
    const dx=event.clientX-active.x,dy=event.clientY-active.y;
    setViewPreset("custom");
    setRotation(current=>active.mode==="roll"
      ?{...current,z:wrapAngle(current.z+dx*.45)}
      :{...current,x:Math.max(-89,Math.min(89,current.x+dy*.45)),y:wrapAngle(current.y+dx*.45)});
    drag.current={...active,x:event.clientX,y:event.clientY};
  }
  function endRotation(event:PointerEvent<HTMLDivElement>){drag.current=null;if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId)}
  function handleKey(event:KeyboardEvent<HTMLDivElement>){
    if(event.key.toLowerCase()==="r"){event.preventDefault();chooseView("initial");return}
    if(!["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(event.key))return;
    event.preventDefault();setViewPreset("custom");
    setRotation(current=>({
      ...current,
      x:Math.max(-89,Math.min(89,current.x+(event.key==="ArrowUp"?-4:event.key==="ArrowDown"?4:0))),
      y:wrapAngle(current.y+(event.key==="ArrowLeft"?-4:event.key==="ArrowRight"?4:0)),
    }));
  }
  function updateReview(change:(current:ModelStrategyReviewDraft)=>ModelStrategyReviewDraft){setReviewDraft(current=>({...change(current),updatedAt:new Date().toISOString()}))}
  function chooseReviewScore(dimensionKey:string,strategy:"A"|"B",value:string){updateReview(current=>({...current,ratings:current.ratings.map(item=>item.dimensionKey===dimensionKey?{...item,[strategy]:value?Number(value):null}:item)}))}
  function chooseReviewerRole(value:string){updateReview(current=>({...current,reviewerRole:value as ModelStrategyReviewerRole}))}
  function chooseReviewPreference(value:string){updateReview(current=>({...current,overallPreference:value as ModelStrategyPreference}))}
  function updateReviewNotes(value:string){updateReview(current=>({...current,notes:value}))}
  function exportReview(){
    const exported=buildModelStrategyReviewExport(reviewDraft,REVIEW_DIMENSIONS);
    const blob=new Blob([`${JSON.stringify(exported,null,2)}\n`],{type:"application/json"});
    const url=URL.createObjectURL(blob),anchor=document.createElement("a");
    anchor.href=url;anchor.download=`model-strategy-review-${exported.comparisonId}-${exported.exportedAt.slice(0,10)}.json`;document.body.appendChild(anchor);anchor.click();anchor.remove();window.setTimeout(()=>URL.revokeObjectURL(url),0);
    setReviewStorageState("JSONを書き出しました（送信・採用ではありません）");
  }
  function clearReview(){if(!window.confirm("この端末内のA/B比較レビュー下書きを消去しますか？"))return;const empty=createModelStrategyReviewDraft(REVIEW_DIMENSIONS);setReviewDraft(empty);try{window.localStorage.removeItem(MODEL_STRATEGY_REVIEW_STORAGE_KEY)}catch{/* storage may be unavailable */}setReviewStorageState("端末内ドラフトを消去しました")}
  const reviewScoreCount=countModelStrategyReviewScores(reviewDraft);
  const stages=[
    {key:"current" as const,title:"A 現行再構成",badge:"標本同一格子・試作",specimen:"model-strategy-current-ventricles" as const,aria:"現行の同一格子分節から再構成した左右側脳室と第三脳室の比較用3D表示"},
    {key:"schematic" as const,title:"B 知識ベース模式",badge:"模式・専門家未確認",specimen:"model-strategy-ventricle" as const,aria:"知識ベースで作成した専門家未確認の模式脳室系3D。実標本由来ではない比較用表示"},
  ];
  return <section className="modelStrategyComparison" aria-labelledby="model-strategy-title">
    <header className="modelStrategyHead"><div><span>CONTRIBUTOR-ONLY PILOT</span><h2 id="model-strategy-title">3Dモデル方針 A/B比較</h2><p>同じ観察課題・色・向き・表示操作で、現行再構成方式と知識ベース方式を比較します。</p></div><button type="button" onClick={onClose} aria-label="3Dモデル方針比較を閉じる">×</button></header>
    <div className="modelStrategyWarning" role="note"><b>Bは模式・専門家未確認です</b><p>実標本由来、正解セグメンテーション、検証済み形状ではありません。連結部や個人差を表現せず、β本体のモデルやラベルを置換しません。採用判断も行いません。</p></div>
    <div className="modelStrategyTask"><b>共通の観察課題</b><p>全体の曲がり方と前後・下方への広がりが、回転したときにも追いやすいかを比較してください。</p></div>
    <div className="modelStrategyControls"><div role="group" aria-label="両モデル共通の視点">{(Object.keys(PRESET_LABELS) as ViewPreset[]).map(key=><button key={key} type="button" className={viewPreset===key?"active":""} aria-pressed={viewPreset===key} onClick={()=>chooseView(key)}>{PRESET_LABELS[key]}</button>)}</div><button type="button" className={cavityVisible?"active":""} aria-pressed={cavityVisible} onClick={()=>setCavityVisible(value=>!value)}>{cavityVisible?"構造を外す":"構造を戻す"}</button></div>
    <div className="modelStrategyGrid">
      {stages.map(item=><article key={item.key}><header><div><b>{item.title}</b><small>{item.badge}</small></div><span className={item.key==="schematic"?"provisional":"source"}>{item.key==="schematic"?"実標本由来ではない":"同一格子"}</span></header><div className={`modelStrategyStage ${webglUnavailable[item.key]?"webglUnavailable":""}`} tabIndex={webglUnavailable[item.key]?undefined:0} aria-label={webglUnavailable[item.key]?undefined:`${item.title}。ドラッグまたは矢印キーで両モデルを同じ向きに回転、Rキーで初期方向に戻す`} onKeyDown={webglUnavailable[item.key]?undefined:handleKey} onPointerDown={webglUnavailable[item.key]?undefined:beginRotation} onPointerMove={webglUnavailable[item.key]?undefined:moveRotation} onPointerUp={endRotation} onPointerCancel={endRotation} onContextMenu={event=>event.preventDefault()}><AtlasVolumeCanvas kind="surface" plane="sagittal" position={58} focus="ventricle" display="specimen" rotation={rotation} view="inside" contrast="bigbrain" showFocus={false} showCutPlane={false} showZoomControls={false} specimenBlock={item.specimen} specimenLayers={cavityVisible?["ventricular-cavity"]:[]} specimenTissueMode="hidden" surfaceAriaLabel={item.aria} onWebGLUnavailableChange={value=>setWebglUnavailable(current=>({...current,[item.key]:value}))}/>{!webglUnavailable[item.key]&&<div className="modelStrategyLegend"><i/><b>{cavityVisible?"脳室系を表示":"構造を非表示"}</b><small>両画面は同じ回転</small></div>}</div></article>)}
    </div>
    <section className="modelStrategyReview" aria-labelledby="model-strategy-review-title" data-review-score-count={reviewScoreCount}>
      <header><div><span>LOCAL REVIEW DRAFT</span><h3 id="model-strategy-review-title">比較レビューを記録する</h3><p>7項目についてAとBを1〜5で別々に評価します。未完了のままでも端末内へ保存し、JSONへ書き出せます。</p></div><strong>{reviewScoreCount} / 14 評価</strong></header>
      <div className="modelStrategyReviewPrivacy" role="note"><b>個人情報は入力しないでください</b><p>氏名、メールアドレス、所属は収集しません。下書きはこのブラウザ内だけに保存され、書き出しても自動送信されません。専門家確認や採用決定にもなりません。</p></div>
      <label className="modelStrategyReviewRole"><span>評価者の立場</span><select value={reviewDraft.reviewerRole} onChange={event=>chooseReviewerRole(event.currentTarget.value)}>{Object.entries(REVIEW_ROLE_LABELS).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
      <div className="modelStrategyReviewRatings" aria-label="AとBの7項目評価">
        <div className="modelStrategyReviewRatingHead" aria-hidden="true"><span>評価項目</span><b>A 現行</b><b>B 模式</b></div>
        {reviewDraft.ratings.map(item=><fieldset key={item.dimensionKey}><legend>{item.labelJa}</legend><label><span>A 現行</span><select aria-label={`${item.labelJa}・A 現行再構成の評価`} value={item.A??""} onChange={event=>chooseReviewScore(item.dimensionKey,"A",event.currentTarget.value)}><option value="">未選択</option>{[1,2,3,4,5].map(score=><option key={score} value={score}>{score}</option>)}</select></label><label><span>B 模式</span><select aria-label={`${item.labelJa}・B 知識ベース模式の評価`} value={item.B??""} onChange={event=>chooseReviewScore(item.dimensionKey,"B",event.currentTarget.value)}><option value="">未選択</option>{[1,2,3,4,5].map(score=><option key={score} value={score}>{score}</option>)}</select></label></fieldset>)}
      </div>
      <div className="modelStrategyReviewSummary"><label><span>全体として比較した印象</span><select value={reviewDraft.overallPreference} onChange={event=>chooseReviewPreference(event.currentTarget.value)}>{Object.entries(REVIEW_PREFERENCE_LABELS).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label><label><span>観察メモ（任意・1200字以内）</span><textarea maxLength={1200} rows={4} value={reviewDraft.notes} onChange={event=>updateReviewNotes(event.currentTarget.value)} placeholder="どの向きで同定しやすかったか、誤認しやすい部分、用途による違いなど。個人情報は書かないでください。"/></label></div>
      <div className="modelStrategyReviewActions"><div role="status" aria-live="polite">{reviewStorageState}</div><button type="button" onClick={exportReview}>JSONを端末へ書き出す</button><button type="button" className="secondary" onClick={clearReview}>下書きを消去</button></div>
    </section>
    <footer><b>評価はまだ確定していません</b><p>同定しやすさ、位置関係、表面品質、回転時の見やすさ、着色・脱着、動作負荷、制作・修正コストの最終評価は専門家・学習者レビュー待ちです。</p></footer>
  </section>;
}
