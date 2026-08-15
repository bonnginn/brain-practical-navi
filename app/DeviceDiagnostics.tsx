import { useEffect, useState } from "react";
import { offlineResourceResponseError } from "./offlineCapacity";

type PackEvidence={id:string;name:string;version:string;expectedResources:number;cachedResources:number;markerVersion:string|null;markerComplete:boolean;current:boolean};
type PwaCheckpoint={kind:"online"|"offline"|"restored";recordedAt:string;online:boolean;standalone:boolean;serviceWorkerControlled:boolean;catalogVersion:string|null;packs:PackEvidence[]};
type PwaEvidence={online:PwaCheckpoint|null;offline:PwaCheckpoint|null;restored:PwaCheckpoint|null};
type OfflineCatalog={format:string;version:string;packs:{id:string;name:string;version:string;resources:{url:string;bytes:number}[]}[]};
type WalkthroughState={confirmed:boolean;recordedAt:string|null};

type DiagnosticReport={
  format:"brain-practical-device-check";
  schemaVersion:3;
  recordedAt:string;
  deviceLabel:string;
  route:{pathname:string;hash:string};
  environment:Record<string,unknown>;
  capabilities:Record<string,unknown>;
  storage:Record<string,unknown>;
  graphics:Record<string,unknown>;
  safeArea:Record<string,number>;
  frameSample:Record<string,number>;
  touch:{confirmed:boolean;pointerType:string|null;recordedAt:string|null};
  walkthrough:Record<WalkthroughKey,WalkthroughState>;
  pwaEvidence:PwaEvidence;
  problemNotes:string;
  gateDisclaimer:string;
};

type WalkthroughKey="home"|"surface"|"sections"|"blocks"|"quiz"|"segment"|"offlineSurface"|"offlineSections"|"offlineBlocks"|"offlineQuiz";
const walkthroughItems:{key:WalkthroughKey;label:string;detail:string}[]=[
  {key:"home",label:"ホーム",detail:"初期表示、教材入口、注意表示"},
  {key:"surface",label:"脳表",detail:"回転、拡大、構造選択、全解除"},
  {key:"sections",label:"断面",detail:"位置変更、構造選択、2D/3D切替"},
  {key:"blocks",label:"局所標本",detail:"組織表示、着脱、比較"},
  {key:"quiz",label:"クイズ",detail:"回答、断面移動、観察画面で復習"},
  {key:"segment",label:"編集ツール",detail:"描画、3方向照合、元に戻す"},
  {key:"offlineSurface",label:"機内モード・脳表",detail:"完全再読込、回転、構造選択"},
  {key:"offlineSections",label:"機内モード・断面",detail:"完全再読込、断面移動、構造選択"},
  {key:"offlineBlocks",label:"機内モード・局所標本",detail:"完全再読込、組織表示、着脱"},
  {key:"offlineQuiz",label:"機内モード・クイズ",detail:"完全再読込、回答、正誤表示"},
];
const initialWalkthrough=()=>Object.fromEntries(walkthroughItems.map(item=>[item.key,{confirmed:false,recordedAt:null}])) as Record<WalkthroughKey,WalkthroughState>;
const initialPwaEvidence=():PwaEvidence=>({online:null,offline:null,restored:null});
const DRAFT_KEY="brain-practical-device-check-draft-v3";
type DiagnosticDraft={schemaVersion:3;deviceLabel:string;report:DiagnosticReport|null;touch:DiagnosticReport["touch"];walkthrough:Record<WalkthroughKey,WalkthroughState>;pwaEvidence:PwaEvidence;problemNotes:string};
function loadDraft():DiagnosticDraft|null{try{if(typeof localStorage==="undefined")return null;const value=JSON.parse(localStorage.getItem(DRAFT_KEY)??"null");if(value?.schemaVersion!==3||!walkthroughItems.every(item=>typeof value.walkthrough?.[item.key]?.confirmed==="boolean"))return null;return value}catch{return null}}

const disclaimer="この記録だけでは実機ゲート合格になりません。実際のスマートフォンで主要ルートを一周し、操作・表示・ピークメモリを確認してください。";
const round=(value:number,digits=1)=>Number(value.toFixed(digits));
const formatBytes=(value:unknown)=>typeof value==="number"?`${(value/1048576).toFixed(1)} MiB`:"取得不可";

