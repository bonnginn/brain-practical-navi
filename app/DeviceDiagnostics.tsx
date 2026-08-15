import { useState } from "react";

type DiagnosticReport={
  format:"brain-practical-device-check";
  schemaVersion:2;
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
  walkthrough:Record<WalkthroughKey,boolean>;
  problemNotes:string;
  gateDisclaimer:string;
};

type WalkthroughKey="home"|"surface"|"sections"|"blocks"|"quiz"|"segment"|"pwaOffline";
const walkthroughItems:{key:WalkthroughKey;label:string;detail:string}[]=[
  {key:"home",label:"ホーム",detail:"初期表示、教材入口、注意表示"},
  {key:"surface",label:"脳表",detail:"回転、拡大、構造選択、全解除"},
  {key:"sections",label:"断面",detail:"位置変更、構造選択、2D/3D切替"},
  {key:"blocks",label:"局所標本",detail:"組織表示、着脱、比較"},
  {key:"quiz",label:"クイズ",detail:"回答、断面移動、観察画面で復習"},
  {key:"segment",label:"編集ツール",detail:"描画、3方向照合、元に戻す"},
  {key:"pwaOffline",label:"PWA・オフライン",detail:"単独起動、保存済み教材の機内モード復帰"},
];
const initialWalkthrough=()=>Object.fromEntries(walkthroughItems.map(item=>[item.key,false])) as Record<WalkthroughKey,boolean>;

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
  const [deviceLabel,setDeviceLabel]=useState("");
  const [report,setReport]=useState<DiagnosticReport|null>(null);
  const [running,setRunning]=useState(false);
  const [touch,setTouch]=useState<DiagnosticReport["touch"]>({confirmed:false,pointerType:null,recordedAt:null});
  const [walkthrough,setWalkthrough]=useState<Record<WalkthroughKey,boolean>>(initialWalkthrough);
  const [problemNotes,setProblemNotes]=useState("");
  const [message,setMessage]=useState("");

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
      format:"brain-practical-device-check",schemaVersion:2,recordedAt:new Date().toISOString(),deviceLabel:deviceLabel.trim(),
      route:{pathname:location.pathname,hash:location.hash},
      environment:{userAgent:navigator.userAgent,platform:navigator.platform,language:navigator.language,online:navigator.onLine,viewport:{width:innerWidth,height:innerHeight},visualViewport:visual?{width:round(visual.width),height:round(visual.height),scale:visual.scale}:null,screen:{width:screen.width,height:screen.height,orientation:orientation?.type??null},devicePixelRatio,hardwareConcurrency:navigator.hardwareConcurrency??null,deviceMemory:(navigator as Navigator&{deviceMemory?:number}).deviceMemory??null,maxTouchPoints:navigator.maxTouchPoints},
      capabilities:{pointerCoarse:matchMedia("(pointer: coarse)").matches,pointerFine:matchMedia("(pointer: fine)").matches,hover:matchMedia("(hover: hover)").matches,standalone:matchMedia("(display-mode: standalone)").matches||Boolean((navigator as Navigator&{standalone?:boolean}).standalone),serviceWorker:"serviceWorker" in navigator,serviceWorkerControlled:Boolean(navigator.serviceWorker?.controller),cacheStorage:"caches" in window,network:connection?{effectiveType:connection.effectiveType??null,downlinkMbps:connection.downlink??null,rttMs:connection.rtt??null,saveData:connection.saveData??null}:null,performanceMemory:memory?{usedJSHeapBytes:memory.usedJSHeapSize,heapLimitBytes:memory.jsHeapSizeLimit}:null},
      storage:{usageBytes:estimate.usage??null,quotaBytes:estimate.quota??null,persisted},graphics:getGraphics(),safeArea:measureSafeArea(),frameSample,touch,walkthrough:{...walkthrough},problemNotes:problemNotes.trim(),gateDisclaimer:disclaimer
    };
    setReport(next);setRunning(false);setMessage("診断を記録しました。結果はこの端末内だけに表示されています。");
  }

  function confirmTouch(event:React.PointerEvent<HTMLButtonElement>){
    if(event.pointerType!=="touch"){setMessage("マウス／ペン入力はタッチ確認に数えません。実機で指で触れてください。");return}
    const next={confirmed:true,pointerType:event.pointerType,recordedAt:new Date().toISOString()};setTouch(next);setReport(previous=>previous?{...previous,touch:next}:previous);setMessage("指によるタッチ入力を記録しました。");
  }

  function download(){
    if(!report)return;const blob=new Blob([JSON.stringify({...report,deviceLabel:deviceLabel.trim(),touch,walkthrough:{...walkthrough},problemNotes:problemNotes.trim()},null,2)],{type:"application/json"});const url=URL.createObjectURL(blob),link=document.createElement("a");link.href=url;link.download=`brain-practical-device-check-${new Date().toISOString().replace(/[:.]/g,"-")}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setMessage("診断JSONを書き出しました。アプリから外部へ自動送信はしていません。");
  }

  return <div className="deviceCheck">
    <div className="deviceCheckNotice"><b>端末内だけで診断</b><p>氏名・メールアドレスは不要です。結果は自動送信されず、「JSONを書き出す」を選んだ場合だけファイルになります。</p></div>
    <label className="deviceCheckLabel"><span>端末メモ（任意）</span><input value={deviceLabel} onChange={event=>setDeviceLabel(event.target.value)} placeholder="例: iPhone 15 / Safari" maxLength={80}/></label>
    <div className="deviceCheckActions"><button className="primary" onClick={()=>void run()} disabled={running}>{running?"採取中…":"端末診断を開始"}</button><button onPointerDown={confirmTouch} className={touch.confirmed?"confirmed":""}>{touch.confirmed?"タッチ確認済み":"ここを指でタッチ"}</button><button onClick={download} disabled={!report}>JSONを書き出す</button></div>
    <p className={`deviceTouchState ${touch.confirmed?"confirmed":"pending"}`}><b>タッチ操作: {touch.confirmed?"確認済み":"未確認"}</b><span>{touch.confirmed?"touch pointer を記録しました。":"マウスやペンでは確認済みになりません。"}</span></p>
    {message&&<p className="deviceCheckMessage" role="status">{message}</p>}
    {report&&<div className="deviceCheckResults">
      <article><h3>画面・入力</h3><dl><div><dt>表示領域</dt><dd>{String((report.environment.viewport as {width:number;height:number}).width)} × {String((report.environment.viewport as {width:number;height:number}).height)} px</dd></div><div><dt>DPR</dt><dd>{String(report.environment.devicePixelRatio)}</dd></div><div><dt>safe area</dt><dd>{Object.values(report.safeArea).join(" / ")} px</dd></div><div><dt>coarse pointer</dt><dd>{report.capabilities.pointerCoarse?"はい":"いいえ"}</dd></div></dl></article>
      <article><h3>PWA・保存</h3><dl><div><dt>Service Worker</dt><dd>{report.capabilities.serviceWorkerControlled?"制御中":report.capabilities.serviceWorker?"対応・未制御":"非対応"}</dd></div><div><dt>単独起動</dt><dd>{report.capabilities.standalone?"はい":"いいえ"}</dd></div><div><dt>使用量</dt><dd>{formatBytes(report.storage.usageBytes)}</dd></div><div><dt>利用可能枠</dt><dd>{formatBytes(report.storage.quotaBytes)}</dd></div></dl></article>
      <article><h3>描画</h3><dl><div><dt>WebGL 2</dt><dd>{report.graphics.webgl2?"対応":"非対応"}</dd></div><div><dt>renderer</dt><dd>{String(report.graphics.renderer??"取得不可")}</dd></div><div><dt>中央値</dt><dd>{report.frameSample.medianIntervalMs} ms</dd></div><div><dt>p95</dt><dd>{report.frameSample.p95IntervalMs} ms</dd></div></dl><small>約1秒の静止画面サンプルです。公開環境の性能測定や操作中のピーク値ではありません。</small></article>
    </div>}
    <div className="deviceRouteChecklist"><header><div><h3>実機で一周したルート</h3><small>確認済み {Object.values(walkthrough).filter(Boolean).length} / {walkthroughItems.length}</small></div><p>各画面を実際に操作した後でチェックしてください。チェックだけでは自動的にGate合格になりません。</p></header><div>{walkthroughItems.map(item=><label key={item.key}><input type="checkbox" checked={walkthrough[item.key]} onChange={event=>setWalkthrough(previous=>({...previous,[item.key]:event.target.checked}))}/><span><b>{item.label}</b><small>{item.detail}</small></span></label>)}</div><label className="deviceProblemNotes"><span>問題・再現手順（問題なしの場合は「問題なし」）</span><textarea value={problemNotes} onChange={event=>setProblemNotes(event.target.value)} placeholder="例: 水平断から脳表へ戻ると再読み込みされた" maxLength={2000}/></label></div>
    <p className="deviceGateDisclaimer">{disclaimer}</p>
  </div>;
}
