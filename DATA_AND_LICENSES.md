# データ、権利、出典

開発版の `section-current-*.mesh` は現在のBigBrain実習分節から全範囲を再構成した脳室表示です。原資料・分節の既存条件を継承し、新たな専門家確定データとは扱いません。[生成法・SHA・適用範囲](SECTION_VENTRICLE_MESH_SYNC.md)

分節の原画像・ラベル・位置合わせ資料と参考文献は [分節の出典索引](SEGMENTATION_REFERENCES.md) から参照できます。

53点修正の統合検証完了：全Node 547/547（work/inferior-residual53-full-node-v1.log、session30969 exit0）、型検査、本番build、実ブラウザ12/12と全12PNG目視成功。現ラベルba31c7b…、未完了項目の監査は継続。全分節完成・専門家レビュー・公開反映ではない。以下の実行中/未検証表記は工程履歴。現在live検証jobなし。

2026-09-07 ローカル開発版：追加53 voxel（0→24）と関連5meshを組込み。現label SHA ba31c7b26409ce771fe5df47548299e671489649580a004017bd0617c9100efb、raw SHA 2b870431f39cb214d01a8cfc49bbd37f0cb5f23b23264615bbb256329f112d6a、ID24=64362。inferior-residual53-adoption-2026-09-07.jsonとpre-inferior-residual53復帰ファイルに根拠/差分を保存。新採用テスト2/2・型検査成功。過去57点の現行値テスト、SHA依存の客観監査、全テスト/build/実ブラウザは新段階では未更新・未完了。下記681f/545成功は直前段階の履歴。全目標は継続、main/公開変更なし。

2026-09-07 最新ローカル組込み：下角の追加57 voxel（0→24）と関連6meshを適用。現compressed SHA `681fb599fd6d2181d7b7398a775abf5f1335eb644ce95afc2149b39fab9f9c88`、raw `eaee5e5809932b06e8b497c4b195edf659438e2a6d0fdb823b55ea2dea2b3086`、ID24=64309。可逆記録 `segmentation-patches/review/inferior-residual-adoption-2026-09-07.json`、変更前label/6meshはtests/fixturesのpre-inferior-residual系列に保存。新採用テスト2/2・型検査・本番build成功。過去採用meshの現行値照合・全体回帰・実ブラウザは次工程で未完了。全分節完成・専門家レビュー・公開反映ではない。以下の5f18等は過去段階。

2026-09-07 下角修正の開発統合：原画像の全差分164面と広域14面を確認した304 voxel（0→右側脳室ID24）を採用し、関連7部品を同期。現圧縮SHA `5f1847a300e0a988ec19037c947e18b525f5d4dc01da8de87222035abbf88eba`、raw SHA `6335e0b37e926a9523a1c4d451104157e044a968bddfcaadd069f0c1b7f471dd`、ID24は64252 voxel。可逆記録は `segmentation-patches/review/inferior-horn-adoption-2026-09-07.json`、変更前ラベルと7meshはtests/fixturesに保存。以下の0d31等は過去段階の記録。AI画像レビューによる局所修正で、専門家確認・全脳室完成・公開反映ではない。脳弓・視放線の独立分節は未完了のまま。

側脳室の中規模局所修正を開発版に適用：31領域867 voxel（左555・右312）と関連7部品。現ラベル圧縮SHA `0d31037722a8a31eee3ff6feed49dc076ece3d6c864297240c687cd1526cc229`、raw SHA `b36c2bc3f2ceb8701283dde2cfdd47305b8861e11d357762bd1c160e9dafaa9d`。採用記録は `segmentation-patches/review/lateral-medium-adoption-2026-09-07.json`、旧b473ラベルと変更前7meshはtests/fixturesへ保存。原画像・個別/統合差分・有限セル支持を照合したAI画像レビューによる局所補完であり、専門家監修・全脳室完成ではない。新旧採用テスト4/4、型検査、本番build成功。全Node試験は実行中、今回の実ブラウザ確認は未完了。main/公開変更なし。

2026-09-07追補：既存BigBrain画像を照合した側脳室630点の開発修正と6mesh同期。現label compressed SHA `b473638881ac75dc3ce27cf9963d612ffa41f768906e895f2281954c44be9567`、raw `3c295bb532aacc1654f44fd20d2c6524644ef42e83d0ac44f8078607bffaf922`。旧7c54と6mesh fixture、lateral-remaining-adoption記録を保持。追加取得・ライセンス変更なし。専門家レビュー・研究用ground truth・公開反映ではない。

