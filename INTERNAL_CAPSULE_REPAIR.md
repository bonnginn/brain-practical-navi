# 内包候補の修復調査 — 2026-09-06

## 標準生成経路との分離・全ラベル再現確認

除外復元は未採用なので、`main` は `preserve_nuclear_exclusions=False` を明記して採用済みの旧候補を再現する。実験用関数の既定値はTrueのまま。元アトラス由来の変更を先に入れると、承認済み乳頭体パッチの入力SHAが変わって生成が失敗するためであり、SHAガードは緩めない。将来採用する場合は旧生成を維持してレビュー済みの限定差分を新しい後段パッチにする。

`audit_capsule_morphology.py` のソース文字列置換／execは撤去し、この明示引数で旧新を実行するようにした。再実測は左右143/143 atlas voxel、現行856/760 voxelで変化なし。未採用差分はJSON内容で一致（改行形式によるファイルSHA差あり）。合成テスト4/4に旧動作とmainの固定モードを追加。

さらに `audit_practical_reconstruction.py` で、配布rawから空間判定、現行1–22から保存済み手動ラベル、公式atlas/WMからその他ラベルを、実際のmainの生成文を用いて再構築した。乳頭体・脳室の2承認パッチも入力SHAガードを通して適用し、**現行volumeとの差0 voxel、raw SHA b1105fd3a11fab27d3b1bac60d4d989386e4ef49a41151f5b684d984f72aaaa9**を確認した。原NIfTIの読み込み／変換そのものは再実行していないので、全NIfTIビルド完了とは言わない。証拠 `work/anatomy-review/practical-reconstruction-v1.json`。公開資産は未変更。

## 続報：実アトラスでの再現と差分点検

元データを公式TemplateFlowの配布からローカルに再取得し、GitHub git-annexのsize/MD5と一致を確認した。