function measureSafeArea(){
  const probe=document.createElement("div");
  probe.style.cssText="position:fixed;visibility:hidden;pointer-events:none;padding-top:env(safe-area-inset-top);padding-right:env(safe-area-inset-right);padding-bottom:env(safe-area-inset-bottom);padding-left:env(safe-area-inset-left)";
  document.body.append(probe);
  const style=getComputedStyle(probe),result={top:parseFloat(style.paddingTop)||0,right:parseFloat(style.paddingRight)||0,bottom:parseFloat(style.paddingBottom)||0,left:parseFloat(style.paddingLeft)||0};
  probe.remove();return result;
}

function getGraphics(){
  const canvas=document.createElement("canvas");
  const webgl2=canvas.getContext("webgl2");
  const gl=webgl2??canvas.getContext("webgl")??canvas.getContext("experimental-webgl") as WebGLRenderingContext|null;
  if(!gl)return {webgl:false,webgl2:false};
  const debug=gl.getExtension("WEBGL_debug_renderer_info");
  return {webgl:true,webgl2:Boolean(webgl2),vendor:debug?gl.getParameter(debug.UNMASKED_VENDOR_WEBGL):gl.getParameter(gl.VENDOR),renderer:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),maxTextureSize:gl.getParameter(gl.MAX_TEXTURE_SIZE)};
}

function sampleFrames(duration=1100){
  return new Promise<Record<string,number>>(resolve=>{
    const intervals:number[]=[],started=performance.now();let previous=started;
    const tick=(now:number)=>{intervals.push(now-previous);previous=now;if(now-started<duration){requestAnimationFrame(tick);return}const sorted=intervals.slice(1).sort((a,b)=>a-b);const percentile=(p:number)=>sorted[Math.min(sorted.length-1,Math.floor(sorted.length*p))]??0;resolve({durationMs:round(now-started),frames:Math.max(0,intervals.length-1),medianIntervalMs:round(percentile(.5),2),p95IntervalMs:round(percentile(.95),2),maxIntervalMs:round(sorted.at(-1)??0,2)})};
    requestAnimationFrame(tick);
  });
}

