"use client";

import { PointerEvent, useMemo, useState } from "react";

type View = "surface" | "sagittal" | "horizontal" | "coronal" | "deep";

const structures: Record<View, { title: string; latin: string; note: string; labels: string[] }> = {
  surface: { title: "脳表", latin: "Superficies cerebri", note: "溝と回の連続性をたどり、中心溝を起点に前後を整理します。", labels: ["中心溝", "前頭葉", "頭頂葉", "側頭葉", "後頭葉"] },
  sagittal: { title: "正中矢状断", latin: "Sectio sagittalis mediana", note: "脳梁・間脳・脳幹を、前後方向の位置関係として観察します。", labels: ["脳梁", "視床", "視床下部", "中脳", "小脳"] },
  horizontal: { title: "水平断", latin: "Sectio horizontalis", note: "側脳室と基底核を手がかりに、左右対称性を確認します。", labels: ["側脳室", "尾状核", "被殻", "淡蒼球", "内包"] },
  coronal: { title: "冠状断", latin: "Sectio coronalis", note: "皮質から深部へ、白質・基底核・脳室の層を読み取ります。", labels: ["大脳皮質", "島皮質", "内包", "視床", "第三脳室"] },
  deep: { title: "深部構造", latin: "Structurae profundae", note: "周囲を透過し、位置関係の難しい構造をブロック標本のように分離します。", labels: ["脳弓", "海馬", "扁桃体", "基底核", "脳幹"] },
};

const tabs: { id: View; name: string; num: string }[] = [
  { id: "surface", name: "脳表", num: "01" }, { id: "sagittal", name: "矢状断", num: "02" },
  { id: "horizontal", name: "水平断", num: "03" }, { id: "coronal", name: "冠状断", num: "04" },
  { id: "deep", name: "深部構造", num: "05" },
];

export default function Home() {
  const [view, setView] = useState<View>("surface");
  const [labels, setLabels] = useState(true);
  const [layer, setLayer] = useState<"brain" | "vessel" | "nerve">("brain");
  const [rotation, setRotation] = useState({ x: -8, y: -16 });
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [selected, setSelected] = useState(0);
  const info = structures[view];

  const progress = useMemo(() => `${String(selected + 1).padStart(2, "0")} / ${String(info.labels.length).padStart(2, "0")}`, [selected, info]);

  function move(e: PointerEvent<HTMLDivElement>) {
    if (!drag) return;
    setRotation(r => ({ x: Math.max(-35, Math.min(25, r.x - (e.clientY - drag.y) * .25)), y: r.y + (e.clientX - drag.x) * .35 }));
    setDrag({ x: e.clientX, y: e.clientY });
  }

  return (
    <main>
      <header>
        <a className="brand" href="#top" aria-label="Neuro Atlas ホーム"><span className="brandMark">N</span><span>NEURO ATLAS<small>解剖実習ラボ</small></span></a>
        <div className="headerMeta"><span><i /> 実習セッション 04</span><button className="noteBtn">ノート <b>3</b></button><button className="profile">HK</button></div>
      </header>

      <nav className="rail" aria-label="観察標本">
        <p>SPECIMENS</p>
        {tabs.map(tab => <button key={tab.id} className={view === tab.id ? "active" : ""} onClick={() => { setView(tab.id); setSelected(0); }}><span>{tab.num}</span>{tab.name}</button>)}
        <div className="railRule" />
        <button className={layer === "vessel" ? "active" : ""} onClick={() => setLayer(layer === "vessel" ? "brain" : "vessel")}><span>06</span>脳血管</button>
        <button className={layer === "nerve" ? "active" : ""} onClick={() => setLayer(layer === "nerve" ? "brain" : "nerve")}><span>07</span>脳神経</button>
        <div className="railBottom"><div className="ring">68<small>%</small></div><span>学習進捗</span></div>
      </nav>

      <section className="workspace" id="top">
        <div className="crumb">ATLAS / <b>{info.title}</b></div>
        <div className="titleBlock"><span className="chapter">CHAPTER {tabs.find(t => t.id === view)?.num}</span><h1>{info.title}</h1><p>{info.latin}</p></div>

        <div className="viewer" onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); setDrag({ x: e.clientX, y: e.clientY }); }} onPointerMove={move} onPointerUp={() => setDrag(null)} onPointerCancel={() => setDrag(null)}>
          <div className="axis axisV">S<br/><span />I</div><div className="axis axisH">A<span />P</div>
          <div className={`brain ${view} ${layer}`} style={{ transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)` }} aria-label={`${info.title}の模式モデル`}>
            <div className="hemi left"><i/><i/><i/><i/><i/><i/></div><div className="hemi right"><i/><i/><i/><i/><i/><i/></div>
            <div className="cut"><b/><b/><b/><b/><b/></div><div className="cerebellum"/><div className="stem"/>
            <div className="vessels"><i/><i/><i/><i/><i/></div><div className="nerves"><i/><i/><i/><i/></div>
          </div>
          {labels && <div className="callouts"><button onClick={() => setSelected(0)} className={selected === 0 ? "on" : ""}>01 <b>{info.labels[0]}</b></button><button onClick={() => setSelected(1)} className={selected === 1 ? "on" : ""}>02 <b>{info.labels[1]}</b></button><button onClick={() => setSelected(2)} className={selected === 2 ? "on" : ""}>03 <b>{info.labels[2]}</b></button></div>}
          <div className="dragHint">↔ ドラッグして回転</div>
          <div className="viewTools"><button onClick={() => setRotation({x:-8,y:-16})}>⌂</button><button onClick={() => setRotation(r => ({...r, y:r.y-30}))}>↶</button><button onClick={() => setRotation(r => ({...r, y:r.y+30}))}>↷</button></div>
        </div>

        <div className="bottomBar">
          <div className="layerSwitch"><span>表示レイヤー</span><button className={layer === "brain" ? "on" : ""} onClick={() => setLayer("brain")}>脳実質</button><button className={layer === "vessel" ? "on" : ""} onClick={() => setLayer("vessel")}>血管</button><button className={layer === "nerve" ? "on" : ""} onClick={() => setLayer("nerve")}>脳神経</button></div>
          <label className="toggle"><input type="checkbox" checked={labels} onChange={e => setLabels(e.target.checked)}/><span/>ラベル表示</label>
          <button className={`test ${!labels ? "testing" : ""}`} onClick={() => setLabels(!labels)}>{labels ? "テストモードを開始" : "答えを表示"} <b>→</b></button>
        </div>
      </section>

      <aside className="inspector">
        <div className="inspectTop"><span>STRUCTURE</span><b>{progress}</b></div>
        <div className="number">{String(selected + 1).padStart(2, "0")}</div><h2>{info.labels[selected]}</h2><em>{info.latin}</em>
        <div className="divider" />
        <h3>観察のポイント</h3><p>{info.note}</p>
        <dl><div><dt>系統</dt><dd>{layer === "vessel" ? "脳血管系" : layer === "nerve" ? "末梢神経系" : "中枢神経系"}</dd></div><div><dt>位置</dt><dd>{view === "surface" ? "大脳半球・外側面" : "大脳・深部"}</dd></div></dl>
        <div className="thumbs">{info.labels.map((name, i) => <button key={name} onClick={() => setSelected(i)} className={selected === i ? "active" : ""}><span>{i + 1}</span><b>{name}</b></button>)}</div>
        <button className="memo">＋ この構造をノートに追加</button>
      </aside>
    </main>
  );
}
