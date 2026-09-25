import {useEffect,useRef,useState} from 'react';
import './header-more-menu.css';

export type HeaderMoreAction='sources'|'legal'|'feedback'|'collaborate';
export function HeaderMoreMenu({english,onAction}:{english:boolean;onAction:(action:HeaderMoreAction)=>void}){
  const [open,setOpen]=useState(false);
  const root=useRef<HTMLDivElement>(null);
  const trigger=useRef<HTMLButtonElement>(null);
  useEffect(()=>{
    if(!open)return;
    const closeOutside=(event:PointerEvent)=>{if(event.target instanceof Node&&!root.current?.contains(event.target))setOpen(false)};
    document.addEventListener('pointerdown',closeOutside);
    return()=>document.removeEventListener('pointerdown',closeOutside);
  },[open]);
  const items:{key:HeaderMoreAction;label:string}[]=[
    {key:'sources',label:english?'Sources and references':'出典・参考文献'},
    {key:'legal',label:english?'Terms and credits':'利用条件・クレジット'},
    {key:'feedback',label:english?'Feedback / report an error':'意見・誤り報告'},
    ...(!english?[{key:'collaborate' as const,label:'共同制作'}]:[]),
  ];
  return <div ref={root} className="headerMoreMenu" data-no-localize onBlur={event=>{if(event.relatedTarget instanceof Node&&!event.currentTarget.contains(event.relatedTarget))setOpen(false)}} onKeyDown={event=>{
    if(event.key==='Escape'&&open&&!event.nativeEvent.isComposing){event.preventDefault();event.stopPropagation();setOpen(false);trigger.current?.focus()}
  }}>
    <button ref={trigger} type="button" className="headerMoreTrigger" aria-expanded={open} aria-controls="header-more-actions" onClick={()=>setOpen(value=>!value)}>{english?'Sources / more':'出典など'} <span aria-hidden="true">▾</span></button>
    {open&&<div id="header-more-actions" className="headerMoreActions" aria-label={english?'Sources and other pages':'出典とその他のページ'}>{items.map(item=><button key={item.key} type="button" onClick={()=>{
      setOpen(false);trigger.current?.focus({preventScroll:true});onAction(item.key);
    }}>{item.label}</button>)}</div>}
  </div>;
}
