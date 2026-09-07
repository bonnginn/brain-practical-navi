# 小脳側の脳幹誤分類64点 — 2026-09-06

## 原画像で確認したこと

対象はBRAINSTEM_ISLAND_REPAIR.mdで保留した左右low/inferior各16点、計64点。元の全隣接断・三方向121比較と広域18比較に加え、今回 `render_cerebellar_island_voxels.py` で全64点をX/Y/Zの32面・8シートに表示し、全8枚をAIが目視した。黄色の枠線だけで対象を示し、画素の濃淡を隠さない。各点は3方向すべてに現れる。画像はwork/anatomy-review/cerebellar-island-voxel-review-v1/。固定台帳cerebellar-island-voxel-review-2026-09-06.json（SHA73a198e8…）に全座標・raw値・crop・画素対応・PNG SHAを保持する。

広域で脳幹本体と離れた葉状組織とその縁に位置し、局所の濃淡も小脳側の組織へ連続する。各成分が同側小脳28/29と24面で接することは補助情報であり、それだけを分類根拠にしない。左右対称化・強度閾値による自動一括分類は行わない。

## 点別の採用判断

| 対象 | 処理 | 根拠・制限 |
| --- | --- | --- |
| 左lowのX155、Y205–208、Z81–82：8点 | 27→28 | 全三方向で小脳の葉状組織の内部側へ連続。X156の明るい縁8点は含めない。 |
| 左inferiorのX163、Y191–194、Z51–52：8点 | 27→28 | 小脳側の組織と明瞭に連続。X164の縁8点は新しい小脳ラベルに含めない。 |
| 右lowのX235–236、Y205–208、Z81–82：16点 | 27→29 | 両X面とも組織内で、Y/Zでも葉状組織への連続が見える。左と同じ点数に揃えない。 |
| 右inferiorのX228、Y191–192、Z51–52：4点 | 27→29 | 組織側として明瞭な範囲だけ。その他の薄い縁を推測で追加しない。 |
| [227,192,52]、[227,193,51]、[227,194,51]、[228,194,51]：4点 | 27→0 | 三方向で空隙内、raw255。濃度だけでなく位置・隣接断を確認。 |
| 残る境界24点 | 27→0（帰属未確定） | 脳幹としての誤分類は除くが、小脳か空隙かを確定しない。未ラベルを組織不存在と扱わない。 |

合計64点を変更：27→28が16点、27→29が20点、27→0が28点。このうち「明瞭な空隙」は4点だけで、24点は組織帰属未確定である。AI支援のプロジェクト採用であって、専門家・原提供者の承認や研究用ground truthではない。元のBigBrain画像とライセンスは変更しない。

初期work v1案は24点を旧27のまま残したが、曖昧なのは小脳外縁であり、脳幹ラベルを維持する根拠はないため不採用。v2以降は上記64点を修正する。旧work成果物は履歴として保持し、取り違えない。

## 再生可能な成果物（開発本体へ導入済み）

- 入力：82384fa6961b4eb6aa272aa556f76febd4027cf1f67937504ee227ac0a8e4726。pre-cerebellar-islands-8238 fixtureを保存。
- 出力：2a73ff567741aa9b7965eef645765bfc0d87b3cad80d789d5512cabf4ffc2ed2。
- 出力raw：8276db63377bb3f8738d8b062678b46d1af8f0b09c9691f5caf4d5fd5e1783e3。
- 固定採用記録：segmentation-patches/review/cerebellar-islands-adoption-2026-09-06.json、SHA85bc0bdfcd782173e53d13c4146641cda2024b0cfb55596effbebb590cd8947b。
- 最新の作業用volume：work/anatomy-review/cerebellar-island-adoption-v3/labels.bin.gz。v2とvolumeは同一だが、v3は下記の部品影響判定を訂正。
- ID27=254517、28=737872、29=748980。他の非0ラベルは不変。全格子の正方向／逆方向一致を確認した。

## 部品影響判定の軸順訂正

画像レビューの配列はXYZ、build_specimen_blocksはZYXである。影響調査がXYZをそのまま渡していたため、初回には影響先を「小脳・中脳」と誤記録した。実際のZYX生成は「小脳・橋延髄」の2部品だった。作業用検査で検出され、本体・公開への誤適用はない。prepare_brainstem_paired_adoption、prepare_brainstem_three_adoption、prepare_cerebellar_island_adoptionに明示的な転置を追加した。

過去の40点はZYX再計算で全block mask差0（work/40-island-zyx-recheck.log）。16点・27点もZYXで再生成して差0、採用記録SHAが従来の22ed2f98…／9c7b14f4…と完全一致した。過去のvolume・mesh修正内容を変える必要はない。

今回の2部品は旧volumeから実ファイルの全バイトを再現した上で、新volumeから生成した。新しい生成規則や滑らかさの変更は加えていない。

| 部品 | 旧SHA | 新SHA | 1 mm部品mask差 |
| --- | --- | --- | ---: |
| hindbrain/pons-medulla | bfa5fef8… | 91d7f8f4… | 8 |
| hindbrain/cerebellum | 7f4593d2… | 7520dcc8… | 3 |

固定mesh記録はsegmentation-patches/review/cerebellar-island-meshes-2026-09-06.json（SHAb5db21e6…）。成果物はwork/anatomy-review/cerebellar-island-meshes-v2/。旧2部品はtests/fixturesに保存した。全他部品はmask差0。v1の不一致を検出した出力は上書きしていない。

## 開発版への導入と検証

後続で `install_cerebellar_island_repair.py` によりvolume・2 mesh・2 metadataを開発版へ導入した。全対象の入力版・採用台帳・生成meshのSHAを事前照合し、volumeを固定差分から独立再生して逆変換も確認してから書き出す。初回はmetadataの件数キーの誤指定を事前検査で検出し、書き出し前に停止。正しいlabelCountsへ修正後に導入した。現行は2a73ff56…、旧82384fa6…と旧2 meshはfixtureへ保持。以下の「未導入」はstage作成時点の履歴。専門家レビュー・公開・main統合なし。

導入後の全Nodeテスト502/502、Pythonテスト115/115、TypeScript型検査、通常・Pages形式の本番ビルドが成功。ログはwork/cerebellar-full-node.log、work/cerebellar-full-python.log。ビルドの既存chunk-size警告は残る。公開・main・commit/pushなし。

Chrome 152.0.7977.76、http://127.0.0.1:4345 の実ブラウザで、水平断1366px・冠状断390px・矢状断1366px・脳幹小脳ブロック1366px/390pxの5条件を確認。全件stable、loader・console/request/UI error・横overflow・WebGL fallbackなし。断面volumeと変更した2 meshに新しい版2a73ff567741aa9bの要求を確認した。記録はwork/cerebellar-browser-*.json。work/cerebellar-preview.pngでPCブロックの実描画も目視した。これは読み込み・描画検証であり、微小境界の解剖学的妥当性の証拠は上記の原画像レビューである。物理端末・公開URLの新規検証ではない。
