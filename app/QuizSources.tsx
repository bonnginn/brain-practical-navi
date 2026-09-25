export type QuizReference={label:string;url:string};

export function QuizSources({sources,english}:{sources:QuizReference[];english:boolean}){
  if(!sources.length)return null;
  return <details className="quizSources"><summary>{english?"Further reading":"参考資料"}</summary><ul>{sources.map(source=><li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.label}</a></li>)}</ul></details>;
}
