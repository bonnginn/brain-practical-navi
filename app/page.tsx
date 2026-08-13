"use client";

import { PointerEvent, useMemo, useState } from "react";

type Plane = "coronal" | "horizontal" | "sagittal";
type Focus = "ventricle" | "internalCapsule" | "hippocampus" | "thalamus";

const planeData: Record<Plane, { ja: string; en: string; axis: string; from: string; to: string }> = {
  coronal: { ja: "冠状断", en: "CORONAL", axis: "前後位置", from: "前方", to: "後方" },
  horizontal: { ja: "水平断", en: "HORIZONTAL", axis: "上下位置", from: "上方", to: "下方" },
  sagittal: { ja: "矢状断", en: "SAGITTAL", axis: "左右位置", from: "左外側", to: "右外側" },
};

const structures: Record<Focus, { name: string; latin: string; color: string; note: string; relation: string }> = {
  ventricle: { name: "側脳室", latin: "Ventriculus lateralis", color: "#49a9b4", note: "前角・体部・後角・下角が連続する空間です。断面を動かして形の変化を追います。", relation: "脳梁の下方、尾状核・視床の内側" },
  internalCapsule: { name: "内包", latin: "Capsula interna", color: "#efaa54", note: "尾状核・視床とレンズ核の間を通る白質です。膝を基準に前脚と後脚を確認します。", relation: "尾状核／視床とレンズ核の間" },
  hippocampus: { name: "海馬", latin: "Hippocampus", color: "#c8798d", note: "側脳室下角の床に沿う構造です。冠状断と矢状断を往復して前後方向の連続を確認します。", relation: "側脳室下角の内側・床" },
  thalamus: { name: "視床", latin: "Thalamus", color: "#8d82c4", note: "第三脳室を挟んで左右に位置します。水平断と冠状断で内包との境界を比較します。", relation: "第三脳室外側、内包の内側" },
};

const landmarks = [
  { p: 18, label: "側脳室前角", short: "前角" }, { p: 36, label: "内包前脚", short: "前脚" },
  { p: 52, label: "視床・第三脳室", short: "視床" }, { p: 69, label: "海馬・下角", short: "海馬" },
  { p: 84, label: "側脳室後角", short: "後角" },
];

function sliceVariant(position: number) {
  if (position < 25) return "anterior";
  if (position < 46) return "capsular";
  if (position < 64) return "thalamic";
  if (position < 79) return "hippocampal";
  return "posterior";
}