export function DeviceDiagnostics(){
  const [initialDraft]=useState(loadDraft);
  const [deviceLabel,setDeviceLabel]=useState(initialDraft?.deviceLabel??"");
  const [report,setReport]=useState<DiagnosticReport|null>(initialDraft?.report??null);
  const [running,setRunning]=useState(false);
  const [touch,setTouch]=useState<DiagnosticReport["touch"]>(initialDraft?.touch??{confirmed:false,pointerType:null,recordedAt:null});
  const [walkthrough,setWalkthrough]=useState<Record<WalkthroughKey,WalkthroughState>>(initialDraft?.walkthrough??initialWalkthrough);
  const [pwaEvidence,setPwaEvidence]=useState<PwaEvidence>(initialDraft?.pwaEvidence??initialPwaEvidence);
  const [problemNotes,setProblemNotes]=useState(initialDraft?.problemNotes??"");
  const [message,setMessage]=useState("");

  useEffect(()=>{try{localStorage.setItem(DRAFT_KEY,JSON.stringify({schemaVersion:3,deviceLabel,report,touch,walkthrough,pwaEvidence,problemNotes} satisfies DiagnosticDraft))}catch{/* local draft is best effort */}},[deviceLabel,report,touch,walkthrough,pwaEvidence,problemNotes]);

  async function capturePwaCheckpoint(kind:PwaCheckpoint["kind"]){
    const online=navigator.onLine;
    if(kind==="offline"&&online){setMessage("機内モードまたは通信を切った状態で「オフライン」を記録してください。");return}
    if(kind!=="offline"&&!online){setMessage("通信を戻してからオンライン／復帰チェックポイントを記録してください。");return}
    setRunning(true);setMessage("教材セットの実キャッシュ状態を確認しています…");
    let catalogVersion:string|null=null,packs:PackEvidence[]=[];
    try{
      const catalogUrl=new URL("offline-packs.json",document.baseURI);
      const catalogResponse=online?await fetch(catalogUrl,{cache:"no-store"}):await caches.match(catalogUrl);
      if(!catalogResponse?.ok||catalogResponse.headers.get("Content-Type")?.toLowerCase().includes("text/html"))throw new Error("教材一覧が見つかりません");
      const catalog=await catalogResponse.json() as OfflineCatalog;
      if(catalog.format!=="brain-practical-offline-packs")throw new Error("教材一覧の形式が一致しません");
      catalogVersion=catalog.version;
      const cache=await caches.open("brain-practical-offline-packs");
      for(const pack of catalog.packs){
        let cachedResources=0;
        for(const resource of pack.resources){const response=await cache.match(new URL(resource.url,document.baseURI));if(!offlineResourceResponseError(resource.bytes,response??null))cachedResources++}
        const marker=await cache.match(new URL(`offline-pack-state/${pack.id}.json`,document.baseURI));
        const markerVersion=marker?.headers.get("X-Brain-Practical-Pack-Version")??null,markerComplete=marker?.headers.get("X-Brain-Practical-Pack-Complete")==="true";
        packs.push({id:pack.id,name:pack.name,version:pack.version,expectedResources:pack.resources.length,cachedResources,markerVersion,markerComplete,current:markerComplete&&markerVersion===pack.version&&cachedResources===pack.resources.length});
      }
    }catch(error){setRunning(false);setMessage(`PWA状態を記録できませんでした（${error instanceof Error?error.message:"不明なエラー"}）。`);return}
    const checkpoint:PwaCheckpoint={kind,recordedAt:new Date().toISOString(),online,standalone:matchMedia("(display-mode: standalone)").matches||Boolean((navigator as Navigator&{standalone?:boolean}).standalone),serviceWorkerControlled:Boolean(navigator.serviceWorker?.controller),catalogVersion,packs};
    const next={...pwaEvidence,[kind]:checkpoint};setPwaEvidence(next);setReport(previous=>previous?{...previous,pwaEvidence:next}:previous);setRunning(false);
    setMessage(`${kind==="online"?"保存後・オンライン":kind==="offline"?"機内モード起動":"再接続後"}のPWA状態を記録しました。`);
  }

  async function run(){
    setRunning(true);setMessage("約1秒間、描画間隔を採取しています…");
    const connection=(navigator as Navigator&{connection?:{effectiveType?:string;downlink?:number;rtt?:number;saveData?:boolean}}).connection;
    const memory=(performance as Performance&{memory?:{usedJSHeapSize:number;jsHeapSizeLimit:number}}).memory;
    let estimate:StorageEstimate={};let persisted:boolean|null=null;
    if(navigator.storage?.estimate)try{estimate=await navigator.storage.estimate()}catch{estimate={}}
    if(navigator.storage?.persisted)try{persisted=await navigator.storage.persisted()}catch{persisted=null}
    const frameSample=await sampleFrames();
    const visual=window.visualViewport;
    const orientation=screen.orientation;
    const next:DiagnosticReport={
      format:"brain-practical-device-check",schemaVersion:3,recordedAt:new Date().toISOString(),deviceLabel:deviceLabel.trim(),
      route:{pathname:location.pathname,hash:location.hash},
      environment:{userAgent:navigator.userAgent,platform:navigator.platform,language:navigator.language,online:navigator.onLine,viewport:{width:innerWidth,height:innerHeight},visualViewport:visual?{width:round(visual.width),height:round(visual.height),scale:visual.scale}:null,screen:{width:screen.width,height:screen.height,orientation:orientation?.type??null},devicePixelRatio,hardwareConcurrency:navigator.hardwareConcurrency??null,deviceMemory:(navigator as Navigator&{deviceMemory?:number}).deviceMemory??null,maxTouchPoints:navigator.maxTouchPoints},
      capabilities:{pointerCoarse:matchMedia("(pointer: coarse)").matches,pointerFine:matchMedia("(pointer: fine)").matches,hover:matchMedia("(hover: hover)").matches,standalone:matchMedia("(display-mode: standalone)").matches||Boolean((navigator as Navigator&{standalone?:boolean}).standalone),serviceWorker:"serviceWorker" in navigator,serviceWorkerControlled:Boolean(navigator.serviceWorker?.controller),cacheStorage:"caches" in window,network:connection?{effectiveType:connection.effectiveType??null,downlinkMbps:connection.downlink??null,rttMs:connection.rtt??null,saveData:connection.saveData??null}:null,performanceMemory:memory?{usedJSHeapBytes:memory.usedJSHeapSize,heapLimitBytes:memory.jsHeapSizeLimit}:null},
      storage:{usageBytes:estimate.usage??null,quotaBytes:estimate.quota??null,persisted},graphics:getGraphics(),safeArea:measureSafeArea(),frameSample,touch,walkthrough:{...walkthrough},pwaEvidence,problemNotes:problemNotes.trim(),gateDisclaimer:disclaimer
    };
    setReport(next);setRunning(false);setMessage("診断を記録しました。結果はこの端末内だけに表示されています。");
  }

  function confirmTouch(event:React.PointerEvent<HTMLButtonElement>){
    if(event.pointerType!=="touch"){setMessage("マウス／ペン入力はタッチ確認に数えません。実機で指で触れてください。");return}
    const next={confirmed:true,pointerType:event.pointerType,recordedAt:new Date().toISOString()};setTouch(next);setReport(previous=>previous?{...previous,touch:next}:previous);setMessage("指によるタッチ入力を記録しました。");
  }

  function download(){
    if(!report)return;const blob=new Blob([JSON.stringify({...report,deviceLabel:deviceLabel.trim(),touch,walkthrough:{...walkthrough},pwaEvidence,problemNotes:problemNotes.trim()},null,2)],{type:"application/json"});const url=URL.createObjectURL(blob),link=document.createElement("a");link.href=url;link.download=`brain-practical-device-check-${new Date().toISOString().replace(/[:.]/g,"-")}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setMessage("診断JSONを書き出しました。アプリから外部へ自動送信はしていません。");
  }

  function clearDraft(){
    try{localStorage.removeItem(DRAFT_KEY)}catch{/* nothing to clear */}
    setDeviceLabel("");setReport(null);setTouch({confirmed:false,pointerType:null,recordedAt:null});setWalkthrough(initialWalkthrough());setPwaEvidence(initialPwaEvidence());setProblemNotes("");setMessage("この端末の診断下書きを初期状態へ戻しました。");
  }

  return <div className="deviceCheck">
    <div className="deviceCheckNotice"><b>端末内だけで診断・画面を移動して再開</b><p>氏名・メールアドレスは不要です。下書きはこのブラウザだけに保存され、結果は自動送信されません。「JSONを書き出す」を選んだ場合だけファイルになります。</p></div>
    <label className="deviceCheckLabel"><span>端末メモ（任意）</span><input value={deviceLabel} onChange={event=>setDeviceLabel(event.target.value)} placeholder="例: iPhone 15 / Safari" maxLength={80}/></label>
    <div className="deviceCheckActions"><button className="primary" onClick={()=>void run()} disabled={running}>{running?"採取中…":"端末診断を開始"}</button><button onPointerDown={confirmTouch} className={touch.confirmed?"confirmed":""}>{touch.confirmed?"タッチ確認済み":"ここを指でタッチ"}</button><button onClick={download} disabled={!report}>JSONを書き出す</button><button onClick={clearDraft} disabled={running}>下書きを初期化</button></div>
    <p className={`deviceTouchState ${touch.confirmed?"confirmed":"pending"}`}><b>タッチ操作: {touch.confirmed?"確認済み":"未確認"}</b><span>{touch.confirmed?"touch pointer を記録しました。":"マウスやペンでは確認済みになりません。"}</span></p>
    {message&&<p className="deviceCheckMessage" role="status">{message}</p>}
    {report&&<div className="deviceCheckResults">
      <article><h3>画面・入力</h3><dl><div><dt>表示領域</dt><dd>{String((report.environment.viewport as {width:number;height:number}).width)} × {String((report.environment.viewport as {width:number;height:number}).height)} px</dd></div><div><dt>DPR</dt><dd>{String(report.environment.devicePixelRatio)}</dd></div><div><dt>safe area</dt><dd>{Object.values(report.safeArea).join(" / ")} px</dd></div><div><dt>coarse pointer</dt><dd>{report.capabilities.pointerCoarse?"はい":"いいえ"}</dd></div></dl></article>
      <article><h3>PWA・保存</h3><dl><div><dt>Service Worker</dt><dd>{report.capabilities.serviceWorkerControlled?"制御中":report.capabilities.serviceWorker?"対応・未制御":"非対応"}</dd></div><div><dt>単独起動</dt><dd>{report.capabilities.standalone?"はい":"いいえ"}</dd></div><div><dt>使用量</dt><dd>{formatBytes(report.storage.usageBytes)}</dd></div><div><dt>利用可能枠</dt><dd>{formatBytes(report.storage.quotaBytes)}</dd></div></dl></article>
      <article><h3>描画</h3><dl><div><dt>WebGL 2</dt><dd>{report.graphics.webgl2?"対応":"非対応"}</dd></div><div><dt>renderer</dt><dd>{String(report.graphics.renderer??"取得不可")}</dd></div><div><dt>中央値</dt><dd>{report.frameSample.medianIntervalMs} ms</dd></div><div><dt>p95</dt><dd>{report.frameSample.p95IntervalMs} ms</dd></div></dl><small>約1秒の静止画面サンプルです。公開環境の性能測定や操作中のピーク値ではありません。</small></article>
    </div>}
    <div className="devicePwaCheckpoints"><header><div><h3>PWAの3段階記録</h3><small>記録済み {Object.values(pwaEvidence).filter(Boolean).length} / 3</small></div><p>ホーム画面から単独起動し、3教材セットを保存してからオンラインを記録します。機内モードで主要4経路を確認してオフラインを記録し、通信を戻した後に復帰を記録してください。</p></header><div>{(["online","offline","restored"] as const).map(kind=>{const checkpoint=pwaEvidence[kind],label=kind==="online"?"保存後・オンライン":kind==="offline"?"機内モード起動":"再接続後";return <article key={kind} className={checkpoint?"recorded":""}><div><b>{label}</b><small>{checkpoint?new Date(checkpoint.recordedAt).toLocaleString():"未記録"}</small></div>{checkpoint&&<dl><div><dt>接続</dt><dd>{checkpoint.online?"オンライン":"オフライン"}</dd></div><div><dt>単独起動</dt><dd>{checkpoint.standalone?"はい":"いいえ"}</dd></div><div><dt>SW制御</dt><dd>{checkpoint.serviceWorkerControlled?"はい":"いいえ"}</dd></div><div><dt>教材</dt><dd>{checkpoint.packs.filter(pack=>pack.current).length} / {checkpoint.packs.length} 保存済み</dd></div></dl>}<button disabled={running} onClick={()=>void capturePwaCheckpoint(kind)}>{checkpoint?"再記録":"この状態を記録"}</button></article>})}</div></div>
    <div className="deviceRouteChecklist"><header><div><h3>実機で一周したルート</h3><small>確認済み {Object.values(walkthrough).filter(item=>item.confirmed).length} / {walkthroughItems.length}</small></div><p>各画面を実際に操作した後でチェックしてください。確認時刻も端末内JSONへ記録します。チェックだけでは自動的にGate合格になりません。</p></header><div>{walkthroughItems.map(item=><label key={item.key}><input type="checkbox" checked={walkthrough[item.key].confirmed} onChange={event=>setWalkthrough(previous=>({...previous,[item.key]:{confirmed:event.target.checked,recordedAt:event.target.checked?new Date().toISOString():null}}))}/><span><b>{item.label}</b><small>{item.detail}</small></span></label>)}</div><label className="deviceProblemNotes"><span>問題・再現手順（問題なしの場合は「問題なし」）</span><textarea value={problemNotes} onChange={event=>setProblemNotes(event.target.value)} placeholder="例: 水平断から脳表へ戻ると再読み込みされた" maxLength={2000}/></label></div>
    <p className="deviceGateDisclaimer">{disclaimer}</p>
  </div>;
}
