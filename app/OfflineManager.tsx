import { useEffect, useState } from "react";

type OfflinePack={id:string;name:string;description:string;bytes:number;urls:string[]};
type OfflineCatalog={format:string;version:string;packs:OfflinePack[]};
type PackState="checking"|"missing"|"partial"|"saved"|"working"|"error";
const PACK_CACHE="brain-practical-offline-packs";
const formatMiB=(bytes:number)=>`${(bytes/1048576).toFixed(1)} MiB`;

export function OfflineManager(){
  const [catalog,setCatalog]=useState<OfflineCatalog|null>(null);
  const [states,setStates]=useState<Record<string,PackState>>({});
  const [progress,setProgress]=useState<Record<string,number>>({});
  const [message,setMessage]=useState("");
  const [usage,setUsage]=useState<{usage?:number;quota?:number}>({});
  const supported="serviceWorker" in navigator&&"caches" in window;

  async function refresh(nextCatalog=catalog){
    if(!nextCatalog||!supported)return;
    const cache=await caches.open(PACK_CACHE),next:Record<string,PackState>={};
    for(const pack of nextCatalog.packs){
      let count=0;
      for(const path of pack.urls)if(await cache.match(new URL(path,document.baseURI)))count++;
      next[pack.id]=count===pack.urls.length?"saved":count?"partial":"missing";
    }
    setStates(next);
    if(navigator.storage?.estimate)setUsage(await navigator.storage.estimate());
  }

  async function removeFromRuntime(url:URL){
    const names=await caches.keys();
    await Promise.all(names.filter(name=>name.startsWith("brain-practical-runtime-")).map(async name=>(await caches.open(name)).delete(url)));
  }

  useEffect(()=>{
    if(!supported)return;
    let alive=true;
    fetch(new URL("offline-packs.json",document.baseURI),{cache:"no-store"}).then(response=>{
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<OfflineCatalog>;
    }).then(data=>{if(alive){setCatalog(data);void refresh(data)}}).catch(()=>alive&&setMessage("教材一覧を読み込めませんでした。オンラインで再度開いてください。"));
    return()=>{alive=false};
  },[supported]);

  async function save(pack:OfflinePack){
    setStates(previous=>({...previous,[pack.id]:"working"}));setProgress(previous=>({...previous,[pack.id]:0}));setMessage("");
    try{
      const cache=await caches.open(PACK_CACHE);
      for(let index=0;index<pack.urls.length;index++){
        const url=new URL(pack.urls[index],document.baseURI);
        const response=await fetch(url,{cache:"reload"});
        if(!response.ok)throw new Error(`${pack.urls[index]}: HTTP ${response.status}`);
        await cache.put(url,response);await removeFromRuntime(url);
        setProgress(previous=>({...previous,[pack.id]:Math.round((index+1)/pack.urls.length*100)}));
      }
      setStates(previous=>({...previous,[pack.id]:"saved"}));setMessage(`${pack.name}を端末へ保存しました。`);
      if(navigator.storage?.persist)void navigator.storage.persist();
      await refresh();
    }catch(error){setStates(previous=>({...previous,[pack.id]:"error"}));setMessage(`保存できませんでした。空き容量と通信状態を確認してください（${error instanceof Error?error.message:"不明なエラー"}）。`)}
  }
  async function remove(pack:OfflinePack){
    const cache=await caches.open(PACK_CACHE);
    await Promise.all(pack.urls.map(async path=>{const url=new URL(path,document.baseURI);await cache.delete(url);await removeFromRuntime(url)}));
    setStates(previous=>({...previous,[pack.id]:"missing"}));setProgress(previous=>({...previous,[pack.id]:0}));setMessage(`${pack.name}の端末保存を削除しました。`);await refresh();
  }
  const used=usage.usage??0,quota=usage.quota??0;
  return <div className="offlineManager">
    <div className="offlineSummary"><div><b>{supported?"PWA・オフライン教材":"このブラウザでは未対応"}</b><span>一度オンラインでアプリを開くと、画面本体と閲覧済み教材を再利用できます。</span></div>{quota>0&&<small>このサイトの使用量 {formatMiB(used)} / 利用可能枠 {formatMiB(quota)}</small>}</div>
    <p className="offlineNotice">大容量通信を避けるため教材全体は自動取得しません。Wi-Fi接続中に必要なセットを保存してください。端末やブラウザが容量確保のためキャッシュを削除する場合があります。</p>
    {!supported?<p role="alert">HTTPSまたはlocalhostで、Service WorkerとCache Storageに対応したブラウザを使用してください。</p>:!catalog?<p role="status">教材セットを確認中…</p>:<div className="offlinePacks">{catalog.packs.map(pack=>{const state=states[pack.id]??"checking",working=state==="working";return <article key={pack.id}><div><h3>{pack.name}</h3><b>{formatMiB(pack.bytes)}</b></div><p>{pack.description}</p><div className="offlinePackActions"><span className={`offlineState ${state}`}>{working?`保存中 ${progress[pack.id]??0}%`:state==="saved"?"端末に保存済み":state==="partial"?"一部保存済み":state==="error"?"保存エラー":"未保存"}</span><button className="primary" disabled={working} onClick={()=>void save(pack)}>{state==="saved"?"更新":"端末へ保存"}</button><button disabled={working||state==="missing"} onClick={()=>void remove(pack)}>削除</button></div>{working&&<progress max="100" value={progress[pack.id]??0} aria-label={`${pack.name}の保存進捗`}/>}</article>})}</div>}
    {message&&<p className="offlineMessage" role="status">{message}</p>}
    <p className="offlineFootnote">クイズは保存済みの脳表・断面教材を使います。初回保存後は機内モード等でも主要な観察・クイズを利用できます。共同制作フォーム、GitHub、更新取得には通信が必要です。</p>
  </div>;
}
