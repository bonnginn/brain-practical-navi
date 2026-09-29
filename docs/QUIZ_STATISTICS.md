# 四択の回答・得点集計

2026-09-29 ローカル追加: 四択セットの最終回答時に、`questions`（解いた問題数）と `correct`（正解数）だけを送信する。Worker/D1は同じ組の完了回数だけを加算し、全問集計画面の上部に「10問中8問正解・延べ何回」の得点分布を表示する。再挑戦は別の完了セットとして数える。途中で中断したセット、構造同定、氏名・端末ID・セッションID・回答順・個別成績は保存しない。公開済みWorkerには未配備で、現状の公開版ではこの得点集計は動作しない。

現在のWorker生成コマンドは現行92問と互換用の旧51版を含む。下に残した旧41版などの数値は、その日付時点の作業履歴。

次回の公開前に、既存D1へ更新後の `schema.sql` の新テーブル定義を適用し、`node scripts/build_quiz_statistics_worker.mjs` の出力をWorkerへ先に配備する。旧PWAとの互換性のため既存 `/answer` と `/results` は維持する。その後アプリを公開し、完了セット1件の受信、`/session-results` の問題数・得点別集計、日英表示を公開Originで確認する。Workerが先に更新されない間は新画面に「得点集計を取得できません」と表示し、従来の選択肢別集計と教材利用は継続する。

受信は POST `/session` の `{questions,correct}` のみ、取得は GET `/session-results`。許可Origin、1〜92問の整数、0〜問題数の正解数、キー完全一致、128 byte以下を確認する。`quiz_session_counts` に問題数・正解数ごとの完了回数だけを保持する。個別の実行履歴を残さないため、同じ人の再挑戦は別件として数え、初回正答率や個人の上達は測れない。

2026-09-29 ローカル改善: 神経・血管の名称同定22問は、制作方式を尋ねる一律の設問から、脳底の血管と脳神経・視覚路の観察対象を分けた短い日英の設問に改めた。出題可能18問の直前版を旧版許可リストへ保存した。続いて内包名称問題の断面位置をY270から、視床も見えるY260へ移し、直前版1件を旧版に追加。次期Worker候補は現行92問＋旧41版となる。問題の正答・選択肢・表示対象・保留4対象は不変。旧PWA利用者の回答を受けるため、次の公開時はWorkerを先に更新してからアプリを配信する。現時点では両者とも未公開。

2026-09-29 ローカル改善: 全問一覧で同一文面が続く模式神経・血管問題に対象構造名を併記し、英語版では既存の英訳目録から問題文を表示する。検索は日本語・英語の問題文と構造名に対応。英訳目録は英語版を開いた時だけ読み込み、日本語版の追加読込を避けた。現行問題文79種類の英訳収録を確認し、対象Node18件、型検査を含む通常build、PWA対象11件が成功。本番Workerはlocalhostを許可しないため、ローカル実ブラウザで数値入り一覧を確認できていない。公開版・Worker・集計データは変更していない。

同日追補: 検索が0件のときは日英で明示し、狭い画面では長い問題文と件数を折り返す。関連する集計・レスポンシブ対象Node10件と通常buildが成功。数値入り一覧の実画面確認は上記の接続制限で未実施。

2026-09-27。Cloudflare Worker/D1と選択肢別集計は公開βで運用中。以後の問題文・選択肢・解説の改訂はローカルで進めており、公開版とは問題版が異なる。

現在のローカル問題集から92問の許可リストを再生成した。`node scripts/build_quiz_statistics_catalog.mjs --check` は問題集との不一致を検出し、Node試験にも組み込んだ。公開β由来の旧20版、嗅神経・視神経の直前ローカル版2件、神経血管の名称同定の直前18版、内包名称問題の直前版1件を `legacy-catalog.json` に保存した。次期Worker候補は現行92問と旧41版を別版として受け付ける。古いPWAキャッシュの回答を切替中に失わず、集計画面は現在の問題版だけを表示する。`node scripts/build_quiz_statistics_worker.mjs` の出力をCloudflareの受信Workerへ先に反映し、新旧版の実受信を確認してからアプリを公開する。今回、Cloudflareや公開版は更新していない。
公開βのコミット `02da48a` の92問題版と現行ローカル版を照合し、変更された20問の旧版すべてが `legacy-catalog.json` にあることを確認した（欠落0）。これは次期Worker候補の静的な互換確認であり、Cloudflareでの実受信試験や公開更新ではない。

## 教材上の表示

四択に答えると、その問題の４選択肢が選ばれた割合を横棒で示す。復習の入口に「全問題の回答集計」を置き、回答せずに全92問の集計を検索・閲覧できる。問題ごとの正答率（正答選択肢の延べ回答割合）で昇順・降順に並べ替えられ、未回答は末尾に置く。集計が0件なら0%を成果のように示さず「回答はまだありません」とする。問題の改訂版を混ぜない。集計サービスが利用できないときも問題・解説は機能する。

割合の分母は**延べ回答数**。再挑戦も１件として数える。人数、初回回答率、学習効果、学生の評価を表すものではない。回答しない人、通信失敗、再挑戦、不正投稿による偏りがある。管理者は全問の選択肢分布を同じ画面で確認できる。一般閲覧者にも集計一覧を公開する設計で、個別回答は公開・保存しない。

## データと通信

回答時のJSONは `question`（問題ID）、`revision`（問題内容のSHA-256）、`choice`（選択肢キー）の３項目。受信側は許可された問題版と選択肢を照合して、`quiz_option_counts` のカウンターに１件加算する。集計DBには氏名、学籍番号、利用者・端末・セッションID、日時、IPアドレス、個別回答ログを保存しない。構造同定は対象外。端末内の誤答履歴・観察設定も送らない。

回答の確認ダイアログは設けず、画面と利用条件に集計と送信先を明示する。Cloudflareは通信処理のためIPアドレス等を扱うため、「IPを一切取得しない」とは表現しない。この設計自体で法的な同意要否を断定しない。Cookie・Refererは送らず、送信失敗時に再送やキューを作らない。受信先URLが未設定なら送信・集計取得を行わない。

## 実装

- `src/quizStatistics.mjs`: 問題版、最小送信、集計取得。
- `app/QuizOptionResults.tsx`: 回答後の４本の棒と全92問の一覧。一般閲覧も可。
- `app/QuizStatistics.tsx`: 集計とCloudflare処理の短い説明。
- `services/quiz-statistics/worker.mjs`: POST `/answer` と GET `/results`。許可Origin、512 byte以下、キー完全一致、既知の問題版・選択肢を確認。POSTはDBで原子的に加算。GETは集計カウンターのみ返す。
- `services/quiz-statistics/legacy-catalog.json`: 公開βのキャッシュ互換用20版と、直前ローカル版21件。現行問題と選択肢・回答数を混ぜない。次の改訂で旧版を増やす場合は、配信中のPWAとの互換性を確認して明示的に追加する。
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
