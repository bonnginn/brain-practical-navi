import {useRef,useState,type ReactNode} from 'react';
import {sectionStudyThemes,type SectionStudyTheme} from '../src/sectionStudyThemes';
import './section-study.css';
import {segmentationPlaneNames,type SegmentationPlane} from './segmentationGeometry';

export function SectionStudyGuide({english,onObserve,children}:{english:boolean;onObserve:(theme:SectionStudyTheme)=>void;children:ReactNode}){
  const [open,setOpen]=useState(false);
  const summaryRef=useRef<HTMLElement|null>(null);
  const language=english?'en':'ja';
  return <details className="sectionStudyGuide" data-no-localize open={open} onToggle={event=>setOpen(event.currentTarget.open)}>
    <summary ref={summaryRef}>{english?'Observation themes and the foramen of Monro':'観察テーマ・モンロー孔ガイド'}</summary>
    <div className="sectionStudyContent">
      <p>{english?'Choose a starting view, then move through neighbouring sections. Each button replaces the current slice and selected structures; you can freely change them afterwards.':'テーマの開始断面から、隣接する断面へ進めて観察しましょう。ボタンを押すと断面位置と選択構造が切り替わります。その後は自由に変更できます。'}</p>
      <details className="sectionOrientationGuide"><summary>{english?'Read the orientation letters':'方位記号の読み方'}</summary><p>{english?'L/R = specimen left/right; A/P = anterior/posterior; S/I = superior/inferior. These letters refer to the brain, not to your own left and right. The section views use the orientations below; in 3D the letters move as you rotate.':'L/R＝標本の左/右、A/P＝前/後、S/I＝上/下です。自分の左右ではなく、脳そのものの方位を表します。断面の表示方向は下表のとおりです。3Dでは回転に合わせて方位記号も動きます。'}</p><table><thead><tr><th>{english?'Section':'断面'}</th><th>{english?'Screen left → right':'画面左 → 右'}</th><th>{english?'Screen top → bottom':'画面上 → 下'}</th></tr></thead><tbody>{(['coronal','horizontal','sagittal'] as SegmentationPlane[]).map(plane=>{const axis=segmentationPlaneNames[plane];return <tr key={plane}><th>{english?{coronal:'Coronal',horizontal:'Horizontal',sagittal:'Sagittal'}[plane]:axis.label}</th><td>{axis.left} → {axis.right}</td><td>{axis.top} → {axis.bottom}</td></tr>})}</tbody></table></details>
      <div className="sectionStudyThemes">{sectionStudyThemes.map(theme=>{const copy=theme[language];return <article key={theme.key}>
        <h3>{copy.name}</h3><p>{copy.goal}</p><ol>{copy.steps.map(step=><li key={step}>{step}</li>)}</ol>
        <p className="sectionStudyCheck"><b>{english?'Check yourself':'確認してみよう'}</b>{copy.check}</p>
        <button type="button" onClick={()=>{setOpen(false);summaryRef.current?.focus({preventScroll:true});onObserve(theme)}}>{english?'Open starting section':'開始断面を開く'}<span className="srOnly"> — {copy.name}</span></button>
      </article>})}</div>
      {children}
    </div>
  </details>;
}
