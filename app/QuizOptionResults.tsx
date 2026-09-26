import {useEffect,useMemo,useState} from 'react';
import {questionMetric,readQuizStatistics,statisticsEndpoint,type MetricQuestion,type QuizOptionCount} from '../src/quizStatistics.mjs';
import './quiz-option-results.css';

type Question=MetricQuestion;
type Props={questions:Question[];currentQuestion?:Question;english:boolean;refresh?:number;labelFor:(question:Question,key:string)=>string};
type Row={question:Question;revision:string;counts:number[];total:number};

export default function QuizOptionResults({questions,currentQuestion,english,refresh=0,labelFor}:Props){
  const [rows,setRows]=useState<Row[]|null>(null);
  const [failed,setFailed]=useState(false);
  const [search,setSearch]=useState('');
  const endpoint=statisticsEndpoint(import.meta.env.VITE_QUIZ_STATISTICS_URL??'');
  const shownQuestions=useMemo(()=>currentQuestion?[currentQuestion]:questions,[currentQuestion,questions]);
  useEffect(()=>{
    if(!endpoint){setRows([]);return}
    let active=true;
    (async()=>{
      const [metrics,results]=await Promise.all([Promise.all(shownQuestions.map(questionMetric)),readQuizStatistics(endpoint)]);
      if(!active)return;
      if(!results){setFailed(true);setRows(null);return}
      const counts=new Map<string,number>(results.map((item:QuizOptionCount)=>[`${item.question}:${item.revision}:${item.choice}`,item.answers]));
      setRows(shownQuestions.map((question,index)=>{
        const {question:id,revision}=metrics[index];
        const values=question.options.map(choice=>counts.get(`${id}:${revision}:${choice}`)??0);
        return {question,revision,counts:values,total:values.reduce((a,b)=>a+b,0)};
      }));
      setFailed(false);
    })().catch(()=>{if(active){setFailed(true);setRows(null)}});
    return()=>{active=false};
  },[endpoint,shownQuestions,refresh]);
  if(!endpoint)return <p className="quizStatsUnavailable">{english?'Answer totals are not connected yet.':'回答集計はまだ接続されていません。'}</p>;
  if(failed)return <p className="quizStatsUnavailable" role="status">{english?'Answer totals are temporarily unavailable.':'回答集計を取得できませんでした。'}</p>;
  if(!rows)return <p className="quizStatsUnavailable" role="status">{english?'Loading answer totals…':'回答集計を読み込み中…'}</p>;
  const filtered=currentQuestion?rows:rows.filter(row=>`${row.question.prompt} ${row.question.target}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  const bars=(row:Row)=><div className="quizStatsBars">{row.question.options.map((choice,index)=>{
    const count=row.counts[index],share=row.total?Math.round(count/row.total*100):0;
    return <div className="quizStatsBar" key={choice}><span>{labelFor(row.question,choice)}</span><div role="meter" aria-label={labelFor(row.question,choice)} aria-valuemin={0} aria-valuemax={100} aria-valuenow={share}><i style={{width:`${share}%`}}/></div><strong>{share}%</strong><small>{count}</small></div>;
  })}</div>;
  if(currentQuestion){const row=rows[0];return <section className="quizStatsCurrent" aria-label={english?'How others answered':'選択肢ごとの回答割合'}><b>{english?'How answers were distributed':'選択肢ごとの回答割合'}</b><small>{english?`${row.total} submitted answers, including retries`:`延べ回答${row.total}件（再挑戦を含む）`}</small>{row.total?bars(row):<p>{english?'No answers have been counted yet.':'まだ集計された回答はありません。'}</p>}</section>}
  return <section className="quizStatsOverview" data-no-localize><header><div><span>QUIZ STATISTICS</span><h2>{english?'All question results':'全問題の回答集計'}</h2><p>{english?'Each bar shows the share choosing that option. Totals include retries and do not represent unique learners.':'各選択肢が選ばれた割合です。再挑戦を含む延べ回答で、利用人数ではありません。'}</p></div><strong>{rows.length}{english?' questions':'問'}</strong></header><label>{english?'Find a question':'問題を検索'}<input type="search" value={search} onChange={event=>setSearch(event.target.value)} placeholder={english?'Question text or structure':'問題文・構造名'}/></label><div className="quizStatsList">{filtered.map(row=><details key={`${row.question.id??row.question.target}:${row.revision}`}><summary><span>{row.question.prompt}</span><small>{row.total}{english?' answers':'件'}</small></summary>{row.total?bars(row):<p>{english?'No answers yet.':'回答はまだありません。'}</p>}</details>)}</div></section>;
}
