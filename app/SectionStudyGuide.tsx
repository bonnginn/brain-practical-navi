import {useRef,useState,type ReactNode} from 'react';
import {sectionStudyThemes,type SectionStudyTheme} from '../src/sectionStudyThemes';
import './section-study.css';

export function SectionStudyGuide({english,onObserve,children}:{english:boolean;onObserve:(theme:SectionStudyTheme)=>void;children:ReactNode}){
  const [open,setOpen]=useState(false);
  const summaryRef=useRef<HTMLElement|null>(null);
  const language=english?'en':'ja';
  return <details className="sectionStudyGuide" data-no-localize open={open} onToggle={event=>setOpen(event.currentTarget.open)}>
    <summary ref={summaryRef}>{english?'Observation themes and the foramen of Monro':'観察テーマ・モンロー孔ガイド'}</summary>
    <div className="sectionStudyContent">
      <p>{english?'Choose a starting view, then move through neighbouring sections. Each button replaces the current slice and selected structures; you can freely change them afterwards.':'テーマの開始断面から、隣接する断面へ進めて観察しましょう。ボタンを押すと断面位置と選択構造が切り替わります。その後は自由に変更できます。'}</p>
      <div className="sectionStudyThemes">{sectionStudyThemes.map(theme=>{const copy=theme[language];return <article key={theme.key}>
        <h3>{copy.name}</h3><p>{copy.goal}</p><ol>{copy.steps.map(step=><li key={step}>{step}</li>)}</ol>
        <p className="sectionStudyCheck"><b>{english?'Check yourself':'確認してみよう'}</b>{copy.check}</p>
        <button type="button" onClick={()=>{setOpen(false);summaryRef.current?.focus({preventScroll:true});onObserve(theme)}}>{english?'Open starting section':'開始断面を開く'}<span className="srOnly"> — {copy.name}</span></button>
      </article>})}</div>
      {children}
    </div>
  </details>;
}
