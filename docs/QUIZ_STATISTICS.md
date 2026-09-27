# 四択の選択肢別集計

2026-09-27。Cloudflare Worker/D1と選択肢別集計は公開βで運用中。以後の問題文・選択肢・解説の改訂はローカルで進めており、公開版とは問題版が異なる。

現在のローカル問題集から92問の許可リストを再生成した。`node scripts/build_quiz_statistics_catalog.mjs --check` は問題集との不一致を検出し、Node試験にも組み込んだ。公開βの旧許可リストから、改訂された15問の旧問題版だけを `legacy-catalog.json` に保存した。Workerの次期候補は現行92問と旧15版を別版として受け付け、古いPWAキャッシュの回答を切替中に失わない。集計画面は現在の問題版だけを表示する。`node scripts/build_quiz_statistics_worker.mjs` の出力をCloudflareの受信Workerへ先に反映し、新旧版の実受信を確認してからアプリを公開する。今回、Cloudflareや公開版は更新していない。

## 教材上の表示

四択に答えると、その問題の４選択肢が選ばれた割合を横棒で示す。復習の入口に「全問題の回答集計」を置き、回答せずに全92問の集計を検索・閲覧できる。集計が0件なら0%を成果のように示さず「回答はまだありません」とする。問題の改訂版を混ぜない。集計サービスが利用できないときも問題・解説は機能する。

割合の分母は**延べ回答数**。再挑戦も１件として数える。人数、初回回答率、学習効果、学生の評価を表すものではない。回答しない人、通信失敗、再挑戦、不正投稿による偏りがある。管理者は全問の選択肢分布を同じ画面で確認できる。一般閲覧者にも集計一覧を公開する設計で、個別回答は公開・保存しない。

## データと通信

回答時のJSONは `question`（問題ID）、`revision`（問題内容のSHA-256）、`choice`（選択肢キー）の３項目。受信側は許可された問題版と選択肢を照合して、`quiz_option_counts` のカウンターに１件加算する。集計DBには氏名、学籍番号、利用者・端末・セッションID、日時、IPアドレス、個別回答ログを保存しない。構造同定は対象外。端末内の誤答履歴・観察設定も送らない。

回答の確認ダイアログは設けず、画面と利用条件に集計と送信先を明示する。Cloudflareは通信処理のためIPアドレス等を扱うため、「IPを一切取得しない」とは表現しない。この設計自体で法的な同意要否を断定しない。Cookie・Refererは送らず、送信失敗時に再送やキューを作らない。受信先URLが未設定なら送信・集計取得を行わない。

## 実装

- `src/quizStatistics.mjs`: 問題版、最小送信、集計取得。
- `app/QuizOptionResults.tsx`: 回答後の４本の棒と全92問の一覧。一般閲覧も可。
- `app/QuizStatistics.tsx`: 集計とCloudflare処理の短い説明。
- `services/quiz-statistics/worker.mjs`: POST `/answer` と GET `/results`。許可Origin、512 byte以下、キー完全一致、既知の問題版・選択肢を確認。POSTはDBで原子的に加算。GETは集計カウンターのみ返す。
- `services/quiz-statistics/legacy-catalog.json`: 公開βのキャッシュ互換用に残す、改訂前15問の問題版。現行問題と選択肢・回答数を混ぜない。次の改訂で旧版を増やす場合は、配信中のPWAとの互換性を確認して明示的に追加する。
- `services/quiz-statistics/schema.sql`: 選択肢別カウンター。生の回答履歴はない。
- `node scripts/build_quiz_statistics_catalog.mjs`: 既存問題から92問の許可リストを再生成。保留8問は含めない。問題文・正答・選択肢・断面位置・解説を改訂したら再生成してアプリと受信側を同期する。翻訳・描画資産は問題版ハッシュに含まれない。

Origin確認は認証ではなく、意図しないブラウザ投稿を減らす程度の防御。公開集計に管理者用資格情報を設けない。不正防止に追跡IDや指紋情報を追加しない。

## Cloudflare設定と確認

以下の手順と当時の未公開記述は初回設定時の記録。現在の公開状態と次回更新の注意は冒頭を参照する。

1. Cloudflareアカウント内に専用D1 `brain-practical-quiz-statistics` を作成し、`schema.sql` を適用。IDは `1b7762ec-006c-47cd-b747-8ad97bb168e0`。既存の組織学用DBとは分離した。`wrangler.jsonc` は同IDを設定したローカル用のgitignore対象。
2. 専用Worker `brain-practical-quiz-statistics.biofigurestat.workers.dev` にコードを配備。`DB` を専用D1へ接続し、`ALLOWED_ORIGIN=https://bonnginn.github.io` を設定。LogsとTracesは無効、Logpushの出力先はなし。ダッシュボードの初期Hello Worldコードにあった`console.info`は置換済み。設定時に画面での課金表示は$0だったが、将来の課金額を保証するものではない。
3. 実環境で選択肢Aを２回、Bを１回POSTし、GET `/results` がA=2、B=1を返すことを確認。試験行２件をD1から除去し、GETで`[]`へ戻ったことも確認。公開OriginのCORS事前確認は204、集計GETは200。個人情報を含む試験回答は使っていない。
4. GitHubリポジトリ変数 `QUIZ_STATISTICS_URL` に `https://brain-practical-quiz-statistics.biofigurestat.workers.dev/answer` を設定・読戻し確認。Pages workflowは公開時に `VITE_QUIZ_STATISTICS_URL` へ渡す。ローカル確認時は同名のVITE環境変数を使う。現行公開βは旧コードなので回答は送信しない。
5. 残る確認は、更新したアプリを公開Originで開いたときの回答後グラフ・全問一覧の実ブラウザ確認、費用上限・保持期間の運用判断、公開更新の判断。管理者は「復習 → 全問題の回答集計」から全問を確認できる。必要ならD1管理画面でも以下のSQLで確認できる。

```sql
SELECT question, revision, choice, answers
FROM quiz_option_counts ORDER BY question, revision, choice;
```

## 参照

- [Cloudflare Workers Logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/): 配備時のログ設定。
- [Cloudflare D1 Database API](https://developers.cloudflare.com/d1/worker-api/d1-database/): prepared statementによる加算・読出し。
