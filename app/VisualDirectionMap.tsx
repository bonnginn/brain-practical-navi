import {useId} from "react";
import {circuitTeaching,circuitText} from "../src/circuitTeaching.mjs";
import "./visual-direction-map.css";

type Props={english:boolean;pathIndex:number;nodeIndex:number;playing:boolean;onSelect:(pathIndex:number,nodeIndex:number)=>void};
const xy=(right:boolean,index:number,crossed:boolean):[number,number]=>{
  const origin=right?310:110,target=crossed?420-origin:origin;
  return [[origin,75],[origin,125],[crossed?210:origin,190],[target,235],[target,280],[target,330],[target,395]][index] as [number,number];
};

export function VisualDirectionMap({english,pathIndex,nodeIndex,playing,onSelect}:Props){
  const id=useId().replaceAll(":","");
  const circuit=circuitTeaching("visual")!;
  const leftField=pathIndex<2;
  const pairs=leftField?[0,1]:[2,3];
  const selected=circuit.paths[pathIndex];
  const crossed=selected.kind==="crossed";
  const text=(ja:string,en:string)=>english?en:ja;
  const label=(index:number)=>circuitText(selected.labels![index],english);
  const field=text(leftField?"左視野 → 右半球":"右視野 → 左半球",leftField?"Left visual field → right hemisphere":"Right visual field → left hemisphere");
  const currentKey=selected.nodes[nodeIndex];
  const scope=currentKey==="retina"?text("網膜：概念図のみ","Retina: concept only"):currentKey==="optic-nerve"||currentKey==="optic-radiation"?text("視神経・視放線：模式3D","Nerve / radiation: schematic 3D"):currentKey==="v1"?text("V1：アトラス皮質の位置目安","V1: atlas cortical landmark"):text("視交叉・視索は部分分節／LGNは標本収録","Chiasm / tract: partial labels; LGN: specimen label");
  return <section className="visualDirectionMap" data-no-localize aria-label={text("視覚信号の向き・模式図","Visual signal direction · schematic")}>
    <div className="visualDirectionHeading"><b>{field}</b><small>{text("網膜から皮質へ","Retina to cortex")}</small></div>
    <p className="visualMapLegend">{text("視野は注視点を基準にした左右です。左視野は左眼の意味ではありません。","Visual fields are left or right of fixation. Left visual field does not mean left eye.")}</p>
    <div className="visualFieldChoice" role="group" aria-label={text("追う視野","Visual field to follow")}>
      <button type="button" aria-pressed={leftField} onClick={()=>onSelect(0,nodeIndex)}>{text("左視野","Left field")}</button>
      <button type="button" aria-pressed={!leftField} onClick={()=>onSelect(2,nodeIndex)}>{text("右視野","Right field")}</button>
    </div>
    <div className="visualRouteChoice" role="group" aria-label={text("網膜由来線維の経路","Retinal route")}>
      <button type="button" aria-pressed={crossed} onClick={()=>onSelect(pairs[0],nodeIndex)}>{text("鼻側網膜：交叉","Nasal retina: crosses")}</button>
      <button type="button" aria-pressed={!crossed} onClick={()=>onSelect(pairs[1],nodeIndex)}>{text("耳側網膜：非交叉","Temporal retina: stays")}</button>
    </div>
    <p className="visualMapScrollHint">{text("図は左右にスクロールできます。", "Scroll horizontally to inspect the diagram.")}</p>
    <div className="visualMapViewport" tabIndex={0} role="region" aria-label={text("視覚路の模式図・横スクロール", "Visual pathway diagram, horizontal scroll")}>
    <svg viewBox="0 0 420 430" role="img" aria-labelledby={`${id}-title ${id}-desc`}>
      <title id={`${id}-title`}>{field+" · "+label(nodeIndex)}</title>
      <desc id={`${id}-desc`}>{text("左右は本人基準の模式配置。鼻側網膜からの線維は視交叉で反対側へ、耳側は同側へ進み、同じ視野の情報が同じ側の視索と外側膝状体へ集まります。矢印は網膜からV1へ向かう情報の流れです。断面座標や実測線維ではありません。","Schematic layout using the person's left and right. Nasal retinal fibers cross; temporal fibers remain on the same side. Information from one visual field converges on the same optic tract and LGN. Arrows indicate flow from retina to V1, not section coordinates or measured fibers.")}</desc>
      <defs><marker id={`${id}-selected`} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0 L7 3.5 L0 7 Z" fill="#a34220"/></marker><marker id={`${id}-partner`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6 Z" fill="#647b85"/></marker></defs>
      <line x1="210" y1="47" x2="210" y2="419" stroke="#bcc9c8" strokeDasharray="4 6"/>
      <text x="110" y="27" textAnchor="middle" className="visualSideLabel">{text("本人の左","Person's left")}</text><text x="310" y="27" textAnchor="middle" className="visualSideLabel">{text("本人の右","Person's right")}</text>
      {[110,310].map((x,i)=><g key={x}><ellipse cx={x} cy="75" rx="34" ry="20" fill="#e5eef0" stroke="#80999c"/><text x={x} y="80" textAnchor="middle">{text(i?"右眼":"左眼",i?"Right eye":"Left eye")}</text><circle cx={x} cy="280" r="21" fill="#edf1ef" stroke="#87998f"/><text x={x} y="285" textAnchor="middle">LGN</text><rect x={x-32} y="377" width="64" height="34" rx="12" fill="#edf1ef" stroke="#87998f"/><text x={x} y="400" textAnchor="middle">V1</text></g>)}
      <text x="110" y="49" textAnchor="middle">{text(leftField?"鼻側網膜":"耳側網膜",leftField?"Nasal retina":"Temporal retina")}</text><text x="310" y="49" textAnchor="middle">{text(leftField?"耳側網膜":"鼻側網膜",leftField?"Temporal retina":"Nasal retina")}</text>
      <rect x="174" y="173" width="72" height="32" rx="10" fill="#f7efe5" stroke="#b89c77"/><text className="visualDesktopChiasmLabel" x="210" y="193" textAnchor="middle">{text("視交叉","Chiasm")}</text>
      {[...pairs.filter(p=>p!==pathIndex),pathIndex].map(p=>{
        const route=circuit.paths[p],isSelected=p===pathIndex,right=p===1||p===2,cross=route.kind==="crossed";
        return <g key={route.key} className={isSelected?"visualSelectedRoute":"visualPartnerRoute"}>
          {route.nodes.slice(0,-1).map((_,i)=>{
            const a=xy(right,i,cross),b=xy(right,i+1,cross),active=isSelected&&i===nodeIndex;
            const inset=10,dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);
            return <line key={i} x1={a[0]+dx/length*inset} y1={a[1]+dy/length*inset} x2={b[0]-dx/length*inset} y2={b[1]-dy/length*inset} stroke={isSelected?"#a34220":"#647b85"} strokeWidth={active?6:isSelected?3:2} strokeDasharray={isSelected?undefined:"6 4"} markerEnd={`url(#${id}-${isSelected?"selected":"partner"})`}/>;
          })}
          {isSelected&&(()=>{const [x,y]=xy(right,nodeIndex,cross);return <g className={playing?"visualStageCursor is-playing":"visualStageCursor"}><circle cx={x} cy={y} r="12" fill="#fff" stroke="#a34220" strokeWidth="3"/><text x={x} y={y+5} textAnchor="middle" fill="#772d16" fontWeight="800">{nodeIndex+1}</text></g>})()}
        </g>;
      })}
      <text x="210" y="148" textAnchor="middle" className="visualMapLandmark">{text("視神経","Optic nerves")}</text><text x="210" y="245" textAnchor="middle" className="visualMapLandmark">{text("視索","Optic tracts")}</text><text x="210" y="337" textAnchor="middle" className="visualMapLandmark">{text("視放線","Optic radiations")}</text>
      <g className="visualMobileChiasmLabel"><line x1="210" y1="120" x2="210" y2="171" stroke="#718a7f" strokeDasharray="3 3"/><rect x="167" y="94" width="86" height="26" rx="5" fill="#f7faf8"/><text x="210" y="112" textAnchor="middle">{text("視交叉", "Chiasm")}</text></g>
    </svg>
    </div>
    <p className="visualMapLegend">{text("実線＝選択中の経路、破線＝同じ視野を運ぶもう一方の眼。矢印＝情報の向き。両眼の対比は視野が重なる範囲の模式で、全視野が必ず両眼入力になるわけではありません。","Solid: selected route. Dashed: other eye carrying the same visual field. Arrows: information flow. The paired-eye comparison depicts overlapping visual fields; not all visual-field locations have binocular input.")}</p>
    <ol className="visualStageButtons" aria-label={text("視覚路の段階を選ぶ","Choose visual pathway stage")}>{selected.nodes.map((key,index)=><li key={key}><button type="button" aria-current={index===nodeIndex?"step":undefined} onClick={()=>onSelect(pathIndex,index)}><span>{index+1}</span>{label(index)}</button></li>)}</ol>
    <p className="visualCurrentScope"><b>{scope}</b><br/>{text("左右は本人基準。図は模式配置で、断面座標・個々の軸索・実測速度には対応しません。","Left / right refer to the person. This layout is schematic, not section coordinates, individual axons or measured speed.")}</p>
  </section>;
}
