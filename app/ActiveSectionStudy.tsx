import {CsfRouteLesson} from './CsfRouteLesson';
import type {SectionStudyTheme} from '../src/sectionStudyThemes';

export function ActiveSectionStudy({theme,english,onRestart,onClose,structures,selected,onSelect,onView}:{theme:SectionStudyTheme;english:boolean;onRestart:()=>void;onClose:()=>void;structures:{key:string;name:string}[];selected:string;onSelect:(key:string)=>void;onView:()=>void}){
  const copy=theme[english?'en':'ja'];
  return <section className="activeSectionStudy" data-no-localize aria-label={english?'Current observation theme':'観察中のテーマ'}>
    <h3><span>{english?'Observation theme':'観察テーマ'}</span> {copy.name}</h3>
    <p className="activeStudyGoal">{copy.goal}</p>
    <div className="activeStudyStructures"><span>{english?'Choose a structure to read its explanation; your slice and colours stay unchanged.':'説明を読む構造を選べます。断面位置と着色は保ちます。'}</span><div>{structures.map(item=><button type="button" key={item.key} data-theme-structure={item.key} aria-pressed={selected===item.key} onClick={()=>onSelect(item.key)}>{item.name}</button>)}</div></div>
    <details key={theme.key}><summary>{english?'Observation steps and self-check':'観察の手順と確認の問い'}</summary>
      {theme.key==='csf-route'&&<CsfRouteLesson english={english}/>}
      <ol>{copy.steps.map(step=><li key={step}>{step}</li>)}</ol>
      <p className="sectionStudyCheck"><b>{english?'Check yourself':'確認してみよう'}</b>{copy.check}</p>
    </details>
    <div className="activeStudyActions"><button type="button" onClick={onView}>{english?'Return to current slice':'今の断面に戻る'}</button><button type="button" onClick={onRestart}>{english?'Reset to starting section':'開始断面・構造に戻す'}</button><button type="button" onClick={onClose}>{english?'End theme guide':'テーマ案内を終了'}</button></div>
  </section>;
}
