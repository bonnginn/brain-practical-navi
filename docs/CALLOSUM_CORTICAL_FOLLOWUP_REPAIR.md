# 脳梁候補の追加局所修復 — 2026-09-06

以下は追加皮質修復の段階8cc65e…を記録する。その後の下方弧2,160 voxel除外と現在098edf…は [別の修復記録](CALLOSUM_INFERIOR_REPAIR.md) を参照。以下の検証結果を新しい版の検証結果へ読み替えない。

## 採用判断と現在の実装状態

原画像・全占有断と前後1枚・三方向の連続性をAIが点検した、固定3成分1,596 voxelの30→0差分。ユーザーの自律的な画像根拠付き修復指示に基づく**AI補助のプロジェクト採用判断**であり、専門家承認でも人間が各境界を目視承認した記録でもない。

strict採用記録を生成本体の独立した第5段階へ接続し、**開発assetsへ適用済み**。現行開発volumeは8cc65e…、直前の1,605 voxelと今回1,596 voxel、合計3,201 voxelの局所除外を含む。公開・main統合は行わない。

## 原画像上の対象

公式組織分類の二補間法で安定した皮質候補6,528 voxelから、以下の成分を個別に点検した。成分番号は930e…の固定されたprescreenに属し、別volumeの同じ番号へ転用しない。左右対称のコピーではない。

| 固定成分 | 側 | voxel | XYZ範囲 | 目視した全占有／隣接断 |
| --- | --- | ---: | --- | ---: |
| 15 | 左 | 297 | [177,259,196]–[184,294,206] | X10＋Y38＋Z13＝61（13シート） |
| 76 | 右 | 682 | [205,186,201]–[216,207,210] | X14＋Y24＋Z12＝50（11シート） |
| 83 | 右 | 617 | [205,275,193]–[216,307,212] | X14＋Y35＋Z22＝71（15シート） |

39シート・182局所断面をすべてAIが開いて目視した。全体位置は前段の全ID30矢状X175–216で確認しており、今回もX175–182、203–206を開いて局所位置と照合した。

- 左15は脳梁本体より上にある暗い皮質／脳梁溝側の帯に沿う。冠状断では折り返す皮質の先端側、水平断でも同じ薄い周辺域に収まり、脳梁本体の白質を横切る除外ではない。
- 右76は後方の周辺皮質・溝側に及ぶ。矢状断で本体の上にある組織、冠状／水平断で皮質の折り返しと連続する。上位の皮質をまとめて脳梁とする旧輪郭の局所的な誤収録。
- 右83は前上方の皮質端／溝側に沿い、三方向で脳梁の主たる白質の外側にある。既採用の右85とは別の固定成分であり、同じvoxelへ重複適用しない。

各図の元画像・赤い旧ID30輪郭・緑の対象を併用。緑の部分を消すことは「組織がない」判定ではなく、**脳梁ラベルから未ラベルへ戻す**ことに限定する。raw255一括削除でも、灰白質分類だけでの自動採用でもない。

図とSHA一覧は `work/anatomy-review/callosum-cortical-spillover-component15-v1/`、`component76-v1/`、`component83-v1/` の各report。後二つは同じ親directory内。再生成は `scripts/render_callosal_cortical_spillover.py --component 15` 等。

## 正確な差分と再現性

`scripts/prepare_callosal_cortical_followup.py` は三成分の正確なindex digest・枚数・各図のSHA・現行原値30を照合し、workにだけ出力する。

