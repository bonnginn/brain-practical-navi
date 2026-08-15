# 試作クイズ監修台帳

## 目的

位置照合、画像誘導、脳表、神経血管の試作問題を、専門家レビューや管理者判断を経ずに標準問題へ混ぜないための運用台帳です。アプリは `app/quiz-review-ledger.json` の承認項目だけを標準問題へ昇格します。現在の承認は0件で、標準問題は同一格子の公開手動分節に限定されています。

## 昇格に必要な証拠

1. 同一の公開候補40桁commitについて、`EXPERT_REVIEW_CHECKLIST.md` の19画面をすべてversion 2 JSONで記録する。
2. 少なくとも1名が神経解剖学の専門性を明記し、19件すべてを「採用可」または「注意書き付きで採用可」まで解決する。
3. 記名JSONを `expert-review-records/<40桁commit>/` に置く。テストfixtureは正式証拠として使用しない。
4. 個別問題と直接関係する画面ID、採用理由、必要な注意書き、管理上の採用者と採用日時を `app/quiz-review-ledger.json` に追記する。
5. `npm run audit:quiz-review` と `npm run audit:beta` を実行する。

監査は19/19、同一commit、記名、専門性、未解決判定なし、個別問題に対応する証拠ID、管理者の採用理由、注意書き、時系列を検査します。`npm run build` は最初にこの監査を実行するため、条件が一つでも欠ける台帳から配布ビルドを作れません。

## 台帳項目

- `target`: クイズ問題の対象キー。重複不可。
- `reviewedCommit`: 専門家が確認した40桁commit。
- `evidenceTargetIds`: 個別問題の採用根拠となる固定画面ID。
- `bundleDirectory`: `expert-review-records/<reviewedCommit>`。
- `adoptedAt` / `adoptedBy`: 管理上の採用日時と採用者。
- `reason`: 20文字以上の採用理由。
- `caution`: 「注意書き付きで採用可」を含む場合は20文字以上。不要な場合も空文字を明示する。

専門家レビュー完了は自動的な昇格を意味しません。モデルやラベルを修正した場合は、新しいcommitで再確認してから台帳を更新します。
