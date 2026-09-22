# 側脳室上縁の修正 / Lateral ventricular roof repair

公開版更新後の分節再開。今回の変更はローカルのみ。AIによる原画像照合をもとに教材内で採用した局所修正であり、専門家確認済みの境界ではない。

## 判断と変更

ユーザーの「明確な塗り残し」の画像を現行の側脳室maskと照合し、冠状断 **Y299** に位置合わせした。形状一致スコア0.988は画像位置を探す指標であり、解剖学的確信度ではない。

上縁の隙間には未ラベル点だけでなく、脳梁ID30が腔側に残る箇所があった。Y297–301の局所範囲で13候補を抽出し、登録300 µm原画像の地域図と、候補ごとのX/Y/Z中央断・前後1断を確認した（13図、117面）。薄い脳梁屋根の連続とその腔側への位置関係を根拠に8点を採用。隣接する既存側脳室への一意な6近傍接触から左右を割り当てた。X座標だけによる左右分割はしていない。

| 変更 | 点数 | 採用座標 XYZ |
|---|---:|---|
| 脳梁30 → 左側脳室23 | 6 | (175,297,181), (177,301,177), (179,299,177), (183,299,175), (184,299,175), (185,301,173) |
| 脳梁30 → 右側脳室24 | 2 | (208,299,175), (212,299,177) |

残る5候補（候補番号1,4,5,8,10）は薄い組織縁に接するため保留。強度しきい値は候補位置の抽出と補助的な支持率計算に使い、暗さだけを採用基準にはしていない。今回native100 µmの照合は行っておらず、登録と部分体積の不確実性は残る。過去の正中597候補の再調査・一括採用ではない。

修正前後の図（ローカル）: [Y299 原画像・修正前・修正後](../work/segmentation-resume-20260915/roof300-before-after/y299.png)。

## 同期と復元

- 入力圧縮SHA: `785ce199e2c7226e5527a771e953d1b78cfed1067179aa04c63b9eba74577e0f`
- 出力圧縮SHA: `d7fc87b5b18e1221c2979aeab9d6fefeefcfd4d353cfc78cab782930f32f8e29`
- 現在値: 左側脳室81,670、右82,250、脳梁145,707。第三11,837、第四9,008、中脳水道部分259は不変。
- 0.5 mm断面用の側脳室と脳室全体meshを更新。旧生成物の再生成一致を確認してから同期。
- 55個のブロックmaskはすべて不変。今回の点は1 mm格子への標本化で形状に影響せず、脳梁を含むブロックmeshの置換は不要。
- 中脳水道・内包meshはmaskとgeometry不変を確認し、出典SHAだけ同期。アプリのラベルrevisionも更新して旧キャッシュを回避。
- [採用記録](../segmentation-patches/review/lateral-roof8-adoption-2026-09-15.json)、旧ラベルfixture、旧断面meshを保持。全volumeで8点だけの変更と完全な逆適用を検査。

## 確認資料と残件

`work/segmentation-resume-20260915/` に元画像位置合わせ、`roof300-marked/candidates.json`、`roof300-cell-review/candidate-00.png`〜`12.png`を保存。図のSHAは採用記録に収録。登録300原画像SHAは `ebf0e88def96476d0a32ddaff6f28e37d7afd125dec724e6d8855b12357c7e86`。旧図や復元用データは削除していない。

浮遊成分の在庫も確認。左右側脳室の主成分外24点は既存記録と対応し、新たな孤立点の発見ではなかった。右正中寄り3点は連続300 µm図33枚を追加生成し、中央3方向を実見したが、組織／腔境界の解釈が残るため変更しなかった。33枚すべてを実見したという意味ではない。

中脳水道両端と第四脳室の接続、他の塗り残し、小脳・透明中隔等は今回未完。連結性を成立させるためだけに標本外の空間や欠損壁を埋めない。次は既存の端部資料を再利用して不足する境界証拠を絞る。

## 検証

全Node試験を実行（608結果中596成功、12失敗。旧SHAでのモジュール読込失敗を含む）。旧点数・入力SHA・現行計測metadataを同期し、失敗対象を含む親18/18、Sol13/13の再試験で解消。今回の8点の全volume前進／逆適用と6近傍・mesh検査も成功。全件を一度に619/619で実行したという意味ではない。

全Python400件を実行し396成功・4エラー。最新入力SHAと、過去レポートを旧fixtureから再現する明示的な入力指定を修正し、該当4モジュール15/15で成功。過去の証拠SHAと出力は改変していない。未解消失敗0。

型検査、通常／GitHub Pages形式build、125資産の出典検査、git diff --checkに成功。4346の配信ラベルSHA一致、Y299の側脳室断面と2方向3D描画、ブラウザerrorログ0件を確認。ログは `work/segmentation-resume-20260915/`。

再現手順は `stage_lateral_roof8.py` → 既存の2つのmesh prepare（`--stage-prefix lateral-roof8 --record-sha 3dfceac94f3b09f458efac3efb92854c835c158d957289e37f5b92cb107f1728`）→ `install_lateral_roof8.py --apply` → `node scripts/refresh_segmentation_measurements.mjs --write`。前段は固定された旧ラベルを前提とし、既存work成果の上書きと異なる入力への適用を拒否する。

## English

Eight corpus-callosum-labelled cells along the lateral ventricular roof were reassigned to the adjacent lateral lumen (left six, right two), after reviewing registered 300 µm originals in three orthogonal directions and adjacent planes. Five tissue-edge candidates remain held. This is a local educational correction supported by AI image review, not expert ground truth. Two exact-grid ventricular meshes were synchronized; all 55 specimen-block masks remained unchanged. Other ventricular junctions and detached components remain unresolved. This development change has not been published.
