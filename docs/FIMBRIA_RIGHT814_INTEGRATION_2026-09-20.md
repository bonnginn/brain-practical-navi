# 右海馬采814点の統合 — 2026-09-20

右の原画像上の付着・折り返しを独立して追跡し、native100 Y630–680の814点をID0→46として採用した。左の反転転写ではない。左側の採用は[FIMBRIA_LEFT653_INTEGRATION_2026-09-20.md](FIMBRIA_LEFT653_INTEGRATION_2026-09-20.md)、共通の文献根拠は[FIMBRIA_LITERATURE_DECISION_2026-09-20.md](FIMBRIA_LITERATURE_DECISION_2026-09-20.md)。

初案ではY647の折り返しで補間輪郭が裂隙へはみ出したため、その断面を原画像で確認し輪郭を追加した。修正版849候補のうち既存ID46の17点は維持、既存海馬ID18の7点・腔中心旗10点・終端の孤立1点は保留した。終端1点はnative Y679.7であり、組織が存在しないという判断ではなく次区間の追跡待ち。暗さ・連結性だけで帰属を決めていない。

- ID46: 5,114→5,928点。左2,860・右3,068の2成分。
- 入力圧縮SHA: `bec6796274f48da8bac3802e1419cd3d7019c6a1d854faada48f83a39ef462b4`
- 出力圧縮SHA: `10f1704ae1b632bf6aac7f09ca7641d38e579a68712e7c1870fa173cedcc779f`
- 生voxel SHA: `4133e7148290927fcb781eec22dbc211fc8796557486eef67802568bf9cef204`
- 可逆差分: `segmentation-patches/review/fimbria-right814-adoption-2026-09-20.json`
- 候補v1/v2/v3・原画像は`work/literature-fimbria-20260920/`に保持。
- 最終格子対照: `work/fimbria-right-v3-stage-20260920/footprints/`のY640・647・670、X940、Z575。全5図を目視確認。

脳弓meshを再生成し、日英の「脳弓・海馬采（部分）」へ同期。両側とも部分収録であり全長・乳頭体接続は未完成。55粗ブロックと5細ブロックのマスクは不変で、ブロック再設計は分節後へ延期する。

installerで全voxelの順方向／逆方向再現・対象外不変・脳弓mesh再構築・その他mesh不変を確認。可逆差分と関連ブロックの既存対象試験2/2成功。通常build成功（既存bundleサイズ警告あり）。全件試験とPages buildは実施していない。

`work/fimbria-bilateral-preview`を実配信`work/september14-function-circuit-preview`へ反映し、HTTP配信SHAも一致。4346の冠状断と海馬併設3D、回転で両側の表示を確認。英語版でも両側海馬采の名称、収録範囲と未完成範囲の説明を確認。

## 残件

海馬采全長、脳弓柱下方と乳頭体への接続、視放線は未完成。新規専門家確認・公開更新はない。右Y630–680をまた候補抽出し直さず、これより先の区間または視放線・乳頭体接続へ進む。
