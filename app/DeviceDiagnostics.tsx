import { useEffect, useState } from "react";
import { offlineResourceResponseError } from "./offlineCapacity";
import { deviceEvidenceRouteHash, getDevicePerformanceSession, recordDevicePerformanceObservation, removeDevicePerformanceObservation, resetDevicePerformanceSession, startDevicePerformanceSession, type DevicePerformanceSession, type DeviceRouteKey } from "./devicePerformance";
import { appBuildInfo, currentAppBaseUrl, validBuildCommit, type AppBuildInfo } from "./buildInfo";

type PackEvidence={id:string;name:string;version:string;expectedResources:number;cachedResources:number;markerVersion:string|null;markerComplete:boolean;current:boolean};
type PwaCheckpoint={kind:"online"|"offline"|"restored";recordedAt:string;online:boolean;standalone:boolean;serviceWorkerControlled:boolean;catalogVersion:string|null;packs:PackEvidence[]};
type PwaEvidence={online:PwaCheckpoint|null;offline:PwaCheckpoint|null;restored:PwaCheckpoint|null};
type OfflineCatalog={format:string;version:string;packs:{id:string;name:string;version:string;resources:{url:string;bytes:number}[]}[]};
type WalkthroughState={confirmed:boolean;recordedAt:string|null};

type DiagnosticReport={
  format:"brain-practical-device-check";
  schemaVersion:5;
  application:AppBuildInfo&{runtimeBaseUrl:string};
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
  performanceSession:DevicePerformanceSession|null;
  problemNotes:string;
  gateDisclaimer:string;
};