2026-09-07追補：側脳室の追加265点を既存BigBrain画像照合後に開発採用、関連4meshを同期。現label compressed SHA `7c54fdd2e391ca3e1ed70f7e5fdead7be940d1007b891eb4bb4dd22d7407f0ef`、raw `bed9a7d37c5f8709aa4c82845112ed7f5f429c689b1a111bad95b22e31d09e7e`。前段83dc label/旧4mesh fixtureとlateral-next-adoption記録を保持。追加取得・ライセンス変更なし。専門家レビュー・研究用ground truth・公開反映ではない。

2026-09-07開発データ追補（側脳室）：既存登録300µm/500µm画像に基づく308点補完と関連3mesh同期。追加取得・ライセンス変更なし。現label SHA `83dcbdda59e86f393cc93b9d91ccd8f68c1fa08bc1156df99467fe3aef792567`、raw `cfe86d863d828dbae8051f148114368f25b54b668f973715da02bd95f7d25672`。変更前label/mesh fixtureと `lateral-fringe-adoption-2026-09-07.json` に可逆性・由来を保存。AI画像レビューによる開発採用で、専門家確認・研究用ground truthではない。公開未更新。以下のSHAは各工程時点の履歴。

2026-09-07開発データ追補（第四脳室）：既存登録300µm/500µm画像を照合し、0→26の16点を開発採用。追加取得・ライセンス変更なし。現label SHA `d4295e7cc00edd3639b631473445d5db1bb25f9fbe18c5c7f21ff8b8471d7152`、raw `b17bcfbcad38430f33d3bb6973d6ea847295e37670a4f04710d78a2986546142`。第四脳室mesh SHA `e821185cbf03824d477627d35db14bfd3cdadb33a5437edf6285e13ce1910291`。可逆採用記録 `segmentation-patches/review/fourth-ventricle-paired-adoption-2026-09-07.json` と変更前label/mesh fixtureを保存。専門家確認・全輪郭確定ではなく、公開版未更新。下記第三脳室段階のSHAは履歴。

2026-09-07開発データ追補：既存BigBrain登録300µm/500µm画像による第三脳室中央1587点の補完を採用。追加データの取得・ライセンス変更なし。現label SHA `9bc51ab0b0f6932871a93a0d225491ed0649ef827012a7db41d3f3e049b166a8`、raw `f5d552ac7856dfb5bb555e289f16c5d1f0dfa918107af2b567491202dba54fbe`。可逆JSONと変更前fixtureを保存。対応する第三脳室meshはSHA `47c1ec43e59f7303954a510d111d9cc19a62adc5338deb9d9716a6e079e87f1a`。画像誘導の開発内採用であり専門家レビュー・研究用ground truthではない。公開更新なし。

2026-09-07 追補：小脳外縁1105の21290点を開発採用し18701点保持。可逆差分・追加原画像図のSHAはcerebellar-support-1105-adoption-2026-09-07.json、修正前はpre-cerebellar-1105-212d fixtureに保存。既存BigBrain原画像のみを利用し、新規ライセンス・専門家承認・公開更新はない。

2026-09-07 追補：小脳上部843の3353点を開発採用し3914点を保持。cerebellar-support-843-adoption-2026-09-07.jsonとpre-cerebellar-843-c989 fixtureに可逆差分・由来・画像レビュー根拠を保存。原画像は既存BigBrain 500/300µmデータで、今回新たな外部データの取得・ライセンス変更・専門家承認・公開更新はない。

2026-09-06 追補：右小脳1603の229点（29→0）を開発採用、425点保持。cerebellar-support-1603-adoption-2026-09-06.jsonとpre-cerebellar-1603-0908 fixtureに可逆差分・由来を保存。累計1,260点の局所修正。既存BigBrain画像を用い、新規データ・ライセンス変更・専門家承認・公開更新はありません。

2026-09-06 追補：右小脳1393の372点（29→0）を開発採用、571点保持。cerebellar-support-1393-adoption-2026-09-06.jsonとpre-cerebellar-1393-190f fixtureに可逆差分・由来を保存。小脳空隙の局所修正は累計1,031点。既存BigBrain画像によるもので、新規データ・ライセンス変更・専門家承認・公開更新はありません。

