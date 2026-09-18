# 再開メモ — 2026-09-18整理（実装状態：9月16日）

現在の依頼の範囲・期限・公開許可を優先する。本書は状態の記録であり、自律作業の再開や停止を指示するものではない。着手時はgit status・ブランチ・HEADを確認する。

## 開発版と公開版

- 開発ブランチ：`codex/september-resumed-anatomy`。この整理の直前HEADは `4911896`。ラベルSHA：`5211664518129297bbf78d1d536004e540e721615a88007ecf1459d18fb97a96`。
- 開発版：中脳水道の着色不具合を修正し、断面選択26項目を現行ラベルの全範囲3Dへ対応。前交連・透明中隔・脳弓体部は部分分節、外側膝状体は同一標本の公開層分節を採用。[統合と残件](SEPTEMBER16_CONNECTION_FIBER_CHECKPOINT.md)、[全構造3D](SECTION_BILATERAL_MODELS_2026-09-16.md)。
- 公開版：PR #30、main `d9c213a22df7ae99a4279d34d0a77e62a5e88dba`。断面併設3Dの左右修正のみ公開。公開ラベルSHAは `785ce199e2c7226e5527a771e953d1b78cfed1067179aa04c63b9eba74577e0f` のまま。開発版の追加分節・中脳水道着色修正は未公開。
- 公開用checkout：`../brain-practical-navi-publish-section`。開発と公開のメッシュ生成・目録には差分がある。次の統合時に現行ラベルと照合し、単純上書きしない。
- 前回プレビュー：`http://127.0.0.1:4346/`、出力 `work/september14-function-circuit-preview`。現在の稼働は未確認。他タスクのポート・プロセスを停止しない。
- 前回の公開CI：Node618/618、Python397件中116skip、両build成功。これは9月16日の公開候補の結果で、以降の変更の保証ではない。

## 残件と次に読むもの

- 脳弓の脚・柱、視交叉・視索・視放線は未完成。[境界を決める資料と手順](FIBER_BOUNDARY_METHODS_2026-09-16.md)から必要な地域へ進む。別標本のラベルを直接転写しない。
- 脳室の名称移行境界・全外縁・孤立点は残件。ユーザーへモンロー孔の位置を図示する依頼も未完了。[右脳室間孔](RIGHT_FORAMEN_CONNECTION_2026-09-16.md)、[中脳水道と第四脳室](AQUEDUCT_FOURTH_CONNECTION_2026-09-16.md)。
- 保留済み597候補を同じ根拠で再探索しない。[地域別ロードマップ](SEGMENTATION_NEXT_ROADMAP.md)は経過も含むため日付を区別する。
- 次のラベル変更では `scripts/build_section_current_nuclei.py` の14資産を含め、断面3D・関連ブロック・日英説明を同期する。

詳細なSHA・点数・試験経過・旧停止期限は [整理前の保存履歴](RESUME_HISTORY_2026-09-18.md)。文書監査は [9月18日の監査記録](INSTRUCTION_AUDIT_2026-09-18.md)。
