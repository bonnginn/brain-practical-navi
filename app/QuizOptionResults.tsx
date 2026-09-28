import {useEffect,useMemo,useState} from 'react';
import {questionMetric,readQuizStatistics,statisticsEndpoint,type MetricQuestion,type QuizOptionCount} from '../src/quizStatistics.mjs';
import './quiz-option-results.css';

type Question=MetricQuestion;
type Props={questions:Question[];currentQuestion?:Question;english:boolean;refresh?:number;labelFor:(question:Question,key:string)=>string};
type Row={question:Question;revision:string;counts:number[];total:number};
type SortMode='original'|'lowest'|'highest';

function accuracy(row:Row):number|null{
  if(!row.total)return null;
  const correct=row.question.options.indexOf(row.question.correctAnswer??row.question.target);
  return correct<0?null:row.counts[correct]/row.total;
}

export default function QuizOptionResults({questions,currentQuestion,english,refresh=0,labelFor}:Props){
  const [rows,setRows]=useState<Row[]|null>(null);
  const [failed,setFailed]=useState(false);
  const [search,setSearch]=useState('');
  const [sortMode,setSortMode]=useState<SortMode>('original');
  const [englishText,setEnglishText]=useState<Record<string,string>>({});
  useEffect(()=>{if(english)void import('./english-catalog.json').then(module=>setEnglishText(module.default as Record<string,string>))},[english]);
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
  const filtered=currentQuestion?rows:rows.filter(row=>{const name=labelFor(row.question,row.question.target);return `${row.question.prompt} ${englishText[row.question.prompt]??''} ${name} ${englishText[name]??''} ${row.question.target}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())});
  const sorted=sortMode==='original'||currentQuestion?filtered:filtered.map((row,index)=>({row,index})).sort((left,right)=>{
    const a=accuracy(left.row),b=accuracy(right.row);
    if(a===null||b===null)return a===null?(b===null?left.index-right.index:1):-1;
    return (sortMode==='lowest'?a-b:b-a)||left.index-right.index;
  }).map(item=>item.row);
  const bars=(row:Row)=><div className="quizStatsBars">{row.question.options.map((choice,index)=>{
    const count=row.counts[index],share=row.total?Math.round(count/row.total*100):0;
    return <div className="quizStatsBar" key={choice}><span>{labelFor(row.question,choice)}</span><div role="meter" aria-label={labelFor(row.question,choice)} aria-valuemin={0} aria-valuemax={100} aria-valuenow={share}><i style={{width:`${share}%`}}/></div><strong>{share}%</strong><small>{count}</small></div>;
  })}</div>;
  if(currentQuestion){const row=rows[0];return <section className="quizStatsCurrent" aria-label={english?'How others answered':'選択肢ごとの回答割合'}><b>{english?'How answers were distributed':'選択肢ごとの回答割合'}</b><small>{english?`${row.total} submitted answers, including retries`:`延べ回答${row.total}件（再挑戦を含む）`}</small>{row.total?bars(row):<p>{english?'No answers have been counted yet.':'まだ集計された回答はありません。'}</p>}</section>}
  return <section className="quizStatsOverview"><header><div><span>QUIZ STATISTICS</span><h2>{english?'All question results':'全問題の回答集計'}</h2><p>{english?'Each bar shows the share choosing that option. Accuracy is the correct option’s share of submitted answers, including retries; it does not represent unique learners. Unanswered questions appear last when sorted.':'各選択肢が選ばれた割合です。正答率は正答選択肢の割合で、再挑戦を含む延べ回答から計算します。利用人数ではありません。未回答は並べ替え時に末尾です。'}</p></div><strong>{rows.length}{english?' questions':'問'}</strong></header><div className="quizStatsControls"><label>{english?'Find a question':'問題を検索'}<input type="search" value={search} onChange={event=>setSearch(event.target.value)} placeholder={english?'Question text or structure':'問題文・構造名'}/></label><label>{english?'Sort questions':'問題の並べ替え'}<select value={sortMode} onChange={event=>setSortMode(event.target.value as SortMode)}><option value="original">{english?'Original order':'出題順'}</option><option value="lowest">{english?'Lowest accuracy first':'正答率の低い順'}</option><option value="highest">{english?'Highest accuracy first':'正答率の高い順'}</option></select></label></div><div className="quizStatsList">{sorted.map(row=>{const rate=accuracy(row);return <details key={`${row.question.id??row.question.target}:${row.revision}`}><summary><span><b>{labelFor(row.question,row.question.target)}</b> · {english?englishText[row.question.prompt]??row.question.prompt:row.question.prompt}</span><small>{rate===null?(english?'No answers yet':'未回答'):(english?`${Math.round(rate*100)}% correct · ${row.total} ${row.total===1?'answer':'answers'}`:`正答率${Math.round(rate*100)}% · ${row.total}件`)}</small></summary>{row.total?bars(row):<p>{english?'No answers yet.':'回答はまだありません。'}</p>}</details>})}</div></section>;
}
