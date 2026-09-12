# 分節の参考文献・データ索引 / Segmentation references

「利用条件・クレジット → 参考文献と本アプリでの用途」に主要8件を日英で公開済み（PR #27）。2026-09-08の開発版では第三脳室1件・中脳水道2件・中脳分節規約1件を追加、計12件（追加分は未公開）。データ由来と背景調査を区別し、本索引の全項目を掲載したとは扱わない。

9月12日の開発版では下記Rushmore et al. (2022)の照合資料を日英で追加し、計13件。公開版は未変更。

更新日: 2026-09-12。既存の出典・監査記録を用途別に整理した索引です。引用元による本アプリの承認や、専門家レビュー完了を意味しません。

9月12日の[側脳室後方196点補完・内側11点除外](LATERAL_POSTERIOR_MARGIN_REPAIR.md)は、下記BigBrain登録300 µm画像を直接照合したAI補助修正。今回はnative100の追加照合をしていない。脈絡裂の位置関係の背景文献Nagata et al. (1988)はブラウザ内にも既掲載であり、新しく全文を精読したとの主張ではない。

## 脳室間孔と第三脳室屋根の追加照合（2026-09-12）

Rushmore RJ, et al. *Anatomically curated segmentation of human subcortical structures in high resolution magnetic resonance imaging: An open science approach*. Front Neuroanat. 2022;16:894606. [出版社の原論文](https://www.frontiersin.org/journals/neuroanatomy/articles/10.3389/fnana.2022.894606/full)、[DOI](https://doi.org/10.3389/fnana.2022.894606)。Methodsの側脳室・大脳横裂・第三脳室の節を参照した。このMRI規約は脳室間孔を側脳室に含める一方、脈絡叢も腔のROIへ含め、見えない屋根境界には運用上の区分を置く。本教材の腔・組織の区別へそのまま移植しない。候補672点の一括採用を避ける背景資料として使用。[局所画像と保留理由](LATERAL_POSTERIOR_MARGIN_REPAIR.md)。

## 中脳・中脳水道の照合資料（2026-09-08追記）

中脳腹側の補修ではIglesias JE, et al. *Bayesian segmentation of brainstem structures in MRI*. NeuroImage. 2015;113:184–195. [DOI](https://doi.org/10.1016/j.neuroimage.2015.02.065) のAppendix Bを再読。MRIの分節規約の照合であり、BigBrainへ補助線・境界を転写した根拠ではない。実際の局所補修は登録300 µm原画像を直接照合した。[中脳腹側補修と保留範囲](MIDBRAIN_VENTRAL_PARTIAL_REPAIR.md)。

中脳水道の背景資料はLongatti P, Fiorindi A, Perin A, Martinuzzi A. *Endoscopic anatomy of the cerebral aqueduct*. Neurosurgery. 2007;61(3 Suppl):1–5; discussion 5–6 ([読んだPubMed抄録](https://pubmed.ncbi.nlm.nih.gov/17876227/))。補助解説としてRubino JM, Hogg JP. *Neuroanatomy, Cerebral Aqueduct (Sylvian)*, updated July 24, 2023 ([NCBI Bookshelf](https://www.ncbi.nlm.nih.gov/books/NBK540988/))のStructure and Functionを参照。両者は形態・第三／第四脳室との移行を考える背景で、採用境界データではない。使用原画像・確認範囲・未採用の両端は [中脳水道部分補修](AQUEDUCT_PARTIAL_REPAIR.md) に記録。

## 第三脳室下端の照合資料（2026-09-08追記）

Campos da Silva A, Silva SM, Alves H, et al. *Stereotactic anatomy of the third ventricle*. Surg Radiol Anat. 2024;46:271–283. [DOI](https://doi.org/10.1007/s00276-024-03312-1)、[閲覧した全文PDF](https://d-nb.info/1330802381/34)。抄録と方法の解剖記述（pp.271–273）を参照し、第三脳室底・漏斗陥凹の位置関係を再確認した。元の生体形態を失った標本で、下方の空白全体を脳室と推定しないための背景資料。下端24 voxelを含む[91点の除外修正](THIRD_VENTRICLE_REMNANTS_REPAIR.md)の直接根拠は同一標本の登録300 µm連続XYZ画像であり、この論文の座標や図から境界を転写していない。開発版に採用、未公開・専門家未確認。

## 側脳室下角と内側の脳槽を区別するための照合資料（2026-09-07追記）

Nagata S, Rhoton AL Jr, Barry M. *Microsurgical anatomy of the choroidal fissure*. Surg Neurol. 1988;30(1):3–59.
[PubMed abstract](https://pubmed.ncbi.nlm.nih.gov/3394010/), DOI: 10.1016/0090-3019(88)90180-2。
25ご献体頭部の解剖研究。今回読んだ範囲は抄録。側頭部の脈絡裂が海馬采と視床下面の間に位置し、
この薄い壁を開くと迂回槽・脚槽側へ至るという関係を、ID24の内側小片の解釈に使用した。
**この文献からBigBrainのvoxel境界を転写したものではない**。原500/登録300/native100の同一標本画像を直接根拠とし、
文献は下角腔とその内側の空隙を混同しないための照合。詳細は `LATERAL_VENTRICLE_FRINGE_REVIEW.md`。

## 原画像・ラベル・位置合わせに使用

| 資料 | 使用目的 | 詳細記録 |
| --- | --- | --- |
| BigBrain, Amunts et al. (2013) — [公式配布案内](https://bigbrainproject.org/) | 標本画像と連続・直交断の照合。最近の脳室補完は登録300 µm画像等によるもので、元20 µm画像の直接確認とは異なる | [脳室レビュー](LATERAL_VENTRICLE_FRINGE_REVIEW.md)、[データ台帳](../DATA_AND_LICENSES.md) |
| Xiao Y, Lau JC, Anderson T, et al. (2019). *An accurate registration of the BigBrain dataset with the MNI PD25 and ICBM152 atlases*. Scientific Data 6, 210. [正式論文 DOI](https://doi.org/10.1038/s41597-019-0217-0)、[配布元](https://nist.mni.mcgill.ca/multi-contrast-pd25-atlas/)、[旧台帳のプレプリント](https://doi.org/10.1101/561118) | 配布手動ラベルと位置合わせ。赤核等では元区画の位置補正に使用。GPe/GPiも別の手動区画として由来を保持 | [赤核採用記録](RED_NUCLEUS_REGISTRATION_ADOPTION.md)、[淡蒼球レビュー](PALLIDAL_BOUNDARY_REVIEW.md)、[由来台帳](../STRUCTURE_PROVENANCE.md) |
| Manera et al. — [CerebrA論文](https://doi.org/10.1038/s41597-020-0557-9)、[MNIテンプレート配布](https://github.com/templateflow/tpl-MNI152NLin2009cSym) | アトラス対応・初期候補。同一標本の手動分節とは区別する | [データ台帳](../DATA_AND_LICENSES.md) |
| BigBrain2015組織分類（Wagstyl et al., 2018）と公式変位場 | 組織支持・位置合わせの補助。補助volume自体はアプリに再配布していない | [照合記録・出典・ファイルSHA](OFFICIAL_TISSUE_ALIGNMENT_REVIEW.md) |

第四脳室の前方105 voxel補完には、Xiao配布の登録300 µm BigBrain画像を直接照合に使用しました。
全候補43 app断面・73登録300断面、入力画像SHA、採用差分・復元記録は
[第四脳室レビュー](FOURTH_VENTRICLE_REPAIR.md) にあります。
native100は左右2参照点の補助照合であり、105点全体のnative100検証とは区別しています。

## 説明・照合のみの参考資料

追加取得した全脳100 µm原画像のファイル・座標系・使用前検証は [NATIVE100_BOUNDARY_REVIEW.md](NATIVE100_BOUNDARY_REVIEW.md) に記録しています。取得しただけで修正ラベルの根拠として採用済みとは扱いません。

内包の前方境界は上記100 µm原画像、核の間の曲がりは登録300 µm画像で照合しました。[内包レビュー](INTERNAL_CAPSULE_REPAIR.md) に対象座標・画像SHA・確認範囲を記録しています。この追加照合から前脚・膝・後脚の細分ラベルを採用したわけではありません。

- [動眼神経線維の微細解剖研究（PubMed 23242853）](https://pubmed.ncbi.nlm.nih.gov/23242853/)：赤核の外形区画と内部組織の解釈を分ける参考。局所の白い帯の線維名を確定した根拠ではない。詳細は赤核採用記録。
- [JonesらのBigBrain Workshop発表（2020）](https://bigbrainproject.org/docs/4th-bb-workshop/20-06-26-BigBrainWorkshop-Jones.pdf)：脳弓周辺研究の調査資料。脳弓ラベルを取得・採用済みではない。閲覧制約と未完了範囲は [脳弓レビュー](FORNIX_SEGMENTATION_REVIEW.md) を参照。
- Sitek KR, Gulban OF, Calabrese E, et al. (2019). *Mapping the human subcortical auditory system using histology, postmortem MRI and in vivo MRI at 7T*. eLife 8:e48932. [DOI](https://doi.org/10.7554/eLife.48932)、[著者配布資料](https://github.com/sitek/subcortical-auditory-atlas)。同一BigBrain標本の聴覚路核アトラスと補正原画像を比較調査に使用。番号キー・独自補正と現教材空間の対応が未解決のため教材分節へは未採用。聴放線やVIII神経の新規分節を完成した資料とは扱わない。[調査記録](AUDITORY_ATLAS_REFERENCE_REVIEW.md)。

## 追記ルール

各修正の監査記録に、対象構造、使用画像・ラベル・変換のファイル名とSHA-256、解像度・座標系、文献の書誌情報・DOI/URL、用途（直接使用／参考のみ）、確認範囲、採否と未解決点を残し、本索引からリンクします。候補調査だけの資料を採用分節の出典として扱いません。

この索引は全監査文献の整理完了を意味しません。既存の個別記録も順次索引へ追加します。ライセンス・配布条件は [DATA_AND_LICENSES.md](../DATA_AND_LICENSES.md) を参照してください。
