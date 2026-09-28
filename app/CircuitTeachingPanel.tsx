"use client";

import {useEffect,useRef,useState} from "react";
import {circuitTeaching,circuitText,type CircuitNode} from "../src/circuitTeaching.mjs";
import "./circuit-teaching.css";
import {CircuitRecall} from "./CircuitRecall";
import {circuitStageDuration} from "../src/circuitTravel.mjs";

export type CircuitPosition={pathIndex:number;nodeIndex:number};
type Props={circuitKey:string;english:boolean;suspended?:boolean;initialPosition?:CircuitPosition;onPositionChange?:(position:CircuitPosition)=>void;onObserve?:(index:number,nodeKey:string)=>void;onPreview?:(index:number,nodeKey:string)=>void;onPulseChange?:(active:boolean)=>void;onReview?:()=>void;reviewCount?:number};

export function CircuitTeachingPanel({circuitKey,english,suspended=false,initialPosition,onPositionChange,onObserve,onPreview,onPulseChange,onReview,reviewCount=0}:Props){
  const circuit=circuitTeaching(circuitKey);
  const [selectedPosition,setSelectedPosition]=useState(initialPosition??{pathIndex:0,nodeIndex:0});
  const positionChangeRef=useRef(onPositionChange);
  positionChangeRef.current=onPositionChange;
  useEffect(()=>{positionChangeRef.current?.(selectedPosition)},[selectedPosition]);
  const [playing,setPlaying]=useState(false);
  const stageRef=useRef<HTMLElement|null>(null);
  const previewRef=useRef(onPreview);
  previewRef.current=onPreview;
  const pathLength=circuit?.paths[selectedPosition.pathIndex]?.nodes.length??0;
  useEffect(()=>{
    if(!playing||!circuit)return;
    if(suspended){setPlaying(false);return;}
    const stop=()=>{if(document.hidden)setPlaying(false)};
    document.addEventListener("visibilitychange",stop);
    const timer=window.setTimeout(()=>{
      const next=selectedPosition.nodeIndex+1;
      if(next>=pathLength){setPlaying(false);return}
      const path=circuit.paths[selectedPosition.pathIndex];
      const node=circuit.nodes.find(node=>node.key===path.nodes[next]);
      setSelectedPosition({...selectedPosition,nodeIndex:next});
      const target=node?.observationIndex??node?.observations?.[0]?.index;
      if(target!==null&&target!==undefined)previewRef.current?.(target,node!.key);
    },circuitStageDuration(circuit.paths[selectedPosition.pathIndex]?.nodes[selectedPosition.nodeIndex]));
    return()=>{window.clearTimeout(timer);document.removeEventListener("visibilitychange",stop)};
  },[playing,circuit,selectedPosition,pathLength,suspended]);
  const currentNode=circuit?.nodes.find(node=>node.key===circuit.paths[selectedPosition.pathIndex]?.nodes[selectedPosition.nodeIndex]);
  useEffect(()=>{
    const hasTarget=currentNode?.observationIndex!=null||!!currentNode?.observations?.length;
    onPulseChange?.(playing&&hasTarget);
    return()=>onPulseChange?.(false);
  },[playing,currentNode,onPulseChange]);
  if(!circuit)return null;
  const nodeByKey=new Map(circuit.nodes.map(node=>[node.key,node]));
  const selectedPath=circuit.paths[selectedPosition.pathIndex]??circuit.paths[0];
  const selected=(nodeByKey.get(selectedPath.nodes[selectedPosition.nodeIndex])??circuit.nodes[0]) as CircuitNode;
  const selectedLabel=selectedPath.labels?.[selectedPosition.nodeIndex]??selected.label;
  const t=(value:{ja:string;en:string})=>circuitText(value,english);
  function selectStage(pathIndex:number,nodeIndex:number){
    setPlaying(false);setSelectedPosition({pathIndex,nodeIndex});
    const node=nodeByKey.get(circuit!.paths[pathIndex].nodes[nodeIndex]);
    const target=node?.observationIndex??node?.observations?.[0]?.index;
    if(target!==null&&target!==undefined)onPreview?.(target,node!.key);
  }
  function play(){
    if(playing){setPlaying(false);return}
    selectStage(selectedPosition.pathIndex,selectedPosition.nodeIndex>=pathLength-1?0:selectedPosition.nodeIndex);
    setPlaying(true);
  }
  return <section className="circuitTeaching" aria-label={english?`${t(circuit.name)} learning guide`:`${t(circuit.name)}の学習ガイド`}>
    <header><span>{english?"CIRCUIT GUIDE":"回路ガイド"}</span><h3>{t(circuit.name)}</h3></header>
    <details className="circuitOverview"><summary>{english?"Learning goal and role":"学習目標と役割"}</summary><div className="circuitTeachingLead"><div><b>{english?"Learning goal":"学習目標"}</b><p>{t(circuit.goal)}</p></div><div><b>{english?"Main role":"主な役割"}</b><p>{t(circuit.role)}</p></div></div></details>
    <nav className="circuitPlayback" aria-label={english?"Follow the pathway":"経路を順に追う"}>
      <button onClick={()=>selectStage(selectedPosition.pathIndex,selectedPosition.nodeIndex-1)} disabled={selectedPosition.nodeIndex===0}>{english?"Previous":"前へ"}</button>
      <button aria-pressed={playing} onClick={play}>{playing?(english?"Pause":"一時停止"):(english?"Play flow":"流れを再生")}</button>
      <button onClick={()=>selectStage(selectedPosition.pathIndex,selectedPosition.nodeIndex+1)} disabled={selectedPosition.nodeIndex>=pathLength-1}>{english?"Next":"次へ"}</button>
      <span>{t(selectedPath.label)} · {selectedPosition.nodeIndex+1}/{pathLength}</span>
    </nav>
    <p className="circuitPlaybackNote">{english?"Select a stage to read its role, or play the schematic red signal while the whole circuit stays visible.":"段階を選ぶと役割を読めます。「流れを再生」では回路全体を残したまま、赤い模式信号を順に追えます。"}</p>
    <article ref={stageRef} tabIndex={-1} className="circuitStage" aria-live={playing?"off":"polite"}><div className="circuitStageHeading"><span>{english?"Selected stage":"選択中の段階"}</span><h4>{t(selectedLabel)}</h4>{onObserve&&(selected.observations?.length?<span className="circuitObservationActions">{selected.observations.map(action=><button type="button" key={action.index} onClick={()=>{setPlaying(false);onObserve(action.index,selected.key)}}>{t(action.label)}</button>)}</span>:selected.observationIndex!==null&&<button type="button" onClick={()=>{setPlaying(false);onObserve(selected.observationIndex!,selected.key)}}>{selected.observationKind==="schematic"?(english?"View schematic 3D":"模式3Dを見る"):(english?"Inspect in specimen":"標本で見る")}</button>)}</div><dl><div><dt>{english?"Role and connection":"役割とつながり"}</dt><dd>{t(selected.detail)}</dd></div><div><dt>{english?"Where to inspect":"標本で見る位置"}</dt><dd>{t(selected.specimen)}</dd></div></dl>{selected.observationKind==="schematic"&&<p className="circuitStageScope">{english?"A schematic 3D model shows the approximate course; this is not specimen segmentation.":"走行の目安を模式3Dで表示しています。標本由来の分節ではありません。"}</p>}<details className="circuitDisplayDetails" key={selected.key}><summary>{english?"Display scope and limits":"表示範囲と限界"}</summary><dl>{circuitKey==="visual"&&<div><dt>{english?"3D correspondence":"3Dとの対応"}</dt><dd>{english?"The selected row identifies a side in the concept diagram. Specimen observation selects the existing structure group; it does not isolate that eye, side, or retinal fibers.":"選択した行は概念図上の左右を示します。標本では既存の構造群を表示し、その眼・左右・網膜線維だけを選択分離するものではありません。"}</dd></div>}<div><dt>{english?"Display limitation":"表示限界"}</dt><dd>{t(selected.limitation)}</dd></div></dl></details></article>
    <div className={`circuitDiagram${playing?" is-playing":""}`} aria-label={english?"Concept diagram":"概念図"}>
      {circuit.paths.map((path,pathIndex)=><div className={`circuitPath circuitPath-${path.kind}`} key={path.key}><b>{t(path.label)}</b><div>{path.nodes.map((nodeKey,index)=>{const node=nodeByKey.get(nodeKey);if(!node)return null;const sign=path.signs?.[index-1];return <span className="circuitNodePair" key={`${path.key}-${nodeKey}-${index}`}>{index>0&&<i className={playing&&selectedPosition.pathIndex===pathIndex&&index===selectedPosition.nodeIndex+1?"is-flowing":""} aria-label={sign==="+"?(english?"excitatory":"興奮性"):sign==="−"?(english?"inhibitory":"抑制性"):(english?"direction":"方向")}>{sign??"→"}</i>}<button type="button" className={selectedPosition.pathIndex===pathIndex&&selectedPosition.nodeIndex===index?"active":""} aria-pressed={selectedPosition.pathIndex===pathIndex&&selectedPosition.nodeIndex===index} onClick={()=>selectStage(pathIndex,index)}>{t(path.labels?.[index]??node.label)}</button></span>})}</div></div>)}
      <small>{circuitKey==="basal-ganglia"?(english?"+ excitatory · − inhibitory":"＋ 興奮性・− 抑制性"):(english?"Arrows show the simplified direction of information flow.":"矢印は簡略化した情報の流れを示します。")}</small>
    </div>
    <details className="circuitDisplayDetails"><summary>{english?"About the diagram and animation":"概念図・アニメーションについて"}</summary><p className="circuitLimit"><b>{english?"How to read this diagram":"図の読み方"}</b>{t(circuit.displayLimit)}</p><p className="circuitPlaybackNote">{english?"Circuit structures remain visible. A red front travels along the existing deep-structure meshes, then moves to the next stage. This is a schematic signal guided by mesh shape and neighbouring structures, not reconstructed fibres or measured speed. The cingulate ribbon also carries a schematic front; other cortical areas use whole-region emphasis. Stages without a specimen target do not pulse in 3D.":"回路全体を残し、深部構造では赤い光が形に沿って進んで次の段階へ移ります。既存形状と隣接構造を目安にした模式信号で、実測した神経線維・速度ではありません。帯状回にも模式的な伝播を表示し、その他の皮質は領域全体を強調します。未収録の段階では3Dは明滅しません。"}</p></details>
    <CircuitRecall circuitKey={circuitKey} english={english} onRevisit={(pathKey,nodeKey)=>{
      const pathIndex=circuit.paths.findIndex(path=>path.key===pathKey);
      const nodeIndex=circuit.paths[pathIndex]?.nodes.indexOf(nodeKey)??-1;
      if(pathIndex<0||nodeIndex<0)return;
      selectStage(pathIndex,nodeIndex);
      requestAnimationFrame(()=>{stageRef.current?.focus({preventScroll:true});stageRef.current?.scrollIntoView({block:"nearest"})});
    }}/>
    {onReview&&reviewCount>0&&<div className="circuitPlayback"><button onClick={()=>{setPlaying(false);onReview()}}>{english?`Review related structures (${reviewCount} questions)`:`関連する構造を復習（${reviewCount}問）`}</button><small>{english?"Uses existing questions about these structures; it does not test every circuit connection.":"収録済みの構造問題で復習します。回路の全接続を問うものではありません。"}</small></div>}
    <details className="circuitSources"><summary>{english?"Sources":"出典"}</summary><ul>{circuit.sources.map(source=><li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.label}</a></li>)}</ul></details>
  </section>;
}
