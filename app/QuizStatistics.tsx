import './quiz-statistics.css';
import {statisticsEndpoint} from '../src/quizStatistics.mjs';

export default function QuizStatistics({english}:{english:boolean}) {
  if(!statisticsEndpoint(import.meta.env.VITE_QUIZ_STATISTICS_URL??''))return null;
  return <details data-no-localize className="quizStatistics"><summary>{english?'How answer totals are counted':'選択肢の集計について'}</summary>
    <p>{english?'Each multiple-choice answer contributes one count to the chosen option. The chart shows shares of submitted answers, including retries. No name, learner ID, device ID or individual answer history is stored in our answer database.':'四択に答えると、選んだ選択肢に１件加算します。グラフは再挑戦を含む延べ回答の割合です。集計DBには氏名、利用者・端末ID、個別の回答履歴を保存しません。'}</p>
    <p>{english?'Cloudflare processes connection information, including IP addresses, to deliver the service; the answer database does not store IP addresses. Statistics may be incomplete if the connection fails.':'Cloudflareは配信のためIPアドレスなどの通信情報を処理しますが、回答集計DBにはIPアドレスを保存しません。通信に失敗した回答は集計に含まれません。'}</p>
  </details>;
}
