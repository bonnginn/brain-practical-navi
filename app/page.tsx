"use client";

import { PointerEvent, useEffect, useMemo, useState } from "react";
import { AtlasVolumeCanvas, type IdentifiedPoint } from "./AtlasVolumeCanvas";

type Plane = "coronal" | "horizontal" | "sagittal";
type Focus = "ventricle" | "caudate" | "hippocampus" | "thalamus";
type StructureKey = Focus | "thirdVentricle" | "putamen" | "pallidum" | "amygdala" | "accumbens" | "redNucleus" | "substantiaNigra" | "subthalamic" | "brainstem" | "cerebellum" | "opticChiasm" | "insula";
type StructureInfo = { name: string; latin: string; color: string; rgb: [number,number,number]; ids: number[]; manualIds?: number[]; note: string; relation: string; meshFocus?: Focus };

const planeData: Record<Plane, { ja: string; en: string; axis: string; from: string; to: string }> = {
  coronal: { ja: "冠状断", en: "CORONAL", axis: "前後位置", from: "前方", to: "後方" },
  horizontal: { ja: "水平断", en: "HORIZONTAL", axis: "上下位置", from: "上方", to: "下方" },
  sagittal: { ja: "矢状断", en: "SAGITTAL", axis: "左右位置", from: "左外側", to: "右外側" },
};

const structures: Record<StructureKey, StructureInfo> = {
  ventricle: { name: "側脳室", latin: "Ventriculus lateralis", color: "#49a9b4", rgb:[73,169,180], ids:[92,41,56,5], meshFocus:"ventricle", note: "前角・体部・後角・下角が連続する空間です。断面を動かして形の変化を追います。", relation: "脳梁の下方、尾状核・視床の内側" },
  thirdVentricle: { name:"第三脳室", latin:"Ventriculus tertius", color:"#58aeb8", rgb:[88,174,184], ids:[80,29], meshFocus:"ventricle", note:"左右の視床間にある正中の細い腔です。水平断・冠状断で側脳室との連続を確認します。", relation:"左右視床の間、視床下部の上方" },
  caudate: { name: "尾状核", latin: "Nucleus caudatus", color: "#e19749", rgb:[225,151,73], ids:[100,49], manualIds:[7,8], meshFocus:"caudate", note: "側脳室に沿って前後へ連続する核です。断面を移動して頭・体・尾の位置変化を追います。", relation: "側脳室の外側、内包の内側" },
  putamen: { name:"被殻", latin:"Putamen", color:"#d9854f", rgb:[217,133,79], ids:[72,21], manualIds:[9,10], note:"レンズ核の外側部です。淡蒼球との境界と、外側を走る外包を確認します。", relation:"淡蒼球の外側、島皮質の内側" },
  pallidum: { name:"淡蒼球", latin:"Globus pallidus", color:"#c8a451", rgb:[200,164,81], ids:[78,27], manualIds:[11,12,13,14], note:"レンズ核の内側部です。被殻より淡く見えることが多く、内包に接します。", relation:"被殻の内側、内包の外側" },
  thalamus: { name: "視床", latin: "Thalamus", color: "#8d82c4", rgb:[141,130,196], ids:[91,40], manualIds:[15,16], meshFocus:"thalamus", note: "第三脳室を挟んで左右に位置します。水平断と冠状断で内包との境界を比較します。", relation: "第三脳室外側、内包の内側" },
  hippocampus: { name: "海馬", latin: "Hippocampus", color: "#c8798d", rgb:[200,121,141], ids:[99,48], manualIds:[17,18], meshFocus:"hippocampus", note: "側脳室下角の床に沿う構造です。冠状断と矢状断を往復して前後方向の連続を確認します。", relation: "側脳室下角の内側・床" },
  amygdala: { name:"扁桃体", latin:"Corpus amygdaloideum", color:"#c76878", rgb:[199,104,120], ids:[70,19], manualIds:[21,22], note:"側頭葉内側前方の核群です。海馬の前端との移行を連続断面で追います。", relation:"海馬頭の前上方、側脳室下角の前方" },
  accumbens: { name:"側坐核", latin:"Nucleus accumbens", color:"#78b579", rgb:[120,181,121], ids:[55,4], manualIds:[19,20], note:"尾状核頭と被殻が腹側で連続する領域に位置します。前方の冠状断で確認します。", relation:"尾状核頭・被殻の腹側、前交連の前下方" },
  redNucleus: { name:"赤核", latin:"Nucleus ruber", color:"#d24f49", rgb:[210,79,73], ids:[], manualIds:[1,2], note:"中脳被蓋にある円形の核です。黒質・中脳水道との位置関係を確認します。", relation:"中脳水道の腹外側、黒質の背内側" },
  substantiaNigra: { name:"黒質", latin:"Substantia nigra", color:"#716387", rgb:[113,99,135], ids:[], manualIds:[3,4], note:"中脳脚と被蓋の境界に沿う帯状の核です。赤核より腹側に位置します。", relation:"大脳脚の背側、赤核の腹外側" },
  subthalamic: { name:"視床下核", latin:"Nucleus subthalamicus", color:"#e0ad45", rgb:[224,173,69], ids:[], manualIds:[5,6], note:"小さなレンズ状の核です。淡蒼球内節・黒質との位置関係を連続断面で追います。", relation:"視床の腹側、黒質の背側、内包の内側" },
  brainstem: { name:"脳幹", latin:"Truncus encephali", color:"#739b72", rgb:[115,155,114], ids:[62,11], note:"中脳・橋・延髄へ連続する軸性構造です。脳神経の出入口を考える基準になります。", relation:"間脳の下方、小脳の前方" },
  cerebellum: { name:"小脳", latin:"Cerebellum", color:"#8ba867", rgb:[139,168,103], ids:[97,46,90,39], note:"皮質と白質、正中の虫部を区別します。水平断と矢状断で小脳脚との連続を追います。", relation:"脳幹の後方、後頭葉の下方" },
  opticChiasm: { name:"視交叉", latin:"Chiasma opticum", color:"#d4b65b", rgb:[212,182,91], ids:[68,17], note:"左右の視神経線維が交叉する正中構造です。小さいため前後の断面を細かく動かします。", relation:"視床下部の前下方、下垂体柄の前方" },
  insula: { name:"島皮質", latin:"Insula", color:"#6f9db0", rgb:[111,157,176], ids:[74,23], note:"外側溝の深部にある皮質です。弁蓋を除いた位置関係を断面で確認します。", relation:"被殻・外包の外側、前頭・頭頂・側頭弁蓋の深部" },
};

