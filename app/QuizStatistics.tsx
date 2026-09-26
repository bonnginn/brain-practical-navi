import {useEffect,useState} from 'react';
import './quiz-statistics.css';
import {statisticsConsent,setStatisticsConsent,statisticsEndpoint} from '../src/quizStatistics.mjs';

export default function QuizStatistics({english}:{english:boolean}) {
  const endpoint=import.meta.env.VITE_QUIZ_STATISTICS_URL??'';
  const [enabled,setEnabled]=useState(()=>{try{return statisticsConsent(localStorage,endpoint)}catch{return false}});
  const [failed,setFailed]=useState(false);
  useEffect(()=>{const sync=()=>{try{setEnabled(statisticsConsent(localStorage,endpoint))}catch{setEnabled(false)}};window.addEventListener('storage',sync);window.addEventListener('quiz-statistics-preference',sync);return ()=>{window.removeEventListener('storage',sync);window.removeEventListener('quiz-statistics-preference',sync)}},[endpoint]);
  if(!statisticsEndpoint(import.meta.env.VITE_QUIZ_STATISTICS_URL??''))return null;
  return <details data-no-localize className="quizStatistics"><summary>{english?'Optional quiz statistics':'四択の統計協力（任意）'}</summary>
    <p>{english?'Help improve questions by sending the question ID, content revision and whether your answer was correct. No name or learner/device ID is sent. Only totals per question are saved; retries count as additional answers.':'教材改善のため、問題ID・問題の版・正誤だけを送ります。氏名や利用者・端末IDは送りません。保存するのは問題別の合計で、再挑戦も回答回数に含まれます。'}</p>
    <p>{english?'The Cloudflare receiving service processes connection information such as your IP address. It is not stored in our answer database. Participation does not affect the quiz. Past answers are not sent.':'Cloudflareの受信サービスは通信時にIPアドレス等を処理しますが、回答集計のデータベースには保存しません。参加しなくても学習できます。過去の回答は送りません。'}</p>
    <label><input type="checkbox" checked={enabled} onChange={event=>{const next=event.target.checked;let saved=false;try{saved=setStatisticsConsent(localStorage,next,endpoint)}catch{}setFailed(!saved);if(saved){setEnabled(next);window.dispatchEvent(new Event('quiz-statistics-preference'))}}}/>{english?'Contribute future multiple-choice answers (turn off at any time)':'これからの四択回答の集計に協力する（いつでも解除可）'}</label>
    {failed&&<p role="status">{english?'Could not save this preference. The setting was not changed.':'設定を保存できませんでした。設定は変更されていません。'}</p>}
  </details>;
}
