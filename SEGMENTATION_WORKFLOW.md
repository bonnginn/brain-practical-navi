# 手動セグメンテーション共同制作フロー（α）

## 目的

アプリ内の「編集ツール」は、BigBrain単一標本脳0.5 mm画像と同一格子のラベルを、主に水平断で確認・修正する共同制作者向けツールです。学生向け主ナビには置かず、独立した「共同制作」ページから開きます。ブラウザ上で元のラベルファイルは変更しません。編集したボクセルだけを差分JSONとして端末内に保存し、根拠とレビューを経て別工程で統合します。

## 直交断照合基盤（追加済み・解剖監査は未完了）

編集ツールには、同じBigBrain原画像・現行ラベル・端末内差分を重ねて読むための水平断・冠状断・矢状断の切替表示を追加しています。各方向は0.5 mm格子を1 voxelずつ移動でき、画面下にX/Y/Z格子座標を表示します。冠状断と矢状断は「照合専用」で、塗布・消去・復元、Undo/Redo、差分の読込・消去を行えません。差分JSON v1の`primaryPlane`は引き続き`horizontal`で、ラベルSHA-256も変更しません。

この表示は、ID 39/40（乳頭体）、旧ID 33（視交叉候補）、ID 27（脳幹）を同一格子で比較するための確認基盤です。ID 36–38や他の分節を直交断から自動生成する機能ではありません。直交断での連続性・付着境界の実際の解剖学的監査は未完了であり、表示の追加を専門家による検証済みラベルとは扱いません。

旧ID 33の客観監査が選んだ3つのデータ順位候補（矢状X187、冠状Y262、水平Z114）は、寄稿者ツールの専用パネルから直接開けます。ボタンは断面方向と位置を変更して表示をリセットするだけで、編集差分、Undo/Redo、選択ラベル、ツール、根拠メモ、端末内ドラフトを変更しません。水平Z114では水平断編集機能自体は引き続き有効なので、パネルを読み取り専用とは扱いません。これらは画像確認の開始位置であり、解剖学的検証、専門家確認、ID36–38への機械分割の根拠ではありません。

## 直交断レビュー証拠束 v3

後日の人手確認へ渡す補助資料として、`work/anatomy-review/orthogonal-review-bundle-v3/` にローカル専用の manifest＋161枚の PNGを生成しています（Git 管理外、公開 assets ではありません）。原画像・ラベルのSHA、BBS1 `394×466×378`／`0.5 mm`、ID 33・39・40の全占有断面、ID 39・40の両端外側断面、ID 27のcrop内限定表示を固定し、ID 36–38の提案・候補・自動分割は出力していません。

bundleは、frameごとの原画像／出力／PNG SHA-256、空のPNG metadata、文字なし、pixel→voxel式、固定anchor、canonicalSections、整数型・allowed keys・余剰ファイル・symlink／junction／reparse point境界を検査します。`review.status` は `unreviewed` で、連続性・付着境界・名称の正否を確定する資料ではありません。乳頭体の視床下部付着部と、旧ID 33内の視交叉・左右視索境界は、原画像の隣接断をユーザー／専門家が確認してから差分作業へ進みます。手動ラベル本体は変更していません。

## 脳室腔の保守的な自動補完候補

2026-08-23に、ID 23–26の黒い空隙の塗り残しを読み取り専用で監査しました。BigBrain背景値255へ単純な3D flood-fillを行うと4構造すべてで外側背景へ連結したため、一括補完は行いません。X・Y・Z各軸の両側を現行の同一脳室ラベルで挟まれ、別ラベルと6近傍で接しない未ラベル背景だけを1回抽出し、左14、右15、第三4、第四0 voxelの計33 voxelを `unreviewed` 差分へ固定しました。公開ラベル本体は変更していません。詳細は [VENTRICLE_CAVITY_AUDIT.md](VENTRICLE_CAVITY_AUDIT.md) を参照してください。

## ブラウザでの作業

### 視交叉・視索・乳頭体の分割