const atlasRegions:{ids:number[];name:string}[]=[
  {ids:[80,29],name:"第三脳室"},{ids:[88,37],name:"第四脳室"},{ids:[62,11],name:"脳幹"},{ids:[92,41],name:"側脳室"},{ids:[56,5],name:"側脳室下角"},{ids:[97,46],name:"小脳皮質"},{ids:[90,39],name:"小脳白質"},{ids:[91,40],name:"視床"},{ids:[100,49],name:"尾状核"},{ids:[72,21],name:"被殻"},{ids:[78,27],name:"淡蒼球"},{ids:[99,48],name:"海馬"},{ids:[70,19],name:"扁桃体"},{ids:[55,4],name:"側坐核"},{ids:[77,26],name:"腹側間脳"},{ids:[68,17],name:"視交叉"},{ids:[76,25],name:"前脳基底部"},{ids:[101,50],name:"小脳虫部 I–V"},{ids:[53,2],name:"小脳虫部 VI–VII"},{ids:[71,20],name:"小脳虫部 VIII–X"},
  {ids:[81,30],name:"尾側前帯状皮質"},{ids:[93,42],name:"尾側中前頭回"},{ids:[94,43],name:"楔部"},{ids:[87,36],name:"嗅内野"},{ids:[75,24],name:"紡錘状回"},{ids:[61,10],name:"下頭頂小葉"},{ids:[54,3],name:"下側頭回"},{ids:[84,33],name:"帯状回峡部"},{ids:[85,34],name:"外側後頭皮質"},{ids:[58,7],name:"外側眼窩前頭皮質"},{ids:[63,12],name:"舌状回"},{ids:[66,15],name:"内側眼窩前頭皮質"},{ids:[79,28],name:"中側頭回"},{ids:[69,18],name:"海馬傍回"},{ids:[67,16],name:"中心傍小葉"},{ids:[83,32],name:"下前頭回弁蓋部"},{ids:[95,44],name:"下前頭回眼窩部"},{ids:[73,22],name:"下前頭回三角部"},{ids:[57,6],name:"鳥距溝周囲皮質"},{ids:[64,13],name:"中心後回"},{ids:[98,47],name:"後帯状皮質"},{ids:[86,35],name:"中心前回"},{ids:[82,31],name:"楔前部"},{ids:[59,8],name:"吻側前帯状皮質"},{ids:[52,1],name:"吻側中前頭回"},{ids:[89,38],name:"上前頭回"},{ids:[60,9],name:"上頭頂小葉"},{ids:[96,45],name:"上側頭回"},{ids:[102,51],name:"縁上回"},{ids:[65,14],name:"横側頭回"},{ids:[74,23],name:"島皮質"}
];
const atlasNameById=new Map(atlasRegions.flatMap(region=>region.ids.map(id=>[id,region.name] as const)));
atlasNameById.set(201,"白質");atlasNameById.set(202,"灰白質");atlasNameById.set(203,"髄液腔");
const manualNameById=new Map<number,string>([[1,"左赤核"],[2,"右赤核"],[3,"左黒質"],[4,"右黒質"],[5,"左視床下核"],[6,"右視床下核"],[7,"左尾状核"],[8,"右尾状核"],[9,"左被殻"],[10,"右被殻"],[11,"左淡蒼球外節"],[12,"右淡蒼球外節"],[13,"左淡蒼球内節"],[14,"右淡蒼球内節"],[15,"左視床"],[16,"右視床"],[17,"左海馬"],[18,"右海馬"],[19,"左側坐核"],[20,"右側坐核"],[21,"左扁桃体"],[22,"右扁桃体"]]);

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
  const [selectedStructure, setSelectedStructure] = useState<StructureKey>("ventricle");
  const [identified, setIdentified] = useState<(IdentifiedPoint & {name:string;side:string}) | null>(null);
  const [labels, setLabels] = useState(true);
  const [mode, setMode] = useState<"explore" | "practice">("explore");
  const [block, setBlock] = useState<"inside" | "ghost" | "extracted" | "segmented">("inside");
  const [display, setDisplay] = useState<"specimen" | "diagram" | "outline">("specimen");
  const [contrast, setContrast] = useState<"t1" | "t2" | "bigbrain" | "single">("bigbrain");
  const [rotation, setRotation] = useState({ x: -7, y: -18 });
  const [playing, setPlaying] = useState(false);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const current = structures[selectedStructure];
  const structureKeys=Object.keys(structures) as StructureKey[];
  const nearest = useMemo(() => landmarks.reduce((a, b) => Math.abs(b.p - position) < Math.abs(a.p - position) ? b : a), [position]);
  useEffect(() => { if (!playing) return; const timer = window.setInterval(() => setPosition(p => p >= 95 ? 5 : p + 1), 90); return () => window.clearInterval(timer); }, [playing]);
  useEffect(()=>setIdentified(null),[plane,position,contrast]);

  function move(e: PointerEvent<HTMLDivElement>) {
    if (!drag) return;
    setRotation(r => ({ x: Math.max(-28, Math.min(22, r.x - (e.clientY - drag.y) * .2)), y: r.y + (e.clientX - drag.x) * .3 }));
    setDrag({ x: e.clientX, y: e.clientY });
  }

  function jump(nextPlane: Plane, nextPosition?: number) {
    setPlane(nextPlane);
    if (nextPosition !== undefined) setPosition(nextPosition);
  }

  function selectStructure(key:StructureKey){setSelectedStructure(key);const meshFocus=structures[key].meshFocus;if(meshFocus)setFocus(meshFocus)}
  function identify(point:IdentifiedPoint){
    const manual=point.certainty==="manual",name=manual?(manualNameById.get(point.id)??(point.id===0?"手動ラベルの範囲外":`未登録領域 ${point.id}`)):(atlasNameById.get(point.id)??(point.id===0?"アトラス領域外":`未登録領域 ${point.id}`)),side=manual||point.id===0||point.id>=200?"":point.id>=52?"左":"右";
    setIdentified({...point,name,side});
    const match=structureKeys.find(key=>(manual?structures[key].manualIds:structures[key].ids)?.includes(point.id));if(match)selectStructure(match);
  }

  return <main className="appShell">
    <header className="topbar">
      <a className="brand" href="#workspace"><span className="brandMark">脳</span><span>脳実習ナビ<small>脳解剖実習 学習補助アプリ</small></span></a>
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
      {structureKeys.map(key => <button key={key} className={`structureBtn ${selectedStructure === key ? "active" : ""}`} onClick={() => selectStructure(key)}><i style={{background: structures[key].color}}/><span>{structures[key].name}</span></button>)}
      <div className="bookNotice"><b>実習プロトコル</b><p>書籍固有の手順は資料確認後に追加します。</p><span>FRAMEWORK READY</span></div>
    </aside>

    <section className="workArea" id="workspace">
      <div className="workHead"><div><span className="eyebrow">CONTINUOUS SECTION</span><h1>{planeData[plane].ja}を連続して追う</h1></div><label className="labelToggle"><input type="checkbox" checked={labels} onChange={e => setLabels(e.target.checked)}/><span/>構造表示</label></div>

      <div className="visualGrid">
        <section className="slicePanel">
          <div className="panelHead"><div><b>現在の切断面</b><small>{planeData[plane].ja}・位置 {position}{contrast === "bigbrain" ? "・単一標本脳 0.5 mm（ラベル照合済）" : contrast === "single" ? "・単一固定脳 MRI 0.44 mm（画像参照）" : "・平均標準脳"}</small></div><div className="sliceTools"><div className="contrastSwitch" aria-label="断面画像ソース"><button className={contrast === "bigbrain" ? "active" : ""} onClick={() => setContrast("bigbrain")}>単一標本 0.5</button><button className={contrast === "single" ? "active" : ""} onClick={() => setContrast("single")}>固定脳MRI 0.44</button><button className={contrast === "t1" ? "active" : ""} onClick={() => setContrast("t1")}>平均T1</button><button className={contrast === "t2" ? "active" : ""} onClick={() => setContrast("t2")}>T2</button></div><div className="displaySwitch"><button className={display === "specimen" ? "active" : ""} onClick={() => setDisplay("specimen")}>実習標本調</button><button className={display === "diagram" ? "active" : ""} onClick={() => setDisplay("diagram")}>学習図</button><button className={display === "outline" ? "active" : ""} onClick={() => setDisplay("outline")}>輪郭</button></div></div></div>
          <div className={`sliceStage ${plane} ${sliceVariant(position)}`}>
            <div className="sliceViewport">
              <AtlasVolumeCanvas kind="slice" plane={plane} position={position} focus={focus} display={display} rotation={rotation} contrast={contrast} highlightIds={labels?(contrast==="bigbrain"?current.manualIds??[]:contrast==="single"?[]:current.ids):[]} highlightColor={current.rgb} onIdentify={contrast==="single"?undefined:identify}/>
              <div className={`identifyHint ${contrast==="single"?"unavailable":""}`}><b>{contrast==="single"?"画像参照モード":"断面をクリックして同定"}</b><span>{contrast==="bigbrain"?"画像・ラベル同一0.5 mm格子":contrast==="single"?"未検証ラベルは表示しません":"アトラス対応"}</span></div>
              {identified&&<div className={`identifyMarker ${identified.id===0?"outside":""}`} style={{left:`clamp(88px, ${identified.x}px, calc(100% - 88px))`,top:`clamp(70px, ${identified.y}px, calc(100% - 18px))`}}><i/><b>{labels?`${identified.side}${identified.name}`:"？"}</b><small>{identified.certainty==="atlas"?"ATLAS":"MANUAL"}</small></div>}
              <div className="scale">20 mm</div>
            </div>
            <aside className="modelInset" aria-label="全脳で切断位置を確認">
              <div className="insetHead"><div><b>全脳</b><small>切断位置</small></div><span>3D</span></div>
              <div className="modelStage insetStage" onPointerDown={e => { if ((e.target as HTMLElement).closest("button")) return; e.currentTarget.setPointerCapture(e.pointerId); setDrag({x:e.clientX,y:e.clientY}); }} onPointerMove={move} onPointerUp={() => setDrag(null)} onPointerCancel={() => setDrag(null)}>
                <AtlasVolumeCanvas kind="surface" plane={plane} position={position} focus={focus} display={display} rotation={rotation} view={block} showFocus={!!current.meshFocus}/><div className={`brainModel atlasOverlay ${plane} ${block}`} style={{transform:`rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`}}>
                  <div className="hemi left"><i/><i/><i/><i/><i/></div><div className="hemi right"><i/><i/><i/><i/><i/></div><div className="cerebellum"/><div className="stem"/>
                  <div className="ventricleShape" style={{"--focus": current.color} as React.CSSProperties}><i/><i/><i/></div>
                  <div className="cutPlane" style={{"--pos": `${position}%`} as React.CSSProperties}><b>{planeData[plane].en.slice(0,3)} {position}</b></div>
                </div>
                <div className="orientation"><b>S</b><i/><b>I</b><span><b>A</b><i/><b>P</b></span></div>
                <div className="blockControls"><button className={block === "inside" ? "active" : ""} onClick={e => {e.stopPropagation();setBlock("inside")}}>全脳</button><button className={block === "segmented" ? "active" : ""} onClick={e => {e.stopPropagation();setBlock("segmented")}}>分節</button><button className={block === "ghost" ? "active" : ""} onClick={e => {e.stopPropagation();setBlock("ghost")}}>透過</button><button className={block === "extracted" ? "active" : ""} onClick={e => {e.stopPropagation();setBlock("extracted")}}>切断</button></div>
              </div>
            </aside>
          </div>
          <section className="timeline sliceTimeline">
            <div className="timelineHead"><button className={`playButton ${playing ? "active" : ""}`} onClick={() => setPlaying(!playing)} aria-label={playing ? "連続断面を停止" : "連続断面を再生"}>{playing ? "Ⅱ" : "▶"}</button><div><span>{planeData[plane].from}</span><b>{planeData[plane].axis}</b><span>{planeData[plane].to}</span></div><output>{position}</output></div>
            <div className="rangeWrap">
              <input aria-label={`${planeData[plane].ja}の${planeData[plane].axis}`} type="range" min="0" max="100" value={position} onChange={e => {setPlaying(false);setPosition(Number(e.target.value))}} onKeyDown={e => {if(e.key==="ArrowLeft"||e.key==="ArrowRight")setPlaying(false)}}/>
              {landmarks.map(mark => <button key={mark.p} className={Math.abs(mark.p-position)<5 ? "active" : ""} style={{left:`${mark.p}%`}} onClick={() => setPosition(mark.p)}><i/><span>{mark.short}</span></button>)}
            </div>
            <p><b>{nearest.label}</b> に近い断面です。スライダーを動かして、構造の出現・消失を観察してください。</p>
          </section>
          <div className="selectedStructureBar"><span style={{background:current.color}}/><div><small>表示中の重要構造</small><b>{current.name}</b></div><p>{labels?(contrast==="bigbrain"?(current.manualIds?.length?"同一格子で検証済みの手動ラベルを表示中":"この構造の手動ラベルは未収録"):contrast==="single"?"固定脳MRIでは未検証ラベルを表示しません":"アトラス領域を表示中"):"解答を隠しています"}</p><button onClick={()=>setLabels(!labels)} disabled={contrast==="single"}>{labels?"隠す":"表示"}</button></div>
        </section>
      </div>

    </section>

    <aside className="inspector">
      <div className="inspectIndex"><span>SELECTED STRUCTURE</span><b>{String(structureKeys.indexOf(selectedStructure)+1).padStart(2,"0")} / {structureKeys.length}</b></div>
      <div className="structureColor" style={{background:current.color}}/>
      <h2>{current.name}</h2><em>{current.latin}</em>
      <div className="rule"/><h3>この断面で見ること</h3><p>{current.note}</p>
      <dl><div><dt>位置関係</dt><dd>{current.relation}</dd></div><div><dt>現在の断面</dt><dd>{planeData[plane].ja}・位置 {position}</dd></div><div><dt>近い指標</dt><dd>{nearest.label}</dd></div></dl>
      <div className="identifyCard"><span>クリック同定</span>{contrast==="single"?<><b>画像参照モード</b><small>座標未確認のラベルは重ねません。照合済みの「単一標本 0.5」を選択してください。</small></>:identified?<><b>{labels?`${identified.side}${identified.name}`:"解答非表示"}</b><small>{identified.certainty==="atlas"?"CerebAアトラス対応":"画像と同一格子のBigBrain手動ラベル"}</small></>:<><b>断面上をクリック</b><small>指した場所の構造名を表示します</small></>}</div>
      <div className="continuity"><span>連続性</span><div><i style={{width:`${Math.max(18, 100-Math.abs(position-52)*1.35)}%`,background:current.color}}/></div><small>この断面での見えやすさ</small></div>
      <button className="quiz" onClick={() => setLabels(!labels)} disabled={contrast==="single"}>{contrast==="single"?"固定脳MRIは画像参照のみ":labels ? "ラベルを隠して確認" : "答えを表示"}<b>→</b></button>
      {mode === "practice" && <div className="practiceCard"><span>実習ガイド・準備版</span><b>連続断面の観察</b><ol><li>全脳上で切断位置を確認</li><li>断面を前後に移動</li><li>別方向の断面と対応</li></ol></div>}
      <p className="atlasCredit">解剖基盤：BigBrain 2015（Amunts et al.）、BigBrain manual subcortical segmentation（Xiao et al.）。主表示は画像と手動ラベルが同一のICBM2009 symmetric 0.5 mm格子にある組合せです。固定脳MRIには未検証ラベルを重ねません。平均T1/T2のみCerebAアトラス対応です。診断用途ではありません。</p>
    </aside>
  </main>;
}