2026-09-06 追補：左小脳component997の259点（28→0）を開発採用、748点保持。cerebellar-support-997-adoption-2026-09-06.jsonとpre-cerebellar-997-2fc8 fixtureに可逆差分・由来を保存。累計659点の局所修正で、新規データ・ライセンス変更なし。AI画像レビューであり、専門家承認・公開更新ではありません。

2026-09-06 追補：別成分2274の52点（29→0）も開発採用。376点保持、既存348点と合計400点。cerebellar-support-2274-adoption-2026-09-06.jsonとpre-cerebellar-2274-2943 fixtureに可逆差分・由来を保存。新規外部データやライセンス変更なし。AI画像レビューであり専門家承認・公開サイト更新ではありません。

2026-09-06 開発版：既存BigBrain画像を用い、小脳上外側の空隙に重なる348 voxelを右小脳ラベル29から未ラベル0へ戻しました。300 µm原画像支持・隣接直交断のAIレビューに基づく局所修正で、専門家承認や新規細分節ではありません。新規データ・ライセンス変更なし。可逆fixtureとcerebellar-support-adoption-2026-09-06.jsonに記録、公開サイト未変更。

2026-09-06 開発版の模式模型改変：自作VII/VIII神経管の遠位rings8–15を除き、原画像の側頭葉組織へ入り込む表示を短縮。保持した頂点・法線・半径は元と同じで、原画像から実神経を分節したものではありません。新規外部データ・権利条件の変更はなく、公開サイトは未変更です。NERVE_ORIGIN_IMAGE_REVIEW.mdとsegmentation-patches/review/pontine-proximal-display-adoption-2026-09-06.jsonを参照。

更新日: 2026-08-23

2026-09-06 開発版の追加改変：BigBrain公式native100 µm画像を照合し、左乳頭体の外表面下端2 voxelを39→0へ修正。差分・画像と変換のSHA・可逆性・AIによる局所確認の限界はMAMMILLARY_NATIVE_SUPPORT_REVIEW.mdおよびsegmentation-patches/review/mammillary-tip-adoption-2026-09-06.jsonに記録。原データの権利条件は変更せず、専門家承認・全境界確定・公開サイトへの反映を意味しない。

この文書は「脳実習ナビ」に同梱するデータの来歴、ライセンス、改変内容、公開条件を追跡するための監査記録です。ライセンス原文が本書と異なる場合は原文が優先します。本書は法的助言ではありません。

