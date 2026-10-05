import {circuitTeaching,circuitText} from "../src/circuitTeaching.mjs";
import type {CircuitPosition} from "./CircuitTeachingPanel";
import "./circuit-section-bridge.css";

type Props={circuitKey:string;position?:CircuitPosition;nodeKey:string|null;english:boolean;structureName:string;planeName:string;sectionPosition:string;onReturn:()=>void};

export function CircuitSectionBridge({circuitKey,position,nodeKey,english,structureName,planeName,sectionPosition,onReturn}:Props){
  const circuit=circuitTeaching(circuitKey);
  if(!circuit)return null;
  const path=position?circuit.paths[position.pathIndex]:null;
  const node=circuit.nodes.find(node=>node.key===nodeKey);
  const stage=position&&path?(path.labels?.[position.nodeIndex]??node?.label):node?.label;
  const text=(ja:string,en:string)=>english?en:ja;
  return <section className="circuitSectionBridge" data-no-localize aria-label={text("回路と断面の対応","Circuit and section correspondence")}>
    <div className="circuitSectionBridgeHead"><p><strong>{text("回路の段階 → 切片で位置を確認","Circuit stage → locate in section")}</strong><span>{circuitText(circuit.name,english)}{stage&&<> · {circuitText(stage,english)}</>}</span></p><button type="button" onClick={onReturn}>{text("回路解説へ戻る","Back to circuit explanation")} <span aria-hidden="true">→</span></button></div>
    <p className="circuitSectionBridgeCurrent"><b>{text("現在の観察","Viewing now")}</b><span>{structureName}</span><span>{planeName} · {text("位置","Position")} {sectionPosition}</span></p>
    <p className="circuitSectionBridgeScope">{text("段階名の左右は模式経路の側です。切片・3Dは既存の構造群を表示し、その眼・左右・網膜線維だけを選択分離しません。","The stage label identifies the side of the schematic pathway. Section and 3D views show existing structure groups; they do not isolate that eye, side or retinal fibers.")}</p>
    <details><summary>{text("切片・3D・回路図の読み分け","Reading the section, 3D and circuit diagram")}</summary><p>{text("切片ではこの位置の組織像と色ラベル、3Dでは構造の立体的な位置関係を確認します。回路図の矢印は模式的な情報方向です。色ラベルや模式矢印は、個々の神経線維を同定・追跡した表示ではありません。","Use the section for tissue and color labels at this position, and 3D for spatial relationships. Circuit arrows show schematic information flow. Color labels and schematic arrows do not identify or trace individual nerve fibers.")}</p><p>{text("断面位置や選択構造を変えて比較できます。戻ると、元の回路の段階から続けられます。","Change the section position or selected structure to compare. Returning resumes the original circuit stage.")}</p></details>
  </section>;
}
