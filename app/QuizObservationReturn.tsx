import "./quiz-observation.css";

export function QuizObservationReturn({english,title,finished,onReturn}:{english:boolean;title:string;finished:boolean;onReturn:()=>void}){
  return <div className="quizObservationReturn" data-no-localize>
    <p><strong>{english?"Observe after answering":"解答後の観察"}</strong><span>{title}</span></p>
    <button type="button" onClick={onReturn}>{finished?(english?"Back to results":"結果へ戻る"):(english?"Back to answer and explanation":"回答・解説へ戻る")} <span aria-hidden="true">→</span></button>
  </div>;
}