2026-08-14再監査: [BigBrain公式ライセンス掲示](https://forum.bigbrainproject.org/t/bigbrain-license/129) でCC BY-NC-SA 4.0の表示・非営利・継承条件を再確認しました。[Cloudflare Web Analytics公式説明](https://developers.cloudflare.com/web-analytics/about/) と [データ収集説明](https://developers.cloudflare.com/web-analytics/data-metrics/data-origin-and-collection/) では、個人データを収集・利用せず、CookieやlocalStorageを使わず、性能計測に必要な情報を最小限収集する現行方針を確認しました。公開アセットは `public/atlas/DATA-MANIFEST.json` で全ファイルを出典群、改変、ライセンス、表示義務、同梱通知へ一意に対応づけています。

2026-08-24端末内保存追記: Cloudflare Web AnalyticsがlocalStorageを使わないことと、アプリ自身がクイズ間違い履歴・セグメンテーション編集差分・M2比較レビュー下書き・解剖レビュー下書きをブラウザのlocalStorageへ保存することを区別して、利用条件へ明記しました。これらは自動送信せず、サイトデータ消去で失われます。M2比較レビューは氏名・メール・所属fieldを持たず、JSON書き出し後も未送信・非採用・専門家確認未主張を固定します。任意メモにも個人を特定できる情報を入力しないよう画面で案内します。原著者やデータ提供機関の推奨・承認を示すものではありません。

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

局所3D標本の褐色組織はBigBrain由来の改変データであり、模式図ではありません。一方、形状は1 mm間隔へ縮約し、脳室、小脳、中脳、一部白質の境界には試作ラベルを使用しています。放線冠・視放線・聴放線、脈絡叢、脳弓、乳頭体、中脳水道と、視床下部・透明中隔・大脳脚の位置目安は本プロジェクト独自の模式補助で、BigBrainから抽出したものではありません。各部品の区分は `public/atlas/specimen-blocks.json` の `sourceType` に記録しています。旧海馬采・鉤メッシュは位置と連続性の根拠が不足するためβ候補から除外しました。実標本の微細形態、切断変形、脈絡叢の実形態、厳密な線維束境界を再現する正解標本ではありません。

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

開発版の2026-09-06修復: 中脳標本の組織メッシュ1点で、模式中脳水道の筒を使った組織の差し引きを撤回しました。BigBrain原画像・既存脳幹ラベル内の組織を保持する変更で、新たな中脳水道境界の正解分節ではありません。由来・再現・SHAは `MIDBRAIN_CONTEXT_REPAIR.md`。既存のBigBrain／手動ラベル／本プロジェクト生成部分のライセンスと不確実性の区分は維持します。未公開です。

対象ファイル:

- `public/atlas/mni-cerebra-1mm.bin.gz`
- `public/atlas/pial-left.mesh`
- `public/atlas/pial-right.mesh`
- `public/atlas/pial-left.mesh.gz`
- `public/atlas/pial-right.mesh.gz`
- `public/atlas/caudate.mesh`
- `public/atlas/hippocampus.mesh`
- `public/atlas/thalamus.mesh`
- `public/atlas/ventricle.mesh`
- `public/atlas/segment-*.mesh`
- `public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz` の IDs 23–29、33–35

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
- 左右pialメッシュは元の`.mesh`を保持し、同一バイトへ戻る決定的なlossless gzip sidecar（`.mesh.gz`）も配布
- CerebrA由来の脳室・脳幹・小脳・視交叉・島皮質候補をBigBrain 0.5 mm格子へ最近傍再標本化し、既存ラベルの空き領域へ限定

IDs 23–29、33–35は手動正解ラベルではありません。アプリでは「試作」または「位置照合済みアトラス由来」と明記します。

## 3.1 アクセス解析

公開HTTPSホストの本番版だけで、利用状況と表示性能の把握に Cloudflare Web Analytics のJavaScriptビーコンを使用します。localhost、127.0.0.1、開発ビルドではビーコンを読み込みません。Cloudflareの公式説明では、Web AnalyticsはCookieやローカルストレージを利用せず、訪問者の個人データを収集・利用しません。本アプリも利用者を識別する独自IDを付与しません。

- [Cloudflare Web Analytics: About](https://developers.cloudflare.com/web-analytics/about/)
- [Data origin and collection](https://developers.cloudflare.com/web-analytics/data-metrics/data-origin-and-collection/)

## 4. 全脳表面モデル

対象ファイル:

- `public/atlas/pial-left.mesh`
- `public/atlas/pial-right.mesh`
- `public/atlas/pial-left.mesh.gz`
- `public/atlas/pial-right.mesh.gz`
- `public/atlas/surface-region-labels.json`
- `public/atlas/surface-landmark-*.mesh`
- `public/atlas/surface-landmarks.json`

出典: BigBrainWarpの配布物に含まれるMNI152高密度白質表面。配布物の `COPYING` は上記MNIライセンスを収録し、BigBrainWarpのプログラムコード自体はGPL-3.0です。本アプリはBigBrainWarpのプログラムコードを組み込まず、表面データを変換して使用します。

変更内容:

- 白質表面の頂点を法線方向へ2.35 mm展開し、pial-like表面を生成
- 法線・曲率由来の陰影値を付加
- 同じMNI152NLin2009cSym空間のCerebrA皮質領域を、対応白質表面の法線方向±3 mm以内で標本化
- 左右各163,842頂点の93.6%へCerebrA領域IDを格納
- WebGL表示用の独自メッシュ形式へ変換
- 本プロジェクトが置いた8本の種曲線を最寄りの高密度脳表頂点へ投影し、細い管状ガイドへ変換

脳表領域IDはアトラス由来の教育用対応であり、専門家がpial表面を手動区画した正解データではありません。線状ガイドも献体脳の溝をトレースした境界ではなく、中心溝、中心前溝、外側溝、上前頭溝、大脳縦裂、頭頂後頭溝、鳥距溝、嗅溝の模式位置です。脳溝境界の厳密な判定、皮質面積・厚さ等の定量解析には使用できません。

引用:

- Paquola C, et al. [BigBrainWarp](https://doi.org/10.7554/eLife.70119)

## 5. 本プロジェクトが生成した試作ラベル

対象: `public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz` の IDs 30–32、39–40。

- ID 30: 脳梁候補
- ID 31: 左内包候補
- ID 32: 右内包候補
- ID 39: 左乳頭体（画像誘導・プロジェクト内確認済み）
- ID 40: 右乳頭体（画像誘導・プロジェクト内確認済み）

IDs 30–32はBigBrain画像、CerebrA白質確率、近接核・脳室との位置制約から計算した教育用候補です。IDs 39–40はBigBrain水平連続切片を参照して本プロジェクトが手動分節し、プロジェクト内確認を経て公開教材へ採用しました。いずれも研究用の正解マスクではなく、乳頭体の視床下部付着境界は直交断確認により改訂する場合があります。

`tests/fixtures/bigbrain-practical-segmentation-pre-mammillary-de30.bin.gz` は、旧ラベル版の移行・strict validatorを浅いcloneでも再現するためにGitリポジトリ内で再配布する、採用前のcombined practical segmentationです。BigBrain参照データだけのfixtureではなく、Xiaoらの手動ラベル、CerebrA/MNI由来の教育用対応、本プロジェクト生成候補を含むmixed-sourceラベルです。公開アセットへは含めませんが、本書に記載したBigBrainの帰属・非営利・継承条件、Xiao手動ラベルのCC BY 4.0、CerebrA/MNIの利用条件、および本プロジェクト生成部分の注意事項をそれぞれ適用します。

`tests/fixtures/bigbrain-practical-segmentation-pre-ventricle-6744.bin.gz` は、PR #14の33 voxel脳室修正をstrict validatorとビルド段階で再現するための、修正適用前のcombined practical segmentationです。上記と同じmixed-sourceラベルであり、公開アセットではありません。適用される帰属・利用条件・教育用ラベルの注意事項も同じです。

## 6. 本プロジェクトの教育用模式3D

対象ファイル:

- `public/atlas/overlay-arteries-anterior.mesh`
- `public/atlas/overlay-arteries-posterior.mesh`
- `public/atlas/overlay-nerves-anterior.mesh`
- `public/atlas/overlay-nerves-pontine.mesh`
- `public/atlas/overlay-nerves-medullary.mesh`
- `public/atlas/neurovascular-overlays.json`
- `public/atlas/landmark-optic-pathway.mesh`
- `public/atlas/landmark-olfactory-pathway.mesh`
- `public/atlas/landmark-infundibulum.mesh`
- `public/atlas/landmark-mammillary-bodies.mesh`
- `public/atlas/landmark-anterior-perforated-substance.mesh`
- `public/atlas/basal-landmarks.json`
- `public/atlas/comparison-schematic-ventricle.mesh`

脳底動脈と脳神経根は、本プロジェクトが主要経路をMNI方向の表示空間へ手作業で置き、`scripts/build_neurovascular_overlays.py` で管状メッシュへ変換した模式3Dです。動脈はpial-like表面の表示補正を維持しています。III–XIIは脳幹近傍へ配置した近位経路の模式であり、現在の脳幹ラベル表面との距離・正確な出現境界は未検証です。個別根糸、三叉神経の感覚根と運動根、顔面神経の運動根と中間神経、前庭蝸牛神経の成分分離、副神経脊髄根と上行経路は再現していません。嗅球・嗅索、視神経・視交叉・視索、漏斗（下垂体茎）、乳頭体、前有孔質は、同じ表示空間へ `scripts/build_basal_landmarks.py` で配置した独立部品です。外部の標本写真・教科書図版・アトラス図版をトレースまたは収録していません。BigBrain組織像、血管造影、tractography、献体標本から抽出したものでもありません。

- 動脈は内頸動脈系、椎骨脳底動脈系、ウィリス動脈輪、主要小脳動脈に限定します。
- 脳神経はI–XIIの脳底面で見える近位部と、脳幹に対する起始レベルを単純化します。
- 脳底面では前有孔質、視神経・視交叉・視索、漏斗、左右の乳頭体を前後に並べます。下垂体そのものは表示しません。
- 各管状メッシュ頂点に1–45の個別構造IDを格納し、教材上の選択・白色強調にだけ使用します。
- 3Dモデルはホイール拡大、脳表の透過、小脳・橋／延髄・血管・神経レイヤーの脱着に対応します。中脳は上方との連続を保つため脱着対象にしません。
- 個人差、穿通枝、正確な血管径、神経核、頭蓋孔、遠位走行は再現しません。

生成メッシュは本プロジェクト作成の教材データとしてCC BY-NC-SA 4.0、生成スクリプトはアプリケーションコードとしてAGPL-3.0-or-laterです。詳細は `public/atlas/PROCEDURAL-NEUROVASCULAR-NOTICE.txt` を参照してください。これらは解剖学的正解データ、手術シミュレーション、臨床参照には使用できません。

`comparison-schematic-ventricle.mesh` は、共同制作ページの寄稿者限定A/B比較pilotだけで使う独立した模式メッシュです。`scripts/build_comparison_schematic_ventricle.mjs` の座標列から決定的に生成し、既存標本・アトラス頂点・断面ラベルを抽出または変形していません。画面では「模式・専門家未確認」「実標本由来ではない」と表示し、学習者向けモデル、正解セグメンテーション、検証済み形状として扱いません。個別の配布義務は `public/atlas/DATA-MANIFEST.json` の `contributor-comparison-prototype-assets` に記録しています。

`public/og.png` は本プロジェクトが作成したSNS共有用プロモーションイラストです。解剖データや第三者の標本画像として扱わず、教材上の位置・形状の根拠にも使用していません。プロジェクト作成の公開視覚素材として、現在の自作教材・プロジェクト作成物の扱いであるCC BY-NC-SA 4.0に従います。作成履歴と現行ファイルのSHA-256は [PUBLIC_ASSET_CREATION_RECORD.md](PUBLIC_ASSET_CREATION_RECORD.md) に記録します。

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
| OGPイラストの作成履歴 | 記録済み | [PUBLIC_ASSET_CREATION_RECORD.md](PUBLIC_ASSET_CREATION_RECORD.md) に `public/og.png` の作成履歴と現行SHA-256を記録 |
| アプリコードのライセンス | 対応済み | AGPL-3.0-or-laterとソース導線を維持 |
| 自作教材文書のライセンス | 対応済み | CC BY-NC-SA 4.0表示を維持 |
| 公開ソースURL | 対応済み | `bonnginn/brain-practical-navi` への導線を維持 |
| 商用利用 | 不可 | 別許諾または素材差し替えが必要 |

## 11. 推奨する表示文（短縮版）

> 非営利教育用。BigBrain (Amunts et al., 2013) 由来データは CC BY-NC-SA 4.0、BigBrain co-registration/manual labels (Xiao et al.) は CC BY 4.0、MNI152/CerebrAはMNIライセンスに基づき使用しています。表示用に再標本化、圧縮、マスク、色調調整を行っています。試作ラベルは正解データではなく、診断用途には使用できません。
## 2026-09-06 開発用脳梁の局所修正（未公開）

最新の下方弧2,160 voxel（30→0）は `CALLOSUM_INFERIOR_REPAIR.md` に記録し、第6段階として適用した。脳梁本体と異なる走行の固定成分を全114占有／隣接断面でAIが確認し、未ラベルへ戻すことに限定。脳弓への自動置換ではない。脳梁の局所除外は合計5,361 voxel、現行開発volume圧縮SHAは `098edfbf365016c6c53ccf7b7032258db72a4912378c457d348c01613a4a1694`。旧8cc65e…をfixtureへ保存。脳梁meshの270個の1 mm生成格子voxelだけが変わり、他54 block maskと原画像は不変。AI補助プロジェクト採用で、専門家承認・公開更新ではない。

前段の追加3成分1,596 voxel（30→0）は `CALLOSUM_CORTICAL_FOLLOWUP_REPAIR.md` に記録し、独立した採用stageとして適用した。初回との合計は3,201 voxel。その時点の開発volume圧縮SHAは `8cc65edf36e1e3a420168bfb663d6440418dd67189808263d11c180c4b403d16`、旧5348…はfixtureへ保存。脳梁meshと、脳梁マスクで除外されていた原画像由来の周辺組織meshを同期した。新規の模式組織を加えたのではない。専門家レビューではなく、元画像・ライセンス・帰属条件は不変。

前段の脳室47 voxel修正を保持したまま、ID30の1,605 voxelを未ラベルへ戻した。原画像と連続・直交断のAI補助レビュー、厳密な可逆差分、残る境界問題を `CALLOSUM_LOCAL_REPAIR.md` に記録した。専門家承認でも全脳梁の完成でもなく、画像誘導・試作区分を維持する。その時点の開発volume圧縮SHAは `5348b7650a3ba28c95a00407d62cf4054fb0c670a62de717f2c572f66a51c9a3`。旧930e…は履歴fixtureへ保存。脳梁block mesh1点を同じ生成処理で同期し、原画像は変更しない。

補助根拠にはBigBrain2015の0.4 mm組織分類（Wagstyl et al., 2018）とXiao2019の公開変位場を使用した。出典・ファイルSHA・CC BY-NC-SA 4.0／変換資産のCC BY 4.0の区別は `OFFICIAL_TISSUE_ALIGNMENT_REVIEW.md`。補助volumeと変位場自体はwork内だけにあり、アプリへ再配布していない。元データ・派生ラベルの帰属とライセンスは維持する。

## 2026-09-06 開発用脳室分類の修正（未公開・後続脳梁修正前）

元BigBrain画像は変更せず、既存派生ラベル47 voxelだけを修正した（26→41:16、26→0:31）。AI支援のプロジェクト採用で、専門家レビュー／研究ground truthではない。原画像と連続・直交断の根拠、可逆差分と採否は `FOURTH_VENTRICLE_REPAIR.md` および `segmentation-patches/review/ventricle-classification-project-review-2026-09-06.json`。新volume圧縮SHAは `930eaaed7eed8782b1b162f3aa5c59c2428f4062d0d2da3a9a1cb563f49b7db7`。旧b75a…volumeを履歴fixtureに保持する。対応する第四脳室block mesh1点を同じ生成処理で同期した。元データと派生物の既存ライセンス・帰属条件を変更しない。以下の過去SHA・未変更記載は当時の記録。
## 2026-09-06：赤核の位置合わせ修正（開発版）

BigBrain元手動区画へ公式変位場を適用した高精度候補から、左右赤核ID1・2のみを採用。独立した新規解剖分節ではなく、由来を保持した位置補正である。AI補助のプロジェクト採用であり、原著者・提供機関の承認や専門家レビューを示さない。内部の白い帯は核全体の領域内として保持し、その組織名を確定していない。ライセンス、帰属、非臨床・非営利教育上の制約は従前どおり。[採用記録](RED_NUCLEUS_REGISTRATION_ADOPTION.md)。

## 2026-09-06 後続：全22手動区画の位置補正

赤核以外の20区画も開発版へ採用し、関連22 meshを既存規則で再生成した。原画像・原著者の区画由来、元ライセンス・帰属は維持。専門家・原提供機関の承認は意味しない。現在のSHAと差分台帳は REGISTERED_LABELS_ADOPTION.md。

## 2026-09-06 後続：模式神経・血管と内包の再評価

模式の後交通動脈の接続関係のみを修正。個体由来の新規分節ではなく、元データ・帰属・ライセンスは不変。NEUROVASCULAR_TOPOLOGY_REPAIR.md。

## 2026-09-06 後続：脳幹の局所誤ラベル除外（未公開）

後続：小脳側の別64点を画像誘導のプロジェクト判断で修正し、36点を小脳、28点を未ラベルへ変更した。24点の小脳/空隙境界は未確定で、未ラベルを背景分類とはしない。元画像・帰属・ライセンスは維持し、専門家承認を示さない。現在の版と対応2 meshはCEREBELLAR_ISLAND_REPAIR.md。以下の82384fa6…はこの修正前の履歴。

さらに正中表面4点（MIDLINE_SURFACE_REPAIR.md）、下端支持範囲外3,385点と外表面の隙間620点（BRAINSTEM_INFERIOR_SUPPORT_REVIEW.md）、側縁・背側466点（BRAINSTEM_LATERAL_DORSAL_REVIEW.md）を未ラベルへ修正した。現行版e7e61a70…は最後の記録を参照。献体の組織不存在や解剖学的な脳幹下端の確定を意味せず、専門家・原提供者の承認を示さない。元画像・ライセンスは変更していない。

原画像を変更せず、三方向で画像確認した孤立40 voxel、続いて16 voxelと27 voxel（計83）を27→0へ変更した。AI支援プロジェクト採用であり、専門家・原提供者による承認ではない。元のライセンス・帰属を保持する。現行SHA82384fa6…、可逆差分・修正前fixture・再現方法は BRAINSTEM_ISLAND_REPAIR.md。
