"use client";

import {useState} from "react";
import {circuitTeaching,circuitText,type CircuitNode} from "../src/circuitTeaching.mjs";
import "./circuit-teaching.css";

type Props={circuitKey:string;english:boolean;onObserve?:(index:number)=>void};

export function CircuitTeachingPanel({circuitKey,english,onObserve}:Props){
  const circuit=circuitTeaching(circuitKey);
  const [selectedKey,setSelectedKey]=useState(()=>circuit?.nodes[0]?.key??"");
  if(!circuit)return null;
  const nodeByKey=new Map(circuit.nodes.map(node=>[node.key,node]));
  const selected=(nodeByKey.get(selectedKey)??circuit.nodes[0]) as CircuitNode;
  const t=(value:{ja:string;en:string})=>circuitText(value,english);
  return <section className="circuitTeaching" aria-label={english?`${t(circuit.name)} learning guide`:`${t(circuit.name)}の学習ガイド`}>
    <header><span>{english?"CIRCUIT GUIDE":"回路ガイド"}</span><h3>{t(circuit.name)}</h3></header>
    <div className="circuitTeachingLead"><div><b>{english?"Learning goal":"学習目標"}</b><p>{t(circuit.goal)}</p></div><div><b>{english?"Main role":"主な役割"}</b><p>{t(circuit.role)}</p></div></div>
    <div className="circuitDiagram" aria-label={english?"Concept diagram":"概念図"}>
      {circuit.paths.map(path=><div className="circuitPath" key={path.key}><b>{t(path.label)}</b><div>{path.nodes.map((nodeKey,index)=>{const node=nodeByKey.get(nodeKey);if(!node)return null;const sign=path.signs?.[index-1];return <span className="circuitNodePair" key={`${path.key}-${nodeKey}-${index}`}>{index>0&&<i aria-label={sign==="+"?(english?"excitatory":"興奮性"):sign==="−"?(english?"inhibitory":"抑制性"):(english?"direction":"方向")}>{sign??"→"}</i>}<button type="button" className={selected.key===node.key?"active":""} aria-pressed={selected.key===node.key} onClick={()=>setSelectedKey(node.key)}>{t(node.label)}</button></span>})}</div></div>)}
      <small>{circuitKey==="basal-ganglia"?(english?"+ excitatory · − inhibitory":"＋ 興奮性・− 抑制性"):(english?"Arrows show the simplified direction of information flow.":"矢印は簡略化した情報の流れを示します。")}</small>
    </div>
    <article className="circuitStage" aria-live="polite"><div className="circuitStageHeading"><span>{english?"Selected stage":"選択中の段階"}</span><h4>{t(selected.label)}</h4>{selected.observationIndex!==null&&onObserve&&<button type="button" onClick={()=>onObserve(selected.observationIndex!)}>{english?"Inspect in specimen":"標本で見る"}</button>}</div><dl><div><dt>{english?"Role and connection":"役割とつながり"}</dt><dd>{t(selected.detail)}</dd></div><div><dt>{english?"Where to inspect":"標本で見る位置"}</dt><dd>{t(selected.specimen)}</dd></div><div><dt>{english?"Display limitation":"表示限界"}</dt><dd>{t(selected.limitation)}</dd></div></dl></article>
    <p className="circuitLimit"><b>{english?"How to read this diagram":"図の読み方"}</b>{t(circuit.displayLimit)}</p>
    <details className="circuitSources"><summary>{english?"Sources":"出典"}</summary><ul>{circuit.sources.map(source=><li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.label}</a></li>)}</ul></details>
  </section>;
}
