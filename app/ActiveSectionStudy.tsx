import type {SectionStudyTheme} from '../src/sectionStudyThemes';

export function ActiveSectionStudy({theme,english,questionCount,onRestart,onReview,onClose}:{theme:SectionStudyTheme;english:boolean;questionCount:number;onRestart:()=>void;onReview:()=>void;onClose:()=>void}){
  const copy=theme[english?'en':'ja'];
  return <section className="activeSectionStudy" data-no-localize aria-label={english?'Current observation theme':'観察中のテーマ'}>
    <details key={theme.key}><summary><span>{english?'Observation theme':'観察テーマ'}</span> {copy.name}</summary>
      <p>{copy.goal}</p><ol>{copy.steps.map(step=><li key={step}>{step}</li>)}</ol>
      <p className="sectionStudyCheck"><b>{english?'Check yourself':'確認してみよう'}</b>{copy.check}</p>
      <div className="activeStudyActions"><button type="button" onClick={onRestart}>{english?'Reset to starting section':'開始断面・構造に戻す'}</button>{questionCount>0&&<button type="button" onClick={onReview}>{english?`Review this theme (${questionCount} questions)`:`このテーマを復習（${questionCount}問）`}</button>}<button type="button" onClick={onClose}>{english?'End theme guide':'テーマ案内を終了'}</button></div>
    </details>
  </section>;
}
