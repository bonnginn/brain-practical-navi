# 脳室腔の自動補完候補監査

更新日: 2026-08-23

## 目的と状態

BigBrain断面で脳室腔が黒い空隙として見えることを利用し、現行ID 23–26の塗り残しを機械的に絞り込めるか確認した。これは公開ラベルを変更する処理ではなく、直交断で後から確認するための `unreviewed` 候補生成である。

現行の脳室ラベルは、CerebrAの脳室候補を同一0.5 mm BigBrain格子へ移し、BigBrain画像の背景値255（元画像の65535相当）と重なる部分だけに制限している。現行ラベル内の非背景画像voxelは0である。ただし背景値255は「組織がない」ことを表し、脳室だけに固有の画像値ではない。血管腔、裂、標本外背景、標本作製・位置合わせによる空隙も同じ値になり得る。

## 実施した監査

入力をSHA-256で固定した。

- BigBrain画像: `c4b69975f0dece2512adf3bcae690226492cfa66ded38380b3b94aa8dba52746`
- 公開教材ラベル: `6744e7c0184436789f42c7107d05ead93cf36703bb36372df5f63b82a38f7b56`
- 格子: `394×466×378`、0.5 mm等方

まず、現行ラベルへ6近傍で連結する未ラベル背景を3次元flood-fillした。8・16・24 voxelの各余白で、左右側脳室、第三脳室、第四脳室の全成分が監査箱の境界へ到達し、余白を広げるたび候補数が増えた。したがって黒背景を一括して塗る方法は、脳室外背景へ漏れるため不採用とした。

次に、1 voxelの6面中4面以上が同じ脳室ラベルで囲まれる局所穴を調べたが、候補は4構造すべて0だった。

最終的なレビュー候補は、次の全条件に限定した。

- BigBrain画像値が255。
- 現行ラベルが0。
- X・Y・Zの各軸で、そのvoxelの両側に同じ脳室ラベルが存在する。
- 別の非0ラベルと6近傍で接しない。
- 1回だけ抽出し、候補から候補を反復拡張しない。

## 結果

| ID | 構造 | 現行voxel | レビュー候補 | 候補bbox（両端含む） |
| --- | --- | ---: | ---: | --- |
| 23 | 左側脳室 | 63,833 | 14 | X165–170 / Y203–207 / Z175–176 |
| 24 | 右側脳室 | 62,854 | 15 | X221–226 / Y203–207 / Z175–176 |
| 25 | 第三脳室 | 10,416 | 4 | X198 / Y253–254 / Z139–140 |
| 26 | 第四脳室 | 8,567 | 0 | — |

合計33 voxel（4.125 mm³）。候補同士の重複は0である。左右側脳室候補は同じY・Z範囲にあり、X座標もほぼ鏡像だが、左右14対15 voxelの差を機械的なミラー補完でそろえてはいない。

候補差分は [segmentation-patches/review/ventricles-orthogonally-bracketed-candidate-2026-08-23.json](segmentation-patches/review/ventricles-orthogonally-bracketed-candidate-2026-08-23.json) に保存した。SHA-256は `b1ed103d0fb6bac3b0dcddab9577607b56482d4653ea34dd072889faa5c35afd`。strict patch validatorで33/33 voxel、遷移 `0→23:14`、`0→24:15`、`0→25:4`、`review.decision: unreviewed` を再計算して確認した。

## 採否と次の確認

この33 voxelは自動採用ではない。三軸で既存ラベルに挟まれることは「内部の塗り残し」らしさの強い機械的根拠だが、解剖学的な脳室境界の証明ではない。

`scripts/build_ventricle_candidate_preview.py` で、候補を水平Z139–140・175–176、冠状Y203–207・253–254、矢状X165–170・198・221–226の原画像・現行ラベル・候補差分として描画した。三断面のローカルプレビューでは33 voxelすべてが既存の脳室ラベル内の小欠損として見え、脳外背景へ延びる候補は認めなかった。左右候補はほぼ鏡像位置で、第三脳室候補は正中に限局した。これは候補抽出結果の視覚的整合性確認であり、公開ラベルへの採用判断ではない。

ユーザーからは、ほぼ閉鎖された黒い脳室腔の塗り残しを自動修正する方針が示されている。ただし、現行ラベルSHAに依存する他の客観監査を同時に再生成・再検証する必要があるため、この監査単独では公開ラベルを変更しない。33 voxelの採用は、依存監査を更新できる一まとまりの変更としてプロジェクト内レビューへ進める。専門家レビュー、研究用ground truth、機関承認とは扱わない。

## 再現

```bash
python scripts/audit_ventricle_cavity_candidates.py \
  --output work/ventricle-cavity-candidate-audit.json \
  --patch-output segmentation-patches/review/ventricles-orthogonally-bracketed-candidate-2026-08-23.json

python scripts/apply_segmentation_patch.py \
  segmentation-patches/review/ventricles-orthogonally-bracketed-candidate-2026-08-23.json \
  --check

python scripts/build_ventricle_candidate_preview.py \
  --output work/anatomy-review/ventricle-cavity-candidate-2026-08-23
```

監査スクリプトは公開BBS1を読み取り専用で扱い、出力volumeを生成しない。候補差分も未レビューのため、公式buildへ適用できない。