- 変更1,596 voxel、すべて30→0。先行1,605修正と全て非重複。ID30は149,775→148,179。
- 入力compressed SHA：`5348b7650a3ba28c95a00407d62cf4054fb0c670a62de717f2c572f66a51c9a3`
- 入力raw voxel SHA：`35b2a2bf42c0f045141ea51c2adf66d9daea99fcf851a6404133a52b8cbde734`
- 開発asset compressed SHA：`8cc65edf36e1e3a420168bfb663d6440418dd67189808263d11c180c4b403d16`
- 開発asset raw voxel SHA：`3c9d959acbdb67b7603ed7f2f105d7c333f0f89facc7e637f16b5fb740a16cd5`
- 全index昇順uint32LE SHA：`88da382e9f7ea296be43c4c31530ac392510d20cb851c74e172316d26f7d5f80`
- 採用記録：`segmentation-patches/review/callosum-cortical-followup-project-review-2026-09-06.json`、SHA `d03dd23583b71e3c9cd02952433bb0442db4d9f95923a85472e4d560208d5d9d`。
- 入力保存：`tests/fixtures/bigbrain-practical-segmentation-pre-callosal-followup-5348.bin.gz`。

## 生成・表示への接続と検証

`apply_approved_callosal_followup_patch` は元volumeのSHA、固定index集合、採用状態、全30→0遷移を検査し、監査記録の作成まで成功した後だけ呼出元volumeを変更する。`install_callosal_cortical_followup.py` で5348…保存入力から再生し、8cc65e…と一致するものだけを開発assetへ移した。metadataの採用監査5段階と版定数、乳頭体／視覚路の現行SHA監査を同期。旧5348…監査は履歴として保持。

55 block maskを比較し、変化した2点だけを再生成した。旧meshをbyte単位で再現できることも先に確認した。

| mesh | 1 mm生成格子の変化 | 新しいSHA-256 |
| --- | ---: | --- |
| block-commissural-system-corpus-callosum.mesh | 223 voxel除外 | `cf752f1d2e83fe9317a7f0efb29d8febd59dfd535bf272dec7b3729292c30156` |
| block-commissural-system-tissue.mesh | 34 voxel復帰 | `8aec8d9a37e9709aa32911d19848967d7a7f1281ddc1664da5ce583aa08b2478` |

後者は、誤った脳梁maskが標本組織から控除していた原画像由来の組織を戻したもの。模式的な肉付けではない。残り53 maskは不変。`work/anatomy-review/callosal-followup-block-meshes-v1/report.json`。

通常buildの実データを使い、除外4点／保持1点の日英10同定と、脳梁blockの通常／透過×初期／反対側／上面／下面8表示、計18件を実ブラウザで確認した。全18画像もAIが開いて目視した。応答資産のSHAと両meshの実読込を照合し、canvas表示・エラーなしを確認。`work/anatomy-review/callosal-followup-browser-v1/report.json`。これは10同定点の表示と8視点の確認であり、全voxel境界の正しさを自動証明するものではない。

Python全40/40、拒否時不変と再適用拒否を補強後の対象4/4、対象Node6/6、型検査・通常build成功。全Node初回488件は旧乳頭体監査ファイルを参照していた1件のみ失敗（487成功）。現行SHAで生成済みの別監査ファイルへ参照を修正し、全Node再実行488/488成功。テストを緩めたり、旧監査記録を書き換えたりしていない。既存脳室の修正点も現行8cc65e…の実distで日英4同定成功。

原画像browser volume・手動核・公式アトラスから第5段階まで全voxelを再構成し、現行volumeとの不一致0。`work/anatomy-review/practical-reconstruction-v4.json`（generator SHA `4d92628f66f428d30cdd58d19c780b881cf201125e91de31526444236bac257a`）。元NIfTIからbrowser volumeを作る前処理は再実行していない。

## 保持する限界

他の皮質候補、帯状回の白質／帯状束、脳弓との分離は未完了。左右の脳梁全境界を修復したわけではない。画像誘導・試作区分を維持し、核や乳頭体・脳室・原画像を変更しない。

透過blockでは本体より下方の別の弧状部分が脳梁色で残る。脳弓などの周辺構造との混在を引き続き原画像で点検する。前段の履歴930e…／5348…と旧検証記録を上書きしない。
