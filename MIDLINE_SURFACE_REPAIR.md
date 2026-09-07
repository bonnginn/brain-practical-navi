# 脳幹正中表面の局所4点修正候補 — 2026-09-06

## 画像確認と判断

mid-low孤立成分16点について、従来の全隣接断レビューに加え、広域三方向mid-low-00.pngを再確認し、work/anatomy-review/mid-low-pointwise-v1/points-00.pngとpoints-01.pngの全8面をAIが目視した。原画像を左に、ID27の輪郭と対象ボクセルの枠だけを右に示し、濃淡を隠さない。全16点がX/Y/Zの各方向に現れる。生成元はwork/review-mid-low.py。固定採用候補台帳に画像SHA・座標・濃度・crop・画素変換を保持した。

- X195–196、Y242、Z73–74の4点：脳幹の組織表面より外側の連続した空隙に位置するため、27→0を候補とする。全4点raw255だが、濃度だけで選んだのではない。脳室・中脳水道へ塗り替える位置ではない。
- 同X/Z、Y239–240の8点：組織側のため27を保持する。
- 同X/Z、Y241の4点：raw248–250の表面境界で、部分体積効果と薄い組織を判別し切れない。27を保持し、確定済みとはしない。

孤立成分だから16点すべて削除する、あるいは脳幹表面へ一律の濃度閾値を広げる処理は行わない。これはAI支援の局所判断であって、専門家の承認や脳幹全体の境界確認完了ではない。

## 再生可能な差分（開発版へ導入済み）

- 入力：tests/fixtures/bigbrain-practical-segmentation-pre-midline-surface-2a73.bin.gz、compressed 2a73ff567741aa9b7965eef645765bfc0d87b3cad80d789d5512cabf4ffc2ed2。
- 候補出力：work/anatomy-review/midline-surface-adoption-v1/labels.bin.gz、compressed 732bdf1996109926c516d5114d8861e338f22c414ec80804b7cd096885a25ef2、raw 487250d2e46e5cbd7aff0991377bf1bd42018aceadd3163def582acef720224d。
- 台帳：segmentation-patches/review/midline-surface-adoption-2026-09-06.json、SHA59f6aa6dae2f3eb3ee864c7b159361aa539bd1681df59eacb0b9f853f6b712fd。
- ID27は254517→254513。対象以外は不変。独立Nodeテストが全volumeの順変換・逆変換を照合し、12点保持と三方向の表示範囲も確認した。
- 実際のZYX配列で全標本block maskを再計算し、変更部品は0。既存のメッシュ平滑化や部品定義を変更しない。

準備スクリプトprepare_midline_surface_repair.pyはworkだけへ出力する。後続のinstall_midline_surface_repair.pyが固定台帳と入力全volumeを照合し、順逆再生・出力SHA・metadataをすべて事前確認してから開発本体へ導入した。現行は732bdf19…、ID27=254513。旧2a73ff56…はfixtureへ保持した。部品形状が不変のため既存meshの生成元SHAは履歴として維持する。現行ラベル版・乳頭体/視覚路の客観監査を同期した。

Python異常系を含む3/3、独立Node2/2（現行volume・metadata一致を含む）、diff-check成功。統合後の全Node504/504・全Python118/118・TypeScript・通常/Pages buildが成功。初回Nodeは保存監査JSONの参照先が旧版のままだった3件が失敗したため、旧記録を変えず新規midline-surface監査へ参照を同期し、再実行した。ログはwork/midline-full-node.log（初回）、work/midline-full-node-v2.log（合格）、work/midline-full-python.log。解剖学的な新しい接触関係を推測して期待値を変えたのではない。

Chrome152、http://127.0.0.1:4345、水平1366px・冠状390px・矢状1366pxの3条件で現行732bdf1996109926のラベル要求と正常描画を確認。loader・console/request/UI error・横overflow・fallbackなし。work/midline-browser-*.json。これは統合動作の検証であって、専門家レビューの代用ではない。公開・main・commit/pushなし。
