# ID33・39・40 直交断レビュー証拠束監査

更新日: 2026-08-23

## 位置付け

`scripts/build_orthogonal_review_bundle.py` で、現行ラベルを変更せずに BigBrain 原画像とラベルの対応を後日の人手確認へ渡す、ローカル専用の証拠束 v3 を生成した。これは画像を読むための再現可能な資料であり、解剖学的妥当性、専門家レビュー、ground truth、公開教材ラベルの最終承認を示さない。

生成物は Git 管理外の `work/anatomy-review/orthogonal-review-bundle-v3/` にのみ置く。公開 `assets`、配布ラベル、アプリ表示、ID 36–38 の候補分割は変更していない。

## 固定入力と対象

| 入力 | 固定値 |
| --- | --- |
| 原画像 | `public/atlas/bigbrain-icbm500.bin.gz` / SHA-256 `c4b69975f0dece2512adf3bcae690226492cfa66ded38380b3b94aa8dba52746` |
| ラベル | `public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz` / SHA-256 `6744e7c0184436789f42c7107d05ead93cf36703bb36372df5f63b82a38f7b56` |
| 格子 | BBS1 `394×466×378`、`0.5 mm` 等方 voxel |
| crop | `min [159,242,82]`、`max [232,306,126]`、`size [74,65,45]`、margin 4 voxel |

対象の voxel 数は ID 33 が 8,482、ID 39 が 561、ID 40 が 729 である。ID 27 は 254,786 voxel の脳幹ラベルを、crop 内だけの `context-only-within-crop` として重ねる。ID 27 は `reviewLabels` に含めず、ID 36・37・38の提案・自動分割・候補 voxel は一切出力しない。

ID 39・40については、各ラベルが存在する全 X/Y/Z 断面と両端の外側断面を固定した。ID 33については、現行ラベルを変更せず、全 X/Y/Z 占有断面を canonical index として固定した。これらは断面を選ぶための格子条件であり、境界の解剖学的判断ではない。

## 出力と再現性

bundle の許容ファイル集合は、直下の `manifest.json` と `frames/` 内の期待される 161 枚の PNGだけである。各 frame には plane、slice、crop、voxel count、原画像 pixel SHA-256、出力 pixel SHA-256、PNG ファイル SHA-256を保存する。画像への文字焼込みはなく、PNG metadata (`Image.info`) は空である。

manifest には X/Y/Z 各 plane の pixel→voxel 式と、固定した非対称な四隅 anchor voxel を保存する。validator はこれを固定値から再計算し、`_oriented_crop` とは独立した flat Fortran source-index 式でも anchor pixel を照合する。bundle root、`frames`、manifest、PNG の symlink・junction・reparse point、親ディレクトリ外への解決も拒否する。

生成器と独立 validator は、固定 schema・allowed keys・整数型・labels（27/33/39/40）・definitions・canonicalSections・coverage・hash・metadata・ファイル集合をそれぞれ検査する。余分な JSON/PNG、候補・提案・推奨・boundary 系の余剰 key、ID 36–38の混入、ラベル SHA の変更は失敗とする。

実 bundle の独立 validation は `passed: true`、frame count 161。focused test は 12/12、既存 optic orthogonal test は 5/5、Python syntax check と `git diff --check` も成功した。これはローカル証拠束の整合性結果であり、実ブラウザ、公開 URL、物理端末、専門家による画像確認の結果ではない。

## review.status と残る判断

manifest の `review.status` は固定で `unreviewed`、purpose は「後日の人手レビュー用のローカル原画像証拠であり、解剖学的検証または専門家承認済みの分節ではない」としている。ID 39・40の水平断で採用済みの範囲を直交断から推測拡張せず、差分 JSONも生成していない。

次の判断はユーザー／神経解剖学に詳しい確認者が行う必要がある。

- ID 39・40の冠状断・矢状断で、視床下部への付着部と外側境界をどこまで同一構造と扱うか。
- 旧 ID 33に含まれる視交叉、左視索、右視索の境界と連続性を、座標だけで分割せず原画像と隣接断からどう確定するか。

従って、この証拠束の生成は BETA_ROADMAP の未完了チェック項目、公開可否、main 統合、専門家レビューを完了扱いにしない。
