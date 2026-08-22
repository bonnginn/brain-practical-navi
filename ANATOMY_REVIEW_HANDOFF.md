# 専門家レビュー準備キュー引き継ぎ

更新日: 2026-08-22

## 位置づけ

`public/atlas/structure-provenance.json` を単一情報源として、`expertReview: "pending"` の項目を共同制作画面へ読み取り専用で表示します。これは専門家レビューの完了、解剖学的妥当性、公開採否を示すものではありません。専門家の氏名を要求・保存する入力欄、編集、承認、採否、保存操作はありません。

現在の台帳は56件すべてが専門家レビュー未完了です。由来区分、表示面、クイズ扱い、source refs、既知の制限、プロジェクトレビュー状態は台帳の値を参照して表示します。UI側で値を複製して別の教材台帳を作らないため、導出結果は元entryへの参照を保持します。

## 表示と導線

- 表示面フィルタ: すべて、脳表、断面、ブロック標本、復習
- 表示区分フィルタ: 台帳の `representationEnum` をそのまま使用
- カードは折り畳み式で、一覧を一度に展開しません。
- 上位パネルは共同制作のForm・Issue・PRなど一般入口の後ろに置いた既定閉鎖の`details`です。summaryにはpending総数と読み取り専用を示し、開いたときだけフィルタと一覧を表示します。
- 観察リンクは「一般の○○画面を開く（この項目・構造・位置は自動選択されません）」と明示し、既存の `#workspace/surface`、`#workspace/sections`、`#workspace/blocks`、`#workspace/quiz` の一般入口だけを使います。構造選択・ラベル・断面位置をURLへ埋め込みません。
- 対応する利用者向け表示面がない項目には、観察入口を作りません。

旧BigBrain／CerebrA ID33の混合領域は、断面学習画面・通常クイズの正答対象・分節編集入口へ結びません。脳表の一般観察入口だけを表示し、その制限をカード内に明記します。

ID39・40の乳頭体は、プロジェクト内レビューを経た公開教材ラベルですが、専門家レビューは未完了として表示します。プロジェクトレビュー済みを専門家レビュー済みとは扱いません。

## 機械監査

```text
node scripts/audit_anatomy_review_queue.mjs
```

監査は、pending項目のstable keyの重複・欠落、representation／learner surface／レビュー状態、source refsの解決、ID33除外、ID39・40のプロジェクトレビュー済み／専門家pending、読み取り専用UI契約を検査します。

Chrome 151のローカル通常production preview `http://127.0.0.1:4199` で親確認を行いました。上位パネルの既定閉鎖と一般入口より後ろの配置、表示面フィルタの件数（脳表36、断面16、ブロック標本29、復習21、全56）、表示区分との複合絞り込み、乳頭体ID39・40と旧ID33の注意表示、一般workspaceリンクの注意文を実操作で確認しました。390 px指定のアプリ内ブラウザ（実効 `innerWidth` 295、`clientWidth` / `scrollWidth` 284）では横はみ出し0、一覧の内側スクロールなしでした。通常Chromeの26経路×3幅×direct/reloadは156/156件に合格し、結果を `work/browser-audit/beta-route-audit-anatomy-review-final-2026-08-22.json` に保存しました。共同制作画面は既存の `#workspace/collaborate` 内に置き、route matrixは増やしていません。公開URL、物理端末、別ブラウザ・別GPU、専門家による内容確認は未完了です。
