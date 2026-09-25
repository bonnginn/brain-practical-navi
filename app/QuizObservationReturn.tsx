import "./quiz-observation.css";

export function QuizObservationReturn({english,title,finished,answered=true,onReturn}:{english:boolean;title:string;finished:boolean;answered?:boolean;onReturn:()=>void}){
  return <div className="quizObservationReturn" data-no-localize>
    <p><strong>{english?"Observation during review":"復習中の観察"}</strong><span>{title}</span></p>
    <button type="button" onClick={onReturn}>{finished?(english?"Back to results":"結果へ戻る"):answered?(english?"Back to answer and explanation":"回答・解説へ戻る"):(english?"Back to the question":"問題へ戻る")} <span aria-hidden="true">→</span></button>
  </div>;
}