旧ID 33は、視交叉と左右視索をまとめたアトラス由来の参照足場です。ID 33を左右または座標だけで自動分割せず、原画像を確認して次の独立ラベルへ塗り替えます。

- ID 36: 視交叉（正中）
- ID 37: 左視索
- ID 38: 右視索
- ID 39: 左乳頭体
- ID 40: 右乳頭体

乳頭体は既存の模式3D形状へ合わせません。画像上の輪郭と連続断を根拠にし、境界が不明瞭な部分は無理に塗らず、`confidence` と `evidence` に判断材料を残してください。

1. 「共同制作」ページから「編集ツール」を開き、水平断スライダーで対象の高さへ移動します。
   「上へ1枚」「下へ1枚」は0.5 mm格子を1スライスずつ移動します。小構造の連続性確認では、粗い位置移動だけで中間断を飛ばさないでください。
2. 「塗る」「背景にする」「元へ戻す」を選びます。
3. 構造ラベルとブラシ半径を選び、左ドラッグで編集します。
4. ホイールで拡大し、右・中ドラッグまたは Option/Alt + ドラッグで移動します。
5. 変更範囲、判断根拠、参照文献、確認者をメモします。
6. 「差分JSONを書き出す」で保存し、Pull Requestへ添付します。

編集済み断面は画面右側にZ番号で一覧表示され、クリックして再確認できます。Undoは `Ctrl/Cmd + Z`、Redoは `Ctrl/Cmd + Shift + Z` でも操作できます。
元ラベルと同じ値を塗ったボクセルは差分へ残りません。「変更内訳」で変更前ラベルから変更後ラベルへの件数を確認し、意図しない構造の上書きがあれば提出前に修正します。

端末内の自動保存は作業継続用であり、バックアップではありません。大きな編集や作業終了時には必ずJSONを書き出してください。

## 差分JSON v1

- `format`: `brain-practical-segmentation-patch`
- `version`: `1`
- `sourceImage` / `sourceLabels`: 差分JSONには常に`/atlas/bigbrain-icbm500.bin.gz` / `/atlas/bigbrain-practical-segmentation-icbm500.bin.gz`を記録する。ブラウザの取得URLだけはGitHub Pagesのbase pathを含む
- `sourceLabelsSha256`: 編集元ラベルファイルのSHA-256。異なる版への誤適用を拒否するために使用
- `dims`: `[394, 466, 378]`
- `voxelSizeMm`: `[0.5, 0.5, 0.5]`
- `primaryPlane`: `horizontal`
- `authorNote`: 編集者の説明
- `authorGitHub`: Pull Requestと照合するGitHubユーザー名
- `targetSide`: 左・右・両側・正中・混在のいずれか。strict version 1では必須
- `evidence`: 文献、公開データ、講義資料の参照箇所。第三者資料そのものは添付しない。strict version 1では空欄・空白のみを許可しない
- `confidence`: 編集者自身による高・中・低の確度。strict version 1では必須
- `workflowMetadataVersion`: 厳格な共同制作メタデータは `1`。旧JSONでは欠落していても`--check`だけは継続できるが、警告付きのlegacy扱いとなり、出力生成には使えない
- `targetStructures`: 編集voxelの変更前・変更後に現れる非0 IDのunionをID順に並べた `{id,name}`。名前と対象IDは入力ラベルから再計算して照合する
- `sliceRanges`: 現在は編集voxelのZ最小・最大を含む水平断範囲を `{plane:"horizontal",axis:"Z",min,max}` で記録する。JSONに書かれた範囲ではなく、実際のrunsから検証する
- `changeSummary`: 入力ラベルとrunsから独立再計算する変更voxel数、元のままのvoxel数、`from`→`to`の遷移件数（from/to順）
- `reviewStatus`: `review.decision`との一致を必須にする。ブラウザからの書き出し時は必ず `unreviewed`。プロジェクト責任者が採用した差分だけ、Pull Requestに採否と根拠を記録したうえで保管コピーを `approved` に変更できる
- `review`: `{decision,reviewer,decidedAt,reason,pullRequest}`。`unreviewed` は確認者・日時・理由・PRを空にし、`approved`/`rejected` は許可された確認者種別、日付、非空理由、正のPR番号（merge commitはnull可）を必須にする
- `editCount`: 変更指定したボクセル数
- `runs`: 線形インデックス順に圧縮した `{start, length, label}`

