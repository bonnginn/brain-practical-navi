import './quiz-statistics.css';
import {statisticsEndpoint} from '../src/quizStatistics.mjs';

export default function QuizStatistics({english}:{english:boolean}) {
  if(!statisticsEndpoint(import.meta.env.VITE_QUIZ_STATISTICS_URL??''))return null;
  return <div data-no-localize className="quizStatistics">
    <p>{english?'Multiple-choice selections and completed-set scores are counted, including retries.':'四択の選択肢と、最後まで解いたセットの得点を、再挑戦を含めて集計します。'}</p>
    <details><summary>{english?'About the statistics':'集計と通信について'}</summary>
      <p>{english?'Charts show option shares and grouped scores by quiz length. Our database does not store names, learner or device IDs, individual answer histories, or individual score records.':'グラフは選択肢の割合と、問題数・正解数別の得点分布です。集計DBには氏名、利用者・端末ID、個別の回答履歴や成績記録を保存しません。'}</p>
      <p>{english?'Cloudflare processes connection information, including IP addresses, to deliver the service; the answer database does not store IP addresses. Statistics may be incomplete if the connection fails.':'Cloudflareは配信のためIPアドレスなどの通信情報を処理しますが、回答集計DBにはIPアドレスを保存しません。通信に失敗した回答は集計に含まれません。'}</p>
    </details>
  </div>;
}
