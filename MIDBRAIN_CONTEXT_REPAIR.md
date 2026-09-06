# 中脳標本の模式的な穴あけを撤回 — 2026-09-06

## 開発版への反映済み（未公開）

下記のローカル検証後、`public/atlas/block-midbrain-section-tissue.mesh` 1点と `specimen-blocks.json` の頂点／面数を更新した。他のmeshと配布分節volumeは変更していない。旧meshを現行環境で再生成したSHAは `c31cd48c3dff2493def6db8b44fdd2df69d7f5c64b5955f94299d5aae6e39134` で既存ファイルと完全一致。新meshのSHAは下記af977…と一致した。Gitの旧版と `work/.../old-reproduced-tissue.mesh` から復元可能。

`audit_midbrain_context_browser.mjs` で同じビルドの同じ1ファイルだけをローカルサーバーで入れ替え、旧／新×全部品通常／組織のみ通常／全部品透過×上面／下面＝12表示をChromeで確認した。実際のmesh応答SHAを記録し、12画像をAIがすべて目視。組織だけでは人工的な貫通孔がなくなる。通常表示では内部の模式水道が上面で部分的、下面で隠れるが、既存の透過表示では旧版同様に模式水道が見える。見せるために組織へ穴を戻さない。元脳幹ラベルの不足や、他部品が離れて見える問題は未解決。

証拠 `work/anatomy-review/midbrain-context-browser-v1/report.json` と12 PNG。描画エラー／fallbackなし。ただしこれは対象場面だけの確認で、全端末・全回転・正確な模式水道境界の承認ではない。公開サイトへは反映していない。

最終検証: 反映後の既存Node全478/478成功（`work/segmentation-continuation-final-tests.log`、259.854秒）。その実行開始後に追加したmesh digest/header/metadata/finite/index境界テスト1/1も別途成功。Python13/13、型検査、本番ビルド、diff-check成功（改行警告のみ、既存bundle-size警告あり）。README日英を開発mesh変更あり／配布ラベル変更なしに同期した。Sitesスキルに従い既存の構成・公開設定を保持し、デプロイを行っていない。

## 修正

`build_specimen_blocks.py` では、中脳の組織レイヤーから、半径2.25 mmの模式的な中脳水道の筒を差し引いていた。この筒は実測した腔ではないので、**原画像由来の組織を削るマスクとして使わない**よう修正した。模式部品自体の位置・太さ・分類は今回は変更しない。すでに脳室ラベルとして除外されている空間を埋めず、raw<252かつ既存脳幹ラベル内の組織だけを保持する。

これはID27の外縁を拡張する修正でも、中脳水道の正しい境界の完成でもない。既存脳幹の欠けは残る。赤核・黒質・大脳脚の既存差し引き処理は変更していないが、この切出しではもともと組織候補と重なるのは模式中脳水道のみだった。

## 座標と実測

- 原画像SHA: `c4b69975f0dece2512adf3bcae690226492cfa66ded38380b3b94aa8dba52746`
- ラベルSHA: `b75a24903ec08526b3e7f08df9efc8cee15af80d86bb96a821260913a2b176f3`
- 標本表示座標の原点は[-98,-116,-90]、保存されたMNI affine原点は[-98,-134,-72]。差[0,+18,-18]は表示系の意図した平行移動であり、誤登録とは判定しない。
- 表示Z -36～-26 mmは、元の0.5 mm格子Z108～128、MNI Z -18～-8 mmに相当。
- 1 mmへ間引いた生成格子で、差し引き前2,939 voxel、旧差し引き後2,713、新2,939。
- 原画像由来の組織226 voxel（1 mm格子）を保持。0.5 mmの分節ラベルを226 voxel追加したという意味ではない。
- 赤核／黒質／大脳脚によるこの組織候補との重なりは各0、模式中脳水道は226。

`audit_midbrain_context_loss.py` は実際の生成ソースの座標定義・マスク式を抽出して計算する。meshing部分を呼ぶ場合も出力先をwork以下へ限定する。ローカルPython依存にscikit-image 0.26.0とlazy-loader 0.5を追加した。アプリ依存は変更しない。

## 作成したもの・確認したこと

- 旧実測 `work/anatomy-review/midbrain-context-loss-v1.json` を保持。
- 新実測 `work/anatomy-review/midbrain-context-loss-v2.json`。
- `work/anatomy-review/midbrain-context-repair-v2/block-midbrain-section-tissue.mesh`: 2,083頂点、4,154面。SHA `af977041f979fa95241aac508a9983b8368c7ec92cb275eec33b5e5409635d8e`。
- 同フォルダ `comparison-0.png`～`comparison-2.png`: 元Z108～128の2枚刻み11断面を原画像／旧輪郭／新輪郭・保持領域として表示し、AIが3枚すべてを開いて目視。黄色は削らず保持する組織、赤が旧輪郭、水色が新輪郭。元の0.5 mm画像の全連続面ではなく、既存1 mmメッシュ生成格子そのものを点検した。
- `tests/test_midbrain_context.py`: 実生成器の差し引き式を合成maskで実行し、模式水道で組織が消えないこと、他の除外と元組織範囲を保持することを検査。

**残る作業**: オンライン公開、専門家レビュー、元の脳幹外縁・不足の修復。開発meshの置換と対象3D表示の実ブラウザ確認は上記続報のとおり完了したが、公開版の中脳形状が直ったとは扱わない。
