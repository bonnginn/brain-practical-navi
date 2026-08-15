import { useEffect, useState } from "react";
import { getPwaInstallPrompt, isPwaStandalone, promptPwaInstall, subscribePwaInstallPrompt } from "../src/pwa";

type OfflinePack={id:string;name:string;description:string;version:string;bytes:number;urls:string[]};
type OfflineCatalog={format:string;version:string;packs:OfflinePack[]};
type PackState="checking"|"missing"|"partial"|"stale"|"saved"|"working"|"error";
const PACK_CACHE="brain-practical-offline-packs";
const formatMiB=(bytes:number)=>`${(bytes/1048576).toFixed(1)} MiB`;
const markerPath=(pack:OfflinePack)=>`offline-pack-state/${pack.id}.json`;

export function OfflineManager(){
  const [catalog,setCatalog]=useState<OfflineCatalog|null>(null);
  const [states,setStates]=useState<Record<string,PackState>>({});
  const [progress,setProgress]=useState<Record<string,number>>({});
  const [message,setMessage]=useState("");
  const [usage,setUsage]=useState<{usage?:number;quota?:number}>({});
  const [online,setOnline]=useState(()=>navigator.onLine);
  const [persistent,setPersistent]=useState<boolean|null>(null);
  const [standalone,setStandalone]=useState(()=>isPwaStandalone());
  const [installAvailable,setInstallAvailable]=useState(()=>Boolean(getPwaInstallPrompt()));
  const supported="serviceWorker" in navigator&&"caches" in window;

  async function refresh(nextCatalog=catalog){
    if(!nextCatalog||!supported)return;
    const cache=await caches.open(PACK_CACHE),next:Record<string,PackState>={};
    for(const pack of nextCatalog.packs){
      let count=0;
      for(const path of pack.urls)if(await cache.match(new URL(path,document.baseURI)))count++;
      const marker=await cache.match(new URL(markerPath(pack),document.baseURI));
      const markerVersion=marker?.headers.get("X-Brain-Practical-Pack-Version");
      const markerCompleteValue=marker?.headers.get("X-Brain-Practical-Pack-Complete");
      const markerComplete=markerCompleteValue==="true";
      if(count===pack.urls.length){
        next[pack.id]=markerComplete&&markerVersion===pack.version?"saved":markerComplete||!marker||markerCompleteValue===null?"stale":"partial";
      }else next[pack.id]=count&&marker?"partial":"missing";
    }
    setStates(next);
    if(navigator.storage?.estimate)try{setUsage(await navigator.storage.estimate())}catch{setUsage({})}
    if(navigator.storage?.persisted)try{setPersistent(await navigator.storage.persisted())}catch{setPersistent(null)}
  }

  async function removeFromRuntime(url:URL){
    const names=await caches.keys();
    await Promise.all(names.filter(name=>name.startsWith("brain-practical-runtime-")).map(async name=>(await caches.open(name)).delete(url)));
  }

  useEffect(()=>{
    if(!supported)return;
    let alive=true;
    const loadCatalog=()=>fetch(new URL("offline-packs.json",document.baseURI),{cache:"no-store"}).then(response=>{
        if(!response.ok)throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<OfflineCatalog>;
      }).then(data=>{
        if(data.format!=="brain-practical-offline-packs"||!data.packs.every(pack=>/^[0-9a-f]{12}$/.test(pack.version)))throw new Error("invalid offline catalog");
        if(alive){setCatalog(data);void refresh(data)}
      }).catch(()=>alive&&setMessage("教材一覧を読み込めませんでした。オンラインで再度開いてください。"));
    void loadCatalog();
    navigator.serviceWorker.addEventListener("controllerchange",loadCatalog);
    return()=>{alive=false;navigator.serviceWorker.removeEventListener("controllerchange",loadCatalog)};
  },[supported]);

  useEffect(()=>{
    const syncConnection=()=>setOnline(navigator.onLine);
    const syncInstall=()=>{setInstallAvailable(Boolean(getPwaInstallPrompt()));setStandalone(isPwaStandalone())};
    window.addEventListener("online",syncConnection);window.addEventListener("offline",syncConnection);
    const unsubscribe=subscribePwaInstallPrompt(syncInstall);
    return()=>{window.removeEventListener("online",syncConnection);window.removeEventListener("offline",syncConnection);unsubscribe()};
  },[]);

  async function save(pack:OfflinePack){
    setStates(previous=>({...previous,[pack.id]:"working"}));setProgress(previous=>({...previous,[pack.id]:0}));setMessage("");
    try{
      const cache=await caches.open(PACK_CACHE);
      await cache.put(new URL(markerPath(pack),document.baseURI),new Response(JSON.stringify({format:"brain-practical-offline-pack-state",id:pack.id,version:pack.version,complete:false}),{headers:{"Content-Type":"application/json","X-Brain-Practical-Pack-Version":pack.version,"X-Brain-Practical-Pack-Complete":"false"}}));
      for(let index=0;index<pack.urls.length;index++){
        const url=new URL(pack.urls[index],document.baseURI);
        const response=await fetch(url,{cache:"reload"});
        if(!response.ok)throw new Error(`${pack.urls[index]}: HTTP ${response.status}`);
        await cache.put(url,response);await removeFromRuntime(url);
        setProgress(previous=>({...previous,[pack.id]:Math.round((index+1)/pack.urls.length*100)}));
      }
      await cache.put(new URL(markerPath(pack),document.baseURI),new Response(JSON.stringify({format:"brain-practical-offline-pack-state",id:pack.id,version:pack.version,complete:true}),{headers:{"Content-Type":"application/json","X-Brain-Practical-Pack-Version":pack.version,"X-Brain-Practical-Pack-Complete":"true"}}));
      setStates(previous=>({...previous,[pack.id]:"saved"}));setMessage(`${pack.name}を端末へ保存しました。`);
      if(navigator.storage?.persist)try{setPersistent(await navigator.storage.persist())}catch{setPersistent(null)}
      await refresh();
    }catch(error){setStates(previous=>({...previous,[pack.id]:"error"}));setMessage(`保存できませんでした。空き容量と通信状態を確認してください（${error instanceof Error?error.message:"不明なエラー"}）。`)}
  }
  async function remove(pack:OfflinePack){
    const cache=await caches.open(PACK_CACHE);
    const protectedPaths=new Set<string>();
    for(const other of catalog?.packs??[]){
      if(other.id===pack.id)continue;
      let otherComplete=true;
      for(const path of other.urls)if(!await cache.match(new URL(path,document.baseURI))){otherComplete=false;break}
      if(otherComplete)for(const path of other.urls)protectedPaths.add(path);
    }
    await cache.delete(new URL(markerPath(pack),document.baseURI));
    await Promise.all(pack.urls.filter(path=>!protectedPaths.has(path)).map(async path=>{const url=new URL(path,document.baseURI);await cache.delete(url);await removeFromRuntime(url)}));
    setStates(previous=>({...previous,[pack.id]:"missing"}));setProgress(previous=>({...previous,[pack.id]:0}));setMessage(`${pack.name}の端末保存を削除しました。`);await refresh();
  }
  async function install(){
    try{
      const outcome=await promptPwaInstall();
      setInstallAvailable(Boolean(getPwaInstallPrompt()));setStandalone(isPwaStandalone());
      setMessage(outcome==="accepted"?"インストールを開始しました。":outcome==="dismissed"?"インストールはキャンセルされました。":"ブラウザのメニューから「ホーム画面に追加」を選んでください。");
    }catch{setInstallAvailable(false);setMessage("インストール画面を開けませんでした。ブラウザのメニューから「ホーム画面に追加」を選んでください。")}
  }
  const used=usage.usage??0,quota=usage.quota??0,busy=Object.values(states).includes("working");
  return <div className="offlineManager">
    <div className="offlineSummary"><div><b>{supported?"PWA・オフライン教材":"このブラウザでは未対応"}</b><span>一度オンラインでアプリを開くと、画面本体と閲覧済み教材を再利用できます。</span><div className="offlineStatus" aria-label="PWAの状態"><span className={online?"online":"offline"}>{online?"オンライン":"オフライン"}</span><span>{persistent===true?"永続保存が許可済み":persistent===false?"容量確保時に退避あり":"保存領域を確認中"}</span><span>{standalone?"インストール済み":"ブラウザで表示中"}</span></div></div>{quota>0&&<small>このサイトの使用量 {formatMiB(used)} / 利用可能枠 {formatMiB(quota)}</small>}</div>
    {!standalone&&<div className="offlineInstall"><div><b>ホーム画面から開く</b><span>{installAvailable?"このブラウザから脳実習ナビをインストールできます。":"Safariでは共有メニュー、その他のブラウザではメニューの「ホーム画面に追加」を使用します。"}</span></div>{installAvailable&&<button className="primary" onClick={()=>void install()}>インストール</button>}</div>}
    <p className="offlineNotice">大容量通信を避けるため教材全体は自動取得しません。Wi-Fi接続中に必要なセットを保存してください。端末やブラウザが容量確保のためキャッシュを削除する場合があります。</p>
    {!supported?<p role="alert">HTTPSまたはlocalhostで、Service WorkerとCache Storageに対応したブラウザを使用してください。</p>:!catalog?<p role="status">教材セットを確認中…</p>:<div className="offlinePacks">{catalog.packs.map(pack=>{const state=states[pack.id]??"checking",working=state==="working";return <article key={pack.id}><div><h3>{pack.name}</h3><b>{formatMiB(pack.bytes)}</b></div><p>{pack.description}</p><div className="offlinePackActions"><span className={`offlineState ${state}`}>{working?`保存中 ${progress[pack.id]??0}%`:state==="saved"?"端末に保存済み":state==="stale"?"更新が必要":state==="partial"?"一部保存済み":state==="error"?"保存エラー":"未保存"}</span><button className="primary" disabled={busy||!online} onClick={()=>void save(pack)}>{state==="saved"?"再確認・更新":"端末へ保存"}</button><button disabled={busy||state==="missing"} onClick={()=>void remove(pack)}>削除</button></div>{working&&<progress max="100" value={progress[pack.id]??0} aria-label={`${pack.name}の保存進捗`}/>}</article>})}</div>}
    {message&&<p className="offlineMessage" role="status">{message}</p>}
    <p className="offlineFootnote">クイズは保存済みの脳表・断面教材を使います。初回保存後は機内モード等でも主要な観察・クイズを利用できます。共同制作フォーム、GitHub、更新取得には通信が必要です。</p>
  </div>;
}