- `tpl-MNI152NLin2009cSym_res-1_atlas-CerebrA_dseg.nii.gz`: MD5 `7b69ad2478c6be7de12bb5b254b4cb7c`、564,070 bytes。
- `tpl-MNI152NLin2009cSym_res-1_label-WM_probseg.nii.gz`: MD5 `e5f636592b9c3a3eea4660ebc987a385`、5,427,336 bytes。
- 配布: `https://templateflow.s3.amazonaws.com/tpl-MNI152NLin2009cSym/` に上記ファイル名を付加。照合元 [公式リポジトリ](https://github.com/templateflow/tpl-MNI152NLin2009cSym)。SHA-256は生成reportにも保存。既存のMNIライセンス条件を維持し、取得データは `work/segmentation-source-review/` のみ。
- ローカル分離依存: `work/segmentation-deps/` に scipy 1.18.1 / nibabel 5.4.2 / numpy 2.5.2。アプリの依存・lockfileを変更していない。

`scripts/audit_capsule_morphology.py` は実SciPyで元関数と修復関数を計算し、保存済みBigBrain affineへ最近傍対応させた。元関数は修正行だけを外して再現する。**現行31/32ラベルの再現範囲外voxelは左右とも0**。ただし他ラベルにより上書きされる前の候補なので、この包含一致を全パイプラインの完全再現とは言わない。

| 側 | 元アトラスで除外復元 | BigBrain格子へ対応 | 現行内包の変更候補 |
| --- | --- | --- | --- |
| 左31 | 143 | 1,144 | 856 |
| 右32 | 143 | 1,144 | 760 |

`work/anatomy-review/capsule-morphology-v1/report.json` に全候補座標、入力SHA、格子metadata SHA、各画像SHAを記録。strict差分 `segmentation-patches/review/capsule-morphology-candidate-2026-09-06.json` は **low / unreviewed** で保存した。配布volumeは未変更。

`scripts/render_capsule_change_contacts.py` で全影響Z87面＋左右各X5/Y5の20面＝107原画像・差分対を9シートへまとめ、AIが全9枚を開いて点検した。最初の3枚は1画素/voxel版、その後は最近傍2倍版で点検（現在保存される全シートは2倍版）。赤が現行内包の輪郭、黄色が除外候補。

差分は核との境界に多いが、Z139–141、Z158–160などの前脚沿いの細い明るい線維帯にも及ぶ。矢状断でも明るい帯の縁に小さな削除が散在する。**アトラス核除外という実装規約の復元はできたが、全1,616 voxelの削除がこの標本で正しいという所見ではない**。一括採用しない。前下方の帽状領域全体を除去する修正でもない。原画像で曖昧な境界を不用意に消すより、この候補を保留して次の対象の作業を進める。

追加で生成関数に「軸がworld x/y/zと整列した1 mm格子」の入力チェックを実装した。既存計算はvoxel距離をmmとして用い、affine対角成分で座標を計算するため、異方性・回転／軸交換・shearを黙って処理しない。実データの格子はこの条件を満たす。合成異常系テストを追加。

再実行は `PYTHONPATH` に `work/segmentation-deps` を設定し、`audit_capsule_morphology.py`、次に `render_capsule_change_contacts.py`。全体のNIfTI生成や、承認済み乳頭体・脳室パッチの入力SHAの変更は行わない。

## 今回の到達点

**生成処理の除外条件を修正した。配布volumeの境界修復や前脚・膝・後脚の分節完了ではない。**

`atlas_white_matter_candidates` は尾状核・視床側（CerebrA IDs 100/49/91/40）、被殻・淡蒼球側（72/21/78/27）を内包候補から除外した後、binary closingを実行していた。Closingは除外済みの穴を再充填し得るため、closing後にも `~medial & ~lateral` を適用した。白質閾値、距離制約、左右分割、手動核ラベルの優先順位は変更していない。

この変更は「除外した核を後段で再び候補に含めない」という生成規約の修復であり、現行内包の前下方の帽状部分がこの不具合で生じたと証明するものではない。後段では手動核ラベルの既存voxelを上書きしないが、手動核とCerebrAの境界は一致するとは限らないため、生成段階の除外条件も維持する必要がある。

## 再点検した画像

入力ラベルSHA: `b75a24903ec08526b3e7f08df9efc8cee15af80d86bb96a821260913a2b176f3`。
原画像SHA: `c4b69975f0dece2512adf3bcae690226492cfa66ded38380b3b94aa8dba52746`。

既存の証拠画像を今回再び開いてAIが目視した（新規撮影ではない）:

- `work/anatomy-review/extent-followup-v1/capsule-inferior-x-0.png`: X153/159/165
- 同 `capsule-inferior-x-1.png`: X226/232/238
- 同 `capsule-inferior-y-2.png`: Y303/309/315
- `work/anatomy-review/complete-z-v1/ids-31-32-z-124.png`: Z124–131、原画像と輪郭

矢状断で内包候補は核の上方を回り込む明るい線維域に沿う部分がある。前下方の冠状断・水平断で灰白質と線維が入り組むため、前回の「灰白質側に見える」という所見だけで帽状領域全部を消す根拠は不足する。左右を対称化せず、今回は削除差分を作らない。

内包前脚は尾状核頭とレンズ核の間、後脚は視床とレンズ核の間、膝は両者の移行部として追う（[UTHealth Neuroanatomy Online, Lab 10](https://nba.uth.tmc.edu/neuroanatomy/L10/Lab10p01_index.html)）。この一般的位置関係は確認したが、BigBrainのこの領域の全voxelを同定する根拠には置き換えない。

## テストと残る作業

- `tests/test_capsule_exclusion.py`: 2テスト成功。小さな合成穴がclosingで埋まることと、8種類の核ID×左右16条件で除外が最終候補まで維持されることを、実際の生成関数へ注入したNumPyの6近傍closingで確認。実SciPy／実アトラスの再生成テストではない。
- 既存ventricle-adoptionテスト3/3成功。配布assets変更なし。
- 実アトラス入力からの再生成・変更voxel集計・三方向の差分レビューは未実施。承認パッチの入力SHAガードを緩めず、再生成後の変更が旧パッチと競合しないことを確認してから採用する。
- 次に必要なのは、元アトラス上のclosing前／後／除外復元後の差分をBigBrainへ対応させること。今回のコード修正だけで配布版に改善が反映されたと記載しない。
