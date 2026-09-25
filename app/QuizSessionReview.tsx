import "./quiz-session-review.css";
import {QuizSources,type QuizReference} from "./QuizSources";
type ReviewRow={number:number;name:string;prompt:string;selected:string;correct:string;explanation:string[];sources:QuizReference[]};

export function QuizSessionReview({rows,english,onObserve,onRetry}:{rows:ReviewRow[];english:boolean;onObserve:(index:number)=>void;onRetry:()=>void}){
  if(!rows.length)return null;
  return <section className="quizSessionReview" aria-label={english?"Review missed questions":"今回間違えた問題の見直し"}>
    <h3>{english?"Review what you missed":"間違えた問題を見直す"}</h3>
    <p>{english?"Open a question to compare your answer with the explanation, or return to the specimen.":"問題を開いて答えと解説を見比べるか、観察画面で位置を確かめます。"}</p>
    {rows.map((row,index)=><details key={row.number}>
      <summary><span>{english?`Question ${row.number}`:`問題 ${row.number}`}</span><b>{row.name}</b></summary>
      <div className="quizSessionReviewBody"><p className="quizSessionPrompt">{row.prompt}</p>
        <dl><div><dt>{english?"Your answer":"あなたの選択"}</dt><dd>{row.selected}</dd></div><div><dt>{english?"Correct answer":"正答"}</dt><dd>{row.correct}</dd></div></dl>
        {row.explanation.map((paragraph,index)=><p key={index}>{paragraph}</p>)}<QuizSources sources={row.sources} english={english}/><button type="button" onClick={()=>onObserve(index)}>{english?"Check the location in the observation view":"観察画面で位置を確認"} →</button>
      </div>
    </details>)}
    <button type="button" className="quizRetryMissed" onClick={onRetry}>{english?(rows.length===1?"Retry this question":`Retry these ${rows.length} questions`):`今回間違えた${rows.length}問を再挑戦`}</button>
  </section>;
}
