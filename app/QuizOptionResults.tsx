import {useEffect,useMemo,useState} from 'react';
import {questionMetric,readQuizStatistics,readQuizSessionStatistics,statisticsEndpoint,type MetricQuestion,type QuizOptionCount,type QuizSessionCount} from '../src/quizStatistics.mjs';
import './quiz-option-results.css';

type Question=MetricQuestion;
type Props={questions:Question[];currentQuestion?:Question;english:boolean;refresh?:number;currentSession?:{questions:number;correct:number};labelFor:(question:Question,key:string)=>string};
type Row={question:Question;revision:string;counts:number[];total:number};
type SortMode='original'|'lowest'|'highest';

function accuracy(row:Row):number|null{
  if(!row.total)return null;
  const correct=row.question.options.indexOf(row.question.correctAnswer??row.question.target);
  return correct<0?null:row.counts[correct]/row.total;
}

export default function QuizOptionResults({questions,currentQuestion,english,refresh=0,currentSession,labelFor}:Props){
  const [rows,setRows]=useState<Row[]|null>(null);
  const [failed,setFailed]=useState(false);
  const [search,setSearch]=useState('');
  const [sortMode,setSortMode]=useState<SortMode>('original');
  const [englishText,setEnglishText]=useState<Record<string,string>>({});
  const [sessionRows,setSessionRows]=useState<QuizSessionCount[]|null>(null);
  const [sessionFailed,setSessionFailed]=useState(false);
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
  useEffect(()=>{
    if(currentQuestion||!endpoint)return;
    let active=true;
    void readQuizSessionStatistics(endpoint).then(rows=>{if(active){setSessionRows(rows);setSessionFailed(rows===null)}});
    return()=>{active=false};
  },[endpoint,currentQuestion,refresh]);
  if(!endpoint)return <p className="quizStatsUnavailable">{english?'Answer totals are not connected yet.':'回答集計はまだ接続されていません。'}</p>;
  if(currentQuestion&&failed)return <p className="quizStatsUnavailable" role="status">{english?'Answer totals are temporarily unavailable.':'回答集計を取得できませんでした。'}</p>;
  if(currentQuestion&&!rows)return <p className="quizStatsUnavailable" role="status">{english?'Loading answer totals…':'回答集計を読み込み中…'}</p>;
  const filtered=currentQuestion?rows!:(rows??[]).filter(row=>{const name=labelFor(row.question,row.question.target);return `${row.question.prompt} ${englishText[row.question.prompt]??''} ${name} ${englishText[name]??''} ${row.question.target}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())});
  const sorted=sortMode==='original'||currentQuestion?filtered:filtered.map((row,index)=>({row,index})).sort((left,right)=>{
    const a=accuracy(left.row),b=accuracy(right.row);
    if(a===null||b===null)return a===null?(b===null?left.index-right.index:1):-1;
    return (sortMode==='lowest'?a-b:b-a)||left.index-right.index;
  }).map(item=>item.row);
  const bars=(row:Row)=><div className="quizStatsBars">{row.question.options.map((choice,index)=>{
    const count=row.counts[index],share=row.total?Math.round(count/row.total*100):0;
    return <div className="quizStatsBar" key={choice}><span>{labelFor(row.question,choice)}</span><div role="meter" aria-label={labelFor(row.question,choice)} aria-valuemin={0} aria-valuemax={100} aria-valuenow={share}><i style={{width:`${share}%`}}/></div><strong>{share}%</strong><small>{count}</small></div>;
  })}</div>;
  if(currentQuestion){const row=rows![0];return <section className="quizStatsCurrent" aria-label={english?'How others answered':'選択肢ごとの回答割合'}><b>{english?'How answers were distributed':'選択肢ごとの回答割合'}</b><small>{english?`${row.total} submitted answers, including retries`:`延べ回答${row.total}件（再挑戦を含む）`}</small>{row.total?bars(row):<p>{english?'No answers have been counted yet.':'まだ集計された回答はありません。'}</p>}</section>}
  const sessionGroups=new Map<number,QuizSessionCount[]>();
  for(const row of sessionRows??[])sessionGroups.set(row.questions,[...(sessionGroups.get(row.questions)??[]),row]);
  const completedSets=(sessionRows??[]).reduce((total,row)=>total+row.sessions,0);
  return <section className="quizStatsOverview"><header><div><span>QUIZ STATISTICS</span><h2>{english?'Quiz results':'復習の回答集計'}</h2><p>{english?'Choice shares and completed-set scores are separate aggregate counts. Retries count again; these are not unique learners.':'選択肢の割合と、完了した四択セットの得点を別々に集計します。再挑戦も数え、利用人数は表しません。'}</p></div><strong>{questions.length}{english?' questions':'問'}</strong></header><section className="quizSessionOverview" aria-label={english?'Completed quiz scores':'完了した四択の得点分布'}><h3>{english?'Scores by quiz length':'解いた問題数と得点の分布'}</h3><p>{english?'Completed sets from all topics are combined. Percentages use completed sets of the same length as the denominator. No learner ID, answer sequence, or individual score record is kept.':'全テーマを合算し、最後まで答えたセットだけを数えます。割合の分母は同じ問題数の延べ完了回数です。利用者ID、回答順、個別の成績記録は保存しません。'}</p>{sessionFailed?<p role="status">{english?'Score totals are temporarily unavailable.':'得点集計を取得できませんでした。'}</p>:!sessionRows?<p role="status">{english?'Loading score totals…':'得点集計を読み込み中…'}</p>:!completedSets?<p>{english?'No completed sets have been counted yet.':'完了した四択セットはまだ集計されていません。'}</p>:<><strong>{english?`${completedSets} completed sets`:`延べ${completedSets}セット`}</strong><div className="quizSessionGroups">{[...sessionGroups].sort((a,b)=>a[0]-b[0]).map(([questions,group])=>{const total=group.reduce((sum,row)=>sum+row.sessions,0);return <details key={questions} open={currentSession?.questions===questions}><summary>{english?`${questions} questions · ${total} completed sets`:`${questions}問セット · 延べ${total}回`}{currentSession?.questions===questions?<span className="quizSessionSummaryCurrent">{english?`This result: ${currentSession.correct}/${questions}`:`今回 ${currentSession.correct}/${questions}`}</span>:null}</summary>{group.sort((a,b)=>b.correct-a.correct).map(row=><div className={currentSession?.questions===questions&&currentSession.correct===row.correct?"quizSessionBar quizSessionCurrent":"quizSessionBar"} key={row.correct}><span>{row.correct} / {questions}</span><div role="meter" aria-label={english?`${row.correct} of ${questions}`:`${questions}問中${row.correct}問正解`} aria-valuemin={0} aria-valuemax={total} aria-valuenow={row.sessions}><i style={{width:`${row.sessions/total*100}%`}}/></div><small>{english?`${row.sessions} sets · ${Math.round(row.sessions/total*100)}%`:`${row.sessions}回 · ${Math.round(row.sessions/total*100)}%`}{currentSession?.questions===questions&&currentSession.correct===row.correct?<b>{english?"This result":"今回"}</b>:null}</small></div>)}</details>})}</div></>}</section><h3 className="quizStatsQuestionHeading">{english?'Results by question':'問題ごとの選択肢'}</h3>{failed?<p className="quizStatsUnavailable" role="status">{english?'Answer totals are temporarily unavailable.':'回答集計を取得できませんでした。'}</p>:!rows?<p className="quizStatsUnavailable" role="status">{english?'Loading answer totals…':'回答集計を読み込み中…'}</p>:<><div className="quizStatsControls"><label>{english?'Find a question':'問題を検索'}<input type="search" value={search} onChange={event=>setSearch(event.target.value)} placeholder={english?'Question text or structure':'問題文・構造名'}/></label><label>{english?'Sort questions':'問題の並べ替え'}<select value={sortMode} onChange={event=>setSortMode(event.target.value as SortMode)}><option value="original">{english?'Original order':'出題順'}</option><option value="lowest">{english?'Lowest accuracy first':'正答率の低い順'}</option><option value="highest">{english?'Highest accuracy first':'正答率の高い順'}</option></select></label></div><div className="quizStatsList">{sorted.length===0&&<p role="status">{english?'No questions match this search.':'検索に一致する問題はありません。'}</p>}{sorted.map(row=>{const rate=accuracy(row);return <details key={`${row.question.id??row.question.target}:${row.revision}`}><summary><span><b>{labelFor(row.question,row.question.target)}</b> · {english?englishText[row.question.prompt]??row.question.prompt:row.question.prompt}</span><small>{rate===null?(english?'No answers yet':'未回答'):(english?`${Math.round(rate*100)}% correct · ${row.total} ${row.total===1?'answer':'answers'}`:`正答率${Math.round(rate*100)}% · ${row.total}件`)}</small></summary>{row.total?bars(row):<p>{english?'No answers yet.':'回答はまだありません。'}</p>}</details>})}</div></>}</section>;
}
