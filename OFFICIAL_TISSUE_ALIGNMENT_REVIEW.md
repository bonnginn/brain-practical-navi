# 公式BigBrain組織分類を用いた追加比較（2026-09-06）

開発中の読み取り専用調査。組織分類や変換データは `work/official-bigbrain-tissue/` 内だけに保存し、公開資産へ追加していない。AIによる位置合わせ点検であり、専門家による領域分節の承認ではない。

## 出典と目的

- [BigBrain公式配布](https://ftp.bigbrainproject.org/bigbrain-ftp/) の2015 release、MNI-ICBM152 Spaceにある `full_cls_400um_2009b_sym.nii.gz` と対応する `full8_400um_2009b_sym.nii.gz`。分類・画像とも493×583×473、0.4 mm。取得したWelcomeとLicenseを確認した。BigBrainはCC BY-NC-SA 4.0。局所研究比較に用い、作者の承認を示唆しない。
- [Wagstyl et al., 2018](https://doi.org/10.1093/cercor/bhy074)：組織分類・皮質層解析の方法。分類は個別の解剖学的構造すべてのground truthではない。
- [Xiao et al., 2019](https://doi.org/10.1038/s41597-019-0217-0) と[公式PD25配布](https://packages.bic.mni.mcgill.ca/mni-models/PD25/) の `mni_PD25_20190708_minc2.zip`。同梱READMEは、BigBrain2015の旧ICBM登録画像に改善登録を適用したと明記している。同梱CC BY 4.0は元BigBrain全体の条件を変更しない。
- [BigBrainWarp変換評価チュートリアル](https://bigbrainwarp.readthedocs.io/en/latest/pages/tutorial_evaluation.html) および[実行スクリプト](https://github.com/caseypaquola/BigBrainWarp/blob/master/scripts/bigbrain_to_icbm.sh)で、BigBrainSymから改善ICBM空間への変換を確認した。

目的は脳梁周辺の皮質／白質や脳幹境界を、原画像に加えて独立した組織分類でも比較すること。分類3が白質だからすべて脳梁、分類1だからすべて脳室、という置換はしない。実取得分類には0がなく、1は外部背景にも広がるためCSFと背景を分離できない。

## 単純なアフィン重ね合わせは不採用

`scripts/audit_official_tissue_alignment.py` と `work/anatomy-review/official-tissue-alignment-v1/report.json`。全体比較5画像を目視した。

- 組織重なりDice 0.959534、濃度相関0.516560、平均絶対8-bit差24.9136。
- 大まかな外形は合うが、溝と内部境界のずれが残る。「同じMNI」の名称とアフィンだけでは不十分。
- この段階の `classes-on-app-grid.npy` は**位置合わせ不採用**。ラベル修復に使わない。

## 公開変位場による比較

`scripts/inspect_pd25_transform_archive.py` は約2.7 GBのZIPから必要な項目だけをHTTP byte rangeで取得する。正確な206応答、Content-Range、ETag、ZIPサイズ／CRCを検査し、取得項目のSHA-256を記録。チェックサムはローカル取得同一性であり、作者が別途公開した暗号学的保証ではない。

変換は `BigBrain-to-ICBM2009sym-nonlin.xfm` に記載された3変位場の順序付き合成。`scripts/review_bigbrain_grid_transform.py` でRAS mm、MINCの軸順・成分順・spacingを明示して読み込む。逆変換は逆順に残差を解き、未収束を黙って採用しない。単純な `x - d(x)` ではない。局所的に固定点反復が収束しない箇所はJacobianを用いた数値解法で解き、同じ許容残差を検査する。

初期実装は変位場を**三線形補間**しており、libminc既定の三次補間とバイト同一ではない。この制限を隠さず、現段階では比較根拠の候補として扱う。

`scripts/audit_official_tissue_warp.py`、`work/anatomy-review/official-tissue-warp-v1/report.json`：固定324,324点（背景を含む）とX195・X211・Y262・Z114・Z196の全体比較5画像。5画像すべて目視した。

- 組織Dice **0.984275**、共通組織61,842点の濃度相関 **0.969138**、平均絶対8-bit差 **5.29452**。
- 合成逆変換の最大残差 **0.003994 mm**。未解決点は背景・組織とも0、5断面も0。
- アフィンだけの比較とは測定点・濃度正規化の条件が完全には同一でないので、数値差だけを厳密な改善率とは扱わない。元画像・溝の対応は目視でも改善した。
- X211などでID30輪郭が皮質に及ぶ疑いを認める。まだこの比較だけで削除・拡張しない。局所全範囲の原画像と変換補間の感度を調べる。

## 取得同一性

| ファイル | SHA-256 |
| --- | --- |
| full_cls_400um_2009b_sym.nii.gz | 5dcc5cb49ad1f73821714aafafbee65ca6d4a69bbc9df0df7841db4e44ae5b0d |
| full8_400um_2009b_sym.nii.gz | b67659e085140154763d9887dafac851e9b7022158a79b364d2402fa26290704 |
| BigBrain-to-ICBM2009sym-nonlin.xfm | 1ca059cb2ccc682daa945cabaec0dcfc61a2e28e8f275141e31f40b995ab0c71 |
| 同grid_0.mnc | fa7d59742c38447b2b454d1c4cb940024611628b9da563a648c8a1ea35bd4ceb |
| 同grid_1.mnc | 32b9611a78c6005ef8d324f42f2517b9bec6014c08ad059365b86c1586869e5d |
| 同grid_2.mnc | a651912a0def70359e0fad2b8a0148d51c131c16a458241925d44858964e29f5 |

この調査時点のラベルは930e…（履歴fixtureへ固定）、原画像はc4b699…。新組織分類volumeそのものはアプリに導入していない。合成変位場の軸順、非可換な合成／逆順、非収束拒否、強い勾配の解法などの初期合成テスト5/5成功。後述の三次補間を追加して6/6。これは解剖学的正しさの証明ではない。

## 三次補間による感度確認と脳梁全範囲

`--cubic` は[libmincの補間定義](https://github.com/BIC-MNI/libminc/blob/develop/volume_io/Geometry/splines.c)と同じCatmull-Rom基底を独立実装する。MINCバイナリそのものは実行していないため、完全同一性を主張しない。二次関数／交差項の再現テストを追加し、合成テスト6/6。

`official-tissue-warp-cubic-v2/report.json`：同じ324,324点でDice 0.984134、相関0.969265、平均絶対差5.27645、合成逆変換最大残差0.004380 mm。未解決点0。全5画像を開いて目視した。補間方法を変えても大局的な画像の対応と脳梁周辺の問題は持続する。

`scripts/audit_callosum_tissue_classes.py` はID30の全151,380 voxelについて二つの補間方法を比較した。`work/anatomy-review/callosum-official-tissue-v1/` の全42矢状断（11シート）を目視した。

- 三次補間後の組織分類：白質3＝122,222、皮質灰白質2＝17,369、皮質I層5＝5,107、CSF／背景1＝6,140、皮質下灰白質6＝542。**この集計はそのまま誤ラベル数ではない**。
- 二方法の分類不一致489 voxel。位置差中央値0.00652 mm、95百分位0.01718 mm、最大0.05692 mm。
- 二方法で同じ皮質分類、元分類の白質境界から0.8 mm以上、位置差0.15 mm以下、符号化濃度差20以下などの条件で6,528 voxelを精査の優先候補とした。閾値は精査順序用であり、採用基準の代わりではない。
- X175–186、205–216などで、脳梁本体の上にある別の弧状組織までID30に含む。皮質だけでなく白質部分も含み、帯状回／帯状束との混在が疑われる。X189–201の本体下面にも別の細い白質弧が入り、脳弓との区別が必要。白質3だけを残す単純処理でも解決しない。
- この位置関係は[皮質区分の解剖学的方法論](https://pmc.ncbi.nlm.nih.gov/articles/PMC2937159/)で述べられる脳梁溝と帯状回の区別とも整合する。ただし当該BigBrainの個々の境界は原画像で評価する。
- 既存の3間隙291 voxel候補は、別組織分類でも288が1、3が5。二方法の不一致1、最大位置差0.02481 mm。既存の原画像全97断面の確認を補強するが、周辺全領域の修復完了ではない。

後続では固定成分85の1,314 voxelについて全99占有／隣接断を点検し、既存3間隙291 voxelと合わせた1,605 voxelだけを開発ラベルから除外した（[採用記録](CALLOSUM_LOCAL_REPAIR.md)、その時点5348…）。さらに固定成分15/76/83の全182占有／隣接断を点検し、別段階で1,596 voxelを除外した（[追加採用記録](CALLOSUM_CORTICAL_FOLLOWUP_REPAIR.md)、現行8cc65e…）。6,528 voxelを自動削除したわけではない。補助分類と原画像目視を併用したAI支援のプロジェクト採用で、専門家承認ではない。
