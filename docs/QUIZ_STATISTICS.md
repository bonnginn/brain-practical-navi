# 四択の任意参加集計

2026-09-27。実装候補。公開送信・Cloudflareへの配備は未実施。

## 集めるものと集めないもの

送信JSONは `question`（問題ID）、`revision`（問題内容のSHA-256）、`correct`（真偽値）の3項目のみ。サーバーは問題・版別の回答数と正解数を加算する。生の回答履歴、選択肢、氏名、学籍番号、利用者/端末/セッションID、日時、IPアドレスはDBに保存しない。構造同定は対象外。クイズの誤答履歴や観察状態も送らない。

参加設定は初期OFFで、このブラウザ内だけに保存する。四択画面と利用条件から変更できる。参加後の回答だけが対象で、撤回後は新たに送信しない。受信済みの集計から個人分を抽出・削除することはできない。再送・後日送信・バックグラウンドキューはない。通信が失敗しても回答と解説は使える。

「正答率」は受信した回答回数を分母にする。人数、初回回答率、学習効果、学生の評価には使わない。再挑戦、不参加、通信失敗、悪意のある投稿による偏りがあり、成績の根拠にはならない。問題改訂後の数値を無条件に合算しない。

## 構成

- `src/quizStatistics.mjs`: 問題版と最小送信。Cookie・Refererを送らず、4秒で打ち切る。
- `app/QuizStatistics.tsx`: 日英の任意参加UI。URL未設定なら非表示・送信無効。
- `services/quiz-statistics/worker.mjs`: POST `/answer` のみ。許可Origin、512byte以下、キー完全一致、既知の問題版を確認。回答結果は受信時点の匿名カウンターへ原子的に加算する。
- `services/quiz-statistics/schema.sql`: 集計テーブル。閲覧APIは公開しない。
- `node scripts/build_quiz_statistics_catalog.mjs`: 既存問題から92問の許可リストを再生成。保留8問は含めない。問題の文面・正答・選択肢・断面位置・解説を変えたら再生成し、アプリと受信側を同期する。翻訳・描画資産の変更はハッシュに含まれないため、解釈が変わる改訂は別途問題ID/内容を改訂する。

Origin確認はブラウザからの意図しない投稿を減らすもので、認証や不正投稿の完全な防止ではない。追跡IDやフィンガープリントを不正対策として追加しない。費用上限・サービス側制限も配備時に確認する。

## Cloudflareで運用する場合の残り設定

1. 管理者が利用するCloudflareアカウントを決める。既存Web AnalyticsのサイトトークンはWorkers/D1への配備権限ではない。
2. D1を作り、`schema.sql`を適用する。`wrangler.example.jsonc`を作業用設定へコピーし、database_idを設定する。秘密情報は公開アプリへ入れない。
3. Workersのログ・トレース・Logpush・Tail等の設定を確認する。設定例はobservabilityを無効化しており、Worker自身もリクエストや回答をログ出力しない。Cloudflare基盤が通信上扱うIP等まで「取得されない」とは表現しない。
4. テスト用DB/Workerで正誤を各1回送り、回答数2・正解数1になることを確認する。不参加時に送信されないこと、集計失敗時にも学習できることを実際の配信環境で確認する。テスト用データを本番集計に混ぜない。
5. 集計閲覧はアカウント内のD1管理画面/CLIに限定する。保持方針は個別回答なし、問題版別集計を教材改善に必要な間のみ保持。具体的な棚卸し時期を運用開始前に決める。
6. Worker配備とログ設定の確認後にGitHubのリポジトリ変数 `QUIZ_STATISTICS_URL=https://.../answer` を設定する。Pages workflowが `VITE_QUIZ_STATISTICS_URL` に渡す。ローカル確認時は同名のVITE環境変数を使う。未設定なら無効。送信先URLを変えると以前の参加設定は適用されず、再度参加の選択が必要になる。日英の説明と運用を一致させ、承認された公開更新で有効にする。

集計閲覧SQL:

```sql
SELECT question, revision, answers, correct,
       ROUND(100.0 * correct / NULLIF(answers, 0), 1) AS accuracy_percent
FROM quiz_counts ORDER BY answers DESC;
```

統計用受信先の運用開始はまだ完了条件を満たしていない。ローカル実装と実運用を区別する。

## 参照

- [Cloudflare Workers Logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/): 新規Workerのログ設定を配備時に確認する根拠。
- [Cloudflare D1 Database API](https://developers.cloudflare.com/d1/worker-api/d1-database/): prepared statementによるDB操作。
