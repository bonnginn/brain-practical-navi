import "./quiz-session-review.css";
import {QuizSources,type QuizReference} from "./QuizSources";
type ReviewRow={number:number;name:string;prompt:string;selected:string;correct:string;explanation:string[];correctNotes:string[];selectedNotes:string[];sources:QuizReference[]};

export function QuizSessionReview({rows,english,onObserve,onRetry,openNumber}:{rows:ReviewRow[];english:boolean;openNumber?:number|null;onObserve:(index:number)=>void;onRetry:()=>void}){
  if(!rows.length)return null;
  return <section className="quizSessionReview" aria-label={english?"Review missed questions":"今回間違えた問題の見直し"}>
    <h3>{english?"Review what you missed":"間違えた問題を見直す"}</h3>
    {rows.map((row,index)=><details key={row.number} open={row.number===openNumber}>
      <summary data-review-question-number={row.number}><span>{english?`Question ${row.number}`:`問題 ${row.number}`}</span><b>{row.name}</b></summary>
      <div className="quizSessionReviewBody"><p className="quizSessionPrompt">{row.prompt}</p>
        <dl><div><dt>{english?"Your answer":"あなたの選択"}</dt><dd>{row.selected}{row.selectedNotes.map((note,index)=><p key={index}>{note}</p>)}</dd></div><div><dt>{english?"Correct answer":"正答"}</dt><dd>{row.correct}{row.correctNotes.map((note,index)=><p key={index}>{note}</p>)}</dd></div></dl>
        {row.explanation.map((paragraph,index)=><p key={index}>{paragraph}</p>)}<QuizSources sources={row.sources} english={english}/><button type="button" onClick={()=>onObserve(index)}>{english?"Check the location in the observation view":"観察画面で位置を確認"} →</button>
      </div>
    </details>)}
    <button type="button" className="quizRetryMissed" onClick={onRetry}>{english?(rows.length===1?"Retry this question":`Retry these ${rows.length} questions`):`今回間違えた${rows.length}問を再挑戦`}</button>
  </section>;
}
