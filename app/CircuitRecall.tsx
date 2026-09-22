import {circuitRecall} from '../src/circuitRecall';

export function CircuitRecall({circuitKey,english,onRevisit}:{circuitKey:string;english:boolean;onRevisit:(path:string,node:string)=>void}){
  const checks=circuitRecall[circuitKey];
  if(!checks)return null;
  const language=english?'en':'ja';
  return <section className="circuitRecall" data-no-localize aria-label={english?'Explain the circuit in your own words':'自分の言葉で回路を説明'}>
    <h4>{english?'Can you explain the connections?':'つながりを説明できますか？'}</h4>
    <p>{english?'Think of your answer before opening the explanation. These prompts are for self-review and are not scored.':'まず自分で答えを考え、問いを開いて解説と比べましょう。得点の付かない確認です。'}</p>
    {checks.map((check,index)=><details key={check.key}>
      <summary><span aria-hidden="true">{index+1}. </span>{check.question[language]}</summary>
      <p>{check.answer[language]}</p>
      <button type="button" onClick={()=>onRevisit(check.path,check.node)}>{english?'Revisit this connection':'このつながりを見直す'}</button>
    </details>)}
  </section>;
}