export default function Home() {
  const [plane, setPlane] = useState<Plane>("coronal");
  const [position, setPosition] = useState(52);
  const [focus, setFocus] = useState<Focus>("ventricle");
  const [labels, setLabels] = useState(true);
  const [mode, setMode] = useState<"explore" | "practice">("explore");
  const [block, setBlock] = useState<"inside" | "ghost" | "extracted">("inside");
  const [rotation, setRotation] = useState({ x: -7, y: -18 });
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const current = structures[focus];
  const nearest = useMemo(() => landmarks.reduce((a, b) => Math.abs(b.p - position) < Math.abs(a.p - position) ? b : a), [position]);

  function move(e: PointerEvent<HTMLDivElement>) {
    if (!drag) return;
    setRotation(r => ({ x: Math.max(-28, Math.min(22, r.x - (e.clientY - drag.y) * .2)), y: r.y + (e.clientX - drag.x) * .3 }));
    setDrag({ x: e.clientX, y: e.clientY });
  }

  function jump(nextPlane: Plane, nextPosition?: number) {
    setPlane(nextPlane);
    if (nextPosition !== undefined) setPosition(nextPosition);
  }

  return <main className="appShell">
    <header className="topbar">
      <a className="brand" href="#workspace"><span className="brandMark">N</span><span>NEURO ATLAS<small>VIRTUAL DISSECTION LAB</small></span></a>
      <div className="modeSwitch" aria-label="学習モード">
        <button className={mode === "explore" ? "active" : ""} onClick={() => setMode("explore")}>自由探索</button>
        <button className={mode === "practice" ? "active" : ""} onClick={() => setMode("practice")}>実習ガイド <i>準備版</i></button>
      </div>
      <div className="session"><span className="liveDot"/> セッション 01 <button>HK</button></div>
    </header>

    <aside className="leftRail">
      <p className="eyebrow">CUTTING PLANE</p>
      {(Object.keys(planeData) as Plane[]).map((p, i) => <button key={p} className={`planeBtn ${plane === p ? "active" : ""}`} onClick={() => jump(p)}><span>0{i + 1}</span><b>{planeData[p].ja}</b><small>{planeData[p].en}</small></button>)}
      <div className="railLine"/>
      <p className="eyebrow">FOCUS STRUCTURE</p>
      {(Object.keys(structures) as Focus[]).map(key => <button key={key} className={`structureBtn ${focus === key ? "active" : ""}`} onClick={() => setFocus(key)}><i style={{background: structures[key].color}}/><span>{structures[key].name}</span></button>)}
      <div className="bookNotice"><b>実習プロトコル</b><p>書籍固有の手順は資料確認後に追加します。</p><span>FRAMEWORK READY</span></div>
    </aside>

    <section className="workArea" id="workspace">
      <div className="workHead"><div><span className="eyebrow">CONTINUOUS SECTION</span><h1>{planeData[plane].ja}を連続して追う</h1></div><label className="labelToggle"><input type="checkbox" checked={labels} onChange={e => setLabels(e.target.checked)}/><span/>ラベル</label></div>

      <div className="visualGrid">
        <section className="modelPanel">
          <div className="panelHead"><div><b>全脳</b><small>切断位置を保持</small></div><span>3D ORIENTATION</span></div>
          <div className="modelStage" onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); setDrag({x:e.clientX,y:e.clientY}); }} onPointerMove={move} onPointerUp={() => setDrag(null)} onPointerCancel={() => setDrag(null)}>
            <div className={`brainModel ${plane} ${block}`} style={{transform:`rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`}}>
              <div className="hemi left"><i/><i/><i/><i/><i/></div><div className="hemi right"><i/><i/><i/><i/><i/></div><div className="cerebellum"/><div className="stem"/>
              <div className="ventricleShape" style={{"--focus": current.color} as React.CSSProperties}><i/><i/><i/></div>
              <div className="cutPlane" style={{"--pos": `${position}%`} as React.CSSProperties}><b>{planeData[plane].en.slice(0,3)} {position}</b></div>
            </div>
            <div className="orientation"><b>S</b><i/><b>I</b><span><b>A</b><i/><b>P</b></span></div>
            <p className="dragTip">ドラッグして全体の向きを確認</p>
            <div className="blockControls"><button className={block === "inside" ? "active" : ""} onClick={e => {e.stopPropagation();setBlock("inside")}}>全脳内</button><button className={block === "ghost" ? "active" : ""} onClick={e => {e.stopPropagation();setBlock("ghost")}}>周囲を透過</button><button className={block === "extracted" ? "active" : ""} onClick={e => {e.stopPropagation();setBlock("extracted")}}>取り出す</button></div>
          </div>
        </section>

        <section className="slicePanel">
          <div className="panelHead"><div><b>現在の切断面</b><small>{planeData[plane].ja}・位置 {position}</small></div><span>SPECIMEN VIEW</span></div>
          <div className={`sliceStage ${plane} ${sliceVariant(position)}`}>
            <div className="sliceTissue"><div className="cortexRing"/><div className="whiteMatter"/><div className="sliceVentricle left"/><div className="sliceVentricle right"/><div className="sliceThalamus left"/><div className="sliceThalamus right"/><div className="sliceCapsule left"/><div className="sliceCapsule right"/><div className="sliceHippocampus left"/><div className="sliceHippocampus right"/></div>
            {labels && <><button className={`pin pin1 ${focus === "ventricle" ? "focus" : ""}`} onClick={() => setFocus("ventricle")}>側脳室</button><button className={`pin pin2 ${focus === "internalCapsule" ? "focus" : ""}`} onClick={() => setFocus("internalCapsule")}>内包</button><button className={`pin pin3 ${focus === "thalamus" ? "focus" : ""}`} onClick={() => setFocus("thalamus")}>視床</button></>}
            <div className="scale">20 mm</div>
          </div>
        </section>
      </div>

      <section className="timeline">
        <div className="timelineHead"><div><span>{planeData[plane].from}</span><b>{planeData[plane].axis}</b><span>{planeData[plane].to}</span></div><output>{position}</output></div>
        <div className="rangeWrap">
          <input aria-label={`${planeData[plane].ja}の${planeData[plane].axis}`} type="range" min="0" max="100" value={position} onChange={e => setPosition(Number(e.target.value))}/>
          {landmarks.map(mark => <button key={mark.p} className={Math.abs(mark.p-position)<5 ? "active" : ""} style={{left:`${mark.p}%`}} onClick={() => setPosition(mark.p)}><i/><span>{mark.short}</span></button>)}
        </div>
        <p><b>{nearest.label}</b> に近い断面です。スライダーを動かして、構造の出現・消失を観察してください。</p>
      </section>

      <section className="orthogonal">
        <div className="sectionTitle"><span className="eyebrow">SAME COORDINATE</span><h2>同じ位置を別方向から確認</h2></div>
        <div className="miniSlices">
          {(Object.keys(planeData) as Plane[]).filter(p => p !== plane).map(p => <button key={p} onClick={() => jump(p)}><div className={`miniSlice ${p}`}><i/><i/><span style={p === "sagittal" ? {left:`${position}%`} : {top:`${position}%`}}/></div><b>{planeData[p].ja}</b><small>現在位置を表示</small></button>)}
          <button className="continuityCard" onClick={() => setBlock(block === "extracted" ? "inside" : "extracted")}><div className="tinyVentricle"><i/><i/><i/></div><b>{current.name}の全景</b><small>{block === "extracted" ? "全脳内へ戻す" : "位置を保って取り出す"}</small></button>
        </div>
      </section>
    </section>

    <aside className="inspector">
      <div className="inspectIndex"><span>SELECTED STRUCTURE</span><b>01 / 04</b></div>
      <div className="structureColor" style={{background:current.color}}/>
      <h2>{current.name}</h2><em>{current.latin}</em>
      <div className="rule"/><h3>この断面で見ること</h3><p>{current.note}</p>
      <dl><div><dt>位置関係</dt><dd>{current.relation}</dd></div><div><dt>現在の断面</dt><dd>{planeData[plane].ja}・位置 {position}</dd></div><div><dt>近い指標</dt><dd>{nearest.label}</dd></div></dl>
      <div className="continuity"><span>連続性</span><div><i style={{width:`${Math.max(18, 100-Math.abs(position-52)*1.35)}%`,background:current.color}}/></div><small>この断面での見えやすさ</small></div>
      <button className="quiz" onClick={() => setLabels(!labels)}>{labels ? "ラベルを隠して確認" : "答えを表示"}<b>→</b></button>
      {mode === "practice" && <div className="practiceCard"><span>実習ガイド・準備版</span><b>連続断面の観察</b><ol><li>全脳上で切断位置を確認</li><li>断面を前後に移動</li><li>別方向の断面と対応</li></ol></div>}
    </aside>
  </main>;
}
