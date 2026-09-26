import './quiz-statistics.css';
import {statisticsEndpoint} from '../src/quizStatistics.mjs';

export default function QuizStatistics({english}:{english:boolean}) {
  if(!statisticsEndpoint(import.meta.env.VITE_QUIZ_STATISTICS_URL??''))return null;
  return <div data-no-localize className="quizStatistics">
    <p>{english?'Multiple-choice selections are counted as submitted answers, including retries.':'四択で選んだ選択肢を、再挑戦を含む延べ回答として集計します。'}</p>
    <details><summary>{english?'About the statistics':'集計と通信について'}</summary>
      <p>{english?'The chart shows the share choosing each option. No name, learner ID, device ID or individual answer history is stored in our answer database.':'グラフは各選択肢が選ばれた割合です。集計DBには氏名、利用者・端末ID、個別の回答履歴を保存しません。'}</p>
      <p>{english?'Cloudflare processes connection information, including IP addresses, to deliver the service; the answer database does not store IP addresses. Statistics may be incomplete if the connection fails.':'Cloudflareは配信のためIPアドレスなどの通信情報を処理しますが、回答集計DBにはIPアドレスを保存しません。通信に失敗した回答は集計に含まれません。'}</p>
    </details>
  </div>;
}