線形インデックスは `x + 394 × (y + 466 × z)` です。`label: 0` は背景へ変更する指定です。「元へ戻す」は該当ボクセルの差分指定自体を削除します。

## Pull Requestに必要な情報

- 対象構造、左右、水平断Z範囲
- なぜ既存境界が誤りと判断したか
- 判断に用いた画像上のランドマーク
- 参照文献または公開資料の書誌情報・URL
- 使用した差分JSON
- 自己レビューの有無、可能なら第二確認者
- AI支援ツールを使った場合は、どの作業に使い、何を本人が確認したか

患者情報、許諾のない標本写真、講義・教科書・アトラス図版を差分やPull Requestへ含めません。

## メンテナーによる検証と統合

まず差分を適用せず監査します。

```bash
python3 scripts/apply_segmentation_patch.py proposed-patch.json --check
```

`workflowMetadataVersion` のない従来JSONは、入力版とrunsの整合だけを確認して `legacy+missing fields` 警告付きで通過します。strict version 1では対象ID・名称、実Z範囲、変更内訳、採否メタデータを入力ラベルから完全再計算し、一つでも一致しなければ停止します。公式buildも同じvalidatorを、承認差分を適用する前のvolume bytes・dimsへ実行します。

複数人または複数ブランチの差分を組み合わせる前に、同一ボクセルへ異なるラベルを指定していないか確認します。競合がある場合は終了コード2となり、最大100件のボクセル番号と差分名を表示します。

```bash
python3 scripts/check_segmentation_patch_conflicts.py \
  contributor-a.json contributor-b.json
```

競合検査も各差分を同じ入力ラベルに対してメタデータ検証します。`unreviewed`、`approved`、`rejected` は比較できますが、採否の状態を自動変更しません。

採用する場合も元ファイルを直接上書きせず、別の出力を作ります。

```bash
python3 scripts/apply_segmentation_patch.py proposed-patch.json \
  --output work/reviewed-segmentation.bin.gz
```

`--output` はstrict version 1かつ`review.decision:"approved"`の差分だけに許可されます。legacy、未レビュー、差戻しJSONから配布候補を生成することはできません。既存JSONを移行する場合は、入力ラベルの実体を指定して次を使います。

```bash
python3 scripts/upgrade_segmentation_patch_metadata.py \
  segmentation-patches/review/example.json \
  --git-blob <source-label-git-blob> --in-place
```

旧乳頭体のapproved JSONを自動で承認へ移行できるのは、ファイル名、旧ラベルSHA、HEAD 66db823時点の移行前Git blob SHAがallowlistに一致する既知の1件だけです。一般のlegacy approved JSONは、明示的なメンテナーreview記録なしには移行を停止します。CIや浅いcloneでは、`tests/fixtures/bigbrain-practical-segmentation-pre-mammillary-de30.bin.gz`（SHA-256 `de30b5c7…d8cc8be`、256380 bytes）を旧入力fixtureとして使い、Git履歴へ依存しません。

出力後に各ラベル数、左右、空間的位置、隣接断面での連続性、画像組織との重なり、クイズ対象断面を再検証します。差分JSON、監査結果、採否理由をPull Requestまたはリリース記録に残します。公式配布ファイルへの置換はプロジェクト管理者の採用決定後に行います。

## 現在の制限

- 差分の編集面は水平断のみです。冠状断・矢状断の照合表示は追加済みですが、連続性・付着境界の解剖学的監査は未完了です。
- 補間、領域拡張、輪郭追従、左右ミラー、複数人の差分競合解決は未実装です。
- 差分競合の検出はできますが、どちらを採用するかの解剖学的判断と自動マージは行いません。
- ブラウザ差分は手動正解ラベルであることを保証しません。
- 診断、治療、手術計画、研究用定量解析には使用しません。
