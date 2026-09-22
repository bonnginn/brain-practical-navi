import {useRef,useState} from 'react';

export function ObservationLink({url,english,onOpen}:{url:string;english:boolean;onOpen?:()=>void}){
  const input=useRef<HTMLInputElement>(null);
  const [result,setResult]=useState<{url:string;copied:boolean}|null>(null);
  const [copying,setCopying]=useState(false);
  async function copy(){
    setCopying(true);setResult(null);
    try{
      if(!navigator.clipboard?.writeText)throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(url);
      setResult({url,copied:true});
    }catch{
      input.current?.focus();input.current?.select();
      setResult({url,copied:false});
    }finally{setCopying(false)}
  }
  const current=result?.url===url?result:null;
  return <details className="sectionObservationLink" data-no-localize onToggle={event=>{if(event.currentTarget.open)onOpen?.()}}>
    <summary>{english?'Link to this observation':'この観察のリンク'}</summary>
    <p>{english?'Reopen the same slice, selected structures and panel layout. Rotation and zoom are not included. No personal data is included.':'断面位置・選択構造・表示配分を再現するリンクです。回転と拡大率は含みません。個人情報は含まれません。'}</p>
    <div className="observationLinkActions"><input ref={input} aria-label={english?'Observation URL':'観察URL'} readOnly onFocus={event=>event.currentTarget.select()} value={url}/><button type="button" onClick={copy} disabled={!url||copying}>{copying?(english?'Copying…':'コピー中…'):(english?'Copy link':'リンクをコピー')}</button></div>
    <p role="status">{current?(current.copied?(english?'Link copied.':'リンクをコピーしました。'):(english?'Automatic copy was unavailable. The URL is selected; copy it with Ctrl+C, Command+C or your device’s Copy command.':'自動コピーを利用できませんでした。URLを選択したので、Ctrl+C・Command+C、または端末のコピー操作を使ってください。')):''}</p>
  </details>;
}