type WalkthroughKey=Exclude<DeviceRouteKey,"segment">;
const walkthroughItems:{key:WalkthroughKey;label:string;detail:string}[]=[
  {key:"home",label:"ホーム",detail:"初期表示、教材入口、注意表示"},
  {key:"surface",label:"脳表",detail:"回転、拡大、構造選択、全解除"},
  {key:"sections",label:"断面",detail:"位置変更、構造選択、2D/3D切替"},
  {key:"blocks",label:"局所標本",detail:"組織表示、着脱、比較"},
  {key:"quiz",label:"クイズ",detail:"回答、断面移動、観察画面で復習"},
  {key:"offlineSurface",label:"機内モード・脳表",detail:"完全再読込、回転、構造選択"},
  {key:"offlineSections",label:"機内モード・断面",detail:"完全再読込、断面移動、構造選択"},
  {key:"offlineBlocks",label:"機内モード・局所標本",detail:"完全再読込、組織表示、着脱"},
  {key:"offlineQuiz",label:"機内モード・クイズ",detail:"完全再読込、回答、正誤表示"},
];
const walkthroughRoutePatterns:Record<WalkthroughKey,{pattern:RegExp;expected:string}>={
  home:{pattern:/^#workspace\/home$/,expected:"ホーム"},
  surface:{pattern:/^#workspace\/surface\/[a-z-]+$/,expected:"脳表"},
  sections:{pattern:/^#workspace\/sections\/[a-z-]+$/,expected:"断面"},
  blocks:{pattern:/^#workspace\/blocks\/[a-z-]+$/,expected:"局所標本"},
  quiz:{pattern:/^#workspace\/quiz$/,expected:"クイズ"},
  offlineSurface:{pattern:/^#workspace\/surface\/[a-z-]+$/,expected:"機内モードの脳表"},
  offlineSections:{pattern:/^#workspace\/sections\/[a-z-]+$/,expected:"機内モードの断面"},
  offlineBlocks:{pattern:/^#workspace\/blocks\/[a-z-]+$/,expected:"機内モードの局所標本"},
  offlineQuiz:{pattern:/^#workspace\/quiz$/,expected:"機内モードのクイズ"},
};
const initialWalkthrough=()=>Object.fromEntries(walkthroughItems.map(item=>[item.key,{confirmed:false,recordedAt:null}])) as Record<WalkthroughKey,WalkthroughState>;
const initialPwaEvidence=():PwaEvidence=>({online:null,offline:null,restored:null});
const DRAFT_KEY="brain-practical-device-check-draft-v5",LEGACY_DRAFT_KEY="brain-practical-device-check-draft-v4";
type DiagnosticDraft={schemaVersion:5;application:AppBuildInfo;deviceLabel:string;report:DiagnosticReport|null;touch:DiagnosticReport["touch"];walkthrough:Record<WalkthroughKey,WalkthroughState>;pwaEvidence:PwaEvidence;performanceSession:DevicePerformanceSession|null;problemNotes:string};
function loadDraft():DiagnosticDraft|null{try{if(typeof localStorage==="undefined")return null;const value=JSON.parse(localStorage.getItem(DRAFT_KEY)??"null");if(value?.schemaVersion!==5||value?.application?.commit!==appBuildInfo.commit||value?.application?.dirty!==appBuildInfo.dirty||value?.application?.basePath!==appBuildInfo.basePath||!walkthroughItems.every(item=>typeof value.walkthrough?.[item.key]?.confirmed==="boolean")||walkthroughItems.some(item=>value.walkthrough[item.key].confirmed)&&value.performanceSession?.coldStart?.key!=="coldHome")return null;return value}catch{return null}}

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
  const [performanceSession,setPerformanceSession]=useState<DevicePerformanceSession|null>(getDevicePerformanceSession);
  const [problemNotes,setProblemNotes]=useState(initialDraft?.problemNotes??"");
  const [message,setMessage]=useState("");

  useEffect(()=>{try{localStorage.setItem(DRAFT_KEY,JSON.stringify({schemaVersion:5,application:appBuildInfo,deviceLabel,report,touch,walkthrough,pwaEvidence,performanceSession,problemNotes} satisfies DiagnosticDraft))}catch{/* local draft is best effort */}},[deviceLabel,report,touch,walkthrough,pwaEvidence,performanceSession,problemNotes]);
  useEffect(()=>{const sync=(event:Event)=>setPerformanceSession((event as CustomEvent<DevicePerformanceSession|null>).detail);window.addEventListener("brain-practical-performance-change",sync);return()=>window.removeEventListener("brain-practical-performance-change",sync)},[]);

  function beginPerformanceSession(){
    if(performanceSession&&!window.confirm("経路チェックと性能記録を初期化して、最初から計測しますか？"))return;
    const next=startDevicePerformanceSession();
    if(next.coldStart.routeHash!=="#workspace/home"){resetDevicePerformanceSession();setPerformanceSession(null);setMessage("性能記録は公開候補HTTPSのホームを表示した直後に開始してください。");return}
    setPerformanceSession(next);setWalkthrough(initialWalkthrough());setReport(previous=>previous?{...previous,walkthrough:initialWalkthrough(),performanceSession:next}:previous);setMessage("性能記録を開始しました。各画面を操作してから診断画面へ戻り、対応する経路を確認してください。");
  }

  function confirmWalkthrough(key:WalkthroughKey,confirmed:boolean){
    const index=walkthroughItems.findIndex(item=>item.key===key),item=walkthroughItems[index];
    if(!confirmed){let next=getDevicePerformanceSession();const walkthroughNext={...walkthrough};for(const later of walkthroughItems.slice(index)){next=removeDevicePerformanceObservation(later.key);walkthroughNext[later.key]={confirmed:false,recordedAt:null}}setPerformanceSession(next);setWalkthrough(walkthroughNext);setReport(previous=>previous?{...previous,walkthrough:walkthroughNext,performanceSession:next}:previous);setMessage(index<walkthroughItems.length-1?`${item.label}以降の経路記録を解除しました。再確認は所定順で行ってください。`:`${item.label}の経路記録を解除しました。`);return}
    if(!performanceSession?.active){setMessage("先に「性能記録を開始」を選んでください。");return}
    const missingPrevious=walkthroughItems.slice(0,index).find(previous=>!walkthrough[previous.key].confirmed);
    if(missingPrevious){setMessage(`先に「${missingPrevious.label}」を操作して確認してください。経路記録は所定順で行います。`);return}
    const offline=key.startsWith("offline");
    if(offline&&navigator.onLine){setMessage("機内モードで対象画面を操作してからオフライン経路を確認してください。");return}
    if(!offline&&!navigator.onLine){setMessage("オンライン経路は通信を戻してから確認してください。");return}
    const routeHash=deviceEvidenceRouteHash(),routeRule=walkthroughRoutePatterns[key];
    if(!routeRule.pattern.test(routeHash)){setMessage(`「${item.label}」は${routeRule.expected}の画面を実際に操作してから確認してください。現在の直前画面: ${routeHash||"取得不可"}`);return}
    const recordedAt=new Date().toISOString(),observation=recordDevicePerformanceObservation(key,recordedAt);
    if(!observation){setMessage("性能記録が停止しています。最初から計測してください。");return}
    const next=getDevicePerformanceSession(),walkthroughNext={...walkthrough,[key]:{confirmed:true,recordedAt}};
    setPerformanceSession(next);setWalkthrough(walkthroughNext);setReport(previous=>previous?{...previous,walkthrough:walkthroughNext,performanceSession:next}:previous);setMessage(`${walkthroughItems.find(item=>item.key===key)?.label??key}の経路・取得量・表示状態${observation.peakJsHeapBytes===null?"":"・観測ピークheap"}を記録しました。`);
  }

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
    if(kind==="online"&&performanceSession?.active)performance.clearResourceTimings();
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
      format:"brain-practical-device-check",schemaVersion:5,application:{...appBuildInfo,runtimeBaseUrl:currentAppBaseUrl()},recordedAt:new Date().toISOString(),deviceLabel:deviceLabel.trim(),
      route:{pathname:location.pathname,hash:location.hash},
      environment:{userAgent:navigator.userAgent,platform:navigator.platform,language:navigator.language,online:navigator.onLine,viewport:{width:innerWidth,height:innerHeight},visualViewport:visual?{width:round(visual.width),height:round(visual.height),scale:visual.scale}:null,screen:{width:screen.width,height:screen.height,orientation:orientation?.type??null},devicePixelRatio,hardwareConcurrency:navigator.hardwareConcurrency??null,deviceMemory:(navigator as Navigator&{deviceMemory?:number}).deviceMemory??null,maxTouchPoints:navigator.maxTouchPoints},
      capabilities:{pointerCoarse:matchMedia("(pointer: coarse)").matches,pointerFine:matchMedia("(pointer: fine)").matches,hover:matchMedia("(hover: hover)").matches,standalone:matchMedia("(display-mode: standalone)").matches||Boolean((navigator as Navigator&{standalone?:boolean}).standalone),serviceWorker:"serviceWorker" in navigator,serviceWorkerControlled:Boolean(navigator.serviceWorker?.controller),cacheStorage:"caches" in window,network:connection?{effectiveType:connection.effectiveType??null,downlinkMbps:connection.downlink??null,rttMs:connection.rtt??null,saveData:connection.saveData??null}:null,performanceMemory:memory?{usedJSHeapBytes:memory.usedJSHeapSize,heapLimitBytes:memory.jsHeapSizeLimit}:null},
      storage:{usageBytes:estimate.usage??null,quotaBytes:estimate.quota??null,persisted},graphics:getGraphics(),safeArea:measureSafeArea(),frameSample,touch,walkthrough:{...walkthrough},pwaEvidence,performanceSession,problemNotes:problemNotes.trim(),gateDisclaimer:disclaimer
    };
    setReport(next);setRunning(false);setMessage("診断を記録しました。結果はこの端末内だけに表示されています。");
  }

  function confirmTouch(event:React.PointerEvent<HTMLButtonElement>){
    if(event.pointerType!=="touch"){setMessage("マウス／ペン入力はタッチ確認に数えません。実機で指で触れてください。");return}
    const next={confirmed:true,pointerType:event.pointerType,recordedAt:new Date().toISOString()};setTouch(next);setReport(previous=>previous?{...previous,touch:next}:previous);setMessage("指によるタッチ入力を記録しました。");
  }

  function download(){
    if(!report)return;const blob=new Blob([JSON.stringify({...report,deviceLabel:deviceLabel.trim(),touch,walkthrough:{...walkthrough},pwaEvidence,performanceSession,problemNotes:problemNotes.trim()},null,2)],{type:"application/json"});const url=URL.createObjectURL(blob),link=document.createElement("a");link.href=url;link.download=`brain-practical-device-check-${new Date().toISOString().replace(/[:.]/g,"-")}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setMessage("診断JSONを書き出しました。アプリから外部へ自動送信はしていません。");
  }

  function clearDraft(){
    try{localStorage.removeItem(DRAFT_KEY);localStorage.removeItem(LEGACY_DRAFT_KEY)}catch{/* nothing to clear */}
    resetDevicePerformanceSession();setDeviceLabel("");setReport(null);setTouch({confirmed:false,pointerType:null,recordedAt:null});setWalkthrough(initialWalkthrough());setPwaEvidence(initialPwaEvidence());setPerformanceSession(null);setProblemNotes("");setMessage("この端末の診断下書きと性能記録を初期状態へ戻しました。");
  }

  return <div className="deviceCheck">
    <div className="deviceCheckNotice"><b>端末内だけで診断・画面を移動して再開</b><p>氏名・メールアドレスは不要です。下書きはこのブラウザだけに保存され、結果は自動送信されません。「JSONを書き出す」を選んだ場合だけファイルになります。</p></div>
    <div className={`deviceBuildEvidence ${validBuildCommit(appBuildInfo.commit)&&!appBuildInfo.dirty&&currentAppBaseUrl()===appBuildInfo.publicBaseUrl?"formal":"local"}`}><div><b>対象ビルド</b><code>{validBuildCommit(appBuildInfo.commit)?appBuildInfo.commit:"unknown"}</code></div><span>{appBuildInfo.dirty?"未コミット変更を含む":currentAppBaseUrl()===appBuildInfo.publicBaseUrl?"公開候補・クリーン":"local・クリーン"}</span><small>正式証拠は、検証対象と40桁SHAが一致する公開GitHub Pagesのクリーンビルドだけです。</small></div>
    <label className="deviceCheckLabel"><span>端末メモ（任意）</span><input value={deviceLabel} onChange={event=>setDeviceLabel(event.target.value)} placeholder="例: iPhone 15 / Safari" maxLength={80}/></label>
    <div className="deviceCheckActions"><button className="primary" onClick={()=>void run()} disabled={running}>{running?"採取中…":"端末診断を開始"}</button><button onPointerDown={confirmTouch} className={touch.confirmed?"confirmed":""}>{touch.confirmed?"タッチ確認済み":"ここを指でタッチ"}</button><button onClick={download} disabled={!report}>JSONを書き出す</button><button onClick={clearDraft} disabled={running}>下書きを初期化</button></div>
    <p className={`deviceTouchState ${touch.confirmed?"confirmed":"pending"}`}><b>タッチ操作: {touch.confirmed?"確認済み":"未確認"}</b><span>{touch.confirmed?"touch pointer を記録しました。":"マウスやペンでは確認済みになりません。"}</span></p>
    {message&&<p className="deviceCheckMessage" role="status">{message}</p>}
    {report&&<div className="deviceCheckResults">
      <article><h3>画面・入力</h3><dl><div><dt>表示領域</dt><dd>{String((report.environment.viewport as {width:number;height:number}).width)} × {String((report.environment.viewport as {width:number;height:number}).height)} px</dd></div><div><dt>DPR</dt><dd>{String(report.environment.devicePixelRatio)}</dd></div><div><dt>safe area</dt><dd>{Object.values(report.safeArea).join(" / ")} px</dd></div><div><dt>coarse pointer</dt><dd>{report.capabilities.pointerCoarse?"はい":"いいえ"}</dd></div></dl></article>
      <article><h3>PWA・保存</h3><dl><div><dt>Service Worker</dt><dd>{report.capabilities.serviceWorkerControlled?"制御中":report.capabilities.serviceWorker?"対応・未制御":"非対応"}</dd></div><div><dt>単独起動</dt><dd>{report.capabilities.standalone?"はい":"いいえ"}</dd></div><div><dt>使用量</dt><dd>{formatBytes(report.storage.usageBytes)}</dd></div><div><dt>利用可能枠</dt><dd>{formatBytes(report.storage.quotaBytes)}</dd></div></dl></article>
      <article><h3>描画</h3><dl><div><dt>WebGL 2</dt><dd>{report.graphics.webgl2?"対応":"非対応"}</dd></div><div><dt>renderer</dt><dd>{String(report.graphics.renderer??"取得不可")}</dd></div><div><dt>中央値</dt><dd>{report.frameSample.medianIntervalMs} ms</dd></div><div><dt>p95</dt><dd>{report.frameSample.p95IntervalMs} ms</dd></div></dl><small>約1秒の静止画面サンプルです。公開環境の性能測定や操作中のピーク値ではありません。</small></article>
    </div>}
    <div className="devicePerformanceSession"><header><div><h3>主要経路の性能記録</h3><small>初回ホーム＋記録済み {Object.keys(performanceSession?.observations??{}).length} / {walkthroughItems.length}</small></div><button onClick={beginPerformanceSession} disabled={running}>{performanceSession?"最初から計測":"性能記録を開始"}</button></header><p>公開候補HTTPSのホームを初回表示した直後に開始すると、その読込を初回値として保存します。その後、各画面を操作してから対応する経路へチェックし、取得量、Canvas、横はみ出し、利用可能なブラウザでは操作中の最大JS heapを端末内に記録します。編集ツールはPC向けの共同制作機能のため、スマートフォンの必須経路には含めません。</p>{performanceSession&&<dl><div><dt>計測元</dt><dd>{performanceSession.origin}</dd></div><div><dt>初回ホーム</dt><dd>{formatBytes(performanceSession.coldStart.transferBytes)} / {performanceSession.coldStart.navigation?.durationMs??"取得不可"} ms</dd></div><div><dt>状態</dt><dd>{performanceSession.active?"計測中":performanceSession.stoppedAt?`${walkthroughItems.length}経路完了`:"停止"}</dd></div><div><dt>最大JS heap</dt><dd>{formatBytes(performanceSession.peakJsHeapBytes)}</dd></div></dl>}</div>
    <div className="devicePwaCheckpoints"><header><div><h3>PWAの3段階記録</h3><small>記録済み {Object.values(pwaEvidence).filter(Boolean).length} / 3</small></div><p>ホーム画面から単独起動し、3教材セットを保存してからオンラインを記録します。機内モードで主要4経路を確認してオフラインを記録し、通信を戻した後に復帰を記録してください。</p></header><div>{(["online","offline","restored"] as const).map(kind=>{const checkpoint=pwaEvidence[kind],label=kind==="online"?"保存後・オンライン":kind==="offline"?"機内モード起動":"再接続後";return <article key={kind} className={checkpoint?"recorded":""}><div><b>{label}</b><small>{checkpoint?new Date(checkpoint.recordedAt).toLocaleString():"未記録"}</small></div>{checkpoint&&<dl><div><dt>接続</dt><dd>{checkpoint.online?"オンライン":"オフライン"}</dd></div><div><dt>単独起動</dt><dd>{checkpoint.standalone?"はい":"いいえ"}</dd></div><div><dt>SW制御</dt><dd>{checkpoint.serviceWorkerControlled?"はい":"いいえ"}</dd></div><div><dt>教材</dt><dd>{checkpoint.packs.filter(pack=>pack.current).length} / {checkpoint.packs.length} 保存済み</dd></div></dl>}<button disabled={running} onClick={()=>void capturePwaCheckpoint(kind)}>{checkpoint?"再記録":"この状態を記録"}</button></article>})}</div></div>
    <div className="deviceRouteChecklist"><header><div><h3>実機で一周したルート</h3><small>確認済み {Object.values(walkthrough).filter(item=>item.confirmed).length} / {walkthroughItems.length}</small></div><p>上から所定順に、各画面を実際に操作した後でチェックしてください。別画面・順不同・接続状態違いは記録しません。確認時刻と性能値を端末内JSONへ保存します。</p><code>直前画面: {deviceEvidenceRouteHash()||"取得不可"}</code></header><div>{walkthroughItems.map((item,index)=>{const observation=performanceSession?.observations[item.key],waiting=!walkthrough[item.key].confirmed&&walkthroughItems.slice(0,index).some(previous=>!walkthrough[previous.key].confirmed);return <label key={item.key} className={waiting?"waiting":""}><input type="checkbox" checked={walkthrough[item.key].confirmed} disabled={waiting} onChange={event=>confirmWalkthrough(item.key,event.target.checked)}/><span><b>{item.label}</b><small>{item.detail}</small>{waiting&&<small>前の項目を先に確認</small>}{observation&&<small className="deviceRouteMetric">取得 {formatBytes(observation.transferBytes)} · Canvas {observation.canvasCount} · overflow {observation.horizontalOverflowPx}px</small>}</span></label>})}</div><label className="deviceProblemNotes"><span>問題・再現手順（問題なしの場合は「問題なし」）</span><textarea value={problemNotes} onChange={event=>setProblemNotes(event.target.value)} placeholder="例: 水平断から脳表へ戻ると再読み込みされた" maxLength={2000}/></label></div>
    <p className="deviceGateDisclaimer">{disclaimer}</p>
  </div>;
}
