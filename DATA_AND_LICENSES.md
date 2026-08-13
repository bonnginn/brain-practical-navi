# データ、権利、出典

更新日: 2026-08-13

この文書は「脳実習ナビ」に同梱するデータの来歴、ライセンス、改変内容、公開条件を追跡するための監査記録です。ライセンス原文が本書と異なる場合は原文が優先します。本書は法的助言ではありません。

## 公開可否の結論

現在のアプリは、**非営利の教育目的であれば一般公開可能と判断できる構成**です。ただし BigBrain 由来素材を含むため、次の条件が必須です。

1. 商用利用をしない。
2. BigBrain、作成者、原著、ライセンスへの適切な帰属表示を行う。
3. 再標本化、圧縮、マスク、色調整、試作ラベル生成などの変更を明示する。
4. BigBrainを基にした改変データを共有する場合、CC BY-NC-SA 4.0または互換ライセンスの継承条件を守る。
5. MNI系素材の著作権表示を全コピーに残す。

商用公開を行う場合は、BigBrain由来素材を除去・差し替えた別ビルドを作るか、権利者から別途許諾を得る必要があります。

## 1. BigBrain 単一標本脳

対象ファイル:

- `public/atlas/bigbrain-icbm500.bin.gz`
- `public/atlas/bigbrain-fixed-mri-0444.bin.gz`
- `public/atlas/block-*.mesh`
- `public/atlas/specimen-blocks.json`
- BigBrain画像を基に計算された表示・試作ラベル

出典:

- [BigBrain](https://bigbrainproject.org/)
- [BigBrain Data Release FAQ](https://bigbrain-ftp.loris.ca/bigbrain-ftp/FAQ.html)
- [BigBrain license](https://forum.bigbrainproject.org/t/bigbrain-license/129)

ライセンス: [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International](https://creativecommons.org/licenses/by-nc-sa/4.0/)（CC BY-NC-SA 4.0）

原データは65歳男性の固定脳を7,404枚の冠状組織切片として再構築した3Dデータです。アプリでは、ICBM空間へ登録された0.5 mm画像および固定脳MRI 0.444 mmをブラウザ表示用に変換しています。

変更内容:

- 0.5 mmまたは0.444 mm格子への選択・格納
- 8-bit表示値への変換
- 背景マスクの作成
- gzip圧縮と独自ヘッダー付与
- 表示時の非線形な色調・コントラスト・輪郭調整
- UI上の標本調カラー表示
- 0.5 mm画像を標本化した1 mm形状の目的構造別・局所3Dメッシュ生成
- 切断面濃淡の頂点値への格納、試作脳室ラベルの腔としての除外
- 小脳と、脳幹ラベルz=-40 mm以上を中脳近似として別部品化

局所3D標本の褐色組織はBigBrain由来の改変データであり、模式図ではありません。一方、形状は1 mm間隔へ縮約し、脳室、小脳、中脳、一部白質の境界には試作ラベルを使用しています。放線冠・視放線・聴放線、脈絡叢、海馬采、脳弓、乳頭体、中脳水道と、鉤・視床下部・透明中隔・大脳脚の位置目安は本プロジェクト独自の模式補助で、BigBrainから抽出したものではありません。各部品の区分は `public/atlas/specimen-blocks.json` の `sourceType` に記録しています。実標本の微細形態、切断変形、脈絡叢の実形態、厳密な線維束境界を再現する正解標本ではありません。

必須表示:

> BigBrain (Amunts et al., 2013), CC BY-NC-SA 4.0. Browser-ready derivatives include resampling/selection, 8-bit conversion, compression, masking, and display tone mapping. No endorsement by the original authors is implied.

## 2. BigBrain co-registration と手動皮質下核ラベル

対象ファイル:

- `public/atlas/bigbrain-manual-subcortical-icbm500.bin.gz`
- `public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz` の IDs 1–22

出典:

- [MNI NeuroImaging & Surgical Technologies: Multi-contrast PD25 atlas](https://nist.mni.mcgill.ca/multi-contrast-pd25-atlas/)
- Xiao Y, et al. [doi:10.1101/561118](https://doi.org/10.1101/561118)

ライセンス: BigBrain co-registration dataset は [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)。公式配布ページは、この例外が基礎となるBigBrain自体のCC BY-NC-SA 4.0を変更しないことも明記しています。

収録ラベル:

- 左右赤核
- 左右黒質
- 左右視床下核
- 左右尾状核
- 左右被殻
- 左右淡蒼球外節・内節
- 左右視床
- 左右海馬
- 左右側坐核
- 左右扁桃体

変更内容: ラベル番号の再割当、ICBM2009 symmetric 0.5 mm格子への格納、gzip圧縮、ブラウザ用ヘッダー付与。

## 3. MNI152NLin2009cSym と CerebrA

対象ファイル:

- `public/atlas/mni-cerebra-1mm.bin.gz`
- `public/atlas/brain.mesh`
- `public/atlas/caudate.mesh`
- `public/atlas/hippocampus.mesh`
- `public/atlas/thalamus.mesh`
- `public/atlas/ventricle.mesh`
- `public/atlas/segment-*.mesh`
- `public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz` の IDs 23–29

出典:

- [TemplateFlow MNI152NLin2009cSym repository](https://github.com/templateflow/tpl-MNI152NLin2009cSym)
- [TemplateFlow archive](https://www.templateflow.org/archive/)
- Manera AL, et al. [doi:10.1038/s41597-020-0557-9](https://doi.org/10.1038/s41597-020-0557-9)

ライセンス:

> Copyright (C) 1993-2004 Louis Collins, McConnell Brain Imaging Centre, Montreal Neurological Institute, McGill University. Permission to use, copy, modify, and distribute this software and its documentation for any purpose and without fee is granted, provided that the copyright notice appears in all copies. The material is provided as-is without warranty.

ライセンス全文は `public/atlas/LICENSE.txt` に保持しています。

変更内容:

- T1/T2、GM/WM/CSF確率、脳マスク、CerebrAラベルの1 mm格子への統合
- 8-bit化、gzip圧縮、独自ヘッダー付与
- CerebrAラベルから表示用メッシュを作成
- CerebrA由来の脳室・脳幹・小脳候補をBigBrain 0.5 mm格子へ最近傍再標本化し、教育用に形態学的調整

IDs 23–29は手動正解ラベルではありません。アプリでは「試作」または「位置照合済みアトラス由来」と明記します。

## 4. 全脳表面モデル

対象ファイル:

- `public/atlas/pial-left.mesh`
- `public/atlas/pial-right.mesh`
- `public/atlas/surface-region-labels.json`

出典: BigBrainWarpの配布物に含まれるMNI152高密度白質表面。配布物の `COPYING` は上記MNIライセンスを収録し、BigBrainWarpのプログラムコード自体はGPL-3.0です。本アプリはBigBrainWarpのプログラムコードを組み込まず、表面データを変換して使用します。

変更内容:

- 白質表面の頂点を法線方向へ2.35 mm展開し、pial-like表面を生成
- 法線・曲率由来の陰影値を付加
- 同じMNI152NLin2009cSym空間のCerebrA皮質領域を、対応白質表面の法線方向±3 mm以内で標本化
- 左右各163,842頂点の93.6%へCerebrA領域IDを格納
- WebGL表示用の独自メッシュ形式へ変換

脳表領域IDはアトラス由来の教育用対応であり、専門家がpial表面を手動区画した正解データではありません。脳溝境界の厳密な判定、皮質面積・厚さ等の定量解析には使用できません。

引用:

- Paquola C, et al. [BigBrainWarp](https://doi.org/10.7554/eLife.70119)

## 5. 本プロジェクトが生成した試作ラベル

対象: `public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz` の IDs 30–32。

- ID 30: 脳梁候補
- ID 31: 左内包候補
- ID 32: 右内包候補

これらはBigBrain画像、CerebrA白質確率、近接核・脳室との位置制約から計算した教育用候補です。専門家が作成した手動セグメンテーションではなく、解剖学的正解や研究用マスクとして扱えません。

## 6. 本プロジェクトの教育用模式3D

対象ファイル:

- `public/atlas/overlay-arteries-anterior.mesh`
- `public/atlas/overlay-arteries-posterior.mesh`
- `public/atlas/overlay-nerves-anterior.mesh`
- `public/atlas/overlay-nerves-pontine.mesh`
- `public/atlas/overlay-nerves-medullary.mesh`
- `public/atlas/neurovascular-overlays.json`
- `public/atlas/landmark-optic-pathway.mesh`
- `public/atlas/landmark-infundibulum.mesh`
- `public/atlas/landmark-mammillary-bodies.mesh`
- `public/atlas/basal-landmarks.json`

脳底動脈と脳神経根は、本プロジェクトが主要経路をMNI方向の表示空間へ手作業で置き、`scripts/build_neurovascular_overlays.py` で管状メッシュへ変換した模式3Dです。動脈はpial-like表面の表示補正を維持し、III–XIIの神経根は同一ICBM500格子の脳幹ラベル表面へ見かけの起始部を合わせています。視神経・視交叉・視索、漏斗（下垂体茎）、乳頭体は、同じ表示空間へ `scripts/build_basal_landmarks.py` で配置した独立部品です。外部の標本写真・教科書図版・アトラス図版をトレースまたは収録していません。BigBrain組織像、血管造影、tractography、献体標本から抽出したものでもありません。

- 動脈は内頸動脈系、椎骨脳底動脈系、ウィリス動脈輪、主要小脳動脈に限定します。
- 脳神経はI–XIIの脳底面で見える近位部と、脳幹に対する起始レベルを単純化します。
- 脳底面では視神経・視交叉・視索、漏斗、左右の乳頭体を前後に並べます。下垂体そのものは表示しません。
- 各管状メッシュ頂点に1–45の個別構造IDを格納し、教材上の選択・白色強調にだけ使用します。
- 3Dモデルはホイール拡大、脳表の透過、小脳・橋／延髄・血管・神経レイヤーの脱着に対応します。中脳は上方との連続を保つため脱着対象にしません。
- 個人差、穿通枝、正確な血管径、神経核、頭蓋孔、遠位走行は再現しません。

生成メッシュは本プロジェクト作成の教材データとしてCC BY-NC-SA 4.0、生成スクリプトはアプリケーションコードとしてAGPL-3.0-or-laterです。詳細は `public/atlas/PROCEDURAL-NEUROVASCULAR-NOTICE.txt` を参照してください。これらは解剖学的正解データ、手術シミュレーション、臨床参照には使用できません。

`public/og.png` は本プロジェクト用に追加したプロモーション用イラストです。解剖データや第三者の標本画像として扱わず、教材上の位置・形状の根拠にも使用していません。一般公開前に、作成履歴をプロジェクト記録として保持してください。

## 7. 参照したが同梱していない著作物

次は学習項目、標本の見せ方、UIの検討にのみ使用し、画像・図版・文章をアプリやリポジトリへ転載していません。

- ユーザー提供の2021年神経解剖学講義資料（脳実習講義・課題スケッチ）
- 『プラクティカル 解剖実習 脳』
- ハインズ神経解剖学アトラス
- 3D Brain / Brain Tutor / Visible Body
- 病理組織センター等の標本閲覧サイト

講義資料からは「何を同定できるべきか」という到達目標のみを抽出しています。資料内に掲載された写真、標本画像、図解、ラベル配置は複製しません。

## 8. アプリコードと依存ソフトウェア

主要依存:

- React / React DOM: MIT
- Vite: MIT
- TypeScript: Apache-2.0
- `@vitejs/plugin-react`: MIT

依存ソフトウェアのライセンスは各パッケージに適用され、本プロジェクトのコードへ自動的に同じライセンスを与えるものではありません。

本プロジェクト固有コードはAGPL-3.0-or-laterで提供します。ネットワーク越しに変更版を提供する場合は、利用者が対応ソースを無償で取得できる導線を表示します。本プロジェクトが作成した教材文書はCC BY-NC-SA 4.0です。BigBrain派生データはコードライセンスと切り分け、CC BY-NC-SA 4.0の条件を維持します。範囲の詳細は `LICENSES.md` を参照してください。

AGPLはオープンソースであり、コードの販売や業務利用そのものを禁止するライセンスではありません。一方、現在の完全な配布物にはBigBrain由来素材が含まれるため、データを含む版はBigBrainの非営利条件に従います。

## 9. 医療・教育上の免責

- 教育用のプロトタイプであり、医療機器ではありません。
- 診断、治療、手術計画、患者説明、研究用の定量解析へ使用できません。
- 単一標本、平均標準脳、固定脳MRIは別由来であり、個体差・固定変形・登録誤差があります。
- 0.5 mmなどの格子間隔は、すべての解剖構造を同じ精度で識別できることを意味しません。
- 試作セグメンテーションの位置・形状は今後の専門家確認で変更されます。

## 10. 公開前の権利ゲート

| 項目 | 状態 | 必要な対応 |
| --- | --- | --- |
| BigBrain非営利条件 | 対応済み | READMEとアプリ内表示を維持 |
| BigBrain帰属・変更表示 | 対応済み | 公開ビルドでもリンクを確認 |
| MNI著作権表示 | 対応済み | `public/atlas/LICENSE.txt` を同梱 |
| 講義・教科書画像の非収録 | 対応済み | 新規アセット追加時に再監査 |
| OGPイラストの作成履歴 | 要記録保持 | `public/og.png` のプロジェクト内作成履歴を保持 |
| アプリコードのライセンス | 対応済み | AGPL-3.0-or-laterとソース導線を維持 |
| 自作教材文書のライセンス | 対応済み | CC BY-NC-SA 4.0表示を維持 |
| 公開ソースURL | 未設定 | GitHubリポジトリ作成後、アプリへ設定 |
| 商用利用 | 不可 | 別許諾または素材差し替えが必要 |

## 11. 推奨する表示文（短縮版）

> 非営利教育用。BigBrain (Amunts et al., 2013) 由来データは CC BY-NC-SA 4.0、BigBrain co-registration/manual labels (Xiao et al.) は CC BY 4.0、MNI152/CerebrAはMNIライセンスに基づき使用しています。表示用に再標本化、圧縮、マスク、色調調整を行っています。試作ラベルは正解データではなく、診断用途には使用できません。
