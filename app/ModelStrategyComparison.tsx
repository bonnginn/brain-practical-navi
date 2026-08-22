"use client";

import { KeyboardEvent, PointerEvent, useRef, useState } from "react";
import { AtlasVolumeCanvas } from "./AtlasVolumeCanvas";

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

function wrapAngle(value:number){return((value+180)%360+360)%360-180}

export default function ModelStrategyComparison({onClose}:{onClose:()=>void}){
  const [rotation,setRotation]=useState<Rotation>(INITIAL_ROTATION);
  const [viewPreset,setViewPreset]=useState<ViewPreset|"custom">("initial");
  const [cavityVisible,setCavityVisible]=useState(true);
  const [webglUnavailable,setWebglUnavailable]=useState({current:false,schematic:false});
  const drag=useRef<{x:number;y:number;mode:"orbit"|"roll"}|null>(null);

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
    <footer><b>評価はまだ確定していません</b><p>同定しやすさ、位置関係、表面品質、回転時の見やすさ、着色・脱着、動作負荷、制作・修正コストの最終評価は専門家・学習者レビュー待ちです。</p></footer>
  </section>;
}
